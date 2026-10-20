using System.Net;
using System.Text;
using System.Text.Json.Nodes;
using Amarna.Engine;
using Amarna.Game;
using Amarna.Game.Bots;
using Amarna.Llm;

namespace Amarna.Game.Tests;

/// <summary>
/// Local play on a Claude subscription: kings played by local agents, whose requests go through the local bridge
/// (sim/bridge.js) into their folders. The bridge here is a stand-in with the same endpoints over temporary folders.
/// </summary>
public class LocalPlayTests
{
    static LocalPlayTests() => LocalBridge.Poll = TimeSpan.FromMilliseconds(20);

    private const string HoldEverything = """{"notes":"Hold fast.","units":[],"letters":[],"other_orders":[]}""";
    private const string Welcome = """{"speech":"Welcome.","gift_to_envoy":0,"gift_request":"","offer_service_wage":0,"seal_tablet":false,"detain_envoy":false,"send_gold_back":0,"gold_back_purity":100,"end_audience":true}""";

    /// <summary>The bridge's endpoints, as sim/bridge.js serves them, over one temporary folder per king.</summary>
    private sealed class FakeBridge : HttpMessageHandler
    {
        public Dictionary<Power, string> Folders { get; } = new();
        public List<string> Withdrawn { get; } = new();
        public bool Down { get; set; }

        public FakeBridge(params Power[] kings)
        {
            foreach (var k in kings) Folders[k] = Directory.CreateTempSubdirectory("amarna-bridge-").FullName;
        }

        public string ReplyPath(Power seat, string name) => Path.Combine(Folders[seat], name + ".reply.json").Replace('\\', '/');

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
        {
            if (Down) throw new HttpRequestException("No connection could be made because the target machine actively refused it.");
            var path = request.RequestUri!.AbsolutePath;
            if (request.Method == HttpMethod.Get && path == "/status")
                return Answer(new JsonObject { ["bridge"] = "amarna-letters", ["version"] = 1, ["seats"] = new JsonArray(Folders.Keys.Select(k => (JsonNode)k.ToString()).ToArray()) });
            if (request.Method == HttpMethod.Get && path == "/reply")
            {
                var query = System.Web.HttpUtility.ParseQueryString(request.RequestUri.Query);
                var seat = Enum.Parse<Power>(query["seat"]!);
                var name = query["name"]!;
                var folder = Folders[seat];
                if (!File.Exists(Path.Combine(folder, name + ".request.md"))) return new HttpResponseMessage(HttpStatusCode.NotFound);
                var reply = Path.Combine(folder, name + ".reply.json");
                if (!File.Exists(reply)) return new HttpResponseMessage(HttpStatusCode.NoContent);
                return new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent(await File.ReadAllTextAsync(reply, ct)) };
            }
            var body = JsonNode.Parse(await request.Content!.ReadAsStringAsync(ct))!.AsObject();
            var who = Enum.Parse<Power>(body["seat"]!.GetValue<string>());
            var stem = body["name"]!.GetValue<string>();
            if (path == "/cancel")
            {
                lock (Withdrawn) Withdrawn.Add(stem);
                File.Delete(Path.Combine(Folders[who], stem + ".request.md"));
                return Answer(new JsonObject { ["ok"] = true });
            }
            var text = body["text"]!.GetValue<string>();
            var mark = body["mark"]!.GetValue<string>();
            Assert.Equal(text.IndexOf(mark, StringComparison.Ordinal), text.LastIndexOf(mark, StringComparison.Ordinal));
            var full = text.Replace(mark, ReplyPath(who, stem));
            var replyFile = Path.Combine(Folders[who], stem + ".reply.json");
            if (File.Exists(replyFile)) File.Delete(replyFile);
            // As the bridge does: whole, through a temporary file, so that no reader sees half a request.
            var requestFile = Path.Combine(Folders[who], stem + ".request.md");
            await File.WriteAllTextAsync(requestFile + ".tmp", full, Encoding.UTF8, ct);
            File.Move(requestFile + ".tmp", requestFile, overwrite: true);
            return Answer(new JsonObject { ["ok"] = true, ["chars"] = full.Length });
        }

