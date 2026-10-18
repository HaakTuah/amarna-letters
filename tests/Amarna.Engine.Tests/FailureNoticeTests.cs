using System.Text.RegularExpressions;
using Amarna.Engine;

namespace Amarna.Engine.Tests;

/// <summary>The kind and words of notices a king reads the season after it gave the orders behind them.</summary>
public class FailureNoticeTests
{
    private static TurnEngine Begin(GameState s)
    {
        var e = new TurnEngine(s);
        e.BeginTurn();
        return e;
    }

    [Fact]
    public void A_hire_the_person_declines_is_a_rejection_notice()
    {
        var s = GameFactory.NewGame(6);
        var free = s.Characters.First(c => c.Status == CharacterStatus.Free);
        var e = Begin(s);
        foreach (var p in new[] { Power.Egypt, Power.Hatti, Power.Assyria })
        {
            free.Pitches[p] = "I am worth it.";
            free.AskingPrice[p] = 20;
        }
        e.Resolve(new Dictionary<Power, TurnSubmission>
        {
            [Power.Egypt] = new() { Orders = [new HireOrder(free.Id, 25)] },   // outbid
            [Power.Hatti] = new() { Orders = [new HireOrder(free.Id, 40)] },   // wins
            [Power.Assyria] = new() { Orders = [new HireOrder(free.Id, 10)] }, // below the price
        });

        Assert.Equal(Power.Hatti, free.Employer);
        foreach (var (p, wage, why) in new[] { (Power.Egypt, 25, "another court offered more"), (Power.Assyria, 10, "they ask 20 shekels") })
        {
            var notice = s.InboxOf(p).Single(i => i.Title == "Not hired");
            Assert.Equal(InboxKind.Rejected, notice.Kind);
            Assert.Equal($"{free.Name} declined your offer of {Money.Format(wage)} a season: {why}.", notice.Body);
        }
        Assert.DoesNotContain(s.InboxOf(Power.Hatti), i => i.Title == "Not hired");
    }

    [Fact]
    public void A_spy_sent_out_is_reported_as_having_left_last_season()
    {
        var s = GameFactory.NewGame(8);
        var (court, province) = (s.Characters.First(c => c.Employer == Power.Babylonia), s.Characters.Last(c => c.Employer == Power.Babylonia));
        Assert.NotEqual(court.Id, province.Id);
        Begin(s).Resolve(new Dictionary<Power, TurnSubmission>
        {
            [Power.Babylonia] = new() { Orders = [new PlaceSpyOrder(court.Id, Court: Power.Assyria), new PlaceSpyOrder(province.Id, Province: "carchemish")] },
        });

        var sent = s.InboxOf(Power.Babylonia).Where(i => i.Title == "Agent sent").ToList();
        Assert.Equal(2, sent.Count);
        Assert.All(sent, i => Assert.Equal(InboxKind.Notice, i.Kind));
        Assert.Matches($"^{Regex.Escape(court.Name)} left last season to watch Assyria; the journey takes [0-9]+ season\\(s\\)\\.$", sent.Single(i => i.Subject == court.Id).Body);
        Assert.Matches($"^{Regex.Escape(province.Name)} left last season to watch Carchemish; the journey takes [0-9]+ season\\(s\\)\\.$", sent.Single(i => i.Subject == province.Id).Body);
    }

    [Fact]
    public void Refusals_are_worded_for_the_season_they_are_read_in()
    {
        var s = GameFactory.NewGame(8);
        var envoy = s.Characters.First(c => c.Employer == Power.Babylonia);
        Begin(s).Resolve(new Dictionary<Power, TurnSubmission>
        {
            [Power.Babylonia] = new()
            {
                Orders =
                [
                    new PlaceSpyOrder(envoy.Id, Court: Power.Assyria), new DispatchOrder(envoy.Id, Power.Hatti, "Greetings, brother."),
                    new SeekCandidatesOrder(), new SeekCandidatesOrder(),
                    new CounterIntelOrder(10), new CounterIntelOrder(10),
                ],
            },
        });

        var notice = s.InboxOf(Power.Babylonia).Single(i => i.Title == "Orders that could not be carried out");
        Assert.Equal(InboxKind.Rejected, notice.Kind);
        Assert.Contains($"{envoy.Name} was already given a task by an earlier order", notice.Body);
        Assert.Contains("you had already asked for candidates that season", notice.Body);
        Assert.Contains("you had already set your watch that season", notice.Body);
        Assert.DoesNotContain("this season", notice.Body);
    }
}
