using Amarna.Engine;

namespace Amarna.Game.Bots;

/// <summary>
/// One king's reading of the board this season, built only from its <see cref="SeatView"/>:
/// where troops stand (those in sight, and those it last saw where it cannot see now), what each
/// province is worth, who could strike where.
/// </summary>
internal sealed class Board
{
    public static readonly WorldMap Map = WorldMap.Default;

    public SeatView V { get; }
    public Power Me { get; }
    /// <summary>Troops in sight, plus remembered ones out of sight.</summary>
    public List<UnitView> Units { get; }
    public Dictionary<string, UnitView> UnitAt { get; }
    public List<UnitView> Mine { get; }
    public List<UnitView> Others { get; }
    public double Horizon { get; }
    public HashSet<Power> Alive { get; }
    private readonly IReadOnlyDictionary<Power, double>? _treasuries;
    private readonly Dictionary<Power, double> _growth = new();
    private Power? _leader;
    private bool _ranked;

    /// <param name="treasuries">What this court reckons each rival holds in gold (see <see cref="Brain.Treasury"/>).</param>
    public Board(SeatView v, IEnumerable<UnitView>? remembered = null, IReadOnlyDictionary<Power, double>? treasuries = null)
    {
        V = v;
        Me = v.Power;
        _treasuries = treasuries;
        Units = v.Units.Concat((remembered ?? []).Where(g => v.Units.All(u => u.Province != g.Province))).ToList();
        UnitAt = Units.GroupBy(u => u.Province).ToDictionary(g => g.Key, g => g.First());
        Mine = Units.Where(u => u.Power == Me).OrderBy(u => u.Province, StringComparer.Ordinal).ToList();
        Others = Units.Where(u => u.Power != Me).ToList();
        Alive = Powers.All.Where(p => !v.Fallen.Contains(p)).ToHashSet();
        // Seasons the game can still be expected to run: the minimum, then 1/p on average.
        var tail = 1.0 / Math.Max(0.05, v.EndChance);
        Horizon = v.Turn < v.MinTurns ? v.MinTurns - v.Turn + tail : tail;
    }

    public Power? OwnerOf(string p) => V.Owner.GetValueOrDefault(p);
    public bool IsMine(string p) => OwnerOf(p) == Me;
    /// <summary>Whether a province has walls (Build order item 5: they add nothing to a battle, but a city within them falls only to a storm or a siege).</summary>
    public bool Walls(string p) => WallLevel(p) > 0;
    public int WallLevel(string p) => V.Walls.GetValueOrDefault(p);
    /// <summary>The siege of a province this court knows of, if any.</summary>
    public SiegeView? SiegeAt(string p) => V.Sieges.FirstOrDefault(x => x.Province == p);

    /// <summary>
    /// The strength a move into a walled province needs to storm it (to take it at once): more than its walls and the
    /// defenders' hold strength together. Zero for an unwalled one.
    /// </summary>
    public int StormNeeds(string p, int defenders) => Walls(p) ? WallLevel(p) + defenders + 1 : 0;
    public Province P(string id) => Map[id];

    /// <summary>What the ground gives a unit that stands its ground (Build order item 5, terrain), as the rules of the game set it.</summary>
    public int GroundBonus => V.Prices.GetValueOrDefault("terrainDefence", 1);

    /// <summary>
    /// The ground's help to a unit standing in <paramref name="to"/> against a move from <paramref name="from"/>: rough ground, a
    /// pass or a river on the link, or a landing from the sea (a move from a province not next to it comes by convoy).
    /// </summary>
    public int Ground(string from, string to) =>
        GroundBonus > 0 && Geography.DefenceGround(from, to, byConvoy: !Map.AreAdjacent(from, to)) is not null ? GroundBonus : 0;

    /// <summary>
    /// The ground's help to a unit standing in <paramref name="place"/> against a blow from these provinces: rough ground helps
    /// against any; a crossing or a landing only if every one of them comes over one, since the attacker leads with the
    /// unit that does not.
    /// </summary>
    public int Ground(IEnumerable<string> from, string place)
    {
        if (GroundBonus <= 0) return 0;
        if (Geography.TerrainOf(place) == Terrain.Rough) return GroundBonus;
        var froms = from.ToList();
        return froms.Count > 0 && froms.All(f => Ground(f, place) > 0) ? GroundBonus : 0;
    }

    /// <summary>The ground's help to a unit in <paramref name="place"/> against what a power could move into it this season.</summary>
    public int GroundAgainst(string place, Power attacker) => Ground(CanReach(place, u => u.Power == attacker).Select(u => u.Province), place);

    /// <summary>
    /// What an army of ours pays for supplies for a season it ends in <paramref name="place"/> (Build order item 5, terrain):
    /// the desert's cost if it is desert land we do not hold; nothing in our own land.
    /// </summary>
    public int DesertCost(string place) =>
        Geography.TerrainOf(place) == Terrain.Desert && !IsMine(place) ? V.Prices.GetValueOrDefault("desertUpkeep", 30) : 0;

