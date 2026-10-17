namespace Amarna.Engine;

public sealed record MoveResult(string From, string To, bool Succeeded);

/// <summary>One order as it resolved: who, where, what, and whether it worked.</summary>
public sealed class OrderOutcome
{
    public Power Power { get; set; }
    public UnitKind UnitKind { get; set; }
    public string Province { get; set; } = "";
    /// <summary>hold, move, support or convoy.</summary>
    public string Order { get; set; } = "hold";
    /// <summary>Move: destination. Support or convoy: the province of the unit helped.</summary>
    public string? Target { get; set; }
    /// <summary>Support of a move, or convoy: where the helped unit was going.</summary>
    public string? To { get; set; }
    /// <summary>Support: the power of the unit helped.</summary>
    public Power? Helped { get; set; }
    public bool Succeeded { get; set; }
    public bool Destroyed { get; set; }
}

public sealed class AdjudicationResult
{
    /// <summary>Unit id -> province it ends in (for units that survive).</summary>
    public Dictionary<string, string> NewPositions { get; } = new();
    public List<string> DislodgedUnitIds { get; } = new();
    public List<string> FallenGarrisons { get; } = new();
    public List<MoveResult> Moves { get; } = new();
    public List<string> CutSupports { get; } = new();
    /// <summary>Supports that held: (supporter, supported power, province acted on).</summary>
    public List<(Power Supporter, Power? Supported, string Province)> GivenSupports { get; } = new();
    /// <summary>Order description per unit province, with its outcome, for reports.</summary>
    public List<(string Province, Power? Power, string Text, bool Ok)> Lines { get; } = new();
    public List<OrderOutcome> Outcomes { get; } = new();
}

/// <summary>
/// Diplomacy-style resolution with no dice: strength is one plus supports and ties bounce.
/// Implements Lucas Kruijswijk's guess-and-check algorithm (from "The Math of Adjudication"),
/// with circular movement resolved as success and convoy paradoxes by the Szykman rule.
/// City walls act as units that always hold: a free city's belong to nobody, a bought city's to its owner.
/// </summary>
public sealed class Adjudicator
{
    private enum Kind { Hold, Move, Support, Convoy }
    private enum RState { Unresolved, Guessing, Resolved }

    private sealed class O
    {
        public int Index;
        public string At = "";
        public Power? Power;
        public UnitKind UnitKind;
        public string? UnitId;
        public Kind Kind;
        public string? Target;   // move: destination; support/convoy: the supported unit's province
        public string? To;       // support-move / convoy: destination of the supported move
        public bool ViaConvoy;
        public bool ParadoxFailed;
        public string Text = "";
    }

    private readonly WorldMap _map;
    private readonly List<O> _orders = new();
    private readonly Dictionary<string, int> _at = new();
    private RState[] _state = [];
    private bool[] _result = [];
    private readonly List<int> _deps = new();

    public Adjudicator(WorldMap map) => _map = map;

    public AdjudicationResult Run(IReadOnlyList<Unit> units, IEnumerable<string> garrisons, IReadOnlyDictionary<string, Order> ordersByProvince,
        IReadOnlyDictionary<string, Power?>? owners = null)
    {
        _orders.Clear();
        _at.Clear();
        foreach (var u in units)
        {
            var o = new O { At = u.Province, Power = u.Power, UnitKind = u.Kind, UnitId = u.Id, Kind = Kind.Hold };
            ordersByProvince.TryGetValue(u.Province, out var order);
            switch (order)
            {
                case MoveOrder m:
                    o.Kind = Kind.Move;
                    o.Target = m.To;
                    o.ViaConvoy = u.Kind == UnitKind.Army && !_map.CanMove(UnitKind.Army, u.Province, m.To);
                    break;
                case SupportOrder s:
                    o.Kind = Kind.Support;
                    o.Target = s.Supported;
                    o.To = s.To;
                    break;
                case ConvoyOrder c:
                    o.Kind = Kind.Convoy;
                    o.Target = c.Army;
                    o.To = c.To;
                    break;
            }
            Add(o);
        }
        foreach (var g in garrisons)
            if (!_at.ContainsKey(g))
                Add(new O { At = g, Power = owners?.GetValueOrDefault(g), UnitKind = UnitKind.Army, Kind = Kind.Hold });

        VoidMismatched();

        _state = new RState[_orders.Count];
        _result = new bool[_orders.Count];
        _deps.Clear();
        for (var i = 0; i < _orders.Count; i++) Resolve(i);

        return Collect();
    }

    private void Add(O o)
    {
        o.Index = _orders.Count;
        _orders.Add(o);
        _at[o.At] = o.Index;
    }

