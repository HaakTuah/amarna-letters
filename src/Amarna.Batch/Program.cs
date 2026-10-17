using System.Diagnostics;
using Amarna.Engine;
using Amarna.Game;
using Amarna.Game.Batch;
using Amarna.Game.Bots;
using Amarna.Llm;

// Runs many games unattended and prints winners and signal counts.
//   dotnet run --project src/Amarna.Batch -- --games 50 --seed 1 [--out logs] [--verify-replay] [--detail]
// Model seats (reads ANTHROPIC_API_KEY; every call costs money):
//   --preset free|budget|standard|showcase
//   --leaders script|haiku|sonnet|opus   --characters script|haiku|sonnet   --narrator template|haiku|sonnet|opus
//   --effort low|medium|high
//   --budget 5   (stop when total spend reaches this many dollars)
// Experiments: --no-primer (leaders without the customs primer), --no-shared-victory
// Benchmark:   --versus baseline (half the kings are the frozen first bot, alternating by seed)
//              --versus solo (each king in turn plays the current bot against six baselines)
//              --focus Mitanni (only that king plays the current bot; add --detail to follow it)
// Pacing:      --sleep on|off (model and file seats are asked only when something concerns them), --sleep-cap 6,
//              --max-turns 10 (end the game after this season, whatever the random end)
// File seats:  --file-seats DIR|map.json (each king writes its request to its own folder and waits for a reply file;
//              DIR gives one folder per king, a JSON map {"Egypt": "path", ...} names them), --file-timeout 120 (minutes)

var games = 20;
ulong seed = 1;
string? outDir = null;
var verify = false;
var detail = false;
var choices = new SeatChoices();
var budget = 5.0;
var noChronicles = false;
var config = new GameConfig();
var versus = false;
var solo = false;
Power? focus = null;
string? fileSeats = null;
var fileTimeout = 120.0;

for (var i = 0; i < args.Length; i++)
{
    switch (args[i])
    {
        case "--games": games = int.Parse(args[++i]); break;
        case "--seed": seed = ulong.Parse(args[++i]); break;
        case "--out": outDir = args[++i]; break;
        case "--verify-replay": verify = true; break;
        case "--detail": detail = true; break;
        case "--budget": budget = double.Parse(args[++i], System.Globalization.CultureInfo.InvariantCulture); break;
        case "--no-chronicles": noChronicles = true; break;
        case "--versus":
            var mode = args[++i];
            if (mode is not ("baseline" or "solo")) throw new ArgumentException("Use --versus baseline or --versus solo.");
            versus = mode == "baseline";
            solo = mode == "solo";
            break;
        case "--focus":
            focus = Enum.Parse<Power>(args[++i], ignoreCase: true);
            break;
        case "--no-primer": config = config with { CustomsPrimer = false }; break;
        case "--no-shared-victory": config = config with { SharedVictory = false }; break;
        case "--sleep": config = config with { SleepingSeats = args[++i] is "on" or "true" or "1" }; break;
        case "--sleep-cap": config = config with { MaxSleep = int.Parse(args[++i]) }; break;
        case "--max-turns": config = config with { MaxTurns = int.Parse(args[++i]) }; break;
        case "--file-seats": fileSeats = args[++i]; break;
        case "--file-timeout": fileTimeout = double.Parse(args[++i], System.Globalization.CultureInfo.InvariantCulture); break;
        case "--effort": choices.LeaderEffort = args[++i]; break;
        case "--preset":
            var preset = Presets.Find(args[++i]) ?? throw new ArgumentException($"Unknown preset; choose {string.Join(", ", Presets.All.Select(x => x.Id))}.");
            preset.ApplyTo(choices);
            break;
        case "--leaders":
            var kind = Enum.Parse<LeaderKind>(args[++i], ignoreCase: true);
            foreach (var p in Powers.All) choices.Leaders[p] = kind;
            break;
        case "--characters": choices.Characters = Enum.Parse<CharacterKind>(args[++i], ignoreCase: true); break;
        case "--narrator": choices.Narrator = Enum.Parse<NarratorKind>(args[++i], ignoreCase: true); break;
        case "-h" or "--help":
            Console.WriteLine("Options: --games N --seed S --out DIR --verify-replay --detail --preset free|budget|standard|showcase --leaders script|haiku|sonnet|opus --characters script|haiku|sonnet --narrator template|haiku|sonnet|opus --effort low|medium|high --budget USD --no-chronicles --no-primer --no-shared-victory --versus baseline|solo --focus POWER --sleep on|off --sleep-cap N --max-turns N --file-seats DIR|map.json --file-timeout MINUTES");
            return;
        default:
            Console.Error.WriteLine($"Unknown option {args[i]}");
            return;
    }
}

