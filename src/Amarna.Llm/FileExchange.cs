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
/// (a person, or an agent allowed to touch only this folder) sees exactly what a model king sees, plus a
/// closing <see cref="Footer"/> on how to finish that API kings never get.
/// An unreadable reply gets one retry request with the error; a second failure, or the timeout,
/// throws, and the runner falls back to the script king for that decision, as it does for models.
/// Every exchange is also logged as a model call (with no tokens, but the request's length), so the log holds the prompts.
/// A file character (an envoy, spy or candidate, see <see cref="LlmCharacterMind"/>) uses the same channel: its request
/// is the one a model character would get, with the same footer, and a failure falls back to the script character.
/// </summary>
public sealed class FileExchange(string folder, TimeSpan timeout, Action<ModelCall>? record = null, Action<string>? say = null, string actor = FileExchange.King) : IJsonAsker
{
    public string Folder { get; } = Path.GetFullPath(folder);
    public static readonly TimeSpan Poll = TimeSpan.FromMilliseconds(400);

    /// <summary>Whom the request asks to decide: a king's file seat decides "as the king", a file character "as yourself".</summary>
    public const string King = "the king";
    public const string Character = "yourself";

    public Task<JsonObject> AskJsonAsync(CallSpec spec, CancellationToken ct)
    {
        Directory.CreateDirectory(Folder);
        return Converse(spec, "file seat", (stem, error) => AskOnceAsync(spec, stem, error, ct), record);
    }

    /// <summary>
    /// One decision as an exchange of files, wherever the files are: the request under the key's safe name, and on an
    /// unreadable reply one retry (".retry") saying what was wrong. The reply must be one JSON object that matches the
    /// schema; the call is recorded either way. A <see cref="FileExchange"/> writes the files itself; a
    /// <see cref="BridgeExchange"/> (local play) has the local bridge write them.
    /// </summary>
    internal static async Task<JsonObject> Converse(CallSpec spec, string model, Func<string, string, Task<(string Reply, int Chars)>> askOnce,
        Action<ModelCall>? record)
    {
        var name = SafeName(spec.Key);
        var call = new ModelCall { Key = spec.Key, Turn = spec.Turn, Role = spec.Role, Model = model, System = spec.SeatSystem, Prompt = spec.User };
        try
        {
            var error = "";
            for (var attempt = 1; ; attempt++)
            {
                var stem = attempt == 1 ? name : $"{name}.retry";
                var (text, chars) = await askOnce(stem, error);
                call.Output = text;
                call.RequestChars = chars;
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

    private async Task<(string Reply, int Chars)> AskOnceAsync(CallSpec spec, string stem, string error, CancellationToken ct)
    {
        var request = Path.Combine(Folder, stem + ".request.md");
        var reply = Path.Combine(Folder, stem + ".reply.json");
        if (File.Exists(reply)) File.Delete(reply);
        var tmp = request + ".tmp";
        var text = Request(spec, reply, error, actor);
        await File.WriteAllTextAsync(tmp, text, Encoding.UTF8, ct);
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
                if (DateTime.UtcNow - emptySince > EmptyGrace) return ("", text.Length);
                continue;
            }
            emptySince = null;
            // Read once the file has stopped changing for one poll.
            if (now == size)
            {
                try { return ((await File.ReadAllTextAsync(reply, ct)).Trim().TrimStart('﻿'), text.Length); }
                catch (IOException) { size = -1; continue; }
            }
            size = now;
        }
    }

    public static readonly TimeSpan EmptyGrace = TimeSpan.FromSeconds(5);

    /// <summary>The request file: the same system text, prompt and schema a model king or character receives, and where to answer.</summary>
    public static string Request(CallSpec spec, string replyPath, string error, string actor = King)
    {
        var sb = new StringBuilder();
        sb.AppendLine($"# {spec.Key}");
        sb.AppendLine();
        sb.AppendLine($"Everything you need for this decision is in this file. Decide as {actor}, then write your answer as one JSON object to the file named under HOW TO REPLY.");
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
        sb.AppendLine(Readable(spec.Schema));
        sb.AppendLine("```");
        sb.AppendLine();
        sb.AppendLine(Footer);
        return sb.ToString();
    }

    /// <summary>
    /// The schema as the request prints it: indented, but each object that holds no other object (a field: its type, enum
    /// and description) on one line, and apostrophes left as they are. About two thirds of the length of a fully indented
    /// schema, and no line grows long enough for a file reader to cut it, as one compact line would.
    /// </summary>
    public static string Readable(JsonNode? node, int depth = 0)
    {
        bool Nested(JsonNode? x) => x is JsonObject || x is JsonArray a && a.Any(Nested);
        var pad = new string(' ', 2 * depth);
        var inner = new string(' ', 2 * (depth + 1));
        return node switch
        {
            JsonObject o when o.Any(kv => Nested(kv.Value)) =>
                "{\n" + string.Join(",\n", o.Select(kv => $"{inner}{JsonSerializer.Serialize(kv.Key, Plain)}: {Readable(kv.Value, depth + 1)}")) + $"\n{pad}}}",
            JsonArray a when a.Any(Nested) => "[\n" + string.Join(",\n", a.Select(x => inner + Readable(x, depth + 1))) + $"\n{pad}]",
            null => "null",
            _ => node.ToJsonString(Plain),
        };
    }

    /// <summary>JSON as a reader reads it: no character escaped that JSON does not require (the request is not a web page).</summary>
    private static readonly JsonSerializerOptions Plain = new() { Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping };

    /// <summary>
    /// Only file seats get this: an agent answering the request ends with a message to whoever started it,
    /// which must carry nothing of the king's decision. A model king called through the API sees no such line.
    /// </summary>
    public const string Footer =
        "When you have written your reply file, your final message must be the single word done. Say nothing about your decision. "
        + "Earlier reply files cannot be read: your record of earlier seasons is in this request.";

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
