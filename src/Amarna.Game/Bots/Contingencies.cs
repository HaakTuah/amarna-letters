using Amarna.Engine;

namespace Amarna.Game.Bots;

/// <summary>
/// A script king's standing orders (since the additions to the fix pass after item 4: every seat may keep them, by the tenet
/// "Every feature is every seat's"). A standing order answers a move in the season it is made and replaces the season's
/// orders for its units, so it is a defence that costs nothing unless the blow comes: the king gives its units their orders
/// as usual, and leaves standing orders to change them only if a feared attack is ordered. Each season it first looks over
/// the standing orders it keeps, which may fire this season, and cancels those that no longer make sense against this
/// season's plan; then it gives new ones for the seasons ahead. A standing order first fires in the season after it is
/// given, so it is given against troops that could strike then (within two moves now), and uses only troops that stay where
/// they are this season, whose place next season is known. It rolls no dice: the same view and plan give the same orders.
/// </summary>
internal static class Contingencies
{
    /// <summary>What a troop of ours standing in a province adds to its worth, as in the first plan's defence (Tactics).</summary>
    private const double TroopWorth = 120;

    /// <summary>
    /// A standing order is kept against this season's plan only if what it guards is worth this many times what its troops
    /// would give up when it fires (their own orders for the season).
    /// </summary>
    private const double KeepRatio = 1 / 0.6;

    /// <summary>The least fear of a king that counts his troops as a threat, as in the first plan (Tactics).</summary>
    private const double MinFear = 0.25;

    /// <summary>What a standing order guards: a troop of ours, the walls of a city of ours, an empty province of our homeland, or a fleet that slips away.</summary>
    internal enum Guard { Troop, Walls, Empty, Retreat }

    /// <summary>A standing order the king gives, with what it guards, for the notes and the tests.</summary>
    internal sealed record Given(Guard Kind, string Place, StandingRequest Request);

