using Amarna.Engine;

namespace Amarna.Engine.Tests;

/// <summary>Notices are read the season after they are written, and say so; failures are rejection notices.</summary>
public class NoticeTextTests
{
    [Fact]
    public void News_written_as_a_season_resolves_speaks_of_last_season()
    {
        var s = GameFactory.NewGame(5);
        var envoy = s.Characters.First(c => c.Employer == Power.Egypt);
        var e = new TurnEngine(s);
        e.BeginTurn();
        var travel = e.TravelTurns(Power.Egypt, Power.Hatti);
        e.Resolve(new Dictionary<Power, TurnSubmission>
        {
            [Power.Egypt] = new() { Orders = [new MoveOrder("memphis", "sinai"), new DispatchOrder(envoy.Id, Power.Hatti, "Greetings, brother.")] },
        });

        var inbox = s.InboxOf(Power.Egypt);
        Assert.Contains(inbox, i => i.Kind == InboxKind.Battle && i.Title == "Movements last season" && i.Body.Contains("A memphis -> sinai: succeeds"));
        Assert.Contains(inbox, i => i.Title == "Envoy dispatched" && i.Body == $"{envoy.Name} set out for Hatti last season; the journey takes {travel} season(s).");
        Assert.DoesNotContain(inbox, i => i.Title.Contains("this season"));
    }

    [Fact]
    public void The_treasury_notice_says_audience_gold_comes_later()
    {
        var s = GameFactory.NewGame(5);
        new TurnEngine(s).BeginTurn();
        var notice = s.InboxOf(Power.Egypt).Single(i => i.Title == "The treasury");
        Assert.Contains("After income, upkeep and wages, the treasury holds", notice.Body);
        Assert.Contains("gold received at audiences or brought home by your envoys this season is added later", notice.Body);
    }

    [Fact]
    public void A_payment_the_treasury_cannot_make_is_a_rejection_even_when_debased_gold_is_found()
    {
        var s = GameFactory.NewGame(5);
        var e = new TurnEngine(s);
        e.BeginTurn();
        // The ledger shows 150, but 100 of it was never fine gold: the levy is accepted, then cannot be paid.
        s.Treasuries[Power.Egypt].Gold = 50;
        s.Treasuries[Power.Egypt].Lots.Add(new GoldLot { Id = "g900", From = Power.Hatti, Stated = 100, Face = 100, True = 0, ArrivedTurn = 1 });
        e.Resolve(new Dictionary<Power, TurnSubmission> { [Power.Egypt] = new() { Orders = [new RaiseOrder("thebes", UnitKind.Army)] } });

        var inbox = s.InboxOf(Power.Egypt);
        Assert.Contains(inbox, i => i.Kind == InboxKind.Assay && i.Title == "The treasury is short");
        Assert.Contains(inbox, i => i.Kind == InboxKind.Rejected && i.Title == "Not enough gold" && i.Body.Contains("a new army"));
        Assert.Null(s.UnitAt("thebes"));
    }

    [Fact]
    public void Wake_reasons_and_the_digest_name_whose_troops_moved()
    {
        var s = GameFactory.NewGame(31, new GameConfig { SleepingSeats = true, CatastropheChance = 0 });
        s.Sleep[Power.Alashiya] = new SleepState { Asleep = true, WakeAt = 50 };
        s.Sleep[Power.Babylonia] = new SleepState { Asleep = true, WakeAt = 50 };
        var e = new TurnEngine(s);
        e.BeginTurn();
        e.Resolve(new Dictionary<Power, TurnSubmission>
        {
            [Power.Egypt] = new() { Orders = [new MoveOrder("delta", "levantsea")] },
            [Power.Assyria] = new() { Orders = [new MoveOrder("ekallatum", "arbela")] },
        });
        e = new TurnEngine(s);
        e.BeginTurn();
        e.WakeCheck();

        // A fleet off its coast no longer wakes a sleeper: it waits in the digest, like any move it saw.
        Assert.Empty(s.Sleep[Power.Alashiya].WokenBecause);
        Assert.Contains("turn 1: Egypt's fleet moved delta -> levantsea", s.Sleep[Power.Alashiya].Digest);
        Assert.Contains("turn 1: Assyria's army moved ekallatum -> arbela", s.Sleep[Power.Babylonia].Digest);
    }
}
