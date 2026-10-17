using System.Text;
using Amarna.Engine;

namespace Amarna.Game.Bots;

/// <summary>The offline narrator: template personas, plain check reports, and boastful annals.</summary>
public sealed class TemplateNarrator : INarrator
{
    public string Label => "Template narrator";

    public Task<string> PersonaAsync(Character c, CancellationToken ct) => Task.FromResult(Personas.Template(c));

    public Task<string> CheckReportAsync(CheckContext ctx, CancellationToken ct)
    {
        if (ctx.Facts.Count == 0)
            return Task.FromResult($"Your inquiries into {ctx.Subject.Name} turned up nothing of note. The markets know the name and little more.");
        return Task.FromResult($"Inquiries in the markets and temples tell this of {ctx.Subject.Name}: {string.Join(" ", ctx.Facts)} More than this, no one would say.");
    }

    public Task<string> ChronicleAsync(ChronicleContext ctx, CancellationToken ct)
    {
        var p = ctx.Power;
        var sb = new StringBuilder();
        sb.AppendLine($"The Annals of {p.King()}, Great King of {p.Land()}");
        sb.AppendLine();
        foreach (var year in ctx.Known.Where(e => e.Kind != "start").GroupBy(e => Calendar.Year(e.Turn)))
        {
            var lines = new List<string>();
            foreach (var e in year)
            {
                var line = Spin(p, e);
                if (line is not null && !lines.Contains(line)) lines.Add(line);
            }
            if (lines.Count == 0) continue;
            sb.AppendLine($"Year {year.Key}.");
            foreach (var l in lines.Take(6)) sb.AppendLine("  " + l);
        }
        var won = ctx.Winners.Contains(p.ToString());
        sb.AppendLine();
        sb.AppendLine(won
            ? $"Of all the kings of the world, none grew as His Majesty did. The gods of {p.Land()} are pleased."
            : $"Though lesser kings boasted, the land of {p.Land()} endured, beloved of its gods, and its king lacked nothing.");
        return Task.FromResult(sb.ToString());
    }

    private static string? Spin(Power p, GameEvent e)
    {
        var me = p.ToString();
        var t = e.Text;
        return e.Kind switch
        {
            "conquest" when t.StartsWith("The walls of") && t.EndsWith($"fell to {me}.") =>
                $"His Majesty broke the walls of {t["The walls of ".Length..t.IndexOf(" fell", StringComparison.Ordinal)]}, and its elders kissed his feet.",
            "conquest" when t.StartsWith(me) => $"His Majesty's armies {t[me.Length..].Trim().TrimEnd('.')}, and the enemies trembled.",
            "conquest" when t.Contains("from " + me) => "Cowardly foes crept into a border town while His Majesty's back was turned; the gods will repay them.",
            "conquest" => null,
            "purchase" when t.StartsWith(me) => $"A city came begging to be ruled by His Majesty, and he accepted its tribute: {t[me.Length..].Trim()}",
            "tablet" => "A king came seeking peace, and His Majesty in his mercy sealed a tablet with him before Shamash.",
            "catastrophe" => "The gods tested the land, and the piety of His Majesty restored it.",
            "battle" when t.StartsWith(me) => "A detachment fell gloriously, selling its life dearly.",
            "battle" => $"His Majesty's foes were cut down: {t}",
            "bribe" => "A foreign messenger was moved by His Majesty's generosity.",
            "detention" => "A presumptuous messenger was taught the patience due to a Great King.",
            "spy-caught" => "A spy was caught in the palace and learned the king's justice.",
            "forgery-detected" or "forgery-exposed" => "His Majesty's scribes saw through a false tablet.",
            "debasement-found" => "A foreign king was found to send false gold; His Majesty will remember it.",
            "fall" => $"{t} So perish those the gods abandon.",
            "end" => null,
            _ => null,
        };
    }
}
