using Amarna.Engine;
using Amarna.Game.Bots;

namespace Amarna.Game.Tests;

public class RansomBotTests
{
    [Fact]
    public async Task A_script_captor_asks_a_ransom_once_and_again_only_when_the_demand_has_lapsed()
    {
        // Mitanni (honest, neither cunning nor vengeful in any game) holds one of Hatti's people.
        var s = GameFactory.NewGame(9);
        var spy = s.Characters.First(c => c.Employer == Power.Hatti);
        spy.Status = CharacterStatus.Captured;
        spy.HeldBy = Power.Mitanni;
        spy.At = Power.Mitanni;
        spy.Duty = Duty.None;
        var captor = new ScriptLeader(9);

        async Task<bool> Asks(int turn)
        {
            s.Turn = turn;
            var sub = await captor.DecideAsync(Views.For(s, Power.Mitanni), default);
            return sub.Orders.OfType<CaptiveOrder>().Any(o => o.Character == spy.Id && o.Fate == CaptiveFate.Ransom);
        }

        Assert.True(await Asks(3));
        Assert.False(await Asks(4));
        Assert.False(await Asks(5));
        // The demand lapses unpaid: the captor hears of it and asks again.
        s.Turn = 8;
        s.Notify(Power.Mitanni, InboxKind.Notice, "No ransom came", $"No ransom has come for {spy.Name}. They remain your captive.", spy.Id);
        Assert.True(await Asks(8));
        Assert.False(await Asks(9));
        // Should that word never come, it asks again after six seasons.
        Assert.True(await Asks(14));
    }

    [Fact]
    public async Task A_script_king_pays_a_ransom_the_season_its_demand_arrives()
    {
        // Mitanni (honest in every game) has one of its people held by Hatti.
        var s = GameFactory.NewGame(9);
        var spy = s.Characters.First(c => c.Employer == Power.Mitanni);
        spy.Status = CharacterStatus.Captured;
        spy.HeldBy = Power.Hatti;
        spy.At = Power.Hatti;
        s.Treasuries[Power.Mitanni].Gold = 3000;
        var e = new TurnEngine(s);
        e.BeginTurn();
        e.Resolve(new Dictionary<Power, TurnSubmission> { [Power.Hatti] = new() { Orders = [new CaptiveOrder(spy.Id, CaptiveFate.Ransom, 80)] } });
        var payer = new ScriptLeader(9);
        while (!s.InboxOf(Power.Mitanni).Any(i => i.Kind == InboxKind.Rumor && i.Subject == spy.Id))
        {
            e = new TurnEngine(s);
            e.BeginTurn();
            if (s.InboxOf(Power.Mitanni).Any(i => i.Kind == InboxKind.Rumor && i.Subject == spy.Id)) break;
            e.Resolve(new Dictionary<Power, TurnSubmission>());
        }
        var sub = await payer.DecideAsync(Views.For(s, Power.Mitanni), default);
        var pay = Assert.Single(sub.Orders.OfType<PayRansomOrder>());
        Assert.Equal(spy.Id, pay.Character);
        Assert.Contains(new OrderValidator(s).Validate(Power.Mitanni, sub).Accepted, o => o is PayRansomOrder);
    }
}
