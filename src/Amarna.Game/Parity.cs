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

    /// <summary>
    /// Replays a recorded game leniently, as both builds must for the recorded model games (CONVERSION-PLAN.md, Notes): a
    /// recorded reply wherever its key still comes up, the script stand-in (script kings, characters and narrator)
    /// elsewhere, whatever the log's save version. The kings that could sleep in the recorded game sleep again.
    /// </summary>
    public static async Task<List<string>> ReplayLenient(GameLog log)
    {
        var state = GameFactory.NewGame(log.Header.Seed, log.Header.Config);
        var script = new Bots.ScriptLeader(state.Seed);
        var sleepers = log.Header.Sleepers.ToHashSet();
        var seats = Powers.All.ToDictionary(p => p, p => sleepers.Contains(p) ? (ISeat)new Sleeping(script) : script);
        var runner = new GameRunner(state, seats, new Bots.ScriptMind(), new Bots.TemplateNarrator(), replay: log, strictReplay: false, anyVersion: true);
        var lines = Attach(runner);
        await runner.PrepareAsync();
        while (await runner.PlayTurnAsync()) { }
        return lines;
    }

    /// <summary>A seat that may sleep, played by another.</summary>
    private sealed class Sleeping(ISeat inner) : ISeat
    {
        public string Label => inner.Label + " (sleeping)";
        public bool CanSleep => true;
        public Task<TurnSubmission> DecideAsync(SeatView view, CancellationToken ct) => inner.DecideAsync(view, ct);
        public Task<HostReply> HostAudienceAsync(AudienceView view, SeatView court, CancellationToken ct) => inner.HostAudienceAsync(view, court, ct);
    }
}
