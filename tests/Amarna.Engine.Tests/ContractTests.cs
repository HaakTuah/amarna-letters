using Amarna.Engine;

namespace Amarna.Engine.Tests;

/// <summary>Terms, notice and renewal: a servant who wants more gives a season's notice and names a price; its master renews it or it leaves.</summary>
public class ContractTests
{
    private static TurnEngine Begin(GameState s)
    {
        var e = new TurnEngine(s);
        e.BeginTurn();
        foreach (var r in e.MindRequests.ToList()) e.Fulfil(r, new MindReply { Text = $"[{r.Task}]" });
        return e;
    }

    private static Dictionary<Power, TurnSubmission> None() => new();

    private static Dictionary<Power, TurnSubmission> Orders(Power p, params Order[] orders) => new() { [p] = new TurnSubmission { Orders = orders.ToList() } };

    private static string Refusal(GameState s, Order o) => new OrderValidator(s).Validate(Power.Egypt, new TurnSubmission { Orders = [o] }).Rejected.Single().Reason;

    /// <summary>
    /// One of Egypt's envoys, at a wage of 12, whose term ends with turn 1. Greedy and able, it asks 33 to serve on
    /// (6 + 80/8 + 80/8 + reputation 10/5 = 28, and 5 more for its greed); a modest one asks only 6.
    /// </summary>
    private static (GameState S, Character C) Servant(bool wantsMore = true, GameConfig? config = null)
    {
        var s = GameFactory.NewGame(5, config ?? new GameConfig { CatastropheChance = 0 });
        var c = s.Characters.First(c => c.Employer == Power.Egypt);
        c.SecretMaster = null;
        c.Traits.Sympathy = null;
        (c.Traits.Competence, c.Traits.Greed, c.Traits.Loyalty) = wantsMore ? (80, 80, 50) : (20, 10, 80);
        c.Contract = new Contract { Wage = 12, StartTurn = 1, UntilTurn = 1 };
        Assert.Equal(wantsMore ? 33 : 6, TurnEngine.RenewalPrice(c, Power.Egypt));
        return (s, c);
    }

    [Fact]
    public void A_servant_who_wants_more_gives_a_season_s_notice_and_names_a_price()
    {
        var (s, c) = Servant();
        Begin(s).Resolve(None());
        Begin(s);
        Assert.Equal(2, s.Turn);
        Assert.Contains(s.InboxOf(Power.Egypt), i => i.Turn == 2 && i.Kind == InboxKind.Notice && i.Title == "A servant gives notice"
            && i.Body == $"{c.Name}'s term has ended. They ask 33 shekels a season to serve on: renew them this season (order renew), or they leave at the start of turn 3 (or, if you send them out first, when they are next at your court).");
        Assert.Equal((CharacterStatus.Employed, Power.Egypt, 12), (c.Status, c.Employer!.Value, c.Contract!.Wage));
        Assert.Equal((33, 3), (c.Contract.NoticePrice!.Value, c.Contract.LeavesTurn!.Value));

        // The king reads it in plain words, and it is still at court, ready to be sent.
        var line = Views.For(s, Power.Egypt).Court.Single(x => x.Id == c.Id);
        Assert.True(line.Ready);
        Assert.Equal("serves at 12 a season; has given notice: asks 33 a season to serve on; leaves at the start of turn 3 unless renewed", line.Term);
        Assert.Equal((33, 3), (line.NoticePrice!.Value, line.LeavesTurn!.Value));
    }

    [Fact]
    public void A_servant_not_renewed_leaves_at_the_start_of_the_next_season_free_at_court_and_asking_its_price()
    {
        var (s, c) = Servant();
        Begin(s).Resolve(None());
        Begin(s).Resolve(None());
        var purse = c.Purse;
        Begin(s);
        Assert.Equal((CharacterStatus.Free, Power.Egypt), (c.Status, c.At!.Value));
        Assert.Null(c.Employer);
        // It left before the season's wages: it served one season past its term, the season of its notice.
        Assert.Equal(purse, c.Purse);
        Assert.Contains(s.InboxOf(Power.Egypt), i => i.Turn == 3 && i.Title == "A servant leaves"
            && i.Body == $"{c.Name}'s term has ended and they were not renewed. They ask 33 shekels a season to serve again.");
        var known = Views.For(s, Power.Egypt).Known.Single(x => x.Id == c.Id);
        Assert.Equal(("free", 33), (known.Status, known.AskingPrice!.Value));

        // The old master may hire it back at its price.
        new TurnEngine(s).Resolve(Orders(Power.Egypt, new HireOrder(c.Id, 33)));
        Assert.Equal((Power.Egypt, 33), (c.Employer!.Value, c.Contract!.Wage));
        // The price it asked as a free person stays on its record, but means nothing now: one's own servant shows no asking price.
        Assert.Equal(33, c.AskingPrice[Power.Egypt]);
        Assert.Null(Views.For(s, Power.Egypt).Court.Single(x => x.Id == c.Id).AskingPrice);
    }

