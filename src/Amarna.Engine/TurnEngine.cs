namespace Amarna.Engine;

/// <summary>
/// Pure, synchronous phase functions over a <see cref="GameState"/>. A turn is one season:
/// <list type="number">
/// <item><see cref="BeginTurn"/>: servants whose notice ran out leave, income and upkeep, arrivals, tasks and contracts that fall due.</item>
/// <item>The caller fulfils <see cref="MindRequests"/> (reports, pitches) and runs audiences, then calls <see cref="ApplyAudience"/>.</item>
/// <item>Seats read <see cref="Views.For"/> and submit secret, simultaneous orders.</item>
/// <item><see cref="Resolve"/>: combat, transfers, dispatches, intelligence, world events, scoring, the end roll.</item>
/// </list>
/// Nothing here calls a model or does I/O: every outside decision arrives as validated data.
/// </summary>
public sealed partial class TurnEngine
{
    public GameState S { get; }
    public WorldMap Map { get; }
    public List<MindRequest> MindRequests { get; } = new();

    public TurnEngine(GameState state, WorldMap? map = null)
    {
        S = state;
        Map = map ?? WorldMap.Default;
    }

    private Rng R(string purpose, string subject = "") => Rng.For(S.Seed, S.Turn, purpose, subject);

    // ---------------------------------------------------------------- phase 1

    public void BeginTurn()
    {
        if (S.Ended) return;
        MindRequests.Clear();
        S.Audiences.Clear();
        S.CounterIntel.Clear();
        // A servant whose notice has run out leaves before it is paid again.
        NoticesRunOut();
        IncomeAndUpkeep();
        Arrivals();
        TasksDue();
        MemoriesDue();
    }

    /// <summary>Characters whose memory has grown long fold their oldest memories into a summary, written in their own voice.</summary>
    private void MemoriesDue()
    {
        var keep = Math.Max(4, S.Config.MemoryKeep);
        foreach (var c in S.Characters.Where(c => c.Status != CharacterStatus.Dead && c.Memory.Count > keep).OrderBy(c => IdNumber(c.Id)))
        {
            var fold = c.Memory.Count - keep / 2;
            MindRequests.Add(new MindRequest
            {
                Id = S.NewId("r"),
                Task = MindTask.SummarizeMemory,
                CharacterId = c.Id,
                Court = c.Employer ?? c.At ?? Power.Egypt,
                Facts = c.Memory.Take(fold).Select(m => $"season {m.Turn}: {m.Text}").ToList(),
                Fold = fold,
            });
        }
    }

    private void IncomeAndUpkeep()
    {
        foreach (var p in S.Alive.ToList())
        {
            var t = S.Treasuries[p];
            var income = S.OwnedBy(p).Sum(EffectiveYield);
            t.Gold += income;

            var deserted = new List<string>();
            while (true)
            {
                var upkeep = Upkeep(p);
                if (t.Gold >= upkeep || !S.Units.Any(u => u.Power == p)) break;
                var cap = Map.Capital(p).Id;
                var victim = S.Units.Where(u => u.Power == p)
                    .OrderByDescending(u => Map.Hops(cap, u.Province)).ThenBy(u => u.Id).First();
                S.Units.Remove(victim);
                deserted.Add(victim.Label);
            }
            var paid = Math.Max(0, Math.Min(t.Gold, Upkeep(p)));
            t.Gold -= paid;

            var wages = 0;
            var unpaid = new List<string>();
            // A servant abroad whose fate the court has not heard of is paid as before, so the treasury betrays nothing.
            foreach (var c in S.Characters.Where(c => WageOwed(c, p) > 0).OrderBy(c => c.Id).ToList())
            {
                var wage = WageOwed(c, p);
                var serves = c.Employer == p && c.Status == CharacterStatus.Employed;
                if (t.Gold >= wage)
                {
                    t.Gold -= wage;
                    c.Purse += wage;
                    if (serves) c.UnpaidTurns = 0;
                    wages += wage;
                }
                else
                {
                    if (!serves)
                    {
                        unpaid.Add(c.Name);
                        continue;
                    }
                    c.UnpaidTurns++;
                    c.Traits.Loyalty = Math.Max(0, c.Traits.Loyalty - 15);
                    c.Remember(S.Turn, $"My wage from {p.Land()} was not paid this season.");
                    unpaid.Add(c.Name);
                    if (c.Traits.Loyalty < 20 && c.Duty == Duty.None) Quit(c, $"{c.Name} has left your service, unpaid.");
                }
            }

            // Written before the season's audiences and envoys' returns: their gold comes after this figure.
            var lines = new List<string> { $"Income {Money.Format(income)}, upkeep {Money.Format(paid)}, wages {Money.Format(wages)}. After income, upkeep and wages, the treasury holds {Money.Format(t.Ledger)}; gold received at audiences or brought home by your envoys this season is added later." };
            if (deserted.Count > 0) lines.Add($"Unpaid troops deserted: {string.Join(", ", deserted)}.");
            if (unpaid.Count > 0) lines.Add($"Could not pay: {string.Join(", ", unpaid)}.");
            S.Notify(p, InboxKind.Notice, "The treasury", string.Join(" ", lines));
            if (deserted.Count > 0) S.Log("desertion", $"{p} could not pay its troops: {string.Join(", ", deserted)} deserted.", [p]);
        }
    }

