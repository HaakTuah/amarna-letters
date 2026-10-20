using Amarna.Engine;

namespace Amarna.Game.Bots;

/// <summary>
/// Checks a season's troop plan the way a careful player would: by playing it out. It pictures
/// what every rival is likely to order (the plan that rival would draw from its side of the board,
/// and a harder one aimed at us), resolves each pairing with the game's own adjudicator, and keeps
/// the plan, or the change to one or two units' orders, that does best on average, weighed towards
/// the worst case by the king's caution. It sees only what the king sees.
/// </summary>
internal static class Search
{
    private const int Samples = 8;
    /// <summary>Adjudications per season and king: enough to try every unit's alternatives once.</summary>
    private const int Budget = 720;
    private const double UnitWorth = 90;

    private sealed class Ctx
    {
        public required Board B;
        public required Brain Brain;
        public required Personality P;
        public required Dictionary<Power, double> Hostility;
        public required List<Unit> Units;
        public required List<Dictionary<string, Order>> Foes;
        public required Adjudicator Adj;
        public required Func<Power?, bool> Prey;
        public required Func<Power, bool> Willing;
        public Power? Leader;
        public required HashSet<Power> Sworn;
        public required List<Tactics.Joint> Joints;
        public required List<(Power Partner, Power Against)> Coalitions;
        public int Runs;
    }

