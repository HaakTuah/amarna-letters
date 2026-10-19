using Amarna.Engine;
using Amarna.Game;
using Amarna.Game.Bots;

namespace Amarna.Web.Services;

// The script kings and the script characters of a browser game think in a Web Worker of their own, so that the page
// never waits on them: a season's orders take seconds of interpreted WebAssembly on a slow phone, and the first time a
// character writes, its text code takes a second or two to warm up. The worker runs a second copy of the same .NET code
// (wwwroot/js/script-worker.js). Each request carries what the engine handed the seat or the mind, written out as JSON
// as a file seat's view is, and the answer comes back the same way. The kings keep their memory in the worker from
// season to season, so every answer is the one the same code would give in the page, and a game's log replays as
// before. Where no worker can start, everything thinks in the page as it always did.

/// <summary>The script kings of a game, answering from the worker (see the note at the top of this file).</summary>
public sealed class WorkerSeat : ISeat
{
    private readonly ScriptLeader _inPage;
    private readonly ISeat _yielding;
    private readonly IScriptTransport _transport;
    private readonly ulong _seed;
    private readonly string _game;
    private bool? _remote;
    private int _moved;

    /// <param name="inPage">The same kings in the page: used for the whole game when no worker starts, and from then on if
    /// the worker stops (they then start with no memory of the seasons before).</param>
    /// <param name="game">This game, for the worker, which keeps the kings' memory of the newest game only.</param>
    public WorkerSeat(ScriptLeader inPage, IScriptTransport transport, ulong seed, string game)
    {
        _inPage = inPage;
        _yielding = new YieldingSeat(inPage);
        _transport = transport;
        _seed = seed;
        _game = game;
    }

    public string Label => _inPage.Label;

    /// <summary>Raised once if the worker stops during the game and the kings carry on in the page.</summary>
    public event Action<string>? MovedToPage;

    /// <summary>Whether the kings think in the worker: decided at their first call (waiting for it to start), then kept.</summary>
    private async Task<bool> RemoteAsync()
    {
        _remote ??= await _transport.ReadyAsync();
        return _remote.Value;
    }

    public async Task<TurnSubmission> DecideAsync(SeatView view, CancellationToken ct)
    {
        if (!await RemoteAsync()) return await _yielding.DecideAsync(view, ct);
        // Each king's view is written out in a task of its own, so that the page can draw between them.
        await Task.Delay(1, ct);
        var reply = await AskAsync(new ScriptRequest { Kind = ScriptRequest.Decide, View = view }, ct);
        if (reply is null) return await _yielding.DecideAsync(view, ct);
        return reply.Submission ?? throw new InvalidOperationException(reply.Error ?? "The worker sent no orders.");
    }

    public async Task<HostReply> HostAudienceAsync(AudienceView view, SeatView court, CancellationToken ct)
    {
        if (!await RemoteAsync()) return await _inPage.HostAudienceAsync(view, court, ct);
        var reply = await AskAsync(new ScriptRequest { Kind = ScriptRequest.Host, Audience = view, View = court }, ct);
        if (reply is null) return await _inPage.HostAudienceAsync(view, court, ct);
        return reply.Host ?? throw new InvalidOperationException(reply.Error ?? "The worker sent no answer.");
    }

    /// <summary>The worker's reply, or null if the worker has stopped (the kings then think in the page).</summary>
    private async Task<ScriptReply?> AskAsync(ScriptRequest request, CancellationToken ct)
    {
        request.Game = _game;
        request.Seed = _seed;
        var reply = await _transport.TryAskAsync(request, ct);
        if (reply is null && _remote == true)
        {
            _remote = false;
            if (Interlocked.Exchange(ref _moved, 1) == 0) MovedToPage?.Invoke(_transport.Problem ?? "it stopped");
        }
        return reply;
    }
}

/// <summary>
/// The script characters, answering from the worker. They keep no memory of their own (all of it is in the game's
/// state, which each request carries), so the page can answer for them at any time with the same result.
/// </summary>
public sealed class WorkerMind(ScriptMind inPage, IScriptTransport transport, string game) : ICharacterMind
{
    public string Label => inPage.Label;