    /// <summary>Supports and convoys that do not match an actual order count as holds.</summary>
    private void VoidMismatched()
    {
        foreach (var o in _orders)
        {
            if (o.Kind == Kind.Support)
            {
                var ok = _at.TryGetValue(o.Target!, out var t);
                if (ok)
                {
                    var sup = _orders[t];
                    if (sup.Power is null) ok = false; // a free city's walls take no help
                    else if (o.To is null) ok = sup.Kind != Kind.Move;
                    else ok = sup.Kind == Kind.Move && sup.Target == o.To;
                }
                if (!ok) o.Kind = Kind.Hold;
            }
            else if (o.Kind == Kind.Convoy)
            {
                var ok = _map[o.At].IsSea && _at.TryGetValue(o.Target!, out var t)
                         && _orders[t].Kind == Kind.Move && _orders[t].ViaConvoy && _orders[t].Target == o.To
                         && _orders[t].UnitKind == UnitKind.Army;
                if (!ok) o.Kind = Kind.Hold;
            }
        }
    }

    private bool Resolve(int nr)
    {
        if (_state[nr] == RState.Resolved) return _result[nr];
        if (_state[nr] == RState.Guessing)
        {
            if (!_deps.Contains(nr)) _deps.Add(nr);
            return _result[nr];
        }

        var oldCount = _deps.Count;
        _result[nr] = false;
        _state[nr] = RState.Guessing;
        var first = Adjudicate(nr);

        if (_deps.Count == oldCount)
        {
            if (_state[nr] != RState.Resolved)
            {
                _result[nr] = first;
                _state[nr] = RState.Resolved;
            }
            return first;
        }

        if (_deps[oldCount] != nr)
        {
            // Part of a cycle that started elsewhere; leave it guessing.
            _deps.Add(nr);
            _result[nr] = first;
            return first;
        }

        // nr starts a cycle: try the other guess.
        ResetDeps(oldCount);
        _result[nr] = true;
        _state[nr] = RState.Guessing;
        var second = Adjudicate(nr);

        if (first == second)
        {
            ResetDeps(oldCount);
            _result[nr] = first;
            _state[nr] = RState.Resolved;
            return first;
        }

        BackupRule(oldCount);
        return Resolve(nr);
    }

    private void ResetDeps(int oldCount)
    {
        for (var i = oldCount; i < _deps.Count; i++) _state[_deps[i]] = RState.Unresolved;
        _deps.RemoveRange(oldCount, _deps.Count - oldCount);
    }

    private void BackupRule(int oldCount)
    {
        var cycle = _deps.Skip(oldCount).ToList();
        _deps.RemoveRange(oldCount, _deps.Count - oldCount);

        var convoys = cycle.Where(i => _orders[i].Kind == Kind.Convoy || (_orders[i].Kind == Kind.Move && _orders[i].ViaConvoy)).ToList();
        if (convoys.Count > 0)
        {
            // Szykman: the convoyed armies in the paradox stay where they are.
            foreach (var i in convoys)
            {
                var o = _orders[i];
                var army = o.Kind == Kind.Move ? i : _at.GetValueOrDefault(o.Target!, -1);
                if (army >= 0 && _orders[army].Kind == Kind.Move && _orders[army].ViaConvoy)
                {
                    _orders[army].ParadoxFailed = true;
                    _result[army] = false;
                    _state[army] = RState.Resolved;
                }
            }
            foreach (var i in cycle)
                if (_state[i] != RState.Resolved) _state[i] = RState.Unresolved;
            return;
        }

        // Circular movement: everybody moves.
        foreach (var i in cycle)
        {
            if (_orders[i].Kind == Kind.Move)
            {
                _result[i] = true;
                _state[i] = RState.Resolved;
            }
            else _state[i] = RState.Unresolved;
        }
    }

    private bool Adjudicate(int nr)
    {
        var o = _orders[nr];
        switch (o.Kind)
        {
            case Kind.Move:
            {
                var attack = AttackStrength(o);
                var opp = HeadToHeadOpponent(o);
                if (opp is not null)
                {
                    if (attack <= DefendStrength(opp)) return false;
                }
                else if (attack <= HoldStrength(o.Target!)) return false;

                foreach (var other in MovesTo(o.Target!))
                    if (other != o && attack <= PreventStrength(other)) return false;
                return true;
            }
            case Kind.Support:
            {
                foreach (var m in MovesTo(o.At))
                {
                    if (m.Power == o.Power) continue;
                    if (o.To is not null && m.At == o.To) continue; // attacked from where it supports into: not cut unless dislodged
                    if (!PathOk(m)) continue;
                    return false;
                }
                foreach (var m in MovesTo(o.At))
                    if (Resolve(m.Index)) return false; // dislodged
                return true;
            }
            case Kind.Convoy:
                foreach (var m in MovesTo(o.At))
                    if (Resolve(m.Index)) return false;
                return true;
            default:
                return true;
        }
    }

    private IEnumerable<O> MovesTo(string province) => _orders.Where(x => x.Kind == Kind.Move && x.Target == province);

    private O? HeadToHeadOpponent(O move)
    {
        if (move.ViaConvoy) return null;
        if (!_at.TryGetValue(move.Target!, out var i)) return null;
        var opp = _orders[i];
        return opp.Kind == Kind.Move && opp.Target == move.At && !opp.ViaConvoy ? opp : null;
    }

