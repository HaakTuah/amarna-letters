using System.Text.Json.Serialization;

namespace Amarna.Engine;

/// <summary>
/// Every state change a seat can ask for. Units are named by the province they stand in, as in
/// Diplomacy ("A memphis -> sinai"). Text never changes state: only these orders do, and only
/// after <see cref="OrderValidator"/> accepts them.
/// </summary>
[JsonPolymorphic(TypeDiscriminatorPropertyName = "type")]
[JsonDerivedType(typeof(HoldOrder), "hold")]
[JsonDerivedType(typeof(MoveOrder), "move")]
[JsonDerivedType(typeof(SupportOrder), "support")]
[JsonDerivedType(typeof(ConvoyOrder), "convoy")]
[JsonDerivedType(typeof(RaiseOrder), "raise")]
[JsonDerivedType(typeof(DisbandOrder), "disband")]
[JsonDerivedType(typeof(BuyProvinceOrder), "buy")]
[JsonDerivedType(typeof(CedeProvinceOrder), "cede")]
[JsonDerivedType(typeof(GiftUnitOrder), "giftUnit")]
[JsonDerivedType(typeof(DispatchOrder), "dispatch")]
[JsonDerivedType(typeof(ReleaseOrder), "release")]
[JsonDerivedType(typeof(SeekCandidatesOrder), "seekCandidates")]
[JsonDerivedType(typeof(HireOrder), "hire")]
[JsonDerivedType(typeof(RenewOrder), "renew")]
[JsonDerivedType(typeof(DismissOrder), "dismiss")]
[JsonDerivedType(typeof(BackgroundCheckOrder), "check")]
[JsonDerivedType(typeof(PlaceSpyOrder), "spy")]
[JsonDerivedType(typeof(RecallSpyOrder), "recall")]
[JsonDerivedType(typeof(CounterIntelOrder), "counterIntel")]
[JsonDerivedType(typeof(AssayOrder), "assay")]
[JsonDerivedType(typeof(AuthenticateOrder), "authenticate")]
[JsonDerivedType(typeof(ForgeOrder), "forge")]
[JsonDerivedType(typeof(CaptiveOrder), "captive")]
[JsonDerivedType(typeof(PayRansomOrder), "payRansom")]
[JsonDerivedType(typeof(UnreadableOrder), "unreadable")]
public abstract record Order
{
    public abstract string Describe();

    /// <summary>A name the order left blank, as a refusal shows it.</summary>
    protected static string Named(string? s) => string.IsNullOrWhiteSpace(s) ? "?" : s;
}

public sealed record HoldOrder(string Unit) : Order
{
    public override string Describe() => $"{Unit} holds";
}

public sealed record MoveOrder(string Unit, string To) : Order
{
    public override string Describe() => $"{Unit} -> {Named(To)}";
}

/// <summary>Support a unit standing in <paramref name="Supported"/>: to hold if To is null, else its move to To.</summary>
public sealed record SupportOrder(string Unit, string Supported, string? To = null) : Order
{
    public override string Describe() => To is null ? $"{Unit} supports {Named(Supported)} holding" : $"{Unit} supports {Named(Supported)} -> {To}";
}

public sealed record ConvoyOrder(string Unit, string Army, string To) : Order
{
    public override string Describe() => $"{Unit} convoys {Named(Army)} -> {Named(To)}";
}

/// <summary>
/// An order a reply named but left incomplete or unreadable (a cession to no power anyone knows): the validator refuses
/// it with <paramref name="Reason"/>, so its king is told next season instead of the order vanishing.
/// </summary>
public sealed record UnreadableOrder(string Text, string Reason) : Order
{
    public override string Describe() => Text;
}

public sealed record RaiseOrder(string Province, UnitKind Kind) : Order
{
    public override string Describe() => $"raise {(Kind == UnitKind.Army ? "army" : "fleet")} in {Province}";
}

public sealed record DisbandOrder(string Unit) : Order
{
    public override string Describe() => $"disband {Unit}";
}

public sealed record BuyProvinceOrder(string Province) : Order
{
    public override string Describe() => $"buy the city-state of {Province}";
}

public sealed record CedeProvinceOrder(string Province, Power To) : Order
{
    public override string Describe() => $"cede {Province} to {To}";
}

public sealed record GiftUnitOrder(string Unit, Power To) : Order
{
    public override string Describe() => $"give {Unit} to {To}";
}

