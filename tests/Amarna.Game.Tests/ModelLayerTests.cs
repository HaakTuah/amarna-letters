using System.Text.Json.Nodes;
using Amarna.Engine;
using Amarna.Game;
using Amarna.Llm;

namespace Amarna.Game.Tests;

public class ModelLayerTests
{
    private static (GameRunner Runner, SimulatedAnthropic Fake) Build(SeatChoices choices, ulong seed = 3, bool browser = true)
    {
        var fake = new SimulatedAnthropic();
        var state = GameFactory.NewGame(seed, new GameConfig { MinTurns = 3, EndChance = 1.0 });
        GameRunner? runner = null;
        var set = SeatSetup.Build(choices, state, "sk-ant-test-0000", browser, () => runner!.Log, fake);
        runner = new GameRunner(state, set.Seats, set.Minds, set.Narrator);
        return (runner, fake);
    }

    private static SeatChoices AllModels() => new()
    {
        Leaders = Powers.All.ToDictionary(p => p, p => p == Power.Egypt ? LeaderKind.Opus : LeaderKind.Sonnet),
        HaikuCharacters = true,
        SonnetNarrator = true,
    };

    [Fact]
    public async Task Requests_carry_the_key_the_browser_header_caching_schema_and_fallbacks()
    {
        // Hatti stays a script bot so that envoys are on the road (the fake leaders send none).
        var choices = AllModels();
        choices.Leaders[Power.Hatti] = LeaderKind.Script;
        var (runner, fake) = Build(choices);
        for (var i = 0; i < 4 && !runner.State.Ended; i++) await runner.PlayTurnAsync();

        Assert.NotEmpty(fake.Requests);
        foreach (var (req, body) in fake.Requests)
        {
            Assert.Equal("sk-ant-test-0000", req.Headers.GetValues("x-api-key").Single());
            Assert.Equal("true", req.Headers.GetValues("anthropic-dangerous-direct-browser-access").Single());
            Assert.Equal("json_schema", body["output_config"]!["format"]!["type"]!.GetValue<string>());
            Assert.Equal("ephemeral", body["system"]![0]!["cache_control"]!["type"]!.GetValue<string>());
        }

        var leader = fake.Requests.First(r => r.Body["model"]!.GetValue<string>() == ModelIds.Sonnet && r.Body["output_config"]!["format"]!["schema"]!["properties"]!.AsObject().ContainsKey("units"));
        Assert.Contains("server-side-fallback-2026-07-01", string.Join(",", leader.Request.Headers.GetValues("anthropic-beta")));
        Assert.Equal("default", leader.Body["fallbacks"]!.GetValue<string>());
        Assert.Contains(fake.Requests, r => r.Body["model"]!.GetValue<string>() == ModelIds.Opus);
        Assert.Contains(fake.Requests, r => r.Body["model"]!.GetValue<string>() == ModelIds.Haiku);

        var haiku = fake.Requests.Where(r => r.Body["model"]!.GetValue<string>() == ModelIds.Haiku).ToList();
        Assert.All(haiku, r => Assert.Null(r.Body["fallbacks"]));
    }

    [Fact]
    public async Task The_sdk_transport_sends_the_same_request_shape()
    {
        var choices = AllModels();
        choices.Leaders[Power.Hatti] = LeaderKind.Script;
        var (runner, fake) = Build(choices, browser: false);
        for (var i = 0; i < 3 && !runner.State.Ended; i++) await runner.PlayTurnAsync();
        Assert.Empty(runner.Errors);
        foreach (var (req, body) in fake.Requests)
        {
            Assert.Equal("sk-ant-test-0000", req.Headers.GetValues("x-api-key").Single());
            Assert.False(req.Headers.Contains("anthropic-dangerous-direct-browser-access"));
            Assert.Equal("json_schema", body["output_config"]!["format"]!["type"]!.GetValue<string>());
            Assert.Equal("ephemeral", body["system"]![0]!["cache_control"]!["type"]!.GetValue<string>());
        }
        var leader = fake.Requests.First(r => r.Body["model"]!.GetValue<string>() == ModelIds.Sonnet && r.Body["output_config"]!["format"]!["schema"]!["properties"]!.AsObject().ContainsKey("units"));
        Assert.Contains(ClaudeClient.FallbackBeta, string.Join(",", leader.Request.Headers.GetValues("anthropic-beta")));
        Assert.Equal("default", leader.Body["fallbacks"]!.GetValue<string>());
    }

