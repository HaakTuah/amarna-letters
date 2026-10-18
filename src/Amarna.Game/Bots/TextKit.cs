using System.Text.RegularExpressions;
using Amarna.Engine;

namespace Amarna.Game.Bots;

/// <summary>Small sentence tools the script characters use to soften, embellish or trim messages.</summary>
public static partial class TextKit
{
    public static List<string> Sentences(string text) =>
        SentenceSplit().Split(text.Trim()).Select(s => s.Trim()).Where(s => s.Length > 0).ToList();

    /// <summary>Whether a sentence threatens: whole words and their inflections only, so "toward", "warm" and "burnished" are not threats.</summary>
    public static bool IsThreat(string sentence) => Threat().IsMatch(sentence);

    /// <summary>
    /// Whether a sentence threatens a given king: a threat word together with his name, his land or his people (see
    /// <see cref="Names"/>), or with "you" or "your", the one spoken to. "Hatti is our common enemy; let us march together"
    /// threatens Hatti, not the king who hears it.
    /// </summary>
    public static bool IsThreatTo(string sentence, Power target) =>
        IsThreat(sentence) && (Addressed().IsMatch(sentence) || Names.Mentions(sentence, target));

    /// <summary>
    /// A message for the envoy's lord ("Tell your lord that my armies are few"), turned into what the envoy claims to
    /// have seen: "his armies are few", the speaker's I, my and we made his and theirs. Null when the request is not a
    /// message of that kind.
    /// </summary>
    public static string? Claim(string request)
    {
        var m = Message().Match(request.Trim());
        if (!m.Success) return null;
        var claim = m.Groups["claim"].Value.Trim().TrimEnd('.', '!', ' ', '"', '\'');
        if (claim.Length == 0) return null;
        // The claim follows "that" in the envoy's sentence, so every replacement is in lower case.
        return FirstPerson().Replace(claim, x => string.Join(' ', x.Value.ToLowerInvariant().Replace('’', '\'').Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries)) switch
        {
            "i am" or "i'm" => "he is", "i have" or "i've" => "he has", "i was" => "he was", "i will" or "i'll" => "he will",
            "i" => "he", "me" => "him", "my" or "mine" => "his", "myself" => "himself",
            "we are" or "we're" => "they are", "we have" or "we've" => "they have", "we" => "they", "us" => "them",
            "our" => "their", "ours" => "theirs", "ourselves" => "themselves",
            _ => x.Value,
        });
    }

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

    [GeneratedRegex(@"\b(?:you|your|yours|yourself|yourselves|thee|thou|thy|thine)\b", RegexOptions.IgnoreCase)]
    private static partial Regex Addressed();

    // "Tell your lord that …", "Assure him …", "Say that …", "Report to your master that …", "Let your lord know that …".
    [GeneratedRegex(@"^(?:please\s+)?(?:(?:tell|assure|inform|remind)\s+(?:your\s+(?:lord|master|king)|him|the\s+king)(?:\s+that)?|(?:say|report|write|swear)\s+(?:to\s+(?:your\s+(?:lord|master|king)|him)\s+)?that|let\s+(?:your\s+(?:lord|master|king)|him)\s+(?:know|hear|believe)\s+that)[\s,:]+(?<claim>.+)$", RegexOptions.IgnoreCase | RegexOptions.Singleline)]
    private static partial Regex Message();

    [GeneratedRegex(@"\b(?:i\s+am|i['’]m|i\s+have|i['’]ve|i\s+was|i\s+will|i['’]ll|we\s+are|we['’]re|we\s+have|we['’]ve|myself|ourselves|mine|ours|our|my|me|us|we|i)\b", RegexOptions.IgnoreCase)]
    private static partial Regex FirstPerson();
}
