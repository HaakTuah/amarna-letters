using Amarna.Engine;

namespace Amarna.Engine.Tests;

public class IntelligenceTests
{
    private static TurnEngine Begin(GameState s)
    {
        var e = new TurnEngine(s);
        e.BeginTurn();
        return e;
    }

    private static Dictionary<Power, TurnSubmission> Orders(Power p, params Order[] orders) => new() { [p] = new TurnSubmission { Orders = orders.ToList() } };

    private static void Advance(GameState s, int seasons, Func<int, Dictionary<Power, TurnSubmission>>? orders = null)
    {
        for (var i = 0; i < seasons; i++)
        {
            var e = Begin(s);
            foreach (var r in e.MindRequests.ToList()) e.Fulfil(r, new MindReply { Text = $"[{r.Task}] " + string.Join(" ", r.Report?.Observations ?? new()) + (r.Report?.Poison ?? ""), Number = 15 });
            e.Resolve(orders?.Invoke(i) ?? new Dictionary<Power, TurnSubmission>());
        }
    }

    [Fact]
    public void A_posted_spy_sends_reports_home_that_arrive_late()
    {
        var s = GameFactory.NewGame(8);
        var spy = s.Characters.First(c => c.Employer == Power.Babylonia);
        spy.SecretMaster = null;
        spy.Traits.Competence = 95;
        var e = Begin(s);
        e.Resolve(Orders(Power.Babylonia, new PlaceSpyOrder(spy.Id, Court: Power.Assyria)));
        Assert.Equal(Duty.SpyOutbound, spy.Duty);
        Advance(s, 5);
        Assert.Contains(s.InboxOf(Power.Babylonia), i => i.Kind == InboxKind.SpyReport);
    }

    [Fact]
    public void Heavy_watch_catches_spies_and_captives_can_be_turned()
    {
        var caught = false;
        for (ulong seed = 1; seed <= 15 && !caught; seed++)
        {
            var s = GameFactory.NewGame(seed);
            var spy = s.Characters.First(c => c.Employer == Power.Babylonia);
            spy.SecretMaster = null;
            spy.Traits.Competence = 10;
            s.Treasuries[Power.Assyria].Gold = 5000;
            var e = Begin(s);
            e.Resolve(Orders(Power.Babylonia, new PlaceSpyOrder(spy.Id, Court: Power.Assyria)));
            Advance(s, 6, _ => Orders(Power.Assyria, new CounterIntelOrder(200)));
            if (spy.Status != CharacterStatus.Captured) continue;
            caught = true;
            Assert.Equal(Power.Assyria, spy.HeldBy);
            Assert.Contains(s.InboxOf(Power.Assyria), i => i.Title == "A spy is caught");

            e = Begin(s);
            e.Resolve(Orders(Power.Assyria, new CaptiveOrder(spy.Id, CaptiveFate.Turn, Poison: "Assyria has no army left.")));
            Assert.Equal(Power.Assyria, spy.SecretMaster);
            Assert.Equal(Duty.SpyPosted, spy.Duty);
            Assert.Contains(s.Events, x => x.Signal == "double-agent");

            // The turned spy's reports carry the poison, and Babylonia never learns of the turning.
            Advance(s, 4);
            Assert.Contains(s.InboxOf(Power.Babylonia), i => i.Kind == InboxKind.SpyReport && i.Body.Contains("no army left"));
            Assert.DoesNotContain(s.InboxOf(Power.Babylonia), i => i.Body.Contains("turned") || i.Body.Contains("double"));
        }
        Assert.True(caught, "no spy was caught in 15 seeded games");
    }

    [Fact]
    public void A_captive_whose_kingdom_has_fallen_cannot_be_turned()
    {
        // As when the spy's own kingdom falls while they are held: no master, still a captive.
        var s = GameFactory.NewGame(4);
        var spy = s.Characters.First(c => c.Employer == Power.Hatti);
        spy.Status = CharacterStatus.Captured;
        spy.HeldBy = Power.Mitanni;
        spy.At = Power.Mitanni;
        spy.Employer = null;
        spy.Contract = null;
        var e = Begin(s);
        e.Resolve(Orders(Power.Mitanni, new CaptiveOrder(spy.Id, CaptiveFate.Turn, Poison: "Nothing stirs.")));
        Assert.Equal(CharacterStatus.Captured, spy.Status);
        Assert.DoesNotContain(s.Events, x => x.Signal == "double-agent");
        Advance(s, 2);
    }

