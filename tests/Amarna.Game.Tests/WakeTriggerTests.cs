using Amarna.Engine;
using Amarna.Llm;

namespace Amarna.Game.Tests;

/// <summary>
/// Wake triggers fire on a change, not on a condition that merely holds: foreign troops arriving next to the capital,
/// the treasury falling below an amount, troops arriving in a province, a servant coming back.
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
        Assert.Contains("an envoy at your door, foreign troops in your land or next to your capital, land or troops lost", rules);
        Assert.Contains("- Foreign troops wake you when they move into your land, and, while you hold your capital, when they end a move in a province next to it (troops there can take it the next season). Troops that only stay where they are do not wake you again.", rules);
    }

    // ------------------------------------------------------------ the seat's own triggers fire on a change (Part G)

    /// <summary>A game in which Babylonia may sleep and is awake: it gives orders in turn 1. Its people serve on long terms, so no notice wakes it.</summary>
    private static (GameState S, SleepState Sleep) Awake()
    {
        var s = GameFactory.NewGame(31, Quiet);
        foreach (var c in s.Characters.Where(c => c.Employer == Power.Babylonia && c.Contract is not null)) c.Contract!.UntilTurn = 99;
        return (s, s.Sleep[Power.Babylonia] = new SleepState());
    }

    /// <summary>A game in which Babylonia sleeps (it gave orders in turn 1) with this trigger of its own.</summary>
    private static (GameState S, SleepState Sleep) Watching(WakeTrigger trigger, Action<GameState>? setup = null)
    {
        var s = GameFactory.NewGame(31, Quiet);
        setup?.Invoke(s);
        var sleep = s.Sleep[Power.Babylonia] = new SleepState { Asleep = true, LastCalled = 1, WakeAt = 50, History = [new SleepSpell { From = 2 }], Triggers = [trigger] };
        return (s, sleep);
    }

    /// <summary>Begins a season, lets the test change the world, fulfils the reports, and checks who wakes. Returns the engine, to resolve the season with.</summary>
    private static TurnEngine Begin(GameState s, Action<GameState>? change = null)
    {
        var e = new TurnEngine(s);
        e.BeginTurn();
        foreach (var r in e.MindRequests.ToList()) e.Fulfil(r, new MindReply { Text = $"[{r.Task}]" });
        change?.Invoke(s);
        e.WakeCheck();
        return e;
    }

    /// <summary>Babylonia's orders: these, and its own reasons to be woken.</summary>
    private static Dictionary<Power, TurnSubmission> Babylon(WakeTrigger trigger, params Order[] orders) =>
        new() { [Power.Babylonia] = new TurnSubmission { Orders = orders.ToList(), Sleep = new SleepRequest { WakeOn = [trigger] } } };

    private static Dictionary<Power, TurnSubmission> None() => new();

    [Fact]
    public void The_treasury_trigger_fires_when_the_treasury_falls_below_the_amount_and_again_only_once_it_has_risen_to_it()
    {
        var (s, sleep) = Awake();
        void Gold(int gold) => s.Treasuries[Power.Babylonia].Gold = gold;
        const string reason = "you asked to be woken when the treasury falls below 1000 shekels";

        // 1500 shekels as the trigger is set: 1200 is not below 1000, 900 is.
        Begin(s, _ => Gold(1500)).Resolve(Babylon(new WakeTrigger { Kind = WakeKind.TreasuryBelow, Amount = 1000 }));
        Assert.True(sleep.Asleep);
        Begin(s, _ => Gold(1200)).Resolve(None());
        Assert.True(sleep.Asleep);
        var e = Begin(s, _ => Gold(900));
        Assert.False(sleep.Asleep);
        Assert.Equal([reason], sleep.WokenBecause);

        // Set again while the treasury is below the amount, it does not fire while it stays below (before Part G it woke
        // the king every season); once the treasury has risen to the amount and falls back, it fires again.
        e.Resolve(Babylon(new WakeTrigger { Kind = WakeKind.TreasuryBelow, Amount = 1000 }));
        Assert.True(sleep.Asleep);
        Begin(s, _ => Gold(800)).Resolve(None());
        Assert.True(sleep.Asleep);
        Begin(s, _ => Gold(1000)).Resolve(None());
        Assert.True(sleep.Asleep);
        Begin(s, _ => Gold(950));
        Assert.False(sleep.Asleep);
        Assert.Equal([reason], sleep.WokenBecause);
    }

    [Fact]
    public void A_person_sent_out_with_the_orders_that_set_the_trigger_wakes_the_seat_the_season_they_are_back()
    {
        var (s, sleep) = Awake();
        var mane = s.Characters.First(c => c.Employer == Power.Babylonia && c.Status == CharacterStatus.Employed && c.At == Power.Babylonia && c.Duty == Duty.None);
        var back = new WakeTrigger { Kind = WakeKind.EnvoyReturns, Character = mane.Id };
        // Mane is still at court as the trigger is set: he leaves as the season resolves.
        Begin(s).Resolve(Babylon(back, new DispatchOrder(mane.Id, Power.Assyria, "Greetings, brother.")));
        Assert.True(sleep.Asleep);
        while (true)
        {
            Assert.True(s.Turn < 10, "Mane never came home");
            var e = Begin(s);
            if (mane.At == Power.Babylonia && mane.Duty == Duty.None) break;
            Assert.True(sleep.Asleep);
            foreach (var a in s.Audiences.Where(a => a.EnvoyId == mane.Id).ToList())
                e.ApplyAudience(new AudienceRecord { AudienceId = a.Id, Delivered = "Greetings.", Rounds = [new AudienceRound { Host = new HostReply { End = true }, Envoy = new EnvoyReaction() }] });
            e.Resolve(None());
        }
        Assert.False(sleep.Asleep);
        Assert.Equal([$"you asked to be woken when {mane.Id} is back at court"], sleep.WokenBecause);
    }

    [Fact]
    public void A_person_who_stays_at_court_never_sets_off_the_trigger_for_coming_back()
    {
        var (s, sleep) = Awake();
        var mane = s.Characters.First(c => c.Employer == Power.Babylonia && c.Status == CharacterStatus.Employed && c.At == Power.Babylonia && c.Duty == Duty.None);
        // Before Part G a king who named someone at court was woken the next season, and every season he named him again.
        Begin(s).Resolve(Babylon(new WakeTrigger { Kind = WakeKind.EnvoyReturns, Character = mane.Id }));
        for (var i = 0; i < 3; i++)
        {
            Begin(s).Resolve(None());
            Assert.True(sleep.Asleep);
        }
        Assert.Equal(Power.Babylonia, mane.At);
    }

    /// <summary>Assyria's army in Ekallatum, in Babylon's sight from Sippar, has gone to Arbela, out of it: Ekallatum stands empty, and has no walls.</summary>
    private static void EkallatumEmpty(GameState s) => s.Units.First(u => u.Province == "ekallatum").Province = "arbela";

    [Fact]
    public void Troops_that_move_into_the_province_wake_the_seat_but_troops_already_standing_there_do_not()
    {
        var (s, sleep) = Watching(new WakeTrigger { Kind = WakeKind.TroopsEnter, Province = "ekallatum", Power = Power.Assyria }, EkallatumEmpty);
        Season(s, Assyria(new MoveOrder("arbela", "ekallatum")));
        Assert.False(sleep.Asleep);
        Assert.Equal(["you asked to be woken when Assyria's troops enter ekallatum"], sleep.WokenBecause);

        // Asked again while the army stands there, the trigger waits for troops to move in: standing is no news (before
        // Part G it fired every season they stood there).
        Sleep(sleep);
        sleep.Triggers = [new WakeTrigger { Kind = WakeKind.TroopsEnter, Province = "ekallatum" }];
        Season(s, Assyria());
        Assert.True(sleep.Asleep);
        Assert.Empty(sleep.WokenBecause);
    }

    [Fact]
    public void A_failed_move_the_seats_own_troops_and_another_powers_troops_do_not_set_off_the_trigger_for_troops_entering()
    {
        // Babylon's own army stands in Ekallatum and holds: Assyria's move fails.
        var (s, sleep) = Watching(new WakeTrigger { Kind = WakeKind.TroopsEnter, Province = "ekallatum" }, s =>
        {
            EkallatumEmpty(s);
            s.Units.First(u => u.Province == "sippar").Province = "ekallatum";
        });
        Season(s, Assyria(new MoveOrder("arbela", "ekallatum")));
        Assert.True(sleep.Asleep);

        // Its own army moving in is not foreign troops.
        (s, sleep) = Watching(new WakeTrigger { Kind = WakeKind.TroopsEnter, Province = "ekallatum" }, EkallatumEmpty);
        Season(s, new() { [Power.Babylonia] = new TurnSubmission { Orders = [new MoveOrder("sippar", "ekallatum")] } });
        Assert.True(sleep.Asleep);

        // Troops of a power it did not name are not the ones it asked about.
        (s, sleep) = Watching(new WakeTrigger { Kind = WakeKind.TroopsEnter, Province = "ekallatum", Power = Power.Hatti }, EkallatumEmpty);
        Season(s, Assyria(new MoveOrder("arbela", "ekallatum")));
        Assert.True(sleep.Asleep);
    }

    [Fact]
    public void A_province_changing_hands_wakes_the_seat_once_it_changes_after_the_trigger_was_set()
    {
        var (s, sleep) = Awake();
        EkallatumEmpty(s);
        // Ekallatum is Assyria's as the trigger is set; a quiet season changes nothing. Then Mitanni's army takes it.
        Begin(s).Resolve(Babylon(new WakeTrigger { Kind = WakeKind.ProvinceChangesHands, Province = "ekallatum" }));
        Begin(s).Resolve(new Dictionary<Power, TurnSubmission> { [Power.Mitanni] = new TurnSubmission { Orders = [new MoveOrder("terqa", "ekallatum")] } });
        Assert.True(sleep.Asleep);
        Begin(s);
        Assert.False(sleep.Asleep);
        Assert.Equal(["you asked to be woken when ekallatum changes hands"], sleep.WokenBecause);
    }

    [Fact]
    public void The_rulebook_says_that_a_kings_own_triggers_fire_on_a_change()
    {
        var rules = Prompts.LeaderRules(true, new GameConfig());
        Assert.Contains("- Your own triggers (wake_on), at most 8, set anew with each set of orders. Each wakes you when something changes after you set it, never for a state that merely lasts: a unit moves (name the province it stands in); one of your people comes back to court (one at court when you set it must leave and come back first); your treasury falls below an amount (if it is below that already, it must first rise to the amount again); foreign troops (of one power, or any) move into a province and get there; or a province changes hands.", rules);
        Assert.Contains("Each fires on a change after you set it, not on a state that lasts.", Schemas.LeaderOrders(new GameConfig()).ToJsonString());
    }
}
