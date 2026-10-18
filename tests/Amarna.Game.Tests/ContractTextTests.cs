using System.Text.Json.Nodes;
using Amarna.Engine;
using Amarna.Llm;

namespace Amarna.Game.Tests;

/// <summary>What a king reads of terms, notice and renewal, and how it orders a renewal.</summary>
public class ContractTextTests
{
    [Fact]
    public void The_rulebook_says_what_happens_when_a_term_ends_and_how_to_renew()
    {
        var rules = Prompts.LeaderRules(true, new GameConfig());
        Assert.Contains("- Each servant serves for a term. When it ends, one content with the wage serves on for another 6 seasons; one who wants more gives notice, names a price and serves one more season: renew them (order renew) at that price or more, or they leave. You may renew one of your people at court at any time, for a new wage and term; they never take less than their present wage (below their price they refuse, and you are told the price); hire is only for people not in your service.", rules);
        Assert.Contains("each names a price, as does anyone free at your court.", rules);
        Assert.Contains("a servant giving notice", Prompts.LeaderRules(true, new GameConfig { SleepingSeats = true }));
    }

    [Fact]
    public void Kings_order_a_renewal_with_a_wage_and_a_term_and_hire_takes_a_term_too()
    {
        var schema = Schemas.LeaderOrders(new GameConfig()).ToJsonString();
        Assert.Contains("\"renew\"", schema);
        Assert.Contains("\"term\"", schema);
        var json = JsonNode.Parse("""
        {
          "notes": "", "units": [], "letters": [],
          "other_orders": [ { "action": "renew", "province": "", "power": "", "person": "c3", "amount": 20, "term": 0, "text": "", "item": "", "seals": [] },
                            { "action": "renew", "province": "", "power": "", "person": "c4", "amount": 25, "term": 9, "text": "", "item": "", "seals": [] },
                            { "action": "hire", "province": "", "power": "", "person": "c9", "amount": 30, "term": 12, "text": "", "item": "", "seals": [] },
                            { "action": "hire", "province": "", "power": "", "person": "c10", "amount": 30, "text": "", "item": "", "seals": [] } ]
        }
        """)!.AsObject();
        Assert.Empty(FileExchange.Problems(json, Schemas.LeaderOrders(new GameConfig())));
        var sub = Parse.Orders(json);
        Assert.Equal(
            new Order[] { new RenewOrder("c3", 20, 6), new RenewOrder("c4", 25, 9), new HireOrder("c9", 30, 12), new HireOrder("c10", 30, 6) },
            sub.Orders);
        Assert.Equal("renew c3 at 20 a season for 6 seasons", sub.Orders[0].Describe());
    }

    [Fact]
    public void A_servant_s_line_says_its_term_in_plain_words_and_a_free_person_at_court_its_price()
    {
        var s = GameFactory.NewGame(3);
        var c = s.Characters.First(x => x.Employer == Power.Mitanni);
        c.Contract = new Contract { Wage = 12, StartTurn = 1, UntilTurn = 10 };
        string Line() => Prompts.Person(Views.For(s, Power.Mitanni).Court.Single(x => x.Id == c.Id));
        Assert.Contains("; at court, ready for a mission; serves at 12 a season through turn 10; if content they then renew themselves, otherwise they give a season's notice and name a price", Line());
        Assert.DoesNotContain("until turn", Line());
        // What it asked before it was hired (here, or rehired after a notice ran out) means nothing now: one's own servant shows no asking price.
        c.AskingPrice[Power.Mitanni] = 40;
        Assert.DoesNotContain("asks", Line());

        c.Contract.NoticePrice = 20;
        c.Contract.LeavesTurn = 2;
        Assert.Contains("; serves at 12 a season; has given notice: asks 20 a season to serve on; leaves at the start of turn 2 unless renewed", Line());

        var free = s.Characters.First(x => x.Status == CharacterStatus.Free);
        free.At = Power.Mitanni;
        free.Pitches.Clear();
        free.AskingPrice.Clear();
        Assert.Contains($"; asks {TurnEngine.BasePrice(free, Power.Mitanni)} a season", Prompts.Person(Views.For(s, Power.Mitanni).Known.Single(x => x.Id == free.Id)));
    }
}
