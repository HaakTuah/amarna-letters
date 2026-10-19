using System.Text.RegularExpressions;
using Amarna.Engine;
using Amarna.Web.Components;
using Amarna.Web.Components.Map;

namespace Amarna.Web.Services;

public enum MoveStyle { Move, Attack, Bounce, Support, SupportCut, Convoy }

public enum TravellerKind { Envoy, Spy, Gold }

public enum PersonKind { Envoy, Spy, Captive, Missing }

/// <summary>A unit on the board. A ghost is one the court saw there <see cref="Age"/> seasons ago and cannot see now.</summary>
public sealed record SceneUnit(string Key, Power Power, UnitKind Kind, string Province, int Count, bool Ghost, int Age, int SeenAt);

/// <summary>One order of the season just resolved, as it is drawn.</summary>
public sealed record SceneMove(Power Power, UnitKind Kind, string From, string To, MoveStyle Style, string Text);

/// <summary>Someone, or gold, on the road between two places, at a season's guessed position along the way.</summary>
public sealed record SceneTraveller(string Key, TravellerKind Kind, Power Owner, string FromProvince, string ToProvince, double Progress,
    int Depart, int Arrive, string? CharacterId, string Title, int Gold, bool Believed, Power Destination);

/// <summary>Someone standing somewhere: an envoy at a foreign court, a spy at its post, a captive, or one whose court has lost track of it.</summary>
public sealed record ScenePerson(string Id, PersonKind Kind, Power? Owner, string Province, string Title, bool Believed, bool Double);

/// <summary>A rumour or a spy's report a court has received, placed where it came from: uncertain by nature, and fading with age.</summary>
public sealed record SceneNews(string Province, InboxKind Kind, int Age, string Title, string Body, int Observed);

/// <summary>How a province changed hands, as far as the viewer can tell.</summary>
public enum CaptureHow
{
    /// <summary>The new owner's troops marched in, and the viewer saw them.</summary>
    Taken,
    /// <summary>No troops of the new owner marched in (a cession, a purchase, a gift of troops), and the viewer can tell.</summary>
    Passed,
    /// <summary>A court that saw no march in and was party to neither side: it knows only who holds it now.</summary>
    Unseen,
}

/// <summary>A province that changed hands in the season just resolved. Who holds it is public; how it changed hands is not.</summary>
public sealed record SceneCapture(string Province, Power? From, Power? To, CaptureHow How)
{
    /// <summary>"taken by Hatti from Arzawa", "passed to Hatti from Arzawa", or "now held by Hatti, no longer by Arzawa".</summary>
    public string Line => How switch
    {
        CaptureHow.Taken => $"taken by {Holder}{(From is { } f ? $" from {f.Name()}" : "")}",
        CaptureHow.Passed => $"passed to {Holder}{(From is { } f ? $" from {f.Name()}" : "")}",
        _ => $"now held by {Holder}{(From is { } f ? $", no longer by {f.Name()}" : "")}",
    };

    private string Holder => To?.Name() ?? "nobody";
}

/// <summary>
/// What the map draws for one season through one pair of eyes: the god view's truth, or exactly what a court can see,
/// believe and remember. Built from the frames only (the court's own earlier sights, its own people as it believes
/// them, the news that reached it), never from anything it could not know.
/// </summary>
public sealed class MapScene
{
    public int Index { get; init; }
    public Power? Viewer { get; init; }
    public SeasonFrame Frame { get; init; } = null!;
    /// <summary>Seat view: seasons since each province was last in sight (0 = in sight now); absent = never seen.</summary>
    public IReadOnlyDictionary<string, int> FogAge { get; init; } = new Dictionary<string, int>();
    public IReadOnlyList<SceneUnit> Units { get; init; } = [];
    public IReadOnlyList<SceneMove> Moves { get; init; } = [];
    public IReadOnlyList<SceneUnit> Destroyed { get; init; } = [];
    public IReadOnlyList<SceneCapture> Captures { get; init; } = [];
    public IReadOnlyList<SceneTraveller> Travellers { get; init; } = [];
    public IReadOnlyList<ScenePerson> People { get; init; } = [];
    public IReadOnlyList<SceneNews> News { get; init; } = [];

