using Amarna.Engine;

namespace Amarna.Engine.Tests;

/// <summary>
/// The reasons a battle report gives that the first battle report tests leave out: a head-to-head lost before a
/// third move walked in, a unit out of sight left unnamed, a unit that could not leave, a missing convoy, and
/// supports or convoys that matched nothing.
/// </summary>
public class BattleReasonTests
{
    private static string Report(GameState s, Power p) =>
        s.InboxOf(p).Single(i => i.Kind == InboxKind.Battle && i.Title.StartsWith("Movements", StringComparison.Ordinal)).Body;

    private static void Resolve(GameState s, Dictionary<Power, TurnSubmission> orders) => new TurnEngine(s).Resolve(orders);

    [Fact]
    public void A_head_to_head_lost_is_the_reason_even_when_a_third_move_takes_the_province()
    {
        // Assyria (2) and Mitanni (3) meet head to head between Ekallatum and Terqa; Hatti walks into the Terqa Mitanni left.
        var s = GameFactory.NewGame(1);
        s.Units.Add(new Unit { Id = "u90", Power = Power.Hatti, Kind = UnitKind.Army, Province = "harran" });
        Resolve(s, new()
        {
            [Power.Assyria] = new() { Orders = [new MoveOrder("ekallatum", "terqa"), new SupportOrder("ashur", "ekallatum", "terqa")] },
            [Power.Mitanni] = new() { Orders = [new MoveOrder("terqa", "ekallatum")] },
            [Power.Babylonia] = new() { Orders = [new SupportOrder("sippar", "terqa", "ekallatum"), new SupportOrder("durkurigalzu", "terqa", "ekallatum")] },
            [Power.Hatti] = new() { Orders = [new MoveOrder("harran", "terqa")] },
        });

        Assert.Equal(Power.Hatti, s.UnitAt("terqa")?.Power);
        Assert.Equal(Power.Mitanni, s.UnitAt("ekallatum")?.Power);
        var assyria = Report(s, Power.Assyria);
        Assert.Contains("- A ekallatum -> terqa: fails: it met the unit from terqa (Mitanni's army) coming the other way; your strength 2 against 3", assyria);
        Assert.Contains("- A ekallatum is destroyed", assyria);
        Assert.DoesNotContain("from harran", assyria.Split('\n').Single(l => l.StartsWith("- A ekallatum -> terqa", StringComparison.Ordinal)));
    }

    [Fact]
    public void A_unit_holding_a_coast_out_of_sight_is_not_named_and_a_missing_convoy_is_the_reason()
    {
        // Egypt's army in the Delta crosses the Great Green in Alashiya's ships to Lukka, which Arzawa holds; Lukka lies beyond Egypt's sight.
        GameState Board()
        {
            var s = GameFactory.NewGame(1);
            s.Units.Single(u => u.Province == "delta").Kind = UnitKind.Army;
            s.Units.Single(u => u.Province == "enkomi").Province = "greatgreen";
            s.Walls.Remove("lukka");
            s.Owner["lukka"] = Power.Arzawa;
            s.Units.Add(new Unit { Id = "u90", Power = Power.Arzawa, Kind = UnitKind.Army, Province = "lukka" });
            return s;
        }

        var s = Board();
        Assert.DoesNotContain("lukka", Views.Sight(s, WorldMap.Default, Power.Egypt));
        Resolve(s, new()
        {
            [Power.Egypt] = new() { Orders = [new MoveOrder("delta", "lukka")] },
            [Power.Alashiya] = new() { Orders = [new ConvoyOrder("greatgreen", "delta", "lukka")] },
        });
        var egypt = Report(s, Power.Egypt);
        Assert.Contains("- A delta -> lukka (by sea): fails: the unit holding lukka kept its place; your strength 1 against 1", egypt);
        Assert.DoesNotContain("Arzawa", egypt);

        // When the ships carry it somewhere else, nothing carried it to Lukka, and the fleet's king is told why its convoy was void.
        var t = Board();
        Resolve(t, new()
        {
            [Power.Egypt] = new() { Orders = [new MoveOrder("delta", "lukka")] },
            [Power.Alashiya] = new() { Orders = [new ConvoyOrder("greatgreen", "delta", "tamassos")] },
        });
        Assert.Contains("- A delta -> lukka (by sea): fails: no convoy carried it across the sea", Report(t, Power.Egypt));
        Assert.Contains("- F greatgreen convoys delta -> tamassos: void: no army moved from delta to tamassos by sea", Report(t, Power.Alashiya));
        Assert.Contains("- Alashiya: F greatgreen convoys delta -> tamassos: void", Report(t, Power.Egypt));
    }

    [Fact]
    public void A_unit_that_could_not_leave_kept_its_place()
    {
        // Mitanni's army in Terqa and Babylon's in Sippar strike Mari and bounce, so Assyria's move into Terqa meets it still there.
        var s = GameFactory.NewGame(1);
        Resolve(s, new()
        {
            [Power.Assyria] = new() { Orders = [new MoveOrder("ashur", "terqa")] },
            [Power.Mitanni] = new() { Orders = [new MoveOrder("terqa", "mari")] },
            [Power.Babylonia] = new() { Orders = [new MoveOrder("sippar", "mari")] },
        });
        Assert.Contains("- A ashur -> terqa: fails: the unit in terqa (Mitanni's army) could not leave, so it kept its place; your strength 1 against 1", Report(s, Power.Assyria));
        Assert.Contains("- A terqa -> mari: fails: it met a move into mari from sippar by Babylonia's army; your strength 1 against 1", Report(s, Power.Mitanni));
    }

    [Fact]
    public void A_support_that_matches_nothing_is_void_and_only_its_own_king_is_told_why()
    {
        var s = GameFactory.NewGame(1);
        Resolve(s, new()
        {
            // Babylon supports a move Dur-Kurigalzu does not make; Sippar supports Dur-Kurigalzu holding, but it moves.
            [Power.Babylonia] = new() { Orders = [new SupportOrder("babylon", "durkurigalzu", "nippur"), new SupportOrder("sippar", "durkurigalzu"), new MoveOrder("durkurigalzu", "susa")] },
        });
        var babylonia = Report(s, Power.Babylonia);
        Assert.Contains("- A babylon supports durkurigalzu -> nippur: void: no unit moved from durkurigalzu to nippur", babylonia);
        Assert.Contains("- A sippar supports durkurigalzu holding: void: the unit in durkurigalzu was ordered to move, not to hold", babylonia);
        var own = babylonia.Split("\nSeen nearby:")[0];
        Assert.DoesNotContain("holds", own);

        // Assyria, next door, sees the void support but not the reason.
        var assyria = Report(s, Power.Assyria);
        Assert.Contains("- Babylonia: A sippar supports durkurigalzu holding: void", assyria);
        Assert.DoesNotContain("ordered to move", assyria);
    }
}
