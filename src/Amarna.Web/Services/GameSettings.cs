using Amarna.Engine;
using Amarna.Llm;

namespace Amarna.Web.Services;

public sealed class GameSettings
{
    public ulong Seed { get; set; } = (ulong)Random.Shared.Next(1, 1_000_000);
    public SeatChoices Choices { get; set; } = new();
    public bool Chronicles { get; set; } = true;
    public bool CustomsPrimer { get; set; } = true;
    public bool SharedVictory { get; set; }
    /// <summary>On by default: a model king sleeps after its orders until something concerns it (script and human kings play every season).</summary>
    public bool SleepingSeats { get; set; } = true;
    /// <summary>The hidden safety cap on one sleep, in seasons; the kings are never told it.</summary>
    public int MaxSleep { get; set; } = 12;
    /// <summary>The game pauses when its model spend reaches this. Set from the cost estimate unless the player changes it.</summary>
    public double BudgetUsd { get; set; }
    public int MessagesPerTurn { get; set; } = 3;
    /// <summary>Answer model calls inside the browser with canned replies: for trying the app without a key or cost.</summary>
    public bool SimulateApi { get; set; }

    public bool UsesModels => Choices.UsesModels;

    public double Estimate => CostEstimate.PerGame(Choices);

    public GameSettings Copy() => new()
    {
        Seed = Seed,
        Choices = Choices.Copy(),
        Chronicles = Chronicles,
        CustomsPrimer = CustomsPrimer,
        SharedVictory = SharedVictory,
        SleepingSeats = SleepingSeats,
        MaxSleep = MaxSleep,
        BudgetUsd = BudgetUsd,
        MessagesPerTurn = MessagesPerTurn,
        SimulateApi = SimulateApi,
    };

    public GameConfig ToConfig() => new()
    {
        CustomsPrimer = CustomsPrimer,
        SharedVictory = SharedVictory,
        SleepingSeats = SleepingSeats,
        MaxSleep = Math.Clamp(MaxSleep, 1, 30),
        MaxDispatchesPerTurn = MessagesPerTurn,
    };
}
