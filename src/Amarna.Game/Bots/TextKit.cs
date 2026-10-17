using System.Text.RegularExpressions;

namespace Amarna.Game.Bots;

/// <summary>Small sentence tools the script characters use to soften, embellish or trim messages.</summary>
public static partial class TextKit
{
    private static readonly string[] Accusations =
        ["liar", "lie ", "lied", "lying", "deceive", "deceit", "false", "broke", "broken", "betray", "faithless", "your messenger", "your envoy"];

    public static List<string> Sentences(string text) =>
        SentenceSplit().Split(text.Trim()).Select(s => s.Trim()).Where(s => s.Length > 0).ToList();

    /// <summary>Whether a sentence threatens: whole words and their inflections only, so "toward", "warm" and "burnished" are not threats.</summary>
    public static bool IsThreat(string sentence) => Threat().IsMatch(sentence);

    public static bool IsAccusation(string text) => Accusations.Any(t => text.Contains(t, StringComparison.OrdinalIgnoreCase));

    public static string Join(IEnumerable<string> sentences) => string.Join(" ", sentences.Where(s => s.Length > 0));

    [GeneratedRegex(@"(?<=[.!?])\s+")]
    private static partial Regex SentenceSplit();

    [GeneratedRegex(@"\b(?:wars?|warfare|warriors?|warlike|attack(?:s|ed|ing|ers?)?|destroy(?:s|ed|ing|ers?)?|march(?:es|ed|ing)?|punish(?:es|ed|ing|ment)?|warn(?:s|ed|ing|ings)?|crush(?:es|ed|ing)?|burn(?:s|ed|ing|t)?|invad(?:e|es|ed|ing|ers?)|invasion|enem(?:y|ies)|regret(?:s|ted|table)?|or else|consequences?|betray(?:s|ed|ing|al|ers?)?)\b", RegexOptions.IgnoreCase)]
    private static partial Regex Threat();
}
