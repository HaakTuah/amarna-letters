using Amarna.Engine;

namespace Amarna.Game.Bots;

/// <summary>
/// A heuristic leader for engine testing and offline play. Each power gets a seeded temperament
/// (aggression, honesty, greed). It remembers who took its land or sent bad gold, keeps sealed
/// tablets unless tempted (and dishonest), writes letters from templates and runs its court.
/// It sees exactly what any seat sees: the <see cref="SeatView"/>.
/// </summary>
public sealed class ScriptLeader : ISeat
{
    private sealed class Memory
    {
        public double Aggression, Honesty, Greed;
        public Dictionary<string, Power?> LastOwner = new();
        public Dictionary<Power, int> Grudge = new();
        public HashSet<string> Checked = new();
        public Dictionary<string, int> HeldSince = new();
        public HashSet<string> SentCopies = new();
        public int LastSeek = -10;
        public int LastTurnSeen;
    }

    private readonly ulong _seed;
    private readonly Dictionary<Power, Memory> _mem = new();
    private static readonly WorldMap Map = WorldMap.Default;

    public ScriptLeader(ulong seed) => _seed = seed;

    public string Label => "Script bot";

    private Memory Mem(Power p)
    {
        lock (_mem)
        {
            if (_mem.TryGetValue(p, out var m)) return m;
            var r = Rng.For(_seed, 0, "bot-temperament", p.ToString());
            m = new Memory { Aggression = 0.3 + r.NextDouble() * 0.6, Honesty = r.NextDouble(), Greed = r.NextDouble() };
            _mem[p] = m;
            return m;
        }
    }

    private static int G(Memory m, Power p) => m.Grudge.GetValueOrDefault(p);

    /// <summary>Whoever holds far more land than anyone else, as the public map shows it.</summary>
    private static Power? Leader(SeatView v)
    {
        var counts = Powers.All.Where(p => !v.Fallen.Contains(p)).ToDictionary(p => p, p => v.Owner.Count(x => x.Value == p));
        if (counts.Count < 2) return null;
        var top = counts.OrderByDescending(x => x.Value).ThenBy(x => x.Key).First();
        var rest = counts.Where(x => x.Key != top.Key).Select(x => x.Value).Average();
        return top.Value >= 8 && top.Value >= rest * 1.6 && top.Key != v.Power ? top.Key : null;
    }

    private static HashSet<Power> Peace(SeatView v) =>
        v.Tablets.Where(t => t.SealedTurn is not null && t.Seals.Contains(v.Power) && t.Seals.Count >= 2)
            .SelectMany(t => t.Seals).Where(p => p != v.Power).ToHashSet();

    // ================================================================= orders

    public Task<TurnSubmission> DecideAsync(SeatView view, CancellationToken ct)
    {
        var m = Mem(view.Power);
        Learn(view, m);
        var rng = Rng.For(_seed, view.Turn, "bot-decide", view.Power.ToString());
        var orders = new List<Order>();
        var destinations = Military(view, m, rng, orders);
        Economy(view, m, rng, orders, destinations);
        Diplomacy(view, m, rng, orders);
        Court(view, m, rng, orders);
        m.LastOwner = new Dictionary<string, Power?>(view.Owner);
        m.LastTurnSeen = view.Turn;
        var notes = $"Grudges: {string.Join(", ", m.Grudge.Where(g => g.Value > 0).Select(g => $"{g.Key} {g.Value}"))}";
        return Task.FromResult(new TurnSubmission { Orders = orders, Notes = notes });
    }

