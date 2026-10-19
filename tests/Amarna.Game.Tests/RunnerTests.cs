using Amarna.Engine;
using Amarna.Game;
using Amarna.Game.Batch;
using Amarna.Game.Bots;

namespace Amarna.Game.Tests;

public class RunnerTests
{
    private static GameRunner Scripted(ulong seed)
    {
        var state = GameFactory.NewGame(seed);
        var seats = Powers.All.ToDictionary(p => p, _ => (ISeat)new ScriptLeader(seed));
        return new GameRunner(state, seats, new ScriptMind(), new TemplateNarrator());
    }

    [Fact]
    public async Task Script_games_finish_and_replay_exactly()
    {
        for (ulong seed = 1; seed <= 5; seed++)
        {
            var summary = await BatchRunner.PlayAsync(seed, s => new GameRunner(s, Powers.All.ToDictionary(p => p, _ => (ISeat)new ScriptLeader(seed)), new ScriptMind(), new TemplateNarrator()), verifyReplay: true);
            Assert.True(summary.ReplayMatches, $"seed {seed}");
            Assert.True(summary.Turns >= 15);
            Assert.NotEmpty(summary.Winners);
        }
    }

    [Fact]
    public async Task A_character_that_belongs_to_no_court_summarizes_its_memory_as_any_other()
    {
        var r = Scripted(2);
        var wanderer = r.State.Characters.First(c => c.Status == CharacterStatus.Free);
        // Free and on the road: no employer, and at no court.
        (wanderer.At, wanderer.Duty, wanderer.HeldBy) = (null, Duty.None, null);
        for (var i = 1; i <= 13; i++) wanderer.Remember(i, $"I walked on, season {i}.");
        await r.PrepareAsync();
        await r.PlayTurnAsync();
        Assert.Contains("I walked on, season 1.", wanderer.MemorySummary);
        Assert.True(wanderer.Memory.Count < 13);
    }

    [Fact]
    public async Task Script_characters_summarize_their_memories_and_replays_still_match()
    {
        var summary = await BatchRunner.PlayAsync(14, s => new GameRunner(s, Powers.All.ToDictionary(p => p, _ => (ISeat)new ScriptLeader(14)), new ScriptMind(), new TemplateNarrator()), verifyReplay: true,
            config: new GameConfig { MinTurns = 30, EndChance = 1.0 });
        Assert.True(summary.ReplayMatches);

        var r = Scripted(14);
        for (var i = 0; i < 30 && !r.State.Ended; i++) await r.PlayTurnAsync();
        Assert.All(r.State.Characters, c => Assert.True(c.Memory.Count <= r.State.Config.MemoryKeep + 8));
        Assert.Contains(r.State.Characters, c => c.MemorySummary.Length > 0);
    }

    [Fact]
    public async Task Snapshots_allow_rewinding_to_any_turn()
    {
        var r = Scripted(9);
        await r.PrepareAsync();
        for (var i = 0; i < 5; i++) await r.PlayTurnAsync();
        Assert.Equal(6, r.Snapshots.Count);
        Assert.Equal(1, r.StateAt(0)!.Turn);
        Assert.Equal(4, r.StateAt(3)!.Turn);
    }

    [Fact]
    public async Task A_saved_game_resumes_with_live_seats()
    {
        var r = Scripted(12);
        await r.PrepareAsync();
        for (var i = 0; i < 4; i++) await r.PlayTurnAsync();
        var log = GameLog.FromJsonl(r.Log.ToJsonl());

        var seats = Powers.All.ToDictionary(p => p, _ => (ISeat)new ScriptLeader(12));
        var resumed = GameRunner.Resume(log, seats, new ScriptMind(), new TemplateNarrator());
        await resumed.PrepareAsync();
        for (var i = 0; i < 4; i++) await resumed.PlayTurnAsync();
        Assert.Equal(Json.Hash(r.State), Json.Hash(resumed.State));
        await resumed.PlayTurnAsync();
        Assert.Equal(6, resumed.State.Turn);
    }

    [Fact]
    public async Task A_human_seat_waits_for_orders_and_answers()
    {
        var state = GameFactory.NewGame(21);
        var human = new HumanSeat(Power.Egypt);
        var seats = Powers.All.ToDictionary(p => p, p => p == Power.Egypt ? human : (ISeat)new ScriptLeader(21));
        var r = new GameRunner(state, seats, new ScriptMind(), new TemplateNarrator());
        var turn = r.PlayTurnAsync();
        for (var i = 0; i < 100 && human.PendingOrders is null; i++) await Task.Delay(10);
        Assert.NotNull(human.PendingOrders);
        Assert.False(turn.IsCompleted);
        human.SubmitOrders(new TurnSubmission { Orders = [new MoveOrder("memphis", "sinai")] });
        await turn;
        Assert.Equal(Power.Egypt, state.UnitAt("sinai")?.Power);
    }

    [Fact]
    public async Task Signals_are_detected_in_script_games()
    {
        var r = Scripted(3);
        while (await r.PlayTurnAsync()) { }
        var counts = SignalDetector.Count(r.State);
        Assert.True(counts.GetValueOrDefault("tablet-sealed") > 0);
    }
}
