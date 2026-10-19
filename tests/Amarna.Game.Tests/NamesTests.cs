using Amarna.Engine;
using Amarna.Game.Bots;

namespace Amarna.Game.Tests;

public class NamesTests
{
    [Theory]
    [InlineData("Mitanni and Egypt swear to stand together against Hatti.", Power.Hatti)]
    [InlineData("Against Hatti, we are one.", Power.Hatti)]
    [InlineData("We stand together against the Hittites.", Power.Hatti)]
    [InlineData("We stand together against the king of Hatti and his allies.", Power.Hatti)]
    [InlineData("We swear against Suppiluliuma.", Power.Hatti)]
    [InlineData("We will hold firm against Babylon.", Power.Babylonia)]
    [InlineData("We will hold firm against Karduniash.", Power.Babylonia)]
    [InlineData("A pact against the Babylonians.", Power.Babylonia)]
    [InlineData("against BURNA-BURIASH", Power.Babylonia)]
    [InlineData("An oath against the Egyptians.", Power.Egypt)]
    [InlineData("An oath against Pharaoh.", Power.Egypt)]
    [InlineData("An oath against the Assyrian.", Power.Assyria)]
    [InlineData("An oath against Ashur-uballit.", Power.Assyria)]
    [InlineData("An oath against the Mitannians.", Power.Mitanni)]
    [InlineData("An oath against the Arzawans.", Power.Arzawa)]
    [InlineData("An oath against the Cypriots.", Power.Alashiya)]
    [InlineData("An oath against the King of Alashiya.", Power.Alashiya)]
    [InlineData("An oath against Alashiyan pirates.", Power.Alashiya)]
    public void A_coalition_names_its_foe_by_any_of_his_names(string text, Power foe)
    {
        Assert.True(Names.SwornAgainst(text, foe));
        Assert.Equal(foe, Names.SwornAgainst(text, []));
    }

    [Theory]
    [InlineData("Each shall stand with the other against any enemy.")]
    [InlineData("We guard the river against floods, and Hatti is our brother.")]
    [InlineData("Against all who would harm us.")]
    [InlineData("An oath against Hattusa's walls.")]
    public void A_text_that_does_not_stand_against_a_king_names_no_foe(string text) => Assert.Null(Names.SwornAgainst(text, []));

    [Fact]
    public void The_sealers_themselves_are_never_the_foe()
    {
        var text = "Hatti and Egypt swear to stand together against the Babylonians, and Hatti shall support Egypt against Babylon.";
        Assert.Equal(Power.Babylonia, Names.SwornAgainst(text, [Power.Hatti, Power.Egypt]));
        Assert.Null(Names.SwornAgainst("Egypt shall not march against Hatti.", [Power.Hatti, Power.Egypt]));
    }

    [Fact]
    public void Names_are_whole_words()
    {
        Assert.True(Names.Mentions("The Hittite king has spoken.", Power.Hatti));
        Assert.True(Names.Mentions("Hatti's armies are many.", Power.Hatti));
        Assert.False(Names.Mentions("The walls of Hattusa stand.", Power.Hatti));
        Assert.False(Names.Mentions("The Babylonia road.", Power.Assyria));
        Assert.True(Names.MentionsPlace("Ashur shall be yours.", "Ashur"));
        Assert.False(Names.MentionsPlace("Ashur-uballit greets you.", "Ashur"));
        Assert.False(Names.MentionsPlace("The Babylonians send greetings.", "Babylon"));
        Assert.True(Names.MentionsPlace("I yield the seha river land to you.", "Seha River Land"));
    }

    [Fact]
    public void A_sealed_tablet_against_the_Hittites_makes_a_coalition_against_Hatti()
    {
        var s = GameFactory.NewGame(11);
        s.Tablets.Add(new Tablet
        {
            Id = "t90", Text = "Before the gods, Mitanni and Egypt are one against the Hittites.", ProposedBy = Power.Mitanni, Partner = Power.Egypt,
            Seals = [Power.Mitanni, Power.Egypt], CreatedTurn = 1, SealedTurn = 1,
        });
        s.Copies.Add(new TabletCopy { Id = "k90", TabletId = "t90", Holder = Power.Egypt, AcquiredTurn = 1, Source = "sealed at audience" });
        var view = Views.For(s, Power.Egypt);
        var brain = new Brain(Power.Egypt, 11);
        brain.Learn(view, new Board(view));
        Assert.Equal(Power.Hatti, brain.Rel[Power.Mitanni].Against);
        Assert.True(brain.Rel[Power.Mitanni].Treaty);
    }
}
