namespace Amarna.Engine;

/// <summary>
/// What a seat that may sleep asks for with its orders: how many seasons to skip before it is
/// asked again, and what should wake it sooner. The engine's own wake triggers apply as well.
/// </summary>
public sealed class SleepRequest
{
    /// <summary>Seasons to skip before the seat is asked again (0 = next season, as usual). Capped by <see cref="GameConfig.MaxSleep"/>.</summary>
    public int Seasons { get; set; }
    public List<WakeTrigger> WakeOn { get; set; } = new();
}

/// <summary>The seat-defined wake triggers: a fixed list the engine can check from the seat's own view.</summary>
public enum WakeKind
{
    /// <summary>The unit standing in <see cref="WakeTrigger.Province"/> when the seat fell asleep moves or is gone.</summary>
    UnitMoves,
    /// <summary>One of the seat's own people (<see cref="WakeTrigger.Character"/>) is back at court.</summary>
    EnvoyReturns,
    /// <summary>The treasury, by the seat's ledger, falls below <see cref="WakeTrigger.Amount"/>.</summary>
    TreasuryBelow,
    /// <summary>Troops of <see cref="WakeTrigger.Power"/> (any foreign power if empty) are seen in <see cref="WakeTrigger.Province"/>.</summary>
    TroopsEnter,
    /// <summary><see cref="WakeTrigger.Province"/> changes hands.</summary>
    ProvinceChangesHands,
}

public sealed class WakeTrigger
{
    public WakeKind Kind { get; set; }
    public string? Province { get; set; }
    public string? Character { get; set; }
    public int Amount { get; set; }
    public Power? Power { get; set; }
    /// <summary>For <see cref="WakeKind.UnitMoves"/> and <see cref="WakeKind.ProvinceChangesHands"/>: what the seat saw there when it fell asleep.</summary>
    public string? Seen { get; set; }

    public string Describe() => Kind switch
    {
        WakeKind.UnitMoves => $"the unit in {Province} moves",
        WakeKind.EnvoyReturns => $"{Character} is back at court",
        WakeKind.TreasuryBelow => $"the treasury falls below {Amount} shekels",
        WakeKind.TroopsEnter => $"{Power?.ToString() ?? "foreign"} troops are seen in {Province}",
        WakeKind.ProvinceChangesHands => $"{Province} changes hands",
        _ => Kind.ToString(),
    };
}

/// <summary>Orders a seat has queued for a later season. They stay secret and are validated when they run.</summary>
public sealed class ScheduledOrders
{
    public int Turn { get; set; }
    public List<Order> Orders { get; set; } = new();
}

/// <summary>A sleeping seat's state. Only seats that may sleep (model and file seats, when the setting is on) have one.</summary>
public sealed class SleepState
{
    public bool Asleep { get; set; }
    /// <summary>The last season the seat was asked for orders.</summary>
    public int LastCalled { get; set; }
    /// <summary>The season it wakes at the latest (its own choice, within the cap).</summary>
    public int WakeAt { get; set; }
    public List<WakeTrigger> Triggers { get; set; } = new();
    public List<ScheduledOrders> Scheduled { get; set; } = new();
    /// <summary>Distant news from the seasons it slept through, shown when it wakes.</summary>
    public List<string> Digest { get; set; } = new();
    /// <summary>Why it was woken this season (empty if it was awake anyway).</summary>
    public List<string> WokenBecause { get; set; } = new();
    /// <summary>Reasons found while resolving a season, applied at the next wake check (a scheduled order that failed).</summary>
    public List<string> PendingWake { get; set; } = new();
    public List<SleepSpell> History { get; set; } = new();
}

/// <summary>One stretch of sleep, for the reports: how long the seat asked for and how long it slept.</summary>
public sealed class SleepSpell
{
    public int From { get; set; }
    public int Requested { get; set; }
    public int WokeAt { get; set; }
    public List<string> Reasons { get; set; } = new();
}