    /// <summary>A stamp for components that redraw only when what they show changes.</summary>
    public string Stamp => $"{Index}:{Viewer}";

    private static readonly WorldMap Map = WorldMap.Default;

    public static MapScene Build(SeasonFrames frames, int index, Power? viewer)
    {
        var f = frames[index];
        index = f.Index;
        var prev = index > 0 ? frames[index - 1] : null;
        var units = new List<SceneUnit>();
        var fog = new Dictionary<string, int>();

        if (viewer is not { } p)
        {
            units.AddRange(Stack(f.Units, false, 0, index));
        }
        else
        {
            // Each court's memory of the board: where it last saw each province, and what stood there then.
            var lastSeen = new Dictionary<string, int>();
            var seenUnits = new Dictionary<string, List<FrameUnit>>();
            for (var j = 0; j <= index; j++)
            {
                var fj = frames[j];
                var sight = fj.Sight.GetValueOrDefault(p);
                if (sight is null) continue;
                foreach (var prov in sight)
                {
                    lastSeen[prov] = j;
                    seenUnits[prov] = fj.Units.Where(u => u.Province == prov).ToList();
                }
            }
            foreach (var (prov, j) in lastSeen) fog[prov] = index - j;
            var now = f.Sight.GetValueOrDefault(p) ?? new HashSet<string>();
            units.AddRange(Stack(f.Units.Where(u => u.Power == p || now.Contains(u.Province)), false, 0, index));
            foreach (var (prov, list) in seenUnits)
            {
                if (now.Contains(prov) || list.Count == 0) continue;
                var age = index - lastSeen[prov];
                units.AddRange(Stack(list.Where(u => u.Power != p), true, age, lastSeen[prov]));
            }
        }

        // The orders the viewer saw resolve: every one in god view, a court's own and those it could see in a seat view.
        IReadOnlyList<FrameMove> seen = viewer is { } q ? (f.SeenBy.GetValueOrDefault(q) ?? []).Select(i => f.Moves[i]).ToList() : f.Moves;
        var (moves, destroyed) = MovesOf(f, prev, seen, viewer is { } r ? prev?.Sight.GetValueOrDefault(r) ?? new HashSet<string>() : null);
        var captures = new List<SceneCapture>();
        if (prev is not null)
            foreach (var prov in Map.LandProvinces)
            {
                var was = prev.OwnerOf(prov.Id);
                var now = f.OwnerOf(prov.Id);
                if (was == now) continue;
                // Taken by arms only if the viewer saw the new owner march in. A court on either side would have seen it
                // (its own moves, or a march into its own land), so for it no march seen means none; any other court
                // that saw none knows only who holds the province now.
                var taken = now is { } n && seen.Any(m => m.IsMove && m.Succeeded && m.Target == prov.Id && m.Power == n);
                var how = taken ? CaptureHow.Taken : viewer is null || viewer == was || viewer == now ? CaptureHow.Passed : CaptureHow.Unseen;
                captures.Add(new SceneCapture(prov.Id, was, now, how));
            }

        var (travellers, people) = viewer is null ? GodPeople(f) : SeatPeople(f, viewer.Value);
        var news = viewer is { } v ? NewsOf(frames, index, v) : [];

        return new MapScene
        {
            Index = index,
            Viewer = viewer,
            Frame = f,
            FogAge = fog,
            Units = units,
            Moves = moves,
            Destroyed = destroyed,
            Captures = captures,
            Travellers = travellers,
            People = people,
            News = news,
        };
    }