    public int Upkeep(Power p) => S.Units.Where(u => u.Power == p)
        .Sum(u => u.Kind == UnitKind.Army ? S.Config.ArmyUpkeep : S.Config.FleetUpkeep);

    /// <summary>The wages a court pays each season, as it reckons them (a covered servant's included).</summary>
    public int Wages(Power p) => S.Characters.Sum(c => WageOwed(c, p));

    public int EffectiveYield(string province)
    {
        var p = Map[province];
        var owner = S.Owner.GetValueOrDefault(province);
        var factor = 1.0;
        foreach (var c in S.Catastrophes)
        {
            if (c.StartTurn > S.Turn || c.EndTurn < S.Turn) continue;
            if (c.Province == province || (c.Province is null && owner == c.Power)) factor *= c.IncomeFactor;
        }
        return (int)Math.Round(p.Yield * factor);
    }

    public int Income(Power p) => S.OwnedBy(p).Sum(EffectiveYield);

    private void Quit(Character c, string notice)
    {
        if (c.Employer is { } old) S.Notify(old, InboxKind.Notice, "A servant leaves", notice, c.Id);
        c.Employer = null;
        c.Contract = null;
        c.Status = CharacterStatus.Free;
        c.Duty = Duty.None;
    }

    /// <summary>
    /// Takes gold from the true treasury. A shortfall exposes any debased gold the ledger was counting, and is reported
    /// as a failure: what could not be paid for and, for an order, what came of it (a scheduled order then wakes its seat).
    /// </summary>
    /// <param name="order">The order being paid for, if any.</param>
    /// <param name="outcome">What the failure means, in plain words ("Mane stayed at your court").</param>
    private bool Pay(Power p, int amount, string what, Order? order = null, string? outcome = null)
    {
        var t = S.Treasuries[p];
        if (amount <= 0) return true;
        if (t.Gold >= amount)
        {
            t.Gold -= amount;
            return true;
        }
        if (t.Lots.Any(l => l.Face > l.True))
        {
            var missing = t.Lots.Sum(l => l.Face - l.True);
            var sources = string.Join(", ", t.Lots.Where(l => l.Face > l.True).Select(l => l.From).Distinct());
            t.Lots.Clear();
            S.Notify(p, InboxKind.Assay, "The treasury is short",
                $"Paying for {what}, your treasurers found the treasury lighter than the ledger: {Money.Format(missing)} of gold received from {sources} was never fine gold.");
            S.Log("debasement", $"{p} discovers {Money.Format(missing)} of debased gold from {sources}.", [p], "debasement-found");
        }
        // Every order that fails for want of gold is reported as a failure, whether or not debased gold was found.
        S.Notify(p, InboxKind.Rejected, "Not enough gold", $"There was not enough gold to pay for {what}{(outcome is null ? "" : "; " + outcome)}.");
        if (order is not null) ScheduledFailed(p, order, "not enough gold");
        return false;
    }

    /// <summary>
    /// An order that could not be carried out as the season resolved: its king reads why next season, as a rejection
    /// notice, and a scheduled one wakes its seat.
    /// </summary>
    private void Failed(Power p, Order order, string title, string body, string why, string? subject = null)
    {
        S.Notify(p, InboxKind.Rejected, title, body, subject);
        ScheduledFailed(p, order, why);
    }

    // ---------------------------------------------------------------- arrivals and tasks (filled out by the envoy and intelligence parts)

