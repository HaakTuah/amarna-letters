using System.Text.Json.Nodes;
using Amarna.Engine;
using Amarna.Game.Bots;
using Amarna.Llm;

namespace Amarna.Game.Tests;

/// <summary>A model king's record of earlier seasons: its notes, its own summary of older seasons, its ledger of dealings, and what each request shows.</summary>
public class LeaderMemoryTests
{
    /// <summary>Answers each request with the JSON the test gives for it, and keeps every request.</summary>
    private sealed class Scripted(Func<CallSpec, string> reply) : IJsonAsker
    {
        public List<CallSpec> Asked { get; } = new();

        public Task<JsonObject> AskJsonAsync(CallSpec spec, CancellationToken ct)
        {
            lock (Asked) Asked.Add(spec);
            return Task.FromResult(JsonNode.Parse(reply(spec))!.AsObject());
        }
    }

    private const string Host = """{"speech":"Tell your lord I am his brother.","gift_to_envoy":0,"gift_request":"","offer_service_wage":0,"seal_tablet":false,"detain_envoy":false,"send_gold_back":0,"gold_back_purity":100,"end_audience":true}""";

    /// <summary>An orders reply with these notes, summary and ledger lines, holding Hatti's capital.</summary>
    private static string Orders(string notes, string summary = "", params (string Court, string Entry)[] ledger) => new JsonObject
    {
        ["notes"] = notes,
        ["summary"] = summary,
        ["ledger"] = new JsonArray(ledger.Select(l => (JsonNode)new JsonObject { ["court"] = l.Court, ["entry"] = l.Entry }).ToArray()),
        ["units"] = new JsonArray(new JsonObject { ["unit"] = "hattusa", ["order"] = "hold", ["target"] = "", ["to"] = "" }),
        ["letters"] = new JsonArray(),
        ["other_orders"] = new JsonArray(),
    }.ToJsonString();

    private static readonly GameState Game = GameFactory.NewGame(5);

    private static SeatView View(int turn)
    {
        var v = Views.For(Game, Power.Hatti);
        v.Turn = turn;
        return v;
    }

    private static AudienceView Envoy(int turn) => new()
    {
        AudienceId = $"a{turn}", Turn = turn, Round = 1, MaxRounds = 2, From = Power.Egypt, Host = Power.Hatti,
        Envoy = new CharacterView { Id = "c90", Name = "Mane" }, Spoken = "My lord greets you.",
    };

    /// <summary>A seat that has given orders in turns 1..last, with notes "notes of turn N" (and a summary and ledger lines where given).</summary>
    private static async Task<(LlmLeaderSeat Seat, Scripted Asker)> Played(int last, Func<int, string>? summary = null, Func<int, string>? notes = null,
        Func<int, (string Court, string Entry)[]>? ledger = null)
    {
        var turn = 0;
        var asker = new Scripted(spec => spec.Key.Contains("/aud/") ? Host
            : Orders(notes?.Invoke(turn) ?? $"notes of turn {turn}", summary?.Invoke(turn) ?? "", ledger?.Invoke(turn) ?? []));
        var seat = new LlmLeaderSeat(Power.Hatti, asker, "m", "medium", true, Game.Config);
        for (turn = 1; turn <= last; turn++) await seat.DecideAsync(View(turn), default);
        return (seat, asker);
    }

    private static string LastOrdersRequest(Scripted asker) => asker.Asked.Last(s => s.Key.Contains("/orders/")).User;

