namespace Amarna.Engine;

public sealed record MoveResult(string From, string To, bool Succeeded);

/// <summary>What stopped a move, in the order the adjudicator checks.</summary>
public enum MoveStop
{
    /// <summary>The army went by sea and no convoy carried it.</summary>
    NoConvoy,
    /// <summary>The province held the mover's own unit, which stayed: no unit dislodges its own side.</summary>
    OwnUnit,
    /// <summary>The unit in the target was moving into the mover's province and held it off.</summary>
    HeadToHead,
    /// <summary>The unit in the target held (or supported, or convoyed) and kept its place.</summary>
    Held,
    /// <summary>The unit in the target tried to leave, failed, and so kept its place.</summary>
    Stayed,
    /// <summary>Another move into the same province was at least as strong.</summary>
    Bounced,
}

/// <summary>
/// Why a move failed, as the adjudicator resolved it: what stopped it, where the unit (or walls) that
/// stopped it stood, its power and kind, where that unit was itself moving, and the strengths compared
/// (the move's own, and what it had to beat).
/// </summary>
public sealed record MoveFailure(MoveStop Stop, string Province, Power? Power, UnitKind Kind, string? MovingTo, int Strength, int Against)
{
    /// <summary>For a move the unit in the target held off: the ground that counted in its hold strength, if any (<see cref="Geography.DefenceGround"/>).</summary>
    public Ground? Ground { get; init; }
    /// <summary>What that ground counted for (<see cref="GameConfig.TerrainDefence"/>).</summary>
    public int GroundBonus { get; init; }
}

/// <summary>
/// One line of a battle report: the unit's province, its power, the order as resolved, for a move its target
/// and why it failed, and for a support or convoy that matched nothing why it was void.
/// </summary>
public sealed record ReportLine(string Province, Power? Power, string Text, bool Ok)
{
    public string? Target { get; init; }
    public MoveFailure? Failure { get; init; }
    /// <summary>Why a support or convoy was void because the unit it named did not do what it helped (told to its own king only).</summary>
    public string? Void { get; init; }
    /// <summary>For a support that was cut (its unit still standing): why, in plain words.</summary>
    public string? Cut { get; init; }
    /// <summary>For a move that got into a walled province its mover does not hold: whether it stormed the walls, and the strengths.</summary>
    public Assault? Assault { get; init; }
}

/// <summary>
/// A move that got into a walled province its mover does not hold (Build order item 5): its strength, the level of the walls,
/// and the hold strength of the defenders it beat. An army storms the walls, and takes the province at once, only if its
/// strength beats the walls and the defenders together; otherwise it stands inside and takes nothing (a siege may follow).
/// A fleet never storms walls.
/// </summary>
public sealed record Assault(string Province, Power Power, UnitKind Kind, string From, Power? Owner, int Strength, int Walls, int Defenders)
{
    public bool Stormed => Kind == UnitKind.Army && Strength > Walls + Defenders;
    /// <summary>The ground that counted in the defenders' hold strength, if any: a storm must beat it too (it beat it to get in).</summary>
    public Ground? Ground { get; init; }
    /// <summary>What that ground counted for.</summary>
    public int GroundBonus { get; init; }
}

/// <summary>
/// A move on a unit that stood its ground with the ground's help (Build order item 5, terrain): where from and to, who
/// attacked and who stood, the ground, the strengths compared, and whether the move got in (the defender destroyed). Recorded
/// only when the adjudicator explains its battles.
/// </summary>
public sealed record GroundFight(string From, string To, Power Attacker, Power Defender, UnitKind DefenderKind, Ground Ground, int Strength, int Against, bool Won)
{
    /// <summary>The move failed only because of the ground: the unit there held it off, and the move beat the hold without the ground.</summary>
    public bool Decided { get; init; }
}

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
    /// <summary>Move: who held the destination before the moves (set by the engine; ownership is public).</summary>
    public Power? TargetOwner { get; set; }
}

