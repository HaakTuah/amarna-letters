using Amarna.Engine;
using Amarna.Game;
using Amarna.Game.Bots;

namespace Amarna.Game.Tests;

public class SignalTests
{
    private static GameState WithPeace(int sealedTurn)
    {
        var s = GameFactory.NewGame(7);
        s.Tablets.Add(new Tablet
        {
            Id = "t1", Text = "Arzawa and Hatti are brothers.", ProposedBy = Power.Arzawa, Partner = Power.Hatti,
            Seals = [Power.Arzawa, Power.Hatti], CreatedTurn = sealedTurn, SealedTurn = sealedTurn,
        });
        return s;
    }

    private static List<Signal> Broken(GameState s) => SignalDetector.Detect(s).Where(x => x.Kind == "broken-promise").ToList();

    [Fact]
    public void A_conquest_in_the_season_a_tablet_was_sealed_breaks_it()
    {
        // Audiences come before orders: the tablet sealed in season 2 already bound the troops that moved in season 2.
        var s = WithPeace(sealedTurn: 2);
        s.Events.Add(new GameEvent { Turn = 2, Kind = "conquest", Text = "Arzawa took Tuwanuwa from Hatti." });
        Assert.Single(Broken(s));

        var before = WithPeace(sealedTurn: 3);
        before.Events.Add(new GameEvent { Turn = 2, Kind = "conquest", Text = "Arzawa took Tuwanuwa from Hatti." });
        Assert.Empty(Broken(before));
    }

    [Fact]
    public void A_king_who_takes_back_his_own_homeland_breaks_no_promise()
    {
        var s = WithPeace(sealedTurn: 2);
        // Tuwanuwa is Hatti's own: taking it back is no breach. Mira is Arzawa's: taking it is one.
        s.Events.Add(new GameEvent { Turn = 4, Kind = "conquest", Text = "Hatti took Tuwanuwa from Arzawa." });
        Assert.Empty(Broken(s));
        s.Events.Add(new GameEvent { Turn = 5, Kind = "conquest", Text = "Hatti took Mira from Arzawa." });
        Assert.Equal("Hatti took Mira from Arzawa.", Assert.Single(Broken(s)).Text);
    }

    [Theory]
    [InlineData("You lied to me about the gold.")]
    [InlineData("This is a lie, and you know it.")]
    [InlineData("Your envoy spreads lies at every court.")]
    [InlineData("You are a liar and a thief.")]
    [InlineData("You lie!")]
    [InlineData("You swore before the gods and broke your oath.")]
    [InlineData("Hatti betrayed us at Kanesh.")]
    [InlineData("The gold you sent is false.")]
    [InlineData("You seek to deceive me.")]
    public void Accusations_are_found(string text) => Assert.True(TextKit.IsAccusation(text));

    [Theory]
    [InlineData("I received your messenger with joy.")]
    [InlineData("Let your envoy rest at my court until the river falls.")]
    [InlineData("Let the dead lie in peace.")]
    [InlineData("The road to Qadesh lies in the hills.")]
    [InlineData("My armies lie quiet, and the lands lying beyond the river are yours to trade with.")]
    [InlineData("I would never betray my brother.")]
    [InlineData("I have not lied to you.")]
    public void Lying_down_and_courtesies_are_no_accusation(string text) => Assert.False(TextKit.IsAccusation(text));

    [Fact]
    public void Only_accusing_letters_count_as_accusations()
    {
        var s = GameFactory.NewGame(7);
        s.Trails.Add(new MessageTrail { Id = "m1", Turn = 1, From = Power.Egypt, To = Power.Hatti, LeaderLetter = "I received your messenger with joy. The road to my court lies open." });
        s.Trails.Add(new MessageTrail { Id = "m2", Turn = 2, From = Power.Hatti, To = Power.Egypt, LeaderLetter = "Your gold was light, and your words were a lie." });
        var hit = Assert.Single(SignalDetector.Detect(s), x => x.Kind == "accusation");
        Assert.StartsWith("Hatti/Egypt", hit.Text);
    }
}
