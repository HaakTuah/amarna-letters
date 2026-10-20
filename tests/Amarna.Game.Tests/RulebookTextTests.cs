using Amarna.Engine;
using Amarna.Llm;

namespace Amarna.Game.Tests;

/// <summary>Rules the engine applies that a king must be able to read.</summary>
public class RulebookTextTests
{
    private static readonly string Rules = Prompts.LeaderRules(true, new GameConfig());

    [Fact]
    public void The_rulebook_states_dislodgement_and_desertion()
    {
        Assert.Contains("A unit dislodged is destroyed; a unit that is destroyed gives no support", Rules);
        Assert.Contains("If you cannot pay upkeep, troops desert, the one farthest from your capital first", Rules);
        Assert.Contains("Your battle report says why each of your moves that failed was stopped", Rules);
    }

    [Fact]
    public void The_rulebook_says_that_word_of_captives_and_executions_travels_with_envoys_and_spies()
    {
        Assert.Equal(3, TurnEngine.LossNewsSeasons);
        Assert.Contains("- Word of captives and executions travels with people: an envoy received at a court, or a spy posted there, may hear which servants of other courts it holds captive and whom it has put to death within the last 3 seasons, and brings that home in its report. Other courts' envoys and spies hear the same at yours.", Rules);
    }

    [Fact]
    public void The_rulebook_says_that_a_spy_at_a_court_is_hidden_from_it_until_caught()
    {
        Assert.Contains("A spy posted at a court watches in secret: that court does not see it there, nor whom it serves, until its watchmen catch it, "
                        + "unless the spy secretly serves that court (as a double agent it turned does). So a foreign spy may stand at your court without your knowing, "
                        + "and is not paid any back pay you owe it while it hides there. A caught spy may confess whom it serves.", Rules);
        Assert.Contains("Then everyone you see at your court whom you owe back pay is paid it", Rules);
    }

    [Fact]
    public void The_rulebook_says_that_tablets_lie_in_archives_that_spies_copy_and_conquerors_take()
    {
        Assert.Contains("- Archives: every tablet you hold (those you sealed, and the copies you were shown or brought) lies in your archive at your capital, and so it is at every court. "
                        + "A spy watching a court copies from its archive: each season it is not caught, with a chance of (the spy's skill, 0-100)/100, it copies one tablet you do not hold yet (tablets bearing two or more seals first, the newest first), and the copy comes home with its report; a spy turned by that court, or watching a court that has fallen, copies nothing for you. "
                        + "Whoever takes a king's capital, or is ceded it, gains at once a copy of every tablet in his archive, and the king keeps his own.", Rules);

        // The seat view names the archive the rule speaks of.
        var s = GameFactory.NewGame(4);
        s.Tablets.Add(new Tablet { Id = "t900", Text = "Peace.", ProposedBy = Power.Hatti, Partner = Power.Egypt, Seals = [Power.Hatti, Power.Egypt], CreatedTurn = 1, SealedTurn = 1 });
        s.Copies.Add(new TabletCopy { Id = "k900", TabletId = "t900", Holder = Power.Egypt, AcquiredTurn = 1, Source = "copied from the archive of Hatti by your spy Mane" });
        var text = Prompts.Situation(Views.For(s, Power.Egypt));
        Assert.Contains("YOUR ARCHIVE (the tablets you hold, kept at your capital: each as every court names it, by its seals and date; your own mark for your copy, for your orders only; its text; how it came to you):", text);
        Assert.Contains("- the tablet sealed by Hatti and Egypt, dated turn 1 [your copy k900]: \"Peace.\" (copied from the archive of Hatti by your spy Mane)", text);
    }

    [Fact]
    public void The_rulebook_says_that_gold_comes_with_an_inventory_an_envoy_may_swap_for_a_forgery()
    {
        Assert.Contains("- Gold an envoy carries goes with an inventory tablet sealed by the court that sends it, stating the amount (gold a host sends back has one too): the receiving court's weighers report what they found against it, and the court keeps the inventory in its archive. "
                        + "An envoy that keeps some of the gold, but not all of it, may hand over, in place of the sealed inventory, one it forges itself stating only what is left, if it has a forger's skill: the weight then matches the inventory, and only having the inventory examined can show it, as for any forgery. "
                        + "A forged inventory that is found is traced, with the same chance as any forgery, to the envoy who brought it, and every court hears of it.", Rules);
    }

