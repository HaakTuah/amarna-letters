using System.Text.RegularExpressions;

namespace Amarna.Engine;

/// <summary>
/// Archives: every tablet a court holds lies in its archive at its capital. A spy posted at a court copies from that
/// archive, and the copies go home with its report; whoever comes to hold a court's capital gains a copy of every tablet
/// in its archive. Nothing is taken away: the court keeps its own copies.
/// </summary>
public sealed partial class TurnEngine
{
    /// <summary>The title of the notice a court reads when it has taken another court's capital, and with it its archive.</summary>
    public const string ArchiveTakenTitle = "An archive taken";

    /// <summary>The tablets in a court's archive: one for each tablet it holds a copy of, in the order the copies came.</summary>
    public IEnumerable<Tablet> Archive(Power court) =>
        S.Copies.Where(k => k.Holder == court).Select(k => k.TabletId).Distinct()
            .Select(id => S.Tablets.FirstOrDefault(t => t.Id == id)).OfType<Tablet>();

    /// <summary>
    /// What a spy posted at <paramref name="court"/> copies from its archive this season for <paramref name="master"/>: with a
    /// chance of its skill, one tablet its master does not hold and has not already been sent, sealed agreements first,
    /// the newest first. Its own random stream, so nothing else the spy sees or risks changes.
    /// </summary>
    private List<string> CopyFromArchive(Character spy, Power court, Power master)
    {
        var rng = R("archive", spy.Id);
        if (!rng.Chance(spy.Traits.Competence / 100.0)) return [];
        var held = S.Copies.Where(k => k.Holder == master).Select(k => k.TabletId).ToHashSet();
        // Copies already on the road home in an earlier report are not made twice.
        var sent = S.Journeys.Where(j => j.Kind == JourneyKind.SpyReport && j.To == master && j.Report is not null)
            .SelectMany(j => j.Report!.TabletIds).ToHashSet();
        var pick = Archive(court).Where(t => !held.Contains(t.Id) && !sent.Contains(t.Id))
            .OrderByDescending(t => t.Seals.Count >= 2).ThenByDescending(t => t.SealedTurn ?? t.CreatedTurn).ThenByDescending(t => IdNumber(t.Id))
            .FirstOrDefault();
        if (pick is null) return [];
        spy.Remember(S.Turn, $"I copied a tablet from the archive of {court.Land()}, sealed by {string.Join(" and ", pick.Seals)}: \"{Greeting.Cap(pick.Text, 200)}\"");
        return [pick.Id];
    }

    /// <summary>
    /// A spy's report reaches home with the copies it made: each tablet its master does not hold by now goes into the
    /// master's archive. Returns the new copies.
    /// </summary>
    private List<string> ArchiveCopiesArrive(Journey j, Character spy)
    {
        if (j.Report is not { TabletIds.Count: > 0 } report || !S.IsAlive(j.To)) return [];
        var court = report.Court!.Value;
        var held = S.Copies.Where(k => k.Holder == j.To).Select(k => k.TabletId).ToHashSet();
        var made = new List<string>();
        foreach (var tid in report.TabletIds.Where(id => S.Tablets.Any(t => t.Id == id) && held.Add(id)))
        {
            var copy = new TabletCopy { Id = S.NewId("k"), TabletId = tid, Holder = j.To, AcquiredTurn = S.Turn, Source = $"copied from the archive of {court} by your spy {spy.Name}" };
            S.Copies.Add(copy);
            made.Add(copy.Id);
        }
        if (made.Count > 0)
            S.Log("archive-copied", $"{spy.Name}, a spy of {j.To}, brought home copies of {made.Count} tablet(s) from the archive of {court}.", [j.To], "archive-copied");
        return made;
    }

