namespace Amarna.Engine;

public sealed class UnitView
{
    public Power Power { get; set; }
    public UnitKind Kind { get; set; }
    public string Province { get; set; } = "";
}

public sealed class LotView
{
    public string Id { get; set; } = "";
    public Power From { get; set; }
    public int Stated { get; set; }
    public int Weighed { get; set; }
    public int ArrivedTurn { get; set; }
}

public sealed class CharacterView
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public string Origin { get; set; } = "";
    public bool Ours { get; set; }
    public string Status { get; set; } = "";
    public Power? Employer { get; set; }
    public string Duty { get; set; } = "";
    public string Where { get; set; } = "";
    /// <summary>Your servant away: when it set out and when it is due back, as you can reckon it (see <see cref="Views.TimingText"/>).</summary>
    public string Timing { get; set; } = "";
    public int? Wage { get; set; }
    /// <summary>The last season of your servant's term.</summary>
    public int? ContractUntil { get; set; }
    /// <summary>One of your people who has given notice: the wage they ask to serve on.</summary>
    public int? NoticePrice { get; set; }
    /// <summary>With a notice: the season at whose start they leave unless renewed.</summary>
    public int? LeavesTurn { get; set; }
    /// <summary>Your servant's term in plain words: the wage, until when, and what happens then (see <see cref="Views.TermText"/>).</summary>
    public string Term { get; set; } = "";
    public List<string> KnownFacts { get; set; } = new();
    public string? Pitch { get; set; }
    /// <summary>What someone not in your service asks you a season: named in a pitch, or asked by a free person at your court.</summary>
    public int? AskingPrice { get; set; }
    /// <summary>In your service, at your court, with no task: can be sent somewhere this season.</summary>
    public bool Ready { get; set; }
    /// <summary>An envoy or spy you are holding against their will.</summary>
    public bool HeldByYou { get; set; }
    /// <summary>One of your people held captive abroad: the ransom its captor demands, once that demand has reached you.</summary>
    public int? RansomDemand { get; set; }
    /// <summary>The back pay you owe them (as you believe it, for one of your people abroad), paid when they are back at your court; null if none.</summary>
    public int? BackPay { get; set; }
}

public sealed class TabletView
{
    public string CopyId { get; set; } = "";
    public string TabletId { get; set; } = "";
    public string Text { get; set; } = "";
    public List<Power> Seals { get; set; } = new();
    public Power ProposedBy { get; set; }
    public Power? Partner { get; set; }
    public int? SealedTurn { get; set; }
    public bool AllianceOath { get; set; }
    public string Source { get; set; } = "";
    public string? AuthResult { get; set; }
}

/// <summary>
/// One seat's view of the world: the public map, its own treasury and people, what its
/// characters chose to tell it. Every seat - human, model or script - receives exactly this.
/// </summary>
public sealed class SeatView
{
    public int Turn { get; set; }
    public string Season { get; set; } = "";
    public Power Power { get; set; }
    public string King { get; set; } = "";
    public bool Ended { get; set; }
    public int MinTurns { get; set; }
    public double EndChance { get; set; }

    public int Gold { get; set; }
    public List<LotView> UnassayedGold { get; set; } = new();
    public int Income { get; set; }
    public int Upkeep { get; set; }
    /// <summary>The wages of all its people a season: paid to those at court, built up as back pay for those away.</summary>
    public int Wages { get; set; }
    /// <summary>The back pay it believes it owes (to its people, and to anyone at its court), paid when each is back at its court.</summary>
    public int BackPay { get; set; }
    /// <summary>
    /// Strength by the seat's own ledger (unassayed gold at its weight), less the back pay it believes it owes; never the
    /// true figure (see <see cref="Scoring"/>).
    /// </summary>
    public int Strength { get; set; }
    public int StartStrength { get; set; }
    /// <summary>What a shekel of yield counts in strength (public, in the rulebook).</summary>
    public int ProvinceWeight { get; set; } = new GameConfig().ProvinceWeight;

