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
    [InlineData(80, 40, 70, 60, 10, true)]   // greedy and disloyal, skilled and not timid: keeps some and swaps
    [InlineData(80, 40, 55, 35, 10, true)]   // just skilled enough, just bold enough
    [InlineData(80, 40, 70, 30, 10, false)]  // timid: keeps some, dares not forge
    [InlineData(80, 40, 54, 60, 10, false)]  // without the forger's hand
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
        Assert.Equal((90, 90), (view.GoldStated, view.GoldWeighed));
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
        Assert.Contains("Faking the seal takes a forger's hand", Schemas.Present()["properties"]!["swap_inventory"]!["description"]!.GetValue<string>());
        Assert.Contains("\"swap_inventory\"", Schemas.Report().ToJsonString());
        var parsed = Parse.Present((System.Text.Json.Nodes.JsonObject)System.Text.Json.Nodes.JsonNode.Parse("""{"speech":"Hail.","keep_gold":15,"swap_inventory":true}""")!);
        Assert.Equal((15, true), (parsed.Skim, parsed.SwapInventory));
        var report = Parse.Report((System.Text.Json.Nodes.JsonObject)System.Text.Json.Nodes.JsonNode.Parse("""{"report":"Back.","keep_gold":5,"swap_inventory":true}""")!);
        Assert.Equal((5, true), (report.Number, report.SwapInventory));
    }
}
