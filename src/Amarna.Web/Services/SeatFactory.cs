using Amarna.Engine;
using Amarna.Game;
using Amarna.Game.Bots;

namespace Amarna.Web.Services;

public sealed record BuiltSeats(Dictionary<Power, ISeat> Seats, ICharacterMind Minds, INarrator Narrator);

/// <summary>Turns setup choices into seats, character minds and a narrator.</summary>
public sealed class SeatFactory
{
    public BuiltSeats Build(GameSettings settings, ulong seed, string? apiKey)
    {
        var script = new ScriptLeader(seed);
        var seats = new Dictionary<Power, ISeat>();
        foreach (var p in Powers.All)
        {
            seats[p] = settings.Seats[p] switch
            {
                SeatKind.Human => new HumanSeat(p),
                _ => script,
            };
        }
        return new BuiltSeats(seats, new ScriptMind(), new TemplateNarrator());
    }

    public GameSettings SettingsFromHeader(LogHeader header)
    {
        var s = new GameSettings { Seed = header.Seed, Chronicles = true, CustomsPrimer = header.Config.CustomsPrimer, SharedVictory = header.Config.SharedVictory };
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
