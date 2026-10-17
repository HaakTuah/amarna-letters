using System.Net;
using System.Text;
using System.Text.Json.Nodes;

namespace Amarna.Llm;

/// <summary>
/// Stands in for the Anthropic API (tests and the "simulate" option): records every request and answers with valid JSON chosen
/// by looking at the schema the request asks for. Optional hooks inject bad output or refusals.
/// </summary>
public sealed class SimulatedAnthropic : HttpMessageHandler
{
    public List<(HttpRequestMessage Request, JsonObject Body)> Requests { get; } = new();
    public Func<JsonObject, string?>? Override { get; set; }
    public bool Refuse { get; set; }
    /// <summary>Report token usage (tests check cost accounting); the in-app simulator reports none, so it costs nothing.</summary>
    public bool ReportUsage { get; set; } = true;
    private readonly object _gate = new();

    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
    {
        var text = request.Content is null ? "{}" : await request.Content.ReadAsStringAsync(ct);
        var body = JsonNode.Parse(text)!.AsObject();
        lock (_gate) Requests.Add((request, body));

        var props = body["output_config"]?["format"]?["schema"]?["properties"]?.AsObject();
        var output = Override?.Invoke(body) ?? Answer(props);
        var model = body["model"]?.GetValue<string>() ?? "claude-sonnet-5-5";
        var response = new JsonObject
        {
            ["id"] = "msg_" + Guid.NewGuid().ToString("N")[..12],
            ["type"] = "message",
            ["role"] = "assistant",
            ["model"] = model,
            ["content"] = new JsonArray(new JsonObject { ["type"] = "text", ["text"] = output }),
            ["stop_reason"] = Refuse ? "refusal" : "end_turn",
            ["stop_sequence"] = null,
            ["usage"] = new JsonObject
            {
                ["input_tokens"] = ReportUsage ? 1200 : 0,
                ["output_tokens"] = ReportUsage ? 300 : 0,
                ["cache_read_input_tokens"] = ReportUsage ? 3000 : 0,
                ["cache_creation_input_tokens"] = 0,
            },
        };
        return new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(response.ToJsonString(), Encoding.UTF8, "application/json"),
        };
    }

    private static string Answer(JsonObject? props)
    {
        bool Has(string name) => props?.ContainsKey(name) == true;
        JsonObject o;
        if (Has("units"))
            o = new JsonObject
            {
                ["notes"] = "Hold the line; keep Hatti friendly.",
                ["units"] = new JsonArray(),
                ["letters"] = new JsonArray(),
                ["other_orders"] = new JsonArray(),
            };
        else if (Has("gift_to_envoy"))
            o = new JsonObject
            {
                ["speech"] = "Tell your lord I am his brother.",
                ["gift_to_envoy"] = 0, ["gift_request"] = "", ["offer_service_wage"] = 0,
                ["seal_tablet"] = true, ["detain_envoy"] = false, ["send_gold_back"] = 0, ["gold_back_purity"] = 100, ["end_audience"] = true,
            };
        else if (Has("accept_gift"))
            o = new JsonObject { ["speech"] = "I thank you, Great King.", ["accept_gift"] = false, ["accept_service"] = false, ["commitments"] = "" };
        else if (Has("speech") && Has("keep_gold"))
            o = new JsonObject { ["speech"] = "My lord greets you as a brother.", ["keep_gold"] = 0 };
        else if (Has("report") && Has("keep_gold"))
            o = new JsonObject { ["report"] = "The king received me kindly.", ["keep_gold"] = 0 };
        else if (Has("pitch"))
            o = new JsonObject { ["pitch"] = "I know every road from Ugarit to Babylon.", ["asking_price"] = 20 };
        else if (Has("persona"))
            o = new JsonObject { ["persona"] = "You are a careful messenger who has seen many courts and trusts none of them entirely. You speak softly." };
        else if (Has("summary"))
            o = new JsonObject { ["summary"] = "I have carried many messages and kept my own counsel." };
        else if (Has("chronicle"))
            o = new JsonObject { ["chronicle"] = "Year 1. His Majesty triumphed in all things." };
        else if (Has("report"))
            o = new JsonObject { ["report"] = "Nothing of note." };
        else
            o = new JsonObject();
        // With sleeping seats on, a simulated king sleeps a season at a time, so the path is exercised.
        if (Has("units") && Has("sleep"))
        {
            o["sleep"] = new JsonObject { ["seasons"] = 1, ["wake_on"] = new JsonArray() };
            o["schedule"] = new JsonArray();
        }
        return o.ToJsonString();
    }
}
