using Amarna.Engine;
using Amarna.Game;
using Amarna.Game.Bots;
using Amarna.Llm;

namespace Amarna.Game.Tests;

public class FileSeatTests
{
    private static string NewFolder() => Directory.CreateTempSubdirectory("amarna-fileseat-").FullName;

    /// <summary>Answers every request that appears in a folder, until stopped: the stand-in for a king agent.</summary>
    private static async Task Answer(string folder, Func<string, string, string?> reply, CancellationToken ct)
    {
        var answered = new HashSet<string>();
        while (!ct.IsCancellationRequested)
        {
            foreach (var request in Directory.GetFiles(folder, "*.request.md"))
            {
                if (!answered.Add(request)) continue;
                var stem = Path.GetFileName(request)[..^".request.md".Length];
                var text = await File.ReadAllTextAsync(request, ct);
                if (reply(stem, text) is { } json) await File.WriteAllTextAsync(Path.Combine(folder, stem + ".reply.json"), json, ct);
            }
            try { await Task.Delay(50, ct); } catch (OperationCanceledException) { }
        }
    }

    private const string HoldEverything = """{"notes":"Hold fast.","units":[],"letters":[],"other_orders":[]}""";

    private static (GameRunner Runner, string Folder) Game(GameConfig? config = null, int timeoutSeconds = 30)
    {
        var folder = NewFolder();
        var state = GameFactory.NewGame(8, config ?? new GameConfig { CatastropheChance = 0 });
        var bot = new ScriptLeader(8);
        GameRunner? runner = null;
        var exchange = new FileExchange(folder, TimeSpan.FromSeconds(timeoutSeconds), call => runner!.Log.AddCall(call));
        var seats = Powers.All.ToDictionary(p => p, p => p == Power.Alashiya
            ? new LlmLeaderSeat(p, exchange, "file", "medium", state.Config.CustomsPrimer, state.Config, label: "File seat")
            : (ISeat)bot);
        runner = new GameRunner(state, seats, new ScriptMind(), new TemplateNarrator()) { WriteChronicles = false };
        return (runner, folder);
    }

    [Fact]
    public async Task A_file_seat_writes_what_a_model_king_sees_and_plays_the_reply()
    {
        var (runner, folder) = Game();
        using var stop = new CancellationTokenSource();
        var seen = new List<string>();
        var answering = Answer(folder, (stem, text) =>
        {
            lock (seen) seen.Add(text);
            return stem.Contains("orders")
                ? """{"notes":"Buy the copper coast.","units":[{"unit":"enkomi","order":"move","target":"cilicia","to":""}],"letters":[],"other_orders":[]}"""
                : """{"speech":"Welcome.","gift_to_envoy":0,"gift_request":"","offer_service_wage":0,"seal_tablet":false,"detain_envoy":false,"send_gold_back":0,"gold_back_purity":100,"end_audience":true}""";
        }, stop.Token);
        await runner.PlayTurnAsync();
        stop.Cancel();
        await answering;

        var request = seen.First(t => t.StartsWith("# t1/orders/Alashiya"));
        Assert.Contains("You are playing Amarna Letters", request);
        Assert.Contains("CUSTOMS OF THE AGE", request);
        Assert.Contains("Habiru", request);
        Assert.Contains("Great King of Alashiya", request);
        Assert.Contains("TREASURY:", request);
        Assert.Contains("\"other_orders\"", request);
        Assert.Contains("t1_orders_Alashiya.reply.json", request);
        Assert.EndsWith(FileExchange.Footer, request.TrimEnd());
        Assert.Contains(runner.State.Units, u => u.Power == Power.Alashiya && u.Province == "cilicia");
        Assert.Empty(runner.Errors);
        Assert.Contains(runner.Log.Calls, c => c.Key == "t1/orders/Alashiya" && c.Model == "file seat" && c.Output.Contains("copper coast"));
    }