    [Fact]
    public async Task Calls_are_logged_with_cost_and_the_game_replays_without_the_api()
    {
        var (runner, _) = Build(AllModels());
        await runner.PrepareAsync();
        while (await runner.PlayTurnAsync()) { }
        Assert.True(runner.State.Ended);
        Assert.NotEmpty(runner.Log.Calls);
        Assert.True(runner.Log.TotalCost > 0);
        Assert.All(runner.Log.Calls, c => Assert.Null(c.Error));
        Assert.Equal(7, runner.Chronicles.Count);

        var replay = GameRunner.ForReplay(GameLog.FromJsonl(runner.Log.ToJsonl()));
        await replay.PrepareAsync();
        while (await replay.PlayTurnAsync()) { }
        Assert.Equal(Json.Hash(runner.State), Json.Hash(replay.State));
    }

    [Fact]
    public async Task Unreadable_output_is_retried_once_then_falls_back_to_the_script()
    {
        var choices = new SeatChoices { Leaders = Powers.All.ToDictionary(p => p, p => p == Power.Hatti ? LeaderKind.Sonnet : LeaderKind.Script) };
        var (runner, fake) = Build(choices);
        var calls = 0;
        fake.Override = body =>
        {
            Interlocked.Increment(ref calls);
            return "this is not json";
        };
        await runner.PlayTurnAsync();
        Assert.Equal(2, calls);
        Assert.Contains(runner.Errors, e => e.Contains("orders/Hatti"));

        // Second attempt succeeds: no fallback.
        var (runner2, fake2) = Build(choices);
        var n = 0;
        fake2.Override = _ => Interlocked.Increment(ref n) == 1 ? "{oops" : null;
        await runner2.PlayTurnAsync();
        Assert.Empty(runner2.Errors);
        Assert.Contains("could not be read", fake2.Requests[1].Body["messages"]![0]!["content"]!.ToJsonString());
    }

    [Fact]
    public async Task A_refusal_falls_back_to_the_script_decision()
    {
        var choices = new SeatChoices { Leaders = Powers.All.ToDictionary(p => p, p => p == Power.Hatti ? LeaderKind.Sonnet : LeaderKind.Script) };
        var (runner, fake) = Build(choices);
        fake.Refuse = true;
        await runner.PlayTurnAsync();
        Assert.Contains(runner.Errors, e => e.Contains("declined"));
        Assert.Contains(runner.Log.Calls, c => c.Error == "refusal");
    }

    [Fact]
    public void A_characters_prompt_holds_only_its_own_secrets()
    {
        var state = GameFactory.NewGame(11);
        foreach (var c in state.Characters)
        {
            var self = LlmCharacterMind.Self(c, 1);
            foreach (var other in state.Characters.Where(o => o.Id != c.Id))
                foreach (var f in other.Facts.Where(f => f.Secrecy != Secrecy.Public && !c.Facts.Any(x => x.Text == f.Text)))
                    Assert.DoesNotContain(f.Text, self);
            foreach (var f in c.Facts) Assert.Contains(f.Text, self);
        }
    }

    [Fact]
    public async Task Envoy_requests_never_mention_other_characters_hidden_facts()
    {
        var choices = new SeatChoices { HaikuCharacters = true };
        var (runner, fake) = Build(choices, seed: 4);
        for (var i = 0; i < 6 && !runner.State.Ended; i++) await runner.PlayTurnAsync();
        var haiku = fake.Requests.Where(r => r.Body["model"]!.GetValue<string>() == ModelIds.Haiku).ToList();
        Assert.NotEmpty(haiku);
        foreach (var (_, body) in haiku)
        {
            var text = body.ToJsonString();
            var selfName = body["system"]![1]!["text"]!.GetValue<string>();
            var self = runner.State.Characters.First(c => selfName.Contains(c.Persona[..Math.Min(40, c.Persona.Length)]));
            foreach (var other in runner.State.Characters.Where(o => o.Id != self.Id))
                foreach (var f in other.Facts.Where(f => f.Secrecy == Secrecy.Deep && !self.Facts.Any(x => x.Text == f.Text)))
                    Assert.DoesNotContain(JsonValue.Create(f.Text)!.ToJsonString().Trim('"'), text);
        }
    }

