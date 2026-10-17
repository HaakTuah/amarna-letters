namespace Amarna.Engine;

/// <summary>Every tunable number in one place. The defaults are first proposals, tuned by batch runs.</summary>
public sealed record GameConfig
{
    // Ending and scoring
    public int MinTurns { get; init; } = 15;
    public double EndChance { get; init; } = 0.15;
    public int MaxTurns { get; init; } = 60;
    /// <summary>Strength = ProvinceWeight x (sum of owned base yields) + gold.</summary>
    public int ProvinceWeight { get; init; } = 10;
    public bool SharedVictory { get; init; } = true;

    // Economy and military
    public int ArmyCost { get; init; } = 100;
    public int FleetCost { get; init; } = 120;
    public int ArmyUpkeep { get; init; } = 30;
    public int FleetUpkeep { get; init; } = 35;
    /// <summary>A neutral city-state sells itself for yield x this.</summary>
    public int NeutralPriceFactor { get; init; } = 10;
    public double CatastropheChance { get; init; } = 0.035;

    // Communication
    /// <summary>Envoy travel: up to [0] hops is 1 season, up to [1] hops 2 seasons, beyond that 3.</summary>
    public int[] TravelHops { get; init; } = [4, 7];
    public int MaxDispatchesPerTurn { get; init; } = 3;
    public int MaxLetterChars { get; init; } = 1500;
    public int AudienceRounds { get; init; } = 2;
    public int TabletFee { get; init; } = 20;
    public int AssayFee { get; init; } = 10;
    public int ForgeFee { get; init; } = 40;
    public int ForgeMinCompetence { get; init; } = 55;
    public bool CustomsPrimer { get; init; } = true;

    // Characters
    public int StartEnvoysPerPower { get; init; } = 2;
    public int CharacterPoolSize { get; init; } = 18;
    public int MemoryKeep { get; init; } = 12;
}