// File seats: one folder per king. A folder name the others cannot guess is the setup script's job.
var folders = new Dictionary<Power, string>();
if (fileSeats is not null)
{
    if (games != 1) { Console.Error.WriteLine("File seats play one game at a time: use --games 1."); return; }
    if (fileSeats.EndsWith(".json", StringComparison.OrdinalIgnoreCase) && !File.Exists(fileSeats))
    {
        Console.Error.WriteLine($"No seat map at {fileSeats}.");
        return;
    }
    if (File.Exists(fileSeats))
    {
        var map = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, string>>(File.ReadAllText(fileSeats))!;
        foreach (var (name, path) in map) folders[Enum.Parse<Power>(name, ignoreCase: true)] = path;
    }
    else foreach (var p in Powers.All) folders[p] = Path.Combine(fileSeats, p.ToString().ToLowerInvariant());
    // Requests and replies left by an earlier game would look live: move them aside before this one starts.
    foreach (var (p, folder) in folders.OrderBy(x => x.Key))
    {
        Directory.CreateDirectory(folder);
        var old = Directory.GetFiles(folder).Where(f => System.Text.RegularExpressions.Regex.IsMatch(Path.GetFileName(f), @"^t\d+_.*\.(request\.md|reply\.json|tmp)$")).ToList();
        if (old.Count == 0) continue;
        var aside = Path.Combine(folder, $"earlier-{DateTime.Now:yyyyMMdd-HHmmss}");
        Directory.CreateDirectory(aside);
        foreach (var f in old) File.Move(f, Path.Combine(aside, Path.GetFileName(f)));
        Console.WriteLine($"{p}: moved {old.Count} files from an earlier game to {aside}");
    }
    Console.WriteLine($"File seats: {string.Join(", ", folders.OrderBy(x => x.Key).Select(x => x.Key))}.");
}

var key = Environment.GetEnvironmentVariable("ANTHROPIC_API_KEY");
if (choices.UsesModels && string.IsNullOrWhiteSpace(key))
{
    Console.Error.WriteLine("Model seats need ANTHROPIC_API_KEY set in the environment.");
    return;
}
if (outDir is not null) Directory.CreateDirectory(outDir);
if (choices.UsesModels)
    Console.WriteLine($"Estimated model cost: {CostEstimate.Describe(CostEstimate.PerGame(choices))} per {CostEstimate.TypicalSeasons}-season game; stopping at ${budget:0.00} in total.");

if (solo)
{
    Console.WriteLine(await BatchRunner.SoloAsync(seed, games, config));
    return;
}

var results = new List<GameSummary>();
var sides = new List<HashSet<Power>>();
var clock = Stopwatch.StartNew();
var spent = 0.0;

