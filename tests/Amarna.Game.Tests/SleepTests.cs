using Amarna.Engine;
using Amarna.Game;
using Amarna.Game.Batch;
using Amarna.Game.Bots;

namespace Amarna.Game.Tests;

public class SleepTests
{
    /// <summary>A seat that may sleep, deciding from a script, and remembering when it was asked.</summary>
    private sealed class Sleeper(Func<SeatView, TurnSubmission> decide) : ISeat
    {
        public List<SeatView> Views { get; } = new();
        public List<int> Hosted { get; } = new();
        public IEnumerable<int> Calls => Views.Select(v => v.Turn);
        public string Label => "Test sleeper";
        public bool CanSleep => true;

        public Task<TurnSubmission> DecideAsync(SeatView view, CancellationToken ct)
        {
            lock (Views) Views.Add(view);
            return Task.FromResult(decide(view));
        }

        public Task<HostReply> HostAudienceAsync(AudienceView view, SeatView court, CancellationToken ct)
        {
            lock (Hosted) Hosted.Add(view.Turn);
            return Task.FromResult(new HostReply { Speech = "Go in peace.", End = true });
        }
    }

    /// <summary>A seat that never sleeps and does what it is told each season (nothing, by default).</summary>
    private sealed class Scripted(Func<SeatView, TurnSubmission>? decide = null) : ISeat
    {
        public string Label => "Scripted";
        public Task<TurnSubmission> DecideAsync(SeatView view, CancellationToken ct) => Task.FromResult(decide?.Invoke(view) ?? new TurnSubmission());
        public Task<HostReply> HostAudienceAsync(AudienceView view, SeatView court, CancellationToken ct) => Task.FromResult(new HostReply { End = true });
    }

    private static readonly GameConfig Quiet = new() { SleepingSeats = true, MaxSleep = 6, MinTurns = 40, CatastropheChance = 0 };

    private static TurnSubmission Sleep(int seasons, params WakeTrigger[] wakeOn) => new() { Sleep = new SleepRequest { Seasons = seasons, WakeOn = wakeOn.ToList() } };

    /// <summary>One sleeper; every other king does nothing unless told.</summary>
    private static async Task<GameRunner> Play(Power who, Sleeper sleeper, int turns, GameConfig? config = null, Dictionary<Power, ISeat>? others = null)
    {
        var state = GameFactory.NewGame(31, config ?? Quiet);
        var seats = Powers.All.ToDictionary(p => p, p => p == who ? sleeper : others?.GetValueOrDefault(p) ?? new Scripted());
        var runner = new GameRunner(state, seats, new ScriptMind(), new TemplateNarrator()) { WriteChronicles = false };
        await runner.PrepareAsync();
        for (var i = 0; i < turns && !state.Ended; i++) await runner.PlayTurnAsync();
        return runner;
    }

    [Fact]
    public async Task A_sleeping_seat_is_not_asked_until_the_season_it_chose()
    {
        var sleeper = new Sleeper(v => v.Turn == 1 ? Sleep(2) : new TurnSubmission());
        var r = await Play(Power.Babylonia, sleeper, 5);
        Assert.Equal([1, 4, 5], sleeper.Calls);
        Assert.Contains("the season you chose to wake has come", sleeper.Views[1].WokenBecause);
        Assert.Equal(1, sleeper.Views[1].LastCalled);
        var spell = Assert.Single(r.State.Sleep[Power.Babylonia].History);
        Assert.Equal((2, 4), (spell.From, spell.WokeAt));
        // Its units held while it slept, and the world went on.
        Assert.Equal(5, r.State.Scores.Max(s => s.Turn));
    }

    [Fact]
    public async Task No_seat_sleeps_longer_than_the_cap()
    {
        var sleeper = new Sleeper(v => v.Turn == 1 ? Sleep(50) : new TurnSubmission());
        await Play(Power.Babylonia, sleeper, 9, Quiet with { MaxSleep = 3 });
        Assert.Equal(5, sleeper.Calls.ElementAt(1));
        Assert.Contains(sleeper.Views[1].WokenBecause, w => w.Contains("the longest a king may sleep"));
    }

    [Fact]
    public async Task Foreign_troops_arriving_off_the_coast_wake_a_sleeper()
    {
        var sleeper = new Sleeper(v => v.Turn == 1 ? Sleep(5) : new TurnSubmission());
        var egypt = new Scripted(v => v.Turn == 2 ? new TurnSubmission { Orders = [new MoveOrder("delta", "levantsea")] } : new TurnSubmission());
        await Play(Power.Alashiya, sleeper, 4, others: new() { [Power.Egypt] = egypt });
        Assert.Equal(3, sleeper.Calls.ElementAt(1));
        Assert.Contains(sleeper.Views[1].WokenBecause, w => w.Contains("Egypt") && w.Contains("levantsea"));
    }