    [Fact]
    public void A_servant_away_when_its_notice_runs_out_leaves_when_it_is_next_at_court()
    {
        var (s, c) = Servant();
        Begin(s).Resolve(None());
        // A servant on notice may still be sent on an errand: two seasons to Babylon, two back.
        Begin(s).Resolve(Orders(Power.Egypt, new DispatchOrder(c.Id, Power.Babylonia, "Greetings.")));
        var e = Begin(s);
        Assert.Equal((3, CharacterStatus.Employed, Duty.EnvoyOutbound), (s.Turn, c.Status, c.Duty));
        Assert.Equal("serves at 12 a season; has given notice: asks 33 a season to serve on; leaves when next at your court unless renewed",
            Views.For(s, Power.Egypt).Court.Single(x => x.Id == c.Id).Term);
        e.Resolve(None());
        e = Begin(s);
        e.ApplyAudience(new AudienceRecord { AudienceId = s.Audiences.Single().Id, Delivered = "Greetings.", Rounds = [new AudienceRound { Host = new HostReply { End = true } }] });
        e.Resolve(None());
        Begin(s).Resolve(None());
        Assert.Equal(CharacterStatus.Employed, c.Status);

        e = new TurnEngine(s);
        e.BeginTurn();
        Assert.Equal(6, s.Turn);
        Assert.Equal((CharacterStatus.Free, Power.Egypt, Duty.None), (c.Status, c.At!.Value, c.Duty));
        // It still reports on its errand.
        Assert.Contains(e.MindRequests, r => r.Task == MindTask.EnvoyReport && r.CharacterId == c.Id && r.Court == Power.Egypt);
        Assert.Contains(s.InboxOf(Power.Egypt), i => i.Turn == 6 && i.Title == "A servant leaves" && i.Subject == c.Id);
    }

    [Fact]
    public void A_renewal_at_the_price_starts_a_new_contract_and_ends_the_notice()
    {
        var (s, c) = Servant();
        Begin(s).Resolve(None());
        Begin(s).Resolve(Orders(Power.Egypt, new RenewOrder(c.Id, 33, 8)));
        Assert.Equal((33, 2, 10), (c.Contract!.Wage, c.Contract.StartTurn, c.Contract.UntilTurn));
        Assert.Null(c.Contract.NoticePrice);
        Assert.Null(c.Contract.LeavesTurn);
        Assert.Contains(s.InboxOf(Power.Egypt), i => i.Turn == 3 && i.Title == "Contract renewed" && i.Body == $"{c.Name} stays in your service at 33 shekels a season through turn 10.");

        var purse = c.Purse;
        Begin(s);
        Assert.Equal((CharacterStatus.Employed, purse + 33), (c.Status, c.Purse));
        Assert.Equal("serves at 33 a season through turn 10; if content they then renew themselves, otherwise they give a season's notice and name a price",
            Views.For(s, Power.Egypt).Court.Single(x => x.Id == c.Id).Term);
    }

    [Fact]
    public void A_renewal_below_the_price_is_refused_with_the_price_and_the_servant_leaves()
    {
        var (s, c) = Servant();
        Begin(s).Resolve(None());
        Begin(s).Resolve(Orders(Power.Egypt, new RenewOrder(c.Id, 20)));
        Assert.Contains(s.InboxOf(Power.Egypt), i => i.Turn == 3 && i.Kind == InboxKind.Rejected && i.Title == "Not renewed"
            && i.Body == $"{c.Name} will not serve on for 20 shekels a season; they ask 33 shekels.");
        Assert.Equal(12, c.Contract!.Wage);
        Begin(s);
        Assert.Equal(CharacterStatus.Free, c.Status);
    }

