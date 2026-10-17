using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using Amarna.Game;

namespace Amarna.Llm;

/// <summary>Something that answers a prompt with a JSON object matching a schema: the Anthropic API, or a file seat.</summary>
public interface IJsonAsker
{
    Task<JsonObject> AskJsonAsync(CallSpec spec, CancellationToken ct);
}

/// <summary>
/// A file seat's channel. Instead of calling the API, it writes the request a model king would get
/// (rulebook and customs primer, identity, the season's view, the JSON schema) to
/// <c>&lt;folder&gt;/&lt;key&gt;.request.md</c> and waits for <c>&lt;key&gt;.reply.json</c>. Whoever answers
/// (a person, or an agent allowed to touch only this folder) sees exactly what a model king sees.
/// An unreadable reply gets one retry request with the error; a second failure, or the timeout,
/// throws, and the runner falls back to the script king for that decision, as it does for models.
/// Every exchange is also logged as a model call (with no tokens), so the log holds the prompts.
/// </summary>
public sealed class FileExchange(string folder, TimeSpan timeout, Action<ModelCall>? record = null, Action<string>? say = null) : IJsonAsker
{
    public string Folder { get; } = Path.GetFullPath(folder);
    public static readonly TimeSpan Poll = TimeSpan.FromMilliseconds(400);

    public async Task<JsonObject> AskJsonAsync(CallSpec spec, CancellationToken ct)
    {
        Directory.CreateDirectory(Folder);
        var name = SafeName(spec.Key);
        var call = new ModelCall { Key = spec.Key, Turn = spec.Turn, Role = spec.Role, Model = "file seat", System = spec.SeatSystem, Prompt = spec.User };
        try
        {
            var error = "";
            for (var attempt = 1; ; attempt++)
            {
                var stem = attempt == 1 ? name : $"{name}.retry";
                var text = await AskOnceAsync(spec, stem, error, ct);
                call.Output = text;
                try
                {
                    var json = Lenient(text) ?? throw new JsonException("the reply was not one JSON object");
                    // Models get the schema enforced by the API; a file seat's reply is checked here instead.
                    var problems = Problems(json, spec.Schema);
                    if (problems.Count > 0) throw new JsonException("it does not match the schema: " + string.Join("; ", problems));
                    record?.Invoke(call);
                    return json;
                }
                catch (JsonException ex) when (attempt == 1)
                {
                    error = ex.Message;
                }
            }
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            call.Error = ex.Message;
            record?.Invoke(call);
            throw;
        }
    }

    private async Task<string> AskOnceAsync(CallSpec spec, string stem, string error, CancellationToken ct)
    {
        var request = Path.Combine(Folder, stem + ".request.md");
        var reply = Path.Combine(Folder, stem + ".reply.json");
        if (File.Exists(reply)) File.Delete(reply);
        var tmp = request + ".tmp";
        await File.WriteAllTextAsync(tmp, Request(spec, reply, error), Encoding.UTF8, ct);
        File.Move(tmp, request, overwrite: true);
        say?.Invoke($"waiting for {reply}");

        var deadline = DateTime.UtcNow + timeout;
        var size = -1L;
        DateTime? emptySince = null;
        while (true)
        {
            ct.ThrowIfCancellationRequested();
            if (DateTime.UtcNow > deadline) throw new TimeoutException($"no reply in {reply} after {timeout.TotalMinutes:0} minutes");
            await Task.Delay(Poll, ct);
            long now;
            try { now = File.Exists(reply) ? new FileInfo(reply).Length : -1; }
            catch (IOException) { continue; }
            if (now < 0) { size = -1; continue; }
            if (now == 0)
            {
                // A reply that stays empty is read as it stands (and fails), rather than waited on forever.
                emptySince ??= DateTime.UtcNow;
                if (DateTime.UtcNow - emptySince > EmptyGrace) return "";
                continue;
            }
            emptySince = null;
            // Read once the file has stopped changing for one poll.
            if (now == size)
            {
                try { return (await File.ReadAllTextAsync(reply, ct)).Trim().TrimStart('﻿'); }
                catch (IOException) { size = -1; continue; }
            }
            size = now;
        }
    }

    public static readonly TimeSpan EmptyGrace = TimeSpan.FromSeconds(5);

