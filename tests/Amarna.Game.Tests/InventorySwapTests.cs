using Amarna.Engine;
using Amarna.Game;
using Amarna.Game.Bots;
using Amarna.Llm;

namespace Amarna.Game.Tests;

/// <summary>Who swaps an inventory: script envoys by formula from their traits, model envoys for themselves.</summary>
public class InventorySwapTests
{
    private static Character Envoy(int greed, int loyalty, int competence, int courage) => new()
    {
        Id = "c1", Name = "Keliya", Origin = "Mitanni", Calling = "scribe", Status = CharacterStatus.Employed, Employer = Power.Egypt,
        Contract = new Contract { Wage = 10 },
        Traits = new Traits { Loyalty = loyalty, Greed = greed, Competence = competence, Ambition = 30, Courage = courage },
    };

    [Theory]
    [InlineData(80, 40, 70, 60, 12, true)]   // greedy and disloyal, skilled and not timid: keeps some and swaps
    [InlineData(80, 40, 55, 35, 12, true)]   // just skilled enough, just bold enough
    [InlineData(80, 40, 70, 30, 12, false)]  // timid: keeps some, dares not forge
    [InlineData(80, 40, 54, 60, 12, false)]  // without the forger's hand
    [InlineData(30, 40, 90, 60, 0, false)]   // keeps nothing, so has nothing to hide
    public async Task A_script_envoy_that_skims_swaps_the_inventory_if_it_has_the_hand_and_is_not_timid(int greed, int loyalty, int competence, int courage, int kept, bool swaps)
    {
        var envoy = Envoy(greed, loyalty, competence, courage);
        var ctx = new EnvoyContext { Self = envoy, Sender = Power.Egypt, Host = Power.Hatti, Dispatch = new Dispatch { Letter = "Greetings.", Gold = 100 }, Turn = 1, Seed = 1, ForgeMinCompetence = 55 };
        var present = await new ScriptMind().PresentAsync(ctx, default);
        Assert.Equal((kept, swaps), (present.Skim, present.SwapInventory));

        // The same on the way home, with the gold a host sent back.
        var home = new MindContext
        {
            Request = new MindRequest { Task = MindTask.EnvoyReport, CharacterId = envoy.Id, Court = Power.Egypt, Cargo = new HomeCargo { Gold = 100, GoldStated = 100 } },
            Self = envoy, Turn = 3, Seed = 1, ForgeMinCompetence = 55,
        };
        var report = await new ScriptMind().WriteAsync(home, default);
        Assert.Equal((kept, swaps), (report.Number, report.SwapInventory));
    }

    /// <summary>
    /// A greedy, disloyal script envoy keeps a share of the small lots kings send, rounded to the shekel. Until version 5 it
    /// was rounded down to fives, which kept nothing from the 20, 25 and 60 shekels in greedy, disloyal hands in the second
    /// agent simulation (the first three rows).
    /// </summary>
    [Theory]
    [InlineData(20, 85, 40, 3)]
    [InlineData(25, 85, 40, 4)]
    [InlineData(60, 70, 56, 5)]
    [InlineData(20, 61, 59, 1)]   // the least greedy who skims
    [InlineData(11, 61, 59, 0)]   // a lot too small for him
    [InlineData(3, 100, 0, 1)]
    [InlineData(60, 100, 0, 12)]  // a fifth at most
    [InlineData(60, 60, 0, 0)]    // not greedy enough
    [InlineData(60, 90, 60, 0)]   // too loyal
    [InlineData(0, 90, 0, 0)]
    public async Task A_greedy_disloyal_script_envoy_keeps_a_share_of_the_small_lots_kings_send(int gold, int greed, int loyalty, int kept)
    {
        var envoy = Envoy(greed, loyalty, 70, 60);
        Assert.Equal(kept, ScriptMind.Kept(gold, envoy.Traits));
        var ctx = new EnvoyContext { Self = envoy, Sender = Power.Egypt, Host = Power.Hatti, Dispatch = new Dispatch { Letter = "Greetings.", Gold = gold }, Turn = 1, Seed = 1, ForgeMinCompetence = 55 };
        Assert.Equal(kept, (await new ScriptMind().PresentAsync(ctx, default)).Skim);
        var home = new MindContext
        {
            Request = new MindRequest { Task = MindTask.EnvoyReport, CharacterId = envoy.Id, Court = Power.Egypt, Cargo = new HomeCargo { Gold = gold, GoldStated = gold } },
            Self = envoy, Turn = 3, Seed = 1, ForgeMinCompetence = 55,
        };
        Assert.Equal(kept, (await new ScriptMind().WriteAsync(home, default)).Number);
    }

