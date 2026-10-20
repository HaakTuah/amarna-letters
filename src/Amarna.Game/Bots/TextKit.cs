using System.Text.RegularExpressions;
using Amarna.Engine;

namespace Amarna.Game.Bots;

/// <summary>Small sentence tools the script characters use to soften, embellish or trim messages.</summary>
public static partial class TextKit
{
    /// <summary>
    /// A text's sentences: it splits after a full stop, a question or an exclamation, and after a quote or bracket closing
    /// on one ('He said: "Go." Then he left.' is two). Until save version 5 it did not split after a closing quote.
    /// </summary>
    public static List<string> Sentences(string text) =>
        SentenceSplit().Split(text.Trim()).Select(s => s.Trim()).Where(s => s.Length > 0).ToList();

    /// <summary>Whether a sentence threatens: whole words and their inflections only, so "toward", "warm" and "burnished" are not threats.</summary>
    public static bool IsThreat(string sentence) => Threat().IsMatch(sentence);

    /// <summary>
    /// Whether a sentence threatens a given king, the target: a threat word that is not denied ("will not march", "no war
    /// between us", "I march on no land of yours") and is aimed at him. It is aimed at him when he is what it falls on ("I
    /// will burn your cities", "march on Babylon"), when he is to suffer it ("you will be crushed", "Babylonia will regret
    /// its insolence", "you are my enemy", "this is my last warning"), or when it follows from what he does ("If you do
    /// not withdraw, there will be war"; "Pay, or I will march"). These are not aimed at him: a blow against a third king
    /// ("Hatti is our common enemy; let us march against him"), what another king may do ("Hatti will attack you"), help
    /// ("If Hatti attacks you, my armies will march to your side"; "I will support you if you are attacked"), his own
    /// march ("your march on Ashur") and a warning given as a brother ("I warn you of Assyria's musters").
    /// <para>The target is "you" or "your", or any name of his, his land or his people (see <see cref="Names"/>). With
    /// <paramref name="spokenOf"/> (a host speaking to an envoy of its lord) he is also "he", "him" and "his", unless the
    /// sentence names another king. Names of the <paramref name="speaker"/> are his own, not a third king's.</para>
    /// </summary>
    public static bool IsThreatTo(string sentence, Power target, Power? speaker = null, bool spokenOf = false)
    {
        if (!IsThreat(sentence)) return false;
        var words = Token().Matches(sentence.Replace('’', '\'')).Select(m => m.Value).ToList();
        var others = Powers.All.Where(p => p != target && p != speaker).ToList();
        var pronouns = spokenOf && !others.Any(p => Names.Mentions(sentence, p));
        var theirs = others.SelectMany(p => NameWords[p]).ToHashSet();

        bool Ref(string w) => YouWords.Contains(Bare(w)) || NameWords[target].Contains(Bare(w)) || pronouns && HeWords.Contains(Bare(w));
        // Another king, by name or (outside a report of the lord) as "he": the one who acts, not the target.
        bool Agent(string w) => theirs.Contains(Bare(w)) || !pronouns && Low(w) is "he" or "she";
        bool Third(string w) => theirs.Contains(Bare(w)) || ThirdWords.Contains(Low(w)) || !pronouns && HeWords.Contains(Low(w))
                                || char.IsUpper(w[0]) && w != "I" && !w.StartsWith("I'") && !Filler.Contains(Low(w));

        // A condition ("if you cross the river", "whoever attacks you") says what may happen, not what the speaker will
        // do: its words are left out, but a threat that follows from what the target does is aimed at him.
        var excluded = new bool[words.Count];
        var targetActs = false;
        for (var i = 0; i < words.Count; i++)
        {
            if (!Conditions.Contains(Low(words[i]))) continue;
            var end = i + 1;
            while (end < words.Count && !IsPunct(words[end]) && Low(words[end]) != "then") end++;
            for (var k = i; k < end; k++) excluded[k] = true;
            var span = words.GetRange(i + 1, end - i - 1);
            var first = span.SkipWhile(x => Low(x) is "ever" or "once" or "the").FirstOrDefault();
            var suffers = span.Select((x, k) => (x, k)).Any(t => BeWords.Contains(Low(t.x)) && span.Skip(t.k + 1).Take(2).Any(Participle));
            if (first is not null && Ref(first) && !suffers) targetActs = true;
            i = end - 1;
        }

        bool Boundary(int k) => excluded[k] || IsPunct(words[k]) || Conjunctions.Contains(Low(words[k]));
        for (var i = 0; i < words.Count; i++)
        {
            if (excluded[i] || IsPunct(words[i])) continue;
            var w = Low(words[i]);
            var start = i;
            while (start > 0 && !Boundary(start - 1)) start--;
            var stop = i + 1;
            while (stop < words.Count && !Boundary(stop)) stop++;
            var before = words.GetRange(start, i - start);
            var after = words.GetRange(i + 1, stop - i - 1);

            // "Pay, or else": an ultimatum to the one addressed.
            if (w == "or" && i + 1 < words.Count && Low(words[i + 1]) == "else") return true;
            if (!Threat().IsMatch(words[i])) continue;
            if (Denied(before, after)) continue;
            var alternative = start > 0 && Low(words[start - 1]) == "or" && before.Count > 0 && Low(before[0]) is "else" or "there" or "i" or "i'll" or "we" or "we'll" or "my" or "our";
            var last = before.Count > 0 ? Low(before[^1]) : "";

            if (w.StartsWith("regret"))
            {
                if (before.Any(Ref)) return true;
                continue;
            }
            if (w.StartsWith("consequence"))
            {
                if (before.Concat(after).Any(Ref) || targetActs || alternative || before.Count > 0 && Low(before[0]) == "beware") return true;
                continue;
            }
            if (w.StartsWith("warn"))
            {
                // "You have been warned", "Be warned", "consider yourself warned": the one warned is the target. Not "strike
                // at once, before they can be warned", which speaks of a third king.
                if (w == "warning" && last is "last" or "final" or "only") return true;
                if (w == "warned" && (BeWords.Contains(last) && (before.Any(Ref) || before.Count == 1) || last is "yourself" or "yourselves")) return true;
                continue;
            }
            if (w.StartsWith("enem"))
            {
                if (before.Any(Agent)) continue;
                var being = before.Any(x => BeWords.Contains(Low(x)) || Becoming.Contains(Low(x)));
                if (being && (last is "my" or "our" or "an" or "a" or "the" ? before.Any(Ref) : YouWords.Contains(last))) return true;
                continue;
            }
            if (w.StartsWith("warrior") || w is "warlike" or "warfare") continue;

            // A deed: attack, destroy, march, punish, crush, burn, invade, war, betray. Done to the target ("you will be
            // crushed")?
            if (Participle(words[i]) && (BeWords.Contains(last) || before.Count > 1 && BeWords.Contains(Low(before[^2]))))
            {
                if (before.Any(Ref)) return true;
                continue;
            }
            if (before.Any(Agent) || before.Any(x => Low(x) is "together" or "alongside" or "beside" or "jointly")) continue;
            switch (Aim(after, w is "war" or "wars", Ref, Third))
            {
                case true: return true;
                case false: continue;
            }
            // No one it falls on: the target's own deed ("you will march"), unless his cities are to burn; or what
            // follows from what he does.
            if (before.Any(Ref))
            {
                if (w.StartsWith("burn")) return true;
                continue;
            }
            if (targetActs || alternative) return true;
        }
        return false;
    }