    public static void Improve(Board b, Brain brain, MilitaryPlan plan, Rng rng)
    {
        if (b.Mine.Count == 0) return;
        var me = b.Me;
        var p = brain.P;
        var leader = b.Leader();
        var hostility = b.Alive.Where(x => x != me)
            .ToDictionary(x => x, x => brain.Hostility(x, b) * (brain.IsFriend(x) && brain.Betraying != x ? 0.25 : 1));

        // What each rival is likely to order: its own plan, and a plan aimed at us.
        var calm = new Dictionary<Power, Dictionary<string, Order>>();
        var hard = new Dictionary<Power, Dictionary<string, Order>>();
        foreach (var x in b.Alive.Where(x => x != me && b.Others.Any(u => u.Power == x)).OrderBy(x => x))
        {
            var (c, h) = Foresee(b, brain, x);
            calm[x] = c;
            hard[x] = h;
        }
        // All-in strikes: every unit a rival has in reach of one of our provinces, one marching in and the rest supporting.
        var ours = b.V.Owner.Where(x => x.Value == me).Select(x => x.Key).Concat(b.Mine.Select(u => u.Province))
            .Where(x => !Board.Map[x].IsSea).Distinct().OrderBy(x => x, StringComparer.Ordinal).ToList();
        var strikes = new Dictionary<Power, List<Dictionary<string, Order>>>();
        foreach (var x in calm.Keys)
        {
            var list = new List<(double Weight, Dictionary<string, Order> Plan)>();
            foreach (var t in ours)
            {
                var near = b.Others.Where(u => u.Power == x && Board.Map.CanMove(u.Kind, u.Province, t))
                    .OrderBy(u => u.Kind == UnitKind.Army ? 0 : 1).ThenBy(u => u.Province, StringComparer.Ordinal).ToList();
                if (near.Count == 0) continue;
                var strike = new Dictionary<string, Order>(calm[x]) { [near[0].Province] = new MoveOrder(near[0].Province, t) };
                foreach (var h in near.Skip(1)) strike[h.Province] = new SupportOrder(h.Province, near[0].Province, t);
                list.Add((b.Value(t) * near.Count, strike));
            }
            strikes[x] = list.OrderByDescending(l => l.Weight).Take(3).Select(l => l.Plan).ToList();
        }
        var nastiest = hostility.Where(x => calm.ContainsKey(x.Key)).OrderByDescending(x => x.Value).ThenBy(x => x.Key).Select(x => (Power?)x.Key).FirstOrDefault();

        var foes = new List<Dictionary<string, Order>>();
        for (var s = 0; s < Samples; s++)
        {
            var orders = new Dictionary<string, Order>();
            foreach (var x in calm.Keys)
            {
                // Sample 0: everyone keeps to his own plan. Samples 1 and 2: the most hostile king strikes with
                // everything he has, or comes for us with a plan of his own. Then a mix, by each king's hostility.
                Dictionary<string, Order> theirs;
                if (s == 1 && x == nastiest) theirs = strikes[x].Count > 0 ? strikes[x][0] : hard[x];
                else if (s == 2 && x == nastiest) theirs = hard[x];
                else if (s >= 3 && rng.Chance(Math.Clamp((hostility[x] - 0.2) * 1.2, 0.03, 0.85)))
                    theirs = strikes[x].Count > 0 && rng.Chance(0.5) ? strikes[x][rng.Next(strikes[x].Count)] : hard[x];
                else theirs = calm[x];
                foreach (var (prov, order) in theirs)
                    orders[prov] = s >= 3 && rng.Chance(0.15) ? Wander(b, prov, rng) : order;
            }
            foes.Add(orders);
        }

        // Sworn partners keep to the rule for joint blows (see Tactics.Joints) in every season but the two
        // where the most hostile king comes for us: their troops go in or support as the rule says.
        var joints = Tactics.Joints(b, brain);
        for (var s = 0; s < Samples; s++)
        {
            if (s is 1 or 2) continue;
            foreach (var j in joints)
            {
                if (j.Lead.Power != me) foes[s][j.Lead.Province] = new MoveOrder(j.Lead.Province, j.Target);
                foreach (var h in j.Support.Where(u => u.Power != me)) foes[s][h.Province] = new SupportOrder(h.Province, j.Lead.Province, j.Target);
            }
        }

        var sworn = brain.SwornFoes(b);
        var ctx = new Ctx
        {
            B = b, Brain = brain, P = p, Hostility = hostility, Leader = leader, Foes = foes, Sworn = sworn, Joints = joints, Coalitions = brain.Coalitions(b).ToList(),
            Adj = new Adjudicator(Board.Map),
            Units = b.Units.Select(u => new Unit { Id = u.Province, Power = u.Power, Kind = u.Kind, Province = u.Province }).ToList(),
            Willing = x => Tactics.Willing(b, brain, x, leader),
            Prey = owner => owner is null || owner == brain.WarTarget || owner == brain.Betraying || owner == leader
                            || (owner is { } o && o != me && (brain.Rel[o].Hostile || sworn.Contains(o))),
        };

        // Candidate plans: the king's own, a bolder one, a safer one, and standing fast.
        var mine = b.Mine.Select(u => u.Province).ToList();
        var candidates = new List<Dictionary<string, Order>> { Troops(plan, mine) };
        var bold = p with { Aggression = Math.Min(1, p.Aggression + 0.35), Caution = Math.Max(0, p.Caution - 0.35) };
        var safe = p with { Aggression = Math.Max(0, p.Aggression - 0.3), Caution = Math.Min(1, p.Caution + 0.35) };
        candidates.Add(Troops(Tactics.Make(b, brain, bold), mine));
        candidates.Add(Troops(Tactics.Make(b, brain, safe), mine));
        candidates.Add(mine.ToDictionary(u => u, u => (Order)new HoldOrder(u)));

        var best = candidates[0];
        var bestScore = Evaluate(ctx, best);
        foreach (var c in candidates.Skip(1))
        {
            if (Same(c, best)) continue;
            var sc = Evaluate(ctx, c);
            if (sc > bestScore + 1) { best = c; bestScore = sc; }
        }

        // Then each unit in turn: would another order (or a move with a supporter) do better?
        for (var pass = 0; pass < 2; pass++)
        {
            var improved = false;
            foreach (var u in mine)
            {
                foreach (var change in Alternatives(b, best, u, ctx.Willing, ctx.Joints))
                {
                    if (ctx.Runs + Samples > Budget) break;
                    var trial = new Dictionary<string, Order>(best);
                    foreach (var o in change) trial[Unit(o)] = o;
                    if (Same(trial, best)) continue;
                    var sc = Evaluate(ctx, trial);
                    if (sc > bestScore + 2) { best = trial; bestScore = sc; improved = true; }
                }
            }
            if (!improved || ctx.Runs + Samples > Budget) break;
        }

        // Write the chosen orders back into the plan.
        foreach (var (u, o) in best)
        {
            if (plan.Orders.TryGetValue(u, out var old) && old == o) continue;
            plan.Orders[u] = o;
            plan.Role[u] = o switch
            {
                MoveOrder m => b.OwnerOf(m.To) is { } owner && owner != me || b.UnitAt.ContainsKey(m.To) || b.Walls(m.To) ? "attack" : "move",
                SupportOrder => "support",
                ConvoyOrder => "convoy",
                _ => "hold",
            };
        }
        plan.Destinations.Clear();
        foreach (var m in plan.Orders.Values.OfType<MoveOrder>()) plan.Destinations.Add(m.To);
    }

