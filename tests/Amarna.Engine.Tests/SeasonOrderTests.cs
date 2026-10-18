using Amarna.Engine;

namespace Amarna.Engine.Tests;

/// <summary>Refusals and failures in the words of the rulebook's "HOW A SEASON RESOLVES".</summary>
public class SeasonOrderTests
{
    private static List<RejectedOrder> Refused(GameState s, Power p, params Order[] orders) =>
        new OrderValidator(s).Validate(p, new TurnSubmission { Orders = orders.ToList() }).Rejected;

    [Fact]
    public void Gold_is_reserved_in_the_order_the_orders_are_listed()
    {
        var s = GameFactory.NewGame(4);
        s.Treasuries[Power.Egypt].Gold = 150;
        var someone = s.Characters.First(c => c.Employer == Power.Hatti).Id;

        var refused = Refused(s, Power.Egypt, new BackgroundCheckOrder(someone, 100), new BackgroundCheckOrder(someone, 100));
        Assert.Equal("not enough gold: it needs 100 shekels; orders listed before it had reserved 100, and 50 was left", Assert.Single(refused).Reason);

        s.Treasuries[Power.Egypt].Gold = 50;
        refused = Refused(s, Power.Egypt, new BackgroundCheckOrder(someone, 100), new BackgroundCheckOrder(someone, 40));
        Assert.Equal("not enough gold: it needs 100 shekels, and your treasury held 50 by your ledger", Assert.Single(refused).Reason);
    }

    [Fact]
    public void A_person_hired_cannot_be_sent_on_an_errand_the_same_season()
    {
        var s = GameFactory.NewGame(4);
        var c = s.Characters.First(c => c.Status == CharacterStatus.Free);
        c.At = Power.Egypt;
        const string why = "was to be hired that season: a person hired enters your service only at the end of the season, and can be sent on an errand from the next season";

        // Hired first, or sent first: either way the errand is refused with the rule, and the hire stands.
        foreach (var orders in new Order[][]
                 {
                     [new HireOrder(c.Id, 40), new DispatchOrder(c.Id, Power.Hatti, "Greetings.")],
                     [new PlaceSpyOrder(c.Id, Court: Power.Hatti), new HireOrder(c.Id, 40)],
                 })
        {
            var v = new OrderValidator(s).Validate(Power.Egypt, new TurnSubmission { Orders = orders.ToList() });
            Assert.Contains(v.Accepted, o => o is HireOrder);
            Assert.EndsWith($"{c.Name} {why}", Assert.Single(v.Rejected).Reason);
        }
    }

    [Fact]
    public void A_spy_must_be_one_of_your_own_people_at_court_sent_to_a_court_or_a_province()
    {
        var s = GameFactory.NewGame(4);
        var own = s.Characters.First(c => c.Employer == Power.Egypt);
        var stranger = s.Characters.First(c => c.Status == CharacterStatus.Free);

        Assert.Equal("a spy must be one of your own people at your court: you named nobody", Refused(s, Power.Egypt, new PlaceSpyOrder("", Court: Power.Hatti)).Single().Reason);
        Assert.Equal($"a spy must be one of your own people at your court: {stranger.Name} is not in your service", Refused(s, Power.Egypt, new PlaceSpyOrder(stranger.Id, Court: Power.Hatti)).Single().Reason);
        Assert.Equal("a spy must be sent to watch a court or a province: you named neither", Refused(s, Power.Egypt, new PlaceSpyOrder(own.Id)).Single().Reason);
        Assert.Equal("a spy must be sent to watch a court or a province: name only one", Refused(s, Power.Egypt, new PlaceSpyOrder(own.Id, Power.Hatti, "gaza")).Single().Reason);

        own.Duty = Duty.EnvoyOutbound;
        own.At = null;
        Assert.Equal($"a spy must be one of your own people at your court: {own.Name} is not at your court", Refused(s, Power.Egypt, new PlaceSpyOrder(own.Id, Court: Power.Hatti)).Single().Reason);
    }

    [Fact]
    public void A_levy_needs_a_province_you_still_hold_that_is_empty_after_movement()
    {
        var s = GameFactory.NewGame(4, new GameConfig { CatastropheChance = 0 });
        s.Owner["megiddo"] = Power.Babylonia;
        s.Garrisons.Remove("megiddo");
        s.Units.Add(new Unit { Id = "u90", Power = Power.Babylonia, Kind = UnitKind.Army, Province = "megiddo" });
        var e = new TurnEngine(s);
        e.BeginTurn();
        var gold = s.Treasuries[Power.Egypt].Gold;
        e.Resolve(new Dictionary<Power, TurnSubmission>
        {
            // Babylonia takes Sinai as Egypt raises an army there; Egypt marches into Thebes and raises one there too.
            [Power.Babylonia] = new() { Orders = [new MoveOrder("megiddo", "sinai")] },
            [Power.Egypt] = new() { Orders = [new MoveOrder("akhetaten", "thebes"), new RaiseOrder("sinai", UnitKind.Army), new RaiseOrder("thebes", UnitKind.Army)] },
        });

        var failed = s.InboxOf(Power.Egypt).Where(i => i.Title == "Levy failed").Select(i => (i.Kind, i.Body)).ToList();
        Assert.Contains((InboxKind.Rejected, "No army was raised in Sinai: you no longer held Sinai after movement. No gold was paid."), failed);
        Assert.Contains((InboxKind.Rejected, "No army was raised in Thebes: Thebes was not empty after movement. No gold was paid."), failed);
        Assert.Equal(gold, s.Treasuries[Power.Egypt].Gold);
    }

    [Fact]
    public void Rival_bids_are_told_how_many_buyers_the_elders_would_not_choose_between()
    {
        var s = GameFactory.NewGame(1);
        s.Owner["megiddo"] = Power.Babylonia;
        s.Garrisons.Remove("megiddo");
        s.Units.Add(new Unit { Id = "u90", Power = Power.Babylonia, Kind = UnitKind.Army, Province = "megiddo" });
        var e = new TurnEngine(s);
        e.BeginTurn();
        e.Resolve(new Dictionary<Power, TurnSubmission>
        {
            [Power.Egypt] = new() { Orders = [new BuyProvinceOrder("gaza")] },
            [Power.Babylonia] = new() { Orders = [new BuyProvinceOrder("gaza")] },
        });

        foreach (var p in new[] { Power.Egypt, Power.Babylonia })
        {
            var notice = s.InboxOf(p).Single(i => i.Title == "Purchase failed");
            Assert.Equal(InboxKind.Rejected, notice.Kind);
            Assert.Equal("The elders of Gaza would not choose between 2 buyers last season. No gold was paid.", notice.Body);
        }
        Assert.Null(s.Owner["gaza"]);
    }
}
