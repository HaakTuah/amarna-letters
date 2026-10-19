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
    private sealed class Sleeper(Func<SeatView, TurnSubmission> decide, Func<AudienceView, HostReply>? host = null) : ISeat
    {
        public List<SeatView> Views { get; } = new();
        public List<int> Hosted { get; } = new();
        public List<SeatView> Courts { get; } = new();
        public List<AudienceView> Audiences { get; } = new();
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
                Audiences.Add(view);
            }
            return Task.FromResult(host?.Invoke(view) ?? new HostReply { Speech = "Go in peace.", End = true });
        }
    }

    /// <summary>A seat that never sleeps and does what it is told each season (nothing, by default).</summary>
    private sealed class Scripted(Func<SeatView, TurnSubmission>? decide = null) : ISeat
    {
        public string Label => "Scripted";
        public Task<TurnSubmission> DecideAsync(SeatView view, CancellationToken ct) => Task.FromResult(decide?.Invoke(view) ?? new TurnSubmission());
        public Task<HostReply> HostAudienceAsync(AudienceView view, SeatView court, CancellationToken ct) => Task.FromResult(new HostReply { End = true });
    }

    /// <summary>Records what a model king is sent, and holds everything. With <paramref name="reopen"/>, it reopens its orders at every audience held while they stand.</summary>
    private sealed class Recorder(bool reopen = false) : IJsonAsker
    {
        public List<CallSpec> Specs { get; } = new();

        public Task<JsonObject> AskJsonAsync(CallSpec spec, CancellationToken ct)
        {
            lock (Specs) Specs.Add(spec);
            var json = spec.Key.Contains("/orders/")
                ? """{"notes":"Hold fast.","units":[],"letters":[],"other_orders":[]}"""
                : """{"speech":"Welcome.","gift_to_envoy":0,"gift_request":"","offer_service_wage":0,"seal_tablet":false,"detain_envoy":false,"send_gold_back":0,"gold_back_purity":100,"end_audience":true,"letters":[],"reopen_orders":REOPEN}""".Replace("REOPEN", reopen ? "true" : "false");
            return Task.FromResult((JsonObject)JsonNode.Parse(json)!);
        }
    }

    /// <summary>Sleeping seats are on by default: nothing here switches them on.</summary>
    private static readonly GameConfig Quiet = new() { MinTurns = 40, CatastropheChance = 0 };

    private static TurnSubmission Nothing() => new();

    /// <summary>
    /// A game whose hidden cap wakes a seat that slept this many seasons. A king cannot ask to be woken, so the tests that need
    /// a seat awake in a given season use the cap: having given orders in turn t, it is woken in turn t + 1 + seasons.
    /// </summary>
    private static GameConfig Cap(int seasons) => Quiet with { MaxSleep = seasons };

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
        Assert.Equal((2, 0), (spell.From, spell.WokeAt));
        // Its units held while it slept, and the world went on.
        Assert.Equal(6, r.State.Scores.Max(s => s.Turn));
        Assert.Equal("This is your first season.", Prompts.SleepLine(sleeper.Views[0]));
    }

    [Fact]
    public async Task A_king_cannot_ask_to_be_woken()
    {
        // The fix pass after item 4 ("Decided: sleep is the default", "No triggers of the seat's own"): no season to be woken
        // in, no triggers of its own. The schema has no field for either, the rulebook says so plainly, and a reply that
        // still names them is read as if it did not.
        var c = new GameConfig();
        var schema = Schemas.LeaderOrders(c).ToJsonString();
        foreach (var gone in new[] { "\"sleep\"", "wake_in_turn", "wake_on", "unit_moves", "envoy_returns", "treasury_below", "troops_enter", "province_changes_hands" })
            Assert.DoesNotContain(gone, schema);
        var rules = Prompts.LeaderRules(true, c);
        Assert.DoesNotContain("wake_in_turn", rules);
        Assert.DoesNotContain("wake_on", rules);
        Assert.DoesNotContain("news you asked to hear", rules);
        Assert.Contains("You cannot ask to be woken, at a season you name or for anything else.", rules);
        const string plain = """{"notes":"Hold.","units":[],"letters":[],"other_orders":[],"schedule":[],"standing_orders":[],"cancel_standing":[]}""";
        const string asks = """{"notes":"Hold.","units":[],"letters":[],"other_orders":[],"sleep":{"wake_in_turn":2,"wake_on":[{"trigger":"unit_moves","province":"ekallatum"}]},"schedule":[],"standing_orders":[],"cancel_standing":[]}""";
        Assert.Equal(Json.Serialize(Parse.Orders((JsonObject)JsonNode.Parse(plain)!)), Json.Serialize(Parse.Orders((JsonObject)JsonNode.Parse(asks)!)));

        // Asleep after its first orders, it is not woken again in six quiet seasons: only what concerns it, or the cap, would.
        var sleeper = new Sleeper(_ => Nothing());
        var r = await Play(Power.Babylonia, sleeper, 6);
        Assert.Equal([1], sleeper.Calls);
        Assert.Equal(1 + 1 + 12, r.State.Sleep[Power.Babylonia].WakeAt);
    }

    [Fact]
    public async Task The_hidden_cap_wakes_a_seat_after_a_long_sleep_and_is_told_nowhere()
    {
        // The cap wakes it at turn 1 + 1 + 3, and says nothing of itself.
        var sleeper = new Sleeper(_ => Nothing());
        await Play(Power.Babylonia, sleeper, 6, Cap(3));
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
        Assert.Contains("- turn 7: the army now in babylon -> nippur", Prompts.Situation(sleeper.Views[1]));
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

        Assert.Equal(40, sleep.Scheduled.Select(x => x.Turn).Distinct().Count());
        Assert.Equal(24, sleep.Scheduled.Count(x => x.Turn == 2));
        Assert.Equal(41, sleep.Scheduled[^1].Turn);
        var notice = Assert.Single(s.InboxOf(Power.Babylonia), i => i.Title == "Scheduled orders not kept");
        Assert.Equal(InboxKind.Rejected, notice.Kind);
        Assert.Contains("- turn 2: only the first 24 of its 30 orders were kept", notice.Body);
        Assert.Contains("- turns 42, 43, 44, 45, 46, 61: orders may be scheduled for at most 40 seasons", notice.Body);
        // Orders past a limit are refused like any other, and wake the seat.
        new TurnEngine(s).WakeCheck();
        Assert.False(sleep.Asleep);
        Assert.Equal(["orders you scheduled were refused: turn 2: only the first 24 of its 30 orders were kept; at most 24 orders may be scheduled for one season; "
                      + "turns 42, 43, 44, 45, 46, 61: orders may be scheduled for at most 40 seasons, so those for the latest were not kept"], sleep.WokenBecause);
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
            e.Resolve(new Dictionary<Power, TurnSubmission> { [Power.Babylonia] = new() { Scheduled = plans } });
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
        Assert.Contains("- turn 42: the army now in babylon holds", shortText);
        Assert.Contains("- turns 43, 70: orders may be scheduled for at most 40 seasons", shortNotices);
    }

    // ------------------------------------------------------------ what wakes a seat

    [Fact]
    public async Task An_envoy_at_the_door_wakes_the_host_for_its_audience_only()
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
        // It received the envoy, but no orders call followed: it did not reopen its orders, so they stand and it sleeps on.
        Assert.Equal([1], sleeper.Calls);
        var sl = state.Sleep[Power.Alashiya];
        Assert.True(sl.Asleep);
        Assert.False(sl.HoldsCourt);
        Assert.Equal(0, sl.History.Last().WokeAt);
        var court = Assert.Single(sl.Courts);
        Assert.Equal((1 + travel, 1, false), (court.Turn, court.Envoys, court.Reopened));
        Assert.True(sleeper.Audiences.Last().OrdersStand);
        // The audience opens like every request: how long the host slept and what woke it, and that its orders stand.
        Assert.EndsWith("You were woken to receive an envoy: an envoy of Egypt waits to be received. Your orders stand unless you reopen them at your audience.", Prompts.SleepLine(sleeper.Courts.Last()));
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
            ["foreign troops entered your land: Assyria's army moved ekallatum -> sippar", "foreign troops came next to your capital: Assyria's army moved ekallatum -> sippar", "land lost: Sippar has been taken by Assyria."],
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
            1 => new TurnSubmission { Scheduled = [new ScheduledOrders { Turn = 2, Orders = [new MoveOrder("sippar", "memphis")] }] },
            _ => Nothing(),
        });
        await Play(Power.Babylonia, sleeper, 7, Cap(3));
        Assert.Equal([1, 3, 7], sleeper.Calls);
        Assert.Contains(sleeper.Views[1].WokenBecause, w => w.StartsWith("orders you scheduled could not be carried out"));
        Assert.Equal([TurnEngine.CapReason], sleeper.Views[2].WokenBecause);
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
        // The Great Green lies off Tamassos, not next to Enkomi, Alashiya's capital (a fleet arriving there would wake it).
        var egypt = new Scripted(v => v.Turn == 2 ? new TurnSubmission { Orders = [new MoveOrder("delta", "greatgreen")] } : new TurnSubmission());
        var r = await Play(Power.Alashiya, sleeper, 4, Quiet with { MaxSleep = 2 }, others: new() { [Power.Egypt] = egypt });
        Assert.Equal([1, 4], sleeper.Calls);
        Assert.Equal([TurnEngine.CapReason], sleeper.Views[1].WokenBecause);
        Assert.Contains("turn 2: Egypt's fleet moved delta -> greatgreen", sleeper.Views[1].Digest);
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
    [InlineData(InboxKind.Notice, TurnEngine.ArchiveTakenTitle, "With Ashur you took the archive of Assyria: copies of 1 tablet you did not hold are now in your archive: k130 (sealed by Assyria and Hatti, dated turn 1).", "with Ashur you took the archive of Assyria")]
    [InlineData(InboxKind.Notice, TurnEngine.ArchiveTakenTitle, "With Ashur you took the archive of Assyria; it held no tablet you did not hold already.", "with Ashur you took the archive of Assyria")]
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
            1 => Nothing(),
            3 => new TurnSubmission { Scheduled = [new ScheduledOrders { Turn = 2, Orders = [new HoldOrder("babylon")] }] },
            _ => Nothing(),
        });
        var r = await Play(Power.Babylonia, sleeper, 3, Cap(1));
        var notice = Assert.Single(r.State.InboxOf(Power.Babylonia), i => i.Title == "Scheduled orders not kept");
        Assert.Equal((4, "- turn 2: that season has passed"), (notice.Turn, notice.Body));
        Assert.Empty(r.State.Sleep[Power.Babylonia].Scheduled);
    }

    // ------------------------------------------------------------ what the kings read

    [Fact]
    public async Task Every_request_opens_with_how_long_the_king_slept_and_what_woke_it()
    {
        // The king reopens its orders at the audience, so an orders request follows it in the same season.
        var recorder = new Recorder(reopen: true);
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
        Assert.Contains("\"schedule\"", first.Schema.ToJsonString());
        Assert.DoesNotContain("\"wake_in_turn\"", first.Schema.ToJsonString());
        var slept = travel - 1;
        var since = slept == 0 ? "You gave orders last season (turn 1)." : $"You slept {slept} season{(slept == 1 ? "" : "s")} (you last gave orders in turn 1).";
        var host = recorder.Specs.First(x => x.Key.StartsWith($"t{1 + travel}/aud/", StringComparison.Ordinal));
        Assert.StartsWith(since + " You were woken to receive an envoy: an envoy of Egypt waits to be received. Your orders stand unless you reopen them at your audience.\n",
            host.User.ReplaceLineEndings("\n"));
        var orders = recorder.Specs.Single(x => x.Key == $"t{1 + travel}/orders/Alashiya");
        Assert.StartsWith(since + " You were woken because: an envoy of Egypt waits to be received; you chose at your audience to reopen your orders.\n",
            orders.User.ReplaceLineEndings("\n"));
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
        // Alashiya sleeps from turn 1. News reaches it in turn 2; Egypt's envoy, sent in turn 2, wakes it later for an
        // audience, where it reopens its orders.
        var recorder = new Recorder(reopen: true);
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
        Assert.Contains("After you give your orders, you sleep. Only these wake you, because they concern you: an envoy at your door; foreign troops in your land or next to your capital; land or troops lost; a scheduled or standing order that failed; a servant giving notice; a ransom demanded. You cannot ask to be woken, at a season you name or for anything else. If none of these happens, you sleep on: you may sleep for the rest of the game. So plan as if these orders must carry your kingdom until it ends: schedule what your armies should do in the seasons ahead, give standing orders for the attacks you fear, and leave your envoys mandates that stand on their own. When you are woken to receive an envoy, reopen your orders if the news changes your plan; otherwise they stand.", rules);
        // The sentence six kings of the second agent simulation read as a contradiction is gone.
        Assert.DoesNotContain("you may not be woken again", rules);
        Assert.Contains("PLANNING AHEAD (how sleeping works)", rules);
        Assert.Contains("You may schedule at most 24 orders for one season, for at most 40 seasons; orders past these limits are refused.", rules);
        Assert.Contains("Standing orders (standing_orders), at most 12, each with at most 24 orders,", rules);
        Assert.Contains("Your units hold unless you scheduled orders for them or a standing order gives them orders.", rules);
        Assert.Contains("If two fire in the same season, the one with the lower id goes first", rules);
        Assert.DoesNotContain("wake_in_turn", rules);
        Assert.Contains("(a move that is stopped or a support that is cut among them), wakes you the next season. The orders you give now for this season do not, an entry for this season in your schedule among them", rules);
        // Told when it next gives orders, not "next season": a king that sleeps reads it when it is woken.
        Assert.Contains("Orders that are illegal or unaffordable are refused, and you are told why the next time you give orders.", rules);
        Assert.Contains("Each set of orders shows you the notes, audiences and orders of the last three seasons you gave orders", rules);
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
            1 => new TurnSubmission { Scheduled = [new ScheduledOrders { Turn = 2, Orders = [new MoveOrder("babylon", "nippur"), new MoveOrder("durkurigalzu", "nippur")] }] },
            2 => new TurnSubmission { Orders = [new HoldOrder("babylon")] },
            _ => Nothing(),
        });
        var r = await Play(Power.Babylonia, sleeper, 2, Cap(0));
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
            1 => new TurnSubmission { Scheduled = [new ScheduledOrders { Turn = 2, Orders = [new RaiseOrder("nippur", UnitKind.Army)] }] },
            2 => new TurnSubmission { Scheduled = [new ScheduledOrders { Turn = 2 }] },
            _ => Nothing(),
        });
        var r = await Play(Power.Babylonia, sleeper, 2, Cap(0));
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
            return v.Turn == 1 ? new TurnSubmission { Orders = [new MoveOrder("babylon", "nippur")] } : Nothing();
        });
        var r = await Play(Power.Babylonia, sleeper, 4, Cap(1));
        Assert.Contains(r.Errors, e => e.StartsWith("t3/orders/Babylonia:"));
        // The stand-in did not put the seat to sleep: it is asked again next season, told how long it has been and why it
        // was woken in the season it missed, which it never read.
        Assert.Equal([1, 3, 4], sleeper.Calls);
        var after = sleeper.Views.Last();
        Assert.Equal(1, after.LastCalled);
        Assert.Equal([TurnEngine.CapReason], after.WokenBecause);
        Assert.Equal("You slept 2 seasons (you last gave orders in turn 1). You were woken because: your counsellors woke you after a long sleep.", Prompts.SleepLine(after));
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
        string[] woke = ["foreign troops entered your land: Assyria's army moved ekallatum -> sippar", "foreign troops came next to your capital: Assyria's army moved ekallatum -> sippar", "land lost: Sippar has been taken by Assyria."];
        Assert.Equal(woke, sleeper.Views[1].WokenBecause);
        Assert.Equal(woke, sleeper.Views[2].WokenBecause);
        Assert.Equal("You slept 2 seasons (you last gave orders in turn 1). You were woken because: foreign troops entered your land: Assyria's army moved ekallatum -> sippar; foreign troops came next to your capital: Assyria's army moved ekallatum -> sippar; land lost: Sippar has been taken by Assyria.", Prompts.SleepLine(sleeper.Views[2]));
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
        var sleeper = new Sleeper(_ => Nothing());
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
        var played = new List<GameState>();
        foreach (var sleeping in new[] { true, false })
        {
            for (ulong seed = 1; seed <= 3; seed++)
            {
                var summary = await BatchRunner.PlayAsync(seed, st =>
                {
                    played.Add(st);
                    var bot = new ScriptLeader(st.Seed);
                    // Two kings that sleep after every call, scheduling marches, giving standing orders and cancelling them,
                    // among script kings; a short hidden cap wakes them often.
                    var nap = new Sleeper(v => new TurnSubmission
                    {
                        Standing = [Attacked("enkomi", new HoldOrder("enkomi")), Enters(null, "cilicia", new MoveOrder("enkomi", "cilicia"))],
                        CancelStanding = v.Turn % 3 == 0 ? ["all"] : ["s1"],
                    });
                    var babylon = new Sleeper(v => new TurnSubmission
                    {
                        Scheduled =
                        [
                            new ScheduledOrders { Turn = v.Turn + 1, Orders = [new HoldOrder("babylon")] },
                            new ScheduledOrders { Turn = v.Turn + 2, Orders = [new MoveOrder("sippar", "mari"), new SupportOrder("durkurigalzu", "sippar", "mari")] },
                            new ScheduledOrders { Turn = v.Turn + 3, Orders = [new MoveOrder("sippar", "damascus"), new MoveOrder("babylon", "sippar")] },
                        ],
                        Standing = [Attacked("babylon", new MoveOrder("babylon", "nippur")), Enters(Power.Assyria, "ekallatum", new SupportOrder("sippar", "durkurigalzu"))],
                        CancelStanding = v.Turn % 2 == 0 ? ["all"] : [],
                    });
                    var seats = Powers.All.ToDictionary(p => p, p => p switch { Power.Alashiya => nap, Power.Babylonia => babylon, _ => (ISeat)bot });
                    return new GameRunner(st, seats, new ScriptMind(), new TemplateNarrator()) { WriteChronicles = false };
                }, verifyReplay: true, config: new GameConfig { SleepingSeats = sleeping, MaxSleep = 2, MaxTurns = 18 });
                Assert.True(summary.ReplayMatches, $"seed {seed}, sleep {(sleeping ? "on" : "off")}");
            }
        }
        // With sleeping seats on, the games put marches and standing orders to work: they were not replayed idle.
        var titles = played.SelectMany(s => s.Inbox.Values.SelectMany(x => x)).Select(i => i.Title).ToHashSet();
        Assert.Contains(TurnEngine.MarchHeldUpTitle, titles);
        Assert.Contains(titles, t => t.StartsWith("Standing order s", StringComparison.Ordinal) && t.EndsWith(" fired", StringComparison.Ordinal));
    }

    // ------------------------------------------------------------ orders that follow their unit, and marches

    /// <summary>Orders for later seasons, each season's in one entry.</summary>
    private static TurnSubmission Plan(params (int Turn, Order[] Orders)[] seasons) =>
        new() { Scheduled = seasons.Select(x => new ScheduledOrders { Turn = x.Turn, Orders = x.Orders.ToList() }).ToList() };

    private static StandingRequest Enters(Power? power, string province, params Order[] orders) =>
        new() { When = StandingWhen.UnitEnters, Power = power, Province = province, Orders = orders.ToList() };

    private static StandingRequest Attacked(string province, params Order[] orders) =>
        new() { When = StandingWhen.UnitAttacked, Province = province, Orders = orders.ToList() };

    /// <summary>The notice with this title, delivered in the given season.</summary>
    private static InboxItem Notice(GameState s, Power p, string title) => Assert.Single(s.InboxOf(p), i => i.Title == title);

    [Fact]
    public async Task A_scheduled_order_follows_its_unit_and_runs_from_where_it_then_stands()
    {
        // Each army is named by where it stands in turn 1. The one in Babylon marches to Nippur and then to Ur, while the one
        // in Sippar takes its place in Babylon: "babylon -> ur" for turn 3 is the first army's order, wherever it is by then.
        var sleeper = new Sleeper(v => v.Turn == 1
            ? Plan((2, [new MoveOrder("babylon", "nippur"), new MoveOrder("sippar", "babylon")]), (3, [new MoveOrder("babylon", "ur")]))
            : Nothing());
        var r = await Play(Power.Babylonia, sleeper, 2);
        var marcher = r.State.UnitAt("nippur")!;
        // The seat's view names the order's unit by where it stands now.
        Assert.Contains("- turn 3: the army now in nippur -> ur", Prompts.Situation(Views.For(r.State, Power.Babylonia)));
        Assert.Equal(new MoveOrder("nippur", "ur"), Views.For(r.State, Power.Babylonia).Scheduled.Single().Orders.Single());

        await r.PlayTurnAsync();
        Assert.Equal([1], sleeper.Calls);
        Assert.Equal("ur", marcher.Province);
        // The army that came from Sippar was given no order for turn 3, and held in Babylon.
        Assert.Equal(Power.Babylonia, r.State.UnitAt("babylon")?.Power);
        Assert.Null(r.State.UnitAt("sippar"));
        Assert.DoesNotContain(r.State.InboxOf(Power.Babylonia), i => i.Kind == InboxKind.Rejected);
    }

    [Fact]
    public void An_order_naming_a_province_where_the_seat_has_no_unit_is_refused_when_given_and_wakes_it()
    {
        var s = GameFactory.NewGame(31, new GameConfig { CatastropheChance = 0 });
        var sleep = s.Sleep[Power.Babylonia] = new SleepState();
        var e = new TurnEngine(s);
        e.BeginTurn();
        e.Resolve(new Dictionary<Power, TurnSubmission>
        {
            [Power.Babylonia] = Plan((3, [new MoveOrder("nippur", "ur"), new MoveOrder("ekallatum", "ashur"), new RaiseOrder("nippur", UnitKind.Army)])),
        });
        // The levy names no unit and is kept; each move is refused, and the seat reads why next season.
        Assert.Equal(new RaiseOrder("nippur", UnitKind.Army), Assert.Single(sleep.Scheduled).Order);
        var notice = Notice(s, Power.Babylonia, "Scheduled orders not kept");
        Assert.Equal((2, "- turn 3: nippur -> ur: you have no unit in nippur\n- turn 3: ekallatum -> ashur: the unit in ekallatum is not yours"), (notice.Turn, notice.Body));
        new TurnEngine(s).WakeCheck();
        Assert.False(sleep.Asleep);
        Assert.Equal(["orders you scheduled were refused: turn 3: nippur -> ur: you have no unit in nippur; turn 3: ekallatum -> ashur: the unit in ekallatum is not yours"], sleep.WokenBecause);
    }

    [Fact]
    public void A_refusal_says_nothing_of_troops_out_of_sight()
    {
        // Babylon sees Ekallatum (an Assyrian army) and Nippur (empty), not Ashur (an Assyrian army) or Arbela (empty).
        var s = GameFactory.NewGame(31, new GameConfig { CatastropheChance = 0 });
        var sleep = s.Sleep[Power.Babylonia] = new SleepState();
        var sight = Views.Sight(s, WorldMap.Default, Power.Babylonia);
        Assert.Equal((true, true, false, false), (sight.Contains("ekallatum"), sight.Contains("nippur"), sight.Contains("ashur"), sight.Contains("arbela")));
        Assert.Equal((Power.Assyria, (Power?)null, Power.Assyria, (Power?)null), (s.UnitAt("ekallatum")!.Power, s.UnitAt("nippur")?.Power, s.UnitAt("ashur")!.Power, s.UnitAt("arbela")?.Power));
        Order[] probes = [new HoldOrder("ashur"), new HoldOrder("arbela"), new HoldOrder("ekallatum"), new HoldOrder("nippur")];
        const string refusals = "ashur holds: you have no unit in ashur|arbela holds: you have no unit in arbela|ekallatum holds: the unit in ekallatum is not yours|nippur holds: you have no unit in nippur";

        // Given now, and scheduled, the unit out of sight and the empty province out of sight are refused in the same words.
        var now = new OrderValidator(s).Validate(Power.Babylonia, new TurnSubmission { Orders = probes.ToList() });
        Assert.Equal(refusals, string.Join("|", now.Rejected.Select(r => $"{r.Order.Describe()}: {r.Reason}")));
        var e = new TurnEngine(s);
        e.BeginTurn();
        e.Resolve(new Dictionary<Power, TurnSubmission> { [Power.Babylonia] = Plan((3, probes)) });
        Assert.Equal(refusals.Replace("|", "\n- turn 3: ").Insert(0, "- turn 3: "), Notice(s, Power.Babylonia, "Scheduled orders not kept").Body);
        Assert.Empty(sleep.Scheduled);

        // A support of a move from a province out of sight is given whatever stands there, and is void if no unit there makes
        // that move; one naming an empty province in sight is refused.
        var supports = new OrderValidator(s).Validate(Power.Babylonia, new TurnSubmission
        {
            Orders = [new SupportOrder("sippar", "arbela", "ekallatum"), new SupportOrder("durkurigalzu", "ashur", "ekallatum"), new SupportOrder("babylon", "nippur")],
        });
        Assert.Equal([new SupportOrder("sippar", "arbela", "ekallatum"), new SupportOrder("durkurigalzu", "ashur", "ekallatum")], supports.Accepted);
        Assert.Equal("there is no unit in nippur to support", Assert.Single(supports.Rejected).Reason);

        // So is a convoy: Egypt's fleet, out in the Levant sea, sees Byblos (empty) but not Amurru (empty too).
        s.UnitAt("delta")!.Province = "levantsea";
        var egypt = Views.Sight(s, WorldMap.Default, Power.Egypt);
        Assert.Equal((true, false), (egypt.Contains("byblos"), egypt.Contains("amurru")));
        string? Convoy(string army) =>
            new OrderValidator(s).Validate(Power.Egypt, new TurnSubmission { Orders = [new ConvoyOrder("levantsea", army, "tyre")] }).Rejected.SingleOrDefault()?.Reason;
        Assert.Null(Convoy("amurru"));
        Assert.Equal("there is no army in byblos", Convoy("byblos"));
    }

    /// <summary>Babylon's army in Durkurigalzu is gone, so that an Assyrian army from Ekallatum can contest the province.</summary>
    private static void EmptyDurkurigalzu(GameState s) => s.Units.RemoveAll(u => u.Province == "durkurigalzu");

    [Fact]
    public async Task A_scheduled_support_of_one_s_own_unit_follows_the_unit_supported()
    {
        // The army in Babylon marches to Durkurigalzu in turn 2; in turn 3 the army in Sippar is to support it holding, named
        // by where it stood when the orders were given. The support follows it to Durkurigalzu.
        var sleeper = new Sleeper(v => v.Turn == 1
            ? Plan((2, [new MoveOrder("babylon", "durkurigalzu")]), (3, [new SupportOrder("sippar", "babylon")]))
            : Nothing());
        var r = await Play(Power.Babylonia, sleeper, 2, setup: EmptyDurkurigalzu);
        Assert.Contains("- turn 3: the army now in sippar supports the army now in durkurigalzu holding", Prompts.Situation(Views.For(r.State, Power.Babylonia)));
        Assert.Equal(new SupportOrder("sippar", "durkurigalzu"), Views.For(r.State, Power.Babylonia).Scheduled.Single().Orders.Single());

        await r.PlayTurnAsync();
        Assert.Equal([1], sleeper.Calls);
        Assert.Contains("supports durkurigalzu holding: given", r.State.InboxOf(Power.Babylonia).Single(i => i.Title == "Movements last season" && i.Turn == 4).Body);
        Assert.DoesNotContain(r.State.InboxOf(Power.Babylonia), i => i.Kind == InboxKind.Rejected);
        Assert.Empty(r.State.Sleep[Power.Babylonia].PendingWake);
    }

    [Fact]
    public void A_kept_order_is_given_from_where_its_units_stand_now()
    {
        // Egypt's fleet convoys its own army, and an army supports another: each order follows both its units.
        var s = GameFactory.NewGame(31, new GameConfig { CatastropheChance = 0 });
        var fleet = s.UnitAt("delta")!;
        var army = s.UnitAt("memphis")!;
        var helper = s.UnitAt("akhetaten")!;
        var convoy = new PlannedOrder { Order = new ConvoyOrder("delta", "memphis", "gaza"), UnitId = fleet.Id, OtherUnitId = army.Id };
        var support = new PlannedOrder { Order = new SupportOrder("akhetaten", "memphis", "sinai"), UnitId = helper.Id, OtherUnitId = army.Id };
        (fleet.Province, army.Province, helper.Province) = ("levantsea", "tyre", "memphis");
        Assert.Equal(new ConvoyOrder("levantsea", "tyre", "gaza"), TurnEngine.AsItStands(s, Power.Egypt, convoy));
        Assert.Equal(new SupportOrder("memphis", "tyre", "sinai"), TurnEngine.AsItStands(s, Power.Egypt, support));
        // Given away, the army supported takes the order with it.
        army.Power = Power.Hatti;
        Assert.Null(TurnEngine.AsItStands(s, Power.Egypt, support));
    }

    [Fact]
    public async Task A_march_that_is_stopped_tries_the_step_again_and_its_later_orders_wait_a_season()
    {
        // Babylon's army is to march to Durkurigalzu in turn 2 and on to Nippur in turn 3. Assyria moves into Durkurigalzu in
        // turn 2 too, and both bounce. The army tries again in turn 3 and gets there; its next step runs in turn 4.
        var sleeper = new Sleeper(v => v.Turn == 1
            ? Plan((2, [new MoveOrder("babylon", "durkurigalzu")]), (3, [new MoveOrder("babylon", "nippur")]))
            : Nothing());
        var assyria = new Scripted(v => v.Turn == 2 ? new TurnSubmission { Orders = [new MoveOrder("ekallatum", "durkurigalzu")] } : new TurnSubmission());
        var r = await Play(Power.Babylonia, sleeper, 4, others: new() { [Power.Assyria] = assyria }, setup: EmptyDurkurigalzu);

        // The stopped move wakes the seat, which sees the shifted plan and lets it stand.
        Assert.Equal([1, 3], sleeper.Calls);
        Assert.StartsWith("orders you scheduled could not be carried out: babylon -> durkurigalzu (it met a move into durkurigalzu from ekallatum", Assert.Single(sleeper.Views[1].WokenBecause));
        var notice = Notice(r.State, Power.Babylonia, TurnEngine.MarchHeldUpTitle);
        Assert.Equal((InboxKind.Rejected, 3), (notice.Kind, notice.Turn));
        Assert.Equal("Your army in babylon did not reach durkurigalzu in turn 2. It will try again in turn 3, and each of its later scheduled orders waits a season (they now run in turn 4).", notice.Body);
        var text = Prompts.Situation(sleeper.Views[1]);
        Assert.Contains("- turn 3: the army now in babylon -> durkurigalzu\n- turn 4: the army now in babylon -> nippur", text.ReplaceLineEndings("\n"));

        Assert.Equal(Power.Babylonia, r.State.UnitAt("nippur")?.Power);
        Assert.Null(r.State.UnitAt("babylon"));
        Assert.Null(r.State.UnitAt("durkurigalzu"));
        Assert.Empty(r.State.Sleep[Power.Babylonia].Scheduled);
    }

    [Fact]
    public async Task A_march_stopped_twice_in_a_row_ends_and_the_unit_s_remaining_orders_are_dropped()
    {
        var sleeper = new Sleeper(v => v.Turn == 1
            ? Plan((2, [new MoveOrder("babylon", "durkurigalzu")]), (3, [new MoveOrder("babylon", "nippur")]), (5, [new HoldOrder("babylon")]))
            : Nothing());
        var assyria = new Scripted(v => v.Turn is 2 or 3 ? new TurnSubmission { Orders = [new MoveOrder("ekallatum", "durkurigalzu")] } : new TurnSubmission());
        var r = await Play(Power.Babylonia, sleeper, 4, others: new() { [Power.Assyria] = assyria }, setup: EmptyDurkurigalzu);

        Assert.Equal([1, 3, 4], sleeper.Calls);
        Assert.StartsWith("orders you scheduled could not be carried out: babylon -> durkurigalzu", Assert.Single(sleeper.Views[2].WokenBecause));
        var notice = Notice(r.State, Power.Babylonia, TurnEngine.MarchEndsTitle);
        Assert.Equal(4, notice.Turn);
        Assert.Equal("Your army in babylon failed to reach durkurigalzu a second time in turn 3: its march ends, and its remaining scheduled orders were dropped: turn 4: babylon -> nippur; turn 6: babylon holds.", notice.Body);
        Assert.Equal(Power.Babylonia, r.State.UnitAt("babylon")?.Power);
        Assert.Null(r.State.UnitAt("nippur"));
        Assert.Empty(r.State.Sleep[Power.Babylonia].Scheduled);
    }

    [Fact]
    public async Task A_scheduled_move_that_is_refused_is_not_tried_again_and_ends_the_march()
    {
        var sleeper = new Sleeper(v => v.Turn == 1
            ? Plan((2, [new MoveOrder("babylon", "ur"), new MoveOrder("sippar", "mari")]), (3, [new MoveOrder("babylon", "nippur")]))
            : Nothing());
        var r = await Play(Power.Babylonia, sleeper, 3);
        Assert.Equal([1, 3], sleeper.Calls);
        Assert.Contains("orders you scheduled could not be carried out: babylon -> ur (an army in babylon cannot reach ur)", sleeper.Views[1].WokenBecause);
        var notice = r.State.InboxOf(Power.Babylonia).Single(i => i.Title == TurnEngine.MarchEndsTitle && i.Turn == 3);
        Assert.Equal("Your army in babylon could not be ordered to ur in turn 2 (an army in babylon cannot reach ur): its march ends, and its remaining scheduled orders were dropped: turn 3: babylon -> nippur.", notice.Body);
        // The move to Mari, stopped by its walls, is another unit's march: it is tried again in turn 3, and stopped again.
        Assert.Contains("- turn 3: the army now in sippar -> mari", Prompts.Situation(sleeper.Views[1]));
        Assert.Equal("Your army in sippar failed to reach mari a second time in turn 3: its march ends.",
            r.State.InboxOf(Power.Babylonia).Single(i => i.Title == TurnEngine.MarchEndsTitle && i.Turn == 4).Body);
        Assert.Equal(Power.Babylonia, r.State.UnitAt("babylon")?.Power);
        Assert.Null(r.State.UnitAt("nippur"));
    }

    [Fact]
    public async Task A_refused_last_step_ends_nothing_more_and_is_told_once()
    {
        // With nothing scheduled after it, a refused move has no march to end: the refusal alone is told, and wakes the seat.
        var sleeper = new Sleeper(v => v.Turn == 1 ? Plan((2, [new MoveOrder("babylon", "ur")])) : Nothing());
        var r = await Play(Power.Babylonia, sleeper, 3);
        Assert.Equal([1, 3], sleeper.Calls);
        Assert.Equal(["orders you scheduled could not be carried out: babylon -> ur (an army in babylon cannot reach ur)"], sleeper.Views[1].WokenBecause);
        Assert.DoesNotContain(r.State.InboxOf(Power.Babylonia), i => i.Title == TurnEngine.MarchEndsTitle);
        Assert.Contains("- babylon -> ur: an army in babylon cannot reach ur", Notice(r.State, Power.Babylonia, "Orders that could not be carried out").Body);
    }

    [Fact]
    public void A_scheduled_order_that_cannot_be_read_is_refused_when_given_and_wakes_the_seat()
    {
        var s = GameFactory.NewGame(31, new GameConfig { CatastropheChance = 0 });
        var sleep = s.Sleep[Power.Babylonia] = new SleepState();
        var e = new TurnEngine(s);
        e.BeginTurn();
        e.Resolve(new Dictionary<Power, TurnSubmission>
        {
            [Power.Babylonia] = Plan((3, [new UnreadableOrder("babylon move", "name the province the unit should move to"), new HoldOrder("babylon")])),
        });
        Assert.Equal(new HoldOrder("babylon"), Assert.Single(sleep.Scheduled).Order);
        Assert.Equal("- turn 3: babylon move: name the province the unit should move to", Notice(s, Power.Babylonia, "Scheduled orders not kept").Body);
        new TurnEngine(s).WakeCheck();
        Assert.Equal(["orders you scheduled were refused: turn 3: babylon move: name the province the unit should move to"], sleep.WokenBecause);
    }

    [Fact]
    public async Task Orders_for_a_unit_that_is_lost_are_dropped_and_wake_the_seat()
    {
        // The army in Durkurigalzu is disbanded in turn 2, by an order scheduled with a later one for it, and one for another unit.
        var sleeper = new Sleeper(v => v.Turn == 1
            ? new TurnSubmission
            {
                Scheduled =
                [
                    new ScheduledOrders { Turn = 2, Orders = [new DisbandOrder("durkurigalzu")] },
                    new ScheduledOrders { Turn = 4, Orders = [new MoveOrder("durkurigalzu", "nippur"), new SupportOrder("sippar", "durkurigalzu"), new HoldOrder("babylon")] },
                ],
                Standing =
                [
                    Attacked("durkurigalzu", new HoldOrder("babylon")),
                    Enters(null, "susa", new MoveOrder("durkurigalzu", "susa"), new HoldOrder("babylon")),
                    // Every order of this one is for the lost unit: it goes whole.
                    Enters(null, "mari", new HoldOrder("durkurigalzu")),
                ],
            }
            : Nothing());
        var r = await Play(Power.Babylonia, sleeper, 3);
        Assert.Equal([1, 3], sleeper.Calls);
        var notice = Notice(r.State, Power.Babylonia, TurnEngine.LostTroopsTitle);
        Assert.Equal(3, notice.Turn);
        Assert.EndsWith(":\n- turn 4: durkurigalzu -> nippur\n- turn 4: sippar supports durkurigalzu holding\n- standing order s1 (when your unit that stood in durkurigalzu is attacked)"
                        + "\n- from standing order s2: durkurigalzu -> susa\n- standing order s3 (when foreign troops enter mari)", notice.Body);
        // The reason names the first three, and leaves the rest to the notice; it speaks of standing orders as of scheduled ones.
        Assert.Equal("orders you gave for later could not be carried out: the troops they were for are lost (turn 4: durkurigalzu -> nippur; turn 4: sippar supports durkurigalzu holding; "
                     + "standing order s1 (when your unit that stood in durkurigalzu is attacked); and 2 more, listed in the notice \"Orders for lost troops dropped\")",
            Assert.Single(sleeper.Views[1].WokenBecause));
        // What does not depend on the lost unit stands.
        var sleep = r.State.Sleep[Power.Babylonia];
        Assert.Equal(new HoldOrder("babylon"), Assert.Single(sleep.Scheduled).Order);
        Assert.Equal(new HoldOrder("babylon"), Assert.Single(Assert.Single(sleep.Standing).Orders).Order);
    }

    // ------------------------------------------------------------ standing orders (answering a move in the season it is made, since the fix pass after item 4)

    /// <summary>An Assyrian army in Susa, which Babylon can see from its homeland; the city is Assyria's, its walls gone.</summary>
    private static void AssyriaInSusa(GameState s)
    {
        s.Garrisons.Remove("susa");
        s.Owner["susa"] = Power.Assyria;
        s.Units.Add(new Unit { Id = s.NewId("u"), Power = Power.Assyria, Kind = UnitKind.Army, Province = "susa" });
    }

    [Fact]
    public async Task A_standing_order_answers_a_move_in_the_season_it_is_made_once_and_does_not_wake_the_seat()
    {
        // When Assyria's troops enter Arbela, the army in Babylon falls back to Nippur. Turn 1: Assyria's army leaves
        // Ekallatum, which Babylon can see, for Arbela; a standing order first fires the season after it is given, so not yet.
        // Turn 2: the army in Susa sets out for Arbela and is stopped there, and the standing order answers it that season.
        // Turn 3: it sets out again; the standing order is spent.
        var sleeper = new Sleeper(v => v.Turn == 1 ? new TurnSubmission { Standing = [Enters(Power.Assyria, "arbela", new MoveOrder("babylon", "nippur"))] } : Nothing());
        var assyria = new Scripted(v => v.Turn switch
        {
            1 => new TurnSubmission { Orders = [new MoveOrder("ekallatum", "arbela")] },
            2 or 3 => new TurnSubmission { Orders = [new MoveOrder("susa", "arbela")] },
            _ => new TurnSubmission(),
        });
        var r = await Play(Power.Babylonia, sleeper, 1, others: new() { [Power.Assyria] = assyria }, setup: AssyriaInSusa);
        var sleep = r.State.Sleep[Power.Babylonia];
        Assert.Equal(Power.Babylonia, r.State.UnitAt("babylon")?.Power);
        // Its view lists it with its id; nothing tells a king in advance whether it will fire.
        var line = Prompts.Situation(Views.For(r.State, Power.Babylonia)).ReplaceLineEndings("\n").Split('\n').Single(l => l.StartsWith("- s1:", StringComparison.Ordinal));
        Assert.Equal("- s1: when Assyria's troops enter arbela, then: the army now in babylon -> nippur", line);

        await r.PlayTurnAsync();
        Assert.Equal(Power.Babylonia, r.State.UnitAt("nippur")?.Power);
        Assert.Equal(Power.Assyria, r.State.UnitAt("susa")?.Power);
        Assert.Empty(sleep.Standing);
        await r.PlayTurnAsync();
        Assert.Equal([1], sleeper.Calls);
        var notice = Notice(r.State, Power.Babylonia, TurnEngine.StandingFiredTitle("s1"));
        Assert.Equal((InboxKind.Resolution, 3), (notice.Kind, notice.Turn));
        Assert.Equal("Your standing order s1 (when Assyria's troops enter arbela) fired in turn 2: Assyria's army set out from susa for arbela. It gave these orders: babylon -> nippur.", notice.Body);
        // In brief, the firing is dated by the season it fired, as the movements are by the season they were made.
        Assert.Contains("turn 2: your standing order s1 fired", sleep.Digest);
        Assert.Empty(sleep.PendingWake);
    }

    [Fact]
    public async Task A_standing_order_for_a_unit_attacked_meets_the_blow_in_the_same_season()
    {
        // Assyria attacks the army in Sippar from Ekallatum, supported from Mari (its walls gone, for the test): two against one.
        // When the army in Sippar is attacked, the army in Dur-Kurigalzu supports it holding, in place of the hold it was
        // scheduled to give: two against two, and Sippar holds. Before the fix pass the standing order fired the season after
        // the attack, when the army was already lost.
        void Setup(GameState s)
        {
            s.Garrisons.Remove("mari");
            s.Owner["mari"] = Power.Assyria;
            s.Units.Add(new Unit { Id = s.NewId("u"), Power = Power.Assyria, Kind = UnitKind.Army, Province = "mari" });
        }
        Scripted Assyria() => new(v => v.Turn == 2
            ? new TurnSubmission { Orders = [new MoveOrder("ekallatum", "sippar"), new SupportOrder("mari", "ekallatum", "sippar")] }
            : new TurnSubmission());

        var sleeper = new Sleeper(v => v.Turn == 1
            ? new TurnSubmission
            {
                Scheduled = [new ScheduledOrders { Turn = 2, Orders = [new HoldOrder("durkurigalzu")] }],
                Standing = [Attacked("sippar", new SupportOrder("durkurigalzu", "sippar"))],
            }
            : Nothing());
        var r = await Play(Power.Babylonia, sleeper, 2, others: new() { [Power.Assyria] = Assyria() }, setup: Setup);
        Assert.Equal(Power.Babylonia, r.State.UnitAt("sippar")?.Power);
        Assert.Empty(r.State.Sleep[Power.Babylonia].Standing);
        Assert.Equal("Your standing order s1 (when your army in sippar is attacked) fired in turn 2: Assyria's army set out from ekallatum for sippar. It gave these orders: durkurigalzu supports sippar holding.",
            Notice(r.State, Power.Babylonia, TurnEngine.StandingFiredTitle("s1")).Body);
        // The scheduled hold was replaced, not refused as a second order for the unit, and the attack that did not get in
        // waits in the digest: nothing wakes the seat.
        Assert.DoesNotContain(r.State.InboxOf(Power.Babylonia), i => i.Kind == InboxKind.Rejected);
        await r.PlayTurnAsync();
        Assert.Equal([1], sleeper.Calls);

        // Without it, the army in Sippar is lost.
        var alone = new Sleeper(v => v.Turn == 1 ? new TurnSubmission { Scheduled = [new ScheduledOrders { Turn = 2, Orders = [new HoldOrder("durkurigalzu")] }] } : Nothing());
        r = await Play(Power.Babylonia, alone, 2, others: new() { [Power.Assyria] = Assyria() }, setup: Setup);
        Assert.Equal(Power.Assyria, r.State.UnitAt("sippar")?.Power);
    }

    [Fact]
    public async Task A_unit_attacked_as_it_marches_away_can_be_told_to_stand()
    {
        // The army in Sippar is to march to Dur-Kurigalzu in turn 2; if it is attacked, it is to stand instead. Assyria moves
        // on Sippar that season: the standing order replaces the scheduled move, and the attack fails against the army.
        var sleeper = new Sleeper(v => v.Turn == 1
            ? new TurnSubmission
            {
                Scheduled = [new ScheduledOrders { Turn = 2, Orders = [new MoveOrder("sippar", "durkurigalzu")] }],
                Standing = [Attacked("sippar", new HoldOrder("sippar"))],
            }
            : Nothing());
        var assyria = new Scripted(v => v.Turn == 2 ? new TurnSubmission { Orders = [new MoveOrder("ekallatum", "sippar")] } : new TurnSubmission());
        var r = await Play(Power.Babylonia, sleeper, 2, others: new() { [Power.Assyria] = assyria }, setup: EmptyDurkurigalzu);
        Assert.Equal(Power.Babylonia, r.State.UnitAt("sippar")?.Power);
        Assert.Null(r.State.UnitAt("durkurigalzu"));
        Assert.Equal(Power.Assyria, r.State.UnitAt("ekallatum")?.Power);
        Assert.EndsWith("It gave these orders: sippar holds.", Notice(r.State, Power.Babylonia, TurnEngine.StandingFiredTitle("s1")).Body);
        // The march gave way to the standing order: it is not held up, and nothing failed.
        Assert.DoesNotContain(r.State.InboxOf(Power.Babylonia), i => i.Kind == InboxKind.Rejected);
        Assert.Empty(r.State.Sleep[Power.Babylonia].Scheduled);
    }

    [Fact]
    public async Task Orders_given_in_the_season_a_standing_order_fires_replace_its_orders()
    {
        // Woken every season (a hidden cap of 0, for the test), the seat orders the army in Babylon to hold in turn 2, the
        // season Assyria attacks Sippar and its standing order fires.
        var sleeper = new Sleeper(v => v.Turn switch
        {
            1 => new TurnSubmission { Standing = [Attacked("sippar", new MoveOrder("babylon", "nippur"), new HoldOrder("durkurigalzu"))] },
            2 => new TurnSubmission { Orders = [new HoldOrder("babylon")] },
            _ => Nothing(),
        });
        var assyria = new Scripted(v => v.Turn == 2 ? new TurnSubmission { Orders = [new MoveOrder("ekallatum", "sippar")] } : new TurnSubmission());
        var r = await Play(Power.Babylonia, sleeper, 2, Cap(0), others: new() { [Power.Assyria] = assyria });

        Assert.Equal([1, 2], sleeper.Calls);
        // It could not know in advance that the standing order would fire.
        Assert.DoesNotContain("fires this season", Prompts.Situation(sleeper.Views[1]));
        Assert.Equal(Power.Babylonia, r.State.UnitAt("babylon")?.Power);
        Assert.Null(r.State.UnitAt("nippur"));
        Assert.Empty(r.State.Sleep[Power.Babylonia].Standing);
        Assert.Equal("Your standing order s1 (when your army in sippar is attacked) fired in turn 2: Assyria's army set out from ekallatum for sippar. It gave these orders: durkurigalzu holds. Replaced by the orders you gave for turn 2: babylon -> nippur.",
            Notice(r.State, Power.Babylonia, TurnEngine.StandingFiredTitle("s1")).Body);
    }

    /// <summary>A standing order of Babylon's waiting for Assyria to enter Arbela, bound to its units.</summary>
    private static StandingOrder Waiting(GameState s, string id, params Order[] orders) => new()
    {
        Id = id, When = StandingWhen.UnitEnters, Power = Power.Assyria, Province = "arbela",
        Orders = orders.Select(o => new PlannedOrder { Order = o, UnitId = OrderKeys.UnitOf(o) is { } at ? s.UnitAt(at)!.Id : null }).ToList(),
    };

    /// <summary>Assyria's army leaves Ekallatum, which Babylon can see, for Arbela.</summary>
    private static Dictionary<Power, TurnSubmission> AssyriaToArbela(TurnSubmission? babylon = null)
    {
        var orders = new Dictionary<Power, TurnSubmission> { [Power.Assyria] = new() { Orders = [new MoveOrder("ekallatum", "arbela")] } };
        if (babylon is not null) orders[Power.Babylonia] = babylon;
        return orders;
    }

    [Fact]
    public void Standing_orders_that_fire_together_go_by_id_and_the_notice_says_what_became_of_each_order()
    {
        // Asleep in turn 3, three standing orders fire as Assyria enters Arbela. s1 and s2 both order the army in Babylon: s1,
        // the lower id, goes first (wherever it stands in the list). One of s3's is refused.
        var (s, sleep) = Asleep(Power.Babylonia);
        sleep.Standing =
        [
            Waiting(s, "s2", new HoldOrder("babylon"), new HoldOrder("durkurigalzu")),
            Waiting(s, "s1", new MoveOrder("babylon", "nippur")),
            Waiting(s, "s3", new MoveOrder("sippar", "ur")),
        ];
        sleep.LastStanding = 3;
        var e = new TurnEngine(s);
        e.BeginTurn();
        e.Resolve(AssyriaToArbela());

        Assert.Equal(Power.Babylonia, s.UnitAt("nippur")?.Power);
        Assert.Empty(sleep.Standing);
        const string fired = "fired in turn 3: Assyria's army set out from ekallatum for arbela.";
        Assert.Equal($"Your standing order s1 (when Assyria's troops enter arbela) {fired} It gave these orders: babylon -> nippur.",
            Notice(s, Power.Babylonia, TurnEngine.StandingFiredTitle("s1")).Body);
        Assert.Equal($"Your standing order s2 (when Assyria's troops enter arbela) {fired} It gave these orders: durkurigalzu holds. Replaced by standing order s1, which fired in the same season: babylon holds.",
            Notice(s, Power.Babylonia, TurnEngine.StandingFiredTitle("s2")).Body);
        Assert.Equal($"Your standing order s3 (when Assyria's troops enter arbela) {fired} Refused: sippar -> ur (an army in sippar cannot reach ur).",
            Notice(s, Power.Babylonia, TurnEngine.StandingFiredTitle("s3")).Body);
        // Only the refused order fails; the one replaced by s1 is no second order for the unit.
        Assert.Equal("- sippar -> ur: an army in sippar cannot reach ur", Notice(s, Power.Babylonia, "Orders that could not be carried out").Body);
        Assert.Equal(["a standing order of yours could not be carried out: s3: sippar -> ur (an army in sippar cannot reach ur)"], sleep.PendingWake);
    }

    [Fact]
    public async Task A_fired_order_that_is_stopped_wakes_the_seat_and_is_not_tried_again()
    {
        // When Assyria's troops enter Dur-Kurigalzu, the army in Babylon is to take it too. Assyria moves in from Ekallatum in
        // turn 2: the two meet, and both are stopped.
        var sleeper = new Sleeper(v => v.Turn == 1 ? new TurnSubmission { Standing = [Enters(Power.Assyria, "durkurigalzu", new MoveOrder("babylon", "durkurigalzu"))] } : Nothing());
        var assyria = new Scripted(v => v.Turn == 2 ? new TurnSubmission { Orders = [new MoveOrder("ekallatum", "durkurigalzu")] } : new TurnSubmission());
        var r = await Play(Power.Babylonia, sleeper, 3, others: new() { [Power.Assyria] = assyria }, setup: EmptyDurkurigalzu);

        // Firing did not wake it; the move that was stopped did.
        Assert.Equal([1, 3], sleeper.Calls);
        Assert.StartsWith("a standing order of yours could not be carried out: s1: babylon -> durkurigalzu (it met a move into durkurigalzu from ekallatum",
            Assert.Single(sleeper.Views[1].WokenBecause));
        // Only a scheduled move is a march: this one is not tried again.
        Assert.Equal(Power.Babylonia, r.State.UnitAt("babylon")?.Power);
        Assert.Null(r.State.UnitAt("durkurigalzu"));
        Assert.Empty(r.State.Sleep[Power.Babylonia].Scheduled);
        Assert.DoesNotContain(r.State.InboxOf(Power.Babylonia), i => i.Title == TurnEngine.MarchHeldUpTitle);
    }

    [Fact]
    public void A_standing_order_fires_only_on_the_move_it_names_as_the_seat_sees_it()
    {
        // Turn 1: Babylon gives its standing orders. Turn 2, as it sleeps: Assyria's army sets out for Arbela; Mitanni's sets
        // out for Mari and fails against its walls; Mitanni's army in Taidu sets out for Nineveh, out of Babylon's sight;
        // Babylon's own army marches to Nippur, and another sets out against its own army in Sippar.
        var s = GameFactory.NewGame(31, new GameConfig { CatastropheChance = 0 });
        var sleep = s.Sleep[Power.Babylonia] = new SleepState();
        var e = new TurnEngine(s);
        e.BeginTurn();
        e.Resolve(new Dictionary<Power, TurnSubmission>
        {
            [Power.Babylonia] = new()
            {
                Scheduled = [new ScheduledOrders { Turn = 2, Orders = [new MoveOrder("babylon", "nippur"), new MoveOrder("durkurigalzu", "sippar")] }],
                Standing =
                [
                    Enters(Power.Hatti, "arbela", new HoldOrder("sippar")),   // s1: another power entered
                    Enters(Power.Assyria, "arbela", new HoldOrder("sippar")), // s2: fires
                    Enters(null, "arbela", new HoldOrder("sippar")),          // s3: fires
                    Enters(null, "nippur", new HoldOrder("sippar")),          // s4: only its own troops entered
                    Enters(null, "mari", new HoldOrder("sippar")),            // s5: fires, though the move into Mari failed
                    Attacked("sippar", new HoldOrder("sippar")),              // s6: only its own army moved against Sippar
                    Enters(null, "nineveh", new HoldOrder("sippar")),         // s7: a move it cannot see
                ],
            },
        });
        Assert.True(sleep.Asleep);
        e = new TurnEngine(s);
        e.BeginTurn();
        e.WakeCheck();
        e.Resolve(new Dictionary<Power, TurnSubmission>
        {
            [Power.Assyria] = new() { Orders = [new MoveOrder("ekallatum", "arbela")] },
            [Power.Mitanni] = new() { Orders = [new MoveOrder("terqa", "mari"), new MoveOrder("taidu", "nineveh")] },
        });
        Assert.Equal(Power.Mitanni, s.UnitAt("terqa")?.Power);
        Assert.Equal(Power.Babylonia, s.UnitAt("nippur")?.Power);
        Assert.Equal(Power.Babylonia, s.UnitAt("durkurigalzu")?.Power);
        Assert.Equal(["s1", "s4", "s6", "s7"], sleep.Standing.Select(x => x.Id));
    }

    [Fact]
    public void When_the_script_king_stands_in_the_seat_s_own_plans_go_first()
    {
        // Woken in turn 3, the seat's call failed and the script king stands in, ordering every unit to hold and a levy. The
        // seat's standing order fires and its scheduled move runs all the same: the stand-in only fills what they leave free.
        var s = GameFactory.NewGame(31, new GameConfig { CatastropheChance = 0 });
        EmptyDurkurigalzu(s);
        s.Turn = 3;
        var marcher = s.UnitAt("sippar")!;
        var sleep = s.Sleep[Power.Babylonia] = new SleepState
        {
            LastCalled = 1,
            Standing = [Waiting(s, "s1", new MoveOrder("babylon", "nippur"))],
            LastStanding = 1,
            Scheduled = [new PlannedOrder { Turn = 3, Order = new MoveOrder("sippar", "durkurigalzu"), UnitId = marcher.Id }],
        };
        var e = new TurnEngine(s);
        e.BeginTurn();
        e.Resolve(AssyriaToArbela(new TurnSubmission { FromFallback = true, Orders = [new HoldOrder("babylon"), new HoldOrder("sippar"), new RaiseOrder("sippar", UnitKind.Army)] }));

        Assert.Equal(Power.Babylonia, s.UnitAt("nippur")?.Power);
        Assert.Equal(marcher.Id, s.UnitAt("durkurigalzu")?.Id);
        Assert.Equal(Power.Babylonia, s.UnitAt("sippar")?.Power);
        Assert.Empty(sleep.Standing);
        Assert.Equal("Your standing order s1 (when Assyria's troops enter arbela) fired in turn 3: Assyria's army set out from ekallatum for arbela. It gave these orders: babylon -> nippur.",
            Notice(s, Power.Babylonia, TurnEngine.StandingFiredTitle("s1")).Body);
        Assert.DoesNotContain(s.InboxOf(Power.Babylonia), i => i.Kind == InboxKind.Rejected);
        Assert.Empty(sleep.PendingWake);
        // The stand-in did not put the seat to sleep.
        Assert.False(sleep.Asleep);
        Assert.Equal(1, sleep.LastCalled);
    }

    [Fact]
    public async Task Standing_orders_are_cancelled_by_id_or_all_even_in_the_season_they_would_fire()
    {
        // Woken every season (a hidden cap of 0, for the test). In turn 2 Assyria enters Arbela, but s1 is cancelled that season.
        var sleeper = new Sleeper(v => v.Turn switch
        {
            1 => new TurnSubmission
            {
                Standing = [Enters(Power.Assyria, "arbela", new MoveOrder("babylon", "nippur")), Attacked("sippar", new MoveOrder("durkurigalzu", "nippur"))],
            },
            2 => new TurnSubmission { CancelStanding = ["s1", "s7"] },
            3 => new TurnSubmission { CancelStanding = ["all"] },
            _ => Nothing(),
        });
        var assyria = new Scripted(v => v.Turn == 2 ? new TurnSubmission { Orders = [new MoveOrder("ekallatum", "arbela")] } : new TurnSubmission());
        var r = await Play(Power.Babylonia, sleeper, 2, Cap(0), others: new() { [Power.Assyria] = assyria });
        var sleep = r.State.Sleep[Power.Babylonia];

        Assert.Contains("- s1: when Assyria's troops enter arbela, then: the army now in babylon -> nippur", Prompts.Situation(sleeper.Views.Last()));
        Assert.Null(r.State.UnitAt("nippur"));
        Assert.Equal("s2", Assert.Single(sleep.Standing).Id);
        Assert.Equal("- s7: you have no standing order s7", Notice(r.State, Power.Babylonia, "Standing orders not cancelled").Body);
        await r.PlayTurnAsync();
        Assert.Empty(sleep.Standing);
    }

    [Fact]
    public void The_rulebook_says_a_standing_order_answers_a_move_in_the_season_it_is_made()
    {
        // Four kings debriefed after the second agent simulation found no use for standing orders that ran the season after
        // their event ("it cannot help against a lethal attack, and it comes a season late", Hatti, seed 7).
        var rules = Prompts.LeaderRules(true, new GameConfig());
        Assert.Contains("Each waits for a move you can see (from or into a province in your sight) and answers it in the same season, as your commanders on the spot would, whether or not the move then succeeds", rules);
        Assert.Contains("It answers the moves as they were ordered, never the orders another standing order gives, and first fires in the season after you give it.", rules);
        Assert.Contains("This is what a standing order can do that waking cannot: woken, you would answer the blow only the season after it fell.", rules);
        Assert.DoesNotContain("your unit still standing there afterwards", rules);
        Assert.Contains("its orders run in that same season, once, before your scheduled orders, so they meet the move", Schemas.LeaderOrders(new GameConfig()).ToJsonString());
    }

    [Fact]
    public void At_most_12_standing_orders_are_kept_and_one_that_cannot_be_kept_is_refused_whole_and_wakes_the_seat()
    {
        var s = GameFactory.NewGame(31, new GameConfig { CatastropheChance = 0 });
        var sleep = s.Sleep[Power.Babylonia] = new SleepState();
        var e = new TurnEngine(s);
        e.BeginTurn();
        List<StandingRequest> requests =
        [
            Attacked("nippur", new HoldOrder("babylon")),
            Enters(null, "mari", new HoldOrder("babylon"), new MoveOrder("nippur", "ur")),
            Enters(Power.Assyria, "mari"),
            new() { When = StandingWhen.UnitEnters, Province = "mari", Orders = [new HoldOrder("babylon")], Unreadable = "there is no power called 'Kush'" },
            Enters(null, "ur", Enumerable.Range(0, 25).Select(_ => (Order)new HoldOrder("babylon")).ToArray()),
            .. Enumerable.Range(0, 13).Select(_ => Enters(null, "mari", new SupportOrder("sippar", "babylon"))),
        ];
        e.Resolve(new Dictionary<Power, TurnSubmission> { [Power.Babylonia] = new() { Standing = requests } });

        Assert.Equal(TurnEngine.MaxStanding, sleep.Standing.Count);
        Assert.Equal(Enumerable.Range(1, 12).Select(i => $"s{i}"), sleep.Standing.Select(x => x.Id));
        // Bound to the units it names: the supporting army and the army supported, both Babylon's.
        var first = sleep.Standing[0].Orders.Single();
        Assert.Equal((s.UnitAt("sippar")!.Id, s.UnitAt("babylon")!.Id), (first.UnitId!, first.OtherUnitId!));
        Assert.Equal(
            "- when your unit in nippur is attacked: you have no unit in nippur\n"
            + "- when foreign troops enter mari: nippur -> ur: you have no unit in nippur\n"
            + "- when Assyria's troops enter mari: it gives no orders\n"
            + "- when foreign troops enter mari: there is no power called 'Kush'\n"
            + "- when foreign troops enter ur: it gives 25 orders; a standing order may give at most 24\n"
            + "- when foreign troops enter mari: you may keep at most 12 standing orders",
            Notice(s, Power.Babylonia, "Standing orders not kept").Body);
        new TurnEngine(s).WakeCheck();
        Assert.False(sleep.Asleep);
        Assert.Equal("standing orders you gave were refused: when your unit in nippur is attacked: you have no unit in nippur; when foreign troops enter mari: nippur -> ur: you have no unit in nippur; "
                     + "when Assyria's troops enter mari: it gives no orders; and 3 more, listed in the notice \"Standing orders not kept\"", Assert.Single(sleep.WokenBecause));
    }

    // ------------------------------------------------------------ what a model king writes

    /// <summary>A model king that answers each orders call with the reply given for its season (holding otherwise).</summary>
    private sealed class Replying(Func<int, string?> orders) : IJsonAsker
    {
        public List<CallSpec> Specs { get; } = new();

        public Task<JsonObject> AskJsonAsync(CallSpec spec, CancellationToken ct)
        {
            lock (Specs) Specs.Add(spec);
            var json = spec.Key.Contains("/orders/")
                ? orders(spec.Turn) ?? """{"notes":"Hold fast.","units":[],"letters":[],"other_orders":[]}"""
                : """{"speech":"Welcome.","gift_to_envoy":0,"gift_request":"","offer_service_wage":0,"seal_tablet":false,"detain_envoy":false,"send_gold_back":0,"gold_back_purity":100,"end_audience":true}""";
            return Task.FromResult((JsonObject)JsonNode.Parse(json)!);
        }
    }

    /// <summary>A reply with a march, two standing orders (one for any foreign power, one for a power nobody knows) and cancellations.</summary>
    public const string PlanningReply = """
        {"notes":"Plan ahead.","units":[],"letters":[],"other_orders":[],
         "schedule":[{"turn":3,"units":[{"unit":"Babylon","order":"move","target":"nippur","to":""}],"other_orders":[]}],
         "standing_orders":[
           {"when":"unit_attacked","province":"Sippar","power":"","units":[{"unit":"durkurigalzu","order":"support","target":"sippar","to":""}],"other_orders":[{"action":"counter_intelligence","province":"","power":"","person":"","amount":20,"term":0,"text":"","item":"","seals":[]}]},
           {"when":"unit_enters","province":"mari","power":"","units":[{"unit":"sippar","order":"hold","target":"","to":""}],"other_orders":[]},
           {"when":"unit_enters","province":"mari","power":"Kush","units":[{"unit":"sippar","order":"hold","target":"","to":""}],"other_orders":[]}],
         "cancel_standing":["s9", "all"]}
        """;

    [Fact]
    public void A_model_king_s_standing_orders_and_cancellations_are_read_from_its_reply()
    {
        var sub = Parse.Orders((JsonObject)JsonNode.Parse(PlanningReply)!);
        Assert.Equal(new MoveOrder("babylon", "nippur"), Assert.Single(Assert.Single(sub.Scheduled).Orders));
        Assert.Equal(3, sub.Standing.Count);
        var attacked = sub.Standing[0];
        Assert.Equal((StandingWhen.UnitAttacked, "sippar", (Power?)null, (string?)null), (attacked.When, attacked.Province, attacked.Power, attacked.Unreadable));
        Assert.Equal([new SupportOrder("durkurigalzu", "sippar"), new CounterIntelOrder(20)], attacked.Orders);
        Assert.Equal((StandingWhen.UnitEnters, "mari", (Power?)null, (string?)null), (sub.Standing[1].When, sub.Standing[1].Province, sub.Standing[1].Power, sub.Standing[1].Unreadable));
        Assert.Equal("there is no power called 'Kush'", sub.Standing[2].Unreadable);
        Assert.Equal(["s9", "all"], sub.CancelStanding);
    }

    [Fact]
    public async Task A_model_king_gives_standing_orders_and_a_march_that_the_engine_binds_to_its_units()
    {
        var king = new Replying(turn => turn == 1 ? PlanningReply : null);
        var seat = new LlmLeaderSeat(Power.Babylonia, king, "claude-sonnet-5-5", "medium", true, Quiet);
        var r = await Play(Power.Babylonia, seat, 1);
        var sleep = r.State.Sleep[Power.Babylonia];
        Assert.Equal(r.State.UnitAt("babylon")!.Id, Assert.Single(sleep.Scheduled).UnitId);
        Assert.Equal(["s1", "s2"], sleep.Standing.Select(x => x.Id));
        Assert.Equal(r.State.UnitAt("sippar")!.Id, sleep.Standing[0].UnitId);
        Assert.Equal("- when foreign troops enter mari: there is no power called 'Kush'", Notice(r.State, Power.Babylonia, "Standing orders not kept").Body);
        // The schema it was given asks for both, and its rulebook explains them.
        var spec = king.Specs.Single(x => x.Key == "t1/orders/Babylonia");
        Assert.Contains("\"standing_orders\"", spec.Schema.ToJsonString());
        Assert.Contains("\"cancel_standing\"", spec.Schema.ToJsonString());
        Assert.Contains("Standing orders (standing_orders), at most 12", spec.SharedSystem);
        Assert.Empty(FileExchange.Problems(JsonNode.Parse(PlanningReply), spec.Schema));
    }

    [Fact]
    public void A_reply_naming_an_event_the_schema_does_not_know_breaks_the_schema()
    {
        var reply = PlanningReply.Replace("\"unit_attacked\"", "\"unit_besieged\"");
        Assert.Contains("reply.standing_orders[0].when must be one of unit_enters, unit_attacked", FileExchange.Problems(JsonNode.Parse(reply), Schemas.LeaderOrders(new GameConfig())));
        // Read anyway (as a model reply that ignored its schema would be), it is refused with the reason, not dropped.
        Assert.Equal("name the event it waits for: unit_enters or unit_attacked", Parse.Orders((JsonObject)JsonNode.Parse(reply)!).Standing[0].Unreadable);
    }

    [Fact]
    public void With_sleeping_off_the_schema_has_no_schedule_or_standing_orders()
    {
        var schema = Schemas.LeaderOrders(new GameConfig { SleepingSeats = false }).ToJsonString();
        Assert.DoesNotContain("standing", schema);
        Assert.DoesNotContain("cancel_standing", schema);
    }
}