    [Fact]
    public async Task An_envoy_at_the_door_wakes_the_host_who_receives_it()
    {
        Sleeper? sleeper = null;
        var envoyId = "";
        var egypt = new Scripted(v => v.Turn == 1 ? new TurnSubmission { Orders = [new DispatchOrder(envoyId, Power.Alashiya, "Greetings, brother.")] } : new TurnSubmission());
        sleeper = new Sleeper(v => v.Turn == 1 ? Sleep(6) : new TurnSubmission());
        var state = GameFactory.NewGame(31, Quiet);
        envoyId = state.Characters.First(c => c.Employer == Power.Egypt).Id;
        var seats = Powers.All.ToDictionary(p => p, p => p == Power.Alashiya ? sleeper : p == Power.Egypt ? egypt : (ISeat)new Scripted());
        var runner = new GameRunner(state, seats, new ScriptMind(), new TemplateNarrator()) { WriteChronicles = false };
        var travel = new TurnEngine(state).TravelTurns(Power.Egypt, Power.Alashiya);
        for (var i = 0; i < 1 + travel; i++) await runner.PlayTurnAsync();
        Assert.Contains(1 + travel, sleeper.Hosted);
        Assert.Contains(1 + travel, sleeper.Calls);
        Assert.Contains(sleeper.Views.Last().WokenBecause, w => w.Contains("an envoy of Egypt waits to be received"));
    }

    [Fact]
    public async Task Distant_news_waits_in_a_digest_for_the_next_waking()
    {
        // Assyria's army leaves Ekallatum, next to Babylon's land, for Arbela, which is not: Babylon sees it and sleeps on.
        var sleeper = new Sleeper(v => v.Turn == 1 ? Sleep(3) : new TurnSubmission());
        var assyria = new Scripted(v => v.Turn == 2 ? new TurnSubmission { Orders = [new MoveOrder("ekallatum", "arbela")] } : new TurnSubmission());
        await Play(Power.Babylonia, sleeper, 5, others: new() { [Power.Assyria] = assyria });
        Assert.Equal([1, 5], sleeper.Calls);
        var woke = sleeper.Views[1];
        Assert.Contains(woke.Digest, d => d.Contains("Assyria's army moved ekallatum -> arbela"));
        Assert.Contains(woke.WhileAsleep, i => i.Title == "The treasury" && i.Turn == 2);
        Assert.Contains(woke.WhileAsleep, i => i.Title == "The treasury" && i.Turn == 4);
        Assert.DoesNotContain(woke.WhileAsleep, i => i.Turn == 5);
    }

    [Fact]
    public async Task Scheduled_orders_run_while_asleep_and_a_failed_one_wakes_the_seat()
    {
        var sleeper = new Sleeper(v => v.Turn != 1 ? new TurnSubmission() : new TurnSubmission
        {
            Sleep = new SleepRequest { Seasons = 5 },
            Scheduled =
            [
                new ScheduledOrders { Turn = 2, Orders = [new MoveOrder("babylon", "nippur")] },
                new ScheduledOrders { Turn = 3, Orders = [new MoveOrder("sippar", "memphis")] },
            ],
        });
        var r = await Play(Power.Babylonia, sleeper, 4);
        Assert.Contains(r.State.Units, u => u.Power == Power.Babylonia && u.Province == "nippur");
        Assert.Equal([1, 4], sleeper.Calls);
        Assert.Contains(sleeper.Views[1].WokenBecause, w => w.StartsWith("orders you scheduled could not be carried out") && w.Contains("sippar -> memphis"));
        // The seat's view showed it what it had scheduled, and nobody else's view does.
        Assert.Empty(Views.For(r.State, Power.Assyria).Scheduled);
    }

    [Fact]
    public async Task A_fresh_order_for_a_unit_replaces_the_one_scheduled_for_it()
    {
        var sleeper = new Sleeper(v => v.Turn switch
        {
            1 => new TurnSubmission { Scheduled = [new ScheduledOrders { Turn = 2, Orders = [new MoveOrder("babylon", "nippur"), new MoveOrder("durkurigalzu", "nippur")] }] },
            2 => new TurnSubmission { Orders = [new HoldOrder("babylon")] },
            _ => new TurnSubmission(),
        });
        var r = await Play(Power.Babylonia, sleeper, 2);
        Assert.Contains("turn 2", Amarna.Llm.Prompts.Situation(sleeper.Views[1]));
        Assert.Contains(r.State.Units, u => u.Power == Power.Babylonia && u.Province == "babylon");
        Assert.Contains(r.State.Units, u => u.Power == Power.Babylonia && u.Province == "nippur");
        Assert.DoesNotContain(r.State.Units, u => u.Province == "durkurigalzu");
    }

