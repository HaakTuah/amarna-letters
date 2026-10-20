using Amarna.Engine;

namespace Amarna.Engine.Tests;

/// <summary>
/// The desert costs an army supplies (Build order item 5, the siege package; question 5, plan step 15, built as "an army in
/// its own land pays no desert cost"): an army that ends a season in desert land its king did not hold when the moves were
/// made pays with the next upkeep; one in its own land pays nothing, whoever its king is.
/// </summary>
public class DesertTests
{
    private static GameState Game(GameConfig? config = null)
    {
        var s = GameFactory.NewGame(1, config ?? new GameConfig { CatastropheChance = 0 });
        // Hatti's Hattusa army stands in Gaza, Hatti's own, next to the Sinai.
        s.Units.Single(u => u.Province == "hattusa").Province = "gaza";
        s.Walls.Remove("gaza");
        s.Owner["gaza"] = Power.Hatti;
        return s;
    }

    private static string Treasury(GameState s, Power p) => s.InboxOf(p).Last(i => i.Title == "The treasury").Body;

    [Fact]
    public void An_army_that_marches_into_the_desert_pays_once_and_none_after_its_king_holds_it()
    {
        var s = Game();
        var e = new TurnEngine(s);
        var before = e.Upkeep(Power.Hatti);
        e.Resolve(new Dictionary<Power, TurnSubmission> { [Power.Hatti] = new() { Orders = [new MoveOrder("gaza", "sinai")] } });
        Assert.Equal(Power.Hatti, s.Owner["sinai"]);
        var army = s.UnitAt("sinai")!;
        Assert.Equal([army.Id], s.InDesert);
        Assert.Equal(before + 30, e.Upkeep(Power.Hatti));
        Assert.Equal("desert", Assert.Single(s.Events, x => x.Kind == "desert").Signal);

        var gold = s.Treasuries[Power.Hatti].Gold;
        var income = e.Income(Power.Hatti);
        e.BeginTurn();
        Assert.Contains("The upkeep includes 30 shekels for supplies in the desert: your army in sinai ended last season in desert land you did not hold.", Treasury(s, Power.Hatti));
        Assert.Empty(s.InDesert);
        // Paid once, with the troops' upkeep: the forecast no longer carries it.
        Assert.Equal(before, e.Upkeep(Power.Hatti));
        Assert.True(s.Treasuries[Power.Hatti].Gold <= gold + income - before - 30);

        // Next season the Sinai is Hatti's own: its army stands there for nothing more.
        e.Resolve(new Dictionary<Power, TurnSubmission>());
        Assert.Empty(s.InDesert);
        e.BeginTurn();
        Assert.DoesNotContain("desert", Treasury(s, Power.Hatti));
    }

    [Fact]
    public void An_army_in_its_own_desert_pays_nothing_whoever_its_king_is()
    {
        // Egypt holds the Sinai from the start: its army marches in and out for nothing.
        var s = Game();
        var e = new TurnEngine(s);
        s.Units.Single(u => u.Province == "memphis").Province = "delta";
        s.Units.Single(u => u.Province == "delta" && u.Kind == UnitKind.Fleet).Province = "levantsea";
        e.Resolve(new Dictionary<Power, TurnSubmission> { [Power.Egypt] = new() { Orders = [new MoveOrder("delta", "sinai")] } });
        Assert.Equal(Power.Egypt, s.UnitAt("sinai")!.Power);
        Assert.Empty(s.InDesert);
        Assert.DoesNotContain(s.Events, x => x.Kind == "desert");
    }

    [Fact]
    public void An_army_within_walls_in_the_desert_pays_every_season_it_stays()
    {
        // Egypt has raised walls in the Sinai: Hatti's army gets in but cannot storm them, and stands in Egypt's desert.
        var s = Game();
        s.Walls["sinai"] = 1;
        var e = new TurnEngine(s);
        e.Resolve(new Dictionary<Power, TurnSubmission> { [Power.Hatti] = new() { Orders = [new MoveOrder("gaza", "sinai")] } });
        Assert.Equal(Power.Egypt, s.Owner["sinai"]);
        Assert.Single(s.InDesert);
        e.BeginTurn();
        e.Resolve(new Dictionary<Power, TurnSubmission> { [Power.Hatti] = new() { Orders = [new BesiegeOrder("sinai")] } });
        Assert.Single(s.InDesert);
        e.BeginTurn();
        Assert.Contains("for supplies in the desert", Treasury(s, Power.Hatti));
    }

    [Fact]
    public void A_desert_cost_unpaid_makes_troops_desert_like_any_upkeep_and_nothing_turns_it_off()
    {
        var s = Game();
        var e = new TurnEngine(s);
        e.Resolve(new Dictionary<Power, TurnSubmission> { [Power.Hatti] = new() { Orders = [new MoveOrder("gaza", "sinai")] } });
        // Hatti's treasury cannot pay its troops and the desert: the farthest from Hattusa, the army in the Sinai, deserts.
        s.Treasuries[Power.Hatti].Gold = -e.Income(Power.Hatti) + e.Upkeep(Power.Hatti) - 1;
        e.BeginTurn();
        Assert.Null(s.UnitAt("sinai"));
        Assert.Contains("Unpaid troops deserted: A sinai.", Treasury(s, Power.Hatti));
        Assert.DoesNotContain("for supplies in the desert", Treasury(s, Power.Hatti));

        var off = Game(new GameConfig { CatastropheChance = 0, DesertUpkeep = 0 });
        new TurnEngine(off).Resolve(new Dictionary<Power, TurnSubmission> { [Power.Hatti] = new() { Orders = [new MoveOrder("gaza", "sinai")] } });
        Assert.Empty(off.InDesert);
    }
}