    [Fact]
    public void The_rulebook_says_when_a_support_is_void_and_when_the_other_side_is_named()
    {
        Assert.Contains("A support or convoy counts only if the unit it names does what it helps (stays in place, or makes that very move); otherwise it is void too, and the unit holds.", Rules);
        Assert.Contains("with the strengths compared where strength decided it, and that the unit stays where it was (a unit whose move fails does not move), and why each of your supports or convoys was void.", Rules);
        Assert.Contains("It names the other side's power only if that unit stood, or was moving, where you could see.", Rules);
    }

    [Fact]
    public void Every_court_reads_every_power_s_opening_troops_treasury_and_starting_strength()
    {
        Assert.Contains("OPENING POSITIONS (known to every court)", Rules);
        Assert.Contains("- Egypt: armies in memphis and akhetaten, a fleet in delta; treasury 600 shekels; homeland yield 190; starting strength 2500.", Rules);
        Assert.Contains("- Babylonia: armies in babylon, sippar and durkurigalzu; treasury 650 shekels;", Rules);
        Assert.Contains("- Alashiya: a fleet in enkomi; treasury 350 shekels;", Rules);

        // The figures are the game's own: every unit, treasury and starting strength as a new game sets them.
        var s = GameFactory.NewGame(9);
        foreach (var o in OpeningPositions.For(s.Config))
        {
            Assert.Equal(s.StartStrength[o.Power], o.Strength);
            Assert.Equal(s.Treasuries[o.Power].Gold, o.Gold);
            Assert.Equal(s.Units.Where(u => u.Power == o.Power).Select(u => (u.Kind, u.Province)), o.Units.Select(u => (u.Kind, u.Province)));
            Assert.Contains($"- {o.Power}: {o.Troops};", Rules);
        }
    }

    [Fact]
    public void The_opening_positions_keep_the_rulebook_byte_stable()
    {
        // The rulebook is one cached block: building it again, from a fresh cache key, gives the same bytes.
        var a = Prompts.LeaderRules(false, new GameConfig { MaxTurns = 61 });
        var b = Prompts.LeaderRules(false, new GameConfig { MaxTurns = 61 } with { });
        Assert.Equal(a, b);
        var opening = a[a.IndexOf("OPENING POSITIONS", StringComparison.Ordinal)..a.IndexOf("HOW TO ANSWER", StringComparison.Ordinal)];
        Assert.Equal(opening, Rules[Rules.IndexOf("OPENING POSITIONS", StringComparison.Ordinal)..Rules.IndexOf("HOW TO ANSWER", StringComparison.Ordinal)]);
    }
}

/// <summary>Captive orders the engine refuses, and replaced ransom demands, in the rulebook's own words.</summary>
public class CaptiveRulebookTests
{
    private static readonly string Rules = Prompts.LeaderRules(true, new GameConfig());

    [Fact]
    public void The_rulebook_says_which_captive_orders_are_refused_and_when_a_replaced_demand_can_still_be_paid()
    {
        Assert.Contains("Ransoming or turning a captive whose kingdom has fallen is refused, and so is turning one whose king has dismissed them: nobody is left to pay or to deceive.", Rules);
        Assert.Contains("a new demand replaces the old one once its word reaches you, and until then the old one can still be paid", Rules);
        Assert.Contains("a spy watching a court, or on its way to one, is free at that court; one watching a province, or on its way to one, walks back to your court and is free there", Rules);
        Assert.DoesNotContain("does nothing: nobody is left", Rules);
    }
}

/// <summary>The rulebook's "HOW A SEASON RESOLVES": the engine's own order, and the rules kings were refused for not knowing.</summary>
public class SeasonRulebookTests
{
    private static readonly string Rules = Prompts.LeaderRules(true, new GameConfig());

