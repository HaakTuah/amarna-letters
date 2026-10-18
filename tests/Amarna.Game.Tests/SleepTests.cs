using System.Text.Json.Nodes;
using Amarna.Engine;
using Amarna.Game;
using Amarna.Game.Batch;
using Amarna.Game.Bots;
using Amarna.Llm;

namespace Amarna.Game.Tests;

public class SleepTests
{
    /// <summary>A seat that may sleep, deciding from a script, and remembering when it was asked.</summary>
    private sealed class Sleeper(Func<SeatView, TurnSubmission> decide) : ISeat
    {
        public List<SeatView> Views { get; } = new();
        public List<int> Hosted { get; } = new();
        public List<SeatView> Courts { get; } = new();
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
            lock (Hosted)
            {
                Hosted.Add(view.Turn);
                Courts.Add(court);
            }
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

    /// <summary>Records what a model king is sent, and holds everything.</summary>
    private sealed class Recorder : IJsonAsker
    {
        public List<CallSpec> Specs { get; } = new();

        public Task<JsonObject> AskJsonAsync(CallSpec spec, CancellationToken ct)
        {
            lock (Specs) Specs.Add(spec);
            var json = spec.Key.Contains("/orders/")
                ? """{"notes":"Hold fast.","units":[],"letters":[],"other_orders":[]}"""
                : """{"speech":"Welcome.","gift_to_envoy":0,"gift_request":"","offer_service_wage":0,"seal_tablet":false,"detain_envoy":false,"send_gold_back":0,"gold_back_purity":100,"end_audience":true}""";
            return Task.FromResult((JsonObject)JsonNode.Parse(json)!);
        }
    }

    /// <summary>Sleeping seats are on by default: nothing here switches them on.</summary>
    private static readonly GameConfig Quiet = new() { MinTurns = 40, CatastropheChance = 0 };

    private static TurnSubmission Nothing() => new();

    /// <summary>Orders that name a season to be woken in (0 for none) and the seat's own reasons to be woken.</summary>
    private static TurnSubmission Wake(int turn, params WakeTrigger[] wakeOn) => new() { Sleep = new SleepRequest { WakeTurn = turn, WakeOn = wakeOn.ToList() } };

    /// <summary>One sleeper; every other king does nothing unless told.</summary>
    private static async Task<GameRunner> Play(Power who, ISeat sleeper, int turns, GameConfig? config = null, Dictionary<Power, ISeat>? others = null, Action<GameState>? setup = null)
    {
        var state = GameFactory.NewGame(31, config ?? Quiet);
        setup?.Invoke(state);
        var seats = Powers.All.ToDictionary(p => p, p => p == who ? sleeper : others?.GetValueOrDefault(p) ?? new Scripted());
        var runner = new GameRunner(state, seats, new ScriptMind(), new TemplateNarrator()) { WriteChronicles = false };
        await runner.PrepareAsync();
        for (var i = 0; i < turns && !state.Ended; i++) await runner.PlayTurnAsync();
        return runner;
    }

    /// <summary>A sleeping seat in an engine-only game: it gave orders in turn 1 and sleeps in turn 3, with nothing scheduled.</summary>
    private static (GameState S, SleepState Sleep) Asleep(Power p)
    {
        var s = GameFactory.NewGame(31, new GameConfig { CatastropheChance = 0 });
        var sleep = s.Sleep[p] = new SleepState { Asleep = true, LastCalled = 1, WakeAt = 50, History = [new SleepSpell { From = 2 }] };
        s.Turn = 3;
        return (s, sleep);
    }

    // ------------------------------------------------------------ sleeping after every call

    [Fact]
    public async Task A_seat_sleeps_after_every_call_by_default()
    {
        Assert.True(new GameConfig().SleepingSeats);
        Assert.Equal(12, new GameConfig().MaxSleep);
        var sleeper = new Sleeper(_ => Nothing());
        var r = await Play(Power.Babylonia, sleeper, 6);
        Assert.Equal([1], sleeper.Calls);
        var sleep = r.State.Sleep[Power.Babylonia];
        Assert.True(sleep.Asleep);
        Assert.Equal(1, sleep.LastCalled);
        Assert.Equal(1 + 1 + 12, sleep.WakeAt);
        var spell = Assert.Single(sleep.History);
        Assert.Equal((2, 0, 0), (spell.From, spell.Named, spell.WokeAt));
        // Its units held while it slept, and the world went on.
        Assert.Equal(6, r.State.Scores.Max(s => s.Turn));
        Assert.Equal("This is your first season.", Prompts.SleepLine(sleeper.Views[0]));
    }

    [Fact]
    public async Task A_seat_may_name_the_season_it_is_woken_in()
    {
        var sleeper = new Sleeper(v => v.Turn switch { 1 => Wake(3), 3 => Wake(5), _ => Nothing() });
        var r = await Play(Power.Babylonia, sleeper, 6);
        Assert.Equal([1, 3, 5], sleeper.Calls);
        Assert.Equal(["you asked to be woken in turn 3"], sleeper.Views[1].WokenBecause);
        Assert.Equal(1, sleeper.Views[1].LastCalled);
        Assert.Equal("You slept 1 season (you last gave orders in turn 1). You were woken because: you asked to be woken in turn 3.", Prompts.SleepLine(sleeper.Views[1]));
        Assert.StartsWith("You slept 1 season (you last gave orders in turn 3).", Prompts.Situation(sleeper.Views[2]));
        var spells = r.State.Sleep[Power.Babylonia].History;
        Assert.Equal([(2, 3, 3), (4, 5, 5), (6, 0, 0)], spells.Select(h => (h.From, h.Named, h.WokeAt)));
    }

    [Fact]
    public async Task The_hidden_cap_wakes_a_seat_after_a_long_sleep_and_is_told_nowhere()
    {
        // The season it named lies beyond the cap: the cap wakes it at turn 1 + 1 + 3, and says nothing of itself.
        var sleeper = new Sleeper(v => v.Turn == 1 ? Wake(50) : Nothing());
        await Play(Power.Babylonia, sleeper, 6, Quiet with { MaxSleep = 3 });
        Assert.Equal([1, 5], sleeper.Calls);
        Assert.Equal([TurnEngine.CapReason], sleeper.Views[1].WokenBecause);
        Assert.Equal("You slept 3 seasons (you last gave orders in turn 1). You were woken because: your counsellors woke you after a long sleep.", Prompts.SleepLine(sleeper.Views[1]));

        // The cap changes nothing a king reads: not the rulebook, not the schema, not the view.
        var low = Quiet with { MaxSleep = 5 };
        var high = Quiet with { MaxSleep = 29 };
        Assert.Equal(Prompts.LeaderRules(true, low), Prompts.LeaderRules(true, high));
        Assert.Equal(Schemas.LeaderOrders(low).ToJsonString(), Schemas.LeaderOrders(high).ToJsonString());
        SeatView View(GameConfig c)
        {
            var s = GameFactory.NewGame(31, c);
            s.Sleep[Power.Babylonia] = new SleepState { LastCalled = 1, WokenBecause = [TurnEngine.CapReason] };
            s.Turn = 4;
            return Views.For(s, Power.Babylonia);
        }
        Assert.Equal(Json.Serialize(View(low)), Json.Serialize(View(high)));
        Assert.Equal(Prompts.Situation(View(low)), Prompts.Situation(View(high)));
        Assert.DoesNotContain("after a long sleep", Prompts.LeaderRules(true, new GameConfig()));
    }