    [Fact]
    public async Task Notes_are_kept_up_to_two_thousand_characters_and_the_schema_says_so()
    {
        var long_ = string.Concat(Enumerable.Repeat("plan ", 600)); // 3,000 characters
        var (seat, asker) = await Played(1, notes: _ => long_);
        await seat.DecideAsync(View(2), default);
        var request = LastOrdersRequest(asker);
        var line = request.Split('\n').Single(l => l.StartsWith("turn 1 notes: ", StringComparison.Ordinal));
        var kept = line["turn 1 notes: ".Length..].TrimEnd('\r');
        Assert.EndsWith("…", kept);
        Assert.True(kept.Length <= LeaderJournal.NotesMax + 1);
        Assert.StartsWith(long_[..1990], kept);
        Assert.Contains("at most 2,000 characters (longer notes are cut)", Schemas.LeaderOrders(Game.Config)["properties"]!["notes"]!["description"]!.GetValue<string>());
    }

    [Fact]
    public async Task An_orders_request_shows_the_last_three_seasons_in_full_and_says_which_notes_leave()
    {
        var (seat, asker) = await Played(4);
        await seat.DecideAsync(View(5), default);
        var request = LastOrdersRequest(asker);
        Assert.DoesNotContain("notes of turn 1", request);
        foreach (var t in new[] { 2, 3, 4 })
        {
            Assert.Contains($"turn {t} notes: notes of turn {t}", request);
            Assert.Contains($"turn {t} orders: hattusa holds", request);
        }
        Assert.Contains("Your notes from turn 2 leave this record after this season; keep what you need in your summary.", request);
        // No summary was written, and turn 1 has left: the king is told so.
        Assert.Contains("YOUR SUMMARY OF EARLIER SEASONS: you have written none, and your notes from turn 1 and before have left this record.", request);

        // With fewer than three seasons behind it, nothing leaves yet.
        var (early, earlyAsker) = await Played(2);
        await early.DecideAsync(View(3), default);
        Assert.DoesNotContain("leave this record", LastOrdersRequest(earlyAsker));
        Assert.DoesNotContain("YOUR SUMMARY", LastOrdersRequest(earlyAsker));
    }

    [Fact]
    public async Task The_summary_is_kept_when_empty_and_replaced_when_given()
    {
        // Turn 2 writes a summary, turn 3 leaves it empty, turn 5 replaces it.
        var (seat, asker) = await Played(4, summary: t => t == 2 ? "Egypt owes me 50; Mitanni is false." : "");
        await seat.DecideAsync(View(5), default);
        var request = LastOrdersRequest(asker);
        Assert.Contains("YOUR SUMMARY OF EARLIER SEASONS (your own words, turn 2): Egypt owes me 50; Mitanni is false.", request);
        // The summary comes first in the record, before the seasons shown in full.
        Assert.True(request.IndexOf("YOUR SUMMARY", StringComparison.Ordinal) < request.IndexOf("turn 2 notes:", StringComparison.Ordinal));

        var (again, againAsker) = await Played(5, summary: t => t switch { 2 => "old summary", 5 => "new summary", _ => "  " });
        await again.DecideAsync(View(6), default);
        var latest = LastOrdersRequest(againAsker);
        Assert.Contains("YOUR SUMMARY OF EARLIER SEASONS (your own words, turn 5): new summary", latest);
        Assert.DoesNotContain("old summary", latest);

        // A summary longer than the cap is cut, like notes.
        var (cut, cutAsker) = await Played(1, summary: _ => new string('s', 2500));
        await cut.DecideAsync(View(2), default);
        Assert.Contains(new string('s', LeaderJournal.SummaryMax) + "…", LastOrdersRequest(cutAsker));
        Assert.DoesNotContain(new string('s', LeaderJournal.SummaryMax + 1), LastOrdersRequest(cutAsker));
    }