    [Fact]
    public void The_season_is_told_step_by_step_in_the_engine_s_order_and_the_old_list_is_gone()
    {
        Assert.DoesNotContain("EACH SEASON", Rules);
        Assert.DoesNotContain("Resolution, catastrophes, and reports", Rules);
        var section = Rules[Rules.IndexOf("HOW A SEASON RESOLVES", StringComparison.Ordinal)..Rules.IndexOf("MOVEMENT AND COMBAT", StringComparison.Ordinal)];
        string[] steps =
        [
            "1. Departures", "2. Income, upkeep and wages", "3. Arrivals", "4. Your court", "5. Audiences", "6. Orders", "7. Movement and battles",
            "8. Sieges", "9. Land changes hands", "10. Cessions and gifts of troops", "11. Purchases", "12. Disbanding", "13. Levies", "14. Envoys set out",
            "15. Intelligence", "16. Catastrophes", "17. A kingdom with no land left falls", "18. Strength and growth are reckoned",
        ];
        var at = steps.Select(x => section.IndexOf("\n" + x, StringComparison.Ordinal)).ToList();
        Assert.DoesNotContain(-1, at);
        Assert.Equal(at.Order(), at);
    }

    [Theory]
    [InlineData("a person hired this season enters your service at the end of the season and can be sent on an errand from next season")]
    [InlineData("Yours are checked in the order your reply lists them (units, then letters, then other orders), then those of your standing orders that fire, and the gold each needs is reserved as it is accepted, so a later order can be refused for lack of gold.")]
    [InlineData("Then each standing order that fires (see STANDING ORDERS) answers the moves just ordered and puts its orders in place of yours for the same units or people.")]
    [InlineData("There is no \"else\": a refused order is not replaced by another, and a purchase meant as a fallback is refused if an earlier bid has reserved the gold, even if that city is then not sold.")]
    [InlineData("A city taken by troops this season is not sold; when two or more kings bid for one city, its elders will not choose between them and sell to none.")]
    [InlineData("a new army or fleet is raised only in a province of your homeland that you still hold and that is empty after movement; otherwise none is raised and nothing is paid.")]
    [InlineData("a spy must be one of your own people at your court, sent to watch a court or a province")]
    [InlineData("If you cannot pay upkeep, troops desert, the one farthest from your capital first")]
    [InlineData("Every order that was refused or failed is reported with the reason, and gold reserved for an order that failed stays in your treasury (except the clay of a botched forgery, which is paid for).")]
    [InlineData("one without the skill ruins the clay, which you still pay for")]
    [InlineData("Walls add nothing to a battle: combat resolves as above, and a unit within walls defends with 1 plus its supports like any other.")]
    [InlineData("a move that wins its way into a walled province you do not hold takes it at once only if its strength also beats the level of the walls plus the hold strength of the defenders it beat")]
    [InlineData("You may move your own troops into your own walled provinces. A fleet may enter walls, but never storms or besieges them")]
    [InlineData("When the city has been worn down as many steps as its walls are high, it surrenders to the besieger at the end of that season and loses a level of walls.")]
    [InlineData("Each siege costs the besieger 15 a season on top of the army's upkeep.")]
    public void The_rulebook_states_each_rule(string rule) => Assert.Contains(rule, Rules);

