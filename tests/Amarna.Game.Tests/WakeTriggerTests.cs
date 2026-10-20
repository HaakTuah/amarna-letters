using Amarna.Engine;
using Amarna.Llm;

namespace Amarna.Game.Tests;

/// <summary>
/// The engine's wake triggers fire on a change, not on a condition that merely holds: foreign troops arriving next to the
/// capital. A king has no triggers of his own (removed in the fix pass after item 4).
/// </summary>
public class WakeTriggerTests
{
    private static readonly GameConfig Quiet = new() { MinTurns = 40, CatastropheChance = 0 };

    /// <summary>A game in which Babylonia sleeps (it gave orders in turn 1) and Durkurigalzu, next to Babylon, is Assyria's and empty.</summary>
    private static (GameState S, SleepState Sleep) Sleeping(Action<GameState>? setup = null)
    {
        var s = GameFactory.NewGame(31, Quiet);
        s.Units.RemoveAll(u => u.Province == "durkurigalzu");
        s.Owner["durkurigalzu"] = Power.Assyria;
        setup?.Invoke(s);
        var sleep = s.Sleep[Power.Babylonia] = new SleepState { Asleep = true, LastCalled = 1, WakeAt = 50, History = [new SleepSpell { From = 2 }] };
        return (s, sleep);
    }

    /// <summary>Plays one season with these orders, then begins the next and checks who wakes.</summary>
    private static void Season(GameState s, Dictionary<Power, TurnSubmission> orders)
    {
        var e = new TurnEngine(s);
        e.BeginTurn();
        e.Resolve(orders);
        var next = new TurnEngine(s);
        next.BeginTurn();
        next.WakeCheck();
    }

    private static Dictionary<Power, TurnSubmission> Assyria(params Order[] orders) => new() { [Power.Assyria] = new TurnSubmission { Orders = orders.ToList() } };

    /// <summary>Asleep again, as after another set of orders, with nothing pending.</summary>
    private static void Sleep(SleepState sleep)
    {
        sleep.Asleep = true;
        sleep.WokenBecause.Clear();
        sleep.History.Add(new SleepSpell { From = 3 });
    }

    // ------------------------------------------------------------ foreign troops next to the capital (temporary, until sieges)

    [Fact]
    public void Foreign_troops_that_end_a_move_next_to_the_capital_wake_the_seat_once()
    {
        var (s, sleep) = Sleeping();
        Assert.Contains("durkurigalzu", WorldMap.Default.Neighbors("babylon"));
        Season(s, Assyria(new MoveOrder("ekallatum", "durkurigalzu")));
        Assert.False(sleep.Asleep);
        // Durkurigalzu is Assyria's here, so only the capital trigger fires.
        Assert.Equal(["foreign troops came next to your capital: Assyria's army moved ekallatum -> durkurigalzu"], sleep.WokenBecause);

        // Standing there the next season is no news: it does not wake the seat again.
        Sleep(sleep);
        Season(s, Assyria());
        Assert.True(sleep.Asleep);
    }

    [Fact]
    public void A_fleet_arriving_off_a_coastal_capital_wakes_the_seat()
    {
        var s = GameFactory.NewGame(31, Quiet);
        var sleep = s.Sleep[Power.Alashiya] = new SleepState { Asleep = true, LastCalled = 1, WakeAt = 50, History = [new SleepSpell { From = 2 }] };
        Season(s, new() { [Power.Egypt] = new TurnSubmission { Orders = [new MoveOrder("delta", "levantsea")] } });
        Assert.Equal(["foreign troops came next to your capital: Egypt's fleet moved delta -> levantsea"], sleep.WokenBecause);
    }

    [Fact]
    public void A_failed_move_next_to_the_capital_wakes_the_seat_only_as_an_attack_on_its_troops()
    {
        // Babylon's own army stands in Durkurigalzu, and holds: the move did not arrive, but it was an attack on its troops.
        var (s, sleep) = Sleeping(s => s.Units.Add(new Unit { Id = s.NewId("u"), Power = Power.Babylonia, Kind = UnitKind.Army, Province = "durkurigalzu" }));
        Season(s, Assyria(new MoveOrder("ekallatum", "durkurigalzu")));
        Assert.False(sleep.Asleep);
        Assert.Equal([$"{TurnEngine.AttackedReason}: Assyria's army tried to move ekallatum -> durkurigalzu"], sleep.WokenBecause);

        // Two of Assyria's armies bounce in its own empty Durkurigalzu: neither arrived, nor attacked Babylonia's land or troops.
        (s, sleep) = Sleeping(s => s.Units.Add(new Unit { Id = s.NewId("u"), Power = Power.Assyria, Kind = UnitKind.Army, Province = "susa" }));
        Season(s, Assyria(new MoveOrder("ekallatum", "durkurigalzu"), new MoveOrder("susa", "durkurigalzu")));
        Assert.True(sleep.Asleep);
        Assert.Empty(sleep.WokenBecause);
    }

