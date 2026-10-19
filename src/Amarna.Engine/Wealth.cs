namespace Amarna.Engine;

/// <summary>One character's wealth at a moment: the gold in its purse and the back pay kings still owe it.</summary>
public sealed record CharacterWealth(Character Character, int Purse, int BackPay)
{
    public int Total => Purse + BackPay;
}

/// <summary>
/// The richest characters: at the end of a game, beside the kings' standings, the living characters ranked by wealth,
/// the second game played under the kings', in which greedy characters have a victory of their own. During play a
/// character knows its own wealth, never the ranking.
/// </summary>
public static class Wealth
{
    /// <summary>What counts, said wherever the ranking is shown.</summary>
    public const string WhatCounts =
        "Wealth is the gold in a character's purse and the back pay kings still owe it; hoards and loans to kings on debt tablets do not exist yet. The dead are not ranked.";

    /// <summary>A character's wealth: its purse and the back pay owed it by every court (a fallen court's debt died with it).</summary>
    public static CharacterWealth Of(Character c) => new(c, c.Purse, c.BackPay.Values.Sum());

    /// <summary>The living characters, richest first (ties by id).</summary>
    public static IReadOnlyList<CharacterWealth> Ranking(GameState s) =>
        s.Characters.Where(c => c.Status != CharacterStatus.Dead).Select(Of)
            .OrderByDescending(w => w.Total).ThenBy(w => TurnEngine.IdNumber(w.Character.Id)).ToList();

    /// <summary>Who a character is at the end, in a few words: whom it serves, or that it is free or held.</summary>
    public static string Standing(Character c) => c.Status switch
    {
        CharacterStatus.Captured when c.HeldBy is { } jailer => $"captive in {jailer}" + (c.Employer is { } e ? $", serving {e}" : ""),
        _ when c.Employer is { } lord => $"serving {lord}",
        _ => "free",
    };

    /// <summary>Where its gold came from, in one line ("wages 120, skimmed 10, gifts 40").</summary>
    public static string Sources(Earnings e)
    {
        var parts = new List<string>();
        if (e.Wages > 0) parts.Add($"wages {e.Wages}");
        if (e.Skimmed > 0) parts.Add($"skimmed {e.Skimmed}");
        if (e.Gifts > 0) parts.Add($"gifts {e.Gifts}");
        if (e.Carried > 0) parts.Add($"gold kept on dismissal {e.Carried}");
        return parts.Count == 0 ? "nothing gained" : string.Join(", ", parts);
    }

    /// <summary>One character's line in a ranking: "Mane of Ugarit (serving Egypt): 312 (purse 280, back pay owed 32; wages 250, skimmed 30)".</summary>
    public static string Line(CharacterWealth w) =>
        $"{w.Character.Name} of {w.Character.Origin} ({Standing(w.Character)}): {w.Total} (purse {w.Purse}, back pay owed {w.BackPay}; {Sources(w.Character.Earned)})";
}
