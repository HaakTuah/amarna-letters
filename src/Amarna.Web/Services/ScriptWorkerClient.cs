using System.Runtime.InteropServices.JavaScript;
using System.Runtime.Versioning;
using Amarna.Engine;

namespace Amarna.Web.Services;

/// <summary>
/// The page's side of the script players' worker (<c>wwwroot/js/script-worker-client.js</c> and <c>script-worker.js</c>;
/// see ScriptWorker.cs). It starts when the first game with script players is set up, and boots a second .NET runtime
/// from the files the page has already downloaded, so it costs no download of its own.
/// </summary>
public sealed class ScriptWorkerClient : IScriptTransport
{
    private static int _games;
    private Task<bool>? _ready;

    public string? Problem { get; private set; }

    /// <summary>Starts the worker if it is not running yet. Outside a browser there is none.</summary>
    public Task<bool> ReadyAsync() => _ready ??= OperatingSystem.IsBrowser() ? StartAsync() : Task.FromResult(false);

    [SupportedOSPlatform("browser")]
    private async Task<bool> StartAsync()
    {
        try
        {
            await JSHost.ImportAsync(ScriptWorkerInterop.Module, "../js/script-worker-client.js");
            if (await ScriptWorkerInterop.Start()) return true;
            Problem = "it could not start";
        }
        catch (Exception ex)
        {
            Problem = ex.Message;
        }
        Console.WriteLine($"The script players think in the page: their worker could not start ({Problem}).");
        return false;
    }

    public string NewGame(ulong seed)
    {
        var game = $"game-{Interlocked.Increment(ref _games)}-{seed}";
        // Starting the worker here gives it the time the game spends setting up; requests wait until it is ready.
        if (OperatingSystem.IsBrowser()) _ = BeginAsync(game);
        return game;
    }

    [SupportedOSPlatform("browser")]
    private async Task BeginAsync(string game)
    {
        if (await ReadyAsync()) ScriptWorkerInterop.Begin(game);
    }

    public async Task<ScriptReply?> TryAskAsync(ScriptRequest request, CancellationToken ct)
    {
        if (!OperatingSystem.IsBrowser() || !await ReadyAsync()) return null;
        var body = ScriptJson.Write(request);
        string text;
        try
        {
            text = await ScriptWorkerInterop.Ask(request.Game, body).WaitAsync(ct);
        }
        catch (OperationCanceledException)
        {
            throw;
        }
        catch (Exception ex)
        {
            Problem ??= ex.Message;
            return null;
        }
        if (text == Superseded) throw new OperationCanceledException("A newer game has begun.");
        return ScriptJson.ReadReply(text);
    }

    /// <summary>The worker's answer to a request of a game that has been left for a newer one.</summary>
    public const string Superseded = "superseded";
}

[SupportedOSPlatform("browser")]
internal static partial class ScriptWorkerInterop
{
    public const string Module = "amarna-script-worker";

    [JSImport("start", Module)]
    [return: JSMarshalAs<JSType.Promise<JSType.Boolean>>]
    internal static partial Task<bool> Start();

    [JSImport("begin", Module)]
    internal static partial void Begin(string game);

    [JSImport("ask", Module)]
    [return: JSMarshalAs<JSType.Promise<JSType.String>>]
    internal static partial Task<string> Ask(string game, string request);
}

/// <summary>What the worker calls: it runs this assembly in a .NET runtime of its own, without Blazor.</summary>
[SupportedOSPlatform("browser")]
public static partial class ScriptWorkerExports
{
    private static readonly ScriptHost Host = new();

    [JSExport]
    internal static string Answer(string request) => Host.Answer(request);

    [JSExport]
    internal static void WarmUp() => ScriptHost.WarmUp();
}
