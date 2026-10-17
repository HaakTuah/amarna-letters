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
    public int? Wage { get; set; }
    public int? ContractUntil { get; set; }
    public List<string> KnownFacts { get; set; } = new();
    public string? Pitch { get; set; }
    public int? AskingPrice { get; set; }
    /// <summary>In your service, at your court, with no task: can be sent somewhere this season.</summary>
    public bool Ready { get; set; }
    /// <summary>An envoy or spy you are holding against their will.</summary>
    public bool HeldByYou { get; set; }
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
    public int Wages { get; set; }
    public int Strength { get; set; }
    public int StartStrength { get; set; }

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
    public Dictionary<string, int> Prices { get; set; } = new();
}

public static class Views
{
    /// <summary>Provinces a power can see units in: its own lands, where its units stand, and next to either.</summary>
    public static HashSet<string> Sight(GameState s, WorldMap map, Power p)
    {
        var core = new HashSet<string>(s.OwnedBy(p));
        foreach (var u in s.Units.Where(u => u.Power == p)) core.Add(u.Province);
        foreach (var c in s.Characters.Where(c => c.Employer == p && c.Duty == Duty.SpyPosted && c.WatchProvince is not null))
            core.Add(c.WatchProvince!);
        var all = new HashSet<string>(core);
        foreach (var id in core)
            foreach (var n in map.Neighbors(id)) all.Add(n);
        return all;
    }

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
            Strength = engine.Strength(p),
            StartStrength = s.StartStrength.GetValueOrDefault(p),
            Owner = new Dictionary<string, Power?>(s.Owner),
            Garrisons = s.Garrisons.ToList(),
            Units = s.Units.Where(u => u.Power == p || sight.Contains(u.Province))
                .Select(u => new UnitView { Power = u.Power, Kind = u.Kind, Province = u.Province }).ToList(),
            Visible = map.Provinces.Where(x => sight.Contains(x.Id)).Select(x => x.Id).ToList(),
            Fallen = s.Eliminated.ToList(),
            Inbox = s.InboxOf(p).Where(i => i.Turn == s.Turn).ToList(),
            LastSeason = s.LastSeen.GetValueOrDefault(p)?.ToList() ?? new(),
        };

        foreach (var c in s.Characters)
        {
            if (c.Status == CharacterStatus.Dead && c.Employer != p) continue;
            var ours = c.Employer == p && c.Status is CharacterStatus.Employed or CharacterStatus.Captured;
            var known = ours || c.At == p || c.HeldBy == p || c.Pitches.ContainsKey(p) || c.Facts.Any(f => f.Secrecy != Secrecy.Public && f.KnownBy.Contains(p));
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

    public static CharacterView Character(GameState s, Character c, Power viewer)
    {
        var ours = c.Employer == viewer;
        return new CharacterView
        {
            Id = c.Id,
            Name = c.Name,
            Origin = c.Origin,
            Ours = ours,
            Status = c.Status == CharacterStatus.Captured && c.HeldBy == viewer ? "your captive" : c.Status.ToString().ToLowerInvariant(),
            Employer = ours || c.Status == CharacterStatus.Employed && c.At == viewer ? c.Employer : null,
            Duty = ours ? DutyText(c) : "",
            Where = ours || c.At == viewer ? WhereText(c, viewer) : "",
            Wage = ours ? c.Contract?.Wage : null,
            ContractUntil = ours ? c.Contract?.UntilTurn : null,
            KnownFacts = c.FactsKnownTo(viewer).Select(f => f.Text).ToList(),
            Pitch = c.Pitches.GetValueOrDefault(viewer),
            AskingPrice = c.AskingPrice.TryGetValue(viewer, out var price) ? price : null,
            Ready = ours && c.Status == CharacterStatus.Employed && c.Duty == Duty.None && c.At == viewer,
            HeldByYou = c.HeldBy == viewer,
        };
    }

    public static string DutyText(Character c) => c.Duty switch
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
        if (c.Status == CharacterStatus.Captured) return c.HeldBy == viewer ? "in your prison" : "unknown";
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