    /// <summary>Whom a deed falls on, read from the words after it: the target (true), someone else or no one (false), or not said (null).</summary>
    private static bool? Aim(List<string> after, bool war, Func<string, bool> target, Func<string, bool> third)
    {
        var window = after.Take(6).ToList();
        for (var j = 0; j < window.Count; j++)
        {
            var x = Low(window[j]);
            if (j <= 1 && Nobody.Contains(x)) return false;
            // "march with you", "march beside him", "make war for Mari": side by side, not against.
            if (!war && Together.Contains(x)) return false;
            if (x == "between") return null;
            if (x == "to" && window.Skip(j + 1).SkipWhile(y => Determiners.Contains(Low(y))).FirstOrDefault() is { } help && Help.Contains(Low(help))) return false;
            if (target(window[j]))
                return !(YouWords.Contains(Bare(window[j])) && j + 1 < after.Count && (Help.Contains(Low(after[j + 1])) || Shield.Contains(Low(after[j + 1]))));
            if (third(window[j])) return false;
        }
        return null;
    }

    /// <summary>A threat word denied before it ("will not march", "no army of mine will march", "won't attack") or after it ("march on no land").</summary>
    private static bool Denied(List<string> before, List<string> after)
    {
        if (before.TakeLast(5).Any(x => Negations.Contains(Low(x)) || Low(x).EndsWith("n't"))) return true;
        var j = after.Count > 0 && Particles.Contains(Low(after[0])) ? 1 : 0;
        return j < after.Count && Nobody.Contains(Low(after[j]));
    }

