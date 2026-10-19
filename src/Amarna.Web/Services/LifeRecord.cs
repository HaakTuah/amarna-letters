using Amarna.Engine;
using Amarna.Web.Components;

namespace Amarna.Web.Services;

/// <summary>One dated line of a life: when it began, when it ended (if it did), and what it was.</summary>
public sealed record LifeEntry(int From, int? Until, string Text, string? Province = null);

/// <summary>A part of a life (its service, its journeys, its missions): a heading and its dated lines.</summary>
public sealed record LifeSection(string Title, IReadOnlyList<LifeEntry> Entries, string? Note = null);

/// <summary>
/// One person's life read from the record, as the current view may know it: the first form of a legends mode. It is
/// built from sections so that roles and lives added later (generals, governors, outlaws, a past before the game) can
/// add sections of their own; nothing here is invented, every line comes from what the engine recorded.
/// </summary>
public sealed class LifeRecord
{
    public string Id { get; init; } = "";
    public string Name { get; init; } = "";
    public string Subtitle { get; init; } = "";
    public string Now { get; init; } = "";
    public Power? Employer { get; init; }
    public IReadOnlyList<LifeSection> Sections { get; init; } = [];
    /// <summary>False when the view knows nothing of this person.</summary>
    public bool Known { get; init; }

    /// <param name="index">The season shown (snapshot index); nothing later is read.</param>
    /// <param name="sceneAt">The map's scene of a season for the same viewer (cached by the session).</param>
    /// <param name="state">The state at that season (for messages, memory and facts).</param>
    public static LifeRecord Build(SeasonFrames frames, Func<int, MapScene> sceneAt, int index, GameState state, Power? viewer, string id)
    {
        var c = state.FindCharacter(id);
        if (c is null) return new LifeRecord { Id = id, Name = "Unknown", Known = false };
        CharacterView? seen = null;
        if (viewer is { } p)
        {
            var view = Views.For(state, p);
            seen = view.Court.Concat(view.Known).FirstOrDefault(x => x.Id == id);
            if (seen is null)
                return new LifeRecord { Id = id, Name = c.Name, Subtitle = $"of {c.Origin}", Known = false, Now = $"{p.Name()} knows nothing of {c.Name} at this season." };
        }

        var sections = new List<LifeSection>();
        var last = Math.Min(index, frames.Count - 1);

        // Service: whom it served, season by season, as far as the view can tell.
        var service = new List<LifeEntry>();
        string? current = null;
        var start = 0;
        for (var j = 0; j <= last; j++)
        {
            if (!frames[j].People.TryGetValue(id, out var fp)) continue;
            var text = viewer is { } v ? ServiceAsSeen(fp, v) : ServiceTrue(fp);
            if (text != current)
            {
                if (current is not null) service.Add(new LifeEntry(start + 1, j, current));
                current = text;
                start = j;
            }
        }
        if (current is not null) service.Add(new LifeEntry(start + 1, null, current));
        service.RemoveAll(e => e.Text.Length == 0);
        if (service.Count > 0) sections.Add(new LifeSection(viewer is null ? "Service" : "In your service, as you know it", service));

        // Places: where it stood or travelled, merged while unchanged.
        var places = new List<LifeEntry>();
        string? where = null;
        string? whereProv = null;
        start = 0;
        for (var j = 0; j <= last; j++)
        {
            var scene = sceneAt(j);
            var t = scene.Travellers.FirstOrDefault(x => x.CharacterId == id && x.Kind != TravellerKind.Gold);
            var s = scene.People.FirstOrDefault(x => x.Id == id);
            string? text = t is not null ? $"on the road from {Ui.Province(t.FromProvince)} to {Ui.Province(t.ToProvince)}{(t.Believed ? " (as you believe)" : "")}"
                : s is not null ? Place(s)
                : frames[j].People.TryGetValue(id, out var fp) && fp.At is { } at && (viewer is null || fp.Employer == viewer && fp.CoverOf(viewer.Value) is null && at == viewer)
                    ? fp.Status == CharacterStatus.Dead ? null : $"at the court of {at.Name()}"
                : null;
            var prov = t?.ToProvince ?? s?.Province;
            if (text != where)
            {
                if (where is not null) places.Add(new LifeEntry(start + 1, j, where, whereProv));
                where = text;
                whereProv = prov;
                start = j;
            }
        }
        if (where is not null) places.Add(new LifeEntry(start + 1, null, where, whereProv));
        if (places.Count > 0) sections.Add(new LifeSection("Where they have been", places, "Positions on the road are a guess: the engine keeps only when a journey began and ends."));

        // Missions: the message trail, as much of it as the view may read.
        var missions = new List<LifeEntry>();
        foreach (var t in state.Trails.Where(t => t.EnvoyId == id).OrderBy(t => t.Turn))
        {
            // A court reads its own envoys' messages, and those of envoys who have stood before it; not one still on its way.
            if (viewer is { } v && t.From != v && (t.To != v || t.AudienceTurn is null)) continue;
            var lines = new List<string> { $"Sent by {t.From.Name()} to {t.To.Name()}" + (t.AudienceTurn is int a ? $"; heard in {Ui.When(a, viewer)}" : "; not yet heard")
                + (t.ReportTurn is int r && (viewer is null || viewer == t.From) ? $"; reported home in {Ui.When(r, viewer)}" : "") + "." };
            if (viewer is null || viewer == t.From)
            {
                lines.Add($"{(viewer is null ? "The king wrote" : "You wrote")}: {Greeting.Cap(t.LeaderLetter, 400)}");
                if (t.GoldStated > 0) lines.Add($"Gold: {Ui.Shekels(t.GoldStated)} by the inventory.");
            }
            if ((viewer is null || viewer == t.To) && t.AudienceTurn is not null)
            {
                if (t.Delivered.Length > 0) lines.Add($"Said at the court of {t.To.Name()}: {Greeting.Cap(t.Delivered, 400)}");
                foreach (var x in t.Exchanges.Take(3))
                    if (x.Envoy.Length > 0) lines.Add($"Answered: {Greeting.Cap(x.Envoy, 240)}");
            }
            if ((viewer is null || viewer == t.From) && t.ReportTurn is not null && t.Report.Length > 0)
                lines.Add($"Reported home: {Greeting.Cap(t.Report, 400)}");
            if (viewer is null && t.Outcomes.Count > 0) lines.Add($"What happened: {string.Join("; ", t.Outcomes)}.");
            missions.Add(new LifeEntry(t.Turn, t.ReportTurn, string.Join("\n", lines), WorldMap.Default.Capital(t.To).Id));
        }
        if (missions.Count > 0) sections.Add(new LifeSection("Missions, and what was said", missions));

        // What the record holds of them: the truth in god view, the facts a court has learnt otherwise.
        if (viewer is null)
        {
            var facts = c.Facts.Select(f => new LifeEntry(0, null, $"{f.Text} ({f.Secrecy.ToString().ToLowerInvariant()}{(f.KnownBy.Count > 0 ? $"; known to {string.Join(", ", f.KnownBy)}" : "")})")).ToList();
            facts.Insert(0, new LifeEntry(0, null, $"Loyalty {c.Traits.Loyalty}, greed {c.Traits.Greed}, competence {c.Traits.Competence}, ambition {c.Traits.Ambition}, courage {c.Traits.Courage}"
                + (c.Traits.Sympathy is { } sym ? $", sympathy for {sym.Name()} ({c.Traits.SympathyStrength})" : "") + (c.SecretMaster is { } sm ? $"; secretly serves {sm.Name()}" : "") + "."));
            sections.Add(new LifeSection("Hidden traits and facts", facts));
            var memory = c.Memory.Where(m => m.Turn <= index + 1).Select(m => new LifeEntry(m.Turn, null, m.Text)).ToList();
            if (c.MemorySummary.Length > 0) memory.Insert(0, new LifeEntry(0, null, "Older memories: " + c.MemorySummary));
            if (memory.Count > 0) sections.Add(new LifeSection("Their own memory", memory));
        }
        else if (seen is { KnownFacts.Count: > 0 })
            sections.Add(new LifeSection("What you know of them", seen.KnownFacts.Select(f => new LifeEntry(0, null, f)).ToList()));

        var now = viewer is null ? Fate(c) : Ui.Cap(string.Join(" · ", new[] { seen!.Status, Ui.Dated(seen.Duty, viewer), seen.Where, Ui.Dated(seen.Timing, viewer), Ui.Dated(seen.Term, viewer) }.Where(x => x.Length > 0)));
        return new LifeRecord
        {
            Id = id,
            Name = c.Name,
            Subtitle = viewer is null ? $"of {c.Origin}, {c.Calling}" : $"of {c.Origin}",
            Now = now,
            Employer = viewer is null ? c.Employer : seen!.Employer,
            Sections = sections,
            Known = true,
        };
    }

