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
    public async Task A_king_whose_title_names_his_land_is_not_named_twice()
    {
        var asker = new RequestTextTests.Recorder();
        var mind = new LlmCharacterMind(asker);
        await mind.PresentAsync(new EnvoyContext { Self = Envoy(), Sender = Power.Egypt, Host = Power.Alashiya, Dispatch = new Dispatch { Letter = "Greetings." }, Turn = 2, Seed = 1 }, default);
        await mind.WriteAsync(new MindContext
        {
            Request = new MindRequest { Task = MindTask.EnvoyReport, CharacterId = "c1", Court = Power.Alashiya, Cargo = new HomeCargo() },
            Self = Envoy(employer: Power.Alashiya), Turn = 4, Seed = 1,
        }, default);

        Assert.StartsWith("You have arrived at the court of the King of Alashiya, as the envoy of Napkhururiya of Egypt.", asker.Calls[0].User);
        Assert.StartsWith("You are home at the court of your lord, the King of Alashiya.", asker.Calls[1].User);
        Assert.All(asker.Calls, c => Assert.DoesNotContain("Alashiya of Alashiya", c.User));
        Assert.All(asker.Calls, c => Assert.DoesNotContain("Alashiya, king of Alashiya", c.User));
    }

    // ------------------------------------------------------------ kings

    private static AudienceView Court(int round = 1, bool tablet = false, bool sealedEarlier = false, int giftAccepted = 0, bool ordersStand = false, bool reopenChosen = false) => new()
    {
        AudienceId = "a1", Turn = 2, Round = round, MaxRounds = 2, From = Power.Hatti, Host = Power.Egypt,
        Envoy = new CharacterView { Id = "c3", Name = "Keliya" }, Spoken = "Greetings.", GiftAccepted = giftAccepted,
        Proposal = tablet ? new TabletView { Text = "Peace between us.", Seals = [Power.Hatti] } : null, ProposalSealed = sealedEarlier,
        OrdersStand = ordersStand, ReopenChosen = reopenChosen,
    };

    private static IEnumerable<string> Fields(JsonObject schema) => ((JsonObject)schema["properties"]!).Select(p => p.Key);

    [Fact]
    public void A_host_is_asked_only_what_applies_at_each_exchange_of_an_audience()
    {
        var c = new GameConfig();
        // No tablet brought: no question about sealing one.
        Assert.Equal(["speech", "gift_to_envoy", "gift_request", "offer_service_wage", "detain_envoy", "send_gold_back", "gold_back_purity", "end_audience", "ledger"],
            Fields(Schemas.HostReply(c, Court())));
        Assert.Contains("seal_tablet", Fields(Schemas.HostReply(c, Court(tablet: true))));
        // Chosen at an earlier exchange: sealed when the audience ends, and not asked again.
        Assert.DoesNotContain("seal_tablet", Fields(Schemas.HostReply(c, Court(round: 2, tablet: true, sealedEarlier: true))));
        Assert.Contains("You chose at an earlier exchange to seal the tablet the envoy brought (already sealed by Hatti), and your seal is set on it when the audience ends", Prompts.Audience(Court(round: 2, tablet: true, sealedEarlier: true)));
        // The envoy took a gift: another would not be given, so none is asked.
        var afterGift = Fields(Schemas.HostReply(c, Court(round: 2, giftAccepted: 20))).ToList();
        Assert.DoesNotContain("gift_to_envoy", afterGift);
        Assert.DoesNotContain("gift_request", afterGift);
        // At the last exchange the audience ends with the answer: no question of ending it.
        Assert.DoesNotContain("end_audience", afterGift);
        Assert.Contains("This is the last exchange of the audience: it ends with your answer.", Prompts.Audience(Court(round: 2)));
        // Woken for its audiences only, it may reopen its orders, until it has chosen to.
        Assert.Contains("reopen_orders", Fields(Schemas.HostReply(c, Court(ordersStand: true))));
        Assert.DoesNotContain("reopen_orders", Fields(Schemas.HostReply(c, Court(round: 2, ordersStand: true, reopenChosen: true))));
        Assert.Contains("letters", Fields(Schemas.HostReply(c, Court(round: 2, ordersStand: true, reopenChosen: true))));
    }

    [Fact]
    public async Task A_host_does_not_choose_what_it_was_not_asked_even_if_its_reply_says_so()
    {
        var reply = new JsonObject
        {
            ["speech"] = "Welcome.", ["gift_to_envoy"] = 30, ["gift_request"] = "Speak well of me.", ["offer_service_wage"] = 0, ["seal_tablet"] = true,
            ["detain_envoy"] = false, ["send_gold_back"] = 0, ["gold_back_purity"] = 100, ["end_audience"] = true, ["ledger"] = new JsonArray(),
        };
        var asker = new Answers(reply);
        var s = GameFactory.NewGame(1, new GameConfig { CatastropheChance = 0 });
        var king = new LlmLeaderSeat(Power.Egypt, asker, "file", "medium", true, s.Config);

        var late = await king.HostAudienceAsync(Court(round: 2, giftAccepted: 20), Views.For(s, Power.Egypt), default);
        Assert.Equal((0, "", false), (late.Bribe, late.BribeAsk, late.SealProposal));
        var first = await king.HostAudienceAsync(Court(tablet: true), Views.For(s, Power.Egypt), default);
        Assert.Equal((30, true, true), (first.Bribe, first.SealProposal, first.End));
    }

    [Fact]
    public void An_envoy_that_woke_the_king_is_not_said_to_wait_in_its_orders_request_after_the_audience()
    {
        var s = GameFactory.NewGame(1, new GameConfig { CatastropheChance = 0 });
        var v = Views.For(s, Power.Egypt);
        (v.Turn, v.Sleeps, v.LastCalled) = (3, true, 2);
        v.WokenBecause = [TurnEngine.EnvoyWaits(Power.Hatti), TurnEngine.ReopenReason];

        // At an audience the envoy came to his court (with two envoys, the first is received before the second's audience); by
        // his orders he has received him (audiences come first). Neither says the envoy still waits.
        Assert.Contains("an envoy of Hatti came to your court; you chose", Prompts.SleepLine(v));
        Assert.DoesNotContain("waits to be received", Prompts.SleepLine(v));
        Assert.StartsWith("You gave orders last season (turn 2). You were woken because: an envoy of Hatti came to your court (you received him before these orders); you chose at your audience to reopen your orders.\n",
            Prompts.Situation(v).ReplaceLineEndings("\n"));
        Assert.DoesNotContain("waits to be received", Prompts.Situation(v));

        // Held while its orders stand, after choosing to reopen them: they no longer stand.
        v.HoldsCourt = true;
        v.WokenBecause = [TurnEngine.EnvoyWaits(Power.Hatti)];
        Assert.EndsWith("You chose at an earlier audience this season to reopen your orders: you give orders after your audiences.", Prompts.SleepLine(v, reopenChosen: true));
        Assert.EndsWith("Your orders stand unless you reopen them at your audience.", Prompts.SleepLine(v));
    }

    [Fact]
    public void The_orders_request_names_only_what_the_king_can_order()
    {
        var s = GameFactory.NewGame(1, new GameConfig { CatastropheChance = 0, SleepingSeats = false });
        var v = Views.For(s, Power.Egypt);
        Assert.Contains(v.Court, c => c.Ready);
        Assert.Equal("Now give your orders for this season: your troops, your envoys and letters, and anything else.", Prompts.OrdersLine(v));
        v.Sleeps = true;
        Assert.Equal("Now give your orders for this season and the seasons ahead: your troops, your envoys and letters, orders scheduled for later seasons, standing orders, and anything else. You sleep after them.", Prompts.OrdersLine(v));

        // No troops and nobody at court to send: no troops or letters are offered.
        v.Sleeps = false;
        v.Units.RemoveAll(u => u.Power == Power.Egypt);
        foreach (var c in v.Court) c.Ready = false;
        Assert.Equal("Now give your orders for this season.", Prompts.OrdersLine(v));
        v.Court[0].Ready = true;
        Assert.Equal("Now give your orders for this season: your envoys and letters and anything else.", Prompts.OrdersLine(v));
    }

    [Fact]
    public void A_king_s_marks_for_its_gold_are_for_its_orders_and_its_scribes_write_them_as_the_gold()
    {
        var s = GameFactory.NewGame(1, new GameConfig { CatastropheChance = 0 });
        s.Treasuries[Power.Egypt].Lots.Add(new GoldLot { Id = "g900", From = Power.Hatti, Stated = 20, Face = 15, True = 15, ArrivedTurn = 3 });
        s.Treasuries[Power.Hatti].Lots.Add(new GoldLot { Id = "g901", From = Power.Egypt, Stated = 30, Face = 30, True = 30, ArrivedTurn = 3 });

        // The view names the lot by what it is, then gives the mark as the court's own.
        Assert.Contains("  Unassayed gold from Hatti, weighed in turn 3 [your mark g900]: 15 shekels weighed (the inventory said 20).", Prompts.Situation(Views.For(s, Power.Egypt)));
        Assert.Contains("Your treasury likewise marks each lot of unassayed gold (like g7), for your assay orders only.", Prompts.LeaderRules(true, s.Config));

        // In a letter, its own mark becomes the gold it names; another court's mark, and other text, stay as written.
        var e = new TurnEngine(s);
        Assert.Equal("The gold Hatti sent to Egypt, weighed in turn 3 was light; so was g901.", e.Scribe(Power.Egypt, "The gold g900 was light; so was g901."));
        // Two lots from the same court weighed in the same season are told apart by their inventories.
        s.Treasuries[Power.Egypt].Lots.Add(new GoldLot { Id = "g902", From = Power.Hatti, Stated = 40, Face = 40, True = 40, ArrivedTurn = 3 });
        Assert.Equal("Of the gold Hatti sent to Egypt, weighed in turn 3, its inventory stating 20 shekels, I say nothing.", e.Scribe(Power.Egypt, "Of g900, I say nothing."));
    }

    [Fact]
    public void The_rulebook_says_a_bracketed_note_after_a_report_is_the_court_s_own_not_the_writer_s_words()
    {
        var rules = Prompts.LeaderRules(true, new GameConfig());
        Assert.Contains("- In your news, a note in square brackets after a report or a pitch (what your weighers found against an inventory, the copies that came home with a spy's report, the wage a candidate asks) is your court's own record, not the words of the envoy, spy or candidate.", rules);
    }

    [Fact]
    public void A_letter_without_gold_or_a_tablet_says_its_purity_and_alliance_mark_are_not_asked_of_it()
    {
        var letter = (JsonObject)Schemas.LeaderOrders(new GameConfig())["properties"]!["letters"]!["items"]!["properties"]!;
        Assert.Contains("(100 when you send none)", letter["purity"]!["description"]!.GetValue<string>());
        Assert.StartsWith("Only with a tablet to seal (false without one)", letter["sworn_alliance"]!["description"]!.GetValue<string>());
        Assert.Contains("(100 when you send none)", Schemas.HostReply()["properties"]!["gold_back_purity"]!["description"]!.GetValue<string>());
    }

    [Fact]
    public async Task A_spy_writes_its_report_in_the_season_it_observed_not_the_season_the_report_arrives()
    {
        var asker = new RequestTextTests.Recorder();
        var mind = new LlmCharacterMind(asker);
        var spy = Envoy();
        spy.Facts.Add(new Fact { Id = "f1", Text = "Born in Washukanni.", Secrecy = Secrecy.Public });
        spy.Remember(3, "I watched the court of Assyria.");
        // Its report of season 3 was on the road when Assyria caught it and turned it.
        spy.Remember(5, "I was caught spying in Assyria.");
        spy.Facts.Add(new Fact { Id = "f2", Text = "Was caught by Assyria and now secretly serves it.", Secrecy = Secrecy.Deep, Tag = "turned" });
        spy.SecretMaster = Power.Assyria;

        await mind.WriteAsync(new MindContext
        {
            Request = new MindRequest
            {
                Task = MindTask.SpyReport, CharacterId = spy.Id, Court = Power.Egypt,
                Report = new SpyReport { SpyId = spy.Id, Court = Power.Assyria, Observations = ["Assyria musters chariots."], ObservedTurn = 3, FactCount = 1, SecretMaster = null },
            },
            Self = spy, Turn = 5, Seed = 1,
        }, default);

        var call = Assert.Single(asker.Calls);
        Assert.Contains("It is now season 3.", call.SeatSystem);
        Assert.DoesNotContain("season 5", call.SeatSystem);
        Assert.Contains("This season you observed: Assyria musters chariots.", call.User);
        // It writes as the spy it was then: not yet caught, and serving Egypt alone.
        Assert.Contains("Facts of your own life: Born in Washukanni.", call.SeatSystem);
        Assert.DoesNotContain("caught", call.SeatSystem);
        Assert.DoesNotContain("In secret you serve", call.SeatSystem);

        // A report made before the spy's past was kept shows its life as it is.
        await mind.WriteAsync(new MindContext
        {
            Request = new MindRequest { Task = MindTask.SpyReport, CharacterId = spy.Id, Court = Power.Egypt, Report = new SpyReport { SpyId = spy.Id, Court = Power.Assyria, Observations = ["Quiet."], ObservedTurn = 3 } },
            Self = spy, Turn = 5, Seed = 1,
        }, default);
        Assert.Contains("In secret you serve Assyria, and you protect its interests.", asker.Calls[1].SeatSystem);
    }

    [Fact]
    public void A_spy_s_report_keeps_what_the_spy_was_when_it_observed()
    {
        // The engine notes the spy's facts and secret master as it observes, for the report written when it arrives.
        var s = GameFactory.NewGame(3, new GameConfig { CatastropheChance = 0 });
        var spy = s.Characters.First(c => c.Employer == Power.Egypt && c.SecretMaster is null);
        var e = new TurnEngine(s);
        e.BeginTurn();
        e.Resolve(new Dictionary<Power, TurnSubmission> { [Power.Egypt] = new() { Orders = [new PlaceSpyOrder(spy.Id, Court: Power.Hatti)] } });
        SpyReport? report = null;
        for (var i = 0; i < 6 && report is null; i++)
        {
            e = new TurnEngine(s);
            e.BeginTurn();
            e.Resolve(new Dictionary<Power, TurnSubmission>());
            report = s.Journeys.FirstOrDefault(j => j.Kind == JourneyKind.SpyReport)?.Report;
        }
        Assert.NotNull(report);
        Assert.Equal(spy.Facts.Count, report!.FactCount);
        Assert.Null(report.SecretMaster);
    }
}
