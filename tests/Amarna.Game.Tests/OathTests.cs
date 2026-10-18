using Amarna.Engine;
using Amarna.Game.Bots;

namespace Amarna.Game.Tests;

public class OathTests
{
    [Fact]
    public void A_full_ally_who_takes_our_land_is_a_friend_no_more()
    {
        // Egypt and Alashiya swore a full alliance in season 1.
        var s = GameFactory.NewGame(5);
        s.Tablets.Add(new Tablet
        {
            Id = "t1", Text = Statecraft.AllianceTablet(Power.Alashiya, Power.Egypt), ProposedBy = Power.Alashiya, Partner = Power.Egypt,
            Seals = [Power.Alashiya, Power.Egypt], CreatedTurn = 1, SealedTurn = 1, AllianceOath = true,
        });
        s.Copies.Add(new TabletCopy { Id = "k1", TabletId = "t1", Holder = Power.Egypt, AcquiredTurn = 1, Source = "sealed at audience" });
        var brain = new Brain(Power.Egypt, 5);
        var first = Views.For(s, Power.Egypt);
        brain.Learn(first, new Board(first));
        Assert.True(brain.IsFriend(Power.Alashiya));

        // Then Alashiya takes Sinai.
        s.Owner["sinai"] = Power.Alashiya;
        s.Turn = 2;
        var view = Views.For(s, Power.Egypt);
        brain.Learn(view, new Board(view));
        var r = brain.Rel[Power.Alashiya];
        Assert.True(r.Allied);
        Assert.True(r.OathsBroken > 0);
        Assert.False(brain.IsFriend(Power.Alashiya));

        // So Egypt will send troops against him, as against any king who wronged it.
        var board = new Board(view, brain.Remembered(view), brain.Treasury);
        Assert.True(Tactics.Willing(board, brain, Power.Alashiya, board.Leader()));
    }
}
