using System.Text.Json.Nodes;
using Amarna.Engine;

namespace Amarna.Llm;

/// <summary>
/// JSON schemas for structured output. Every property is required (empty strings and zeros mean
/// "none"), so the shapes stay within what strict structured output accepts.
/// </summary>
public static class Schemas
{
    private static JsonObject Str(string? description = null) => With(new JsonObject { ["type"] = "string" }, description);
    private static JsonObject Int(string? description = null) => With(new JsonObject { ["type"] = "integer" }, description);
    private static JsonObject Bool(string? description = null) => With(new JsonObject { ["type"] = "boolean" }, description);
    private static JsonObject Enum(IEnumerable<string> values, string? description = null) =>
        With(new JsonObject { ["type"] = "string", ["enum"] = new JsonArray(values.Select(v => (JsonNode)v!).ToArray()) }, description);
    private static JsonObject Array(JsonObject items, string? description = null) => With(new JsonObject { ["type"] = "array", ["items"] = items }, description);

    private static JsonObject With(JsonObject o, string? description)
    {
        if (description is not null) o["description"] = description;
        return o;
    }

    public static JsonObject Object(params (string Name, JsonObject Schema)[] props)
    {
        var properties = new JsonObject();
        foreach (var (name, schema) in props) properties[name] = schema;
        return new JsonObject
        {
            ["type"] = "object",
            ["properties"] = properties,
            ["required"] = new JsonArray(props.Select(p => (JsonNode)p.Name!).ToArray()),
            ["additionalProperties"] = false,
        };
    }

    private static IEnumerable<string> PowerNames => Powers.All.Select(p => p.ToString());

    public static readonly string[] OtherActions =
    [
        "raise_army", "raise_fleet", "buy_city", "cede_province", "give_unit", "seek_candidates", "hire", "renew", "dismiss",
        "background_check", "place_spy", "recall_spy", "counter_intelligence", "assay", "authenticate", "forge",
        "captive_execute", "captive_ransom", "captive_turn", "captive_release", "release_detained", "pay_ransom",
    ];

    public static readonly string[] WakeTriggers = ["unit_moves", "envoy_returns", "treasury_below", "troops_enter", "province_changes_hands"];

    private static JsonObject UnitOrder() => Object(
        ("unit", Str("Province id where your unit stands.")),
        ("order", Enum(["hold", "move", "support", "convoy", "disband"])),
        ("target", Str("move: destination. support: the province of the unit supported, or of your own walled city to support its walls holding. convoy: province of the army. Otherwise empty.")),
        ("to", Str("support of a move, or convoy: the destination. Support to hold: empty.")));

    private static JsonObject OtherOrder() => Object(
        ("action", Enum(OtherActions)),
        ("province", Str("For raise, buy_city, cede_province, give_unit, or a province to spy on.")),
        ("power", Str("For cede_province, give_unit, or a court to spy on.")),
        ("person", Str("Person id, for hire, renew, dismiss, checks, spies, captives, release, ransom, forge.")),
        ("amount", Int("Wage (hire, renew), spend or ransom in shekels, as the action needs; else 0.")),
        ("term", Int("hire, renew: the seasons of service, 1-30 (0 means 6). Hire is only for people not in your service; renew keeps one of your own on, at your court or once they have given notice; else 0.")),
        ("text", Str("Forgery text, words for a released envoy, or what a turned spy should report.")),
        ("item", Str("Gold lot id for assay, tablet copy id for authenticate.")),
        ("seals", Array(Str(), "Powers whose seals a forgery bears.")));

    /// <summary>A king's orders. With sleeping seats on, it may also choose to sleep and schedule orders for later seasons.</summary>
    public static JsonObject LeaderOrders(GameConfig? c = null)
    {
        var o = LeaderOrdersBase(c?.SharedVictory ?? false);
        if (c is not { SleepingSeats: true }) return o;
        var props = (JsonObject)o["properties"]!;
        var required = (JsonArray)o["required"]!;
        props["sleep"] = Object(
            ("seasons", Int($"Seasons to skip before you are asked again: 0 = next season as usual, at most {c.MaxSleep}.")),
            ("wake_on", Array(Object(
                ("trigger", Enum(WakeTriggers)),
                ("province", Str("unit_moves: where the unit stands now. troops_enter, province_changes_hands: the province. Otherwise empty.")),
                ("person", Str("envoy_returns: the person id. Otherwise empty.")),
                ("amount", Int("treasury_below: shekels. Otherwise 0.")),
                ("power", Str("troops_enter: whose troops, or empty for any foreign power's."))),
                "Your own reasons to be woken sooner, on top of the usual ones.")));
        props["schedule"] = Array(Object(
            ("turn", Int("The season (turn number) these orders run in.")),
            ("units", Array(UnitOrder(), "Name each unit by the province it will stand in that season, after any earlier moves.")),
            ("other_orders", Array(OtherOrder()))),
            "Orders for later seasons (or this one). Secret, and checked when they run. An entry for a season replaces everything you scheduled for it; an entry with no orders cancels it.");
        required.Add("sleep");
        required.Add("schedule");
        return o;
    }

