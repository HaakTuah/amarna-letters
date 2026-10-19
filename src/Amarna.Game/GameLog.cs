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
    /// <summary>
    /// For a file seat or file character: the length in characters of the request file it wrote (the last one, if it was
    /// retried), since such a call has no token counts. 0 for API calls, whose size is in the token counts.
    /// </summary>
    public int RequestChars { get; set; }
}

/// <summary>
/// One decision a model character made, beside what the script mind with the same traits decides in the same situation
/// (<see cref="Bots.ScriptMind"/>, which draws no dice of the game's own), for comparing the two. Logged only; nothing in
/// the game reads it, so a game plays and replays the same with or without it.
/// </summary>
public sealed class ShadowDecision
{
    /// <summary>The call's key ("t3/aud/present/c5"), as in the model call it goes with.</summary>
    public string Key { get; set; } = "";
    public int Turn { get; set; }
    /// <summary>present, react, report, pitch, spy or memory.</summary>
    public string Kind { get; set; } = "";
    public string Character { get; set; } = "";
    public string Name { get; set; } = "";
    /// <summary>Its traits, "loyalty/greed/competence/ambition/courage", with the court it favours if any.</summary>
    public string Traits { get; set; } = "";
    /// <summary>What it faced: gold carried, a gift or a post offered (the numbers the counts need).</summary>
    public int GoldCarried { get; set; }
    public int GiftOffered { get; set; }
    public int ServiceOffered { get; set; }
    /// <summary>What the engine knows happened that a report should not hide or contradict (<see cref="CharacterChecks.Known"/>).</summary>
    public List<string> Known { get; set; } = new();
    /// <summary>The model's decision; null when its reply failed and the script stood in (then <see cref="Error"/> says why).</summary>
    public CharacterChoice? Model { get; set; }
    public CharacterChoice Script { get; set; } = new();
    public string? Error { get; set; }
}

/// <summary>One character decision in a form both minds share, with what the checks found in its words.</summary>
public sealed class CharacterChoice
{
    /// <summary>The speech, report, pitch or summary.</summary>
    public string Text { get; set; } = "";
    /// <summary>Gold kept for itself (present and report).</summary>
    public int Kept { get; set; }
    public bool Swap { get; set; }
    public bool AcceptGift { get; set; }
    public bool AcceptService { get; set; }
    public string Commitments { get; set; } = "";
    /// <summary>The asking price of a pitch.</summary>
    public int Price { get; set; }
    /// <summary>For a spy's report: how many of its observations its words leave out.</summary>
    public int Dropped { get; set; }
    /// <summary>What <see cref="CharacterChecks"/> found its words hide or contradict ("hid-gift", "softened-threat", ...).</summary>
    public List<string> Flags { get; set; } = new();
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
    /// <summary>Model characters' decisions beside the script's for the same situations. Not used in replay.</summary>
    public List<ShadowDecision> Shadows { get; } = new();
    private readonly Dictionary<string, string> _index = new();

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

    public void AddShadow(ShadowDecision shadow)
    {
        lock (_gate) Shadows.Add(shadow);
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
            foreach (var (key, json) in Decisions)
                sb.AppendLine(new JsonObject { ["type"] = "decision", ["key"] = key, ["value"] = JsonNode.Parse(json) }.ToJsonString());
            foreach (var c in Calls)
            {
                var node = JsonSerializer.SerializeToNode(c, Json.Options)!.AsObject();
                node["type"] = "call";
                sb.AppendLine(node.ToJsonString());
            }
            // Ordered by key, so that two runs of a game write the same lines whatever order parallel calls finished in.
            foreach (var shadow in Shadows.OrderBy(x => x.Turn).ThenBy(x => x.Key, StringComparer.Ordinal))
            {
                var node = JsonSerializer.SerializeToNode(shadow, Json.Options)!.AsObject();
                node["type"] = "shadow";
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
                case "shadow":
                    log.Shadows.Add(node.Deserialize<ShadowDecision>(Json.Options)!);
                    break;
            }
        }
        return log;
    }
}
