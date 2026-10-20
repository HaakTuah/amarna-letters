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

    /// <summary>
    /// Why an order for a unit in <paramref name="province"/> is refused when no unit of the seat's stands there: a foreign
    /// unit is named as such only where the seat can see it, so that the refusal says nothing of troops out of its sight.
    /// </summary>
    public static string NotYours(Unit? unit, string province, IReadOnlySet<string> sight) =>
        unit is not null && sight.Contains(province) ? $"the unit in {province} is not yours" : $"you have no unit in {province}";

    public ValidationResult Validate(Power power, TurnSubmission submission)
    {
        var result = new ValidationResult();
        var ledger = _s.Treasuries[power].Ledger;
        var budget = ledger;
        // People this season's orders hire: they enter service only at the end of the season, so no errand can be given them
        // now. Only a hire that stands counts (one refused for its wage, or for someone not free to take it, does not), and it
        // counts wherever it is listed, so that an errand listed before it is refused in the same words.
        var hiring = submission.Orders.Take(MaxOrders).OfType<HireOrder>().Where(h => HireRefusal(h, out _) is null).Select(h => h.Character).ToHashSet();
        var assayed = new HashSet<string>();
        var ceded = new HashSet<string>();
        var fortified = new HashSet<string>();
        var orderedUnits = new HashSet<string>();
        var raisedIn = new HashSet<string>();
        var bought = new HashSet<string>();
        var busyCharacters = new HashSet<string>();
        var ransomed = new HashSet<string>();
        var renewed = new HashSet<string>();
        var dispatches = 0;
        var seekCount = 0;
        var counterIntel = false;
        HashSet<string>? sight = null;

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
                if (order is RenewOrder rn) renewed.Add(rn.Character);
                if (order is AssayOrder a) assayed.Add(a.Lot);
                if (order is CedeProvinceOrder cp) ceded.Add(cp.Province);
                if (order is FortifyOrder fo) fortified.Add(fo.Province);
            }
            else
            {
                budget = budgetBefore;
                result.Rejected.Add(new(order, error));
            }
        }
        foreach (var o in submission.Orders.Skip(MaxOrders)) result.Rejected.Add(new(o, $"too many orders: only the first {MaxOrders} of a season are read"));
        return result;

        // Gold is reserved in the order the orders are listed, as each is accepted (the rulebook's "HOW A SEASON RESOLVES").
        string? Spend(int cost)
        {
            if (cost < 0) return "a cost cannot be negative";
            if (cost > budget)
            {
                var reserved = ledger - budget;
                return reserved > 0
                    ? $"not enough gold: it needs {cost} shekels; orders listed before it had reserved {reserved}, and {budget} was left"
                    : $"not enough gold: it needs {cost} shekels, and your treasury held {budget} by your ledger";
            }
            budget -= cost;
            return null;
        }

        string? OwnUnit(string province, out Unit? unit)
        {
            unit = _s.UnitAt(province);
            if (!_map.Exists(province)) return $"there is no province called '{province}'";
            if (unit is null || unit.Power != power) return NotYours(unit, province, Sight());
            if (orderedUnits.Contains(province)) return $"the unit in {province} already has an order";
            return null;
        }

        // What this seat can see: a refusal says nothing of troops out of its sight.
        HashSet<string> Sight() => sight ??= Views.Sight(_s, _map, power);

        static string? UnitOf(Order o) => OrderKeys.UnitOf(o);

        static string? CharacterOf(Order o) => OrderKeys.CharacterOf(o);

        static string Nobody(string id) => string.IsNullOrWhiteSpace(id) ? "you named nobody" : $"there is nobody called '{id}'";

        // A servant abroad whose fate this court has not heard of is, for its orders, a servant who is away:
        // nothing the validator says may betray what happened to it.
        bool Covered(Character c) => c.CoverOf(power) is not null;

        string? OwnCharacter(string id, out Character? c, bool mustBeHome = true)
        {
            c = _s.FindCharacter(id);
            if (c is null) return Nobody(id);
            var away = Covered(c) || (c.Employer == power && c.Status == CharacterStatus.Captured);
            if (!away && (c.Employer != power || c.Status != CharacterStatus.Employed))
                return hiring.Contains(c.Id)
                    ? $"{c.Name} was to be hired that season: a person hired enters your service only at the end of the season, and can be sent on an errand from the next season"
                    : $"{c.Name} is not in your service";
            if (mustBeHome && (away || c.Duty != Duty.None || c.At != power)) return $"{c.Name} is not at your court";
            if (busyCharacters.Contains(c.Id)) return $"{c.Name} was already given a task by an earlier order";
            return null;
        }

        // Whether a hire can stand, apart from the person being given another task by an earlier order.
        string? HireRefusal(HireOrder h, out Character? c)
        {
            c = _s.FindCharacter(h.Character);
            if (c is null) return Nobody(h.Character);
            // One of yours away, as far as you know (it went over to another court, or was let go there), reads as any servant of yours.
            if (Covered(c) || c.Employer == power && c.Status is CharacterStatus.Employed or CharacterStatus.Captured)
                return $"{c.Name} is already in your service; to keep them on, order renew";
            if (!c.IsAvailableForHire) return $"{c.Name} is not available for hire";
            if (c.HeldBy is { } holder && holder != power) return $"{c.Name} is held at the court of {holder} and cannot come to yours";
            if (!c.Pitches.ContainsKey(power) && c.At != power) return $"{c.Name} has not presented themselves to your court";
            if (h.Wage <= 0 || h.Term <= 0) return "wage and term must be positive";
            return null;
        }

        string? Check(Order order)
        {
            switch (order)
            {
                // An order the reply named but left incomplete: refused with the reason, rather than dropped unseen.
                case UnreadableOrder u:
                    return u.Reason;

                case HoldOrder h:
                    return OwnUnit(h.Unit, out _);

                case MoveOrder m:
                {
                    if (OwnUnit(m.Unit, out var u) is { } e) return e;
                    if (string.IsNullOrWhiteSpace(m.To)) return "name the province the unit should move to";
                    if (!_map.Exists(m.To)) return $"there is no province called '{m.To}'";
                    if (m.To == m.Unit) return "a unit cannot move to where it stands";
                    if (u!.Kind == UnitKind.Fleet)
                        return _map.CanMove(UnitKind.Fleet, m.Unit, m.To) ? null : $"a fleet in {m.Unit} cannot reach {m.To}";
                    if (_map.CanMove(UnitKind.Army, m.Unit, m.To)) return null;
                    return _map.SeaRouteExists(m.Unit, m.To) ? null : $"an army in {m.Unit} cannot reach {m.To}";
                }

                case SupportOrder sp:
                {
                    if (OwnUnit(sp.Unit, out var u) is { } e) return e;
                    if (string.IsNullOrWhiteSpace(sp.Supported)) return "name the unit to support, by the province it stands in";
                    if (!_map.Exists(sp.Supported)) return $"there is no province called '{sp.Supported}'";
                    // Out of sight, a province's troops are unknown: the support is given, and is void if no unit there acts as it names.
                    if (_s.UnitAt(sp.Supported) is null && Sight().Contains(sp.Supported)) return $"there is no unit in {sp.Supported} to support";
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
                    if (string.IsNullOrWhiteSpace(c.Army)) return "name the army to convoy, by the province it stands in";
                    if (string.IsNullOrWhiteSpace(c.To)) return "name the coast where the army should land";
                    if (!_map.Exists(c.Army)) return $"there is no province called '{c.Army}'";
                    var army = _s.UnitAt(c.Army);
                    // As for a support: out of sight, the convoy is given, and is void if no army there sails as it names.
                    if ((army is null || army.Kind != UnitKind.Army) && Sight().Contains(c.Army)) return $"there is no army in {c.Army}";
                    if (!_map.Exists(c.To) || !_map[c.To].IsCoastal) return $"{c.To} is not a coast an army can land on";
                    return null;
                }

                case FortifyOrder f:
                {
                    if (string.IsNullOrWhiteSpace(f.Province)) return "name the province whose walls to strengthen";
                    if (!_map.Exists(f.Province) || _map[f.Province].IsSea) return $"there is no province called '{f.Province}'";
                    var name = _map[f.Province].Name;
                    if (_s.Owner.GetValueOrDefault(f.Province) != power) return $"you do not hold {name}";
                    var level = _s.WallsOf(f.Province);
                    if (level >= _s.Config.MaxWalls) return $"the walls of {name} stand at {level}, as high as walls go";
                    if (_s.SiegeOf(f.Province) is not null) return $"{name} is besieged: its walls cannot be strengthened while the siege lasts";
                    if (fortified.Contains(f.Province)) return $"the walls of {name} were already to be strengthened by an earlier order";
                    return Spend(_s.Config.FortifyCost * (level + 1));
                }

                case BesiegeOrder b:
                {
                    if (OwnUnit(b.Unit, out var u) is { } e) return e;
                    if (u!.Kind != UnitKind.Army) return "only an army can besiege a city; a fleet cannot";
                    if (_s.WallsOf(b.Unit) <= 0) return $"{_map[b.Unit].Name} has no walls to besiege";
                    if (_s.Owner.GetValueOrDefault(b.Unit) == power) return $"{_map[b.Unit].Name} is yours";
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
                    if (cp.Province == _map.Capital(power).Id) return "you cannot cede your capital: your kingdom falls with it";
                    if (cp.To == power || !_s.IsAlive(cp.To)) return $"you cannot cede land to {cp.To}";
                    if (ceded.Contains(cp.Province)) return $"{_map[cp.Province].Name} was already ceded by an earlier order";
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
                    if (c is null) return Nobody(rl.Character);
                    if (c.HeldBy != power) return $"you are not holding {c.Name}";
                    if (busyCharacters.Contains(c.Id)) return $"{c.Name} was already given a task by an earlier order";
                    return null;
                }

                case SeekCandidatesOrder:
                    return seekCount > 0 ? "you had already asked for candidates that season" : null;

                case HireOrder h:
                {
                    if (HireRefusal(h, out var c) is { } e) return e;
                    if (busyCharacters.Contains(c!.Id)) return $"{c.Name} was already given a task by an earlier order";
                    return null;
                }

                case DismissOrder dm:
                    return OwnCharacter(dm.Character, out _, mustBeHome: false);

                case RenewOrder rn:
                {
                    // Not a task: a servant may be renewed and sent on an errand in the same season.
                    var c = _s.FindCharacter(rn.Character);
                    if (c is null) return Nobody(rn.Character);
                    var cover = c.CoverOf(power);
                    if (cover is null && (c.Employer != power || c.Status is not (CharacterStatus.Employed or CharacterStatus.Captured)))
                        return $"{c.Name} is not in your service";
                    // One who has given notice may be renewed wherever they are; anyone else only at your court. A servant
                    // abroad whose fate this court has not heard of counts as it believes.
                    var notice = cover is not null ? cover.NoticePrice is not null : c.Contract?.NoticePrice is not null;
                    var home = cover is null && c.Status == CharacterStatus.Employed && c.Duty == Duty.None && c.At == power;
                    if (!notice && !home) return $"{c.Name} is not at your court and has not given notice";
                    if (rn.Wage <= 0 || rn.Term <= 0) return "wage and term must be positive";
                    if (renewed.Contains(c.Id)) return $"{c.Name} was already renewed by an earlier order";
                    return null;
                }

                case BackgroundCheckOrder bc:
                {
                    if (_s.FindCharacter(bc.Character) is null) return Nobody(bc.Character);
                    if (bc.Spend < 10) return "a background check costs at least 10 shekels";
                    return Spend(bc.Spend);
                }

                case PlaceSpyOrder ps:
                {
                    // In the rulebook's words: a spy must be one of your own people at your court, sent to watch a court or a province.
                    if (OwnCharacter(ps.Character, out _) is { } e) return $"a spy must be one of your own people at your court: {e}";
                    if (ps.Court is null && ps.Province is null) return "a spy must be sent to watch a court or a province: you named neither";
                    if (ps.Court is not null && ps.Province is not null) return "a spy must be sent to watch a court or a province: name only one";
                    if (ps.Court is { } court && (court == power || !_s.IsAlive(court))) return $"you cannot spy on {court}";
                    if (ps.Province is not null && (!_map.Exists(ps.Province) || _map[ps.Province].IsSea)) return $"there is no province called '{ps.Province}'";
                    return null;
                }

                case RecallSpyOrder rs:
                {
                    var c = _s.FindCharacter(rs.Character);
                    if (c is null || (c.Employer != power && !Covered(c))) return $"{rs.Character} is not in your service";
                    if ((c.CoverOf(power)?.Believed ?? c.Duty) != Duty.SpyPosted) return $"{c.Name} is not on a mission";
                    if (busyCharacters.Contains(c.Id)) return $"{c.Name} was already given a task by an earlier order";
                    return null;
                }

                case CounterIntelOrder ci:
                    if (counterIntel) return "you had already set your watch that season";
                    return Spend(ci.Spend);

                case AssayOrder a:
                    if (!_s.Treasuries[power].Lots.Any(l => l.Id == a.Lot)) return $"there is no unassayed gold '{a.Lot}'";
                    if (assayed.Contains(a.Lot)) return $"gold lot {a.Lot} was already to be assayed by an earlier order";
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
                    return CaptiveRefusal(_s, c, co.Fate);
                }

                case PayRansomOrder pr:
                {
                    var c = _s.FindCharacter(pr.Character);
                    if (c is null) return Nobody(pr.Character);
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
        var held = c.CoverOf(payer) is { } k
            ? k.HeldAt == captor
            : c.Status == CharacterStatus.Captured && c.HeldBy == captor;
        return held ? null : $"{c.Name} is no longer held by {captor}";
    }

    /// <summary>
    /// The court a ransom demand for a captive goes to: its king, or the king who dismissed it (so that a captor
    /// learns nothing of another court's dismissal), or nobody once that kingdom has fallen.
    /// </summary>
    public static Power? RansomPayer(GameState s, Character c) =>
        c.Employer is { } e && s.IsAlive(e) ? e
        : c.Employer is null && c.FormerEmployer is { } former && s.IsAlive(former) ? former
        : null;

    /// <summary>
    /// Why a captor's ransom or turning cannot be carried out, in the rulebook's words, or null. A ransom needs a
    /// court to pay it; a turning needs a king to deceive, which a captive whose king dismissed it no longer has.
    /// </summary>
    public static string? CaptiveRefusal(GameState s, Character c, CaptiveFate fate)
    {
        // An envoy caught at a besieged city was no spy at a post: there is nowhere to send it back to deceive from.
        if (fate == CaptiveFate.Turn && c.Intercepted)
            return $"{c.Name} is an envoy your besiegers caught, not a spy at a post, and cannot be turned. {c.Name} remains your captive";
        var possible = fate switch
        {
            CaptiveFate.Ransom => RansomPayer(s, c) is not null,
            CaptiveFate.Turn => c.Employer is { } master && s.IsAlive(master),
            _ => true,
        };
        if (possible) return null;
        var nobody = $"nobody is left to {(fate == CaptiveFate.Ransom ? "pay" : "deceive")}. {c.Name} remains your captive";
        return c.FormerEmployer is { } former && s.IsAlive(former)
            ? $"{c.Name} serves no king now: {nobody}"
            : $"{c.Name}'s kingdom has fallen: {nobody}";
    }
}
