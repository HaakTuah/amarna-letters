using System.Text;
using Amarna.Engine;
using Amarna.Game;

namespace Amarna.Llm;

/// <summary>
/// A king played by a model. It receives exactly the seat view every seat receives, keeps its own
/// journal of past seasons (its notes, audiences and orders, and its own summary of older seasons), and answers with
/// structured orders that the engine validates like anyone else's. The asker is the Anthropic API, or a
/// <see cref="FileExchange"/> for a file seat, which then sees exactly the same text.
/// </summary>
public sealed class LlmLeaderSeat(Power power, IJsonAsker client, string model, string effort, bool primer, GameConfig config, string? label = null) : ISeat
{
    private readonly LeaderJournal _journal = new();

    public string Label => label ?? $"{ModelIds.Display(model)} leader";

    public bool CanSleep => true;

    /// <summary>The king's private record, as its requests show it.</summary>
    public LeaderJournal Journal => _journal;

    private string Shared => Prompts.LeaderRules(primer, config);

    public async Task<TurnSubmission> DecideAsync(SeatView view, CancellationToken ct)
    {
        var user = new StringBuilder();
        user.AppendLine(Prompts.Situation(view));
        user.AppendLine(_journal.ForOrders());
        user.AppendLine(view.Sleeps
            ? "Now give your orders for this season and the seasons ahead: your troops, your envoys and letters, and anything else. You sleep after them."
            : "Now give your orders for this season: your troops, your envoys and letters, and anything else.");
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
        _journal.Record(view.Turn, sub);
        return sub;
    }

    public async Task<HostReply> HostAudienceAsync(AudienceView view, SeatView court, CancellationToken ct)
    {
        var user = new StringBuilder();
        // Like every request to a king that sleeps, it opens with how long the king slept and what woke it.
        if (Prompts.SleepLine(court) is { Length: > 0 } woke) user.AppendLine(woke);
        // A king woken for its audiences only (its orders stand) reads its treasury in its realm in brief.
        user.AppendLine(view.OrdersStand
            ? $"SEASON: turn {view.Turn}. You hold court."
            : $"SEASON: turn {view.Turn}. You hold court. Treasury {court.Gold} shekels by your ledger.");
        user.AppendLine($"Lands now: {string.Join("; ", court.Owner.GroupBy(x => x.Value).Where(g => g.Key is not null).Select(g => $"{g.Key} {g.Count()}"))}.");
        // What has reached the court this season, so that the host does not speak to an envoy against its own news; with its
        // orders standing, its realm in brief, enough to judge whether the news changes its plan.
        user.Append(Prompts.CourtBrief(court, view.OrdersStand));
        if (court.Tablets.Count > 0)
            user.AppendLine("Tablets you hold, in full: " + string.Join(" | ", court.Tablets.Select(Prompts.TabletLine)));
        user.AppendLine(_journal.ForAudience());
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
            // With its orders standing it may also send letters and reopen its orders. The same model answers: an audience is
            // the seat's own decision, made at a lower effort only.
            Schema = Schemas.HostReply(config, view.OrdersStand),
            Effort = effort == "high" ? "medium" : "low",
            MaxTokens = 8000,
        }, ct);
        var reply = Parse.Host(json);
        // Letters and reopening mean something only while its orders stand; at any other audience the reply carries none.
        if (!view.OrdersStand)
        {
            reply.Letters.Clear();
            reply.ReopenOrders = false;
        }
        _journal.Audience(view.Turn, view.From, view.Envoy.Name, reply.Speech, reply.Letters.Select(o => o.Describe()));
        // What it wrote in its ledger stays in its own record: the reply that the engine and the envoy see carries none of it.
        _journal.WriteLedger(view.Turn, Parse.Ledger(json));
        return reply;
    }
}