    private static void Learn(SeatView v, Memory m)
    {
        var me = v.Power;
        foreach (var (prov, before) in m.LastOwner)
            if (before == me && v.Owner.GetValueOrDefault(prov) is { } taker && taker != me)
                m.Grudge[taker] = G(m, taker) + 3;

        foreach (var item in v.Inbox)
        {
            foreach (var p in Powers.All.Where(p => p != me))
            {
                var name = p.ToString();
                if (item.Kind == InboxKind.Rumor && item.Body.Contains("has not returned from the court of " + name)) m.Grudge[p] = G(m, p) + 2;
                if (item.Kind == InboxKind.Assay && item.Body.Contains("from " + name) && !item.Body.Contains("(100%)")) m.Grudge[p] = G(m, p) + 2;
                if (item.Kind is InboxKind.Rumor && item.Body.Contains("was forged by") && item.Body.Contains("of " + name)) m.Grudge[p] = G(m, p) + 1;
                if (item.Kind == InboxKind.Notice && item.Body.Contains("confesses to serving " + name)) m.Grudge[p] = G(m, p) + 2;
            }
        }
        if (v.Turn % 4 == 0)
            foreach (var p in m.Grudge.Keys.ToList()) m.Grudge[p] = Math.Max(0, m.Grudge[p] - 1);
    }

    private HashSet<string> Military(SeatView v, Memory m, Rng rng, List<Order> orders)
    {
        var me = v.Power;
        var peace = Peace(v);
        var unitAt = v.Units.ToDictionary(u => u.Province);
        var mine = v.Units.Where(u => u.Power == me).OrderBy(u => u.Province, StringComparer.Ordinal).ToList();
        var others = v.Units.Where(u => u.Power != me).ToList();
        var free = mine.ToDictionary(u => u.Province);
        var destinations = new HashSet<string>();
        var treacherous = m.Honesty < 0.3 && rng.Chance(0.35);

        var leader = Leader(v);
        bool Friendly(Power p) => peace.Contains(p) && G(m, p) < 3 && p != leader;
        bool Willing(Power owner) => Friendly(owner) ? treacherous
            : G(m, owner) >= 3 || m.Aggression + 0.1 * G(m, owner) + (owner == leader ? 0.3 : 0) > 0.55;

        // Hold valuable land that is threatened.
        foreach (var u in mine)
        {
            if (v.Owner.GetValueOrDefault(u.Province) != me) continue;
            var threats = others.Count(o => !Friendly(o.Power) && Map.CanMove(o.Kind, o.Province, u.Province));
            var p = Map[u.Province];
            if (threats > 0 && (p.Capital || p.Yield >= 35 || threats >= 2))
            {
                orders.Add(new HoldOrder(u.Province));
                free.Remove(u.Province);
            }
        }

        // Help the walls of our own cities hold when enemies stand next to them.
        foreach (var city in v.Garrisons.Where(g => v.Owner.GetValueOrDefault(g) == me).OrderBy(g => g, StringComparer.Ordinal))
        {
            if (!others.Any(o => !Friendly(o.Power) && Map.CanMove(o.Kind, o.Province, city))) continue;
            var helper = free.Values.Where(u => Map.CanMove(u.Kind, u.Province, city)).OrderBy(u => u.Province, StringComparer.Ordinal).FirstOrDefault();
            if (helper is null) continue;
            orders.Add(new SupportOrder(helper.Province, city));
            free.Remove(helper.Province);
        }

        // Pick targets and gather enough strength for each.
        var targets = new List<(string Id, int Need, int Value)>();
        foreach (var t in free.Values.SelectMany(u => Map.MovesFrom(u.Kind, u.Province)).Distinct().Where(id => !Map[id].IsSea))
        {
            var owner = v.Owner.GetValueOrDefault(t);
            var occ = unitAt.GetValueOrDefault(t);
            if (occ?.Power == me) continue;
            int need;
            if (owner is null) need = occ is null ? (v.Garrisons.Contains(t) ? 2 : 1) : (Willing(occ.Power) ? 2 : 0);
            else if (owner == me) need = occ is null ? 0 : 2;
            else if (!Willing(owner.Value)) need = 0;
            else need = occ is null ? (v.Garrisons.Contains(t) ? 2 : 1) : 2 + (m.Aggression < 0.5 ? 1 : 0);
            if (need == 0) continue;
            var prov = Map[t];
            var value = prov.Yield + (prov.Capital ? 25 : 0) + (owner is null ? 5 : 0) + (prov.Home == me ? 30 : 0)
                        + (owner is { } o ? G(m, o) * 3 + (o == leader ? 15 : 0) : 0);
            targets.Add((t, need, value));
        }
        foreach (var (target, need, _) in targets.OrderByDescending(x => x.Value).ThenBy(x => x.Id, StringComparer.Ordinal))
        {
            var able = free.Values.Where(u => Map.CanMove(u.Kind, u.Province, target))
                .OrderBy(u => u.Kind == UnitKind.Army ? 0 : 1).ThenBy(u => u.Province, StringComparer.Ordinal).ToList();
            if (able.Count < need) continue;
            var attacker = able[0];
            orders.Add(new MoveOrder(attacker.Province, target));
            free.Remove(attacker.Province);
            foreach (var s in able.Skip(1).Take(need - 1))
            {
                orders.Add(new SupportOrder(s.Province, attacker.Province, target));
                free.Remove(s.Province);
            }
            destinations.Add(target);
        }

        // Everyone else walks toward the nearest land worth having, or supports a neighbour.
        var staying = new HashSet<string>(mine.Select(u => u.Province).Where(p => !orders.OfType<MoveOrder>().Any(o => o.Unit == p)));
        foreach (var u in free.Values.ToList())
        {
            var step = StepToward(u, v, me, peace, m, destinations, unitAt);
            if (step is not null)
            {
                orders.Add(new MoveOrder(u.Province, step));
                destinations.Add(step);
                continue;
            }
            var assist = orders.OfType<MoveOrder>().FirstOrDefault(o => Map.CanMove(u.Kind, u.Province, o.To) && o.Unit != u.Province);
            orders.Add(assist is not null ? new SupportOrder(u.Province, assist.Unit, assist.To) : new HoldOrder(u.Province));
        }
        return destinations;
    }

