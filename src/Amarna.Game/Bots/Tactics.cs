using Amarna.Engine;

namespace Amarna.Game.Bots;

/// <summary>The season's troop orders, and what the plan still lacks (for levies).</summary>
internal sealed class MilitaryPlan
{
    public Dictionary<string, Order> Orders { get; } = new();
    public Dictionary<string, string> Role { get; } = new();
    public HashSet<string> Destinations { get; } = new();
    /// <summary>Places where one more unit would have paid off, with what it was worth.</summary>
    public List<(string Near, double Value)> Shortfalls { get; } = new();
    public HashSet<string> Threatened { get; } = new();
}

/// <summary>
/// Plans a season of troop orders. It reads threats to every province it holds, values every
/// reachable target by what it adds to the score over the rest of the game, sizes each attack to
/// beat the likely defence (supports included), and commits units to the best operations first:
/// defending, blocking, cutting supports, attacking, convoying, then moving up.
/// </summary>
internal static class Tactics
{
    private sealed record Op(string Kind, double Net, string Target, string Lead, List<string> Helpers, string? ConvoyFleet = null);

    /// <param name="temper">Plays the season with these weights instead of the king's own (to draw alternative plans).</param>
    public static MilitaryPlan Make(Board b, Brain brain, Personality? temper = null)
    {
        var plan = new MilitaryPlan();
        var p = temper ?? brain.P;
        var me = b.Me;
        var free = b.Mine.Select(u => u.Province).ToHashSet();
        // Units that must not move this season. They may still support, which holds just as well.
        var stay = new HashSet<string>();
        var leader = b.Leader();
        var hostility = b.Alive.Where(x => x != me).ToDictionary(x => x, x => brain.Hostility(x, b) * (brain.IsFriend(x) && brain.Betraying != x ? 0.25 : 1));

        bool Willing(Power owner) => Tactics.Willing(b, brain, owner, leader);

        double Multiplier(Power? owner)
        {
            if (owner is null) return 1 - 0.45 * p.Commerce;
            var o = owner.Value;
            if (o == me) return 1;
            if (o == brain.Betraying) return 1.1;
            if (o == brain.WarTarget) return 1.3;
            if (o == leader) return 1.2;
            if (brain.Rel[o].Hostile) return 1.0 + 0.3 * p.Vengeance;
            return 0.55 + 0.45 * p.Aggression;
        }

        // ---- Threats: the strongest attack any one king could bring, weighted by how likely he is to bring it.
        (int Strength, double Chance) Danger(string province)
        {
            var best = (0, 0.0);
            foreach (var x in b.Alive.Where(x => x != me))
            {
                var m = b.Muster(x, province);
                if (m == 0) continue;
                var chance = hostility[x];
                if (chance < 0.25) continue;
                if (m > best.Item1 || (m == best.Item1 && chance > best.Item2)) best = (m, chance);
            }
            return best;
        }

        var threat = new Dictionary<string, (int Strength, double Chance)>();
        foreach (var prov in b.V.Owner.Where(x => x.Value == me).Select(x => x.Key).Concat(free).Distinct())
        {
            var d = Danger(prov);
            if (d.Strength > 0) { threat[prov] = d; plan.Threatened.Add(prov); }
        }

        // The chance that some hostile king walks into a province within two moves, for the homeland and capital.
        double Nearby(string province)
        {
            var best = 0.0;
            foreach (var u in b.Others)
            {
                if (hostility.GetValueOrDefault(u.Power) < 0.25) continue;
                var close = Board.Map.CanMove(u.Kind, u.Province, province)
                            || Board.Map.MovesFrom(u.Kind, u.Province).Any(n => Board.Map.CanMove(u.Kind, n, province));
                if (close) best = Math.Max(best, hostility[u.Power] * 0.6);
            }
            return best;
        }

        // What we risk by marching a unit out of a province we hold.
        double Exposure(string origin)
        {
            if (!b.IsMine(origin)) return 0;
            var chance = threat.TryGetValue(origin, out var t) ? t.Chance : 0;
            var prov = Board.Map[origin];
            if (prov.Capital || prov.Home == me) chance = Math.Max(chance, Nearby(origin));
            return chance * b.Value(origin) * (0.6 + 0.5 * p.Caution);
        }

        // The capital keeps its garrison while enemies are near.
        var capital = Board.Map.Capital(me).Id;
        if (free.Contains(capital) && Nearby(capital) >= 0.2 && (b.Mine.Count <= 2 || p.Caution > 0.5))
            stay.Add(capital);

        IEnumerable<string> Helpers(string target, string exclude) =>
            free.Where(u => u != exclude && Board.Map.CanMove(b.UnitAt[u].Kind, u, target))
                .OrderBy(u => threat.TryGetValue(u, out var t) ? t.Chance * b.Value(u) : 0).ThenBy(u => u, StringComparer.Ordinal);

        var ops = new List<Op>();

        // ---- Defend: hold threatened units and walls with enough supports.
        foreach (var (prov, t) in threat)
        {
            var hasUnit = free.Contains(prov);
            var walls = b.Walls(prov) && b.IsMine(prov);
            if (!hasUnit && !walls)
            {
                // Empty land: march in to bounce whoever comes.
                var blocker = Helpers(prov, "").FirstOrDefault(u => !stay.Contains(u) && (!threat.ContainsKey(u) || b.Value(u) < b.Value(prov)));
                if (blocker is not null && !b.UnitAt.ContainsKey(prov))
                    ops.Add(new Op("block", t.Chance * b.Value(prov) * 0.6 - Exposure(blocker), prov, blocker, new()));
                continue;
            }
            var needed = t.Strength - 1;
            if (needed <= 0) continue;
            var helpers = Helpers(prov, prov).Take(needed).ToList();
            var worth = (b.IsMine(prov) ? b.Value(prov) : 0) + (hasUnit ? 120 : 0);
            var share = helpers.Count >= needed ? 1.0 : 0.5 * helpers.Count / needed;
            if (helpers.Count > 0 || hasUnit)
                ops.Add(new Op("defend", t.Chance * worth * share * (0.7 + 0.6 * p.Caution), prov, hasUnit ? prov : "", helpers));
            if (helpers.Count < needed) plan.Shortfalls.Add((prov, t.Chance * worth));

            // Cut the supports of the attack, from anywhere but the province under threat.
            var attacker = b.Alive.Where(x => x != me && b.Muster(x, prov) == t.Strength).OrderByDescending(x => hostility[x]).FirstOrDefault();
            foreach (var supporter in b.CanReach(prov, u => u.Power == attacker).Select(u => u.Province))
            {
                var cutter = Helpers(supporter, prov).FirstOrDefault(u => u != prov);
                if (cutter is not null)
                    ops.Add(new Op("cut", t.Chance * worth * 0.35 - Exposure(cutter), supporter, cutter, new()));
            }
        }

        // ---- Attack: every reachable province we would gain from.
        var targets = free.SelectMany(u => Board.Map.MovesFrom(b.UnitAt[u].Kind, u)).Distinct().Where(t => !Board.Map[t].IsSea).ToList();
        foreach (var target in targets)
        {
            var owner = b.OwnerOf(target);
            var occupant = b.UnitAt.GetValueOrDefault(target);
            if (occupant?.Power == me) continue;
            if (owner == me && occupant is null) continue;
            if (owner is { } o && o != me && !Willing(o)) continue;
            if (occupant is { } oc && oc.Power != me && !Willing(oc.Power) && owner != me) continue;

            int defence;
            if (occupant is not null)
            {
                var backers = b.CanReach(target, u => u.Power == occupant.Power && u.Province != target).Count();
                defence = 1 + (int)Math.Round(backers * (0.5 + 0.3 * p.Caution));
            }
            else if (b.Walls(target))
                defence = 1 + (owner is { } wo ? (int)Math.Round(b.Muster(wo, target) * 0.6) : 0);
            else defence = 0;

            var rivals = b.Alive.Where(x => x != me && x != occupant?.Power).Select(x => b.Muster(x, target)).DefaultIfEmpty(0).Max();
            var contest = rivals == 0 ? 0 : p.Caution > 0.5 ? rivals : Math.Max(0, rivals - 1);
            var required = Math.Max(defence, contest) + 1;

            var gain = (owner == me ? 0 : b.Value(target)) * Multiplier(owner) + (occupant is not null ? 120 : 0);
            if (owner is { } capOwner && capOwner != me && Board.Map[target].Capital) gain += 60;

            var able = Helpers(target, "").ToList();
            if (able.Count == 0) continue;
            var movers = able.Where(u => !stay.Contains(u)).ToList();
            if (movers.Count == 0) continue;
            var lead = movers.OrderBy(u => Exposure(u)).ThenBy(u => b.UnitAt[u].Kind == UnitKind.Army ? 0 : 1).ThenBy(u => u, StringComparer.Ordinal).First();
            var helpers = able.Where(u => u != lead).Take(required - 1).ToList();
            if (1 + helpers.Count >= required)
            {
                var chance = 0.85 - (defence > 1 ? 0.1 : 0);
                ops.Add(new Op("attack", chance * gain - Exposure(lead) - 6 * helpers.Count, target, lead, helpers));
            }
            else if (gain > 150) plan.Shortfalls.Add((target, gain * 0.5));
        }

        // ---- Convoy: an army on the coast, our fleet at sea, a coast beyond.
        foreach (var fleet in free.Where(u => b.UnitAt[u].Kind == UnitKind.Fleet && Board.Map[u].IsSea))
            foreach (var army in free.Where(u => b.UnitAt[u].Kind == UnitKind.Army && Board.Map[u].IsCoastal && Board.Map.AreAdjacent(u, fleet)))
                foreach (var target in Board.Map.Neighbors(fleet).Where(t => t != army && Board.Map[t].IsCoastal && !Board.Map.CanMove(UnitKind.Army, army, t)))
                {
                    var owner = b.OwnerOf(target);
                    if (b.UnitAt.ContainsKey(target) || owner == me || (owner is { } o && !Willing(o))) continue;
                    var required = (b.Walls(target) ? 2 : 1) + Math.Min(1, b.Alive.Where(x => x != me).Select(x => b.Muster(x, target)).DefaultIfEmpty(0).Max());
                    var helpers = Helpers(target, army).Where(u => u != fleet).Take(required - 1).ToList();
                    if (1 + helpers.Count < required) continue;
                    ops.Add(new Op("convoy", 0.75 * b.Value(target) * Multiplier(owner) - Exposure(army), target, army, helpers, fleet));
                }

        // ---- Commit: best value first, each unit once.
        foreach (var op in ops.OrderByDescending(o => o.Net).ThenBy(o => o.Target, StringComparer.Ordinal))
        {
            if (op.Net <= 0) break;
            if (op.Lead.Length > 0 && !free.Contains(op.Lead)) continue;
            if (op.Kind is not "defend" && stay.Contains(op.Lead)) continue;
            if (op.Kind is "attack" or "block" or "convoy" && plan.Destinations.Contains(op.Target)) continue;
            if (op.ConvoyFleet is not null && !free.Contains(op.ConvoyFleet)) continue;
            var helpers = op.Helpers.Where(free.Contains).ToList();
            if (op.Kind == "attack")
            {
                var stillNeeded = op.Helpers.Count;
                if (helpers.Count < stillNeeded) continue;
            }

            switch (op.Kind)
            {
                case "defend":
                    if (op.Lead.Length > 0) stay.Add(op.Lead);
                    foreach (var h in helpers) Assign(plan, free, h, new SupportOrder(h, op.Target), "support");
                    break;
                case "block":
                case "cut":
                    Assign(plan, free, op.Lead, new MoveOrder(op.Lead, op.Target), op.Kind);
                    if (op.Kind == "block") plan.Destinations.Add(op.Target);
                    break;
                case "attack":
                    Assign(plan, free, op.Lead, new MoveOrder(op.Lead, op.Target), "attack");
                    foreach (var h in helpers) Assign(plan, free, h, new SupportOrder(h, op.Lead, op.Target), "support");
                    plan.Destinations.Add(op.Target);
                    break;
                case "convoy":
                    Assign(plan, free, op.Lead, new MoveOrder(op.Lead, op.Target), "attack");
                    Assign(plan, free, op.ConvoyFleet!, new ConvoyOrder(op.ConvoyFleet!, op.Lead, op.Target), "convoy");
                    foreach (var h in helpers) Assign(plan, free, h, new SupportOrder(h, op.Lead, op.Target), "support");
                    plan.Destinations.Add(op.Target);
                    break;
            }
        }

        // ---- Help allies hold against a common enemy.
        foreach (var u in free.ToList())
        {
            // Only troops in sight: support for a remembered unit that has moved on would be refused.
            var ally = b.V.Units.FirstOrDefault(o => o.Power != me && brain.IsFriend(o.Power) && Board.Map.CanMove(b.UnitAt[u].Kind, u, o.Province)
                && b.Alive.Any(x => x != me && x != o.Power && hostility.GetValueOrDefault(x) > 0.4 && b.Muster(x, o.Province) > 0));
            if (ally is null || threat.ContainsKey(u)) continue;
            Assign(plan, free, u, new SupportOrder(u, ally.Province), "ally-support");
        }

        // ---- Everyone else: hold if threatened, otherwise move towards where the value is.
        foreach (var u in free.OrderBy(x => x, StringComparer.Ordinal).ToList())
        {
            if (threat.ContainsKey(u) || stay.Contains(u)) { Assign(plan, free, u, new HoldOrder(u), "hold"); continue; }
            var step = Approach(b, brain, u, plan.Destinations, Willing, threat);
            if (step is not null)
            {
                Assign(plan, free, u, new MoveOrder(u, step), "move");
                plan.Destinations.Add(step);
            }
            else Assign(plan, free, u, new HoldOrder(u), "hold");
        }
        return plan;
    }

