namespace Amarna.Engine;

/// <summary>
/// Pure, synchronous phase functions over a <see cref="GameState"/>. A turn is one season:
/// <list type="number">
/// <item><see cref="BeginTurn"/>: income and upkeep, arrivals, tasks that fall due.</item>
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
            foreach (var c in S.Characters.Where(c => c.Employer == p && c.Status == CharacterStatus.Employed && c.Contract is not null).OrderBy(c => c.Id).ToList())
            {
                var wage = c.Contract!.Wage;
                if (t.Gold >= wage)
                {
                    t.Gold -= wage;
                    c.Purse += wage;
                    c.UnpaidTurns = 0;
                    wages += wage;
                }
                else
                {
                    c.UnpaidTurns++;
                    c.Traits.Loyalty = Math.Max(0, c.Traits.Loyalty - 15);
                    c.Remember(S.Turn, $"My wage from {p.Land()} was not paid this season.");
                    unpaid.Add(c.Name);
                    if (c.Traits.Loyalty < 20 && c.Duty == Duty.None) Quit(c, $"{c.Name} has left your service, unpaid.");
                }
            }

            var lines = new List<string> { $"Income {Money.Format(income)}, upkeep {Money.Format(paid)}, wages {Money.Format(wages)}. The treasury holds {Money.Format(t.Ledger)}." };
            if (deserted.Count > 0) lines.Add($"Unpaid troops deserted: {string.Join(", ", deserted)}.");
            if (unpaid.Count > 0) lines.Add($"Could not pay: {string.Join(", ", unpaid)}.");
            S.Notify(p, InboxKind.Notice, "The treasury", string.Join(" ", lines));
            if (deserted.Count > 0) S.Log("desertion", $"{p} could not pay its troops: {string.Join(", ", deserted)} deserted.", [p]);
        }
    }

    public int Upkeep(Power p) => S.Units.Where(u => u.Power == p)
        .Sum(u => u.Kind == UnitKind.Army ? S.Config.ArmyUpkeep : S.Config.FleetUpkeep);

    public int Wages(Power p) => S.Characters.Where(c => c.Employer == p && c.Status == CharacterStatus.Employed)
        .Sum(c => c.Contract?.Wage ?? 0);

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

    /// <summary>Takes gold from the true treasury. A shortfall exposes any debased gold the ledger was counting.</summary>
    private bool Pay(Power p, int amount, string what)
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
        else S.Notify(p, InboxKind.Notice, "Not enough gold", $"There was not enough gold to pay for {what}.");
        return false;
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
                    if (S.IsAlive(j.To)) S.Notify(j.To, InboxKind.Rumor, "Rumor", j.Text ?? "");
                    break;
            }
        }
    }

    public static int IdNumber(string id)
    {
        var digits = new string(id.Where(char.IsDigit).ToArray());
        return int.TryParse(digits, out var n) ? n : 0;
    }

    public int TravelTurns(Power from, Power to) => TravelTurns(Map.Capital(from).Id, Map.Capital(to).Id);

    public int TravelTurns(string fromProvince, string toProvince)
    {
        var hops = Map.Hops(fromProvince, toProvince);
        var bands = S.Config.TravelHops;
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
        }
        foreach (var (p, r) in All<RaiseOrder>()) Raise(p, r);

        ResolveCourt(All<Order>().ToList());
        ResolveIntelligence(All<Order>().ToList());

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

        var result = new Adjudicator(Map).Run(S.Units, S.Garrisons, byProvince, S.Owner);

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
            var mine = result.Lines.Where(l => l.Power == p).Select(l => l.Text).ToList();
            var seen = result.Lines.Where(l => l.Power != p && l.Power is not null && sight.Contains(l.Province)).Select(l => $"{l.Power}: {l.Text}").ToList();
            var fallen = result.FallenGarrisons.Where(sight.Contains).Select(g => $"The walls of {Map[g].Name} fell.").ToList();
            if (mine.Count + seen.Count + fallen.Count == 0) continue;
            var body = string.Join("\n", mine.Select(x => "- " + x));
            if (seen.Count > 0) body += "\nSeen nearby:\n" + string.Join("\n", seen.Select(x => "- " + x));
            if (fallen.Count > 0) body += "\n" + string.Join("\n", fallen);
            S.Notify(p, InboxKind.Battle, "Movements this season", body.Trim());
        }
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
            if (S.Owner.GetValueOrDefault(c.Province) != p) { ScheduledFailed(p, c, "you no longer hold it"); continue; }
            if (S.UnitAt(c.Province) is { } u && u.Power == p)
            {
                S.Notify(p, InboxKind.Rejected, "Cession failed", $"Your own troops still stand in {Map[c.Province].Name}; it cannot be handed over.");
                ScheduledFailed(p, c, "your own troops stand there");
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
            if (u is null || u.Power != p) { ScheduledFailed(p, g, "the unit is gone"); continue; }
            u.Power = g.To;
            S.Notify(p, InboxKind.Resolution, "Troops given", $"{u.Label} now serves {g.To}.");
            S.Notify(g.To, InboxKind.Resolution, "Troops received", $"{p} has placed {u.Label} under your command.");
            S.Log("gift-unit", $"{p} gave {u.Label} to {g.To}.", [p, g.To]);
        }
    }

    private void ResolvePurchases(List<(Power P, BuyProvinceOrder O)> buys)
    {
        foreach (var group in buys.GroupBy(b => b.O.Province))
        {
            var prov = Map[group.Key];
            if (S.Owner.GetValueOrDefault(prov.Id) is not null) continue;
            var bidders = group.Select(b => b.P).Distinct().ToList();
            if (bidders.Count > 1)
            {
                foreach (var b in bidders)
                    S.Notify(b, InboxKind.Resolution, "Purchase failed", $"The elders of {prov.Name} would not choose between rival buyers this season.");
                foreach (var (b, o) in group) ScheduledFailed(b, o, "rival buyers bid for it");
                continue;
            }
            var buyer = bidders[0];
            var bid = group.First().O;
            if (S.UnitAt(prov.Id) is { } occupant && occupant.Power != buyer) { ScheduledFailed(buyer, bid, "foreign troops stand in it"); continue; }
            var price = prov.Yield * S.Config.NeutralPriceFactor;
            if (!Pay(buyer, price, $"the city of {prov.Name}")) { ScheduledFailed(buyer, bid, "not enough gold"); continue; }
            S.Owner[prov.Id] = buyer;
            S.Notify(buyer, InboxKind.Resolution, "City bought", $"{prov.Name} has accepted your gold ({Money.Format(price)}) and your rule. Its walls now hold for you.");
            S.Log("purchase", $"{buyer} bought {prov.Name} for {Money.Format(price)}.", Powers.All.Where(p => Views.Sight(S, Map, p).Contains(prov.Id)).Append(buyer));
        }
    }

    private void Raise(Power p, RaiseOrder r)
    {
        var prov = Map[r.Province];
        if (S.Owner.GetValueOrDefault(prov.Id) != p || S.UnitAt(prov.Id) is not null)
        {
            S.Notify(p, InboxKind.Rejected, "Levy failed", $"{prov.Name} is no longer free for a new {r.Kind.ToString().ToLowerInvariant()}.");
            ScheduledFailed(p, r, "the province is not free");
            return;
        }
        var cost = r.Kind == UnitKind.Army ? S.Config.ArmyCost : S.Config.FleetCost;
        if (!Pay(p, cost, $"a new {r.Kind.ToString().ToLowerInvariant()}")) { ScheduledFailed(p, r, "not enough gold"); return; }
        var u = new Unit { Id = S.NewId("u"), Power = p, Kind = r.Kind, Province = prov.Id };
        S.Units.Add(u);
        S.Notify(p, InboxKind.Resolution, "Levy raised", $"A new {r.Kind.ToString().ToLowerInvariant()} stands in {prov.Name}.");
    }

    private void CheckEliminations()
    {
        foreach (var p in S.Alive.ToList())
        {
            if (S.OwnedBy(p).Any()) continue;
            S.Eliminated.Add(p);
            EndSleep(p);
            S.Units.RemoveAll(u => u.Power == p);
            foreach (var c in S.Characters.Where(c => c.Employer == p).ToList())
            {
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
