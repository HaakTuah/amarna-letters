namespace Amarna.Engine;

/// <summary>
/// The authoritative world. Only the engine writes it; seats see filtered views of it. Iteration
/// that decides anything goes through <see cref="Powers.All"/> or the map's province list, never
/// dictionary order, so results stay deterministic.
/// </summary>
public sealed class GameState
{
    public int Version { get; set; } = 1;
    public ulong Seed { get; set; }
    public GameConfig Config { get; set; } = new();
    public int Turn { get; set; } = 1;
    public bool Ended { get; set; }
    public string? EndReason { get; set; }

    public Dictionary<string, Power?> Owner { get; set; } = new();
    /// <summary>Neutral city-states still defended by their own walls (hold strength 1).</summary>
    public List<string> Garrisons { get; set; } = new();
    public List<Unit> Units { get; set; } = new();
    public Dictionary<Power, Treasury> Treasuries { get; set; } = new();
    public Dictionary<Power, int> StartStrength { get; set; } = new();
    public List<Power> Eliminated { get; set; } = new();

    public List<Character> Characters { get; set; } = new();
    public List<Journey> Journeys { get; set; } = new();
    public List<PendingAudience> Audiences { get; set; } = new();
    public List<Tablet> Tablets { get; set; } = new();
    public List<TabletCopy> Copies { get; set; } = new();
    public List<Catastrophe> Catastrophes { get; set; } = new();
    public List<PendingTask> Tasks { get; set; } = new();
    public Dictionary<Power, int> CounterIntel { get; set; } = new();

    public Dictionary<Power, List<InboxItem>> Inbox { get; set; } = new();
    public List<MessageTrail> Trails { get; set; } = new();
    public List<GameEvent> Events { get; set; } = new();
    public List<ScoreRow> Scores { get; set; } = new();
    public List<string> Winners { get; set; } = new();

    public int NextId { get; set; } = 1;

    public string NewId(string prefix) => $"{prefix}{NextId++}";

    public Unit? UnitAt(string province) => Units.FirstOrDefault(u => u.Province == province);

    public Character? FindCharacter(string? id) => id is null ? null : Characters.FirstOrDefault(c => c.Id == id);

    public Character Char(string id) => Characters.First(c => c.Id == id);

    public bool IsAlive(Power p) => !Eliminated.Contains(p);

    public IEnumerable<Power> Alive => Powers.All.Where(IsAlive);

    public IEnumerable<string> OwnedBy(Power p) =>
        WorldMap.Default.LandProvinces.Where(x => Owner.GetValueOrDefault(x.Id) == p).Select(x => x.Id);

    public List<InboxItem> InboxOf(Power p)
    {
        if (!Inbox.TryGetValue(p, out var list)) Inbox[p] = list = new();
        return list;
    }

    /// <summary>While a season resolves, news is stamped for the next season, when the courts read it.</summary>
    [System.Text.Json.Serialization.JsonIgnore]
    public int DeliveryOffset { get; set; }

    public void Notify(Power p, InboxKind kind, string title, string body, string? subject = null)
        => InboxOf(p).Add(new InboxItem { Turn = Turn + DeliveryOffset, Kind = kind, Title = title, Body = body, Subject = subject });

    public GameEvent Log(string kind, string text, IEnumerable<Power>? visibleTo = null, string? signal = null)
    {
        var e = new GameEvent
        {
            Turn = Turn,
            Kind = kind,
            Text = text,
            VisibleTo = visibleTo?.Distinct().OrderBy(p => p).ToList() ?? Powers.All.ToList(),
            Signal = signal,
        };
        Events.Add(e);
        return e;
    }
}

public sealed class Unit
{
    public string Id { get; set; } = "";
    public Power Power { get; set; }
    public UnitKind Kind { get; set; }
    public string Province { get; set; } = "";

    public string Label => $"{(Kind == UnitKind.Army ? "A" : "F")} {Province}";
}

public sealed class Treasury
{
    /// <summary>Fine gold actually held, in shekels.</summary>
    public int Gold { get; set; }
    /// <summary>Received shipments not yet assayed. The owner's ledger counts them at face value.</summary>
    public List<GoldLot> Lots { get; set; } = new();

    public int Ledger => Gold + Lots.Sum(l => l.Face - l.True);
}

public sealed class GoldLot
{
    public string Id { get; set; } = "";
    public Power From { get; set; }
    /// <summary>What the tablet's inventory said was sent.</summary>
    public int Stated { get; set; }
    /// <summary>What was weighed on arrival (after any skimming).</summary>
    public int Face { get; set; }
    /// <summary>The fine gold in it (after debasement).</summary>
    public int True { get; set; }
    public int ArrivedTurn { get; set; }
}

public enum Secrecy { Public, Hidden, Deep }

