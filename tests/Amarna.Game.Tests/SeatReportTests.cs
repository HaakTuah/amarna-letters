using Amarna.Engine;
using Amarna.Game;
using Amarna.Game.Batch;
using Amarna.Game.Bots;

namespace Amarna.Game.Tests;

public class SeatReportTests
{
    private sealed class Orders(Func<SeatView, TurnSubmission> decide) : ISeat
    {
        public string Label => "Tester";
        public Task<TurnSubmission> DecideAsync(SeatView view, CancellationToken ct) => Task.FromResult(decide(view));
        public Task<HostReply> HostAudienceAsync(AudienceView view, SeatView court, CancellationToken ct) => Task.FromResult(new HostReply { End = true });
    }

    private static string[] Row(string report, Power p) =>
        report.Split('\n').Single(l => l.TrimStart().StartsWith(p.ToString() + " ", StringComparison.Ordinal))
            .Split(' ', StringSplitOptions.RemoveEmptyEntries);

    [Fact]
    public async Task The_invalid_count_includes_levies_and_other_orders_that_failed_as_the_season_resolved()
    {
        // Egypt sends an army to Thebes and raises a levy there (it fails after movement), and orders an impossible move.
        var egypt = new Orders(v => v.Turn != 1 ? new TurnSubmission() : new TurnSubmission
        {
            Orders = [new MoveOrder("akhetaten", "thebes"), new RaiseOrder("thebes", UnitKind.Army), new MoveOrder("memphis", "hattusa")],
        });
        var seats = Powers.All.ToDictionary(p => p, p => p == Power.Egypt ? egypt : (ISeat)new Orders(_ => new TurnSubmission()));
        var r = new GameRunner(GameFactory.NewGame(3), seats, new ScriptMind(), new TemplateNarrator()) { WriteChronicles = false };
        await r.PlayTurnAsync();

        Assert.Contains(r.State.InboxOf(Power.Egypt), i => i.Kind == InboxKind.Rejected && i.Title == "Levy failed");
        var row = Row(BatchRunner.SeatReport(r), Power.Egypt);
        Assert.Equal("Tester", row[1]);
        Assert.Equal("2", row[4]); // invalid: the impossible move and the levy
    }

    [Fact]
    public void Every_rejection_notice_counts_and_other_news_does_not()
    {
        Assert.Equal(2, BatchRunner.FailedOrders(new InboxItem { Kind = InboxKind.Rejected, Title = "Orders that could not be carried out", Body = "- memphis -> hattusa: no\n- raise army in babylon: no" }));
        foreach (var title in new[] { "Levy failed", "Purchase failed", "Not enough gold", "Not hired", "Cession failed" })
            Assert.Equal(1, BatchRunner.FailedOrders(new InboxItem { Kind = InboxKind.Rejected, Title = title, Body = "It could not be done." }));
        Assert.Equal(0, BatchRunner.FailedOrders(new InboxItem { Kind = InboxKind.Notice, Title = "The treasury", Body = "- Income 100" }));
    }

    [Fact]
    public void The_seat_report_shows_every_reason_a_sleeper_woke()
    {
        var seats = Powers.All.ToDictionary(p => p, _ => (ISeat)new Orders(_ => new TurnSubmission()));
        var r = new GameRunner(GameFactory.NewGame(3), seats, new ScriptMind(), new TemplateNarrator());
        r.State.Turn = 8;
        r.State.Sleep[Power.Babylonia] = new SleepState
        {
            History =
            [
                new SleepSpell { From = 2, WokeAt = 4, Reasons = ["an envoy of Egypt waits to be received", "land lost: Sippar has been taken by Assyria."] },
                new SleepSpell { From = 5, WokeAt = 7, Reasons = [TurnEngine.CapReason, "land lost: Kish has been taken by Assyria."] },
                new SleepSpell { From = 8 },
            ],
        };
        var report = BatchRunner.SeatReport(r);
        var line = report.Split('\n').Single(l => l.TrimStart().StartsWith("Babylonia", StringComparison.Ordinal));
        Assert.Contains("an envoy of Egypt waits to be received x1", line);
        Assert.Contains("land lost x2", line);
        Assert.Contains($"{TurnEngine.CapReason} x1", line);
        // Each sleep's length in seasons, + while it still sleeps.
        Assert.Contains(" 2 2 1+ ", line);
    }
}
