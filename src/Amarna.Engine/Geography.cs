namespace Amarna.Engine;

/// <summary>The ground of a land province. Sea zones are not given one.</summary>
public enum Terrain { Open, Rough, Desert }

/// <summary>What makes a connection between two provinces hard to cross.</summary>
public enum CrossingKind { Mountain, River }

/// <summary>A connection that crosses a mountain pass or a great river, by the name the siege package will use.</summary>
public sealed record Crossing(string A, string B, CrossingKind Kind, string Name)
{
    public bool Joins(string a, string b) => A == a && B == b || A == b && B == a;
}

/// <summary>A great river: the provinces it runs through, from its source to its mouth.</summary>
public sealed record River(string Id, string Name, IReadOnlyList<string> Course);

/// <summary>
/// Terrain as map data, per province and per connection, from the lists decided in the sleep-and-simulation round
/// (<c>docs/rounds/2026-10-18-sleep-and-simulation.md</c>: question 5, plan steps 14 and 15; question 10, plan step 2).
/// <para>
/// No rule reads it yet: it is drawn on the web map (the visual overhaul, Build order item 2), and the siege package
/// (item 5) is to give it its effects (at most +1 to a defender in a field battle on rough ground or across a crossing;
/// a foreign army ending a season in the desert paying more upkeep). Nothing in the engine may read it before then, so
/// seeds and replays are unchanged by it.
/// </para>
/// </summary>
public static class Geography
{
    /// <summary>Rough provinces (question 5, plan step 14).</summary>
    public static readonly IReadOnlyList<string> Rough = ["mira", "lukka", "isuwa", "amurru", "arbela", "tamassos"];

    /// <summary>Desert provinces (question 5, plan step 15: the Sinai, where Egypt's own armies pay nothing more, by the Ways of Horus).</summary>
    public static readonly IReadOnlyList<string> Desert = ["sinai"];

    /// <summary>
    /// The mountain and river crossings (question 5, plan step 14). A landing by convoy counts as a crossing too, which
    /// protects Alashiya; that is a rule of the siege package about any convoyed landing, not a connection, so it is
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
}