    [Fact]
    public async Task An_audience_request_carries_the_summary_and_the_last_two_seasons_notes()
    {
        var (seat, asker) = await Played(3, summary: t => t == 3 ? "Babylon is my friend." : "");
        await seat.HostAudienceAsync(Envoy(4), View(4), default);
        var request = asker.Asked.Last().User;
        Assert.Contains("YOUR SUMMARY OF EARLIER SEASONS (your own words, turn 3): Babylon is my friend.", request);
        Assert.Contains("turn 2 notes: notes of turn 2", request);
        Assert.Contains("turn 3 notes: notes of turn 3", request);
        Assert.DoesNotContain("notes of turn 1", request);
        Assert.DoesNotContain("orders: hattusa holds", request);

        // The audience then joins the record of the season's orders.
        await seat.DecideAsync(View(4), default);
        await seat.DecideAsync(View(5), default);
        Assert.Contains("turn 4 audiences: Egypt's envoy Mane: you said \"Tell your lord I am his brother.\"", LastOrdersRequest(asker));
    }

    [Fact]
    public void The_model_path_reads_the_summary_and_the_rulebook_explains_the_record()
    {
        var sub = Parse.Orders(JsonNode.Parse(Orders("n", "  what I have learned  "))!.AsObject());
        Assert.Equal("what I have learned", sub.Summary);
        Assert.Equal("", Parse.Orders(JsonNode.Parse("""{"notes":"n","units":[],"letters":[],"other_orders":[]}""")!.AsObject()).Summary);
        var schema = Schemas.LeaderOrders(Game.Config);
        Assert.Contains("summary", schema["required"]!.AsArray().Select(x => x!.GetValue<string>()));
        Assert.Contains("It replaces your previous summary; leave it empty to keep it.", schema["properties"]!["summary"]!["description"]!.GetValue<string>());
        Assert.Contains("Each set of orders shows you the notes, audiences and orders of the last three seasons you gave orders, in full; older notes then leave your record, so keep what you still need in your summary",
            Prompts.LeaderRules(true, Game.Config));
    }

    [Fact]
    public async Task The_summary_and_ledger_are_logged_with_the_orders_and_a_replay_reads_them()
    {
        // Asked every season, so that every season has its orders.
        var state = GameFactory.NewGame(4, new GameConfig { MinTurns = 3, EndChance = 1.0, CatastropheChance = 0, SleepingSeats = false });
        var asker = new Scripted(spec => spec.Key.Contains("/aud/") ? Host : Orders($"notes {spec.Turn}", $"summary written in turn {spec.Turn}", ("Egypt", $"ledger line of turn {spec.Turn}")));
        var bot = new ScriptLeader(4);
        var seats = Powers.All.ToDictionary(p => p, p => p == Power.Hatti ? new LlmLeaderSeat(p, asker, "m", "medium", true, state.Config) : (ISeat)bot);
        var runner = new GameRunner(state, seats, new ScriptMind(), new TemplateNarrator()) { WriteChronicles = false };
        await runner.PrepareAsync();
        while (await runner.PlayTurnAsync()) { }

        var log = GameLog.FromJsonl(runner.Log.ToJsonl());
        Assert.True(log.TryGet<TurnSubmission>("t2/orders/Hatti", out var logged));
        Assert.Equal("summary written in turn 2", logged.Summary);
        Assert.Equal(new LedgerLine(Power.Egypt, "ledger line of turn 2"), Assert.Single(logged.Ledger));
        var replay = GameRunner.ForReplay(log);
        replay.WriteChronicles = false;
        await replay.PrepareAsync();
        while (await replay.PlayTurnAsync()) { }
        Assert.Equal(Json.Hash(runner.State), Json.Hash(replay.State));
    }

