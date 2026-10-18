using System.Text.RegularExpressions;
using Amarna.Engine;

namespace Amarna.Game.Bots;

/// <summary>
/// Every name a letter may give a king or his land, for the script kings and envoys reading free text: the name the
/// game uses (Babylonia), the land's own name in the letters (Karduniash), the reigning king (Burna-Buriash), his
/// people (the Babylonians) and, for Babylonia, its city; Egypt's king is also Pharaoh, and Alashiya's people are
/// Cypriots. One table for every reader, matched as whole words, ignoring case.
/// </summary>
internal static class Names
{
    private static readonly Dictionary<Power, string[]> Table = Powers.All.ToDictionary(p => p, p => new[]
        {
            p.ToString(), p.Land(), p.King().StartsWith("the ") ? p.King()[4..] : p.King(), p.Adjective(), p.Adjective() + "s",
        }.Concat(p switch
        {
            Power.Egypt => ["Pharaoh"],
            Power.Babylonia => ["Babylon"],
            Power.Alashiya => ["Cypriot", "Cypriots"],
            _ => [],
        }).Distinct(StringComparer.OrdinalIgnoreCase).ToArray());

    private static string Alternatives(Power p) => string.Join("|", Table[p].OrderByDescending(n => n.Length).Select(Phrase));

    /// <summary>A name as a pattern: any run of spaces between its words, and no letter, digit or hyphen on either side.</summary>
    private static string Phrase(string name) => string.Join(@"\s+", name.Split(' ', StringSplitOptions.RemoveEmptyEntries).Select(Regex.Escape));

    private const RegexOptions Options = RegexOptions.IgnoreCase | RegexOptions.CultureInvariant;

    private static readonly Dictionary<Power, Regex> Named =
        Powers.All.ToDictionary(p => p, p => new Regex($@"(?<![\w-])(?:{Alternatives(p)})(?![\w-])", Options));

    // "against Hatti", "Against the Hittites", "against the king of Hatti", "against Babylon".
    private static readonly Dictionary<Power, Regex> Against =
        Powers.All.ToDictionary(p => p, p => new Regex($@"\bagainst\s+(?:the\s+)?(?:(?:king|land|house|people|armies|troops)\s+of\s+(?:the\s+)?)?(?:{Alternatives(p)})(?![\w-])", Options));

    /// <summary>The names a king and his land go by.</summary>
    public static IReadOnlyList<string> Of(Power p) => Table[p];

    /// <summary>His names as alternatives for a pattern (longest first, any run of spaces between words), with no edges of its own.</summary>
    public static string Pattern(Power p) => Alternatives(p);

    /// <summary>Whether a text names this king, his land or his people.</summary>
    public static bool Mentions(string text, Power p) => Named[p].IsMatch(text);

    /// <summary>Whether a text stands "against" this king, by any of his names.</summary>
    public static bool SwornAgainst(string text, Power p) => Against[p].IsMatch(text);

    /// <summary>The first king, in the fixed order of the powers and leaving out those given, whom a text stands against.</summary>
    public static Power? SwornAgainst(string text, IEnumerable<Power> except)
    {
        var skip = except.ToHashSet();
        return Powers.All.Where(x => !skip.Contains(x) && SwornAgainst(text, x)).Cast<Power?>().FirstOrDefault();
    }

    /// <summary>Whether a text names a place (a province's name), as whole words, ignoring case.</summary>
    public static bool MentionsPlace(string text, string name) =>
        Regex.IsMatch(text, $@"(?<![\w-]){Phrase(name)}(?![\w-])", Options);
}
