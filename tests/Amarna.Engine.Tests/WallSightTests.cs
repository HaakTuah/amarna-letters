using Amarna.Engine;

namespace Amarna.Engine.Tests;

/// <summary>
/// A court sees the walls standing now only where it can see troops, and knows them elsewhere as it last saw them (at the
/// start, as the map gives them). Walls rise for gold and fall to an earthquake or unpaid upkeep out of other courts'
/// sight, and a treasury and a catastrophe are known exactly only to their own king (since the review of the siege
/// package; until then every court saw every wall as it stood).
/// </summary>
public class WallSightTests
{
    private static Dictionary<Power, TurnSubmission> Orders(Power p, params Order[] orders) => new() { [p] = new TurnSubmission { Orders = orders.ToList() } };

    [Fact]
    public void At_the_start_every_court_knows_the_walls_the_map_gives()
    {
        var s = GameFactory.NewGame(1);
        foreach (var p in Powers.All) Assert.Equal(s.Walls, Views.For(s, p).Walls);
    }

    [Fact]
    public void Walls_raised_out_of_a_court_s_sight_are_not_seen_by_it()
    {
        var s = GameFactory.NewGame(1, new GameConfig { CatastropheChance = 0 });
        Assert.DoesNotContain("thebes", Views.Sight(s, WorldMap.Default, Power.Babylonia));
        var e = new TurnEngine(s);
        e.BeginTurn();
        e.Resolve(Orders(Power.Egypt, new FortifyOrder("thebes")));
        Assert.Equal(1, s.WallsOf("thebes"));
        Assert.Equal(1, Views.For(s, Power.Egypt).Walls["thebes"]);
        Assert.False(Views.For(s, Power.Babylonia).Walls.ContainsKey("thebes"));
    }

    [Fact]
    public void A_court_sees_walls_where_it_sees_troops_and_remembers_them_as_last_seen()
    {
        var s = GameFactory.NewGame(1, new GameConfig { CatastropheChance = 0 });
        Assert.Contains("mari", Views.Sight(s, WorldMap.Default, Power.Mitanni));
        Assert.DoesNotContain("mari", Views.Sight(s, WorldMap.Default, Power.Egypt));

        // Mari's walls rise out of Egypt's sight: Mitanni, next to it, sees them; Egypt knows them as the map gives them.
        s.Walls["mari"] = 3;
        Assert.Equal(3, Views.For(s, Power.Mitanni).Walls["mari"]);
        Assert.Equal(2, Views.For(s, Power.Egypt).Walls["mari"]);

        // An Egyptian army in Damascus, next to Mari, sees them; the season resolves, and Egypt remembers them as it saw them.
        var army = new Unit { Id = s.NewId("u"), Power = Power.Egypt, Kind = UnitKind.Army, Province = "damascus" };
        s.Units.Add(army);
        Assert.Equal(3, Views.For(s, Power.Egypt).Walls["mari"]);
        var e = new TurnEngine(s);
        e.BeginTurn();
        e.Resolve(new Dictionary<Power, TurnSubmission>());
        Assert.Equal(3, s.WallsSeen[Power.Egypt]["mari"]);

        // The army gone, Mari's walls fall: Egypt still knows them at 3, Mitanni sees them at 1.
        s.Units.Remove(army);
        s.Walls["mari"] = 1;
        Assert.Equal(3, Views.For(s, Power.Egypt).Walls["mari"]);
        Assert.Equal(1, Views.For(s, Power.Mitanni).Walls["mari"]);

        // Walls thrown down where a court cannot see are still there for it; where it sees, they are gone.
        s.Walls.Remove("mari");
        Assert.Equal(3, Views.For(s, Power.Egypt).Walls["mari"]);
        Assert.False(Views.For(s, Power.Mitanni).Walls.ContainsKey("mari"));
    }

    [Fact]
    public void Walls_that_fall_for_want_of_upkeep_are_seen_only_where_troops_are_seen()
    {
        // Upkeep far above what the treasury holds, so the walls cannot be kept (a test number, not the game's).
        var s = GameFactory.NewGame(1, new GameConfig { CatastropheChance = 0, WallUpkeep = 500 });
        // Thebes walled two levels above the map's none, and an empty treasury: they fall as the season opens.
        s.Walls["thebes"] = 2;
        s.WallsSeen[Power.Babylonia]["thebes"] = 2;
        s.Treasuries[Power.Egypt].Gold = 0;
        new TurnEngine(s).BeginTurn();
        Assert.True(s.WallsOf("thebes") < 2);
        Assert.Equal(s.WallsOf("thebes"), Views.For(s, Power.Egypt).Walls.GetValueOrDefault("thebes"));
        Assert.Equal(2, Views.For(s, Power.Babylonia).Walls["thebes"]);
    }
}