    [Fact]
    public async Task A_seat_can_ask_to_be_woken_when_a_unit_moves_or_its_treasury_runs_low()
    {
        var watcher = new Sleeper(v => v.Turn == 1 ? Sleep(6, new WakeTrigger { Kind = WakeKind.UnitMoves, Province = "ekallatum" }) : new TurnSubmission());
        var assyria = new Scripted(v => v.Turn == 2 ? new TurnSubmission { Orders = [new MoveOrder("ekallatum", "arbela")] } : new TurnSubmission());
        await Play(Power.Babylonia, watcher, 4, others: new() { [Power.Assyria] = assyria });
        Assert.Equal(3, watcher.Calls.ElementAt(1));
        Assert.True(watcher.Views[1].WokenBecause.Contains("you asked to be woken when the unit in ekallatum moves"), string.Join(" / ", watcher.Views[1].WokenBecause));

        var poor = new Sleeper(v => v.Turn == 1 ? Sleep(6, new WakeTrigger { Kind = WakeKind.TreasuryBelow, Amount = 100000 }) : new TurnSubmission());
        await Play(Power.Babylonia, poor, 3);
        Assert.Equal(2, poor.Calls.ElementAt(1));
        Assert.Contains(poor.Views[1].WokenBecause, w => w.Contains("treasury falls below 100000"));
    }

    [Fact]
    public async Task A_failure_the_seat_saw_while_awake_does_not_cut_its_next_sleep_short()
    {
        var sleeper = new Sleeper(v => v.Turn switch
        {
            1 => new TurnSubmission { Scheduled = [new ScheduledOrders { Turn = 2, Orders = [new MoveOrder("sippar", "memphis")] }] },
            3 => Sleep(3),
            _ => new TurnSubmission(),
        });
        await Play(Power.Babylonia, sleeper, 7);
        Assert.Equal([1, 2, 3, 7], sleeper.Calls);
    }

    [Fact]
    public async Task An_entry_for_this_season_replaces_or_cancels_what_was_scheduled_for_it()
    {
        var sleeper = new Sleeper(v => v.Turn switch
        {
            1 => new TurnSubmission { Scheduled = [new ScheduledOrders { Turn = 2, Orders = [new RaiseOrder("nippur", UnitKind.Army)] }] },
            2 => new TurnSubmission { Scheduled = [new ScheduledOrders { Turn = 2 }] },
            _ => new TurnSubmission(),
        });
        var r = await Play(Power.Babylonia, sleeper, 2);
        Assert.DoesNotContain(r.State.Units, u => u.Province == "nippur");
    }

    [Fact]
    public async Task A_scheduled_purchase_that_fails_at_resolution_wakes_the_seat()
    {
        // Babylon and Assyria both bid for Susa in season 2; the elders refuse both.
        var sleeper = new Sleeper(v => v.Turn != 1 ? new TurnSubmission() : new TurnSubmission
        {
            Sleep = new SleepRequest { Seasons = 5 },
            Scheduled = [new ScheduledOrders { Turn = 2, Orders = [new BuyProvinceOrder("susa")] }],
        });
        var assyria = new Scripted(v => v.Turn == 2 ? new TurnSubmission { Orders = [new BuyProvinceOrder("susa")] } : new TurnSubmission());
        await Play(Power.Babylonia, sleeper, 3, others: new() { [Power.Assyria] = assyria });
        Assert.Equal([1, 3], sleeper.Calls);
        Assert.Contains(sleeper.Views[1].WokenBecause, w => w.Contains("susa") && w.Contains("would not choose between 2 buyers"));
    }

    [Fact]
    public async Task Troops_deserting_for_lack_of_pay_wake_a_sleeper()
    {
        var sleeper = new Sleeper(v => v.Turn == 1 ? Sleep(5) : new TurnSubmission());
        await Play(Power.Babylonia, sleeper, 3, Quiet with { ArmyUpkeep = 300 });
        Assert.Equal(2, sleeper.Calls.ElementAt(1));
        Assert.Contains("your unpaid troops deserted", sleeper.Views[1].WokenBecause);
    }

