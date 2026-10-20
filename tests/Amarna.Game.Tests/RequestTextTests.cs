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
    public async Task A_characters_trait_words_follow_its_traits_as_they_are_now()
    {
        var envoy = Envoy(loyalty: 80, greed: 20);
        envoy.Facts.Add(new Fact { Id = "f1", Text = "Keeps a lover in Ugarit.", Secrecy = Secrecy.Hidden, Tag = "lover" });
        envoy.Persona = Personas.Template(envoy);
        Assert.Contains("steadfast to whoever treats you fairly; indifferent to riches", envoy.Persona);
        Assert.Equal(envoy.Persona, Personas.Current(envoy));

        // Years unpaid and a court's gold: loyalty falls and greed rises. The template persona is rewritten in place.
        (envoy.Traits.Loyalty, envoy.Traits.Greed) = (30, 70);
        var now = Personas.Current(envoy);
        Assert.Contains("You are Keliya, born in Washukanni, once a scribe. You are loyal mostly to yourself; fond of gold and quick to see a profit;", now);
        Assert.Contains("What you want most: gold, enough to never serve again.", now);
        Assert.DoesNotContain("steadfast", now);
        Assert.DoesNotContain("to serve well and be trusted", now);
        // The rest stays as written, its secrets among them; the persona it was given is not changed.
        Assert.Contains("Things about yourself you do not volunteer: Keeps a lover in Ugarit.", now);
        Assert.EndsWith("You speak in the formal manner of a royal messenger of the Late Bronze Age.", now);
        Assert.Contains("steadfast", envoy.Persona);

        // What the model reads is the persona as it is now.
        var asker = new Recorder();
        await new LlmCharacterMind(asker).PresentAsync(Audience(envoy, 0), default);
        Assert.StartsWith(now, Assert.Single(asker.Calls).SeatSystem);

        // A persona the narrator wrote cannot be rewritten without a model: the trait words as they are now follow it.
        envoy.Persona = "You are Keliya, a scribe who has served one master faithfully all his life. You speak softly.";
        Assert.Equal(envoy.Persona + "\nAs you are now (where anything above differs, this is how you are now): you are loyal mostly to yourself; fond of gold and quick to see a profit; capable enough; hopeful of advancement; careful with powerful men. What you want most: gold, enough to never serve again.",
            Personas.Current(envoy));
    }

    /// <summary>Sends one envoy to Hatti in the first season; answers every audience plainly.</summary>
    private sealed class Sender(string envoyId) : ISeat
    {
        public string Label => "Sender";
        public Task<TurnSubmission> DecideAsync(SeatView view, CancellationToken ct) => Task.FromResult(view.Turn == 1
            ? new TurnSubmission { Orders = [new DispatchOrder(envoyId, Power.Hatti, "Greetings, brother.")] }
            : new TurnSubmission());
        public Task<HostReply> HostAudienceAsync(AudienceView view, SeatView court, CancellationToken ct) => Task.FromResult(new HostReply { End = true });
    }

    /// <summary>Hatti's king, who speaks of his copy of a tablet by his own mark and of a person by id.</summary>
    private sealed class Marker(string words) : ISeat
    {
        public string Label => "Marker";
        public Task<TurnSubmission> DecideAsync(SeatView view, CancellationToken ct) => Task.FromResult(new TurnSubmission());
        public Task<HostReply> HostAudienceAsync(AudienceView view, SeatView court, CancellationToken ct) =>
            Task.FromResult(new HostReply { Speech = words, Bribe = 5, BribeAsk = "Remember k901.", End = true });
    }

    private sealed class Idle : ISeat
    {
        public string Label => "Idle";
        public Task<TurnSubmission> DecideAsync(SeatView view, CancellationToken ct) => Task.FromResult(new TurnSubmission());
        public Task<HostReply> HostAudienceAsync(AudienceView view, SeatView court, CancellationToken ct) => Task.FromResult(new HostReply { End = true });
    }

    [Fact]
    public async Task A_hosts_marks_for_his_copies_reach_the_envoy_as_the_tablets_names()
    {
        var state = GameFactory.NewGame(5, new GameConfig { CatastropheChance = 0, MinTurns = 40 });
        state.Tablets.Add(new Tablet { Id = "t900", Text = "Peace.", ProposedBy = Power.Egypt, Partner = Power.Hatti, Seals = [Power.Egypt, Power.Hatti], CreatedTurn = 1, SealedTurn = 1 });
        state.Copies.Add(new TabletCopy { Id = "k901", TabletId = "t900", Holder = Power.Hatti, AcquiredTurn = 1, Source = "sealed at audience" });
        var envoy = state.Characters.First(c => c.Employer == Power.Egypt);
        envoy.SecretMaster = null;
        // Greedy enough to take the gift, so it remembers what was asked for it.
        (envoy.Traits.Greed, envoy.Traits.Loyalty) = (95, 10);
        var seats = Powers.All.ToDictionary(p => p, p => p switch
        {
            Power.Egypt => new Sender(envoy.Id),
            Power.Hatti => new Marker($"The peace of k901 holds, as {envoy.Id} knows."),
            _ => (ISeat)new Idle(),
        });
        var runner = new GameRunner(state, seats, new Bots.ScriptMind(), new Bots.TemplateNarrator()) { WriteChronicles = false };
        await runner.PrepareAsync();
        for (var i = 0; i < 4 && state.Trails.All(t => t.Exchanges.Count == 0); i++) await runner.PlayTurnAsync();

        var heard = state.Trails.Single().Exchanges.Single().Host;
        Assert.Equal($"The peace of the tablet sealed by Egypt and Hatti, dated turn 1 holds, as {envoy.Name} knows.", heard);
        // What it asked for a gift too; the log keeps the king's own words.
        Assert.Contains(envoy.Memory, m => m.Text.Contains("Remember the tablet sealed by Egypt and Hatti, dated turn 1."));
        Assert.Contains(runner.Log.Decisions, d => d.Key.EndsWith("/host/1", StringComparison.Ordinal) && d.Json.Contains("k901", StringComparison.Ordinal));
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