    /// <param name="orders">The season's orders so far (the plan's troop orders, the treasury's, the court's and the letters).</param>
    /// <returns>The standing orders to cancel, by id with why (for the notes), and the new standing orders.</returns>
    public static (List<(string Id, string Why)> Cancel, List<Given> Give) Plan(Board b, Brain brain, MilitaryPlan plan, IReadOnlyList<Order> orders)
    {
        var me = b.Me;
        var cancel = new List<(string Id, string Why)>();
        var give = new List<Given>();
        var mine = b.V.Units.Where(u => u.Power == me).ToDictionary(u => u.Province);
        // Troops that leave our hands this season, by the treasury's orders: they answer nothing next season.
        var going = orders.Select(o => o switch { DisbandOrder d => d.Unit, GiftUnitOrder g => g.Unit, _ => null }).OfType<string>().ToHashSet();
        Order? Fresh(string unit) => plan.Orders.GetValueOrDefault(unit);
        bool Stays(string unit) => mine.ContainsKey(unit) && !going.Contains(unit) && Fresh(unit) is null or HoldOrder or SupportOrder or ConvoyOrder;
        double Worth(string place) => (b.IsMine(place) ? b.Value(place) : 0) + (mine.ContainsKey(place) ? TroopWorth : 0);

        // Fear of each king, as the first plan reckons it: a friend counts a quarter, and next to the capital anyone but a
        // full ally counts at least 0.3.
        var capital = Board.Map.Capital(me).Id;
        var hostility = b.Alive.Where(x => x != me).ToDictionary(x => x, x => brain.Hostility(x, b) * (brain.IsFriend(x) && brain.Betraying != x ? 0.25 : 1));
        double Fear(Power x, string place) => place == capital && !brain.Rel[x].Allied ? Math.Max(hostility[x], 0.3) : hostility[x];
        // The most troops one feared king, seen or remembered, could bring against a place next season: those that could
        // move in now, and those that could move next to it first. And how much he is feared.
        var threats = new Dictionary<string, (int Strength, double Chance)>();
        (int Strength, double Chance) Threat(string place)
        {
            if (threats.TryGetValue(place, out var known)) return known;
            var best = (0, 0.0);
            foreach (var x in hostility.Keys)
            {
                var chance = Fear(x, place);
                if (chance < MinFear) continue;
                var n = b.Others.Count(u => u.Power == x && u.Province != place && (Board.Map.CanMove(u.Kind, u.Province, place)
                                                                                    || Board.Map.MovesFrom(u.Kind, u.Province).Any(m => m != place && Board.Map.CanMove(u.Kind, m, place))));
                if (n > best.Item1 || (n == best.Item1 && n > 0 && chance > best.Item2)) best = (n, chance);
            }
            return threats[place] = best;
        }
        // The most troops one feared king, seen or remembered, could move into a place this season.
        int Muster(string place) => hostility.Keys.Where(x => Fear(x, place) >= MinFear).Select(x => b.Muster(x, place)).DefaultIfEmpty(0).Max();
        var used = new HashSet<string>();

        // ---- The standing orders kept so far: any may fire this season, in place of this season's orders for its troops.
        var kept = new List<StandingOrderView>();
        foreach (var st in b.V.Standing)
        {
            if (Unsound(st) is { } why) cancel.Add((st.Id, why));
            else { kept.Add(st); foreach (var u in Units(st)) used.Add(u); }
        }

        // Why a standing order kept so far should not fire this season, or null if it should stand.
        string? Unsound(StandingOrderView st)
        {
            var place = st.Province;
            if (Threat(place).Strength == 0) return "no threat";
            if (st.When == StandingWhen.UnitAttacked)
            {
                // The troop it guards marches out this season, or leaves our hands: there is nothing left to hold.
                if (!mine.ContainsKey(place) || Fresh(place) is MoveOrder) return "the troop marches";
                if (going.Contains(place)) return "the troop goes";
            }
            else if (!b.IsMine(place)) return "lost";
            // An empty province one of our troops moves into, or stands in now: two of ours would bounce there.
            else if (!b.Walls(place) && (mine.ContainsKey(place) || plan.Orders.Values.OfType<MoveOrder>().Any(m => m.To == place))) return "ours to enter";
            // This season's plan already gives every one of its orders: firing would change nothing, so it waits no longer.
            if (st.Orders.All(o => Unit(o) is { } u && Fresh(u)?.Describe() == o.Describe())) return "the plan does it";
            // The plan guards the troop its own way: one of ours moves into its province with support, so that an attacker
            // who dislodges it bounces there instead. That move cannot be cut, as a support can.
            if (st.When == StandingWhen.UnitAttacked && plan.Orders.Values.OfType<MoveOrder>().Any(m => m.To == place)) return "the plan guards it";
            // A troop or walls that hold this season without its supports against all that a feared king could move in now:
            // it would fire on any blow, even one they hold alone, and take its troops from their own orders for nothing.
            if (st.Orders.All(o => o is SupportOrder { To: null })
                && 1 + mine.Keys.Count(u => !st.Orders.Any(o => Unit(o) == u) && Fresh(u) is SupportOrder { To: null } s && s.Supported == place) >= Muster(place))
                return "held without it";
            foreach (var o in st.Orders)
            {
                if (Unit(o) is not { } u) continue;
                if (!mine.TryGetValue(u, out var troop) || going.Contains(u)) return "a troop gone";
                var reach = o switch { SupportOrder s => s.To ?? s.Supported, MoveOrder m => m.To, _ => null };
                if (reach is not null && !Board.Map.CanMove(troop.Kind, u, reach)) return "out of reach";
                // A troop that slips away must still have somewhere safe to go.
                if (o is MoveOrder away && u == place && (b.UnitAt.ContainsKey(away.To) || Muster(away.To) > 0)) return "no refuge";
                // A troop that marches out to block is stopped with the attacker and stays where it was, holding as a troop
                // whose move failed does, alone: not one the plan has others support holding, whose supports would be lost.
                if (o is MoveOrder && u != place
                    && plan.Orders.Values.Any(x => x is SupportOrder { To: null } s && s.Supported == u))
                    return "needed at home";
                // What the troop would give up if it fires: its own order for this season.
                if (Fresh(u) is { } f && f.Describe() != o.Describe() && Cost(f, place) * KeepRatio > Worth(place)) return "needed elsewhere";
            }
            return null;
        }

        // What a troop's order for this season is worth, which a standing order that fires takes from it.
        double Cost(Order f, string guarded) => f switch
        {
            HoldOrder => 0,
            ConvoyOrder => double.MaxValue,
            MoveOrder m => Into(m.To),
            SupportOrder { To: { } to } => Into(to),
            SupportOrder s => s.Supported == guarded ? 0 : Worth(s.Supported),
            _ => 0,
        };
        // A move into a place: a foreign troop there is struck, in our own land too; our own empty land is blocked if threatened.
        double Into(string target) =>
            b.UnitAt.GetValueOrDefault(target) is { } x && x.Power != me ? 0.85 * b.Value(target) + TroopWorth
            : b.IsMine(target) ? (plan.Threatened.Contains(target) && !mine.ContainsKey(target) ? 0.6 * b.Value(target) : 0)
            : 0.85 * b.Value(target);

        // ---- New standing orders, for the seasons ahead: the places a feared king could strike next season, most worth first.
        var room = TurnEngine.MaxStanding - kept.Count;
        var covered = kept.Select(st => (st.When, st.Province)).ToHashSet();
        var places = b.V.Owner.Where(x => x.Value == me).Select(x => x.Key).Concat(mine.Keys).Distinct()
            .Select(x => (Place: x, Threat: Threat(x))).Where(x => x.Threat.Strength > 0)
            .OrderByDescending(x => x.Threat.Chance * Worth(x.Place)).ThenBy(x => x.Place, StringComparer.Ordinal).ToList();
        foreach (var (place, (strength, _)) in places)
        {
            if (give.Count >= room) break;
            // Our troops next to it that stay where they are this season, the least threatened first.
            var helpers = mine.Keys.Where(u => u != place && !used.Contains(u) && Stays(u) && Board.Map.CanMove(mine[u].Kind, u, place))
                .OrderBy(u => Threat(u).Chance * Worth(u)).ThenBy(u => u, StringComparer.Ordinal).ToList();
            if (mine.TryGetValue(place, out var troop))
            {
                // A troop of ours that stays: against more than one, it needs supports to hold.
                if (!Stays(place) || strength < 2 || Muster(place) < 2 || covered.Contains((StandingWhen.UnitAttacked, place))) continue;
                var support = helpers.Take(strength - 1).ToList();
                if (support.Count > 0)
                    Add(Guard.Troop, place, StandingWhen.UnitAttacked, support.Select(h => (Order)new SupportOrder(h, place)).ToList(), support);
                else if (Board.Map[place].IsSea && !used.Contains(place) && Refuge(place, troop.Kind) is { } refuge)
                    // A fleet at sea, nothing to help it, and nothing to lose there but the fleet: it slips away as the blow falls.
                    Add(Guard.Retreat, place, StandingWhen.UnitAttacked, [new MoveOrder(place, refuge)], [place]);
            }
            else if (b.Walls(place) && b.IsMine(place))
            {
                // The walls of a city of ours hold against one troop: against more, troops next to them support them.
                if (strength < 2 || Muster(place) < 2 || covered.Contains((StandingWhen.UnitEnters, place))) continue;
                var support = helpers.Take(strength - 1).ToList();
                if (support.Count > 0) Add(Guard.Walls, place, StandingWhen.UnitEnters, support.Select(h => (Order)new SupportOrder(h, place)).ToList(), support);
            }
            else if (b.IsMine(place) && Board.Map[place].Home == me && !covered.Contains((StandingWhen.UnitEnters, place)))
            {
                // Empty land of our homeland: a troop next to it marches in as the enemy does, and an attacker without support
                // bounces; the troop stays where it was (the least threatened goes). Against a supported attack it fails, and
                // has given up only its own order for the season, which is weighed in the season it may fire.
                var blocker = helpers.FirstOrDefault();
                if (blocker is not null) Add(Guard.Empty, place, StandingWhen.UnitEnters, [new MoveOrder(blocker, place)], [blocker]);
            }
        }
        return (cancel, give);

        void Add(Guard kind, string place, StandingWhen when, List<Order> given, IEnumerable<string> units)
        {
            give.Add(new Given(kind, place, new StandingRequest { When = when, Province = place, Orders = given }));
            covered.Add((when, place));
            foreach (var u in units) used.Add(u);
        }

        // Where a troop could slip away to: next to it, empty, ours, free or at sea, and where no feared king's troop could
        // move in as it gets there (checked again in the season it may fire).
        string? Refuge(string from, UnitKind kind) => Board.Map.MovesFrom(kind, from)
            .Where(q => !b.UnitAt.ContainsKey(q) && !(b.Walls(q) && !b.IsMine(q)) && Muster(q) == 0 && (b.OwnerOf(q) is null || b.OwnerOf(q) == me || Board.Map[q].IsSea))
            .OrderByDescending(q => b.IsMine(q)).ThenBy(q => q, StringComparer.Ordinal).FirstOrDefault();
    }

    /// <summary>The province of the troop an order is for, or null for an order to no troop.</summary>
    private static string? Unit(Order o) => o switch
    {
        HoldOrder h => h.Unit, MoveOrder m => m.Unit, SupportOrder s => s.Unit, ConvoyOrder c => c.Unit, _ => null,
    };

    /// <summary>The troops a standing order commands.</summary>
    private static IEnumerable<string> Units(StandingOrderView st) => st.Orders.Select(Unit).OfType<string>();
}
