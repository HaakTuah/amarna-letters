namespace Amarna.Engine;

/// <summary>Display helpers. The engine counts in shekels and turns; people read minas and seasons.</summary>
public static class Calendar
{
    public const int SeasonsPerYear = 3;

    public static int Year(int turn) => (turn - 1) / SeasonsPerYear + 1;

    public static int SeasonIndex(int turn) => (turn - 1) % SeasonsPerYear;

    /// <summary>Each court reckons time in its own calendar; no power's calendar is everyone's reference.</summary>
    public static string Season(int turn, Power court)
    {
        var i = SeasonIndex(turn);
        var name = court == Power.Egypt
            ? i switch { 0 => "Akhet (inundation)", 1 => "Peret (growing)", _ => "Shemu (harvest)" }
            : i switch { 0 => "the first season", 1 => "the second season", _ => "the third season" };
        return $"{name}, year {Year(turn)}";
    }

    /// <summary>Neutral reckoning for the spectator.</summary>
    public static string Neutral(int turn) => $"Season {SeasonIndex(turn) + 1} of year {Year(turn)} (turn {turn})";

    // ---------------------------------------------------------------- the interface's date labels
    // One label for every date the web app shows (question 26 of the sleep-and-simulation round, plan steps 1-4): the
    // court's season and the year BCE, with the turn. Display only: no rule, view or prompt reads these, so kings are
    // never told the year BCE.

    /// <summary>The first year of every game, counted BCE; each later year is one less.</summary>
    public const int FirstYearBce = 1345;

    /// <summary>The year BCE of a turn: 1345 for turns 1-3, 1344 for turns 4-6, and so on.</summary>
    public static int YearBce(int turn) => FirstYearBce - (Year(turn) - 1);

    /// <summary>The season's short name in a court's reckoning: Egypt's own names, the other courts' ordinals; the spectator's number.</summary>
    public static string SeasonName(int turn, Power? court)
    {
        var i = SeasonIndex(turn);
        if (court is null) return $"season {i + 1}";
        if (court == Power.Egypt) return i switch { 0 => "Akhet", 1 => "Peret", _ => "Shemu" };
        return i switch { 0 => "the first season", 1 => "the second season", _ => "the third season" };
    }

    /// <summary>
    /// The date label: "Peret, 1343 BCE (turn 8)" at Egypt's court, "the second season, 1343 BCE (turn 8)" at the
    /// others, and for the spectator (no court) "season 2, 1343 BCE (turn 8)".
    /// </summary>
    public static string Label(int turn, Power? court = null) => $"{SeasonName(turn, court)}, {YearBce(turn)} BCE (turn {turn})";

    /// <summary>The short form for dense lists: "Peret 1343 BCE", "s2 1343 BCE". The turn goes in a tooltip (<see cref="Label"/>).</summary>
    public static string Short(int turn, Power? court = null) =>
        court == Power.Egypt ? $"{SeasonName(turn, court)} {YearBce(turn)} BCE" : $"s{SeasonIndex(turn) + 1} {YearBce(turn)} BCE";

    /// <summary>
    /// The ending line for the header: before the first season that may end the age, "The age cannot end before …";
    /// from it on, "Any season may now be the last (15% each season)".
    /// </summary>
    public static string Ending(int turn, int minTurns, double endChance, Power? court = null) => turn < minTurns
        ? $"The age cannot end before {Label(minTurns, court)}."
        : $"Any season may now be the last ({endChance * 100:0.#}% each season).";
}

public static class Money
{
    public const int ShekelsPerMina = 60;

    public static string Format(int shekels)
    {
        var sign = shekels < 0 ? "-" : "";
        shekels = Math.Abs(shekels);
        var minas = shekels / ShekelsPerMina;
        var rest = shekels % ShekelsPerMina;
        if (minas == 0) return $"{sign}{rest} shekels";
        var m = minas == 1 ? "1 mina" : $"{minas} minas";
        return rest == 0 ? sign + m : $"{sign}{m} {rest} shekels";
    }
}
