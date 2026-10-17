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
        var sub = new TurnSubmission { Notes = S(o, "notes") };

        foreach (var u in (o["units"] as JsonArray) ?? new JsonArray())
        {
            var unit = Prov(S(u, "unit"));
            var target = Empty(S(u, "target")) is { } t ? Prov(t) : null;
            var to = Empty(S(u, "to")) is { } d ? Prov(d) : null;
            Order? order = S(u, "order") switch
            {
                "move" when target is not null => new MoveOrder(unit, target),
                "support" when target is not null => new SupportOrder(unit, target, to),
                "convoy" when target is not null && to is not null => new ConvoyOrder(unit, target, to),
                "disband" => new DisbandOrder(unit),
                "hold" => new HoldOrder(unit),
                _ => null,
            };
            if (order is not null) sub.Orders.Add(order);
        }

        foreach (var l in (o["letters"] as JsonArray) ?? new JsonArray())
        {
            if (P(S(l, "to")) is not { } to) continue;
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
        {
            var person = S(x, "person");
            var amount = I(x, "amount");
            var province = Empty(S(x, "province")) is { } pr ? Prov(pr) : "";
            var power = P(S(x, "power"));
            Order? order = S(x, "action") switch
            {
                "raise_army" => new RaiseOrder(province, UnitKind.Army),
                "raise_fleet" => new RaiseOrder(province, UnitKind.Fleet),
                "buy_city" => new BuyProvinceOrder(province),
                "cede_province" when power is { } cp => new CedeProvinceOrder(province, cp),
                "give_unit" when power is { } gp => new GiftUnitOrder(province, gp),
                "seek_candidates" => new SeekCandidatesOrder(),
                "hire" => new HireOrder(person, amount, 6),
                "dismiss" => new DismissOrder(person),
                "background_check" => new BackgroundCheckOrder(person, amount),
                "place_spy" when power is { } court => new PlaceSpyOrder(person, Court: court),
                "place_spy" when province.Length > 0 => new PlaceSpyOrder(person, Province: province),
                "recall_spy" => new RecallSpyOrder(person),
                "counter_intelligence" => new CounterIntelOrder(amount),
                "assay" => new AssayOrder(S(x, "item")),
                "authenticate" => new AuthenticateOrder(S(x, "item"), amount),
                "forge" => new ForgeOrder(person, S(x, "text"), L(x, "seals").Select(P).OfType<Power>().ToList()),
                "captive_execute" => new CaptiveOrder(person, CaptiveFate.Execute),
                "captive_ransom" => new CaptiveOrder(person, CaptiveFate.Ransom, amount),
                "captive_turn" => new CaptiveOrder(person, CaptiveFate.Turn, Poison: S(x, "text")),
                "captive_release" => new CaptiveOrder(person, CaptiveFate.Release),
                "release_detained" => new ReleaseOrder(person, S(x, "text")),
                "pay_ransom" => new PayRansomOrder(person),
                _ => null,
            };
            if (order is not null) sub.Orders.Add(order);
        }
        return sub;
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
