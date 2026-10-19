using System.Text.Json.Nodes;
using Amarna.Engine;
using Amarna.Game;

namespace Amarna.Llm;

/// <summary>Turns structured model output into ordinary engine orders, which then face the same validator as everyone's.</summary>
public static class Parse
{
    private static string S(JsonNode? n, string key) => n?[key]?.GetValue<string>()?.Trim() ?? "";
    private static int I(JsonNode? n, string key)
    {
        try { return n?[key]?.GetValue<int>() ?? 0; }
        catch { return 0; }
    }
    private static bool B(JsonNode? n, string key)
    {
        try { return n?[key]?.GetValue<bool>() ?? false; }
        catch { return false; }
    }
    private static List<string> L(JsonNode? n, string key) =>
        (n?[key] as JsonArray)?.Select(x => x?.GetValue<string>()?.Trim() ?? "").Where(x => x.Length > 0).ToList() ?? new();

    private static string? Empty(string s) => s.Length == 0 ? null : s;

    private static Power? P(string s) => Powers.TryParse(s, out var p) ? p : null;

    private static string Prov(string s)
    {
        var p = WorldMap.Default.Find(s);
        return p?.Id ?? s.ToLowerInvariant();
    }

    public static TurnSubmission Orders(JsonObject o)
    {
        // The king's notes and its summary of older seasons are for its own record; the engine ignores them.
        // Its ledger of dealings too.
        var sub = new TurnSubmission { Notes = S(o, "notes"), Summary = S(o, "summary"), Ledger = Ledger(o) };
        foreach (var u in (o["units"] as JsonArray) ?? new JsonArray())
            if (Unit(u) is { } order) sub.Orders.Add(order);

        foreach (var l in (o["letters"] as JsonArray) ?? new JsonArray())
        {
            if (P(S(l, "to")) is not { } to)
            {
                // The schema lists the courts, so only a reply that ignores it lands here: refused with the reason, not dropped.
                sub.Orders.Add(new UnreadableOrder($"send {S(l, "envoy")} to '{S(l, "to")}'", Nowhere(S(l, "to"), "the court to send the envoy to")));
                continue;
            }
            var tablet = S(l, "tablet_to_seal");
            sub.Orders.Add(new DispatchOrder(
                S(l, "envoy"),
                to,
                S(l, "message"),
                S(l, "mandate"),
                new GreetingOptions
                {
                    CallBrother = B(l, "call_brother"),
                    GrantGreatKing = B(l, "call_them_great_king"),
                    ClaimGreatKing = B(l, "claim_great_king"),
                    SenderFirst = B(l, "your_name_first"),
                    Omit = B(l, "omit_greeting"),
                },
                Math.Max(0, I(l, "gold")),
                Math.Clamp(I(l, "purity") is 0 ? 100 : I(l, "purity"), 10, 100),
                tablet.Length > 0 ? new TabletProposal { Text = tablet, AllianceOath = B(l, "sworn_alliance") } : null,
                L(l, "show_tablet_copies") is { Count: > 0 } copies ? copies : null));
        }

        foreach (var x in (o["other_orders"] as JsonArray) ?? new JsonArray())
            if (Other(x) is { } order) sub.Orders.Add(order);

        // Sleeping seats: the season to be woken in, what else should wake it, and orders for later seasons.
        if (o["sleep"] is JsonObject sleep)
        {
            var req = new SleepRequest { WakeTurn = Math.Max(0, I(sleep, "wake_in_turn")) };
            foreach (var w in (sleep["wake_on"] as JsonArray) ?? new JsonArray())
            {
                WakeKind? kind = S(w, "trigger") switch
                {
                    "unit_moves" => WakeKind.UnitMoves,
                    "envoy_returns" => WakeKind.EnvoyReturns,
                    "treasury_below" => WakeKind.TreasuryBelow,
                    "troops_enter" => WakeKind.TroopsEnter,
                    "province_changes_hands" => WakeKind.ProvinceChangesHands,
                    _ => null,
                };
                if (kind is not { } k) continue;
                req.WakeOn.Add(new WakeTrigger
                {
                    Kind = k,
                    Province = Empty(S(w, "province")) is { } wp ? Prov(wp) : null,
                    Character = Empty(S(w, "person")),
                    Amount = Math.Max(0, I(w, "amount")),
                    Power = P(S(w, "power")),
                });
            }
            sub.Sleep = req;
        }
        foreach (var plan in (o["schedule"] as JsonArray) ?? new JsonArray())
        {
            var scheduled = new ScheduledOrders { Turn = I(plan, "turn") };
            foreach (var u in (plan?["units"] as JsonArray) ?? new JsonArray())
                if (Unit(u) is { } order) scheduled.Orders.Add(order);
            foreach (var x in (plan?["other_orders"] as JsonArray) ?? new JsonArray())
                if (Other(x) is { } order) scheduled.Orders.Add(order);
            if (scheduled.Turn > 0) sub.Scheduled.Add(scheduled);
        }
        // Standing orders: when this is seen, give these orders the next season; and those to cancel.
        foreach (var s in (o["standing_orders"] as JsonArray) ?? new JsonArray())
        {
            var when = S(s, "when");
            var named = S(s, "power");
            var standing = new StandingRequest
            {
                When = when == "unit_attacked" ? StandingWhen.UnitAttacked : StandingWhen.UnitEnters,
                Power = P(named),
                Province = Empty(S(s, "province")) is { } sp ? Prov(sp) : "",
                // The schema lists the events, so only a reply that ignores it lands here: refused with the reason, not dropped.
                Unreadable = when is not ("unit_enters" or "unit_attacked") ? "name the event it waits for: unit_enters or unit_attacked"
                    : when == "unit_enters" && named.Length > 0 && P(named) is null ? Nowhere(named, "") : null,
            };
            foreach (var u in (s?["units"] as JsonArray) ?? new JsonArray())
                if (Unit(u) is { } order) standing.Orders.Add(order);
            foreach (var x in (s?["other_orders"] as JsonArray) ?? new JsonArray())
                if (Other(x) is { } order) standing.Orders.Add(order);
            sub.Standing.Add(standing);
        }
        sub.CancelStanding = L(o, "cancel_standing");
        return sub;
    }