    [Fact]
    public void A_servant_away_on_notice_may_be_renewed_where_it_is()
    {
        var (s, c) = Servant();
        Begin(s).Resolve(None());
        // Renewing is not a task: it may be renewed and sent out in the same season, or renewed while it is away.
        var v = new OrderValidator(s).Validate(Power.Egypt, new TurnSubmission { Orders = [new DispatchOrder(c.Id, Power.Babylonia, "Greetings."), new RenewOrder(c.Id, 20)] });
        Assert.Equal(2, v.Accepted.Count);
        // In either order: a renewal gives the servant no task, so it does not stand in the way of one.
        v = new OrderValidator(s).Validate(Power.Egypt, new TurnSubmission { Orders = [new RenewOrder(c.Id, 20), new DispatchOrder(c.Id, Power.Babylonia, "Greetings.")] });
        Assert.Equal(2, v.Accepted.Count);
        Assert.Null(OrderKeys.CharacterOf(new RenewOrder(c.Id, 20)));
        Begin(s).Resolve(Orders(Power.Egypt, new DispatchOrder(c.Id, Power.Babylonia, "Greetings.")));
        Begin(s).Resolve(Orders(Power.Egypt, new RenewOrder(c.Id, 40, 6)));
        Assert.Equal((40, 9), (c.Contract!.Wage, c.Contract.UntilTurn));
        while (c.Duty != Duty.None)
        {
            var e = Begin(s);
            foreach (var a in s.Audiences.ToList())
                e.ApplyAudience(new AudienceRecord { AudienceId = a.Id, Delivered = "Greetings.", Rounds = [new AudienceRound { Host = new HostReply { End = true } }] });
            e.Resolve(None());
        }
        Assert.Equal((CharacterStatus.Employed, Power.Egypt), (c.Status, c.Employer!.Value));
    }

    [Fact]
    public void A_content_servant_renews_itself_for_six_seasons_at_the_same_wage()
    {
        var (s, c) = Servant(wantsMore: false);
        Begin(s).Resolve(None());
        Begin(s);
        Assert.Equal((12, 8), (c.Contract!.Wage, c.Contract.UntilTurn));
        Assert.Null(c.Contract.NoticePrice);
        Assert.Contains(s.InboxOf(Power.Egypt), i => i.Turn == 2 && i.Title == "Contract renewed" && i.Body == $"{c.Name} stays in your service at 12 shekels a season through turn 8.");
        Assert.DoesNotContain(s.InboxOf(Power.Egypt), i => i.Title == "A servant gives notice");
    }

    [Fact]
    public void One_of_your_people_at_court_may_be_renewed_at_any_time_at_its_price()
    {
        var (s, c) = Servant();
        c.Contract!.UntilTurn = 10;
        // Below what it would ask at the end of its term: refused, with the price.
        new TurnEngine(s).Resolve(Orders(Power.Egypt, new RenewOrder(c.Id, 30)));
        Assert.Contains(s.InboxOf(Power.Egypt), i => i.Title == "Not renewed" && i.Body == $"{c.Name} will not serve on for 30 shekels a season; they ask 33 shekels.");
        Assert.Equal((12, 10), (c.Contract.Wage, c.Contract.UntilTurn));
        Begin(s).Resolve(Orders(Power.Egypt, new RenewOrder(c.Id, 33, 12)));
        Assert.Equal((33, 14), (c.Contract.Wage, c.Contract.UntilTurn));
    }

    [Fact]
    public void A_servant_renewed_early_takes_no_cut_from_its_present_wage()
    {
        // A free person at Egypt's court who pitched 60, hired at that.
        var s = GameFactory.NewGame(5, new GameConfig { CatastropheChance = 0 });
        var c = s.Characters.First(x => x.Status == CharacterStatus.Free && x.HeldBy is null);
        c.At = Power.Egypt;
        c.AskingPrice[Power.Egypt] = 60;
        new TurnEngine(s).Resolve(Orders(Power.Egypt, new HireOrder(c.Id, 60)));
        Assert.Equal((Power.Egypt, 60, 7), (c.Employer!.Value, c.Contract!.Wage, c.Contract.UntilTurn));
        var formula = TurnEngine.RenewalPrice(c, Power.Egypt);
        Assert.True(formula < 60);

        // What it would ask at the end of its term is less than it earns now: renewed early, it still asks its present wage.
        Begin(s).Resolve(Orders(Power.Egypt, new RenewOrder(c.Id, formula, 30)));
        Assert.Contains(s.InboxOf(Power.Egypt), i => i.Kind == InboxKind.Rejected && i.Title == "Not renewed"
            && i.Body == $"{c.Name} will not serve on for {Money.Format(formula)} a season; they ask {Money.Format(60)}, their present wage.");
        Assert.Equal((60, 7), (c.Contract.Wage, c.Contract.UntilTurn));

        // At its present wage it serves on, for the longer term.
        Begin(s).Resolve(Orders(Power.Egypt, new RenewOrder(c.Id, 60, 12)));
        Assert.Equal((60, 15), (c.Contract.Wage, c.Contract.UntilTurn));
    }