    // ------------------------------------------------------------------ rivals

    /// <summary>A rival's likely orders, drawn from its side of the board: as it stands, and if it chose war on us.</summary>
    private static (Dictionary<string, Order> Calm, Dictionary<string, Order> Hard) Foresee(Board b, Brain brain, Power x)
    {
        var v = b.V;
        var view = new SeatView
        {
            Turn = v.Turn, Season = v.Season, Power = x, MinTurns = v.MinTurns, EndChance = v.EndChance,
            Owner = v.Owner, Walls = v.Walls, Sieges = v.Sieges, Units = b.Units, Visible = v.Visible, Fallen = v.Fallen, Prices = v.Prices,
        };
        var their = new Board(view, treasuries: brain.Treasury);
        // A pictured rival plays the archetype, and every roll in picturing him comes from our own seat's stream.
        if (!brain.Models.TryGetValue(x, out var model))
            brain.Models[x] = model = new Brain(x, brain.Seed, Personality.Archetype(x));

        // What we know of how they see us: the mirror of our own dealings with them.
        var ours = brain.Rel[x];
        var theirs = model.Rel[b.Me];
        theirs.LastAttackedUs = ours.LastWeAttacked;
        theirs.LastWeAttacked = ours.LastAttackedUs;
        theirs.Treaty = ours.Treaty;
        theirs.Allied = ours.Allied;
        theirs.Grudge = ours.LastWeAttacked >= v.Turn - 3 ? 3 : 0;
        theirs.Trust = Math.Clamp(ours.Trust * 0.5, -1, 1);
        model.Turn = v.Turn;
        foreach (var (k, w) in brain.Belligerence) model.Belligerence[k] = w;

        var rng = Rng.For(brain.Seed, v.Turn, "bot:model", $"{b.Me}:{x}");
        Statecraft.Strategy(their, model, rng);
        var calm = Troops(Tactics.Make(their, model), their.Mine.Select(u => u.Province));

        // The harder plan: war on us, and on nobody else (what lies beyond our sight would only distract it).
        var war = model.WarTarget;
        var kept = model.Rel.ToDictionary(r => r.Key, r => (r.Value.Treaty, r.Value.Trust));
        foreach (var (k, r) in model.Rel) if (k != b.Me) { r.Treaty = true; r.Trust = Math.Max(0, r.Trust); }
        model.WarTarget = b.Me;
        model.Betraying = brain.IsFriend(x) ? b.Me : null;
        var hard = Troops(Tactics.Make(their, model, model.P with { Aggression = Math.Max(0.7, model.P.Aggression), Caution = Math.Min(0.4, model.P.Caution) }),
            their.Mine.Select(u => u.Province));
        model.WarTarget = war;
        model.Betraying = null;
        foreach (var (k, (treaty, trust)) in kept) { model.Rel[k].Treaty = treaty; model.Rel[k].Trust = trust; }
        return (calm, hard);
    }