    private static IEnumerable<SceneUnit> Stack(IEnumerable<FrameUnit> units, bool ghost, int age, int seenAt) =>
        units.GroupBy(u => (u.Province, u.Power, u.Kind)).Select(g =>
            new SceneUnit(ghost ? $"g:{g.Key.Province}:{g.Key.Power}:{g.Key.Kind}" : $"u:{g.First().Id}", g.Key.Power, g.Key.Kind, g.Key.Province, g.Count(), ghost, age, seenAt));

    /// <param name="seen">The orders the viewer saw resolve.</param>
    /// <param name="sight">A court's sight as the season began (null in god view): it can tell a march was an attack on
    /// troops only if it saw them standing there.</param>
    private static (List<SceneMove>, List<SceneUnit>) MovesOf(SeasonFrame f, SeasonFrame? prev, IReadOnlyList<FrameMove> seen, IReadOnlySet<string>? sight)
    {
        var moves = new List<SceneMove>();
        var destroyed = new List<SceneUnit>();
        if (prev is null) return (moves, destroyed);
        foreach (var m in seen)
        {
            if (m.Destroyed)
                destroyed.Add(new SceneUnit($"x:{m.Power}:{m.From}", m.Power, m.Kind, m.From, 1, false, 0, f.Index));
            switch (m.Order)
            {
                case "move" when m.Target is { } t:
                {
                    // Foreign troops in the way: standing there as the season began (in the court's sight) and not
                    // marched out of it this season. Troops that left make the march a plain move.
                    var foreignUnit = (sight is null || sight.Contains(t)) && prev.Units.Any(u => u.Province == t && u.Power != m.Power
                        && !seen.Any(x => x.IsMove && x.Succeeded && x.From == t && x.Power == u.Power && x.Kind == u.Kind));
                    var foreignLand = m.TargetOwner is { } o && o != m.Power;
                    var walls = m.TargetOwner is null && prev.Garrisons.Contains(t);
                    var attack = foreignUnit || foreignLand || walls;
                    var style = !m.Succeeded ? MoveStyle.Bounce : attack ? MoveStyle.Attack : MoveStyle.Move;
                    var verb = m.Succeeded ? attack ? "attacked and took" : "moved to" : "was stopped short of";
                    moves.Add(new SceneMove(m.Power, m.Kind, m.From, t, style,
                        $"{m.Power.Name()}'s {Kind(m.Kind)} in {Ui.Province(m.From)} {verb} {Ui.Province(t)}{(attack && !m.Succeeded ? " (an attack)" : "")}"));
                    break;
                }
                case "support" when m.Target is { } t:
                    moves.Add(new SceneMove(m.Power, m.Kind, m.From, m.To ?? t, m.Succeeded ? MoveStyle.Support : MoveStyle.SupportCut,
                        $"{m.Power.Name()}'s {Kind(m.Kind)} in {Ui.Province(m.From)} {(m.Succeeded ? "supported" : "tried to support")} "
                        + $"{(m.Helped is { } h && h != m.Power ? h.Name() + "'s" : "its own")} unit in {Ui.Province(t)}{(m.To is { } into ? $" into {Ui.Province(into)}" : " holding")}{(m.Succeeded ? "" : " (cut or void)")}"));
                    break;
                case "convoy" when m.To is { } to:
                    moves.Add(new SceneMove(m.Power, m.Kind, m.From, to, MoveStyle.Convoy,
                        $"{m.Power.Name()}'s fleet in {Ui.Province(m.From)} convoyed the army in {Ui.Province(m.Target ?? to)} to {Ui.Province(to)}"));
                    break;
            }
        }
        return (moves, destroyed);
    }

    public static string Kind(UnitKind k) => k == UnitKind.Army ? "army" : "fleet";

    private static string Cap(Power p) => Map.Capital(p).Id;

    /// <summary>The fraction of the way a traveller has come by the season after this frame, kept off both ends.</summary>
    private static double Progress(int now, int depart, int arrive) =>
        arrive <= depart ? 0.5 : Math.Clamp((now - depart - 0.5) / (arrive - depart), 0.12, 0.88);

    private static (List<SceneTraveller>, List<ScenePerson>) GodPeople(SeasonFrame f)
    {
        var travellers = new List<SceneTraveller>();
        var people = new List<ScenePerson>();
        var now = f.Index + 1;
        foreach (var j in f.Journeys)
        {
            var c = j.CharacterId is { } id ? f.People.GetValueOrDefault(id) : null;
            switch (j.Kind)
            {
                case JourneyKind.EnvoyOutbound:
                    travellers.Add(new SceneTraveller(j.Id, TravellerKind.Envoy, j.From, Cap(j.From), Cap(j.To), Progress(now, j.Depart, j.Arrive), j.Depart, j.Arrive,
                        j.CharacterId, $"{c?.Name ?? "An envoy"}, envoy of {j.From.Name()} to {j.To.Name()}", j.Gold, false, j.To));
                    break;
                case JourneyKind.EnvoyHomebound:
                    travellers.Add(new SceneTraveller(j.Id, TravellerKind.Envoy, j.To, Cap(j.From), Cap(j.To), Progress(now, j.Depart, j.Arrive), j.Depart, j.Arrive,
                        j.CharacterId, $"{c?.Name ?? "An envoy"}, on the road home to {j.To.Name()} from {j.From.Name()}", j.Gold, false, j.To));
                    break;
                case JourneyKind.SpyOutbound:
                    var post = c?.Mission is { } court ? Cap(court) : c?.Watch ?? Cap(j.To);
                    travellers.Add(new SceneTraveller(j.Id, TravellerKind.Spy, j.From, Cap(j.From), post, Progress(now, j.Depart, j.Arrive), j.Depart, j.Arrive,
                        j.CharacterId, $"{c?.Name ?? "A spy"}, a spy of {j.From.Name()} on the way to {(c?.Mission is { } m ? m.Name() : Ui.Province(post))}", 0, false, c?.Mission ?? j.From));
                    break;
                case JourneyKind.SpyHomebound:
                    var from = c?.Watch is { } w && c.Mission is null ? w : Cap(j.From);
                    travellers.Add(new SceneTraveller(j.Id, TravellerKind.Spy, j.To, from, Cap(j.To), Progress(now, j.Depart, j.Arrive), j.Depart, j.Arrive,
                        j.CharacterId, $"{c?.Name ?? "A spy"}, on the road home to {j.To.Name()}", 0, false, j.To));
                    break;
                case JourneyKind.Ransom:
                    travellers.Add(new SceneTraveller(j.Id, TravellerKind.Gold, j.From, Cap(j.From), Cap(j.To), Progress(now, j.Depart, j.Arrive), j.Depart, j.Arrive,
                        j.CharacterId, $"A ransom of {Ui.Shekels(j.Gold)} from {j.From.Name()} to {j.To.Name()}{(c is null ? "" : $" for {c.Name}")}", j.Gold, false, j.To));
                    break;
            }
        }
        foreach (var c in f.People.Values)
        {
            var dbl = c.SecretMaster is not null;
            if (c.Status == CharacterStatus.Captured && c.HeldBy is { } jailer)
                people.Add(new ScenePerson(c.Id, PersonKind.Captive, c.Employer, Cap(jailer), $"{c.Name}, {(c.Employer is { } e ? e.Name() + "'s" : "a")} servant held captive by {jailer.Name()}", false, dbl));
            else if (c.Status != CharacterStatus.Employed || c.Employer is not { } emp) continue;
            else if (c.Duty == Duty.Detained && c.HeldBy is { } holder)
                people.Add(new ScenePerson(c.Id, PersonKind.Captive, emp, Cap(holder), $"{c.Name}, envoy of {emp.Name()}, detained by {holder.Name()}", false, dbl));
            else if (c.Duty == Duty.EnvoyAtCourt && c.At is { } at)
                people.Add(new ScenePerson(c.Id, PersonKind.Envoy, emp, Cap(at), $"{c.Name}, envoy of {emp.Name()} at the court of {at.Name()}", false, dbl));
            else if (c.Duty == Duty.SpyPosted)
            {
                var place = c.At is { } court ? Cap(court) : c.Watch;
                if (place is not null)
                    people.Add(new ScenePerson(c.Id, PersonKind.Spy, emp, place, $"{c.Name}, a spy of {emp.Name()} watching {(c.At is { } ca ? ca.Name() : Ui.Province(place))}", false, dbl));
            }
        }
        return (travellers, people);
    }

    private static readonly Regex AtCourt = new(@"at the court of (\w+)", RegexOptions.Compiled);
    private static readonly Regex InProvince = new(@"^in (\w+)$", RegexOptions.Compiled);
    private static readonly Regex SetOut = new(@"set out in turn (\d+) for (\w+)", RegexOptions.Compiled);
    private static readonly Regex DueThere = new(@"due there about turn (\d+)", RegexOptions.Compiled);
    private static readonly Regex DueBack = new(@"due back about turn (\d+)", RegexOptions.Compiled);

    private static string? PlaceOf(string where) =>
        AtCourt.Match(where) is { Success: true } m && Powers.TryParse(m.Groups[1].Value, out var court) ? Cap(court)
        : InProvince.Match(where) is { Success: true } n && Map.Exists(n.Groups[1].Value) ? n.Groups[1].Value
        : null;

    /// <summary>
    /// A court's own people where it believes them (its cover of one whose fate it has not heard, else the truth, which it
    /// then knows), and foreign people only while they stand at its own court in its sight: envoys received there and
    /// anyone it holds. Foreign spies it has not caught are never shown.
    /// </summary>
    private static (List<SceneTraveller>, List<ScenePerson>) SeatPeople(SeasonFrame f, Power p)
    {
        var travellers = new List<SceneTraveller>();
        var people = new List<ScenePerson>();
        var now = f.Index + 1;
        var home = Cap(p);
        foreach (var c in f.People.Values)
        {
            if (c.CoverOf(p) is { } cover)
            {
                if (cover.HeldAt is { } heldAt)
                {
                    people.Add(new ScenePerson(c.Id, PersonKind.Captive, p, Cap(heldAt), $"{c.Name}, your servant, held captive by {heldAt.Name()} (as you last heard)", true, false));
                    continue;
                }
                switch (cover.Believed)
                {
                    case Duty.SpyPosted when PlaceOf(cover.WhereText) is { } post:
                        people.Add(new ScenePerson(c.Id, PersonKind.Spy, p, post, $"{c.Name}, your spy, at their post as far as you know", true, false));
                        break;
                    case Duty.EnvoyAtCourt when PlaceOf(cover.WhereText) is { } court:
                        people.Add(new ScenePerson(c.Id, PersonKind.Envoy, p, court, $"{c.Name}, your envoy, at that court as far as you know", true, false));
                        break;
                    case Duty.EnvoyHomebound when DueBack.Match(cover.TimingText) is { Success: true } due:
                    {
                        var arrive = int.Parse(due.Groups[1].Value);
                        var from = SetOut.Match(cover.TimingText) is { Success: true } so && Powers.TryParse(so.Groups[2].Value, out var abroad) ? Cap(abroad)
                            : c.Mission is { } m ? Cap(m) : c.Watch ?? home;
                        var depart = arrive - TurnEngine.TravelTurns(new GameConfig(), Map, from, home);
                        travellers.Add(new SceneTraveller($"b:{c.Id}", c.Calling.Contains("spy", StringComparison.OrdinalIgnoreCase) || cover.WhereText.StartsWith("in ") ? TravellerKind.Spy : TravellerKind.Envoy,
                            p, from, home, Progress(now, depart, arrive), depart, arrive, c.Id, $"{c.Name}, on the road home as far as you know", 0, true, p));
                        break;
                    }
                    case Duty.EnvoyOutbound when SetOut.Match(cover.TimingText) is { Success: true } so && DueThere.Match(cover.TimingText) is { Success: true } dt
                                                 && Powers.TryParse(so.Groups[2].Value, out var dest):
                    {
                        var depart = int.Parse(so.Groups[1].Value);
                        var arrive = int.Parse(dt.Groups[1].Value);
                        travellers.Add(new SceneTraveller($"b:{c.Id}", TravellerKind.Envoy, p, home, Cap(dest), Progress(now, depart, arrive), depart, arrive, c.Id,
                            $"{c.Name}, your envoy to {dest.Name()}, as far as you know", 0, true, dest));
                        break;
                    }
                    case Duty.Detained when c.Mission is { } lost:
                        people.Add(new ScenePerson(c.Id, PersonKind.Missing, p, Cap(lost), $"{c.Name}, your envoy, has not returned from {lost.Name()}", true, false));
                        break;
                }
                continue;
            }

            if (c.Employer == p && c.Status is CharacterStatus.Employed or CharacterStatus.Captured)
            {
                if (c.Status == CharacterStatus.Captured && c.HeldBy is { } jailer)
                {
                    people.Add(new ScenePerson(c.Id, PersonKind.Captive, p, Cap(jailer), $"{c.Name}, your servant, held captive by {jailer.Name()}", false, false));
                    continue;
                }
                switch (c.Duty)
                {
                    case Duty.EnvoyOutbound or Duty.EnvoyHomebound or Duty.SpyOutbound:
                        var j = f.Journeys.FirstOrDefault(x => x.CharacterId == c.Id && x.Kind is JourneyKind.EnvoyOutbound or JourneyKind.EnvoyHomebound or JourneyKind.SpyOutbound or JourneyKind.SpyHomebound);
                        if (j is null) break;
                        var spy = j.Kind is JourneyKind.SpyOutbound or JourneyKind.SpyHomebound;
                        var outbound = j.Kind is JourneyKind.EnvoyOutbound or JourneyKind.SpyOutbound;
                        var from = outbound ? home : j.Kind == JourneyKind.SpyHomebound && c.Mission is null && c.Watch is { } w ? w : Cap(j.From);
                        var to = !outbound ? home : spy ? c.Mission is { } m ? Cap(m) : c.Watch ?? Cap(j.To) : Cap(j.To);
                        var dest = outbound ? spy ? c.Mission ?? p : j.To : p;
                        travellers.Add(new SceneTraveller(j.Id, spy ? TravellerKind.Spy : TravellerKind.Envoy, p, from, to, Progress(now, j.Depart, j.Arrive), j.Depart, j.Arrive, c.Id,
                            $"{c.Name}, your {(spy ? "spy" : "envoy")}, {(outbound ? $"on the way to {(spy && c.Mission is null ? Ui.Province(to) : dest.Name())}" : "on the road home")}",
                            outbound && !spy ? j.Gold : 0, false, dest));
                        break;
                    case Duty.EnvoyAtCourt when c.At is { } at:
                        people.Add(new ScenePerson(c.Id, PersonKind.Envoy, p, Cap(at), $"{c.Name}, your envoy at the court of {at.Name()}", false, false));
                        break;
                    case Duty.SpyPosted:
                        var place = c.At is { } court ? Cap(court) : c.Watch;
                        if (place is not null) people.Add(new ScenePerson(c.Id, PersonKind.Spy, p, place, $"{c.Name}, your spy watching {(c.At is { } ca ? ca.Name() : Ui.Province(place))}", false, false));
                        break;
                    case Duty.Detained when c.Mission is { } lost:
                        people.Add(new ScenePerson(c.Id, PersonKind.Missing, p, Cap(lost), $"{c.Name}, your envoy, has not returned from {lost.Name()}", false, false));
                        break;
                }
                continue;
            }

            // Foreign people the court can see: envoys before it, and anyone it holds (a caught spy marked with the master
            // it confessed to, if it did; a held envoy with the king who sent it).
            if (c.HeldBy == p && c.Status is CharacterStatus.Captured or CharacterStatus.Employed or CharacterStatus.Free)
                people.Add(new ScenePerson(c.Id, PersonKind.Captive, c.Status == CharacterStatus.Captured ? c.Confessed : c.Employer, home, $"{c.Name}, held at your court", false, false));
            else if (c.Status == CharacterStatus.Employed && c.Duty == Duty.EnvoyAtCourt && c.At == p && c.Employer is { } lord && lord != p)
                people.Add(new ScenePerson(c.Id, PersonKind.Envoy, lord, home, $"{c.Name}, envoy of {lord.Name()}, at your court", false, false));
        }

        // Gold it sent as a ransom, on its own road.
        foreach (var j in f.Journeys.Where(j => j.Kind == JourneyKind.Ransom && j.From == p))
            travellers.Add(new SceneTraveller(j.Id, TravellerKind.Gold, p, home, Cap(j.To), Progress(now, j.Depart, j.Arrive), j.Depart, j.Arrive, j.CharacterId,
                $"Your ransom of {Ui.Shekels(j.Gold)} on its way to {j.To.Name()}", j.Gold, false, j.To));
        return (travellers, people);
    }

    /// <summary>The rumours and spy reports a court has received up to this season, the latest from each place, for eight seasons.</summary>
    private static List<SceneNews> NewsOf(SeasonFrames frames, int index, Power p)
    {
        var latest = new Dictionary<string, SceneNews>();
        for (var j = 1; j <= index; j++)
            foreach (var n in frames[j].News.Where(n => n.Court == p))
            {
                var place = n.Province ?? (n.FromCourt is { } fc ? Cap(fc) : null);
                if (place is null) continue;
                var age = index + 1 - n.Turn;
                if (age > 8) continue;
                latest[place + n.Kind] = new SceneNews(place, n.Kind, Math.Max(0, age), n.Title, n.Body, n.Observed);
            }
        return latest.Values.ToList();
    }

    /// <summary>
    /// A character's places season by season up to this frame, as the viewer knows them: the truth in god view; for a
    /// court, its own servant where it believed them, and anyone else only while at its court.
    /// </summary>
    public static List<(int Index, Pt At, string Where)> PathOf(SeasonFrames frames, int index, Power? viewer, string id)
    {
        var path = new List<(int, Pt, string)>();
        for (var j = 0; j <= Math.Min(index, frames.Count - 1); j++)
        {
            var f = frames[j];
            if (!f.People.TryGetValue(id, out var c)) continue;
            var (travellers, people) = viewer is { } p ? SeatPeople(f, p) : GodPeople(f);
            var t = travellers.FirstOrDefault(x => x.CharacterId == id && x.Kind != TravellerKind.Gold);
            if (t is not null)
            {
                path.Add((j, MapArt.Along(MapArt.Route(t.FromProvince, t.ToProvince), t.Progress), "on the road"));
                continue;
            }
            var s = people.FirstOrDefault(x => x.Id == id);
            if (s is not null)
            {
                path.Add((j, MapArt.City(s.Province), s.Title));
                continue;
            }
            // At a court: god view knows everyone's place; a court knows its own people at home (foreign people at its
            // court are placed above only as envoys or as people it holds, never as spies it has not caught).
            var known = viewer is null || c.Employer == viewer && c.CoverOf(viewer.Value) is null && c.At == viewer;
            if (known && c.At is { } court && c.Status != CharacterStatus.Dead)
                path.Add((j, MapArt.City(Map.Capital(court).Id), $"at the court of {court.Name()}"));
        }
        return path;
    }
}

