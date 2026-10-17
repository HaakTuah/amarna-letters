using Amarna.Engine;
using Amarna.Game;
using Amarna.Game.Bots;

namespace Amarna.Llm;

public enum LeaderKind { Script, Human, Sonnet, Opus }

public sealed class SeatChoices
{
    public Dictionary<Power, LeaderKind> Leaders { get; set; } = Powers.All.ToDictionary(p => p, _ => LeaderKind.Script);
    public bool HaikuCharacters { get; set; }
    public bool SonnetNarrator { get; set; }
    public string LeaderEffort { get; set; } = "medium";

    public bool UsesModels => Leaders.Values.Any(v => v is LeaderKind.Sonnet or LeaderKind.Opus) || HaikuCharacters || SonnetNarrator;
}

public sealed record SeatSet(Dictionary<Power, ISeat> Seats, ICharacterMind Minds, INarrator Narrator);

/// <summary>Builds seats for a game. Model seats share one client, which logs every call into the game's log.</summary>
public static class SeatSetup
{
    public static SeatSet Build(SeatChoices choices, GameState state, string? apiKey, bool browser, Func<GameLog> log, HttpMessageHandler? handler = null)
    {
        ClaudeClient? client = null;
        if (choices.UsesModels)
        {
            if (string.IsNullOrWhiteSpace(apiKey)) throw new InvalidOperationException("Model seats need an Anthropic API key.");
            client = new ClaudeClient(apiKey.Trim(), call => log().AddCall(call), browser, handler);
        }

        var script = new ScriptLeader(state.Seed);
        var seats = new Dictionary<Power, ISeat>();
        foreach (var p in Powers.All)
        {
            seats[p] = choices.Leaders[p] switch
            {
                LeaderKind.Human => new HumanSeat(p),
                LeaderKind.Sonnet => new LlmLeaderSeat(p, client!, ModelIds.Sonnet, choices.LeaderEffort, state.Config.CustomsPrimer, state.Config),
                LeaderKind.Opus => new LlmLeaderSeat(p, client!, ModelIds.Opus, choices.LeaderEffort, state.Config.CustomsPrimer, state.Config),
                _ => script,
            };
        }
        ICharacterMind minds = choices.HaikuCharacters ? new LlmCharacterMind(client!) : new ScriptMind();
        INarrator narrator = choices.SonnetNarrator ? new LlmNarrator(client!) : new TemplateNarrator();
        return new SeatSet(seats, minds, narrator);
    }
}
