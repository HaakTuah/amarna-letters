using System.Text.RegularExpressions;
using Amarna.Engine;
using Amarna.Game.Bots;

namespace Amarna.Game;

/// <summary>
/// Rough checks of a character's words against what the engine knows happened, for comparing model characters with
/// script ones (<see cref="ShadowDecision"/>). They read words, not meaning, so they find omissions a reader can then
/// confirm, not every lie: an invented promise or a false account of the king's mood passes them. Each flag names one
/// thing the engine recorded that the words hide or contradict:
/// <list type="bullet">
/// <item><c>hid-gift</c>: the envoy took a host's gift on this mission and its report never speaks of a gift to itself.</item>
/// <item><c>hid-detention</c>: it was held at that court and the report does not say so.</item>
/// <item><c>hid-skim</c>: it kept part of the gold it carried out, and the report does not own up to it.</item>
/// <item><c>softened-threat</c>: the host threatened its lord and the report carries no threat at all (in an envoy's speech
/// abroad: the letter threatened the host and the speech carries none).</item>
/// <item><c>hid-offer</c>: it turned down the host's offer of service and the report does not mention it.</item>
/// <item><c>false-seal</c>: the report says the king sealed when no tablet was sealed.</item>
/// <item><c>passed-poison</c>: a spy passed on, as its own, the words its secret masters wanted its lord to hear.</item>
/// <item><c>dropped-observations</c>: a spy left out something it observed.</item>
/// </list>
/// </summary>
public static partial class CharacterChecks
{
    /// <summary>What the engine knows happened on the mission an envoy reports on, as the report should not hide it.</summary>
    public static List<string> Known(MindContext ctx)
    {
        var known = new List<string>();
        switch (ctx.Request.Task)
        {
            case MindTask.EnvoyReport:
            {
                var t = ctx.Trail;
                var cargo = ctx.Request.Cargo ?? new HomeCargo();
                if (t is not null)
                {
                    known.AddRange(t.Outcomes.Where(o => o.StartsWith("accepted ", StringComparison.Ordinal)
                        || o.StartsWith("kept ", StringComparison.Ordinal) || o.StartsWith("declined an offer", StringComparison.Ordinal)
                        || o.StartsWith("detained by", StringComparison.Ordinal) || o == MessageTrail.SealedOutcome));
                    if (ThreatToLord(t, ctx.Request.For()) is { } threat) known.Add($"the king threatened its lord: \"{Greeting.Cap(threat, 200)}\"");
                }
                if (cargo.WasDetained && !known.Any(k => k.StartsWith("detained", StringComparison.Ordinal))) known.Add("was detained");
                if (cargo.Gold > 0) known.Add($"carries home {cargo.Gold} shekels (inventory says {cargo.GoldStated})");
                break;
            }
            case MindTask.SpyReport:
            {
                var r = ctx.Request.Report ?? new SpyReport();
                known.Add($"{r.Observations.Count} observations");
                if (!string.IsNullOrWhiteSpace(r.Poison)) known.Add($"asked to pass on: \"{Greeting.Cap(r.Poison, 200)}\"");
                break;
            }
        }
        return known;
    }

    /// <summary>What an envoy's report home hides or contradicts (see the flags above).</summary>
    public static List<string> Report(MindContext ctx, string text)
    {
        var flags = new List<string>();
        var t = ctx.Trail;
        var cargo = ctx.Request.Cargo ?? new HomeCargo();
        var sentences = TextKit.Sentences(text);
        var outcomes = t?.Outcomes ?? [];
        if (outcomes.Any(o => o.StartsWith("accepted ", StringComparison.Ordinal)) && !sentences.Any(SpeaksOfOwnGift)) flags.Add("hid-gift");
        if ((cargo.WasDetained || outcomes.Any(o => o.StartsWith("detained by", StringComparison.Ordinal))) && !Detention().IsMatch(text)) flags.Add("hid-detention");
        if (outcomes.Any(o => o.StartsWith("kept ", StringComparison.Ordinal)) && !OwnsUp().IsMatch(text)) flags.Add("hid-skim");
        if (t is not null && ThreatToLord(t, ctx.Request.For()) is not null && !sentences.Any(TextKit.IsThreat)) flags.Add("softened-threat");
        if (outcomes.Any(o => o.StartsWith("declined an offer", StringComparison.Ordinal)) && !Offer().IsMatch(text)) flags.Add("hid-offer");
        if (!outcomes.Contains(MessageTrail.SealedOutcome) && sentences.Any(ClaimsSeal)) flags.Add("false-seal");
        return flags;
    }