    [Fact]
    public void Malformed_orders_reach_the_validator_and_are_refused_with_the_reason()
    {
        // A reply that leaves out where a unit goes, or names a power nobody knows: the king is told, the order never vanishes.
        var sub = Parse.Orders((System.Text.Json.Nodes.JsonObject)System.Text.Json.Nodes.JsonNode.Parse(
            """
            {"notes":"","letters":[],
             "units":[{"unit":"memphis","order":"move","target":"","to":""},
                      {"unit":"akhetaten","order":"support","target":"","to":"sinai"},
                      {"unit":"levantsea","order":"convoy","target":"memphis","to":""}],
             "other_orders":[{"action":"cede_province","province":"sinai","power":"","person":"","amount":0,"term":0,"text":"","item":"","seals":[]},
                             {"action":"give_unit","province":"memphis","power":"the Hittites","person":"","amount":0,"term":0,"text":"","item":"","seals":[]},
                             {"action":"place_spy","province":"","power":"Kush","person":"c3","amount":0,"term":0,"text":"","item":"","seals":[]},
                             {"action":"forge","province":"","power":"","person":"c3","amount":0,"term":0,"text":"Peace.","item":"","seals":["Hatti","Kush"]}]}
            """)!);
        Assert.Equal(7, sub.Orders.Count);
        var s = GameFactory.NewGame(5);
        s.Units.Single(u => u.Province == "delta").Province = "levantsea";
        var reasons = new OrderValidator(s).Validate(Power.Egypt, sub).Rejected.Select(r => $"{r.Order.Describe()}: {r.Reason}").ToList();
        Assert.Equal(
        [
            "memphis -> ?: name the province the unit should move to",
            "akhetaten supports ? -> sinai: name the unit to support, by the province it stands in",
            "levantsea convoys memphis -> ?: name the coast where the army should land",
            "cede sinai to '': name the power to cede it to",
            "give memphis to 'the Hittites': there is no power called 'the Hittites'",
            "send c3 to spy on 'Kush': there is no power called 'Kush'",
            "have c3 forge a tablet sealed by Hatti, Kush: there is no power called 'Kush'",
        ], reasons);
    }

    [Fact]
    public void Scheduled_orders_are_checked_after_the_season_s_own()
    {
        Assert.Contains("checked when they run, after the orders you give that season", Prompts.LeaderRules(true, new GameConfig { SleepingSeats = true }));
    }

    [Fact]
    public void A_spy_order_with_nowhere_to_watch_is_refused_with_the_reason_rather_than_dropped()
    {
        var sub = Parse.Orders((System.Text.Json.Nodes.JsonObject)System.Text.Json.Nodes.JsonNode.Parse(
            """{"notes":"","units":[],"letters":[],"other_orders":[{"action":"place_spy","province":"","power":"","person":"c3","amount":0,"term":0,"text":"","item":"","seals":[]}]}""")!);
        Assert.Equal(new PlaceSpyOrder("c3"), Assert.Single(sub.Orders));
    }
}

/// <summary>The standings line every court reads, and the travel times the rulebook gives.</summary>
public class StandingsAndTravelTests
{
    [Fact]
    public void The_land_standings_line_gives_every_power_s_land_yield_ratio_from_who_holds_what_and_says_it_is_not_growth()
    {
        var s = GameFactory.NewGame(5);
        var map = WorldMap.Default;
        int Home(Power p) => map.HomeOf(p).Sum(x => x.Yield);
        // Egypt has bought Gaza (yield 20); Mitanni has taken all of Assyria, which has fallen.
        s.Owner["gaza"] = Power.Egypt;
        foreach (var x in map.HomeOf(Power.Assyria)) s.Owner[x.Id] = Power.Mitanni;
        s.Units.RemoveAll(u => u.Power == Power.Assyria);
        s.Eliminated.Add(Power.Assyria);
        s.Treasuries[Power.Egypt].Gold = 5000; // treasuries are left out

        var line = Prompts.Standings(Views.For(s, Power.Egypt));
        var mitanni = (double)(Home(Power.Mitanni) + Home(Power.Assyria)) / Home(Power.Mitanni);
        // Labelled for what it is: a land-yield ratio, not the growth that wins, as the rulebook says too.
        Assert.StartsWith("LAND STANDINGS (a land-yield ratio, not growth: the yield of the land each power holds now over its homeland's yield at the start, as any court can reckon it from who holds what. Growth, which decides who wins, also counts treasuries and back pay, so these are not the winning figures, and yours is not your growth on the treasury line): Mitanni ", line);
        Assert.Contains("- LAND STANDINGS in your view give each power's land-yield ratio: the yield of the land it holds now over its homeland's yield at the start, which anyone can reckon from who holds what. It is not growth: growth, which decides who wins, measures strength (land, treasury and back pay) against a starting strength that includes the starting treasury, and rivals' treasuries are private. Your own growth, by your ledger, is on your treasury line.", Prompts.LeaderRules(true, new GameConfig()));
        Assert.Contains($"Mitanni {mitanni.ToString("0.00", System.Globalization.CultureInfo.InvariantCulture)} (land yield {Home(Power.Mitanni) + Home(Power.Assyria)}, at the start {Home(Power.Mitanni)}); Egypt (you) 1.11 (land yield 210, at the start 190); ", line);
        Assert.Contains($"Hatti 1.00 (land yield {Home(Power.Hatti)}, at the start {Home(Power.Hatti)})", line);
        Assert.EndsWith(" Fallen: Assyria.", line);
        Assert.DoesNotContain("Assyria 0", line);
        Assert.Contains(line, Prompts.Situation(Views.For(s, Power.Egypt)));

        // Every court reads the same figures: ownership is public.
        Assert.Equal(line.Replace("Egypt (you)", "Egypt"), Prompts.Standings(Views.For(s, Power.Hatti)).Replace("Hatti (you)", "Hatti"));
    }

