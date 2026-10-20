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
    /// <summary>For each threatened province, the strength of the likeliest attack on it and how likely it is to come.</summary>
    public Dictionary<string, (int Strength, double Chance)> Danger { get; } = new();
}

/// <summary>
/// Plans a season of troop orders. It reads threats to every province it holds, values every
/// reachable target by what it adds to the score over the rest of the game, sizes each attack to
/// beat the likely defence (supports included), and commits units to the best operations first:
/// defending, blocking, cutting supports, attacking, convoying, then moving up.
/// </summary>
internal static class Tactics
{
    /// <param name="Other">The fleet that carries a convoy, or the partner's troop an assist supports.</param>
    private sealed record Op(string Kind, double Net, string Target, string Lead, List<string> Helpers, string? Other = null);

    /// <summary>A blow struck together at the land of a king sworn against: one troop goes in, the others support it.</summary>
    internal sealed record Joint(string Target, Power Against, UnitView Lead, List<UnitView> Support);

    /// <summary>
    /// Attacks on the land of a king we have sworn with partners to stand against, made by a rule each of them can
    /// work out from its own side of the board, so that no letter has to settle who does what: next to each of
    /// his provinces (the richest first, each troop once), the troops of the partner with the least land go in
    /// (an army before a fleet, then by province) and every other sworn troop there supports them. Only troops in
    /// sight count, and only blows that could land: more troops than he can hold the province with.
    /// </summary>
    public static List<Joint> Joints(Board b, Brain brain)
    {
        var list = new List<Joint>();
        var coalitions = brain.Coalitions(b).ToList();
        if (coalitions.Count == 0) return list;
        var used = new HashSet<string>();
        double Land(Power x) => b.V.Owner.Where(o => o.Value == x).Sum(o => Board.Map[o.Key].Yield);
        foreach (var foe in coalitions.Select(c => c.Against).Distinct().OrderBy(x => x))
        {
            var side = coalitions.Where(c => c.Against == foe).Select(c => c.Partner).Append(b.Me).ToHashSet();
            var targets = b.V.Owner.Where(o => o.Value == foe && b.V.Visible.Contains(o.Key)).Select(o => o.Key)
                .OrderByDescending(t => Board.Map[t].Yield).ThenBy(t => t, StringComparer.Ordinal).ToList();
            foreach (var t in targets)
            {
                var near = b.V.Units.Where(u => side.Contains(u.Power) && !used.Contains(u.Province) && Board.Map.CanMove(u.Kind, u.Province, t)).ToList();
                if (!near.Any(u => u.Power == b.Me) || near.All(u => u.Power == b.Me)) continue;
                var lead = near.OrderBy(u => Land(u.Power)).ThenBy(u => u.Power).ThenBy(u => u.Kind == UnitKind.Army ? 0 : 1)
                    .ThenBy(u => u.Province, StringComparer.Ordinal).First();
                var support = near.Where(u => u != lead).ToList();
                // Walls add nothing to the battle: a blow lands if it beats the troop there (behind walls it begins a siege), with
                // the ground's help to it against the troop that goes in (Build order item 5, terrain).
                var held = b.UnitAt.GetValueOrDefault(t)?.Power == foe ? 1 + b.Ground(lead.Province, t) : 0;
                var backers = b.Units.Count(u => u.Power == foe && u.Province != t && Board.Map.CanMove(u.Kind, u.Province, t));
                if (1 + support.Count <= held + (backers + 1) / 2) continue;
                used.Add(lead.Province);
                foreach (var s in support) used.Add(s.Province);
                list.Add(new Joint(t, foe, lead, support));
            }
        }
        return list;
    }

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
        var sworn = brain.SwornFoes(b);

        double Multiplier(Power? owner)
        {
            if (owner is null) return 1 - 0.45 * p.Commerce;
            var o = owner.Value;
            if (o == me) return 1;
            if (o == brain.Betraying) return 1.1;
            if (o == brain.WarTarget || sworn.Contains(o)) return 1.3;
            if (o == leader) return 1.2;
            if (brain.Rel[o].Hostile) return 1.0 + 0.3 * p.Vengeance;
            return 0.55 + 0.45 * p.Aggression;
        }

