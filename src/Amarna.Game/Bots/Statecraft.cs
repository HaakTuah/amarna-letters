using Amarna.Engine;

namespace Amarna.Game.Bots;

/// <summary>The non-military half of a script king: strategy, treasury, letters, audiences and court.</summary>
internal static class Statecraft
{
    private const string Oath = "By Shamash, Amun, Marduk and Teshub";

    // ================================================================= strategy

    /// <summary>Chooses (or keeps) the king to make war on, and whether to break an oath this season.</summary>
    public static void Strategy(Board b, Brain brain, Rng rng)
    {
        var p = brain.P;
        var me = b.Me;
        var leader = b.Leader();
        var reach = ReachableLand(b);
        // Troops a king can field, from what we see and what we have seen of him lately.
        int Force(Power x) => Math.Max(b.Others.Count(u => u.Power == x), brain.ArmySeen.GetValueOrDefault(x).Units);

        // What a war on a king could win this year: each province of his within reach, by the chance our
        // troops there beat what he can hold it with (a unit and its supports, walls, or troops that can block).
        double Prize(Power x) => reach.Where(t => b.OwnerOf(t) == x).Sum(t =>
        {
            var strike = b.Mine.Count(u => Board.Map.CanMove(u.Kind, u.Province, t));
            // Troops we cannot see may stand in his provinces next to it.
            var unseen = Math.Max(0, Force(x) - b.Others.Count(u => u.Power == x));
            var hidden = Board.Map.Neighbors(t).Count(n => b.OwnerOf(n) == x && !b.V.Visible.Contains(n));
            var backers = b.Muster(x, t) + Math.Min(unseen, hidden);
            var defence = b.UnitAt.GetValueOrDefault(t)?.Power == x ? 1 + 0.6 * backers : b.Walls(t) ? 1 + 0.6 * backers : 0.5 * backers;
            var chance = strike > defence + 0.5 ? 0.8 : strike > defence ? 0.5 : strike > defence - 0.5 ? 0.25 : 0.05;
            // Taken land must still be kept: count a little over half of what holding it to the end is worth.
            return b.Value(t) * chance * 0.6;
        });
        var ours = b.Mine.Count;
        var neighbours = b.Neighbours().ToList();
        var sworn = brain.SwornFoes(b);
        // How far the leader stands above the rest of us: the further, the more urgent it is to hold him back.
        var lead = leader is { } top && top != me ? b.Growth(top) - b.Alive.Where(x => x != top).Select(b.Growth).DefaultIfEmpty(1).Max() : 0;

        // War target: keep it while it still makes sense, otherwise pick the best.
        if (brain.WarTarget is { } current && (!b.Alive.Contains(current) || brain.IsFriend(current) || Prize(current) <= 0 || b.Turn() - brain.WarSince > 8
                                               // Too strong to fight alone, unless we do not fight him alone.
                                               || (Force(current) > ours + 1 && brain.Rel[current].LastAttackedUs < b.Turn() - 2 && !sworn.Contains(current))
                                               // A war of choice on one of the rest, while the leader runs away: think again.
                                               || (current != leader && lead >= 0.2 && !sworn.Contains(current) && brain.Rel[current].LastAttackedUs < b.Turn() - 2)))
            brain.WarTarget = null;
        if (brain.WarTarget is null)
        {
            var best = b.Alive.Where(x => x != me).Select(x =>
            {
                var r = brain.Rel[x];
                // A war is worth what it can win: the odds of our troops against his,
                var odds = Math.Clamp((ours + 0.5) / (Force(x) + 0.5), 0.25, 1.6);
                // what we can take from him (see Prize),
                if (!reach.Any(t => b.OwnerOf(t) == x)) return (X: x, Score: double.MinValue);
                // and the kings who could fall on us while we are busy with him.
                var flank = neighbours.Where(y => y != x && !brain.IsFriend(y)).Sum(y => Math.Max(0, Force(y) - ours + 1) * 40.0) * (0.5 + p.Caution);
                // A runaway leader, and above all one we have sworn with others to stand against, is everyone's war.
                // While he runs away, a war among the rest of us only helps him.
                var balance = (x == leader ? 160 + 400 * Math.Min(0.5, lead) : leader is { } ahead && ahead != me ? -300 * Math.Min(0.5, lead) * (0.5 + p.Diplomacy) : 0)
                              + (sworn.Contains(x) ? 120 + 160 * p.Honesty : 0);
                // A tablet we sent him binds us until his answer is back (our copy comes home with the envoy): no
                // king offers peace one season and marches the next, unless he was attacked in between.
                var since = b.Turn() - r.ProposedTurn;
                var pending = !r.Treaty && since <= 3 && r.LastAttackedUs < r.ProposedTurn;
                if (pending && since <= 2) return (X: x, Score: double.MinValue);
                var score = Prize(x) * odds * (0.4 + p.Aggression)
                            + r.Grudge * p.Vengeance * 40
                            + balance
                            - flank
                            - (r.Treaty || pending ? 400 * p.Honesty : 0)
                            - (r.Allied ? 800 : 0)
                            // A king who courts us (gifts, oaths, supports) is worth more as a friend than as prey.
                            - Math.Max(0, r.Trust) * 350
                            - Math.Min(3, r.SupportsGiven) * 60;
                return (X: x, Score: score);
            }).OrderByDescending(t => t.Score).ThenBy(t => t.X).First();
            // In the first year, letters are still on the road: only the warlike or the wronged start a war.
            var patience = b.Turn() <= 3 ? 80 * (1 - p.Aggression) : 0;
            if (best.Score > 140 * (1 - p.Aggression) + 40 + patience)
            {
                brain.WarTarget = best.X;
                brain.WarSince = b.Turn();
            }
        }

        // Betrayal: only for the faithless, only when an ally's land lies open, never against a sworn partner near the end.
        brain.Betraying = null;
        if (p.Honesty < 0.55)
        {
            foreach (var ally in b.Alive.Where(x => x != me && brain.IsFriend(x)).OrderBy(x => x))
            {
                if (brain.Rel[ally].Allied && b.V.Turn >= b.V.MinTurns) continue;
                // A broken oath costs a name for honesty with every court that hears of it: worth it only for a real prize.
                if (b.Turn() <= 3 || brain.Rel[ally].SupportsGiven > 0) continue;
                var open = reach.Where(t => b.OwnerOf(t) == ally && !b.UnitAt.ContainsKey(t) && !b.Walls(t)).Sum(b.Value);
                if (open > 400 * (0.5 + p.Honesty) && rng.Chance((1 - p.Honesty) * 0.35))
                {
                    brain.Betraying = ally;
                    break;
                }
            }
        }
    }

    /// <summary>
    /// Whether a king is worth a coalition of these two: more than either of them could hold back alone, judged by
    /// strength, not growth. A small kingdom that has grown fast leads the race, but two great kings who swear
    /// against it only make themselves the pair to beat.
    /// </summary>
    private static bool Outweighs(Board b, Power top, Power a, Power c) =>
        b.Strength(top) >= 0.85 * Math.Max(b.Strength(a), b.Strength(c)) && b.Growth(top) > Math.Max(b.Growth(a), b.Growth(c));

    /// <summary>
    /// Two great kings of a size, both among the three strongest: rivals for the crown. They may keep the peace,
    /// but neither swears a full alliance (under the shared-victory house rule it would let them share the victory and leave the rest nothing).
    /// </summary>
    private static bool Rivals(Board b, Power a, Power c)
    {
        var top = b.Alive.OrderByDescending(b.Strength).ThenBy(x => x).Take(3).ToHashSet();
        var (sa, sc) = (b.Strength(a), b.Strength(c));
        return top.Contains(a) && top.Contains(c) && Math.Min(sa, sc) >= 0.7 * Math.Max(sa, sc);
    }