    [Fact]
    public void A_servant_dismissed_earlier_in_the_season_is_not_renewed()
    {
        var (s, c) = Servant();
        c.Contract!.UntilTurn = 10;
        var v = new OrderValidator(s).Validate(Power.Egypt, new TurnSubmission { Orders = [new DismissOrder(c.Id), new RenewOrder(c.Id, 40)] });
        Assert.Equal(2, v.Accepted.Count);
        new TurnEngine(s).Resolve(Orders(Power.Egypt, new DismissOrder(c.Id), new RenewOrder(c.Id, 40)));
        Assert.Equal(CharacterStatus.Free, c.Status);
        Assert.Null(c.Employer);
        Assert.Contains(s.InboxOf(Power.Egypt), i => i.Kind == InboxKind.Rejected && i.Title == "Not renewed"
            && i.Body == $"{c.Name} is no longer in your service, so could not be renewed.");
    }

    [Fact]
    public void Renew_needs_one_of_your_people_at_court_or_on_notice_and_hire_is_only_for_people_not_in_your_service()
    {
        var (s, c) = Servant();
        c.Contract!.UntilTurn = 10;
        Assert.Equal($"{c.Name} is already in your service; to keep them on, order renew", Refusal(s, new HireOrder(c.Id, 40)));
        Begin(s).Resolve(Orders(Power.Egypt, new DispatchOrder(c.Id, Power.Babylonia, "Greetings.")));
        Assert.Equal($"{c.Name} is not at your court and has not given notice", Refusal(s, new RenewOrder(c.Id, 40)));
        var stranger = s.Characters.First(x => x.Employer == Power.Hatti);
        Assert.Equal($"{stranger.Name} is not in your service", Refusal(s, new RenewOrder(stranger.Id, 40)));

        var (t, d) = Servant();
        var twice = new OrderValidator(t).Validate(Power.Egypt, new TurnSubmission { Orders = [new RenewOrder(d.Id, 40), new RenewOrder(d.Id, 50)] });
        Assert.Equal($"{d.Name} was already renewed by an earlier order", twice.Rejected.Single().Reason);
    }

    [Fact]
    public void A_servant_giving_notice_wakes_a_sleeping_seat()
    {
        var (s, c) = Servant(config: new GameConfig { CatastropheChance = 0, SleepingSeats = true });
        s.Sleep[Power.Egypt] = new SleepState { Asleep = true, WakeAt = 50, History = [new SleepSpell { From = 1 }] };
        Begin(s).Resolve(None());
        var e = Begin(s);
        e.WakeCheck();
        Assert.False(s.Sleep[Power.Egypt].Asleep);
        Assert.Equal([$"a servant gives notice: {c.Name} asks 33 shekels a season to serve on"], s.Sleep[Power.Egypt].WokenBecause);
    }

