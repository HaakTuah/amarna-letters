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
    /// <summary>
    /// Seasons a sleeping seat held court while its orders stood, over all seats; at how many it reopened them itself; and at
    /// how many a call failed, the stand-in answered and the seat was asked for orders without having chosen (out of the rate).
    /// </summary>
    public int CourtsHeld { get; init; }
    public int CourtsReopened { get; init; }
    public int CourtsStoodIn { get; init; }
    /// <summary>Whether any seat could sleep in this game.</summary>
    public bool Sleepers { get; init; }
    /// <summary>The living characters at the end, richest first, one line each (<see cref="Wealth.Line"/>).</summary>
    public List<string> Richest { get; init; } = new();
    /// <summary>The richest character's wealth at the end.</summary>
    public int TopWealth { get; init; }
    /// <summary>What every character gained in the game, by source, the dead included.</summary>
    public Earnings Gained { get; init; } = new();
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
        var courts = Courts(s);
        var ranking = Wealth.Ranking(s);
        var gained = new Earnings();
        foreach (var c in s.Characters) gained.Add(c.Earned);
        return new GameSummary
        {
            Richest = ranking.Select(Wealth.Line).ToList(),
            TopWealth = ranking.Count == 0 ? 0 : ranking[0].Total,
            Gained = gained,
            CourtsHeld = courts.Held,
            CourtsReopened = courts.Reopened,
            CourtsStoodIn = courts.StoodIn,
            Sleepers = s.Sleep.Count > 0,
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
    /// script king, and, for seats that may sleep, the seasons it held court while its orders stood and
    /// in how many of them it reopened its orders (courts: held/reopened, and "(n by stand-in)" for courts
    /// where a call failed and it was asked for orders without having chosen), how many seasons each sleep
    /// lasted (n: it woke in the season it named; +: still asleep at the end) and every reason they were
    /// woken. A last line gives the reopen rate over all seats.
    /// </summary>
    public static string SeatReport(GameRunner runner)
    {
        var s = runner.State;
        var lines = new List<string> { "  Power       seat                 orders  audiences  invalid  fallbacks  courts  slept (seasons)       woken by" };
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
            // Courts held while its orders stood (an envoy woke it for its audiences only), how many it reopened its orders at
            // itself, and how many the stand-in answered at because a call failed (it was then asked for orders without choosing).
            var courts = s.Sleep.TryGetValue(p, out var held)
                ? $"{held.Courts.Count}/{held.Courts.Count(c => c.Reopened)}" + (held.Courts.Count(c => !c.Decided) is > 0 and var stood ? $" ({stood} by stand-in)" : "")
                : "-";
            if (s.Sleep.TryGetValue(p, out var sl) && sl.History.Count > 0)
            {
                // A spell still open at the end counts the seasons slept so far.
                sleeps = string.Join(" ", sl.History.Select(h => h.WokeAt > 0
                    ? $"{h.WokeAt - h.From}{(h.Named > 0 && h.Named == h.WokeAt ? "n" : "")}"
                    : $"{s.Turn - h.From + 1}+"));
                // Every reason a seat was woken, not only the first, counted over its spells.
                woken = string.Join("; ", sl.History.SelectMany(h => h.Reasons).GroupBy(ReasonKind).Select(g => $"{g.Key} x{g.Count()}"));
            }
            lines.Add($"  {p,-10}  {Cap(label, 19),-19}  {orders,6}  {hosted,9}  {invalid,7}  {fallbacks,9}  {courts,6}  {sleeps,-20}  {woken}");
        }
        if (s.Sleep.Count > 0) lines.Add("  " + ReopenRate(Courts(s)));
        return string.Join(Environment.NewLine, lines);

        static string Cap(string t, int n) => t.Length <= n ? t : t[..n];
    }

    /// <summary>
    /// The courts held while orders stood in one game, over every seat: how many, at how many the king reopened its orders
    /// itself, and at how many a call failed and the stand-in answered, so that the king was asked for orders without having
    /// chosen (<see cref="CourtHeld.Decided"/>).
    /// </summary>
    public static (int Held, int Reopened, int StoodIn) Courts(GameState s) =>
        (s.Sleep.Values.Sum(x => x.Courts.Count), s.Sleep.Values.Sum(x => x.Courts.Count(c => c.Reopened)), s.Sleep.Values.Sum(x => x.Courts.Count(c => !c.Decided)));

    /// <summary>
    /// How often kings woken for an audience only reopened their orders. Courts where a call failed and the stand-in answered
    /// are counted apart and left out of the rate: the king never made that choice.
    /// </summary>
    public static string ReopenRate((int Held, int Reopened, int StoodIn) courts)
    {
        if (courts.Held == 0) return "Courts held while orders stood: none.";
        if (courts.StoodIn == 0)
            return $"Courts held while orders stood: {courts.Held}; orders reopened at {courts.Reopened} ({100.0 * courts.Reopened / courts.Held:0}%).";
        var decided = courts.Held - courts.StoodIn;
        var rate = decided == 0
            ? "none left the choice to the king"
            : $"orders reopened at {courts.Reopened} of the {decided} where the king chose ({100.0 * courts.Reopened / decided:0}%)";
        return $"Courts held while orders stood: {courts.Held}; {rate}; at {courts.StoodIn} a call failed, the stand-in answered and the king was asked for orders without choosing (left out of the rate).";
    }

    /// <summary>
    /// Model (or file) characters beside the script with the same traits, decision by decision in the same situations (the
    /// log's shadow lines): gold kept and inventories swapped, gifts and posts taken or refused, what the checks found reports
    /// and speeches hide (<see cref="CharacterChecks"/>), spies' reports, pitches, and the same per character. Decisions whose
    /// reply failed (the script stood in) are counted apart and left out of the comparison.
    /// </summary>
    public static string CharacterReport(GameLog log)
    {
        // Read after the game, when no call is still adding to the log.
        var all = log.Shadows.OrderBy(s => s.Turn).ThenBy(s => s.Key, StringComparer.Ordinal).ToList();
        var made = all.Where(s => s.Model is not null).ToList();
        var lines = new List<string>
        {
            $"  Characters: {made.Count} decisions by the characters' own minds, each beside the script's with the same traits in the same situation"
                + (all.Count > made.Count ? $"; {all.Count - made.Count} more fell back to the script (no reply or an unreadable one)" : "") + ".",
            "                                         mind                script",
        };
        void Count(string what, IReadOnlyList<ShadowDecision> of, Func<CharacterChoice, bool> yes) =>
            lines.Add($"    {what,-36} {of.Count(s => yes(s.Model!)),-19} {of.Count(s => yes(s.Script))}");

        var gold = made.Where(s => s.Kind == "present" && s.GoldCarried > 0).ToList();
        lines.Add($"  Speeches abroad: {made.Count(s => s.Kind == "present")}, {gold.Count} with gold ({gold.Sum(s => s.GoldCarried)} shekels carried)");
        Count("kept some of the gold", gold, c => c.Kept > 0);
        lines.Add($"    {"shekels kept",-36} {gold.Sum(s => s.Model!.Kept),-19} {gold.Sum(s => s.Script.Kept)}");
        Count("swapped the inventory", gold, c => c.Swap);
        Count("softened a threat to the host", made.Where(s => s.Kind == "present").ToList(), c => c.Flags.Contains("softened-threat"));

        var gifts = made.Where(s => s.Kind == "react" && s.GiftOffered > 0).ToList();
        var posts = made.Where(s => s.Kind == "react" && s.ServiceOffered > 0).ToList();
        lines.Add($"  Audience replies: {made.Count(s => s.Kind == "react")}; gifts offered {gifts.Count}, posts offered {posts.Count}");
        Count("took the gift", gifts, c => c.AcceptGift);
        Count("refused the gift", gifts, c => !c.AcceptGift);
        Count("went over to the host", posts, c => c.AcceptService);
        Count("refused the post", posts, c => !c.AcceptService);
        Count("committed its lord to something", made.Where(s => s.Kind == "react").ToList(), c => c.Commitments.Trim().Length > 0);

        var reports = made.Where(s => s.Kind == "report").ToList();
        var home = reports.Where(s => s.GoldCarried > 0).ToList();
        lines.Add($"  Reports home: {reports.Count}, {home.Count} with gold ({home.Sum(s => s.GoldCarried)} shekels)");
        Count("kept some of the gold", home, c => c.Kept > 0);
        lines.Add($"    {"shekels kept",-36} {home.Sum(s => s.Model!.Kept),-19} {home.Sum(s => s.Script.Kept)}");
        Count("swapped the inventory", home, c => c.Swap);
        Count("hid or contradicted something", reports, c => c.Flags.Count > 0);
        foreach (var flag in reports.SelectMany(s => s.Model!.Flags.Concat(s.Script.Flags)).Distinct().Order(StringComparer.Ordinal))
            Count("  " + flag, reports, c => c.Flags.Contains(flag));

        var spies = made.Where(s => s.Kind == "spy").ToList();
        if (spies.Count > 0)
        {
            lines.Add($"  Spy reports: {spies.Count}");
            Count("passed on its masters' words", spies, c => c.Flags.Contains("passed-poison"));
            Count("left out observations", spies, c => c.Dropped > 0);
        }
        var pitches = made.Where(s => s.Kind == "pitch").ToList();
        if (pitches.Count > 0)
        {
            lines.Add($"  Pitches: {pitches.Count}");
            lines.Add($"    {"mean asking price (shekels a season)",-36} {pitches.Average(s => s.Model!.Price),-19:0} {pitches.Average(s => s.Script.Price):0}");
        }
        var memories = made.Count(s => s.Kind == "memory");
        if (memories > 0) lines.Add($"  Memory summaries: {memories}");

        lines.Add("  Per character (traits loyalty/greed/competence/ambition/courage): decisions; gold kept, gifts taken, posts taken and reports flagged, mind / script");
        foreach (var g in made.GroupBy(s => s.Character).OrderBy(g => TurnEngine.IdNumber(g.Key)))
        {
            var first = g.First();
            string Both(Func<ShadowDecision, CharacterChoice, int> f) => $"{g.Sum(s => f(s, s.Model!))}/{g.Sum(s => f(s, s.Script))}";
            lines.Add($"    {first.Name} ({first.Character}, {first.Traits}): {g.Count()}; kept {Both((_, c) => c.Kept)}, gifts {Both((s, c) => c.AcceptGift ? 1 : 0)}, "
                + $"posts {Both((s, c) => c.AcceptService ? 1 : 0)}, flagged {Both((s, c) => s.Kind == "report" && c.Flags.Count > 0 ? 1 : 0)}");
        }
        return string.Join(Environment.NewLine, lines);
    }

    /// <summary>
    /// How large each kind of request was: for file seats and file characters the request file's length (and tokens at
    /// 3.6 characters a token, as in the simulation-fixes round), for API calls the input tokens counted by the API.
    /// </summary>
    public static string CallSizes(GameLog log)
    {
        // Read after the game, when no call is still adding to the log.
        var calls = log.Calls.ToList();
        var lines = new List<string> { "  Requests by kind        calls   mean chars   max chars   mean tokens (file: chars/3.6; API: input)" };
        foreach (var g in calls.GroupBy(c => CallKind(c)).OrderBy(g => g.Key, StringComparer.Ordinal))
        {
            var files = g.Where(c => c.RequestChars > 0).ToList();
            var api = g.Where(c => c.RequestChars == 0 && c.InputTokens + c.CacheReadTokens + c.CacheWriteTokens > 0).ToList();
            var chars = files.Count == 0 ? "-" : $"{files.Average(c => c.RequestChars):0}";
            var max = files.Count == 0 ? "-" : $"{files.Max(c => c.RequestChars)}";
            var tokens = files.Count > 0 ? $"{files.Average(c => c.RequestChars) / 3.6:0}"
                : api.Count > 0 ? $"{api.Average(c => c.InputTokens + c.CacheReadTokens + c.CacheWriteTokens):0}" : "-";
            lines.Add($"  {g.Key,-22} {g.Count(),6}   {chars,10}   {max,9}   {tokens}");
        }
        return string.Join(Environment.NewLine, lines);
    }

    /// <summary>A call's kind, from its role and key: a king's orders or audience, or what a character was asked.</summary>
    public static string CallKind(ModelCall c)
    {
        if (c.Role.StartsWith("leader:", StringComparison.Ordinal)) return "king: orders";
        if (c.Role.StartsWith("host:", StringComparison.Ordinal)) return "king: audience";
        if (c.Key.Contains("/aud/present/", StringComparison.Ordinal)) return "character: speech";
        if (c.Key.Contains("/aud/react/", StringComparison.Ordinal)) return "character: reply";
        if (c.Key.Contains("/report/", StringComparison.Ordinal)) return "character: report";
        if (c.Key.Contains("/pitch/", StringComparison.Ordinal)) return "character: pitch";
        if (c.Key.Contains("/spy/", StringComparison.Ordinal)) return "character: spy report";
        if (c.Key.Contains("/memory/", StringComparison.Ordinal)) return "character: memory";
        return "other: " + c.Role.Split(':')[0];
    }

    /// <summary>A wake reason without its particulars, to count reasons of one kind together ("land lost: Gaza ..." is "land lost").</summary>
    public static string ReasonKind(string reason) =>
        reason.StartsWith("you asked to be woken in turn", StringComparison.Ordinal) ? "the season it named" : reason.Split(':', '(')[0].Trim();

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

    /// <summary>
    /// The richest characters over many games: how rich the richest was at the end, and where all characters' gold came
    /// from. Each game's own ranking is printed with the game.
    /// </summary>
    public static IEnumerable<string> RichestReport(IReadOnlyList<GameSummary> games)
    {
        var top = games.Select(g => g.TopWealth).ToList();
        var gained = new Earnings();
        foreach (var g in games) gained.Add(g.Gained);
        string Share(int part) => gained.Total == 0 ? "0%" : $"{100.0 * part / gained.Total:0.0}%";
        yield return "The richest characters (the second game, played under the kings'):";
        yield return $"  The richest held {top.Average():0} shekels at the end on average (range {top.Min()}-{top.Max()}).";
        yield return $"  All the gold characters gained, {gained.Total} shekels: wages {Share(gained.Wages)}, skimmed {Share(gained.Skimmed)}, gifts {Share(gained.Gifts)}, gold kept on dismissal {Share(gained.Carried)}.";
        yield return "  " + Wealth.WhatCounts;
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
        lines.Add("");
        lines.AddRange(RichestReport(games));
        var cost = games.Sum(g => g.CostUsd);
        if (cost > 0) lines.Add($"\nModel cost: ${cost:0.00} total, ${cost / games.Count:0.00} per game.");
        var errors = games.Sum(g => g.Errors);
        if (errors > 0) lines.Add($"Seat or model errors replaced by script fallbacks: {errors}.");
        if (games.Any(g => g.Sleepers)) lines.Add(ReopenRate((games.Sum(g => g.CourtsHeld), games.Sum(g => g.CourtsReopened), games.Sum(g => g.CourtsStoodIn))));
        if (games.Any(g => !g.ReplayMatches)) lines.Add($"REPLAY MISMATCH in {games.Count(g => !g.ReplayMatches)} game(s).");
        return string.Join(Environment.NewLine, lines);
    }
}
