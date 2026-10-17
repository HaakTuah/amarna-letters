using Amarna.Engine;
using Amarna.Game;
using Amarna.Llm;

namespace Amarna.Web.Services;

public sealed record BuiltSeats(Dictionary<Power, ISeat> Seats, ICharacterMind Minds, INarrator Narrator);

/// <summary>Turns setup choices into seats, character minds and a narrator. Model calls go from this browser with the player's key.</summary>
public sealed class SeatFactory
{
    public BuiltSeats Build(GameSettings settings, GameState state, string? apiKey, Func<GameLog> log)
    {
        var choices = new SeatChoices
        {
            Leaders = settings.Seats.ToDictionary(x => x.Key, x => x.Value switch
            {
                SeatKind.Human => LeaderKind.Human,
                SeatKind.Sonnet => LeaderKind.Sonnet,
                SeatKind.Opus => LeaderKind.Opus,
                _ => LeaderKind.Script,
            }),
            HaikuCharacters = settings.Minds == MindKind.Haiku,
            SonnetNarrator = settings.Narrator == NarratorKind.Sonnet,
            LeaderEffort = settings.LeaderEffort,
        };
        var set = settings.SimulateApi
            ? SeatSetup.Build(choices, state, "simulated", browser: true, log, new SimulatedAnthropic { ReportUsage = false })
            : SeatSetup.Build(choices, state, apiKey, browser: true, log);
        return new BuiltSeats(set.Seats, set.Minds, set.Narrator);
    }

    public GameSettings SettingsFromHeader(LogHeader header)
    {
        var s = new GameSettings { Seed = header.Seed, Chronicles = true, CustomsPrimer = header.Config.CustomsPrimer, SharedVictory = header.Config.SharedVictory, MessagesPerTurn = header.Config.MaxDispatchesPerTurn };
        foreach (var p in Powers.All)
        {
            var label = header.Seats.GetValueOrDefault(p) ?? "";
            s.Seats[p] = label switch
            {
                "Human" => SeatKind.Human,
                _ when label.Contains("Opus") => SeatKind.Opus,
                _ when label.Contains("Sonnet") => SeatKind.Sonnet,
                _ => SeatKind.Script,
            };
        }
        s.Minds = header.Minds.Contains("Haiku") ? MindKind.Haiku : MindKind.Script;
        s.Narrator = header.Narrator.Contains("Sonnet") ? NarratorKind.Sonnet : NarratorKind.Template;
        return s;
    }
}
