using System.Text.RegularExpressions;
using Amarna.Engine;

namespace Amarna.Web.Components;

public static partial class Ui
{
    public static string Color(Power? p) => p is { } x ? $"var(--{x.ToString().ToLowerInvariant()})" : "var(--neutral)";

    public static string Shekels(int s) => Money.Format(s);

    public static string Province(string id) => WorldMap.Default.Exists(id) ? WorldMap.Default[id].Name : id;

    public static string Name(this Power p) => p == Power.Babylonia ? "Babylonia" : p.Land();

    /// <summary>An order in words, with people and places by name rather than id.</summary>
    public static string Describe(Order o, SeatView v)
    {
        var names = v.Court.Concat(v.Known).GroupBy(c => c.Id).ToDictionary(g => g.Key, g => g.First().Name);
        var text = o.Describe();
        text = Ids().Replace(text, m => names.GetValueOrDefault(m.Value) ?? m.Value);
        return Words().Replace(text, m => WorldMap.Default.Exists(m.Value) ? WorldMap.Default[m.Value].Name : m.Value);
    }

    [GeneratedRegex(@"\bc\d+\b")]
    private static partial Regex Ids();

    [GeneratedRegex(@"\b[a-z]+\b")]
    private static partial Regex Words();
}
