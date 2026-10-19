using System.Text.Json;
using Anthropic;
using Anthropic.Models.Beta.Messages;

namespace Amarna.Llm.Sdk;

/// <summary>
/// The official C# SDK as the way calls leave a console program. It lives apart from <c>Amarna.Llm</c> so that the web
/// app, which cannot construct the SDK (it enables HTTP decompression, which WebAssembly forbids) and posts the same
/// request with HttpClient, does not download it. A console program that plays model seats calls <see cref="Use"/> once
/// before it builds them.
/// </summary>
public static class AnthropicSdk
{
    public static void Use() => ClaudeClient.Sdk = (apiKey, http) => new AnthropicSdkTransport(apiKey, http);
}

/// <summary>One call through the SDK, with the request <see cref="ClaudeClient.RequestBody"/> describes.</summary>
public sealed class AnthropicSdkTransport(string apiKey, HttpClient http) : IApiTransport
{
    private readonly IAnthropicClient _sdk = new AnthropicClient
    {
        ApiKey = apiKey,
        HttpClient = http,
        Timeout = TimeSpan.FromMinutes(8),
        MaxRetries = 2,
    };

    public async Task<ApiResult> SendAsync(CallSpec spec, string user, CancellationToken ct)
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
            parameters = parameters with { Betas = [ClaudeClient.FallbackBeta], Fallbacks = new BetaFallbacksParam(new Default()) };

        var response = await _sdk.Beta.Messages.Create(parameters, ct);
        var u = response.Usage;
        var text = string.Concat(response.Content.Select(b => b.TryPickText(out var t) ? t.Text : ""));
        return new ApiResult(text, response.StopReason?.Raw(), response.StopDetails?.Category?.Raw(), response.Model.Raw(),
            u.InputTokens, u.OutputTokens, u.CacheReadInputTokens ?? 0, u.CacheCreationInputTokens ?? 0);
    }
}