    /// <summary>Whether one king's land borders another's, by land or across a sea.</summary>
    private static bool Touches(Board b, Power x, Power y)
    {
        var theirs = b.V.Owner.Where(o => o.Value == y).Select(o => o.Key).ToHashSet();
        return b.V.Owner.Any(o => o.Value == x && (Board.Map.Neighbors(o.Key).Any(theirs.Contains) || theirs.Any(t => Board.Map.SharesSea(o.Key, t))));
    }

    private static HashSet<string> ReachableLand(Board b) =>
        b.Mine.SelectMany(u => Board.Map.MovesFrom(u.Kind, u.Province)).Where(t => !Board.Map[t].IsSea).ToHashSet();

    private static int Turn(this Board b) => b.V.Turn;

    // ================================================================= treasury

    public static void Economy(Board b, Brain brain, MilitaryPlan plan, List<Order> orders, Rng rng)
    {
        var p = brain.P;
        var v = b.V;
        var me = b.Me;
        // Back pay owed is gold already spent: the people it is owed to will claim it when they are back at court.
        var gold = v.Gold - v.BackPay;
        var flow = v.Income - v.Upkeep - v.WallUpkeep - v.Wages;
        // While income covers upkeep, a small cushion is enough; a treasury that bleeds needs a season or two in hand.
        var costs = v.Upkeep + v.WallUpkeep + v.Wages;
        var reserve = (flow >= 0 ? costs * 0.3 * (0.5 + p.Caution) : costs * (1 + p.Caution)) + p.Greed * 40 + 20;

        // Disband before the troops desert: the least needed unit goes first. A unit that must go is given instead to a
        // friend whose land or troops it stands next to, and who can feed it: it costs us nothing more than disbanding,
        // and it serves a friend against the kings we both face (see TroopsFor). When nothing idle is left and the treasury
        // cannot pay next season's upkeep, troops will desert whatever they are doing: one a friend can take is given to it.
        int Upkeep(string u) => b.UnitAt[u].Kind == UnitKind.Army ? v.Prices["armyUpkeep"] : v.Prices["fleetUpkeep"];
        while (flow < 0 && gold + 2 * flow < 0)
        {
            var idle = plan.Role.Where(r => r.Value is "hold" or "move" && !plan.Threatened.Contains(r.Key))
                .Select(r => r.Key).OrderBy(x => b.Value(x)).ThenBy(x => x, StringComparer.Ordinal).FirstOrDefault();
            if (idle is null)
            {
                if (gold + flow >= 0) break;
                var deserter = plan.Orders.Where(o => o.Value is not (DisbandOrder or GiftUnitOrder)).Select(o => o.Key)
                    .Where(u => TroopsFor(b, brain, u, Upkeep(u)) is not null).OrderBy(x => b.Value(x)).ThenBy(x => x, StringComparer.Ordinal).FirstOrDefault();
                if (deserter is null) break;
                plan.Orders[deserter] = new GiftUnitOrder(deserter, TroopsFor(b, brain, deserter, Upkeep(deserter))!.Value);
                plan.Role[deserter] = "gift";
                flow += Upkeep(deserter);
                continue;
            }
            var upkeep = Upkeep(idle);
            if (TroopsFor(b, brain, idle, upkeep) is { } friend)
            {
                plan.Orders[idle] = new GiftUnitOrder(idle, friend);
                plan.Role[idle] = "gift";
            }
            else
            {
                plan.Orders[idle] = new DisbandOrder(idle);
                plan.Role[idle] = "disband";
            }
            flow += upkeep;
        }

        // Levies, where a plan fell short and the treasury can feed the unit for the rest of the game.
        // A levy stands only if the province is still ours after movement, so the provinces a rival is least likely to walk
        // into this season come first: those under no threat, then the least likely to be attacked, then the capital and the
        // richest. (Until the fix pass after item 4 threatened provinces came first, and more than a third of the levies
        // failed: the province was taken before the levy. No gold is paid for a levy that fails, but another province could
        // have raised it.)
        var spots = Board.Map.HomeOf(me)
            .Where(x => b.OwnerOf(x.Id) == me && !b.UnitAt.ContainsKey(x.Id) && !plan.Destinations.Contains(x.Id))
            .OrderBy(x => plan.Danger.TryGetValue(x.Id, out var d) ? d.Chance : 0).ThenByDescending(x => x.Capital).ThenByDescending(x => x.Yield).ToList();
        var maritime = me is Power.Alashiya or Power.Arzawa;
        var raised = 0;
        foreach (var (near, value) in plan.Shortfalls.OrderByDescending(s => s.Value))
        {
            if (raised >= 2) break;
            var spot = spots.FirstOrDefault(s => s.Id == near || Board.Map.CanMove(UnitKind.Army, s.Id, near) || (s.IsCoastal && Board.Map.CanMove(UnitKind.Fleet, s.Id, near)));
            if (spot is null) continue;
            var fleet = spot.IsCoastal && !Board.Map.CanMove(UnitKind.Army, spot.Id, near) || (spot.IsCoastal && maritime && b.Mine.Count(u => u.Kind == UnitKind.Fleet) < 2);
            var cost = fleet ? v.Prices["fleet"] : v.Prices["army"];
            var upkeep = fleet ? v.Prices["fleetUpkeep"] : v.Prices["armyUpkeep"];
            var lifetime = cost + upkeep * Math.Min(b.Horizon, 10);
            if (value < lifetime * (0.7 + 0.5 * p.Caution) * (1.3 - 0.6 * p.Aggression)) continue;
            if (gold - cost < reserve) continue;
            if (flow - upkeep < -(gold - cost - reserve) / Math.Max(3, b.Horizon)) continue;
            orders.Add(new RaiseOrder(spot.Id, fleet ? UnitKind.Fleet : UnitKind.Army));
            spots.Remove(spot);
            gold -= cost;
            flow -= upkeep;
            raised++;
        }
        if (b.Mine.Count == 0 && spots.Count > 0 && gold - v.Prices["army"] >= reserve)
        {
            orders.Add(new RaiseOrder(spots[0].Id, UnitKind.Army));
            gold -= v.Prices["army"];
        }

        // Walls (the siege package), at most a level a season, where they pay: on land of ours a feared king could walk into,
        // a level of walls turns a province he would take at once into one he must storm or besiege. A first level saves about
        // a third of its worth against the likeliest attack (a feared king, at least an even chance in four that he comes), a further level about a seventh (another season of siege); against
        // that, the price of the new level and its upkeep, for as long as the game may run (at most ten seasons).
        if (Fortification(b, plan, gold - reserve) is { } walls)
        {
            orders.Add(new FortifyOrder(walls.Province));
            gold -= walls.Cost;
        }

        // Cities: buying turns gold into the same score in land, plus its income, behind walls that now stand for the buyer.
        var units = b.Mine.Select(u => u.Province).ToList();
        var offers = v.Owner.Where(x => x.Value is null).Select(x => x.Key)
            .Where(g => b.OwnerOf(g) is null && (b.UnitAt.GetValueOrDefault(g) is not { } there || there.Power == me) && !plan.Destinations.Contains(g) && Board.Map.WithinReach(g, me, v.Owner, units))
            .Select(g =>
            {
                var y = Board.Map[g].Yield;
                var danger = b.Alive.Any(x => x != me && b.Muster(x, g) >= 2 && brain.Hostility(x, b) > 0.4) ? 0.35 : 0.08;
                // A city a rival can also reach may bounce our bid; prefer the ones only we can buy.
                var rivals = b.Alive.Count(x => x != me && Board.Map.WithinReach(g, x, v.Owner, b.Others.Where(u => u.Power == x).Select(u => u.Province)));
                // A city whose elders lately would not choose between us and another buyer may draw the same rival again:
                // another city is preferred while one is nearly as good.
                var contested = brain.Outbid.TryGetValue(g, out var when) && v.Turn - when <= 3 ? 0.6 : 1;
                return (Id: g, Price: y * v.Prices["cityPricePerYield"], Score: (y * b.Horizon - danger * 10 * y) * (rivals == 0 ? 1.15 : 1 - 0.1 * Math.Min(3, rivals)) * contested);
            })
            .Where(o => o.Score > 0)
            .OrderByDescending(o => o.Score / o.Price).ThenBy(o => o.Id, StringComparer.Ordinal).ToList();
        var buys = 0;
        var margin = reserve * (1.2 - 0.7 * p.Commerce);
        foreach (var o in offers)
        {
            if (buys >= (p.Commerce > 0.45 ? 2 : 1)) break;
            if (gold - o.Price < margin) continue;
            // Two kings who both bid every season never get the city: after a refusal, bid again only half the time.
            if (brain.Outbid.TryGetValue(o.Id, out var refused) && v.Turn - refused <= 3 && !rng.Chance(0.5)) continue;
            orders.Add(new BuyProvinceOrder(o.Id));
            gold -= o.Price;
            buys++;
        }
        brain.SpareGold = gold - reserve;

        // Land we cannot keep goes to a friend rather than to a rival ahead of us (see Cession).
        if (Cession(b, brain, plan) is { } cede) orders.Add(cede);
    }

