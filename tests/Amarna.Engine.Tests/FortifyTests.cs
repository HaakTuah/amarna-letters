using Amarna.Engine;

namespace Amarna.Engine.Tests;

/// <summary>
/// Walls strengthened for gold and upkeep (Build order item 5): a level a season, for the price of the new level, up to 3;
/// a level above the map's own costs upkeep, and walls whose upkeep cannot be paid fall a level; an earthquake throws a
/// level down.
/// </summary>
public class FortifyTests
{
    private static TurnEngine Season(GameState s, Dictionary<Power, TurnSubmission>? orders = null)
    {
        var e = new TurnEngine(s);
        e.BeginTurn();
        e.Resolve(orders ?? []);
        return e;
    }

    private static Dictionary<Power, TurnSubmission> Orders(Power p, params Order[] orders) => new() { [p] = new TurnSubmission { Orders = orders.ToList() } };

    [Fact]
    public void Walls_rise_a_level_for_the_price_of_the_new_level_and_then_cost_upkeep()
    {
        var s = GameFactory.NewGame(1, new GameConfig { CatastropheChance = 0 });
        var e = new TurnEngine(s);
        e.BeginTurn();
        var gold = s.Treasuries[Power.Egypt].Gold;
        e.Resolve(Orders(Power.Egypt, new FortifyOrder("thebes")));
        Assert.Equal(1, s.WallsOf("thebes"));
        Assert.Equal(gold - 50, s.Treasuries[Power.Egypt].Gold);
        Assert.Equal("The walls of Thebes stand at level 1 now; the 1 level above its old walls cost 5 shekels a season.",
            s.InboxOf(Power.Egypt).Single(i => i.Title == "Walls strengthened").Body);
        Assert.Contains(s.Events, x => x.Signal == "fortify" && x.Text == "Egypt strengthened the walls of Thebes to level 1.");
        Assert.Equal(5, new TurnEngine(s).WallsUpkeep(Power.Egypt));
        Assert.Equal(5, Views.For(s, Power.Egypt).WallUpkeep);

        // Memphis has walls 2 on the map: raising them to 3 costs 150, and 5 a season.
        e = Season(s, Orders(Power.Egypt, new FortifyOrder("memphis")));
        Assert.Equal(3, s.WallsOf("memphis"));
        Assert.Equal(10, e.WallsUpkeep(Power.Egypt));
        Assert.Equal(10, Views.For(s, Power.Egypt).WallUpkeep);
    }

    [Fact]
    public void A_fortify_order_is_refused_beyond_level_3_on_land_not_held_twice_and_while_besieged()
    {
        var s = GameFactory.NewGame(1);
        s.Units.Add(new Unit { Id = s.NewId("u"), Power = Power.Hatti, Kind = UnitKind.Army, Province = "memphis" });
        s.Sieges.Add(new Siege { Province = "memphis", Power = Power.Hatti, UnitId = s.UnitAt("memphis")!.Id, Progress = 1, Since = 1 });
        s.Units.Add(new Unit { Id = s.NewId("u"), Power = Power.Hatti, Kind = UnitKind.Army, Province = "sinai" });
        var v = new OrderValidator(s).Validate(Power.Egypt, new TurnSubmission
        {
            Orders = [new FortifyOrder("akhetaten"), new FortifyOrder("gaza"), new FortifyOrder("memphis"), new FortifyOrder("thebes"), new FortifyOrder("thebes"), new FortifyOrder(""), new FortifyOrder("sinai")],
        });
        Assert.Equal(
            ["the walls of Akhetaten stand at 3, as high as walls go", "you do not hold Gaza", "Memphis is besieged: its walls cannot be strengthened while the siege lasts",
             "the walls of Thebes were already to be strengthened by an earlier order", "name the province whose walls to strengthen",
             "foreign troops stand within Sinai: its walls cannot be strengthened while they are there"],
            v.Rejected.Select(r => r.Reason));
        Assert.Equal([new FortifyOrder("thebes")], v.Accepted);
    }

    [Fact]
    public void Walls_whose_upkeep_cannot_be_paid_fall_a_level_the_farthest_first()
    {
        // Egypt's walls of Thebes (2) and Sinai (1) are three levels above the map's: 15 a season. Five armies and a fleet eat
        // all but 5 of its income of 190, so Sinai's walls fall, then a level of Thebes', until what is left can be paid.
        var s = GameFactory.NewGame(1, new GameConfig { CatastropheChance = 0 });
        s.Walls["thebes"] = 2;
        s.Walls["sinai"] = 1;
        s.Treasuries[Power.Egypt].Gold = 0;
        foreach (var at in new[] { "thebes", "sinai", "gaza" })
            s.Units.Add(new Unit { Id = s.NewId("u"), Power = Power.Egypt, Kind = UnitKind.Army, Province = at });
        new TurnEngine(s).BeginTurn();
        Assert.Equal((0, 1), (s.WallsOf("sinai"), s.WallsOf("thebes")));
        var notice = s.InboxOf(Power.Egypt).Single(i => i.Title == "The treasury").Body;
        Assert.Contains("upkeep 3 minas 5 shekels, walls 5 shekels, wages", notice);
        Assert.Contains("Unkept, walls fell a level: Sinai, Thebes.", notice);
    }

    [Fact]
    public void An_earthquake_throws_the_walls_of_the_province_it_strikes_down_a_level()
    {
        var s = GameFactory.NewGame(3, new GameConfig { CatastropheChance = 1 });
        foreach (var p in WorldMap.Default.LandProvinces) s.Walls[p.Id] = 3;
        for (var i = 0; i < 40 && !s.Catastrophes.Any(c => c.Kind == CatastropheKind.Earthquake); i++) Season(s);
        var quake = s.Catastrophes.First(c => c.Kind == CatastropheKind.Earthquake);
        Assert.Equal(2, s.WallsOf(quake.Province!));
        Assert.Contains("and its walls stand a level lower (walls 2).", s.InboxOf(quake.Power).Single(i => i.Title == "Catastrophe: Earthquake").Body);
    }
}
