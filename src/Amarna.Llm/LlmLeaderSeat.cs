using System.Text;
using Amarna.Engine;
using Amarna.Game;

namespace Amarna.Llm;

/// <summary>
/// A king played by a model. It receives exactly the seat view every seat receives, keeps its own
/// journal of past seasons (its notes and orders), and answers with structured orders that the
/// engine validates like anyone else's. The asker is the Anthropic API, or a <see cref="FileExchange"/>
/// for a file seat, which then sees exactly the same text.
/// </summary>
public sealed class LlmLeaderSeat(Power power, IJsonAsker client, string model, string effort, bool primer, GameConfig config, string? label = null) : ISeat
{
    private sealed record Season(int Turn, string Notes, List<string> Orders, List<string> Audiences);

    private readonly List<Season> _journal = new();
    private readonly List<string> _audiencesThisTurn = new();

    public string Label => label ?? $"{ModelIds.Display(model)} leader";

    public bool CanSleep => true;

    private string Shared => Prompts.LeaderRules(primer, config);

    public async Task<TurnSubmission> DecideAsync(SeatView view, CancellationToken ct)
    {
        var user = new StringBuilder();
        user.AppendLine(Prompts.Situation(view));
        user.AppendLine(Journal());
        user.AppendLine("Now give your orders for this season: your troops, your envoys and letters, and anything else.");
        var json = await client.AskJsonAsync(new CallSpec
        {
            Key = $"t{view.Turn}/orders/{power}",
            Turn = view.Turn,
            Role = $"leader:{power}",
            Model = model,
            SharedSystem = Shared,
            SeatSystem = Prompts.Identity(power),
            User = user.ToString(),
            Schema = Schemas.LeaderOrders(config),
            Effort = effort,
            MaxTokens = 16000,
        }, ct);
        var sub = Parse.Orders(json);
        lock (_journal)
        {
            _journal.Add(new Season(view.Turn, sub.Notes, sub.Orders.Select(o => o.Describe()).ToList(), _audiencesThisTurn.ToList()));
            _audiencesThisTurn.Clear();
        }
        return sub;
    }

    public async Task<HostReply> HostAudienceAsync(AudienceView view, SeatView court, CancellationToken ct)
    {
        var user = new StringBuilder();
        user.AppendLine($"SEASON: turn {view.Turn}. You hold court. Treasury {court.Gold} shekels by your ledger.");
        user.AppendLine($"Lands now: {string.Join("; ", court.Owner.GroupBy(x => x.Value).Where(g => g.Key is not null).Select(g => $"{g.Key} {g.Count()}"))}.");
        // What has reached the court this season, so that the host does not speak to an envoy against its own news.
        user.Append(Prompts.CourtBrief(court));
        if (court.Tablets.Count > 0)
            user.AppendLine("Tablets you hold: " + string.Join(" | ", court.Tablets.Select(t => $"{t.CopyId}: \"{Greeting.Cap(t.Text, 200)}\" (seals {string.Join(", ", t.Seals)})")));
        user.AppendLine(Journal(brief: true));
        user.AppendLine(Prompts.Audience(view));
        var json = await client.AskJsonAsync(new CallSpec
        {
            Key = $"t{view.Turn}/aud/{view.AudienceId}/host/{view.Round}",
            Turn = view.Turn,
            Role = $"host:{power}",
            Model = model,
            SharedSystem = Shared,
            SeatSystem = Prompts.Identity(power),
            User = user.ToString(),
            Schema = Schemas.HostReply(),
            Effort = effort == "high" ? "medium" : "low",
            MaxTokens = 8000,
        }, ct);
        var reply = Parse.Host(json);
        lock (_journal) _audiencesThisTurn.Add($"{view.From}'s envoy {view.Envoy.Name}: you said \"{Greeting.Cap(reply.Speech, 200)}\"");
        return reply;
    }

    private string Journal(bool brief = false)
    {
        lock (_journal)
        {
            if (_journal.Count == 0) return "YOUR RECORD OF EARLIER SEASONS: this is the first season.";
            var sb = new StringBuilder("YOUR RECORD OF EARLIER SEASONS (your own private notes and orders):\n");
            var recent = _journal.TakeLast(brief ? 2 : 5).ToList();
            foreach (var old in _journal.Take(_journal.Count - recent.Count).TakeLast(8))
                if (old.Notes.Length > 0) sb.AppendLine($"turn {old.Turn} notes: {Greeting.Cap(old.Notes, 300)}");
            foreach (var s in recent)
            {
                sb.AppendLine($"turn {s.Turn} notes: {s.Notes}");
                if (!brief)
                {
                    if (s.Audiences.Count > 0) sb.AppendLine($"turn {s.Turn} audiences: {string.Join("; ", s.Audiences)}");
                    sb.AppendLine($"turn {s.Turn} orders: {string.Join("; ", s.Orders)}");
                }
            }
            return sb.ToString();
        }
    }
}