    private void Arrivals()
    {
        var due = S.Journeys.Where(j => j.ArriveTurn <= S.Turn).OrderBy(j => j.ArriveTurn).ThenBy(j => IdNumber(j.Id)).ToList();
        foreach (var j in due)
        {
            S.Journeys.Remove(j);
            switch (j.Kind)
            {
                case JourneyKind.EnvoyOutbound: EnvoyArrivesAbroad(j); break;
                case JourneyKind.EnvoyHomebound: EnvoyArrivesHome(j); break;
                case JourneyKind.SpyOutbound: SpyArrives(j); break;
                case JourneyKind.SpyReport: SpyReportArrives(j); break;
                case JourneyKind.SpyHomebound: SpyComesHome(j); break;
                case JourneyKind.Ransom: RansomArrives(j); break;
                case JourneyKind.Rumor:
                    if (!S.IsAlive(j.To)) break;
                    if (j.TaskId is not null && !DemandArrives(j)) break;
                    // Word that a servant has not returned, to a court that no longer believes anything of it
                    // (it heard of a death, dismissed the servant, or saw it seeking service): nothing to tell.
                    if (j.News == NewsKind.Overdue && S.FindCharacter(j.CharacterId)?.CoverOf(j.To) is null) break;
                    S.Notify(j.To, InboxKind.Rumor, "Rumor", j.Text ?? "", j.CharacterId);
                    NewsArrives(j);
                    break;
            }
        }
        CoversAtCourt();
    }

    public static int IdNumber(string id)
    {
        var digits = new string(id.Where(char.IsDigit).ToArray());
        return int.TryParse(digits, out var n) ? n : 0;
    }

    public int TravelTurns(Power from, Power to) => TravelTurns(Map.Capital(from).Id, Map.Capital(to).Id);

    public int TravelTurns(string fromProvince, string toProvince) => TravelTurns(S.Config, Map, fromProvince, toProvince);

    /// <summary>Seasons on the road between two provinces, by the travel bands (<see cref="GameConfig.TravelHops"/>).</summary>
    public static int TravelTurns(GameConfig config, WorldMap map, string fromProvince, string toProvince)
    {
        var hops = map.Hops(fromProvince, toProvince);
        var bands = config.TravelHops;
        if (hops <= bands[0]) return 1;
        if (hops <= bands[1]) return 2;
        return 3;
    }

    // ---------------------------------------------------------------- phase 4

    /// <summary>Resolves the season from every seat's secret orders. Seats with no submission hold.</summary>
    public Dictionary<Power, ValidationResult> Resolve(IReadOnlyDictionary<Power, TurnSubmission> submissions)
    {
        S.DeliveryOffset = 1;
        try { return ResolveSeason(submissions); }
        finally { S.DeliveryOffset = 0; }
    }

    private Dictionary<Power, ValidationResult> ResolveSeason(IReadOnlyDictionary<Power, TurnSubmission> submissions)
    {
        var validator = new OrderValidator(S, Map);
        var valid = new Dictionary<Power, ValidationResult>();
        _scheduledNow.Clear();
        foreach (var p in S.Alive.ToList())
        {
            var sub = WithScheduled(p, submissions.GetValueOrDefault(p) ?? new TurnSubmission(), out var scheduled);
            var v = validator.Validate(p, sub);
            valid[p] = v;
            if (v.Rejected.Count > 0)
                S.Notify(p, InboxKind.Rejected, "Orders that could not be carried out",
                    string.Join("\n", v.Rejected.Select(r => $"- {r.Order.Describe()}: {r.Reason}")));
            AfterValidation(p, sub, v, scheduled);
        }

        IEnumerable<(Power P, T O)> All<T>() where T : Order =>
            Powers.All.Where(valid.ContainsKey).SelectMany(p => valid[p].Accepted.OfType<T>().Select(o => (p, o)));

        ResolveMovement(All<Order>().Where(x => x.O is HoldOrder or MoveOrder or SupportOrder or ConvoyOrder).ToList());
        UpdateOwnership();
        ResolveTransfers(All<CedeProvinceOrder>().ToList(), All<GiftUnitOrder>().ToList());
        ResolvePurchases(All<BuyProvinceOrder>().ToList());
        foreach (var (p, d) in All<DisbandOrder>())
        {
            var u = S.UnitAt(d.Unit);
            if (u is not null && u.Power == p)
            {
                S.Units.Remove(u);
                S.Notify(p, InboxKind.Resolution, "Disbanded", $"{u.Label} was disbanded.");
            }
            else Failed(p, d, "Disband failed", $"No unit of yours stood in {Map[d.Unit].Name} after movement, so none was disbanded.", "the unit is gone");
        }
        foreach (var (p, r) in All<RaiseOrder>()) Raise(p, r);

        ResolveCourt(All<Order>().ToList());
        ResolveIntelligence(All<Order>().ToList());
        CoversAtCourt();

        WorldEvents();
        CheckEliminations();
        EndOfTurn();
        return valid;
    }