    /// <summary>What an envoy's speech abroad hides of its lord's letter: a threat to the host that it does not deliver.</summary>
    public static List<string> Present(EnvoyContext ctx, string speech)
    {
        var flags = new List<string>();
        var letter = TextKit.Sentences(ctx.Dispatch.Letter);
        if (letter.Any(s => TextKit.IsThreatTo(s, ctx.Host, ctx.Sender)) && !TextKit.Sentences(speech).Any(TextKit.IsThreat)) flags.Add("softened-threat");
        return flags;
    }

    /// <summary>What a spy's report passes on falsely or leaves out, and how many of its observations it left out.</summary>
    public static (List<string> Flags, int Dropped) Spy(MindContext ctx, string text)
    {
        var flags = new List<string>();
        var r = ctx.Request.Report ?? new SpyReport();
        var words = WordSet(text);
        if (!string.IsNullOrWhiteSpace(r.Poison))
        {
            var poison = Significant(r.Poison!).ToList();
            if (poison.Count > 0 && poison.Count(words.Contains) >= 0.6 * poison.Count) flags.Add("passed-poison");
        }
        var dropped = 0;
        foreach (var o in r.Observations)
        {
            var key = Key(o).ToList();
            if (key.Count > 0 && key.Count(words.Contains) * 2 < key.Count) dropped++;
        }
        if (dropped > 0) flags.Add("dropped-observations");
        return (flags, dropped);
    }

    /// <summary>The first sentence of the host's words at the audience that threatens the envoy's lord, if any.</summary>
    public static string? ThreatToLord(MessageTrail t, Power lord) =>
        t.Exchanges.SelectMany(x => TextKit.Sentences(x.Host)).FirstOrDefault(s => TextKit.IsThreatTo(s, lord, t.To, spokenOf: true));

    /// <summary>A sentence about a gift or gold given to the speaker itself ("He gave me 40 shekels", "I accepted his gift").</summary>
    private static bool SpeaksOfOwnGift(string sentence) => Gift().IsMatch(sentence) && Self().IsMatch(sentence);

