using Amarna.Engine;
using Amarna.Game;
using Amarna.Game.Batch;
using Amarna.Game.Bots;

namespace Amarna.Game.Tests;

public class SaveVersionTests
{
    /// <summary>A script king in a seat that may sleep, so a game with sleeping seats on has sleepers to replay.</summary>
    private sealed class SleepyScript(ScriptLeader inner) : ISeat
    {
        public string Label => "Sleepy script";
        public bool CanSleep => true;
        public Task<TurnSubmission> DecideAsync(SeatView view, CancellationToken ct) => inner.DecideAsync(view, ct);
        public Task<HostReply> HostAudienceAsync(AudienceView view, SeatView court, CancellationToken ct) => inner.HostAudienceAsync(view, court, ct);
    }

    private static async Task<GameLog> PlayedLog(ulong seed, int turns)
    {
        var state = GameFactory.NewGame(seed);
        var seats = Powers.All.ToDictionary(p => p, _ => (ISeat)new ScriptLeader(seed));
        var r = new GameRunner(state, seats, new ScriptMind(), new TemplateNarrator()) { WriteChronicles = false };
        await r.PrepareAsync();
        for (var i = 0; i < turns; i++) await r.PlayTurnAsync();
        return GameLog.FromJsonl(r.Log.ToJsonl());
    }

    [Fact]
    public async Task New_games_are_saved_under_the_current_version()
    {
        Assert.Equal(5, GameState.CurrentVersion);
        Assert.Equal(GameState.CurrentVersion, GameFactory.NewGame(1).Version);
        var log = await PlayedLog(4, 1);
        Assert.Equal(GameState.CurrentVersion, log.Header.Version);
        Assert.Null(GameRunner.VersionProblem(log.Header));
    }

    /// <summary>
    /// Version 3 is the one before item 4's fix (d), when every kind of object took its id from one shared counter; version
    /// 4 the one before the fix pass, when script envoys kept nothing from small lots of gold.
    /// </summary>
    [Theory]
    [InlineData(1)]
    [InlineData(3)]
    [InlineData(4)]
    public async Task A_log_saved_under_an_earlier_version_is_neither_replayed_nor_continued(int version)
    {
        var log = await PlayedLog(4, 2);
        log.Header.Version = version;
        var old = GameLog.FromJsonl(log.ToJsonl());
        var message = $"This game was saved under an earlier version of the rules (version {version}) and cannot be replayed by this version.";

        Assert.Equal(message, GameRunner.VersionProblem(old.Header));
        Assert.Equal(message, Assert.Throws<SaveVersionException>(() => GameRunner.ForReplay(old)).Message);
        var seats = Powers.All.ToDictionary(p => p, _ => (ISeat)new ScriptLeader(4));
        Assert.Equal(message, Assert.Throws<SaveVersionException>(() => GameRunner.Resume(old, seats, new ScriptMind(), new TemplateNarrator())).Message);
        Assert.Throws<SaveVersionException>(() => new GameRunner(GameFactory.NewGame(4), seats, new ScriptMind(), new TemplateNarrator(), replay: old));

        // Only for analysis, and only when asked: an old log can still be fed through the current rules.
        Assert.NotNull(GameRunner.ForReplay(old, anyVersion: true));
    }

    [Fact]
    public async Task Seeds_replay_exactly_within_the_current_version_with_sleep_on_and_off()
    {
        foreach (var sleeping in new[] { false, true })
            for (ulong seed = 1; seed <= 2; seed++)
            {
                var summary = await BatchRunner.PlayAsync(seed, st =>
                {
                    var bot = new ScriptLeader(st.Seed);
                    // With sleep on, two kings sit in seats that may sleep; the rest are script kings, who never do.
                    var seats = Powers.All.ToDictionary(p => p, p => sleeping && p is Power.Babylonia or Power.Alashiya ? new SleepyScript(bot) : (ISeat)bot);
                    return new GameRunner(st, seats, new ScriptMind(), new TemplateNarrator()) { WriteChronicles = false };
                }, verifyReplay: true, config: new GameConfig { SleepingSeats = sleeping, MaxTurns = 12 });
                Assert.True(summary.ReplayMatches, $"seed {seed}, sleep {(sleeping ? "on" : "off")}");
            }
    }
}