    /// <summary>Whether the king will send troops against another king this season. Decided by his own temper, never by a trial plan.</summary>
    public static bool Willing(Board b, Brain brain, Power owner, Power? leader)
    {
        if (owner == b.Me) return false;
        if (owner == brain.Betraying) return true;
        if (brain.IsFriend(owner)) return false;
        if (owner == brain.WarTarget || brain.Rel[owner].Hostile) return true;
        if (owner == leader) return brain.P.Aggression > 0.25;
        return brain.P.Aggression > 0.55;
    }

    private static void Assign(MilitaryPlan plan, HashSet<string> free, string unit, Order order, string role)
    {
        if (!free.Remove(unit)) return;
        plan.Orders[unit] = order;
        plan.Role[unit] = role;
    }

    /// <summary>One step along the shortest path to the most attractive place within five steps.</summary>
    private static string? Approach(Board b, Brain brain, string from, HashSet<string> taken, Func<Power, bool> willing,
        Dictionary<string, (int Strength, double Chance)> threat)
    {
        var kind = b.UnitAt[from].Kind;
        var prev = new Dictionary<string, string> { [from] = "" };
        var depth = new Dictionary<string, int> { [from] = 0 };
        var queue = new Queue<string>();
        queue.Enqueue(from);
        string? best = null;
        var bestScore = 0.0;
        while (queue.Count > 0)
        {
            var cur = queue.Dequeue();
            if (depth[cur] >= 5) continue;
            foreach (var n in Board.Map.MovesFrom(kind, cur).OrderBy(x => x, StringComparer.Ordinal))
            {
                if (prev.ContainsKey(n)) continue;
                prev[n] = cur;
                depth[n] = depth[cur] + 1;
                queue.Enqueue(n);
                var owner = b.OwnerOf(n);
                double lure = 0;
                if (!Board.Map[n].IsSea && owner != b.Me && (owner is null || willing(owner.Value))) lure = b.Value(n);
                if (b.IsMine(n) && threat.ContainsKey(n) && !b.UnitAt.ContainsKey(n)) lure = Math.Max(lure, b.Value(n) * 0.8);
                var score = lure / (1 + depth[n]);
                if (score > bestScore) { bestScore = score; best = n; }
            }
        }
        if (best is null) return null;
        var step = best;
        while (prev[step] != from) step = prev[step];
        if (taken.Contains(step) || b.UnitAt.ContainsKey(step) || (b.Walls(step) && step != best)) return null;
        if (b.Walls(step)) return null;
        var stepOwner = b.OwnerOf(step);
        if (stepOwner is { } so && so != b.Me && !willing(so)) return null;
        return step;
    }
}