    private void ResolveMovement(List<(Power P, Order O)> unitOrders)
    {
        var byProvince = new Dictionary<string, Order>();
        foreach (var (_, o) in unitOrders)
        {
            var at = o switch { HoldOrder h => h.Unit, MoveOrder m => m.Unit, SupportOrder s => s.Unit, ConvoyOrder c => c.Unit, _ => null };
            if (at is not null) byProvince[at] = o;
        }

        var result = new Adjudicator(Map, explain: true).Run(S.Units, S.Garrisons, byProvince, S.Owner);

        // Which provinces could each power see before the moves? Battles there are reported to it.
        var sightBefore = Powers.All.ToDictionary(p => p, p => Views.Sight(S, Map, p));

        foreach (var (supporter, supported, province) in result.GivenSupports)
        {
            if (supported is not { } other || other == supporter) continue;
            var owner = S.Owner.GetValueOrDefault(province);
            // Who the support was given against: the king whose land the move went into, or, for a unit
            // supported where it stands, the king who attacked it there.
            var holding = S.UnitAt(province)?.Power == other;
            var attacker = holding
                ? result.Outcomes.Where(x => x.Order == "move" && x.Target == province && x.Power != other && x.Power != supporter).Select(x => (Power?)x.Power).FirstOrDefault()
                : null;
            var against = owner is { } target && target != other && target != supporter ? target : attacker;
            S.Log("support", $"{supporter} supported {other} at {Map[province].Name}"
                             + (owner is { } o && o != other ? $" (held by {o})" : attacker is { } a ? $" against {a}" : "") + ".",
                [supporter, other], against is { } foe ? $"foreign-support:{foe}" : "foreign-support");
        }

        foreach (var id in result.DislodgedUnitIds)
        {
            var u = S.Units.First(x => x.Id == id);
            S.Units.Remove(u);
            S.Log("battle", $"{u.Power}'s {u.Label} was destroyed.", Powers.All.Where(p => sightBefore[p].Contains(u.Province)).Append(u.Power));
        }
        foreach (var (id, prov) in result.NewPositions)
            S.Units.First(x => x.Id == id).Province = prov;
        foreach (var g in result.FallenGarrisons)
        {
            S.Garrisons.Remove(g);
            var taker = S.UnitAt(g)?.Power;
            S.Log("conquest", $"The walls of {Map[g].Name} fell to {taker}.", Powers.All.Where(p => sightBefore[p].Contains(g)));
        }

        foreach (var p in S.Alive)
            S.LastSeen[p] = result.Outcomes.Where(o => o.Power == p || sightBefore[p].Contains(o.Province) || (o.Target is { } t && sightBefore[p].Contains(t))).ToList();

        foreach (var p in S.Alive)
        {
            var sight = sightBefore[p];
            // Its own orders, each failed move and void support with the reason; foreign orders where the unit stood, or moved to, in sight before the moves.
            var mine = result.Lines.Where(l => l.Power == p).Select(l =>
                l.Failure is { } f ? $"{l.Text}: {WhyMoveFailed(p, l.Province, l.Target!, f, sight)}"
                : l.Void is { } v ? $"{l.Text}: {v}"
                : l.Text).ToList();
            var seen = result.Lines.Where(l => l.Power != p && l.Power is not null && (sight.Contains(l.Province) || l.Target is { } t && sight.Contains(t)))
                .Select(l => $"{l.Power}: {l.Text}").ToList();
            var fallen = result.FallenGarrisons.Where(sight.Contains).Select(g => $"The walls of {Map[g].Name} fell.").ToList();
            if (mine.Count + seen.Count + fallen.Count == 0) continue;
            var body = string.Join("\n", mine.Select(x => "- " + x));
            if (seen.Count > 0) body += "\nSeen nearby:\n" + string.Join("\n", seen.Select(x => "- " + x));
            if (fallen.Count > 0) body += "\n" + string.Join("\n", fallen);
            S.Notify(p, InboxKind.Battle, "Movements last season", body.Trim());
        }
    }

