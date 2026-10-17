using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using Anthropic;
using Anthropic.Models.Beta.Messages;
using Amarna.Game;

namespace Amarna.Llm;

public sealed class ModelRefusedException(string model, string? category) : Exception($"{ModelIds.Display(model)} declined ({category ?? "no category"}).");

public sealed class ModelOutputException(string message) : Exception(message);

/// <summary>One structured call: a cached shared system block, a per-seat system block, one user message, a JSON schema.</summary>
public sealed class CallSpec
{
    public required string Key { get; init; }
    public required int Turn { get; init; }
    public required string Role { get; init; }
    public required string Model { get; init; }
    /// <summary>Stable text shared by many calls (rules, map, primer); marked for prompt caching.</summary>
    public required string SharedSystem { get; init; }
    public string SeatSystem { get; init; } = "";
    public required string User { get; init; }
    public required JsonObject Schema { get; init; }
    public string Effort { get; init; } = "medium";
    public int MaxTokens { get; init; } = 16000;
}

/// <summary>
/// The Anthropic Messages API, called with the player's own key. Outside the browser it goes
/// through the official C# SDK. In the browser the SDK cannot be constructed (it enables HTTP
/// decompression, which WebAssembly forbids), so the same request is posted with HttpClient,
/// carrying the header that opts in to direct browser access. Every call is logged with its
/// prompt, output, usage and cost. Output is constrained by a JSON schema; an unreadable reply
/// is retried once with the error, then the caller falls back to a script decision.
/// </summary>
public sealed class ClaudeClient : IJsonAsker
{
    public const string FallbackBeta = "server-side-fallback-2026-07-01";
    public const string ApiVersion = "2023-06-01";

    private readonly Action<ModelCall> _log;
    private readonly IAnthropicClient? _sdk;
    private readonly HttpClient? _http;
    private readonly string _apiKey;

    private sealed record Result(string Text, string? StopReason, string? Category, string Model, long Input, long Output, long CacheRead, long CacheWrite);

    public ClaudeClient(string apiKey, Action<ModelCall> log, bool browser, HttpMessageHandler? handler = null)
    {
        _log = log;
        _apiKey = apiKey;
        var http = handler is null ? new HttpClient() : new HttpClient(handler);
        http.Timeout = TimeSpan.FromMinutes(10);
        if (browser)
        {
            _http = http;
            return;
        }
        _sdk = new AnthropicClient
        {
            ApiKey = apiKey,
            HttpClient = http,
            Timeout = TimeSpan.FromMinutes(8),
            MaxRetries = 2,
        };
    }

    public bool UsesSdk => _sdk is not null;

    public Task<JsonObject> AskJsonAsync(CallSpec spec, CancellationToken ct) => CallJsonAsync(spec, ct);

    public async Task<JsonObject> CallJsonAsync(CallSpec spec, CancellationToken ct)
    {
        var user = spec.User;
        for (var attempt = 1; ; attempt++)
        {
            var text = await CallAsync(spec, user, ct);
            try
            {
                return JsonNode.Parse(text) as JsonObject ?? throw new ModelOutputException("the reply was not a JSON object");
            }
            catch (Exception ex) when (ex is JsonException or ModelOutputException && attempt == 1)
            {
                user = spec.User + $"\n\n(Your previous reply could not be read: {ex.Message}. Reply with one JSON object that matches the schema.)";
            }
        }
    }

    private async Task<string> CallAsync(CallSpec spec, string user, CancellationToken ct)
    {
        var call = new ModelCall
        {
            Key = spec.Key,
            Turn = spec.Turn,
            Role = spec.Role,
            Model = spec.Model,
            System = spec.SeatSystem,
            Prompt = user,
        };
        try
        {
            var r = _sdk is not null ? await ViaSdk(spec, user, ct) : await ViaHttp(spec, user, ct);
            call.InputTokens = r.Input;
            call.OutputTokens = r.Output;
            call.CacheReadTokens = r.CacheRead;
            call.CacheWriteTokens = r.CacheWrite;
            call.CostUsd = Price.For(spec.Model).Cost(r.Input, r.Output, r.CacheRead, r.CacheWrite);
            call.UsedFallback = r.Model.Length > 0 && r.Model != spec.Model;
            call.Output = r.Text;
            if (r.StopReason == "refusal")
            {
                call.Error = "refusal";
                throw new ModelRefusedException(spec.Model, r.Category);
            }
            if (r.StopReason == "max_tokens") call.Error = "max_tokens";
            return r.Text;
        }
        catch (Exception ex) when (call.Error is null)
        {
            call.Error = ex.Message;
            throw;
        }
        finally
        {
            _log(call);
        }
    }

    // ---------------------------------------------------------------- the official SDK (console, tests)

