using Amarna.Engine;
using Amarna.Game;
using Amarna.Game.Bots;

namespace Amarna.Llm;

/// <summary>
/// Who plays a king. <see cref="LocalAgent"/> is local play on a Claude subscription: a king answered by its own guarded
/// agent in a Claude Code session on this computer, through the local bridge (<see cref="LocalBridge"/>).
/// </summary>
public enum LeaderKind { Script, Human, Haiku, Sonnet, Opus, LocalAgent }
public enum CharacterKind { Script, Haiku, Sonnet }
public enum NarratorKind { Template, Haiku, Sonnet, Opus }

/// <summary>Who plays what: each king's seat, the envoys and spies, and the narrator.</summary>
public sealed class SeatChoices
{
    public Dictionary<Power, LeaderKind> Leaders { get; set; } = Powers.All.ToDictionary(p => p, _ => LeaderKind.Script);
    public CharacterKind Characters { get; set; } = CharacterKind.Script;
    public NarratorKind Narrator { get; set; } = NarratorKind.Template;
    public string LeaderEffort { get; set; } = "medium";

    /// <summary>Local play: where the local bridge listens.</summary>
    public string BridgeAddress { get; set; } = LocalBridge.DefaultAddress;

    /// <summary>Local play: how long one decision waits for a king's agent before the script king stands in for it.</summary>
    public int LocalAgentMinutes { get; set; } = 60;

    /// <summary>Local agent kings are not model calls from this program: they need the local bridge, not a key, and cost nothing here.</summary>
    public bool UsesModels =>
        Leaders.Values.Any(v => ModelFor(v) is not null) || Characters != CharacterKind.Script || Narrator != NarratorKind.Template;

    public bool UsesLocalAgents => Leaders.Values.Any(v => v == LeaderKind.LocalAgent);

    public SeatChoices Copy() => new()
    {
        Leaders = Leaders.ToDictionary(x => x.Key, x => x.Value),
        Characters = Characters,
        Narrator = Narrator,
        LeaderEffort = LeaderEffort,
        BridgeAddress = BridgeAddress,
        LocalAgentMinutes = LocalAgentMinutes,
    };

    public static string? ModelFor(LeaderKind k) => k switch
    {
        LeaderKind.Haiku => ModelIds.Haiku,
        LeaderKind.Sonnet => ModelIds.Sonnet,
        LeaderKind.Opus => ModelIds.Opus,
        _ => null,
    };

    public static string? ModelFor(CharacterKind k) => k switch
    {
        CharacterKind.Haiku => ModelIds.Haiku,
        CharacterKind.Sonnet => ModelIds.Sonnet,
        _ => null,
    };

    public static string? ModelFor(NarratorKind k) => k switch
    {
        NarratorKind.Haiku => ModelIds.Haiku,
        NarratorKind.Sonnet => ModelIds.Sonnet,
        NarratorKind.Opus => ModelIds.Opus,
        _ => null,
    };
}

/// <summary>A named way to play. Human seats chosen by the player are kept when a preset is applied.</summary>
public sealed record Preset(string Id, string Name, string Tagline, LeaderKind Leaders, CharacterKind Characters, NarratorKind Narrator)
{
    public bool NeedsKey => SeatChoices.ModelFor(Leaders) is not null || Characters != CharacterKind.Script || Narrator != NarratorKind.Template;

    public void ApplyTo(SeatChoices c)
    {
        foreach (var p in Powers.All)
            if (c.Leaders[p] != LeaderKind.Human) c.Leaders[p] = Leaders;
        c.Characters = Characters;
        c.Narrator = Narrator;
    }

    public bool Matches(SeatChoices c) =>
        c.Leaders.Values.Where(v => v != LeaderKind.Human).All(v => v == Leaders) && c.Characters == Characters && c.Narrator == Narrator;
}