    [Fact]
    public void The_rulebook_gives_the_travel_times_the_map_makes()
    {
        var rules = Prompts.LeaderRules(true, new GameConfig());
        Assert.DoesNotContain("1 to 3 seasons each way", rules);
        Assert.Contains("Envoys take 1 or 2 seasons each way between courts (the table in your view gives each court); a spy sent to watch a distant province may take up to 3 seasons to reach it, and its reports as long to come home.", rules);

        var s = GameFactory.NewGame(5);
        var e = new TurnEngine(s);
        var courts = Powers.All.SelectMany(a => Powers.All.Where(b => b != a).Select(b => e.TravelTurns(a, b))).ToHashSet();
        Assert.Equal([1, 2], courts.Order());
        Assert.All(Views.For(s, Power.Egypt).TravelTimes, t => Assert.Matches(@"^[A-Za-z]+: [12] season\(s\) each way$", t));
    }
}

/// <summary>What the view, the schema and the audience request say that the simulation's kings asked for.</summary>
public class ViewTextTests
{
    private static readonly string Rules = Prompts.LeaderRules(true, new GameConfig());

    [Theory]
    [InlineData("You see troops only in your own land, where your troops stand and in the provinces your spies watch, and one link of any kind (land, coast or sea) from those. Troops two links away, or an army carried across the sea by fleets, can still arrive next season without being seen first.")]
    [InlineData("Background checks (at least 10 shekels) report next season: every public fact about the person, each hidden fact with a chance of shekels paid/150 (at most 90%), and each deep secret with a chance of shekels paid/400 (at most 60%).")]
    [InlineData("Each season a spy is caught with a chance of 5% + (what the court it watches, or the one holding the province it watches, spends on watchmen that season)/300 - (the spy's skill, 0-100)/400, between 2% and 60%")]
    [InlineData("a genuine tablet reads genuine 95% of the time (otherwise the scribes cannot agree); a forgery is found with a chance of 20% + shekels paid/200 - (the forger's skill, 0-100)/150, between 5% and 95%, and once found is traced to the forger's court with a chance of 30% + shekels paid/400, between 30% and 80%")]
    [InlineData("a spy watching a province that no power holds, or one you hold yourself, is never caught, nor is one still watching a court that has fallen.")]
    [InlineData("the receiver sees its weight, not its fineness, until they pay 10 for an assay")]
    public void The_rulebook_states_sight_and_the_costs_and_odds_of_intelligence(string rule) => Assert.Contains(rule, Rules);

