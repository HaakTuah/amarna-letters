using Amarna.Engine;
using Amarna.Game;
using Amarna.Game.Bots;

namespace Amarna.Game.Tests;

public class ReviewProbeTests
{
    private static readonly GameConfig Quiet = new() { MinTurns = 40, CatastropheChance = 0 };

    private sealed class Sleeper(Func<SeatView, TurnSubmission> decide, Func<AudienceView, SeatView, HostReply> host) : ISeat
    {
        public List<SeatView> Views { get; } = new();
        public IEnumerable<int> Calls => Views.Select(v => v.Turn);
        public string Label => "Test sleeper";
        public bool CanSleep => true;
        public Task<TurnSubmission> DecideAsync(SeatView view, CancellationToken ct)
        {
            lock (Views) Views.Add(view);
            return Task.FromResult(decide(view));
        }
        public Task<HostReply> HostAudienceAsync(AudienceView view, SeatView court, CancellationToken ct) => Task.FromResult(host(view, court));
    }

    private sealed class Scripted(Func<SeatView, TurnSubmission>? decide = null) : ISeat
    {
        public string Label => "Scripted";
        public Task<TurnSubmission> DecideAsync(SeatView view, CancellationToken ct) => Task.FromResult(decide?.Invoke(view) ?? new TurnSubmission());
        public Task<HostReply> HostAudienceAsync(AudienceView view, SeatView court, CancellationToken ct) => Task.FromResult(new HostReply { End = true });
    }

    private static int CourtTurn() => 1 + new TurnEngine(GameFactory.NewGame(31, Quiet)).TravelTurns(Power.Egypt, Power.Alashiya);

    private static async Task<GameRunner> Play(ISeat alashiya, int turns)
    {
        var state = GameFactory.NewGame(31, Quiet);
        var envoy = state.Characters.First(c => c.Employer == Power.Egypt).Id;
        var egypt = new Scripted(v => v.Turn == 1 ? new TurnSubmission { Orders = [new DispatchOrder(envoy, Power.Alashiya, "Greetings, brother.")] } : new TurnSubmission());
        var seats = Powers.All.ToDictionary(p => p, p => p == Power.Alashiya ? alashiya : p == Power.Egypt ? egypt : (ISeat)new Scripted());
        var runner = new GameRunner(state, seats, new ScriptMind(), new TemplateNarrator()) { WriteChronicles = false };
        await runner.PrepareAsync();
        for (var i = 0; i < turns && !state.Ended; i++) await runner.PlayTurnAsync();
        return runner;
    }

    [Fact]
    public async Task Probe_failed_audience_call_while_holding_court()
    {
        var t = CourtTurn();
        var host = new Sleeper(_ => new TurnSubmission(), (_, _) => throw new InvalidOperationException("model down"));
        var r = await Play(host, t + 1);
        var sl = r.State.Sleep[Power.Alashiya];
        Assert.Equal([1], host.Calls);
        Assert.False(sl.Courts.Single().Reopened);
        Assert.Contains(r.Errors, e => e.Contains("/host/"));
    }

    [Fact]
    public async Task Probe_letter_replaces_a_scheduled_order_for_the_same_person()
    {
        var t = CourtTurn();
        string? who = null;
        var host = new Sleeper(v => v.Turn == 1
                ? new TurnSubmission { Scheduled = [new ScheduledOrders { Turn = t, Orders = [new DispatchOrder(v.Court.First(c => c.Ready).Id, Power.Hatti, "Sched.")] }] }
                : new TurnSubmission(),
            (_, court) =>
            {
                who ??= court.Court.First(c => c.Ready).Id;
                return new HostReply { End = true, Letters = [new DispatchOrder(who, Power.Egypt, "Letter.")] };
            });
        var r = await Play(host, t);
        Assert.Equal([1], host.Calls);
        Assert.Equal(Power.Egypt, r.State.Char(who!).MissionTarget);
    }

    [Fact]
    public async Task Probe_reopened_then_orders_call_fails_letters_still_go_out()
    {
        var t = CourtTurn();
        string? who = null;
        var host = new Sleeper(v => v.Turn == t ? throw new InvalidOperationException("down") : new TurnSubmission(),
            (_, court) =>
            {
                who ??= court.Court.First(c => c.Ready).Id;
                return new HostReply { End = true, ReopenOrders = true, Letters = [new DispatchOrder(who, Power.Egypt, "Letter.")] };
            });
        var r = await Play(host, t + 1);
        Assert.Equal(Power.Egypt, r.State.Char(who!).MissionTarget);
        Assert.Contains(r.Errors, e => e.Contains("/orders/"));
    }
}
