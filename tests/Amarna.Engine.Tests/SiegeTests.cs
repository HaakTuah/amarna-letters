using Amarna.Engine;

namespace Amarna.Engine.Tests;

/// <summary>
/// Walls and sieges (Build order item 5): walls add nothing to a battle; a move into walls not its own takes the province
/// only by storming them; an army within them besieges the city, which surrenders when worn down as far as its walls are
/// high, a level lower; a siege is lifted when its army leaves or is destroyed.
/// </summary>
public class SiegeTests
{
    /// <summary>Seed 1 with no catastrophes, Babylonia's army in Sippar next to Mari (walls 2, a free city), Mitanni's in Terqa.</summary>
    internal static GameState Board()
    {
        var s = GameFactory.NewGame(1, new GameConfig { CatastropheChance = 0 });
        return s;
    }

    private static TurnEngine Season(GameState s, Dictionary<Power, TurnSubmission> orders)
    {
        var e = new TurnEngine(s);
        e.BeginTurn();
        e.Resolve(orders);
        return e;
    }

    private static Dictionary<Power, TurnSubmission> Orders(Power p, params Order[] orders) => new() { [p] = new TurnSubmission { Orders = orders.ToList() } };

    private static string Notice(GameState s, Power p, string title) => s.InboxOf(p).Last(i => i.Title == title && i.Turn == s.Turn).Body;

    [Fact]
    public void A_lone_army_takes_walls_2_in_the_second_season_after_it_got_in_and_the_walls_fall_a_level()
    {
        var s = Board();
        Season(s, Orders(Power.Babylonia, new MoveOrder("sippar", "mari")));
        Assert.Equal(Power.Babylonia, s.UnitAt("mari")?.Power);
        Assert.Null(s.Owner["mari"]);
        Assert.Empty(s.Sieges);

        // First besiege season: worn down 1 of 2.
        Season(s, Orders(Power.Babylonia, new BesiegeOrder("mari")));
        var siege = Assert.Single(s.Sieges);
        Assert.Equal((Power.Babylonia, 1, 2), (siege.Power, siege.Progress, siege.Since));
        Assert.Null(s.Owner["mari"]);
        Assert.Contains("Your siege of Mari (walls 2, a free city) has begun, and it wore the city down a step: it stands at 1 of 2.", Notice(s, Power.Babylonia, TurnEngine.SiegesTitle));
        Assert.Contains(Views.For(s, Power.Babylonia).Sieges, x => x.Province == "mari" && x.Progress == 1 && x.Walls == 2);

        // One besiege order is enough: holding with no order presses the siege, and Mari surrenders.
        Season(s, []);
        Assert.Empty(s.Sieges);
        Assert.Equal(Power.Babylonia, s.Owner["mari"]);
        Assert.Equal(1, s.WallsOf("mari"));
        Assert.Contains("Mari surrendered to you after a siege of 2 seasons: it is yours, with its walls a level lower (walls 1).", Notice(s, Power.Babylonia, TurnEngine.SiegesTitle));
        Assert.Contains(s.Events, e => e.Kind == "siege" && e.Text == "Mari surrendered to Babylonia after a siege of 2 seasons.");
    }

    [Fact]
    public void A_support_to_hold_wears_the_city_down_two_steps_and_a_cut_one_does_not()
    {
        var s = Board();
        s.Owner["mari"] = Power.Mitanni;
        s.Walls["mari"] = 3;
        s.Units.RemoveAll(u => u.Province == "terqa");
        s.Units.Add(new Unit { Id = s.NewId("u"), Power = Power.Babylonia, Kind = UnitKind.Army, Province = "mari" });
        Season(s, Orders(Power.Babylonia, new BesiegeOrder("mari"), new SupportOrder("sippar", "mari")));
        Assert.Equal(2, Assert.Single(s.Sieges).Progress);
        Assert.Contains("Babylonia's army has laid siege to your city of Mari (walls 3) and wore it down two steps, with a support: it stands at 2 of 3.", Notice(s, Power.Mitanni, TurnEngine.SiegesTitle));

        // The support is cut by an attack on Sippar: one step only, and Mari surrenders at 3.
        Season(s, new()
        {
            [Power.Babylonia] = new() { Orders = [new SupportOrder("sippar", "mari")] },
            [Power.Assyria] = new() { Orders = [new MoveOrder("ekallatum", "sippar")] },
        });
        Assert.Equal(Power.Babylonia, s.Owner["mari"]);
        Assert.Equal(2, s.WallsOf("mari"));
        Assert.Contains(s.InboxOf(Power.Mitanni), i => i.Title == "Land lost" && i.Body == "Mari has surrendered to Babylonia after a siege of 2 seasons.");
    }

