using System.Text;
using Amarna.Engine;

namespace Amarna.Llm;

/// <summary>
/// A model king's private record of earlier seasons, all of it in its own words: the notes, audiences and orders of the
/// last three seasons it gave orders, shown in full; its own summary of the seasons before those, which it rewrites in its
/// replies when it chooses; and its ledger of dealings, one line per court, carried in full, which it writes with its orders
/// or at an audience. Nothing in it is condensed by anyone else: the king that reads it wrote all of it.
/// </summary>
public sealed class LeaderJournal
{
    /// <summary>A season's notes are kept up to this many characters (the schema says so); longer notes are cut.</summary>
    public const int NotesMax = 2000;
    /// <summary>The king's summary is kept up to this many characters.</summary>
    public const int SummaryMax = 2000;
    /// <summary>A line of the ledger is kept up to this many characters.</summary>
    public const int LedgerEntryMax = 600;
    /// <summary>The seasons an orders request shows in full; older ones leave the record.</summary>
    public const int SeasonsShown = 3;
    /// <summary>The seasons whose notes an audience request shows.</summary>
    public const int SeasonsShownAtAudience = 2;

    private sealed record Season(int Turn, string Notes, List<string> Orders, List<string> Audiences);

    private readonly object _gate = new();
    private readonly List<Season> _seasons = new();
    private readonly List<(int Turn, string Who, string Speech, List<string> Sent)> _audiences = new();
    private string _summary = "";
    private int _summaryTurn;
    private int _leftThrough;
    private readonly Dictionary<Power, (string Entry, int Turn)> _ledger = new();

    /// <summary>
    /// An audience the king held: what it said to whose envoy, and the letters it sent from it (while its orders stood). It
    /// joins the record with the next orders it gives; until then its later audiences show it.
    /// </summary>
    public void Audience(int turn, Power from, string envoy, string speech, IEnumerable<string>? sent = null)
    {
        lock (_gate) _audiences.Add((turn, $"{from}'s envoy {envoy}", speech, sent?.ToList() ?? []));
    }

    /// <summary>One audience as the record shows it: whose envoy, what the king said, and the letters it sent from it.</summary>
    private static string AudienceLine((int Turn, string Who, string Speech, List<string> Sent) a, int? season) =>
        $"{a.Who}{(a.Turn == season ? "" : $" (turn {a.Turn})")}: you said \"{Greeting.Cap(a.Speech, 200)}\""
        + (a.Sent.Count > 0 ? $"; you sent from the audience: {string.Join("; ", a.Sent)}" : "");

    /// <summary>
    /// The king's reply to an orders request: its notes (cut at <see cref="NotesMax"/>), the audiences since its last orders
    /// and its orders join the record, and the oldest season leaves it once more than <see cref="SeasonsShown"/> are kept.
    /// A summary it wrote replaces the one before; an empty one keeps it. Each ledger line replaces that court's line, and
    /// an empty one removes it.
    /// </summary>
    public void Record(int turn, TurnSubmission sub)
    {
        lock (_gate)
        {
            // An audience held in an earlier season (its orders call then failed) is marked with its own season.
            var audiences = _audiences.Select(a => AudienceLine(a, turn)).ToList();
            _audiences.Clear();
            _seasons.Add(new Season(turn, Greeting.Cap(sub.Notes.Trim(), NotesMax), sub.Orders.Select(o => o.Describe()).ToList(), audiences));
            while (_seasons.Count > SeasonsShown)
            {
                _leftThrough = _seasons[0].Turn;
                _seasons.RemoveAt(0);
            }
            if (sub.Summary.Trim() is { Length: > 0 } summary)
            {
                _summary = Greeting.Cap(summary, SummaryMax);
                _summaryTurn = turn;
            }
            Write(turn, sub.Ledger);
        }
    }

    /// <summary>
    /// Lines of the ledger the king wrote in an audience reply. Like those in its orders, each replaces that court's line, an
    /// empty one removes it, and courts it left out keep theirs.
    /// </summary>
    public void WriteLedger(int turn, IEnumerable<LedgerLine> lines)
    {
        lock (_gate) Write(turn, lines);
    }

