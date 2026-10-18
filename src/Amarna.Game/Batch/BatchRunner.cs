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
    public static async Task<GameSummary> PlayAsync(ulong seed, Func<GameState, GameRunner> build, bool verifyReplay, CancellationToken ct = default, Action<string>? log = null, GameConfig? config = null)
    {
        var runner = build(GameFactory.NewGame(seed, config));
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

    /// <summary>
    /// Each king in turn plays the current bot against six baselines, compared with the same seed played
    /// all-baseline: how much better does a king do, alone, with the new brain?
    /// </summary>
    public static async Task<string> SoloAsync(ulong firstSeed, int seeds, GameConfig? config = null)
    {
        var lines = new List<string> { $"One current king against six baselines, {seeds} seeds:" , "  Power       growth alone / all-baseline   wins alone / all-baseline" };
        var baseGrowth = Powers.All.ToDictionary(p => p, _ => new List<double>());
        var soloGrowth = Powers.All.ToDictionary(p => p, _ => new List<double>());
        var baseWins = Powers.All.ToDictionary(p => p, _ => 0.0);
        var soloWins = Powers.All.ToDictionary(p => p, _ => 0.0);
        // Every (seed, focus) game is independent: play them side by side, then add up in seed order.
        var jobs = Enumerable.Range(0, seeds).SelectMany(i => Powers.All.Select(p => (Seed: firstSeed + (ulong)i, Focus: (Power?)p)).Prepend((firstSeed + (ulong)i, null))).ToList();
        var done = new GameSummary[jobs.Count];
        await Parallel.ForEachAsync(Enumerable.Range(0, jobs.Count), new ParallelOptions { MaxDegreeOfParallelism = Environment.ProcessorCount }, async (j, ct) =>
        {
            var (s, focus) = jobs[j];
            done[j] = await PlayAsync(s, st =>
            {
                var baseline = new Bots.BaselineLeader(st.Seed);
                var seats = Powers.All.ToDictionary(x => x, x => x == focus ? (ISeat)new Bots.ScriptLeader(st.Seed) : baseline);
                return new GameRunner(st, seats, new Bots.ScriptMind(), new Bots.TemplateNarrator()) { WriteChronicles = false };
            }, false, ct, config: config);
        });
        for (var j = 0; j < jobs.Count; j++)
        {
            var g = done[j];
            if (jobs[j].Focus is not { } p)
            {
                foreach (var x in Powers.All)
                {
                    baseGrowth[x].Add(g.Growth[x]);
                    if (g.Winners.Contains(x.ToString())) baseWins[x] += 1.0 / g.Winners.Count;
                }
                continue;
            }
            soloGrowth[p].Add(g.Growth[p]);
            if (g.Winners.Contains(p.ToString())) soloWins[p] += 1.0 / g.Winners.Count;
        }
        foreach (var p in Powers.All)
            lines.Add($"  {p,-10}  {soloGrowth[p].Average(),5:0.00} / {baseGrowth[p].Average(),4:0.00}                  {100 * soloWins[p] / seeds,3:0}% / {100 * baseWins[p] / seeds,3:0}%");
        lines.Add($"  All kings   {Powers.All.Average(p => soloGrowth[p].Average()),5:0.00} / {Powers.All.Average(p => baseGrowth[p].Average()),4:0.00}                  {100 * soloWins.Values.Sum() / (seeds * 7),3:0}% / {100 * baseWins.Values.Sum() / (seeds * 7),3:0}%");
        return string.Join(Environment.NewLine, lines);
    }

    /// <summary>
    /// Per seat: how often it was asked (orders and audiences), how many of its orders the engine
    /// rejected or could not carry out as the season resolved, how many decisions fell back to the
    /// script king, and, for seats that may sleep, how long they asked to sleep, how long they slept and
    /// every reason they were woken.
    /// </summary>
    public static string SeatReport(GameRunner runner)
    {
        var s = runner.State;
        var lines = new List<string> { "  Power       seat                 orders  audiences  invalid  fallbacks  sleeps (asked/slept)  woken by" };
        foreach (var p in Powers.All)
        {
            var label = runner.Log.Header.Seats.GetValueOrDefault(p) ?? "?";
            var orders = runner.Log.Decisions.Count(d => d.Key.StartsWith("t", StringComparison.Ordinal) && d.Key.EndsWith($"/orders/{p}", StringComparison.Ordinal));
            // Audiences answered by a model or file seat: one per logged key (a retry is the same audience). Script seats log no calls.
            var hostKeys = runner.Log.Calls.Where(c => c.Role == $"host:{p}").Select(c => c.Key).Distinct().Count();
            var hosted = runner.Log.Calls.Any(c => c.Role == $"leader:{p}" || c.Role == $"host:{p}") ? hostKeys.ToString() : "-";
            var invalid = s.InboxOf(p).Sum(FailedOrders);
            int fallbacks;
            lock (runner.Errors) fallbacks = runner.Errors.Count(e => e.Contains($"/orders/{p}:", StringComparison.Ordinal)
                || (e.Contains("/host/", StringComparison.Ordinal) && runner.Log.Calls.Any(c => c.Role == $"host:{p}" && e.StartsWith(c.Key, StringComparison.Ordinal))));
            var sleeps = "";
            var woken = "";
            if (s.Sleep.TryGetValue(p, out var sl) && sl.History.Count > 0)
            {
                // A spell still open at the end counts the seasons slept so far.
                sleeps = string.Join(" ", sl.History.Select(h => $"{h.Requested}/{(h.WokeAt > 0 ? h.WokeAt - h.From : s.Turn - h.From + 1)}{(h.WokeAt > 0 ? "" : "+")}"));
                // Every reason a seat was woken, not only the first, counted over its spells.
                woken = string.Join("; ", sl.History.SelectMany(h => h.Reasons).GroupBy(r => r.Split('(')[0].Trim()).Select(g => $"{g.Key} x{g.Count()}"));
            }
            lines.Add($"  {p,-10}  {Cap(label, 19),-19}  {orders,6}  {hosted,9}  {invalid,7}  {fallbacks,9}  {sleeps,-20}  {woken}");
        }
        return string.Join(Environment.NewLine, lines);

        static string Cap(string t, int n) => t.Length <= n ? t : t[..n];
    }

    /// <summary>
    /// Orders a notice reports as refused or failed: every rejection notice counts, the validator's list
    /// once per order it names ("- ..."), and any other refusal or failure (a levy, cession, purchase,
    /// payment or hire that could not go through) once.
    /// </summary>
    public static int FailedOrders(InboxItem item) => item.Kind != InboxKind.Rejected ? 0
        : Math.Max(1, item.Body.Split('\n').Count(l => l.StartsWith("- ", StringComparison.Ordinal)));

    /// <summary>Current bot against the frozen baseline: growth and wins for each side, overall and per power.</summary>
    public static string Versus(IReadOnlyList<GameSummary> games, IReadOnlyList<HashSet<Power>> current)
    {
        var lines = new List<string> { "", "Current bot against the baseline (the same kings play both sides across seeds):" };
        double Mean(IEnumerable<double> xs) { var l = xs.ToList(); return l.Count == 0 ? 0 : l.Average(); }
        var newGrowth = new List<double>();
        var oldGrowth = new List<double>();
        double newWins = 0, oldWins = 0;
        for (var i = 0; i < games.Count; i++)
        {
            foreach (var p in Powers.All)
                (current[i].Contains(p) ? newGrowth : oldGrowth).Add(games[i].Growth[p]);
            foreach (var w in games[i].Winners)
                if (Powers.TryParse(w, out var p)) { if (current[i].Contains(p)) newWins += 1.0 / games[i].Winners.Count; else oldWins += 1.0 / games[i].Winners.Count; }
        }
        var newSeats = current.Sum(c => c.Count);
        var oldSeats = games.Count * 7 - newSeats;
        lines.Add($"  Current bot: mean growth {Mean(newGrowth):0.00}, wins {newWins:0.0} of {games.Count} ({100 * newWins / games.Count:0}%) from {100.0 * newSeats / (games.Count * 7):0}% of the seats");
        lines.Add($"  Baseline:    mean growth {Mean(oldGrowth):0.00}, wins {oldWins:0.0} of {games.Count} ({100 * oldWins / games.Count:0}%) from {100.0 * oldSeats / (games.Count * 7):0}% of the seats");
        lines.Add("  Per power, mean growth as current / as baseline:");
        foreach (var p in Powers.All)
        {
            var asNew = Mean(Enumerable.Range(0, games.Count).Where(i => current[i].Contains(p)).Select(i => games[i].Growth[p]));
            var asOld = Mean(Enumerable.Range(0, games.Count).Where(i => !current[i].Contains(p)).Select(i => games[i].Growth[p]));
            lines.Add($"    {p,-10} {asNew:0.00} / {asOld:0.00}");
        }
        return string.Join(Environment.NewLine, lines);
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