    /// <summary>
    /// An envoy that kept some of the gold, with no hand to hide it, leaves the host's complaint about the weighing out of
    /// its report, and only then: its lord is not to hear that the lot came light.
    /// </summary>
    [Fact]
    public async Task A_script_envoy_that_kept_some_of_the_gold_leaves_the_hosts_complaint_out_of_its_report()
    {
        var envoy = Envoy(80, 40, 40, 60);
        const string host = "Welcome, envoy. The inventory lists 40 shekels, but my weighers found only 34. Either your lord is mean or your messenger's hands are heavy with my gold. Go in peace.";
        async Task<string> Report(params string[] outcomes) => (await new ScriptMind().WriteAsync(new MindContext
        {
            Request = new MindRequest { Task = MindTask.EnvoyReport, CharacterId = envoy.Id, Court = Power.Egypt, Cargo = new HomeCargo() },
            Self = envoy, Turn = 3, Seed = 1,
            Trail = new MessageTrail { Id = "m1", Turn = 1, From = Power.Egypt, To = Power.Hatti, Exchanges = [new Exchange { Host = host, Envoy = "I hear you." }], Outcomes = outcomes.ToList() },
        }, default)).Text;

        var kept = await Report("kept 6 shekels of the gold");
        Assert.Contains("The king said, in short: \"Welcome, envoy. Go in peace.\"", kept);
        Assert.DoesNotContain("weighers", kept);
        Assert.DoesNotContain("hands are heavy", kept);
        Assert.Contains("my weighers found only 34. Either your lord is mean or your messenger's hands are heavy with my gold.", await Report());
        Assert.True(TextKit.SpeaksOfWeighing("The lot came short of its inventory."));
        Assert.False(TextKit.SpeaksOfWeighing("I thank you for the gold you sent."));
    }

    /// <summary>Sends one envoy with 100 shekels to Hatti in the first season.</summary>
    private sealed class Sender(string envoyId) : ISeat
    {
        public string Label => "Sender";
        public Task<TurnSubmission> DecideAsync(SeatView view, CancellationToken ct) => Task.FromResult(view.Turn == 1
            ? new TurnSubmission { Orders = [new DispatchOrder(envoyId, Power.Hatti, "Greetings, brother.", Gold: 100)] }
            : new TurnSubmission());
        public Task<HostReply> HostAudienceAsync(AudienceView view, SeatView court, CancellationToken ct) => Task.FromResult(new HostReply { End = true });
    }

    /// <summary>Keeps every audience view it is shown.</summary>
    private sealed class Host : ISeat
    {
        public List<AudienceView> Views { get; } = new();
        public string Label => "Host";
        public Task<TurnSubmission> DecideAsync(SeatView view, CancellationToken ct) => Task.FromResult(new TurnSubmission());
        public Task<HostReply> HostAudienceAsync(AudienceView view, SeatView court, CancellationToken ct)
        {
            lock (Views) Views.Add(view);
            return Task.FromResult(new HostReply { Speech = "Welcome.", End = true });
        }
    }

    private sealed class Idle : ISeat
    {
        public string Label => "Idle";
        public Task<TurnSubmission> DecideAsync(SeatView view, CancellationToken ct) => Task.FromResult(new TurnSubmission());
        public Task<HostReply> HostAudienceAsync(AudienceView view, SeatView court, CancellationToken ct) => Task.FromResult(new HostReply { End = true });
    }

