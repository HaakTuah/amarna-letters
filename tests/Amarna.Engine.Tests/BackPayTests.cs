using Amarna.Engine;

namespace Amarna.Engine.Tests;

/// <summary>
/// Wages are paid on return: people away build up back pay instead of being paid, and are paid in gold when they are back
/// at the court that owes it. Whoever never comes back is never paid.
/// </summary>
public class BackPayTests
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

    /// <summary>One of Egypt's envoys at a wage of 12, with a long term; Babylon is two seasons away each way.</summary>
    private static (GameState S, Character Envoy) Start(GameConfig? config = null)
    {
        var s = GameFactory.NewGame(5, config ?? new GameConfig { CatastropheChance = 0 });
        var envoy = s.Characters.First(c => c.Employer == Power.Egypt);
        envoy.SecretMaster = null;
        envoy.Contract = new Contract { Wage = 12, StartTurn = 1, UntilTurn = 30 };
        Assert.Equal(2, new TurnEngine(s).TravelTurns(Power.Egypt, Power.Babylonia));
        return (s, envoy);
    }

    [Fact]
    public void A_servant_away_is_not_paid_but_owed_and_is_paid_in_full_the_season_it_comes_home()
    {
        var (s, envoy) = Start();
        Begin(s).Resolve(Orders(Power.Egypt, new DispatchOrder(envoy.Id, Power.Babylonia, "Greetings.")));
        var purse = envoy.Purse;

        // Turn 2: on the road, its wage is owed, not paid, and the treasury notice says so.
        var gold = s.Treasuries[Power.Egypt].Gold;
        var e = new TurnEngine(s);
        var (income, upkeep, wages) = (e.Income(Power.Egypt), e.Upkeep(Power.Egypt), e.Wages(Power.Egypt));
        Begin(s);
        Assert.Equal(12, envoy.BackPay[Power.Egypt]);
        Assert.Equal(purse, envoy.Purse);
        Assert.Equal(gold + income - upkeep - (wages - 12), s.Treasuries[Power.Egypt].Gold);
        Assert.Contains(s.InboxOf(Power.Egypt), i => i.Turn == 2 && i.Title == "The treasury"
            && i.Body.Contains($"wages {Money.Format(wages - 12)} (paid to your people at court). The wages of your people away, 12 shekels, were added to their back pay, which is paid when they are back at your court."));
        var line = Views.For(s, Power.Egypt).Court.Single(c => c.Id == envoy.Id);
        Assert.Equal(12, line.BackPay);
        Assert.Equal(12, Views.For(s, Power.Egypt).BackPay);
        new TurnEngine(s).Resolve(None());

        // It is received in turn 3 and is home in turn 5: four seasons away, paid the season it arrives.
        var e3 = Begin(s);
        var a = s.Audiences.Single(x => x.EnvoyId == envoy.Id);
        e3.ApplyAudience(new AudienceRecord { AudienceId = a.Id, Delivered = "Greetings.", Rounds = [new AudienceRound { Host = new HostReply { End = true }, Envoy = new EnvoyReaction() }] });
        e3.Resolve(None());
        Begin(s).Resolve(None());
        Assert.Equal(36, envoy.BackPay[Power.Egypt]);
        Begin(s);
        Assert.Equal((5, Power.Egypt), (s.Turn, envoy.At!.Value));
        Assert.False(envoy.BackPay.ContainsKey(Power.Egypt));
        Assert.Equal(purse + 48, envoy.Purse);
        Assert.Contains(s.InboxOf(Power.Egypt), i => i.Turn == 5 && i.Title == TurnEngine.BackPayTitle && i.Subject == envoy.Id
            && i.Body == $"{envoy.Name} is back at your court and was paid 48 shekels of back pay.");
        Assert.Null(Views.For(s, Power.Egypt).Court.Single(c => c.Id == envoy.Id).BackPay);

        // Back at court with no task, it is paid its wage each season again.
        new TurnEngine(s).Resolve(None());
        Begin(s);
        Assert.Equal(purse + 48 + 12, envoy.Purse);
    }

    [Fact]
    public void A_shortfall_stays_owed_costs_loyalty_and_turns_the_next_term_end_into_a_notice()
    {
        var (t, other) = Start();
        (other.Traits.Loyalty, other.Traits.Greed, other.Traits.Competence, other.Traits.Sympathy) = (90, 0, 0, null);
        // Its term ends with turn 4, while it is away: it is checked when it is home, in turn 5. Content with its wage, it
        // would serve on.
        other.Contract!.UntilTurn = 4;
        Assert.True(TurnEngine.RenewalPrice(other, Power.Egypt) <= 12);
        // No troops to pay for, so an empty treasury costs nothing else.
        t.Units.RemoveAll(u => u.Power == Power.Egypt);
        Begin(t).Resolve(Orders(Power.Egypt, new DispatchOrder(other.Id, Power.Babylonia, "Greetings.")));
        while (true)
        {
            // The treasury is empty the season it comes home.
            if (t.Journeys.Any(j => j.CharacterId == other.Id && j.Kind == JourneyKind.EnvoyHomebound && j.ArriveTurn == t.Turn)) t.Treasuries[Power.Egypt].Gold = -1000;
            var e = Begin(t);
            if (other.At == Power.Egypt) break;
            if (t.Audiences.FirstOrDefault(x => x.EnvoyId == other.Id) is { } a)
                e.ApplyAudience(new AudienceRecord { AudienceId = a.Id, Delivered = "Greetings.", Rounds = [new AudienceRound { Host = new HostReply { End = true }, Envoy = new EnvoyReaction() }] });
            e.Resolve(None());
        }
        Assert.Equal(5, t.Turn);
        Assert.True(t.Treasuries[Power.Egypt].Gold <= 0);
        Assert.Equal(48, other.BackPay[Power.Egypt]);
        Assert.Equal(75, other.Traits.Loyalty);
        Assert.Contains(other.Memory, m => m.Text.Contains("could not pay all the wages he owes me"));
        Assert.Contains(t.InboxOf(Power.Egypt), i => i.Turn == 5 && i.Title == TurnEngine.BackPayTitle
            && i.Body == $"{other.Name} is back at your court and is owed 48 shekels of back pay, but the treasury could pay only 0 shekels: the other 48 shekels stays owed, and counts as missed pay.");
        Assert.Equal(48, Views.For(t, Power.Egypt).Court.Single(c => c.Id == other.Id).BackPay);
        Assert.Equal(1, other.UnpaidTurns);

        // Its term has ended: content with the wage, it would serve on, but owed back pay it gives notice instead.
        Assert.Contains(t.InboxOf(Power.Egypt), i => i.Turn == 5 && i.Title == TurnEngine.NoticeTitle
            && i.Body.StartsWith($"{other.Name}'s term has ended, and you still owe them 48 shekels of back pay. They ask 12 shekels a season to serve on"));
        Assert.Equal(12, other.Contract!.NoticePrice);
        Assert.DoesNotContain(t.InboxOf(Power.Egypt), i => i.Title == "Contract renewed");

        // Next season, with gold in hand, the rest is paid.
        new TurnEngine(t).Resolve(None());
        t.Treasuries[Power.Egypt].Gold = 1000;
        Begin(t);
        Assert.False(other.BackPay.ContainsKey(Power.Egypt));
        Assert.Contains(t.InboxOf(Power.Egypt), i => i.Turn == 6 && i.Title == TurnEngine.BackPayTitle && i.Body == $"{other.Name} was paid 48 shekels of back pay.");
    }

    [Fact]
    public void A_captive_keeps_its_back_pay_and_is_paid_after_it_is_ransomed_and_comes_home()
    {
        var s = GameFactory.NewGame(4, new GameConfig { CatastropheChance = 0 });
        var spy = s.Characters.First(c => c.Employer == Power.Egypt);
        spy.SecretMaster = null;
        spy.Contract = new Contract { Wage = 10, StartTurn = 1, UntilTurn = 30 };
        (spy.Status, spy.HeldBy, spy.At, spy.MissionTarget) = (CharacterStatus.Captured, Power.Babylonia, Power.Babylonia, Power.Babylonia);
        s.Treasuries[Power.Egypt].Gold = 2000;
        var purse = spy.Purse;
        Begin(s).Resolve(Orders(Power.Babylonia, new CaptiveOrder(spy.Id, CaptiveFate.Ransom, 90)));
        while (true)
        {
            var e = Begin(s);
            Assert.Equal(10 * s.Turn, spy.BackPay[Power.Egypt]);
            if (Views.For(s, Power.Egypt).Court.Single(c => c.Id == spy.Id).RansomDemand is not null)
            {
                e.Resolve(Orders(Power.Egypt, new PayRansomOrder(spy.Id)));
                break;
            }
            e.Resolve(None());
        }
        while (spy.At != Power.Egypt)
        {
            Begin(s);
            if (spy.At == Power.Egypt) break;
            Assert.Equal(10 * s.Turn, spy.BackPay[Power.Egypt]);
            new TurnEngine(s).Resolve(None());
        }
        // Held, then walking home, it was owed every season it was away, the season it came home included.
        Assert.Equal(purse + 10 * s.Turn, spy.Purse);
        Assert.False(spy.BackPay.ContainsKey(Power.Egypt));
    }

    [Fact]
    public void A_servant_put_to_death_is_never_paid()
    {
        var s = GameFactory.NewGame(4, new GameConfig { CatastropheChance = 0 });
        var spy = s.Characters.First(c => c.Employer == Power.Egypt);
        spy.SecretMaster = null;
        (spy.Status, spy.HeldBy, spy.At, spy.MissionTarget) = (CharacterStatus.Captured, Power.Babylonia, Power.Babylonia, Power.Babylonia);
        Begin(s);
        Assert.True(spy.BackPay[Power.Egypt] > 0);
        new TurnEngine(s).Resolve(Orders(Power.Babylonia, new CaptiveOrder(spy.Id, CaptiveFate.Execute)));
        Assert.Empty(spy.BackPay);
        Assert.Equal(0, new TurnEngine(s).BackPayOwed(Power.Egypt));
    }

    [Fact]
    public void A_fallen_kingdom_s_debts_are_lost()
    {
        var (s, envoy) = Start();
        Begin(s).Resolve(Orders(Power.Egypt, new DispatchOrder(envoy.Id, Power.Babylonia, "Greetings.")));
        Begin(s);
        Assert.Equal(12, envoy.BackPay[Power.Egypt]);
        s.Units.RemoveAll(u => u.Power == Power.Egypt);
        foreach (var id in s.Owner.Where(x => x.Value == Power.Egypt).Select(x => x.Key).ToList()) s.Owner[id] = Power.Babylonia;
        new TurnEngine(s).Resolve(None());
        Assert.Contains(Power.Egypt, s.Eliminated);
        Assert.False(envoy.BackPay.ContainsKey(Power.Egypt));
    }

    [Fact]
    public void A_servant_dismissed_on_the_way_home_is_still_paid_what_it_was_owed_when_it_arrives()
    {
        var (s, envoy) = Start();
        Begin(s).Resolve(Orders(Power.Egypt, new DispatchOrder(envoy.Id, Power.Babylonia, "Greetings.")));
        Begin(s).Resolve(None());
        var e = Begin(s);
        var a = s.Audiences.Single(x => x.EnvoyId == envoy.Id);
        e.ApplyAudience(new AudienceRecord { AudienceId = a.Id, Delivered = "Greetings.", Rounds = [new AudienceRound { Host = new HostReply { End = true }, Envoy = new EnvoyReaction() }] });
        e.Resolve(Orders(Power.Egypt, new DismissOrder(envoy.Id)));
        // Dismissed in turn 3, its wage ends there: it is owed the two seasons it was away in service (turns 2 and 3).
        Begin(s).Resolve(None());
        Assert.Equal(24, envoy.BackPay[Power.Egypt]);
        Assert.DoesNotContain(Views.For(s, Power.Egypt).Court, c => c.Id == envoy.Id);
        var purse = envoy.Purse;
        Begin(s);
        Assert.Equal((Power.Egypt, CharacterStatus.Free), (envoy.At!.Value, envoy.Status));
        Assert.Equal(purse + 24, envoy.Purse);
        Assert.Contains(s.InboxOf(Power.Egypt), i => i.Title == TurnEngine.BackPayTitle && i.Body == $"{envoy.Name} is back at your court and was paid 24 shekels of back pay.");
    }

    [Fact]
    public void Strength_and_growth_count_back_pay_owed_against_the_treasury()
    {
        var (s, envoy) = Start();
        Begin(s).Resolve(Orders(Power.Egypt, new DispatchOrder(envoy.Id, Power.Babylonia, "Greetings.")));
        Begin(s);
        var e = new TurnEngine(s);
        var land = s.OwnedBy(Power.Egypt).Sum(id => WorldMap.Default[id].Yield);
        Assert.Equal(12, e.BackPayOwed(Power.Egypt));
        Assert.Equal(Scoring.Strength(s.Config, land, s.Treasuries[Power.Egypt].Gold, 12), e.Strength(Power.Egypt));
        Assert.Equal(10 * land + s.Treasuries[Power.Egypt].Gold - 12, e.Strength(Power.Egypt));
        Assert.Equal((double)e.Strength(Power.Egypt) / s.StartStrength[Power.Egypt], e.Growth(Power.Egypt));
        var v = Views.For(s, Power.Egypt);
        Assert.Equal(10 * land + v.Gold - v.BackPay, v.Strength);
        Assert.Equal(e.LedgerStrength(Power.Egypt), v.Strength);
        // The season's score is reckoned the same way.
        e.Resolve(None());
        var row = s.Scores.Last(r => r.Power == Power.Egypt);
        Assert.Equal(10 * land + row.Gold - envoy.BackPay[Power.Egypt], row.Strength);
    }
}
