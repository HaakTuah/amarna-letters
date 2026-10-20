using System.Text.Json.Nodes;
using Amarna.Engine;
using Amarna.Game;
using Amarna.Llm;

namespace Amarna.Game.Tests;

/// <summary>
/// The builder rule "Requests are rules too" (20 October 2026): models read their requests literally, so no field may imply
/// something that is not true. Each request asks only what applies, shows no internal id or number a king or character
/// could repeat, and keeps the engine's outcomes apart from a character's own words. These are the nudges the fix pass's
/// audit of every request found beyond the cases item 4 named (part 2 has those: <see cref="RequestTextTests"/>).
/// </summary>
public class RequestsAreRulesTests
{
    /// <summary>Answers every request with the reply given, and keeps the requests.</summary>
    private sealed class Answers(JsonObject reply) : IJsonAsker
    {
        public List<CallSpec> Calls { get; } = new();

        public Task<JsonObject> AskJsonAsync(CallSpec spec, CancellationToken ct)
        {
            lock (Calls) Calls.Add(spec);
            return Task.FromResult((JsonObject)reply.DeepClone());
        }
    }

    private static Character Envoy(int competence = 60, Power? employer = Power.Egypt) => new()
    {
        Id = "c1", Name = "Keliya", Origin = "Washukanni", Calling = "scribe", Status = employer is null ? CharacterStatus.Free : CharacterStatus.Employed,
        Employer = employer, Contract = employer is null ? null : new Contract { Wage = 10 }, At = Power.Hatti,
        Traits = new Traits { Loyalty = 50, Greed = 50, Competence = competence, Ambition = 40, Courage = 50 },
    };

    private static EnvoyContext Audience(Character envoy, int gold = 0, bool giftTaken = false) => new()
    {
        Self = envoy, Sender = Power.Egypt, Host = Power.Hatti, Dispatch = new Dispatch { Letter = "Greetings, brother.", Gold = gold },
        Turn = 2, Seed = 1, ForgeMinCompetence = 55, Delivered = "Greetings.", Round = 2, GiftTaken = giftTaken,
    };

    private static MindContext Report(Character envoy, int gold = 0, MessageTrail? trail = null) => new()
    {
        Request = new MindRequest { Task = MindTask.EnvoyReport, CharacterId = envoy.Id, Court = Power.Egypt, Cargo = new HomeCargo { Gold = gold, GoldStated = gold } },
        Self = envoy, Turn = 4, Seed = 1, ForgeMinCompetence = 55, Trail = trail,
    };

    [Fact]
    public async Task An_envoy_whose_hand_cannot_fake_a_seal_is_not_asked_whether_to_swap_the_inventory()
    {
        // It is asked how much to keep, and told the shortfall would show; a swap in its reply is not made.
        var asker = new Answers(new JsonObject { ["speech"] = "Words.", ["report"] = "Words.", ["keep_gold"] = 10, ["swap_inventory"] = true });
        var mind = new LlmCharacterMind(asker);
        var clumsy = Envoy(competence: 40);

        var present = await mind.PresentAsync(Audience(clumsy, gold: 40), default);
        var report = await mind.WriteAsync(Report(clumsy, gold: 30), default);

        Assert.Equal(["speech", "keep_gold"], RequestTextTests.Recorder.Fields(asker.Calls[0]));
        Assert.Equal(["report", "keep_gold"], RequestTextTests.Recorder.Fields(asker.Calls[1]));
        Assert.All(asker.Calls, call =>
        {
            Assert.DoesNotContain("hand over in place of the inventory", call.User);
            Assert.Contains("your hand is not skilled enough to fake a seal, so you could not pass off a forged inventory: what you keep would show as gold missing against the inventory.", call.User);
        });
        Assert.Equal((10, false), (present.Skim, present.SwapInventory));
        Assert.Equal((10, false), (report.Number, report.SwapInventory));

        // A skilled hand is asked, and the field no longer speaks of a hand that cannot.
        var skilled = new Answers(new JsonObject { ["speech"] = "Words.", ["keep_gold"] = 10, ["swap_inventory"] = true });
        Assert.True((await new LlmCharacterMind(skilled).PresentAsync(Audience(Envoy(competence: 70), gold: 40), default)).SwapInventory);
        Assert.Equal(["speech", "keep_gold", "swap_inventory"], RequestTextTests.Recorder.Fields(skilled.Calls[0]));
        Assert.DoesNotContain("you are told whether yours is one", Schemas.Present()["properties"]!["swap_inventory"]!["description"]!.GetValue<string>());
        Assert.Contains("if your hand can fake a seal, whether to swap its inventory tablet", LlmCharacterMind.SharedSystem);
    }

