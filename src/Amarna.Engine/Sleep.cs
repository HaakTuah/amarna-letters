namespace Amarna.Engine;

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
    /// <summary>
    /// While the unit the order is for is not yet raised: the levy that is to raise it (since the fix pass after item 4). When
    /// the levy raises it, the order is bound to it (<see cref="UnitId"/>); if the levy raises none, the order is dropped.
    /// </summary>
    public LevyRef? UnitLevy { get; set; }
    /// <summary>The same for the unit named as the unit supported or the army convoyed.</summary>
    public LevyRef? OtherLevy { get; set; }
    /// <summary>A scheduled move tried again because it failed: if it fails again, its unit's march ends.</summary>
    public bool Retry { get; set; }
}

/// <summary>A levy a scheduled order waits for: the unit of this kind to be raised in this province in this season.</summary>
public sealed class LevyRef
{
    public string Province { get; set; } = "";
    public int Turn { get; set; }
    public UnitKind Kind { get; set; }

    /// <summary>The unit the levy is to raise, in the words its seat reads ("the army to be raised in nippur in turn 3").</summary>
    public string Describe() => $"the {(Kind == UnitKind.Army ? "army" : "fleet")} to be raised in {Province} in turn {Turn}";
}

/// <summary>
/// The events a standing order waits for: a small vocabulary the engine checks from the seat's own view. Each is a move set
/// out this season, which the standing order answers in the same season (since the fix pass after item 4).
/// </summary>
public enum StandingWhen
{
    /// <summary>A unit of <see cref="StandingOrder.Power"/> (any foreign power's if null) sets out, where the seat can see it, to move into <see cref="StandingOrder.Province"/>.</summary>
    UnitEnters,
    /// <summary>A foreign unit sets out to move into the province where the seat's own unit (<see cref="StandingOrder.UnitId"/>) stands.</summary>
    UnitAttacked,
}

/// <summary>A standing order as a seat gives it: when this move is seen, give these orders in the same season.</summary>
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
}

/// <summary>
/// A seat's standing orders. Every seat may keep them, awake or asleep, script, human, model or file seat (since the
/// additions to the fix pass after item 4, by the tenet "Every feature is every seat's"; before, only a seat that sleeps had
/// them, in its <see cref="SleepState"/>). A seat that never kept one has none (<see cref="GameState.Standing"/>).
/// </summary>
public sealed class StandingBook
{
    /// <summary>Its standing orders, kept until they fire or are cancelled.</summary>
    public List<StandingOrder> Orders { get; set; } = new();
    /// <summary>The number of the last standing order it was given, for the next id.</summary>
    public int Last { get; set; }
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
    /// <summary>The season it wakes at the latest: the hidden cap (<see cref="GameConfig.MaxSleep"/>), which no rulebook or view names.</summary>
    public int WakeAt { get; set; }
    /// <summary>
    /// Its scheduled orders, each bound to its unit, in the order they run: by season, then as given. (Its standing orders,
    /// which every seat may keep, are in <see cref="GameState.Standing"/>.)
    /// </summary>
    public List<PlannedOrder> Scheduled { get; set; } = new();
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
    /// While it holds court: a call failed at one of its audiences and the script king answered in its place. The stand-in
    /// decides nothing for it, so unless it chose to reopen its orders itself, it is asked for orders this season all the same.
    /// </summary>
    public bool StoodIn { get; set; }
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
    /// <summary>It chose itself, at one of its audiences, to reopen its orders.</summary>
    public bool Reopened { get; set; }
    /// <summary>
    /// A call failed at one of its audiences and the stand-in answered. Unless it chose to reopen itself, its orders were then
    /// reopened without its choice, and the court is left out of the reopen rate (<see cref="Decided"/>).
    /// </summary>
    public bool StandIn { get; set; }
    /// <summary>The seat itself decided about its orders: it reopened them, or every reply was its own.</summary>
    [System.Text.Json.Serialization.JsonIgnore]
    public bool Decided => Reopened || !StandIn;
}

/// <summary>One stretch of sleep, for the reports: when it began, and when and why it woke.</summary>
public sealed class SleepSpell
{
    public int From { get; set; }
    public int WokeAt { get; set; }
    public List<string> Reasons { get; set; } = new();
}