async Task<(GameSummary Summary, GameRunner? Runner, HashSet<Power> Current)> Play(int g)
{
    var s = seed + (ulong)g;
    GameRunner? last = null;
    // In a benchmark, these kings play the current bot and the rest the frozen baseline.
    var current = focus is { } only ? new HashSet<Power> { only } : Powers.All.Where((p, i) => !versus || (i + (int)(s % 2)) % 2 == 0).ToHashSet();
    var summary = await BatchRunner.PlayAsync(s, state =>
    {
        var set = SeatSetup.Build(choices, state, key, browser: false, () => last!.Log);
        var seats = set.Seats;
        foreach (var (p, folder) in folders)
        {
            var exchange = new FileExchange(folder, TimeSpan.FromMinutes(fileTimeout), call => last!.Log.AddCall(call), Console.WriteLine);
            seats[p] = new LlmLeaderSeat(p, exchange, "file", choices.LeaderEffort, state.Config.CustomsPrimer, state.Config, label: "File seat");
        }
        if (versus || focus is not null)
        {
            var baseline = new BaselineLeader(state.Seed);
            seats = Powers.All.ToDictionary(p => p, p => current.Contains(p) ? set.Seats[p] : (ISeat)baseline);
        }
        last = new GameRunner(state, seats, set.Minds, set.Narrator) { WriteChronicles = !noChronicles };
        return last;
    }, verify, log: Console.Error.WriteLine, config: config);
    return (summary, outDir is not null || detail || fileSeats is not null || config.SleepingSeats || choices.UsesModels ? last : null, current);
}

// Script games are independent and run side by side; model games run one at a time, within the budget.
var played = new (GameSummary Summary, GameRunner? Runner, HashSet<Power> Current)?[games];
if (choices.UsesModels)
{
    for (var g = 0; g < games; g++)
    {
        if (spent >= budget)
        {
            Console.WriteLine($"Stopping: ${spent:0.00} spent, budget ${budget:0.00}.");
            break;
        }
        played[g] = await Play(g);
        spent += played[g]!.Value.Summary.CostUsd;
    }
}
else await Parallel.ForEachAsync(Enumerable.Range(0, games), new ParallelOptions { MaxDegreeOfParallelism = Environment.ProcessorCount },
    async (g, _) => played[g] = await Play(g));

foreach (var outcome in played)
{
    if (outcome is not { } o) break;
    var (summary, last, current) = o;
    var s = summary.Seed;
    results.Add(summary);
    sides.Add(current);
    if (outDir is not null && last is not null)
        await File.WriteAllTextAsync(Path.Combine(outDir, $"game-{s}.jsonl"), last.Log.ToJsonl());
    if (outDir is not null && last is not null)
        await File.WriteAllTextAsync(Path.Combine(outDir, $"game-{s}.final.json"), Json.Serialize(last.State));
    Console.WriteLine($"seed {s}: {summary.Turns} turns, winner {string.Join(" & ", summary.Winners)}"
        + (verify ? summary.ReplayMatches ? ", replay ok" : ", REPLAY MISMATCH" : "")
        + (summary.CostUsd > 0 ? $", ${summary.CostUsd:0.00}" : "")
        + (summary.Errors > 0 ? $", {summary.Errors} fallbacks" : ""));
    if (last is not null && (fileSeats is not null || config.SleepingSeats || choices.UsesModels))
        Console.WriteLine(BatchRunner.SeatReport(last));
    if (detail && last is not null)
    {
        var st = last.State;
        foreach (var p in Powers.All)
        {
            var rows = st.Scores.Where(x => x.Power == p).ToList();
            var curve = string.Join(" ", rows.Where((_, i) => i % 3 == 0).Select(r => $"{r.Provinces}/{r.Units}/{r.Gold}"));
            Console.WriteLine($"   {p,-10} growth {summary.Growth[p]:0.00}  prov/units/gold every 3 turns: {curve}");
        }
        foreach (var e in st.Events.Where(e => e.Kind is "conquest" or "fall" or "desertion" or "purchase" or "catastrophe").Take(60))
            Console.WriteLine($"     t{e.Turn} {e.Kind}: {e.Text}");
        foreach (var err in last.Errors.Take(10)) Console.WriteLine($"     error: {err}");
    }
}
Console.WriteLine();
if (results.Count > 0) Console.WriteLine(BatchRunner.Report(results));
if (versus && results.Count > 0) Console.WriteLine(BatchRunner.Versus(results, sides));
Console.WriteLine($"\n{clock.Elapsed.TotalSeconds:0.0}s");