    /// <summary>A unit that does something nobody planned: holds, or moves somewhere at random.</summary>
    private static Order Wander(Board b, string at, Rng rng)
    {
        var u = b.UnitAt[at];
        var moves = Board.Map.MovesFrom(u.Kind, at).OrderBy(x => x, StringComparer.Ordinal).ToList();
        var pick = rng.Next(moves.Count + 1);
        return pick == moves.Count ? new HoldOrder(at) : new MoveOrder(at, moves[pick]);
    }

    // ------------------------------------------------------------------ our side

    private static Dictionary<string, Order> Troops(MilitaryPlan plan, IEnumerable<string> units)
    {
        var d = new Dictionary<string, Order>();
        foreach (var u in units) d[u] = plan.Orders.TryGetValue(u, out var o) && o is HoldOrder or MoveOrder or SupportOrder or ConvoyOrder or BesiegeOrder ? o : new HoldOrder(u);
        return d;
    }

    private static string Unit(Order o) => o switch
    {
        HoldOrder h => h.Unit, MoveOrder m => m.Unit, SupportOrder s => s.Unit, ConvoyOrder c => c.Unit, BesiegeOrder b => b.Unit,
        _ => throw new ArgumentException("not a troop order"),
    };

    private static bool Same(Dictionary<string, Order> a, Dictionary<string, Order> b) =>
        a.Count == b.Count && a.All(x => b.TryGetValue(x.Key, out var o) && o == x.Value);

    /// <summary>Other orders for one unit: hold, each legal move, each support it could give, or a move with a supporter.</summary>
    private static IEnumerable<Order[]> Alternatives(Board b, Dictionary<string, Order> plan, string u, Func<Power, bool> willing, List<Tactics.Joint> joints)
    {
        // Never into the land or troops of a king we are not willing to fight.
        bool Open(string to) =>
            (b.OwnerOf(to) is not { } o || o == b.Me || willing(o)) && (b.UnitAt.GetValueOrDefault(to) is not { } x || x.Power == b.Me || willing(x.Power));
        var kind = b.UnitAt[u].Kind;
        yield return [new HoldOrder(u)];

        var moves = Board.Map.MovesFrom(kind, u).OrderBy(x => x, StringComparer.Ordinal).ToList();
        foreach (var to in moves)
        {
            if (!Open(to)) continue;
            yield return [new MoveOrder(u, to)];
            // The same move with the best placed of our other units in support.
            if (Board.Map[to].IsSea) continue;
            var helper = plan.Keys.Where(h => h != u && h != to && Board.Map.CanMove(b.UnitAt[h].Kind, h, to))
                .OrderBy(h => plan[h] is HoldOrder ? 0 : plan[h] is SupportOrder ? 1 : 2).ThenBy(h => h, StringComparer.Ordinal).FirstOrDefault();
            if (helper is not null) yield return [new MoveOrder(u, to), new SupportOrder(helper, u, to)];
        }
        foreach (var (other, o) in plan.OrderBy(x => x.Key, StringComparer.Ordinal))
        {
            if (other == u) continue;
            if (o is MoveOrder m)
            {
                if (m.To != u && Open(m.To) && Board.Map.CanMove(kind, u, m.To)) yield return [new SupportOrder(u, other, m.To)];
            }
            else if (Board.Map.CanMove(kind, u, other)) yield return [new SupportOrder(u, other)];
        }
        // And a sworn partner's troop going in on a joint blow (see Tactics.Joints).
        foreach (var j in joints.Where(j => j.Lead.Power != b.Me && j.Support.Any(s => s.Province == u)))
            yield return [new SupportOrder(u, j.Lead.Province, j.Target)];
    }

    // ------------------------------------------------------------------ judging