    /// <summary>
    /// What holding a province is worth over the rest of the game: its score plus the income it brings. A kingdom falls with
    /// its capital (the siege package): a living king's capital is worth, to us, half of the rest of his land too, since it
    /// passes with the capital; our own is worth all the rest of ours, which we lose with it.
    /// </summary>
    public double Value(string id)
    {
        var v = BaseValue(id);
        var p = Map[id];
        if (p.Capital && p.Home is { } king && Alive.Contains(king) && OwnerOf(id) == king)
            v += (king == Me ? 1.0 : 0.5) * V.Owner.Where(x => x.Value == king && x.Key != id).Sum(x => BaseValue(x.Key));
        return v;
    }

    private double BaseValue(string id)
    {
        var p = Map[id];
        if (p.IsSea) return 0;
        var v = 10.0 * p.Yield + p.Yield * Horizon;
        if (p.Capital) v += 80;
        if (p.Home is { } h && h == Me) v += 30;
        return v;
    }

    /// <summary>Units (of a given power, or any but mine) that could move into a province this season.</summary>
    public IEnumerable<UnitView> CanReach(string target, Func<UnitView, bool> who) =>
        Units.Where(u => u.Province != target && who(u) && Map.CanMove(u.Kind, u.Province, target));

    public int Muster(Power p, string target) => CanReach(target, u => u.Power == p).Count();

    public IEnumerable<string> ArmyMoves(UnitView u) => Map.MovesFrom(u.Kind, u.Province);

    /// <summary>Land yield a power holds now, against what its homeland yields.</summary>
    public double LandGrowth(Power p)
    {
        var now = V.Owner.Where(x => x.Value == p).Sum(x => Map[x.Key].Yield);
        var start = Map.HomeOf(p).Sum(x => x.Yield);
        return start == 0 ? 0 : (double)now / start;
    }

    public int Provinces(Power p) => V.Owner.Count(x => x.Value == p);

    /// <summary>Gold a city costs per shekel of yield, which is also what a shekel of yield adds to a king's strength.</summary>
    public double YieldWorth => V.Prices.GetValueOrDefault("cityPricePerYield", 10);

    /// <summary>
    /// A king's strength as this court reckons it, by the game's own measure (<see cref="Scoring.Strength{T}"/>): land
    /// at the price of a city, plus gold, less back pay owed. Our own is what our view shows (our ledger, less the back
    /// pay we believe we owe); a rival's is estimated from what is public, with his gold as we reckon it and no back
    /// pay, which nobody can see. Buying a city turns gold into the same strength in land, so unlike land alone this
    /// does not mistake a buyer for a conqueror.
    /// </summary>
    public double Strength(Power p)
    {
        // A pictured board (see Search) has no treasury of its own: estimate it like any other.
        if (p == Me && V.StartStrength > 0) return V.Strength;
        var land = V.Owner.Where(x => x.Value == p).Sum(x => Map[x.Key].Yield);
        var gold = _treasuries is not null && _treasuries.TryGetValue(p, out var g) ? g : MapData.StartGold[p];
        return Scoring.Strength<double>(YieldWorth, land, Math.Max(0, gold), 0);
    }

    public double StartStrength(Power p) => p == Me && V.StartStrength > 0 ? V.StartStrength
        : Scoring.Strength<double>(YieldWorth, Map.HomeOf(p).Sum(x => x.Yield), MapData.StartGold[p], 0);

    /// <summary>Strength against what the king started with: the measure the game is won by.</summary>
    public double Growth(Power p)
    {
        if (!_growth.TryGetValue(p, out var g)) _growth[p] = g = Alive.Contains(p) ? Strength(p) / StartStrength(p) : 0;
        return g;
    }

    /// <summary>
    /// Who seems to be running away with the game: the king whose growth, as this court reckons it, stands
    /// clearly above both the start and the next king, once the first year is out (a city or two decides
    /// nothing yet), and who has the weight to be feared: a small kingdom that has grown fast leads the race,
    /// but is no threat to the great kings around it.
    /// </summary>
    public Power? Leader()
    {
        if (_ranked) return _leader;
        _ranked = true;
        var ranked = Alive.Select(p => (P: p, G: Growth(p))).OrderByDescending(x => x.G).ThenBy(x => x.P).ToList();
        if (ranked.Count < 2 || V.Turn <= 3) return null;
        var (top, g) = ranked[0];
        var strengths = Alive.Select(Strength).OrderBy(x => x).ToList();
        var median = strengths[strengths.Count / 2];
        _leader = g >= LeadFloor && g >= ranked[1].G + LeadMargin && Strength(top) >= 0.8 * median ? top : null;
        return _leader;
    }

    /// <summary>The growth a leader must reach, and the margin by which he must stand above the next king.</summary>
    public const double LeadFloor = 1.15, LeadMargin = 0.1;

    /// <summary>Kings whose land borders ours or shares a sea with our coasts, or whose troops are within two moves of us.</summary>
    public IEnumerable<Power> Neighbours()
    {
        var mine = V.Owner.Where(x => x.Value == Me).Select(x => x.Key).Concat(Mine.Select(u => u.Province)).ToHashSet();
        bool Close(Power p) =>
            V.Owner.Any(x => x.Value == p && (Map.Neighbors(x.Key).Any(mine.Contains) || mine.Any(m => Map.SharesSea(m, x.Key))))
            || Others.Any(u => u.Power == p && mine.Any(m => Map.CanMove(u.Kind, u.Province, m) || Map.MovesFrom(u.Kind, u.Province).Any(n => Map.CanMove(u.Kind, n, m))));
        return Alive.Where(p => p != Me && Close(p));
    }
}
