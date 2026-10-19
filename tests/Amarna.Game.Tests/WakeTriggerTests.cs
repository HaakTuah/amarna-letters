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
    public void A_failed_move_next_to_the_capital_does_not_wake_the_seat()
    {
        // Babylon's own army stands in Durkurigalzu, and holds.
        var (s, sleep) = Sleeping(s => s.Units.Add(new Unit { Id = s.NewId("u"), Power = Power.Babylonia, Kind = UnitKind.Army, Province = "durkurigalzu" }));
        Season(s, Assyria(new MoveOrder("ekallatum", "durkurigalzu")));
        Assert.True(sleep.Asleep);
        Assert.Empty(sleep.WokenBecause);
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
    public void Once_the_capital_is_lost_troops_next_to_it_wake_nobody()
    {
        var (s, sleep) = Sleeping(s =>
        {
            s.Units.RemoveAll(u => u.Province == "babylon");
            s.Owner["babylon"] = Power.Hatti;
        });
        Season(s, Assyria(new MoveOrder("ekallatum", "durkurigalzu")));
        Assert.True(sleep.Asleep);
        Assert.Empty(sleep.WokenBecause);
    }

    [Fact]
    public void The_rulebook_says_that_troops_next_to_the_capital_wake_a_king()
    {
        var rules = Prompts.LeaderRules(true, new GameConfig());
        Assert.Contains("an envoy at your door; foreign troops in your land or next to your capital; land or troops lost", rules);
        Assert.Contains("- Foreign troops wake you when they move into your land, and, while you hold your capital, when they end a move in a province next to it (troops there can take it the next season). Troops that only stay where they are do not wake you again.", rules);
    }
}
