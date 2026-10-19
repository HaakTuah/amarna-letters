using Amarna.Engine;

namespace Amarna.Web.Services;

/// <summary>A unit as it stood at the end of a season.</summary>
public sealed record FrameUnit(string Id, Power Power, UnitKind Kind, string Province);

/// <summary>One unit's order of the season just resolved, and how it went (copied from the engine's outcomes).</summary>
public sealed record FrameMove(Power Power, UnitKind Kind, string From, string Order, string? Target, string? To, Power? Helped,
    bool Succeeded, bool Destroyed, Power? TargetOwner)
{
    public bool IsMove => Order == "move" && Target is not null;
}

/// <summary>Something on the road at the end of a season: a person, or gold, or word.</summary>
public sealed record FrameJourney(string Id, JourneyKind Kind, int Depart, int Arrive, Power From, Power To, string? CharacterId,
    int Gold, string? TrailId, Power? ReportCourt, string? ReportProvince, int ObservedTurn, string? Text);

/// <summary>What one court still believes of a servant whose fate it has not heard (the engine's <see cref="Cover"/>).</summary>
public sealed record FrameCover(Power For, Duty Believed, Power? HeldAt, string WhereText, string TimingText, int Since);

/// <summary>A character as it stood at the end of a season.</summary>
/// <param name="Confessed">
/// For a captive: whom it confessed to serving when the court holding it caught it, or null if it would not say
/// (<see cref="Views.ConfessedMaster"/>); all that court knows of its master.
/// </param>
public sealed record FramePerson(string Id, string Name, string Origin, string Calling, Power? Employer, CharacterStatus Status, Duty Duty,
    Power? At, string? Watch, Power? Mission, Power? HeldBy, Power? SecretMaster, string? CurrentTrail, Power? FormerEmployer,
    IReadOnlyList<FrameCover> Covers, Power? Confessed = null)
{
    public FrameCover? CoverOf(Power p) => Covers.FirstOrDefault(c => c.For == p);
}

/// <summary>A sleeping seat at the end of a season (god view only).</summary>
public sealed record FrameSleep(bool Asleep, int LastCalled, int WakeAt, IReadOnlyList<string> WokenBecause,
    int LastWokeAt, IReadOnlyList<string> LastReasons, int Spells);

/// <summary>News that reached a court in a season, which the map can place: a rumour from a court, or a spy's report from its post.</summary>
public sealed record FrameNews(Power Court, InboxKind Kind, int Turn, string Title, string Body, Power? FromCourt, string? Province, int Observed);

/// <summary>
/// The world at the end of one season, as the map draws it: who holds what, the units, last season's orders, who could
/// see where, who is on the road and where everyone is. Captured once per snapshot from the live state (or, if missed,
/// from the snapshot itself), so the map can step through the seasons without deserializing whole states.
/// </summary>
public sealed class SeasonFrame
{
    /// <summary>The snapshot index: 0 at the start, k after turn k.</summary>
    public int Index { get; init; }
    /// <summary>The season about to be played (the state's turn): Index + 1.</summary>
    public int Turn { get; init; }
    public bool Ended { get; init; }
    public string? EndReason { get; init; }
    public IReadOnlyList<string> Winners { get; init; } = [];
    public IReadOnlyDictionary<string, Power?> Owner { get; init; } = new Dictionary<string, Power?>();
    public IReadOnlySet<string> Garrisons { get; init; } = new HashSet<string>();
    public IReadOnlyList<FrameUnit> Units { get; init; } = [];
    /// <summary>Every order of the season just resolved (the union of what each court standing as it began saw, which includes all its own).</summary>
    public IReadOnlyList<FrameMove> Moves { get; init; } = [];
    /// <summary>What each court saw resolve: indexes into <see cref="Moves"/>.</summary>
    public IReadOnlyDictionary<Power, IReadOnlyList<int>> SeenBy { get; init; } = new Dictionary<Power, IReadOnlyList<int>>();
    /// <summary>Each court's sight for the coming season (<see cref="Views.Sight"/>).</summary>
    public IReadOnlyDictionary<Power, IReadOnlySet<string>> Sight { get; init; } = new Dictionary<Power, IReadOnlySet<string>>();
    public IReadOnlyList<FrameJourney> Journeys { get; init; } = [];
    public IReadOnlyDictionary<string, FramePerson> People { get; init; } = new Dictionary<string, FramePerson>();
    public IReadOnlyDictionary<Power, FrameSleep> Sleep { get; init; } = new Dictionary<Power, FrameSleep>();
    public IReadOnlySet<Power> Eliminated { get; init; } = new HashSet<Power>();
    /// <summary>The events of the season just resolved and of the arrivals that opened it.</summary>
    public IReadOnlyList<GameEvent> Events { get; init; } = [];
    /// <summary>Rumours and spy reports that reached each court since the frame before, placed where they can be.</summary>
    public IReadOnlyList<FrameNews> News { get; init; } = [];
    /// <summary>Each court's inbox length, to find what arrived after this frame.</summary>
    public IReadOnlyDictionary<Power, int> InboxCount { get; init; } = new Dictionary<Power, int>();
    public int MinTurns { get; init; }
    public double EndChance { get; init; }

