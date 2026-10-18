using Amarna.Engine;

namespace Amarna.Engine.Tests;

/// <summary>One open demand per captive, known to the payer only once its rumour has arrived, and paid once.</summary>
public class RansomTests
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

    /// <summary>One of <paramref name="master"/>'s people held captive by <paramref name="jailer"/>, its master aware of it.</summary>
    private static (GameState S, Character Spy) Held(Power master, Power jailer, GameConfig? config = null)
    {
        var s = GameFactory.NewGame(4, config);
        var spy = s.Characters.First(c => c.Employer == master);
        spy.SecretMaster = null;
        spy.Status = CharacterStatus.Captured;
        spy.HeldBy = jailer;
        spy.At = jailer;
        spy.MissionTarget = jailer;
        s.Treasuries[master].Gold = 2000;
        return (s, spy);
    }

    private static List<string> Refusals(GameState s, Power p, params Order[] orders) =>
        new OrderValidator(s).Validate(p, new TurnSubmission { Orders = orders.ToList() }).Rejected.Select(r => r.Reason).ToList();

    private static bool Heard(GameState s, Power p, Character c) => s.InboxOf(p).Any(i => i.Kind == InboxKind.Rumor && i.Subject == c.Id && i.Turn == s.Turn);

    [Fact]
    public void Only_a_demand_that_still_stands_wakes_its_sleeping_payer()
    {
        var (s, spy) = Held(Power.Egypt, Power.Babylonia, new GameConfig { SleepingSeats = true, CatastropheChance = 0 });
        s.Sleep[Power.Egypt] = new SleepState { Asleep = true, WakeAt = 99 };
        List<string> Woken()
        {
            var e = Begin(s);
            s.Sleep[Power.Egypt].Asleep = true;
            e.WakeCheck();
            return s.Sleep[Power.Egypt].WokenBecause.ToList();
        }
        Woken();
        new TurnEngine(s).Resolve(Orders(Power.Babylonia, new CaptiveOrder(spy.Id, CaptiveFate.Ransom, 90)));
        Assert.DoesNotContain("a ransom is demanded for one of your people", Woken());
        new TurnEngine(s).Resolve(Orders(Power.Babylonia, new CaptiveOrder(spy.Id, CaptiveFate.Ransom, 120)));
        // The first demand's word arrives, but it was replaced: nothing to wake for.
        Assert.DoesNotContain("a ransom is demanded for one of your people", Woken());
        new TurnEngine(s).Resolve(None());
        Assert.Contains("a ransom is demanded for one of your people", Woken());
    }

    [Fact]
    public void A_ransom_can_be_paid_once_its_demand_has_arrived_and_only_once()
    {
        var (s, spy) = Held(Power.Hatti, Power.Mitanni);
        var pay = new PayRansomOrder(spy.Id);
        Begin(s).Resolve(Orders(Power.Mitanni, new CaptiveOrder(spy.Id, CaptiveFate.Ransom, 90)));
        Assert.Equal([$"no ransom demand for {spy.Name} has reached you"], Refusals(s, Power.Hatti, pay));

        Begin(s);
        Assert.True(Heard(s, Power.Hatti, spy));
        Assert.Contains(s.InboxOf(Power.Hatti), i => i.Body.EndsWith($"(order pay_ransom for {spy.Id})."));
        Assert.Empty(Refusals(s, Power.Hatti, pay));
        Assert.Equal([$"a ransom for {spy.Name} is already on its way"], Refusals(s, Power.Hatti, pay, pay));

        var gold = s.Treasuries[Power.Hatti].Gold;
        new TurnEngine(s).Resolve(Orders(Power.Hatti, pay, pay));
        Assert.Equal(gold - 90, s.Treasuries[Power.Hatti].Gold);
        Assert.Single(s.Journeys, j => j.Kind == JourneyKind.Ransom);
        Assert.Contains(s.InboxOf(Power.Hatti), i => i.Kind == InboxKind.Rejected && i.Body.Contains($"a ransom for {spy.Name} is already on its way"));
    }

    [Fact]
    public void A_new_demand_replaces_the_old_and_the_old_ones_rumour_announces_nothing()
    {
        // Babylon is two seasons from Egypt: the second demand is made while the first one's word is still on the road.
        var (s, spy) = Held(Power.Egypt, Power.Babylonia);
        Assert.Equal(2, new TurnEngine(s).TravelTurns(Power.Babylonia, Power.Egypt));
        Begin(s).Resolve(Orders(Power.Babylonia, new CaptiveOrder(spy.Id, CaptiveFate.Ransom, 90)));
        Begin(s).Resolve(Orders(Power.Babylonia, new CaptiveOrder(spy.Id, CaptiveFate.Ransom, 120)));
        Assert.Single(s.Tasks, t => t.Kind == TaskKind.RansomDemand);

        Begin(s);
        Assert.False(Heard(s, Power.Egypt, spy));
        Assert.Equal([$"no ransom demand for {spy.Name} has reached you"], Refusals(s, Power.Egypt, new PayRansomOrder(spy.Id)));
        new TurnEngine(s).Resolve(None());

        Begin(s);
        Assert.True(Heard(s, Power.Egypt, spy));
        Assert.Single(s.InboxOf(Power.Egypt), i => i.Kind == InboxKind.Rumor && i.Subject == spy.Id);
        Assert.Contains("demands 2 minas for their return", s.InboxOf(Power.Egypt).Single(i => i.Subject == spy.Id && i.Kind == InboxKind.Rumor).Body);
        Assert.Equal(120, Views.For(s, Power.Egypt).Court.Single(c => c.Id == spy.Id).RansomDemand);

        // Paid: while the gold is on the road, it cannot be paid again.
        new TurnEngine(s).Resolve(Orders(Power.Egypt, new PayRansomOrder(spy.Id)));
        Begin(s);
        Assert.Equal([$"a ransom for {spy.Name} is already on its way"], Refusals(s, Power.Egypt, new PayRansomOrder(spy.Id)));
        new TurnEngine(s).Resolve(None());
        Begin(s);
        Assert.NotEqual(CharacterStatus.Captured, spy.Status);
        Assert.Contains(s.InboxOf(Power.Babylonia), i => i.Title == "Ransom paid" && i.Body.Contains("2 minas"));
    }

    [Fact]
    public void A_ransom_for_a_captive_already_let_go_is_refused_and_if_both_happen_at_once_is_not_sent()
    {
        var (s, spy) = Held(Power.Hatti, Power.Mitanni);
        Begin(s).Resolve(Orders(Power.Mitanni, new CaptiveOrder(spy.Id, CaptiveFate.Ransom, 90)));
        Begin(s);
        Assert.Empty(Refusals(s, Power.Hatti, new PayRansomOrder(spy.Id)));

        // The captor lets the captive go in the season the ransom is paid: the gold is not sent, and the payer is told.
        var gold = s.Treasuries[Power.Hatti].Gold;
        new TurnEngine(s).Resolve(new Dictionary<Power, TurnSubmission>
        {
            [Power.Hatti] = new() { Orders = [new PayRansomOrder(spy.Id)] },
            [Power.Mitanni] = new() { Orders = [new ReleaseOrder(spy.Id, "Go.")] },
        });
        Assert.Equal(gold, s.Treasuries[Power.Hatti].Gold);
        Assert.DoesNotContain(s.Journeys, j => j.Kind == JourneyKind.Ransom);
        var notice = s.InboxOf(Power.Hatti).Single(i => i.Title == "Ransom not sent");
        Assert.Equal(InboxKind.Rejected, notice.Kind);
        Assert.Equal($"The ransom for {spy.Name} could not be sent: {spy.Name} is no longer held by Mitanni.", notice.Body);

        // Once its king can see it on the road home, the order is refused outright.
        Begin(s);
        Assert.Equal([$"{spy.Name} is no longer held by Mitanni"], Refusals(s, Power.Hatti, new PayRansomOrder(spy.Id)));
    }

    [Fact]
    public void A_ransom_paid_for_a_captive_put_to_death_unknown_to_the_payer_goes_and_is_kept()
    {
        var (s, spy) = Held(Power.Egypt, Power.Babylonia);
        Begin(s).Resolve(Orders(Power.Babylonia, new CaptiveOrder(spy.Id, CaptiveFate.Ransom, 90)));
        Begin(s).Resolve(None());
        Begin(s);
        Assert.True(Heard(s, Power.Egypt, spy));
        new TurnEngine(s).Resolve(Orders(Power.Babylonia, new CaptiveOrder(spy.Id, CaptiveFate.Execute)));

        // Egypt has not heard: its captive is held, the demand stands, and its ransom goes.
        Begin(s);
        var seen = Views.For(s, Power.Egypt).Court.Single(c => c.Id == spy.Id);
        Assert.Equal("held captive at the court of Babylonia; Babylonia demands 1 mina 30 shekels for their return (order pay_ransom)", seen.Duty);
        Assert.Empty(Refusals(s, Power.Egypt, new PayRansomOrder(spy.Id)));
        var gold = s.Treasuries[Power.Egypt].Gold;
        new TurnEngine(s).Resolve(Orders(Power.Egypt, new PayRansomOrder(spy.Id)));
        Assert.Equal(gold - 90, s.Treasuries[Power.Egypt].Gold);

        // Then the rumour of the death; the gold reaches the captor, who keeps it.
        Begin(s);
        Assert.Contains(s.InboxOf(Power.Egypt), i => i.Body.Contains("was put to death"));
        Assert.DoesNotContain(Views.For(s, Power.Egypt).Court, c => c.Id == spy.Id);
        new TurnEngine(s).Resolve(None());
        Begin(s);
        Assert.Contains(s.InboxOf(Power.Babylonia), i => i.Title == "Ransom paid");
        Assert.Equal(CharacterStatus.Dead, spy.Status);
    }

    [Theory]
    [InlineData(CaptiveFate.Release)]
    [InlineData(CaptiveFate.Execute)]
    public void A_demand_whose_captive_is_let_go_or_put_to_death_before_its_word_arrives_announces_nothing_and_wakes_nobody(CaptiveFate fate)
    {
        var (s, spy) = Held(Power.Egypt, Power.Babylonia, new GameConfig { SleepingSeats = true, CatastropheChance = 0 });
        s.Sleep[Power.Egypt] = new SleepState { Asleep = true, WakeAt = 99 };
        Begin(s).Resolve(Orders(Power.Babylonia, new CaptiveOrder(spy.Id, CaptiveFate.Ransom, 90)));
        Begin(s).Resolve(Orders(Power.Babylonia, new CaptiveOrder(spy.Id, fate)));
        var e = Begin(s);
        s.Sleep[Power.Egypt].Asleep = true;
        e.WakeCheck();
        Assert.DoesNotContain(s.InboxOf(Power.Egypt), i => i.Body.Contains("demands"));
        Assert.DoesNotContain("a ransom is demanded for one of your people", s.Sleep[Power.Egypt].WokenBecause);
        Assert.DoesNotContain(s.Tasks, t => t.Kind == TaskKind.RansomDemand);
    }

    [Fact]
    public void A_demand_the_payer_has_heard_of_can_be_paid_until_the_word_of_a_new_one_arrives()
    {
        // Babylon is two seasons from Egypt: the second demand's word is on the road for a season.
        var (s, spy) = Held(Power.Egypt, Power.Babylonia);
        Begin(s).Resolve(Orders(Power.Babylonia, new CaptiveOrder(spy.Id, CaptiveFate.Ransom, 90)));
        Begin(s).Resolve(None());
        Begin(s).Resolve(Orders(Power.Babylonia, new CaptiveOrder(spy.Id, CaptiveFate.Ransom, 120)));
        Assert.Equal(2, s.Tasks.Count(t => t.Kind == TaskKind.RansomDemand));

        // Egypt still sees the demand it heard of, and may pay it.
        Begin(s);
        Assert.Equal(90, Views.For(s, Power.Egypt).Court.Single(c => c.Id == spy.Id).RansomDemand);
        Assert.Empty(Refusals(s, Power.Egypt, new PayRansomOrder(spy.Id)));

        // Unpaid, it gives way to the new one when that one's word arrives.
        var unpaid = Json.Clone(s);
        new TurnEngine(unpaid).Resolve(None());
        Begin(unpaid);
        Assert.Single(unpaid.Tasks, t => t.Kind == TaskKind.RansomDemand && t.Spend == 120 && t.Announced);
        Assert.DoesNotContain(unpaid.Tasks, t => t.Kind == TaskKind.RansomDemand && t.Spend == 90);
        Assert.Equal(120, Views.For(unpaid, Power.Egypt).Court.Single(c => c.Id == spy.Id).RansomDemand);
        var gold = s.Treasuries[Power.Egypt].Gold;
        new TurnEngine(s).Resolve(Orders(Power.Egypt, new PayRansomOrder(spy.Id)));
        Assert.Equal(gold - 90, s.Treasuries[Power.Egypt].Gold);

        // The new demand's word arrives while the gold is on the road; the gold, when it comes, frees the captive all the same.
        Begin(s);
        Assert.Equal(120, Views.For(s, Power.Egypt).Court.Single(c => c.Id == spy.Id).RansomDemand);
        Assert.Equal([$"a ransom for {spy.Name} is already on its way"], Refusals(s, Power.Egypt, new PayRansomOrder(spy.Id)));
        new TurnEngine(s).Resolve(None());
        Begin(s);
        Assert.Contains(s.InboxOf(Power.Babylonia), i => i.Title == "Ransom paid" && i.Body.Contains("1 mina 30 shekels"));
        Assert.NotEqual(CharacterStatus.Captured, spy.Status);
    }

    [Fact]
    public void A_ransom_paid_in_the_season_the_captor_lets_the_captive_go_by_a_captive_order_is_not_sent_whoever_comes_first()
    {
        var (s, spy) = Held(Power.Hatti, Power.Mitanni);
        Assert.True(Powers.All.ToList().IndexOf(Power.Hatti) < Powers.All.ToList().IndexOf(Power.Mitanni));
        Begin(s).Resolve(Orders(Power.Mitanni, new CaptiveOrder(spy.Id, CaptiveFate.Ransom, 90)));
        Begin(s);
        var gold = s.Treasuries[Power.Hatti].Gold;
        new TurnEngine(s).Resolve(new Dictionary<Power, TurnSubmission>
        {
            [Power.Hatti] = new() { Orders = [new PayRansomOrder(spy.Id)] },
            [Power.Mitanni] = new() { Orders = [new CaptiveOrder(spy.Id, CaptiveFate.Release)] },
        });
        Assert.Equal(gold, s.Treasuries[Power.Hatti].Gold);
        Assert.DoesNotContain(s.Journeys, j => j.Kind == JourneyKind.Ransom);
        Assert.Equal($"The ransom for {spy.Name} could not be sent: {spy.Name} is no longer held by Mitanni.", s.InboxOf(Power.Hatti).Single(i => i.Title == "Ransom not sent").Body);
    }

    [Fact]
    public void A_captive_turned_after_its_master_heard_of_the_capture_still_appears_held_until_word_comes_from_it()
    {
        var (s, spy) = Held(Power.Hatti, Power.Mitanni);
        Begin(s).Resolve(Orders(Power.Mitanni, new CaptiveOrder(spy.Id, CaptiveFate.Ransom, 90)));
        Begin(s);
        var before = Json.Serialize(Views.For(s, Power.Hatti).Court.Single(c => c.Id == spy.Id));
        Assert.Contains("Mitanni demands 1 mina 30 shekels", before);

        // Turned in the season Hatti pays: Hatti believes its spy held, so the gold goes, and the captor keeps it.
        var gold = s.Treasuries[Power.Hatti].Gold;
        new TurnEngine(s).Resolve(new Dictionary<Power, TurnSubmission>
        {
            [Power.Hatti] = new() { Orders = [new PayRansomOrder(spy.Id)] },
            [Power.Mitanni] = new() { Orders = [new CaptiveOrder(spy.Id, CaptiveFate.Turn, Poison: "Mitanni is weak.")] },
        });
        Assert.Equal((CharacterStatus.Employed, Duty.SpyPosted), (spy.Status, spy.Duty));
        Assert.Equal(gold - 90, s.Treasuries[Power.Hatti].Gold);
        Assert.DoesNotContain(s.InboxOf(Power.Hatti), i => i.Title == "Ransom not sent");
        var after = Views.For(s, Power.Hatti).Court.Single(c => c.Id == spy.Id);
        Assert.Equal(("captured", "at the court of Mitanni"), (after.Status, after.Where));
        Assert.StartsWith("held captive at the court of Mitanni", after.Duty);

        // The double agent's first report is the word: Hatti then sees it at its post. The ransom bought nothing.
        while (!s.InboxOf(Power.Hatti).Any(i => i.Kind == InboxKind.SpyReport && i.Subject == spy.Id)) Begin(s).Resolve(None());
        var seen = Views.For(s, Power.Hatti).Court.Single(c => c.Id == spy.Id);
        Assert.Equal(("watching Mitanni", "at the court of Mitanni"), (seen.Duty, seen.Where));
        Assert.Contains(s.InboxOf(Power.Mitanni), i => i.Title == "Ransom paid");
        Assert.Equal(CharacterStatus.Employed, spy.Status);
    }

    [Fact]
    public void A_captive_its_master_heard_of_draws_no_wage_even_once_put_to_death_unknown_to_it()
    {
        var (s, spy) = Held(Power.Egypt, Power.Babylonia);
        Begin(s).Resolve(Orders(Power.Babylonia, new CaptiveOrder(spy.Id, CaptiveFate.Ransom, 90)));
        Begin(s).Resolve(None());
        Begin(s);
        int Others() => Views.For(s, Power.Egypt).Court.Where(c => c.Id != spy.Id).Sum(c => c.Wage ?? 0);
        Assert.Equal(Others(), new TurnEngine(s).Wages(Power.Egypt));
        Assert.Null(Views.For(s, Power.Egypt).Court.Single(c => c.Id == spy.Id).Wage);
        new TurnEngine(s).Resolve(Orders(Power.Babylonia, new CaptiveOrder(spy.Id, CaptiveFate.Execute)));
        Assert.NotNull(spy.CoverOf(Power.Egypt));
        Assert.Null(Views.For(s, Power.Egypt).Court.Single(c => c.Id == spy.Id).Wage);
        Assert.Equal(Others(), new TurnEngine(s).Wages(Power.Egypt));
        var purse = spy.Purse;
        Begin(s);
        Assert.Equal(purse, spy.Purse);
    }

    [Fact]
    public void A_demand_that_lapses_while_a_newer_one_is_on_the_road_tells_the_captor_nothing_yet()
    {
        var (s, spy) = Held(Power.Egypt, Power.Babylonia);
        Begin(s).Resolve(Orders(Power.Babylonia, new CaptiveOrder(spy.Id, CaptiveFate.Ransom, 90)));
        var lapse = s.Tasks.Single(t => t.Kind == TaskKind.RansomDemand).DueTurn;
        while (s.Turn < lapse - 1) Begin(s).Resolve(None());
        // Made the season before the first lapses: its word is still on the road when the first one lapses.
        Begin(s).Resolve(Orders(Power.Babylonia, new CaptiveOrder(spy.Id, CaptiveFate.Ransom, 120)));
        Begin(s);
        Assert.Equal(lapse, s.Turn);
        Assert.DoesNotContain(s.InboxOf(Power.Babylonia), i => i.Title == "No ransom came");
        Assert.Single(s.Tasks, t => t.Kind == TaskKind.RansomDemand && t.Spend == 120);
    }

    [Fact]
    public void A_captive_put_to_death_is_rumoured_to_its_king_and_to_every_court_that_still_believes_it_serves_it()
    {
        var (s, spy) = Held(Power.Hatti, Power.Mitanni);
        // Once Egypt's envoy, gone over to Hatti unknown to Egypt.
        spy.Covers.Add(new Cover { For = Power.Egypt, Since = 1, Believed = Duty.Detained, DutyText = "has not returned from Hatti", WhereText = "unknown", Wage = 20 });
        Begin(s).Resolve(Orders(Power.Mitanni, new CaptiveOrder(spy.Id, CaptiveFate.Execute)));
        Assert.Equal([Power.Egypt, Power.Hatti], s.Journeys.Where(j => j.News == NewsKind.Death && j.CharacterId == spy.Id).Select(j => j.To).Order().ToList());
        while (s.Journeys.Any(j => j.News == NewsKind.Death)) Begin(s).Resolve(None());
        Assert.Empty(spy.Covers);
        Assert.Contains(s.InboxOf(Power.Egypt), i => i.Body.Contains("was put to death in Mitanni"));
        Assert.DoesNotContain(Views.For(s, Power.Egypt).Court, c => c.Id == spy.Id);
    }

    [Fact]
    public void A_scheduled_ransom_that_cannot_be_sent_wakes_its_seat()
    {
        var (s, spy) = Held(Power.Hatti, Power.Mitanni, new GameConfig { SleepingSeats = true, CatastropheChance = 0 });
        Begin(s).Resolve(Orders(Power.Mitanni, new CaptiveOrder(spy.Id, CaptiveFate.Ransom, 90)));
        Begin(s);
        s.Sleep[Power.Hatti] = new SleepState { Asleep = true, WakeAt = 50, Scheduled = [new ScheduledOrders { Turn = s.Turn, Orders = [new PayRansomOrder(spy.Id)] }] };
        new TurnEngine(s).Resolve(Orders(Power.Mitanni, new CaptiveOrder(spy.Id, CaptiveFate.Release)));
        Assert.Contains(s.Sleep[Power.Hatti].PendingWake, w => w.StartsWith("orders you scheduled could not be carried out") && w.Contains($"{spy.Name} is no longer held by Mitanni"));
    }

    [Fact]
    public void A_ransom_or_a_turning_for_a_captive_whose_kingdom_has_fallen_tells_the_captor_why_it_did_nothing()
    {
        var (s, spy) = Held(Power.Hatti, Power.Mitanni);
        spy.Employer = null;
        spy.Contract = null;
        Begin(s).Resolve(Orders(Power.Mitanni, new CaptiveOrder(spy.Id, CaptiveFate.Ransom, 90)));
        var notice = s.InboxOf(Power.Mitanni).Single(i => i.Kind == InboxKind.Rejected);
        Assert.Contains($"{spy.Name}'s kingdom has fallen: nobody is left to pay. {spy.Name} remains your captive", notice.Body);
        Assert.DoesNotContain(s.Tasks, t => t.Kind == TaskKind.RansomDemand);

        Begin(s).Resolve(Orders(Power.Mitanni, new CaptiveOrder(spy.Id, CaptiveFate.Turn, Poison: "Nothing stirs.")));
        Assert.Contains(s.InboxOf(Power.Mitanni), i => i.Kind == InboxKind.Rejected && i.Body.Contains($"{spy.Name}'s kingdom has fallen: nobody is left to deceive. {spy.Name} remains your captive"));
        Assert.Equal(CharacterStatus.Captured, spy.Status);
    }
}