public static class Presets
{
    public static readonly Preset Free = new("free", "Free",
        "Script kings, envoys and narrator. No key and no cost; a whole game takes seconds.",
        LeaderKind.Script, CharacterKind.Script, NarratorKind.Template);

    public static readonly Preset Budget = new("budget", "Budget",
        "Every role on Haiku 5.5. Cheap enough to play often; the kings plan less shrewdly.",
        LeaderKind.Haiku, CharacterKind.Haiku, NarratorKind.Haiku);

    public static readonly Preset Standard = new("standard", "Standard",
        "The design document's table: Sonnet 5.5 kings and narrator, Haiku 5.5 envoys and spies.",
        LeaderKind.Sonnet, CharacterKind.Haiku, NarratorKind.Sonnet);

    public static readonly Preset Showcase = new("showcase", "Showcase",
        "Opus 5.5 kings and narrator for the sharpest diplomacy. Envoys stay on Haiku 5.5: fallible messengers are part of the design.",
        LeaderKind.Opus, CharacterKind.Haiku, NarratorKind.Opus);

    public static readonly IReadOnlyList<Preset> All = [Free, Budget, Standard, Showcase];

    /// <summary>
    /// Local play on a Claude subscription. Not in <see cref="All"/>: the web app offers it only when it runs on this
    /// computer, since it needs the local bridge.
    /// </summary>
    public static readonly Preset Local = new("local", "Local agents",
        "Kings played by Claude agents in a Claude Code session on this computer, on your Claude subscription. Needs the local bridge; envoys and narrator are scripts.",
        LeaderKind.LocalAgent, CharacterKind.Script, NarratorKind.Template);

    public static Preset? Find(string? id) => All.FirstOrDefault(p => p.Id == id);

    public static Preset? Matching(SeatChoices c) => All.FirstOrDefault(p => p.Matches(c));
}

/// <summary>
/// A rough cost for a typical game, from average token counts per call. Real spend varies with
/// how much the models think and write; the in-game meter shows the actual figure.
/// </summary>
public static class CostEstimate
{
    public const int TypicalSeasons = 20;

    public static double PerGame(SeatChoices c, int seasons = TypicalSeasons)
    {
        var effort = c.LeaderEffort switch { "low" => 0.6, "high" => 1.6, _ => 1.0 };
        var total = 0.0;
        foreach (var kind in c.Leaders.Values)
        {
            if (SeatChoices.ModelFor(kind) is not { } model) continue;
            var price = Price.For(model);
            // Orders: the rulebook is read from cache, the season's situation is fresh.
            var orders = price.Cost(input: 5000, output: (long)(3000 * effort), cacheRead: 5000, cacheWrite: 0);
            // About one audience a season, at lower effort.
            var audiences = 1.2 * price.Cost(input: 3500, output: (long)(1000 * effort), cacheRead: 5000, cacheWrite: 0);
            total += seasons * (orders + audiences);
        }
        if (SeatChoices.ModelFor(c.Characters) is { } cm)
            total += seasons * 15 * Price.For(cm).Cost(1500, 400, 0, 0);
        if (SeatChoices.ModelFor(c.Narrator) is { } nm)
        {
            var p = Price.For(nm);
            total += 18 * p.Cost(600, 400, 0, 0) + 7 * p.Cost(3000, 1200, 0, 0) + 5 * p.Cost(300, 200, 0, 0);
        }
        return total;
    }

    /// <summary>"about $9", "under $1", "free".</summary>
    public static string Describe(double dollars) => dollars switch
    {
        <= 0 => "free",
        < 1 => "under $1",
        < 10 => $"about ${Math.Round(dollars, 0):0}",
        _ => $"about ${Math.Round(dollars / 5) * 5:0}",
    };

    /// <summary>A spending cap with room for a long game: half again the estimate, at least $1.</summary>
    public static double SuggestedBudget(double dollars) => dollars <= 0 ? 0 : Math.Max(1, Math.Ceiling(dollars * 1.5));
}