    /// <summary>The province of ours whose walls are best strengthened this season, and the price, if any pays (see Economy).</summary>
    internal static (string Province, int Cost)? Fortification(Board b, MilitaryPlan plan, double spare)
    {
        var v = b.V;
        var price = v.Prices.GetValueOrDefault("fortifyPerLevel", 50);
        var upkeep = v.Prices.GetValueOrDefault("wallUpkeep", 5);
        (string Province, int Cost, double Net)? best = null;
        foreach (var id in v.Owner.Where(x => x.Value == b.Me).Select(x => x.Key).OrderBy(x => x, StringComparer.Ordinal))
        {
            var level = b.WallLevel(id);
            if (level >= 3 || b.SiegeAt(id) is not null || b.UnitAt.TryGetValue(id, out var within) && within.Power != b.Me) continue;
            // The walls rise at the end of the season, after the moves: an empty province without walls that a feared king can
            // walk into now would be his before they stand (in the first script games of the siege package such orders failed, nearly five a game).
            if (level == 0 && !b.Mine.Any(u => u.Province == id)) continue;
            var chance = plan.Danger.TryGetValue(id, out var d) ? d.Chance : 0;
            if (chance < 0.4) continue;
            var cost = price * (level + 1);
            var above = level + 1 > MapData.StartWalls.GetValueOrDefault(id);
            var net = chance * b.Value(id) * (level == 0 ? 0.35 : 0.15) - cost - (above ? upkeep * Math.Min(b.Horizon, 10) : 0);
            if (net <= 0 || cost > spare - 60) continue;
            if (best is null || net > best.Value.Net) best = (id, cost, net);
        }
        return best is { } w ? (w.Province, w.Cost) : null;
    }

    /// <summary>
    /// A friend to give a unit we can no longer pay for: one we would not betray, whose land or troops it stands in or next
    /// to, and whose treasury, as we reckon it, feeds the unit for four seasons. The friend we trust most first. Never a
    /// unit standing in our own land: land passes to whoever's troops stand in it, so the friend would take the province
    /// with it.
    /// </summary>
    private static Power? TroopsFor(Board b, Brain brain, string unit, int upkeep) =>
        b.IsMine(unit) ? null
        : b.Alive.Where(x => x != b.Me && brain.IsFriend(x) && brain.Betraying != x && brain.Treasury.GetValueOrDefault(x) >= 4 * upkeep
                             && (b.OwnerOf(unit) == x || Board.Map.Neighbors(unit).Any(n => b.OwnerOf(n) == x || b.UnitAt.GetValueOrDefault(n)?.Power == x)))
            .OrderByDescending(x => brain.Rel[x].Trust).ThenBy(x => x).Cast<Power?>().FirstOrDefault();

    /// <summary>
    /// A province of ours we cannot keep, ceded to a friend who can, before a rival ahead of us takes it: land outside our
    /// homeland, with no walls, no troop of ours in it and none that could reach it, with troops next to it or a move from
    /// it of a king who is not our friend, leads the race or stands at or above us, and has been taking land or is hostile
    /// to us; and next to the troops or land of a friend we would not betray, who does not lead and whose growth with the
    /// province stays below the rival's.
    /// The province is lost to us either way; given to the friend, it does not carry the rival further ahead, and a king at
    /// peace with the friend will not march into it. The cession fails, at no cost, if the rival takes it first. At most
    /// one a season.
    /// </summary>
    private static CedeProvinceOrder? Cession(Board b, Brain brain, MilitaryPlan plan)
    {
        var me = b.Me;
        var mine = b.Growth(me);
        var leader = b.Leader();
        foreach (var x in b.V.Owner.Where(o => o.Value == me).Select(o => o.Key).OrderByDescending(x => b.Value(x)).ThenBy(x => x, StringComparer.Ordinal))
        {
            var prov = Board.Map[x];
            // Land a friend ceded to us is kept: passed on, it would only go round the friends a rival is coming for.
            if (prov.Home == me || b.Walls(x) || b.UnitAt.ContainsKey(x) || plan.Destinations.Contains(x) || brain.Received.Contains(x)) continue;
            if (b.Mine.Any(u => Board.Map.CanMove(u.Kind, u.Province, x))) continue;
            // Next to it, or a move from it: ceded before he arrives, it is a friend's land he would have to march into.
            bool Coming(Power r) => b.Muster(r, x) > 0
                                    || b.Others.Any(u => u.Power == r && Board.Map.MovesFrom(u.Kind, u.Province).Any(n => Board.Map.CanMove(u.Kind, n, x)));
            var rival = b.Alive.Where(r => r != me && !brain.IsFriend(r) && Coming(r)
                                           && (r == leader || b.Growth(r) >= mine)
                                           && (brain.Belligerence.GetValueOrDefault(r) >= 0.8 || brain.Rel[r].Hostile))
                .Cast<Power?>().FirstOrDefault();
            if (rival is null) continue;
            var gain = (double)prov.Yield * b.YieldWorth;
            var against = (b.Strength(rival.Value) + gain) / b.StartStrength(rival.Value);
            var friend = b.Alive.Where(f => f != me && f != leader && brain.IsFriend(f) && brain.Betraying != f
                                            && (b.Muster(f, x) > 0 || Board.Map.Neighbors(x).Any(n => b.OwnerOf(n) == f))
                                            && (b.Strength(f) + gain) / b.StartStrength(f) < against)
                .OrderByDescending(f => brain.Rel[f].Trust).ThenBy(f => f).Cast<Power?>().FirstOrDefault();
            if (friend is { } to) return new CedeProvinceOrder(x, to);
        }
        return null;
    }

    // ================================================================= people

    private static readonly string[] Blemishes = ["Owes", "dismissed", "Took", "Abandoned", "forger", "fled", "Kept part", "secretly", "in the pay"];

    /// <summary>How far a court trusts one of its people, from what it knows of them.</summary>
    public static int Reliability(CharacterView c) => -c.KnownFacts.Count(f => Blemishes.Any(x => f.Contains(x, StringComparison.OrdinalIgnoreCase)));

    /// <summary>An inventory tablet that came with gold, brought by a foreign envoy or by our own from abroad.</summary>
    public static bool IsInventory(TabletView t) => t.Source.StartsWith("the inventory ", StringComparison.Ordinal);

    /// <summary>The known facts that show a servant kept gold it carried: a theft found by inquiries, or a forged inventory exposed.</summary>
    private static readonly string[] Thefts = ["Kept part of the gold", "Forged the inventory", "Exposed as the forger of an inventory"];

    /// <summary>One of our people found keeping gold it carried (<see cref="Brain.Thieves"/>), or whose known facts show it.</summary>
    private static bool Thief(Brain brain, CharacterView c) =>
        brain.Thieves.Contains(c.Id) || c.KnownFacts.Any(f => Thefts.Any(x => f.StartsWith(x, StringComparison.Ordinal)));

