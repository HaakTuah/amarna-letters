using System.Diagnostics;
using Amarna.Engine;
using Amarna.Game;
using Amarna.Game.Batch;
using Amarna.Game.Bots;

// Runs many games unattended and prints winners and signal counts.
//   dotnet run --project src/Amarna.Batch -- --games 50 --seed 1 [--out logs] [--verify-replay]

var games = 20;
ulong seed = 1;
string? outDir = null;
var verify = false;
var detail = false;
for (var i = 0; i < args.Length; i++)
{
    switch (args[i])
    {
        case "--games": games = int.Parse(args[++i]); break;
        case "--seed": seed = ulong.Parse(args[++i]); break;
        case "--out": outDir = args[++i]; break;
        case "--verify-replay": verify = true; break;
        case "--detail": detail = true; break;
        case "-h" or "--help":
            Console.WriteLine("Options: --games N  --seed S  --out DIR  --verify-replay");
            return;
        default:
            Console.Error.WriteLine($"Unknown option {args[i]}");
            return;
    }
}
if (outDir is not null) Directory.CreateDirectory(outDir);

var results = new List<GameSummary>();
var clock = Stopwatch.StartNew();
for (var g = 0; g < games; g++)
{
    var s = seed + (ulong)g;
    GameRunner? last = null;
    var summary = await BatchRunner.PlayAsync(s, state =>
    {
        var seats = Powers.All.ToDictionary(p => p, _ => (ISeat)new ScriptLeader(state.Seed));
        last = new GameRunner(state, seats, new ScriptMind(), new TemplateNarrator());
        return last;
    }, verify, log: Console.Error.WriteLine);
    results.Add(summary);
    if (outDir is not null && last is not null)
        await File.WriteAllTextAsync(Path.Combine(outDir, $"game-{s}.jsonl"), last.Log.ToJsonl());
    Console.WriteLine($"seed {s}: {summary.Turns} turns, winner {string.Join(" & ", summary.Winners)}" + (verify ? summary.ReplayMatches ? ", replay ok" : ", REPLAY MISMATCH" : ""));
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
    }
}
Console.WriteLine();
Console.WriteLine(BatchRunner.Report(results));
Console.WriteLine($"\n{clock.Elapsed.TotalSeconds:0.0}s");
