using System.Text.Json.Nodes;
using Amarna.Engine;
using Amarna.Llm;

namespace Amarna.Game.Tests;

/// <summary>
/// What a model king reads of what he himself said, sent and sealed, after the second agent simulation (the fix pass after
/// item 4, part 2): his audience speeches and the tablets he holds in full, and his own letters in his record.
/// </summary>
public class KingRecordTests
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

    private static string Host(string speech) => new JsonObject
    {
        ["speech"] = speech, ["gift_to_envoy"] = 0, ["gift_request"] = "", ["offer_service_wage"] = 0, ["seal_tablet"] = false,
        ["detain_envoy"] = false, ["send_gold_back"] = 0, ["gold_back_purity"] = 100, ["end_audience"] = true,
    }.ToJsonString();

    private static string Orders(JsonArray? letters = null) => new JsonObject
    {
        ["notes"] = "", ["summary"] = "", ["ledger"] = new JsonArray(), ["units"] = new JsonArray(),
        ["letters"] = letters ?? new JsonArray(), ["other_orders"] = new JsonArray(),
    }.ToJsonString();

    private static AudienceView Envoy(int turn) => new()
    {
        AudienceId = $"a{turn}", Turn = turn, Round = 1, MaxRounds = 2, From = Power.Egypt, Host = Power.Hatti,
        Envoy = new CharacterView { Id = "c90", Name = "Mane" }, Spoken = "My lord greets you.",
    };

    private static SeatView View(GameState s, int turn)
    {
        var v = Views.For(s, Power.Hatti);
        v.Turn = turn;
        return v;
    }

    [Fact]
    public async Task A_kings_audience_speech_stays_in_his_record_in_full()
    {
        var speech = string.Concat(Enumerable.Repeat("I swear to keep my ships out of Cyprus and my armies out of Mira. ", 12)).Trim(); // about 800 characters
        var s = GameFactory.NewGame(5);
        var asker = new Scripted(spec => spec.Key.Contains("/aud/") ? Host(speech) : Orders());
        var seat = new LlmLeaderSeat(Power.Hatti, asker, "m", "medium", true, s.Config);
        await seat.DecideAsync(View(s, 1), default);
        await seat.HostAudienceAsync(Envoy(2), View(s, 2), default);
        // Before it gives orders again, a later audience shows it what it said at this one, in full.
        await seat.HostAudienceAsync(Envoy(2), View(s, 2), default);
        Assert.Contains($"you said \"{speech}\"", asker.Asked.Last().User);
        await seat.DecideAsync(View(s, 2), default);
        await seat.DecideAsync(View(s, 3), default);
        Assert.Contains($"turn 2 audiences: Egypt's envoy Mane: you said \"{speech}\"", asker.Asked.Last().User);
        Assert.DoesNotContain("…", asker.Asked.Last().User.Split('\n').Single(l => l.StartsWith("turn 2 audiences", StringComparison.Ordinal)));
    }

    [Fact]
    public async Task At_an_audience_a_king_reads_the_tablets_he_holds_in_full_by_their_names()
    {
        var text = string.Concat(Enumerable.Repeat("Hatti and Egypt shall not cross into each other's homeland, and the free cities between them stay free. ", 5)).Trim();
        var s = GameFactory.NewGame(5);
        s.Tablets.Add(new Tablet { Id = "t900", Text = text, ProposedBy = Power.Egypt, Partner = Power.Hatti, Seals = [Power.Egypt, Power.Hatti], CreatedTurn = 1, SealedTurn = 1 });
        s.Copies.Add(new TabletCopy { Id = "k901", TabletId = "t900", Holder = Power.Hatti, AcquiredTurn = 1, Source = "sealed at audience" });
        var asker = new Scripted(_ => Host("Welcome."));
        await new LlmLeaderSeat(Power.Hatti, asker, "m", "medium", true, s.Config).HostAudienceAsync(Envoy(2), View(s, 2), default);

        Assert.Contains($"Tablets you hold, in full: the tablet sealed by Egypt and Hatti, dated turn 1 [your copy k901]: \"{text}\"", Assert.Single(asker.Asked).User);
    }
}