    [Fact]
    public void A_servant_believed_away_on_notice_is_renewed_as_its_master_believes()
    {
        var (s, c) = Servant();
        Begin(s).Resolve(None());
        Begin(s).Resolve(Orders(Power.Egypt, new PlaceSpyOrder(c.Id, Court: Power.Hatti)));
        // Caught at Hatti's court, as its master does not know: it still reads as on notice, watching Hatti.
        c.Covers.Add(new Cover { For = Power.Egypt, Since = s.Turn, Believed = Duty.SpyPosted, DutyText = "watching Hatti", WhereText = "at the court of Hatti", Wage = 12, ContractUntil = 1, NoticePrice = 33, LeavesTurn = 3 });
        c.Status = CharacterStatus.Captured;
        c.HeldBy = Power.Hatti;
        c.At = Power.Hatti;
        c.Duty = Duty.None;
        s.Journeys.RemoveAll(j => j.CharacterId == c.Id);
        Assert.Equal("serves at 12 a season; has given notice: asks 33 a season to serve on; leaves when next at your court unless renewed",
            Views.For(s, Power.Egypt).Court.Single(x => x.Id == c.Id).Term);
        Begin(s).Resolve(Orders(Power.Egypt, new RenewOrder(c.Id, 35, 6)));
        Assert.Contains(s.InboxOf(Power.Egypt), i => i.Title == "Contract renewed" && i.Body == $"{c.Name} stays in your service at 35 shekels a season through turn 9.");
        var line = Views.For(s, Power.Egypt).Court.Single(x => x.Id == c.Id);
        Assert.Equal(("watching Hatti", "serves at 35 a season through turn 9; if content they then renew themselves, otherwise they give a season's notice and name a price"), (line.Duty, line.Term));
        Assert.Equal((35, 9), (c.Contract!.Wage, c.Contract.UntilTurn));
        // The treasury pays what the master now believes it owes, into the captive's purse.
        var purse = c.Purse;
        Begin(s);
        Assert.Equal(purse + 35, c.Purse);
    }

    [Fact]
    public void An_envoy_on_notice_detained_abroad_keeps_its_notice_in_its_master_s_eyes()
    {
        var (s, c) = Servant();
        Begin(s).Resolve(None());
        Begin(s).Resolve(Orders(Power.Egypt, new DispatchOrder(c.Id, Power.Alashiya, "Greetings.")));
        var e = Begin(s);
        while (s.Audiences.Count == 0) { e.Resolve(None()); e = Begin(s); }

        // Alashiya holds it; Egypt, which has not heard, sees it on the road home, still on notice.
        e.ApplyAudience(new AudienceRecord { AudienceId = s.Audiences.Single().Id, Delivered = "Greetings.", Rounds = [new AudienceRound { Host = new HostReply { Detain = true } }] });
        Assert.Equal((Duty.Detained, Power.Alashiya), (c.Duty, c.HeldBy!.Value));
        Assert.NotNull(c.CoverOf(Power.Egypt));
        var line = Views.For(s, Power.Egypt).Court.Single(x => x.Id == c.Id);
        Assert.Equal(("on the road home", "serves at 12 a season; has given notice: asks 33 a season to serve on; leaves when next at your court unless renewed"), (line.Duty, line.Term));

        // So the renewal the notice asked for is accepted, at the price it named.
        Assert.Empty(new OrderValidator(s).Validate(Power.Egypt, new TurnSubmission { Orders = [new RenewOrder(c.Id, 33)] }).Rejected);
        var until = s.Turn + 6;
        e.Resolve(Orders(Power.Egypt, new RenewOrder(c.Id, 33, 6)));
        Assert.Contains(s.InboxOf(Power.Egypt), i => i.Title == "Contract renewed" && i.Body == $"{c.Name} stays in your service at 33 shekels a season through turn {until}.");
        Assert.Equal((33, until), (c.Contract!.Wage, c.Contract.UntilTurn));
    }

    /// <summary>
    /// Egypt awake in the season of its servant's notice, with orders scheduled for that season: resolves the
    /// scheduled orders together with the fresh ones.
    /// </summary>
    private static (GameState S, Character C) Awake(Func<string, Order[]> scheduled, Func<string, Order[]> fresh)
    {
        var (s, c) = Servant(config: new GameConfig { CatastropheChance = 0, SleepingSeats = true });
        Begin(s).Resolve(None());
        var e = Begin(s);
        s.Sleep[Power.Egypt] = new SleepState { WakeAt = 50, LastCalled = s.Turn, Scheduled = [new ScheduledOrders { Turn = s.Turn, Orders = scheduled(c.Id).ToList() }] };
        e.Resolve(Orders(Power.Egypt, fresh(c.Id)));
        return (s, c);
    }