    public Dictionary<string, Power?> Owner { get; set; } = new();
    public List<string> Garrisons { get; set; } = new();
    public List<UnitView> Units { get; set; } = new();
    public List<string> Visible { get; set; } = new();
    public List<Power> Fallen { get; set; } = new();

    public List<CharacterView> Court { get; set; } = new();
    public List<CharacterView> Known { get; set; } = new();
    public List<TabletView> Tablets { get; set; } = new();
    public List<InboxItem> Inbox { get; set; } = new();
    public List<string> TravelTimes { get; set; } = new();
    /// <summary>Last season's orders as they resolved, for every unit this court could see.</summary>
    public List<OrderOutcome> LastSeason { get; set; } = new();

    /// <summary>Whether this seat sleeps after its orders (see <see cref="GameConfig.SleepingSeats"/>). The cap on its sleep is never shown.</summary>
    public bool Sleeps { get; set; }
    /// <summary>Why this seat was woken this season; empty when it was awake anyway.</summary>
    public List<string> WokenBecause { get; set; } = new();
    /// <summary>The last season this seat gave orders before this one (0 if it never has).</summary>
    public int LastCalled { get; set; }
    /// <summary>
    /// News delivered while this seat slept, oldest first: routine treasury notices left out (this season's is in its
    /// news), and at most <see cref="Views.MaxWhileAsleep"/> items, the latest.
    /// </summary>
    public List<InboxItem> WhileAsleep { get; set; } = new();
    /// <summary>Older news of the seasons it slept that did not fit.</summary>
    public int WhileAsleepLeftOut { get; set; }
    /// <summary>What happened while it slept that did not wake it, in brief, one line each.</summary>
    public List<string> Digest { get; set; } = new();
    /// <summary>Older digest lines that did not fit.</summary>
    public int DigestLeftOut { get; set; }
    /// <summary>Its own orders queued for later seasons, each of its units named by where it stands now.</summary>
    public List<ScheduledOrders> Scheduled { get; set; } = new();
    /// <summary>Its standing orders, each of its units named by where it stands now.</summary>
    public List<StandingOrderView> Standing { get; set; } = new();
    /// <summary>
    /// It sleeps and was woken for its audiences only (<see cref="WokenBecause"/> names the envoys): its orders stand unless
    /// it reopens them at an audience.
    /// </summary>
    public bool HoldsCourt { get; set; }
    /// <summary>Letters it sent from its audiences this season, which go out with its orders (checked before them).</summary>
    public List<Order> CourtLetters { get; set; } = new();
    public Dictionary<string, int> Prices { get; set; } = new();
}

/// <summary>
/// One power's standing as any court can reckon it from public ownership alone: the base yield of the land it holds now
/// against the yield of its homeland, which it held at the start. Treasuries are left out, so it is only an estimate of growth.
/// </summary>
public sealed record LandStanding(Power Power, int Yield, int StartYield, bool Fallen)
{
    public double Growth => StartYield <= 0 ? 0 : (double)Yield / StartYield;
}

public static class Views
{
    /// <summary>
    /// Every power's land-based growth from who holds what, the living best first (ties in the fixed order of powers),
    /// then the fallen. The same for every court: ownership is public.
    /// </summary>
    public static IReadOnlyList<LandStanding> LandStandings(IReadOnlyDictionary<string, Power?> owner, IEnumerable<Power> fallen, WorldMap? map = null)
    {
        map ??= WorldMap.Default;
        var gone = fallen.ToHashSet();
        return Powers.All
            .Select(p => new LandStanding(p, owner.Where(o => o.Value == p).Sum(o => map[o.Key].Yield), map.HomeOf(p).Sum(x => x.Yield), gone.Contains(p)))
            .OrderBy(x => x.Fallen).ThenByDescending(x => x.Fallen ? 0 : x.Growth).ThenBy(x => x.Power)
            .ToList();
    }