public sealed class AdjudicationResult
{
    /// <summary>Unit id -> province it ends in (for units that survive).</summary>
    public Dictionary<string, string> NewPositions { get; } = new();
    public List<string> DislodgedUnitIds { get; } = new();
    /// <summary>Every move that got into a walled province its mover does not hold, stormed or not.</summary>
    public List<Assault> Assaults { get; } = new();
    /// <summary>The walled provinces taken by storm this season.</summary>
    public IEnumerable<string> Stormed => Assaults.Where(a => a.Stormed).Select(a => a.Province);
    public List<MoveResult> Moves { get; } = new();
    public List<string> CutSupports { get; } = new();
    /// <summary>Supports that held: (supporter, supported power, province acted on).</summary>
    public List<(Power Supporter, Power? Supported, string Province)> GivenSupports { get; } = new();
    /// <summary>The provinces whose unit was given at least one support to hold that was not cut (a besieger's speeds its siege).</summary>
    public HashSet<string> HoldSupported { get; } = new();
    /// <summary>Moves on units that stood their ground with the ground's help (only when the battles are explained).</summary>
    public List<GroundFight> GroundFights { get; } = new();
    /// <summary>Order description per unit province, with its outcome, for reports.</summary>
    public List<ReportLine> Lines { get; } = new();
    public List<OrderOutcome> Outcomes { get; } = new();
}