    /// <summary>The hiring test, for a new servant or one kept on: a wage the king's greed allows, with three seasons of it to spare.</summary>
    private static bool WouldPay(Personality p, int wage, double spare) => wage <= 15 + 25 * (1 - p.Greed) && spare > wage * 3;

    public static void Court(Board b, Brain brain, List<Order> orders, HashSet<string> busy, Rng rng)
    {
        var p = brain.P;
        var v = b.V;
        var spare = brain.SpareGold;
        var staff = v.Court.Where(c => c.Status == "employed").ToList();
        var flow = v.Income - v.Upkeep - v.Wages;
        // More people only while the treasury can carry their wages.
        // A third or fourth servant costs a wage every season: only for a king with letters (or plots) to fill it, and a
        // surplus to match the size of his kingdom (a small court for a small kingdom).
        var wanted = flow < 25 + 0.25 * v.Income ? 2 : 2 + (p.Diplomacy > 0.8 ? 1 : 0) + (p.Cunning > 0.7 && flow > 50 + 0.25 * v.Income ? 1 : 0);

        // A servant given up for lost: its line has read "has not returned" (the word that it is overdue) for three seasons and
        // still does. Away, it costs no gold, but it fills a place at court and the back pay we believe we owe it keeps
        // growing, counted as gold already spent. It is dismissed, which ends both, and the court counts itself one short,
        // so it may hire.
        foreach (var c in v.Court.Where(c => brain.MissingSince.TryGetValue(c.Id, out var since) && v.Turn - since >= 3).ToList())
        {
            orders.Add(new DismissOrder(c.Id));
            busy.Add(c.Id);
            staff.RemoveAll(x => x.Id == c.Id);
        }

        // A servant found keeping gold it carried (see Brain.Thieves, or a theft its known facts show) is let go once it is
        // back at court with nothing on its hands, and the court counts itself one short. Away, it is never renewed.
        foreach (var c in v.Court.Where(c => c.Ready && !busy.Contains(c.Id) && Thief(brain, c)).ToList())
        {
            orders.Add(new DismissOrder(c.Id));
            busy.Add(c.Id);
            staff.RemoveAll(x => x.Id == c.Id);
            brain.Thieves.Remove(c.Id);
        }
        staff.RemoveAll(c => c.NoticePrice is not null && Thief(brain, c));

        // A servant who has given notice is kept on at its price while the court still wants it (counting only those not
        // leaving) and the price passes the hiring test; the most reliable first. Otherwise it is let go. Never early.
        var leaving = staff.Where(c => c.NoticePrice is not null).OrderByDescending(Reliability).ThenBy(c => c.Id, StringComparer.Ordinal).ToList();
        var keeping = staff.Count - leaving.Count;
        foreach (var c in leaving)
        {
            if (keeping >= wanted || !WouldPay(p, c.NoticePrice!.Value, spare)) continue;
            orders.Add(new RenewOrder(c.Id, c.NoticePrice.Value, 6));
            keeping++;
        }

        if (staff.Count < wanted && v.Turn - brain.LastSeek >= 2 && spare > 40)
        {
            orders.Add(new SeekCandidatesOrder());
            brain.LastSeek = v.Turn;
        }

        var candidates = v.Known.Where(c => c.Status == "free" && c.Pitch is not null && c.AskingPrice is not null && Reliability(c) == 0 && !brain.HeldElsewhere.Contains(c.Id))
            .OrderBy(c => c.AskingPrice).ThenBy(c => c.Id, StringComparer.Ordinal).ToList();
        if (staff.Count < wanted && candidates.Count > 0)
        {
            var best = candidates[0];
            var careful = (p.Caution + p.Cunning) / 2 > 0.5;
            if (careful && !brain.Checked.Contains(best.Id) && spare > 30 + v.Income / 2)
            {
                orders.Add(new BackgroundCheckOrder(best.Id, 25));
                brain.Checked.Add(best.Id);
                spare -= 25;
            }
            else if (WouldPay(p, best.AskingPrice!.Value, spare))
                orders.Add(new HireOrder(best.Id, best.AskingPrice.Value, 6));
        }

        // Assay gold from those we do not trust, or that weighed light.
        foreach (var lot in v.UnassayedGold)
        {
            var doubtful = !brain.Rel.TryGetValue(lot.From, out var r) || r.Trust < 0.3 || lot.Weighed < lot.Stated || p.Greed > 0.6;
            if (doubtful && spare > 15) { orders.Add(new AssayOrder(lot.Id)); spare -= v.Prices["assay"]; }
        }

        // Watchmen when spies have been caught lately, or for the careful and rich while spies are likely to come: kings send
        // them to the court they make war on or the one that leads, so to a leader, or to a court attacked in the last three
        // seasons. (Until the fix pass after item 4 the careful and rich paid for watchmen every season, spies or not.)
        var spiedOn = b.Leader() == b.Me || brain.Rel.Values.Any(r => r.LastAttackedUs >= v.Turn - 3);
        if ((v.Turn - brain.LastSpyCaught <= 3 || (p.Caution > 0.7 && spare > 500 && spiedOn)) && spare > 40)
        {
            var spend = (int)(20 + 30 * p.Caution);
            orders.Add(new CounterIntelOrder(spend));
            spare -= spend;
        }

        // Examine evidence that would change what we believe of a friend.
        var examined = false;
        var examineSpend = (int)(30 + 50 * p.Caution);
        var examineFloor = 60 + 60 * (1 - p.Caution);
        foreach (var t in v.Tablets.Where(t => t.Source.StartsWith("shown by") && t.AuthResult is null && !brain.Authenticating.Contains(t.CopyId)))
        {
            var touchesFriend = t.Seals.Any(s => s != b.Me && brain.Rel.ContainsKey(s) && brain.IsFriend(s));
            // Worth paying for only when it could turn us against a friend (gold spent here is score lost).
            if (touchesFriend && spare > examineFloor)
            {
                orders.Add(new AuthenticateOrder(t.CopyId, examineSpend));
                brain.Authenticating.Add(t.CopyId);
                spare -= examineSpend;
                examined = true;
                break;
            }
            // Until examined, half-believe it.
            foreach (var accused in t.Seals.Where(s => s != b.Me && brain.Rel.ContainsKey(s)))
                brain.Rel[accused].Trust -= 0.1 * (1 - p.Caution);
            brain.Authenticating.Add(t.CopyId);
        }

        // The inventories that came with gold, by the same caution rule, at most one examination a season in all: each is
        // weighed up once, when the spare gold would pay for the examination twice over beyond that rule's floor. An envoy
        // that kept part of a lot may have forged an inventory stating only what is left, which only an examination shows.
        // Kings send gold in round sums, so a lot that weighed light (its weight, and its inventory, short of a round ten
        // shekels) is examined half the time, with 40 shekels more, since a forger's hand is found only with gold; gold
        // from a court we trust little a tenth more often; any other only now and then (2% + 5% x caution), since an
        // examination costs more than a small gift is worth. A forger found and traced is named to every court; one of
        // ours is let go (see Thief).
        if (!examined)
        {
            foreach (var t in v.Tablets.Where(t => IsInventory(t) && t.AuthResult is null && !brain.Authenticating.Contains(t.CopyId))
                         .OrderByDescending(t => t.SealedTurn).ThenBy(t => t.CopyId, StringComparer.Ordinal))
            {
                if (spare <= examineFloor + 2 * examineSpend) break;
                brain.Authenticating.Add(t.CopyId);
                var light = Brain.Shekels(t.Text[(t.Text.LastIndexOf(':') + 1)..]) % 10 != 0;
                var doubted = t.Seals.Any(s => s != b.Me && brain.Rel.TryGetValue(s, out var rs) && rs.Trust < 0.3);
                if (!rng.Chance(0.02 + 0.05 * p.Caution + (light ? 0.5 : 0) + (doubted ? 0.1 : 0))) continue;
                var spend = examineSpend + (light ? 40 : 0);
                orders.Add(new AuthenticateOrder(t.CopyId, spend));
                spare -= spend;
                break;
            }
        }

        var ready = v.Court.Where(c => c.Ready && !busy.Contains(c.Id)).OrderByDescending(Reliability).ThenBy(c => c.Id, StringComparer.Ordinal).ToList();
        var leader = b.Leader();

        // Spies come home from a court that has fallen (it has no archive to copy and nobody to watch for), or, when nobody is
        // left at court to send, from a court watched for eight seasons that is no longer the war, the leader or hostile.
        foreach (var (id, (post, since)) in brain.Posted.OrderBy(x => x.Key, StringComparer.Ordinal))
        {
            if (busy.Contains(id) || brain.Recalled.Contains(id) || !Powers.TryParse(post, out var watched)) continue;
            var stale = ready.Count == 0 && v.Turn - since >= 8 && watched != brain.WarTarget && watched != leader
                        && !(brain.Rel.TryGetValue(watched, out var wr) && wr.Hostile);
            if (!v.Fallen.Contains(watched) && !stale) continue;
            orders.Add(new RecallSpyOrder(id));
            busy.Add(id);
            brain.Recalled.Add(id);
        }

        // A spy at the court that matters most, if we have someone to spare.
        if (p.Cunning > 0.55 && ready.Count >= 2 && spare > 120 && rng.Chance(p.Cunning * 0.35))
        {
            var target = brain.WarTarget ?? (leader != b.Me ? leader : null) ?? b.Neighbours().OrderByDescending(x => brain.Hostility(x, b)).Cast<Power?>().FirstOrDefault();
            if (target is { } court)
            {
                var agent = ready[^1];
                orders.Add(new PlaceSpyOrder(agent.Id, Court: court));
                busy.Add(agent.Id);
                ready.Remove(agent);
            }
        }

        // A forged tablet to turn the leader's friends against him.
        if (p.Cunning > 0.7 && p.Honesty < 0.4 && leader is { } top && top != b.Me && ready.Count >= 2 && spare > 100 && rng.Chance(0.15))
        {
            var friendOfTop = b.Alive.Where(x => x != b.Me && x != top).OrderBy(x => brain.Rel[x].Trust).First();
            var victim = b.Alive.Where(x => x != b.Me && x != top && x != friendOfTop).OrderByDescending(x => b.Neighbours().Contains(x)).ThenBy(x => x).Cast<Power?>().FirstOrDefault();
            // The most reliable servant whose hand has not already botched a forgery (see Brain.NoHand).
            if (victim is { } prey && ready.FirstOrDefault(c => !brain.NoHand.Contains(c.Id)) is { } forger)
            {
                orders.Add(new ForgeOrder(forger.Id, $"{top} swears to {friendOfTop}: when the harvest is in, we shall march together against {prey} and divide its land.", [top, friendOfTop]));
                busy.Add(forger.Id);
            }
        }

        // Captives: the honest ransom, the cunning turn, the vengeful execute.
        var captives = v.Known.Where(c => c.Status == "your captive").ToList();
        foreach (var gone in brain.RansomAsked.Keys.Where(id => captives.All(c => c.Id != id)).ToList()) brain.RansomAsked.Remove(gone);
        foreach (var c in captives)
        {
            // Nobody left to pay or to deceive (a ransom or turning refused for it), or a ransom twice lapsed unpaid: the
            // captive is worth nothing kept, so it goes free, unless the king is vengeful. A spy of a sworn ally goes free
            // too: the alliance is worth more than a ransom.
            var worthless = brain.Unclaimed.Contains(c.Id) || brain.RansomLapsed.GetValueOrDefault(c.Id) >= 2;
            var ally = c.Employer is { } master && brain.Rel.TryGetValue(master, out var mr) && mr.Allied && mr.OathsBroken == 0;
            if (worthless || ally)
            {
                orders.Add(new CaptiveOrder(c.Id, worthless && p.Vengeance > 0.75 ? CaptiveFate.Execute : CaptiveFate.Release));
                continue;
            }
            // An envoy our besiegers caught was no spy at a post: it cannot be turned, so the cunning ransom it instead.
            var fate =
                p.Cunning > 0.65 && !c.Intercepted ? new CaptiveOrder(c.Id, CaptiveFate.Turn, Poison: $"The armies of {b.Me} are scattered and tired; they will not march this year.")
                : p.Cunning > 0.65 ? new CaptiveOrder(c.Id, CaptiveFate.Ransom, (int)(60 + 60 * p.Greed))
                : p.Vengeance > 0.75 ? new CaptiveOrder(c.Id, CaptiveFate.Execute)
                : p.Honesty > 0.5 || p.Greed > 0.5 ? new CaptiveOrder(c.Id, CaptiveFate.Ransom, (int)(60 + 60 * p.Greed))
                : new CaptiveOrder(c.Id, CaptiveFate.Release);
            if (fate.Fate == CaptiveFate.Ransom)
            {
                // A demand stands until it is paid or lapses: asking again would only replace it. The court hears that it
                // lapsed ("No ransom came"); in case that word never comes, it asks again after six seasons.
                var lapsed = v.Inbox.Any(i => i.Kind == InboxKind.Notice && i.Subject == c.Id && i.Title == "No ransom came");
                if (brain.RansomAsked.TryGetValue(c.Id, out var asked) && !lapsed && v.Turn - asked < 6) continue;
                brain.RansomAsked[c.Id] = v.Turn;
            }
            orders.Add(fate);
        }

        // Envoys we hold go home once the point is made: one whose king has fallen, or dismissed it, too (it is then free at
        // our court). Until the fix pass after item 4 only those still in a king's service were let go.
        foreach (var c in v.Known.Where(c => c.HeldByYou && c.Status != "your captive"))
        {
            if (!brain.HeldSince.TryGetValue(c.Id, out var since)) brain.HeldSince[c.Id] = since = v.Turn;
            if (v.Turn - since >= (int)Math.Round(1 + 3 * p.Vengeance))
            {
                orders.Add(new ReleaseOrder(c.Id, "Go, and tell your lord to mind his manners with a Great King."));
                brain.HeldSince.Remove(c.Id);
            }
        }

        // Our own people held abroad.
        const string pay = "order pay_ransom for ";
        foreach (var item in v.Inbox.Where(i => i.Kind == InboxKind.Rumor && i.Body.Contains(pay)))
        {
            var id = item.Body[(item.Body.IndexOf(pay, StringComparison.Ordinal) + pay.Length)..].TrimEnd(')', '.', ' ');
            if (p.Honesty >= 0.3 && spare > 150) orders.Add(new PayRansomOrder(id));
        }
        brain.SpareGold = spare;
    }