    private static string Place(ScenePerson s) => s.Kind switch
    {
        PersonKind.Envoy => $"envoy at the court of {Court(s.Province)}",
        PersonKind.Spy => $"spy at {Ui.Province(s.Province)}",
        PersonKind.Captive => $"held at {Ui.Province(s.Province)}",
        _ => $"not returned from {Court(s.Province)}",
    } + (s.Believed ? " (as last heard)" : "");

    private static string Court(string province) =>
        WorldMap.Default[province] is { Capital: true, Home: { } home } ? home.Name() : Ui.Province(province);

    private static string ServiceTrue(FramePerson p) => p.Status switch
    {
        CharacterStatus.Dead => "dead",
        CharacterStatus.Captured => $"captive of {p.HeldBy?.Name() ?? "a court"}{(p.Employer is { } e ? $", still {e.Name()}'s" : "")}",
        CharacterStatus.Free => p.At is { } at ? $"free, at the court of {at.Name()}" : "free",
        _ => p.Employer is { } emp ? $"serving {emp.Name()}{(p.SecretMaster is { } sm ? $" (secretly {sm.Name()})" : "")}" : "employed",
    };

    private static string ServiceAsSeen(FramePerson p, Power v)
    {
        if (p.CoverOf(v) is not null) return $"serving you (as you believe)";
        if (p.Employer == v && p.Status is CharacterStatus.Employed or CharacterStatus.Captured) return p.Status == CharacterStatus.Captured ? "serving you, held captive abroad" : "serving you";
        if (p.Employer == v && p.Status == CharacterStatus.Dead) return "died in your service";
        return "";
    }

    private static string Fate(Character c) => c.Status switch
    {
        CharacterStatus.Dead => "Dead.",
        CharacterStatus.Captured => $"Held captive by {c.HeldBy?.Name()}.",
        CharacterStatus.Free => c.At is { } at ? $"Free, at the court of {at.Name()}." : "Free.",
        _ => $"Serving {c.Employer?.Name()}: {Views.DutyText(c)}.",
    };
}
