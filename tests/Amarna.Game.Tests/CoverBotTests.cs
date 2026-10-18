using Amarna.Engine;
using Amarna.Game.Bots;

namespace Amarna.Game.Tests;

/// <summary>Script kings read the same view as everyone: a servant whose fate they have not heard of fools them too.</summary>
public class CoverBotTests
{
    [Theory]
    [InlineData(Power.Egypt)]
    [InlineData(Power.Mitanni)]
    [InlineData(Power.Arzawa)]
    public async Task A_script_king_never_sends_a_servant_it_believes_away(Power me)
    {
        var s = GameFactory.NewGame(11);
        var servants = s.Characters.Where(c => c.Employer == me).ToList();
        // One caught as a spy at Hatti's court, as its master does not know; the other gone over to Hatti.
        var caught = servants[0];
        caught.Status = CharacterStatus.Captured;
        caught.HeldBy = Power.Hatti;
        caught.At = Power.Hatti;
        caught.Cover = new Cover { For = me, Since = 1, Believed = Duty.SpyPosted, DutyText = "watching Hatti", WhereText = "at the court of Hatti", Wage = caught.Contract!.Wage, ContractUntil = caught.Contract.UntilTurn };
        var gone = servants[1];
        gone.Cover = new Cover { For = me, Since = 1, Believed = Duty.EnvoyHomebound, DutyText = "on the road home", WhereText = "travelling", Wage = gone.Contract!.Wage, ContractUntil = gone.Contract.UntilTurn };
        gone.Employer = Power.Hatti;
        gone.At = Power.Hatti;
        s.Treasuries[me].Gold = 3000;

        var view = Views.For(s, me);
        Assert.All(view.Court.Where(c => c.Id == caught.Id || c.Id == gone.Id), c =>
        {
            Assert.Equal("employed", c.Status);
            Assert.False(c.Ready);
        });
        Assert.Equal(caught.Contract.Wage + gone.Contract.Wage, view.Wages);

        // A model king reads the same: the caught spy at its post, never "at court, ready".
        var text = Amarna.Llm.Prompts.Situation(view);
        Assert.Contains($"{caught.Id} {caught.Name} of {caught.Origin}; watching Hatti; wage {caught.Contract.Wage} until turn {caught.Contract.UntilTurn}", text);
        Assert.Contains($"{gone.Id} {gone.Name} of {gone.Origin}; on the road home;", text);

        var king = new ScriptLeader(11);
        for (var turn = 2; turn <= 6; turn++)
        {
            s.Turn = turn;
            var sub = await king.DecideAsync(Views.For(s, me), default);
            Assert.DoesNotContain(sub.Orders, o => OrderKeys.CharacterOf(o) is { } id && (id == caught.Id || id == gone.Id));
        }
    }

    [Fact]
    public void A_captive_known_to_its_master_reads_as_held_with_the_demand_never_as_ready()
    {
        var s = GameFactory.NewGame(4);
        var spy = s.Characters.First(c => c.Employer == Power.Hatti);
        spy.Status = CharacterStatus.Captured;
        spy.HeldBy = Power.Mitanni;
        spy.At = Power.Mitanni;
        var line = Amarna.Llm.Prompts.Person(Views.For(s, Power.Hatti).Court.Single(c => c.Id == spy.Id));
        Assert.Contains("held captive at the court of Mitanni;", line);
        Assert.DoesNotContain("ready", line);

        s.Tasks.Add(new PendingTask { Id = "q900", Kind = TaskKind.RansomDemand, Requester = Power.Hatti, Other = Power.Mitanni, CharacterId = spy.Id, Spend = 90, DueTurn = 6 });
        line = Amarna.Llm.Prompts.Person(Views.For(s, Power.Hatti).Court.Single(c => c.Id == spy.Id));
        Assert.Contains("held captive at the court of Mitanni; Mitanni demands 90 shekels for their return (order pay_ransom)", line);
    }
}
