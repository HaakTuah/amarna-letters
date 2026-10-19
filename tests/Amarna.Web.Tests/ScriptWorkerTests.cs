using Amarna.Engine;
using Amarna.Game;
using Amarna.Game.Bots;
using Amarna.Web.Services;

namespace Amarna.Web.Tests;

/// <summary>
/// The script kings and characters of a browser game think in a Web Worker (item 4, phone performance). Here the worker
/// is a host in the same process, reached through the same JSON requests and replies, so these tests show that a game
/// played through it is exactly the game played in the page, and that the page takes over if the worker cannot answer.
/// </summary>
public class ScriptWorkerTests
{
    /// <summary>
    /// The worker, in this process: each request and reply goes through its JSON text, as between the threads, and the
    /// requests are answered one at a time, as the worker answers them.
    /// </summary>
    private sealed class LocalWorker(bool starts = true, int stopAfter = int.MaxValue) : IScriptTransport
    {
        private readonly ScriptHost _host = new();
        private readonly SemaphoreSlim _one = new(1, 1);
        private int _games;

        public int Asked { get; private set; }
        public string? Problem { get; private set; }

        public Task<bool> ReadyAsync() => Task.FromResult(starts);

        public string NewGame(ulong seed) => $"game-{++_games}-{seed}";

        public async Task<ScriptReply?> TryAskAsync(ScriptRequest request, CancellationToken ct)
        {
            await Task.Yield();
            if (!starts) return null;
            var body = ScriptJson.Write(request);
            await _one.WaitAsync(ct);
            try
            {
                if (Asked >= stopAfter)
                {
                    Problem = "stopped for the test";
                    return null;
                }
                Asked++;
                return ScriptJson.ReadReply(_host.Answer(body));
            }
            finally
            {
                _one.Release();
            }
        }
    }

    /// <summary>A game as the browser sets it up for script players: one ScriptLeader for every king, script characters.</summary>
    private static GameRunner InPage(ulong seed, GameConfig? config = null)
    {
        var state = GameFactory.NewGame(seed, config);
        var kings = new ScriptLeader(seed);
        return new GameRunner(state, Powers.All.ToDictionary(p => p, _ => (ISeat)kings), new ScriptMind(), new TemplateNarrator());
    }

    private static (GameRunner Runner, WorkerSeat Kings) ThroughWorker(ulong seed, IScriptTransport worker, GameConfig? config = null)
    {
        var state = GameFactory.NewGame(seed, config);
        var game = worker.NewGame(seed);
        var kings = new WorkerSeat(new ScriptLeader(seed), worker, seed, game);
        var runner = new GameRunner(state, Powers.All.ToDictionary(p => p, _ => (ISeat)kings), new WorkerMind(new ScriptMind(), worker, game), new TemplateNarrator());
        return (runner, kings);
    }

    private static async Task PlayOut(GameRunner runner)
    {
        await runner.PrepareAsync();
        while (await runner.PlayTurnAsync()) { }
    }

    private static Dictionary<string, string> Decisions(GameRunner runner) => runner.Log.Decisions.ToDictionary(d => d.Key, d => d.Json);

    [Theory]
    [InlineData(1UL)]
    [InlineData(2UL)]
    [InlineData(7UL)]
    [InlineData(14UL)]
    public async Task A_game_played_through_the_worker_is_the_game_played_in_the_page(ulong seed)
    {
        var page = InPage(seed);
        await PlayOut(page);
        var worker = new LocalWorker();
        var (through, _) = ThroughWorker(seed, worker);
        await PlayOut(through);

        Assert.True(worker.Asked > 100, $"only {worker.Asked} requests reached the worker");
        Assert.Empty(through.Errors);
        Assert.Equal(Decisions(page), Decisions(through));
        Assert.Equal(Json.Hash(page.State), Json.Hash(through.State));
        Assert.Equal(page.Log.Header.Seats, through.Log.Header.Seats);
        Assert.Equal(page.Log.Header.Minds, through.Log.Header.Minds);
    }

    [Fact]
    public async Task Every_season_is_the_same_season_as_in_the_page()
    {
        var page = InPage(5);
        var (through, _) = ThroughWorker(5, new LocalWorker());
        await page.PrepareAsync();
        await through.PrepareAsync();
        for (var i = 0; i < 12 && !page.State.Ended; i++)
        {
            await page.PlayTurnAsync();
            await through.PlayTurnAsync();
            Assert.Equal(Json.Hash(page.State), Json.Hash(through.State));
        }
    }

    [Fact]
    public async Task Where_no_worker_starts_the_page_plays_the_same_game()
    {
        var page = InPage(3);
        await PlayOut(page);
        var worker = new LocalWorker(starts: false);
        var (through, _) = ThroughWorker(3, worker);
        await PlayOut(through);
        Assert.Equal(0, worker.Asked);
        Assert.Empty(through.Errors);
        Assert.Equal(Json.Hash(page.State), Json.Hash(through.State));
    }

    [Fact]
    public async Task If_the_worker_stops_the_page_takes_over_and_the_game_goes_on()
    {
        var worker = new LocalWorker(stopAfter: 40);
        var (through, kings) = ThroughWorker(4, worker);
        var moved = new List<string>();
        kings.MovedToPage += moved.Add;
        await PlayOut(through);
        Assert.True(through.State.Ended);
        Assert.Empty(through.Errors);
        Assert.Equal(["stopped for the test"], moved);
        Assert.Equal(40, worker.Asked);
    }

    [Fact]
    public async Task A_saved_game_played_through_the_worker_replays_exactly()
    {
        var (through, _) = ThroughWorker(9, new LocalWorker());
        await PlayOut(through);
        var replay = GameRunner.ForReplay(GameLog.FromJsonl(through.Log.ToJsonl()));
        await PlayOut(replay);
        Assert.Equal(Json.Hash(through.State), Json.Hash(replay.State));
    }

    [Fact]
    public void A_new_game_starts_with_fresh_kings()
    {
        var host = new ScriptHost();
        var state = GameFactory.NewGame(6);
        var view = Views.For(state, Power.Hatti);
        string Ask(string game) => host.Answer(ScriptJson.Write(new ScriptRequest { Game = game, Seed = 6, Kind = ScriptRequest.Decide, View = view }));
        var first = Ask("a");
        // The kings of game a remember this season; those of game b have seen nothing, and decide as a's did at first.
        Assert.Equal(first, Ask("b"));
        Assert.Null(ScriptJson.ReadReply(first).Error);
        Assert.NotEmpty(ScriptJson.ReadReply(first).Submission!.Orders);
    }

    [Fact]
    public void A_failing_request_comes_back_as_the_bots_own_error()
    {
        var reply = ScriptJson.ReadReply(new ScriptHost().Answer(ScriptJson.Write(new ScriptRequest { Kind = ScriptRequest.Decide })));
        Assert.NotNull(reply.Error);
        Assert.Null(reply.Submission);
    }
}
