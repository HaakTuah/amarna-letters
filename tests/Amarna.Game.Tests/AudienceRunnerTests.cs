using Amarna.Engine;
using Amarna.Game;
using Amarna.Game.Bots;

namespace Amarna.Game.Tests;

/// <summary>An audience played through the game runner: the second exchange shows the host what it named and gave in the first.</summary>
public class AudienceRunnerTests
{
    /// <summary>Sends one envoy to Alashiya in the first season, then does nothing.</summary>
    private sealed class Sender(string envoyId) : ISeat
    {
        public string Label => "Sender";
        public Task<TurnSubmission> DecideAsync(SeatView view, CancellationToken ct) => Task.FromResult(view.Turn == 1
            ? new TurnSubmission { Orders = [new DispatchOrder(envoyId, Power.Alashiya, "Greetings, brother.")] }
            : new TurnSubmission());
        public Task<HostReply> HostAudienceAsync(AudienceView view, SeatView court, CancellationToken ct) => Task.FromResult(new HostReply { End = true });
    }

    /// <summary>Names gold to send back and offers a gift in the first exchange, ends the audience in the second, and keeps every view it is shown.</summary>
    private sealed class Host : ISeat
    {
        public List<AudienceView> Views { get; } = new();
        public string Label => "Host";
        public Task<TurnSubmission> DecideAsync(SeatView view, CancellationToken ct) => Task.FromResult(new TurnSubmission());
        public Task<HostReply> HostAudienceAsync(AudienceView view, SeatView court, CancellationToken ct)
        {
            lock (Views) Views.Add(view);
            return Task.FromResult(view.Round == 1
                ? new HostReply { Speech = "Take this home to your lord.", GoldBack = 30, Bribe = 20 }
                : new HostReply { Speech = "Go in peace.", End = true });
        }
    }

    /// <summary>An envoy who takes every gift and never changes masters; reports are written by the script characters.</summary>
    private sealed class Pliant : ICharacterMind
    {
        private readonly ScriptMind _script = new();
        public string Label => "Pliant";
        public Task<PresentResult> PresentAsync(EnvoyContext ctx, CancellationToken ct) => Task.FromResult(new PresentResult { Speech = "My lord greets you." });
        public Task<EnvoyReaction> ReactAsync(EnvoyContext ctx, HostReply host, CancellationToken ct) =>
            Task.FromResult(new EnvoyReaction { Speech = "I thank you.", AcceptBribe = true });
        public Task<MindReply> WriteAsync(MindContext ctx, CancellationToken ct) => _script.WriteAsync(ctx, ct);
    }

    /// <summary>Does nothing, every season.</summary>
    private sealed class Idle : ISeat
    {
        public string Label => "Idle";
        public Task<TurnSubmission> DecideAsync(SeatView view, CancellationToken ct) => Task.FromResult(new TurnSubmission());
        public Task<HostReply> HostAudienceAsync(AudienceView view, SeatView court, CancellationToken ct) => Task.FromResult(new HostReply { End = true });
    }

    [Fact]
    public async Task The_second_exchange_carries_the_gold_and_the_gift_named_in_the_first()
    {
        var state = GameFactory.NewGame(5, new GameConfig { CatastropheChance = 0, MinTurns = 40 });
        var envoy = state.Characters.First(c => c.Employer == Power.Egypt);
        envoy.SecretMaster = null;
        var host = new Host();
        var seats = Powers.All.ToDictionary(p => p, p => p switch
        {
            Power.Egypt => new Sender(envoy.Id),
            Power.Alashiya => host,
            _ => (ISeat)new Idle(),
        });
        var runner = new GameRunner(state, seats, new Pliant(), new TemplateNarrator()) { WriteChronicles = false };
        await runner.PrepareAsync();
        for (var i = 0; i < 6 && host.Views.Count < 2; i++) await runner.PlayTurnAsync();

        Assert.Equal([1, 2], host.Views.Select(v => v.Round));
        Assert.Equal((0, 0), (host.Views[0].GoldBackNamed, host.Views[0].GiftAccepted));
        Assert.Equal((30, 20), (host.Views[1].GoldBackNamed, host.Views[1].GiftAccepted));
        // And the engine did what the view said: the gift taken once, and the gold named in the first exchange sent.
        var outcomes = state.Trails.Single(t => t.EnvoyId == envoy.Id).Outcomes;
        Assert.Contains("accepted 20 shekels from Alashiya", outcomes);
        Assert.Contains("Alashiya sent back 30 shekels", outcomes);
    }
}