    [Fact]
    public void Ransomed_captives_come_home_once_paid()
    {
        var s = GameFactory.NewGame(4);
        var spy = s.Characters.First(c => c.Employer == Power.Hatti);
        spy.Status = CharacterStatus.Captured;
        spy.HeldBy = Power.Mitanni;
        spy.At = Power.Mitanni;
        spy.MissionTarget = Power.Mitanni;
        var e = Begin(s);
        e.Resolve(Orders(Power.Mitanni, new CaptiveOrder(spy.Id, CaptiveFate.Ransom, 90)));
        Assert.Contains(s.Tasks, t => t.Kind == TaskKind.RansomDemand && t.Requester == Power.Hatti);
        var before = s.Treasuries[Power.Mitanni].Gold;
        e = Begin(s);
        e.Resolve(Orders(Power.Hatti, new PayRansomOrder(spy.Id)));
        Advance(s, 4);
        Assert.NotEqual(CharacterStatus.Captured, spy.Status);
        Assert.True(s.Treasuries[Power.Mitanni].Gold > before);
    }

    [Fact]
    public void Candidates_pitch_and_the_higher_wage_wins_a_contested_hire()
    {
        var s = GameFactory.NewGame(6);
        var e = Begin(s);
        e.Resolve(new Dictionary<Power, TurnSubmission>
        {
            [Power.Egypt] = new() { Orders = [new SeekCandidatesOrder()] },
            [Power.Hatti] = new() { Orders = [new SeekCandidatesOrder()] },
        });
        e = Begin(s);
        var pitches = e.MindRequests.Where(r => r.Task == MindTask.Pitch).ToList();
        Assert.NotEmpty(pitches);
        foreach (var r in pitches) e.Fulfil(r, new MindReply { Text = "Hire me.", Number = 20 });

        var both = s.Characters.FirstOrDefault(c => c.Pitches.ContainsKey(Power.Egypt) && c.Pitches.ContainsKey(Power.Hatti));
        var target = both ?? s.Characters.First(c => c.Pitches.ContainsKey(Power.Egypt));
        if (!target.Pitches.ContainsKey(Power.Hatti)) { target.Pitches[Power.Hatti] = "Hire me."; target.AskingPrice[Power.Hatti] = 20; }
        e.Resolve(new Dictionary<Power, TurnSubmission>
        {
            [Power.Egypt] = new() { Orders = [new HireOrder(target.Id, 25)] },
            [Power.Hatti] = new() { Orders = [new HireOrder(target.Id, 40)] },
        });
        Assert.Equal(Power.Hatti, target.Employer);
        Assert.Equal(40, target.Contract!.Wage);
        Assert.Contains(s.InboxOf(Power.Egypt), i => i.Title == "Not hired");
    }

    [Fact]
    public void A_wage_below_the_asking_price_is_refused()
    {
        var s = GameFactory.NewGame(6);
        var free = s.Characters.First(c => c.Status == CharacterStatus.Free);
        free.Pitches[Power.Egypt] = "I am worth it.";
        free.AskingPrice[Power.Egypt] = 50;
        var e = Begin(s);
        e.Resolve(Orders(Power.Egypt, new HireOrder(free.Id, 30)));
        Assert.Equal(CharacterStatus.Free, free.Status);
    }

    [Fact]
    public void Tablet_copies_shown_as_evidence_reach_the_third_court()
    {
        var s = GameFactory.NewGame(9);
        s.Tablets.Add(new Tablet { Id = "t900", Text = "Hatti and Egypt are brothers.", ProposedBy = Power.Hatti, Partner = Power.Egypt, Seals = [Power.Hatti, Power.Egypt], CreatedTurn = 1, SealedTurn = 1 });
        s.Copies.Add(new TabletCopy { Id = "k900", TabletId = "t900", Holder = Power.Egypt, AcquiredTurn = 1, Source = "sealed" });
        var envoy = s.Characters.First(c => c.Employer == Power.Egypt);
        envoy.SecretMaster = null;
        var e = Begin(s);
        e.Resolve(Orders(Power.Egypt, new DispatchOrder(envoy.Id, Power.Alashiya, "Hatti broke this oath.", Copies: ["k900"])));
        while (s.Audiences.Count == 0) { e = Begin(s); if (s.Audiences.Count == 0) e.Resolve(new Dictionary<Power, TurnSubmission>()); }
        var view = e.BuildAudienceView(s.Audiences[0], "See this tablet.", 0, [], 1);
        Assert.Single(view.CopiesShown);
        e.ApplyAudience(new AudienceRecord { AudienceId = s.Audiences[0].Id, Delivered = "See this tablet.", Rounds = [new AudienceRound { Host = new HostReply { End = true } }] });
        Assert.Contains(s.Copies, c => c.Holder == Power.Alashiya && c.TabletId == "t900");
        Assert.Contains(s.Events, x => x.Signal == "evidence-shown");
    }