    [Fact]
    public async Task The_ledger_keeps_a_line_per_court_that_an_entry_replaces_and_an_empty_entry_removes()
    {
        var (seat, asker) = await Played(3, ledger: t => t switch
        {
            1 => [("Mitanni", "Promised 50 shekels for peace."), ("Egypt", "Sealed peace in turn 1.")],
            2 => [("Egypt", "Broke the peace: took gaza."), ("Babylonia", "Paid me 30, as promised.")],
            3 => [("Mitanni", "  "), ("Arzawa", new string('a', 900))],
            _ => [],
        });
        await seat.DecideAsync(View(4), default);
        var request = LastOrdersRequest(asker);
        Assert.Contains("YOUR LEDGER OF DEALINGS (your own words, per court: what was promised, sealed, broken and paid; each line with the season you last wrote it):", request);
        Assert.Contains("- Egypt (turn 2): Broke the peace: took gaza.", request);
        Assert.Contains("- Babylonia (turn 2): Paid me 30, as promised.", request);
        Assert.DoesNotContain("Sealed peace in turn 1", request);
        Assert.DoesNotContain("Mitanni (turn", request);
        Assert.Contains("- Arzawa (turn 3): " + new string('a', LeaderJournal.LedgerEntryMax) + "…", request);
        // One line per court, in the fixed order of the powers, whatever order they were written in.
        Assert.True(request.IndexOf("- Egypt (turn", StringComparison.Ordinal) < request.IndexOf("- Babylonia (turn", StringComparison.Ordinal));
        Assert.True(request.IndexOf("- Babylonia (turn", StringComparison.Ordinal) < request.IndexOf("- Arzawa (turn", StringComparison.Ordinal));
        // The ledger is carried in full, however long ago a line was written: it never leaves with the notes.
        var (later, laterAsker) = await Played(6, ledger: t => t == 1 ? [("Assyria", "Owes me a fleet.")] : []);
        await later.DecideAsync(View(7), default);
        Assert.Contains("- Assyria (turn 1): Owes me a fleet.", LastOrdersRequest(laterAsker));
        Assert.DoesNotContain("notes of turn 1", LastOrdersRequest(laterAsker));
    }

    [Fact]
    public async Task The_ledger_is_carried_into_audience_requests()
    {
        var (seat, asker) = await Played(2, ledger: t => t == 2 ? [("Egypt", "Sent Mane with 40 shekels; no tablet yet.")] : []);
        await seat.HostAudienceAsync(Envoy(3), View(3), default);
        var request = asker.Asked.Last().User;
        Assert.Contains("- Egypt (turn 2): Sent Mane with 40 shekels; no tablet yet.", request);
        Assert.True(request.IndexOf("YOUR LEDGER OF DEALINGS", StringComparison.Ordinal) < request.IndexOf("AN AUDIENCE", StringComparison.Ordinal));

        // Before anything is written, the request says so in one line.
        var (fresh, freshAsker) = await Played(1);
        await fresh.HostAudienceAsync(Envoy(2), View(2), default);
        Assert.Contains("YOUR LEDGER OF DEALINGS (your own words, per court: what was promised, sealed, broken and paid; each line with the season you last wrote it): nothing written yet.", freshAsker.Asked.Last().User);
    }

    [Fact]
    public void The_model_path_reads_the_ledger_and_the_schema_and_rulebook_explain_it()
    {
        var sub = Parse.Orders(JsonNode.Parse(Orders("n", "", ("Hatti", " Swore friendship. "), ("Assyria", "")))!.AsObject());
        Assert.Equal([new LedgerLine(Power.Hatti, "Swore friendship."), new LedgerLine(Power.Assyria, "")], sub.Ledger);
        var schema = Schemas.LeaderOrders(Game.Config);
        Assert.Contains("ledger", schema["required"]!.AsArray().Select(x => x!.GetValue<string>()));
        var ledger = schema["properties"]!["ledger"]!;
        Assert.Contains("An entry replaces that court's line, an empty entry removes it", ledger["description"]!.GetValue<string>());
        Assert.Equal(Powers.All.Select(p => p.ToString()), ledger["items"]!["properties"]!["court"]!["enum"]!.AsArray().Select(x => x!.GetValue<string>()));
        Assert.Contains("At most 600 characters", ledger["items"]!["properties"]!["entry"]!["description"]!.GetValue<string>());
        Assert.Contains("Your ledger of dealings keeps one line per court in your own words (what was promised, sealed, broken and paid), shown in full whenever you give orders or hold an audience",
            Prompts.LeaderRules(true, Game.Config));
    }
}
