namespace Amarna.Engine;

public sealed class ValidationResult
{
    public List<Order> Accepted { get; } = new();
    public List<RejectedOrder> Rejected { get; } = new();
}

/// <summary>
/// The only door into the game state: every order must be legal, affordable (by the seat's own
/// ledger) and permitted for that seat. Persuading a model is never enough by itself.
/// </summary>
public sealed class OrderValidator
{
    private readonly GameState _s;
    private readonly WorldMap _map;

    public OrderValidator(GameState state, WorldMap? map = null)
    {
        _s = state;
        _map = map ?? WorldMap.Default;
    }

    public const int MaxOrders = 80;

    public ValidationResult Validate(Power power, TurnSubmission submission)
    {
        var result = new ValidationResult();
        var budget = _s.Treasuries[power].Ledger;
        var orderedUnits = new HashSet<string>();
        var raisedIn = new HashSet<string>();
        var bought = new HashSet<string>();
        var busyCharacters = new HashSet<string>();
        var ransomed = new HashSet<string>();
        var dispatches = 0;
        var seekCount = 0;
        var counterIntel = false;

        if (!_s.IsAlive(power))
        {
            foreach (var o in submission.Orders) result.Rejected.Add(new(o, "your realm has fallen"));
            return result;
        }

        foreach (var order in submission.Orders.Take(MaxOrders))
        {
            var budgetBefore = budget;
            var error = Check(order);
            if (error is null)
            {
                result.Accepted.Add(order);
                if (UnitOf(order) is { } u) orderedUnits.Add(u);
                if (CharacterOf(order) is { } c) busyCharacters.Add(c);
                if (order is DispatchOrder) dispatches++;
                if (order is SeekCandidatesOrder) seekCount++;
                if (order is CounterIntelOrder) counterIntel = true;
                if (order is RaiseOrder r) raisedIn.Add(r.Province);
                if (order is BuyProvinceOrder b) bought.Add(b.Province);
            }
            else
            {
                budget = budgetBefore;
                result.Rejected.Add(new(order, error));
            }
        }
        foreach (var o in submission.Orders.Skip(MaxOrders)) result.Rejected.Add(new(o, $"too many orders: only the first {MaxOrders} of a season are read"));
        return result;

        string? Spend(int cost)
        {
            if (cost < 0) return "a cost cannot be negative";
            if (cost > budget) return $"not enough gold (needs {cost}, ledger shows {budget} left)";
            budget -= cost;
            return null;
        }

        string? OwnUnit(string province, out Unit? unit)
        {
            unit = _s.UnitAt(province);
            if (!_map.Exists(province)) return $"there is no province called '{province}'";
            if (unit is null) return $"you have no unit in {province}";
            if (unit.Power != power) return $"the unit in {province} is not yours";
            if (orderedUnits.Contains(province)) return $"the unit in {province} already has an order";
            return null;
        }

        static string? UnitOf(Order o) => OrderKeys.UnitOf(o);

        static string? CharacterOf(Order o) => OrderKeys.CharacterOf(o);

        // A servant abroad whose fate this court has not heard of is, for its orders, a servant who is away:
        // nothing the validator says may betray what happened to it.
        bool Covered(Character c) => c.Cover is { } k && k.For == power;

        string? OwnCharacter(string id, out Character? c, bool mustBeHome = true)
        {
            c = _s.FindCharacter(id);
            if (c is null) return $"there is nobody called '{id}'";
            var away = Covered(c) || (c.Employer == power && c.Status == CharacterStatus.Captured);
            if (!away && (c.Employer != power || c.Status != CharacterStatus.Employed)) return $"{c.Name} is not in your service";
            if (mustBeHome && (away || c.Duty != Duty.None || c.At != power)) return $"{c.Name} is not at your court";
            if (busyCharacters.Contains(c.Id)) return $"{c.Name} was already given a task by an earlier order";
            return null;
        }

        string? Check(Order order)
        {
            switch (order)
            {
                case HoldOrder h:
                    return OwnUnit(h.Unit, out _);

                case MoveOrder m:
                {
                    if (OwnUnit(m.Unit, out var u) is { } e) return e;
                    if (!_map.Exists(m.To)) return $"there is no province called '{m.To}'";
                    if (m.To == m.Unit) return "a unit cannot move to where it stands";
                    if (_s.Garrisons.Contains(m.To) && _s.Owner.GetValueOrDefault(m.To) == power)
                        return $"{_map[m.To].Name} is held by its own walls for you; your troops cannot enter it";
                    if (u!.Kind == UnitKind.Fleet)
                        return _map.CanMove(UnitKind.Fleet, m.Unit, m.To) ? null : $"a fleet in {m.Unit} cannot reach {m.To}";
                    if (_map.CanMove(UnitKind.Army, m.Unit, m.To)) return null;
                    return _map.SeaRouteExists(m.Unit, m.To) ? null : $"an army in {m.Unit} cannot reach {m.To}";
                }

                case SupportOrder sp:
                {
                    if (OwnUnit(sp.Unit, out var u) is { } e) return e;
                    if (!_map.Exists(sp.Supported)) return $"there is no province called '{sp.Supported}'";
                    var walls = _s.Garrisons.Contains(sp.Supported) && _s.Owner.GetValueOrDefault(sp.Supported) is not null;
                    if (_s.UnitAt(sp.Supported) is null && !walls) return $"there is no unit in {sp.Supported} to support";
                    if (walls && sp.To is not null) return "city walls never move; they can only be supported holding";
                    if (sp.Supported == sp.Unit) return "a unit cannot support itself";
                    var into = sp.To ?? sp.Supported;
                    if (!_map.Exists(into)) return $"there is no province called '{into}'";
                    if (into == sp.Unit) return "a unit cannot support a move into its own province";
                    return _map.CanMove(u!.Kind, sp.Unit, into) ? null : $"the unit in {sp.Unit} cannot reach {into} to support there";
                }

                case ConvoyOrder c:
                {
                    if (OwnUnit(c.Unit, out var u) is { } e) return e;
                    if (u!.Kind != UnitKind.Fleet || !_map[c.Unit].IsSea) return "only a fleet at sea can convoy";
                    var army = _s.UnitAt(c.Army);
                    if (army is null || army.Kind != UnitKind.Army) return $"there is no army in {c.Army}";
                    if (!_map.Exists(c.To) || !_map[c.To].IsCoastal) return $"{c.To} is not a coast an army can land on";
                    return null;
                }

                case RaiseOrder r:
                {
                    if (!_map.Exists(r.Province)) return $"there is no province called '{r.Province}'";
                    var p = _map[r.Province];
                    if (p.Home != power) return $"{p.Name} is not part of your homeland";
                    if (_s.Owner.GetValueOrDefault(p.Id) != power) return $"you do not hold {p.Name}";
                    if (r.Kind == UnitKind.Fleet && !p.IsCoastal) return $"{p.Name} has no harbour for a fleet";
                    if (raisedIn.Contains(p.Id)) return $"you already raise a unit in {p.Name}";
                    return Spend(r.Kind == UnitKind.Army ? _s.Config.ArmyCost : _s.Config.FleetCost);
                }

                case DisbandOrder d:
                    return OwnUnit(d.Unit, out _);

                case BuyProvinceOrder b:
                {
                    if (!_map.Exists(b.Province) || _map[b.Province].IsSea) return $"there is no city called '{b.Province}'";
                    if (_s.Owner.GetValueOrDefault(b.Province) is not null) return $"{_map[b.Province].Name} is not a free city-state";
                    var near = _map.WithinReach(b.Province, power, _s.Owner, _s.Units.Where(u => u.Power == power).Select(u => u.Province));
                    if (!near) return $"{_map[b.Province].Name} lies beyond your reach (it must border your land or troops, or share a sea with one of your coasts)";
                    if (bought.Contains(b.Province)) return "you already bid for that city";
                    return Spend(_map[b.Province].Yield * _s.Config.NeutralPriceFactor);
                }

                case CedeProvinceOrder cp:
                    if (!_map.Exists(cp.Province)) return $"there is no province called '{cp.Province}'";
                    if (_s.Owner.GetValueOrDefault(cp.Province) != power) return "you can only cede what you hold";
                    if (cp.To == power || !_s.IsAlive(cp.To)) return $"you cannot cede land to {cp.To}";
                    return null;

                case GiftUnitOrder g:
                    if (OwnUnit(g.Unit, out _) is { } ge) return ge;
                    if (g.To == power || !_s.IsAlive(g.To)) return $"you cannot give a unit to {g.To}";
                    return null;

                case DispatchOrder d:
                {
                    if (OwnCharacter(d.Envoy, out var c) is { } e) return e;
                    if (d.To == power || !_s.IsAlive(d.To)) return $"you cannot send an envoy to {d.To}";
                    if (dispatches >= _s.Config.MaxDispatchesPerTurn) return $"at most {_s.Config.MaxDispatchesPerTurn} envoys may leave in one season";
                    if (d.Gold < 0) return "gold cannot be negative";
                    if (d.PurityPercent is < 10 or > 100) return "purity must be between 10 and 100 percent";
                    if (d.Copies is { Count: > 0 })
                        foreach (var id in d.Copies)
                            if (!_s.Copies.Any(x => x.Id == id && x.Holder == power)) return $"you hold no tablet copy '{id}'";
                    var fine = (int)Math.Round(d.Gold * d.PurityPercent / 100.0);
                    var fee = d.Proposal is not null ? _s.Config.TabletFee : 0;
                    return Spend(fine + fee);
                }

                case ReleaseOrder rl:
                {
                    var c = _s.FindCharacter(rl.Character);
                    if (c is null) return $"there is nobody called '{rl.Character}'";
                    if (c.HeldBy != power) return $"you are not holding {c.Name}";
                    if (busyCharacters.Contains(c.Id)) return $"{c.Name} was already given a task by an earlier order";
                    return null;
                }

                case SeekCandidatesOrder:
                    return seekCount > 0 ? "you had already asked for candidates that season" : null;

                case HireOrder h:
                {
                    var c = _s.FindCharacter(h.Character);
                    if (c is null) return $"there is nobody called '{h.Character}'";
                    if (!c.IsAvailableForHire) return $"{c.Name} is not available for hire";
                    if (c.HeldBy is { } holder && holder != power) return $"{c.Name} is held at the court of {holder} and cannot come to yours";
                    if (!c.Pitches.ContainsKey(power) && c.At != power) return $"{c.Name} has not presented themselves to your court";
                    if (h.Wage <= 0 || h.Term <= 0) return "wage and term must be positive";
                    if (busyCharacters.Contains(c.Id)) return $"{c.Name} was already given a task by an earlier order";
                    return null;
                }

                case DismissOrder dm:
                    return OwnCharacter(dm.Character, out _, mustBeHome: false);

                case BackgroundCheckOrder bc:
                {
                    if (_s.FindCharacter(bc.Character) is null) return $"there is nobody called '{bc.Character}'";
                    if (bc.Spend < 10) return "a background check costs at least 10 shekels";
                    return Spend(bc.Spend);
                }

                case PlaceSpyOrder ps:
                {
                    if (OwnCharacter(ps.Character, out _) is { } e) return e;
                    if (ps.Court is null == ps.Province is null) return "name either a court or a province to watch";
                    if (ps.Court is { } court && (court == power || !_s.IsAlive(court))) return $"you cannot spy on {court}";
                    if (ps.Province is not null && (!_map.Exists(ps.Province) || _map[ps.Province].IsSea)) return $"there is no province called '{ps.Province}'";
                    return null;
                }

                case RecallSpyOrder rs:
                {
                    var c = _s.FindCharacter(rs.Character);
                    if (c is null || (c.Employer != power && !Covered(c))) return $"{rs.Character} is not in your service";
                    if ((Covered(c) ? c.Cover!.Believed : c.Duty) != Duty.SpyPosted) return $"{c.Name} is not on a mission";
                    if (busyCharacters.Contains(c.Id)) return $"{c.Name} was already given a task by an earlier order";
                    return null;
                }

                case CounterIntelOrder ci:
                    if (counterIntel) return "you had already set your watch that season";
                    return Spend(ci.Spend);

                case AssayOrder a:
                    if (!_s.Treasuries[power].Lots.Any(l => l.Id == a.Lot)) return $"there is no unassayed gold '{a.Lot}'";
                    return Spend(_s.Config.AssayFee);

                case AuthenticateOrder au:
                    if (!_s.Copies.Any(x => x.Id == au.Copy && x.Holder == power)) return $"you hold no tablet copy '{au.Copy}'";
                    if (au.Spend < 10) return "an examination costs at least 10 shekels";
                    return Spend(au.Spend);

                case ForgeOrder f:
                {
                    if (OwnCharacter(f.Character, out var c) is { } e) return e;
                    if (f.Seals is null || f.Seals.Count == 0) return "a forgery needs at least one seal";
                    if (string.IsNullOrWhiteSpace(f.Text)) return "a tablet needs text";
                    return Spend(_s.Config.ForgeFee);
                }

                case CaptiveOrder co:
                {
                    var c = _s.FindCharacter(co.Character);
                    if (c is null || c.Status != CharacterStatus.Captured || c.HeldBy != power) return $"you hold no captive '{co.Character}'";
                    if (busyCharacters.Contains(c.Id)) return $"{c.Name} was already given a task by an earlier order";
                    if (co.Fate == CaptiveFate.Ransom && co.Ransom <= 0) return "name a ransom";
                    // A ransom or a turning needs a living court on the other side.
                    if (co.Fate is CaptiveFate.Ransom or CaptiveFate.Turn && (c.Employer is not { } master || !_s.IsAlive(master)))
                        return $"{c.Name}'s kingdom has fallen: nobody is left to {(co.Fate == CaptiveFate.Ransom ? "pay" : "deceive")}. {c.Name} remains your captive";
                    return null;
                }

                case PayRansomOrder pr:
                {
                    var c = _s.FindCharacter(pr.Character);
                    if (c is null) return $"there is nobody called '{pr.Character}'";
                    if (ransomed.Contains(c.Id)) return $"a ransom for {c.Name} is already on its way";
                    if (RansomRefusal(_s, power, c, out var task) is { } why) return why;
                    var error = Spend(task!.Spend);
                    if (error is null) ransomed.Add(c.Id);
                    return error;
                }
            }
            return "unknown order";
        }
    }

    /// <summary>
    /// Why a court cannot pay a ransom for one of its people, in the rulebook's words, or null if it can. A demand
    /// can be paid once its rumour has reached the court, while the captive is held by the court that asked (as far
    /// as the payer knows: a captive put to death unknown to it still seems held), and once only.
    /// </summary>
    public static string? RansomRefusal(GameState s, Power payer, Character c, out PendingTask? demand)
    {
        demand = s.Tasks.LastOrDefault(t => t.Kind == TaskKind.RansomDemand && t.Announced && t.CharacterId == c.Id && t.Requester == payer);
        if (s.Journeys.Any(j => j.Kind == JourneyKind.Ransom && j.CharacterId == c.Id && j.From == payer)) return $"a ransom for {c.Name} is already on its way";
        if (demand?.Other is not { } captor) return $"no ransom demand for {c.Name} has reached you";
        var held = c.Cover is { } k && k.For == payer
            ? k.HeldAt == captor
            : c.Status == CharacterStatus.Captured && c.HeldBy == captor;
        return held ? null : $"{c.Name} is no longer held by {captor}";
    }
}