    [Fact]
    public void Spending_debased_gold_exposes_it()
    {
        var s = GameFactory.NewGame(9);
        var t = s.Treasuries[Power.Arzawa];
        t.Gold = 120;
        t.Lots.Add(new GoldLot { Id = "g900", From = Power.Egypt, Stated = 200, Face = 200, True = 60, ArrivedTurn = 1 });
        // The ledger shows 260; a 200-shekel purchase passes validation but the true treasury cannot pay.
        Assert.Equal(260, t.Ledger);
        var e = new TurnEngine(s);
        e.Resolve(Orders(Power.Arzawa, new BuyProvinceOrder("lukka")));
        Assert.Null(s.Owner["lukka"]);
        Assert.Empty(t.Lots);
        Assert.Contains(s.InboxOf(Power.Arzawa), i => i.Title == "The treasury is short" && i.Body.Contains("Egypt"));
    }

    [Fact]
    public void Sworn_allies_can_share_the_victory()
    {
        var s = GameFactory.NewGame(10, new GameConfig { MinTurns = 1, EndChance = 1.0, SharedVictory = true });
        s.Tablets.Add(new Tablet { Id = "t901", Text = "Alliance.", ProposedBy = Power.Arzawa, Partner = Power.Alashiya, Seals = [Power.Arzawa, Power.Alashiya], CreatedTurn = 1, SealedTurn = 1, AllianceOath = true });
        s.Treasuries[Power.Arzawa].Gold += 2000;
        s.Treasuries[Power.Alashiya].Gold += 2000;
        var e = Begin(s);
        e.Resolve(new Dictionary<Power, TurnSubmission>());
        Assert.True(s.Ended);
        Assert.Equal(new[] { "Arzawa", "Alashiya" }, s.Winners);
    }

    [Fact]
    public void Sworn_allies_do_not_share_the_victory_unless_the_house_rule_is_on()
    {
        var s = GameFactory.NewGame(10, new GameConfig { MinTurns = 1, EndChance = 1.0 });
        Assert.False(s.Config.SharedVictory);
        s.Tablets.Add(new Tablet { Id = "t901", Text = "Alliance.", ProposedBy = Power.Arzawa, Partner = Power.Alashiya, Seals = [Power.Arzawa, Power.Alashiya], CreatedTurn = 1, SealedTurn = 1, AllianceOath = true });
        s.Treasuries[Power.Arzawa].Gold += 2000;
        s.Treasuries[Power.Alashiya].Gold += 2000;
        var e = Begin(s);
        e.Resolve(new Dictionary<Power, TurnSubmission>());
        Assert.True(s.Ended);
        Assert.Single(s.Winners);
        Assert.DoesNotContain(s.Events, x => x.Signal == "shared-victory");
    }

    [Fact]
    public void Catastrophes_are_exact_at_home_and_heard_next_season_only_by_courts_that_can_see_them()
    {
        var s = GameFactory.NewGame(13, new GameConfig { CatastropheChance = 1.0 });
        var e = Begin(s);
        var map = WorldMap.Default;
        var sight = Powers.All.ToDictionary(p => p, p => Views.Sight(s, map, p));
        var owned = Powers.All.ToDictionary(p => p, p => s.OwnedBy(p).ToList());
        e.Resolve(new Dictionary<Power, TurnSubmission>());
        Assert.All(Powers.All, p => Assert.Contains(s.InboxOf(p), i => i.Kind == InboxKind.Catastrophe));

        var (heard, unheard) = (0, 0);
        foreach (var cat in s.Catastrophes)
            foreach (var other in Powers.All.Where(o => o != cat.Power))
            {
                // A drought or plague is seen from any province of the realm; a flood or earthquake only from its own.
                var seen = cat.Province is { } one ? sight[other].Contains(one) : owned[cat.Power].Any(sight[other].Contains);
                var news = s.InboxOf(other).Where(i => i.Title == "News from nearby" && i.Body.EndsWith($"in {cat.Power.Land()}.")).ToList();
                Assert.All(news, i => Assert.Equal((s.Turn, InboxKind.Notice), (i.Turn, i.Kind)));
                Assert.Equal(seen ? 1 : 0, news.Count);
                if (seen) heard++; else unheard++;
            }
        Assert.True(heard > 0 && unheard > 0, $"heard {heard}, unheard {unheard}");

        // No rumour of it reaches any court later: distant courts learn only through envoys and spies.
        Advance(s, 3);
        Assert.All(Powers.All, p => Assert.DoesNotContain(s.InboxOf(p), i => i.Kind == InboxKind.Rumor));
    }
}
