using Amarna.Engine;
using Amarna.Game.Bots;
using Amarna.Llm;

namespace Amarna.Game.Tests;

/// <summary>
/// A log writes each decision's line once and keeps it (the browser saves the whole log every season): the text it
/// writes as a game goes on must be exactly the text a log holding the same record writes from scratch.
/// </summary>
public class LogTextTests
{
    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task The_log_written_season_by_season_is_the_log_written_at_once(bool models)
    {
        var state = GameFactory.NewGame(8, new GameConfig { MinTurns = 6, EndChance = 1.0 });
        GameRunner? runner = null;
        var choices = new SeatChoices();
        if (models)
        {
            choices.Leaders[Power.Egypt] = LeaderKind.Haiku;
            choices.Characters = CharacterKind.Haiku;
        }
        var set = SeatSetup.Build(choices, state, "sk-ant-test-0000", browser: true, () => runner!.Log, new SimulatedAnthropic());
        runner = new GameRunner(state, set.Seats, set.Minds, set.Narrator);

        static void Same(GameLog log)
        {
            var text = log.ToJsonl();
            // A log read back from the text has written no line yet, so it writes every line afresh.
            Assert.Equal(GameLog.FromJsonl(text).ToJsonl(), text);
            Assert.Equal(text, log.ToJsonl());
        }

        await runner.PrepareAsync();
        Same(runner.Log);
        while (await runner.PlayTurnAsync()) Same(runner.Log);
        Same(runner.Log);
        Assert.Equal(models, runner.Log.Calls.Count > 0);
    }

    [Fact]
    public async Task A_log_read_back_and_continued_writes_the_same_text()
    {
        var first = new GameRunner(GameFactory.NewGame(4), Powers.All.ToDictionary(p => p, _ => (ISeat)new ScriptLeader(4)), new ScriptMind(), new TemplateNarrator());
        await first.PrepareAsync();
        for (var i = 0; i < 3; i++) await first.PlayTurnAsync();
        var log = GameLog.FromJsonl(first.Log.ToJsonl());
        log.ToJsonl();
        log.Record("t9/test", new MindReply { Text = "a line written after the log was read back" });
        Assert.Equal(GameLog.FromJsonl(log.ToJsonl()).ToJsonl(), log.ToJsonl());
        Assert.Contains("a line written after the log was read back", log.ToJsonl());
    }
}
