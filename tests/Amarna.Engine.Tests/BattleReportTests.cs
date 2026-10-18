using Amarna.Engine;

namespace Amarna.Engine.Tests;

/// <summary>What a king reads about last season's movements: foreign moves into what it sees, and why its own moves failed.</summary>
public class BattleReportTests
{
    private static string Report(GameState s, Power p) =>
        s.InboxOf(p).Single(i => i.Kind == InboxKind.Battle && i.Title.StartsWith("Movements", StringComparison.Ordinal)).Body;

    private static void Resolve(GameState s, Dictionary<Power, TurnSubmission> orders) => new TurnEngine(s).Resolve(orders);

    [Fact]
    public void A_move_from_out_of_sight_that_bounces_your_move_is_reported_with_where_it_came_from()
    {
        // Arbela lies beyond Babylon's sight; Susa, next to Dur-Kurigalzu, within it.
        var s = GameFactory.NewGame(1);
        s.Garrisons.Remove("susa");
        s.Units.Add(new Unit { Id = "u90", Power = Power.Assyria, Kind = UnitKind.Army, Province = "arbela" });
        Assert.DoesNotContain("arbela", Views.Sight(s, WorldMap.Default, Power.Babylonia));
        Resolve(s, new()
        {
            [Power.Babylonia] = new() { Orders = [new MoveOrder("durkurigalzu", "susa")] },
            [Power.Assyria] = new() { Orders = [new MoveOrder("arbela", "susa")] },
        });

        var report = Report(s, Power.Babylonia);
        Assert.Contains("- A durkurigalzu -> susa: fails: it met a move into susa from arbela by Assyria's army; your strength 1 against 1", report);
        Assert.Contains("- Assyria: A arbela -> susa: fails", report);
    }

    [Fact]
    public void A_failed_attack_on_a_held_province_gives_the_strengths()
    {
        var s = GameFactory.NewGame(1);
        Resolve(s, new()
        {
            [Power.Assyria] = new() { Orders = [new MoveOrder("ashur", "terqa"), new SupportOrder("ekallatum", "ashur", "terqa")] },
            [Power.Mitanni] = new() { Orders = [new SupportOrder("washukanni", "terqa")] },
        });

        Assert.Contains("- A ashur -> terqa: fails: the unit holding terqa (Mitanni's army) kept its place; your strength 2 against 2", Report(s, Power.Assyria));
        Assert.Equal(Power.Mitanni, s.UnitAt("terqa")?.Power);
    }

    [Fact]
    public void A_support_whose_unit_is_destroyed_is_void_and_a_cut_support_says_from_where()
    {
        var s = GameFactory.NewGame(1);
        Resolve(s, new()
        {
            [Power.Assyria] = new() { Orders = [new MoveOrder("ashur", "terqa"), new SupportOrder("ekallatum", "ashur", "terqa")] },
            [Power.Babylonia] = new() { Orders = [new MoveOrder("sippar", "ekallatum"), new SupportOrder("durkurigalzu", "sippar", "ekallatum")] },
        });
        var destroyed = Report(s, Power.Assyria);
        Assert.Contains("- A ekallatum supports ashur -> terqa: void: the supporting unit was destroyed", destroyed);
        Assert.Contains("- A ekallatum is destroyed", destroyed);
        Assert.Contains("- A ashur -> terqa: fails: the unit holding terqa (Mitanni's army) kept its place; your strength 1 against 1", destroyed);

        var t = GameFactory.NewGame(1);
        Resolve(t, new()
        {
            [Power.Assyria] = new() { Orders = [new MoveOrder("ashur", "terqa"), new SupportOrder("ekallatum", "ashur", "terqa")] },
            [Power.Babylonia] = new() { Orders = [new MoveOrder("sippar", "ekallatum")] },
        });
        Assert.Contains("- A ekallatum supports ashur -> terqa: cut (attacked from sippar)", Report(t, Power.Assyria));
        Assert.Contains("- A sippar -> ekallatum: fails: the unit holding ekallatum (Assyria's army) kept its place; your strength 1 against 1", Report(t, Power.Babylonia));
    }

    [Fact]
    public void Walls_your_own_units_and_a_unit_moving_the_other_way_are_named_as_the_reason()
    {
        var s = GameFactory.NewGame(1);
        Resolve(s, new()
        {
            [Power.Hatti] = new() { Orders = [new MoveOrder("kanesh", "carchemish")] },
            [Power.Assyria] = new() { Orders = [new MoveOrder("ashur", "nineveh"), new MoveOrder("ekallatum", "terqa")] },
            [Power.Mitanni] = new() { Orders = [new MoveOrder("terqa", "ekallatum")] },
        });

        Assert.Contains("- A kanesh -> carchemish: fails: the walls of carchemish held; your strength 1 against 1", Report(s, Power.Hatti));
        var assyria = Report(s, Power.Assyria);
        Assert.Contains("- A ashur -> nineveh: fails: your own army in nineveh did not leave, and you cannot dislodge your own unit", assyria);
        Assert.Contains("- A ekallatum -> terqa: fails: it met the unit from terqa (Mitanni's army) coming the other way; your strength 1 against 1", assyria);
    }

    [Fact]
    public void The_reasons_reveal_nothing_to_other_kings()
    {
        var s = GameFactory.NewGame(1);
        Resolve(s, new()
        {
            [Power.Assyria] = new() { Orders = [new MoveOrder("ashur", "terqa"), new SupportOrder("ekallatum", "ashur", "terqa")] },
            [Power.Mitanni] = new() { Orders = [new SupportOrder("washukanni", "terqa")] },
        });
        // Mitanni sees Assyria's move into its land, but not Assyria's reckoning of it.
        var mitanni = Report(s, Power.Mitanni);
        Assert.Contains("- Assyria: A ashur -> terqa: fails", mitanni);
        Assert.DoesNotContain("your strength", mitanni.Split('\n').Where(l => l.Contains("Assyria:")).Aggregate("", (a, b) => a + b));
    }
}