public sealed class Traits
{
    public int Loyalty { get; set; }
    public int Greed { get; set; }
    public int Competence { get; set; }
    public int Ambition { get; set; }
    public int Courage { get; set; }
    public Power? Sympathy { get; set; }
    public int SympathyStrength { get; set; }
}

public sealed class Fact
{
    public string Id { get; set; } = "";
    public string Text { get; set; } = "";
    public Secrecy Secrecy { get; set; }
    public string Tag { get; set; } = "";
    public List<Power> KnownBy { get; set; } = new();
}

public sealed class MemoryEntry
{
    public int Turn { get; set; }
    public string Text { get; set; } = "";
}

public sealed class Contract
{
    public int Wage { get; set; }
    public int StartTurn { get; set; }
    public int UntilTurn { get; set; }
}

public enum CharacterStatus { Free, Employed, Captured, Dead }

public enum Duty { None, EnvoyOutbound, EnvoyAtCourt, EnvoyHomebound, Detained, SpyOutbound, SpyPosted }

public sealed class Character
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public string Origin { get; set; } = "";
    public string Calling { get; set; } = "";
    public Traits Traits { get; set; } = new();
    public List<Fact> Facts { get; set; } = new();
    /// <summary>Written once by the narrator at creation, then frozen.</summary>
    public string Persona { get; set; } = "";
    public List<MemoryEntry> Memory { get; set; } = new();
    public string MemorySummary { get; set; } = "";

    public CharacterStatus Status { get; set; }
    public Power? Employer { get; set; }
    public Contract? Contract { get; set; }
    public Duty Duty { get; set; }
    /// <summary>The court the character is physically at, or null while travelling.</summary>
    public Power? At { get; set; }
    /// <summary>A province the character watches as a spy, when not at a court.</summary>
    public string? WatchProvince { get; set; }
    public Power? MissionTarget { get; set; }
    public string? CurrentTrail { get; set; }
    public Power? HeldBy { get; set; }
    /// <summary>A double agent's real master.</summary>
    public Power? SecretMaster { get; set; }
    public string? PoisonText { get; set; }
    public int TurnsAbroad { get; set; }
    public int Purse { get; set; }
    public int UnpaidTurns { get; set; }
    public Dictionary<Power, int> Reputation { get; set; } = new();
    public Dictionary<Power, int> AskingPrice { get; set; } = new();
    /// <summary>Courts this character has pitched to, with the pitch text.</summary>
    public Dictionary<Power, string> Pitches { get; set; } = new();

    public bool IsAvailableForHire => Status == CharacterStatus.Free;

    public void Remember(int turn, string text) => Memory.Add(new MemoryEntry { Turn = turn, Text = text });

    public IEnumerable<Fact> FactsKnownTo(Power p) =>
        Facts.Where(f => f.Secrecy == Secrecy.Public || f.KnownBy.Contains(p));
}

public enum JourneyKind { EnvoyOutbound, EnvoyHomebound, SpyOutbound, SpyReport, SpyHomebound, Rumor, Ransom }

public sealed class Journey
{
    public string Id { get; set; } = "";
    public JourneyKind Kind { get; set; }
    public int DepartTurn { get; set; }
    public int ArriveTurn { get; set; }
    public Power From { get; set; }
    public Power To { get; set; }
    public string? CharacterId { get; set; }
    public Dispatch? Dispatch { get; set; }
    public HomeCargo? Cargo { get; set; }
    public SpyReport? Report { get; set; }
    public string? Text { get; set; }
    public int Gold { get; set; }
}

/// <summary>What a leader hands an envoy: the spoken message, the mandate, and what it carries.</summary>
public sealed class Dispatch
{
    public string Letter { get; set; } = "";
    public GreetingOptions Greeting { get; set; } = new();
    /// <summary>Rendered by the engine and sealed on the tablet; the envoy cannot alter it.</summary>
    public string GreetingText { get; set; } = "";
    public string Mandate { get; set; } = "";
    public int Gold { get; set; }
    public int PurityPercent { get; set; } = 100;
    public TabletProposal? Proposal { get; set; }
    public string? ProposalTabletId { get; set; }
    public List<string> CopyIds { get; set; } = new();
    public string TrailId { get; set; } = "";
}

public sealed class TabletProposal
{
    public string Text { get; set; } = "";
    public bool AllianceOath { get; set; }
}

public sealed class GreetingOptions
{
    public bool Omit { get; set; }
    public bool SenderFirst { get; set; }
    public bool CallBrother { get; set; } = true;
    public bool ClaimGreatKing { get; set; } = true;
    public bool GrantGreatKing { get; set; } = true;
    /// <summary>Free text that replaces the rendered greeting entirely, if set.</summary>
    public string? Custom { get; set; }
}

/// <summary>What an envoy brings home: the audience as it happened (the engine's record) and gifts.</summary>
public sealed class HomeCargo
{
    public string TrailId { get; set; } = "";
    public List<string> CopyIds { get; set; } = new();
    public int Gold { get; set; }
    public int PurityPercent { get; set; } = 100;
    public int GoldStated { get; set; }
    public List<string> Observations { get; set; } = new();
    public bool WasDetained { get; set; }
}