    private static string? StepToward(UnitView u, SeatView v, Power me, HashSet<Power> peace, Memory m, HashSet<string> taken, Dictionary<string, UnitView> unitAt)
    {
        var leader = Leader(v);
        bool Goal(string id)
        {
            var p = Map[id];
            if (p.IsSea) return false;
            var owner = v.Owner.GetValueOrDefault(id);
            if (owner == me) return false;
            if (owner is { } o && peace.Contains(o) && G(m, o) < 3 && o != leader) return false;
            return owner is null || m.Aggression > 0.5 || G(m, owner.Value) >= 3 || owner == leader;
        }

        var prev = new Dictionary<string, string> { [u.Province] = "" };
        var queue = new Queue<string>();
        queue.Enqueue(u.Province);
        while (queue.Count > 0)
        {
            var cur = queue.Dequeue();
            if (cur != u.Province && Goal(cur))
            {
                var step = cur;
                while (prev[step] != u.Province) step = prev[step];
                if (taken.Contains(step) || unitAt.ContainsKey(step)) return null;
                if (v.Garrisons.Contains(step)) return null; // walls: wait for help rather than bounce
                return step;
            }
            foreach (var n in Map.MovesFrom(u.Kind, cur).OrderBy(x => x, StringComparer.Ordinal))
                if (!prev.ContainsKey(n)) { prev[n] = cur; queue.Enqueue(n); }
        }
        return null;
    }