    [Fact]
    public async Task A_file_seat_s_summary_comes_back_in_its_next_request()
    {
        var (runner, folder) = Game(new GameConfig { CatastropheChance = 0, SleepingSeats = false });
        using var stop = new CancellationTokenSource();
        var seen = new List<string>();
        var answering = Answer(folder, (stem, text) =>
        {
            lock (seen) seen.Add(text);
            return stem.Contains("orders")
                ? """{"notes":"zq-notes","summary":"zq-summary of what I learned","units":[],"letters":[],"other_orders":[]}"""
                : """{"speech":"Welcome.","gift_to_envoy":0,"gift_request":"","offer_service_wage":0,"seal_tablet":false,"detain_envoy":false,"send_gold_back":0,"gold_back_purity":100,"end_audience":true}""";
        }, stop.Token);
        await runner.PlayTurnAsync();
        await runner.PlayTurnAsync();
        stop.Cancel();
        await answering;

        Assert.Empty(runner.Errors);
        var second = seen.First(t => t.StartsWith("# t2/orders/Alashiya"));
        Assert.Contains("YOUR SUMMARY OF EARLIER SEASONS (your own words, turn 1): zq-summary of what I learned", second);
        Assert.Contains("turn 1 notes: zq-notes", second);
        Assert.Contains("\"summary\": {\"type\":\"string\"", second);
        Assert.True(runner.Log.TryGet<TurnSubmission>("t1/orders/Alashiya", out var logged));
        Assert.Equal("zq-summary of what I learned", logged.Summary);
    }

    /// <summary>Records what a model king is sent, and holds everything.</summary>
    private sealed class Recorder : IJsonAsker
    {
        public List<CallSpec> Specs { get; } = new();

        public Task<System.Text.Json.Nodes.JsonObject> AskJsonAsync(CallSpec spec, CancellationToken ct)
        {
            lock (Specs) Specs.Add(spec);
            var json = spec.Key.Contains("/orders/")
                ? HoldEverything
                : """{"speech":"Welcome.","gift_to_envoy":0,"gift_request":"","offer_service_wage":0,"seal_tablet":false,"detain_envoy":false,"send_gold_back":0,"gold_back_purity":100,"end_audience":true}""";
            return Task.FromResult((System.Text.Json.Nodes.JsonObject)System.Text.Json.Nodes.JsonNode.Parse(json)!);
        }
    }

    [Fact]
    public async Task Only_file_seats_are_told_how_to_finish()
    {
        var state = GameFactory.NewGame(8, new GameConfig { CatastropheChance = 0 });
        var recorder = new Recorder();
        var bot = new ScriptLeader(8);
        var seats = Powers.All.ToDictionary(p => p, p => p == Power.Alashiya
            ? new LlmLeaderSeat(p, recorder, "claude-sonnet-5-5", "medium", state.Config.CustomsPrimer, state.Config)
            : (ISeat)bot);
        var runner = new GameRunner(state, seats, new ScriptMind(), new TemplateNarrator()) { WriteChronicles = false };
        await runner.PlayTurnAsync();
        await runner.PlayTurnAsync();

        Assert.NotEmpty(recorder.Specs);
        foreach (var spec in recorder.Specs)
            Assert.DoesNotContain("single word done", spec.SharedSystem + spec.SeatSystem + spec.User);
        var request = FileExchange.Request(recorder.Specs[0], "x.reply.json", "");
        Assert.EndsWith(FileExchange.Footer, request.TrimEnd());
    }

    [Fact]
    public void The_request_prints_the_schema_short_with_no_line_a_file_reader_would_cut()
    {
        // Each field (its type, enum and description) on one line: the same schema, about two thirds of the length of a fully
        // indented one, and no line near the 2,000 characters past which a file reader cuts a line.
        var schema = Schemas.LeaderOrders(new GameConfig());
        var text = FileExchange.Readable(schema);
        Assert.True(System.Text.Json.Nodes.JsonNode.DeepEquals(schema, System.Text.Json.Nodes.JsonNode.Parse(text)));
        Assert.True(text.Split('\n').Max(l => l.Length) < 1000);
        var indented = schema.ToJsonString(new System.Text.Json.JsonSerializerOptions { WriteIndented = true }).Length;
        Assert.True(text.Length < indented * 0.75, $"{text.Length} against {indented}");
        Assert.Contains("    \"notes\": {\"type\":\"string\",\"description\":", text);
        Assert.Contains("another king's", text);
        var spec = new CallSpec { Key = "t1/orders/Egypt", Turn = 1, Role = "leader", Model = "file seat", SharedSystem = "Rules.", User = "Your view.", Schema = schema };
        var request = FileExchange.Request(spec, "x.reply.json", "");
        Assert.Contains("```json\n" + text + "\n```", request.ReplaceLineEndings("\n"));
    }

