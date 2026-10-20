using System.Text.Json.Nodes;
using Amarna.Engine;
using Amarna.Game.Bots;
using Amarna.Llm;

namespace Amarna.Game.Tests;

/// <summary>
/// Standing orders for every seat (the owner's additions to the fix pass after item 4, "Every feature is every seat's"):
/// a seat that gives orders every season (script, human, or a model or file seat with sleep off) keeps standing orders as
/// a sleeping one does; one that fires replaces the season's orders for its units; script kings give them where they make
/// sense; and the rulebook and schema offer them to every king.
/// </summary>
public class StandingForEverySeatTests
{
    /// <summary>A seat that plays every season and does what it is told (nothing, by default).</summary>
    private sealed class Awake(Func<SeatView, TurnSubmission>? decide = null) : ISeat
    {
        public List<SeatView> Views { get; } = new();
        public string Label => "Awake";

        public Task<TurnSubmission> DecideAsync(SeatView view, CancellationToken ct)
        {
            lock (Views) Views.Add(view);
            return Task.FromResult(decide?.Invoke(view) ?? new TurnSubmission());
        }

        public Task<HostReply> HostAudienceAsync(AudienceView view, SeatView court, CancellationToken ct) => Task.FromResult(new HostReply { End = true });
    }

    private static readonly GameConfig Quiet = new() { MinTurns = 40, CatastropheChance = 0 };

    /// <summary>Mari is Assyria's, its walls gone, with an Assyrian army in it: two Assyrian armies stand next to Sippar.</summary>
    private static void AssyriaInMari(GameState s)
    {
        s.Garrisons.Remove("mari");
        s.Owner["mari"] = Power.Assyria;
        s.Units.Add(new Unit { Id = s.NewId("u"), Power = Power.Assyria, Kind = UnitKind.Army, Province = "mari" });
    }

    private static async Task<GameRunner> Play(ISeat babylon, ISeat assyria, int turns, GameConfig? config = null, Action<GameState>? setup = null)
    {
        var state = GameFactory.NewGame(31, config ?? Quiet);
        setup?.Invoke(state);
        var seats = Powers.All.ToDictionary(p => p, p => p == Power.Babylonia ? babylon : p == Power.Assyria ? assyria : new Awake());
        var runner = new GameRunner(state, seats, new ScriptMind(), new TemplateNarrator()) { WriteChronicles = false };
        await runner.PrepareAsync();
        for (var i = 0; i < turns && !state.Ended; i++) await runner.PlayTurnAsync();
        return runner;
    }

    /// <summary>Assyria attacks the army in Sippar in turn 2, from Ekallatum with Mari's support: two against one.</summary>
    private static Awake AssyriaStrikesSippar() => new(v => v.Turn == 2
        ? new TurnSubmission { Orders = [new MoveOrder("ekallatum", "sippar"), new SupportOrder("mari", "ekallatum", "sippar")] }
        : new TurnSubmission());

    private static StandingRequest Attacked(string province, params Order[] orders) =>
        new() { When = StandingWhen.UnitAttacked, Province = province, Orders = orders.ToList() };

    private static List<StandingOrder> StandingOf(GameState s, Power p) => s.Standing.TryGetValue(p, out var book) ? book.Orders : [];

