using Amarna.Engine;

namespace Amarna.Game.Bots;

/// <summary>
/// How a script king plays. Every weight runs from 0 to 1. Each power has a historical archetype,
/// and every game nudges each weight by a seeded amount, so a king is recognisable from game to
/// game but never quite the same.
/// </summary>
public sealed record Personality
{
    public required string Epithet { get; init; }
    public required string Description { get; init; }

    /// <summary>Appetite for war: how readily it attacks land that is not free.</summary>
    public double Aggression { get; init; }
    /// <summary>Weight on keeping what it has: troops held back, reserves of gold.</summary>
    public double Caution { get; init; }
    /// <summary>Keeps sealed oaths, sends fine gold, tells envoys the truth.</summary>
    public double Honesty { get; init; }
    /// <summary>Hoards gold rather than spending it.</summary>
    public double Greed { get; init; }
    /// <summary>Sends gifts and returns favours.</summary>
    public double Generosity { get; init; }
    /// <summary>Cares about titles: who is called brother and Great King.</summary>
    public double Pride { get; init; }
    /// <summary>Writes letters, seals tablets, builds coalitions.</summary>
    public double Diplomacy { get; init; }
    /// <summary>Spies, bribes, forgeries and turned captives.</summary>
    public double Cunning { get; init; }
    /// <summary>How long it remembers a wrong, and how hard it punishes one.</summary>
    public double Vengeance { get; init; }
    /// <summary>Prefers buying cities to conquering them.</summary>
    public double Commerce { get; init; }

    private static readonly Dictionary<Power, Personality> Archetypes = new()
    {
        [Power.Egypt] = new()
        {
            Epithet = "Pharaoh of the gilded gifts",
            Description = "Proud and lavish, sends gold to keep the other kings in his debt (not always fine gold), and expands by buying the cities of Canaan.",
            Aggression = 0.40, Caution = 0.60, Honesty = 0.45, Greed = 0.35, Generosity = 0.80, Pride = 0.90,
            Diplomacy = 0.75, Cunning = 0.50, Vengeance = 0.50, Commerce = 0.75,
        },
        [Power.Hatti] = new()
        {
            Epithet = "the conqueror of Anatolia",
            Description = "Expansionist and impatient, keeps oaths while they serve him, and strikes where a neighbour is weak.",
            Aggression = 0.85, Caution = 0.35, Honesty = 0.40, Greed = 0.45, Generosity = 0.30, Pride = 0.80,
            Diplomacy = 0.50, Cunning = 0.60, Vengeance = 0.70, Commerce = 0.30,
        },
        [Power.Babylonia] = new()
        {
            Epithet = "keeper of the old order",
            Description = "Rich and status-conscious, counts every shekel of a gift, refuses to call upstarts brother, and fights only to protect his own.",
            Aggression = 0.35, Caution = 0.70, Honesty = 0.65, Greed = 0.75, Generosity = 0.35, Pride = 1.00,
            Diplomacy = 0.70, Cunning = 0.45, Vengeance = 0.60, Commerce = 0.60,
        },
        [Power.Mitanni] = new()
        {
            Epithet = "seeker of a patron",
            Description = "Squeezed between Hatti and Assyria, courts the great kings with gifts and alliances, and keeps faith with whoever protects him.",
            Aggression = 0.30, Caution = 0.80, Honesty = 0.75, Greed = 0.40, Generosity = 0.70, Pride = 0.60,
            Diplomacy = 0.95, Cunning = 0.40, Vengeance = 0.40, Commerce = 0.50,
        },
        [Power.Assyria] = new()
        {
            Epithet = "the upstart who would be brother",
            Description = "Ambitious newcomer, claims the title of Great King, pushes hard into Mitanni and Babylonia, and breaks oaths that hold him back.",
            Aggression = 0.75, Caution = 0.40, Honesty = 0.35, Greed = 0.50, Generosity = 0.40, Pride = 0.85,
            Diplomacy = 0.60, Cunning = 0.65, Vengeance = 0.65, Commerce = 0.40,
        },
        [Power.Arzawa] = new()
        {
            Epithet = "the western opportunist",
            Description = "Survives by being courted, sells his friendship to the highest bidder, and is not above a forged tablet.",
            Aggression = 0.50, Caution = 0.55, Honesty = 0.30, Greed = 0.60, Generosity = 0.35, Pride = 0.50,
            Diplomacy = 0.65, Cunning = 0.80, Vengeance = 0.50, Commerce = 0.55,
        },
        [Power.Alashiya] = new()
        {
            Epithet = "the copper merchant",
            Description = "Trade partner to all and threat to none: buys coastal cities, pays tribute rather than fights, and keeps his word.",
            Aggression = 0.10, Caution = 0.90, Honesty = 0.80, Greed = 0.55, Generosity = 0.55, Pride = 0.40,
            Diplomacy = 0.75, Cunning = 0.35, Vengeance = 0.30, Commerce = 1.00,
        },
    };

    /// <summary>The archetype for a power, varied by a seed: a script seat's own (see <see cref="ScriptLeader.SeatSeed"/>), never the game's.</summary>
    public static Personality For(Power p, ulong seed)
    {
        var a = Archetypes[p];
        var r = Rng.For(seed, 0, "personality", p.ToString());
        double J(double v) => Math.Clamp(v + (r.NextDouble() - 0.5) * 0.3, 0, 1);
        return a with
        {
            Aggression = J(a.Aggression), Caution = J(a.Caution), Honesty = J(a.Honesty), Greed = J(a.Greed),
            Generosity = J(a.Generosity), Pride = J(a.Pride), Diplomacy = J(a.Diplomacy), Cunning = J(a.Cunning),
            Vengeance = J(a.Vengeance), Commerce = J(a.Commerce),
        };
    }

    public static Personality Archetype(Power p) => Archetypes[p];

    /// <summary>The two or three traits that stand out, for display.</summary>
    public IEnumerable<string> Highlights()
    {
        var traits = new (string High, string Low, double V)[]
        {
            ("warlike", "peaceable", Aggression), ("cautious", "reckless", Caution), ("honest", "faithless", Honesty),
            ("greedy", "open-handed", Greed), ("generous", "stingy", Generosity), ("proud", "humble", Pride),
            ("diplomatic", "aloof", Diplomacy), ("cunning", "guileless", Cunning), ("vengeful", "forgiving", Vengeance),
            ("mercantile", "martial", Commerce),
        };
        return traits.OrderByDescending(t => Math.Abs(t.V - 0.5)).Take(3).Select(t => t.V >= 0.5 ? t.High : t.Low);
    }
}
