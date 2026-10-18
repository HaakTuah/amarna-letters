using Amarna.Engine;

namespace Amarna.Engine.Tests;

/// <summary>
/// News of a court's people abroad reaches it only by rumour or when they return: a servant who is held,
/// changes sides or dies abroad appears to its master as it would have in the normal course of events,
/// and the master keeps paying its wage, until word comes.
/// </summary>
public class CoverTests
{
    private static TurnEngine Begin(GameState s)
    {
        var e = new TurnEngine(s);
        e.BeginTurn();
        foreach (var r in e.MindRequests.ToList()) e.Fulfil(r, new MindReply { Text = $"[{r.Task}]", Number = 15 });
        return e;
    }

    private static Dictionary<Power, TurnSubmission> None() => new();

    private static Dictionary<Power, TurnSubmission> Orders(Power p, params Order[] orders) => new() { [p] = new TurnSubmission { Orders = orders.ToList() } };

    /// <summary>What a court sees of one of its people, and of its treasury: everything a cover must keep the same.</summary>
    private static string Seen(GameState s, Power p, string id)
    {
        var v = Views.For(s, p);
        return Json.Serialize(new { person = v.Court.SingleOrDefault(c => c.Id == id), v.Gold, v.Wages, court = v.Court.Count });
    }

    /// <summary>Egypt's envoy stands before Alashiya's king; the state is cloned so the audience can end two ways.</summary>
    private static (GameState S, Character Envoy) AtAudience()
    {
        var s = GameFactory.NewGame(5);
        var envoy = s.Characters.First(c => c.Employer == Power.Egypt);
        envoy.SecretMaster = null;
        var e = Begin(s);
        e.Resolve(Orders(Power.Egypt, new DispatchOrder(envoy.Id, Power.Alashiya, "Hello.")));
        while (s.Audiences.Count == 0) { e = Begin(s); if (s.Audiences.Count == 0) e.Resolve(None()); }
        return (s, envoy);
    }

    private static GameState EndAudience(GameState at, HostReply host, EnvoyReaction? envoy = null)
    {
        var s = Json.Clone(at);
        var e = new TurnEngine(s);
        e.ApplyAudience(new AudienceRecord { AudienceId = s.Audiences.Single().Id, Delivered = "Hello.", Rounds = [new AudienceRound { Host = host, Envoy = envoy ?? new EnvoyReaction() }] });
        return s;
    }

    [Fact]
    public void A_detained_envoy_appears_to_its_lord_as_one_sent_home_until_it_is_overdue()
    {
        var (at, envoy) = AtAudience();
        var travel = new TurnEngine(at).TravelTurns(Power.Alashiya, Power.Egypt);
        var home = EndAudience(at, new HostReply { End = true });
        var held = EndAudience(at, new HostReply { Detain = true });
        Assert.Equal(Duty.Detained, held.Char(envoy.Id).Duty);

        // From the audience until the season it would have come home, Egypt sees the same in both games.
        Assert.Equal(Seen(home, Power.Egypt, envoy.Id), Seen(held, Power.Egypt, envoy.Id));
        Assert.Contains("\"duty\":\"on the road home\"", Seen(held, Power.Egypt, envoy.Id));
        for (var i = 1; i < travel; i++)
        {
            new TurnEngine(home).Resolve(None());
            new TurnEngine(held).Resolve(None());
            Begin(home);
            Begin(held);
            Assert.Equal(Seen(home, Power.Egypt, envoy.Id), Seen(held, Power.Egypt, envoy.Id));
        }

        // Then the rumour that it is overdue: the cover ends, and Egypt sees what it has heard.
        while (!held.InboxOf(Power.Egypt).Any(x => x.Kind == InboxKind.Rumor && x.Subject == envoy.Id))
        {
            Assert.Equal("on the road home", Views.For(held, Power.Egypt).Court.Single(c => c.Id == envoy.Id).Duty);
            new TurnEngine(held).Resolve(None());
            Begin(held);
        }
        Assert.Null(held.Char(envoy.Id).Cover);
        var seen = Views.For(held, Power.Egypt).Court.Single(c => c.Id == envoy.Id);
        Assert.Equal("has not returned from Alashiya", seen.Duty);
        Assert.False(seen.Ready);
    }

