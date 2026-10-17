using Amarna.Engine;

namespace Amarna.Web.Services;

public enum SeatKind { Script, Human, Sonnet, Opus }
public enum MindKind { Script, Haiku }
public enum NarratorKind { Template, Sonnet }

public sealed class GameSettings
{
    public ulong Seed { get; set; } = (ulong)Random.Shared.Next(1, 1_000_000);
    public Dictionary<Power, SeatKind> Seats { get; set; } = Powers.All.ToDictionary(p => p, _ => SeatKind.Script);
    public MindKind Minds { get; set; } = MindKind.Script;
    public NarratorKind Narrator { get; set; } = NarratorKind.Template;
    public bool Chronicles { get; set; } = true;
    public bool CustomsPrimer { get; set; } = true;
    public bool SharedVictory { get; set; } = true;
    public string LeaderEffort { get; set; } = "medium";
    public double BudgetUsd { get; set; } = 5;
    public int MessagesPerTurn { get; set; } = 3;

    public bool UsesModels => Seats.Values.Any(s => s is SeatKind.Sonnet or SeatKind.Opus) || Minds == MindKind.Haiku || Narrator == NarratorKind.Sonnet;

    public GameConfig ToConfig() => new()
    {
        CustomsPrimer = CustomsPrimer,
        SharedVictory = SharedVictory,
        MaxDispatchesPerTurn = MessagesPerTurn,
    };
}