    /// <summary>Why a power named in an order cannot be read: none was named, or no power goes by that name.</summary>
    private static string Nowhere(string named, string what) =>
        named.Length == 0 ? $"name {what}" : $"there is no power called '{named}'";

    // A unit order that leaves out where to go, whom to support or what to carry still reaches the validator, which refuses
    // it with the reason (the unit then holds): an order is never dropped without its king being told.
    private static Order? Unit(JsonNode? u)
    {
        var unit = Prov(S(u, "unit"));
        var target = Empty(S(u, "target")) is { } t ? Prov(t) : "";
        var to = Empty(S(u, "to")) is { } d ? Prov(d) : null;
        Order? order = S(u, "order") switch
        {
            "move" => new MoveOrder(unit, target),
            "support" => new SupportOrder(unit, target, to),
            "convoy" => new ConvoyOrder(unit, target, to ?? ""),
            "disband" => new DisbandOrder(unit),
            "hold" => new HoldOrder(unit),
            _ => null,
        };
        return order;
    }

    private static Order? Other(JsonNode? x)
    {
        var person = S(x, "person");
        var amount = I(x, "amount");
        var province = Empty(S(x, "province")) is { } pr ? Prov(pr) : "";
        var named = S(x, "power");
        var power = P(named);
        // Seasons of service for hire and renew: 0 (or none given) means the usual 6; the engine keeps it to 1-30.
        var term = I(x, "term") is var t && t > 0 ? t : 6;
        var seals = L(x, "seals");
        Order? order = S(x, "action") switch
        {
            "raise_army" => new RaiseOrder(province, UnitKind.Army),
            "raise_fleet" => new RaiseOrder(province, UnitKind.Fleet),
            "buy_city" => new BuyProvinceOrder(province),
            "cede_province" when power is { } cp => new CedeProvinceOrder(province, cp),
            "cede_province" => new UnreadableOrder($"cede {province} to '{named}'", Nowhere(named, "the power to cede it to")),
            "give_unit" when power is { } gp => new GiftUnitOrder(province, gp),
            "give_unit" => new UnreadableOrder($"give {province} to '{named}'", Nowhere(named, "the power to give it to")),
            "seek_candidates" => new SeekCandidatesOrder(),
            "hire" => new HireOrder(person, amount, term),
            "renew" => new RenewOrder(person, amount, term),
            "dismiss" => new DismissOrder(person),
            "background_check" => new BackgroundCheckOrder(person, amount),
            "place_spy" when power is { } court => new PlaceSpyOrder(person, Court: court),
            "place_spy" when province.Length > 0 => new PlaceSpyOrder(person, Province: province),
            "place_spy" when named.Length > 0 => new UnreadableOrder($"send {person} to spy on '{named}'", Nowhere(named, "the court to watch")),
            // Neither a court nor a province: the validator refuses it with the reason, rather than the order vanishing.
            "place_spy" => new PlaceSpyOrder(person),
            "recall_spy" => new RecallSpyOrder(person),
            "counter_intelligence" => new CounterIntelOrder(amount),
            "assay" => new AssayOrder(S(x, "item")),
            "authenticate" => new AuthenticateOrder(S(x, "item"), amount),
            // Every seal must name a power: a forgery is never made with fewer seals than the king asked for.
            "forge" when seals.FirstOrDefault(n => P(n) is null) is { } bad => new UnreadableOrder($"have {person} forge a tablet sealed by {string.Join(", ", seals)}", Nowhere(bad, "")),
            "forge" => new ForgeOrder(person, S(x, "text"), seals.Select(P).OfType<Power>().ToList()),
            "captive_execute" => new CaptiveOrder(person, CaptiveFate.Execute),
            "captive_ransom" => new CaptiveOrder(person, CaptiveFate.Ransom, amount),
            "captive_turn" => new CaptiveOrder(person, CaptiveFate.Turn, Poison: S(x, "text")),
            "captive_release" => new CaptiveOrder(person, CaptiveFate.Release),
            "release_detained" => new ReleaseOrder(person, S(x, "text")),
            "pay_ransom" => new PayRansomOrder(person),
            _ => null,
        };
        return order;
    }