    private static bool Participle(string w) => Threat().IsMatch(w) && (Low(w).EndsWith("ed") || Low(w) == "burnt");
    private static bool IsPunct(string w) => !char.IsLetterOrDigit(w[0]);
    private static string Low(string w) => w.ToLowerInvariant();

    /// <summary>A word without its possessive ending: "Hatti's" is Hatti, "Hittites'" is Hittites.</summary>
    private static string Bare(string w)
    {
        var x = Low(w);
        return x.EndsWith("'s") ? x[..^2] : x.TrimEnd('\'');
    }

    private static readonly Dictionary<Power, HashSet<string>> NameWords =
        Powers.All.ToDictionary(p => p, p => Names.Of(p).Where(n => !n.Contains(' ')).Select(n => n.ToLowerInvariant()).ToHashSet());

    private static readonly HashSet<string> YouWords = ["you", "your", "yours", "yourself", "yourselves", "thee", "thou", "thy", "thine"];
    private static readonly HashSet<string> HeWords = ["he", "him", "his", "himself"];
    private static readonly HashSet<string> ThirdWords =
        ["her", "hers", "she", "them", "they", "their", "theirs", "themselves", "it", "its", "me", "my", "mine", "myself", "us", "our", "ours", "ourselves", "other", "others", "another"];
    private static readonly HashSet<string> Conditions = ["if", "unless", "whoever", "whosoever", "whichever"];
    private static readonly HashSet<string> Conjunctions = ["and", "but", "or", "nor", "while", "whereas", "so", "then", "until", "because", "lest", "though", "although"];
    private static readonly HashSet<string> Negations =
        ["not", "never", "no", "nor", "neither", "cannot", "without", "avoid", "prevent", "end", "stop", "cease", "refrain", "forswear", "renounce", "forbid", "forbids", "forbidden"];
    private static readonly HashSet<string> Nobody = ["no", "none", "nobody", "nothing", "neither", "nowhere", "without"];
    private static readonly HashSet<string> Particles = ["against", "on", "upon", "into", "in", "over", "through", "across", "at", "to", "toward", "towards", "of", "with"];
    private static readonly HashSet<string> BeWords = ["be", "been", "being", "is", "are", "was", "were", "am", "get", "gets", "got"];
    private static readonly HashSet<string> Becoming = ["become", "becomes", "became", "remain", "remains", "make", "makes", "made"];
    private static readonly HashSet<string> Together = ["with", "beside", "alongside", "together", "for", "jointly"];
    private static readonly HashSet<string> Determiners = ["the", "a", "an", "your", "his", "my", "our", "thy", "their"];
    private static readonly HashSet<string> Help = ["aid", "side", "help", "defence", "defense", "support", "rescue", "assistance"];
    // "your enemies", "your call", "your leave": what is the target's, not the target.
    private static readonly HashSet<string> Shield =
        ["enemy", "enemies", "foe", "foes", "rival", "rivals", "call", "cause", "banner", "leave", "behalf", "command", "request", "word", "wish", "wishes", "march"];
    // Capitalised words that are no third party: "the King of Alashiya", "the Great King".
    private static readonly HashSet<string> Filler =
        ["king", "kings", "great", "lord", "land", "lands", "people", "house", "city", "cities", "army", "armies", "troops", "men", "chariots",
         "fleet", "fleets", "ships", "capital", "border", "borders", "fields", "walls", "gates", "court", "realm", "kingdom", "homeland", "province", "provinces"];