    /// <summary>
    /// Whether a kingdom looks doomed, from public facts alone (who holds what): it has fallen, lost its capital, or holds
    /// fewer than half of its homeland's provinces. Back pay owed by such a court may never be paid.
    /// </summary>
    public static bool LooksDoomed(IReadOnlyDictionary<string, Power?> owner, IEnumerable<Power> fallen, Power p, WorldMap? map = null)
    {
        map ??= WorldMap.Default;
        if (fallen.Contains(p) || owner.GetValueOrDefault(map.Capital(p).Id) != p) return true;
        var home = map.HomeOf(p).ToList();
        return 2 * home.Count(x => owner.GetValueOrDefault(x.Id) == p) < home.Count;
    }

    /// <summary>
    /// Provinces a power can see units in: its own lands, where its units stand, the provinces its spies watch, and
    /// next to any of those. A province spy caught or let go unknown to its master still counts while the master
    /// believes it at its post, so that its sight betrays nothing before word comes.
    /// </summary>
    public static HashSet<string> Sight(GameState s, WorldMap map, Power p)
    {
        var core = new HashSet<string>(s.OwnedBy(p));
        foreach (var u in s.Units.Where(u => u.Power == p)) core.Add(u.Province);
        foreach (var c in s.Characters.Where(c => c.WatchProvince is not null && (c.CoverOf(p) is { } cover
                     ? cover.Believed == Duty.SpyPosted
                     : c.Employer == p && c.Duty == Duty.SpyPosted)))
            core.Add(c.WatchProvince!);
        var all = new HashSet<string>(core);
        foreach (var id in core)
            foreach (var n in map.Neighbors(id)) all.Add(n);
        return all;
    }

    /// <summary>A sleeping seat wakes to at most this many items of the news of the seasons it slept.</summary>
    public const int MaxWhileAsleep = 40;

    /// <summary>
    /// A treasury notice that only gives the season's figures: stale once another season has passed (the latest is in
    /// this season's news). One that says troops deserted or people went unpaid is kept.
    /// </summary>
    private static bool RoutineTreasury(InboxItem i) =>
        i.Kind == InboxKind.Notice && i.Title == "The treasury" && !i.Body.Contains("deserted", StringComparison.Ordinal) && !i.Body.Contains("Could not pay", StringComparison.Ordinal);

