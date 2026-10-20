using Amarna.Engine;
using Amarna.Game.Batch;
using Amarna.Game.Bots;

namespace Amarna.Game.Tests;

/// <summary>
/// Script kings and the siege package (Build order item 5; "Every feature is every seat's"): they besiege the cities their
/// armies stand within, and their sieges take cities in play.
/// </summary>
public class SiegeBotTests
{
    [Fact]
    public async Task A_script_king_besieges_a_free_city_its_army_stands_within()
    {
        var s = GameFactory.NewGame(4, new GameConfig { CatastropheChance = 0 });
        s.Turn = 2;
        s.Units.First(u => u.Province == "sippar").Province = "mari";
        var sub = await new ScriptLeader(4).DecideAsync(Views.For(s, Power.Babylonia), default);
        Assert.Contains(new BesiegeOrder("mari"), sub.Orders);
        Assert.DoesNotContain(new OrderValidator(s).Validate(Power.Babylonia, sub).Rejected, r => r.Order is BesiegeOrder);
    }

    [Fact]
    public async Task Script_kings_take_cities_by_siege_in_play_and_the_games_replay_exactly()
    {
        var sieges = 0;
        var falls = 0;
        for (ulong seed = 1; seed <= 4; seed++)
        {
            var summary = await BatchRunner.PlayAsync(seed, st =>
                new GameRunner(st, Powers.All.ToDictionary(p => p, _ => (ISeat)new ScriptLeader(st.Seed)), new ScriptMind(), new TemplateNarrator()) { WriteChronicles = false },
                verifyReplay: true, config: new GameConfig { MaxTurns = 16 });
            Assert.True(summary.ReplayMatches, $"seed {seed}");
            sieges += summary.Signals.GetValueOrDefault("siege-begun");
            falls += summary.Signals.GetValueOrDefault("siege-won");
        }
        Assert.True(sieges > 0, "no script king laid siege to a city");
        Assert.True(falls > 0, "no siege by a script king took a city");
    }
}