    [Fact]
    public async Task An_unreadable_reply_gets_one_retry_and_then_the_script_king_stands_in()
    {
        // Asked every season, so that the second season's call comes whatever the first decided.
        var (runner, folder) = Game(new GameConfig { CatastropheChance = 0, SleepingSeats = false });
        using var stop = new CancellationTokenSource();
        var answering = Answer(folder, (stem, _) => stem switch
        {
            "t1_orders_Alashiya" => "this is not json",
            "t1_orders_Alashiya.retry" => HoldEverything,
            "t2_orders_Alashiya" => "still not json",
            "t2_orders_Alashiya.retry" => "{ broken",
            _ => HoldEverything,
        }, stop.Token);
        await runner.PlayTurnAsync();
        Assert.Empty(runner.Errors);
        Assert.True(File.Exists(Path.Combine(folder, "t1_orders_Alashiya.retry.request.md")));
        Assert.Contains("could not be read", await File.ReadAllTextAsync(Path.Combine(folder, "t1_orders_Alashiya.retry.request.md")));

        await runner.PlayTurnAsync();
        stop.Cancel();
        await answering;
        Assert.Contains(runner.Errors, e => e.StartsWith("t2/orders/Alashiya:"));
    }

    [Fact]
    public async Task An_empty_reply_file_does_not_hang_the_game()
    {
        var (runner, folder) = Game();
        using var stop = new CancellationTokenSource();
        var answering = Answer(folder, (stem, _) => stem.StartsWith("t1_orders_Alashiya") ? "" : HoldEverything, stop.Token);
        await runner.PlayTurnAsync();
        stop.Cancel();
        await answering;
        Assert.Contains(runner.Errors, e => e.StartsWith("t1/orders/Alashiya:"));
    }

    [Fact]
    public async Task A_reply_with_the_wrong_types_gets_the_retry_with_what_was_wrong()
    {
        var (runner, folder) = Game();
        using var stop = new CancellationTokenSource();
        var answering = Answer(folder, (stem, _) => stem == "t1_orders_Alashiya"
            ? """{"notes":"x","units":["enkomi -> cilicia"],"letters":[],"other_orders":[{"action":"fly","province":"","power":"","person":"","amount":0,"text":"","item":"","seals":[]}]}"""
            : HoldEverything, stop.Token);
        await runner.PlayTurnAsync();
        stop.Cancel();
        await answering;
        Assert.Empty(runner.Errors);
        var retry = await File.ReadAllTextAsync(Path.Combine(folder, "t1_orders_Alashiya.retry.request.md"));
        Assert.Contains("reply.units[0] should be an object", retry);
        Assert.Contains("reply.other_orders[0].action must be one of", retry);
    }

    [Fact]
    public void A_reply_wrapped_in_a_code_fence_or_a_stray_line_is_still_read()
    {
        Assert.NotNull(FileExchange.Lenient("```json\n" + HoldEverything + "\n```"));
        Assert.NotNull(FileExchange.Lenient("Here are my orders:\n" + HoldEverything));
        Assert.Null(FileExchange.Lenient("no orders this season"));
        Assert.Null(FileExchange.Lenient("{ broken"));
    }

    [Fact]
    public async Task A_seat_that_never_answers_times_out_into_the_script_king()
    {
        var (runner, _) = Game(timeoutSeconds: 1);
        await runner.PlayTurnAsync();
        Assert.Contains(runner.Errors, e => e.StartsWith("t1/orders/Alashiya:") && e.Contains("no reply"));
    }