    public static SeatView For(GameState s, Power p, WorldMap? map = null)
    {
        map ??= WorldMap.Default;
        var engine = new TurnEngine(s, map);
        var sight = Sight(s, map, p);
        var t = s.Treasuries[p];
        var v = new SeatView
        {
            Turn = s.Turn,
            Season = Calendar.Season(s.Turn, p),
            Power = p,
            King = p.King(),
            Ended = s.Ended,
            MinTurns = s.Config.MinTurns,
            EndChance = s.Config.EndChance,
            Gold = t.Ledger,
            UnassayedGold = t.Lots.Select(l => new LotView { Id = l.Id, From = l.From, Stated = l.Stated, Weighed = l.Face, ArrivedTurn = l.ArrivedTurn }).ToList(),
            Income = engine.Income(p),
            Upkeep = engine.Upkeep(p),
            Wages = engine.Wages(p),
            BackPay = engine.BelievedBackPay(p),
            Strength = engine.LedgerStrength(p),
            StartStrength = s.StartStrength.GetValueOrDefault(p),
            ProvinceWeight = s.Config.ProvinceWeight,
            Owner = new Dictionary<string, Power?>(s.Owner),
            Garrisons = s.Garrisons.ToList(),
            Units = s.Units.Where(u => u.Power == p || sight.Contains(u.Province))
                .Select(u => new UnitView { Power = u.Power, Kind = u.Kind, Province = u.Province }).ToList(),
            Visible = map.Provinces.Where(x => sight.Contains(x.Id)).Select(x => x.Id).ToList(),
            Fallen = s.Eliminated.ToList(),
            Inbox = s.InboxOf(p).Where(i => i.Turn == s.Turn).ToList(),
            LastSeason = s.LastSeen.GetValueOrDefault(p)?.ToList() ?? new(),
        };

        if (s.Config.SleepingSeats && s.Sleep.TryGetValue(p, out var sleep))
        {
            v.Sleeps = true;
            v.WokenBecause = sleep.WokenBecause.ToList();
            v.HoldsCourt = sleep.HoldsCourt && sleep.Asleep;
            v.CourtLetters = sleep.CourtLetters.ToList();
            v.LastCalled = sleep.LastCalled;
            var slept = s.InboxOf(p).Where(i => i.Turn > sleep.LastCalled && i.Turn < s.Turn && !RoutineTreasury(i)).ToList();
            v.WhileAsleepLeftOut = Math.Max(0, slept.Count - MaxWhileAsleep);
            v.WhileAsleep = slept.Skip(v.WhileAsleepLeftOut).ToList();
            v.Digest = sleep.Digest.ToList();
            v.DigestLeftOut = sleep.DigestLeftOut;
            // Orders follow their units: each is shown as it would be given from where its unit stands now.
            v.Scheduled = sleep.Scheduled.GroupBy(x => x.Turn).OrderBy(g => g.Key)
                .Select(g => new ScheduledOrders { Turn = g.Key, Orders = g.Select(x => TurnEngine.AsItStands(s, p, x) ?? x.Order).ToList() }).ToList();
            v.Standing = sleep.Standing.Select(x => new StandingOrderView
            {
                Id = x.Id,
                When = x.When,
                Power = x.Power,
                Province = (x.When == StandingWhen.UnitAttacked ? s.Units.FirstOrDefault(u => u.Id == x.UnitId && u.Power == p)?.Province ?? x.Province : x.Province) ?? "",
                Orders = x.Orders.Select(o => TurnEngine.AsItStands(s, p, o) ?? o.Order).ToList(),
            }).ToList();
        }

        foreach (var c in s.Characters)
        {
            // A servant abroad whose fate this court has not heard of appears as it believes, and only there.
            if (c.CoverOf(p) is not null)
            {
                v.Court.Add(Character(s, c, p));
                continue;
            }
            if (c.Status == CharacterStatus.Dead && c.Employer != p) continue;
            var ours = c.Employer == p && c.Status is CharacterStatus.Employed or CharacterStatus.Captured;
            // A foreign spy posted here in secret is not seen here: only something else this court knows of it lists it.
            var known = ours || SeenAtCourt(c, p) || c.HeldBy == p || c.Pitches.ContainsKey(p) || c.Facts.Any(f => f.Secrecy != Secrecy.Public && f.KnownBy.Contains(p));
            if (!known) continue;
            var cv = Character(s, c, p);
            if (ours) v.Court.Add(cv); else v.Known.Add(cv);
        }

        foreach (var copy in s.Copies.Where(x => x.Holder == p))
        {
            var tab = s.Tablets.FirstOrDefault(x => x.Id == copy.TabletId);
            if (tab is not null) v.Tablets.Add(Tablet(tab, copy));
        }

        foreach (var other in s.Alive.Where(x => x != p))
            v.TravelTimes.Add($"{other}: {engine.TravelTurns(p, other)} season(s) each way");

        v.Prices["army"] = s.Config.ArmyCost;
        v.Prices["fleet"] = s.Config.FleetCost;
        v.Prices["armyUpkeep"] = s.Config.ArmyUpkeep;
        v.Prices["fleetUpkeep"] = s.Config.FleetUpkeep;
        v.Prices["tabletFee"] = s.Config.TabletFee;
        v.Prices["assay"] = s.Config.AssayFee;
        v.Prices["forgery"] = s.Config.ForgeFee;
        v.Prices["cityPricePerYield"] = s.Config.NeutralPriceFactor;
        return v;
    }

    /// <summary>
    /// Whether <paramref name="viewer"/> sees <paramref name="c"/> standing at its court: anyone there in the open (its
    /// own people, envoys received there, free people, anyone it holds), but not a foreign spy posted there in secret
    /// (<see cref="Amarna.Engine.Character.HiddenAt"/>). Where it stands, and whom it serves, the court learns only when its
    /// watchmen catch it, or if it secretly serves the court.
    /// </summary>
    public static bool SeenAtCourt(Character c, Power viewer) => c.At == viewer && !c.HiddenAt(viewer);

