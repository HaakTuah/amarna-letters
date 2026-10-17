using Amarna.Game.Bots;

namespace Amarna.Game.Tests;

public class TextKitTests
{
    [Theory]
    [InlineData("Let us march together against our common enemy.")]
    [InlineData("If you do not withdraw, there will be war.")]
    [InlineData("Our armies attacked Mira last season.")]
    [InlineData("I will burn your fields, or else send me gold.")]
    [InlineData("You betrayed me, and you will regret it.")]
    [InlineData("Beware the consequences.")]
    [InlineData("Our enemies are marching on Qadesh.")]
    public void Threats_are_found_as_whole_words(string sentence) => Assert.True(TextKit.IsThreat(sentence));

    [Theory]
    [InlineData("We send a warm greeting toward your court.")]
    [InlineData("Your reward is a gift of burnished gold.")]
    [InlineData("May Marduk and Teshub watch over your house.")]
    [InlineData("The wardens of the river send their regards.")]
    [InlineData("All goes well with me and with my warehouses.")]
    public void Words_that_only_contain_a_threat_are_not_threats(string sentence) => Assert.False(TextKit.IsThreat(sentence));
}
