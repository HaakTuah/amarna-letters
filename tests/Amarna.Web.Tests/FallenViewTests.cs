using Amarna.Engine;
using Amarna.Web.Services;

namespace Amarna.Web.Tests;

/// <summary>
/// A fallen player's game is over (built with the siege package, Build order item 5): he watches the rest in god view, a
/// table setting on by default; off, he keeps his own view. On one screen nobody sees all while a human seat still plays.
/// </summary>
public class FallenViewTests
{
    [Fact]
    public void A_fallen_human_seat_watches_in_god_view_unless_the_table_turned_it_off()
    {
        var s = GameFactory.NewGame(1);
        Assert.True(new GameSettings().FallenSeeAll);
        Assert.True(new GameSettings().ToConfig().FallenSeeAll);
        Assert.False(GameSession.FallenSeesAll(s, [Power.Arzawa]));

        s.Eliminated.Add(Power.Arzawa);
        Assert.True(GameSession.FallenSeesAll(s, [Power.Arzawa]));
        // While another human seat at the same screen still plays, nobody sees all.
        Assert.False(GameSession.FallenSeesAll(s, [Power.Arzawa, Power.Hatti]));
        // A game with no human seat is spectated in god view as before, which this rule does not touch.
        Assert.False(GameSession.FallenSeesAll(s, []));

        // The table turned it off: the fallen player keeps the view of his kingdom.
        var off = GameFactory.NewGame(1, new GameSettings { FallenSeeAll = false }.ToConfig());
        off.Eliminated.Add(Power.Arzawa);
        Assert.False(GameSession.FallenSeesAll(off, [Power.Arzawa]));
        // The setting travels with the game's log, so a game loaded to continue keeps the table's choice.
        Assert.False(Json.Clone(off.Config).FallenSeeAll);
    }
}