    private bool PathOk(O move)
    {
        if (!move.ViaConvoy) return true;
        if (move.ParadoxFailed) return false;
        // Search through sea zones holding fleets that convoy this exact move and are not dislodged.
        var seen = new HashSet<string>();
        var frontier = new Queue<string>();
        foreach (var n in _map.Neighbors(move.At))
            if (IsConvoying(n, move) && seen.Add(n)) frontier.Enqueue(n);
        while (frontier.Count > 0)
        {
            var sea = frontier.Dequeue();
            if (!Resolve(_at[sea])) continue;
            foreach (var n in _map.Neighbors(sea))
            {
                if (n == move.Target) return true;
                if (IsConvoying(n, move) && seen.Add(n)) frontier.Enqueue(n);
            }
        }
        return false;
    }

    private bool IsConvoying(string sea, O move) =>
        _map[sea].IsSea && _at.TryGetValue(sea, out var i) && _orders[i].Kind == Kind.Convoy
        && _orders[i].Target == move.At && _orders[i].To == move.Target;

    private int Supports(O move, Power? excludePower)
    {
        var count = 0;
        foreach (var s in _orders)
            if (s.Kind == Kind.Support && s.Target == move.At && s.To == move.Target && Resolve(s.Index))
                if (excludePower is null || s.Power != excludePower) count++;
        return count;
    }

    private int AttackStrength(O move)
    {
        if (!PathOk(move)) return 0;
        if (!_at.TryGetValue(move.Target!, out var i)) return 1 + Supports(move, null);
        var occ = _orders[i];
        var opp = HeadToHeadOpponent(move);
        if (occ.Kind == Kind.Move && opp is null && Resolve(occ.Index)) return 1 + Supports(move, null);
        if (occ.Power is not null && occ.Power == move.Power) return 0;
        return 1 + Supports(move, occ.Power);
    }

    private int HoldStrength(string province)
    {
        if (!_at.TryGetValue(province, out var i)) return 0;
        var occ = _orders[i];
        if (occ.Kind == Kind.Move) return Resolve(occ.Index) ? 0 : 1;
        var count = 1;
        foreach (var s in _orders)
            if (s.Kind == Kind.Support && s.Target == province && s.To is null && Resolve(s.Index)) count++;
        return count;
    }

    private int DefendStrength(O move) => 1 + Supports(move, null);

    private int PreventStrength(O move)
    {
        if (!PathOk(move)) return 0;
        var opp = HeadToHeadOpponent(move);
        if (opp is not null && Resolve(opp.Index)) return 0;
        return 1 + Supports(move, null);
    }

    private AdjudicationResult Collect()
    {
        var r = new AdjudicationResult();
        var succeededInto = new HashSet<string>();
        foreach (var o in _orders)
            if (o.Kind == Kind.Move && _result[o.Index]) succeededInto.Add(o.Target!);

        foreach (var o in _orders)
        {
            var moved = o.Kind == Kind.Move && _result[o.Index];
            var dislodged = !moved && succeededInto.Contains(o.At);
            if (o.UnitId is null)
            {
                if (dislodged) r.FallenGarrisons.Add(o.At);
                continue;
            }
            if (dislodged) r.DislodgedUnitIds.Add(o.UnitId);
            else r.NewPositions[o.UnitId] = moved ? o.Target! : o.At;

            var label = $"{(o.UnitKind == UnitKind.Army ? "A" : "F")} {o.At}";
            var outcome = new OrderOutcome
            {
                Power = o.Power!.Value,
                UnitKind = o.UnitKind,
                Province = o.At,
                Order = o.Kind.ToString().ToLowerInvariant(),
                Target = o.Target,
                To = o.To,
                Helped = o.Kind == Kind.Support && _at.TryGetValue(o.Target!, out var helpedAt) ? _orders[helpedAt].Power : null,
                Succeeded = o.Kind switch { Kind.Move => moved, Kind.Hold => !dislodged, _ => _result[o.Index] },
                Destroyed = dislodged,
            };
            r.Outcomes.Add(outcome);
            switch (o.Kind)
            {
                case Kind.Move:
                    r.Moves.Add(new MoveResult(o.At, o.Target!, moved));
                    r.Lines.Add((o.At, o.Power, $"{label} -> {o.Target}{(o.ViaConvoy ? " (by sea)" : "")}: {(moved ? "succeeds" : "fails")}", moved));
                    break;
                case Kind.Support:
                    var given = _result[o.Index];
                    if (!given) r.CutSupports.Add(o.At);
                    else if (o.Power is { } supporter && _at.TryGetValue(o.Target!, out var sIdx))
                        r.GivenSupports.Add((supporter, _orders[sIdx].Power, o.To ?? o.Target!));
                    r.Lines.Add((o.At, o.Power, $"{label} supports {o.Target}{(o.To is null ? " holding" : " -> " + o.To)}: {(given ? "given" : "cut")}", given));
                    break;
                case Kind.Convoy:
                    r.Lines.Add((o.At, o.Power, $"{label} convoys {o.Target} -> {o.To}", _result[o.Index]));
                    break;
                default:
                    r.Lines.Add((o.At, o.Power, $"{label} holds", true));
                    break;
            }
            if (dislodged) r.Lines.Add((o.At, o.Power, $"{label} is destroyed", false));
        }
        return r;
    }
}
