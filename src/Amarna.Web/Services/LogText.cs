using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using Amarna.Engine;
using Amarna.Game;

namespace Amarna.Web.Services;

/// <summary>
/// The autosave's text, the same as <see cref="GameLog.ToJsonl"/> writes, built up season by season: a log only ever
/// gains decisions and calls, so the lines already written are kept and each save writes out only what is new. Writing
/// the whole log again every season grows slow on a phone as a game goes on (a model game's calls carry whole prompts).
/// </summary>
public sealed class LogText
{
    private GameLog? _log;
    private readonly StringBuilder _decisions = new();
    private readonly StringBuilder _calls = new();
    private int _decisionsWritten;
    private int _callsWritten;

    public string For(GameLog log)
    {
        if (!ReferenceEquals(log, _log) || log.Decisions.Count < _decisionsWritten || log.Calls.Count < _callsWritten)
        {
            _log = log;
            _decisions.Clear();
            _calls.Clear();
            _decisionsWritten = 0;
            _callsWritten = 0;
        }
        // Each line exactly as GameLog.ToJsonl writes it.
        for (; _decisionsWritten < log.Decisions.Count; _decisionsWritten++)
        {
            var (key, json) = log.Decisions[_decisionsWritten];
            _decisions.AppendLine(new JsonObject { ["type"] = "decision", ["key"] = key, ["value"] = JsonNode.Parse(json) }.ToJsonString());
        }
        for (; _callsWritten < log.Calls.Count; _callsWritten++)
        {
            var node = JsonSerializer.SerializeToNode(log.Calls[_callsWritten], Json.Options)!.AsObject();
            node["type"] = "call";
            _calls.AppendLine(node.ToJsonString());
        }
        var header = JsonSerializer.SerializeToNode(log.Header, Json.Options)!.AsObject();
        header["type"] = "header";
        return new StringBuilder(_decisions.Length + _calls.Length + 1024)
            .AppendLine(header.ToJsonString()).Append(_decisions).Append(_calls).ToString();
    }
}
