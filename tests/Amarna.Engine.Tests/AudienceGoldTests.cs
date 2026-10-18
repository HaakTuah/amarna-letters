using Amarna.Engine;

namespace Amarna.Engine.Tests;

/// <summary>Gold sent back and gifts across the two exchanges of one audience.</summary>
public class AudienceGoldTests
{
    /// <summary>Egypt's envoy stands before Alashiya's king, carrying no gold.</summary>
    private static (GameState S, TurnEngine E, Character Envoy, PendingAudience A) AtAudience()
    {
        var s = GameFactory.NewGame(5);
        var envoy = s.Characters.First(c => c.Employer == Power.Egypt);
        envoy.SecretMaster = null;
        var e = new TurnEngine(s);
        e.BeginTurn();
        e.Resolve(new Dictionary<Power, TurnSubmission> { [Power.Egypt] = new() { Orders = [new DispatchOrder(envoy.Id, Power.Alashiya, "Greetings, brother.")] } });
        while (s.Audiences.Count == 0)
        {
            e = new TurnEngine(s);
            e.BeginTurn();
            if (s.Audiences.Count == 0) e.Resolve(new Dictionary<Power, TurnSubmission>());
        }
        return (s, e, envoy, s.Audiences.Single());
    }

    private static AudienceRecord TwoRounds(PendingAudience a, HostReply first, HostReply second, bool acceptFirst = false, bool acceptSecond = false) => new()
    {
        AudienceId = a.Id,
        Delivered = "Greetings.",
        Rounds =
        [
            new AudienceRound { Host = first, Envoy = new EnvoyReaction { Speech = "I hear you.", AcceptBribe = acceptFirst } },
            new AudienceRound { Host = second, Envoy = new EnvoyReaction { Speech = "I shall tell him.", AcceptBribe = acceptSecond } },
        ],
    };

    private static HomeCargo CargoHome(GameState s, Character envoy) =>
        s.Journeys.Single(j => j.Kind == JourneyKind.EnvoyHomebound && j.CharacterId == envoy.Id).Cargo!;

    [Fact]
    public void Gold_named_in_the_first_exchange_is_sent_when_the_second_names_none()
    {
        var (s, e, envoy, a) = AtAudience();
        var gold = s.Treasuries[Power.Alashiya].Gold;
        e.ApplyAudience(TwoRounds(a, new HostReply { Speech = "Take this home.", GoldBack = 30 }, new HostReply { Speech = "Farewell.", End = true }));

        Assert.Equal(gold - 30, s.Treasuries[Power.Alashiya].Gold);
        var cargo = CargoHome(s, envoy);
        Assert.Equal(30, cargo.Gold);
        Assert.Equal(100, cargo.PurityPercent);
        Assert.Contains(s.Trails.Single().Outcomes, o => o.Contains("sent back 30 shekels"));
    }

    [Fact]
    public void A_new_amount_in_the_second_exchange_replaces_the_first_with_its_purity()
    {
        var (s, e, envoy, a) = AtAudience();
        var gold = s.Treasuries[Power.Alashiya].Gold;
        e.ApplyAudience(TwoRounds(a, new HostReply { GoldBack = 30 }, new HostReply { GoldBack = 50, GoldBackPurity = 80, End = true }));

        Assert.Equal(gold - 40, s.Treasuries[Power.Alashiya].Gold); // 50 at 80% fine
        var cargo = CargoHome(s, envoy);
        Assert.Equal(50, cargo.Gold);
        Assert.Equal(80, cargo.PurityPercent);
    }

    [Fact]
    public void An_envoy_takes_one_gift_per_audience_and_the_host_is_told()
    {
        var (s, e, envoy, a) = AtAudience();
        var gold = s.Treasuries[Power.Alashiya].Gold;
        var purse = envoy.Purse;
        e.ApplyAudience(TwoRounds(a, new HostReply { Bribe = 20 }, new HostReply { Bribe = 30, End = true }, acceptFirst: true, acceptSecond: true));

        Assert.Equal(gold - 20, s.Treasuries[Power.Alashiya].Gold);
        Assert.Equal(purse + 20, envoy.Purse);
        Assert.Contains("a second gift was not given: an envoy takes one gift per audience", s.Trails.Single().Outcomes);
        var notice = s.InboxOf(Power.Alashiya).Single(i => i.Kind == InboxKind.Audience);
        Assert.Contains("a second gift was not given: an envoy takes one gift per audience", notice.Body);
    }

    [Fact]
    public void A_gift_refused_in_the_first_exchange_may_be_offered_again()
    {
        var (s, e, envoy, a) = AtAudience();
        var gold = s.Treasuries[Power.Alashiya].Gold;
        e.ApplyAudience(TwoRounds(a, new HostReply { Bribe = 20 }, new HostReply { Bribe = 30, End = true }, acceptFirst: false, acceptSecond: true));

        Assert.Equal(gold - 30, s.Treasuries[Power.Alashiya].Gold);
        Assert.DoesNotContain(s.Trails.Single().Outcomes, o => o.Contains("second gift"));
    }

    [Fact]
    public void The_second_exchange_shows_the_host_what_it_already_named_and_gave()
    {
        var (_, e, _, a) = AtAudience();
        var first = new AudienceRound { Host = new HostReply { GoldBack = 30, Bribe = 20 }, Envoy = new EnvoyReaction { AcceptBribe = true } };
        var view = e.BuildAudienceView(a, "Greetings.", 0, [new Exchange { Host = "", Envoy = "" }], 2, [first]);
        Assert.Equal(30, view.GoldBackNamed);
        Assert.Equal(20, view.GiftAccepted);

        var opening = e.BuildAudienceView(a, "Greetings.", 0, [], 1);
        Assert.Equal(0, opening.GoldBackNamed);
        Assert.Equal(0, opening.GiftAccepted);
    }
}