    // ================================================================= letters

    /// <param name="Against">The king a coalition is sworn against.</param>
    private sealed record Mission(Power To, string Kind, double Score, Power? Against = null);

    public static void Letters(Board b, Brain brain, List<Order> orders, HashSet<string> busy, Rng rng)
    {
        var p = brain.P;
        var v = b.V;
        var me = b.Me;
        // From a besieged capital (the siege package) an envoy may be caught slipping out, and one whose courage failed him
        // will fail again while the siege is as tight: he is not asked for two seasons, and no gold goes out to be taken.
        var besieged = v.Sieges.Any(x => x.Holder == me && x.Province == Board.Map.Capital(me).Id);
        var ready = v.Court.Where(c => c.Ready && !busy.Contains(c.Id) && !(besieged && brain.WouldNotLeave.TryGetValue(c.Id, out var t) && v.Turn - t <= 2))
            .OrderByDescending(Reliability).ThenBy(c => c.Id, StringComparer.Ordinal).ToList();
        if (ready.Count == 0) return;

        var leader = b.Leader();
        var neighbours = b.Neighbours().ToHashSet();
        var missions = new List<Mission>();
        // A neighbour taking our land who is too strong for us alone: we ask the other kings on his borders to stand with us.
        var aggressor = brain.Rel.Where(kv => b.Alive.Contains(kv.Key) && kv.Value.Hostile && kv.Value.LastAttackedUs >= v.Turn - 2 && !kv.Value.Allied
                                              && b.Strength(kv.Key) >= 0.8 * b.Strength(me))
            .OrderByDescending(kv => kv.Value.Grudge).ThenBy(kv => kv.Key).Select(kv => (Power?)kv.Key).FirstOrDefault();
        foreach (var x in b.Alive.Where(x => x != me))
        {
            var r = brain.Rel[x];
            var fresh = v.Turn - r.ProposedTurn >= 4;
            // A coalition against the leader, if he outweighs us both, best with a king whose land touches his and can strike at it too.
            if (leader is { } top && top != me && x != top && x != brain.WarTarget && r.Against != top && r.Trust > -0.3 && fresh && !brain.Rel[top].Allied && !r.Hostile
                && Outweighs(b, top, me, x))
                missions.Add(new(x, "coalition", p.Diplomacy * (b.Growth(top) - 0.6) * (Touches(b, x, top) ? 1.4 : 1) * (neighbours.Contains(x) ? 1.2 : 1), top));
            else if (aggressor is { } foe && x != foe && x != brain.WarTarget && r.Against != foe && r.Trust > -0.3 && fresh && !r.Hostile && Touches(b, x, foe))
                missions.Add(new(x, "coalition", p.Diplomacy * 0.55 + 0.2 * (1 - p.Pride), foe));
            if (x == brain.WarTarget)
            {
                if (p.Cunning * (1 - p.Honesty) > 0.3 && fresh) missions.Add(new(x, "lull", p.Cunning * (1 - p.Honesty)));
                continue;
            }
            if (r.Grudge >= 3 && fresh) missions.Add(new(x, "grievance", 0.3 + 0.5 * p.Vengeance));
            if (!r.Treaty && neighbours.Contains(x) && fresh && !r.Hostile)
                missions.Add(new(x, "peace", (0.3 + p.Caution) * brain.Hostility(x, b) + 0.2 * p.Diplomacy + (me.Tier() == Tier.Weak ? 0.3 : 0)));
            // Alliance with a trusted partner; never with a rival for the crown, and with the leader only for a small
            // kingdom, which has more to gain from his protection than to fear from his rise.
            var small = b.Strength(me) < 0.6 * b.Strength(x);
            if (r.Treaty && !r.Allied && r.Trust > 0.2 && fresh && (x != leader || small) && !Rivals(b, me, x))
                missions.Add(new(x, "alliance", 0.5 * p.Diplomacy + 0.2 * r.Trust + (small ? 0.15 : 0)));
            if (!besieged && brain.IsFriend(x) && brain.SpareGold > 150 && rng.Chance(0.3))
                missions.Add(new(x, "gift", 0.4 * p.Generosity));
            // Tribute, to a great neighbour who looks ready to march.
            if (!besieged && me.Tier() == Tier.Weak && x.Tier() != Tier.Weak && neighbours.Contains(x) && brain.SpareGold > 100 && fresh && !r.Hostile && brain.Hostility(x, b) > 0.35)
                missions.Add(new(x, "tribute", 0.35 + 0.4 * p.Caution));
        }
        // Evidence of broken oaths for a third court.
        var broken = v.Tablets.FirstOrDefault(t => t.SealedTurn is not null && t.Seals.Contains(me) && !brain.SentCopies.Contains(t.CopyId)
            && t.Seals.Any(s => s != me && brain.Rel.TryGetValue(s, out var r) && r.OathsBroken > 0));
        var forged = v.Tablets.FirstOrDefault(t => t.Source.StartsWith("made by") && !brain.SentCopies.Contains(t.CopyId));

        var budget = Math.Min(ready.Count, Math.Min(3, 1 + (int)Math.Round(p.Diplomacy * 2)));
        var sentTo = new HashSet<Power>();
        var queue = missions.OrderByDescending(m => m.Score).ThenBy(m => m.To).ToList();

        void Send(DispatchOrder d, string? copy = null)
        {
            orders.Add(d);
            busy.Add(d.Envoy);
            sentTo.Add(d.To);
            ready.RemoveAll(c => c.Id == d.Envoy);
            if (copy is not null) brain.SentCopies.Add(copy);
            if (d.Proposal is not null && brain.Rel.TryGetValue(d.To, out var rel)) rel.ProposedTurn = v.Turn;
            budget--;
        }

        if (forged is not null && budget > 0 && ready.Count > 0)
        {
            var shown = b.Alive.Where(x => x != me && !forged.Seals.Contains(x)).OrderByDescending(x => neighbours.Contains(x)).ThenBy(x => x).Cast<Power?>().FirstOrDefault();
            if (shown is { } audience)
                Send(new DispatchOrder(ready[^1].Id, audience,
                    $"My brother, see what {string.Join(" and ", forged.Seals)} have sealed in secret. I send you the tablet itself. Judge for yourself who are your friends.",
                    "Show the tablet. Promise nothing.", Greet(brain, audience), Copies: [forged.CopyId]), forged.CopyId);
        }
        if (broken is not null && budget > 0 && ready.Count > 0)
        {
            var breaker = broken.Seals.First(s => s != me && brain.Rel.TryGetValue(s, out var r) && r.OathsBroken > 0);
            var told = b.Alive.Where(x => x != me && x != breaker && !sentTo.Contains(x)).OrderByDescending(x => neighbours.Contains(x)).ThenBy(x => x).Cast<Power?>().FirstOrDefault();
            if (told is { } third)
                Send(new DispatchOrder(ready[0].Id, third,
                    $"{breaker} sealed this tablet with me before the gods, and then broke it. See for yourself what an oath of {breaker} is worth. Stand with me, and {breaker} will learn the price of a broken oath.",
                    $"You may agree to act together against {breaker}. Promise no land.", Greet(brain, third), Copies: [broken.CopyId]), broken.CopyId);
        }

        foreach (var m in queue)
        {
            if (budget <= 0 || ready.Count == 0) break;
            if (sentTo.Contains(m.To) || m.Score <= 0.15) continue;
            // Tablets, and the gold of gifts and tribute (a peace letter may carry gold too), go with the most reliable envoy
            // still at court; the rest with the least reliable. (Until the fix pass after item 4 gifts went with the least
            // reliable, so a servant known to skim carried the gold.)
            var trusted = m.Kind is "coalition" or "alliance" or "peace" or "gift" or "tribute";
            var envoy = trusted ? ready[0] : ready[^1];
            var d = Compose(b, brain, m, envoy.Id, rng);
            if (d is not null) Send(d);
        }
    }