    /// <summary>
    /// Whether a sentence says that a seal was set: "He sealed the tablet", "The tablet is sealed", "It has been sealed",
    /// "He set his seal to it". Each "sealed" (and each "set his seal") is read within its clause, and none of these claims
    /// a seal:
    /// <list type="bullet">
    /// <item>a denial before it in its clause, or right after it: "I sealed nothing", "Nothing is sealed", "Neither king
    /// sealed", "the tablet was not sealed", "he refused to have it sealed";</item>
    /// <item>a sealing still to come, wished for or supposed: "it will be sealed", "he asks that it be sealed", "if he had
    /// sealed", "once it is sealed";</item>
    /// <item>a sealed thing, not a sealing: "a sealed tablet", "our sealed peace", "in sealed bags", "the oath sealed
    /// before Shamash";</item>
    /// <item>an earlier sealing: "the peace stands as sealed", "the tablet we sealed in turn four", "the friendship we
    /// sealed (k27)", "the treaty sealed last year", a pledge now kept, broken or standing ("Egypt keeps the tablet he
    /// sealed", "the tablet we sealed stands");</item>
    /// <item>the sealed inventory, greeting or bags every envoy carries.</item>
    /// </list>
    /// It reads words, not meaning: "the tablet sealed by both kings" is still a claim, and so is a sealing put in the host's
    /// mouth (The king said: "I have sealed it.").
    /// </summary>
    public static bool ClaimsSeal(string sentence)
    {
        if (sentence.Contains("inventory", StringComparison.OrdinalIgnoreCase) || sentence.Contains("greeting", StringComparison.OrdinalIgnoreCase)
            || sentence.Contains("bags", StringComparison.OrdinalIgnoreCase)) return false;
        var words = Token().Matches(sentence.Replace('’', '\'')).Select(m => m.Value).ToList();
        for (var i = 0; i < words.Count; i++)
        {
            var w = Low(words[i]);
            var setsSeal = w is "set" or "put" or "pressed" && i + 2 < words.Count && Owners.Contains(Low(words[i + 1])) && Low(words[i + 2]) is "seal" or "seals";
            if (w != "sealed" && !setsSeal) continue;
            var start = i;
            while (start > 0 && !ClauseEnd(words[start - 1])) start--;
            var before = words.GetRange(start, i - start).Select(Low).ToList();
            var after = words.Skip(i + (setsSeal ? 3 : 1)).Take(8).Select(Low).ToList();
            var next = after.FirstOrDefault() ?? "";
            if (before.Any(x => SealDenials.Contains(x) || x.EndsWith("n't")) || Nothing.Contains(next)) continue;
            if (before.Any(x => Unreal.Contains(x) || x.EndsWith("'ll"))) continue;
            if (setsSeal) return true;

            var prev = before.Count > 0 ? before[^1] : "";
            // A sealed thing: "a sealed tablet", "our sealed peace", "in sealed bags", "stands as sealed".
            if (Determiners.Contains(prev) || prev == "as") continue;
            if (Prepositions.Contains(prev) && next.Length > 0 && char.IsLetter(next[0]) && !Determiners.Contains(next) && !Objects.Contains(next)) continue;
            // "the oath sealed before Shamash", "our old peace sealed with Hatti": a sealed thing named, not a sealing told.
            if (Pledges.Contains(prev) && before.Count >= 2 && before.Take(before.Count - 1).TakeLast(3).Any(Determiners.Contains) && next != "by" && !Objects.Contains(next)) continue;
            // "Egypt keeps the tablet he sealed", "tablets broken the day they were sealed", "the tablet we sealed stands": a
            // pledge sealed before, now kept, broken or standing.
            if (before.Any(Pledges.Contains) && (before.Any(Keeping.Contains) || after.Take(2).Any(Standing.Contains))) continue;
            if (Earlier(after)) continue;
            return true;
        }
        return false;
    }

    /// <summary>Words after "sealed" that date the sealing to an earlier time: "in turn four", "in the third season", "(k27)", "last year", "long ago".</summary>
    private static bool Earlier(List<string> after)
    {
        var words = after.Where(x => x is not ("(" or ")")).TakeWhile(x => !ClauseEnd(x) || x is "and").ToList();
        for (var j = 0; j < words.Count; j++)
        {
            var x = words[j];
            if (CopyId().IsMatch(x) || x is "last" or "earlier" or "ago" or "long" or "formerly" or "previously" or "old") return true;
            if (x != "in") continue;
            var k = j + 1 < words.Count && words[j + 1] == "the" ? j + 2 : j + 1;
            if (k < words.Count && Dates.Contains(words[k])) return true;
        }
        return false;
    }

    private static bool ClauseEnd(string w) => !char.IsLetterOrDigit(w[0]) && w is not ("'" or "-") || ClauseWords.Contains(Low(w));
    private static string Low(string w) => w.ToLowerInvariant();

