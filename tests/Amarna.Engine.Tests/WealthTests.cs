using Amarna.Engine;

namespace Amarna.Engine.Tests;

/// <summary>The richest characters: what a character gains, by source, and the ranking by wealth.</summary>
public class WealthTests
{
    private static TurnEngine Begin(GameState s)
    {
        var e = new TurnEngine(s);
        e.BeginTurn();
        return e;
    }

    private static Dictionary<Power, TurnSubmission> Orders(Power p, params Order[] orders) => new() { [p] = new TurnSubmission { Orders = orders.ToList() } };

    [Fact]
    public void Gold_into_a_purse_is_counted_by_where_it_came_from()
    {
        var c = new Character { Id = "c1", Name = "Mane" };
        c.Gain(30, GoldSource.Wages);
        c.Gain(12, GoldSource.Skimmed);
        c.Gain(40, GoldSource.Gifts);
        c.Gain(60, GoldSource.Carried);
        c.Gain(0, GoldSource.Gifts);
        Assert.Equal(142, c.Purse);
        Assert.Equal((30, 12, 40, 60, 142), (c.Earned.Wages, c.Earned.Skimmed, c.Earned.Gifts, c.Earned.Carried, c.Earned.Total));
        Assert.Equal("wages 30, skimmed 12, gifts 40, gold kept on dismissal 60", Wealth.Sources(c.Earned));
    }

    [Fact]
    public void Wages_skims_gifts_and_gold_kept_on_dismissal_are_all_counted_as_the_engine_pays_them()
    {
        var s = GameFactory.NewGame(5, new GameConfig { CatastropheChance = 0 });
        var envoy = s.Characters.First(c => c.Employer == Power.Egypt);
        envoy.SecretMaster = null;
        // A season at court: its wage.
        Begin(s).Resolve(Orders(Power.Egypt, new DispatchOrder(envoy.Id, Power.Alashiya, "Greetings.", Gold: 100)));
        Assert.Equal(envoy.Contract!.Wage, envoy.Earned.Wages);
        while (s.Audiences.Count == 0)
        {
            var next = Begin(s);
            if (s.Audiences.Count == 0) next.Resolve(new Dictionary<Power, TurnSubmission>());
        }
        // At the audience: 20 kept of the gold, and a gift of 30.
        new TurnEngine(s).ApplyAudience(new AudienceRecord
        {
            AudienceId = s.Audiences.Single().Id, Delivered = "Greetings.", Skim = 20,
            Rounds = [new AudienceRound { Host = new HostReply { Bribe = 30, End = true }, Envoy = new EnvoyReaction { AcceptBribe = true } }],
        });
        Assert.Equal((20, 30), (envoy.Earned.Skimmed, envoy.Earned.Gifts));
        Assert.Equal(envoy.Earned.Total, envoy.Purse);

        // Another envoy dismissed on the way out keeps the gold it carried.
        var other = s.Characters.Last(c => c.Employer == Power.Egypt && c.Id != envoy.Id);
        other.SecretMaster = null;
        var e = Begin(s);
        e.Resolve(Orders(Power.Egypt, new DispatchOrder(other.Id, Power.Hatti, "Greetings.", Gold: 50)));
        Begin(s).Resolve(Orders(Power.Egypt, new DismissOrder(other.Id)));
        Assert.Equal(50, other.Earned.Carried);
        Assert.Equal(other.Earned.Total, other.Purse);
    }

    [Fact]
    public void The_living_are_ranked_by_purse_and_back_pay_owed_and_the_dead_are_left_out()
    {
        var s = GameFactory.NewGame(5);
        var people = s.Characters.Take(4).ToList();
        foreach (var c in s.Characters) (c.Purse, c.BackPay) = (0, new());
        people[0].Purse = 100;
        (people[1].Purse, people[1].BackPay) = (60, new() { [Power.Egypt] = 30, [Power.Hatti] = 20 });
        people[2].Purse = 500;
        people[2].Status = CharacterStatus.Dead;
        people[3].Purse = 120;

        var ranking = Wealth.Ranking(s);
        Assert.DoesNotContain(ranking, w => w.Character == people[2]);
        Assert.Equal([people[3], people[1], people[0]], ranking.Take(3).Select(w => w.Character));
        Assert.Equal((60, 50, 110), (ranking[1].Purse, ranking[1].BackPay, ranking[1].Total));
        Assert.Equal(s.Characters.Count - 1, ranking.Count);
        // Ties are broken by id, so the order is the same every time.
        Assert.Equal(ranking.Skip(3).Select(w => w.Character.Id), ranking.Skip(3).Select(w => w.Character.Id).OrderBy(TurnEngine.IdNumber));
    }

    [Fact]
    public void A_ranking_line_says_who_the_character_is_at_the_end_and_where_its_gold_came_from()
    {
        var c = new Character { Id = "c1", Name = "Mane", Origin = "Thebes", Status = CharacterStatus.Employed, Employer = Power.Egypt, BackPay = new() { [Power.Egypt] = 32 } };
        c.Gain(250, GoldSource.Wages);
        c.Gain(30, GoldSource.Skimmed);
        Assert.Equal("Mane of Thebes (serving Egypt): 312 (purse 280, back pay owed 32; wages 250, skimmed 30)", Wealth.Line(Wealth.Of(c)));
        (c.Status, c.HeldBy) = (CharacterStatus.Captured, Power.Hatti);
        Assert.Equal("captive in Hatti, serving Egypt", Wealth.Standing(c));
        (c.Status, c.HeldBy, c.Employer) = (CharacterStatus.Free, null, null);
        Assert.Equal("free", Wealth.Standing(c));
    }
}