    private static InboxItem Notice(GameState s, Power p, string title) => Assert.Single(s.InboxOf(p), i => i.Title == title);

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task A_seat_that_plays_every_season_keeps_standing_orders_and_one_fires_in_place_of_its_orders(bool sleepingSeats)
    {
        // Babylonia plays every season (with sleeping seats on or off: it cannot sleep). In turn 1 it leaves a standing order:
        // when the army in Sippar is attacked, the army in Dur-Kurigalzu supports it holding. In turn 2 it orders that army to
        // Nippur, and Assyria strikes Sippar two against one: the standing order replaces the march, and Sippar holds.
        var babylon = new Awake(v => v.Turn switch
        {
            1 => new TurnSubmission { Standing = [Attacked("sippar", new SupportOrder("durkurigalzu", "sippar"))] },
            2 => new TurnSubmission { Orders = [new MoveOrder("durkurigalzu", "nippur")] },
            _ => new TurnSubmission(),
        });
        var r = await Play(babylon, AssyriaStrikesSippar(), 2, Quiet with { SleepingSeats = sleepingSeats }, AssyriaInMari);

        Assert.Empty(r.State.Sleep);
        Assert.Equal(Power.Babylonia, r.State.UnitAt("sippar")?.Power);
        Assert.Equal(Power.Babylonia, r.State.UnitAt("durkurigalzu")?.Power);
        Assert.Null(r.State.UnitAt("nippur"));
        Assert.Empty(StandingOf(r.State, Power.Babylonia));
        // Its view in turn 2 listed it, as a sleeping seat's does.
        Assert.Equal("s1", Assert.Single(babylon.Views[1].Standing).Id);
        Assert.Contains("- s1: when your army now in sippar is attacked, then: the army now in durkurigalzu supports the army now in sippar holding", Prompts.Situation(babylon.Views[1]));
        // Its header says that its orders replace those the king gives in the season it fires (the follow-up's review).
        Assert.Contains("YOUR STANDING ORDERS (each fires once, in the season you see the move it waits for, and its orders then replace the orders you give that season for the same units or people; cancel_standing removes them by their ids, which are for your orders only, and one cancelled does not fire in that season):", Prompts.Situation(babylon.Views[1]));
        Assert.Equal("Your standing order s1 (when your army in sippar is attacked) fired in turn 2: Assyria's army set out from ekallatum for sippar. It gave these orders: durkurigalzu supports sippar holding. They replaced these orders you gave for turn 2: durkurigalzu -> nippur.",
            Notice(r.State, Power.Babylonia, TurnEngine.StandingFiredTitle("s1")).Body);
        Assert.DoesNotContain(r.State.InboxOf(Power.Babylonia), i => i.Kind == InboxKind.Rejected);

        // The game replays exactly from its log (from the same starting position).
        var start = GameFactory.NewGame(31, Quiet with { SleepingSeats = sleepingSeats });
        AssyriaInMari(start);
        var replay = new GameRunner(start, r.Seats, new ScriptMind(), new TemplateNarrator(), replay: GameLog.FromJsonl(r.Log.ToJsonl())) { WriteChronicles = false };
        await replay.PrepareAsync();
        for (var i = 0; i < 2; i++) await replay.PlayTurnAsync();
        Assert.Equal(Json.Hash(r.State), Json.Hash(replay.State));
    }

    [Fact]
    public async Task Cancelled_in_its_season_a_standing_order_lets_the_seat_s_own_orders_run()
    {
        var babylon = new Awake(v => v.Turn switch
        {
            1 => new TurnSubmission { Standing = [Attacked("sippar", new SupportOrder("durkurigalzu", "sippar"))] },
            2 => new TurnSubmission { Orders = [new MoveOrder("durkurigalzu", "nippur")], CancelStanding = ["s1"] },
            _ => new TurnSubmission(),
        });
        var r = await Play(babylon, AssyriaStrikesSippar(), 2, setup: AssyriaInMari);
        Assert.Equal(Power.Assyria, r.State.UnitAt("sippar")?.Power);
        Assert.Equal(Power.Babylonia, r.State.UnitAt("nippur")?.Power);
        Assert.DoesNotContain(r.State.InboxOf(Power.Babylonia), i => i.Title == TurnEngine.StandingFiredTitle("s1"));
        Assert.Empty(StandingOf(r.State, Power.Babylonia));
    }

