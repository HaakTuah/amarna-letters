using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using Amarna.Engine;

namespace Amarna.Game;

public sealed class LogHeader
{
    /// <summary>The rules version the game was played under (<see cref="GameState.CurrentVersion"/> for a new game).</summary>
    public int Version { get; set; } = GameState.CurrentVersion;
    public ulong Seed { get; set; }
    public GameConfig Config { get; set; } = new();
    public Dictionary<Power, string> Seats { get; set; } = new();
    /// <summary>Seats that may sleep in this game (when the config allows sleeping seats).</summary>
    public List<Power> Sleepers { get; set; } = new();
    public string Minds { get; set; } = "";
    public string Narrator { get; set; } = "";
    public string Note { get; set; } = "";
}

/// <summary>One language-model call, kept for replay review, cost accounting and analysis.</summary>
public sealed class ModelCall
{
    public string Key { get; set; } = "";
    public int Turn { get; set; }
    public string Role { get; set; } = "";
    public string Model { get; set; } = "";
    public string System { get; set; } = "";
    public string Prompt { get; set; } = "";
    public string Output { get; set; } = "";
    public long InputTokens { get; set; }
    public long OutputTokens { get; set; }
    public long CacheReadTokens { get; set; }
    public long CacheWriteTokens { get; set; }
    public double CostUsd { get; set; }
    public bool UsedFallback { get; set; }
    public string? Error { get; set; }
}

/// <summary>
/// The log is the save game, the replay and the analysis data: the seed and config, every
/// decision any seat or character made (keyed, so replays are exact), and every model call.
/// </summary>
public sealed class GameLog
{
    private readonly object _gate = new();

    public LogHeader Header { get; set; } = new();
    public List<(string Key, string Json)> Decisions { get; } = new();
    public List<ModelCall> Calls { get; } = new();
    private readonly Dictionary<string, string> _index = new();
    /// <summary>
    /// The lines <see cref="ToJsonl"/> has written for the first decisions: a decision never changes once recorded, so
    /// each line is written once. The browser saves the whole log every season, and writing every line again each time
    /// grew slow on a phone as a game went on.
    /// </summary>
    private readonly StringBuilder _decisionLines = new();
    private int _decisionLinesWritten;

    public void Record<T>(string key, T value)
    {
        var json = JsonSerializer.Serialize(value, Json.Options);
        lock (_gate)
        {
            if (_index.ContainsKey(key)) return;
            _index[key] = json;
            Decisions.Add((key, json));
        }
    }

    public bool TryGet<T>(string key, out T value)
    {
        string? json;
        lock (_gate) _index.TryGetValue(key, out json);
        if (json is null)
        {
            value = default!;
            return false;
        }
        value = JsonSerializer.Deserialize<T>(json, Json.Options)!;
        return true;
    }

    public void AddCall(ModelCall call)
    {
        lock (_gate) Calls.Add(call);
    }

    public double TotalCost
    {
        get { lock (_gate) return Calls.Sum(c => c.CostUsd); }
    }

    public string ToJsonl()
    {
        var sb = new StringBuilder();
        var header = JsonSerializer.SerializeToNode(Header, Json.Options)!.AsObject();
        header["type"] = "header";
        sb.AppendLine(header.ToJsonString());
        lock (_gate)
        {
            if (_decisionLinesWritten > Decisions.Count) { _decisionLines.Clear(); _decisionLinesWritten = 0; }
            for (; _decisionLinesWritten < Decisions.Count; _decisionLinesWritten++)
            {
                var (key, json) = Decisions[_decisionLinesWritten];
                _decisionLines.AppendLine(new JsonObject { ["type"] = "decision", ["key"] = key, ["value"] = JsonNode.Parse(json) }.ToJsonString());
            }
            sb.Append(_decisionLines);
            foreach (var c in Calls)
            {
                var node = JsonSerializer.SerializeToNode(c, Json.Options)!.AsObject();
                node["type"] = "call";
                sb.AppendLine(node.ToJsonString());
            }
        }
        return sb.ToString();
    }

    public static GameLog FromJsonl(string text)
    {
        var log = new GameLog();
        foreach (var raw in text.Split('\n'))
        {
            var line = raw.Trim();
            if (line.Length == 0) continue;
            var node = JsonNode.Parse(line)!.AsObject();
            var type = node["type"]?.GetValue<string>();
            switch (type)
            {
                case "header":
                    log.Header = node.Deserialize<LogHeader>(Json.Options)!;
                    break;
                case "decision":
                    var key = node["key"]!.GetValue<string>();
                    var json = node["value"]?.ToJsonString() ?? "null";
                    log._index[key] = json;
                    log.Decisions.Add((key, json));
                    break;
                case "call":
                    log.Calls.Add(node.Deserialize<ModelCall>(Json.Options)!);
                    break;
            }
        }
        return log;
    }
}
