using Amarna.Engine;
using Amarna.Game.Bots;

namespace Amarna.Game.Tests;

/// <summary>
/// A capital's name often stands for its king, his realm or a god: Babylon is a name of Babylonia, Ashur is Assyria's god,
/// and the king of Hattusa is the king of Hatti. A script host refuses such a tablet only when it hands the capital over.
/// </summary>
public class CapitalNameTests
{
    private static bool GivesAway(Power host, Power from, string text)
    {
        var view = Views.For(GameFactory.NewGame(5), host);
        return Statecraft.GivesAway(new TabletView { Text = text, ProposedBy = from, Partner = host }, new Board(view), from);
    }

    [Theory]
    [InlineData(Power.Babylonia, "By the gods: Egypt and Babylon are brothers. Neither king shall attack the other.")]
    [InlineData(Power.Assyria, "By Ashur and Shamash: Egypt and Assyria are brothers. Neither king shall attack the other.")]
    [InlineData(Power.Assyria, "Before Ashur and Teshub, Egypt and Assyria are brothers, and the friend of one is the friend of the other.")]
    [InlineData(Power.Hatti, "The king of Hattusa and the king of Egypt are brothers, and neither shall march on the other.")]
    public void A_capital_named_for_its_king_or_a_god_gives_nothing_away(Power host, string text) => Assert.False(GivesAway(host, Power.Egypt, text));

    [Theory]
    [InlineData(Power.Babylonia, "Egypt and Babylonia are brothers, and Babylon shall be Egypt's.")]
    [InlineData(Power.Hatti, "Egypt and Hatti are at peace. Hatti yields Hattusa to Egypt.")]
    [InlineData(Power.Hatti, "Hattusa is the share of Egypt, and the rest is Hatti's.")]
    [InlineData(Power.Assyria, "By Ashur: Egypt and Assyria are brothers, and Ashur passes to Egypt.")]
    [InlineData(Power.Assyria, "By Ashur: Egypt and Assyria are brothers, and Nineveh shall be Egypt's.")]
    public void A_capital_handed_over_or_another_province_named_is_still_refused(Power host, string text) => Assert.True(GivesAway(host, Power.Egypt, text));

    [Fact]
    public void A_babylonian_host_reads_babylon_as_karduniash()
    {
        var s = GameFactory.NewGame(5);
        var court = Views.For(s, Power.Babylonia);
        HostReply Hear(string text)
        {
            var brain = new Brain(Power.Babylonia, 5);
            brain.Learn(court, new Board(court));
            var audience = new AudienceView
            {
                AudienceId = "a1", Turn = 1, Round = 1, MaxRounds = 2, From = Power.Egypt, Host = Power.Babylonia,
                Proposal = new TabletView { Text = text, ProposedBy = Power.Egypt, Partner = Power.Babylonia },
            };
            return Statecraft.Host(audience, new Board(court, treasuries: brain.Treasury), brain, Rng.For(5, 1, "test", "host"));
        }

        var babylon = Hear("Egypt and Babylon are brothers. Neither shall march on the other.");
        var karduniash = Hear("Egypt and Karduniash are brothers. Neither shall march on the other.");
        Assert.Equal(karduniash.SealProposal, babylon.SealProposal);
        Assert.DoesNotContain("names a province of mine", babylon.Speech);
    }
}