public sealed class SpyReport
{
    public string SpyId { get; set; } = "";
    public Power? Court { get; set; }
    public string? Province { get; set; }
    public List<string> Observations { get; set; } = new();
    public string? Poison { get; set; }
    public int ObservedTurn { get; set; }
}

public sealed class PendingAudience
{
    public string Id { get; set; } = "";
    public string EnvoyId { get; set; } = "";
    public Power From { get; set; }
    public Power Host { get; set; }
    public Dispatch Dispatch { get; set; } = new();
    public int GoldWeighed { get; set; }
}

public sealed class Tablet
{
    public string Id { get; set; } = "";
    public string Text { get; set; } = "";
    public Power ProposedBy { get; set; }
    public Power? Partner { get; set; }
    public List<Power> Seals { get; set; } = new();
    public int CreatedTurn { get; set; }
    public int? SealedTurn { get; set; }
    public bool AllianceOath { get; set; }
    public bool Forged { get; set; }
    public string? ForgerId { get; set; }
    public Power? ForgerEmployer { get; set; }
    public int ForgerSkill { get; set; }

    public bool IsSealedAgreement => !Forged && SealedTurn is not null && Partner is not null && Seals.Count >= 2;
}

public sealed class TabletCopy
{
    public string Id { get; set; } = "";
    public string TabletId { get; set; } = "";
    public Power Holder { get; set; }
    public int AcquiredTurn { get; set; }
    public string Source { get; set; } = "";
    public string? AuthResult { get; set; }
}

public enum CatastropheKind { Drought, Plague, Flood, Earthquake }

public sealed class Catastrophe
{
    public string Id { get; set; } = "";
    public Power Power { get; set; }
    public CatastropheKind Kind { get; set; }
    public string? Province { get; set; }
    public int StartTurn { get; set; }
    public int EndTurn { get; set; }
    /// <summary>Income multiplier while active (whole realm, or one province if Province is set).</summary>
    public double IncomeFactor { get; set; } = 1;
    public string Text { get; set; } = "";
}

public enum TaskKind { Candidates, BackgroundCheck, Authenticate, RansomDemand }

/// <summary>Work the engine owes a court in a later season: check results, candidate pitches, and so on.</summary>
public sealed class PendingTask
{
    public string Id { get; set; } = "";
    public TaskKind Kind { get; set; }
    public Power Requester { get; set; }
    public int DueTurn { get; set; }
    public string? CharacterId { get; set; }
    public string? CopyId { get; set; }
    public int Spend { get; set; }
    public Power? Other { get; set; }
}

public enum InboxKind
{
    Resolution, Battle, Audience, EnvoyReport, SpyReport, Rumor, CheckResult, Candidates,
    Catastrophe, Notice, Assay, Authentication, Tablet, Rejected,
}

public sealed class InboxItem
{
    public int Turn { get; set; }
    public InboxKind Kind { get; set; }
    public string Title { get; set; } = "";
    public string Body { get; set; } = "";
    public string? Subject { get; set; }
}

/// <summary>The three versions of a message, side by side: the gaps between them are the game.</summary>
public sealed class MessageTrail
{
    public string Id { get; set; } = "";
    public int Turn { get; set; }
    public Power From { get; set; }
    public Power To { get; set; }
    public string EnvoyId { get; set; } = "";
    public string EnvoyName { get; set; } = "";
    public string GreetingText { get; set; } = "";
    public string LeaderLetter { get; set; } = "";
    public string Mandate { get; set; } = "";
    public int GoldStated { get; set; }
    public int GoldDelivered { get; set; }
    public int GoldFine { get; set; }
    public string? ProposalText { get; set; }
    public int? AudienceTurn { get; set; }
    public string Delivered { get; set; } = "";
    public List<Exchange> Exchanges { get; set; } = new();
    public List<string> Outcomes { get; set; } = new();
    public int? ReportTurn { get; set; }
    public string Report { get; set; } = "";
}

public sealed class Exchange
{
    public string Host { get; set; } = "";
    public string Envoy { get; set; } = "";
}

public sealed class GameEvent
{
    public int Turn { get; set; }
    public string Kind { get; set; } = "";
    public string Text { get; set; } = "";
    public List<Power> VisibleTo { get; set; } = new();
    /// <summary>A success-criteria marker (sealed tablet, accusation, forgery...), if any.</summary>
    public string? Signal { get; set; }
}

public sealed class ScoreRow
{
    public int Turn { get; set; }
    public Power Power { get; set; }
    public int Strength { get; set; }
    public double Growth { get; set; }
    public int Provinces { get; set; }
    public int Units { get; set; }
    public int Gold { get; set; }
}