    private static DispatchOrder? Compose(Board b, Brain brain, Mission m, string envoy, Rng rng)
    {
        var p = brain.P;
        var me = b.Me;
        var to = m.To;
        var greet = Greet(brain, to, humble: m.Kind == "tribute");
        var flavour = Flavour(me, to);
        var weaker = b.LandGrowth(me) * Board.Map.HomeOf(me).Sum(x => x.Yield) < b.LandGrowth(to) * Board.Map.HomeOf(to).Sum(x => x.Yield);
        // Gifts are score given away: kept small, and only one gift-bearing letter a season.
        int Gift(double share)
        {
            if (brain.SpareGold < 100 || brain.GiftTurn == b.V.Turn) return 0;
            brain.GiftTurn = b.V.Turn;
            // No more than a third of a season's income: a small kingdom's gifts are small.
            return (int)Math.Clamp(10 + brain.SpareGold * share * 0.5, 20, Math.Max(20, Math.Min(60, b.V.Income / 3))) / 10 * 10;
        }
        // The faithless debase their gold, but only for a friend who trusts them (trust of 0.3 or more, as ours in him
        // shows it), who has no cause to assay it: courts assay gold from those they trust little, so gold debased for anyone
        // else is found and costs more trust than it saves gold. (Until the fix pass after item 4 every gift of theirs was
        // debased, and almost every one was found.)
        int Purity() => p.Honesty < 0.45 && brain.IsFriend(to) && brain.Rel[to].Trust >= 0.3 ? rng.Range(55, 85) : 100;

        switch (m.Kind)
        {
            case "coalition":
            {
                var top = m.Against!.Value;
                var why = top == b.Leader()
                    ? $"{top} grows like the flood of the river and swallows the cities one by one. If we stand apart, it will swallow us both."
                    : $"{top} has sent his troops into my land, and what he takes from me today he will take from you tomorrow.";
                return new DispatchOrder(envoy, to,
                    $"{why} Let us stand together and hold him back: where your troops face {top}, mine will support them. {flavour}",
                    $"You may swear alliance against {top} and agree to support each other's troops. Promise no land.", greet,
                    Proposal: new TabletProposal
                    {
                        Text = CoalitionTablet(me, to, top),
                        // A pact against one king, not an alliance: it does not make the two of them partners in victory.
                        AllianceOath = false,
                    });
            }
            case "alliance":
                return new DispatchOrder(envoy, to,
                    $"We have kept the peace between us, as brothers should. Let us go further and swear to stand together, so that the enemy of one is the enemy of both. {flavour}",
                    "You may swear a full alliance. Promise no land.", greet,
                    Proposal: new TabletProposal
                    {
                        Text = AllianceTablet(me, to),
                        AllianceOath = true,
                    });
            case "peace":
            {
                // The weak pay tribute; the generous send gifts anyway.
                var gift = weaker || p.Generosity > 0.6 ? Gift(0.08 + 0.1 * p.Generosity + (weaker ? 0.06 : 0)) : 0;
                return new DispatchOrder(envoy, to,
                    $"I wish to live in brotherhood with you, as our fathers did. Let neither of us send troops into the lands of the other." + (gift > 0 ? " I send you gold as a sign of my love." : "") + $" {flavour} Seal the tablet I send, before Shamash and the gods of your land.",
                    "You may agree to peace and an exchange of gifts. Promise no land.", greet, gift, gift > 0 ? Purity() : 100,
                    new TabletProposal { Text = PeaceTablet(me, to) });
            }
            case "lull":
                return new DispatchOrder(envoy, to,
                    $"Why should there be anything but friendship between us? My troops are few and my thoughts are of the harvest. Let gifts pass between us. {flavour}",
                    "Speak only of friendship. Promise nothing.", greet);
            case "grievance":
            {
                var r = brain.Rel[to];
                var text = r.OathsBroken > 0
                    ? "You swore before the gods and then sent your troops into my land. Is this the oath of a king? Withdraw, and send me fitting gifts, or the gods and I will remember it."
                    : "Your troops have entered my land. Is this brotherhood? Withdraw them, and send me a fitting gift, or I will not forget it.";
                // A king strong enough to make it good, and warlike or vengeful enough to mean it, threatens war outright.
                if (b.Strength(me) >= 0.9 * b.Strength(to) && p.Aggression + p.Vengeance > 1)
                    text += " If you do not withdraw, my troops will march into your land.";
                return new DispatchOrder(envoy, to, $"{text} {flavour}".Trim(), "Demand withdrawal and gifts. Agree to nothing less.", greet);
            }
            case "gift" or "tribute":
            {
                var gift = Gift(0.06 + 0.08 * p.Generosity);
                if (gift == 0) return null;
                return new DispatchOrder(envoy, to,
                    $"I have heard that all is well with you, and I rejoice. Here is a gift for my brother; send me your messenger quickly. {flavour}",
                    "Speak of friendship. Promise nothing.", greet, gift, Purity());
            }
        }
        return null;
    }