    [Fact]
    public async Task A_standing_order_answers_a_move_as_ordered_even_one_the_mover_s_own_standing_order_turns_aside()
    {
        // The follow-up's review: standing orders answer the moves as ordered, before any standing order fires, so one may
        // answer a move that its mover's own standing order then replaces. The rulebook says so. In turn 2 Assyria orders
        // Ekallatum's army into Sippar, but Babylonia's army in Sippar attacks Mari, and Assyria's standing order turns
        // Ekallatum's army to support Mari holding. Babylonia's standing order still fires on the march into Sippar.
        var babylon = new Awake(v => v.Turn switch
        {
            1 => new TurnSubmission { Standing = [Attacked("sippar", new SupportOrder("durkurigalzu", "sippar"))] },
            2 => new TurnSubmission { Orders = [new MoveOrder("sippar", "mari")] },
            _ => new TurnSubmission(),
        });
        var assyria = new Awake(v => v.Turn switch
        {
            1 => new TurnSubmission { Standing = [Attacked("mari", new SupportOrder("ekallatum", "mari"))] },
            2 => new TurnSubmission { Orders = [new MoveOrder("ekallatum", "sippar"), new SupportOrder("mari", "ekallatum", "sippar")] },
            _ => new TurnSubmission(),
        });
        var r = await Play(babylon, assyria, 2, setup: AssyriaInMari);

        // Ekallatum's army never set out; Babylonia's attack on Mari met two and bounced.
        Assert.Equal(Power.Assyria, r.State.UnitAt("ekallatum")?.Power);
        Assert.Equal(Power.Assyria, r.State.UnitAt("mari")?.Power);
        Assert.Equal(Power.Babylonia, r.State.UnitAt("sippar")?.Power);
        Assert.StartsWith("Your standing order s1 (when your army in mari is attacked) fired in turn 2: Babylonia's army set out from sippar for mari. It gave these orders: ekallatum supports mari holding. They replaced these orders you gave for turn 2: ekallatum -> sippar.",
            Notice(r.State, Power.Assyria, TurnEngine.StandingFiredTitle("s1")).Body);
        // Babylonia's fired all the same, on the move as Assyria ordered it.
        Assert.StartsWith("Your standing order s1 (when your army in sippar is attacked) fired in turn 2: Assyria's army set out from ekallatum for sippar. It gave these orders: durkurigalzu supports sippar holding.",
            Notice(r.State, Power.Babylonia, TurnEngine.StandingFiredTitle("s1")).Body);
        Assert.Empty(StandingOf(r.State, Power.Babylonia));
    }

    [Fact]
    public void The_stand_in_neither_gives_nor_cancels_the_standing_orders_of_a_seat_that_plays_every_season()
    {
        // A model seat with sleeping seats off whose call failed: the script king's orders stand in for the season, but its
        // standing orders and cancellations are not the seat's.
        var s = GameFactory.NewGame(31, Quiet with { SleepingSeats = false });
        var e = new TurnEngine(s);
        e.BeginTurn();
        e.Resolve(new Dictionary<Power, TurnSubmission> { [Power.Babylonia] = new() { Standing = [Attacked("sippar", new HoldOrder("sippar"))] } });
        Assert.Equal("s1", Assert.Single(StandingOf(s, Power.Babylonia)).Id);

        e = new TurnEngine(s);
        e.BeginTurn();
        e.Resolve(new Dictionary<Power, TurnSubmission>
        {
            [Power.Babylonia] = new() { FromFallback = true, Standing = [Attacked("babylon", new HoldOrder("babylon"))], CancelStanding = ["all"] },
        });
        Assert.Equal("s1", Assert.Single(StandingOf(s, Power.Babylonia)).Id);
    }

    [Fact]
    public void The_standing_orders_of_a_seat_that_plays_every_season_go_with_its_lost_troops()
    {
        var s = GameFactory.NewGame(31, Quiet with { SleepingSeats = false });
        var e = new TurnEngine(s);
        e.BeginTurn();
        e.Resolve(new Dictionary<Power, TurnSubmission>
        {
            [Power.Babylonia] = new() { Standing = [Attacked("sippar", new HoldOrder("babylon")), Attacked("babylon", new HoldOrder("babylon"), new SupportOrder("sippar", "babylon"))] },
        });
        s.Units.RemoveAll(u => u.Province == "sippar");
        e = new TurnEngine(s);
        e.BeginTurn();
        e.WakeCheck();
        var left = Assert.Single(StandingOf(s, Power.Babylonia));
        Assert.Equal(("s2", 1), (left.Id, left.Orders.Count));
        Assert.EndsWith(":\n- standing order s1 (when your unit that stood in sippar is attacked)\n- from standing order s2: sippar supports babylon holding",
            Notice(s, Power.Babylonia, TurnEngine.LostTroopsTitle).Body);
    }

