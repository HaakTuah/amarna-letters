using Amarna.Engine;
using Amarna.Game;
using Amarna.Llm;

namespace Amarna.Web.Services;

public sealed record BuiltSeats(Dictionary<Power, ISeat> Seats, ICharacterMind Minds, INarrator Narrator);

/// <summary>Turns setup choices into seats, character minds and a narrator. Model calls go from this browser with the player's key.</summary>
public sealed class SeatFactory(ScriptWorkerClient worker)
{
    /// <summary>Raised when the script players' worker stops during a game and the kings carry on in the page.</summary>
    public event Action<string>? KingsMovedToPage;

    public BuiltSeats Build(GameSettings settings, GameState state, string? apiKey, Func<GameLog> log)
    {
        var set = settings.SimulateApi
            ? SeatSetup.Build(settings.Choices, state, "simulated", browser: true, log, new SimulatedAnthropic { ReportUsage = false })
            : SeatSetup.Build(settings.Choices, state, apiKey, browser: true, log);
        // Script kings and characters think in a worker of their own, so that the page never waits on them (see
        // ScriptWorker.cs). All script powers share one ScriptLeader, as in the batch runner, and so one worker seat.
        if (!set.Seats.Values.Any(s => s is Amarna.Game.Bots.ScriptLeader) && set.Minds is not Amarna.Game.Bots.ScriptMind)
            return new BuiltSeats(set.Seats, set.Minds, set.Narrator);
        var game = worker.NewGame(state.Seed);
        WorkerSeat? kings = null;
        var seats = set.Seats.ToDictionary(x => x.Key, x =>
        {
            if (x.Value is not Amarna.Game.Bots.ScriptLeader script) return x.Value;
            if (kings is null)
            {
                kings = new WorkerSeat(script, worker, state.Seed, game);
                kings.MovedToPage += reason => KingsMovedToPage?.Invoke(reason);
            }
            return (ISeat)kings;
        });
        var minds = set.Minds is Amarna.Game.Bots.ScriptMind script ? new WorkerMind(script, worker, game) : set.Minds;
        return new BuiltSeats(seats, minds, set.Narrator);
    }

    public GameSettings SettingsFromHeader(LogHeader header)
    {
        var s = new GameSettings
        {
            Seed = header.Seed,
            Choices = SeatSetup.FromHeader(header),
            CustomsPrimer = header.Config.CustomsPrimer,
            SharedVictory = header.Config.SharedVictory,
            SleepingSeats = header.Config.SleepingSeats,
            MaxSleep = header.Config.MaxSleep,
            MessagesPerTurn = header.Config.MaxDispatchesPerTurn,
        };
        s.BudgetUsd = CostEstimate.SuggestedBudget(s.Estimate);
        return s;
    }
}

/// <summary>
/// A script king that gives the browser a moment before it works out its orders, so that the page can draw and answer
/// taps between kings instead of freezing for a whole season. It is used where the kings think in the page, because no
/// worker could start (see <see cref="WorkerSeat"/>): the look-ahead then runs on the one thread WebAssembly has. The
/// kings still decide one after another in the same order, each from its own view, so nothing they decide changes;
/// audiences, which are light, are passed straight through.
/// </summary>
public sealed class YieldingSeat(ISeat inner) : ISeat
{
    public string Label => inner.Label;
    public bool CanSleep => inner.CanSleep;

    public async Task<TurnSubmission> DecideAsync(SeatView view, CancellationToken ct)
    {
        await Task.Delay(1, ct);
        return await inner.DecideAsync(view, ct);
    }

    public Task<HostReply> HostAudienceAsync(AudienceView view, SeatView court, CancellationToken ct) => inner.HostAudienceAsync(view, court, ct);
}