    [Fact]
    public async Task Orders_can_be_scheduled_for_any_later_season()
    {
        // With a cap of 3 the old horizon ended at turn 5 (cap + 1 seasons ahead); the move for turn 7 still runs, while the seat sleeps.
        var sleeper = new Sleeper(v => v.Turn == 1
            ? new TurnSubmission { Scheduled = [new ScheduledOrders { Turn = 7, Orders = [new MoveOrder("babylon", "nippur")] }] }
            : Nothing());
        var r = await Play(Power.Babylonia, sleeper, 7, Quiet with { MaxSleep = 3 });
        Assert.Equal([1, 5], sleeper.Calls);
        Assert.Contains(sleeper.Views[1].Scheduled, x => x.Turn == 7);
        Assert.Contains("- turn 7: babylon -> nippur", Prompts.Situation(sleeper.Views[1]));
        Assert.Contains(r.State.Units, u => u.Power == Power.Babylonia && u.Province == "nippur");
    }

    [Fact]
    public void At_most_24_orders_a_season_for_at_most_40_seasons_are_kept_and_the_rest_is_reported()
    {
        var s = GameFactory.NewGame(31, new GameConfig { CatastropheChance = 0 });
        var sleep = s.Sleep[Power.Babylonia] = new SleepState();
        var plans = Enumerable.Range(2, 45).Select(t => new ScheduledOrders { Turn = t, Orders = [new HoldOrder("babylon")] }).ToList();
        plans[0].Orders = Enumerable.Range(0, 30).Select(_ => (Order)new HoldOrder("babylon")).ToList();
        // A season after the game's last (turn 60) never comes, but it counts like any other: nothing says when the game must end.
        plans.Add(new ScheduledOrders { Turn = 61, Orders = [new HoldOrder("babylon")] });
        var e = new TurnEngine(s);
        e.BeginTurn();
        e.Resolve(new Dictionary<Power, TurnSubmission> { [Power.Babylonia] = new() { Scheduled = plans } });

        Assert.Equal(40, sleep.Scheduled.Count);
        Assert.Equal((2, 24), (sleep.Scheduled[0].Turn, sleep.Scheduled[0].Orders.Count));
        Assert.Equal(41, sleep.Scheduled[^1].Turn);
        var notice = Assert.Single(s.InboxOf(Power.Babylonia), i => i.Title == "Scheduled orders not kept");
        Assert.Equal(InboxKind.Rejected, notice.Kind);
        Assert.Contains("- turn 2: only the first 24 of its 30 orders were kept", notice.Body);
        Assert.Contains("- turns 42, 43, 44, 45, 46, 61: orders may be scheduled for at most 40 seasons", notice.Body);
    }

    [Fact]
    public void Orders_scheduled_past_the_last_season_are_kept_so_nothing_tells_when_the_game_must_end()
    {
        // Two games that differ only in their hard end. The seat schedules 41 seasons, turns 3 to 43, and turn 70 too.
        (string Text, string Notices, List<int> Turns) Scheduled(int maxTurns)
        {
            var s = GameFactory.NewGame(31, new GameConfig { CatastropheChance = 0, MaxTurns = maxTurns });
            var sleep = s.Sleep[Power.Babylonia] = new SleepState();
            var plans = Enumerable.Range(3, 41).Append(70).Select(t => new ScheduledOrders { Turn = t, Orders = [new HoldOrder("babylon")] }).ToList();
            var e = new TurnEngine(s);
            e.BeginTurn();
            e.Resolve(new Dictionary<Power, TurnSubmission> { [Power.Babylonia] = new() { Scheduled = plans, Sleep = new SleepRequest { WakeTurn = 3 } } });
            var notices = string.Join("\n", s.InboxOf(Power.Babylonia).Where(i => i.Kind == InboxKind.Rejected).Select(i => i.Body));
            return (Prompts.Situation(Views.For(s, Power.Babylonia)), notices, sleep.Scheduled.Select(x => x.Turn).ToList());
        }
        var (shortText, shortNotices, shortTurns) = Scheduled(40);
        var (longText, longNotices, longTurns) = Scheduled(100);
        Assert.Equal(longText, shortText);
        Assert.Equal(longNotices, shortNotices);
        Assert.Equal(longTurns, shortTurns);
        // The first 40 seasons are kept, past the game's last too; the 41st and turn 70 are not, with the same notice in both.
        Assert.Equal(Enumerable.Range(3, 40), shortTurns);
        Assert.Contains("- turn 42: babylon holds", shortText);
        Assert.Contains("- turns 43, 70: orders may be scheduled for at most 40 seasons", shortNotices);
    }

    // ------------------------------------------------------------ what wakes a seat

    [Fact]
    public async Task An_envoy_at_the_door_wakes_the_host_who_receives_it()
    {
        var envoyId = "";
        var egypt = new Scripted(v => v.Turn == 1 ? new TurnSubmission { Orders = [new DispatchOrder(envoyId, Power.Alashiya, "Greetings, brother.")] } : new TurnSubmission());
        var sleeper = new Sleeper(_ => Nothing());
        var state = GameFactory.NewGame(31, Quiet);
        envoyId = state.Characters.First(c => c.Employer == Power.Egypt).Id;
        var seats = Powers.All.ToDictionary(p => p, p => p == Power.Alashiya ? sleeper : p == Power.Egypt ? egypt : (ISeat)new Scripted());
        var runner = new GameRunner(state, seats, new ScriptMind(), new TemplateNarrator()) { WriteChronicles = false };
        var travel = new TurnEngine(state).TravelTurns(Power.Egypt, Power.Alashiya);
        for (var i = 0; i < 1 + travel; i++) await runner.PlayTurnAsync();
        Assert.Contains(1 + travel, sleeper.Hosted);
        Assert.Contains(1 + travel, sleeper.Calls);
        Assert.Contains(sleeper.Views.Last().WokenBecause, w => w.Contains("an envoy of Egypt waits to be received"));
        // The audience opens with the same line as the orders: how long the host slept and what woke it.
        Assert.EndsWith("You were woken because: an envoy of Egypt waits to be received.", Prompts.SleepLine(sleeper.Courts.Last()));
    }

    [Fact]
    public async Task Foreign_troops_entering_its_land_and_the_land_lost_wake_a_sleeper()
    {
        // Babylon disbands the army in Sippar and sleeps; Assyria walks in.
        var sleeper = new Sleeper(v => v.Turn == 1 ? new TurnSubmission { Orders = [new DisbandOrder("sippar")] } : Nothing());
        var assyria = new Scripted(v => v.Turn == 2 ? new TurnSubmission { Orders = [new MoveOrder("ekallatum", "sippar")] } : new TurnSubmission());
        await Play(Power.Babylonia, sleeper, 3, others: new() { [Power.Assyria] = assyria });
        Assert.Equal([1, 3], sleeper.Calls);
        Assert.Equal(
            ["foreign troops entered your land: Assyria's army moved ekallatum -> sippar", "land lost: Sippar has been taken by Assyria."],
            sleeper.Views[1].WokenBecause);
    }

