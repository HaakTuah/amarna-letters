using Amarna.Engine;

namespace Amarna.Engine.Tests;

/// <summary>
/// A spy watches a court in secret: the court does not see it there, nor whom it serves, until its watchmen catch it
/// (and then learns its master only if it confesses), unless the spy secretly serves that court (a double agent it
/// turned, or a plant in its pay).
/// </summary>
public class HiddenSpyTests
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

    private static IEnumerable<CharacterView> People(SeatView v) => v.Court.Concat(v.Known);

    /// <summary>Babylonia's spy, sent to watch Assyria, has just taken up its post there (the season's orders are still to come).</summary>
    private static (GameState S, Character Spy) Posted(ulong seed = 8)
    {
        var s = GameFactory.NewGame(seed, new GameConfig { CatastropheChance = 0 });
        var spy = s.Characters.First(c => c.Employer == Power.Babylonia);
        spy.SecretMaster = null;
        Begin(s).Resolve(Orders(Power.Babylonia, new PlaceSpyOrder(spy.Id, Court: Power.Assyria)));
        for (var i = 0; i < 10; i++)
        {
            var e = Begin(s);
            if (spy.Duty == Duty.SpyPosted) return (s, spy);
            e.Resolve(None());
        }
        throw new InvalidOperationException("the spy never reached its post");
    }

    /// <summary>The same game with the spy back at its own court, as if it had never been sent.</summary>
    private static GameState AtHome(GameState s, string id)
    {
        var home = Json.Clone(s);
        var c = home.Char(id);
        (c.Duty, c.At, c.MissionTarget, c.WatchProvince) = (Duty.None, Power.Babylonia, null, null);
        return home;
    }

    /// <summary>Assyria pays its watchmen well until they catch the spy, as the engine catches one (TurnEngine.Capture).</summary>
    private static void Catch(GameState s, Character spy)
    {
        spy.Traits.Competence = 0;
        s.Treasuries[Power.Assyria].Gold = 100000;
        for (var i = 0; i < 30 && spy.Status != CharacterStatus.Captured; i++)
        {
            new TurnEngine(s).Resolve(Orders(Power.Assyria, new CounterIntelOrder(200)));
            if (spy.Status != CharacterStatus.Captured) Begin(s);
        }
        Assert.Equal((CharacterStatus.Captured, Power.Assyria), (spy.Status, spy.HeldBy));
    }

    [Fact]
    public void A_spy_posted_at_a_court_is_not_in_that_courts_view()
    {
        var (s, spy) = Posted();
        Assert.Equal((Duty.SpyPosted, Power.Assyria, CharacterStatus.Employed), (spy.Duty, spy.At, spy.Status));
        Assert.True(spy.HiddenAt(Power.Assyria));

        var v = Views.For(s, Power.Assyria);
        Assert.DoesNotContain(People(v), c => c.Id == spy.Id);
        // Not one field of the court's view betrays it: the view is the one the court would have with the spy at home.
        Assert.Equal(Json.Serialize(Views.For(AtHome(s, spy.Id), Power.Assyria)), Json.Serialize(v));
        Assert.False(Views.SeenAtCourt(spy, Power.Assyria));

        // Its master sees it at its post.
        var mine = Views.For(s, Power.Babylonia).Court.Single(c => c.Id == spy.Id);
        Assert.Equal(("watching Assyria", "at the court of Assyria"), (mine.Duty, mine.Where));
    }

    [Fact]
    public void A_hidden_spy_the_court_knows_of_otherwise_is_listed_as_anywhere_else_with_no_place_and_no_master()
    {
        var (s, spy) = Posted();
        // Inquiries found something about this person once: the court knows of it, not that it is here.
        spy.Facts.Add(new Fact { Id = s.NewId("f"), Text = "Owes money in Babylon.", Secrecy = Secrecy.Hidden, Tag = "test", KnownBy = [Power.Assyria] });

        var seen = Views.For(s, Power.Assyria).Known.Single(c => c.Id == spy.Id);
        Assert.Equal(("employed", (Power?)null, "", false), (seen.Status, seen.Employer, seen.Where, seen.Ours));
        Assert.Contains("Owes money in Babylon.", seen.KnownFacts);
        Assert.Equal(Json.Serialize(Views.For(AtHome(s, spy.Id), Power.Assyria).Known.Single(c => c.Id == spy.Id)), Json.Serialize(seen));
    }

    [Fact]
    public void A_caught_spy_is_seen_as_a_captive_with_the_master_it_confessed_to_and_once_turned_at_its_post()
    {
        var (s, spy) = Posted();
        Catch(s, spy);

        // Caught: the court holds it, and knows whom it serves only if it confessed.
        var confessed = s.Losses.Last(l => l.CharacterId == spy.Id).Master;
        var captive = Views.For(s, Power.Assyria).Known.Single(c => c.Id == spy.Id);
        Assert.Equal(("your captive", confessed, "in your prison", true), (captive.Status, captive.Employer, captive.Where, captive.HeldByYou));
        Assert.Contains("A spy is caught", s.InboxOf(Power.Assyria).Where(x => x.Subject == spy.Id).Select(x => x.Title));

        // Turned and sent back to its post: it serves Assyria in secret, so Assyria sees it there, and whom it reports to.
        Begin(s).Resolve(Orders(Power.Assyria, new CaptiveOrder(spy.Id, CaptiveFate.Turn, Poison: "Assyria has no army left.")));
        Assert.Equal((Duty.SpyPosted, Power.Assyria, Power.Assyria), (spy.Duty, spy.At, spy.SecretMaster));
        Assert.False(spy.HiddenAt(Power.Assyria));
        var turned = Views.For(s, Power.Assyria).Known.Single(c => c.Id == spy.Id);
        Assert.Equal(("employed", Power.Babylonia, "at your court"), (turned.Status, turned.Employer!.Value, turned.Where));
    }

    [Fact]
    public void A_caught_spy_that_would_not_confess_is_held_with_no_master_named()
    {
        var (s, spy) = Posted();
        // Caught as the engine catches one (TurnEngine.Capture), keeping silent about its master.
        (spy.Status, spy.HeldBy, spy.Duty, spy.At) = (CharacterStatus.Captured, Power.Assyria, Duty.None, Power.Assyria);
        s.Losses.Add(new LossAbroad { Turn = s.Turn, Kind = LossKind.Captured, CharacterId = spy.Id, Court = Power.Assyria, Master = null });
        var captive = Views.For(s, Power.Assyria).Known.Single(c => c.Id == spy.Id);
        Assert.Equal(("your captive", (Power?)null), (captive.Status, captive.Employer));

        // One that confessed names its master.
        s.Losses[^1].Master = Power.Babylonia;
        Assert.Equal(Power.Babylonia, Views.For(s, Power.Assyria).Known.Single(c => c.Id == spy.Id).Employer);
    }

    [Fact]
    public void The_captors_record_of_a_capture_names_only_the_master_the_spy_confessed_to()
    {
        // A timid spy always confesses; a brave one does 40% of the time, so a few games give one that keeps silent.
        foreach (var (courage, confesses) in new[] { (0, true), (100, false) })
        {
            var found = false;
            for (ulong seed = 1; seed <= 20 && !found; seed++)
            {
                var (s, spy) = Posted(seed);
                spy.Traits.Courage = courage;
                Catch(s, spy);
                if ((s.Losses.Last(l => l.CharacterId == spy.Id).Master is not null) != confesses) continue;
                found = true;

                // What the captor's court has on record of it (in the web app, its Events and Season panels).
                var told = s.Events.Where(e => e.VisibleTo.Contains(Power.Assyria) && e.Text.Contains(spy.Name)).Select(e => e.Text).ToList();
                var caught = s.Events.Where(e => e.Kind == "spy-caught").ToList();
                if (confesses)
                {
                    Assert.Equal([$"Assyria caught {spy.Name}, a spy of Babylonia."], told);
                    Assert.Equal(["spy-caught"], caught.Select(e => e.Signal));
                }
                else
                {
                    Assert.Equal([$"Assyria caught {spy.Name}, a spy who will not say whom they serve."], told);
                    // The truth is on record for the god view alone, which counts the capture once.
                    var truth = caught.Single(e => e.VisibleTo.Count == 0);
                    Assert.Equal(($"Assyria caught {spy.Name}, a spy of Babylonia who would not say so.", "spy-caught"), (truth.Text, truth.Signal));
                    Assert.Single(caught, e => e.Signal is not null);
                }
            }
            Assert.True(found, confesses ? "no spy confessed" : "no spy kept silent");
        }
    }

    [Fact]
    public void A_spy_secretly_in_the_pay_of_the_court_it_watches_is_seen_there()
    {
        var (s, spy) = Posted();
        // A plant: placed in Babylonia's service by Assyria, which it really serves.
        spy.SecretMaster = Power.Assyria;
        Assert.False(spy.HiddenAt(Power.Assyria));
        var seen = Views.For(s, Power.Assyria).Known.Single(c => c.Id == spy.Id);
        Assert.Equal((Power.Babylonia, "at your court"), (seen.Employer!.Value, seen.Where));
    }

    [Fact]
    public void A_hidden_spy_is_not_paid_back_pay_the_court_owes_it_and_its_books_show_none()
    {
        var (s, spy) = Posted();
        spy.Traits.Competence = 100;
        // Back pay from an earlier service at this court, which it would be paid if it stood there in the open.
        spy.BackPay[Power.Assyria] = 30;
        var v = Views.For(s, Power.Assyria);
        var home = Views.For(AtHome(s, spy.Id), Power.Assyria);
        Assert.Equal((home.BackPay, home.Strength), (v.BackPay, v.Strength));
        Assert.Equal(new TurnEngine(AtHome(s, spy.Id)).BelievedBackPay(Power.Assyria), new TurnEngine(s).BelievedBackPay(Power.Assyria));

        new TurnEngine(s).Resolve(None());
        Begin(s);
        Assert.True(spy.HiddenAt(Power.Assyria));
        Assert.Equal(30, spy.BackPay[Power.Assyria]);
        Assert.DoesNotContain(s.InboxOf(Power.Assyria), x => x.Subject == spy.Id);

        // Seen at the court (its master dismissed it, and it is free there), it is paid.
        spy.Employer = null;
        spy.Status = CharacterStatus.Free;
        spy.Duty = Duty.None;
        new TurnEngine(s).Resolve(None());
        Begin(s);
        Assert.False(spy.BackPay.ContainsKey(Power.Assyria));
        Assert.Contains(s.InboxOf(Power.Assyria), x => x.Subject == spy.Id && x.Title == TurnEngine.BackPayTitle);
    }
}
