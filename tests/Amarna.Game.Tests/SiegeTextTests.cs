using Amarna.Engine;
using Amarna.Llm;

namespace Amarna.Game.Tests;

/// <summary>What a king reads of walls, sieges and land being absorbed (Build order item 5), in the rulebook and his view.</summary>
public class SiegeTextTests
{
    [Fact]
    public void The_view_gives_the_walls_standing_the_sieges_known_and_the_land_being_absorbed()
    {
        var s = GameFactory.NewGame(1, new GameConfig { CatastropheChance = 0 });
        s.Units.First(u => u.Province == "sippar").Province = "mari";
        var e = new TurnEngine(s);
        e.BeginTurn();
        e.Resolve(new Dictionary<Power, TurnSubmission>
        {
            [Power.Babylonia] = new() { Orders = [new BesiegeOrder("mari")] },
            [Power.Mitanni] = new() { Orders = [new MoveOrder("terqa", "ekallatum")] },
            [Power.Assyria] = new() { Orders = [new MoveOrder("ekallatum", "sippar")] },
        });
        var babylon = Prompts.Situation(Views.For(s, Power.Babylonia));
        Assert.Contains("LANDS (who holds what, with the walls standing now; troops only where you can see them):", babylon);
        Assert.Contains("babylon (walls 3) [Babylonia army]", babylon);
        Assert.Contains("mari (walls 2) [Babylonia army]", babylon);
        Assert.Contains("SIEGES (a city surrenders when it is worn down as far as its walls are high): your army besieges mari (a free city, walls 2): worn down 1 of 2, since turn 1.", babylon);
        // Assyria took Sippar from Babylon by force: a third of it counts this season.
        Assert.Contains("sippar (taken by force in turn 1: yields and counts a third of its yield this season) [Assyria army]", babylon);
        // Mitanni, next to Mari, sees the siege too.
        Assert.Contains("Babylonia's army besieges mari (a free city, walls 2): worn down 1 of 2", Prompts.Situation(Views.For(s, Power.Mitanni)));
    }

    [Theory]
    [InlineData("Strength = 10 x (sum of the base yields of the provinces you hold, land you conquered counted as far as you have absorbed it)")]
    [InlineData("Conquered land is absorbed slowly. A province you take by force (troops standing in it, a storm, a siege, or with a fallen king's capital) yields you, and counts in your strength, a third of its yield in its first season under you (the season you take it and the next), two thirds in the second, and all of it from the third.")]
    [InlineData("- apasa: Apasa; coast; homeland of Arzawa; capital; yield 40; walls 3.")]
    [InlineData("Strengthening walls (order fortify, naming the province): the walls of a province you hold rise a level at the end of the season, up to 3, for 50 x the new level (50, 100, 150), paid then")]
    [InlineData("walls whose upkeep you cannot pay fall a level, the farthest from your capital first. An earthquake throws the walls of the province it strikes down a level.")]
    [InlineData("An envoy whose courage is below 20 x tightness will not leave that season: nothing is paid, and you are told. A caught envoy is the besieger's captive: he reads the letter and the mandate, and takes the gold and the tablets it carried; he may execute, ransom or release the envoy, but cannot turn him.")]
    public void The_rulebook_states_walls_by_place_and_slow_absorption(string rule) => Assert.Contains(rule, Prompts.LeaderRules(true, new GameConfig()));

    [Fact]
    public void A_fortify_order_is_read_from_a_reply_and_offered_in_the_schema()
    {
        var sub = Parse.Orders((System.Text.Json.Nodes.JsonObject)System.Text.Json.Nodes.JsonNode.Parse(
            """{"notes":"","letters":[],"units":[{"unit":"mari","order":"besiege","target":"","to":""}],"other_orders":[{"action":"fortify","province":"Thebes","power":"","person":"","amount":0,"term":0,"text":"","item":"","seals":[]}]}""")!);
        Assert.Equal([new BesiegeOrder("mari"), new FortifyOrder("thebes")], sub.Orders);
        Assert.Contains("fortify", Schemas.OtherActions);
    }

    [Fact]
    public void A_script_king_strengthens_the_walls_of_a_threatened_province_worth_it()
    {
        var s = GameFactory.NewGame(1, new GameConfig { CatastropheChance = 0 });
        s.Turn = 4;
        s.Treasuries[Power.Babylonia].Gold = 2000;
        var v = Views.For(s, Power.Babylonia);
        var b = new Amarna.Game.Bots.Board(v);
        var plan = new Amarna.Game.Bots.MilitaryPlan();
        plan.Danger["sippar"] = (2, 0.8);
        plan.Danger["ur"] = (1, 0.3);
        var walls = Amarna.Game.Bots.Statecraft.Fortification(b, plan, 1500);
        Assert.Equal(("sippar", 50), walls);
        Assert.Null(Amarna.Game.Bots.Statecraft.Fortification(b, plan, 50));
    }
}