    private static void Economy(SeatView v, Memory m, Rng rng, List<Order> orders, HashSet<string> destinations)
    {
        var me = v.Power;
        var gold = v.Gold;
        var reserve = v.Upkeep + v.Wages + 80;
        var provinces = v.Owner.Count(x => x.Value == me);
        var units = v.Units.Count(u => u.Power == me);
        var maritime = me is Power.Alashiya or Power.Arzawa;
        var weak = me.Tier() == Tier.Weak;
        var fleets = v.Units.Count(u => u.Power == me && u.Kind == UnitKind.Fleet);

        var spots = Map.HomeOf(me)
            .Where(p => v.Owner.GetValueOrDefault(p.Id) == me && v.Units.All(u => u.Province != p.Id) && !destinations.Contains(p.Id))
            .OrderByDescending(p => p.Capital).ThenByDescending(p => p.Yield).ToList();
        var raised = 0;
        var surplus = v.Income - v.Upkeep - v.Wages;
        foreach (var spot in spots)
        {
            // Small kingdoms keep their gold for buying cities rather than for troops they cannot feed.
            if (units + raised >= provinces + (weak ? 0 : 1)) break;
            var fleet = spot.IsCoastal && (maritime ? fleets < 2 : fleets == 0 && rng.Chance(0.3));
            var cost = fleet ? v.Prices["fleet"] : v.Prices["army"];
            var upkeep = fleet ? v.Prices["fleetUpkeep"] : v.Prices["armyUpkeep"];
            if (gold - cost < reserve || surplus - upkeep < (weak ? 15 : -5)) break;
            surplus -= upkeep;
            orders.Add(new RaiseOrder(spot.Id, fleet ? UnitKind.Fleet : UnitKind.Army));
            gold -= cost;
            raised++;
            if (fleet) fleets++;
            if (gold < reserve * 2) break;
        }

        var myUnits = v.Units.Where(u => u.Power == me).Select(u => u.Province).ToList();
        var buy = v.Garrisons
            .Where(g => v.Owner.GetValueOrDefault(g) is null && !destinations.Contains(g) && Map.WithinReach(g, me, v.Owner, myUnits))
            .OrderByDescending(g => Map[g].Yield).ThenBy(g => g, StringComparer.Ordinal)
            .FirstOrDefault(g => gold - Map[g].Yield * v.Prices["cityPricePerYield"] >= reserve + (weak ? 20 : 50));
        // Small kingdoms grow by gold rather than by conquest.
        if (buy is not null && rng.Chance(weak ? 0.8 : 0.35 + m.Greed * 0.25)) orders.Add(new BuyProvinceOrder(buy));
    }

    // ================================================================= letters

    private const string Oath = "By Shamash, Amun, Marduk and Teshub";