    private async Task<Result> ViaSdk(CallSpec spec, string user, CancellationToken ct)
    {
        var system = new List<BetaTextBlockParam>
        {
            new() { Text = spec.SharedSystem, CacheControl = new BetaCacheControlEphemeral() },
        };
        if (spec.SeatSystem.Length > 0) system.Add(new BetaTextBlockParam { Text = spec.SeatSystem });

        var schema = spec.Schema.ToDictionary(x => x.Key, x => JsonSerializer.SerializeToElement(x.Value));
        var parameters = new MessageCreateParams
        {
            Model = spec.Model,
            MaxTokens = spec.MaxTokens,
            System = system,
            Messages = [new BetaMessageParam { Role = Role.User, Content = user }],
            OutputConfig = new BetaOutputConfig
            {
                Effort = spec.Effort switch { "low" => Effort.Low, "high" => Effort.High, _ => Effort.Medium },
                Format = new BetaJsonOutputFormat { Schema = schema },
            },
        };
        if (ModelIds.SupportsFallback(spec.Model))
            parameters = parameters with { Betas = [FallbackBeta], Fallbacks = new BetaFallbacksParam(new Default()) };

        var response = await _sdk!.Beta.Messages.Create(parameters, ct);
        var u = response.Usage;
        var text = string.Concat(response.Content.Select(b => b.TryPickText(out var t) ? t.Text : ""));
        return new Result(text, response.StopReason?.Raw(), response.StopDetails?.Category?.Raw(), response.Model.Raw(),
            u.InputTokens, u.OutputTokens, u.CacheReadInputTokens ?? 0, u.CacheCreationInputTokens ?? 0);
    }

    // ---------------------------------------------------------------- raw HTTP (the browser)

    public static JsonObject RequestBody(CallSpec spec, string user)
    {
        var system = new JsonArray(new JsonObject
        {
            ["type"] = "text",
            ["text"] = spec.SharedSystem,
            ["cache_control"] = new JsonObject { ["type"] = "ephemeral" },
        });
        if (spec.SeatSystem.Length > 0) system.Add(new JsonObject { ["type"] = "text", ["text"] = spec.SeatSystem });
        var body = new JsonObject
        {
            ["model"] = spec.Model,
            ["max_tokens"] = spec.MaxTokens,
            ["system"] = system,
            ["messages"] = new JsonArray(new JsonObject { ["role"] = "user", ["content"] = user }),
            ["output_config"] = new JsonObject
            {
                ["effort"] = spec.Effort is "low" or "high" ? spec.Effort : "medium",
                ["format"] = new JsonObject { ["type"] = "json_schema", ["schema"] = spec.Schema.DeepClone() },
            },
        };
        if (ModelIds.SupportsFallback(spec.Model)) body["fallbacks"] = "default";
        return body;
    }

    private async Task<Result> ViaHttp(CallSpec spec, string user, CancellationToken ct)
    {
        var body = RequestBody(spec, user).ToJsonString();
        for (var attempt = 0; ; attempt++)
        {
            using var req = new HttpRequestMessage(HttpMethod.Post, "https://api.anthropic.com/v1/messages")
            {
                Content = new StringContent(body, Encoding.UTF8, "application/json"),
            };
            req.Headers.Add("x-api-key", _apiKey);
            req.Headers.Add("anthropic-version", ApiVersion);
            req.Headers.Add("anthropic-dangerous-direct-browser-access", "true");
            if (ModelIds.SupportsFallback(spec.Model)) req.Headers.Add("anthropic-beta", FallbackBeta);
            req.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

            HttpResponseMessage response;
            try
            {
                response = await _http!.SendAsync(req, ct);
            }
            catch (HttpRequestException) when (attempt < 2)
            {
                await Task.Delay(Backoff(attempt, null), ct);
                continue;
            }

            using (response)
            {
                var text = await response.Content.ReadAsStringAsync(ct);
                var status = (int)response.StatusCode;
                if (response.IsSuccessStatusCode) return Read(text);
                var retryable = status is 408 or 409 or 429 || status >= 500;
                if (retryable && attempt < 2)
                {
                    await Task.Delay(Backoff(attempt, response.Headers.RetryAfter?.Delta), ct);
                    continue;
                }
                throw new HttpRequestException($"Anthropic API {status}: {ErrorMessage(text)}", null, response.StatusCode);
            }
        }
    }

    private static TimeSpan Backoff(int attempt, TimeSpan? retryAfter) =>
        retryAfter is { } ra && ra > TimeSpan.Zero && ra < TimeSpan.FromMinutes(1) ? ra : TimeSpan.FromSeconds(1.5 * Math.Pow(2, attempt));

    private static string ErrorMessage(string body)
    {
        try { return JsonNode.Parse(body)?["error"]?["message"]?.GetValue<string>() ?? body; }
        catch { return body.Length > 300 ? body[..300] : body; }
    }

    private static Result Read(string json)
    {
        var o = JsonNode.Parse(json)!.AsObject();
        var text = string.Concat((o["content"] as JsonArray ?? new JsonArray())
            .Where(b => b?["type"]?.GetValue<string>() == "text")
            .Select(b => b!["text"]?.GetValue<string>() ?? ""));
        var u = o["usage"];
        long L(string k) => u?[k] is JsonValue v && v.TryGetValue<long>(out var n) ? n : 0;
        return new Result(
            text,
            o["stop_reason"]?.GetValue<string>(),
            o["stop_details"]?["category"]?.GetValue<string>(),
            o["model"]?.GetValue<string>() ?? "",
            L("input_tokens"), L("output_tokens"), L("cache_read_input_tokens"), L("cache_creation_input_tokens"));
    }
}