    [Fact]
    public async Task An_envoy_that_took_a_gift_is_not_asked_about_a_second_one_which_would_not_be_given()
    {
        var asker = new Answers(new JsonObject { ["speech"] = "Words.", ["accept_gift"] = true, ["commitments"] = "" });
        var mind = new LlmCharacterMind(asker);
        var host = new HostReply { Speech = "Take more.", Bribe = 20, BribeAsk = "Speak well of me." };

        var second = await mind.ReactAsync(Audience(Envoy(), giftTaken: true), host, default);
        var first = await mind.ReactAsync(Audience(Envoy()), host, default);

        Assert.Equal(["speech", "commitments"], RequestTextTests.Recorder.Fields(asker.Calls[0]));
        Assert.Contains("He offers you another gift of 20 shekels, but an envoy takes one gift at an audience and you have taken his already, so it will not be given.", asker.Calls[0].User);
        Assert.False(second.AcceptBribe);
        Assert.Equal(["speech", "accept_gift", "commitments"], RequestTextTests.Recorder.Fields(asker.Calls[1]));
        Assert.True(first.AcceptBribe);
    }

    [Fact]
    public async Task Gold_a_host_names_for_the_envoy_s_lord_is_not_said_to_be_sent_before_it_is()
    {
        var asker = new Answers(new JsonObject { ["speech"] = "Words.", ["commitments"] = "" });
        var mind = new LlmCharacterMind(asker);

        await mind.ReactAsync(Audience(Envoy()), new HostReply { Speech = "Take this home.", GoldBack = 30 }, default);
        await mind.ReactAsync(Audience(Envoy()), new HostReply { Speech = "Serve me, or take this home.", GoldBack = 30, JobOffer = 25 }, default);
        await mind.ReactAsync(Audience(Envoy()), new HostReply { Speech = "You stay.", GoldBack = 30, Detain = true }, default);

        // It is handed over when the audience ends, if the host can pay it and the envoy goes home: never "He sends".
        Assert.Contains("He names 30 shekels of gold to send home with you for your lord: it is handed to you when the audience ends, if his treasury can pay it.", asker.Calls[0].User);
        Assert.Contains("if his treasury can pay it and you go home to your lord.", asker.Calls[1].User);
        // A detained envoy takes nothing home, so it is not told of gold.
        Assert.DoesNotContain("30 shekels", asker.Calls[2].User);
        Assert.All(asker.Calls, call => Assert.DoesNotContain("He sends", call.User));
    }

    [Fact]
    public async Task An_envoy_that_was_never_received_is_not_asked_about_an_audience()
    {
        var asker = new RequestTextTests.Recorder();
        var mind = new LlmCharacterMind(asker);
        // It reached a court whose king was gone, and turned back: its trail has no audience.
        var trail = new MessageTrail { Id = "m1", Turn = 2, From = Power.Egypt, To = Power.Mitanni, EnvoyId = "c1", EnvoyName = "Keliya" };

        await mind.WriteAsync(Report(Envoy(), trail: trail), default);

        var user = Assert.Single(asker.Calls).User;
        Assert.Contains("You went to the court of Mitanni, but you were never received there: you came back without an audience.", user);
        Assert.DoesNotContain("You told its king", user);
    }

    [Fact]
    public async Task An_envoy_dismissed_while_away_reports_to_the_king_who_sent_it_who_is_no_longer_its_lord()
    {
        var asker = new RequestTextTests.Recorder();
        var mind = new LlmCharacterMind(asker);
        var dismissed = Envoy(competence: 70, employer: null);

        await mind.WriteAsync(Report(dismissed, gold: 20), default);

        var user = Assert.Single(asker.Calls).User;
        Assert.Contains("He dismissed you while you were away, so he is no longer your lord, but you report to him on the mission he gave you.", user);
        Assert.Contains("You carry back gold the king sent Napkhururiya", user);
        Assert.Contains("Write your report to him now.", user);
        Assert.DoesNotContain("home at the court of your lord", user);
        Assert.DoesNotContain("sent your lord", user);
        Assert.DoesNotContain("report to your lord", user);
    }

    [Fact]
    public async Task A_spy_writes_its_report_in_the_season_it_observed_not_the_season_the_report_arrives()
    {
        var asker = new RequestTextTests.Recorder();
        var mind = new LlmCharacterMind(asker);
        var spy = Envoy();
        spy.Remember(3, "I watched the court of Assyria.");
        spy.Remember(5, "I was caught spying in Assyria.");

        await mind.WriteAsync(new MindContext
        {
            Request = new MindRequest { Task = MindTask.SpyReport, CharacterId = spy.Id, Court = Power.Egypt, Report = new SpyReport { SpyId = spy.Id, Court = Power.Assyria, Observations = ["Assyria musters chariots."], ObservedTurn = 3 } },
            Self = spy, Turn = 5, Seed = 1,
        }, default);

        var call = Assert.Single(asker.Calls);
        Assert.Contains("It is now season 3.", call.SeatSystem);
        Assert.DoesNotContain("season 5", call.SeatSystem);
        Assert.Contains("This season you observed: Assyria musters chariots.", call.User);
    }
}