    // A reply without an answer (the worker has stopped, or the character's code failed there) is answered in the page,
    // which gives the same answer or fails the same way.
    public async Task<PresentResult> PresentAsync(EnvoyContext ctx, CancellationToken ct) =>
        (await transport.TryAskAsync(new ScriptRequest { Game = game, Kind = ScriptRequest.Present, Envoy = ctx }, ct))?.Present
        ?? await inPage.PresentAsync(ctx, ct);

    public async Task<EnvoyReaction> ReactAsync(EnvoyContext ctx, HostReply host, CancellationToken ct) =>
        (await transport.TryAskAsync(new ScriptRequest { Game = game, Kind = ScriptRequest.React, Envoy = ctx, Heard = host }, ct))?.Reaction
        ?? await inPage.ReactAsync(ctx, host, ct);

    public async Task<MindReply> WriteAsync(MindContext ctx, CancellationToken ct) =>
        (await transport.TryAskAsync(new ScriptRequest { Game = game, Kind = ScriptRequest.Write, Mind = ctx }, ct))?.Written
        ?? await inPage.WriteAsync(ctx, ct);
}

/// <summary>How the page reaches the worker (in tests, a host in the same process).</summary>
public interface IScriptTransport
{
    /// <summary>True once the worker is ready; false if it cannot start.</summary>
    Task<bool> ReadyAsync();

    /// <summary>A new game begins: its name for the worker. Requests still queued for earlier games are dropped.</summary>
    string NewGame(ulong seed);

    /// <summary>Why the worker cannot answer, once it cannot.</summary>
    string? Problem { get; }

    /// <summary>
    /// The worker's reply, or null if there is no worker or it has stopped (the caller then answers in the page). A reply
    /// may carry the bot's own failure (<see cref="ScriptReply.Error"/>), which is not the worker's.
    /// </summary>
    Task<ScriptReply?> TryAskAsync(ScriptRequest request, CancellationToken ct);
}

/// <summary>A question to the worker: a king's orders or its answer at an audience, or a character's words.</summary>
public sealed class ScriptRequest
{
    public const string Decide = "decide";
    public const string Host = "host";
    public const string Present = "present";
    public const string React = "react";
    public const string Write = "write";

    /// <summary>Which game this is: the worker keeps the kings' memory of the newest game only, and drops requests of older ones.</summary>
    public string Game { get; set; } = "";
    /// <summary>For the kings: the game's seed, from which each king's own seat seed is derived (<see cref="ScriptLeader.SeatSeed"/>).</summary>
    public ulong Seed { get; set; }
    public string Kind { get; set; } = "";
    /// <summary>A king's view: for orders, its season; at an audience, its court as the audience begins.</summary>
    public SeatView? View { get; set; }
    public AudienceView? Audience { get; set; }
    public EnvoyContext? Envoy { get; set; }
    /// <summary>What the envoy heard from the host (for <see cref="React"/>).</summary>
    public HostReply? Heard { get; set; }
    public MindContext? Mind { get; set; }
}

public sealed class ScriptReply
{
    public TurnSubmission? Submission { get; set; }
    public HostReply? Host { get; set; }
    public PresentResult? Present { get; set; }
    public EnvoyReaction? Reaction { get; set; }
    public MindReply? Written { get; set; }
    /// <summary>The bot's own failure, which the game treats like any seat's or mind's (the stand-in answers that call).</summary>
    public string? Error { get; set; }
}

/// <summary>
/// The worker's side: the script kings of the newest game and the script characters, answering requests in the order
/// they come. Every king keeps its own memory (one <see cref="ScriptLeader"/> per game, as in the page).
/// </summary>
public sealed class ScriptHost
{
    private readonly ScriptMind _minds = new();
    private string _game = "";
    private ScriptLeader? _kings;

