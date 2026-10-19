namespace Amarna.Engine;

/// <summary>
/// What a seat that may sleep adds to its orders. It always sleeps after them; it may name a season to be woken
/// in and its own reasons to be woken sooner. The engine's own wake reasons apply as well.
/// </summary>
public sealed class SleepRequest
{
    /// <summary>The season (turn number) the seat asks to be woken in, or 0 for none. The hidden cap still applies (<see cref="GameConfig.MaxSleep"/>).</summary>
    public int WakeTurn { get; set; }
    public List<WakeTrigger> WakeOn { get; set; } = new();
}

/// <summary>
/// The seat-defined wake triggers: a fixed list the engine can check from the seat's own view. Each fires on a change
/// after it was set, never on a state that merely lasts (since Part G of the simulation-fixes round).
/// </summary>
public enum WakeKind
{
    /// <summary>The unit standing in <see cref="WakeTrigger.Province"/> when the seat fell asleep moves or is gone.</summary>
    UnitMoves,
    /// <summary>
    /// One of the seat's own people (<see cref="WakeTrigger.Character"/>) comes back to court: it is back, and the seat has
    /// seen it away since setting the trigger (when it set it, or at a later wake check).
    /// </summary>
    EnvoyReturns,
    /// <summary>
    /// The treasury, by the seat's ledger, falls below <see cref="WakeTrigger.Amount"/>: it is below, and the seat has seen
    /// it at or above the amount since setting the trigger. A treasury already below must first rise to the amount again.
    /// </summary>
    TreasuryBelow,
    /// <summary>Troops of <see cref="WakeTrigger.Power"/> (any foreign power's if empty) move into <see cref="WakeTrigger.Province"/> and get there, as the seat saw.</summary>
    TroopsEnter,
    /// <summary><see cref="WakeTrigger.Province"/> changes hands.</summary>
    ProvinceChangesHands,
}

public sealed class WakeTrigger
{
    /// <summary>What <see cref="Seen"/> holds for a trigger on a condition once the seat has seen the condition not hold since it set the trigger.</summary>
    public const string Armed = "armed";

    public WakeKind Kind { get; set; }
    public string? Province { get; set; }
    public string? Character { get; set; }
    public int Amount { get; set; }
    public Power? Power { get; set; }
    /// <summary>
    /// For <see cref="WakeKind.UnitMoves"/> and <see cref="WakeKind.ProvinceChangesHands"/>: what the seat saw there when it
    /// fell asleep. For <see cref="WakeKind.EnvoyReturns"/> and <see cref="WakeKind.TreasuryBelow"/>: <see cref="Armed"/>
    /// once the seat has seen the person away, or the treasury at or above the amount, since it set the trigger.
    /// </summary>
    public string? Seen { get; set; }

    public string Describe() => Kind switch
    {
        WakeKind.UnitMoves => $"the unit in {Province} moves",
        WakeKind.EnvoyReturns => $"{Character} is back at court",
        WakeKind.TreasuryBelow => $"the treasury falls below {Amount} shekels",
        WakeKind.TroopsEnter => $"{(Power is { } w ? $"{w}'s" : "foreign")} troops enter {Province}",
        WakeKind.ProvinceChangesHands => $"{Province} changes hands",
        _ => Kind.ToString(),
    };
}

/// <summary>
/// Orders a seat gives for a later season, as it gives them: each of its own units named by the province it stands in
/// when the orders are given. In the seat's view, the same with each unit named by where it stands now.
/// </summary>
public sealed class ScheduledOrders
{
    public int Turn { get; set; }
    public List<Order> Orders { get; set; } = new();
}

/// <summary>
/// An order a seat keeps for later: scheduled for a season, or among a standing order's orders. The king named each of
/// its own units by the province it stood in when it gave the order; the order is bound to that unit, follows it wherever
/// it goes, and is given from where the unit then stands (<see cref="TurnEngine.AsItStands"/>). A foreign unit named in a
/// support stays named by its province. An order for no unit (a levy, an errand) runs as given.
/// </summary>
public sealed class PlannedOrder
{
    /// <summary>The season it runs in (0 among a standing order's orders).</summary>
    public int Turn { get; set; }
    /// <summary>The order as the king gave it, its units named by where they stood then.</summary>
    public Order Order { get; set; } = null!;
    /// <summary>The seat's own unit the order is for (hold, move, support, convoy, disband, give), or null.</summary>
    public string? UnitId { get; set; }
    /// <summary>The seat's own unit named as the unit supported or the army convoyed, or null.</summary>
    public string? OtherUnitId { get; set; }
    /// <summary>A scheduled move tried again because it failed: if it fails again, its unit's march ends.</summary>
    public bool Retry { get; set; }
}

/// <summary>The events a standing order waits for: a small vocabulary the engine checks from the seat's own view.</summary>
public enum StandingWhen
{
    /// <summary>A unit of <see cref="StandingOrder.Power"/> (any foreign power's if null) was seen moving into <see cref="StandingOrder.Province"/>.</summary>
    UnitEnters,
    /// <summary>A foreign unit moved against the seat's own unit (<see cref="StandingOrder.UnitId"/>) where it stood, and the unit stayed there.</summary>
    UnitAttacked,
}

