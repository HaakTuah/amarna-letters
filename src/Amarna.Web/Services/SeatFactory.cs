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
        return new BuiltSeats(set.Seats, set.Minds, set.Narrator);
    }

    public GameSettings SettingsFromHeader(LogHeader header)
    {
        var s = new GameSettings
        {
            Seed = header.Seed,
            Choices = SeatSetup.FromHeader(header),
            CustomsPrimer = header.Config.CustomsPrimer,
            SharedVictory = header.Config.SharedVictory,
            MessagesPerTurn = header.Config.MaxDispatchesPerTurn,
        };
        s.BudgetUsd = CostEstimate.SuggestedBudget(s.Estimate);
        return s;
    }
}
