using System.Text.RegularExpressions;

namespace Amarna.Game.Bots;

/// <summary>Small sentence tools the script characters use to soften, embellish or trim messages.</summary>
public static partial class TextKit
{
    public static List<string> Sentences(string text) =>
        SentenceSplit().Split(text.Trim()).Select(s => s.Trim()).Where(s => s.Length > 0).ToList();

    /// <summary>Whether a sentence threatens: whole words and their inflections only, so "toward", "warm" and "burnished" are not threats.</summary>
    public static bool IsThreat(string sentence) => Threat().IsMatch(sentence);

    /// <summary>
    /// Whether a text accuses someone: of lies, deceit or falsehood, of breaking or betraying an oath, of faithlessness. Whole
    /// words only. "Lie" counts as an untruth ("a lie", "you lied", "lying to me"), not where a road lies or the dead lie in
    /// peace; a denial ("I would never betray my brother") accuses nobody, and neither does a courtesy about "your messenger".
    /// </summary>
    public static bool IsAccusation(string text) => Accusation().IsMatch(text);

    /// <summary>Whether a text speaks of land, gold or tribute (whole words: "lands" and "tributes" too, not "landed" or "golden").</summary>
    public static bool SpeaksOfLandOrGold(string text) => LandOrGold().IsMatch(text);

    public static string Join(IEnumerable<string> sentences) => string.Join(" ", sentences.Where(s => s.Length > 0));

    [GeneratedRegex(@"(?<=[.!?])\s+")]
    private static partial Regex SentenceSplit();

    [GeneratedRegex(@"\b(?:wars?|warfare|warriors?|warlike|attack(?:s|ed|ing|ers?)?|destroy(?:s|ed|ing|ers?)?|march(?:es|ed|ing)?|punish(?:es|ed|ing|ment)?|warn(?:s|ed|ing|ings)?|crush(?:es|ed|ing)?|burn(?:s|ed|ing|t)?|invad(?:e|es|ed|ing|ers?)|invasion|enem(?:y|ies)|regret(?:s|ted|table)?|or else|consequences?|betray(?:s|ed|ing|al|ers?)?)\b", RegexOptions.IgnoreCase)]
    private static partial Regex Threat();

    [GeneratedRegex(@"(?<!\b(?:never|not)\s+(?:\w+\s+){0,2})\b(?:liars?|lied|(?:lie|lies|lying)\s+to|you\s+lie\b(?!\s+(?:down|in|on|at|with|beside|between|near|under|within|beyond|still|asleep|idle|quiet))|(?:a|the|your|his|their|these|those|such|of|with|all|but|told|tells?|telling|spread(?:s|ing)?|speak(?:s|ing)?)\s+lies?|decei\w*|false(?:ly|hoods?)?|broke|broken|betray\w*|faithless\w*)\b", RegexOptions.IgnoreCase)]
    private static partial Regex Accusation();

    [GeneratedRegex(@"\b(?:lands?|gold|tributes?)\b", RegexOptions.IgnoreCase)]
    private static partial Regex LandOrGold();
}