    /// <summary>
    /// Whom a spy <paramref name="court"/> caught confessed to serving when it was caught there (its latest capture there),
    /// or null if it would not say: all the court learned of its master. Kept as the court learned it, whatever has
    /// happened to the spy's service since.
    /// </summary>
    public static Power? ConfessedMaster(GameState s, string id, Power court) =>
        s.Losses.LastOrDefault(l => l.CharacterId == id && l.Court == court && l.Kind == LossKind.Captured)?.Master;

    public static CharacterView Character(GameState s, Character c, Power viewer)
    {
        if (c.CoverOf(viewer) is { } cover) return Covered(s, c, cover);
        var ours = c.Employer == viewer;
        var captive = ours && c.Status == CharacterStatus.Captured && c.HeldBy is not null;
        // A foreign spy hidden at your court is, to you, someone elsewhere: no place, no master.
        var here = SeenAtCourt(c, viewer);
        // A free person at your court (not held by another) can be hired there at what they ask, whether or not they pitched.
        var freeHere = c.Status == CharacterStatus.Free && here && (c.HeldBy is null || c.HeldBy == viewer);
        // The contract of one who still serves you (not of one dead in your service).
        var k = ours && c.Status is (CharacterStatus.Employed or CharacterStatus.Captured) ? c.Contract : null;
        return new CharacterView
        {
            Id = c.Id,
            Name = c.Name,
            Origin = c.Origin,
            Ours = ours,
            Status = c.Status == CharacterStatus.Captured && c.HeldBy == viewer ? "your captive" : c.Status.ToString().ToLowerInvariant(),
            // A spy you caught: whom it confessed to serving, if it did.
            Employer = ours || c.Status == CharacterStatus.Employed && here ? c.Employer
                : c.Status == CharacterStatus.Captured && c.HeldBy == viewer ? ConfessedMaster(s, c.Id, viewer)
                : null,
            Duty = captive ? CaptiveText(s, c.Id, c.HeldBy!.Value, viewer) : ours ? DutyText(c) : "",
            Where = ours || here ? WhereText(c, viewer) : "",
            Timing = ours ? TimingText(s, c) : "",
            // A captive's wage builds up as back pay, as for anyone away.
            Wage = k?.Wage,
            ContractUntil = k?.UntilTurn,
            NoticePrice = k?.NoticePrice,
            LeavesTurn = k?.LeavesTurn,
            Term = k is null ? "" : TermText(k.Wage, k.UntilTurn, k.NoticePrice, k.LeavesTurn, s.Turn),
            KnownFacts = c.FactsKnownTo(viewer).Select(f => f.Text).ToList(),
            Pitch = c.Pitches.GetValueOrDefault(viewer),
            // Your own servant's price to serve on is in its term; an old asking price from before it was hired means nothing now.
            AskingPrice = ours ? null : c.AskingPrice.TryGetValue(viewer, out var price) ? price : freeHere ? TurnEngine.BasePrice(c, viewer) : null,
            Ready = ours && c.Status == CharacterStatus.Employed && c.Duty == Duty.None && c.At == viewer,
            HeldByYou = c.HeldBy == viewer,
            RansomDemand = captive ? KnownDemand(s, c.Id, c.HeldBy!.Value, viewer)?.Spend : null,
            BackPay = BackPayOwed(c, viewer),
        };
    }

    /// <summary>
    /// The back pay <paramref name="viewer"/> owes a character as it can know it, or null if none: as it believes it for
    /// one of its people abroad whose fate it has not heard of (its cover); else what it really owes one of its people,
    /// or anyone it sees standing at its court and not held there. Nothing for one away who no longer serves it, whose
    /// fate it cannot see, or for a foreign spy hidden at its court (what it owes them is paid if they ever stand at its
    /// court in the open).
    /// </summary>
    public static int? BackPayOwed(Character c, Power viewer)
    {
        var owed = c.CoverOf(viewer) is { } cover ? cover.BackPay
            : c.Employer == viewer && c.Status is CharacterStatus.Employed or CharacterStatus.Captured
              || SeenAtCourt(c, viewer) && c.HeldBy != viewer && c.Status != CharacterStatus.Dead ? c.BackPay.GetValueOrDefault(viewer)
            : 0;
        return owed > 0 ? owed : null;
    }