    private void Diplomacy(SeatView v, Memory m, Rng rng, List<Order> orders)
    {
        var me = v.Power;
        var ready = v.Court.Where(c => c.Ready).OrderBy(c => c.Id, StringComparer.Ordinal).ToList();
        if (ready.Count == 0) return;
        var peace = Peace(v);
        var alive = Powers.All.Where(p => p != me && !v.Fallen.Contains(p)).ToList();
        var mineProv = v.Owner.Where(x => x.Value == me).Select(x => x.Key).ToHashSet();
        var neighbors = alive.Where(p => v.Owner.Any(x => x.Value == p && Map.Neighbors(x.Key).Any(mineProv.Contains))).ToList();
        var reserve = v.Upkeep + v.Wages + 120;
        var sent = 0;
        var spent = 0;

        foreach (var envoy in ready)
        {
            if (sent >= 2 || !rng.Chance(0.55)) continue;
            // Keep one envoy home for spying or later missions now and then.
            if (ready.Count > 1 && sent == 0 && rng.Chance(0.15)) continue;

            var enemy = m.Grudge.Where(g => g.Value >= 3 && alive.Contains(g.Key)).OrderByDescending(g => g.Value).ThenBy(g => g.Key).Select(g => (Power?)g.Key).FirstOrDefault();
            var broken = enemy is { } e1 ? v.Tablets.FirstOrDefault(t => t.SealedTurn is not null && t.Seals.Contains(e1) && t.Seals.Contains(me) && !m.SentCopies.Contains(t.CopyId)) : null;
            var forged = v.Tablets.FirstOrDefault(t => t.Source.StartsWith("made by") && !m.SentCopies.Contains(t.CopyId));
            DispatchOrder? order = null;

            if (forged is not null)
            {
                var audience = alive.Where(p => !forged.Seals.Contains(p)).ToList();
                if (audience.Count > 0)
                {
                    var to = audience[rng.Next(audience.Count)];
                    order = new DispatchOrder(envoy.Id, to,
                        $"My brother, see what {string.Join(" and ", forged.Seals)} have sealed in secret. I send you the tablet itself. Judge for yourself who are your friends.",
                        "Show the tablet. Promise nothing.", Copies: [forged.CopyId]);
                    m.SentCopies.Add(forged.CopyId);
                }
            }
            else if (enemy is { } foe && broken is not null && alive.Count > 2)
            {
                var third = alive.Where(p => p != foe).OrderByDescending(p => neighbors.Contains(p)).ThenBy(p => rng.Next(100)).First();
                order = new DispatchOrder(envoy.Id, third,
                    $"{foe} sealed this tablet with me before the gods, and then broke it. See for yourself what an oath of {foe} is worth. Stand with me, and we will teach {foe} the price of a broken oath.",
                    "You may agree to act together against " + foe + ". Promise no land.", Copies: [broken.CopyId]);
                m.SentCopies.Add(broken.CopyId);
            }
            else if (enemy is { } foe2)
            {
                var gold = v.UnassayedGold.Count == 0 && v.Inbox.Any(i => i.Kind == InboxKind.Assay && i.Body.Contains(foe2.ToString()) && !i.Body.Contains("(100%)"));
                var letter = gold
                    ? "The gold you sent me was not good. When it was put into the furnace it did not come out whole. Is this how a brother treats a brother?"
                    : $"Your troops have entered my land. Is this brotherhood? Withdraw them, and send me a fitting gift, or I will not forget it.";
                order = new DispatchOrder(envoy.Id, foe2, letter, "Demand withdrawal and gifts. Agree to nothing less.",
                    new GreetingOptions { CallBrother = false });
            }
            else if (Leader(v) is { } top && alive.Count > 2 && rng.Chance(0.5))
            {
                var partner = alive.Where(p => p != top).OrderByDescending(p => v.Owner.Any(x => x.Value == p && Map.Neighbors(x.Key).Any(n => v.Owner.GetValueOrDefault(n) == top)))
                    .ThenBy(p => rng.Next(100)).First();
                order = new DispatchOrder(envoy.Id, partner,
                    $"{top} grows like the flood of the river and swallows the cities one by one. If we stand apart, it will swallow us too. Let us stand together and hold it back.",
                    $"You may agree to act together against {top} and to seal an oath of alliance. Promise no land.",
                    Proposal: new TabletProposal
                    {
                        Text = $"{Oath}: {me} and {partner} swear to stand together against {top}. Neither shall make peace with {top} alone. If one breaks this oath, may the gods destroy his name and his seed.",
                        AllianceOath = true,
                    });
            }
            else
            {
                var stranger = neighbors.Where(p => !peace.Contains(p)).OrderBy(p => rng.Next(100)).Select(p => (Power?)p).FirstOrDefault();
                var to = stranger ?? alive[rng.Next(alive.Count)];
                var gift = v.Gold - spent > reserve + 150 ? rng.Range(3, 8) * 10 : 0;
                var purity = gift > 0 && m.Honesty < 0.35 ? rng.Range(55, 80) : 100;
                spent += (int)(gift * purity / 100.0);
                if (stranger is not null)
                {
                    var alliance = rng.Chance(0.25);
                    var text = $"{Oath}: {me} and {to} are brothers. Neither king shall send troops into the lands of the other."
                               + (alliance ? " They shall stand together against any enemy, and share in the victory." : "")
                               + " If one breaks this oath, may the gods destroy his name and his seed.";
                    order = new DispatchOrder(envoy.Id, to,
                        "I wish to live in brotherhood with you, as our fathers did. Let neither of us send troops into the lands of the other." + (gift > 0 ? " I send you gold as a sign of my love." : "") + " Seal the tablet I send, before Shamash and the gods of your land.",
                        "You may agree to peace and an exchange of gifts. Promise no land.",
                        Gold: gift, PurityPercent: purity, Proposal: new TabletProposal { Text = text, AllianceOath = alliance });
                }
                else
                {
                    order = new DispatchOrder(envoy.Id, to,
                        "I have heard that all is well with you, and I rejoice. Send me your messenger quickly, and let gifts pass between us as is fitting between brothers." + (gift > 0 ? " Here is a gift for you." : ""),
                        "Speak of friendship. Promise nothing.", Gold: gift, PurityPercent: purity);
                }
            }
            if (order is null) continue;
            orders.Add(order);
            sent++;
        }
    }