    /// <summary>
    /// A message for the envoy's lord ("Tell your lord that my armies are few"), anywhere in the request ("Carry my words
    /// faithfully, and tell your lord that …"), in the host's own words: "My armies are few". The lord is "your lord",
    /// "your master", "your king", "him", "the king" or any of his names (Pharaoh, Burna-Buriash, the king of Hatti).
    /// Null when the request holds no message of that kind, or only one it forbids ("do not tell your lord …").
    /// </summary>
    public static string? Claim(string request, Power lord)
    {
        foreach (Match m in Messages[lord].Matches(request.Replace('’', '\'')))
        {
            var claim = m.Groups["claim"].Value.Trim().TrimEnd('.', '!', '?', ' ', '"', '\'');
            // Without "that", the words must say something: not "tell your lord everything" or "tell him of my love".
            if (!m.Groups["that"].Success && (claim.Split(' ', StringSplitOptions.RemoveEmptyEntries).Length < 3 || NoClaim().IsMatch(claim))) continue;
            if (claim.Length > 0) return char.ToUpperInvariant(claim[0]) + claim[1..];
        }
        return null;
    }

    /// <summary>
    /// The king a request asks the envoy to speak well of to its lord ("speak well of Mitanni to your lord", "speak of
    /// Egypt to your lord as a friend", "speak of Mitanni's friendship before your lord"); null if none.
    /// </summary>
    public static Power? Praised(string request, Power lord)
    {
        foreach (Match m in Praise[lord].Matches(request.Replace('’', '\'')))
            foreach (var p in Powers.All)
                if (p != lord && Names.Mentions(m.Groups["whom"].Value, p)) return p;
        return null;
    }

    /// <summary>
    /// Whether a text accuses someone: of lies, deceit or falsehood, of breaking an oath, a tablet, a seal, his word or the
    /// peace, of betrayal, of faithlessness. Whole words only. "Lie" counts as an untruth ("a lie", "you lied", "you are
    /// lying", "your words are lies", "lying to me"), not where the prizes lie to the east, a road lies in the hills or the
    /// dead lie in peace. "False" counts when said of a person, a word, gold or a tablet ("the gold is false", "false
    /// words"), not of a rumour. "Broke" and "broken" count only beside an oath, a tablet, a seal, a word, faith, a promise
    /// or the peace, not for an army broken in battle. A denial ("I have never lied", "let no false word come between
    /// us") accuses nobody, and neither do "betray" as a bare verb ("I would never betray my brother", "I do not ask a man
    /// to betray his master") or a courtesy about "your messenger".
    /// </summary>
    public static bool IsAccusation(string text) => Accusation().IsMatch(text);

    /// <summary>
    /// Whether a sentence speaks of the weighing of gold: the weighers, weight or scales, the inventory, a lot that came or
    /// fell short, a shortfall, a messenger's hands heavy with the gold ("The inventory lists 40 shekels, but my weighers
    /// found only 37"; "Either your lord is mean or your messenger's hands are heavy with my gold").
    /// </summary>
    public static bool SpeaksOfWeighing(string sentence) => Weighing().IsMatch(sentence.Replace('’', '\''));

    /// <summary>Whether a text speaks of land, gold or tribute (whole words: "lands" and "tributes" too, not "landed" or "golden").</summary>
    public static bool SpeaksOfLandOrGold(string text) => LandOrGold().IsMatch(text);

    /// <summary>
    /// Whether a sentence hands something over: cedes, yields, surrenders, gives up or hands over, gives or leaves it to
    /// someone, says it belongs, passes or falls to someone, is someone's share, or shall be someone's ("Babylon shall be
    /// Egypt's").
    /// </summary>
    public static bool HandsOver(string sentence) => HandOver().IsMatch(sentence.Replace('’', '\''));