    /// <summary>The plan's worth against every pictured season: the average, pulled towards the worst by caution.</summary>
    private static double Evaluate(Ctx c, Dictionary<string, Order> mine)
    {
        var total = 0.0;
        var worst = double.MaxValue;
        foreach (var foes in c.Foes)
        {
            var orders = new Dictionary<string, Order>(foes);
            foreach (var (k, o) in mine) orders[k] = o;
            // A king's move on troops within his own walls goes with the walls' sally, ours as the plan will give it
            // (Tactics.Sallies), a rival's as he may: a besieger who forgets the sally loses his army to a lone relief.
            var r = c.Adj.Run(c.Units, orders, c.B.V.Owner, c.B.V.Walls, Sallies(c, orders));
            c.Runs++;
            var sc = Score(c, r, orders);
            total += sc;
            worst = Math.Min(worst, sc);
        }
        var mean = total / c.Foes.Count;
        var rho = 0.1 + 0.3 * c.P.Caution;
        return (1 - rho) * mean + rho * worst;
    }

    /// <summary>Every sally the pictured season's moves would bring: a king's move into his own city whose walls can sally, with another's troops within.</summary>
    private static List<SallyOrder> Sallies(Ctx c, IReadOnlyDictionary<string, Order> orders)
    {
        var min = c.B.V.Prices.GetValueOrDefault("sallyMinWalls", 2);
        if (min <= 0) return [];
        var list = new List<SallyOrder>();
        foreach (var m in orders.Values.OfType<MoveOrder>().OrderBy(m => m.Unit, StringComparer.Ordinal))
        {
            var mover = c.Units.FirstOrDefault(u => u.Province == m.Unit)?.Power;
            if (mover is null || c.B.OwnerOf(m.To) != mover || c.B.WallLevel(m.To) < min || list.Any(x => x.City == m.To)) continue;
            if (c.Units.Any(u => u.Province == m.To && u.Power != mover)) list.Add(new SallyOrder(m.To, m.Unit));
        }
        return list;
    }