    /// <summary>
    /// The power that now holds a province that is a court's capital (taken by its troops, or ceded to it) gains a copy of
    /// every tablet in that court's archive it does not hold already. The court keeps its own.
    /// </summary>
    private void TakeArchive(Power taker, string province)
    {
        var prov = Map[province];
        if (!prov.Capital || prov.Home is not { } court || court == taker) return;
        var held = S.Copies.Where(k => k.Holder == taker).Select(k => k.TabletId).ToHashSet();
        var taken = new List<TabletCopy>();
        foreach (var t in Archive(court).ToList().Where(t => held.Add(t.Id)))
        {
            var copy = new TabletCopy { Id = S.NewId("k"), TabletId = t.Id, Holder = taker, AcquiredTurn = S.Turn, Source = $"taken with the archive of {court} at {prov.Name}" };
            S.Copies.Add(copy);
            taken.Add(copy);
        }
        S.Notify(taker, InboxKind.Notice, ArchiveTakenTitle, taken.Count == 0
            ? $"With {prov.Name} you took the archive of {court}; it held no tablet you did not hold already."
            : $"With {prov.Name} you took the archive of {court}: copies of {taken.Count} tablet{(taken.Count == 1 ? "" : "s")} you did not hold are now in your archive: {string.Join(", ", taken.Select(CopyLine))}.");
        S.Log("archive-taken", $"{taker} took the archive of {court} with {prov.Name} ({taken.Count} tablet(s) new to it).", [taker], "archive-taken");
    }

    /// <summary>
    /// A copy as a court reads it in a notice: the tablet as every court names it (its seals and date), then the court's own
    /// mark for its copy. The text is in the archive the court reads.
    /// </summary>
    private string CopyLine(TabletCopy copy)
    {
        var t = S.Tablets.First(x => x.Id == copy.TabletId);
        return $"{Views.TabletName(t, Archive(copy.Holder))} (your copy {copy.Id})";
    }

    private static readonly Regex CopyMark = new(@"\b(?:(?:the\s+)?(?:tablet|copy)\s+)?(?<id>k\d+)\b", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);
    private static readonly Regex NamedPerson = new(@"(?<name>[\p{L}][\p{L}-]*)\s*\((?<id>c\d+)\)", RegexOptions.CultureInvariant);
    private static readonly Regex PersonMark = new(@"\b(?<id>c\d+)\b", RegexOptions.CultureInvariant);

    /// <summary>
    /// What a court's scribes write down for another court to read (its letters, mandates and tablets, its words at an
    /// audience): each mark of the writer's own for a copy in its archive ("k8"), which another court numbers differently or
    /// not at all, becomes the tablet as every court names it ("the tablet sealed by Babylonia and Mitanni, dated turn 2"),
    /// and the id of each person the writer knows (its view lists them: <see cref="Views.Knows"/>) becomes the person's name.
    /// Any other text is left as written: an id the writer does not know stays an id, so that what it reads back of its own
    /// letters (and what the envoy and the host read) never names someone it has not met (since the review of the fix pass
    /// after item 4).
    /// </summary>
    public string Scribe(Power writer, string? text)
    {
        Character? Known(string id) => S.FindCharacter(id) is { } c && Views.Knows(c, writer) ? c : null;
        if (string.IsNullOrEmpty(text)) return text ?? "";
        var archive = Archive(writer).ToList();
        var written = CopyMark.Replace(text, m =>
        {
            var id = m.Groups["id"].Value.ToLowerInvariant();
            var copy = S.Copies.FirstOrDefault(k => k.Holder == writer && k.Id == id);
            if (copy is null || S.Tablets.FirstOrDefault(t => t.Id == copy.TabletId) is not { } tablet) return m.Value;
            var name = Views.TabletName(tablet, archive);
            return char.IsUpper(m.Value[0]) ? char.ToUpperInvariant(name[0]) + name[1..] : name;
        });
        // "Mane (c12)" is Mane; a bare "c12" is the person's name.
        written = NamedPerson.Replace(written, m => Known(m.Groups["id"].Value) is { } c && c.Name == m.Groups["name"].Value ? c.Name : m.Value);
        return PersonMark.Replace(written, m => Known(m.Groups["id"].Value)?.Name ?? m.Value);
    }

    /// <summary>The line the engine adds to a spy's report for the copies that came home with it.</summary>
    private string CopiesLine(Character spy, Power court, IEnumerable<string> copyIds) =>
        $"[With this report came copies {spy.Name} made in the archive of {court}, now in your archive: {string.Join(", ", copyIds.Select(id => CopyLine(S.Copies.First(k => k.Id == id))))}.]";
}
