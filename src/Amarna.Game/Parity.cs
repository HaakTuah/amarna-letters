using System.Text;
using Amarna.Engine;

namespace Amarna.Game;

/// <summary>
/// The parity check of the TypeScript conversion (build order item 5+, <c>docs/CONVERSION-PLAN.md</c>): a fingerprint of the
/// game after every phase of every season, one line each, which both builds write the same way and compare. A line is
/// "seed, phase, state, decisions": the FNV-1a hash of the state's JSON (<see cref="Json.Hash"/>) and of the decisions
/// logged in that phase, each as its key and its JSON, in ordinal order of key.
/// </summary>
public static class Parity
{
    /// <summary>Fingerprints a runner's game as it plays: the lines are added to the list returned.</summary>
    public static List<string> Attach(GameRunner runner)
    {
        var lines = new List<string>();
        var seen = 0;
        runner.PhaseDone = phase =>
        {
            var decisions = runner.Log.Decisions.Skip(seen).OrderBy(d => d.Key, StringComparer.Ordinal).ToList();
            seen = runner.Log.Decisions.Count;
            var text = new StringBuilder();
            foreach (var (key, json) in decisions) text.Append(key).Append('\n').Append(json).Append('\n');
            lines.Add($"{runner.State.Seed}\t{phase}\t{Json.Hash(runner.State)}\t{Rng.Fnv(text.ToString()):x16}");
        };
        return lines;
    }
}
