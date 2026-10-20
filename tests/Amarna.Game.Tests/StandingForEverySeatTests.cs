using System.Text.Json.Nodes;
using Amarna.Engine;
using Amarna.Game.Bots;
using Amarna.Llm;

namespace Amarna.Game.Tests;

/// <summary>
/// Standing orders for every seat (the owner's additions to the fix pass after item 4, "Every feature is every seat's"):
/// a seat that gives orders every season (script, human, or a model or file seat with sleep off) keeps standing orders as
/// a sleeping one does; one that fires replaces the season's orders for its units; and the rulebook and
/// schema offer them to every king.
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
}