    [Fact]
    public void A_failed_assault_on_a_walled_city_it_holds_wakes_the_seat()
    {
        // The review's probe (Babylonia's debrief, seed 15): Mitanni's army already stands in Terqa, next to Babylon's bought
        // Mari, when Babylon last gave orders, so no arrival wakes it. Since the siege package Mitanni's lone attack gets
        // within the walls without storming them: the city is still Babylon's, and the entry into its land wakes it.
        var (s, sleep) = Sleeping(s =>
        {
            s.Owner["mari"] = Power.Babylonia;
            s.Units.RemoveAll(u => u.Province == "terqa");
            s.Units.Add(new Unit { Id = s.NewId("u"), Power = Power.Mitanni, Kind = UnitKind.Army, Province = "terqa" });
        });
        Season(s, new() { [Power.Mitanni] = new TurnSubmission { Orders = [new MoveOrder("terqa", "mari")] } });
        Assert.Equal(2, s.WallsOf("mari"));
        Assert.Equal(Power.Babylonia, s.Owner["mari"]);
        Assert.Equal(Power.Mitanni, s.UnitAt("mari")?.Power);
        Assert.False(sleep.Asleep);
        Assert.Equal(["foreign troops entered your land: Mitanni's army moved terqa -> mari"], sleep.WokenBecause);

        // A home province with its army in it, attacked in vain: the same reason.
        (s, sleep) = Sleeping(s =>
        {
            s.Units.RemoveAll(u => u.Province is "nippur" or "susa");
            s.Units.Add(new Unit { Id = s.NewId("u"), Power = Power.Babylonia, Kind = UnitKind.Army, Province = "nippur" });
            s.Units.Add(new Unit { Id = s.NewId("u"), Power = Power.Assyria, Kind = UnitKind.Army, Province = "susa" });
        });
        Season(s, Assyria(new MoveOrder("susa", "nippur")));
        Assert.Equal(Power.Babylonia, s.Owner["nippur"]);
        Assert.Equal([$"{TurnEngine.AttackedReason}: Assyria's army tried to move susa -> nippur"], sleep.WokenBecause);
    }

    [Fact]
    public void The_seats_own_troops_moving_next_to_its_capital_do_not_wake_it()
    {
        var (s, sleep) = Sleeping();
        s.Turn = 3;
        s.LastSeen[Power.Babylonia] = [new OrderOutcome { Power = Power.Babylonia, UnitKind = UnitKind.Army, Province = "sippar", Order = "move", Target = "durkurigalzu", Succeeded = true, TargetOwner = Power.Assyria }];
        new TurnEngine(s).WakeCheck();
        Assert.True(sleep.Asleep);
    }

    [Fact]
    public void Once_the_capital_is_lost_troops_next_to_it_wake_the_seat_only_for_the_homeland_it_still_holds()
    {
        // Babylon is Hatti's: troops coming to Dur-Kurigalzu, next to it, are no threat to a capital the seat no longer
        // holds, only to Nippur and Sippar, which it does (since the fix pass after item 4).
        var (s, sleep) = Sleeping(s =>
        {
            s.Units.RemoveAll(u => u.Province == "babylon");
            s.Owner["babylon"] = Power.Hatti;
        });
        Season(s, Assyria(new MoveOrder("ekallatum", "durkurigalzu")));
        Assert.Equal([$"{TurnEngine.HomelandReason}: Assyria's army moved ekallatum -> durkurigalzu, next to nippur, sippar"], sleep.WokenBecause);

        // With nothing of its homeland next to Dur-Kurigalzu left, the same move wakes nobody.
        (s, sleep) = Sleeping(s =>
        {
            foreach (var x in new[] { "babylon", "nippur", "sippar" })
            {
                s.Units.RemoveAll(u => u.Province == x);
                s.Owner[x] = Power.Hatti;
            }
        });
        Season(s, Assyria(new MoveOrder("ekallatum", "durkurigalzu")));
        Assert.True(sleep.Asleep);
        Assert.Empty(sleep.WokenBecause);
    }

    // ------------------------------------------------------------ a threat to a home province or a walled city (the fix pass after item 4)

    /// <summary>A game in which Alashiya sleeps (it gave orders in turn 1).</summary>
    private static (GameState S, SleepState Sleep) AlashiyaAsleep(Action<GameState>? setup = null)
    {
        var s = GameFactory.NewGame(31, Quiet);
        setup?.Invoke(s);
        var sleep = s.Sleep[Power.Alashiya] = new SleepState { Asleep = true, LastCalled = 1, WakeAt = 50, History = [new SleepSpell { From = 2 }] };
        return (s, sleep);
    }