public sealed record SeatSet(Dictionary<Power, ISeat> Seats, ICharacterMind Minds, INarrator Narrator);

/// <summary>Builds seats for a game. Model seats share one client, which logs every call into the game's log.</summary>
public static class SeatSetup
{
    /// <summary>A local agent king's label, in the log header and wherever seats are listed.</summary>
    public const string LocalAgentLabel = "Local agent";

    public static SeatSet Build(SeatChoices choices, GameState state, string? apiKey, bool browser, Func<GameLog> log, HttpMessageHandler? handler = null,
        HttpMessageHandler? bridgeHandler = null)
    {
        ClaudeClient? client = null;
        if (choices.UsesModels)
        {
            if (string.IsNullOrWhiteSpace(apiKey)) throw new InvalidOperationException("Model seats need an Anthropic API key.");
            client = new ClaudeClient(apiKey.Trim(), call => log().AddCall(call), browser, handler);
        }
        // Local play: every local agent king goes through the one bridge, as a file seat whose files the bridge writes.
        var bridge = choices.UsesLocalAgents
            ? new LocalBridge(choices.BridgeAddress, TimeSpan.FromMinutes(Math.Clamp(choices.LocalAgentMinutes, 1, 24 * 60)), bridgeHandler)
            : null;

        var script = new ScriptLeader(state.Seed);
        var seats = new Dictionary<Power, ISeat>();
        foreach (var p in Powers.All)
        {
            var kind = choices.Leaders[p];
            seats[p] = kind switch
            {
                LeaderKind.Human => new HumanSeat(p),
                LeaderKind.LocalAgent => new LlmLeaderSeat(p, new BridgeExchange(bridge!, p, call => log().AddCall(call)), BridgeExchange.Model,
                    choices.LeaderEffort, state.Config.CustomsPrimer, state.Config, label: LocalAgentLabel),
                _ when SeatChoices.ModelFor(kind) is { } model => new LlmLeaderSeat(p, client!, model, choices.LeaderEffort, state.Config.CustomsPrimer, state.Config),
                _ => script,
            };
        }
        // Model characters' decisions are logged beside the script's for the same situations (the log's shadow lines).
        ICharacterMind minds = SeatChoices.ModelFor(choices.Characters) is { } cm
            ? new LlmCharacterMind(client!, cm) { Shadow = s => log().AddShadow(s) }
            : new ScriptMind();
        INarrator narrator = SeatChoices.ModelFor(choices.Narrator) is { } nm ? new LlmNarrator(client!, nm) : new TemplateNarrator();
        return new SeatSet(seats, minds, narrator);
    }

    /// <summary>Reads seat choices back from a log header's labels, to continue a saved game.</summary>
    public static SeatChoices FromHeader(LogHeader header)
    {
        static LeaderKind Leader(string label) => label switch
        {
            "Human" => LeaderKind.Human,
            LocalAgentLabel => LeaderKind.LocalAgent,
            _ when label.Contains("Opus") => LeaderKind.Opus,
            _ when label.Contains("Sonnet") => LeaderKind.Sonnet,
            _ when label.Contains("Haiku") => LeaderKind.Haiku,
            _ => LeaderKind.Script,
        };
        return new SeatChoices
        {
            Leaders = Powers.All.ToDictionary(p => p, p => Leader(header.Seats.GetValueOrDefault(p) ?? "")),
            Characters = header.Minds.Contains("Sonnet") ? CharacterKind.Sonnet : header.Minds.Contains("Haiku") ? CharacterKind.Haiku : CharacterKind.Script,
            Narrator = header.Narrator.Contains("Opus") ? NarratorKind.Opus : header.Narrator.Contains("Sonnet") ? NarratorKind.Sonnet
                : header.Narrator.Contains("Haiku") ? NarratorKind.Haiku : NarratorKind.Template,
        };
    }
}
