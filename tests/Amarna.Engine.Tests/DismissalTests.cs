using Amarna.Engine;

namespace Amarna.Engine.Tests;

/// <summary>Nobody is moved by a dismissal: a servant dismissed while away keeps going where it was going, and one held stays held.</summary>
public class DismissalTests
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

    /// <summary>Babylon is two seasons from Egypt each way, so there is a season to dismiss someone on the road.</summary>
    private static (GameState S, Character Envoy) Start()
    {
        var s = GameFactory.NewGame(5);
        var envoy = s.Characters.First(c => c.Employer == Power.Egypt);
        envoy.SecretMaster = null;
        Assert.Equal(2, new TurnEngine(s).TravelTurns(Power.Egypt, Power.Babylonia));
        return (s, envoy);
    }

    [Fact]
    public void An_envoy_dismissed_on_the_way_out_arrives_a_free_person_with_no_audience_and_keeps_the_gold()
    {
        var (s, envoy) = Start();
        Begin(s).Resolve(Orders(Power.Egypt, new DispatchOrder(envoy.Id, Power.Babylonia, "Greetings.", Gold: 100)));
        var e = Begin(s);
        var purse = envoy.Purse;
        e.Resolve(Orders(Power.Egypt, new DismissOrder(envoy.Id)));
        Assert.Equal(CharacterStatus.Free, envoy.Status);
        Assert.Null(envoy.At);
        Assert.Equal(purse + 100, envoy.Purse);
        Assert.Contains(s.InboxOf(Power.Egypt), i => i.Title == "A servant leaves" && i.Body == $"{envoy.Name} has been dismissed. The 1 mina 40 shekels of gold they carried is now theirs.");

        Begin(s);
        Assert.Empty(s.Audiences);
        Assert.Equal(Power.Babylonia, envoy.At);
        Assert.Equal(Duty.None, envoy.Duty);
        Assert.Contains(Views.For(s, Power.Babylonia).Known, c => c.Id == envoy.Id && c.Status == "free");
        Assert.DoesNotContain(Views.For(s, Power.Egypt).Court, c => c.Id == envoy.Id);
    }

    [Fact]
    public void A_dismissed_traveller_hired_by_another_court_on_the_way_stays_with_its_new_master()
    {
        var (s, envoy) = Start();
        Begin(s).Resolve(Orders(Power.Egypt, new DispatchOrder(envoy.Id, Power.Babylonia, "Greetings.")));
        var e = Begin(s);
        e.Resolve(Orders(Power.Egypt, new DismissOrder(envoy.Id)));
        envoy.Pitches[Power.Hatti] = "I would serve you.";
        envoy.AskingPrice[Power.Hatti] = 10;
        // Journeys are short enough that a hire rarely falls inside one; put it back on the road for a season and hire it there.
        // When the old journey ends it must not carry the person off from its new master.
        e = Begin(s);
        Assert.Equal(Power.Babylonia, envoy.At);
        envoy.At = null;
        envoy.Duty = Duty.EnvoyOutbound;
        s.Journeys.Add(new Journey { Id = "j999", Kind = JourneyKind.EnvoyOutbound, DepartTurn = s.Turn, ArriveTurn = s.Turn + 1, From = Power.Egypt, To = Power.Babylonia, CharacterId = envoy.Id, Dispatch = new Dispatch() });
        e.Resolve(Orders(Power.Hatti, new HireOrder(envoy.Id, 12)));
        Assert.Equal(Power.Hatti, envoy.Employer);
        Begin(s);
        Assert.Equal((Power.Hatti, Duty.None), (envoy.At!.Value, envoy.Duty));
        Assert.Contains(Views.For(s, Power.Hatti).Court, c => c.Id == envoy.Id && c.Ready);
    }

    [Fact]
    public void An_envoy_dismissed_on_the_way_home_still_comes_home_reports_and_hands_over_the_gold()
    {
        var (s, envoy) = Start();
        Begin(s).Resolve(Orders(Power.Egypt, new DispatchOrder(envoy.Id, Power.Babylonia, "Greetings.")));
        Begin(s).Resolve(None());
        var e = Begin(s);
        e.ApplyAudience(new AudienceRecord { AudienceId = s.Audiences.Single().Id, Delivered = "Greetings.", Rounds = [new AudienceRound { Host = new HostReply { GoldBack = 60, End = true } }] });
        e.Resolve(None());
        Begin(s).Resolve(Orders(Power.Egypt, new DismissOrder(envoy.Id)));
        Assert.Equal(Duty.EnvoyHomebound, envoy.Duty);
        Assert.Null(envoy.At);

        var gold = s.Treasuries[Power.Egypt].Gold;
        e = new TurnEngine(s);
        e.BeginTurn();
        var income = s.Treasuries[Power.Egypt].Gold - gold;
        var report = e.MindRequests.Single(r => r.Task == MindTask.EnvoyReport && r.CharacterId == envoy.Id);
        e.Fulfil(report, new MindReply { Text = "Babylon greets you." });
        Assert.Equal(gold + income + 60, s.Treasuries[Power.Egypt].Gold);
        Assert.Contains(s.InboxOf(Power.Egypt), i => i.Kind == InboxKind.EnvoyReport && i.Subject == envoy.Id);
        Assert.Equal((CharacterStatus.Free, Power.Egypt, Duty.None), (envoy.Status, envoy.At, envoy.Duty));
    }

    [Fact]
    public void A_dismissed_envoy_hired_by_another_court_on_the_way_home_stays_with_its_new_master()
    {
        var (s, envoy) = Start();
        Begin(s).Resolve(Orders(Power.Egypt, new DispatchOrder(envoy.Id, Power.Babylonia, "Greetings.")));
        Begin(s).Resolve(None());
        var e = Begin(s);
        e.ApplyAudience(new AudienceRecord { AudienceId = s.Audiences.Single().Id, Delivered = "Greetings.", Rounds = [new AudienceRound { Host = new HostReply { End = true } }] });
        e.Resolve(Orders(Power.Egypt, new DismissOrder(envoy.Id)));
        Assert.Equal((CharacterStatus.Free, Duty.EnvoyHomebound), (envoy.Status, envoy.Duty));
        var journey = s.Journeys.Single(j => j.CharacterId == envoy.Id && j.Kind == JourneyKind.EnvoyHomebound);
        Assert.True(journey.ArriveTurn > s.Turn);

        // Hatti hires it while it is still on the road; when the old journey ends it stays where it is.
        envoy.Pitches[Power.Hatti] = "I would serve you.";
        envoy.AskingPrice[Power.Hatti] = 10;
        Begin(s).Resolve(Orders(Power.Hatti, new HireOrder(envoy.Id, 12)));
        Assert.Equal((Power.Hatti, Power.Hatti), (envoy.Employer!.Value, envoy.At!.Value));
        while (s.Journeys.Contains(journey)) Begin(s).Resolve(None());
        Assert.Equal((Power.Hatti, Duty.None), (envoy.At!.Value, envoy.Duty));
        Assert.DoesNotContain(s.InboxOf(Power.Egypt), i => i.Kind == InboxKind.EnvoyReport && i.Subject == envoy.Id);
    }

    [Fact]
    public void A_detained_envoy_dismissed_stays_held_and_the_jailers_release_frees_it_at_the_jailers_court()
    {
        var (s, envoy) = Start();
        Begin(s).Resolve(Orders(Power.Egypt, new DispatchOrder(envoy.Id, Power.Babylonia, "Greetings.")));
        Begin(s).Resolve(None());
        var e = Begin(s);
        e.ApplyAudience(new AudienceRecord { AudienceId = s.Audiences.Single().Id, Delivered = "Greetings.", Rounds = [new AudienceRound { Host = new HostReply { Detain = true } }] });
        e.Resolve(Orders(Power.Egypt, new DismissOrder(envoy.Id)));
        Assert.Equal((CharacterStatus.Free, Duty.Detained, Power.Babylonia), (envoy.Status, envoy.Duty, envoy.HeldBy));
        Assert.Empty(envoy.Covers);

        Begin(s).Resolve(Orders(Power.Babylonia, new ReleaseOrder(envoy.Id, "Go where you will.")));
        Assert.Equal((Duty.None, Power.Babylonia), (envoy.Duty, envoy.At));
        Assert.Null(envoy.HeldBy);
        Assert.DoesNotContain(s.Journeys, j => j.CharacterId == envoy.Id && j.Kind == JourneyKind.EnvoyHomebound);
        Assert.Contains(s.InboxOf(Power.Babylonia), i => i.Title == "Envoy released");
    }

    [Fact]
    public void A_dismissed_captive_stays_a_captive()
    {
        var s = GameFactory.NewGame(4);
        var spy = s.Characters.First(c => c.Employer == Power.Hatti);
        spy.Status = CharacterStatus.Captured;
        spy.HeldBy = Power.Mitanni;
        spy.At = Power.Mitanni;
        Assert.Empty(new OrderValidator(s).Validate(Power.Hatti, new TurnSubmission { Orders = [new DismissOrder(spy.Id)] }).Rejected);
        Begin(s).Resolve(Orders(Power.Hatti, new DismissOrder(spy.Id)));
        Assert.Equal((CharacterStatus.Captured, Power.Mitanni), (spy.Status, spy.HeldBy));
        Assert.Null(spy.Employer);
        Assert.DoesNotContain(Views.For(s, Power.Hatti).Court, c => c.Id == spy.Id);

        // Its captor is not told of another court's dismissal: a ransom it asks goes, as ever, to the king who sent the spy,
        // who may still pay it. Only a turning is refused, since the captive visibly stays in prison.
        Begin(s).Resolve(Orders(Power.Mitanni, new CaptiveOrder(spy.Id, CaptiveFate.Ransom, 90)));
        Assert.DoesNotContain(s.InboxOf(Power.Mitanni), i => i.Kind == InboxKind.Rejected);
        Assert.Contains(s.Tasks, t => t.Kind == TaskKind.RansomDemand && t.CharacterId == spy.Id && t.Requester == Power.Hatti);
        Assert.Contains(s.Journeys, j => j.Kind == JourneyKind.Rumor && j.To == Power.Hatti && j.CharacterId == spy.Id);
        Begin(s).Resolve(Orders(Power.Mitanni, new CaptiveOrder(spy.Id, CaptiveFate.Turn, Poison: "All is quiet.")));
        Assert.Contains(s.InboxOf(Power.Mitanni), i => i.Kind == InboxKind.Rejected && i.Body.Contains($"{spy.Name} serves no king now: nobody is left to deceive. {spy.Name} remains your captive"));
        Assert.Equal(CharacterStatus.Captured, spy.Status);
    }

    [Fact]
    public void A_captive_dismissed_in_the_season_its_captor_turns_it_stays_a_captive_and_the_captor_is_told()
    {
        var s = GameFactory.NewGame(4);
        var spy = s.Characters.First(c => c.Employer == Power.Hatti);
        spy.SecretMaster = null;
        spy.Status = CharacterStatus.Captured;
        spy.HeldBy = Power.Mitanni;
        spy.At = Power.Mitanni;
        Begin(s).Resolve(new Dictionary<Power, TurnSubmission>
        {
            [Power.Hatti] = new() { Orders = [new DismissOrder(spy.Id)] },
            [Power.Mitanni] = new() { Orders = [new CaptiveOrder(spy.Id, CaptiveFate.Turn, Poison: "All is quiet.")] },
        });
        Assert.Equal((CharacterStatus.Captured, Power.Mitanni), (spy.Status, spy.HeldBy));
        Assert.Null(spy.SecretMaster);
        var notice = s.InboxOf(Power.Mitanni).Single(i => i.Kind == InboxKind.Rejected);
        Assert.Equal("Captive order failed", notice.Title);
        Assert.Equal($"Your order for {spy.Name} could not be carried out: {spy.Name} serves no king now: nobody is left to deceive. {spy.Name} remains your captive.", notice.Body);
    }

    [Fact]
    public void A_province_watcher_dismissed_on_its_way_out_reaches_the_province_and_walks_back_free()
    {
        var s = GameFactory.NewGame(5);
        var spy = s.Characters.First(c => c.Employer == Power.Egypt);
        Begin(s).Resolve(Orders(Power.Egypt, new PlaceSpyOrder(spy.Id, Province: FarProvince(s))));
        Assert.Equal(Duty.SpyOutbound, spy.Duty);
        Begin(s).Resolve(Orders(Power.Egypt, new DismissOrder(spy.Id)));
        Assert.Equal((CharacterStatus.Free, Duty.SpyOutbound), (spy.Status, spy.Duty));
        while (!s.Journeys.Any(j => j.CharacterId == spy.Id && j.Kind == JourneyKind.SpyHomebound)) Begin(s).Resolve(None());
        while (spy.At is null) Begin(s).Resolve(None());
        Assert.Equal((Power.Egypt, Duty.None, CharacterStatus.Free), (spy.At!.Value, spy.Duty, spy.Status));
        Assert.Null(spy.WatchProvince);
    }

    /// <summary>A province two seasons from Egypt's capital, so a spy sent there is still on its way a season later.</summary>
    private static string FarProvince(GameState s)
    {
        var e = new TurnEngine(s);
        var cap = e.Map.Capital(Power.Egypt).Id;
        return e.Map.Provinces.Where(p => !p.IsSea && e.TravelTurns(cap, p.Id) >= 2).OrderBy(p => p.Id).First().Id;
    }

    [Fact]
    public void A_dismissed_spy_is_free_where_it_watched_and_a_province_watcher_walks_back_to_the_old_court()
    {
        var s = GameFactory.NewGame(5);
        var (court, field) = (s.Characters.First(c => c.Employer == Power.Egypt), s.Characters.Last(c => c.Employer == Power.Egypt));
        Begin(s).Resolve(Orders(Power.Egypt, new PlaceSpyOrder(court.Id, Court: Power.Babylonia), new PlaceSpyOrder(field.Id, Province: "sinai")));
        while (court.Duty != Duty.SpyPosted || field.Duty != Duty.SpyPosted) Begin(s).Resolve(None());

        Begin(s).Resolve(Orders(Power.Egypt, new DismissOrder(court.Id), new DismissOrder(field.Id)));
        Assert.Equal((CharacterStatus.Free, Duty.None, Power.Babylonia), (court.Status, court.Duty, court.At));
        Assert.Equal(CharacterStatus.Free, field.Status);
        Assert.Null(field.At);
        Assert.Contains(s.Journeys, j => j.Kind == JourneyKind.SpyHomebound && j.CharacterId == field.Id && j.To == Power.Egypt);

        while (field.At is null) Begin(s).Resolve(None());
        Assert.Equal((Power.Egypt, Duty.None, CharacterStatus.Free), (field.At!.Value, field.Duty, field.Status));
        Assert.Null(field.WatchProvince);
        Assert.Contains(Views.For(s, Power.Egypt).Known, c => c.Id == field.Id && c.Status == "free");
    }

    [Fact]
    public void A_spy_dismissed_on_its_way_out_arrives_free_at_the_court_it_was_sent_to_watch()
    {
        var s = GameFactory.NewGame(5);
        var spy = s.Characters.First(c => c.Employer == Power.Egypt);
        Begin(s).Resolve(Orders(Power.Egypt, new PlaceSpyOrder(spy.Id, Court: Power.Babylonia)));
        Begin(s).Resolve(Orders(Power.Egypt, new DismissOrder(spy.Id)));
        Assert.Equal((CharacterStatus.Free, Duty.SpyOutbound), (spy.Status, spy.Duty));
        Begin(s);
        Assert.Equal((Power.Babylonia, Duty.None), (spy.At!.Value, spy.Duty));
        Assert.Null(spy.MissionTarget);
    }
}