    private static JsonObject LeaderOrdersBase(bool sharedVictory) => Object(
        ("notes", Str("Private notes to yourself for next season: plans, promises made, suspicions.")),
        ("units", Array(UnitOrder())),
        ("letters", Array(Object(
            ("envoy", Str("Id of one of your people who is at court and ready.")),
            ("to", Enum(PowerNames)),
            ("message", Str("What the envoy should say, in your words.")),
            ("mandate", Str("What the envoy may agree to on your behalf.")),
            ("gold", Int("Shekels sent with the envoy, or 0.")),
            ("purity", Int("Purity of the gold in percent, 10-100. Below 100 is debased.")),
            // The sealed greeting is written from these flags alone: say what each one claims or withholds.
            ("call_brother", Bool("Greet the recipient as your brother, as Great Kings greet their equals, and wish well to his household and country. False withholds it: a slight.")),
            ("call_them_great_king", Bool("Give the recipient the title Great King. False denies him that rank.")),
            ("claim_great_king", Bool("Name yourself Great King in the greeting. False leaves your own title out.")),
            ("your_name_first", Bool("Put your own name before the recipient's: presumptuous, and the recipient will notice. False keeps the custom, his name first.")),
            ("omit_greeting", Bool("Send no greeting at all, which is a slight. The other greeting flags are then ignored.")),
            ("tablet_to_seal", Str("Text for both kings to seal, or empty.")),
            ("sworn_alliance", Bool(sharedVictory ? "Mark the tablet as a sworn alliance (counts for a shared victory)." : "Mark the tablet as a sworn alliance.")),
            ("show_tablet_copies", Array(Str(), "Ids of tablet copies you hold to show as evidence."))))),
        ("other_orders", Array(OtherOrder())));

    public static JsonObject HostReply() => Object(
        ("speech", Str("What you say to the envoy, to carry home.")),
        ("gift_to_envoy", Int("A personal gift (bribe) to the envoy in shekels, or 0. An envoy takes one gift per audience: once one is accepted, a later gift is not given.")),
        ("gift_request", Str("What you want from the envoy in return for the gift, or empty.")),
        ("offer_service_wage", Int("Offer the envoy service at this wage per season, or 0.")),
        ("seal_tablet", Bool("Seal the tablet the envoy brought, if any.")),
        ("detain_envoy", Bool()),
        ("send_gold_back", Int("Gold sent home with the envoy for their king, or 0. In a later exchange of the same audience, a new amount replaces the one you named before, and 0 keeps it.")),
        ("gold_back_purity", Int("Purity of that gold in percent, 10-100. The purity named with the amount that is sent applies.")),
        ("end_audience", Bool("End the audience now.")));

    public static JsonObject Present() => Object(
        ("speech", Str("What you say to the king, delivering your lord's message in your own words.")),
        ("keep_gold", Int("Shekels of the carried gold you quietly keep for yourself, or 0.")));

    public static JsonObject React() => Object(
        ("speech", Str("What you say in answer.")),
        ("accept_gift", Bool("Accept the king's personal gift, if one was offered.")),
        ("accept_service", Bool("Leave your lord and enter this king's service, if offered.")),
        ("commitments", Str("Anything you promised on your lord's behalf, or empty.")));

    public static JsonObject Report() => Object(
        ("report", Str("Your report to your lord.")),
        ("keep_gold", Int("Shekels of the gold you carry home that you quietly keep, or 0.")));

    public static JsonObject Pitch() => Object(
        ("pitch", Str("How you present yourself, in a few sentences.")),
        ("asking_price", Int("Your wage per season in shekels.")));

    public static JsonObject Text(string field, string description) => Object((field, Str(description)));
}
