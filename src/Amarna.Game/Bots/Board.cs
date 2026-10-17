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

    public Board(SeatView v, IEnumerable<UnitView>? remembered = null)
    {
        V = v;
        Me = v.Power;
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
    public bool Walls(string p) => V.Garrisons.Contains(p);
    public Province P(string id) => Map[id];

    /// <summary>What holding a province is worth over the rest of the game: its score plus the income it brings.</summary>
    public double Value(string id)
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

    /// <summary>Who seems to be running away with the game, judged by land (treasuries are private).</summary>
    public Power? Leader()
    {
        var ranked = Alive.Select(p => (P: p, G: LandGrowth(p))).OrderByDescending(x => x.G).ThenBy(x => x.P).ToList();
        if (ranked.Count < 2) return null;
        var (top, g) = ranked[0];
        return g >= 1.2 && g >= ranked[1].G + 0.15 ? top : null;
    }

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