    [Fact]
    public void Leader_output_becomes_ordinary_orders()
    {
        var json = JsonNode.Parse("""
        {
          "notes": "n",
          "units": [ { "unit": "memphis", "order": "move", "target": "Sinai", "to": "" },
                     { "unit": "delta", "order": "support", "target": "memphis", "to": "sinai" } ],
          "letters": [ { "envoy": "c3", "to": "Hatti", "message": "Peace.", "mandate": "peace", "gold": 50, "purity": 70,
                         "call_brother": false, "call_them_great_king": true, "claim_great_king": true, "your_name_first": true,
                         "omit_greeting": false, "tablet_to_seal": "Peace forever.", "sworn_alliance": true, "show_tablet_copies": [] } ],
          "other_orders": [ { "action": "raise_army", "province": "thebes", "power": "", "person": "", "amount": 0, "text": "", "item": "", "seals": [] },
                            { "action": "place_spy", "province": "", "power": "Mitanni", "person": "c4", "amount": 0, "text": "", "item": "", "seals": [] },
                            { "action": "forge", "province": "", "power": "", "person": "c4", "amount": 0, "text": "x", "item": "", "seals": ["Hatti","Assyria"] } ]
        }
        """)!.AsObject();
        var sub = Parse.Orders(json);
        Assert.Contains(sub.Orders, o => o is MoveOrder { Unit: "memphis", To: "sinai" });
        Assert.Contains(sub.Orders, o => o is SupportOrder { Unit: "delta", Supported: "memphis", To: "sinai" });
        var d = Assert.Single(sub.Orders.OfType<DispatchOrder>());
        Assert.Equal(Power.Hatti, d.To);
        Assert.Equal(70, d.PurityPercent);
        Assert.False(d.Greeting!.CallBrother);
        Assert.True(d.Greeting.SenderFirst);
        Assert.True(d.Proposal!.AllianceOath);
        Assert.Contains(sub.Orders, o => o is RaiseOrder { Province: "thebes", Kind: UnitKind.Army });
        Assert.Contains(sub.Orders, o => o is PlaceSpyOrder { Character: "c4", Court: Power.Mitanni });
        Assert.Contains(sub.Orders, o => o is ForgeOrder f && f.Seals.SequenceEqual(new[] { Power.Hatti, Power.Assyria }));
    }

    [Fact]
    public void Prompts_render_without_errors_and_rules_are_cache_stable()
    {
        var state = GameFactory.NewGame(2);
        var view = Views.For(state, Power.Babylonia);
        var text = Prompts.Situation(view);
        Assert.Contains("TREASURY", text);
        Assert.Contains("Babylonia (you)", text);
        Assert.Same(Prompts.LeaderRules(true, state.Config), Prompts.LeaderRules(true, state.Config));
        Assert.Contains("CUSTOMS OF THE AGE", Prompts.LeaderRules(true, state.Config));
        Assert.DoesNotContain("CUSTOMS OF THE AGE", Prompts.LeaderRules(false, state.Config));
        Assert.Contains("15% chance", Prompts.LeaderRules(false, state.Config));
    }

    [Fact]
    public void Pricing_matches_the_published_rates()
    {
        Assert.Equal(2.0 + 10.0, Price.For(ModelIds.Sonnet).Cost(1_000_000, 1_000_000, 0, 0), 6);
        Assert.Equal(0.20, Price.For(ModelIds.Opus).Cost(0, 0, 1_000_000, 0), 6);
        Assert.Equal(0.125, Price.For(ModelIds.Haiku).Cost(0, 0, 0, 1_000_000), 6);
    }
}