    /// <summary>
    /// Why one of the viewer's own moves failed, in plain words, with the strengths the engine compared.
    /// The other side's power is named only when the viewer could see that unit before the moves (where it
    /// stood, or where it was going); the province it acted from is always named.
    /// </summary>
    private static string WhyMoveFailed(Power viewer, string from, string to, MoveFailure f, HashSet<string> sight)
    {
        var seen = f.Power is not null && (sight.Contains(f.Province) || f.MovingTo is { } t && sight.Contains(t));
        var kind = f.Kind == UnitKind.Army ? "army" : "fleet";
        var whose = f.Power == viewer ? $"your own {kind}" : $"{f.Power}'s {kind}";
        var strengths = $"; your strength {f.Strength} against {f.Against}";
        return f.Stop switch
        {
            MoveStop.NoConvoy => "no convoy carried it across the sea",
            MoveStop.OwnUnit => f.MovingTo == from
                ? $"your own {kind} in {f.Province} was moving the other way, and you cannot dislodge your own unit"
                : $"your own {kind} in {f.Province} did not leave, and you cannot dislodge your own unit",
            MoveStop.HeadToHead => $"it met the unit from {f.Province}{(seen ? $" ({whose})" : "")} coming the other way{strengths}",
            MoveStop.Held => $"the unit holding {f.Province}{(seen ? $" ({whose})" : "")} kept its place{strengths}",
            MoveStop.Stayed => $"the unit in {f.Province}{(seen ? $" ({whose})" : "")} could not leave, so it kept its place{strengths}",
            MoveStop.Walls => $"the walls of {f.Province} held{(f.Power is { } owner ? $" for {owner}" : "")}{strengths}",
            MoveStop.Bounced => $"it met a move into {to} from {f.Province}{(seen ? $" by {whose}" : "")}{strengths}",
            _ => "it was stopped",
        };
    }

    private void UpdateOwnership()
    {
        foreach (var u in S.Units)
        {
            var prov = Map[u.Province];
            if (prov.IsSea) continue;
            var before = S.Owner.GetValueOrDefault(u.Province);
            if (before == u.Power) continue;
            S.Owner[u.Province] = u.Power;
            S.Garrisons.Remove(u.Province);
            if (before is { } loser)
            {
                S.Notify(loser, InboxKind.Battle, "Land lost", $"{prov.Name} has been taken by {u.Power}.");
                S.Log("conquest", $"{u.Power} took {prov.Name} from {loser}.", [u.Power, loser]);
            }
            S.Notify(u.Power, InboxKind.Battle, "Land taken", $"{prov.Name} is now yours.");
        }
    }

    private void ResolveTransfers(List<(Power P, CedeProvinceOrder O)> cessions, List<(Power P, GiftUnitOrder O)> gifts)
    {
        foreach (var (p, c) in cessions)
        {
            var name = Map[c.Province].Name;
            if (S.Owner.GetValueOrDefault(c.Province) != p)
            {
                Failed(p, c, "Cession failed", $"{name} was not ceded to {c.To}: you no longer held it after movement.", "you no longer held it");
                continue;
            }
            if (S.UnitAt(c.Province) is { } u && u.Power == p)
            {
                Failed(p, c, "Cession failed", $"{name} was not ceded to {c.To}: your own troops still stood in it after movement.", "your own troops stood there");
                continue;
            }
            S.Owner[c.Province] = c.To;
            S.Notify(p, InboxKind.Resolution, "Land ceded", $"{Map[c.Province].Name} now belongs to {c.To}.");
            S.Notify(c.To, InboxKind.Resolution, "Land received", $"{p} has ceded {Map[c.Province].Name} to you.");
            S.Log("cession", $"{p} ceded {Map[c.Province].Name} to {c.To}.", [p, c.To]);
        }
        foreach (var (p, g) in gifts)
        {
            var u = S.UnitAt(g.Unit);
            if (u is null || u.Power != p)
            {
                Failed(p, g, "Gift of troops failed", $"No unit of yours stood in {Map[g.Unit].Name} after movement, so none was given to {g.To}.", "the unit is gone");
                continue;
            }
            u.Power = g.To;
            S.Notify(p, InboxKind.Resolution, "Troops given", $"{u.Label} now serves {g.To}.");
            S.Notify(g.To, InboxKind.Resolution, "Troops received", $"{p} has placed {u.Label} under your command.");
            S.Log("gift-unit", $"{p} gave {u.Label} to {g.To}.", [p, g.To]);
        }
    }