    [Fact]
    public void A_fresh_renewal_replaces_a_scheduled_dismissal_or_renewal_of_the_same_person()
    {
        // Woken by the notice, the king renews the servant it had meant to dismiss.
        var (s, c) = Awake(id => [new DismissOrder(id)], id => [new RenewOrder(id, 40, 6)]);
        Assert.Equal((CharacterStatus.Employed, Power.Egypt, 40), (c.Status, c.Employer!.Value, c.Contract!.Wage));
        Assert.Empty(s.Sleep[Power.Egypt].PendingWake);
        Assert.DoesNotContain(s.InboxOf(Power.Egypt), i => i.Title is "A servant leaves" or "Not renewed");

        // A fresh renewal at another wage replaces the scheduled one, which neither fails nor wakes the seat.
        (s, c) = Awake(id => [new RenewOrder(id, 35, 6)], id => [new RenewOrder(id, 40, 8)]);
        Assert.Equal((40, 2 + 8), (c.Contract!.Wage, c.Contract.UntilTurn));
        Assert.Empty(s.Sleep[Power.Egypt].PendingWake);
        Assert.DoesNotContain(s.InboxOf(Power.Egypt), i => i.Kind == InboxKind.Rejected);
    }

    [Fact]
    public void A_fresh_dismissal_replaces_a_scheduled_renewal_of_the_same_person()
    {
        var (s, c) = Awake(id => [new RenewOrder(id, 40, 6)], id => [new DismissOrder(id)]);
        Assert.Null(c.Employer);
        Assert.Empty(s.Sleep[Power.Egypt].PendingWake);
        Assert.DoesNotContain(s.InboxOf(Power.Egypt), i => i.Title == "Not renewed");
    }

    [Fact]
    public void A_renewal_and_an_errand_for_the_same_person_both_run_whichever_was_scheduled()
    {
        var (s, c) = Awake(id => [new DispatchOrder(id, Power.Babylonia, "Greetings.")], id => [new RenewOrder(id, 40, 6)]);
        Assert.Equal((Duty.EnvoyOutbound, 40), (c.Duty, c.Contract!.Wage));
        Assert.Empty(s.Sleep[Power.Egypt].PendingWake);

        (s, c) = Awake(id => [new RenewOrder(id, 40, 6)], id => [new DispatchOrder(id, Power.Babylonia, "Greetings.")]);
        Assert.Equal((Duty.EnvoyOutbound, 40), (c.Duty, c.Contract!.Wage));
        Assert.Empty(s.Sleep[Power.Egypt].PendingWake);
    }

    [Fact]
    public void A_captive_on_notice_shows_its_notice_and_no_wage_and_may_be_renewed()
    {
        var (s, c) = Servant();
        (c.Contract!.NoticePrice, c.Contract.LeavesTurn) = (33, 1);
        (c.Status, c.HeldBy, c.At) = (CharacterStatus.Captured, Power.Hatti, Power.Hatti);
        var line = Views.For(s, Power.Egypt).Court.Single(x => x.Id == c.Id);
        Assert.Equal(("held captive at the court of Hatti", "has given notice: asks 33 a season to serve on; leaves when next at your court unless renewed"), (line.Duty, line.Term));
        Assert.Null(line.Wage);
        Assert.Empty(new OrderValidator(s).Validate(Power.Egypt, new TurnSubmission { Orders = [new RenewOrder(c.Id, 33)] }).Rejected);

        // One dead in your service has no term.
        c.Status = CharacterStatus.Dead;
        c.Facts[0].KnownBy.Add(Power.Egypt);
        c.Facts[0].Secrecy = Secrecy.Hidden;
        Assert.Equal("", Views.For(s, Power.Egypt).Known.Single(x => x.Id == c.Id).Term);
    }

    [Fact]
    public void A_free_person_at_your_court_shows_what_they_ask()
    {
        var s = GameFactory.NewGame(5);
        var free = s.Characters.First(c => c.Status == CharacterStatus.Free);
        free.At = Power.Egypt;
        free.Pitches.Clear();
        free.AskingPrice.Clear();
        var line = Views.For(s, Power.Egypt).Known.Single(x => x.Id == free.Id);
        Assert.Equal(TurnEngine.BasePrice(free, Power.Egypt), line.AskingPrice);
        // Nobody else sees a price for them.
        Assert.DoesNotContain(Views.For(s, Power.Hatti).Known, x => x.Id == free.Id && x.AskingPrice is not null);
        // Hired at that price.
        new TurnEngine(s).Resolve(Orders(Power.Egypt, new HireOrder(free.Id, line.AskingPrice!.Value)));
        Assert.Equal(Power.Egypt, free.Employer);
    }
}
