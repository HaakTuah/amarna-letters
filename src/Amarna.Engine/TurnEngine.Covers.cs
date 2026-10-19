namespace Amarna.Engine;

/// <summary>
/// Covers: news of a court's people abroad reaches it only by rumour or when they return. A servant who is
/// caught, detained, goes over to the host, is put to death or is let go keeps appearing to its master as it
/// was, its back pay growing in the master's books by the wage it believes it owes, until word comes. Nobody away
/// is paid until it is back, so the treasury betrays nothing either way. Each court that served the
/// character keeps its own cover: an envoy that went over to a host is covered for its old master, and again for
/// its new one if something happens to it on the new master's errand.
/// </summary>
public sealed partial class TurnEngine
{
    /// <summary>
    /// Freezes what <paramref name="master"/> sees of <paramref name="c"/> before something happens abroad
    /// that it cannot see. An existing cover for that master is kept: it still believes the older story.
    /// </summary>
    /// <param name="duty">The duty the master would see next in the normal course (an envoy whose audience ended is on the road home), or null for what it sees now.</param>
    /// <param name="seen">What the master saw, if taken before the event began to change the character.</param>
    /// <param name="factIds">The facts the master knew, if taken before the event added any.</param>
    /// <param name="timing">With <paramref name="duty"/>: when the master would see it set out and due back in the normal course.</param>
    private void CoverFor(Character c, Power master, Duty believed, string? duty = null, string? where = null, CharacterView? seen = null, List<string>? factIds = null, string? timing = null)
    {
        if (c.CoverOf(master) is not null || !S.IsAlive(master)) return;
        seen ??= Views.Character(S, c, master);
        if (!seen.Ours) return;
        c.Covers.Add(new Cover
        {
            For = master,
            Since = S.Turn,
            Believed = believed,
            HeldAt = seen.Status == "captured" ? c.HeldBy : null,
            DutyText = duty ?? seen.Duty,
            WhereText = where ?? seen.Where,
            TimingText = timing ?? (duty is null ? seen.Timing : ""),
            Wage = seen.Wage ?? c.Contract?.Wage ?? 0,
            // From here its back pay grows in the master's books by the wage it believes it owes, whatever really befell it.
            BackPay = c.BackPay.GetValueOrDefault(master),
            ContractUntil = seen.ContractUntil,
            NoticePrice = seen.NoticePrice,
            LeavesTurn = seen.LeavesTurn,
            FactIds = factIds ?? c.FactsKnownTo(master).Select(f => f.Id).ToList(),
        });
    }

    /// <summary>A rumour about one of the receiving court's own people: the news it carries ends what the court believed.</summary>
    private void NewsArrives(Journey j)
    {
        if (S.FindCharacter(j.CharacterId) is not { } c || c.CoverOf(j.To) is not { } cover) return;
        // Word that the servant has not returned: unless it is held in the court's service as the word says, the
        // court now believes just that (an envoy that went over to the host, a captive, one let go late, one dead).
        if (j.News == NewsKind.Overdue && !(c.Employer == j.To && c.Status == CharacterStatus.Employed && c.Duty == Duty.Detained))
        {
            cover.Believed = Duty.Detained;
            cover.HeldAt = null;
            cover.DutyText = $"has not returned from {(cover.Recalled && c.MissionTarget is null && c.WatchProvince is { } wp ? wp : j.From.ToString())}";
            cover.WhereText = "unknown";
            cover.TimingText = "";
            return;
        }
        c.Covers.Remove(cover);
    }

    /// <summary>
    /// A servant who stands at a court that held a cover for it (home, or sent there by someone else) is seen there
    /// as it is; word that it has not returned, if still on the road, is not sent.
    /// </summary>
    private void CoversAtCourt()
    {
        foreach (var c in S.Characters)
        {
            if (c.At is not { } at || c.CoverOf(at) is not { } cover) continue;
            c.Covers.Remove(cover);
            S.Journeys.RemoveAll(j => j.Kind == JourneyKind.Rumor && j.News == NewsKind.Overdue && j.CharacterId == c.Id && j.To == at);
        }
    }

    /// <summary>
    /// The wage a court owes a character each season, as it reckons it: what it believes it owes a covered servant, else
    /// its contract, a captive's included. Paid at court; built up as back pay while the character is away.
    /// </summary>
    private static int WageOf(Character c, Power p) =>
        c.CoverOf(p) is { } k ? k.Wage
        : c.Employer == p && c.Status is CharacterStatus.Employed or CharacterStatus.Captured ? c.Contract?.Wage ?? 0 : 0;
}