    /// <summary>A servant as its master still believes it to be: the same fields the master saw before, never ready.</summary>
    private static CharacterView Covered(GameState s, Character c, Cover cover) => new()
    {
        Id = c.Id,
        Name = c.Name,
        Origin = c.Origin,
        Ours = true,
        Status = cover.HeldAt is null ? "employed" : "captured",
        Employer = cover.For,
        Duty = cover.HeldAt is { } held ? CaptiveText(s, c.Id, held, cover.For) : cover.DutyText,
        Where = cover.HeldAt is { } at ? $"at the court of {at}" : cover.WhereText,
        Timing = cover.HeldAt is null ? cover.TimingText : "",
        Wage = cover.Wage,
        ContractUntil = cover.ContractUntil,
        NoticePrice = cover.NoticePrice,
        LeavesTurn = cover.LeavesTurn,
        Term = TermText(cover.Wage, cover.ContractUntil, cover.NoticePrice, cover.LeavesTurn, s.Turn),
        // What it knew then and what its inquiries have found since, as for a servant really away.
        KnownFacts = c.Facts.Where(f => cover.FactIds.Contains(f.Id) || f.Secrecy != Secrecy.Public && f.KnownBy.Contains(cover.For)).Select(f => f.Text).ToList(),
        Pitch = c.Pitches.GetValueOrDefault(cover.For),
        RansomDemand = cover.HeldAt is { } h ? KnownDemand(s, c.Id, h, cover.For)?.Spend : null,
        BackPay = cover.BackPay > 0 ? cover.BackPay : null,
    };

    /// <summary>
    /// A servant's term in plain words, as its master reads it: the wage, the last season of the term and what happens
    /// then, or, once it has given notice, its price to serve on and when it leaves.
    /// </summary>
    /// <param name="wage">Null when no wage is to be said: only a notice is.</param>
    public static string TermText(int? wage, int? until, int? noticePrice, int? leavesTurn, int turn)
    {
        var serves = wage is int w ? $"serves at {w} a season" : null;
        if (noticePrice is int ask)
            return (serves is null ? "" : serves + "; ") + $"has given notice: asks {ask} a season to serve on; "
                   + (leavesTurn is int t && t > turn ? $"leaves at the start of turn {t} unless renewed" : "leaves when next at your court unless renewed");
        if (serves is null) return "";
        if (until is not int u) return serves;
        const string notice = "otherwise they give a season's notice and name a price";
        return u >= turn
            ? $"{serves} through turn {u}; if content they then renew themselves, {notice}"
            : $"{serves}; the term ended with turn {u}: when next at your court, if content they renew themselves, {notice}";
    }

    /// <summary>
    /// When one of your servants away set out and when it is due back, as its master can reckon it from the travel
    /// table: an envoy on its way out, at a foreign court or on the road home, a spy on its way to its post or home.
    /// Blank at court, held, or at its post. A cover keeps this text as it stood (<see cref="Cover.TimingText"/>).
    /// </summary>
    public static string TimingText(GameState s, Character c, WorldMap? map = null)
    {
        map ??= WorldMap.Default;
        if (c.Status != CharacterStatus.Employed || c.Employer is not { } home) return "";
        var journey = s.Journeys.FirstOrDefault(j => j.CharacterId == c.Id && j.Kind is JourneyKind.EnvoyOutbound or JourneyKind.EnvoyHomebound or JourneyKind.SpyOutbound or JourneyKind.SpyHomebound);
        var trail = c.CurrentTrail is { } t ? s.Trails.FirstOrDefault(x => x.Id == t && x.From == home) : null;
        int Back(Power from) => TurnEngine.TravelTurns(s.Config, map, map.Capital(from).Id, map.Capital(home).Id);
        return c.Duty switch
        {
            // On its way the reckoning is a reckoning ("due there"); only once it stands at that court is it "received there".
            Duty.EnvoyOutbound when journey is { Kind: JourneyKind.EnvoyOutbound } j =>
                $"set out in turn {j.DepartTurn} for {j.To}; due there about turn {j.ArriveTurn}; due back about turn {j.ArriveTurn + Back(j.To)}",
            Duty.EnvoyAtCourt when trail is not null && c.At is { } at =>
                $"set out in turn {trail.Turn} for {at}; received there in turn {s.Turn}; due back about turn {s.Turn + Back(at)}",
            Duty.EnvoyHomebound when journey is { Kind: JourneyKind.EnvoyHomebound } j && trail is not null => EnvoyHomeTiming(trail.Turn, trail.To, j.ArriveTurn),
            Duty.EnvoyHomebound when journey is { Kind: JourneyKind.EnvoyHomebound or JourneyKind.SpyHomebound } j => HomeTiming(j.ArriveTurn),
            Duty.SpyOutbound when journey is { Kind: JourneyKind.SpyOutbound } j => $"set out in turn {j.DepartTurn}; due there about turn {j.ArriveTurn}",
            _ => "",
        };
    }

