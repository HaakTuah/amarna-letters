namespace Amarna.Engine;

/// <summary>Text the engine needs written by a character or the narrator before it can be delivered.</summary>
public enum MindTask { EnvoyReport, Pitch, CheckReport, SpyReport, SummarizeMemory }

public sealed class MindRequest
{
    public string Id { get; set; } = "";
    public MindTask Task { get; set; }
    public string CharacterId { get; set; } = "";
    /// <summary>The court the text is for.</summary>
    public Power Court { get; set; }
    public string? TrailId { get; set; }
    public string? TaskId { get; set; }
    public HomeCargo? Cargo { get; set; }
    public SpyReport? Report { get; set; }
    /// <summary>Facts the engine has already chosen to release (background checks), or the memories to summarize.</summary>
    public List<string> Facts { get; set; } = new();
    /// <summary>For a memory summary: how many of the oldest memories it replaces.</summary>
    public int Fold { get; set; }
}

public sealed class MindReply
{
    public string Text { get; set; } = "";
    /// <summary>Asking price for a pitch; gold skimmed on the way home for a report.</summary>
    public int Number { get; set; }
}

/// <summary>What the host replies at an audience. Every field but Speech is an action the engine checks.</summary>
public sealed class HostReply
{
    public string Speech { get; set; } = "";
    public int Bribe { get; set; }
    public string BribeAsk { get; set; } = "";
    public int JobOffer { get; set; }
    public bool SealProposal { get; set; }
    public bool Detain { get; set; }
    public int GoldBack { get; set; }
    public int GoldBackPurity { get; set; } = 100;
    public bool End { get; set; }
    /// <summary>
    /// Only at an audience held while the host's orders stand (<see cref="AudienceView.OrdersStand"/>): envoys of its own it
    /// sends from the audience, as the letters of an orders reply (dispatch orders, or a letter that could not be read). They
    /// go out with the season's orders and are checked first. Ignored at any other audience. The envoy before the host never
    /// hears of them (<see cref="AsHeard"/>).
    /// </summary>
    public List<Order> Letters { get; set; } = new();
    /// <summary>
    /// Only at an audience held while the host's orders stand: the host reopens its orders, and gives orders this season
    /// after its audiences, as when anything else wakes it. Once chosen it holds for the season. Ignored at any other audience.
    /// </summary>
    public bool ReopenOrders { get; set; }

    /// <summary>
    /// The reply as the envoy before the host meets it: what the host says and does to it. The letters the host sends and its
    /// choice to reopen its orders are the host's own business, so they are left out.
    /// </summary>
    public HostReply AsHeard() => new()
    {
        Speech = Speech, Bribe = Bribe, BribeAsk = BribeAsk, JobOffer = JobOffer, SealProposal = SealProposal, Detain = Detain,
        GoldBack = GoldBack, GoldBackPurity = GoldBackPurity, End = End,
    };
}

/// <summary>The envoy's answer. Accepting a bribe or a job are explicit actions, not words.</summary>
public sealed class EnvoyReaction
{
    public string Speech { get; set; } = "";
    public bool AcceptBribe { get; set; }
    public bool AcceptJob { get; set; }
    public string Commitments { get; set; } = "";
}

public sealed class AudienceRound
{
    public HostReply Host { get; set; } = new();
    public EnvoyReaction Envoy { get; set; } = new();
}

/// <summary>A whole audience as it happened, handed back to the engine to apply.</summary>
public sealed class AudienceRecord
{
    public string AudienceId { get; set; } = "";
    public string Delivered { get; set; } = "";
    public int Skim { get; set; }
    public List<AudienceRound> Rounds { get; set; } = new();
}

/// <summary>What the host sees during an audience.</summary>
public sealed class AudienceView
{
    public string AudienceId { get; set; } = "";
    public int Turn { get; set; }
    public int Round { get; set; }
    public int MaxRounds { get; set; }
    public Power From { get; set; }
    public Power Host { get; set; }
    public CharacterView Envoy { get; set; } = new();
    public string Greeting { get; set; } = "";
    public List<string> GreetingDeviations { get; set; } = new();
    public string Spoken { get; set; } = "";
    public int GoldStated { get; set; }
    public int GoldWeighed { get; set; }
    public TabletView? Proposal { get; set; }
    public List<TabletView> CopiesShown { get; set; } = new();
    public List<Exchange> SoFar { get; set; } = new();
    /// <summary>Gold the host named in an earlier exchange to send home with the envoy (the latest amount named), or 0.</summary>
    public int GoldBackNamed { get; set; }
    /// <summary>A gift the envoy accepted in an earlier exchange, or 0. An envoy takes one gift per audience.</summary>
    public int GiftAccepted { get; set; }
    /// <summary>Only when the envoy secretly serves the host: what the envoy was really told.</summary>
    public string? SecretMandate { get; set; }
    public string? SecretLetter { get; set; }
    /// <summary>
    /// The host sleeps and was woken for its audiences only (<see cref="SleepState.HoldsCourt"/>): its orders stand unless it
    /// reopens them, and it may send letters from the audience (<see cref="HostReply.Letters"/>, <see cref="HostReply.ReopenOrders"/>).
    /// </summary>
    public bool OrdersStand { get; set; }
    /// <summary>With <see cref="OrdersStand"/>: the host chose at an earlier exchange this season to reopen its orders.</summary>
    public bool ReopenChosen { get; set; }
    /// <summary>With <see cref="OrdersStand"/>: the letters it has sent from its audiences this season so far (a later one for the same person replaces it).</summary>
    public List<Order> LettersSent { get; set; } = new();
}
