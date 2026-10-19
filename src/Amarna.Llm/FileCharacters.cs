using Amarna.Engine;
using Amarna.Game;

namespace Amarna.Llm;

/// <summary>
/// File characters: envoys, spies and candidates answered through files, one folder per character, as file seats are for
/// kings. Each request is the exact text a model character would get (<see cref="LlmCharacterMind"/>) with the file-seat
/// footer; a missing or invalid reply falls back to the script character, and every reply is logged, so a game replays
/// exactly without the files. A character left out of the map is played by the script.
/// </summary>
public static class FileCharacters
{
    public const string Label = "File characters";

    /// <param name="folders">Character id to its folder.</param>
    /// <param name="shadow">Where each decision goes beside the script's for the same situation (the log's shadow lines).</param>
    public static LlmCharacterMind Mind(IReadOnlyDictionary<string, string> folders, TimeSpan timeout, Action<ModelCall>? record,
        Action<ShadowDecision>? shadow = null, Action<string>? say = null)
    {
        var exchanges = folders.ToDictionary(x => x.Key, x => new FileExchange(x.Value, timeout, record, say, FileExchange.Character));
        return new LlmCharacterMind(c => exchanges.GetValueOrDefault(c.Id), "file", Label) { Shadow = shadow };
    }

    /// <summary>
    /// The characters of a seed's game. The pool is drawn when the game is made and never grows, so these are every
    /// character that can ever be hired, sent as an envoy or posted as a spy in it.
    /// </summary>
    public static IReadOnlyList<Character> Of(ulong seed, GameConfig? config = null) => GameFactory.NewGame(seed, config).Characters;

    /// <summary>How a character starts the game, without its traits or secrets: "serves Egypt" or "free, at Hatti".</summary>
    public static string StartsAs(Character c) => c.Employer is { } e ? $"serves {e}" : c.At is { } at ? $"free, at {at}" : "free";
}
