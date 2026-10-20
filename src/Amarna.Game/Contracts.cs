using Amarna.Engine;

namespace Amarna.Game;

/// <summary>
/// One contract for every seat: humans, language-model leaders and script bots receive the same
/// view and return the same structured decisions. The engine never knows who sits in a seat.
/// </summary>
public interface ISeat
{
    string Label { get; }
    /// <summary>Whether this seat may sleep when the game allows it (model and file seats). Script and human seats play every season.</summary>
    bool CanSleep => false;
    Task<TurnSubmission> DecideAsync(SeatView view, CancellationToken ct);
    Task<HostReply> HostAudienceAsync(AudienceView view, SeatView court, CancellationToken ct);
}

/// <summary>A character's voice: envoys, spies and candidates. The engine keeps the authoritative copy.</summary>
public interface ICharacterMind
{
    string Label { get; }
    Task<PresentResult> PresentAsync(EnvoyContext ctx, CancellationToken ct);
    Task<EnvoyReaction> ReactAsync(EnvoyContext ctx, HostReply host, CancellationToken ct);
    /// <summary>Envoy reports, recruitment pitches and spy reports.</summary>
    Task<MindReply> WriteAsync(MindContext ctx, CancellationToken ct);
}

/// <summary>The narrator only phrases: it receives facts the engine has already released.</summary>
public interface INarrator
{
    string Label { get; }
    Task<string> PersonaAsync(Character c, CancellationToken ct);
    Task<string> CheckReportAsync(CheckContext ctx, CancellationToken ct);
    Task<string> ChronicleAsync(ChronicleContext ctx, CancellationToken ct);
}

public sealed class PresentResult
{
    public string Speech { get; set; } = "";
    public int Skim { get; set; }
    /// <summary>With gold kept: replace the inventory tablet with one the envoy forges, stating only what the host's weighers find.</summary>
    public bool SwapInventory { get; set; }
}

/// <summary>What an envoy has in front of it at a foreign court.</summary>
public sealed class EnvoyContext
{
    public required Character Self { get; init; }
    public required Power Sender { get; init; }
    public required Power Host { get; init; }
    public required Dispatch Dispatch { get; init; }
    public required int Turn { get; init; }
    public required ulong Seed { get; init; }
    public int Round { get; init; }
    public int MaxRounds { get; init; }
    public List<Exchange> SoFar { get; init; } = new();
    /// <summary>
    /// It accepted the host's gift at an earlier exchange of this audience: an envoy takes one gift per audience, so a later
    /// gift is not given, and a model envoy is not asked whether to take it.
    /// </summary>
    public bool GiftTaken { get; init; }
    public string Delivered { get; init; } = "";
    public int Skim { get; init; }
    /// <summary>The back pay its employer owes it, paid when it is back at his court; lost if it goes over to another.</summary>
    public int BackPay { get; init; }
    /// <summary>Whether its employer looks doomed, from public facts (see <see cref="Views.LooksDoomed"/>): back pay owed by a doomed court may never be paid.</summary>
    public bool EmployerDoomed { get; init; }
    /// <summary>The skill it takes to fake a seal (<see cref="GameConfig.ForgeMinCompetence"/>): a script envoy weighs its own against it.</summary>
    public int ForgeMinCompetence { get; init; } = new GameConfig().ForgeMinCompetence;
}

public sealed class MindContext
{
    public required MindRequest Request { get; init; }
    public required Character Self { get; init; }
    public required int Turn { get; init; }
    public required ulong Seed { get; init; }
    public MessageTrail? Trail { get; init; }
    /// <summary>For pitches: what the character asks by default (the engine's base price).</summary>
    public int BasePrice { get; init; }
    /// <summary>For pitches: how many courts are looking for people right now.</summary>
    public int Demand { get; init; }
    /// <summary>For an envoy's report with gold: the skill it takes to fake a seal (see <see cref="EnvoyContext.ForgeMinCompetence"/>).</summary>
    public int ForgeMinCompetence { get; init; } = new GameConfig().ForgeMinCompetence;
}

public sealed class CheckContext
{
    public required Character Subject { get; init; }
    public required Power Court { get; init; }
    public required List<string> Facts { get; init; }
    public required int Turn { get; init; }
}

public sealed class ChronicleContext
{
    public required Power Power { get; init; }
    public required List<GameEvent> Known { get; init; }
    public required List<ScoreRow> Scores { get; init; }
    public required List<string> Winners { get; init; }
    public required int LastTurn { get; init; }
}