    /// <summary>
    /// The lines of the king's ledger of dealings, in an orders reply or an audience reply. The schema lists the courts, so
    /// a line can only name one of them. Lines written at an audience stay in the seat's own record and never join the
    /// <see cref="HostReply"/>, which the envoy's mind reads: the ledger is the king's alone.
    /// </summary>
    public static List<LedgerLine> Ledger(JsonObject o)
    {
        var lines = new List<LedgerLine>();
        foreach (var l in (o["ledger"] as JsonArray) ?? new JsonArray())
            if (P(S(l, "court")) is { } court) lines.Add(new LedgerLine(court, S(l, "entry")));
        return lines;
    }

    public static HostReply Host(JsonObject o) => new()
    {
        Speech = S(o, "speech"),
        Bribe = Math.Max(0, I(o, "gift_to_envoy")),
        BribeAsk = S(o, "gift_request"),
        JobOffer = Math.Max(0, I(o, "offer_service_wage")),
        SealProposal = B(o, "seal_tablet"),
        Detain = B(o, "detain_envoy"),
        GoldBack = Math.Max(0, I(o, "send_gold_back")),
        GoldBackPurity = Math.Clamp(I(o, "gold_back_purity") is 0 ? 100 : I(o, "gold_back_purity"), 10, 100),
        End = B(o, "end_audience"),
    };

    public static PresentResult Present(JsonObject o) => new() { Speech = S(o, "speech"), Skim = Math.Max(0, I(o, "keep_gold")) };

    public static EnvoyReaction React(JsonObject o) => new()
    {
        Speech = S(o, "speech"),
        AcceptBribe = B(o, "accept_gift"),
        AcceptJob = B(o, "accept_service"),
        Commitments = S(o, "commitments"),
    };

    public static MindReply Report(JsonObject o) => new() { Text = S(o, "report"), Number = Math.Max(0, I(o, "keep_gold")) };

    public static MindReply Pitch(JsonObject o) => new() { Text = S(o, "pitch"), Number = Math.Max(1, I(o, "asking_price")) };

    public static string Field(JsonObject o, string key) => S(o, key);
}