    [Fact]
    public void Every_king_reads_how_standing_orders_work_and_may_give_them()
    {
        var off = Quiet with { SleepingSeats = false };
        var rules = Prompts.LeaderRules(true, off);
        Assert.DoesNotContain("YOU SLEEP BETWEEN YOUR ORDERS", rules);
        Assert.Contains("STANDING ORDERS (standing_orders; every king may give them)", rules);
        Assert.Contains("- When it fires, its orders replace your other orders that season for the same units or people, those you give that season among them: give your units their orders as usual, and a standing order changes them only if the move it waits for comes. To stop one from firing, cancel it (cancel_standing, by id or \"all\"); cancelled in a season, it does not fire in that season.", rules);
        Assert.Contains("Then each standing order that fires (see STANDING ORDERS) answers the moves just ordered and puts its orders in place of yours for the same units or people.", rules);
        // The same section for a king that sleeps, which also reads how standing orders go with his schedule and his sleep.
        var on = Prompts.LeaderRules(true, Quiet);
        Assert.Contains("STANDING ORDERS (standing_orders; every king may give them)", on);
        Assert.Contains("- Standing orders (see STANDING ORDERS) keep answering while you sleep", on);
        Assert.True(on.IndexOf("MOVEMENT AND COMBAT", StringComparison.Ordinal) < on.IndexOf("STANDING ORDERS (", StringComparison.Ordinal));
    }

    /// <summary>A model king with sleep off that leaves a standing order in turn 1 and holds after.</summary>
    private sealed class Modelled : IJsonAsker
    {
        public List<CallSpec> Specs { get; } = new();

        public Task<JsonObject> AskJsonAsync(CallSpec spec, CancellationToken ct)
        {
            lock (Specs) Specs.Add(spec);
            var json = spec.Key == "t1/orders/Babylonia"
                ? """{"notes":"Guard Sippar.","summary":"","ledger":[],"units":[],"letters":[],"other_orders":[],"standing_orders":[{"when":"unit_attacked","province":"sippar","power":"","units":[{"unit":"durkurigalzu","order":"support","target":"sippar","to":""}],"other_orders":[]}],"cancel_standing":[]}"""
                : spec.Key.Contains("/orders/")
                    ? """{"notes":"Hold.","summary":"","ledger":[],"units":[],"letters":[],"other_orders":[],"standing_orders":[],"cancel_standing":[]}"""
                    : """{"speech":"Welcome.","gift_to_envoy":0,"gift_request":"","offer_service_wage":0,"seal_tablet":false,"detain_envoy":false,"send_gold_back":0,"gold_back_purity":100,"end_audience":true}""";
            return Task.FromResult((JsonObject)JsonNode.Parse(json)!);
        }
    }

    [Fact]
    public async Task A_model_king_with_sleep_off_gives_a_standing_order_that_fires()
    {
        var off = Quiet with { SleepingSeats = false };
        var model = new Modelled();
        var seat = new LlmLeaderSeat(Power.Babylonia, model, "claude-sonnet-5-5", "medium", true, off);
        var r = await Play(seat, AssyriaStrikesSippar(), 2, off, AssyriaInMari);
        Assert.Equal(Power.Babylonia, r.State.UnitAt("sippar")?.Power);
        Assert.StartsWith("Your standing order s1 (when your army in sippar is attacked) fired in turn 2:", Notice(r.State, Power.Babylonia, TurnEngine.StandingFiredTitle("s1")).Body);
        // Its schema offers standing orders but no schedule, and its request names them.
        var spec = model.Specs.First(x => x.Key == "t1/orders/Babylonia");
        Assert.Contains("\"standing_orders\"", spec.Schema.ToJsonString());
        Assert.DoesNotContain("\"schedule\"", spec.Schema.ToJsonString());
        Assert.EndsWith("standing orders, and anything else.", spec.User.TrimEnd());
    }

    // ------------------------------------------------------------ script kings

    private static (Board Board, Brain Brain) Read(GameState s, Power me)
    {
        var v = Views.For(s, me);
        var brain = new Brain(me, 9);
        brain.Learn(v, new Board(v));
        return (new Board(v), brain);
    }

    /// <summary>A plan in which every troop of the king's holds, with the changes given.</summary>
    private static MilitaryPlan Holding(Board b, params Order[] changes)
    {
        var plan = new MilitaryPlan();
        foreach (var u in b.Mine) plan.Orders[u.Province] = new HoldOrder(u.Province);
        foreach (var o in changes) plan.Orders[OrderKeys.UnitOf(o)!] = o;
        return plan;
    }