    [Fact]
    public async Task A_file_seat_s_schedule_and_standing_orders_are_read_and_bound_to_its_units()
    {
        var (runner, folder) = Game();
        using var stop = new CancellationTokenSource();
        string? request = null;
        var answering = Answer(folder, (stem, text) =>
        {
            if (stem == "t1_orders_Alashiya") request = text;
            return stem.Contains("orders")
                ? """
                  {"notes":"Plan ahead.","units":[],"letters":[],"other_orders":[],"sleep":{"wake_in_turn":0,"wake_on":[]},
                   "schedule":[{"turn":3,"units":[{"unit":"enkomi","order":"move","target":"cilicia","to":""}],"other_orders":[]}],
                   "standing_orders":[{"when":"unit_attacked","province":"enkomi","power":"","units":[{"unit":"enkomi","order":"hold","target":"","to":""}],"other_orders":[]}],
                   "cancel_standing":[]}
                  """
                : """{"speech":"Welcome.","gift_to_envoy":0,"gift_request":"","offer_service_wage":0,"seal_tablet":false,"detain_envoy":false,"send_gold_back":0,"gold_back_purity":100,"end_audience":true}""";
        }, stop.Token);
        await runner.PlayTurnAsync();
        stop.Cancel();
        await answering;

        Assert.Contains("\"standing_orders\"", request);
        Assert.Contains("\"cancel_standing\"", request);
        // Read the first time (no retry), and bound to the fleet that stood in Enkomi when the orders were given.
        Assert.False(File.Exists(Path.Combine(folder, "t1_orders_Alashiya.retry.request.md")));
        Assert.Empty(runner.Errors);
        var fleet = runner.State.Units.Single(u => u.Power == Power.Alashiya);
        var sleep = runner.State.Sleep[Power.Alashiya];
        var scheduled = Assert.Single(sleep.Scheduled);
        Assert.Equal((3, fleet.Id), (scheduled.Turn, scheduled.UnitId));
        var standing = Assert.Single(sleep.Standing);
        Assert.Equal(("s1", StandingWhen.UnitAttacked, fleet.Id), (standing.Id, standing.When, standing.UnitId));
        Assert.Contains("- s1: when your fleet now in enkomi is attacked, then: the fleet now in enkomi holds", Prompts.Situation(Views.For(runner.State, Power.Alashiya)));
    }

    [Fact]
    public async Task A_file_seat_sleeps_by_default_and_replays_exactly()
    {
        // Sleeping seats are on by default: nothing here switches them on.
        var (runner, folder) = Game(new GameConfig { CatastropheChance = 0 });
        using var stop = new CancellationTokenSource();
        var requests = new Dictionary<string, string>();
        var answering = Answer(folder, (stem, text) =>
        {
            lock (requests) requests[stem] = text;
            return stem.Contains("orders")
                ? stem.StartsWith("t2_")
                    ? """{"notes":"Wake me next season.","units":[],"letters":[],"other_orders":[],"sleep":{"wake_in_turn":3,"wake_on":[{"trigger":"troops_enter","province":"tamassos","person":"","amount":0,"power":""}]},"schedule":[]}"""
                    : """{"notes":"Sleep.","units":[],"letters":[],"other_orders":[],"sleep":{"wake_in_turn":0,"wake_on":[]},"schedule":[]}"""
                : """{"speech":"Welcome.","gift_to_envoy":0,"gift_request":"","offer_service_wage":0,"seal_tablet":false,"detain_envoy":false,"send_gold_back":0,"gold_back_purity":100,"end_audience":true}""";
        }, stop.Token);
        for (var i = 0; i < 7; i++) await runner.PlayTurnAsync();
        stop.Cancel();
        await answering;

        // The script kings of seed 8 send Egypt's envoy to Alashiya at once: it wakes the sleeping king in turn 2. The
        // king then names turn 3, and nothing concerns it in turn 5.
        string Decision(string stem) => requests[stem].ReplaceLineEndings("\n").Split("## THIS DECISION\n\n")[1];
        Assert.Contains("YOU SLEEP BETWEEN YOUR ORDERS", requests["t1_orders_Alashiya"]);
        Assert.Contains("\"wake_in_turn\"", requests["t1_orders_Alashiya"]);
        Assert.StartsWith("This is your first season.\n", Decision("t1_orders_Alashiya"));
        // (A script king's fleet also ends a move next to Enkomi that season, which wakes it too.)
        const string woken = "You gave orders last season (turn 1). You were woken because: an envoy of Egypt waits to be received";
        Assert.StartsWith(woken, Decision(requests.Keys.First(k => k.StartsWith("t2_aud_", StringComparison.Ordinal))));
        Assert.StartsWith(woken, Decision("t2_orders_Alashiya"));
        Assert.StartsWith("You gave orders last season (turn 2). You were woken because: you asked to be woken in turn 3.\n", Decision("t3_orders_Alashiya"));
        Assert.DoesNotContain("t5_orders_Alashiya", requests.Keys);

        var replay = GameRunner.ForReplay(GameLog.FromJsonl(runner.Log.ToJsonl()));
        await replay.PrepareAsync();
        for (var i = 0; i < 7; i++) await replay.PlayTurnAsync();
        Assert.Equal(Json.Hash(runner.State), Json.Hash(replay.State));
    }
}
