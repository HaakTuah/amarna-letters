using Amarna.Engine;
using Amarna.Game;
using Amarna.Game.Batch;
using Amarna.Game.Bots;

namespace Amarna.Game.Tests;

/// <summary>The script king that stands in for a model or file seat keeps up with it every season, so it remembers.</summary>
public class StandInTests
{
    /// <summary>A model seat that holds every season, then stops answering, and remembers what it was shown.</summary>
    private sealed class Flaky(int failFrom, Func<SeatView, TurnSubmission>? decide = null) : ISeat
    {
        public List<SeatView> Seen { get; } = new();
        public string Label => "Flaky model leader";
        public bool CanSleep => true;

        public Task<TurnSubmission> DecideAsync(SeatView view, CancellationToken ct)
        {
            lock (Seen) Seen.Add(view);
            if (view.Turn >= failFrom) throw new InvalidOperationException("the model did not answer");
            return Task.FromResult(decide?.Invoke(view) ?? new TurnSubmission());
        }

        public Task<HostReply> HostAudienceAsync(AudienceView view, SeatView court, CancellationToken ct) =>
            Task.FromResult(new HostReply { Speech = "Go in peace.", End = true });
    }

    /// <summary>A king who does nothing at all.</summary>
    private sealed class Idle : ISeat
    {
        public string Label => "Idle";
        public Task<TurnSubmission> DecideAsync(SeatView view, CancellationToken ct) => Task.FromResult(new TurnSubmission());
        public Task<HostReply> HostAudienceAsync(AudienceView view, SeatView court, CancellationToken ct) => Task.FromResult(new HostReply { End = true });
    }

    [Fact]
    public async Task The_stand_in_remembers_the_seasons_the_model_played_itself()
    {
        const ulong seed = 3;
        var model = new Flaky(failFrom: 5);
        var state = GameFactory.NewGame(seed, new GameConfig { SleepingSeats = false });
        var seats = Powers.All.ToDictionary(p => p, p => p == Power.Egypt ? model : (ISeat)new ScriptLeader(seed));
        var runner = new GameRunner(state, seats, new ScriptMind(), new TemplateNarrator()) { WriteChronicles = false };
        for (var turn = 1; turn <= 4; turn++)
        {
            await runner.PlayTurnAsync();
            Assert.Equal(turn, runner.StandIn.BrainOf(Power.Egypt)!.Turn);
        }
        await runner.PlayTurnAsync();
        Assert.True(runner.Log.TryGet<TurnSubmission>("t5/orders/Egypt", out var stood) && stood.FromFallback);

        // A script king that read the same four seasons, once each, plays the fifth exactly as the stand-in did.
        var twin = new ScriptLeader(seed);
        foreach (var v in model.Seen.Where(v => v.Turn < 5)) twin.Observe(v);
        var expected = await twin.DecideAsync(model.Seen.Single(v => v.Turn == 5), default);
        Assert.Equal(Json.Serialize(expected.Orders), Json.Serialize(stood.Orders));
        Assert.Equal(expected.Notes, stood.Notes);
    }

    [Fact]
    public async Task The_stand_in_learns_while_the_model_seat_sleeps()
    {
        // Egypt sleeps three seasons among kings who do nothing to wake it; the stand-in reads its view every season all the same.
        var model = new Flaky(failFrom: 99, v => v.Turn == 1 ? new TurnSubmission { Sleep = new SleepRequest { Seasons = 3 } } : new TurnSubmission());
        var state = GameFactory.NewGame(31, new GameConfig { SleepingSeats = true, MaxSleep = 6, MinTurns = 40, CatastropheChance = 0 });
        var seats = Powers.All.ToDictionary(p => p, p => p == Power.Egypt ? model : (ISeat)new Idle());
        var runner = new GameRunner(state, seats, new ScriptMind(), new TemplateNarrator()) { WriteChronicles = false };
        for (var turn = 1; turn <= 5; turn++)
        {
            await runner.PlayTurnAsync();
            Assert.Equal(turn, runner.StandIn.BrainOf(Power.Egypt)!.Turn);
        }
        Assert.True(model.Seen.Count < 5, $"Egypt was asked in turns {string.Join(", ", model.Seen.Select(v => v.Turn))}");
        // Script and idle seats are not watched: they never fall back on the stand-in.
        Assert.Null(runner.StandIn.BrainOf(Power.Hatti));
    }

    [Fact]
    public void Reading_a_season_twice_learns_nothing_more()
    {
        var state = GameFactory.NewGame(8);
        var view = Views.For(state, Power.Babylonia);
        var bot = new ScriptLeader(8);
        bot.Observe(view);
        var brain = bot.BrainOf(Power.Babylonia)!;
        brain.Rel[Power.Assyria].Grudge = 4;
        brain.Rel[Power.Assyria].Trust = -0.4;
        bot.Observe(view);
        Assert.Equal(4, brain.Rel[Power.Assyria].Grudge);
        Assert.Equal(-0.4, brain.Rel[Power.Assyria].Trust);
    }

    [Fact]
    public async Task Games_whose_model_seats_fall_back_replay_exactly()
    {
        foreach (var sleeping in new[] { false, true })
        {
            var summary = await BatchRunner.PlayAsync(4, st =>
            {
                var bot = new ScriptLeader(st.Seed);
                var seats = Powers.All.ToDictionary(p => p, p => p switch
                {
                    Power.Egypt => new Flaky(failFrom: 3),
                    Power.Assyria => new Flaky(failFrom: 6),
                    _ => (ISeat)bot,
                });
                return new GameRunner(st, seats, new ScriptMind(), new TemplateNarrator()) { WriteChronicles = false };
            }, verifyReplay: true, config: new GameConfig { SleepingSeats = sleeping, MaxTurns = 10 });
            Assert.True(summary.ReplayMatches, $"sleeping {sleeping}");
        }
    }
}