    [Fact]
    public async Task Troops_destroyed_in_battle_wake_a_sleeper()
    {
        // An Assyrian army stands in Mari (its walls gone, for the test) to support the attack on Sippar.
        void Setup(GameState s)
        {
            s.Garrisons.Remove("mari");
            s.Owner["mari"] = Power.Assyria;
            s.Units.Add(new Unit { Id = s.NewId("u"), Power = Power.Assyria, Kind = UnitKind.Army, Province = "mari" });
        }
        var sleeper = new Sleeper(_ => Nothing());
        var assyria = new Scripted(v => v.Turn == 2
            ? new TurnSubmission { Orders = [new MoveOrder("ekallatum", "sippar"), new SupportOrder("mari", "ekallatum", "sippar")] }
            : new TurnSubmission());
        await Play(Power.Babylonia, sleeper, 3, others: new() { [Power.Assyria] = assyria }, setup: Setup);
        Assert.Equal([1, 3], sleeper.Calls);
        Assert.Contains("your army in sippar was destroyed", sleeper.Views[1].WokenBecause);
    }

    [Fact]
    public async Task Troops_deserting_for_lack_of_pay_wake_a_sleeper()
    {
        var sleeper = new Sleeper(_ => Nothing());
        await Play(Power.Babylonia, sleeper, 3, Quiet with { ArmyUpkeep = 300 });
        Assert.Equal(2, sleeper.Calls.ElementAt(1));
        Assert.Contains("your unpaid troops deserted", sleeper.Views[1].WokenBecause);
    }

    /// <summary>The news that wakes a seat: land lost, troops lost to plague or desertion, a ransom demanded, a servant's notice.</summary>
    [Theory]
    [InlineData(InboxKind.Battle, "Land lost", "Sippar has been taken by Assyria.", "land lost: Sippar has been taken by Assyria.")]
    [InlineData(InboxKind.Catastrophe, "Catastrophe: Plague", "The hand of Nergal is on the land. Plague will cut income by a quarter for two seasons, and it has destroyed your A babylon.", "plague destroyed troops of yours")]
    [InlineData(InboxKind.Notice, "The treasury", "Income 200, upkeep 0, wages 0. Unpaid troops deserted: A ur.", "your unpaid troops deserted")]
    [InlineData(InboxKind.Rumor, "Rumor", "Hatti holds Mane and demands 100 shekels for their return (order pay_ransom for c3).", "a ransom is demanded for one of your people")]
    [InlineData(InboxKind.Notice, TurnEngine.NoticeTitle, "Mane's term has ended.", "a servant gives notice: Mane's term has ended.")]
    public void News_that_concerns_a_seat_wakes_it(InboxKind kind, string title, string body, string reason)
    {
        var (s, sleep) = Asleep(Power.Babylonia);
        s.Notify(Power.Babylonia, kind, title, body);
        new TurnEngine(s).WakeCheck();
        Assert.False(sleep.Asleep);
        Assert.Equal([reason], sleep.WokenBecause);
        Assert.Equal([reason], sleep.History.Single().Reasons);
        Assert.Equal(3, sleep.History.Single().WokeAt);
    }

