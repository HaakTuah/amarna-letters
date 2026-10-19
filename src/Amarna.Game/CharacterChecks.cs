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
                        || o.StartsWith("detained by", StringComparison.Ordinal) || o.Contains("sealed by both", StringComparison.Ordinal)));
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
        if (!outcomes.Any(o => o.Contains("sealed by both", StringComparison.Ordinal)) && sentences.Any(ClaimsSeal)) flags.Add("false-seal");
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

    private static bool ClaimsSeal(string sentence) =>
        Sealed().IsMatch(sentence) && !Denied().IsMatch(sentence) && !sentence.Contains("inventory", StringComparison.OrdinalIgnoreCase)
        && !sentence.Contains("greeting", StringComparison.OrdinalIgnoreCase) && !sentence.Contains("bags", StringComparison.OrdinalIgnoreCase);

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

    [GeneratedRegex(@"\b(I (kept|took|held back|withheld|set aside|have kept)|for myself|my (own )?share|my (own )?purse)\b", RegexOptions.IgnoreCase)]
    private static partial Regex OwnsUp();

    [GeneratedRegex(@"\b(service|serve him|serve his|enter his|offered me|employ\w*)\b", RegexOptions.IgnoreCase)]
    private static partial Regex Offer();

    [GeneratedRegex(@"\b(sealed|set (his|their) seals?|put (his|their) seals?|pressed (his|their) seals?)\b", RegexOptions.IgnoreCase)]
    private static partial Regex Sealed();

    [GeneratedRegex(@"\b(not|never|refused|declined|without|unsealed|nor|no)\b", RegexOptions.IgnoreCase)]
    private static partial Regex Denied();

    [GeneratedRegex(@"[\p{L}\p{N}][\p{L}\p{N}'-]*")]
    private static partial Regex Word();
}