    /// <summary>What a resolved season leaves us: land and troops, minus what lies open next season, plus harm to our enemies.</summary>
    private static double Score(Ctx c, AdjudicationResult r, IReadOnlyDictionary<string, Order> orders)
    {
        var b = c.B;
        var me = b.Me;
        var lost = r.DislodgedUnitIds.ToHashSet();
        var at = new Dictionary<string, Unit>();
        foreach (var u in c.Units)
        {
            if (lost.Contains(u.Id)) continue;
            at[r.NewPositions.GetValueOrDefault(u.Id, u.Province)] = u;
        }
        var stormed = r.Stormed.ToHashSet();
        // A unit within walls it does not hold takes the province only by storming them, or when its siege wears the city
        // down this season: it held there (it stood there before the moves and was not ordered to move, support or convoy),
        // and the siege, begun now or under way, reaches the level of the walls.
        bool Falls(string p, Unit u)
        {
            if (u.Province != p || orders.GetValueOrDefault(p) is not (null or HoldOrder or BesiegeOrder)) return false;
            var progress = b.SiegeAt(p) is { } x && x.Besieger == u.Power ? x.Progress : 0;
            return progress + (r.HoldSupported.Contains(p) ? 2 : 1) >= b.WallLevel(p);
        }
        Power? Owner(string p)
        {
            if (Board.Map[p].IsSea || !at.TryGetValue(p, out var u)) return b.OwnerOf(p);
            return !b.Walls(p) || u.Power == b.OwnerOf(p) || stormed.Contains(p) || Falls(p, u) ? u.Power : b.OwnerOf(p);
        }

        var score = 0.0;
        var held = b.V.Owner.Where(x => x.Value == me).Select(x => x.Key).Concat(at.Where(x => x.Value.Power == me).Select(x => x.Key))
            .Where(x => !Board.Map[x].IsSea && Owner(x) == me).Distinct().ToList();
        // A kingdom falls with its capital: a season that loses ours loses everything.
        var fallen = Owner(Board.Map.Capital(me).Id) != me;
        if (fallen) held.Clear();
        foreach (var p in held) score += b.Value(p);

        // Sieges: a city worn down is nearer to falling. Ours count for what they bring nearer; a siege of one of our cities
        // counts against us the same way. A troop within walls it does not hold, with no siege, counts as one about to begin.
        foreach (var (p, u) in at)
        {
            if (Board.Map[p].IsSea || !b.Walls(p) || u.Power == b.OwnerOf(p) || Owner(p) == u.Power || u.Kind != UnitKind.Army) continue;
            var progress = b.SiegeAt(p) is { } x && x.Besieger == u.Power && u.Province == p ? x.Progress : 0;
            var pressed = u.Province == p && orders.GetValueOrDefault(p) is null or HoldOrder or BesiegeOrder ? (r.HoldSupported.Contains(p) ? 2 : 1) : 0;
            var share = Math.Min(1.0, (progress + pressed + 0.5) / (b.WallLevel(p) + 1.0));
            if (u.Power == me && c.Prey(b.OwnerOf(p))) score += 0.45 * share * b.Value(p);
            else if (b.OwnerOf(p) == me) score -= 0.45 * share * b.Value(p);
        }

        var mineAfter = fallen ? [] : at.Where(x => x.Value.Power == me).ToList();
        score += UnitWorth * mineAfter.Count;

        // Harm done to the kings we fight.
        foreach (var x in c.Hostility.Keys)
        {
            // A king we have sworn with others to hold back counts most: what he loses to a partner is our gain too.
            var w = c.Sworn.Contains(x) ? 0.45 : x == c.Brain.WarTarget || x == c.Brain.Betraying ? 0.35 : x == c.Leader ? 0.3 : c.Brain.Rel[x].Hostile ? 0.2 : 0;
            if (w == 0) continue;
            foreach (var (p, o) in b.V.Owner)
                if (o == x && Owner(p) != x) score += w * b.Value(p);
            score += w * 100 * c.Units.Count(u => u.Power == x && lost.Contains(u.Id));
        }
        // And what a sworn partner loses to him.
        foreach (var (partner, foe) in c.Coalitions)
        {
            foreach (var (p, o) in b.V.Owner)
                if (o == partner && Owner(p) == foe) score -= 0.25 * b.Value(p);
            score -= 25 * c.Units.Count(u => u.Power == partner && lost.Contains(u.Id));
        }

        // What lies open next season: land that a hostile neighbour could walk into.
        var kappa = 0.3 + 0.3 * c.P.Caution;
        foreach (var p in held)
        {
            var here = at.TryGetValue(p, out var occ) && occ.Power == me;
            // Walls add nothing to the defence, but an attacker gets them only by storming them (more than walls and defence).
            var walls = b.WallLevel(p);
            var helpers = mineAfter.Count(x => x.Key != p && Board.Map.CanMove(x.Value.Kind, x.Key, p));
            var defence = here ? 1 + helpers : Math.Min(1, helpers);
            var risk = 0.0;
            var capital = Board.Map[p].Capital && Board.Map[p].Home == me;
            foreach (var (x, fear) in c.Hostility)
            {
                // A capital is trusted only to a sworn ally (see Tactics.Make).
                var h = capital && !c.Brain.Rel[x].Allied ? Math.Max(fear, 0.3) : fear;
                if (h < 0.15) continue;
                var attackers = at.Count(y => y.Value.Power == x && Board.Map.CanMove(y.Value.Kind, y.Key, p));
                if (attackers == 0) continue;
                // Behind walls, getting in is not taking: only a storm takes it next season; a lone entry only begins a siege.
                var chance = walls > 0
                    ? attackers > walls + (here ? defence : 0) ? h : attackers > defence ? h * 0.15 : 0
                    : attackers > defence ? h : attackers == defence ? h * 0.3 : 0;
                risk = 1 - (1 - risk) * (1 - chance);
            }
            if (risk > 0) score -= risk * kappa * (b.Value(p) + (here ? UnitWorth : 0));
        }

        // Troops placed to strike next season.
        foreach (var (p, u) in mineAfter)
        {
            var reach = Board.Map.MovesFrom(u.Kind, p).Where(n => !Board.Map[n].IsSea && Owner(n) != me && c.Prey(Owner(n)))
                .Select(b.Value).DefaultIfEmpty(0).Max();
            score += 0.05 * reach;
        }
        return score;
    }
}