    public Power? OwnerOf(string province) => Owner.GetValueOrDefault(province);

    /// <summary>Copies what the map needs from a state at the end of a season. Nothing here holds on to the live state.</summary>
    public static SeasonFrame From(GameState s, int index, SeasonFrame? previous, WorldMap? map = null)
    {
        map ??= WorldMap.Default;
        var moves = new List<FrameMove>();
        var keyed = new Dictionary<string, int>();
        var seenBy = new Dictionary<Power, IReadOnlyList<int>>();
        foreach (var p in Powers.All)
        {
            var mine = new List<int>();
            // A fallen court's last sights stay in the state unchanged: read them only in the season it fell, or every
            // later season would redraw that season's orders.
            var fallen = previous is not null && previous.Eliminated.Contains(p);
            foreach (var o in fallen ? [] : s.LastSeen.GetValueOrDefault(p) ?? [])
            {
                var key = $"{o.Power}|{o.Province}|{o.Order}|{o.Target}|{o.To}";
                if (!keyed.TryGetValue(key, out var i))
                {
                    i = moves.Count;
                    keyed[key] = i;
                    moves.Add(new FrameMove(o.Power, o.UnitKind, o.Province, o.Order, o.Target, o.To, o.Helped, o.Succeeded, o.Destroyed, o.TargetOwner));
                }
                mine.Add(i);
            }
            seenBy[p] = mine;
        }

        var news = new List<FrameNews>();
        var counts = new Dictionary<Power, int>();
        foreach (var p in Powers.All)
        {
            var inbox = s.InboxOf(p);
            counts[p] = inbox.Count;
            var from = previous?.InboxCount.GetValueOrDefault(p) ?? 0;
            for (var i = Math.Min(from, inbox.Count); i < inbox.Count; i++)
            {
                var item = inbox[i];
                if (item.Kind == InboxKind.Rumor)
                {
                    // Placed at the court the word came from, when a rumour on the road carried exactly this text.
                    var j = previous?.Journeys.FirstOrDefault(x => x.Kind == JourneyKind.Rumor && x.To == p && x.Text == item.Body);
                    news.Add(new FrameNews(p, item.Kind, item.Turn, item.Title, item.Body, j?.From, null, item.Turn));
                }
                else if (item.Kind == InboxKind.SpyReport)
                {
                    var j = previous?.Journeys.FirstOrDefault(x => x.Kind == JourneyKind.SpyReport && x.To == p && x.CharacterId == item.Subject);
                    news.Add(new FrameNews(p, item.Kind, item.Turn, item.Title, item.Body, j?.ReportCourt, j?.ReportProvince, j?.ObservedTurn ?? item.Turn));
                }
            }
        }

        var people = new Dictionary<string, FramePerson>();
        foreach (var c in s.Characters)
            people[c.Id] = new FramePerson(c.Id, c.Name, c.Origin, c.Calling, c.Employer, c.Status, c.Duty, c.At, c.WatchProvince, c.MissionTarget,
                c.HeldBy, c.SecretMaster, c.CurrentTrail, c.FormerEmployer,
                c.Covers.Select(k => new FrameCover(k.For, k.Believed, k.HeldAt, k.WhereText, k.TimingText, k.Since)).ToList(),
                c.Status == CharacterStatus.Captured && c.HeldBy is { } holder ? Views.ConfessedMaster(s, c.Id, holder) : null);

        return new SeasonFrame
        {
            Index = index,
            Turn = s.Turn,
            Ended = s.Ended,
            EndReason = s.EndReason,
            Winners = s.Winners.ToList(),
            Owner = new Dictionary<string, Power?>(s.Owner),
            Garrisons = s.Garrisons.ToHashSet(),
            Units = s.Units.Select(u => new FrameUnit(u.Id, u.Power, u.Kind, u.Province)).ToList(),
            Moves = moves,
            SeenBy = seenBy,
            Sight = Powers.All.ToDictionary(p => p, p => (IReadOnlySet<string>)(s.IsAlive(p) ? Views.Sight(s, map, p) : new HashSet<string>())),
            Journeys = s.Journeys.Select(j => new FrameJourney(j.Id, j.Kind, j.DepartTurn, j.ArriveTurn, j.From, j.To, j.CharacterId,
                j.Kind == JourneyKind.EnvoyOutbound ? j.Dispatch?.Gold ?? 0 : j.Kind == JourneyKind.EnvoyHomebound ? j.Cargo?.Gold ?? 0 : j.Gold,
                j.Dispatch?.TrailId ?? j.Cargo?.TrailId, j.Report?.Court, j.Report?.Province, j.Report?.ObservedTurn ?? 0, j.Text)).ToList(),
            People = people,
            Sleep = s.Sleep.ToDictionary(x => x.Key, x =>
            {
                var last = x.Value.History.LastOrDefault(h => h.WokeAt > 0);
                return new FrameSleep(x.Value.Asleep, x.Value.LastCalled, x.Value.WakeAt,
                    x.Value.WokenBecause.ToList(), last?.WokeAt ?? 0, last?.Reasons.ToList() ?? [], x.Value.History.Count);
            }),
            Eliminated = s.Eliminated.ToHashSet(),
            Events = s.Events.Where(e => e.Turn == index).ToList(),
            News = news,
            InboxCount = counts,
            MinTurns = s.Config.MinTurns,
            EndChance = s.Config.EndChance,
        };
    }
}