/// <summary>
/// Diplomacy-style resolution with no dice: strength is one plus supports and ties bounce.
/// Implements Lucas Kruijswijk's guess-and-check algorithm (from "The Math of Adjudication"),
/// with circular movement resolved as success and convoy paradoxes by the Szykman rule.
/// Walls add nothing to the battle (Build order item 5): a move that wins its way into a walled province its mover does
/// not hold storms the walls only if its strength also beats their level plus the hold strength it beat
/// (<see cref="Assault"/>); the engine decides what that means for the province. The ground does count (item 5, terrain): a
/// unit that stands its ground on rough ground, across a pass or a great river from the attack, or against a landing from
/// the sea holds with <see cref="GameConfig.TerrainDefence"/> more against that attack, at most that in all
/// (<see cref="Geography.DefenceGround"/>); never a unit that moves, nor one met head on, nor empty land.
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
        public string? Voided;   // a support or convoy that matched nothing (now a hold): the order as given
        public string? VoidWhy;  // and why it was void
        public bool Besieging;   // a besiege order: a hold that wears the city down
    }

    private readonly WorldMap _map;
    private readonly bool _explain;
    private readonly int _terrain;
    private readonly List<O> _orders = new();
    private readonly Dictionary<string, int> _at = new();
    private RState[] _state = [];
    private bool[] _result = [];
    private readonly List<int> _deps = new();
    private IReadOnlyDictionary<string, Power?> _owners = new Dictionary<string, Power?>();
    private IReadOnlyDictionary<string, int> _walls = new Dictionary<string, int>();
    private IReadOnlyList<SallyOrder> _sallies = [];
    private IReadOnlyDictionary<string, Power?> _sallyBy = new Dictionary<string, Power?>();

    /// <param name="explain">Also work out why each failed move failed and where each cut came from, for battle reports.</param>
    /// <param name="terrain">What the ground gives a unit that stands its ground (<see cref="GameConfig.TerrainDefence"/>); 0 turns terrain off.</param>
    public Adjudicator(WorldMap map, bool explain = false, int terrain = 1)
    {
        _map = map;
        _explain = explain;
        _terrain = Math.Max(0, terrain);
    }

    /// <param name="owners">Who holds each province before the moves: a move into one's own walled province storms nothing.</param>
    /// <param name="walls">The level of each province's walls (none if left out).</param>
    /// <param name="sallies">
    /// Walls that sally: each supports the move from its <see cref="SallyOrder.From"/> into its city, for its city's holder in
    /// <paramref name="owners"/>, as a support that cannot be cut (checked by the validator; one per city).
    /// </param>
    public AdjudicationResult Run(IReadOnlyList<Unit> units, IReadOnlyDictionary<string, Order> ordersByProvince,
        IReadOnlyDictionary<string, Power?>? owners = null, IReadOnlyDictionary<string, int>? walls = null, IReadOnlyList<SallyOrder>? sallies = null)
    {
        _orders.Clear();
        _at.Clear();
        _owners = owners ?? new Dictionary<string, Power?>();
        _walls = walls ?? new Dictionary<string, int>();
        _sallies = sallies ?? [];
        _sallyBy = _sallies.GroupBy(x => x.City).ToDictionary(g => g.Key, g => _owners.GetValueOrDefault(g.Key));
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
                case BesiegeOrder:
                    o.Besieging = true;
                    break;
            }
            Add(o);
        }

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

    /// <summary>
    /// Supports and convoys that do not match an actual order count as holds. The report still shows the order
    /// as given, void, and tells its own king why: a support of a move, or a convoy, names only the move that
    /// did not happen, so it reveals nothing about a province out of sight.
    /// </summary>
    private void VoidMismatched()
    {
        foreach (var o in _orders)
        {
            if (o.Kind == Kind.Support)
            {
                string? why;
                if (!_at.TryGetValue(o.Target!, out var t))
                    why = o.To is null ? $"no unit stood in {o.Target}" : $"no unit moved from {o.Target} to {o.To}";
                else
                {
                    var sup = _orders[t];
                    if (o.To is null) why = sup.Kind != Kind.Move ? null : $"the unit in {o.Target} was ordered to move, not to hold";
                    else why = sup.Kind == Kind.Move && sup.Target == o.To ? null : $"no unit moved from {o.Target} to {o.To}";
                }
                if (why is not null)
                {
                    o.Voided = $"supports {o.Target}{(o.To is null ? " holding" : " -> " + o.To)}";
                    o.VoidWhy = why;
                    o.Kind = Kind.Hold;
                }
            }
            else if (o.Kind == Kind.Convoy)
            {
                var ok = _map[o.At].IsSea && _at.TryGetValue(o.Target!, out var t)
                         && _orders[t].Kind == Kind.Move && _orders[t].ViaConvoy && _orders[t].Target == o.To
                         && _orders[t].UnitKind == UnitKind.Army;
                if (!ok)
                {
                    o.Voided = $"convoys {o.Target} -> {o.To}";
                    o.VoidWhy = _map[o.At].IsSea ? $"no army moved from {o.Target} to {o.To} by sea" : "a fleet convoys only at sea";
                    o.Kind = Kind.Hold;
                }
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
                else if (attack <= HoldStrength(o)) return false;

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
        // Walls that sally support the move from where they name into their city, and cannot be cut.
        foreach (var w in _sallies)
            if (w.City == move.Target && w.From == move.At && (excludePower is null || _sallyBy.GetValueOrDefault(w.City) != excludePower)) count++;
        return count;
    }

    /// <summary>Whether a sally found the move it supports (a move from where it names into its city, whoever made it).</summary>
    public bool SallyMatched(SallyOrder w) => _orders.Any(o => o.Kind == Kind.Move && o.At == w.From && o.Target == w.City);

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

    /// <summary>
    /// The hold strength a move into a province must beat: none if the province is empty or its unit got away; else 1 for the
    /// unit that stays (holding, besieging, supporting, convoying, or whose own move failed), its supports to hold if it did
    /// not try to move, and what the ground gives it against this move (<see cref="GroundAgainst"/>).
    /// </summary>
    private int HoldStrength(O move)
    {
        var province = move.Target!;
        if (!_at.TryGetValue(province, out var i)) return 0;
        var occ = _orders[i];
        var count = 1;
        if (occ.Kind == Kind.Move)
        {
            if (Resolve(occ.Index)) return 0;
        }
        else
            foreach (var s in _orders)
                if (s.Kind == Kind.Support && s.Target == province && s.To is null && Resolve(s.Index)) count++;
        return count + (GroundAgainst(move) is null ? 0 : _terrain);
    }

    /// <summary>The ground that helps a unit standing its ground in the move's target against it, or null (also when terrain is off).</summary>
    private Ground? GroundAgainst(O move) => _terrain > 0 ? Geography.DefenceGround(move.At, move.Target!, move.ViaConvoy) : null;

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
            if (o.UnitId is null) continue;
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
                    if (_explain && GroundFightOf(o, moved) is { } fight) r.GroundFights.Add(fight);
                    var assault = moved ? AssaultBy(o) : null;
                    if (assault is not null) r.Assaults.Add(assault);
                    r.Lines.Add(new ReportLine(o.At, o.Power, $"{label} -> {o.Target}{(o.ViaConvoy ? " (by sea)" : "")}: {(moved ? "succeeds" : "fails")}", moved)
                    {
                        Target = o.Target,
                        Failure = _explain && !moved ? WhyFailed(o) : null,
                        Assault = assault,
                    });
                    break;
                case Kind.Support:
                    var given = _result[o.Index];
                    if (!given) r.CutSupports.Add(o.At);
                    else if (o.Power is { } supporter && _at.TryGetValue(o.Target!, out var sIdx))
                    {
                        r.GivenSupports.Add((supporter, _orders[sIdx].Power, o.To ?? o.Target!));
                        if (o.To is null) r.HoldSupported.Add(o.Target!);
                    }
                    // A unit that is destroyed gives no support: that is not a cut.
                    var cutFrom = !given && !dislodged && _explain ? CutBy(o)?.At : null;
                    var failed = dislodged ? "void: the supporting unit was destroyed"
                        : cutFrom is not null ? $"cut (attacked from {cutFrom})" : "cut";
                    r.Lines.Add(new ReportLine(o.At, o.Power, $"{label} supports {o.Target}{(o.To is null ? " holding" : " -> " + o.To)}: {(given ? "given" : failed)}", given)
                    {
                        Cut = given || dislodged || !_explain ? null : cutFrom is not null ? $"the support was cut by an attack from {cutFrom}" : "the support was cut",
                    });
                    break;
                case Kind.Convoy:
                    r.Lines.Add(new ReportLine(o.At, o.Power, $"{label} convoys {o.Target} -> {o.To}", _result[o.Index]));
                    break;
                default:
                    r.Lines.Add(o.Voided is { } asGiven
                        ? new ReportLine(o.At, o.Power, $"{label} {asGiven}: void", false) { Void = _explain ? o.VoidWhy : null }
                        : new ReportLine(o.At, o.Power, $"{label} {(o.Besieging ? "besieges the city" : "holds")}", true));
                    break;
            }
            if (dislodged) r.Lines.Add(new ReportLine(o.At, o.Power, $"{label} is destroyed", false));
        }
        return r;
    }

    /// <summary>
    /// Why a resolved move failed, from the same checks <see cref="Adjudicate"/> made: the convoy, the mover's
    /// own unit, the head-to-head defence, another move that took the province, then in the adjudicator's order
    /// the hold and every other move into the province.
    /// </summary>
    private MoveFailure? WhyFailed(O move)
    {
        if (!PathOk(move)) return new(MoveStop.NoConvoy, move.Target!, null, UnitKind.Army, null, 0, 0);
        var attack = AttackStrength(move);
        var occ = _at.TryGetValue(move.Target!, out var i) ? _orders[i] : null;
        if (attack == 0 && occ is { Power: { } own } && own == move.Power)
            return new(MoveStop.OwnUnit, occ.At, occ.Power, occ.UnitKind, occ.Kind == Kind.Move ? occ.Target : null, 0, 0);

        // A head-to-head battle lost is the reason, even when a third move then walked into the province the winner left.
        var opp = HeadToHeadOpponent(move);
        if (opp is not null)
        {
            var defend = DefendStrength(opp);
            if (attack <= defend) return new(MoveStop.HeadToHead, opp.At, opp.Power, opp.UnitKind, opp.Target, attack, defend);
        }

        // Another move took the province: that is the news, even if the unit there also held this one off before it fell.
        if (MovesTo(move.Target!).FirstOrDefault(m => m != move && _result[m.Index]) is { } winner)
            return new(MoveStop.Bounced, winner.At, winner.Power, winner.UnitKind, winner.Target, attack, PreventStrength(winner));

        if (opp is null && occ is not null)
        {
            var hold = HoldStrength(move);
            if (attack <= hold)
            {
                var stop = occ.Kind == Kind.Move ? MoveStop.Stayed : MoveStop.Held;
                var ground = GroundAgainst(move);
                return new(stop, occ.At, occ.Power, occ.UnitKind, occ.Kind == Kind.Move ? occ.Target : null, attack, hold)
                {
                    Ground = ground,
                    GroundBonus = ground is null ? 0 : _terrain,
                };
            }
        }

        foreach (var other in MovesTo(move.Target!))
        {
            if (other == move) continue;
            var prevent = PreventStrength(other);
            if (attack <= prevent) return new(MoveStop.Bounced, other.At, other.Power, other.UnitKind, other.Target, attack, prevent);
        }
        return null;
    }

    /// <summary>
    /// A move that succeeded into a walled province its mover does not hold: its strength against the walls and the hold
    /// strength it beat (a unit that stayed, or the defence of one it met head on; nothing if the province was empty or its
    /// unit got away). Null for an unwalled province, or the mover's own.
    /// </summary>
    private Assault? AssaultBy(O move)
    {
        var target = move.Target!;
        var walls = _walls.GetValueOrDefault(target);
        if (walls <= 0 || move.Power is not { } mover) return null;
        var owner = _owners.GetValueOrDefault(target);
        if (owner == mover) return null;
        var opp = HeadToHeadOpponent(move);
        var beaten = opp is not null ? DefendStrength(opp) : HoldStrength(move);
        // The ground counted in the hold strength the move beat to get in: the storm must beat it too.
        var ground = opp is null && beaten > 0 ? GroundAgainst(move) : null;
        return new Assault(target, mover, move.UnitKind, move.At, owner, AttackStrength(move), walls, beaten)
        {
            Ground = ground,
            GroundBonus = ground is null ? 0 : _terrain,
        };
    }

    /// <summary>
    /// A move on another power's unit that stood its ground with the ground's help, not met head on: whether it got in, and
    /// whether the ground decided it (the unit held it off, and the move beat the hold without the ground). Null for any other
    /// move.
    /// </summary>
    private GroundFight? GroundFightOf(O move, bool moved)
    {
        if (HeadToHeadOpponent(move) is not null || !_at.TryGetValue(move.Target!, out var i)) return null;
        var occ = _orders[i];
        if (occ.Power is not { } defender || move.Power is not { } attacker || defender == attacker) return null;
        if (GroundAgainst(move) is not { } ground) return null;
        var hold = HoldStrength(move);
        if (hold == 0) return null;
        var attack = AttackStrength(move);
        var decided = !moved && attack <= hold && attack > hold - _terrain && WhyFailed(move) is { Stop: MoveStop.Held or MoveStop.Stayed };
        return new GroundFight(move.At, move.Target!, attacker, defender, occ.UnitKind, ground, attack, hold, moved) { Decided = decided };
    }

    /// <summary>The move that cut a support, by the same test <see cref="Adjudicate"/> used.</summary>
    private O? CutBy(O support) => MovesTo(support.At).FirstOrDefault(m =>
        m.Power != support.Power && !(support.To is not null && m.At == support.To) && PathOk(m));
}