    // The tablets a script king proposes.
    private const string Curse = "If one breaks this oath, may the gods destroy his name and his seed.";

    public static string PeaceTablet(Power me, Power to) =>
        $"{Oath}: {me} and {to} are brothers. Neither king shall send troops into the lands of the other. {Curse}";

    public static string AllianceTablet(Power me, Power to) =>
        $"{Oath}: {me} and {to} are allies. Each shall stand with the other against any enemy, and the friend of one shall be the friend of the other. {Curse}";

    public static string CoalitionTablet(Power me, Power to, Power against) =>
        $"{Oath}: {me} and {to} swear to stand together against {against}. Neither shall make peace with {against} alone, and each shall support the other's troops against {against}. {Curse}";

    /// <summary>
    /// Whether a tablet from this sender is in a script king's own words: one of the tablets above, or the frozen
    /// baseline's (see <see cref="BaselineLeader"/>), so that games against it are not changed by the guard below.
    /// </summary>
    private static bool ScriptWords(string text, Power from, Power to) =>
        text == PeaceTablet(from, to) || text == AllianceTablet(from, to)
        || text == $"{Oath}: {from} and {to} are brothers. Neither king shall send troops into the lands of the other. They shall stand together against any enemy, and share in the victory. {Curse}"
        || Powers.All.Any(x => text == CoalitionTablet(from, to, x) || text == $"{Oath}: {from} and {to} swear to stand together against {x}. Neither shall make peace with {x} alone. {Curse}");

    /// <summary>
    /// Whether a tablet in words no script king wrote speaks of land, gold or tribute, or names a province of ours (held
    /// now, or of our homeland). A capital's name often stands for its king or his realm ("Egypt and Babylon are
    /// brothers", "the king of Hattusa") or for a god ("By Ashur and Shamash"), so a capital of ours counts only in a
    /// sentence that hands something over ("Babylon shall be Egypt's", "Hatti yields Hattusa"). A script king reads no
    /// more of a tablet than whom it stands against, so it seals none that could make it give anything away.
    /// </summary>
    public static bool GivesAway(TabletView proposal, Board b, Power from)
    {
        var text = proposal.Text;
        if (ScriptWords(text, from, b.Me)) return false;
        if (TextKit.SpeaksOfLandOrGold(text)) return true;
        var sentences = TextKit.Sentences(text);
        bool Named(string s, Province x) => Names.MentionsPlace(s, x.Name) || Names.MentionsPlace(s, x.Id);
        return Board.Map.Provinces.Where(x => !x.IsSea && (b.IsMine(x.Id) || x.Home == b.Me))
            .Any(x => x.Capital ? sentences.Any(s => Named(s, x) && TextKit.HandsOver(s)) : Named(text, x));
    }

    /// <summary>The greeting a king chooses, from his pride and his feelings for the recipient.</summary>
    /// <param name="humble">Tribute: a modest king sending it does not name himself Great King before the stronger one.</param>
    public static GreetingOptions Greet(Brain brain, Power to, bool humble = false)
    {
        var p = brain.P;
        var o = new GreetingOptions();
        var r = brain.Rel[to];
        if (r.Hostile)
        {
            o.CallBrother = false;
            o.SenderFirst = p.Pride > 0.7;
        }
        // A proud king writes no greeting at all to one who broke an oath to him.
        if (r.OathsBroken > 0 && r.Hostile && p.Pride > 0.8) o.Omit = true;
        if (humble && p.Pride < 0.5) o.ClaimGreatKing = false;
        if (p.Pride > 0.85 && to.Tier() == Tier.Weak && !brain.IsFriend(to)) o.GrantGreatKing = false;
        // Babylon's old complaint: Assyria is no brother and no Great King.
        if (brain.Me == Power.Babylonia && to == Power.Assyria && p.Pride > 0.6 && !brain.IsFriend(to))
        {
            o.CallBrother = false;
            o.GrantGreatKing = false;
        }
        return o;
    }

    private static string Flavour(Power me, Power to) => me switch
    {
        Power.Egypt => "In my land gold is as plentiful as dust, and my friends do not go without.",
        Power.Babylonia => "Remember that the gifts of a Great King should be worthy of a Great King.",
        Power.Mitanni => "Let my brother protect me as his father protected mine, and I will be his faithful friend.",
        Power.Assyria => "I am a Great King, as you are, and I will be treated as one.",
        Power.Hatti => "The troops of Hatti are many, and they remember their friends.",
        Power.Arzawa => "The west is wide, and its friendship can be had.",
        Power.Alashiya => "I send you copper from my mountains; send me silver and gold.",
        _ => "",
    };