/// <summary>Send an envoy abroad with a spoken message, a mandate, gold and tablets.</summary>
public sealed record DispatchOrder(
    string Envoy,
    Power To,
    string Letter,
    string Mandate = "",
    GreetingOptions? Greeting = null,
    int Gold = 0,
    int PurityPercent = 100,
    TabletProposal? Proposal = null,
    List<string>? Copies = null) : Order
{
    public override string Describe() =>
        $"send {Envoy} to {To}" + (Gold > 0 ? $" with {Gold} shekels" : "") + (Proposal is not null ? " bearing a tablet to seal" : "");
}

/// <summary>Let a detained envoy (or captive) go home, optionally with a spoken reply.</summary>
public sealed record ReleaseOrder(string Character, string Reply = "") : Order
{
    public override string Describe() => $"release {Character}";
}

public sealed record SeekCandidatesOrder() : Order
{
    public override string Describe() => "ask for candidates";
}

public sealed record HireOrder(string Character, int Wage, int Term = 6) : Order
{
    public override string Describe() => $"hire {Character} at {Wage} a season";
}

/// <summary>
/// Keep one of your own people on at a new wage, for a new term. Not a task: the servant may be renewed and sent on
/// an errand in the same season.
/// </summary>
public sealed record RenewOrder(string Character, int Wage, int Term = 6) : Order
{
    public override string Describe() => $"renew {Character} at {Wage} a season for {Term} seasons";
}

public sealed record DismissOrder(string Character) : Order
{
    public override string Describe() => $"dismiss {Character}";
}

public sealed record BackgroundCheckOrder(string Character, int Spend) : Order
{
    public override string Describe() => $"check the background of {Character} ({Spend} shekels)";
}

/// <summary>Place a spy at a foreign court, or in a province.</summary>
public sealed record PlaceSpyOrder(string Character, Power? Court = null, string? Province = null) : Order
{
    public override string Describe() => $"send {Character} to spy on {Court?.ToString() ?? Province}";
}

public sealed record RecallSpyOrder(string Character) : Order
{
    public override string Describe() => $"recall {Character}";
}

public sealed record CounterIntelOrder(int Spend) : Order
{
    public override string Describe() => $"spend {Spend} on watching for spies";
}

public sealed record AssayOrder(string Lot) : Order
{
    public override string Describe() => $"assay gold lot {Lot}";
}

public sealed record AuthenticateOrder(string Copy, int Spend) : Order
{
    public override string Describe() => $"authenticate tablet {Copy} ({Spend} shekels)";
}

public sealed record ForgeOrder(string Character, string Text, List<Power> Seals) : Order
{
    public override string Describe() => $"have {Character} forge a tablet sealed by {string.Join(", ", Seals)}";
}

public enum CaptiveFate { Execute, Ransom, Turn, Release }

/// <summary>Decide the fate of a caught spy held at this court.</summary>
public sealed record CaptiveOrder(string Character, CaptiveFate Fate, int Ransom = 0, string Poison = "") : Order
{
    public override string Describe() => $"{Fate.ToString().ToLowerInvariant()} the captive {Character}";
}

public sealed record PayRansomOrder(string Character) : Order
{
    public override string Describe() => $"pay the ransom for {Character}";
}

/// <summary>Everything one seat submits in one season. Notes are a private journal for the seat itself.</summary>
/// <summary>Which unit or person an order acts on: one order each per season.</summary>
public static class OrderKeys
{
    public static string? UnitOf(Order o) => o switch
    {
        HoldOrder h => h.Unit, MoveOrder m => m.Unit, SupportOrder s => s.Unit, ConvoyOrder c => c.Unit,
        DisbandOrder d => d.Unit, GiftUnitOrder g => g.Unit, _ => null,
    };

    /// <summary>The person an order gives a task to. A renewal is not a task, so it is not counted here.</summary>
    public static string? CharacterOf(Order o) => o switch
    {
        DispatchOrder d => d.Envoy, ReleaseOrder r => r.Character, HireOrder h => h.Character, DismissOrder dm => dm.Character,
        PlaceSpyOrder p => p.Character, RecallSpyOrder rc => rc.Character, ForgeOrder f => f.Character, CaptiveOrder c => c.Character,
        _ => null,
    };
}

public sealed class TurnSubmission
{
    public List<Order> Orders { get; set; } = new();
    public string Notes { get; set; } = "";
    /// <summary>Seats that may sleep: how long to sleep and what should wake them. Ignored for other seats.</summary>
    public SleepRequest? Sleep { get; set; }
    /// <summary>Seats that may sleep: orders queued for later seasons (one entry per season replaces any earlier one).</summary>
    public List<ScheduledOrders> Scheduled { get; set; } = new();
    /// <summary>Set by the runner when the script king stood in for a seat whose call failed: the seat has not seen this season.</summary>
    public bool FromFallback { get; set; }
}

public sealed record RejectedOrder(Order Order, string Reason);
