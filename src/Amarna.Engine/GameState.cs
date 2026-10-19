namespace Amarna.Engine;

/// <summary>
/// The authoritative world. Only the engine writes it; seats see filtered views of it. Iteration
/// that decides anything goes through <see cref="Powers.All"/> or the map's province list, never
/// dictionary order, so results stay deterministic.
/// </summary>
public sealed class GameState
{
    /// <summary>
    /// The version of the rules. A log saved under another version is refused, since its decisions
    /// would not replay to the same game. Raise it with every rule change.
    /// </summary>
    public const int CurrentVersion = 2;

    public int Version { get; set; } = CurrentVersion;
    public ulong Seed { get; set; }
    public GameConfig Config { get; set; } = new();
    public int Turn { get; set; } = 1;
    public bool Ended { get; set; }
    public string? EndReason { get; set; }

    public Dictionary<string, Power?> Owner { get; set; } = new();
    /// <summary>Cities still defended by their own walls (hold strength 1): free city-states, and cities that accepted a buyer, whose walls then hold for the owner.</summary>
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
    /// <summary>Servants caught or put to death abroad, at the court that did it: the talk of that court, which envoys and spies there carry home.</summary>
    public List<LossAbroad> Losses { get; set; } = new();
    public List<PendingTask> Tasks { get; set; } = new();
    public Dictionary<Power, int> CounterIntel { get; set; } = new();
    /// <summary>Seats that may sleep (model and file seats, when <see cref="GameConfig.SleepingSeats"/> is on). Each sees only its own.</summary>
    public Dictionary<Power, SleepState> Sleep { get; set; } = new();

    public Dictionary<Power, List<InboxItem>> Inbox { get; set; } = new();
    /// <summary>The orders each power could see resolve last season (its own and those in sight).</summary>
    public Dictionary<Power, List<OrderOutcome>> LastSeen { get; set; } = new();
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
    /// <summary>The last season of the term.</summary>
    public int UntilTurn { get; set; }
    /// <summary>
    /// Set when the term has ended and the servant, wanting more than its wage, has given notice: the wage it asks
    /// to serve on. Its master may renew it at that price or more; otherwise it leaves at <see cref="LeavesTurn"/>.
    /// </summary>
    public int? NoticePrice { get; set; }
    /// <summary>With a notice: the season at whose start it leaves unless renewed (if it is away then, when it is next at court with no task).</summary>
    public int? LeavesTurn { get; set; }
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
    /// <summary>
    /// What courts it serves or served still believe of it, after something happened abroad that they cannot see:
    /// at most one per court (an envoy that went over to a host may be covered for its old master and its new one).
    /// </summary>
    public List<Cover> Covers { get; set; } = new();
    /// <summary>The court it last served, once that service ended by dismissal or by the court's fall.</summary>
    public Power? FormerEmployer { get; set; }
    /// <summary>
    /// Wages owed by each court, built up while the character was away in its service (on a mission, posted as a spy,
    /// detained or captive). Paid when it stands at that court and is not held there, whether or not it still serves it;
    /// forfeited when it goes over to another court, cleared at its death, lost when the court's kingdom falls.
    /// </summary>
    public Dictionary<Power, int> BackPay { get; set; } = new();

    public bool IsAvailableForHire => Status == CharacterStatus.Free;

    public void Remember(int turn, string text) => Memory.Add(new MemoryEntry { Turn = turn, Text = text });

    public IEnumerable<Fact> FactsKnownTo(Power p) =>
        Facts.Where(f => f.Secrecy == Secrecy.Public || f.KnownBy.Contains(p));

    /// <summary>What <paramref name="p"/> still believes of this character, if it has not heard what happened to it.</summary>
    public Cover? CoverOf(Power p) => Covers.FirstOrDefault(k => k.For == p);
}

/// <summary>
/// A servant abroad whose master cannot see what happened to it (caught as a spy, detained, gone over to
/// the host, put to death, let go) keeps appearing to that master as it was, until word of it comes: a
/// rumour, a report from it, the servant standing at the master's court, or the master dismissing it. In its
/// master's books its back pay builds up by the wage it believes it owes, as for any servant away.
/// </summary>
public sealed class Cover
{
    /// <summary>The master who still believes it.</summary>
    public Power For { get; set; }
    public int Since { get; set; }
    /// <summary>The duty the master believes the servant is on (a posted spy, an envoy on the road home, one who has not returned).</summary>
    public Duty Believed { get; set; }
    /// <summary>Set when the master believes the servant is held captive at that court: its view then reads as a captive's.</summary>
    public Power? HeldAt { get; set; }
    /// <summary>The master recalled a spy it believed at its post: it believes it on the road home, and so it comes home if it is turned.</summary>
    public bool Recalled { get; set; }
    public string DutyText { get; set; } = "";
    public string WhereText { get; set; } = "";
    /// <summary>When the master believes the servant set out and is due back, as its view read then (see <see cref="Views.TimingText"/>).</summary>
    public string TimingText { get; set; } = "";
    public int Wage { get; set; }
    /// <summary>
    /// The back pay the master believes it owes: the real back pay when the cover was made, grown by <see cref="Wage"/>
    /// each season since, exactly as for a servant still on its mission. No gold moves either way.
    /// </summary>
    public int BackPay { get; set; }
    public int? ContractUntil { get; set; }
    /// <summary>The notice the master believes the servant has given (the price it asks to serve on, and when it leaves), if any.</summary>
    public int? NoticePrice { get; set; }
    public int? LeavesTurn { get; set; }
    /// <summary>
    /// The facts the master knew of the servant then, and public ones its inquiries have found since. A public fact
    /// added meanwhile, such as a defection, stays unseen until an inquiry finds it; hidden facts the master learns
    /// show as for any servant.
    /// </summary>
    public List<string> FactIds { get; set; } = new();
}

public enum JourneyKind { EnvoyOutbound, EnvoyHomebound, SpyOutbound, SpyReport, SpyHomebound, Rumor, Ransom }

/// <summary>What a rumour about one of a court's own people tells it: news that ends a <see cref="Cover"/>.</summary>
public enum NewsKind { Overdue, Ransom, Death }

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
    /// <summary>For a rumour about one of the receiving court's own people (<see cref="CharacterId"/>): what it tells.</summary>
    public NewsKind? News { get; set; }
    /// <summary>For a ransom demand's rumour: the demand it announces, unless a newer one has replaced it.</summary>
    public string? TaskId { get; set; }
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

public enum LossKind { Captured, PutToDeath }

/// <summary>
/// A servant of another court caught or put to death at a court, as that court knows it. It is the talk of that court:
/// envoys received there and spies posted there may hear of it and carry it home in their reports, so a court that
/// loses its people abroad, or puts them to death, becomes known for it, but only where someone carried the news.
/// </summary>
public sealed class LossAbroad
{
    public int Turn { get; set; }
    public LossKind Kind { get; set; }
    public string CharacterId { get; set; } = "";
    /// <summary>The court that caught or put the servant to death.</summary>
    public Power Court { get; set; }
    /// <summary>Whom the servant served, as that court knows it: null if the captive never said.</summary>
    public Power? Master { get; set; }
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
    /// <summary>A ransom demand whose rumour has reached the court asked to pay: only then can it be paid.</summary>
    public bool Announced { get; set; }
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