/// <summary>A standing order as a seat gives it: when this is seen, give these orders the next season.</summary>
public sealed class StandingRequest
{
    public StandingWhen When { get; set; }
    /// <summary>For <see cref="StandingWhen.UnitEnters"/>: whose unit; null for any foreign power's.</summary>
    public Power? Power { get; set; }
    /// <summary>For <see cref="StandingWhen.UnitEnters"/>: the province entered. For <see cref="StandingWhen.UnitAttacked"/>: where the seat's unit stands now.</summary>
    public string Province { get; set; } = "";
    /// <summary>The orders, the seat's own units named by where they stand now.</summary>
    public List<Order> Orders { get; set; } = new();
    /// <summary>Why the reply could not be read (a power nobody knows): the request is refused with this reason.</summary>
    public string? Unreadable { get; set; }
}

/// <summary>A standing order a seat keeps until it fires, once, or is cancelled.</summary>
public sealed class StandingOrder
{
    /// <summary>"s1", "s2", ... for this seat, shown in its view.</summary>
    public string Id { get; set; } = "";
    public StandingWhen When { get; set; }
    public Power? Power { get; set; }
    /// <summary>For <see cref="StandingWhen.UnitEnters"/>: the province entered.</summary>
    public string? Province { get; set; }
    /// <summary>For <see cref="StandingWhen.UnitAttacked"/>: the seat's own unit.</summary>
    public string? UnitId { get; set; }
    public List<PlannedOrder> Orders { get; set; } = new();
    /// <summary>The season it fires in, the one after its event; 0 while it waits.</summary>
    public int Fires { get; set; }
    /// <summary>What set it off, as the seat saw it ("Hatti's army moved halab -> qatna").</summary>
    public string? Cause { get; set; }
}

/// <summary>A standing order as its seat reads it: its unit and its orders named by where they stand now.</summary>
public sealed class StandingOrderView
{
    public string Id { get; set; } = "";
    public StandingWhen When { get; set; }
    public Power? Power { get; set; }
    /// <summary>For <see cref="StandingWhen.UnitEnters"/>: the province entered. For <see cref="StandingWhen.UnitAttacked"/>: where the unit stands now.</summary>
    public string Province { get; set; } = "";
    public List<Order> Orders { get; set; } = new();
    /// <summary>What set it off last season, when it fires this season; else null.</summary>
    public string? FiresNow { get; set; }
}

/// <summary>
/// A sleeping seat's state. Only seats that may sleep (model and file seats, when the setting is on) have one. A seat woken
/// only by envoys waiting holds court asleep: its orders stand unless it reopens them at an audience (Part H of the
/// simulation-fixes round).
/// </summary>
public sealed class SleepState
{
    public bool Asleep { get; set; }
    /// <summary>The last season the seat was asked for orders (and answered itself, not through the stand-in).</summary>
    public int LastCalled { get; set; }
    /// <summary>The season it wakes at the latest: the one it named, or else the hidden cap.</summary>
    public int WakeAt { get; set; }
    public List<WakeTrigger> Triggers { get; set; } = new();
    /// <summary>Its scheduled orders, each bound to its unit, in the order they run: by season, then as given.</summary>
    public List<PlannedOrder> Scheduled { get; set; } = new();
    /// <summary>Its standing orders, kept until they fire or are cancelled.</summary>
    public List<StandingOrder> Standing { get; set; } = new();
    /// <summary>The number of the last standing order it was given, for the next id.</summary>
    public int LastStanding { get; set; }
    /// <summary>What happened in the seasons it slept through that did not wake it, one line each, shown when it wakes.</summary>
    public List<string> Digest { get; set; } = new();
    /// <summary>Digest lines left out because the digest was full (the oldest go first).</summary>
    public int DigestLeftOut { get; set; }
    /// <summary>
    /// Why it was woken this season (empty if it was awake anyway). After a season the stand-in played, the reasons it
    /// was woken for then are kept here too, since it never read them, until it answers itself. While it holds court with its
    /// orders standing (<see cref="HoldsCourt"/>), the envoys it was woken to receive.
    /// </summary>
    public List<string> WokenBecause { get; set; } = new();
    /// <summary>Reasons found while resolving a season, applied at the next wake check (a scheduled or standing order that failed, orders dropped with a lost unit).</summary>
    public List<string> PendingWake { get; set; } = new();
    public List<SleepSpell> History { get; set; } = new();
    /// <summary>
    /// This season it was woken for its audiences only: an envoy waits at its court and nothing that reopens its orders
    /// happened. It stays asleep, its orders stand, and at its audiences it may send letters and choose to reopen its orders.
    /// Set at the wake check; cleared once the season's audiences are done (<see cref="TurnEngine.CourtsHeld"/>).
    /// </summary>
    public bool HoldsCourt { get; set; }
    /// <summary>While it holds court: it chose at one of its audiences to reopen its orders.</summary>
    public bool Reopen { get; set; }
    /// <summary>
    /// The letters it sent from its audiences this season, in the order sent (a later letter for the same person replaced an
    /// earlier one). They are checked with the season's orders, before any orders it gives itself, and then cleared.
    /// </summary>
    public List<Order> CourtLetters { get; set; } = new();
    /// <summary>Every season it held court while its orders stood, and whether it then reopened them: for the reports.</summary>
    public List<CourtHeld> Courts { get; set; } = new();
}

/// <summary>A season a sleeping seat held court while its orders stood: how many envoys waited to be received, and whether it reopened its orders.</summary>
public sealed class CourtHeld
{
    public int Turn { get; set; }
    public int Envoys { get; set; }
    public bool Reopened { get; set; }
}

/// <summary>One stretch of sleep, for the reports: when it began, the season the seat named (0 for none), when and why it woke.</summary>
public sealed class SleepSpell
{
    public int From { get; set; }
    public int Named { get; set; }
    public int WokeAt { get; set; }
    public List<string> Reasons { get; set; } = new();
}