    /// <summary>An envoy on the road home: what its master reads, and what a cover keeps when the envoy is held or goes over.</summary>
    public static string EnvoyHomeTiming(int setOut, Power to, int due) => $"set out in turn {setOut} for {to}; {HomeTiming(due)}";

    /// <summary>A servant on the road home with no mission of its own to name (a spy recalled).</summary>
    public static string HomeTiming(int due) => $"due back about turn {due}";

    /// <summary>One of the viewer's people held captive abroad, with the ransom demanded if that word has reached it.</summary>
    private static string CaptiveText(GameState s, string id, Power heldAt, Power viewer) =>
        KnownDemand(s, id, heldAt, viewer) is { } demand
            ? $"held captive at the court of {heldAt}; {heldAt} demands {Money.Format(demand.Spend)} for their return (order pay_ransom)"
            : $"held captive at the court of {heldAt}";

    /// <summary>The open ransom demand for a captive, once its rumour has reached the court asked to pay.</summary>
    public static PendingTask? KnownDemand(GameState s, string id, Power heldAt, Power payer) =>
        s.Tasks.LastOrDefault(t => t.Kind == TaskKind.RansomDemand && t.Announced && t.CharacterId == id && t.Requester == payer && t.Other == heldAt);

    public static string DutyText(Character c) => c.Status == CharacterStatus.Captured && c.HeldBy is { } jailer ? $"held captive at the court of {jailer}" : c.Duty switch
    {
        Duty.None => "at court, ready for a mission",
        Duty.EnvoyOutbound => $"travelling as envoy to {c.MissionTarget}",
        Duty.EnvoyAtCourt => $"at the court of {c.At} as envoy",
        Duty.EnvoyHomebound => "on the road home",
        Duty.Detained => $"has not returned from {c.MissionTarget}",
        Duty.SpyOutbound => $"travelling on a quiet errand to {c.MissionTarget?.ToString() ?? c.WatchProvince}",
        Duty.SpyPosted => $"watching {c.MissionTarget?.ToString() ?? c.WatchProvince}",
        _ => c.Duty.ToString(),
    };

    private static string WhereText(Character c, Power viewer)
    {
        if (c.Status == CharacterStatus.Captured) return c.HeldBy == viewer ? "in your prison" : c.HeldBy is { } jailer && c.Employer == viewer ? $"at the court of {jailer}" : "unknown";
        if (c.Duty == Duty.Detained && c.Employer == viewer) return "unknown";
        if (c.At is { } at) return at == viewer ? "at your court" : $"at the court of {at}";
        return c.WatchProvince is { } wp ? $"in {wp}" : "travelling";
    }

    public static TabletView Tablet(Tablet t, TabletCopy copy) => new()
    {
        CopyId = copy.Id,
        TabletId = t.Id,
        Text = t.Text,
        Seals = t.Seals.ToList(),
        ProposedBy = t.ProposedBy,
        Partner = t.Partner,
        SealedTurn = t.SealedTurn,
        AllianceOath = t.AllianceOath,
        Source = copy.Source,
        AuthResult = copy.AuthResult,
    };
}