    // ================================================================= audiences

    public static HostReply Host(AudienceView view, Board b, Brain brain, Rng rng)
    {
        var p = brain.P;
        var me = view.Host;
        var sender = view.From;
        var r = brain.Rel[sender];
        var leader = b.Leader();
        var hostile = r.Hostile || sender == brain.WarTarget;
        var friend = brain.IsFriend(sender) && brain.Betraying != sender;
        // The second exchange, held only when the host offered a gift (see the bribe below): if the envoy refused it, the
        // host offers half as much again, once, with the same request; otherwise it lets the envoy go.
        if (view.Round > 1)
        {
            var again = new HostReply { End = true, Speech = "Go in peace, and carry my words faithfully." };
            if (brain.BribeOffered.Remove(view.AudienceId, out var offered) && view.GiftAccepted == 0 && brain.SpareGold > 150 + offered.Bribe)
            {
                again.Bribe = (int)Math.Round(offered.Bribe * 1.5 / 10) * 10;
                again.BribeAsk = offered.Ask;
                again.Speech = "Do not refuse me so quickly. Take this, and think again of what I asked of you.";
            }
            return again;
        }

        var reply = new HostReply { End = true };
        var speech = new List<string>();

        if (view.GreetingDeviations.Contains("no greeting at all"))
        {
            speech.Add("Your tablet does not even greet me. Is this how one writes to a Great King?");
            r.Trust -= 0.1 * p.Pride;
        }
        else if (view.GreetingDeviations.Contains("no \"brother\""))
        {
            speech.Add("You do not call me brother. Have I not been a brother to you?");
            r.Trust -= 0.1 * p.Pride;
        }
        if (view.GreetingDeviations.Contains("the recipient is not called Great King"))
        {
            speech.Add("And you deny me the title of Great King. I will remember it.");
            r.Grudge += p.Pride;
        }
        if (view.GreetingDeviations.Contains("the sender's name first")) speech.Add("You put your own name before mine.");
        // A king who does not name himself Great King before us: a proud host is flattered.
        if (view.GreetingDeviations.Contains("the sender does not claim to be a Great King"))
        {
            speech.Add("Your lord writes modestly to a Great King. It is well.");
            r.Trust += 0.05 + 0.1 * p.Pride;
        }
        // An envoy secretly in our pay shows us what its lord really told it. Words of friendship it was told to speak
        // and nothing more, or threats against us it left unsaid, show a lord who means us harm.
        if (view.SecretMandate is { } secret
            && (secret.Contains("only of friendship", StringComparison.OrdinalIgnoreCase)
                || TextKit.Sentences(view.SecretLetter ?? "").Any(x => TextKit.IsThreatTo(x, me, sender) && !view.Spoken.Contains(x, StringComparison.Ordinal))))
        {
            r.Trust -= 0.3;
            r.Grudge += 1.5;
        }

        if (view.GoldStated > 0 && view.GoldWeighed < view.GoldStated)
        {
            speech.Add($"The inventory lists {Money.Format(view.GoldStated)}, but my weighers found only {Money.Format(view.GoldWeighed)}. Either your lord is mean or your messenger's hands are heavy with my gold.");
            r.Trust -= 0.15;
        }
        else if (view.GoldWeighed > 0)
        {
            speech.Add(p.Greed > 0.65 && view.GoldWeighed < 100 ? "I have received your gift. It is small, for a Great King." : "I have received your gift, and I thank my brother.");
            r.Trust += Math.Min(0.25, view.GoldWeighed / 400.0);
        }

        foreach (var copy in view.CopiesShown)
        {
            foreach (var accused in copy.Seals.Where(s => s != sender && s != me && brain.Rel.ContainsKey(s)))
                brain.Rel[accused].Trust -= 0.15 * (1 - p.Caution);
            speech.Add("I have seen the tablet you show me. I will remember who breaks oaths, and who forges them.");
        }

        if (view.Proposal is { } proposal)
        {
            // The king a coalition names, by any of his names (see Names).
            var named = Names.SwornAgainst(proposal.Text, [me, sender]);
            bool seal;
            if (named is { } against)
            {
                // Worth swearing against the king who leads (or stands at the top as we reckon it, since the envoy
                // has been on the road) if he outweighs us both; or against one on our own borders who is taking
                // land and is too strong for the sender alone. Never against an ally. A peace with him does not
                // forbid it: supporting a partner sends no troops into his land.
                var ra = brain.Rel[against];
                var ahead = b.Growth(against) >= Board.LeadFloor - 0.05 && b.Alive.Where(x => x != against).All(x => b.Growth(against) >= b.Growth(x));
                var race = (against == leader || ahead) && Outweighs(b, against, me, sender);
                var defence = Touches(b, me, against) && b.Strength(against) >= 0.8 * b.Strength(sender)
                              && (brain.Belligerence.GetValueOrDefault(against) >= 1 || ra.Hostile || against == brain.WarTarget || ra.Trust < 0);
                // And never with a king who is taking our own land, whoever he names.
                seal = !ra.Allied && !hostile && (race || defence);
            }
            else seal = !hostile && !(proposal.AllianceOath && Rivals(b, me, sender));
            if (sender == leader && !friend && p.Caution < 0.6) seal = false;
            // A tablet in someone else's words is read for what it would give away (see GivesAway).
            var givesAway = seal && GivesAway(proposal, b, sender);
            if (givesAway) seal = false;
            reply.SealProposal = seal;
            speech.Add(seal ? "I have sealed the tablet before the gods."
                : givesAway ? "I will not seal a tablet that speaks of land, gold or tribute, or names a province of mine."
                : "I will not seal this tablet now.");
            // An oath to stand together asks for the envoy's word too, which it gives within its mandate, or beyond it.
            if (seal && (named is not null || proposal.AllianceOath))
                speech.Add("Swear to me that your lord's troops will stand with mine, as mine will stand with his.");
            if (seal)
            {
                r.Trust += 0.1;
                // What we swore binds us from now, not from when we next read our tablets: this season's orders are still to come.
                r.Treaty = true;
                if (proposal.AllianceOath) r.Allied = true;
                if (named is { } foe) r.Against = foe;
            }
        }

        speech.Add(friend ? "Tell my brother that my love for him is great."
            : hostile ? "Tell your lord that I have not forgotten what he did."
            : "Tell your lord that I have heard his words.");
        speech.Add(Flavour(me, sender));

        // A gift to the messenger, to colour what he tells his lord.
        if (p.Cunning > 0.6 && !friend && brain.SpareGold > 150 && rng.Chance(0.4 * p.Cunning))
        {
            reply.Bribe = 30 + rng.Range(0, 3) * 10;
            reply.BribeAsk = hostile ? "Tell your lord that my armies are few and my thoughts are of peace." : "Tell your lord that my armies are many and my friendship is worth keeping.";
            // The audience stays open for one more exchange, to offer more if the envoy refuses (see above).
            reply.End = false;
            brain.BribeOffered[view.AudienceId] = (reply.Bribe, reply.BribeAsk);
        }
        if (hostile && r.Grudge > 3 && p.Vengeance > 0.6 && rng.Chance(0.5)) reply.Detain = true;
        if (Reliability(view.Envoy) == 0 && b.V.Court.Count(c => c.Status == "employed") < 3 && brain.SpareGold > 200 && rng.Chance(0.1 + 0.2 * p.Cunning))
            reply.JobOffer = 30;
        if (friend && view.GoldWeighed >= 40 && brain.SpareGold > 100 && p.Generosity > 0.5)
        {
            reply.GoldBack = view.GoldWeighed / 4 / 10 * 10;
            // Debased only for a friend we trust 0.3 or more, as for gifts (see Compose).
            reply.GoldBackPurity = p.Honesty < 0.45 && r.Trust >= 0.3 ? 75 : 100;
        }

        reply.Speech = string.Join(" ", speech.Where(s => s.Length > 0));
        return reply;
    }
}