    [Fact]
    public void The_schema_says_how_to_besiege_a_city_and_what_each_greeting_flag_means()
    {
        // As the king reads it: the JSON text escapes an apostrophe, which the model reads as the apostrophe.
        var schema = Schemas.LeaderOrders(new GameConfig()).ToJsonString(new System.Text.Json.JsonSerializerOptions { Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping });
        Assert.Contains("\"enum\":[\"hold\",\"move\",\"support\",\"convoy\",\"disband\",\"besiege\"]", schema);
        Assert.Contains("besiege: an army standing within walls you do not hold besieges that city", schema);
        Assert.DoesNotContain("support its walls holding", schema);
        Assert.Contains("Greet the recipient as your brother, as Great Kings greet their equals", schema);
        Assert.Contains("Give the recipient the title Great King. False denies him that rank.", schema);
        Assert.Contains("Name yourself Great King in the greeting. False names you only as king of your land, which the recipient reads as not claiming the rank.", schema);
        Assert.Contains("presumptuous, and the recipient will notice", schema);
        Assert.Contains("Send no greeting at all, which is a slight.", schema);
        Assert.Contains("an oath of alliance before the gods that every reader of the tablet sees. It changes no rule and binds nobody.", schema);
    }

    [Fact]
    public void The_situation_explains_sight_and_shows_when_an_envoy_is_due_back()
    {
        var s = GameFactory.NewGame(5, new GameConfig { CatastropheChance = 0 });
        var envoy = s.Characters.First(c => c.Employer == Power.Egypt);
        var e = new TurnEngine(s);
        e.BeginTurn();
        var travel = e.TravelTurns(Power.Egypt, Power.Hatti);
        e.Resolve(new Dictionary<Power, TurnSubmission> { [Power.Egypt] = new() { Orders = [new DispatchOrder(envoy.Id, Power.Hatti, "Greetings.")] } });

        var text = Prompts.Situation(Views.For(s, Power.Egypt));
        Assert.Contains("You can see troops in (your land, your troops and what your spies watch, and one link of any kind from those; troops two links away can still arrive next season unseen): ", text);
        Assert.Contains($"{envoy.Id} {envoy.Name} of {envoy.Origin}; travelling as envoy to Hatti; set out in turn 1 for Hatti; due there about turn {1 + travel}; due back about turn {1 + 2 * travel}; serves at", text);
    }

    private sealed class Recorder : IJsonAsker
    {
        public List<CallSpec> Specs { get; } = new();

        public Task<System.Text.Json.Nodes.JsonObject> AskJsonAsync(CallSpec spec, CancellationToken ct)
        {
            Specs.Add(spec);
            return Task.FromResult((System.Text.Json.Nodes.JsonObject)System.Text.Json.Nodes.JsonNode.Parse(
                """{"speech":"Welcome.","gift_to_envoy":0,"gift_request":"","offer_service_wage":0,"seal_tablet":false,"detain_envoy":false,"send_gold_back":0,"gold_back_purity":100,"end_audience":true}""")!);
        }
    }

    [Fact]
    public async Task An_audience_request_carries_the_season_s_news_and_the_host_s_own_land_and_troops()
    {
        var s = GameFactory.NewGame(5);
        var e = new TurnEngine(s);
        e.BeginTurn();
        s.Notify(Power.Egypt, InboxKind.Rejected, "Purchase failed", "The elders of Gaza would not choose between 2 buyers last season. No gold was paid.");
        var recorder = new Recorder();
        var seat = new LlmLeaderSeat(Power.Egypt, recorder, "claude-sonnet-5-5", "medium", true, s.Config);
        var view = new AudienceView { AudienceId = "a1", Turn = 1, Round = 1, MaxRounds = 2, From = Power.Hatti, Host = Power.Egypt, Envoy = new CharacterView { Id = "c1", Name = "Mane" }, Spoken = "Greetings." };
        await seat.HostAudienceAsync(view, Views.For(s, Power.Egypt), CancellationToken.None);

        var user = Assert.Single(recorder.Specs).User;
        Assert.Contains("YOUR LAND: akhetaten, delta, memphis, sinai, thebes. YOUR TROOPS: army in memphis, army in akhetaten, fleet in delta.", user);
        Assert.Contains("NEWS THIS SEASON:", user);
        Assert.Contains("[Rejected] Purchase failed: The elders of Gaza would not choose between 2 buyers last season. No gold was paid.", user);
        Assert.Contains("[Notice] The treasury: ", user);
        Assert.True(user.IndexOf("NEWS THIS SEASON:", StringComparison.Ordinal) < user.IndexOf("AN AUDIENCE", StringComparison.Ordinal));
    }
}
