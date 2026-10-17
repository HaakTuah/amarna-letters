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
