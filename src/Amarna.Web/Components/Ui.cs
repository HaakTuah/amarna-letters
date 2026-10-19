using System.Text.RegularExpressions;
using Amarna.Engine;

namespace Amarna.Web.Components;

public static partial class Ui
{
    public static string Color(Power? p) => p is { } x ? $"var(--{x.ToString().ToLowerInvariant()})" : "var(--neutral)";

    public static string Shekels(int s) => Money.Format(s);

    public static string Province(string id) => WorldMap.Default.Exists(id) ? WorldMap.Default[id].Name : id;

    public static string Name(this Power p) => p == Power.Babylonia ? "Babylonia" : p.Land();

    /// <summary>The one date label of the interface: the court's season and the year BCE with the turn, or the spectator's (<see cref="Calendar.Label"/>).</summary>
    public static string When(int turn, Power? court) => Calendar.Label(turn, court);

    /// <summary>The same, capitalised to open a sentence or a heading.</summary>
    public static string WhenCap(int turn, Power? court) => Cap(Calendar.Label(turn, court));

    public static string Cap(string s) => s.Length == 0 ? s : char.ToUpperInvariant(s[0]) + s[1..];

    /// <summary>
    /// Engine text with every "turn N" given its date label ("due back about turn 8" reads "due back about Peret,
    /// 1343 BCE (turn 8)"). "Season of turn N", as a spy's report dates what it saw, becomes the label alone, since
    /// the label names the season. For texts the engine writes for courts and characters, shown in the interface
    /// only; the texts themselves, which kings read, are unchanged.
    /// </summary>
    public static string Dated(string text, Power? court) =>
        string.IsNullOrEmpty(text) ? text : TurnNumber().Replace(text, m =>
        {
            var label = Calendar.Label(int.Parse(m.Groups["n"].Value), court);
            return char.IsUpper(m.Value[0]) ? Cap(label) : label;
        });

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

    [GeneratedRegex(@"\b(?:[Ss]eason of )?[Tt]urn (?<n>\d+)\b")]
    private static partial Regex TurnNumber();
}