    private static Dictionary<Power, TurnSubmission> Egypt(params Order[] orders) => new() { [Power.Egypt] = new TurnSubmission { Orders = orders.ToList() } };

    [Fact]
    public void Foreign_troops_that_end_a_move_next_to_a_home_province_wake_the_seat_once()
    {
        // The second simulation's case (seed 7): Egypt's fleet comes beside Tamassos, Alashiya's other province, out of
        // reach of Enkomi, its capital. Before the fix pass only an envoy at its door could have woken Alashiya then.
        var (s, sleep) = AlashiyaAsleep();
        Assert.DoesNotContain("enkomi", WorldMap.Default.Neighbors("greatgreen"));
        Season(s, Egypt(new MoveOrder("delta", "greatgreen")));
        Assert.False(sleep.Asleep);
        Assert.Equal([$"{TurnEngine.HomelandReason}: Egypt's fleet moved delta -> greatgreen, next to tamassos"], sleep.WokenBecause);

        // Standing there the next season is no news.
        Sleep(sleep);
        Season(s, Egypt());
        Assert.True(sleep.Asleep);
    }

    [Fact]
    public void Foreign_troops_that_end_a_move_next_to_a_walled_city_it_holds_wake_the_seat()
    {
        // Babylon bought Mari, whose walls hold for it; Mitanni's army comes to Terqa, next to Mari and to none of Babylon's
        // homeland (the second simulation's seed 15: no trigger woke Babylonia for troops next to a bought walled city).
        var (s, sleep) = Sleeping(s =>
        {
            s.Owner["mari"] = Power.Babylonia;
            s.Units.RemoveAll(u => u.Province == "terqa");
        });
        Assert.Equal(2, s.WallsOf("mari"));
        Season(s, new() { [Power.Mitanni] = new TurnSubmission { Orders = [new MoveOrder("washukanni", "terqa")] } });
        Assert.False(sleep.Asleep);
        Assert.Equal([$"{TurnEngine.WallsReason}: Mitanni's army moved washukanni -> terqa, next to mari"], sleep.WokenBecause);

        // A free city's walls are not its own: the same move wakes nobody.
        (s, sleep) = Sleeping(s => s.Units.RemoveAll(u => u.Province == "terqa"));
        Season(s, new() { [Power.Mitanni] = new TurnSubmission { Orders = [new MoveOrder("washukanni", "terqa")] } });
        Assert.True(sleep.Asleep);
    }

    [Fact]
    public void A_move_into_its_land_wakes_the_seat_for_that_alone_and_a_lost_threat_wakes_nobody()
    {
        // Assyria's army in Susa walks into empty Ur, next to Nippur: entering its land is the reason, not the threat to Nippur.
        var (s, sleep) = Sleeping(s => s.Units.Add(new Unit { Id = s.NewId("u"), Power = Power.Assyria, Kind = UnitKind.Army, Province = "susa" }));
        Season(s, Assyria(new MoveOrder("susa", "ur")));
        Assert.False(sleep.Asleep);
        Assert.Contains("foreign troops entered your land: Assyria's army moved susa -> ur", sleep.WokenBecause);
        Assert.DoesNotContain(sleep.WokenBecause, r => r.StartsWith(TurnEngine.HomelandReason, StringComparison.Ordinal));

        // Tamassos already lost: Egypt's fleet beside it is no threat to Alashiya's land.
        (s, sleep) = AlashiyaAsleep(s => s.Owner["tamassos"] = Power.Egypt);
        Season(s, Egypt(new MoveOrder("delta", "greatgreen")));
        Assert.True(sleep.Asleep);

        // Alashiya's own fleet holds the Great Green: Egypt's move fails, and wakes it as an attack on its troops (since the
        // review of the fix pass after item 4; before, an attack that did not get in waited in the digest), not as a threat.
        (s, sleep) = AlashiyaAsleep(s => s.Units.First(u => u.Province == "enkomi").Province = "greatgreen");
        Season(s, Egypt(new MoveOrder("delta", "greatgreen")));
        Assert.Equal([$"{TurnEngine.AttackedReason}: Egypt's fleet tried to move delta -> greatgreen"], sleep.WokenBecause);
    }

    [Fact]
    public void The_rulebook_says_that_troops_next_to_the_homeland_or_a_walled_city_wake_a_king()
    {
        var rules = Prompts.LeaderRules(true, new GameConfig());
        Assert.Contains("an envoy at your door; foreign troops entering or attacking your land or your troops, or arriving next to your homeland or a walled city you hold; land or troops lost", rules);
        Assert.Contains("- Foreign troops wake you when they move into your land or against your troops, whether or not the move succeeds, and when they end a move in a province next to your capital, another province of your homeland or a walled city you hold, while you hold it (troops there can take it the next season). Troops that only stay where they are do not wake you again, nor do troops raised by a levy.", rules);
    }
}