    public static string Join(IEnumerable<string> sentences) => string.Join(" ", sentences.Where(s => s.Length > 0));

    [GeneratedRegex(@"(?<=[.!?][""'”’)\]]*)\s+")]
    private static partial Regex SentenceSplit();

    [GeneratedRegex(@"[\p{L}\p{N}][\p{L}\p{N}'-]*|[^\s\p{L}\p{N}]")]
    private static partial Regex Token();

    [GeneratedRegex(@"\b(?:wars?|warfare|warriors?|warlike|attack(?:s|ed|ing|ers?)?|destroy(?:s|ed|ing|ers?)?|march(?:es|ed|ing)?|punish(?:es|ed|ing|ment)?|warn(?:s|ed|ing|ings)?|crush(?:es|ed|ing)?|burn(?:s|ed|ing|t)?|invad(?:e|es|ed|ing|ers?)|invasion|enem(?:y|ies)|regret(?:s|ted|table)?|or else|consequences?|betray(?:s|ed|ing|al|ers?)?)\b", RegexOptions.IgnoreCase)]
    private static partial Regex Threat();

    // The words an oath is made of, for "broke" and "broken".
    private const string Pledge = @"oaths?|tablets?|seals?|words?|faith|promises?|peace|treat(?:y|ies)|pacts?|vows?|covenants?|agreements?|bonds?|brotherhood|alliances?";

    [GeneratedRegex(@"(?<!(?:\bnever|\bnot|\bno|\bnor|n't|\bwithout)\s+(?:(?:once|ever|yet|knowingly|willingly|have|has|had|be|been|was|were|is|am|are|did|do|does|will|would|shall|should|could|a|an|the)\s+){0,2})\b(?:"
                    + @"liars?|lied"
                    + @"|(?:lie|lies|lying)\s+to\s+(?:me|us|him|her|them|you|thee|my|your|his|their|our|kings?|courts?|every|each|all|any|the\s+(?:kings?|courts?|gods|great))\b"
                    + @"|(?:are|is|am|was|were|be|been)\s+lying\b(?!\s+(?:down|in|on|at|with|beside|between|near|under|within|beyond|still|asleep|idle|quiet|low|open|ahead|before|across|along|outside|inside|about|around|there|here|waste|fallow|empty)\b)"
                    + @"|(?:are|is|were|was)\s+(?:all\s+|only\s+|mere\s+|nothing\s+but\s+)?lies\b"
                    + @"|you\s+lie\b(?!\s+(?:down|in|on|at|with|beside|between|near|under|within|beyond|still|asleep|idle|quiet|low|open|ahead|waste|fallow|empty)\b)"
                    + @"|you\s+lie\s+in\s+(?:every|each|all|your)\s+(?:letters?|words?|tablets?|messages?)\b"
                    + @"|(?:he|she|they)\s+lies?(?=\s*(?:[.!?,;]|$))"
                    + @"|(?:a|the|your|his|her|their|these|those|such|of|with|told|tells?|telling|spread(?:s|ing)?|speak(?:s|ing)?|nothing\s+but)\s+lies?\b"
                    + @"|decei\w*|decept\w*|falsely|falsehoods?"
                    + @"|(?:is|are|was|were|be|been|proved?|proven)\s+(?:surely\s+|plainly\s+|clearly\s+|all\s+|wholly\s+|utterly\s+)?false\b"
                    + @"|false\s+(?:friends?|brothers?|words?|tablets?|gold|oaths?|promises?|seals?|witness(?:es)?|kings?|ally|allies|tongues?|hearts?|messengers?|envoys?|scribes?|letters?|reports?|claims?|weights?|tales?|accounts?|servants?|vows?)\b"
                    + @"|(?<!\b(?:see|know|judge|learn|show|tell|decide)s?\s+who\s+)(?:(?<=\b(?:" + Pledge + @")\b[^;:.!?]*)(?:broke|broken)|(?:broke|broken)(?=[^;:.!?]*\b(?:" + Pledge + @")\b))\b"
                    + @"|oath-?breakers?|betray(?:ed|s|als?|ers?|ing)|faithless\w*"
                    + @")", RegexOptions.IgnoreCase)]
    private static partial Regex Accusation();

