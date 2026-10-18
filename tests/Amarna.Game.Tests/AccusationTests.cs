using Amarna.Game.Bots;

namespace Amarna.Game.Tests;

/// <summary>The accusation signal, on phrasings the whole-word matcher first missed or miscounted (several from the seed-7 agent games).</summary>
public class AccusationTests
{
    [Theory]
    [InlineData("You are lying!")]
    [InlineData("Your envoy is lying.")]
    [InlineData("Do not trust his lies.")]
    [InlineData("Your words are lies.")]
    [InlineData("You lie in every letter.")]
    [InlineData("He lies.")]
    [InlineData("You lied to the kings of the north.")]
    [InlineData("Both are oath-breakers, and Mitanni grows faster than any of us.")]
    [InlineData("Arzawa sealed a peace with me and broke it the same day.")]
    [InlineData("Arzawa swore a tablet of brotherhood before Shamash, Teshub, Amun and Marduk, and broke it in the very same season.")]
    [InlineData("This king broke his seal to Hatti and to me.")]
    [InlineData("Either your generals acted without your word, or the oath is broken.")]
    [InlineData("These are false words from a false brother.")]
    public void Accusations_are_found(string text) => Assert.True(TextKit.IsAccusation(text));

    [Theory]
    [InlineData("The great prizes lie to the east, in Isuwa, Carchemish and the lands of Mitanni.")]
    [InlineData("Let no false word come between us.")]
    [InlineData("May no deceit ever come between our houses.")]
    [InlineData("There is no falsehood in my heart.")]
    [InlineData("Peace for all lies in your hands.")]
    [InlineData("Your armies are lying in wait at Mari.")]
    [InlineData("Hatti is broken in the west.")]
    [InlineData("Assyria is broken: Mitanni has taken Nineveh and Ashur.")]
    [InlineData("I have broken the Assyrian and now march against Mitanni.")]
    [InlineData("Two Mitanni armies have been broken on my border.")]
    [InlineData("He sent his spears against my Kanesh and they broke on my wall.")]
    [InlineData("My army marched before the tablet reached my generals; the city stood open with its walls broken.")]
    [InlineData("Last season my captain at Ashur tested Terqa on a false rumour and was beaten back.")]
    [InlineData("I do not ask a man to betray his master.")]
    [InlineData("If Terqa moves on Mari, Shamash will see who broke the peace.")]
    [InlineData("This is not a lie.")]
    public void Places_battles_denials_and_courtesies_are_no_accusation(string text) => Assert.False(TextKit.IsAccusation(text));
}