    private void ResolvePurchases(List<(Power P, BuyProvinceOrder O)> buys)
    {
        // Gold for a purchase is only reserved when the orders are checked; it leaves the treasury only when the city accepts.
        foreach (var group in buys.GroupBy(b => b.O.Province))
        {
            var prov = Map[group.Key];
            var bidders = group.Select(b => b.P).Distinct().ToList();
            // Troops took the city earlier in this season's resolution: its elders sell to nobody, and nobody pays.
            if (S.Owner.GetValueOrDefault(prov.Id) is { } taker)
            {
                foreach (var b in bidders)
                    S.Notify(b, InboxKind.Rejected, "Purchase failed", b == taker
                        ? $"Your own troops took {prov.Name} last season; no gold was paid."
                        : $"{prov.Name} was taken by {taker}'s troops last season before its elders could accept your gold. No gold was paid.");
                foreach (var (b, o) in group) ScheduledFailed(b, o, b == taker ? "your own troops took it" : $"{taker}'s troops took it");
                continue;
            }
            if (bidders.Count > 1)
            {
                foreach (var b in bidders)
                    S.Notify(b, InboxKind.Rejected, "Purchase failed", $"The elders of {prov.Name} would not choose between {bidders.Count} buyers last season. No gold was paid.");
                foreach (var (b, o) in group) ScheduledFailed(b, o, $"its elders would not choose between {bidders.Count} buyers");
                continue;
            }
            var buyer = bidders[0];
            var bid = group.First().O;
            if (S.UnitAt(prov.Id) is { } occupant && occupant.Power != buyer)
            {
                S.Notify(buyer, InboxKind.Rejected, "Purchase failed", $"Foreign troops stood in {prov.Name}, and its elders would not sell. No gold was paid.");
                ScheduledFailed(buyer, bid, "foreign troops stand in it");
                continue;
            }
            var price = prov.Yield * S.Config.NeutralPriceFactor;
            if (!Pay(buyer, price, $"the city of {prov.Name}", bid, "it was not bought")) continue;
            S.Owner[prov.Id] = buyer;
            S.Notify(buyer, InboxKind.Resolution, "City bought", $"{prov.Name} has accepted your gold ({Money.Format(price)}) and your rule. Its walls now hold for you.");
            S.Log("purchase", $"{buyer} bought {prov.Name} for {Money.Format(price)}.", Powers.All.Where(p => Views.Sight(S, Map, p).Contains(prov.Id)).Append(buyer));
        }
    }

    private void Raise(Power p, RaiseOrder r)
    {
        var prov = Map[r.Province];
        var kind = r.Kind.ToString().ToLowerInvariant();
        // In the rulebook's words: only in a province of your homeland that you still hold and that is empty after movement.
        var why = S.Owner.GetValueOrDefault(prov.Id) != p ? $"you no longer held {prov.Name} after movement"
            : S.UnitAt(prov.Id) is not null ? $"{prov.Name} was not empty after movement"
            : null;
        if (why is not null)
        {
            S.Notify(p, InboxKind.Rejected, "Levy failed", $"No {kind} was raised in {prov.Name}: {why}. No gold was paid.");
            ScheduledFailed(p, r, why);
            return;
        }
        var cost = r.Kind == UnitKind.Army ? S.Config.ArmyCost : S.Config.FleetCost;
        if (!Pay(p, cost, $"a new {kind} in {prov.Name}", r, "none was raised")) return;
        var u = new Unit { Id = S.NewId("u"), Power = p, Kind = r.Kind, Province = prov.Id };
        S.Units.Add(u);
        S.Notify(p, InboxKind.Resolution, "Levy raised", $"A new {kind} stands in {prov.Name}.");
    }