        private static HttpResponseMessage Answer(JsonObject o) =>
            new(HttpStatusCode.OK) { Content = new StringContent(o.ToJsonString(), Encoding.UTF8, "application/json") };
    }

    /// <summary>The stand-in for the king agents: answers every request that appears in the bridge's folders.</summary>
    private static async Task Answer(FakeBridge bridge, Func<string, string, string?> reply, CancellationToken ct)
    {
        var answered = new HashSet<string>();
        while (!ct.IsCancellationRequested)
        {
            foreach (var folder in bridge.Folders.Values)
                foreach (var request in Directory.GetFiles(folder, "*.request.md"))
                {
                    if (!answered.Add(request)) continue;
                    var stem = Path.GetFileName(request)[..^".request.md".Length];
                    try
                    {
                        var text = await File.ReadAllTextAsync(request, ct);
                        if (reply(stem, text) is not { } json) continue;
                        var tmp = Path.Combine(folder, stem + ".answer.tmp");
                        await File.WriteAllTextAsync(tmp, json, ct);
                        File.Move(tmp, Path.Combine(folder, stem + ".reply.json"), overwrite: true);
                    }
                    catch (IOException)
                    {
                        // Taken back or still being moved: look again on the next pass.
                        answered.Remove(request);
                    }
                }
            try { await Task.Delay(20, ct); } catch (OperationCanceledException) { }
        }
    }

    private static SeatChoices Choices(params Power[] local)
    {
        var c = new SeatChoices();
        foreach (var p in local) c.Leaders[p] = LeaderKind.LocalAgent;
        return c;
    }

    private static GameRunner Game(FakeBridge bridge, GameConfig? config = null, int minutes = 5)
    {
        var state = GameFactory.NewGame(8, config ?? new GameConfig { CatastropheChance = 0 });
        var choices = Choices([.. bridge.Folders.Keys]);
        choices.LocalAgentMinutes = minutes;
        GameRunner? runner = null;
        var set = SeatSetup.Build(choices, state, apiKey: null, browser: true, () => runner!.Log, bridgeHandler: bridge);
        runner = new GameRunner(state, set.Seats, set.Minds, set.Narrator) { WriteChronicles = false };
        return runner;
    }

    [Fact]
    public async Task A_local_agent_king_gets_exactly_what_a_file_seat_gets_and_plays_the_reply()
    {
        var bridge = new FakeBridge(Power.Alashiya);
        var runner = Game(bridge);
        using var stop = new CancellationTokenSource();
        var answering = Answer(bridge, (stem, _) => stem.Contains("orders")
            ? """{"notes":"Buy the copper coast.","units":[{"unit":"enkomi","order":"move","target":"cilicia","to":""}],"letters":[],"other_orders":[]}"""
            : Welcome, stop.Token);
        await runner.PlayTurnAsync();
        stop.Cancel();
        await answering;

        var request = await File.ReadAllTextAsync(Path.Combine(bridge.Folders[Power.Alashiya], "t1_orders_Alashiya.request.md"));
        Assert.StartsWith(FileExchange.Heading, request);
        Assert.DoesNotContain("t1/orders/Alashiya", request);
        Assert.Contains("Decide as the king", request);
        Assert.Contains("Great King of Alashiya", request);
        Assert.Contains($"to: {bridge.ReplyPath(Power.Alashiya, "t1_orders_Alashiya")}", request);
        Assert.EndsWith(FileExchange.Footer, request.TrimEnd());
        Assert.Contains(runner.State.Units, u => u.Power == Power.Alashiya && u.Province == "cilicia");
        Assert.Empty(runner.Errors);
        var call = Assert.Single(runner.Log.Calls, c => c.Key == "t1/orders/Alashiya");
        Assert.Equal(BridgeExchange.Model, call.Model);
        Assert.Equal(request.Length, call.RequestChars);
        Assert.Equal(SeatSetup.LocalAgentLabel, runner.Log.Header.Seats[Power.Alashiya]);

        // The same game with a file seat writes the same request, word for word, but for the folder it names.
        var folder = Directory.CreateTempSubdirectory("amarna-fileseat-").FullName;
        var state = GameFactory.NewGame(8, new GameConfig { CatastropheChance = 0 });
        GameRunner? file = null;
        var exchange = new FileExchange(folder, TimeSpan.FromMinutes(5), c => file!.Log.AddCall(c));
        var script = new ScriptLeader(8);
        var seats = Powers.All.ToDictionary(p => p, p => p == Power.Alashiya
            ? new LlmLeaderSeat(p, exchange, "file", "medium", state.Config.CustomsPrimer, state.Config, label: "File seat")
            : (ISeat)script);
        file = new GameRunner(state, seats, new ScriptMind(), new TemplateNarrator()) { WriteChronicles = false };
        using var stop2 = new CancellationTokenSource();
        var fileAnswers = Task.Run(async () =>
        {
            while (!stop2.IsCancellationRequested)
            {
                foreach (var r in Directory.GetFiles(folder, "*.request.md"))
                {
                    var reply = r[..^".request.md".Length] + ".reply.json";
                    if (!File.Exists(reply)) await File.WriteAllTextAsync(reply, r.Contains("orders") ? HoldEverything : Welcome);
                }
                try { await Task.Delay(20, stop2.Token); } catch (OperationCanceledException) { }
            }
        });
        await file.PlayTurnAsync();
        stop2.Cancel();
        await fileAnswers;
        var fileRequest = await File.ReadAllTextAsync(Path.Combine(folder, "t1_orders_Alashiya.request.md"));
        Assert.Equal(fileRequest.Replace(Path.GetFullPath(folder).Replace('\\', '/'), "FOLDER"),
            request.Replace(bridge.Folders[Power.Alashiya].Replace('\\', '/'), "FOLDER"));
    }

    [Fact]
    public async Task An_unreadable_reply_gets_one_retry_through_the_bridge()
    {
        var bridge = new FakeBridge(Power.Alashiya);
        var runner = Game(bridge);
        using var stop = new CancellationTokenSource();
        var answering = Answer(bridge, (stem, _) => stem switch
        {
            "t1_orders_Alashiya" => "this is not json",
            "t1_orders_Alashiya.retry" => HoldEverything,
            _ => Welcome,
        }, stop.Token);
        await runner.PlayTurnAsync();
        stop.Cancel();
        await answering;
        Assert.Empty(runner.Errors);
        var retry = await File.ReadAllTextAsync(Path.Combine(bridge.Folders[Power.Alashiya], "t1_orders_Alashiya.retry.request.md"));
        Assert.Contains("could not be read", retry);
        Assert.Contains($"to: {bridge.ReplyPath(Power.Alashiya, "t1_orders_Alashiya.retry")}", retry);
    }

    [Fact]
    public async Task An_agent_that_never_answers_times_out_into_the_script_and_its_request_is_taken_back()
    {
        var bridge = new FakeBridge(Power.Alashiya);
        var local = new LocalBridge("localhost:5190", TimeSpan.FromMilliseconds(300), bridge);
        var seat = new BridgeExchange(local, Power.Alashiya);
        var spec = new CallSpec
        {
            Key = "t4/orders/Alashiya", Turn = 4, Role = "leader:Alashiya", Model = BridgeExchange.Model, SharedSystem = "Rules.", User = "Your orders.",
            Schema = JsonNode.Parse("""{"type":"object","properties":{"notes":{"type":"string"}}}""")!.AsObject(),
        };
        var ex = await Assert.ThrowsAsync<TimeoutException>(() => seat.AskJsonAsync(spec, CancellationToken.None));
        Assert.Contains("Alashiya", ex.Message);
        await Task.Delay(200);
        Assert.Contains("t4_orders_Alashiya", bridge.Withdrawn);
        Assert.False(File.Exists(Path.Combine(bridge.Folders[Power.Alashiya], "t4_orders_Alashiya.request.md")));
    }

    [Fact]
    public async Task A_stopped_game_takes_its_waiting_requests_back()
    {
        var bridge = new FakeBridge(Power.Hatti);
        var local = new LocalBridge(LocalBridge.DefaultAddress, TimeSpan.FromMinutes(5), bridge);
        var seat = new BridgeExchange(local, Power.Hatti);
        var spec = new CallSpec
        {
            Key = "t2/aud/a7/host/1", Turn = 2, Role = "host:Hatti", Model = BridgeExchange.Model, SharedSystem = "Rules.", User = "An envoy waits.",
            Schema = JsonNode.Parse("""{"type":"object","properties":{"speech":{"type":"string"}}}""")!.AsObject(),
        };
        using var stop = new CancellationTokenSource();
        var asking = seat.AskJsonAsync(spec, stop.Token);
        var request = Path.Combine(bridge.Folders[Power.Hatti], "t2_aud_a7_host_1.request.md");
        for (var i = 0; i < 100 && !File.Exists(request); i++) await Task.Delay(20);
        Assert.True(File.Exists(request));
        stop.Cancel();
        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => asking);
        for (var i = 0; i < 100 && bridge.Withdrawn.Count == 0; i++) await Task.Delay(20);
        Assert.Equal(["t2_aud_a7_host_1"], bridge.Withdrawn);
        Assert.False(File.Exists(request));
    }

    [Fact]
    public async Task The_bridge_check_says_what_is_wrong()
    {
        var bridge = new FakeBridge(Power.Hatti, Power.Egypt);
        var ok = await LocalBridge.CheckAsync(LocalBridge.DefaultAddress, [Power.Hatti, Power.Egypt], bridge);
        Assert.True(ok.Ready);
        Assert.True(ok.Seats.ToHashSet().SetEquals([Power.Hatti, Power.Egypt]));

        var missing = await LocalBridge.CheckAsync(LocalBridge.DefaultAddress, [Power.Hatti, Power.Mitanni], bridge);
        Assert.True(missing.Running);
        Assert.False(missing.Ready);
        Assert.Contains("Mitanni", missing.Problem);
        Assert.Contains("sim/setup.js", missing.Problem);

        bridge.Down = true;
        var down = await LocalBridge.CheckAsync(LocalBridge.DefaultAddress, [Power.Hatti], bridge);
        Assert.False(down.Running);
        Assert.Contains("node sim/bridge.js", down.Problem);
        Assert.Contains("not on the published site", down.Problem);
    }

    [Fact]
    public void Local_agent_kings_need_no_key_and_come_back_from_a_saved_game()
    {
        var c = Choices(Power.Hatti, Power.Egypt);
        c.Leaders[Power.Alashiya] = LeaderKind.Human;
        Assert.False(c.UsesModels);
        Assert.True(c.UsesLocalAgents);
        Assert.Equal(0, CostEstimate.PerGame(c));
        c.BridgeAddress = "http://127.0.0.1:6001";
        c.LocalAgentMinutes = 30;
        var copy = c.Copy();
        Assert.Equal("http://127.0.0.1:6001", copy.BridgeAddress);
        Assert.Equal(30, copy.LocalAgentMinutes);

        var state = GameFactory.NewGame(8, new GameConfig());
        var set = SeatSetup.Build(c, state, apiKey: null, browser: true, () => new GameLog());
        Assert.Equal(SeatSetup.LocalAgentLabel, set.Seats[Power.Hatti].Label);
        Assert.True(set.Seats[Power.Hatti].CanSleep);
        var header = new LogHeader { Seats = set.Seats.ToDictionary(x => x.Key, x => x.Value.Label) };
        var back = SeatSetup.FromHeader(header);
        Assert.Equal(LeaderKind.LocalAgent, back.Leaders[Power.Hatti]);
        Assert.Equal(LeaderKind.LocalAgent, back.Leaders[Power.Egypt]);
        Assert.Equal(LeaderKind.Human, back.Leaders[Power.Alashiya]);
        Assert.Equal(LeaderKind.Script, back.Leaders[Power.Mitanni]);

        // The preset is offered only where the bridge can be reached (the web app on this computer), so it is not in All.
        Assert.DoesNotContain(Presets.Local, Presets.All);
        Assert.False(Presets.Local.NeedsKey);
        Presets.Local.ApplyTo(c);
        Assert.Equal(LeaderKind.Human, c.Leaders[Power.Alashiya]);
        Assert.All(Powers.All.Where(p => p != Power.Alashiya), p => Assert.Equal(LeaderKind.LocalAgent, c.Leaders[p]));
        Assert.True(Presets.Local.Matches(c));
    }

    [Fact]
    public async Task A_game_with_local_agent_kings_sleeps_by_default_and_replays_exactly()
    {
        var bridge = new FakeBridge(Power.Alashiya, Power.Mitanni);
        var runner = Game(bridge);
        using var stop = new CancellationTokenSource();
        var asked = new List<string>();
        var answering = Answer(bridge, (stem, _) =>
        {
            lock (asked) asked.Add(stem);
            return stem.Contains("orders")
                ? """{"notes":"Sleep.","units":[],"letters":[],"other_orders":[],"schedule":[]}"""
                : Welcome;
        }, stop.Token);
        for (var i = 0; i < 4; i++) await runner.PlayTurnAsync();
        stop.Cancel();
        await answering;
        Assert.Empty(runner.Errors);
        // Asleep after the first orders, a king is asked again only when something concerns it.
        Assert.Contains("t1_orders_Alashiya", asked);
        Assert.True(asked.Count(s => s.Contains("_orders_")) < 8, string.Join(", ", asked));

        var replay = GameRunner.ForReplay(GameLog.FromJsonl(runner.Log.ToJsonl()));
        await replay.PrepareAsync();
        for (var i = 0; i < 4; i++) await replay.PlayTurnAsync();
        Assert.Equal(Json.Hash(runner.State), Json.Hash(replay.State));
    }
}