    /// <summary>The request file: the same system text, prompt and schema a model king receives, and where to answer.</summary>
    public static string Request(CallSpec spec, string replyPath, string error)
    {
        var sb = new StringBuilder();
        sb.AppendLine($"# {spec.Key}");
        sb.AppendLine();
        sb.AppendLine("Everything you need for this decision is in this file. Decide as the king, then write your answer as one JSON object to the file named under HOW TO REPLY.");
        sb.AppendLine();
        sb.AppendLine("## SYSTEM");
        sb.AppendLine();
        sb.AppendLine(spec.SharedSystem.TrimEnd());
        if (spec.SeatSystem.Length > 0)
        {
            sb.AppendLine();
            sb.AppendLine(spec.SeatSystem.TrimEnd());
        }
        sb.AppendLine();
        sb.AppendLine("## THIS DECISION");
        sb.AppendLine();
        sb.AppendLine(spec.User.TrimEnd());
        if (error.Length > 0)
        {
            sb.AppendLine();
            sb.AppendLine($"(Your previous reply could not be read: {error}. Reply with one JSON object that matches the schema.)");
        }
        sb.AppendLine();
        sb.AppendLine("## HOW TO REPLY");
        sb.AppendLine();
        sb.AppendLine($"Write exactly one JSON object that matches this schema, and nothing else, to: {replyPath.Replace('\\', '/')}");
        sb.AppendLine();
        sb.AppendLine("```json");
        sb.AppendLine(spec.Schema.ToJsonString(new JsonSerializerOptions { WriteIndented = true }));
        sb.AppendLine("```");
        return sb.ToString();
    }

    /// <summary>The reply as a JSON object: the whole text, or else the outermost {...} in it (a code fence or a stray line around it is forgiven).</summary>
    public static JsonObject? Lenient(string text)
    {
        try
        {
            if (JsonNode.Parse(text) is JsonObject whole) return whole;
        }
        catch (JsonException) { }
        var start = text.IndexOf('{');
        var end = text.LastIndexOf('}');
        if (start < 0 || end <= start) return null;
        try { return JsonNode.Parse(text[start..(end + 1)]) as JsonObject; }
        catch (JsonException) { return null; }
    }

    /// <summary>
    /// Where a reply breaks the schema: wrong JSON types and values outside an enum (at most eight).
    /// Missing properties are allowed: the parser reads them as empty, as "none".
    /// </summary>
    public static List<string> Problems(JsonNode? node, JsonObject schema)
    {
        var problems = new List<string>();
        Walk(node, schema, "reply", problems);
        return problems;
    }

    private static void Walk(JsonNode? node, JsonObject schema, string path, List<string> problems)
    {
        if (problems.Count >= 8) return;
        switch (schema["type"]?.GetValue<string>())
        {
            case "object":
                if (node is not JsonObject o) { problems.Add($"{path} should be an object"); return; }
                var props = schema["properties"] as JsonObject;
                foreach (var (k, v) in o)
                    if (props?[k] is JsonObject inner) Walk(v, inner, $"{path}.{k}", problems);
                break;
            case "array":
                if (node is not JsonArray a) { problems.Add($"{path} should be an array"); return; }
                if (schema["items"] is JsonObject items)
                    for (var i = 0; i < a.Count; i++) Walk(a[i], items, $"{path}[{i}]", problems);
                break;
            case "string":
                if (node is not JsonValue sv || sv.GetValueKind() != JsonValueKind.String) { problems.Add($"{path} should be a string"); return; }
                if (schema["enum"] is JsonArray allowed && !allowed.Any(e => e?.GetValue<string>() == sv.GetValue<string>()))
                    problems.Add($"{path} must be one of {string.Join(", ", allowed.Select(e => e?.GetValue<string>()))}");
                break;
            case "integer":
                if (node is not JsonValue iv || !iv.TryGetValue<int>(out _)) problems.Add($"{path} should be a whole number");
                break;
            case "boolean":
                if (node is not JsonValue bv || bv.GetValueKind() is not (JsonValueKind.True or JsonValueKind.False)) problems.Add($"{path} should be true or false");
                break;
        }
    }

    public static string SafeName(string key) => string.Concat(key.Select(ch => char.IsLetterOrDigit(ch) || ch is '-' or '_' ? ch : '_'));
}