    private void Write(int turn, IEnumerable<LedgerLine> lines)
    {
        foreach (var line in lines)
        {
            if (line.Entry.Trim() is { Length: > 0 } entry) _ledger[line.Court] = (Greeting.Cap(entry, LedgerEntryMax), turn);
            else _ledger.Remove(line.Court);
        }
    }

    /// <summary>
    /// What an orders request shows: the ledger in full, then the record: the king's summary, the last three seasons in
    /// full, and which season's notes leave the record after this one.
    /// </summary>
    public string ForOrders()
    {
        lock (_gate)
        {
            var sb = new StringBuilder();
            Ledger(sb);
            if (_seasons.Count == 0) return sb.Append("YOUR RECORD OF EARLIER SEASONS: none yet; these are the first orders you give.").ToString();
            sb.AppendLine("YOUR RECORD OF EARLIER SEASONS (yours alone: nobody else ever reads it):");
            Summary(sb);
            foreach (var s in _seasons)
            {
                sb.AppendLine($"turn {s.Turn} notes: {(s.Notes.Length > 0 ? s.Notes : "none")}");
                if (s.Audiences.Count > 0) sb.AppendLine($"turn {s.Turn} audiences: {string.Join("; ", s.Audiences)}");
                sb.AppendLine($"turn {s.Turn} orders: {(s.Orders.Count > 0 ? string.Join("; ", s.Orders) : "none")}");
            }
            if (_seasons.Count == SeasonsShown)
                sb.AppendLine($"Your notes from turn {_seasons[0].Turn} leave this record after this season; keep what you need in your summary.");
            return sb.ToString();
        }
    }

    /// <summary>
    /// What an audience request shows: the ledger in full, the king's summary, the notes of its last two seasons, and the
    /// audiences it has held since it last gave orders (a king whose orders stand may hold several before it gives orders again).
    /// </summary>
    public string ForAudience()
    {
        lock (_gate)
        {
            var sb = new StringBuilder();
            Ledger(sb);
            if (_seasons.Count == 0 && _audiences.Count == 0) return sb.Append("YOUR RECORD OF EARLIER SEASONS: none yet.").ToString();
            if (_seasons.Count == 0) sb.AppendLine("YOUR RECORD OF EARLIER SEASONS: none yet.");
            else
            {
                sb.AppendLine("YOUR RECORD OF EARLIER SEASONS (yours alone: nobody else ever reads it):");
                Summary(sb);
                foreach (var s in _seasons.TakeLast(SeasonsShownAtAudience))
                    sb.AppendLine($"turn {s.Turn} notes: {(s.Notes.Length > 0 ? s.Notes : "none")}");
            }
            if (_audiences.Count > 0)
                sb.AppendLine("AUDIENCES YOU HAVE HELD SINCE YOU LAST GAVE ORDERS: " + string.Join("; ", _audiences.Select(a => AudienceLine(a, null))));
            return sb.ToString();
        }
    }

    private void Summary(StringBuilder sb)
    {
        if (_summary.Length > 0)
            sb.AppendLine($"YOUR SUMMARY OF EARLIER SEASONS (your own words, turn {_summaryTurn}): {_summary}");
        else if (_leftThrough > 0)
            sb.AppendLine($"YOUR SUMMARY OF EARLIER SEASONS: you have written none, and your notes from turn {_leftThrough} and before have left this record.");
    }

    /// <summary>The ledger, one line per court in the fixed order of the powers, each with the season it was last written.</summary>
    private void Ledger(StringBuilder sb)
    {
        const string head = "YOUR LEDGER OF DEALINGS (your own words, per court: what was promised, sealed, broken and paid; each line with the season you last wrote it)";
        if (_ledger.Count == 0)
        {
            sb.AppendLine(head + ": nothing written yet.");
            return;
        }
        sb.AppendLine(head + ":");
        foreach (var p in Powers.All.Where(_ledger.ContainsKey))
            sb.AppendLine($"- {p} (turn {_ledger[p].Turn}): {_ledger[p].Entry}");
    }
}