    /// <summary>
    /// Answers requests of a throwaway game, so that the serializer has worked out its types and the bots' code has run
    /// once before the first real request (in interpreted WebAssembly both take a noticeable time). The worker does it
    /// while it boots, as the page sets up the game. It touches nothing of any real game.
    /// </summary>
    public static void WarmUp()
    {
        var state = GameFactory.NewGame(1);
        var host = new ScriptHost();
        host.Answer(ScriptJson.Write(new ScriptRequest { Game = "warm-up", Seed = 1, Kind = ScriptRequest.Decide, View = Views.For(state, Power.Egypt) }));
        var envoy = state.Characters[0];
        var mind = new MindContext { Request = new MindRequest { Task = MindTask.Pitch, Court = Power.Egypt }, Self = envoy, Turn = 1, Seed = 1 };
        host.Answer(ScriptJson.Write(new ScriptRequest { Kind = ScriptRequest.Write, Mind = mind }));
    }

    public string Answer(string requestJson)
    {
        try
        {
            var request = ScriptJson.ReadRequest(requestJson);
            var none = CancellationToken.None;
            var reply = request.Kind switch
            {
                ScriptRequest.Decide => new ScriptReply { Submission = Kings(request).DecideAsync(Need(request.View), none).GetAwaiter().GetResult() },
                ScriptRequest.Host => new ScriptReply { Host = Kings(request).HostAudienceAsync(Need(request.Audience), Need(request.View), none).GetAwaiter().GetResult() },
                ScriptRequest.Present => new ScriptReply { Present = _minds.PresentAsync(Need(request.Envoy), none).GetAwaiter().GetResult() },
                ScriptRequest.React => new ScriptReply { Reaction = _minds.ReactAsync(Need(request.Envoy), Need(request.Heard), none).GetAwaiter().GetResult() },
                ScriptRequest.Write => new ScriptReply { Written = _minds.WriteAsync(Need(request.Mind), none).GetAwaiter().GetResult() },
                _ => throw new InvalidOperationException($"Unknown request '{request.Kind}'."),
            };
            return ScriptJson.Write(reply);
        }
        catch (Exception ex)
        {
            return ScriptJson.Write(new ScriptReply { Error = ex.Message });
        }
    }

    private ScriptLeader Kings(ScriptRequest request)
    {
        if (_kings is null || request.Game != _game)
        {
            _kings = new ScriptLeader(request.Seed);
            _game = request.Game;
        }
        return _kings;
    }

    private static T Need<T>(T? value) where T : class => value ?? throw new InvalidOperationException($"The request has no {typeof(T).Name}.");
}

/// <summary>
/// The requests and replies, read and written with serialization code generated at build time and the same settings as
/// <see cref="Json.Options"/>. Worked out at run time instead, their types cost the page most of a second the first time
/// on a slow phone.
/// </summary>
[System.Text.Json.Serialization.JsonSourceGenerationOptions(
    PropertyNamingPolicy = System.Text.Json.Serialization.JsonKnownNamingPolicy.CamelCase,
    DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull,
    UseStringEnumConverter = true,
    PropertyNameCaseInsensitive = true)]
[System.Text.Json.Serialization.JsonSerializable(typeof(ScriptRequest))]
[System.Text.Json.Serialization.JsonSerializable(typeof(ScriptReply))]
public sealed partial class ScriptJson : System.Text.Json.Serialization.JsonSerializerContext
{
    public static string Write(ScriptRequest request) => System.Text.Json.JsonSerializer.Serialize(request, Default.ScriptRequest);
    public static string Write(ScriptReply reply) => System.Text.Json.JsonSerializer.Serialize(reply, Default.ScriptReply);
    public static ScriptRequest ReadRequest(string json) => System.Text.Json.JsonSerializer.Deserialize(json, Default.ScriptRequest) ?? throw new InvalidOperationException("Could not read the request.");
    public static ScriptReply ReadReply(string json) => System.Text.Json.JsonSerializer.Deserialize(json, Default.ScriptReply) ?? throw new InvalidOperationException("Could not read the reply.");
}