        var capital = Board.Map.Capital(me).Id;
        // Gifts and fair words may lull a court, but it trusts its capital only to a sworn ally.
        double Fear(Power x, string province) => province == capital && !brain.Rel[x].Allied ? Math.Max(hostility[x], 0.3) : hostility[x];

        // ---- Threats: the strongest attack any one king could bring, weighted by how likely he is to bring it.
        (int Strength, double Chance) Danger(string province)
        {
            var best = (0, 0.0);
            foreach (var x in b.Alive.Where(x => x != me))
            {
                var m = b.Muster(x, province);
                if (m == 0) continue;
                var chance = Fear(x, province);
                if (chance < 0.25) continue;
                if (m > best.Item1 || (m == best.Item1 && chance > best.Item2)) best = (m, chance);
            }
            return best;
        }

        var threat = new Dictionary<string, (int Strength, double Chance)>();
        foreach (var prov in b.V.Owner.Where(x => x.Value == me).Select(x => x.Key).Concat(free).Distinct())
        {
            var d = Danger(prov);
            if (d.Strength > 0) { threat[prov] = d; plan.Threatened.Add(prov); plan.Danger[prov] = d; }
        }

        // The chance that some hostile king walks into a province within two moves, for the homeland and capital.
        double Nearby(string province)
        {
            var best = 0.0;
            foreach (var u in b.Others)
            {
                var fear = Fear(u.Power, province);
                if (fear < 0.25) continue;
                var close = Board.Map.CanMove(u.Kind, u.Province, province)
                            || Board.Map.MovesFrom(u.Kind, u.Province).Any(n => Board.Map.CanMove(u.Kind, n, province));
                if (close) best = Math.Max(best, fear * 0.6);
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
        if (free.Contains(capital) && Nearby(capital) >= (b.Mine.Count <= 2 ? 0.15 : 0.2) && (b.Mine.Count <= 2 || p.Caution > 0.5))
            stay.Add(capital);

        IEnumerable<string> Helpers(string target, string exclude) =>
            free.Where(u => u != exclude && Board.Map.CanMove(b.UnitAt[u].Kind, u, target))
                .OrderBy(u => threat.TryGetValue(u, out var t) ? t.Chance * b.Value(u) : 0).ThenBy(u => u, StringComparer.Ordinal);

        var ops = new List<Op>();

        // ---- Defend: hold threatened units and walls with enough supports.
        foreach (var (prov, t) in threat)
        {
            var hasUnit = free.Contains(prov);
            if (!hasUnit)
            {
                // Empty land, walled or not (walls do not hold in a battle): march in to bounce whoever comes.
                var blocker = Helpers(prov, "").FirstOrDefault(u => !stay.Contains(u) && (!threat.ContainsKey(u) || b.Value(u) < b.Value(prov)));
                if (blocker is not null && !b.UnitAt.ContainsKey(prov))
                    ops.Add(new Op("block", t.Chance * b.Value(prov) * 0.6 - Exposure(blocker), prov, blocker, new()));
                continue;
            }
            // The likeliest attacker; the ground's help against his blow counts with our troop (Build order item 5, terrain).
            var attacker = b.Alive.Where(x => x != me && b.Muster(x, prov) == t.Strength).OrderByDescending(x => hostility[x]).FirstOrDefault();
            var needed = t.Strength - 1 - b.GroundAgainst(prov, attacker);
            if (needed <= 0) continue;
            var helpers = Helpers(prov, prov).Take(needed).ToList();
            var worth = (b.IsMine(prov) ? b.Value(prov) : 0) + (hasUnit ? 120 : 0);
            var share = helpers.Count >= needed ? 1.0 : 0.5 * helpers.Count / needed;
            if (helpers.Count > 0 || hasUnit)
                ops.Add(new Op("defend", t.Chance * worth * share * (0.7 + 0.6 * p.Caution), prov, hasUnit ? prov : "", helpers));
            if (helpers.Count < needed) plan.Shortfalls.Add((prov, t.Chance * worth));

            // Cut the supports of the attack, from anywhere but the province under threat.
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
            // A friend's troop standing within our walls as a guest is left alone; one that besieges them is driven out.
            var besieged = owner == me && b.SiegeAt(target) is not null;
            if (owner == me && occupant is { } guest && guest.Power != me && !Willing(guest.Power) && !besieged) continue;

            // Walls add nothing to the battle (the siege package): the defence is the troop there and its likely supports.
            int defence;
            if (occupant is not null)
            {
                var backers = b.CanReach(target, u => u.Power == occupant.Power && u.Province != target).Count();
                defence = 1 + (int)Math.Round(backers * (0.5 + 0.3 * p.Caution));
            }
            else defence = 0;

            var rivals = b.Alive.Where(x => x != me && x != occupant?.Power).Select(x => b.Muster(x, target)).DefaultIfEmpty(0).Max();
            var contest = rivals == 0 ? 0 : p.Caution > 0.5 ? rivals : Math.Max(0, rivals - 1);

            var gain = (owner == me ? 0 : b.Value(target)) * Multiplier(owner) + (occupant is not null ? 120 : 0);
            if (owner is { } capOwner && capOwner != me && Board.Map[target].Capital) gain += 60;
            // Our own city besieged: driving the besieger out saves it.
            if (besieged) gain += 0.9 * b.Value(target);

            var able = Helpers(target, "").ToList();
            if (able.Count == 0) continue;
            // Within foreign walls only an army can do anything: storm them, or stand and besiege the city.
            var walled = b.Walls(target) && owner != me;
            var movers = able.Where(u => !stay.Contains(u) && (!walled || b.UnitAt[u].Kind == UnitKind.Army)).ToList();
            if (movers.Count == 0) continue;
            // Against a troop standing its ground, lead from where the ground helps it least (Build order item 5, terrain): a
            // move over open ground needs one support fewer than one over a pass or a river.
            var lead = movers.OrderBy(u => occupant is null ? 0 : b.Ground(u, target)).ThenBy(u => Exposure(u))
                .ThenBy(u => b.UnitAt[u].Kind == UnitKind.Army ? 0 : 1).ThenBy(u => u, StringComparer.Ordinal).First();
            if (occupant is not null) defence += b.Ground(lead, target);
            var required = Math.Max(defence, contest) + 1;
            // Strong enough to storm the walls, the attack takes the city at once; only strong enough to get in, the army stands
            // inside and besieges it, which takes seasons and may be broken: worth less, the higher the walls.
            var storm = walled ? Math.Max(required, b.StormNeeds(target, occupant is null ? 0 : defence)) : required;
            var stormHelpers = able.Where(u => u != lead).Take(storm - 1).ToList();
            var helpers = 1 + stormHelpers.Count >= storm ? stormHelpers : able.Where(u => u != lead).Take(required - 1).ToList();
            var stormed = !walled || 1 + helpers.Count >= storm;
            if (1 + helpers.Count >= required)
            {
                var chance = 0.85 - (defence > 1 ? 0.1 : 0);
                var worth = stormed ? gain : gain * SiegeWorth(b.WallLevel(target)) + (occupant is not null ? 60 : 0);
                // An army that ends the season in desert land not ours pays for supplies.
                var desert = b.UnitAt[lead].Kind == UnitKind.Army ? b.DesertCost(target) : 0;
                ops.Add(new Op("attack", chance * worth - Exposure(lead) - 6 * helpers.Count - desert, target, lead, helpers));
            }
            else if (gain > 150) plan.Shortfalls.Add((target, gain * 0.5));
        }

        // An army on a coast with nothing it could take by land this season: every land or coast link leads to our own land,
        // to walls, or to a king we will not fight. Carried over the sea it can work again (and march inland, as no fleet can).
        bool Stranded(string army) =>
            !Board.Map.MovesFrom(UnitKind.Army, army).Any(n => !b.IsMine(n) && (b.OwnerOf(n) is not { } o || Willing(o)));

        // ---- Convoy: an army on the coast, our fleet at sea, a coast beyond. For a stranded army the convoy is worth more
        // than the fleet taking that coast itself: the army goes in, and the fleet stays at sea to carry or strike again.
        foreach (var fleet in free.Where(u => b.UnitAt[u].Kind == UnitKind.Fleet && Board.Map[u].IsSea))
            foreach (var army in free.Where(u => b.UnitAt[u].Kind == UnitKind.Army && Board.Map[u].IsCoastal && Board.Map.AreAdjacent(u, fleet)))
                foreach (var target in Board.Map.Neighbors(fleet).Where(t => t != army && Board.Map[t].IsCoastal && !Board.Map.CanMove(UnitKind.Army, army, t)))
                {
                    var owner = b.OwnerOf(target);
                    if (b.UnitAt.ContainsKey(target) || owner == me || (owner is { } o && !Willing(o))) continue;
                    var required = 1 + Math.Min(1, b.Alive.Where(x => x != me).Select(x => b.Muster(x, target)).DefaultIfEmpty(0).Max());
                    var helpers = Helpers(target, army).Where(u => u != fleet).Take(required - 1).ToList();
                    if (1 + helpers.Count < required) continue;
                    // A landing that does not storm the walls only begins a siege.
                    var landed = b.Walls(target) && 1 + helpers.Count < b.StormNeeds(target, 0) ? SiegeWorth(b.WallLevel(target)) : 1;
                    var carried = landed * (Stranded(army) ? 0.85 * (b.Value(target) * Multiplier(owner)) + 60 : 0.75 * b.Value(target) * Multiplier(owner));
                    ops.Add(new Op("convoy", carried - Exposure(army), target, army, helpers, fleet));
                }

        // ---- Sieges: an army of ours within foreign walls we mean to take stays and besieges the city (each season it holds
        // there wears the city down a step), with a support from a neighbouring troop when that saves a season (a support to
        // hold, uncut, wears it down two steps).
        foreach (var at in free.Where(u => b.UnitAt[u].Kind == UnitKind.Army && b.Walls(u) && !b.IsMine(u)).OrderBy(u => u, StringComparer.Ordinal).ToList())
        {
            var holder = b.OwnerOf(at);
            if (holder is { } h && !Willing(h)) continue;
            var left = b.WallLevel(at) - (b.SiegeAt(at) is { } x && x.Besieger == me ? x.Progress : 0);
            var helper = left >= 2 ? Helpers(at, at).FirstOrDefault(u => !stay.Contains(u) && !threat.ContainsKey(u)) : null;
            ops.Add(new Op("siege", 0.9 * b.Value(at) * Multiplier(holder) / Math.Max(1, left) + 40, at, at, helper is null ? new() : [helper]));
        }

        // ---- Joint blows with sworn partners (see Joints): go in when it is our turn, support when it is theirs.
        foreach (var j in Joints(b, brain))
        {
            var taken = b.Value(j.Target) * (b.UnitAt.ContainsKey(j.Target) ? 1 : 0.85);
            if (j.Lead.Power == me)
            {
                // At peace with him, we leave the blow to a partner rather than break the oath.
                if (!Willing(j.Against)) continue;
                var helpers = j.Support.Where(u => u.Power == me).Select(u => u.Province).ToList();
                var gain = b.Value(j.Target) * Multiplier(j.Against) + (b.UnitAt.ContainsKey(j.Target) ? 120 : 0);
                ops.Add(new Op("attack", 0.85 * gain + 40 - Exposure(j.Lead.Province) - 6 * helpers.Count, j.Target, j.Lead.Province, helpers));
            }
            else
            {
                // A support sends no troops into his land, so even a king at peace with him may give it.
                foreach (var s in j.Support.Where(u => u.Power == me))
                    ops.Add(new Op("assist", (0.25 + 0.25 * p.Honesty) * taken + 40, j.Target, s.Province, new(), j.Lead.Province));
            }
        }

        // ---- Commit: best value first, each unit once.
        foreach (var op in ops.OrderByDescending(o => o.Net).ThenBy(o => o.Target, StringComparer.Ordinal))
        {
            if (op.Net <= 0) break;
            if (op.Lead.Length > 0 && !free.Contains(op.Lead)) continue;
            if (op.Kind is not ("defend" or "assist" or "siege") && stay.Contains(op.Lead)) continue;
            if (op.Kind is "attack" or "block" or "convoy" or "assist" && plan.Destinations.Contains(op.Target)) continue;
            if (op.Kind == "convoy" && !free.Contains(op.Other!)) continue;
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
                    Assign(plan, free, op.Other!, new ConvoyOrder(op.Other!, op.Lead, op.Target), "convoy");
                    foreach (var h in helpers) Assign(plan, free, h, new SupportOrder(h, op.Lead, op.Target), "support");
                    plan.Destinations.Add(op.Target);
                    break;
                case "assist":
                    // A unit that supports stays where it is, so one kept home (or defended) may still do it.
                    Assign(plan, free, op.Lead, new SupportOrder(op.Lead, op.Other!, op.Target), "assist");
                    plan.Destinations.Add(op.Target);
                    break;
                case "siege":
                    Assign(plan, free, op.Lead, new BesiegeOrder(op.Lead), "siege");
                    foreach (var h in helpers) Assign(plan, free, h, new SupportOrder(h, op.Lead), "support");
                    break;
            }
        }

        // ---- Help allies hold against a common enemy: first against a king we are sworn against, then the leader.
        double Menace(Power x) => sworn.Contains(x) ? 2 : x == leader ? 1.5 : hostility.GetValueOrDefault(x) > 0.4 ? 1 : 0;
        foreach (var u in free.ToList())
        {
            // Only troops in sight: support for a remembered unit that has moved on would be refused.
            var ally = b.V.Units.Where(o => o.Power != me && brain.IsFriend(o.Power) && Board.Map.CanMove(b.UnitAt[u].Kind, u, o.Province))
                .Select(o => (Unit: o, Menace: b.Alive.Where(x => x != me && x != o.Power && !brain.IsFriend(x) && b.Muster(x, o.Province) > 0).Select(Menace).DefaultIfEmpty(0).Max()))
                .Where(x => x.Menace > 0).OrderByDescending(x => x.Menace).ThenBy(x => x.Unit.Province, StringComparer.Ordinal).Select(x => x.Unit).FirstOrDefault();
            if (ally is null || threat.ContainsKey(u)) continue;
            Assign(plan, free, u, new SupportOrder(u, ally.Province), "ally-support");
        }

        // ---- Ready a convoy: an army on a coast with nothing to take by land, and our fleet a move from a sea that touches
        // both its coast and land worth taking that the army cannot reach by land. The fleet puts to that sea, so that next
        // season the convoy above can carry the army over. (Until the fix pass after item 4 no script king ever convoyed:
        // its fleets were never at sea next to an army that needed them.)
        foreach (var army in free.Where(u => b.UnitAt[u].Kind == UnitKind.Army && Board.Map[u].IsCoastal && !threat.ContainsKey(u) && !stay.Contains(u))
                     .OrderBy(x => x, StringComparer.Ordinal).ToList())
        {
            if (!Stranded(army)) continue;
            var best = (Fleet: (string?)null, Sea: "", Worth: 0.0);
            foreach (var sea in Board.Map.Neighbors(army).Where(s => Board.Map[s].IsSea && !plan.Destinations.Contains(s) && (!b.UnitAt.TryGetValue(s, out var at) || at.Power == me)))
            {
                var worth = Board.Map.Neighbors(sea)
                    .Where(t => t != army && Board.Map[t].IsCoastal && !Board.Map.CanMove(UnitKind.Army, army, t) && !b.IsMine(t)
                                && (b.OwnerOf(t) is not { } o || Willing(o)))
                    .Select(t => b.Value(t) * Multiplier(b.OwnerOf(t))).DefaultIfEmpty(0).Max();
                if (worth <= best.Worth) continue;
                var fleet = free.Where(f => f != army && b.UnitAt[f].Kind == UnitKind.Fleet && !stay.Contains(f) && !threat.ContainsKey(f)
                                            && (f == sea || Board.Map.CanMove(UnitKind.Fleet, f, sea)))
                    .OrderBy(f => f == sea ? 0 : 1).ThenBy(f => f, StringComparer.Ordinal).FirstOrDefault();
                if (fleet is not null) best = (fleet, sea, worth);
            }
            if (best.Fleet is not { } carrier || best.Worth < 200) continue;
            // Already at sea there: it waits for the army (the convoy above did not find a landing it could make this season).
            Assign(plan, free, carrier, carrier == best.Sea ? new HoldOrder(carrier) : new MoveOrder(carrier, best.Sea), "convoy");
            if (carrier != best.Sea) plan.Destinations.Add(best.Sea);
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

    /// <summary>
    /// After the look-ahead: an army of ours left holding within foreign walls we mean to take besieges the city instead (a
    /// besiege order is a hold that wears the city down; the look-ahead weighs holds and moves, and a siege, once begun,
    /// goes on while the army holds there, but it must be ordered to begin).
    /// </summary>
    public static void Besiege(Board b, Brain brain, MilitaryPlan plan)
    {
        var leader = b.Leader();
        foreach (var u in b.Mine.Where(u => u.Kind == UnitKind.Army && b.Walls(u.Province) && !b.IsMine(u.Province)).Select(u => u.Province).ToList())
        {
            if (plan.Orders.GetValueOrDefault(u) is not (null or HoldOrder)) continue;
            if (b.OwnerOf(u) is { } holder && !Willing(b, brain, holder, leader)) continue;
            plan.Orders[u] = new BesiegeOrder(u);
            plan.Role[u] = "siege";
        }
    }

    /// <summary>
    /// The sallies that go with a plan (the siege package): each of our moves into a city of ours whose walls can sally, with
    /// foreign troops within them, is supported by the walls (+1, a support that cannot be cut).
    /// </summary>
    public static List<SallyOrder> Sallies(Board b, IEnumerable<Order> orders)
    {
        var min = b.V.Prices.GetValueOrDefault("sallyMinWalls", 2);
        if (min <= 0) return [];
        return orders.OfType<MoveOrder>()
            .Where(m => b.IsMine(m.To) && b.WallLevel(m.To) >= min && b.V.Units.Any(u => u.Province == m.To && u.Power != b.Me))
            .GroupBy(m => m.To).Select(g => g.OrderBy(m => m.Unit, StringComparer.Ordinal).First())
            .Select(m => new SallyOrder(m.To, m.Unit)).ToList();
    }

    /// <summary>Whether the king will send troops against another king this season. Decided by his own temper, never by a trial plan.</summary>
    public static bool Willing(Board b, Brain brain, Power owner, Power? leader)
    {
        if (owner == b.Me) return false;
        if (owner == brain.Betraying) return true;
        if (brain.IsFriend(owner)) return false;
        if (owner == brain.WarTarget || brain.Rel[owner].Hostile || brain.SwornFoes(b).Contains(owner)) return true;
        if (owner == leader) return brain.P.Aggression > 0.25;
        // While another king runs away with the game, only the most warlike still pick fights among the rest.
        return brain.P.Aggression > (leader is { } l && l != b.Me ? 0.8 : 0.55);
    }

    /// <summary>
    /// What getting within walls without storming them is worth against taking the city at once: the army then stands and
    /// besieges it for as many seasons as the walls are high (fewer with support), and may be driven out meanwhile.
    /// </summary>
    internal static double SiegeWorth(int walls) => 0.6 / (1 + 0.25 * walls);

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
                // Desert land not ours costs an army supplies for each season it ends there (Build order item 5, terrain).
                if (kind == UnitKind.Army) lure = Math.Max(0, lure - b.DesertCost(n));
                if (b.IsMine(n) && threat.ContainsKey(n) && !b.UnitAt.ContainsKey(n)) lure = Math.Max(lure, b.Value(n) * 0.8);
                var score = lure / (1 + depth[n]);
                if (score > bestScore) { bestScore = score; best = n; }
            }
        }
        if (best is null) return null;
        var step = best;
        while (prev[step] != from) step = prev[step];
        // Foreign walls are entered only to take the city, by the attacks above; our own we may march through.
        if (taken.Contains(step) || b.UnitAt.ContainsKey(step) || (b.Walls(step) && !b.IsMine(step))) return null;
        var stepOwner = b.OwnerOf(step);
        if (stepOwner is { } so && so != b.Me && !willing(so)) return null;
        return step;
    }
}
