using Amarna.Engine;
using Amarna.Game;
using Amarna.Llm;
using Xunit.Abstractions;

namespace Amarna.Game.Tests;

public class PresetTests(ITestOutputHelper output)
{
    private static SeatChoices With(Preset p, Power? human = null)
    {
        var c = new SeatChoices();
        if (human is { } h) c.Leaders[h] = LeaderKind.Human;
        p.ApplyTo(c);
        return c;
    }

    [Fact]
    public void Presets_keep_the_players_own_seat()
    {
        var c = With(Presets.Showcase, Power.Egypt);
        Assert.Equal(LeaderKind.Human, c.Leaders[Power.Egypt]);
        Assert.All(Powers.All.Where(p => p != Power.Egypt), p => Assert.Equal(LeaderKind.Opus, c.Leaders[p]));
        Assert.Equal(CharacterKind.Haiku, c.Characters);
        Assert.Equal(NarratorKind.Opus, c.Narrator);
        Assert.Same(Presets.Showcase, Presets.Matching(c));

        c.Leaders[Power.Hatti] = LeaderKind.Sonnet;
        Assert.Null(Presets.Matching(c));
    }

    [Fact]
    public void Only_the_free_preset_works_without_a_key()
    {
        Assert.False(Presets.Free.NeedsKey);
        Assert.False(With(Presets.Free).UsesModels);
        Assert.All(Presets.All.Where(p => p != Presets.Free), p => Assert.True(p.NeedsKey));
    }

    [Fact]
    public void Estimates_rise_with_the_models()
    {
        var free = CostEstimate.PerGame(With(Presets.Free));
        var budget = CostEstimate.PerGame(With(Presets.Budget));
        var standard = CostEstimate.PerGame(With(Presets.Standard));
        var showcase = CostEstimate.PerGame(With(Presets.Showcase));
        output.WriteLine($"free {free:0.00}, budget {budget:0.00}, standard {standard:0.00}, showcase {showcase:0.00}");
        Assert.Equal(0, free);
        Assert.InRange(budget, 0.05, 1.0);
        Assert.True(standard > budget * 5);
        Assert.True(showcase > standard * 1.5);
        Assert.Equal("free", CostEstimate.Describe(free));
        Assert.Equal("under $1", CostEstimate.Describe(budget));
        Assert.True(CostEstimate.SuggestedBudget(standard) >= standard);

        var human = CostEstimate.PerGame(With(Presets.Standard, Power.Egypt));
        Assert.True(human < standard);
    }

    [Fact]
    public async Task Haiku_kings_play_through_the_simulated_api()
    {
        var fake = new SimulatedAnthropic();
        var state = GameFactory.NewGame(5, new GameConfig { MinTurns = 2, EndChance = 1.0 });
        GameRunner? runner = null;
        var set = SeatSetup.Build(With(Presets.Budget), state, "sk-ant-test-0000", browser: true, () => runner!.Log, fake);
        runner = new GameRunner(state, set.Seats, set.Minds, set.Narrator);
        while (await runner.PlayTurnAsync()) { }
        Assert.Empty(runner.Errors);
        Assert.All(fake.Requests, r => Assert.Equal(ModelIds.Haiku, r.Body["model"]!.GetValue<string>()));
        Assert.All(fake.Requests, r => Assert.Null(r.Body["fallbacks"]));
        Assert.Equal("Haiku 5.5 leader", runner.Log.Header.Seats[Power.Egypt]);
    }

    [Fact]
    public void Saved_games_remember_who_played_what()
    {
        var c = With(Presets.Showcase, Power.Arzawa);
        c.Leaders[Power.Hatti] = LeaderKind.Haiku;
        c.Characters = CharacterKind.Sonnet;
        var state = GameFactory.NewGame(1);
        GameRunner? runner = null;
        Amarna.Llm.Sdk.AnthropicSdk.Use();
        var set = SeatSetup.Build(c, state, "k", browser: false, () => runner!.Log, new SimulatedAnthropic());
        runner = new GameRunner(state, set.Seats, set.Minds, set.Narrator);
        var back = SeatSetup.FromHeader(GameLog.FromJsonl(runner.Log.ToJsonl()).Header);
        Assert.Equal(c.Leaders, back.Leaders);
        Assert.Equal(c.Characters, back.Characters);
        Assert.Equal(c.Narrator, back.Narrator);
    }
}