    [GeneratedRegex(@"\b(?:lands?|gold|tributes?)\b", RegexOptions.IgnoreCase)]
    private static partial Regex LandOrGold();

    [GeneratedRegex(@"\b(?:weigh(?:s|ed|ing|ers?|ts?)?|scales|inventor(?:y|ies)|shortfall|(?:fell|falls|came|comes|is|was)\s+short|hands\s+(?:are|were)\s+heavy|heavy\s+with\s+(?:my|the|our)\s+gold)\b", RegexOptions.IgnoreCase)]
    private static partial Regex Weighing();

    [GeneratedRegex(@"\b(?:ced(?:e|es|ed|ing)|cession|yield(?:s|ed|ing)?|surrender(?:s|ed|ing)?|relinquish\w*|(?:give|gives|gave|given|giving|hand|hands|handed|handing)\s+(?:\S+\s+)?(?:up|over)\b|(?:give|gives|gave|given|leave|leaves|left)\s+\S+\s+to\b|belong(?:s|ed|ing)?|(?:pass(?:es|ed)?|fall(?:s|en)?|fell)\s+(?:in)?to\b|share\s+of|(?:shall|will|is|are|be|becomes?|remains?)\s+(?:now\s+|henceforth\s+|forever\s+)?(?:\w+'s|yours|his|hers|theirs|ours)\b(?!\s+(?:brothers?|friends?|ally|allies|father|sons?|kin)\b))", RegexOptions.IgnoreCase)]
    private static partial Regex HandOver();

    // "everything", "of my love", "what I said": no claim of its own.
    [GeneratedRegex(@"^(?:of|about|everything|nothing|all|what|how|this|these|that|my\s+words|exactly|truly|faithfully|plainly|word\s+for\s+word)\b", RegexOptions.IgnoreCase)]
    private static partial Regex NoClaim();

    /// <summary>How a request names the envoy's lord: "your lord", "him", "the king", or by one of his names.</summary>
    private static string LordPattern(Power lord) =>
        $@"(?:your\s+(?:lord|master|king)|(?:the\s+)?(?:great\s+)?king\s+of\s+(?:{Names.Pattern(lord)})|(?:{Names.Pattern(lord)})|him|the\s+king)(?![\w-])";

    private const RegexOptions Loose = RegexOptions.IgnoreCase | RegexOptions.CultureInvariant;

    // "Tell your lord that …", "assure him …", "say to Pharaoh that …", "report that …", "let your master know that …".
    private static readonly Dictionary<Power, Regex> Messages = Powers.All.ToDictionary(p => p, p => new Regex(
        $@"(?<!\b(?:not|never|nothing)\s+(?:\w+\s+)?)\b(?:(?:tell|assure|inform|remind)\s+{LordPattern(p)}(?:\s+(?<that>that))?|(?:say|report|write|swear|repeat)\s+(?:to\s+{LordPattern(p)}\s+)?(?<that>that)|let\s+{LordPattern(p)}\s+(?:know|hear|believe|understand)\s+(?<that>that))(?![\w-])[\s,:]+(?<claim>[^.!?]+)", Loose));

    // "Speak well of Mitanni to your lord", "speak of Egypt before your lord as a friend", "speak to your lord of Mitanni".
    private static readonly Dictionary<Power, Regex> Praise = Powers.All.ToDictionary(p => p, p => new Regex(
        $@"\bspeak\s+(?:well\s+|kindly\s+|warmly\s+)?(?:of\s+(?<whom>[^.!?,;]+?)\s+(?:to|before)\s+{LordPattern(p)}|(?:to|before)\s+{LordPattern(p)}\s+(?:well\s+)?of\s+(?<whom>[^.!?,;]+))", Loose));
}
