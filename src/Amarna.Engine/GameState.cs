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
    /// would not replay to the same game. Raise it with every rule change. 3 since Build order item 3 (archives, inventory
    /// tablets and swapped inventories); 4 since Build order item 4: a spy posted at a court is hidden from it (it is not
    /// paid back pay there, and does not end that court's cover), and each kind of object has its own id counter (fix (d),
    /// <see cref="IdCounters"/>). Neither change was released on its own, so one version covers both. 5 since the fix pass
    /// after item 4: among its changes, script envoys keep a share of small lots of gold (rounded to the shekel, not down to
    /// fives), leave the host's complaint about the weighing out of their reports when they kept some, read a passive
    /// "warned" as a threat to a king only when he is the one warned, and split sentences after a closing quote, which
    /// changes what they keep and say.
    /// </summary>
    public const int CurrentVersion = 5;

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

    /// <summary>
    /// How many ids each kind of object has been given, by its prefix (<see cref="IdKinds"/>). Every kind counts on its own,
    /// so making more or fewer objects of one kind, or a kind added later, never shifts the ids of another, nor with them
    /// the rolls keyed by those ids. (Until version 4 all kinds shared one counter, and new inventory tablets shifted the
    /// ids, and so the dice, of everything made after them.)
    /// </summary>
    public Dictionary<string, int> IdCounters { get; set; } = new();

    /// <summary>The next id of a kind: its prefix and its own count, "t1", "t2", ... Ordering by <see cref="TurnEngine.IdNumber"/> within a kind is the order of making.</summary>
    public string NewId(string prefix)
    {
        var n = IdCounters.GetValueOrDefault(prefix) + 1;
        IdCounters[prefix] = n;
        return $"{prefix}{n}";
    }

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

/// <summary>
/// The kinds of object the engine numbers with <see cref="GameState.NewId"/>, by prefix. Each prefix is letters only and
/// belongs to one kind, so ids stay unique across kinds although each kind counts from 1. A new kind takes a prefix of its
/// own here (the tests check that every id issued in play has one, and that no two kinds share one).
/// </summary>
public static class IdKinds
{
    /// <summary>Prefix to kind. Built with Add, so a prefix given twice fails at once.</summary>
    public static IReadOnlyDictionary<string, string> All { get; } = new Dictionary<string, string>
    {
        { "a", "audience" },
        { "c", "character" },
        { "f", "fact about a character" },
        { "g", "lot of gold" },
        { "j", "journey" },
        { "k", "copy of a tablet" },
        { "m", "message trail" },
        { "q", "task owed to a court" },
        { "r", "request to a character's mind" },
        { "t", "tablet" },
        { "u", "unit" },
        { "x", "catastrophe" },
    };

    /// <summary>Standing orders are numbered per seat ("s1", "s2", ...) by <see cref="SleepState.LastStanding"/>, not here; no kind may take "s".</summary>
    public const string StandingOrder = "s";
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
    /// <summary>The gold on its person. Characters start with none; what it holds came in by <see cref="Gain"/>.</summary>
    public int Purse { get; set; }
    /// <summary>Where the gold in its purse came from. Nothing is spent yet, so the parts add up to the purse.</summary>
    public Earnings Earned { get; set; } = new();
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

    /// <summary>Gold into its purse, counted by where it came from.</summary>
    public void Gain(int amount, GoldSource source)
    {
        if (amount <= 0) return;
        Purse += amount;
        switch (source)
        {
            case GoldSource.Wages: Earned.Wages += amount; break;
            case GoldSource.Skimmed: Earned.Skimmed += amount; break;
            case GoldSource.Gifts: Earned.Gifts += amount; break;
            case GoldSource.Carried: Earned.Carried += amount; break;
        }
    }

    public IEnumerable<Fact> FactsKnownTo(Power p) =>
        Facts.Where(f => f.Secrecy == Secrecy.Public || f.KnownBy.Contains(p));

    /// <summary>What <paramref name="p"/> still believes of this character, if it has not heard what happened to it.</summary>
    public Cover? CoverOf(Power p) => Covers.FirstOrDefault(k => k.For == p);

    /// <summary>
    /// A foreign spy posted at <paramref name="court"/> that the court does not know is there. A spy watches a court in
    /// secret: the court does not see it standing there, nor whom it serves, until its watchmen catch it (it is then the
    /// court's captive). A spy secretly in that court's own pay (one it turned, or a plant) reports to it, so the court
    /// knows it is there.
    /// </summary>
    public bool HiddenAt(Power court) =>
        At == court && Status == CharacterStatus.Employed && Duty == Duty.SpyPosted && Employer != court && SecretMaster != court;
}

/// <summary>Where gold in a character's purse came from.</summary>
public enum GoldSource
{
    /// <summary>Its wage paid at court, and back pay paid when it came back.</summary>
    Wages,
    /// <summary>Kept from gold it carried, out to a court or home.</summary>
    Skimmed,
    /// <summary>A king's personal gift at an audience.</summary>
    Gifts,
    /// <summary>Gold it was carrying when it was dismissed on the way out, which became its own.</summary>
    Carried,
}

/// <summary>What a character has gained, by source. Characters spend nothing yet (no escort, storage fee or loan exists).</summary>
public sealed class Earnings
{
    public int Wages { get; set; }
    public int Skimmed { get; set; }
    public int Gifts { get; set; }
    public int Carried { get; set; }

    [System.Text.Json.Serialization.JsonIgnore]
    public int Total => Wages + Skimmed + Gifts + Carried;

    public void Add(Earnings other)
    {
        Wages += other.Wages;
        Skimmed += other.Skimmed;
        Gifts += other.Gifts;
        Carried += other.Carried;
    }
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
    /// <summary>Tablets the spy copied this season from the archive of the court it watches: the copies come home with the report.</summary>
    public List<string> TabletIds { get; set; } = new();
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
    /// <summary>
    /// The inventory of the gold an envoy carries, sealed by the court that sent the gold: the receiving court keeps it in
    /// its archive. A forged one is an envoy's swap, stating only what was left after it kept some.
    /// </summary>
    public bool Inventory { get; set; }
    public bool Forged { get; set; }
    public string? ForgerId { get; set; }
    public Power? ForgerEmployer { get; set; }
    public int ForgerSkill { get; set; }

    public bool IsSealedAgreement => !Forged && SealedTurn is not null && Partner is not null && Seals.Count >= 2;
}

/// <summary>
/// A tablet as one court holds it. Every copy a court holds lies in its archive at its capital: a spy posted at that court
/// may copy from it, and whoever takes the capital gains a copy of every tablet in it (see <see cref="TurnEngine"/>'s archives).
/// </summary>
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
    /// <summary>The outcome the engine records when the host seals the tablet the envoy carried: the only sealing on a mission.</summary>
    public const string SealedOutcome = "the tablet was sealed by both kings";

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