    [Fact]
    public async Task A_swap_decided_at_the_audience_is_logged_shown_to_the_host_as_the_forgery_and_replays_exactly()
    {
        var state = GameFactory.NewGame(5, new GameConfig { CatastropheChance = 0, MinTurns = 40 });
        var envoy = state.Characters.First(c => c.Employer == Power.Egypt);
        envoy.SecretMaster = null;
        (envoy.Traits.Greed, envoy.Traits.Loyalty, envoy.Traits.Competence, envoy.Traits.Courage) = (80, 40, 70, 60);
        var host = new Host();
        var seats = Powers.All.ToDictionary(p => p, p => p switch
        {
            Power.Egypt => new Sender(envoy.Id),
            Power.Hatti => host,
            _ => (ISeat)new Idle(),
        });
        var runner = new GameRunner(state, seats, new ScriptMind(), new TemplateNarrator()) { WriteChronicles = false };
        await runner.PrepareAsync();
        for (var i = 0; i < 4 && host.Views.Count == 0; i++) await runner.PlayTurnAsync();

        var view = Assert.Single(host.Views);
        Assert.Equal((88, 88), (view.GoldStated, view.GoldWeighed));
        Assert.Contains(runner.Log.Decisions, d => d.Key.EndsWith("/present", StringComparison.Ordinal) && d.Json.Contains("\"swapInventory\":true", StringComparison.Ordinal));
        Assert.True(state.Tablets.Single(t => t.Inventory).Forged);

        // Replayed from its log (on the same game, the envoy as greedy), the game comes out the same: no seat or mind is asked.
        var again = GameFactory.NewGame(5, new GameConfig { CatastropheChance = 0, MinTurns = 40 });
        var same = again.Characters.Single(c => c.Id == envoy.Id);
        same.SecretMaster = null;
        (same.Traits.Greed, same.Traits.Loyalty, same.Traits.Competence, same.Traits.Courage) = (80, 40, 70, 60);
        var replay = new GameRunner(again, Powers.All.ToDictionary(p => p, _ => (ISeat)new Idle()), new ScriptMind(), new TemplateNarrator(),
            replay: GameLog.FromJsonl(runner.Log.ToJsonl())) { WriteChronicles = false };
        await replay.PrepareAsync();
        while (again.Turn < state.Turn) await replay.PlayTurnAsync();
        Assert.Equal(Json.Hash(state), Json.Hash(again));
    }

    [Fact]
    public void A_model_envoy_decides_for_itself_and_reads_what_a_swap_takes()
    {
        var present = Schemas.Present().ToJsonString();
        Assert.Contains("\"swap_inventory\"", present);
        Assert.Contains("can be found out if the king pays to have it examined", Schemas.Present()["properties"]!["swap_inventory"]!["description"]!.GetValue<string>());
        Assert.Contains("\"swap_inventory\"", Schemas.Report().ToJsonString());
        // Only a hand that can fake a seal is asked (since "Requests are rules too").
        Assert.DoesNotContain("\"swap_inventory\"", Schemas.Present(canForge: false).ToJsonString());
        Assert.DoesNotContain("\"swap_inventory\"", Schemas.Report(canForge: false).ToJsonString());
        var parsed = Parse.Present((System.Text.Json.Nodes.JsonObject)System.Text.Json.Nodes.JsonNode.Parse("""{"speech":"Hail.","keep_gold":15,"swap_inventory":true}""")!);
        Assert.Equal((15, true), (parsed.Skim, parsed.SwapInventory));
        var report = Parse.Report((System.Text.Json.Nodes.JsonObject)System.Text.Json.Nodes.JsonNode.Parse("""{"report":"Back.","keep_gold":5,"swap_inventory":true}""")!);
        Assert.Equal((5, true), (report.Number, report.SwapInventory));
        Assert.Contains("Only if you keep some of the gold but not all of it", Schemas.Present()["properties"]!["swap_inventory"]!["description"]!.GetValue<string>());
    }

