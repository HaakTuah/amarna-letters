using Amarna.Engine;

namespace Amarna.Engine.Tests;

/// <summary>
/// A kingdom falls with its capital (the design document's rule, built with the siege package, Build order item 5): its
/// remaining land passes to the power that took the capital, its troops disband, and its orders lapse for the rest of the season.
/// </summary>
public class KingdomFallTests
{
    private static void Season(GameState s, Dictionary<Power, TurnSubmission> orders)
    {
        var e = new TurnEngine(s);
        e.BeginTurn();
        e.Resolve(orders);
    }

    [Fact]
    public void A_capital_stormed_brings_down_its_kingdom_and_its_land_passes_to_the_stormer()
    {
        var s = GameFactory.NewGame(1, new GameConfig { CatastropheChance = 0 });
        // Apasa's walls thrown down to level 1, its troops gone; Hatti's armies in Lukka and Mira.
        s.Walls["apasa"] = 1;
        s.Units.RemoveAll(u => u.Power == Power.Arzawa);
        s.Owner["mira"] = Power.Hatti;
        s.Units.Add(new Unit { Id = s.NewId("u"), Power = Power.Hatti, Kind = UnitKind.Army, Province = "lukka" });
        s.Units.Add(new Unit { Id = s.NewId("u"), Power = Power.Hatti, Kind = UnitKind.Army, Province = "mira" });
        Season(s, new()
        {
            [Power.Hatti] = new() { Orders = [new MoveOrder("lukka", "apasa"), new SupportOrder("mira", "lukka", "apasa")] },
            // The levy comes after the fall: it is not raised, and nothing is paid.
            [Power.Arzawa] = new() { Orders = [new RaiseOrder("seha", UnitKind.Army)] },
        });

        Assert.Contains(Power.Arzawa, s.Eliminated);
        Assert.Equal(Power.Hatti, s.Owner["apasa"]);
        Assert.Equal(Power.Hatti, s.Owner["seha"]);
        Assert.DoesNotContain(s.Units, u => u.Power == Power.Arzawa);
        Assert.Null(s.UnitAt("seha"));
        Assert.DoesNotContain(s.InboxOf(Power.Arzawa), i => i.Title == "Levy raised" || i.Title == "Not enough gold");
        var fall = Assert.Single(s.Falls);
        Assert.Equal((Power.Arzawa, Power.Hatti, "apasa", 1), (fall.Power, fall.Conqueror!.Value, fall.Capital, fall.Turn));
        Assert.Equal(["seha"], fall.Land);
        Assert.Equal("With Apasa you took the kingdom of Arzawa: its king has fallen, his troops have disbanded, and his land is yours: Seha River Land.",
            s.InboxOf(Power.Hatti).Single(i => i.Title == TurnEngine.KingdomFallsTitle).Body);
        Assert.Contains("Hatti took its capital, Apasa", s.InboxOf(Power.Egypt).Single(i => i.Title == "A kingdom falls").Body);
        Assert.Contains(s.Events, e => e.Kind == "fall" && e.Text == "The kingdom of Arzawa has fallen: Hatti took its capital, Apasa, and its land passes to Hatti.");
    }

    [Fact]
    public void A_capital_that_surrenders_to_a_siege_brings_down_its_kingdom()
    {
        var s = GameFactory.NewGame(1, new GameConfig { CatastropheChance = 0 });
        s.Units.RemoveAll(u => u.Province == "ashur");
        var besieger = new Unit { Id = s.NewId("u"), Power = Power.Babylonia, Kind = UnitKind.Army, Province = "ashur" };
        s.Units.Add(besieger);
        s.Sieges.Add(new Siege { Province = "ashur", Power = Power.Babylonia, UnitId = besieger.Id, Progress = 2, Since = 1 });
        Season(s, []);
        Assert.Contains(Power.Assyria, s.Eliminated);
        Assert.All(WorldMap.Default.HomeOf(Power.Assyria), p => Assert.Equal(Power.Babylonia, s.Owner[p.Id]));
        Assert.Equal(2, s.WallsOf("ashur"));
        Assert.Empty(s.Sieges);
        Assert.Equal(Power.Babylonia, Assert.Single(s.Falls).Conqueror);
    }

    [Fact]
    public void A_king_cannot_cede_his_own_capital()
    {
        var s = GameFactory.NewGame(1);
        var v = new OrderValidator(s).Validate(Power.Egypt, new TurnSubmission { Orders = [new CedeProvinceOrder("akhetaten", Power.Hatti), new CedeProvinceOrder("thebes", Power.Hatti)] });
        Assert.Equal("you cannot cede your capital: your kingdom falls with it", Assert.Single(v.Rejected).Reason);
        Assert.Single(v.Accepted);
    }
}