    [Fact]
    public void An_envoy_who_changes_sides_stays_on_its_lords_list_and_is_paid_until_dismissed()
    {
        var (at, envoy) = AtAudience();
        var travel = new TurnEngine(at).TravelTurns(Power.Alashiya, Power.Egypt);
        var home = EndAudience(at, new HostReply { End = true });
        var gone = EndAudience(at, new HostReply { JobOffer = 40 }, new EnvoyReaction { AcceptJob = true });
        var defector = gone.Char(envoy.Id);
        Assert.Equal(Power.Alashiya, defector.Employer);
        Assert.Contains(defector.Facts, f => f.Tag == "defected" && f.Secrecy == Secrecy.Public);

        // Egypt sees an envoy on the road home, with no word of the public fact, and pays its wage as before.
        Assert.Equal(Seen(home, Power.Egypt, envoy.Id), Seen(gone, Power.Egypt, envoy.Id));
        for (var i = 1; i < travel; i++)
        {
            new TurnEngine(home).Resolve(None());
            new TurnEngine(gone).Resolve(None());
            Begin(home);
            Begin(gone);
            Assert.Equal(Seen(home, Power.Egypt, envoy.Id), Seen(gone, Power.Egypt, envoy.Id));
        }
        Assert.Contains(Views.For(gone, Power.Alashiya).Court, c => c.Id == envoy.Id && c.Ready);

        // Word comes only that it has not returned, as for an envoy who is held: it stays on the list, and is still paid.
        while (!gone.InboxOf(Power.Egypt).Any(x => x.Kind == InboxKind.Rumor && x.Subject == envoy.Id)) { new TurnEngine(gone).Resolve(None()); Begin(gone); }
        var seen = Views.For(gone, Power.Egypt).Court.Single(c => c.Id == envoy.Id);
        Assert.Equal("has not returned from Alashiya", seen.Duty);
        Assert.Equal("unknown", seen.Where);
        Assert.DoesNotContain(seen.KnownFacts, f => f.Contains("Abandoned"));
        var wage = seen.Wage!.Value;
        var purse = defector.Purse;
        new TurnEngine(gone).Resolve(None());
        Begin(gone);
        Assert.Equal(purse + wage + 40, defector.Purse);

        // Dismissing it is accepted, like any servant away, and ends the cover and the wage.
        var v = new OrderValidator(gone).Validate(Power.Egypt, new TurnSubmission { Orders = [new DismissOrder(envoy.Id)] });
        Assert.Empty(v.Rejected);
        new TurnEngine(gone).Resolve(Orders(Power.Egypt, new DismissOrder(envoy.Id)));
        Assert.Null(defector.Cover);
        Assert.Contains(gone.InboxOf(Power.Egypt), i => i.Title == "A servant leaves" && i.Body == $"{defector.Name} has been dismissed.");
        Begin(gone);
        Assert.DoesNotContain(Views.For(gone, Power.Egypt).Court, c => c.Id == envoy.Id);
        Assert.Equal(Power.Alashiya, defector.Employer);
        Assert.Equal(purse + wage + 40 + 40, defector.Purse);
    }

    [Fact]
    public void Orders_for_a_servant_its_master_believes_away_never_betray_what_happened()
    {
        var (at, envoy) = AtAudience();
        var gone = EndAudience(at, new HostReply { JobOffer = 40 }, new EnvoyReaction { AcceptJob = true });
        var rejected = new OrderValidator(gone).Validate(Power.Egypt, new TurnSubmission
        {
            Orders = [new DispatchOrder(envoy.Id, Power.Hatti, "Go."), new PlaceSpyOrder(envoy.Id, Court: Power.Hatti), new RecallSpyOrder(envoy.Id)],
        }).Rejected;
        Assert.Equal($"{envoy.Name} is not at your court", rejected[0].Reason);
        Assert.Equal($"{envoy.Name} is not at your court", rejected[1].Reason);
        Assert.Equal($"{envoy.Name} is not on a mission", rejected[2].Reason);

        // The same orders for an envoy really on the road home read the same.
        var home = EndAudience(at, new HostReply { End = true });
        var normal = new OrderValidator(home).Validate(Power.Egypt, new TurnSubmission
        {
            Orders = [new DispatchOrder(envoy.Id, Power.Hatti, "Go."), new PlaceSpyOrder(envoy.Id, Court: Power.Hatti), new RecallSpyOrder(envoy.Id)],
        }).Rejected;
        Assert.Equal(normal.Select(r => r.Reason), rejected.Select(r => r.Reason));
    }

    /// <summary>
    /// Babylonia's spy at Assyria's court, in two games from one seed: in the first Assyria pays heavy watchmen
    /// and catches it, in the second nobody does. Returns both at the season after the catch.
    /// </summary>
    private static (GameState Caught, GameState Free, string Spy) CaughtSpy()
    {
        for (ulong seed = 1; seed <= 40; seed++)
        {
            GameState Game()
            {
                var s = GameFactory.NewGame(seed);
                var c = s.Characters.First(x => x.Employer == Power.Babylonia);
                c.SecretMaster = null;
                c.Traits.Competence = 10;
                s.Treasuries[Power.Assyria].Gold = 100000;
                return s;
            }
            var (caught, free) = (Game(), Game());
            var id = caught.Characters.First(x => x.Employer == Power.Babylonia).Id;
            foreach (var s in new[] { caught, free }) Begin(s).Resolve(Orders(Power.Babylonia, new PlaceSpyOrder(id, Court: Power.Assyria)));
            for (var i = 0; i < 6; i++)
            {
                Begin(caught).Resolve(Orders(Power.Assyria, new CounterIntelOrder(5000)));
                Begin(free).Resolve(None());
                if (free.Char(id).Status == CharacterStatus.Captured) break;
                if (caught.Char(id).Status != CharacterStatus.Captured) continue;
                Begin(caught);
                Begin(free);
                return (caught, free, id);
            }
        }
        throw new InvalidOperationException("no seed gave a catch in one game and none in the other");
    }