    /// <summary>A model character over the simulated API, and the user text of each request it made.</summary>
    internal static (LlmCharacterMind Mind, Func<List<string>> Prompts) ModelMind()
    {
        var fake = new SimulatedAnthropic();
        var mind = new LlmCharacterMind(new ClaudeClient("sk-ant-test-0000", _ => { }, browser: true, fake));
        return (mind, () => fake.Requests.Select(r => r.Body["messages"]![0]!["content"]!.GetValue<string>()).ToList());
    }

    [Theory]
    [InlineData(70, "You could quietly keep some before it is weighed and, if you leave some, hand over in place of the inventory one you forge yourself, stating only what is left. Your hand is skilled enough to fake a seal.")]
    // Without the skill it is not offered the swap at all (since "Requests are rules too"), only told that a shortfall shows.
    [InlineData(54, "You could quietly keep some before it is weighed, but your hand is not skilled enough to fake a seal, so you could not pass off a forged inventory: what you keep would show as gold missing against the inventory.")]
    public async Task A_model_envoy_carrying_gold_is_told_whether_its_hand_can_fake_a_seal(int competence, string hand)
    {
        var (mind, prompts) = ModelMind();
        var envoy = Envoy(80, 40, competence, 60);
        await mind.PresentAsync(new EnvoyContext { Self = envoy, Sender = Power.Egypt, Host = Power.Hatti, Dispatch = new Dispatch { Letter = "Greetings.", Gold = 100 }, Turn = 1, Seed = 1, ForgeMinCompetence = 55 }, default);
        await mind.WriteAsync(new MindContext
        {
            Request = new MindRequest { Task = MindTask.EnvoyReport, CharacterId = envoy.Id, Court = Power.Egypt, Cargo = new HomeCargo { Gold = 60, GoldStated = 60 } },
            Self = envoy, Turn = 3, Seed = 1, ForgeMinCompetence = 55,
        }, default);
        Assert.All(prompts(), p => Assert.Contains(hand, p));
        Assert.Equal(2, prompts().Count);

        // Without gold there is nothing to keep or swap, and nothing is said of its hand.
        var (bare, barePrompts) = ModelMind();
        await bare.PresentAsync(new EnvoyContext { Self = envoy, Sender = Power.Egypt, Host = Power.Hatti, Dispatch = new Dispatch { Letter = "Greetings." }, Turn = 1, Seed = 1, ForgeMinCompetence = 55 }, default);
        Assert.DoesNotContain("fake a seal", Assert.Single(barePrompts()));
    }

    [Fact]
    public async Task A_model_spy_is_told_of_the_copies_that_come_home_with_its_report_not_of_one_its_master_already_held()
    {
        var spy = Envoy(30, 80, 70, 60);
        SpyReport Report() => new() { SpyId = spy.Id, Court = Power.Assyria, Observations = ["Assyria musters chariots."], ObservedTurn = 2, TabletIds = ["t900"] };
        MindContext Ctx(List<string> copies) => new()
        {
            Request = new MindRequest { Task = MindTask.SpyReport, CharacterId = spy.Id, Court = Power.Egypt, Report = Report(), CopyIds = copies },
            Self = spy, Turn = 3, Seed = 1,
        };

        var (mind, prompts) = ModelMind();
        await mind.WriteAsync(Ctx(["k5"]), default);
        Assert.Contains("You also copied a tablet from the court's archive (you remember what it says); the copy goes home with this report, whatever you write.", Assert.Single(prompts()));

        // Its master came to hold that tablet meanwhile: no copy is added, and the spy is not told that one goes home.
        var (held, heldPrompts) = ModelMind();
        await held.WriteAsync(Ctx([]), default);
        Assert.DoesNotContain("You also copied", Assert.Single(heldPrompts()));
    }
}
