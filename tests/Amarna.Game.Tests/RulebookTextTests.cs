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
    public void The_rulebook_says_when_a_support_is_void_and_when_the_other_side_is_named()
    {
        Assert.Contains("A support or convoy counts only if the unit it names does what it helps (stays in place, or makes that very move); otherwise it is void too, and the unit holds.", Rules);
        Assert.Contains("with the strengths compared where strength decided it, and why each of your supports or convoys was void.", Rules);
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
            "8. Land changes hands", "9. Cessions and gifts of troops", "10. Purchases", "11. Disbanding", "12. Levies", "13. Envoys set out",
            "14. Intelligence", "15. Catastrophes", "16. A kingdom with no land left falls", "17. Strength and growth are reckoned",
        ];
        var at = steps.Select(x => section.IndexOf("\n" + x, StringComparison.Ordinal)).ToList();
        Assert.DoesNotContain(-1, at);
        Assert.Equal(at.Order(), at);
    }

    [Theory]
    [InlineData("a person hired this season enters your service at the end of the season and can be sent on an errand from next season")]
    [InlineData("Yours are checked in the order your reply lists them (units, then letters, then other orders), and the gold each needs is reserved as it is accepted, so a later order can be refused for lack of gold.")]
    [InlineData("There is no \"else\": a refused order is not replaced by another, and a purchase meant as a fallback is refused if an earlier bid has reserved the gold, even if that city is then not sold.")]
    [InlineData("A city taken by troops this season is not sold; when two or more kings bid for one city, its elders will not choose between them and sell to none.")]
    [InlineData("a new army or fleet is raised only in a province of your homeland that you still hold and that is empty after movement; otherwise none is raised and nothing is paid.")]
    [InlineData("a spy must be one of your own people at your court, sent to watch a court or a province")]
    [InlineData("If you cannot pay upkeep, troops desert, the one farthest from your capital first")]
    [InlineData("Every order that was refused or failed is reported with the reason, and gold reserved for an order that failed stays in your treasury.")]
    public void The_rulebook_states_each_rule(string rule) => Assert.Contains(rule, Rules);

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
