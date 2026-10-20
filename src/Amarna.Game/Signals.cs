using System.Text.RegularExpressions;
using Amarna.Engine;
using Amarna.Game.Bots;

namespace Amarna.Game;

public sealed record Signal(int Turn, string Kind, string Text);

/// <summary>
/// Heuristic markers for the success criteria, read from the record after the fact: sealed
/// tablets, accusations, forgeries and authentications, broken promises, coalitions against
/// the leader, and pacts with written consequences. None of these is a rule in the game.
/// </summary>
public static partial class SignalDetector
{
    public static readonly string[] Kinds =
    [
        "tablet-sealed", "accusation", "messenger-blamed", "reputation", "broken-promise", "coalition",
        "forgery", "authentication", "forgery-exposed", "pact-with-consequences", "bribe", "defection",
        "detention", "skim", "debasement-found", "spy-caught", "double-agent", "evidence-shown", "shared-victory",
        "archive-copied", "archive-taken", "inventory-swapped", "storm", "siege-begun", "siege-won", "fortify", "sally", "sally-won", "envoy-out", "envoy-caught", "envoy-stayed",
        "terrain-held", "terrain-beaten",
    ];

    public static List<Signal> Detect(GameState s)
    {
        var list = new List<Signal>();
        foreach (var e in s.Events.Where(e => e.Signal is not null))
        {
            var kind = e.Signal!.StartsWith("foreign-support") ? null : e.Signal;
            if (kind is not null && kind != "assay" && kind != "debased-gift" && kind != "catastrophe") list.Add(new Signal(e.Turn, kind, e.Text));
        }

        foreach (var t in s.Trails)
        {
            // What the kings themselves said (the leader's letter and the host's replies), once per kind per message.
            var texts = new[] { t.LeaderLetter }.Concat(t.Exchanges.Select(x => x.Host)).Where(x => !string.IsNullOrWhiteSpace(x)).ToList();
            var turn = t.AudienceTurn ?? t.Turn;
            void Mark(string kind, Func<string, bool> test)
            {
                var hit = texts.FirstOrDefault(test);
                if (hit is not null) list.Add(new Signal(turn, kind, $"{t.From}/{t.To}: {Greeting.Cap(hit, 140)}"));
            }
            Mark("accusation", TextKit.IsAccusation);
            Mark("messenger-blamed", BlamesMessenger);
            Mark("reputation", x => PastConduct().IsMatch(x));
        }

        foreach (var t in s.Tablets.Where(t => t.IsSealedAgreement && Consequence().IsMatch(t.Text)))
            list.Add(new Signal(t.SealedTurn ?? t.CreatedTurn, "pact-with-consequences", Greeting.Cap(t.Text, 160)));

        // Broken promises: a conquest between two powers that had sealed a tablet before it, or earlier the same season
        // (audiences come before orders, so a tablet sealed this season already bound this season's troops). A king who
        // takes back a province of his own homeland breaks no promise.
        foreach (var e in s.Events.Where(e => e.Kind == "conquest"))
        {
            var m = Took().Match(e.Text);
            if (!m.Success || !Powers.TryParse(m.Groups[1].Value, out var taker) || !Powers.TryParse(m.Groups[3].Value, out var loser)) continue;
            if (WorldMap.Default.Provinces.FirstOrDefault(x => x.Name == m.Groups[2].Value)?.Home == taker) continue;
            if (s.Tablets.Any(t => t.IsSealedAgreement && t.SealedTurn <= e.Turn && t.Seals.Contains(taker) && t.Seals.Contains(loser)))
                list.Add(new Signal(e.Turn, "broken-promise", e.Text));
        }

        // Coalitions: two other powers supporting each other against whoever leads at the time, into his land
        // or holding against his attack.
        foreach (var e in s.Events.Where(e => e.Signal?.StartsWith("foreign-support:") == true))
        {
            if (!Powers.TryParse(e.Signal!["foreign-support:".Length..], out var target)) continue;
            var leader = s.Scores.Where(x => x.Turn == e.Turn - 1).OrderByDescending(x => x.Growth).FirstOrDefault()?.Power;
            if (leader == target) list.Add(new Signal(e.Turn, "coalition", e.Text + $" ({target} was leading)"));
        }

        return list.OrderBy(x => x.Turn).ThenBy(x => x.Kind).ToList();
    }

    public static Dictionary<string, int> Count(GameState s) =>
        Detect(s).GroupBy(x => x.Kind).ToDictionary(g => g.Key, g => g.Count());

    /// <summary>
    /// Blame laid on a messenger for the words he carried: his lies ("your envoy lied", "the messenger's words are false"),
    /// or his errors and his scribe's ("Either your scribe erred or your tongue did", "the messenger misspoke", "my
    /// interpreter garbled it"). Until the fix pass after item 4 only lies counted.
    /// </summary>
    public static bool BlamesMessenger(string text) => MessengerBlamed().IsMatch(text);

    [GeneratedRegex(@"(messenger|envoy)[^.]{0,60}\b(lie|lied|lies|lying|false|deceiv)|\b(messenger|envoy|scribe|interpreter|tongue)s?('s|s')?\b[^.!?]{0,60}?\b(err(ed|s)?|misspo(ke|ken)|mistook|garbled|twisted|miswr(ote|itten))\b", RegexOptions.IgnoreCase)]
    private static partial Regex MessengerBlamed();

    [GeneratedRegex(@"\b(you (once|before|already) (broke|swore|promised|sent)|as you did before|remember (when|how)|last (year|season) you|you kept your word|you have kept)", RegexOptions.IgnoreCase)]
    private static partial Regex PastConduct();

    [GeneratedRegex(@"\b(if (one|either|he|you|any)[^.]{0,80}(break|breaks|fails|attacks)|shall pay|must pay|forfeit|penalty|may the gods destroy)", RegexOptions.IgnoreCase)]
    private static partial Regex Consequence();

    [GeneratedRegex(@"^(\w+) took (.+) from (\w+)\.$")]
    private static partial Regex Took();
}