    [Fact]
    public void A_siege_whose_army_leaves_is_lifted_and_its_progress_lost()
    {
        var s = Board();
        s.Units.Add(new Unit { Id = s.NewId("u"), Power = Power.Babylonia, Kind = UnitKind.Army, Province = "mari" });
        s.Walls["mari"] = 3;
        Season(s, Orders(Power.Babylonia, new BesiegeOrder("mari")));
        Assert.Equal(1, Assert.Single(s.Sieges).Progress);
        // A season in which the army supports elsewhere adds nothing, and the siege stands.
        Season(s, Orders(Power.Babylonia, new SupportOrder("mari", "sippar")));
        Assert.Equal(1, Assert.Single(s.Sieges).Progress);
        Assert.Contains("did not hold there, so the siege of Mari (walls 3) did not advance", Notice(s, Power.Babylonia, TurnEngine.SiegesTitle));
        // It marches out: the siege is lifted.
        Season(s, Orders(Power.Babylonia, new MoveOrder("mari", "damascus")));
        Assert.Empty(s.Sieges);
        Assert.Contains("Your siege of Mari is lifted: the besieging army marched out.", Notice(s, Power.Babylonia, TurnEngine.SiegesTitle));
        Assert.Null(s.Owner["mari"]);
    }

    [Fact]
    public void A_besieged_city_yields_nothing_and_the_besieger_pays_for_the_siege()
    {
        var s = Board();
        s.Owner["mari"] = Power.Mitanni;
        s.Units.Add(new Unit { Id = s.NewId("u"), Power = Power.Babylonia, Kind = UnitKind.Army, Province = "mari" });
        var e = new TurnEngine(s);
        var income = e.Income(Power.Mitanni);
        var upkeep = e.Upkeep(Power.Babylonia);
        Season(s, Orders(Power.Babylonia, new BesiegeOrder("mari")));
        e = new TurnEngine(s);
        Assert.Equal(income - 35, e.Income(Power.Mitanni));
        Assert.Equal(upkeep + s.Config.SiegeUpkeep, e.Upkeep(Power.Babylonia));
        // The city still counts in its holder's strength.
        Assert.Contains("mari", s.OwnedBy(Power.Mitanni));
        Assert.Equal(Power.Mitanni, s.Owner["mari"]);
    }

    [Fact]
    public void A_guest_within_walls_takes_nothing_and_an_attack_that_drives_the_besieger_out_lifts_the_siege()
    {
        var s = Board();
        s.Owner["mari"] = Power.Mitanni;
        s.Units.Add(new Unit { Id = s.NewId("u"), Power = Power.Babylonia, Kind = UnitKind.Army, Province = "mari" });
        // Holding without a besiege order: a guest, season after season.
        Season(s, []);
        Season(s, []);
        Assert.Equal(Power.Mitanni, s.Owner["mari"]);
        Assert.Empty(s.Sieges);
        // Turning on the host: a siege begins. Mitanni's army in Terqa, supported by Assyria's in Ekallatum, drives it out.
        Season(s, Orders(Power.Babylonia, new BesiegeOrder("mari")));
        Assert.Single(s.Sieges);
        Season(s, new()
        {
            [Power.Mitanni] = new() { Orders = [new MoveOrder("terqa", "mari")] },
            [Power.Assyria] = new() { Orders = [new SupportOrder("ekallatum", "terqa", "mari")] },
        });
        Assert.Equal(Power.Mitanni, s.UnitAt("mari")?.Power);
        Assert.Empty(s.Sieges);
        Assert.Equal(Power.Mitanni, s.Owner["mari"]);
        Assert.Contains("Your siege of Mari is lifted: the besieging army is gone.", Notice(s, Power.Babylonia, TurnEngine.SiegesTitle));
    }

