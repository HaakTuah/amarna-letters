using Amarna.Engine;

namespace Amarna.Engine.Tests;

/// <summary>
/// Losses abroad travel with people: a spy caught at a court, or put to death there, is the talk of that court, and other
/// courts hear of it only from their envoys received there and their spies posted there.
/// </summary>
public class LossNewsTests
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

    /// <summary>One of a court's people at home with no errand, with the skill given, and no secret master.</summary>
    private static Character AtHome(GameState s, Power p, int competence)
    {
        var c = s.Characters.First(c => c.Employer == p && c.Status == CharacterStatus.Employed && c.At == p && c.Duty == Duty.None);
        c.SecretMaster = null;
        c.Traits.Competence = competence;
        return c;
    }

    /// <summary>Babylonia's spy, too timid to keep its master's name to itself, is caught at Assyria's court, which pays its watchmen well.</summary>
    private static (GameState S, Character Spy) Caught(ulong from = 1)
    {
        for (var seed = from; seed <= from + 40; seed++)
        {
            var s = GameFactory.NewGame(seed, new GameConfig { CatastropheChance = 0 });
            var spy = AtHome(s, Power.Babylonia, 10);
            spy.Traits.Courage = 0;
            s.Treasuries[Power.Assyria].Gold = 100000;
            Begin(s).Resolve(Orders(Power.Babylonia, new PlaceSpyOrder(spy.Id, Court: Power.Assyria)));
            for (var i = 0; i < 8 && spy.Status != CharacterStatus.Captured; i++)
                Begin(s).Resolve(Orders(Power.Assyria, new CounterIntelOrder(5000)));
            if (spy.Status == CharacterStatus.Captured) return (s, spy);
        }
        throw new InvalidOperationException("no seed gave a catch");
    }

    /// <summary>Mitanni's spy was caught too (a 2% chance each season, however skilled): the test moves on to another game.</summary>
    private sealed class WatcherCaught : Exception;

    /// <summary>
    /// Plays the test on a game in which Babylonia's spy is Assyria's captive and Mitanni's most skilled spy is posted at
    /// Assyria's court, sending its reports; on games from later seeds while Mitanni's spy is caught itself.
    /// </summary>
    private static void WithWatcher(Action<GameState, Character, Character> test)
    {
        ulong from = 1;
        for (var tries = 0; tries < 10; tries++)
        {
            var (s, captive) = Caught(from);
            from = s.Seed + 1;
            var watcher = AtHome(s, Power.Mitanni, 100);
            Begin(s).Resolve(Orders(Power.Mitanni, new PlaceSpyOrder(watcher.Id, Court: Power.Assyria)));
            for (var i = 0; i < 4 && watcher.Duty != Duty.SpyPosted; i++) Begin(s).Resolve(None());
            if (watcher.Duty != Duty.SpyPosted) continue;
            try
            {
                test(s, captive, watcher);
                return;
            }
            catch (WatcherCaught) { }
        }
        throw new InvalidOperationException("Mitanni's spy was caught in every game tried");
    }

    /// <summary>What the spy observed in the season just played, in the report on its way home.</summary>
    private static List<string> LastReport(GameState s, Character spy)
    {
        if (spy.Duty != Duty.SpyPosted) throw new WatcherCaught();
        var report = s.Journeys.Single(j => j.Kind == JourneyKind.SpyReport && j.CharacterId == spy.Id && j.DepartTurn == s.Turn - 1).Report!;
        return report.Observations;
    }

    [Fact]
    public void A_capture_is_the_talk_of_the_court_that_made_it_and_names_the_master_only_if_the_spy_confessed()
    {
        var (s, spy) = Caught();
        var loss = Assert.Single(s.Losses);
        Assert.Equal((LossKind.Captured, Power.Assyria, (Power?)Power.Babylonia, spy.Id), (loss.Kind, loss.Court, loss.Master, loss.CharacterId));
        Assert.Contains(s.InboxOf(Power.Assyria), i => i.Title == "A spy is caught" && i.Body.Contains("confesses to serving Babylonia"));
    }

    [Fact]
    public void An_envoy_received_at_the_court_hears_of_the_captive_it_holds_and_a_court_with_no_carrier_there_hears_nothing()
    {
        var (s, spy) = Caught();
        var caught = s.Losses.Single(l => l.CharacterId == spy.Id).Turn;
        var envoy = AtHome(s, Power.Egypt, 100);
        Begin(s).Resolve(Orders(Power.Egypt, new DispatchOrder(envoy.Id, Power.Assyria, "Greetings, brother.")));
        for (var i = 0; i < 4 && envoy.Duty != Duty.EnvoyHomebound; i++)
        {
            var e = Begin(s);
            foreach (var a in s.Audiences.Where(a => a.EnvoyId == envoy.Id).ToList())
                e.ApplyAudience(new AudienceRecord { AudienceId = a.Id, Delivered = "Greetings.", Rounds = [new AudienceRound { Host = new HostReply { End = true }, Envoy = new EnvoyReaction() }] });
            e.Resolve(None());
        }
        var home = s.Journeys.Single(j => j.CharacterId == envoy.Id && j.Kind == JourneyKind.EnvoyHomebound);
        Assert.Contains($"Assyria holds {spy.Name}, a spy of Babylonia, captive (caught in turn {caught}).", home.Cargo!.Observations);

        // Hatti had nobody at Assyria's court: it has heard nothing of the captive.
        Assert.DoesNotContain(s.InboxOf(Power.Hatti), i => i.Body.Contains(spy.Name));
    }

    [Fact]
    public void A_spy_posted_at_the_court_hears_of_an_execution_in_the_season_of_the_death_and_the_three_after() => WithWatcher((s, captive, watcher) =>
    {
        var caught = s.Losses.Single(l => l.CharacterId == captive.Id).Turn;
        Begin(s).Resolve(None());
        Assert.Contains($"Assyria holds {captive.Name}, a spy of Babylonia, captive (caught in turn {caught}).", LastReport(s, watcher));

        Begin(s).Resolve(Orders(Power.Assyria, new CaptiveOrder(captive.Id, CaptiveFate.Execute)));
        var report = LastReport(s, watcher);
        var death = s.Turn - 1;
        var loss = s.Losses.Last(l => l.CharacterId == captive.Id);
        Assert.Equal((LossKind.PutToDeath, (Power?)Power.Babylonia, death), (loss.Kind, loss.Master, loss.Turn));
        var line = $"Assyria put {captive.Name}, a spy of Babylonia, to death in turn {death}.";
        Assert.Contains(line, report);
        Assert.DoesNotContain(report, o => o.Contains($"holds {captive.Name}"));
        for (var i = 0; i < TurnEngine.LossNewsSeasons; i++)
        {
            Begin(s).Resolve(None());
            Assert.Contains(line, LastReport(s, watcher));
        }
        Begin(s).Resolve(None());
        Assert.DoesNotContain(LastReport(s, watcher), o => o.Contains(captive.Name));
    });

    [Fact]
    public void A_captive_who_never_said_whom_they_serve_is_talked_of_so_and_not_at_all_once_let_go() => WithWatcher((s, captive, watcher) =>
    {
        // As if it had kept its master's name to itself.
        s.Losses.Single(l => l.CharacterId == captive.Id).Master = null;
        var caught = s.Losses.Single(l => l.CharacterId == captive.Id).Turn;
        Begin(s).Resolve(None());
        Assert.Contains($"Assyria holds {captive.Name}, a spy who will not say whom they serve, captive (caught in turn {caught}).", LastReport(s, watcher));

        // Let go, it is talked of no more: nothing gives away whether a captive was released, ransomed or turned.
        Begin(s).Resolve(Orders(Power.Assyria, new CaptiveOrder(captive.Id, CaptiveFate.Release)));
        Assert.NotEqual(CharacterStatus.Captured, captive.Status);
        Assert.DoesNotContain(LastReport(s, watcher), o => o.Contains(captive.Name));
    });
}