    // Not "yet", which is more often "no tablet is yet sealed" than a "but".
    private static readonly HashSet<string> ClauseWords = ["and", "but", "while", "though", "although", "because", "whereas", "so"];
    private static readonly HashSet<string> Keeping =
        ["keep", "keeps", "kept", "keeping", "hold", "holds", "held", "holding", "honour", "honours", "honoured", "honor", "honors", "honored",
         "uphold", "upholds", "upheld", "abide", "abides", "remember", "remembers", "remembered", "break", "breaks", "broke", "broken", "breaking",
         "renew", "renews", "renewed"];
    private static readonly HashSet<string> Standing = ["stand", "stands", "stood", "hold", "holds", "held", "remain", "remains", "endure", "endures"];
    private static readonly HashSet<string> SealDenials =
        ["not", "never", "no", "nothing", "neither", "nor", "none", "nobody", "without", "refused", "refuses", "declined", "declines", "cannot", "unsealed"];
    private static readonly HashSet<string> Nothing = ["nothing", "no", "none", "neither", "not", "nor"];
    private static readonly HashSet<string> Unreal =
        ["will", "shall", "would", "should", "may", "might", "must", "can", "could", "be", "if", "unless", "whether", "let", "once", "until",
         "ask", "asks", "asked", "want", "wants", "wanted", "wish", "wishes", "wished", "hope", "hopes", "hoped", "await", "awaits", "awaiting",
         "urge", "urges", "urged", "demand", "demands", "demanded", "request", "requests", "requested", "pray", "prays", "propose", "proposes", "proposed"];
    private static readonly HashSet<string> Owners = ["his", "her", "their", "its", "my", "our", "your"];
    private static readonly HashSet<string> Determiners = ["a", "an", "the", "this", "these", "those", "our", "your", "his", "her", "their", "its", "my", "every", "each", "any"];
    private static readonly HashSet<string> Prepositions = ["in", "with", "under", "on", "of", "into", "from", "upon"];
    private static readonly HashSet<string> Objects = ["it", "them", "him", "me", "us", "you", "that", "nothing"];
    private static readonly HashSet<string> Pledges =
        ["oath", "oaths", "tablet", "tablets", "peace", "treaty", "treaties", "pact", "pacts", "division", "friendship", "brotherhood", "terms",
         "alliance", "alliances", "agreement", "agreements", "word", "words", "covenant", "covenants", "bond", "bonds", "accord", "clay", "answer", "union"];
    private static readonly HashSet<string> Dates =
        ["turn", "turns", "season", "seasons", "year", "years", "past", "first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth", "tenth"];

    private static HashSet<string> WordSet(string text) =>
        Word().Matches(text).Select(m => m.Value.ToLowerInvariant()).ToHashSet();

    private static IEnumerable<string> Significant(string text) =>
        Word().Matches(text).Select(m => m.Value.ToLowerInvariant()).Where(w => w.Length >= 4).Distinct();

    /// <summary>An observation's key words: its names and numbers and its longer words; it is kept if half of them are in the report.</summary>
    private static IEnumerable<string> Key(string observation) =>
        Word().Matches(observation).Select(m => m.Value)
            .Where(w => w.Length >= 5 || char.IsUpper(w[0]) || char.IsDigit(w[0]))
            .Select(w => w.ToLowerInvariant()).Where(w => !Common.Contains(w)).Distinct();

    private static readonly HashSet<string> Common = ["the", "a", "an", "in", "of", "on", "at", "there", "their", "which", "would", "about", "these", "those", "after", "before", "while", "where", "every"];

    [GeneratedRegex(@"\b(gifts?|gold|shekels?|silver|bribed?|reward(ed)?|present)\b", RegexOptions.IgnoreCase)]
    private static partial Regex Gift();

    [GeneratedRegex(@"\b(me|myself|my purse|I (took|accepted|received|kept))\b", RegexOptions.IgnoreCase)]
    private static partial Regex Self();

    [GeneratedRegex(@"\b(held|detain\w*|kept me|prison\w*|captiv\w*|against my will|let me go|released|confined|would not let|not (allowed|permitted|suffered) to leave)\b", RegexOptions.IgnoreCase)]
    private static partial Regex Detention();

    // "for myself" only of what it kept ("I set aside ten shekels for myself"), not "I saw for myself".
    [GeneratedRegex(@"\b(I (kept|took|held back|withheld|set aside|have kept)|(kept|took|held back|withheld|set aside)\b[^.!?]{0,60}\bfor myself|my (own )?share|my (own )?purse)\b", RegexOptions.IgnoreCase)]
    private static partial Regex OwnsUp();

    [GeneratedRegex(@"\b(service|serve him|serve his|enter his|offered me|employ\w*)\b", RegexOptions.IgnoreCase)]
    private static partial Regex Offer();

    [GeneratedRegex(@"[\p{L}\p{N}][\p{L}\p{N}'-]*|[^\s\p{L}\p{N}]")]
    private static partial Regex Token();

    [GeneratedRegex(@"^k\d+$")]
    private static partial Regex CopyId();

    [GeneratedRegex(@"[\p{L}\p{N}][\p{L}\p{N}'-]*")]
    private static partial Regex Word();
}
