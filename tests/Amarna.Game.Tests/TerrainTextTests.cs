using Amarna.Engine;
using Amarna.Llm;

namespace Amarna.Game.Tests;

/// <summary>What a king reads of terrain (Build order item 5, the siege package), in the rulebook and his view.</summary>
public class TerrainTextTests
{
    private static string Rules => Prompts.LeaderRules(true, new GameConfig());

    [Theory]
    [InlineData("- The ground helps a unit that stands its ground: one that holds, besieges, supports or convoys, or whose own move fails. Against an attack it holds with 1 more when it stands on rough ground (mira, lukka, isuwa, amurru, arbela, tamassos), when the attack comes over a mountain pass or a great river (the Cilician Gates (tuwanuwa-kizzuwatna), the Taurus (kanesh-kizzuwatna), the Amanus (kizzuwatna-carchemish), the Euphrates (carchemish-harran and isuwa-harran), the Tigris (taidu-nineveh)), or when the attack is a landing from the sea (an army carried by convoy): 1 in all, however many of these apply.")]
    [InlineData("The ground never helps a unit that moves, nor one met head on (both are on the road), nor empty land. It adds nothing to walls and nothing to a siege's pace; but a storm must beat the walls plus the hold strength of the defenders it beat, and the ground's help to them is part of that.")]
    [InlineData("So an island is protected by the sea: an army reaches it only by convoy, and a unit there holds with 1 more against a landing.")]
    [InlineData("A unit standing its ground may have the ground's help in its hold strength (see TERRAIN).")]
    [InlineData("(none if the province was empty or its unit moved away; the ground's help to them counts in it)")]
    [InlineData("THE MAP (id: name; kind; homeland; yield per season; walls at the start; rough ground; links, with the mountain passes and great rivers on them)")]
    [InlineData("- mira: Mira; land; homeland of Arzawa; yield 30; rough ground. armies: seha, apasa, lukka, tuwanuwa.")]
    [InlineData("- tamassos: Tamassos; coast; homeland of Alashiya; yield 40; rough ground. armies: enkomi.")]
    [InlineData("- tuwanuwa: Tuwanuwa; land; homeland of Hatti; yield 30. armies: seha, mira, lukka, hattusa, kanesh, kizzuwatna (across the Cilician Gates).")]
    [InlineData("- harran: Harran; land; homeland of Mitanni; yield 35. armies: isuwa (across the Euphrates), carchemish (across the Euphrates), washukanni, terqa.")]
    public void The_rulebook_states_what_the_ground_does_and_the_map_marks_it(string rule) => Assert.Contains(rule, Rules);

    [Fact]
    public void The_terrain_section_follows_walls_and_sieges()
    {
        var walls = Rules.IndexOf("WALLS AND SIEGES", StringComparison.Ordinal);
        var terrain = Rules.IndexOf("TERRAIN\n- The ground helps", StringComparison.Ordinal);
        Assert.True(walls >= 0 && terrain > walls);
        Assert.True(terrain < Rules.IndexOf("STANDING ORDERS (standing_orders", StringComparison.Ordinal));
    }

    [Fact]
    public void With_terrain_off_the_rulebook_says_the_ground_helps_nobody()
    {
        var rules = Prompts.LeaderRules(true, new GameConfig { TerrainDefence = 0 });
        Assert.Contains("In this game the ground gives no unit any help", rules);
        Assert.DoesNotContain("see TERRAIN", rules);
    }

    [Fact]
    public void The_view_marks_the_rough_ground_beside_the_walls()
    {
        var s = GameFactory.NewGame(1, new GameConfig { CatastropheChance = 0 });
        var hatti = Prompts.Situation(Views.For(s, Power.Hatti));
        Assert.Contains("lukka (walls 1, rough ground)", hatti);
        Assert.Contains("isuwa (walls 1, rough ground)", hatti);
        Assert.Contains("mira (rough ground) [Arzawa army]", hatti);
        // With terrain off, nothing is marked.
        var off = GameFactory.NewGame(1, new GameConfig { CatastropheChance = 0, TerrainDefence = 0 });
        Assert.Contains("mira [Arzawa army]", Prompts.Situation(Views.For(off, Power.Hatti)));
    }
}
