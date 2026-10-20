namespace Amarna.Engine;

/// <summary>
/// The letter formula between Great Kings. The engine renders the standard greeting from sender
/// and recipient; a leader may deviate on purpose (omit it, put its own name first, withhold
/// "brother" or "Great King"). Because the greeting travels sealed, the envoy cannot alter it.
/// </summary>
public static class Greeting
{
    public static string Render(Power from, Power to, GreetingOptions? options)
    {
        var o = options ?? new GreetingOptions();
        if (!string.IsNullOrWhiteSpace(o.Custom)) return Cap(o.Custom.Trim(), 400);
        if (o.Omit) return "";

        var recipient = Name(to, o.GrantGreatKing) + (o.CallBrother ? ", my brother" : "");
        var sender = Name(from, o.ClaimGreatKing) + (o.CallBrother ? ", your brother" : "");
        var address = o.SenderFirst
            ? $"Thus says {sender}: say to {recipient}."
            : $"Say to {recipient}: thus says {sender}.";
        var wellbeing = o.CallBrother
            ? "All goes well with me. May all go well with you, your household, your wives, your sons, your chariots, your horses and your country."
            : "All goes well with me. May all go well with you.";
        return $"{address} {wellbeing}";
    }

    private static string Name(Power p, bool greatKing)
    {
        if (p == Power.Alashiya) return greatKing ? "the Great King of Alashiya" : "the king of Alashiya";
        return greatKing ? $"{p.King()}, Great King, king of {p.Land()}" : $"{p.King()}, king of {p.Land()}";
    }

    public static string Cap(string s, int max) => s.Length <= max ? s : s[..max].TrimEnd() + "…";

    /// <summary>
    /// A text ending a sentence: with a full stop added unless it already ends with one (or "!", "?" or "…"), so that a
    /// mandate written with its own full stop is not remembered with two ("Promise no land..", until the follow-up's review
    /// of the fix pass after item 4).
    /// </summary>
    public static string Stopped(string s)
    {
        var t = s.TrimEnd();
        return t.Length > 0 && ".!?…".Contains(t[^1]) ? t : t + ".";
    }

    /// <summary>Plain-language list of how a greeting departs from the standard formula.</summary>
    public static List<string> Deviations(GreetingOptions? options)
    {
        var o = options ?? new GreetingOptions();
        var list = new List<string>();
        if (!string.IsNullOrWhiteSpace(o.Custom)) { list.Add("a greeting of their own wording"); return list; }
        if (o.Omit) { list.Add("no greeting at all"); return list; }
        if (o.SenderFirst) list.Add("the sender's name first");
        if (!o.CallBrother) list.Add("no \"brother\"");
        if (!o.ClaimGreatKing) list.Add("the sender does not claim to be a Great King");
        if (!o.GrantGreatKing) list.Add("the recipient is not called Great King");
        return list;
    }
}