    [Fact]
    public async Task When_the_script_king_stands_in_the_seat_still_gets_its_digest_next_time()
    {
        var calls = 0;
        var sleeper = new Sleeper(v =>
        {
            calls++;
            if (calls == 2) throw new InvalidOperationException("the model did not answer");
            return v.Turn == 1 ? Sleep(2) : new TurnSubmission();
        });
        var r = await Play(Power.Babylonia, sleeper, 5);
        Assert.Contains(r.Errors, e => e.StartsWith("t4/orders/Babylonia:"));
        var after = sleeper.Views.Last();
        Assert.Equal(5, after.Turn);
        Assert.Equal(1, after.LastCalled);
        Assert.Contains(after.WhileAsleep, i => i.Turn == 2);
    }

    [Fact]
    public async Task A_kingdom_that_falls_in_its_sleep_ends_its_sleep()
    {
        var sleeper = new Sleeper(v => v.Turn == 1 ? Sleep(5) : new TurnSubmission());
        var state = GameFactory.NewGame(31, Quiet);
        var seats = Powers.All.ToDictionary(p => p, p => p == Power.Alashiya ? sleeper : (ISeat)new Scripted());
        var runner = new GameRunner(state, seats, new ScriptMind(), new TemplateNarrator()) { WriteChronicles = false };
        await runner.PlayTurnAsync();
        // The island changes hands by decree, as a test: Alashiya falls at the end of season 2.
        state.Owner["enkomi"] = Power.Egypt;
        state.Owner["tamassos"] = Power.Egypt;
        state.Units.RemoveAll(u => u.Power == Power.Alashiya);
        await runner.PlayTurnAsync();
        var sleep = state.Sleep[Power.Alashiya];
        Assert.False(sleep.Asleep);
        Assert.Equal((2, 3), (sleep.History.Single().From, sleep.History.Single().WokeAt));
        Assert.Equal(["the kingdom fell"], sleep.History.Single().Reasons);
    }

    [Fact]
    public void A_game_with_sleeping_seats_can_only_be_continued_by_seats_that_can_sleep_the_same_way()
    {
        var log = new GameLog { Header = new LogHeader { Seed = 3, Config = new GameConfig { SleepingSeats = true }, Sleepers = [Power.Egypt] } };
        var bot = new ScriptLeader(3);
        var seats = Powers.All.ToDictionary(p => p, _ => (ISeat)bot);
        var ex = Assert.Throws<InvalidOperationException>(() => GameRunner.Resume(log, seats, new ScriptMind(), new TemplateNarrator()));
        Assert.Contains("Egypt", ex.Message);
    }

    [Fact]
    public async Task With_sleeping_off_every_seat_is_asked_every_season()
    {
        var sleeper = new Sleeper(_ => Sleep(4));
        var r = await Play(Power.Babylonia, sleeper, 4, Quiet with { SleepingSeats = false });
        Assert.Equal([1, 2, 3, 4], sleeper.Calls);
        Assert.Empty(r.State.Sleep);
    }

    [Fact]
    public async Task Script_and_human_seats_never_sleep()
    {
        var state = GameFactory.NewGame(5, new GameConfig { SleepingSeats = true });
        var bot = new ScriptLeader(5);
        var seats = Powers.All.ToDictionary(p => p, p => p == Power.Egypt ? (ISeat)new HumanSeat(p) : bot);
        var runner = new GameRunner(state, seats, new ScriptMind(), new TemplateNarrator());
        Assert.Empty(state.Sleep);
        Assert.Empty(runner.Log.Header.Sleepers);
    }

    [Fact]
    public async Task Games_with_sleeping_seats_replay_exactly()
    {
        for (ulong seed = 1; seed <= 3; seed++)
        {
            var summary = await BatchRunner.PlayAsync(seed, st =>
            {
                var bot = new ScriptLeader(st.Seed);
                // Two kings that sleep in a pattern of their own, with scheduled orders and triggers, among script kings.
                var nap = new Sleeper(v => v.Turn % 3 == 1
                    ? new TurnSubmission { Sleep = new SleepRequest { Seasons = 2, WakeOn = [new WakeTrigger { Kind = WakeKind.ProvinceChangesHands, Province = "mari" }] } }
                    : new TurnSubmission());
                var babylon = new Sleeper(v => new TurnSubmission
                {
                    Sleep = new SleepRequest { Seasons = 1 + v.Turn % 2 },
                    Scheduled = [new ScheduledOrders { Turn = v.Turn + 1, Orders = [new HoldOrder("babylon")] }],
                });
                var seats = Powers.All.ToDictionary(p => p, p => p switch { Power.Alashiya => nap, Power.Babylonia => babylon, _ => (ISeat)bot });
                return new GameRunner(st, seats, new ScriptMind(), new TemplateNarrator()) { WriteChronicles = false };
            }, verifyReplay: true, config: new GameConfig { SleepingSeats = true, MaxTurns = 18 });
            Assert.True(summary.ReplayMatches, $"seed {seed}");
        }
    }
}
