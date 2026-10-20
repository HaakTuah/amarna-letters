namespace Amarna.Engine;

/// <summary>The ground of a land province. Sea zones are not given one.</summary>
public enum Terrain { Open, Rough, Desert }

/// <summary>What makes a connection between two provinces hard to cross.</summary>
public enum CrossingKind { Mountain, River }

/// <summary>A connection that crosses a mountain pass or a great river, by its name.</summary>
public sealed record Crossing(string A, string B, CrossingKind Kind, string Name)
{
    public bool Joins(string a, string b) => A == a && B == b || A == b && B == a;
}

/// <summary>A great river: the provinces it runs through, from its source to its mouth.</summary>
public sealed record River(string Id, string Name, IReadOnlyList<string> Course);

/// <summary>What the ground gives a defender against one attack: rough ground, a pass, a river, or a landing from the sea.</summary>
public enum GroundKind { Rough, Pass, River, Landing }

/// <summary>
/// The ground that helps a unit standing its ground against one attack (<see cref="Geography.DefenceGround"/>): its kind,
/// and the province (rough ground) or the crossing's name. <see cref="Text"/> says it as the battle report does.
/// </summary>
public sealed record Ground(GroundKind Kind, string Name)
{
    /// <summary>"the rough ground of mira", "the Cilician Gates, a mountain pass", "the crossing of the Euphrates", "a landing from the sea".</summary>
    public string Text => Kind switch
    {
        GroundKind.Rough => $"the rough ground of {Name}",
        GroundKind.Pass => $"{Name}, a mountain pass",
        GroundKind.River => $"the crossing of {Name}",
        _ => "a landing from the sea",
    };
}

/// <summary>
/// Terrain as map data, per province and per connection, from the lists decided in the sleep-and-simulation round
/// (<c>docs/rounds/2026-10-18-sleep-and-simulation.md</c>: question 5, plan steps 14 and 15; question 10, plan step 2),
/// drawn on the web map since the visual overhaul (Build order item 2) and given its effects by the siege package (item 5):
/// rough ground, a pass or a great river on the connection an attack comes over, and a landing from the sea give a unit that
/// stands its ground <see cref="GameConfig.TerrainDefence"/> more, at most that in all (<see cref="DefenceGround"/>); an army
/// that ends a season in desert land its king did not hold pays <see cref="GameConfig.DesertUpkeep"/> for supplies. No rule
/// names a power: Egypt crosses the Sinai freely because it holds it, and so does anyone who takes it.
/// </summary>
public static class Geography
{
    /// <summary>Rough provinces (question 5, plan step 14).</summary>
    public static readonly IReadOnlyList<string> Rough = ["mira", "lukka", "isuwa", "amurru", "arbela", "tamassos"];

    /// <summary>
    /// Desert provinces (question 5, plan step 15: the Sinai). Question 5 exempted Egypt's armies by the Ways of Horus; the
    /// rule is instead that an army in its own land pays no desert cost, so Egypt is exempt while it holds the Sinai, and so
    /// is anyone who takes it.
    /// </summary>
    public static readonly IReadOnlyList<string> Desert = ["sinai"];

    /// <summary>
    /// The mountain and river crossings (question 5, plan step 14). A landing by convoy counts as a crossing too, which
    /// protects Alashiya; that is a rule about any convoyed landing (<see cref="DefenceGround"/>), not a connection, so it is
    /// not listed here.
    /// </summary>
    public static readonly IReadOnlyList<Crossing> Crossings =
    [
        new("tuwanuwa", "kizzuwatna", CrossingKind.Mountain, "the Cilician Gates"),
        new("kanesh", "kizzuwatna", CrossingKind.Mountain, "the Taurus"),
        new("kizzuwatna", "carchemish", CrossingKind.Mountain, "the Amanus"),
        new("carchemish", "harran", CrossingKind.River, "the Euphrates"),
        new("isuwa", "harran", CrossingKind.River, "the Euphrates"),
        new("taidu", "nineveh", CrossingKind.River, "the Tigris"),
    ];

    /// <summary>The ordered courses of the great rivers, source to mouth (question 10, plan step 2).</summary>
    public static readonly IReadOnlyList<River> Rivers =
    [
        new("nile", "Nile", ["thebes", "akhetaten", "memphis", "delta"]),
        new("euphrates", "Euphrates", ["carchemish", "terqa", "mari", "sippar", "babylon", "nippur", "ur"]),
        new("tigris", "Tigris", ["nineveh", "ashur", "ekallatum", "durkurigalzu"]),
    ];

    /// <summary>The terrain of a province: rough, desert, or open (every other land province, and the sea zones).</summary>
    public static Terrain TerrainOf(string province) =>
        Rough.Contains(province) ? Terrain.Rough : Desert.Contains(province) ? Terrain.Desert : Terrain.Open;

    /// <summary>The crossing on the connection between two provinces, if any (either way round).</summary>
    public static Crossing? CrossingBetween(string a, string b) => Crossings.FirstOrDefault(c => c.Joins(a, b));

    /// <summary>The great rivers that run through a province, in the order above.</summary>
    public static IEnumerable<River> RiversThrough(string province) => Rivers.Where(r => r.Course.Contains(province));

    /// <summary>
    /// The ground that helps a unit standing its ground in <paramref name="to"/> against a move from <paramref name="from"/>
    /// (Build order item 5; question 5, plan step 14): rough ground in the province, else a pass or a great river on the
    /// connection the move comes over, else a landing from the sea (an army carried by convoy); null if none. The first that
    /// applies is named; together they give no more than one alone (<see cref="GameConfig.TerrainDefence"/>). It helps only
    /// a unit that stays where it is: never one that moves, one met head on, empty land, walls, or a siege's pace.
    /// </summary>
    public static Ground? DefenceGround(string from, string to, bool byConvoy)
    {
        if (TerrainOf(to) == Terrain.Rough) return new(GroundKind.Rough, to);
        if (CrossingBetween(from, to) is { } c) return new(c.Kind == CrossingKind.Mountain ? GroundKind.Pass : GroundKind.River, c.Name);
        return byConvoy ? new(GroundKind.Landing, "") : null;
    }
}
