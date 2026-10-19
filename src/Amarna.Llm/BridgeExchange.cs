using System.Net;
using System.Text;
using System.Text.Json.Nodes;
using Amarna.Engine;
using Amarna.Game;

namespace Amarna.Llm;

/// <summary>
/// Local play on a Claude subscription: the way from the game to the local bridge (<c>sim/bridge.js</c>), a small
/// program on this computer that keeps the king agents' folders. A web page cannot write files, so a local agent king
/// hands each request to the bridge, which writes it into that king's own folder exactly as a file seat would (the same
/// text, schema and footer, under the same name), and hands back the reply file's contents once the king's agent has
/// written it. The folders, and so their unguessable names, stay with the bridge: the page names a king, never a path.
/// One bridge serves all of a game's local agent kings.
/// </summary>
public sealed class LocalBridge
{
    public const string DefaultAddress = "http://localhost:5190";

    /// <summary>How often the page asks the bridge whether a reply has come.</summary>
    public static TimeSpan Poll { get; set; } = TimeSpan.FromSeconds(1);

    private readonly HttpClient _http;

    /// <summary>The bridge's address, ending in a slash.</summary>
    public Uri Address { get; }

    /// <summary>How long one decision may wait for its agent before the script king stands in for it.</summary>
    public TimeSpan Timeout { get; }

    public LocalBridge(string address, TimeSpan timeout, HttpMessageHandler? handler = null)
    {
        Address = Normalize(address);
        Timeout = timeout;
        _http = handler is null ? new HttpClient() : new HttpClient(handler, disposeHandler: false);
        // Each call to the bridge is short; the waiting for an agent is done here, a poll at a time.
        _http.Timeout = TimeSpan.FromSeconds(30);
    }

    public static Uri Normalize(string address)
    {
        var text = string.IsNullOrWhiteSpace(address) ? DefaultAddress : address.Trim();
        if (!text.Contains("://")) text = "http://" + text;
        return new Uri(text.TrimEnd('/') + "/");
    }

    /// <summary>What the bridge said when asked whether it runs, and which kings it keeps folders for.</summary>
    public sealed record Status(bool Running, IReadOnlyList<Power> Seats, string Problem)
    {
        public bool Ready => Running && Problem.Length == 0;
    }

