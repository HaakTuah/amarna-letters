using Amarna.Engine;

namespace Amarna.Game.Batch;

public sealed class GameSummary
{
    public ulong Seed { get; init; }
    public int Turns { get; init; }
    public List<string> Winners { get; init; } = new();
    public Dictionary<Power, double> Growth { get; init; } = new();
    public Dictionary<string, int> Signals { get; init; } = new();
    public double CostUsd { get; init; }
    public int Errors { get; init; }
    public bool ReplayMatches { get; init; } = true;
}

/// <summary>Plays many games unattended and summarizes winners and signals across them.</summary>
public static class BatchRunner
{
    public static async Task<GameSummary> PlayAsync(ulong seed, Func<GameState, GameRunner> build, bool verifyReplay, CancellationToken ct = default, Action<string>? log = null)
    {
        var runner = build(GameFactory.NewGame(seed));
        await runner.PrepareAsync(ct);
        while (await runner.PlayTurnAsync(ct)) { }
        var s = runner.State;

        var matches = true;
        if (verifyReplay)
        {
            var replay = GameRunner.ForReplay(GameLog.FromJsonl(runner.Log.ToJsonl()));
            replay.WriteChronicles = runner.WriteChronicles;
            await replay.PrepareAsync(ct);
            while (await replay.PlayTurnAsync(ct)) { }
            matches = Json.Hash(replay.State) == Json.Hash(s);
            if (!matches) log?.Invoke($"seed {seed}: replay diverged");
        }

        var engine = new TurnEngine(s);
        return new GameSummary
        {
            Seed = seed,
            Turns = s.Scores.Count == 0 ? 0 : s.Scores.Max(x => x.Turn),
            Winners = s.Winners.ToList(),
            Growth = Powers.All.ToDictionary(p => p, p => Math.Round(engine.Growth(p), 3)),
            Signals = SignalDetector.Count(s),
            CostUsd = runner.Log.TotalCost,
            Errors = runner.Errors.Count,
            ReplayMatches = matches,
        };
    }

    public static string Report(IReadOnlyList<GameSummary> games)
    {
        var lines = new List<string>();
        lines.Add($"{games.Count} games, {games.Average(g => g.Turns):0.0} turns on average (range {games.Min(g => g.Turns)}-{games.Max(g => g.Turns)}).");
        lines.Add("");
        lines.Add("Wins by power (shared wins count for each partner):");
        foreach (var p in Powers.All)
        {
            var wins = games.Count(g => g.Winners.Contains(p.ToString()));
            var avg = games.Average(g => g.Growth[p]);
            lines.Add($"  {p,-10} {p.Tier(),-7} wins {wins,3}  ({100.0 * wins / games.Count,5:0.0}%)  mean growth {avg:0.00}");
        }
        var weakWins = games.Count(g => g.Winners.Any(w => Powers.TryParse(w, out var p) && p.Tier() == Tier.Weak));
        lines.Add($"  Games won by a weak power: {weakWins}");
        lines.Add($"  Shared victories: {games.Count(g => g.Winners.Count > 1)}");
        lines.Add("");
        lines.Add("Signals (games with at least one / total):");
        foreach (var kind in SignalDetector.Kinds)
        {
            var with = games.Count(g => g.Signals.GetValueOrDefault(kind) > 0);
            var total = games.Sum(g => g.Signals.GetValueOrDefault(kind));
            lines.Add($"  {kind,-24} {with,3} / {total}");
        }
        var cost = games.Sum(g => g.CostUsd);
        if (cost > 0) lines.Add($"\nModel cost: ${cost:0.00} total, ${cost / games.Count:0.00} per game.");
        var errors = games.Sum(g => g.Errors);
        if (errors > 0) lines.Add($"Seat or model errors replaced by script fallbacks: {errors}.");
        if (games.Any(g => !g.ReplayMatches)) lines.Add($"REPLAY MISMATCH in {games.Count(g => !g.ReplayMatches)} game(s).");
        return string.Join(Environment.NewLine, lines);
    }
}
