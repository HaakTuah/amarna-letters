using System.Diagnostics;
using Amarna.Engine;
using Amarna.Game;
using Amarna.Game.Batch;
using Amarna.Llm;

// Runs many games unattended and prints winners and signal counts.
//   dotnet run --project src/Amarna.Batch -- --games 50 --seed 1 [--out logs] [--verify-replay] [--detail]
// Model seats (reads ANTHROPIC_API_KEY; every call costs money):
//   --leaders sonnet|opus|script   --characters haiku|script   --narrator sonnet|template   --effort low|medium|high
//   --budget 5   (stop when total spend reaches this many dollars)
// Experiments: --no-primer (leaders without the customs primer), --no-shared-victory

var games = 20;
ulong seed = 1;
string? outDir = null;
var verify = false;
var detail = false;
var choices = new SeatChoices();
var budget = 5.0;
var noChronicles = false;
var config = new GameConfig();

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
        case "--no-primer": config = config with { CustomsPrimer = false }; break;
        case "--no-shared-victory": config = config with { SharedVictory = false }; break;
        case "--effort": choices.LeaderEffort = args[++i]; break;
        case "--leaders":
            var kind = args[++i] switch { "sonnet" => LeaderKind.Sonnet, "opus" => LeaderKind.Opus, _ => LeaderKind.Script };
            foreach (var p in Powers.All) choices.Leaders[p] = kind;
            break;
        case "--characters": choices.HaikuCharacters = args[++i] == "haiku"; break;
        case "--narrator": choices.SonnetNarrator = args[++i] == "sonnet"; break;
        case "-h" or "--help":
            Console.WriteLine("Options: --games N --seed S --out DIR --verify-replay --detail --leaders sonnet|opus|script --characters haiku|script --narrator sonnet|template --effort low|medium|high --budget USD --no-chronicles --no-primer --no-shared-victory");
            return;
        default:
            Console.Error.WriteLine($"Unknown option {args[i]}");
            return;
    }
}

var key = Environment.GetEnvironmentVariable("ANTHROPIC_API_KEY");
if (choices.UsesModels && string.IsNullOrWhiteSpace(key))
{
    Console.Error.WriteLine("Model seats need ANTHROPIC_API_KEY set in the environment.");
    return;
}
if (outDir is not null) Directory.CreateDirectory(outDir);

var results = new List<GameSummary>();
var clock = Stopwatch.StartNew();
var spent = 0.0;
for (var g = 0; g < games; g++)
{
    if (choices.UsesModels && spent >= budget)
    {
        Console.WriteLine($"Stopping: ${spent:0.00} spent, budget ${budget:0.00}.");
        break;
    }
    var s = seed + (ulong)g;
    GameRunner? last = null;
    var summary = await BatchRunner.PlayAsync(s, state =>
    {
        var set = SeatSetup.Build(choices, state, key, browser: false, () => last!.Log);
        last = new GameRunner(state, set.Seats, set.Minds, set.Narrator) { WriteChronicles = !noChronicles };
        return last;
    }, verify, log: Console.Error.WriteLine, config: config);
    results.Add(summary);
    spent += summary.CostUsd;
    if (outDir is not null && last is not null)
        await File.WriteAllTextAsync(Path.Combine(outDir, $"game-{s}.jsonl"), last.Log.ToJsonl());
    Console.WriteLine($"seed {s}: {summary.Turns} turns, winner {string.Join(" & ", summary.Winners)}"
        + (verify ? summary.ReplayMatches ? ", replay ok" : ", REPLAY MISMATCH" : "")
        + (summary.CostUsd > 0 ? $", ${summary.CostUsd:0.00}" : "")
        + (summary.Errors > 0 ? $", {summary.Errors} fallbacks" : ""));
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
Console.WriteLine($"\n{clock.Elapsed.TotalSeconds:0.0}s");