    /// <summary>
    /// Asks the bridge at <paramref name="address"/> whether it runs and which kings it has folders for, and says what is
    /// wrong if it does not serve every king in <paramref name="kings"/>.
    /// </summary>
    public static async Task<Status> CheckAsync(string address, IEnumerable<Power> kings, HttpMessageHandler? handler = null, CancellationToken ct = default)
    {
        Uri at;
        try { at = Normalize(address); }
        catch (UriFormatException) { return new Status(false, [], $"\"{address}\" is not an address: the bridge listens at {DefaultAddress} unless it was started with another --port."); }
        using var http = handler is null ? new HttpClient() : new HttpClient(handler, disposeHandler: false);
        http.Timeout = TimeSpan.FromSeconds(5);
        JsonObject? body;
        try { body = JsonNode.Parse(await http.GetStringAsync(new Uri(at, "status"), ct)) as JsonObject; }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException or System.Text.Json.JsonException)
        {
            return new Status(false, [], $"No local bridge answers at {at}. Kings played by local agents need it: start it with node sim/bridge.js "
                + "(see \"Local play\" in sim/README.md). It works only when the game runs on this computer, not on the published site.");
        }
        if (body?["bridge"]?.GetValue<string>() != "amarna-letters")
            return new Status(false, [], $"Something answers at {at}, but it is not the Amarna Letters bridge.");
        var seats = (body["seats"] as JsonArray ?? [])
            .Select(x => Enum.TryParse<Power>(x?.GetValue<string>(), out var p) ? (Power?)p : null)
            .OfType<Power>().ToList();
        var missing = kings.Where(k => !seats.Contains(k)).ToList();
        if (missing.Count > 0)
            return new Status(true, seats, $"The bridge has no folder for {string.Join(", ", missing)}: run node sim/setup.js, then restart the bridge.");
        return new Status(true, seats, "");
    }

    /// <summary>
    /// One request to one king: the bridge writes it into his folder and the page asks every <see cref="Poll"/> for the
    /// reply until it comes or <see cref="Timeout"/> passes. The page builds the request text itself, with a mark where
    /// the reply's path goes, which only the bridge knows: so the agent reads exactly what a file seat's agent reads.
    /// A request that times out, or whose game is stopped, is taken back, so that no agent is started for it later.
    /// </summary>
    internal async Task<(string Reply, int Chars)> AskOnceAsync(Power seat, CallSpec spec, string stem, string error, CancellationToken ct)
    {
        var mark = $"<reply path {Guid.NewGuid():N}>";
        var text = FileExchange.Request(spec, mark, error, FileExchange.King);
        var sent = await PostAsync("ask", new JsonObject { ["seat"] = seat.ToString(), ["name"] = stem, ["text"] = text, ["mark"] = mark }, ct);
        var chars = sent?["chars"] is JsonValue c && c.TryGetValue<int>(out var n) ? n : text.Length;
        var deadline = DateTime.UtcNow + Timeout;
        try
        {
            while (true)
            {
                if (DateTime.UtcNow > deadline) throw new TimeoutException($"no reply from the agent of {seat} after {Timeout.TotalMinutes:0} minutes");
                await Task.Delay(Poll, ct);
                HttpResponseMessage response;
                // The bridge may be restarted while an agent works: the request stays in the folder, so keep asking.
                try { response = await _http.GetAsync(new Uri(Address, $"reply?seat={seat}&name={Uri.EscapeDataString(stem)}"), ct); }
                catch (HttpRequestException) { continue; }
                catch (TaskCanceledException) when (!ct.IsCancellationRequested) { continue; }
                using (response)
                {
                    if (response.StatusCode == HttpStatusCode.NoContent) continue;
                    if (response.StatusCode == HttpStatusCode.NotFound)
                        throw new InvalidOperationException($"the bridge no longer holds the request {stem} for {seat}");
                    if (!response.IsSuccessStatusCode)
                        throw new InvalidOperationException($"the bridge answered {(int)response.StatusCode}: {await response.Content.ReadAsStringAsync(ct)}");
                    return ((await response.Content.ReadAsStringAsync(ct)).Trim().TrimStart('﻿'), chars);
                }
            }
        }
        catch (Exception ex) when (ex is OperationCanceledException or TimeoutException)
        {
            _ = WithdrawAsync(seat, stem);
            throw;
        }
    }

    private async Task<JsonObject?> PostAsync(string path, JsonObject body, CancellationToken ct)
    {
        // A bridge that is being restarted gets a few seconds; one that is not running fails the call, and the script stands in.
        for (var attempt = 1; ; attempt++)
        {
            try
            {
                using var content = new StringContent(body.ToJsonString(), Encoding.UTF8, "application/json");
                using var response = await _http.PostAsync(new Uri(Address, path), content, ct);
                var answer = await response.Content.ReadAsStringAsync(ct);
                if (!response.IsSuccessStatusCode) throw new InvalidOperationException($"the bridge refused the request: {answer}");
                return answer.Length == 0 ? null : JsonNode.Parse(answer) as JsonObject;
            }
            catch (HttpRequestException) when (attempt < 4)
            {
                await Task.Delay(TimeSpan.FromSeconds(2), ct);
            }
            catch (HttpRequestException ex)
            {
                throw new InvalidOperationException($"no local bridge answers at {Address}: {ex.Message}", ex);
            }
        }
    }

    private async Task WithdrawAsync(Power seat, string stem)
    {
        try { await PostAsync("cancel", new JsonObject { ["seat"] = seat.ToString(), ["name"] = stem }, CancellationToken.None); }
        catch (Exception) { /* best effort: the bridge moves stale requests aside when it starts */ }
    }
}

/// <summary>
/// A local agent king's channel: a file seat whose files are written by the local bridge (<see cref="LocalBridge"/>)
/// instead of by this program. The request, its checks, the one retry and the fallback to the script are a file seat's
/// (<see cref="FileExchange"/>); each exchange is logged as a call with no tokens, so a game replays exactly.
/// </summary>
public sealed class BridgeExchange(LocalBridge bridge, Power seat, Action<ModelCall>? record = null) : IJsonAsker
{
    public const string Model = "local agent";

    public Task<JsonObject> AskJsonAsync(CallSpec spec, CancellationToken ct) =>
        FileExchange.Converse(spec, Model, (stem, error) => bridge.AskOnceAsync(seat, spec, stem, error, ct), record);
}