    [Fact]
    public void A_script_king_guards_a_troop_that_could_be_struck_by_more_than_it_holds_alone()
    {
        // Two Assyrian armies stand next to Sippar, in Ekallatum and Mari: one support holds it against both. The army in
        // Dur-Kurigalzu, which holds this season and guards less than the army in the capital, is to give it if Sippar is
        // attacked.
        var s = GameFactory.NewGame(31, Quiet);
        AssyriaInMari(s);
        var (b, brain) = Read(s, Power.Babylonia);
        var (cancel, give) = Contingencies.Plan(b, brain, Holding(b), []);
        Assert.Empty(cancel);
        var sippar = Assert.Single(give, g => g.Place == "sippar");
        Assert.Equal((Contingencies.Guard.Troop, StandingWhen.UnitAttacked), (sippar.Kind, sippar.Request.When));
        Assert.Equal([new SupportOrder("durkurigalzu", "sippar")], sippar.Request.Orders);
        // A troop that marches this season is no helper, since its place next season is not known: the army in Babylon then.
        (_, give) = Contingencies.Plan(b, brain, Holding(b, new MoveOrder("durkurigalzu", "nippur")), []);
        Assert.Equal([new SupportOrder("babylon", "sippar")], Assert.Single(give, g => g.Place == "sippar").Request.Orders);
        // With one army next to it, Sippar holds alone: no standing order for it.
        s.Units.RemoveAll(u => u.Province == "mari");
        (b, brain) = Read(s, Power.Babylonia);
        (_, give) = Contingencies.Plan(b, brain, Holding(b), []);
        Assert.DoesNotContain(give, g => g.Place == "sippar");
    }

    [Fact]
    public void A_script_king_sends_a_troop_into_an_empty_home_province_as_a_lone_attacker_does()
    {
        // The opening: the Assyrian army in Ekallatum, which Babylon sees, is two moves from its empty Nippur (by Dur-Kurigalzu)
        // and next to Sippar and Dur-Kurigalzu, which one army alone cannot take. The army in Dur-Kurigalzu, the least
        // threatened troop next to Nippur by what it guards, is to march in if foreign troops do.
        var s = GameFactory.NewGame(31, Quiet);
        var (b, brain) = Read(s, Power.Babylonia);
        var (_, give) = Contingencies.Plan(b, brain, Holding(b), []);
        var g = Assert.Single(give);
        Assert.Equal((Contingencies.Guard.Empty, "nippur", StandingWhen.UnitEnters, (Power?)null), (g.Kind, g.Place, g.Request.When, g.Request.Power));
        Assert.Equal([new MoveOrder("durkurigalzu", "nippur")], g.Request.Orders);
        // Not if the plan has another troop support it holding: its supports would be lost when it moves.
        var s2 = GameFactory.NewGame(31, Quiet);
        var e = new TurnEngine(s2);
        e.BeginTurn();
        e.Resolve(new Dictionary<Power, TurnSubmission> { [Power.Babylonia] = new() { Standing = give.Select(x => x.Request).ToList() } });
        (b, brain) = Read(s2, Power.Babylonia);
        var (cancel, _) = Contingencies.Plan(b, brain, Holding(b, new SupportOrder("babylon", "durkurigalzu")), []);
        Assert.Equal(("s1", "needed at home"), Assert.Single(cancel));
    }

    [Fact]
    public void A_script_king_s_fleet_at_sea_with_nothing_to_help_it_slips_away_as_the_blow_falls()
    {
        // Alashiya's fleet in the Great Green, next to Egypt's fleets in the Delta and the Levantine Sea; its armies hold
        // Tamassos and Enkomi, and no army can help a fleet at sea. The Cilician Sea is empty, and no Egyptian fleet could
        // move into it this season.
        var s = GameFactory.NewGame(31, Quiet);
        s.Units.RemoveAll(u => u.Power == Power.Alashiya);
        s.Units.Add(new Unit { Id = s.NewId("u"), Power = Power.Alashiya, Kind = UnitKind.Fleet, Province = "greatgreen" });
        s.Units.Add(new Unit { Id = s.NewId("u"), Power = Power.Alashiya, Kind = UnitKind.Army, Province = "tamassos" });
        s.Units.Add(new Unit { Id = s.NewId("u"), Power = Power.Alashiya, Kind = UnitKind.Army, Province = "enkomi" });
        s.Units.Add(new Unit { Id = s.NewId("u"), Power = Power.Egypt, Kind = UnitKind.Fleet, Province = "levantsea" });
        var (b, brain) = Read(s, Power.Alashiya);
        var (_, give) = Contingencies.Plan(b, brain, Holding(b), []);
        var g = Assert.Single(give);
        Assert.Equal((Contingencies.Guard.Retreat, "greatgreen", StandingWhen.UnitAttacked), (g.Kind, g.Place, g.Request.When));
        Assert.Equal([new MoveOrder("greatgreen", "cilicia")], g.Request.Orders);
    }