    public Task<HostReply> HostAudienceAsync(AudienceView view, SeatView court, CancellationToken ct)
    {
        var me = view.Host;
        var sender = view.From;
        var m = Mem(me);
        var rng = Rng.For(_seed, view.Turn, "bot-host", $"{view.AudienceId}:{view.Round}");
        var peace = Peace(court);
        var hostile = G(m, sender) >= 3 || (Leader(court) == sender && m.Aggression > 0.6);
        var friend = peace.Contains(sender) && !hostile;
        var reply = new HostReply { End = true };
        var speech = new List<string>();

        if (view.GreetingDeviations.Contains("no greeting at all")) speech.Add("Your tablet does not even greet me. Is this how one writes to a Great King?");
        else if (view.GreetingDeviations.Contains("no \"brother\"")) speech.Add("You do not call me brother. Have I not been a brother to you?");
        if (view.GreetingDeviations.Contains("the sender's name first")) speech.Add("And you put your own name before mine.");

        if (view.GoldStated > 0 && view.GoldWeighed < view.GoldStated)
        {
            speech.Add($"The inventory lists {Money.Format(view.GoldStated)}, but my weighers found only {Money.Format(view.GoldWeighed)}. Either your lord is mean or your messenger's hands are heavy with my gold.");
            m.Grudge[sender] = G(m, sender) + 1;
        }
        else if (view.GoldWeighed > 0) speech.Add("I have received your gift.");

        foreach (var copy in view.CopiesShown)
        {
            foreach (var accused in copy.Seals.Where(p => p != sender && p != me)) m.Grudge[accused] = G(m, accused) + 1;
            speech.Add("I have seen the tablet you show me. I will remember who breaks oaths.");
        }

        if (view.Proposal is not null)
        {
            var aggressiveTowardSender = m.Aggression > 0.75 && court.Owner.Any(x => x.Value == sender && court.Units.Any(u => u.Power == me && Map.AreAdjacent(u.Province, x.Key)));
            reply.SealProposal = !hostile && (!aggressiveTowardSender || m.Honesty < 0.4);
            speech.Add(reply.SealProposal ? "I have sealed the tablet before the gods." : "I will not seal this tablet now.");
        }

        speech.Add(friend ? "Tell my brother that my love for him is great." : hostile ? "Tell your lord that I have not forgotten what he did." : "Tell your lord that I have heard his words.");

        if ((m.Greed > 0.6 || hostile) && court.Gold > 400 && rng.Chance(0.35))
        {
            reply.Bribe = 40 + rng.Range(0, 3) * 10;
            reply.BribeAsk = "Tell your lord that my armies are many and my friendship is worth keeping.";
        }
        if (hostile && rng.Chance(0.4)) reply.Detain = true;
        if (court.Gold > 500 && rng.Chance(0.06)) reply.JobOffer = 45;
        if (friend && view.GoldWeighed >= 50 && court.Gold > 300) reply.GoldBack = 30;

        reply.Speech = string.Join(" ", speech);
        return Task.FromResult(reply);
    }

    // ================================================================= court

