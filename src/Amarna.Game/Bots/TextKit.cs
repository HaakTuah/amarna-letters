using System.Text.RegularExpressions;

namespace Amarna.Game.Bots;

/// <summary>Small sentence tools the script characters use to soften, embellish or trim messages.</summary>
public static partial class TextKit
{
    private static readonly string[] Threats =
        ["war", "attack", "destroy", "march", "punish", "warn", "crush", "burn", "invade", "enemy", "regret", "or else", "consequences", "betray"];

    private static readonly string[] Accusations =
        ["liar", "lie ", "lied", "lying", "deceive", "deceit", "false", "broke", "broken", "betray", "faithless", "your messenger", "your envoy"];

    public static List<string> Sentences(string text) =>
        SentenceSplit().Split(text.Trim()).Select(s => s.Trim()).Where(s => s.Length > 0).ToList();

    public static bool IsThreat(string sentence) => Threats.Any(t => sentence.Contains(t, StringComparison.OrdinalIgnoreCase));

    public static bool IsAccusation(string text) => Accusations.Any(t => text.Contains(t, StringComparison.OrdinalIgnoreCase));

    public static string Join(IEnumerable<string> sentences) => string.Join(" ", sentences.Where(s => s.Length > 0));

    [GeneratedRegex(@"(?<=[.!?])\s+")]
    private static partial Regex SentenceSplit();
}
