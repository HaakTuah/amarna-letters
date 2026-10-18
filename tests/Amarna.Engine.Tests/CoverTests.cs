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
        Assert.Empty(held.Char(envoy.Id).Covers);
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
        Assert.Null(defector.CoverOf(Power.Egypt));
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
        Assert.NotNull(caught.Char(id).CoverOf(Power.Babylonia));
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
        Assert.Empty(caught.Char(id).Covers);
        Assert.Equal("captured", known.Status);
        Assert.Equal("held captive at the court of Assyria; Assyria demands 1 mina 30 shekels for their return (order pay_ransom)", known.Duty);
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
        Assert.Empty(caught.Char(id).Covers);
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
        // Hatti knew it was held: it goes on believing so until the first report from it arrives.
        while (!s.InboxOf(Power.Hatti).Any(i => i.Kind == InboxKind.SpyReport && i.Subject == spy.Id))
        {
            Assert.Equal("at the court of Mitanni", Views.For(s, Power.Hatti).Court.Single(c => c.Id == spy.Id).Where);
            Begin(s).Resolve(None());
        }
        var seen = Views.For(s, Power.Hatti).Court.Single(c => c.Id == spy.Id);
        Assert.Equal(("watching washukanni", "in washukanni"), (seen.Duty, seen.Where));
    }

    // ---------------------------------------------------------------- a defector on its new master's errands

    /// <summary>Egypt's envoy has gone over to Alashiya at the audience: Egypt still believes it on the road home.</summary>
    private static (GameState S, Character Defector) Defector()
    {
        var (at, envoy) = AtAudience();
        var s = EndAudience(at, new HostReply { JobOffer = 40 }, new EnvoyReaction { AcceptJob = true });
        return (s, s.Char(envoy.Id));
    }

    /// <summary>Sends <paramref name="c"/> from its new court to <paramref name="to"/> and stops at the season it stands before that king.</summary>
    private static PendingAudience SendTo(GameState s, Power from, Character c, Power to)
    {
        new TurnEngine(s).Resolve(Orders(from, new DispatchOrder(c.Id, to, "Greetings.")));
        while (true)
        {
            var e = Begin(s);
            if (s.Audiences.FirstOrDefault(a => a.EnvoyId == c.Id) is { } a) return a;
            e.Resolve(None());
        }
    }

    private static void Answer(GameState s, PendingAudience a, HostReply host, EnvoyReaction? envoy = null) =>
        new TurnEngine(s).ApplyAudience(new AudienceRecord { AudienceId = a.Id, Delivered = "Greetings.", Rounds = [new AudienceRound { Host = host, Envoy = envoy ?? new EnvoyReaction() }] });

    [Fact]
    public void A_defector_held_on_its_new_masters_errand_is_covered_for_that_master_and_a_release_leaves_the_old_masters_cover()
    {
        var (s, defector) = Defector();
        var audience = SendTo(s, Power.Alashiya, defector, Power.Hatti);
        var egypt = Seen(s, Power.Egypt, defector.Id);
        var wages = new TurnEngine(s).Wages(Power.Alashiya);
        Assert.Equal("at the court of Hatti as envoy", Views.For(s, Power.Alashiya).Court.Single(c => c.Id == defector.Id).Duty);

        // Hatti holds it: Alashiya, which sent it, sees it on the road home, as Egypt still does.
        Answer(s, audience, new HostReply { Detain = true });
        Assert.Equal(Duty.Detained, defector.Duty);
        Assert.NotNull(defector.CoverOf(Power.Alashiya));
        Assert.NotNull(defector.CoverOf(Power.Egypt));
        var seen = Views.For(s, Power.Alashiya).Court.Single(c => c.Id == defector.Id);
        Assert.Equal(("on the road home", "travelling"), (seen.Duty, seen.Where));
        Assert.Equal(wages, new TurnEngine(s).Wages(Power.Alashiya));
        Assert.Equal(egypt, Seen(s, Power.Egypt, defector.Id));

        // Hatti lets it go: Egypt's list and wages do not change for an event between two other courts.
        new TurnEngine(s).Resolve(Orders(Power.Hatti, new ReleaseOrder(defector.Id, "Go.")));
        Assert.NotNull(defector.CoverOf(Power.Egypt));
        Assert.Equal(egypt, Seen(s, Power.Egypt, defector.Id));
        Assert.Equal("on the road home", Views.For(s, Power.Alashiya).Court.Single(c => c.Id == defector.Id).Duty);
    }

    [Fact]
    public void A_defector_that_goes_over_again_stays_on_both_former_masters_lists_and_is_paid_by_both()
    {
        var (s, defector) = Defector();
        var audience = SendTo(s, Power.Alashiya, defector, Power.Hatti);
        var egypt = Seen(s, Power.Egypt, defector.Id);
        var wages = new TurnEngine(s).Wages(Power.Alashiya);
        var court = Views.For(s, Power.Alashiya).Court.Count;

        Answer(s, audience, new HostReply { JobOffer = 50 }, new EnvoyReaction { AcceptJob = true });
        Assert.Equal(Power.Hatti, defector.Employer);
        Assert.Equal(wages, new TurnEngine(s).Wages(Power.Alashiya));
        Assert.Equal(court, Views.For(s, Power.Alashiya).Court.Count);
        Assert.Equal("on the road home", Views.For(s, Power.Alashiya).Court.Single(c => c.Id == defector.Id).Duty);
        Assert.Equal(egypt, Seen(s, Power.Egypt, defector.Id));
    }

    [Fact]
    public void A_defector_sent_to_its_old_masters_court_is_seen_there_as_it_is_and_no_word_of_it_follows()
    {
        var (s, defector) = Defector();
        Assert.NotNull(defector.CoverOf(Power.Egypt));
        SendTo(s, Power.Alashiya, defector, Power.Egypt);

        // It stands before Egypt's king as Alashiya's envoy: the cover is gone, and so is the word that it is overdue.
        Assert.Empty(defector.Covers);
        Assert.DoesNotContain(Views.For(s, Power.Egypt).Court, c => c.Id == defector.Id);
        var known = Views.For(s, Power.Egypt).Known.Single(c => c.Id == defector.Id);
        Assert.Equal((Power.Alashiya, "at your court"), (known.Employer!.Value, known.Where));
        Assert.Contains(known.KnownFacts, f => f.StartsWith("Abandoned the service of"));
        Assert.DoesNotContain(s.Journeys, j => j.Kind == JourneyKind.Rumor && j.CharacterId == defector.Id);
        for (var i = 0; i < 3; i++) { new TurnEngine(s).Resolve(None()); Begin(s); }
        Assert.DoesNotContain(s.InboxOf(Power.Egypt), x => x.Kind == InboxKind.Rumor && x.Subject == defector.Id);
    }

    [Fact]
    public void A_masters_fall_ends_only_its_own_covers()
    {
        var (s, defector) = Defector();
        var audience = SendTo(s, Power.Alashiya, defector, Power.Hatti);
        Answer(s, audience, new HostReply { Detain = true });
        Assert.Equal(2, defector.Covers.Count);

        s.Units.RemoveAll(u => u.Power == Power.Egypt);
        foreach (var id in s.Owner.Where(x => x.Value == Power.Egypt).Select(x => x.Key).ToList()) s.Owner[id] = Power.Babylonia;
        new TurnEngine(s).Resolve(None());
        Assert.Contains(Power.Egypt, s.Eliminated);
        Assert.Null(defector.CoverOf(Power.Egypt));
        Assert.NotNull(defector.CoverOf(Power.Alashiya));
    }

    // ---------------------------------------------------------------- inquiries, release, recall

    [Fact]
    public void Inquiries_into_a_servant_believed_away_show_in_the_court_list_as_for_any_servant()
    {
        var (caught, _, id) = CaughtSpy();
        var spy = caught.Char(id);
        for (var i = 0; i < 4; i++) spy.Facts.Add(new Fact { Id = $"f90{i}", Text = $"Hidden fact {i}.", Secrecy = Secrecy.Hidden });
        new TurnEngine(caught).Resolve(Orders(Power.Babylonia, new BackgroundCheckOrder(id, 600)));
        Begin(caught);
        Assert.NotNull(spy.CoverOf(Power.Babylonia));
        var found = spy.FactsKnownTo(Power.Babylonia).Select(f => f.Text).ToList();
        Assert.Contains(found, f => f.StartsWith("Hidden fact"));
        Assert.Equal(found, Views.For(caught, Power.Babylonia).Court.Single(c => c.Id == id).KnownFacts);

        // A defection's public fact stays unseen in the list until an inquiry finds it; then it shows, as the inquiry said.
        var (gone, defector) = Defector();
        Assert.DoesNotContain(Views.For(gone, Power.Egypt).Court.Single(c => c.Id == defector.Id).KnownFacts, f => f.StartsWith("Abandoned"));
        new TurnEngine(gone).Resolve(Orders(Power.Egypt, new BackgroundCheckOrder(defector.Id, 10)));
        Begin(gone);
        Assert.Contains(Views.For(gone, Power.Egypt).Court.Single(c => c.Id == defector.Id).KnownFacts, f => f.StartsWith("Abandoned"));
    }

    [Fact]
    public void A_detained_envoy_let_go_after_its_lord_heard_it_was_overdue_reads_so_until_it_is_home()
    {
        var (at, envoy) = AtAudience();
        var s = EndAudience(at, new HostReply { Detain = true });
        while (!s.InboxOf(Power.Egypt).Any(x => x.Kind == InboxKind.Rumor && x.Subject == envoy.Id)) { new TurnEngine(s).Resolve(None()); Begin(s); }
        var before = Seen(s, Power.Egypt, envoy.Id);
        Assert.Contains("\"duty\":\"has not returned from Alashiya\"", before);

        new TurnEngine(s).Resolve(Orders(Power.Alashiya, new ReleaseOrder(envoy.Id, "Go home.")));
        Assert.Equal(Duty.EnvoyHomebound, s.Char(envoy.Id).Duty);
        Assert.Equal(before, Seen(s, Power.Egypt, envoy.Id));
        while (true)
        {
            var e = Begin(s);
            if (s.Char(envoy.Id).At == Power.Egypt) break;
            Assert.Equal("has not returned from Alashiya", Views.For(s, Power.Egypt).Court.Single(c => c.Id == envoy.Id).Duty);
            e.Resolve(None());
        }
        Assert.True(Views.For(s, Power.Egypt).Court.Single(c => c.Id == envoy.Id).Ready);
        Assert.Contains(s.InboxOf(Power.Egypt), x => x.Kind == InboxKind.EnvoyReport && x.Subject == envoy.Id);
    }

    [Fact]
    public void An_envoy_held_and_let_go_in_the_same_season_comes_home_on_time_with_no_word_that_it_is_overdue()
    {
        var (at, envoy) = AtAudience();
        var s = EndAudience(at, new HostReply { Detain = true });
        new TurnEngine(s).Resolve(Orders(Power.Alashiya, new ReleaseOrder(envoy.Id, "Go.")));
        Assert.Equal("on the road home", Views.For(s, Power.Egypt).Court.Single(c => c.Id == envoy.Id).Duty);
        for (var i = 0; i < 4; i++) { Begin(s); new TurnEngine(s).Resolve(None()); }
        Assert.Equal(Power.Egypt, s.Char(envoy.Id).At);
        Assert.DoesNotContain(s.InboxOf(Power.Egypt), x => x.Kind == InboxKind.Rumor && x.Subject == envoy.Id);
    }

    [Fact]
    public void A_court_that_dismissed_a_servant_it_believed_away_hears_no_word_that_it_is_overdue()
    {
        var (at, envoy) = AtAudience();
        var s = EndAudience(at, new HostReply { Detain = true });
        new TurnEngine(s).Resolve(Orders(Power.Egypt, new DismissOrder(envoy.Id)));
        Assert.Contains(s.Journeys, j => j.News == NewsKind.Overdue && j.CharacterId == envoy.Id);
        while (s.Journeys.Any(j => j.News == NewsKind.Overdue)) Begin(s).Resolve(None());
        Assert.DoesNotContain(s.InboxOf(Power.Egypt), x => x.Kind == InboxKind.Rumor && x.Subject == envoy.Id);
    }

    [Fact]
    public void A_caught_spy_let_go_appears_at_its_post_until_it_is_home()
    {
        var (caught, _, id) = CaughtSpy();
        new TurnEngine(caught).Resolve(Orders(Power.Assyria, new CaptiveOrder(id, CaptiveFate.Release)));
        Assert.Equal(Duty.EnvoyHomebound, caught.Char(id).Duty);
        Assert.Equal("watching Assyria", Views.For(caught, Power.Babylonia).Court.Single(c => c.Id == id).Duty);
        while (true)
        {
            var e = Begin(caught);
            if (caught.Char(id).At == Power.Babylonia) break;
            Assert.Equal("watching Assyria", Views.For(caught, Power.Babylonia).Court.Single(c => c.Id == id).Duty);
            e.Resolve(None());
        }
        Assert.Empty(caught.Char(id).Covers);
        Assert.True(Views.For(caught, Power.Babylonia).Court.Single(c => c.Id == id).Ready);
        Assert.Contains(caught.InboxOf(Power.Babylonia), x => x.Title == "Agent returns" && x.Subject == id);
    }

    [Fact]
    public void A_caught_spy_recalled_by_its_unknowing_master_is_heard_to_be_overdue_a_season_after_it_was_due()
    {
        var (caught, free, id) = CaughtSpy();
        new TurnEngine(caught).Resolve(Orders(Power.Babylonia, new RecallSpyOrder(id)));
        new TurnEngine(free).Resolve(Orders(Power.Babylonia, new RecallSpyOrder(id)));
        var home = caught.Turn - 1 + new TurnEngine(caught).TravelTurns(Power.Assyria, Power.Babylonia);
        while (caught.Turn <= home)
        {
            Begin(caught);
            Begin(free);
            if (caught.Turn < home) Assert.Equal(Seen(free, Power.Babylonia, id), Seen(caught, Power.Babylonia, id));
            new TurnEngine(caught).Resolve(None());
            new TurnEngine(free).Resolve(None());
        }
        // In the free game it came home; in the other its master hears, a season late, that it has not.
        Begin(caught);
        Assert.Contains(caught.InboxOf(Power.Babylonia), x => x.Kind == InboxKind.Rumor && x.Subject == id && x.Body.Contains("has not returned from the court of Assyria"));
        var seen = Views.For(caught, Power.Babylonia).Court.Single(c => c.Id == id);
        Assert.Equal(("has not returned from Assyria", "unknown"), (seen.Duty, seen.Where));
        Assert.Equal(CharacterStatus.Captured, caught.Char(id).Status);
    }

    [Fact]
    public void A_caught_spy_recalled_by_its_unknowing_master_and_then_turned_comes_home_as_told()
    {
        var (caught, _, id) = CaughtSpy();
        new TurnEngine(caught).Resolve(Orders(Power.Babylonia, new RecallSpyOrder(id)));
        Begin(caught).Resolve(Orders(Power.Assyria, new CaptiveOrder(id, CaptiveFate.Turn, Poison: "Assyria sleeps.")));
        var spy = caught.Char(id);
        Assert.Equal((CharacterStatus.Employed, Duty.EnvoyHomebound, Power.Assyria), (spy.Status, spy.Duty, spy.SecretMaster!.Value));
        Assert.Contains(caught.Journeys, j => j.Kind == JourneyKind.SpyHomebound && j.CharacterId == id);
        Assert.NotEqual("watching Assyria", Views.For(caught, Power.Babylonia).Court.Single(c => c.Id == id).Duty);
        while (spy.At != Power.Babylonia) Begin(caught).Resolve(None());
        Assert.Empty(spy.Covers);
        Assert.Equal(Duty.None, spy.Duty);
    }

    [Fact]
    public void A_servant_believed_away_who_goes_free_reads_as_one_of_yours_until_it_presents_itself()
    {
        var (s, defector) = Defector();
        var (at, _) = AtAudience();
        var home = EndAudience(at, new HostReply { End = true });
        new TurnEngine(s).Resolve(Orders(Power.Alashiya, new DismissOrder(defector.Id)));
        Assert.Equal(CharacterStatus.Free, defector.Status);
        Assert.NotNull(defector.CoverOf(Power.Egypt));

        string Refusal(GameState g) => new OrderValidator(g).Validate(Power.Egypt, new TurnSubmission { Orders = [new HireOrder(defector.Id, 30)] }).Rejected.Single().Reason;
        Assert.Equal(Refusal(home), Refusal(s));
        Assert.Equal($"{defector.Name} is not available for hire", Refusal(s));

        // It comes before Egypt's king seeking service: the cover ends, and it is a candidate like any other.
        new TurnEngine(s).Fulfil(new MindRequest { Id = "r900", Task = MindTask.Pitch, CharacterId = defector.Id, Court = Power.Egypt }, new MindReply { Text = "I would serve you again.", Number = 25 });
        Assert.Empty(defector.Covers);
        Assert.DoesNotContain(Views.For(s, Power.Egypt).Court, c => c.Id == defector.Id);
        Assert.Contains(Views.For(s, Power.Egypt).Known, c => c.Id == defector.Id && c.Pitch == "I would serve you again.");
    }

    // ---------------------------------------------------------------- a fallen court

    [Fact]
    public void A_fallen_court_catches_no_spy_and_lets_its_prisoners_go()
    {
        var s = GameFactory.NewGame(5);
        var watcher = s.Characters.First(c => c.Employer == Power.Babylonia);
        var captive = s.Characters.First(c => c.Employer == Power.Hatti);
        var envoy = s.Characters.First(c => c.Employer == Power.Egypt);
        foreach (var c in new[] { watcher, captive, envoy }) c.SecretMaster = null;
        (captive.Status, captive.HeldBy, captive.At, captive.MissionTarget) = (CharacterStatus.Captured, Power.Assyria, Power.Assyria, Power.Assyria);
        (envoy.Duty, envoy.HeldBy, envoy.At, envoy.MissionTarget) = (Duty.Detained, Power.Assyria, Power.Assyria, Power.Assyria);

        s.Units.RemoveAll(u => u.Power == Power.Assyria);
        foreach (var id in s.Owner.Where(x => x.Value == Power.Assyria).Select(x => x.Key).ToList()) s.Owner[id] = Power.Babylonia;
        Begin(s).Resolve(None());
        Assert.Contains(Power.Assyria, s.Eliminated);
        Assert.Equal((CharacterStatus.Employed, Duty.EnvoyHomebound), (captive.Status, captive.Duty));
        Assert.Null(captive.HeldBy);
        Assert.Equal(Duty.EnvoyHomebound, envoy.Duty);
        Assert.Null(envoy.HeldBy);
        Assert.Contains(s.Journeys, j => j.CharacterId == envoy.Id && j.Kind == JourneyKind.EnvoyHomebound && j.To == Power.Egypt);

        // However heavy the watch it once paid for, nobody is left to catch a spy still watching its court.
        (watcher.Duty, watcher.At, watcher.MissionTarget) = (Duty.SpyPosted, Power.Assyria, Power.Assyria);
        for (var i = 0; i < 10; i++)
        {
            var e = Begin(s);
            s.CounterIntel[Power.Assyria] = 50000;
            e.Resolve(None());
            Assert.Equal(CharacterStatus.Employed, watcher.Status);
        }
        Assert.Equal(Power.Hatti, captive.At);
        Assert.Equal(Power.Egypt, envoy.At);
    }
}
