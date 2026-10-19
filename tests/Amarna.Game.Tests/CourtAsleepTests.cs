using System.Text.Json.Nodes;
using Amarna.Engine;
using Amarna.Game;
using Amarna.Game.Batch;
using Amarna.Game.Bots;
using Amarna.Llm;

namespace Amarna.Game.Tests;

/// <summary>
/// Part H of the simulation-fixes round: an envoy wakes a sleeping king for an audience only. At it the king reads its realm
/// in brief, may send letters, and judges whether to reopen its orders; every other wake reason reopens them directly.
/// </summary>
public class CourtAsleepTests
{
    private static readonly GameConfig Quiet = new() { MinTurns = 40, CatastropheChance = 0 };

    /// <summary>A seat that may sleep: its orders and its audience replies come from scripts, and it remembers what it was shown.</summary>
    private sealed class Sleeper(Func<SeatView, TurnSubmission> decide, Func<AudienceView, SeatView, HostReply> host) : ISeat
    {
        public List<SeatView> Views { get; } = new();
        public List<AudienceView> Audiences { get; } = new();
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
            lock (Audiences)
            {
                Audiences.Add(view);
                Courts.Add(court);
            }
            return Task.FromResult(host(view, court));
        }
    }

    /// <summary>A seat that never sleeps and does what it is told each season (nothing, by default).</summary>
    private sealed class Scripted(Func<SeatView, TurnSubmission>? decide = null) : ISeat
    {
        public string Label => "Scripted";
        public Task<TurnSubmission> DecideAsync(SeatView view, CancellationToken ct) => Task.FromResult(decide?.Invoke(view) ?? new TurnSubmission());
        public Task<HostReply> HostAudienceAsync(AudienceView view, SeatView court, CancellationToken ct) => Task.FromResult(new HostReply { End = true });
    }

    /// <summary>Script characters that remember every host reply an envoy met.</summary>
    private sealed class Listening : ICharacterMind
    {
        private readonly ScriptMind _script = new();
        public List<HostReply> Heard { get; } = new();
        public string Label => "Listening";
        public Task<PresentResult> PresentAsync(EnvoyContext ctx, CancellationToken ct) => _script.PresentAsync(ctx, ct);

        public Task<EnvoyReaction> ReactAsync(EnvoyContext ctx, HostReply host, CancellationToken ct)
        {
            lock (Heard) Heard.Add(host);
            return _script.ReactAsync(ctx, host, ct);
        }

        public Task<MindReply> WriteAsync(MindContext ctx, CancellationToken ct) => _script.WriteAsync(ctx, ct);
    }

    /// <summary>Records what a model king is sent; at an audience held while its orders stand it reopens them if told to.</summary>
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

    /// <summary>The season Egypt's envoy, sent in turn 1, stands before Alashiya.</summary>
    private static int CourtTurn(GameConfig? config = null) => 1 + new TurnEngine(GameFactory.NewGame(31, config ?? Quiet)).TravelTurns(Power.Egypt, Power.Alashiya);

    /// <summary>Egypt sends one envoy to Alashiya in turn 1; Alashiya is the given seat; every other king does nothing.</summary>
    private static async Task<GameRunner> Play(ISeat alashiya, int turns, GameConfig? config = null, ICharacterMind? minds = null)
    {
        var state = GameFactory.NewGame(31, config ?? Quiet);
        var envoy = state.Characters.First(c => c.Employer == Power.Egypt).Id;
        var egypt = new Scripted(v => v.Turn == 1 ? new TurnSubmission { Orders = [new DispatchOrder(envoy, Power.Alashiya, "Greetings, brother.")] } : new TurnSubmission());
        var seats = Powers.All.ToDictionary(p => p, p => p == Power.Alashiya ? alashiya : p == Power.Egypt ? egypt : (ISeat)new Scripted());
        var runner = new GameRunner(state, seats, minds ?? new ScriptMind(), new TemplateNarrator()) { WriteChronicles = false };
        await runner.PrepareAsync();
        for (var i = 0; i < turns && !state.Ended; i++) await runner.PlayTurnAsync();
        return runner;
    }

    private static string Ready(SeatView court, int nth = 0) => court.Court.Where(c => c.Ready).Skip(nth).First().Id;

    // ------------------------------------------------------------ reopening

    [Fact]
    public async Task A_host_that_reopens_its_orders_gives_orders_the_same_season_as_an_ordinary_wake()
    {
        var t = CourtTurn();
        var host = new Sleeper(_ => new TurnSubmission(), (_, _) => new HostReply { Speech = "Welcome.", End = true, ReopenOrders = true });
        var r = await Play(host, t);
        Assert.Equal([1, t], host.Calls);
        Assert.Equal([TurnEngine.EnvoyWaits(Power.Egypt), TurnEngine.ReopenReason], host.Views.Last().WokenBecause);
        Assert.False(host.Views.Last().HoldsCourt);
        var sl = r.State.Sleep[Power.Alashiya];
        var court = Assert.Single(sl.Courts);
        Assert.Equal((t, 1, true), (court.Turn, court.Envoys, court.Reopened));
        // Its sleep ended that season for the envoy and its choice; having given orders, it sleeps again.
        Assert.Equal(t, sl.History[0].WokeAt);
        Assert.Equal([TurnEngine.EnvoyWaits(Power.Egypt), TurnEngine.ReopenReason], sl.History[0].Reasons);
        Assert.Equal(t, sl.LastCalled);
        Assert.True(sl.Asleep);
    }

    [Fact]
    public async Task An_order_trigger_reopens_orders_without_asking_and_the_audience_is_an_ordinary_one()
    {
        // The king named the very season the envoy arrives: that reopens its orders directly.
        var t = CourtTurn();
        var host = new Sleeper(v => v.Turn == 1 ? new TurnSubmission { Sleep = new SleepRequest { WakeTurn = t } } : new TurnSubmission(),
            (_, _) => new HostReply { End = true });
        var r = await Play(host, t);
        Assert.Equal([1, t], host.Calls);
        Assert.False(Assert.Single(host.Audiences).OrdersStand);
        Assert.Equal([$"you asked to be woken in turn {t}", TurnEngine.EnvoyWaits(Power.Egypt)], host.Views.Last().WokenBecause);
        Assert.Empty(r.State.Sleep[Power.Alashiya].Courts);
    }

    // ------------------------------------------------------------ letters

    [Fact]
    public async Task Letters_from_an_audience_go_out_with_the_seasons_orders_and_the_envoy_never_hears_of_them()
    {
        var t = CourtTurn();
        var listening = new Listening();
        string? sent = null;
        var gold = 0;
        var host = new Sleeper(_ => new TurnSubmission(), (_, court) =>
        {
            sent ??= Ready(court);
            gold = court.Gold;
            return new HostReply { Speech = "Welcome.", End = true, Letters = [new DispatchOrder(sent, Power.Egypt, "My brother, I thank you.", Gold: 10)] };
        });
        var r = await Play(host, t, minds: listening);

        // Its orders stood: no orders call, yet its envoy set out with the gold, as if it had given the letter as an order.
        Assert.Equal([1], host.Calls);
        var envoy = r.State.Char(sent!);
        Assert.Equal((Duty.EnvoyOutbound, (Power?)Power.Egypt), (envoy.Duty, envoy.MissionTarget));
        Assert.Equal(gold - 10, r.State.Treasuries[Power.Alashiya].Ledger);
        Assert.Empty(r.State.Sleep[Power.Alashiya].CourtLetters);
        // The envoy before the king heard what was said, never what the king sent elsewhere or chose about its orders.
        var heard = Assert.Single(listening.Heard);
        Assert.Equal("Welcome.", heard.Speech);
        Assert.Empty(heard.Letters);
        Assert.False(heard.ReopenOrders);
    }

    [Fact]
    public void A_later_letter_for_the_same_person_replaces_an_earlier_one_and_only_letters_are_taken()
    {
        var sent = new List<Order>();
        TurnEngine.AddLetters(sent, [new DispatchOrder("c1", Power.Egypt, "a"), new DispatchOrder("c2", Power.Hatti, "b")]);
        TurnEngine.AddLetters(sent, [new DispatchOrder("c1", Power.Mitanni, "c"), new HoldOrder("babylon"), new UnreadableOrder("send c3 to 'Elam'", "there is no power called 'Elam'")]);
        Assert.Equal(["send c2 to Hatti", "send c1 to Mitanni", "send c3 to 'Elam'"], sent.Select(o => o.Describe()));
    }

    [Fact]
    public async Task A_second_exchange_shows_the_letters_already_sent_and_the_choice_already_made()
    {
        var t = CourtTurn();
        string? sent = null;
        var host = new Sleeper(_ => new TurnSubmission(), (a, court) =>
        {
            sent ??= Ready(court);
            return a.Round == 1
                ? new HostReply { Speech = "Wait.", ReopenOrders = true, Letters = [new DispatchOrder(sent, Power.Hatti, "Brother.")] }
                : new HostReply { Speech = "Go.", End = true };
        });
        await Play(host, t);
        var rounds = host.Audiences.Where(a => a.Turn == t).ToList();
        Assert.Equal(2, rounds.Count);
        Assert.True(rounds.All(a => a.OrdersStand));
        Assert.Equal((false, 0), (rounds[0].ReopenChosen, rounds[0].LettersSent.Count));
        Assert.True(rounds[1].ReopenChosen);
        Assert.Equal($"send {sent} to Hatti", Assert.Single(rounds[1].LettersSent).Describe());
        var text = Prompts.Audience(rounds[1]);
        Assert.Contains($"Letters you have already sent from your audiences this season (a new letter for the same person replaces one): send {sent} to Hatti.", text);
        Assert.Contains("You have already chosen to reopen your orders this season: you give orders after your audiences.", text);
    }

    [Fact]
    public async Task A_refused_letter_is_reported_and_does_not_wake_the_host()
    {
        var t = CourtTurn();
        var host = new Sleeper(_ => new TurnSubmission(), (_, _) => new HostReply { End = true, Letters = [new DispatchOrder("c999", Power.Egypt, "Brother.")] });
        var r = await Play(host, t + 1);
        Assert.Equal([1], host.Calls);
        var notice = Assert.Single(r.State.InboxOf(Power.Alashiya), i => i.Kind == InboxKind.Rejected && i.Turn == t + 1);
        Assert.Contains("- send c999 to Egypt:", notice.Body);
        // It waits in the digest for the king's next waking, like any order given for the season that failed.
        Assert.Contains(r.State.Sleep[Power.Alashiya].Digest, d => d == $"turn {t + 1}: an order was refused or failed (Orders that could not be carried out)");
    }

    [Fact]
    public async Task Reopened_an_order_for_the_same_person_replaces_the_letter_and_letters_are_checked_first()
    {
        var t = CourtTurn();
        string? first = null, second = null;
        var gold = 0;
        var host = new Sleeper(v => v.Turn == t
                ? new TurnSubmission { Orders = [new DispatchOrder(first!, Power.Hatti, "To Hatti instead."), new CounterIntelOrder(1)] }
                : new TurnSubmission(),
            (_, court) =>
            {
                first ??= Ready(court);
                second ??= Ready(court, 1);
                gold = court.Gold;
                // The first letter spends the whole treasury; the second is replaced by an order given after reopening.
                return new HostReply
                {
                    End = true, ReopenOrders = true,
                    Letters = [new DispatchOrder(second, Power.Babylonia, "All my gold.", Gold: gold), new DispatchOrder(first, Power.Egypt, "To Egypt.")],
                };
            });
        var r = await Play(host, t);

        // The orders request lists the letters sent from the audience.
        var view = host.Views.Last();
        Assert.Equal([$"send {second} to Babylonia with {gold} shekels", $"send {first} to Egypt"], view.CourtLetters.Select(o => o.Describe()));
        Assert.Contains($"LETTERS YOU SENT FROM YOUR AUDIENCES THIS SEASON (they go out with your orders and are checked before them; an order you give now for the same person replaces its letter): send {second} to Babylonia with {gold} shekels; send {first} to Egypt."
                        + $" Gold already committed by these letters: {gold} shekels, not yet taken from the treasury you read here; it is reserved first when the season's orders are checked.", Prompts.Situation(view));
        // The order for the first envoy replaced its letter; the second envoy's letter stood and was checked before the
        // orders, so its gold was reserved first and the watchmen ordered after reopening could not be paid.
        Assert.Equal(Power.Hatti, r.State.Char(first!).MissionTarget);
        Assert.Equal(Power.Babylonia, r.State.Char(second!).MissionTarget);
        Assert.Equal(0, r.State.Treasuries[Power.Alashiya].Ledger);
        var refused = Assert.Single(r.State.InboxOf(Power.Alashiya), i => i.Kind == InboxKind.Rejected).Body;
        Assert.Equal($"- spend 1 on watching for spies: not enough gold: it needs 1 shekels; orders listed before it had reserved {gold}, and 0 was left", refused);
    }

    // ------------------------------------------------------------ what the king reads

    [Fact]
    public async Task The_audience_request_carries_the_realm_in_brief_and_is_made_by_the_seats_own_model()
    {
        var t = CourtTurn();
        var recorder = new Recorder();
        var state = GameFactory.NewGame(31, Quiet);
        var king = new LlmLeaderSeat(Power.Alashiya, recorder, ModelIds.Opus, "high", true, state.Config);
        await Play(king, t);
        var host = recorder.Specs.Single(x => x.Key.StartsWith($"t{t}/aud/", StringComparison.Ordinal));
        Assert.DoesNotContain(recorder.Specs, x => x.Key == $"t{t}/orders/Alashiya");
        // The seat's own model decides; only the effort is lower than for its orders.
        Assert.Equal((ModelIds.Opus, "medium"), (host.Model, host.Effort));
        var schema = host.Schema.ToJsonString();
        Assert.Contains("\"reopen_orders\"", schema);
        Assert.Contains("\"letters\"", schema);
        Assert.Contains("\"call_brother\"", schema);
        var user = host.User.ReplaceLineEndings("\n");
        Assert.Contains($"SEASON: turn {t}. You hold court.\n", user);
        Assert.Contains("YOUR REALM IN BRIEF (enough to judge whether the news changes your plan; you see the full map only if you reopen your orders):\n- Treasury: ", user);
        Assert.Contains("- Your land: ", user);
        Assert.Contains("- Your troops: ", user);
        Assert.Contains("- Foreign troops at or inside your borders, as far as you can see: ", user);
        Assert.Contains("- Your scheduled orders: none; your units hold where they stand.", user);
        Assert.Contains("- Your standing orders: none.", user);
        Assert.Contains("- Your people at court and ready to be sent: ", user);
        Assert.Contains("YOUR ORDERS STAND WHILE YOU SLEEP.", user);
        Assert.DoesNotContain("THE MAP", user);
        Assert.DoesNotContain("YOUR LAND:", user);
    }

    [Fact]
    public void The_realm_in_brief_names_foreign_troops_in_the_land_and_on_its_borders_and_no_others()
    {
        var s = GameFactory.NewGame(31, Quiet);
        var map = WorldMap.Default;
        var home = s.OwnedBy(Power.Babylonia).ToHashSet();
        // A foreign army inside Babylonia's land, and one next to it.
        var inside = home.First(x => s.UnitAt(x) is null);
        var border = map.Provinces.First(x => !x.IsSea && !home.Contains(x.Id) && s.UnitAt(x.Id) is null && map.Neighbors(x.Id).Any(home.Contains)).Id;
        s.Units.Add(new Unit { Id = "u-in", Power = Power.Hatti, Kind = UnitKind.Army, Province = inside });
        s.Units.Add(new Unit { Id = "u-by", Power = Power.Hatti, Kind = UnitKind.Army, Province = border });
        var brief = Prompts.RealmBrief(Views.For(s, Power.Babylonia));
        Assert.Contains($"Hatti army in {inside} (in your land)", brief);
        var next = string.Join(", ", map.Neighbors(border).Where(home.Contains).OrderBy(x => x, StringComparer.Ordinal));
        Assert.Contains($"Hatti army in {border} (next to your {next})", brief);
        // Troops it can see but not at its borders are left out: this is not the full map.
        var seen = Views.For(s, Power.Babylonia).Units.Where(u => u.Power != Power.Babylonia && u.Province != inside && u.Province != border
            && !home.Contains(u.Province) && !map.Neighbors(u.Province).Any(home.Contains)).ToList();
        foreach (var u in seen) Assert.DoesNotContain($"army in {u.Province} (", brief);
    }

    [Fact]
    public void The_rulebook_says_an_envoy_wakes_the_king_for_the_audience_only()
    {
        var rules = Prompts.LeaderRules(true, new GameConfig()).ReplaceLineEndings("\n");
        Assert.Contains("When you are woken to receive an envoy, reopen your orders if the news changes your plan; otherwise they stand.", rules);
        Assert.Contains("- An envoy at your door wakes you for the audience only. You read your realm in brief (your land and troops, foreign troops at or inside your borders, your treasury, your scheduled and standing orders, your people), answer the envoy as at any audience, and may send envoys of yours with letters, tablets and gifts: they set out at the end of the season with everyone's orders and are checked like orders you give, before them. Then you choose: reopen your orders, and after your audiences you give orders this season with your full view, as when anything else wakes you; or let them stand and sleep on. Anything else that wakes you reopens your orders without asking (your audiences still come first).", rules);
    }

    [Fact]
    public async Task With_sleeping_off_an_audience_is_as_before()
    {
        var off = Quiet with { SleepingSeats = false };
        var recorder = new Recorder(reopen: true);
        var king = new LlmLeaderSeat(Power.Alashiya, recorder, "claude-sonnet-5-5", "medium", true, off);
        var t = CourtTurn(off);
        var r = await Play(king, t, off);
        var host = recorder.Specs.Single(x => x.Key.StartsWith($"t{t}/aud/", StringComparison.Ordinal));
        Assert.Equal(Schemas.HostReply().ToJsonString(), host.Schema.ToJsonString());
        Assert.DoesNotContain("reopen", host.User, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("YOUR REALM IN BRIEF", host.User);
        // Every king gives orders every season, as before.
        Assert.Equal(Enumerable.Range(1, t).Select(n => $"t{n}/orders/Alashiya"), recorder.Specs.Where(x => x.Key.Contains("/orders/")).Select(x => x.Key));
        Assert.Empty(r.State.Sleep);
    }

    [Fact]
    public void A_reply_carries_letters_and_the_choice_and_the_journal_keeps_them()
    {
        var json = (JsonObject)JsonNode.Parse("""
            {"speech":"Welcome.","gift_to_envoy":0,"gift_request":"","offer_service_wage":0,"seal_tablet":false,"detain_envoy":false,
             "send_gold_back":0,"gold_back_purity":100,"end_audience":true,"reopen_orders":true,"ledger":[],
             "letters":[{"envoy":"c4","to":"Hatti","message":"Brother.","mandate":"","gold":15,"purity":100,"call_brother":true,"call_them_great_king":true,
                         "claim_great_king":true,"your_name_first":false,"omit_greeting":false,"tablet_to_seal":"","sworn_alliance":false,"show_tablet_copies":[]},
                        {"envoy":"c5","to":"Elam","message":"x","mandate":"","gold":0,"purity":100,"call_brother":true,"call_them_great_king":true,
                         "claim_great_king":true,"your_name_first":false,"omit_greeting":false,"tablet_to_seal":"","sworn_alliance":false,"show_tablet_copies":[]}]}
            """)!;
        var reply = Parse.Host(json);
        Assert.True(reply.ReopenOrders);
        Assert.Equal(["send c4 to Hatti with 15 shekels", "send c5 to 'Elam'"], reply.Letters.Select(o => o.Describe()));
        Assert.IsType<UnreadableOrder>(reply.Letters[1]);
        Assert.Empty(reply.AsHeard().Letters);
        Assert.False(reply.AsHeard().ReopenOrders);

        // The journal: an audience held since the last orders is shown at the next audience, with the letters sent from it.
        var journal = new LeaderJournal();
        journal.Record(3, new TurnSubmission { Notes = "Hold." });
        journal.Audience(5, Power.Egypt, "Mane", "Welcome, brother.", ["send c4 to Hatti"]);
        Assert.Contains("AUDIENCES YOU HAVE HELD SINCE YOU LAST GAVE ORDERS: Egypt's envoy Mane (turn 5): you said \"Welcome, brother.\"; letters you gave at the audience: send c4 to Hatti",
            journal.ForAudience());
        journal.Record(6, new TurnSubmission { Notes = "Plan." });
        Assert.DoesNotContain("SINCE YOU LAST GAVE ORDERS", journal.ForAudience());
        Assert.Contains("turn 6 audiences: Egypt's envoy Mane (turn 5): you said \"Welcome, brother.\"; letters you gave at the audience: send c4 to Hatti", journal.ForOrders());
    }

    // ------------------------------------------------------------ replay and the report

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task A_game_with_letters_and_reopening_at_audiences_replays_exactly(bool reopen)
    {
        var t = CourtTurn();
        string? sent = null;
        var host = new Sleeper(v => new TurnSubmission { Notes = $"turn {v.Turn}" }, (_, court) =>
        {
            sent ??= Ready(court);
            return new HostReply { Speech = "Welcome.", End = true, ReopenOrders = reopen, Letters = [new DispatchOrder(sent, Power.Hatti, "Brother.", Gold: 5, Proposal: new TabletProposal { Text = "Peace." })] };
        });
        var r = await Play(host, t + 2);
        Assert.Equal(reopen, r.State.Sleep[Power.Alashiya].Courts.Single().Reopened);
        var replay = GameRunner.ForReplay(GameLog.FromJsonl(r.Log.ToJsonl()));
        replay.WriteChronicles = false;
        await replay.PrepareAsync();
        for (var i = 0; i < t + 2; i++) await replay.PlayTurnAsync();
        Assert.Equal(Json.Hash(r.State), Json.Hash(replay.State));
    }

    [Fact]
    public async Task The_seat_report_counts_the_courts_held_asleep_and_how_often_orders_were_reopened()
    {
        var t = CourtTurn();
        var host = new Sleeper(_ => new TurnSubmission(), (_, _) => new HostReply { End = true, ReopenOrders = true });
        var r = await Play(host, t);
        var report = BatchRunner.SeatReport(r);
        var line = report.Split('\n').Single(l => l.TrimStart().StartsWith("Alashiya", StringComparison.Ordinal));
        Assert.Contains(" 1/1 ", line);
        Assert.Contains("Courts held while orders stood: 1; orders reopened at 1 (100%).", report);
        Assert.Equal("Courts held while orders stood: 3; orders reopened at 1 (33%).", BatchRunner.ReopenRate((3, 1, 0)));
        // Courts where a call failed and the stand-in answered are counted apart, out of the rate.
        Assert.Equal("Courts held while orders stood: 5; orders reopened at 1 of the 4 where the king chose (25%); at 1 a call failed, the stand-in answered and the king was asked for orders without choosing (left out of the rate).",
            BatchRunner.ReopenRate((5, 1, 1)));
        Assert.Equal("Courts held while orders stood: 1; none left the choice to the king; at 1 a call failed, the stand-in answered and the king was asked for orders without choosing (left out of the rate).",
            BatchRunner.ReopenRate((1, 0, 1)));
    }

    // ------------------------------------------------------------ a failed call (review of Part H)

    [Fact]
    public async Task A_failed_audience_call_lets_the_stand_in_decide_nothing_and_the_seat_is_asked_for_orders_that_season()
    {
        // Before the fix the stand-in's answer let the king's orders stand: the script, not the seat's own model, chose to
        // sleep on, nothing woke the king again, and the reopen rate counted the script's default as the king's choice.
        var t = CourtTurn();
        var host = new Sleeper(_ => new TurnSubmission(), (_, _) => throw new InvalidOperationException("model down"));
        var r = await Play(host, t + 1);
        Assert.Contains(r.Errors, e => e.StartsWith($"t{t}/aud/", StringComparison.Ordinal) && e.Contains("/host/1: model down", StringComparison.Ordinal));

        // The seat's own model gives orders that season, told why.
        Assert.Equal([1, t], host.Calls);
        Assert.Equal([TurnEngine.EnvoyWaits(Power.Egypt), TurnEngine.StandInCourtReason], host.Views.Last().WokenBecause);
        Assert.Contains($"You were woken because: an envoy of Egypt waits to be received; {TurnEngine.StandInCourtReason}.", Prompts.SleepLine(host.Views.Last()));
        var sl = r.State.Sleep[Power.Alashiya];
        Assert.Equal([TurnEngine.EnvoyWaits(Power.Egypt), TurnEngine.StandInCourtReason], sl.History[0].Reasons);

        // The court is recorded as one the king did not decide, and the reports keep it out of the rate.
        var court = Assert.Single(sl.Courts);
        Assert.Equal((false, true, false), (court.Reopened, court.StandIn, court.Decided));
        var report = BatchRunner.SeatReport(r);
        Assert.Contains(" 1/0 (1 by stand-in) ", report.Split('\n').Single(l => l.TrimStart().StartsWith("Alashiya", StringComparison.Ordinal)));
        Assert.Contains("Courts held while orders stood: 1; none left the choice to the king; at 1 a call failed", report);

        // The stand-in's reply is marked in the log, so the replay is exact.
        var key = r.Log.Decisions.Single(d => d.Key.StartsWith($"t{t}/aud/", StringComparison.Ordinal) && d.Key.EndsWith("/host/1", StringComparison.Ordinal)).Key;
        Assert.True(r.Log.TryGet<HostReply>(key, out var logged) && logged.FromFallback);
        var replay = GameRunner.ForReplay(GameLog.FromJsonl(r.Log.ToJsonl()));
        replay.WriteChronicles = false;
        await replay.PrepareAsync();
        for (var i = 0; i < t + 1; i++) await replay.PlayTurnAsync();
        Assert.Equal(Json.Hash(r.State), Json.Hash(replay.State));
    }

    [Fact]
    public async Task A_call_that_fails_after_the_seat_answered_itself_keeps_its_letters_and_still_asks_it_for_orders()
    {
        var t = CourtTurn();
        string? sent = null;
        var host = new Sleeper(_ => new TurnSubmission(), (a, court) =>
        {
            if (a.Round > 1) throw new InvalidOperationException("model down");
            sent ??= Ready(court);
            // Its own first reply sends a letter and lets its orders stand; its second call fails.
            return new HostReply { Speech = "Wait.", Letters = [new DispatchOrder(sent, Power.Hatti, "Brother.")] };
        });
        var r = await Play(host, t);
        Assert.Equal([1, t], host.Calls);
        Assert.Equal(Power.Hatti, r.State.Char(sent!).MissionTarget);
        var court = Assert.Single(r.State.Sleep[Power.Alashiya].Courts);
        Assert.Equal((false, true), (court.Reopened, court.StandIn));
    }

    [Fact]
    public async Task A_seat_that_reopened_and_whose_orders_call_failed_still_sends_its_letters_and_is_asked_again_without_its_old_choice()
    {
        var t = CourtTurn();
        string? sent = null;
        var host = new Sleeper(v => v.Turn == t ? throw new InvalidOperationException("model down") : new TurnSubmission(),
            (_, court) =>
            {
                sent ??= Ready(court);
                return new HostReply { End = true, ReopenOrders = true, Letters = [new DispatchOrder(sent, Power.Egypt, "Brother.")] };
            });
        var r = await Play(host, t + 1);
        Assert.Contains(r.Errors, e => e.Contains($"t{t}/orders/Alashiya", StringComparison.Ordinal));
        // The letter was its own and goes out although the stand-in gave the season's orders.
        Assert.Equal(Power.Egypt, r.State.Char(sent!).MissionTarget);
        // Asked again next season: told it was woken for the envoy, but not that it "chose to reopen", a choice already spent.
        Assert.Equal([1, t, t + 1], host.Calls);
        var again = host.Views.Last().WokenBecause;
        Assert.Contains(TurnEngine.EnvoyWaits(Power.Egypt), again);
        Assert.DoesNotContain(TurnEngine.ReopenReason, again);
    }

    [Fact]
    public async Task A_letter_from_an_audience_replaces_a_dispatch_scheduled_for_the_same_person()
    {
        var t = CourtTurn();
        string? who = null;
        var host = new Sleeper(v => v.Turn == 1
                ? new TurnSubmission { Scheduled = [new ScheduledOrders { Turn = t, Orders = [new DispatchOrder(who = Ready(v), Power.Hatti, "Scheduled.")] }] }
                : new TurnSubmission(),
            (_, _) => new HostReply { End = true, Letters = [new DispatchOrder(who!, Power.Egypt, "From the audience.")] });
        var r = await Play(host, t);
        Assert.Equal([1], host.Calls);
        Assert.Equal(Power.Egypt, r.State.Char(who!).MissionTarget);
    }

    [Fact]
    public async Task Two_hosts_holding_court_in_the_same_season_each_keep_their_own_letters_and_choice()
    {
        var probe = new TurnEngine(GameFactory.NewGame(31, Quiet));
        var (toAlashiya, toArzawa) = (probe.TravelTurns(Power.Egypt, Power.Alashiya), probe.TravelTurns(Power.Egypt, Power.Arzawa));
        var t = 1 + Math.Max(toAlashiya, toArzawa);
        var state = GameFactory.NewGame(31, Quiet);
        var envoys = state.Characters.Where(c => c.Employer == Power.Egypt).Take(2).Select(c => c.Id).ToList();
        // Egypt times its two envoys so that both stand before their hosts in season t.
        var egypt = new Scripted(v =>
        {
            var orders = new List<Order>();
            if (v.Turn == t - toAlashiya) orders.Add(new DispatchOrder(envoys[0], Power.Alashiya, "Greetings, brother."));
            if (v.Turn == t - toArzawa) orders.Add(new DispatchOrder(envoys[1], Power.Arzawa, "Greetings, brother."));
            return new TurnSubmission { Orders = orders };
        });
        string? sent = null;
        var alashiya = new Sleeper(_ => new TurnSubmission(), (a, court) =>
        {
            sent ??= Ready(court);
            return new HostReply { Speech = "Welcome.", End = a.Round > 1, ReopenOrders = true, Letters = [new DispatchOrder(sent, Power.Hatti, "Brother.")] };
        });
        var arzawa = new Sleeper(_ => new TurnSubmission(), (a, _) => new HostReply { Speech = "Welcome.", End = a.Round > 1 });
        var seats = Powers.All.ToDictionary(p => p, p => p switch
        {
            Power.Alashiya => alashiya,
            Power.Arzawa => arzawa,
            Power.Egypt => egypt,
            _ => (ISeat)new Scripted(),
        });
        var runner = new GameRunner(state, seats, new ScriptMind(), new TemplateNarrator()) { WriteChronicles = false };
        await runner.PrepareAsync();
        for (var i = 0; i < t; i++) await runner.PlayTurnAsync();

        // Arzawa's second exchange shows nothing of what Alashiya sent or chose in its own court that season.
        var second = Assert.Single(arzawa.Audiences, a => a.Turn == t && a.Round == 2);
        Assert.True(second.OrdersStand);
        Assert.False(second.ReopenChosen);
        Assert.Empty(second.LettersSent);
        Assert.True(Assert.Single(alashiya.Audiences, a => a.Turn == t && a.Round == 2).ReopenChosen);
        // Alashiya reopened and gives orders; Arzawa sleeps on; Alashiya's letter went out.
        Assert.Equal([1, t], alashiya.Calls);
        Assert.Equal([1], arzawa.Calls);
        Assert.Equal((true, false), (state.Sleep[Power.Alashiya].Courts.Single().Reopened, state.Sleep[Power.Arzawa].Courts.Single().Reopened));
        Assert.Equal(Power.Hatti, state.Char(sent!).MissionTarget);
    }
}