    private static void Court(SeatView v, Memory m, Rng rng, List<Order> orders)
    {
        var me = v.Power;
        var gold = v.Gold - orders.OfType<RaiseOrder>().Sum(r => r.Kind == UnitKind.Army ? v.Prices["army"] : v.Prices["fleet"]);
        var staff = v.Court.Where(c => c.Status == "employed").ToList();
        var busy = orders.OfType<DispatchOrder>().Select(d => d.Envoy).ToHashSet();

        if (staff.Count < 2 && v.Turn - m.LastSeek >= 3 && gold > 150)
        {
            orders.Add(new SeekCandidatesOrder());
            m.LastSeek = v.Turn;
        }

        var candidates = v.Known.Where(c => c.Pitch is not null && c.AskingPrice is not null && c.Status == "free")
            .Where(c => !c.KnownFacts.Any(f => f.StartsWith("Abandoned the service") || f.StartsWith("Exposed as a forger")))
            .OrderBy(c => c.AskingPrice).ThenBy(c => c.Id, StringComparer.Ordinal).ToList();
        if (staff.Count < 2 && candidates.Count > 0)
        {
            var best = candidates[0];
            if (!m.Checked.Contains(best.Id) && gold > 250 && rng.Chance(0.5))
            {
                orders.Add(new BackgroundCheckOrder(best.Id, 20));
                m.Checked.Add(best.Id);
                gold -= 20;
            }
            else if (best.AskingPrice <= 40 && gold > best.AskingPrice * 4)
                orders.Add(new HireOrder(best.Id, best.AskingPrice!.Value, 6));
        }

        foreach (var lot in v.UnassayedGold)
            if ((G(m, lot.From) > 0 || lot.Weighed < lot.Stated || rng.Chance(0.35)) && gold > 30)
            {
                orders.Add(new AssayOrder(lot.Id));
                gold -= v.Prices["assay"];
            }

        if (gold > 450 && rng.Chance(0.5)) { orders.Add(new CounterIntelOrder(20)); gold -= 20; }

        // Evidence shown by another court is worth checking before believing it.
        foreach (var t in v.Tablets.Where(t => t.Source.StartsWith("shown by") && t.AuthResult is null && !m.Checked.Contains(t.CopyId)).Take(1))
            if (gold > 250 && rng.Chance(0.5))
            {
                orders.Add(new AuthenticateOrder(t.CopyId, 40));
                m.Checked.Add(t.CopyId);
                gold -= 40;
            }

        var idle = staff.Where(c => c.Ready && !busy.Contains(c.Id)).ToList();
        if (gold > 450 && idle.Count >= 2 && rng.Chance(0.12))
        {
            var mineProv = v.Owner.Where(x => x.Value == me).Select(x => x.Key).ToHashSet();
            var target = Powers.All.Where(p => p != me && !v.Fallen.Contains(p))
                .OrderByDescending(p => v.Owner.Count(x => x.Value == p && Map.Neighbors(x.Key).Any(mineProv.Contains)))
                .ThenByDescending(p => G(m, p)).First();
            orders.Add(new PlaceSpyOrder(idle[0].Id, Court: target));
            busy.Add(idle[0].Id);
            idle.RemoveAt(0);
        }

        if (m.Honesty < 0.25 && gold > 300 && idle.Count > 0 && rng.Chance(0.04))
        {
            var rivals = Powers.All.Where(p => p != me && !v.Fallen.Contains(p)).OrderByDescending(p => G(m, p)).ThenBy(p => rng.Next(100)).Take(2).ToList();
            if (rivals.Count == 2)
            {
                var victim = Powers.All.Where(p => p != me && !rivals.Contains(p) && !v.Fallen.Contains(p)).OrderBy(p => rng.Next(100)).FirstOrDefault();
                orders.Add(new ForgeOrder(idle[0].Id, $"{rivals[0]} swears to {rivals[1]}: when the harvest is in, we shall march together against {victim} and divide its land.", rivals));
            }
        }

        foreach (var c in v.Known.Where(c => c.Status == "your captive"))
        {
            var roll = rng.NextDouble();
            orders.Add(roll < 0.55 ? new CaptiveOrder(c.Id, CaptiveFate.Ransom, 80)
                : roll < 0.75 ? new CaptiveOrder(c.Id, CaptiveFate.Turn, Poison: $"The armies of {me} are few and tired; they will not march this year.")
                : roll < 0.9 ? new CaptiveOrder(c.Id, CaptiveFate.Release)
                : new CaptiveOrder(c.Id, CaptiveFate.Execute));
        }

        foreach (var c in v.Known.Where(c => c.HeldByYou && c.Status == "employed"))
        {
            if (!m.HeldSince.TryGetValue(c.Id, out var since)) m.HeldSince[c.Id] = since = v.Turn;
            if (v.Turn - since >= 2)
            {
                orders.Add(new ReleaseOrder(c.Id, "Go, and tell your lord to mind his manners with a Great King."));
                m.HeldSince.Remove(c.Id);
            }
        }

        foreach (var item in v.Inbox.Where(i => i.Kind == InboxKind.Rumor && i.Body.Contains("order payRansom for ")))
        {
            var id = item.Body[(item.Body.IndexOf("order payRansom for ", StringComparison.Ordinal) + 20)..].TrimEnd(')', '.', ' ');
            if (gold > 200) orders.Add(new PayRansomOrder(id));
        }
    }
}
