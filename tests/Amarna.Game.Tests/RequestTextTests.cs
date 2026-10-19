using System.Text.Json.Nodes;
using Amarna.Engine;
using Amarna.Game;
using Amarna.Llm;

namespace Amarna.Game.Tests;

/// <summary>
/// What a model character is asked, after the second agent simulation's defects in the request texts (the fix pass after
/// item 4, part 2): the gold questions only when gold is carried, the envoy's own commitment kept apart from what the engine
/// records, and its trait words as its traits are now.
/// </summary>
public class RequestTextTests
{
    /// <summary>Keeps every request a model character makes and answers with the plainest reply its schema allows.</summary>
    internal sealed class Recorder : IJsonAsker
    {
        public List<CallSpec> Calls { get; } = new();

        public Task<JsonObject> AskJsonAsync(CallSpec spec, CancellationToken ct)
        {
            lock (Calls) Calls.Add(spec);
            var reply = new JsonObject();
            foreach (var (name, schema) in (JsonObject)spec.Schema["properties"]!)
                reply[name] = schema!["type"]!.GetValue<string>() switch
                {
                    "string" => "Words.",
                    "integer" => 0,
                    "boolean" => false,
                    _ => new JsonArray(),
                };
            return Task.FromResult(reply);
        }

        public static IEnumerable<string> Fields(CallSpec spec) => ((JsonObject)spec.Schema["properties"]!).Select(p => p.Key);
    }

    private static Character Envoy(int loyalty = 50, int greed = 50) => new()
    {
        Id = "c1", Name = "Keliya", Origin = "Washukanni", Calling = "scribe", Status = CharacterStatus.Employed, Employer = Power.Egypt,
        Contract = new Contract { Wage = 10 }, At = Power.Hatti,
        Traits = new Traits { Loyalty = loyalty, Greed = greed, Competence = 60, Ambition = 40, Courage = 50 },
    };

    private static EnvoyContext Audience(Character envoy, int gold) => new()
    {
        Self = envoy, Sender = Power.Egypt, Host = Power.Hatti, Dispatch = new Dispatch { Letter = "Greetings, brother.", Gold = gold },
        Turn = 2, Seed = 1, ForgeMinCompetence = 55, Delivered = "Greetings.",
    };

    private static MindContext Report(Character envoy, int gold, MessageTrail? trail = null) => new()
    {
        Request = new MindRequest { Task = MindTask.EnvoyReport, CharacterId = envoy.Id, Court = Power.Egypt, Cargo = new HomeCargo { Gold = gold, GoldStated = gold } },
        Self = envoy, Turn = 4, Seed = 1, ForgeMinCompetence = 55, Trail = trail,
    };

    [Fact]
    public async Task An_envoy_is_asked_what_it_keeps_of_the_gold_only_when_it_carries_gold()
    {
        var asker = new Recorder();
        var mind = new LlmCharacterMind(asker);
        var envoy = Envoy();

        await mind.PresentAsync(Audience(envoy, 0), default);
        await mind.PresentAsync(Audience(envoy, 40), default);
        await mind.WriteAsync(Report(envoy, 0), default);
        await mind.WriteAsync(Report(envoy, 25), default);

        var (bare, laden, home, homeLaden) = (asker.Calls[0], asker.Calls[1], asker.Calls[2], asker.Calls[3]);
        Assert.Equal(["speech"], Recorder.Fields(bare));
        Assert.Equal(["speech", "keep_gold", "swap_inventory"], Recorder.Fields(laden));
        Assert.Equal(["report"], Recorder.Fields(home));
        Assert.Equal(["report", "keep_gold", "swap_inventory"], Recorder.Fields(homeLaden));
        // Nor does its request speak of gold or of faking a seal when it carries none.
        Assert.DoesNotContain("gold", bare.User, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("gold", home.User, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("You carry gold in sealed bags", laden.User);
        Assert.Contains("You carry back gold the king sent your lord", homeLaden.User);
        // The shared text says the gold decisions come only with gold.
        Assert.Contains("only when you carry gold, how much of it to keep for yourself", LlmCharacterMind.SharedSystem);
        Assert.DoesNotContain("how much of the gold you carry to keep", LlmCharacterMind.SharedSystem);
    }

    [Fact]
    public async Task An_envoy_is_asked_whether_to_take_a_gift_or_a_post_only_when_one_is_offered()
    {
        var asker = new Recorder();
        var mind = new LlmCharacterMind(asker);
        var envoy = Envoy();

        await mind.ReactAsync(Audience(envoy, 0), new HostReply { Speech = "Welcome." }, default);
        await mind.ReactAsync(Audience(envoy, 0), new HostReply { Speech = "Take this.", Bribe = 10 }, default);
        await mind.ReactAsync(Audience(envoy, 0), new HostReply { Speech = "Serve me.", JobOffer = 30 }, default);

        Assert.Equal(["speech", "commitments"], Recorder.Fields(asker.Calls[0]));
        Assert.Equal(["speech", "accept_gift", "commitments"], Recorder.Fields(asker.Calls[1]));
        Assert.Equal(["speech", "accept_service", "commitments"], Recorder.Fields(asker.Calls[2]));
    }

    [Fact]
    public async Task An_envoys_own_promise_is_its_own_line_in_its_report_request_not_something_that_happened()
    {
        var asker = new Recorder();
        var mind = new LlmCharacterMind(asker);
        var envoy = Envoy();
        var trail = new MessageTrail
        {
            Id = "m1", Turn = 2, From = Power.Egypt, To = Power.Hatti, EnvoyId = envoy.Id, EnvoyName = envoy.Name, Delivered = "Greetings.",
            Exchanges = [new Exchange { Host = "I will think on it.", Envoy = "My lord will hold to it." }],
            Outcomes = ["accepted 10 shekels from Hatti", TurnEngine.CommittedPrefix + "the tablet sealed exactly as written"],
        };

        await mind.WriteAsync(Report(envoy, 0, trail), default);

        var user = Assert.Single(asker.Calls).User;
        var happened = user.Split('\n').Single(l => l.StartsWith("What happened: ", StringComparison.Ordinal));
        Assert.Equal("What happened: accepted 10 shekels from Hatti.", happened.TrimEnd());
        Assert.DoesNotContain("committed", user);
        Assert.Contains("What you yourself promised on your lord's behalf, in your own words at the audience (your promise, not anything the king did or sealed): \"the tablet sealed exactly as written\"", user);

        // With only its own promise, there is no "What happened" line at all.
        trail.Outcomes = [TurnEngine.CommittedPrefix + "nothing beyond the mandate"];
        await mind.WriteAsync(Report(envoy, 0, trail), default);
        Assert.DoesNotContain("What happened", asker.Calls[1].User);
        Assert.Contains("\"nothing beyond the mandate\"", asker.Calls[1].User);
    }

    [Fact]
    public void A_reply_without_the_gold_fields_keeps_nothing_and_swaps_nothing()
    {
        var present = Parse.Present((JsonObject)JsonNode.Parse("""{"speech":"Hail."}""")!);
        Assert.Equal((0, false), (present.Skim, present.SwapInventory));
        var report = Parse.Report((JsonObject)JsonNode.Parse("""{"report":"Back."}""")!);
        Assert.Equal((0, false), (report.Number, report.SwapInventory));
        var react = Parse.React((JsonObject)JsonNode.Parse("""{"speech":"Thank you.","commitments":""}""")!);
        Assert.Equal((false, false), (react.AcceptBribe, react.AcceptJob));
    }
}