    /// <summary>Babylonia keeps standing order s1: when the army in Sippar is attacked, the army in Dur-Kurigalzu supports it.</summary>
    private static GameState Guarded()
    {
        var s = GameFactory.NewGame(31, Quiet);
        AssyriaInMari(s);
        var e = new TurnEngine(s);
        e.BeginTurn();
        e.Resolve(new Dictionary<Power, TurnSubmission> { [Power.Babylonia] = new() { Standing = [Attacked("sippar", new SupportOrder("durkurigalzu", "sippar"))] } });
        return s;
    }

    [Theory]
    [InlineData("hold", null)]
    [InlineData("march", "the troop marches")]
    [InlineData("same", "the plan does it")]
    [InlineData("supported", "held without it")]
    [InlineData("attack", "needed elsewhere")]
    [InlineData("disband", "the troop goes")]
    public void A_script_king_cancels_a_standing_order_that_no_longer_makes_sense_against_the_season_s_plan(string season, string? why)
    {
        var s = Guarded();
        var (b, brain) = Read(s, Power.Babylonia);
        var plan = season switch
        {
            // Two armies could strike Sippar, which holds alone: it should stand.
            "hold" => Holding(b),
            "march" => Holding(b, new MoveOrder("sippar", "mari")),
            "same" => Holding(b, new SupportOrder("durkurigalzu", "sippar")),
            // The plan has Babylon support it: two against two, held without the standing order.
            "supported" => Holding(b, new SupportOrder("babylon", "sippar")),
            // Dur-Kurigalzu's own order this season is worth more than Sippar: a march on Susa's free land.
            "attack" => Holding(b, new MoveOrder("durkurigalzu", "susa")),
            _ => Holding(b),
        };
        List<Order> orders = season == "disband" ? [new DisbandOrder("sippar")] : [];
        var (cancel, _) = Contingencies.Plan(b, brain, plan, orders);
        if (why is null) Assert.Empty(cancel);
        else Assert.Equal(("s1", why), Assert.Single(cancel));
    }

    [Fact]
    public async Task Script_kings_give_standing_orders_and_one_meets_its_blow()
    {
        // Seed 1: in turn 3 Arzawa marches on Hattusa, which Hatti's plan for the season leaves empty; the standing order Hatti
        // gave the season before sends the army in Kanesh in as well, and Arzawa bounces. The game replays exactly.
        var state = GameFactory.NewGame(1);
        var seats = Powers.All.ToDictionary(p => p, _ => (ISeat)new ScriptLeader(1));
        var runner = new GameRunner(state, seats, new ScriptMind(), new TemplateNarrator()) { WriteChronicles = false };
        await runner.PrepareAsync();
        for (var i = 0; i < 3; i++) await runner.PlayTurnAsync();
        var fired = Assert.Single(state.InboxOf(Power.Hatti), x => x.Title.StartsWith("Standing order s", StringComparison.Ordinal) && x.Title.EndsWith(" fired", StringComparison.Ordinal));
        Assert.Contains("(when foreign troops enter hattusa) fired in turn 3: Arzawa's army set out from tuwanuwa for hattusa. It gave these orders: kanesh -> hattusa.", fired.Body);
        Assert.Equal(Power.Hatti, state.Owner["hattusa"]);
        Assert.True(Powers.All.Sum(p => state.Standing.GetValueOrDefault(p)?.Last ?? 0) > 1);

        var replay = GameRunner.ForReplay(GameLog.FromJsonl(runner.Log.ToJsonl()));
        await replay.PrepareAsync();
        for (var i = 0; i < 3; i++) await replay.PlayTurnAsync();
        Assert.Equal(Json.Hash(state), Json.Hash(replay.State));
    }
}