    [Fact]
    public async Task Scheduled_orders_run_while_asleep_and_a_refused_one_wakes_the_seat()
    {
        var sleeper = new Sleeper(v => v.Turn != 1 ? Nothing() : new TurnSubmission
        {
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
    public async Task A_scheduled_move_that_is_stopped_wakes_the_seat_with_the_reason()
    {
        // Mari's walls hold against a single army.
        var sleeper = new Sleeper(v => v.Turn == 1
            ? new TurnSubmission { Scheduled = [new ScheduledOrders { Turn = 2, Orders = [new MoveOrder("sippar", "mari")] }] }
            : Nothing());
        await Play(Power.Babylonia, sleeper, 3);
        Assert.Equal([1, 3], sleeper.Calls);
        Assert.Equal(["orders you scheduled could not be carried out: sippar -> mari (the walls of mari held; your strength 1 against 1)"], sleeper.Views[1].WokenBecause);
    }

    [Fact]
    public async Task A_scheduled_purchase_that_fails_at_resolution_wakes_the_seat()
    {
        // Babylon and Assyria both bid for Susa in season 2; the elders refuse both.
        var sleeper = new Sleeper(v => v.Turn != 1 ? Nothing() : new TurnSubmission
        {
            Scheduled = [new ScheduledOrders { Turn = 2, Orders = [new BuyProvinceOrder("susa")] }],
        });
        var assyria = new Scripted(v => v.Turn == 2 ? new TurnSubmission { Orders = [new BuyProvinceOrder("susa")] } : new TurnSubmission());
        await Play(Power.Babylonia, sleeper, 3, others: new() { [Power.Assyria] = assyria });
        Assert.Equal([1, 3], sleeper.Calls);
        Assert.Contains(sleeper.Views[1].WokenBecause, w => w.Contains("susa") && w.Contains("would not choose between 2 buyers"));
    }

    [Fact]
    public async Task A_failure_the_seat_has_seen_does_not_cut_its_next_sleep_short()
    {
        // Turn 2: the scheduled move to Memphis is refused, which wakes the seat in turn 3. Having seen it, the seat
        // sleeps on until the cap wakes it, not the same failure again.
        var sleeper = new Sleeper(v => v.Turn switch
        {
            1 => new TurnSubmission { Sleep = new SleepRequest { WakeTurn = 2 }, Scheduled = [new ScheduledOrders { Turn = 2, Orders = [new MoveOrder("sippar", "memphis")] }] },
            _ => Nothing(),
        });
        await Play(Power.Babylonia, sleeper, 7, Quiet with { MaxSleep = 3 });
        Assert.Equal([1, 2, 3, 7], sleeper.Calls);
        Assert.Contains(sleeper.Views[2].WokenBecause, w => w.StartsWith("orders you scheduled could not be carried out"));
        Assert.Equal([TurnEngine.CapReason], sleeper.Views[3].WokenBecause);
    }

    [Fact]
    public async Task A_seat_can_ask_to_be_woken_when_a_unit_moves_or_its_treasury_runs_low()
    {
        var watcher = new Sleeper(v => v.Turn == 1 ? Wake(0, new WakeTrigger { Kind = WakeKind.UnitMoves, Province = "ekallatum" }) : Nothing());
        var assyria = new Scripted(v => v.Turn == 2 ? new TurnSubmission { Orders = [new MoveOrder("ekallatum", "arbela")] } : new TurnSubmission());
        await Play(Power.Babylonia, watcher, 4, others: new() { [Power.Assyria] = assyria });
        Assert.Equal(3, watcher.Calls.ElementAt(1));
        Assert.True(watcher.Views[1].WokenBecause.Contains("you asked to be woken when the unit in ekallatum moves"), string.Join(" / ", watcher.Views[1].WokenBecause));

        var poor = new Sleeper(v => v.Turn == 1 ? Wake(0, new WakeTrigger { Kind = WakeKind.TreasuryBelow, Amount = 100000 }) : Nothing());
        await Play(Power.Babylonia, poor, 3);
        Assert.Equal(2, poor.Calls.ElementAt(1));
        Assert.Contains(poor.Views[1].WokenBecause, w => w.Contains("treasury falls below 100000"));
        Assert.Equal("You gave orders last season (turn 1). You were woken because: you asked to be woken when the treasury falls below 100000 shekels.", Prompts.SleepLine(poor.Views[1]));
    }

    [Fact]
    public async Task A_named_season_holds_only_until_the_seat_is_next_woken_and_the_seat_is_reminded_of_it()
    {
        // Babylon names turn 6 and asks to be woken when its treasury runs low, which wakes it at once, in turn 2. It names
        // no season then, so it is not woken in turn 6.
        var sleeper = new Sleeper(v => v.Turn == 1 ? Wake(6, new WakeTrigger { Kind = WakeKind.TreasuryBelow, Amount = 100000 }) : Nothing());
        var r = await Play(Power.Babylonia, sleeper, 6);
        Assert.Equal([1, 2], sleeper.Calls);
        Assert.Equal(2 + 1 + 12, r.State.Sleep[Power.Babylonia].WakeAt);
        var woke = sleeper.Views[1];
        Assert.Equal(6, woke.NamedWake);
        Assert.Contains("When you last gave orders you asked to be woken in turn 6. Each set of orders names that season anew: name it again (wake_in_turn) if you still want it.", Prompts.Situation(woke));
        // Not once it has come, nor in the first season.
        Assert.Equal(0, sleeper.Views[0].NamedWake);
        var rules = Prompts.LeaderRules(true, new GameConfig());
        Assert.Contains("name it (wake_in_turn) with each set of orders, like your triggers: it holds only until you are next woken, so if something wakes you sooner, name it again to keep it.", rules);
        Assert.Contains("Like wake_on, it holds only until you are next woken: name it again to keep it.", Schemas.LeaderOrders(new GameConfig()).ToJsonString());

        var punctual = new Sleeper(v => v.Turn == 1 ? Wake(3) : Nothing());
        await Play(Power.Babylonia, punctual, 3);
        Assert.Equal([1, 3], punctual.Calls);
        Assert.Equal(0, punctual.Views[1].NamedWake);
        Assert.DoesNotContain("When you last gave orders you asked", Prompts.Situation(punctual.Views[1]));
    }

    [Fact]
    public async Task A_scheduled_support_that_is_cut_wakes_the_seat()
    {
        // Sippar is to support Babylon holding in turn 2; Assyria attacks Sippar from Ekallatum and cuts it (the attack fails).
        var sleeper = new Sleeper(v => v.Turn == 1
            ? new TurnSubmission { Scheduled = [new ScheduledOrders { Turn = 2, Orders = [new SupportOrder("sippar", "babylon")] }] }
            : Nothing());
        var assyria = new Scripted(v => v.Turn == 2 ? new TurnSubmission { Orders = [new MoveOrder("ekallatum", "sippar")] } : new TurnSubmission());
        await Play(Power.Babylonia, sleeper, 3, others: new() { [Power.Assyria] = assyria });
        Assert.Equal([1, 3], sleeper.Calls);
        Assert.Equal(["orders you scheduled could not be carried out: sippar supports babylon holding (the support was cut by an attack from ekallatum)"], sleeper.Views[1].WokenBecause);
        // The failed attack itself wakes nobody; the seat reads it in the season's battle report.
        Assert.Contains(sleeper.Views[1].Inbox, i => i.Title == "Movements last season" && i.Body.Contains("sippar supports babylon holding: cut (attacked from ekallatum)"));
    }

    [Fact]
    public async Task A_scheduled_support_that_matches_no_move_wakes_the_seat()
    {
        var sleeper = new Sleeper(v => v.Turn == 1
            ? new TurnSubmission { Scheduled = [new ScheduledOrders { Turn = 2, Orders = [new SupportOrder("sippar", "ekallatum", "durkurigalzu")] }] }
            : Nothing());
        await Play(Power.Babylonia, sleeper, 3);
        Assert.Equal([1, 3], sleeper.Calls);
        Assert.Equal(["orders you scheduled could not be carried out: sippar supports ekallatum -> durkurigalzu (no unit moved from ekallatum to durkurigalzu)"], sleeper.Views[1].WokenBecause);
    }

    [Fact]
    public async Task An_entry_for_this_season_counts_as_orders_given_now_and_its_failure_does_not_wake_the_seat()
    {
        // Mari's walls hold against a single army: the move sent as this season's entry fails, as a fresh order would.
        var sleeper = new Sleeper(v => v.Turn == 1
            ? new TurnSubmission { Scheduled = [new ScheduledOrders { Turn = 1, Orders = [new MoveOrder("sippar", "mari")] }] }
            : Nothing());
        var r = await Play(Power.Babylonia, sleeper, 3);
        Assert.Equal([1], sleeper.Calls);
        Assert.Contains(r.State.InboxOf(Power.Babylonia), i => i.Turn == 2 && i.Title == "Movements last season" && i.Body.Contains("sippar -> mari: fails"));
        Assert.Empty(r.State.Sleep[Power.Babylonia].PendingWake);
    }

    [Fact]
    public async Task A_kingdom_that_falls_in_its_sleep_ends_its_sleep()
    {
        var sleeper = new Sleeper(_ => Nothing());
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

    // ------------------------------------------------------------ what waits in the digest

    [Fact]
    public async Task Foreign_troops_off_the_coast_or_beyond_the_border_wait_in_the_digest()
    {
        var sleeper = new Sleeper(_ => Nothing());
        var egypt = new Scripted(v => v.Turn == 2 ? new TurnSubmission { Orders = [new MoveOrder("delta", "levantsea")] } : new TurnSubmission());
        var r = await Play(Power.Alashiya, sleeper, 4, Quiet with { MaxSleep = 2 }, others: new() { [Power.Egypt] = egypt });
        Assert.Equal([1, 4], sleeper.Calls);
        Assert.Equal([TurnEngine.CapReason], sleeper.Views[1].WokenBecause);
        Assert.Contains("turn 2: Egypt's fleet moved delta -> levantsea", sleeper.Views[1].Digest);
    }

    [Fact]
    public async Task A_failed_attack_on_its_troops_waits_in_the_digest()
    {
        var sleeper = new Sleeper(_ => Nothing());
        var assyria = new Scripted(v => v.Turn == 2 ? new TurnSubmission { Orders = [new MoveOrder("ekallatum", "sippar")] } : new TurnSubmission());
        await Play(Power.Babylonia, sleeper, 4, Quiet with { MaxSleep = 2 }, others: new() { [Power.Assyria] = assyria });
        Assert.Equal([1, 4], sleeper.Calls);
        Assert.Contains("turn 2: Assyria's army tried to move ekallatum -> sippar (against your troops) and failed", sleeper.Views[1].Digest);
    }

    [Fact]
    public async Task An_envoy_coming_home_with_its_report_waits_in_the_digest()
    {
        var name = "";
        var sleeper = new Sleeper(v =>
        {
            if (v.Turn != 1) return Nothing();
            var envoy = v.Court.First(c => c.Ready);
            name = envoy.Name;
            return new TurnSubmission { Orders = [new DispatchOrder(envoy.Id, Power.Assyria, "Greetings, brother.")] };
        });
        await Play(Power.Babylonia, sleeper, 6, Quiet with { MaxSleep = 4 });
        Assert.Equal([1, 6], sleeper.Calls);
        var woke = sleeper.Views[1];
        Assert.Equal([TurnEngine.CapReason], woke.WokenBecause);
        Assert.Contains(woke.Digest, d => d.EndsWith($"your envoy {name} came home with a report", StringComparison.Ordinal));
        Assert.Contains(woke.WhileAsleep, i => i.Kind == InboxKind.EnvoyReport);
    }

    /// <summary>The news that does not wake a seat: it waits in the digest, a line each for what matters, all of it in the news.</summary>
    [Theory]
    [InlineData(InboxKind.EnvoyReport, "Mane returns", "My lord, I have come home.", "your envoy {envoy} came home with a report")]
    [InlineData(InboxKind.SpyReport, "Word from Mane", "Hatti gathers chariots.", "a spy's report arrived (Word from Mane)")]
    [InlineData(InboxKind.CheckResult, "Inquiries into Mane", "Nothing is known.", "a report arrived (Inquiries into Mane)")]
    [InlineData(InboxKind.Assay, "Assay of gold", "The gold is fine.", "a report arrived (Assay of gold)")]
    [InlineData(InboxKind.Authentication, "Examination of a tablet", "Genuine.", "a report arrived (Examination of a tablet)")]
    [InlineData(InboxKind.Candidates, "Mane seeks service", "Mane asks 20 a season.", "a candidate presented themselves (Mane seeks service)")]
    [InlineData(InboxKind.Catastrophe, "Catastrophe: Drought", "The rains have failed.", "a catastrophe struck your land (Catastrophe: Drought)")]
    [InlineData(InboxKind.Tablet, "A tablet is ready", "Mane has produced a tablet.", "a tablet you ordered is ready (A tablet is ready)")]
    [InlineData(InboxKind.Notice, "A spy is caught", "A spy of Hatti was caught.", "a spy was caught at your court")]
    [InlineData(InboxKind.Rejected, "Levy failed", "No army was raised in ur.", "an order was refused or failed (Levy failed)")]
    [InlineData(InboxKind.Rumor, "Rumor", "Word spreads that Hatti is restless.", null)]
    [InlineData(InboxKind.Notice, "The treasury", "Income 200, upkeep 90, wages 20.", null)]
    public void News_that_does_not_concern_a_seat_waits_in_the_digest(InboxKind kind, string title, string body, string? line)
    {
        var (s, sleep) = Asleep(Power.Babylonia);
        var envoy = s.Characters.First(c => c.Employer == Power.Babylonia);
        s.Notify(Power.Babylonia, kind, title, body, envoy.Id);
        new TurnEngine(s).WakeCheck();
        Assert.True(sleep.Asleep);
        Assert.Empty(sleep.WokenBecause);
        if (line is null) Assert.Empty(sleep.Digest);
        else Assert.Equal(["turn 3: " + line.Replace("{envoy}", envoy.Name)], sleep.Digest);

        // Woken later, it reads the item in full among the news of the seasons it slept (a routine treasury notice is left out).
        s.Turn = 5;
        var view = Views.For(s, Power.Babylonia);
        Assert.Equal(kind == InboxKind.Notice && title == "The treasury" ? 0 : 1, view.WhileAsleep.Count(i => i.Body == body));
    }

    [Fact]
    public async Task Distant_news_waits_for_the_next_waking_and_reads_well()
    {
        // Assyria's army leaves Ekallatum, next to Babylon's land, for Arbela, which is not: Babylon sees it and sleeps on.
        var sleeper = new Sleeper(_ => Nothing());
        var assyria = new Scripted(v => v.Turn == 2 ? new TurnSubmission { Orders = [new MoveOrder("ekallatum", "arbela")] } : new TurnSubmission());
        await Play(Power.Babylonia, sleeper, 5, Quiet with { MaxSleep = 3 }, others: new() { [Power.Assyria] = assyria });
        Assert.Equal([1, 5], sleeper.Calls);
        var woke = sleeper.Views[1];
        Assert.Contains("turn 2: Assyria's army moved ekallatum -> arbela", woke.Digest);
        // Routine treasury notices of the seasons it slept are left out: this season's is in its news.
        Assert.DoesNotContain(woke.WhileAsleep, i => i.Title == "The treasury");
        Assert.Contains(woke.Inbox, i => i.Title == "The treasury" && i.Turn == 5);
        var text = Prompts.Situation(woke);
        Assert.Contains("WHILE YOU SLEPT (since you gave orders in turn 1):\nIn brief:\n- turn 2: Assyria's army moved ekallatum -> arbela", text.ReplaceLineEndings("\n"));
    }

    [Fact]
    public void The_news_of_a_long_sleep_and_its_digest_are_bounded()
    {
        var (s, sleep) = Asleep(Power.Babylonia);
        s.Turn = 14;
        for (var t = 2; t <= 13; t++)
        {
            s.InboxOf(Power.Babylonia).Add(new InboxItem { Turn = t, Kind = InboxKind.Notice, Title = "The treasury", Body = t == 7 ? "Income 200. Could not pay: Mane." : "Income 200." });
            for (var k = 0; k < 4; k++) s.InboxOf(Power.Babylonia).Add(new InboxItem { Turn = t, Kind = InboxKind.Rumor, Title = "Rumor", Body = $"rumour {t}.{k}" });
        }
        var view = Views.For(s, Power.Babylonia);
        // 48 rumours and the one treasury notice that says more than the figures: the latest 40 are shown.
        Assert.Equal(Views.MaxWhileAsleep, view.WhileAsleep.Count);
        Assert.Equal(9, view.WhileAsleepLeftOut);
        Assert.Equal("rumour 13.3", view.WhileAsleep[^1].Body);
        Assert.Single(view.WhileAsleep, i => i.Title == "The treasury");
        Assert.Contains("9 earlier items left out", Prompts.Situation(view));

        for (var k = 0; k < 65; k++) s.Notify(Power.Babylonia, InboxKind.Rejected, $"Failure {k}", "It failed.");
        new TurnEngine(s).WakeCheck();
        Assert.Equal(TurnEngine.MaxDigest, sleep.Digest.Count);
        Assert.Equal(5, sleep.DigestLeftOut);
        Assert.Equal("turn 14: an order was refused or failed (Failure 64)", sleep.Digest[^1]);
        Assert.Contains("In brief (5 earlier lines left out):", Prompts.Situation(Views.For(s, Power.Babylonia)));
    }

    [Fact]
    public void Once_the_seat_has_read_its_digest_the_next_one_starts_afresh()
    {
        // Woken in turn 3 with a full digest, the seat gives orders: the next digest has no lines left out.
        var (s, sleep) = Asleep(Power.Babylonia);
        sleep.Asleep = false;
        sleep.Digest = ["turn 2: an order was refused or failed (Old)"];
        sleep.DigestLeftOut = 5;
        var e = new TurnEngine(s);
        e.BeginTurn();
        e.Resolve(new Dictionary<Power, TurnSubmission> { [Power.Babylonia] = new() });
        Assert.True(sleep.Asleep);
        Assert.Empty(sleep.Digest);
        Assert.Equal(0, sleep.DigestLeftOut);

        s.Notify(Power.Babylonia, InboxKind.Rejected, "Levy failed", "No army was raised in ur.");
        new TurnEngine(s).WakeCheck();
        Assert.True(sleep.Asleep);
        Assert.Contains("turn 4: an order was refused or failed (Levy failed)", sleep.Digest);
        Assert.Equal(0, sleep.DigestLeftOut);
        var text = Prompts.Situation(Views.For(s, Power.Babylonia));
        Assert.Contains("In brief:", text);
        Assert.DoesNotContain("lines left out", text);
    }

    [Fact]
    public void A_failed_move_into_its_empty_land_waits_in_the_digest_marked_as_into_its_land()
    {
        var (s, sleep) = Asleep(Power.Babylonia);
        s.LastSeen[Power.Babylonia] =
        [
            new OrderOutcome { Power = Power.Assyria, UnitKind = UnitKind.Army, Province = "ekallatum", Order = "move", Target = "sippar", TargetOwner = Power.Babylonia },
            new OrderOutcome { Power = Power.Assyria, UnitKind = UnitKind.Army, Province = "mari", Order = "move", Target = "terqa", TargetOwner = Power.Assyria },
        ];
        new TurnEngine(s).WakeCheck();
        Assert.True(sleep.Asleep);
        Assert.Equal(["turn 2: Assyria's army tried to move ekallatum -> sippar (into your land) and failed", "turn 2: Assyria's army tried to move mari -> terqa and failed"], sleep.Digest);
    }

    [Fact]
    public async Task A_seat_whose_first_call_failed_is_told_it_gives_orders_for_the_first_time()
    {
        var calls = 0;
        var sleeper = new Sleeper(_ => ++calls == 1 ? throw new InvalidOperationException("the model did not answer") : Nothing());
        await Play(Power.Babylonia, sleeper, 2, setup: s =>
            s.InboxOf(Power.Babylonia).Add(new InboxItem { Turn = 1, Kind = InboxKind.Rumor, Title = "Rumor", Body = "Word spreads that Hatti is restless." }));
        Assert.Equal([1, 2], sleeper.Calls);
        var second = sleeper.Views[1];
        Assert.Equal(0, second.LastCalled);
        Assert.Equal("This is the first season you give orders.", Prompts.SleepLine(second));
        Assert.Contains("WHILE YOU SLEPT (since the game began):", Prompts.Situation(second));
    }

    [Fact]
    public async Task Orders_scheduled_for_a_season_that_has_passed_are_reported_not_kept()
    {
        var sleeper = new Sleeper(v => v.Turn switch
        {
            1 => Wake(3),
            3 => new TurnSubmission { Scheduled = [new ScheduledOrders { Turn = 2, Orders = [new HoldOrder("babylon")] }] },
            _ => Nothing(),
        });
        var r = await Play(Power.Babylonia, sleeper, 3);
        var notice = Assert.Single(r.State.InboxOf(Power.Babylonia), i => i.Title == "Scheduled orders not kept");
        Assert.Equal((4, "- turn 2: that season has passed"), (notice.Turn, notice.Body));
        Assert.Empty(r.State.Sleep[Power.Babylonia].Scheduled);
    }

    // ------------------------------------------------------------ what the kings read

    [Fact]
    public async Task Every_request_opens_with_how_long_the_king_slept_and_what_woke_it()
    {
        var recorder = new Recorder();
        var envoyId = "";
        var egypt = new Scripted(v => v.Turn == 1 ? new TurnSubmission { Orders = [new DispatchOrder(envoyId, Power.Alashiya, "Greetings, brother.")] } : new TurnSubmission());
        var state = GameFactory.NewGame(31, Quiet);
        envoyId = state.Characters.First(c => c.Employer == Power.Egypt).Id;
        var king = new LlmLeaderSeat(Power.Alashiya, recorder, "claude-sonnet-5-5", "medium", true, state.Config);
        var seats = Powers.All.ToDictionary(p => p, p => p == Power.Alashiya ? king : p == Power.Egypt ? egypt : (ISeat)new Scripted());
        var runner = new GameRunner(state, seats, new ScriptMind(), new TemplateNarrator()) { WriteChronicles = false };
        var travel = new TurnEngine(state).TravelTurns(Power.Egypt, Power.Alashiya);
        for (var i = 0; i < 1 + travel; i++) await runner.PlayTurnAsync();

        var first = recorder.Specs.Single(x => x.Key == "t1/orders/Alashiya");
        Assert.StartsWith("This is your first season.\n", first.User.ReplaceLineEndings("\n"));
        Assert.Contains("YOU SLEEP BETWEEN YOUR ORDERS\nAfter you give your orders, you sleep.", first.SharedSystem.ReplaceLineEndings("\n"));
        Assert.Contains("\"wake_in_turn\"", first.Schema.ToJsonString());
        var slept = travel - 1;
        var line = (slept == 0 ? "You gave orders last season (turn 1)." : $"You slept {slept} season{(slept == 1 ? "" : "s")} (you last gave orders in turn 1).")
                   + " You were woken because: an envoy of Egypt waits to be received.\n";
        var host = recorder.Specs.First(x => x.Key.StartsWith($"t{1 + travel}/aud/", StringComparison.Ordinal));
        Assert.StartsWith(line, host.User.ReplaceLineEndings("\n"));
        var orders = recorder.Specs.Single(x => x.Key == $"t{1 + travel}/orders/Alashiya");
        Assert.StartsWith(line, orders.User.ReplaceLineEndings("\n"));
        // An orders request ends by saying the king sleeps after its orders.
        Assert.EndsWith("Now give your orders for this season and the seasons ahead: your troops, your envoys and letters, and anything else. You sleep after them.", orders.User.TrimEnd());
    }

    [Fact]
    public void Woken_the_season_after_its_orders_a_king_is_told_it_gave_orders_last_season()
    {
        var view = new SeatView { Sleeps = true, Turn = 5, LastCalled = 4, WokenBecause = ["an envoy of Egypt waits to be received"] };
        Assert.Equal("You gave orders last season (turn 4). You were woken because: an envoy of Egypt waits to be received.", Prompts.SleepLine(view));
        view.Turn = 6;
        Assert.StartsWith("You slept 1 season (you last gave orders in turn 4).", Prompts.SleepLine(view));
    }

    [Fact]
    public async Task An_audience_after_a_sleep_tells_the_host_what_happened_while_it_slept()
    {
        // Alashiya sleeps from turn 1. News reaches it in turn 2; Egypt's envoy, sent in turn 2, wakes it later.
        var recorder = new Recorder();
        var envoyId = "";
        var egypt = new Scripted(v => v.Turn == 2 ? new TurnSubmission { Orders = [new DispatchOrder(envoyId, Power.Alashiya, "Greetings, brother.")] } : new TurnSubmission());
        var state = GameFactory.NewGame(31, Quiet);
        envoyId = state.Characters.First(c => c.Employer == Power.Egypt).Id;
        var king = new LlmLeaderSeat(Power.Alashiya, recorder, "claude-sonnet-5-5", "medium", true, state.Config);
        var seats = Powers.All.ToDictionary(p => p, p => p == Power.Alashiya ? king : p == Power.Egypt ? egypt : (ISeat)new Scripted());
        var runner = new GameRunner(state, seats, new ScriptMind(), new TemplateNarrator()) { WriteChronicles = false };
        var travel = new TurnEngine(state).TravelTurns(Power.Egypt, Power.Alashiya);
        await runner.PlayTurnAsync();
        state.InboxOf(Power.Alashiya).Add(new InboxItem { Turn = 2, Kind = InboxKind.Rumor, Title = "Rumor", Body = "Word spreads that Hatti is restless." });
        for (var i = 0; i < 1 + travel; i++) await runner.PlayTurnAsync();

        var host = recorder.Specs.First(x => x.Key.StartsWith($"t{2 + travel}/aud/", StringComparison.Ordinal)).User.ReplaceLineEndings("\n");
        Assert.Contains("WHILE YOU SLEPT (since you gave orders in turn 1):", host);
        Assert.Contains("[turn 2] [Rumor] Rumor: Word spreads that Hatti is restless.", host);
        // Before the season's news, as in the orders request.
        Assert.True(host.IndexOf("WHILE YOU SLEPT", StringComparison.Ordinal) < host.IndexOf("NEWS THIS SEASON", StringComparison.Ordinal));
        var orders = recorder.Specs.Single(x => x.Key == $"t{2 + travel}/orders/Alashiya").User.ReplaceLineEndings("\n");
        Assert.Contains("[turn 2] [Rumor] Rumor: Word spreads that Hatti is restless.", orders);
    }

    [Fact]
    public async Task With_sleeping_off_an_orders_request_says_nothing_of_sleep()
    {
        var recorder = new Recorder();
        var off = Quiet with { SleepingSeats = false };
        var king = new LlmLeaderSeat(Power.Alashiya, recorder, "claude-sonnet-5-5", "medium", true, off);
        await Play(Power.Alashiya, king, 1, off);
        var orders = recorder.Specs.Single(x => x.Key == "t1/orders/Alashiya").User;
        Assert.StartsWith("SEASON: turn 1", orders);
        Assert.EndsWith("Now give your orders for this season: your troops, your envoys and letters, and anything else.", orders.TrimEnd());
        Assert.DoesNotContain("sleep", orders, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void The_rulebook_tells_a_king_that_sleeps_what_wakes_it_right_after_how_to_win()
    {
        var rules = Prompts.LeaderRules(true, new GameConfig()).ReplaceLineEndings("\n");
        var win = rules.IndexOf("HOW YOU WIN", StringComparison.Ordinal);
        var sleep = rules.IndexOf("YOU SLEEP BETWEEN YOUR ORDERS", StringComparison.Ordinal);
        var season = rules.IndexOf("HOW A SEASON RESOLVES", StringComparison.Ordinal);
        Assert.True(win < sleep && sleep < season);
        Assert.Contains("After you give your orders, you sleep. You are woken only when something concerns you: an envoy at your door, foreign troops in your land, land or troops lost, a scheduled order that failed, a servant giving notice, a ransom demanded, or news you asked to hear. Nothing else wakes you, and you may not be woken again for the rest of the game. Plan as if these orders must carry your kingdom until then: schedule what your armies should do in the seasons ahead, set the triggers you want, and leave your envoys mandates that stand on their own.", rules);
        Assert.Contains("PLANNING AHEAD (how sleeping works)", rules);
        Assert.Contains("You may schedule at most 24 orders for one season, for at most 40 seasons.", rules);
        Assert.Contains("name it (wake_in_turn)", rules);
        Assert.Contains("(a move that is stopped or a support that is cut among them), wakes you the next season. The orders you give now for this season do not, an entry for this season in your schedule among them", rules);
        // Told when it next gives orders, not "next season": a king that sleeps reads it when it is woken.
        Assert.Contains("Orders that are illegal or unaffordable are refused, and you are told why the next time you give orders.", rules);
        Assert.Contains("you see them again the next time you give orders", rules);
        Assert.DoesNotContain("skip", rules);
    }

    [Fact]
    public void With_sleeping_off_a_king_reads_nothing_of_sleep()
    {
        var off = new GameConfig { SleepingSeats = false };
        var rules = Prompts.LeaderRules(true, off);
        Assert.DoesNotContain("sleep", rules, StringComparison.OrdinalIgnoreCase);
        var schema = Schemas.LeaderOrders(off).ToJsonString();
        Assert.DoesNotContain("\"sleep\"", schema);
        Assert.DoesNotContain("\"schedule\"", schema);
        var s = GameFactory.NewGame(31, off);
        var view = Views.For(s, Power.Babylonia);
        Assert.False(view.Sleeps);
        Assert.Equal("", Prompts.SleepLine(view));
        Assert.StartsWith("SEASON: turn 1", Prompts.Situation(view));
    }

    // ------------------------------------------------------------ fresh orders, the stand-in, the switch and replays

    [Fact]
    public async Task A_fresh_order_for_a_unit_replaces_the_one_scheduled_for_it()
    {
        var sleeper = new Sleeper(v => v.Turn switch
        {
            1 => new TurnSubmission { Sleep = new SleepRequest { WakeTurn = 2 }, Scheduled = [new ScheduledOrders { Turn = 2, Orders = [new MoveOrder("babylon", "nippur"), new MoveOrder("durkurigalzu", "nippur")] }] },
            2 => new TurnSubmission { Orders = [new HoldOrder("babylon")] },
            _ => Nothing(),
        });
        var r = await Play(Power.Babylonia, sleeper, 2);
        Assert.Contains("turn 2", Prompts.Situation(sleeper.Views[1]));
        Assert.Contains(r.State.Units, u => u.Power == Power.Babylonia && u.Province == "babylon");
        Assert.Contains(r.State.Units, u => u.Power == Power.Babylonia && u.Province == "nippur");
        Assert.DoesNotContain(r.State.Units, u => u.Province == "durkurigalzu");
    }

    [Fact]
    public async Task An_entry_for_this_season_replaces_or_cancels_what_was_scheduled_for_it()
    {
        var sleeper = new Sleeper(v => v.Turn switch
        {
            1 => new TurnSubmission { Sleep = new SleepRequest { WakeTurn = 2 }, Scheduled = [new ScheduledOrders { Turn = 2, Orders = [new RaiseOrder("nippur", UnitKind.Army)] }] },
            2 => new TurnSubmission { Scheduled = [new ScheduledOrders { Turn = 2 }] },
            _ => Nothing(),
        });
        var r = await Play(Power.Babylonia, sleeper, 2);
        Assert.DoesNotContain(r.State.Units, u => u.Province == "nippur");
    }

    [Fact]
    public async Task When_the_script_king_stands_in_the_seat_is_asked_again_and_still_gets_its_digest()
    {
        var calls = 0;
        var sleeper = new Sleeper(v =>
        {
            calls++;
            if (calls == 2) throw new InvalidOperationException("the model did not answer");
            return v.Turn == 1 ? new TurnSubmission { Orders = [new MoveOrder("babylon", "nippur")], Sleep = new SleepRequest { WakeTurn = 3 } } : Nothing();
        });
        var r = await Play(Power.Babylonia, sleeper, 4);
        Assert.Contains(r.Errors, e => e.StartsWith("t3/orders/Babylonia:"));
        // The stand-in did not put the seat to sleep: it is asked again next season, told how long it has been and why it
        // was woken in the season it missed, which it never read.
        Assert.Equal([1, 3, 4], sleeper.Calls);
        var after = sleeper.Views.Last();
        Assert.Equal(1, after.LastCalled);
        Assert.Equal(["you asked to be woken in turn 3"], after.WokenBecause);
        Assert.Equal("You slept 2 seasons (you last gave orders in turn 1). You were woken because: you asked to be woken in turn 3.", Prompts.SleepLine(after));
        Assert.Contains(after.WhileAsleep, i => i.Turn == 2 && i.Title == "Movements last season");
    }

    [Fact]
    public async Task A_seat_whose_call_failed_is_told_next_season_what_woke_it_and_what_concerns_it_now()
    {
        // Babylon disbands the army in Sippar and sleeps; Assyria walks in in turn 2 and the seat is woken in turn 3, but its
        // call fails. Asked again in turn 4, it reads what woke it in turn 3, which it never read.
        var calls = 0;
        var sleeper = new Sleeper(v =>
        {
            calls++;
            if (calls == 2) throw new InvalidOperationException("the model did not answer");
            return v.Turn == 1 ? new TurnSubmission { Orders = [new DisbandOrder("sippar")] } : Nothing();
        });
        var assyria = new Scripted(v => v.Turn == 2 ? new TurnSubmission { Orders = [new MoveOrder("ekallatum", "sippar")] } : new TurnSubmission());
        var r = await Play(Power.Babylonia, sleeper, 5, others: new() { [Power.Assyria] = assyria });
        Assert.Contains(r.Errors, e => e.StartsWith("t3/orders/Babylonia:"));
        Assert.Equal([1, 3, 4], sleeper.Calls);
        string[] woke = ["foreign troops entered your land: Assyria's army moved ekallatum -> sippar", "land lost: Sippar has been taken by Assyria."];
        Assert.Equal(woke, sleeper.Views[1].WokenBecause);
        Assert.Equal(woke, sleeper.Views[2].WokenBecause);
        Assert.Equal("You slept 2 seasons (you last gave orders in turn 1). You were woken because: foreign troops entered your land: Assyria's army moved ekallatum -> sippar; land lost: Sippar has been taken by Assyria.", Prompts.SleepLine(sleeper.Views[2]));
        // Having answered itself in turn 4, it sleeps on: the reasons it has now read wake it no more.
        Assert.True(r.State.Sleep[Power.Babylonia].Asleep);
    }

    [Fact]
    public void A_game_with_sleeping_seats_can_only_be_continued_by_seats_that_can_sleep_the_same_way()
    {
        var log = new GameLog { Header = new LogHeader { Seed = 3, Config = new GameConfig(), Sleepers = [Power.Egypt] } };
        var bot = new ScriptLeader(3);
        var seats = Powers.All.ToDictionary(p => p, _ => (ISeat)bot);
        var ex = Assert.Throws<InvalidOperationException>(() => GameRunner.Resume(log, seats, new ScriptMind(), new TemplateNarrator()));
        Assert.Contains("Egypt", ex.Message);
    }

    [Fact]
    public async Task With_sleeping_off_every_seat_is_asked_every_season()
    {
        var sleeper = new Sleeper(_ => Wake(4));
        var r = await Play(Power.Babylonia, sleeper, 4, Quiet with { SleepingSeats = false });
        Assert.Equal([1, 2, 3, 4], sleeper.Calls);
        Assert.Empty(r.State.Sleep);
        Assert.All(sleeper.Views, v => Assert.False(v.Sleeps));
    }

    [Fact]
    public void Script_and_human_seats_never_sleep()
    {
        var state = GameFactory.NewGame(5);
        var bot = new ScriptLeader(5);
        var seats = Powers.All.ToDictionary(p => p, p => p == Power.Egypt ? (ISeat)new HumanSeat(p) : bot);
        var runner = new GameRunner(state, seats, new ScriptMind(), new TemplateNarrator());
        Assert.True(state.Config.SleepingSeats);
        Assert.Empty(state.Sleep);
        Assert.Empty(runner.Log.Header.Sleepers);
    }

    [Fact]
    public async Task Games_replay_exactly_with_sleeping_seats_on_and_off()
    {
        foreach (var sleeping in new[] { true, false })
        {
            for (ulong seed = 1; seed <= 3; seed++)
            {
                var summary = await BatchRunner.PlayAsync(seed, st =>
                {
                    var bot = new ScriptLeader(st.Seed);
                    // Two kings that sleep after every call, naming seasons, scheduling orders and setting triggers, among script kings.
                    var nap = new Sleeper(v => Wake(0, new WakeTrigger { Kind = WakeKind.ProvinceChangesHands, Province = "mari" }));
                    var babylon = new Sleeper(v => new TurnSubmission
                    {
                        Sleep = new SleepRequest { WakeTurn = v.Turn + 1 + v.Turn % 3 },
                        Scheduled =
                        [
                            new ScheduledOrders { Turn = v.Turn + 1, Orders = [new HoldOrder("babylon")] },
                            new ScheduledOrders { Turn = v.Turn + 2, Orders = [new MoveOrder("sippar", "mari")] },
                        ],
                    });
                    var seats = Powers.All.ToDictionary(p => p, p => p switch { Power.Alashiya => nap, Power.Babylonia => babylon, _ => (ISeat)bot });
                    return new GameRunner(st, seats, new ScriptMind(), new TemplateNarrator()) { WriteChronicles = false };
                }, verifyReplay: true, config: new GameConfig { SleepingSeats = sleeping, MaxSleep = 4, MaxTurns = 18 });
                Assert.True(summary.ReplayMatches, $"seed {seed}, sleep {(sleeping ? "on" : "off")}");
            }
        }
    }
}
