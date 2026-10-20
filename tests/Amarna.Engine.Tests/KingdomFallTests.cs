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

    /// <summary>Seed 1, no catastrophes: each pair's army stands in the other's capital, one season from its surrender.</summary>
    private static GameState Sieges(params (Power Besieger, Power Besieged)[] sieges)
    {
        var s = GameFactory.NewGame(1, new GameConfig { CatastropheChance = 0 });
        foreach (var (by, of) in sieges)
        {
            var capital = WorldMap.Default.Capital(of).Id;
            s.Units.RemoveAll(u => u.Province == capital);
            var army = new Unit { Id = s.NewId("u"), Power = by, Kind = UnitKind.Army, Province = capital };
            s.Units.Add(army);
            s.Sieges.Add(new Siege { Province = capital, Power = by, UnitId = army.Id, Progress = s.WallsOf(capital) - 1, Since = 1 });
        }
        return s;
    }

    [Theory]
    // Babylonia takes Ashur while Assyria takes Washukanni: Mitanni is reckoned before Assyria.
    [InlineData(Power.Babylonia, Power.Assyria, Power.Mitanni)]
    // Babylonia takes Washukanni while Mitanni takes Ashur: Mitanni is reckoned before Assyria.
    [InlineData(Power.Babylonia, Power.Mitanni, Power.Assyria)]
    public void A_kingdom_whose_taker_falls_in_the_same_season_passes_on_with_his_land_in_any_order(Power first, Power second, Power third)
    {
        var s = Sieges((first, second), (second, third));
        Season(s, []);
        Assert.Contains(second, s.Eliminated);
        Assert.Contains(third, s.Eliminated);
        Assert.DoesNotContain(first, s.Eliminated);
        Assert.All(WorldMap.Default.HomeOf(second).Concat(WorldMap.Default.HomeOf(third)), p => Assert.Equal(first, s.Owner[p.Id]));
        Assert.Equal(first, s.Falls.Single(f => f.Power == third).Conqueror);
        Assert.Contains(s.Events, e => e.Kind == "fall" && e.Text == $"The kingdom of {third.Land()} has fallen: {second} took its capital, {WorldMap.Default.Capital(third).Name}, and its land passes to {first}.");
        Assert.Contains(s.InboxOf(first), i => i.Title == TurnEngine.KingdomFallsTitle
            && i.Body.StartsWith($"{second} took {WorldMap.Default.Capital(third).Name}, the capital of {third.Land()}, but fell himself in the same season, and the kingdom of {third.Land()} passes to you with his"));
    }

    [Fact]
    public void Kings_who_take_each_other_s_capitals_in_one_season_leave_their_land_free()
    {
        var s = Sieges((Power.Assyria, Power.Mitanni), (Power.Mitanni, Power.Assyria));
        Season(s, []);
        Assert.Contains(Power.Assyria, s.Eliminated);
        Assert.Contains(Power.Mitanni, s.Eliminated);
        Assert.All(WorldMap.Default.HomeOf(Power.Mitanni).Concat(WorldMap.Default.HomeOf(Power.Assyria)), p => Assert.Null(s.Owner[p.Id]));
        Assert.All(s.Falls, f => Assert.Null(f.Conqueror));
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
