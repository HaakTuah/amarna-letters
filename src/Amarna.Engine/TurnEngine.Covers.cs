namespace Amarna.Engine;

/// <summary>
/// Covers: news of a court's people abroad reaches it only by rumour or when they return. A servant who is
/// caught, detained, goes over to the host or is put to death keeps appearing to its master as it was, and
/// the master keeps paying the wage it believes it owes, until word comes.
/// </summary>
public sealed partial class TurnEngine
{
    /// <summary>
    /// Freezes what <paramref name="master"/> sees of <paramref name="c"/> before something happens abroad
    /// that it cannot see. An existing cover is kept: the master still believes the older story.
    /// </summary>
    /// <param name="duty">The duty the master would see next in the normal course (an envoy whose audience ended is on the road home), or null for what it sees now.</param>
    /// <param name="seen">What the master saw, if taken before the event began to change the character.</param>
    private void CoverFor(Character c, Power master, Duty believed, string? duty = null, string? where = null, CharacterView? seen = null)
    {
        if (c.Cover is not null || !S.IsAlive(master)) return;
        seen ??= Views.Character(S, c, master);
        if (!seen.Ours) return;
        c.Cover = new Cover
        {
            For = master,
            Since = S.Turn,
            Believed = believed,
            HeldAt = seen.Status == "captured" ? c.HeldBy : null,
            DutyText = duty ?? seen.Duty,
            WhereText = where ?? seen.Where,
            Wage = seen.Wage ?? 0,
            ContractUntil = seen.ContractUntil,
            Facts = seen.KnownFacts.ToList(),
        };
    }

    /// <summary>A rumour about one of the receiving court's own people: the news it carries ends what the court believed.</summary>
    private void NewsArrives(Journey j)
    {
        if (S.FindCharacter(j.CharacterId) is not { Cover: { } cover } c || cover.For != j.To) return;
        // An envoy that went over to the host: its lord hears only that it has not returned, as for one detained.
        if (j.News == NewsKind.Overdue && c.Employer != j.To && c.Status != CharacterStatus.Dead)
        {
            cover.Believed = Duty.Detained;
            cover.DutyText = $"has not returned from {j.From}";
            cover.WhereText = "unknown";
            return;
        }
        c.Cover = null;
    }

    /// <summary>A servant who stands at its master's court again (home, or sent there by someone else) is seen as it is.</summary>
    private void CoversAtCourt()
    {
        foreach (var c in S.Characters.Where(c => c.Cover is { } k && c.At == k.For)) c.Cover = null;
    }

    /// <summary>The wage a court pays a character this season: what it believes it owes a covered servant, else its contract.</summary>
    private static int WageOwed(Character c, Power p) =>
        c.Cover is { } k && k.For == p ? (k.HeldAt is null ? k.Wage : 0)
        : c.Employer == p && c.Status == CharacterStatus.Employed ? c.Contract?.Wage ?? 0 : 0;
}
