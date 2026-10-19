using Amarna.Engine;
using Amarna.Game.Bots;

namespace Amarna.Game.Tests;

public class SealingTests
{
    /// <summary>Hatti's script king hears Arzawa's envoy, who carries a tablet with this text, in season 1.</summary>
    private static HostReply Hear(string text)
    {
        var s = GameFactory.NewGame(5);
        var court = Views.For(s, Power.Hatti);
        var brain = new Brain(Power.Hatti, 5);
        brain.Learn(court, new Board(court));
        var board = new Board(court, treasuries: brain.Treasury);
        var audience = new AudienceView
        {
            AudienceId = "a1", Turn = 1, Round = 1, MaxRounds = 2, From = Power.Arzawa, Host = Power.Hatti,
            Proposal = new TabletView { Text = text, ProposedBy = Power.Arzawa, Partner = Power.Hatti },
        };
        return Statecraft.Host(audience, board, brain, Rng.For(5, 1, "test", "host"));
    }

    [Theory]
    [InlineData("Arzawa and Hatti are at peace. Each spring Hatti shall send Arzawa fifty shekels of gold.")]
    [InlineData("Arzawa and Hatti are at peace, and Hatti shall pay tribute to its brother.")]
    [InlineData("Arzawa and Hatti are at peace. The land west of the river is Arzawa's.")]
    [InlineData("Arzawa and Hatti are at peace, and Kanesh shall be Arzawa's.")]
    [InlineData("Arzawa and Hatti are at peace; the troops of Arzawa may pass through tuwanuwa.")]
    public void A_script_host_seals_no_foreign_tablet_that_gives_land_gold_or_tribute_or_names_its_provinces(string text)
    {
        var reply = Hear(text);
        Assert.False(reply.SealProposal);
        Assert.Contains("I will not seal a tablet that speaks of land, gold or tribute, or names a province of mine.", reply.Speech);
    }

    [Fact]
    public void A_foreign_tablet_that_gives_nothing_away_is_sealed_as_before()
    {
        Assert.True(Hear("Arzawa and Hatti are at peace. Neither shall march on the other while this oath stands.").SealProposal);
        // Naming someone else's province is no concern of Hatti's.
        Assert.True(Hear("Arzawa and Hatti are at peace, and neither shall march on Mira.").SealProposal);
    }

    [Fact]
    public void Tablets_in_a_script_kings_own_words_are_read_as_before()
    {
        // The script kings' peace speaks of "the lands of the other"; it is theirs, so it is sealed.
        Assert.True(Hear(Statecraft.PeaceTablet(Power.Arzawa, Power.Hatti)).SealProposal);
        // So is the frozen baseline's peace with an alliance in it.
        Assert.True(Hear("By Shamash, Amun, Marduk and Teshub: Arzawa and Hatti are brothers. Neither king shall send troops into the lands of the other. "
                         + "They shall stand together against any enemy, and share in the victory. If one breaks this oath, may the gods destroy his name and his seed.").SealProposal);
        // The same words with a clause added are someone else's, and read for what they give away.
        Assert.False(Hear(Statecraft.PeaceTablet(Power.Arzawa, Power.Hatti) + " Kanesh shall be Arzawa's.").SealProposal);
    }

    [Fact]
    public void A_host_never_seals_a_tablet_from_the_king_it_makes_war_on_however_faithless_it_is()
    {
        var s = GameFactory.NewGame(5);
        var court = Views.For(s, Power.Arzawa);
        var faithless = Personality.Archetype(Power.Arzawa) with { Cunning = 1, Honesty = 0 };
        var brain = new Brain(Power.Arzawa, 5, faithless);
        brain.Learn(court, new Board(court));
        brain.WarTarget = Power.Hatti;
        var board = new Board(court, treasuries: brain.Treasury);
        var audience = new AudienceView
        {
            AudienceId = "a1", Turn = 1, Round = 1, MaxRounds = 2, From = Power.Hatti, Host = Power.Arzawa,
            Proposal = new TabletView { Text = Statecraft.PeaceTablet(Power.Hatti, Power.Arzawa), ProposedBy = Power.Hatti, Partner = Power.Arzawa },
        };
        Assert.False(Statecraft.Host(audience, board, brain, Rng.For(5, 1, "test", "host")).SealProposal);
    }
}