    [Fact]
    public void A_caught_spy_appears_at_its_post_until_the_ransom_demand_arrives()
    {
        var (caught, free, id) = CaughtSpy();
        Assert.NotNull(caught.Char(id).Cover);
        for (var i = 0; i < 3; i++)
        {
            Assert.Equal(Seen(free, Power.Babylonia, id), Seen(caught, Power.Babylonia, id));
            new TurnEngine(caught).Resolve(None());
            new TurnEngine(free).Resolve(None());
            Begin(caught);
            Begin(free);
        }
        var before = Views.For(caught, Power.Babylonia).Court.Single(c => c.Id == id);
        Assert.Equal("watching Assyria", before.Duty);
        Assert.Equal("at the court of Assyria", before.Where);
        Assert.False(before.Ready);
        Assert.Null(before.RansomDemand);

        // Assyria asks a ransom: once the word arrives Babylonia sees its spy held, with the demand, and no longer pays it.
        new TurnEngine(caught).Resolve(Orders(Power.Assyria, new CaptiveOrder(id, CaptiveFate.Ransom, 90)));
        while (!caught.InboxOf(Power.Babylonia).Any(x => x.Kind == InboxKind.Rumor && x.Subject == id)) { Begin(caught); new TurnEngine(caught).Resolve(None()); }
        var known = Views.For(caught, Power.Babylonia).Court.Single(c => c.Id == id);
        Assert.Null(caught.Char(id).Cover);
        Assert.Equal("captured", known.Status);
        Assert.Equal("held captive at the court of Assyria; Assyria demands 90 shekels for their return (order pay_ransom)", known.Duty);
        Assert.Equal(90, known.RansomDemand);
        Assert.False(known.Ready);
        Assert.Equal(0, new TurnEngine(caught).Wages(Power.Babylonia) - Views.For(caught, Power.Babylonia).Court.Where(c => c.Id != id).Sum(c => c.Wage ?? 0));
    }

    [Fact]
    public void An_executed_spy_stays_on_its_masters_list_until_the_rumour_of_its_death()
    {
        var (caught, _, id) = CaughtSpy();
        new TurnEngine(caught).Resolve(Orders(Power.Assyria, new CaptiveOrder(id, CaptiveFate.Execute)));
        Assert.Equal(CharacterStatus.Dead, caught.Char(id).Status);
        bool Heard() => caught.InboxOf(Power.Babylonia).Any(x => x.Kind == InboxKind.Rumor && x.Subject == id);
        Assert.Equal("watching Assyria", Views.For(caught, Power.Babylonia).Court.Single(c => c.Id == id).Duty);
        for (var i = 0; i < 4 && !Heard(); i++)
        {
            Begin(caught);
            if (Heard()) break;
            Assert.Equal("watching Assyria", Views.For(caught, Power.Babylonia).Court.Single(c => c.Id == id).Duty);
            new TurnEngine(caught).Resolve(None());
        }
        Assert.True(Heard());
        Assert.Contains(caught.InboxOf(Power.Babylonia), x => x.Body.Contains("was put to death in Assyria"));
        Assert.Null(caught.Char(id).Cover);
        Assert.DoesNotContain(Views.For(caught, Power.Babylonia).Court, c => c.Id == id);
    }

    [Fact]
    public void A_caught_spy_recalled_by_its_unknowing_master_appears_on_the_road_home()
    {
        var (caught, free, id) = CaughtSpy();
        var v = new OrderValidator(caught).Validate(Power.Babylonia, new TurnSubmission { Orders = [new RecallSpyOrder(id)] });
        Assert.Empty(v.Rejected);
        new TurnEngine(caught).Resolve(Orders(Power.Babylonia, new RecallSpyOrder(id)));
        new TurnEngine(free).Resolve(Orders(Power.Babylonia, new RecallSpyOrder(id)));
        Assert.Equal(Seen(free, Power.Babylonia, id), Seen(caught, Power.Babylonia, id));
        Assert.Equal(CharacterStatus.Captured, caught.Char(id).Status);
    }

    [Fact]
    public void A_turned_province_watcher_goes_back_to_its_province()
    {
        var s = GameFactory.NewGame(4);
        var spy = s.Characters.First(c => c.Employer == Power.Hatti);
        spy.Status = CharacterStatus.Captured;
        spy.HeldBy = Power.Mitanni;
        spy.At = Power.Mitanni;
        spy.WatchProvince = "washukanni";
        var e = Begin(s);
        e.Resolve(Orders(Power.Mitanni, new CaptiveOrder(spy.Id, CaptiveFate.Turn, Poison: "All is quiet.")));
        Assert.Equal(Duty.SpyPosted, spy.Duty);
        Assert.Null(spy.At);
        Assert.Equal("in washukanni", Views.For(s, Power.Hatti).Court.Single(c => c.Id == spy.Id).Where);
    }
}
