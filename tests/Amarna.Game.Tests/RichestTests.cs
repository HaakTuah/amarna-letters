using Amarna.Engine;
using Amarna.Game;
using Amarna.Game.Batch;
using Amarna.Game.Bots;
using Amarna.Llm;

namespace Amarna.Game.Tests;

/// <summary>The richest characters, ranked at the end of a game where the game's end is shown.</summary>
public class RichestTests
{
    private static GameRunner Script(GameState s) =>
        new(s, Powers.All.ToDictionary(p => p, _ => (ISeat)new ScriptLeader(s.Seed)), new ScriptMind(), new TemplateNarrator()) { WriteChronicles = false };

    [Fact]
    public async Task At_the_end_of_a_game_the_batch_ranks_the_living_characters_by_wealth()
    {
        GameRunner? runner = null;
        var summary = await BatchRunner.PlayAsync(3, s => runner = Script(s), verifyReplay: false);
        var state = runner!.State;
        Assert.True(state.Ended);

        // Nothing is spent yet: every purse is exactly what its owner gained, by source.
        Assert.All(state.Characters, c => Assert.Equal(c.Earned.Total, c.Purse));
        Assert.Contains(state.Characters, c => c.Purse > 0);

        var ranking = Wealth.Ranking(state);
        Assert.Equal(ranking.Select(Wealth.Line), summary.Richest);
        Assert.Equal(ranking[0].Total, summary.TopWealth);
        Assert.Equal(state.Characters.Sum(c => c.Earned.Total), summary.Gained.Total);
        Assert.True(ranking.Zip(ranking.Skip(1)).All(x => x.First.Total >= x.Second.Total));

        var report = BatchRunner.Report([summary]);
        Assert.Contains("The richest characters (the second game, played under the kings'):", report);
        Assert.Contains($"  The richest held {summary.TopWealth} shekels at the end on average (range {summary.TopWealth}-{summary.TopWealth}).", report);
        Assert.Contains(Wealth.WhatCounts, report);
    }

    [Fact]
    public void A_model_character_knows_its_own_wealth_and_nothing_of_the_ranking()
    {
        var c = new Character
        {
            Id = "c1", Name = "Mane", Origin = "Thebes", Persona = "A careful man.", Status = CharacterStatus.Employed, Employer = Power.Egypt,
            Contract = new Contract { Wage = 10 }, BackPay = new() { [Power.Egypt] = 30, [Power.Hatti] = 12 },
        };
        c.Gain(100, GoldSource.Wages);
        var self = LlmCharacterMind.Self(c, 9);
        Assert.Contains("Your lord owes you 30 shekels of back pay, paid when you return to his court.", self);
        Assert.Contains("The king of Hatti owes you 12 shekels of back pay, paid if you ever stand at his court again.", self);
        Assert.Contains("Your purse holds 100 shekels; with the back pay kings owe you, you are worth 142 shekels. It is now season 9.", self);
        Assert.DoesNotContain("richest", self, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("rank", self, StringComparison.OrdinalIgnoreCase);

        c.BackPay.Clear();
        Assert.Contains("Your purse holds 100 shekels. It is now season 9.", LlmCharacterMind.Self(c, 9));
    }
}