    [Fact]
    public void Only_an_army_within_walls_it_does_not_hold_may_besiege()
    {
        var s = Board();
        s.Units.Add(new Unit { Id = s.NewId("u"), Power = Power.Egypt, Kind = UnitKind.Fleet, Province = "gaza" });
        s.Units.Add(new Unit { Id = s.NewId("u"), Power = Power.Egypt, Kind = UnitKind.Army, Province = "sinai" });
        var v = new OrderValidator(s);
        var r = v.Validate(Power.Egypt, new TurnSubmission { Orders = [new BesiegeOrder("gaza"), new BesiegeOrder("sinai"), new BesiegeOrder("memphis")] });
        Assert.Equal(["only an army can besiege a city; a fleet cannot", "Sinai has no walls to besiege", "Memphis is yours"], r.Rejected.Select(x => x.Reason));
    }

    [Fact]
    public void A_storm_takes_the_city_at_once_a_level_lower()
    {
        var s = Board();
        s.Walls["mari"] = 1;
        s.Units.Add(new Unit { Id = s.NewId("u"), Power = Power.Babylonia, Kind = UnitKind.Army, Province = "damascus" });
        Season(s, Orders(Power.Babylonia, new MoveOrder("sippar", "mari"), new SupportOrder("damascus", "sippar", "mari")));
        Assert.Equal(Power.Babylonia, s.Owner["mari"]);
        Assert.Equal(0, s.WallsOf("mari"));
        Assert.False(s.Walls.ContainsKey("mari"));
        Assert.Contains(s.Events, e => e.Kind == "storm" && e.Text == "Babylonia stormed the walls of Mari.");
    }

    [Fact]
    public void A_besiege_order_kept_for_later_follows_its_army_and_replays()
    {
        var s = Board();
        s.Units.Add(new Unit { Id = s.NewId("u"), Power = Power.Babylonia, Kind = UnitKind.Army, Province = "mari" });
        var plan = new PlannedOrder { Turn = 2, Order = new BesiegeOrder("mari"), UnitId = s.UnitAt("mari")!.Id };
        Assert.Equal(new BesiegeOrder("mari"), TurnEngine.AsItStands(s, Power.Babylonia, plan));
        var round = Json.Deserialize<Order>(Json.Serialize<Order>(new BesiegeOrder("mari")));
        Assert.Equal(new BesiegeOrder("mari"), round);
    }

    [Fact]
    public void Walls_that_sally_add_one_to_an_attack_on_the_troops_within_them()
    {
        // Mitanni holds Mari (walls 2); Babylonia's army besieges it. Mitanni's lone army from Terqa, with the walls' sally,
        // beats the besieger's 1 and drives it out; without the sally it bounces.
        GameState Board()
        {
            var s = SiegeTests.Board();
            s.Owner["mari"] = Power.Mitanni;
            s.Units.First(u => u.Province == "sippar").Province = "mari";
            s.Sieges.Add(new Siege { Province = "mari", Power = Power.Babylonia, UnitId = s.UnitAt("mari")!.Id, Progress = 1, Since = 1 });
            return s;
        }
        var bounced = Board();
        Season(bounced, Orders(Power.Mitanni, new MoveOrder("terqa", "mari")));
        Assert.Equal(Power.Babylonia, bounced.UnitAt("mari")?.Power);

        var s = Board();
        Season(s, Orders(Power.Mitanni, new MoveOrder("terqa", "mari"), new SallyOrder("mari", "terqa")));
        Assert.Equal(Power.Mitanni, s.UnitAt("mari")?.Power);
        Assert.Empty(s.Sieges);
        Assert.Contains("- The walls of mari sally in support of the attack from terqa: given", s.InboxOf(Power.Mitanni).Single(i => i.Title == "Movements last season" && i.Turn == s.Turn).Body);
        Assert.Contains(s.Events, e => e.Signal == "sally-won");

        // A sally that finds no attack is void, and walls below 2 cannot sally.
        var v = Board();
        Season(v, Orders(Power.Mitanni, new SallyOrder("mari", "damascus")));
        Assert.Contains("- The walls of mari sally in support of the attack from damascus: void: no unit moved from damascus to mari", v.InboxOf(Power.Mitanni).Single(i => i.Title == "Movements last season" && i.Turn == v.Turn).Body);
        var low = Board();
        low.Walls["mari"] = 1;
        var refused = new OrderValidator(low).Validate(Power.Mitanni, new TurnSubmission { Orders = [new SallyOrder("mari", "terqa"), new SallyOrder("harran", "terqa")] });
        Assert.Equal(["the walls of Mari stand at 1: only walls of 2 or more can sally", "Harran has no walls to sally from"], refused.Rejected.Select(r => r.Reason));
    }
}