    private void CheckEliminations()
    {
        foreach (var p in S.Alive.ToList())
        {
            if (S.OwnedBy(p).Any()) continue;
            S.Eliminated.Add(p);
            EndSleep(p);
            S.Units.RemoveAll(u => u.Power == p);
            foreach (var c in S.Characters) c.Covers.RemoveAll(k => k.For == p);
            // Nobody is left to hold its prisoners: they are let go, and walk home as if released.
            foreach (var c in S.Characters.Where(c => c.HeldBy == p).ToList())
            {
                if (c.Status == CharacterStatus.Captured) ReleaseCaptive(p, c);
                else if (c.Duty == Duty.Detained) LetEnvoyGo(p, c, null);
            }
            foreach (var c in S.Characters.Where(c => c.Employer == p).ToList())
            {
                c.FormerEmployer = p;
                c.Employer = null;
                c.Contract = null;
                if (c.Status == CharacterStatus.Employed) c.Status = CharacterStatus.Free;
            }
            S.Log("fall", $"The kingdom of {p.Land()} has fallen.", signal: null);
            foreach (var other in S.Alive) S.Notify(other, InboxKind.Rumor, "A kingdom falls", $"Word spreads that the kingdom of {p.Land()} is no more.");
        }
    }

    // ---------------------------------------------------------------- scoring and the end

    public int Strength(Power p) =>
        S.Config.ProvinceWeight * S.OwnedBy(p).Sum(id => Map[id].Yield) + S.Treasuries[p].Gold;

    /// <summary>
    /// Strength as the power itself reckons it: its gold by its ledger, which counts unassayed lots at
    /// their weight. A seat must never see true strength, or it could read debased gold off the difference.
    /// </summary>
    public int LedgerStrength(Power p) =>
        S.Config.ProvinceWeight * S.OwnedBy(p).Sum(id => Map[id].Yield) + S.Treasuries[p].Ledger;

    public double Growth(Power p)
    {
        var start = S.StartStrength.GetValueOrDefault(p);
        return start <= 0 || !S.IsAlive(p) ? 0 : (double)Strength(p) / start;
    }

    private void EndOfTurn()
    {
        foreach (var p in Powers.All)
            S.Scores.Add(new ScoreRow
            {
                Turn = S.Turn,
                Power = p,
                Strength = S.IsAlive(p) ? Strength(p) : 0,
                Growth = Math.Round(Growth(p), 4),
                Provinces = S.OwnedBy(p).Count(),
                Units = S.Units.Count(u => u.Power == p),
                Gold = S.Treasuries[p].Gold,
            });

        foreach (var c in S.Characters.Where(c => c.At is { } at && c.Employer is { } emp && at != emp))
            c.TurnsAbroad++;

        string? reason = null;
        if (S.Alive.Count() <= 1) reason = "only one kingdom remains";
        else if (S.Turn >= S.Config.MaxTurns) reason = "the age has run its course";
        else if (S.Turn >= S.Config.MinTurns && R("end").Chance(S.Config.EndChance)) reason = "the gods have ended the age";

        if (reason is not null)
        {
            S.Ended = true;
            S.EndReason = reason;
            DecideWinners();
            S.Log("end", $"The game ends after turn {S.Turn}: {reason}. Winner: {string.Join(" and ", S.Winners)}.");
            return;
        }
        S.Turn++;
    }

    private void DecideWinners()
    {
        var alive = S.Alive.ToList();
        var growth = alive.ToDictionary(p => p, Growth);
        var best = alive.OrderByDescending(p => growth[p]).ThenBy(p => p).First();

        if (S.Config.SharedVictory)
        {
            (Power A, Power B, double G)? bestPair = null;
            foreach (var t in S.Tablets.Where(t => t.AllianceOath && t.IsSealedAgreement))
            {
                var a = t.ProposedBy;
                var b = t.Partner!.Value;
                if (!S.IsAlive(a) || !S.IsAlive(b)) continue;
                var combined = (double)(Strength(a) + Strength(b)) / (S.StartStrength[a] + S.StartStrength[b]);
                var rivals = alive.Where(p => p != a && p != b).Select(p => growth[p]).DefaultIfEmpty(0).Max();
                if (combined > rivals && (bestPair is null || combined > bestPair.Value.G)) bestPair = (a, b, combined);
            }
            if (bestPair is { } pair)
            {
                S.Winners = new List<string> { pair.A.ToString(), pair.B.ToString() };
                S.Log("shared-victory", $"{pair.A} and {pair.B} share the victory under their sworn alliance (combined growth {pair.G:0.00}).", signal: "shared-victory");
                return;
            }
        }
        S.Winners = new List<string> { best.ToString() };
    }
}
