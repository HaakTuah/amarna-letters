using Amarna.Engine;
using Amarna.Game;
using Amarna.Llm;

namespace Amarna.Web.Services;

public sealed record BuiltSeats(Dictionary<Power, ISeat> Seats, ICharacterMind Minds, INarrator Narrator);

/// <summary>Turns setup choices into seats, character minds and a narrator. Model calls go from this browser with the player's key.</summary>
public sealed class SeatFactory
{
    public BuiltSeats Build(GameSettings settings, GameState state, string? apiKey, Func<GameLog> log)
    {
        var set = settings.SimulateApi
            ? SeatSetup.Build(settings.Choices, state, "simulated", browser: true, log, new SimulatedAnthropic { ReportUsage = false })
            : SeatSetup.Build(settings.Choices, state, apiKey, browser: true, log);
        // Script kings think hard and in the page itself: let the browser draw between their orders (see YieldingSeat).
        var seats = set.Seats.ToDictionary(x => x.Key, x => x.Value is Amarna.Game.Bots.ScriptLeader ? (ISeat)new YieldingSeat(x.Value) : x.Value);
        return new BuiltSeats(seats, set.Minds, set.Narrator);
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
/// taps between kings instead of freezing for a whole season (the look-ahead runs in the page, on the one thread
/// WebAssembly has). The kings still decide one after another in the same order, each from its own view, so nothing
/// they decide changes; audiences, which are light, are passed straight through.
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
