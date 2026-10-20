using Amarna.Engine;

namespace Amarna.Web.Components;

public sealed class UnitDraft
{
    public string Kind { get; set; } = "hold";
    public string? Target { get; set; }
    public string? To { get; set; }
}

/// <summary>A human seat's orders as they are being written, before submission.</summary>
public sealed class OrderDraft
{
    private static readonly WorldMap Map = WorldMap.Default;

    public OrderDraft(SeatView view)
    {
        View = view;
        foreach (var u in view.Units.Where(u => u.Power == view.Power)) Units[u.Province] = new UnitDraft();
    }

    public SeatView View { get; }
    public Dictionary<string, UnitDraft> Units { get; } = new();
    public List<Order> Other { get; } = new();
    /// <summary>New standing orders, which every seat may give (since the additions to the fix pass after item 4).</summary>
    public List<StandingRequest> Standing { get; } = new();
    /// <summary>The ids of standing orders kept so far that are to be cancelled with these orders.</summary>
    public HashSet<string> CancelStanding { get; } = new();
    public string? Selected { get; set; }
    public string Notes { get; set; } = "";

    public UnitView? UnitAt(string province) => View.Units.FirstOrDefault(u => u.Province == province);

    public IEnumerable<string> MovesFor(string province)
    {
        var u = UnitAt(province);
        if (u is null) return [];
        var direct = Map.MovesFrom(u.Kind, province);
        if (u.Kind == UnitKind.Army && Map[province].IsCoastal)
            direct = direct.Concat(Map.LandProvinces.Where(p => p.IsCoastal && p.Id != province && Map.SeaRouteExists(province, p.Id)).Select(p => p.Id));
        return direct.Distinct().OrderBy(Ui.Province);
    }

    public HashSet<string> Targets() => Selected is null ? new() : MovesFor(Selected).ToHashSet();

    public void Click(string province)
    {
        if (Selected is null)
        {
            if (Units.ContainsKey(province)) Selected = province;
            return;
        }
        if (province == Selected)
        {
            Units[province] = new UnitDraft();
            Selected = null;
            return;
        }
        if (MovesFor(Selected).Contains(province))
        {
            Units[Selected] = new UnitDraft { Kind = "move", Target = province };
            Selected = null;
            return;
        }
        Selected = Units.ContainsKey(province) ? province : null;
    }

    public List<(string From, string To, bool Support)> Arrows()
    {
        var list = new List<(string, string, bool)>();
        foreach (var (at, d) in Units)
        {
            if (d.Kind == "move" && d.Target is not null) list.Add((at, d.Target, false));
            if (d.Kind == "support" && d.Target is not null) list.Add((at, d.To ?? d.Target, true));
            if (d.Kind == "convoy" && d.Target is not null && d.To is not null) list.Add((d.Target, d.To, true));
        }
        return list;
    }

    public TurnSubmission Build()
    {
        var orders = new List<Order>();
        foreach (var (at, d) in Units)
        {
            orders.Add(d.Kind switch
            {
                "move" when d.Target is not null => new MoveOrder(at, d.Target),
                "support" when d.Target is not null => new SupportOrder(at, d.Target, string.IsNullOrEmpty(d.To) ? null : d.To),
                "convoy" when d.Target is not null && d.To is not null => new ConvoyOrder(at, d.Target, d.To),
                "disband" => new DisbandOrder(at),
                "besiege" => new BesiegeOrder(at),
                _ => new HoldOrder(at),
            });
        }
        orders.AddRange(Other);
        return new TurnSubmission
        {
            Orders = orders, Notes = Notes, Standing = Standing.ToList(),
            CancelStanding = View.Standing.Select(s => s.Id).Where(CancelStanding.Contains).ToList(),
        };
    }

    /// <summary>A unit order as the form for standing orders builds it, or null while it lacks what it needs.</summary>
    public static Order? UnitOrder(string unit, string kind, string? target, string? to) => kind switch
    {
        "hold" => new HoldOrder(unit),
        "move" when !string.IsNullOrEmpty(target) => new MoveOrder(unit, target),
        "support" when !string.IsNullOrEmpty(target) => new SupportOrder(unit, target, string.IsNullOrEmpty(to) ? null : to),
        _ => null,
    };

    /// <summary>What a standing order waits for, in the words the seat's view uses ("when Hatti's troops enter mira").</summary>
    public static string When(StandingWhen when, Power? power, string province, Power viewer) => when == StandingWhen.UnitAttacked
        ? $"when your troop in {Ui.Province(province)} is attacked"
        : TurnEngine.EntersText(viewer, power, Ui.Province(province));
}