/// <summary>The frames of the game being shown: one per snapshot, kept in step with the runner.</summary>
public sealed class SeasonFrames
{
    private readonly List<SeasonFrame> _frames = new();

    public int Count => _frames.Count;

    /// <summary>Bumped whenever a frame is added or the list is reset, so the map knows to look again.</summary>
    public int Version { get; private set; }

    public SeasonFrame this[int index] => _frames[Math.Clamp(index, 0, _frames.Count - 1)];

    public SeasonFrame? Latest => _frames.Count == 0 ? null : _frames[^1];

    /// <summary>Bumped only when the list is reset (a new game): frames once added never change.</summary>
    public int Generation { get; private set; }

    public void Reset()
    {
        _frames.Clear();
        Version++;
        Generation++;
    }

    /// <summary>
    /// Adds frames for any snapshots the runner has that have no frame yet. The newest comes from the live state
    /// (the runner calls back right after taking its snapshot); any older one missed comes from its snapshot.
    /// </summary>
    public void CatchUp(Amarna.Game.GameRunner runner)
    {
        var added = false;
        while (_frames.Count < runner.Snapshots.Count)
        {
            var index = _frames.Count;
            var previous = _frames.Count == 0 ? null : _frames[^1];
            // The runner calls back right after each snapshot, before the next season touches its state.
            var live = index == runner.Snapshots.Count - 1 && (runner.State.Turn == index + 1 || runner.State.Ended && runner.State.Turn == index);
            var state = live ? runner.State : runner.StateAt(index);
            if (state is null) break;
            _frames.Add(SeasonFrame.From(state, index, previous));
            added = true;
        }
        if (added) Version++;
    }
}
