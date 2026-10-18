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

    // "2,000" whatever the machine's culture: every king reads the same schema.
    private static string Thousands(int n) => n.ToString("N0", System.Globalization.CultureInfo.InvariantCulture);

    private static IEnumerable<string> PowerNames => Powers.All.Select(p => p.ToString());

    public static readonly string[] OtherActions =
    [
        "raise_army", "raise_fleet", "buy_city", "cede_province", "give_unit", "seek_candidates", "hire", "renew", "dismiss",
        "background_check", "place_spy", "recall_spy", "counter_intelligence", "assay", "authenticate", "forge",
        "captive_execute", "captive_ransom", "captive_turn", "captive_release", "release_detained", "pay_ransom",
    ];

    public static readonly string[] WakeTriggers = ["unit_moves", "envoy_returns", "treasury_below", "troops_enter", "province_changes_hands"];

    // The shapes of a unit order and of any other order. Repeated in the schedule and in standing orders; the copy in
    // standing orders leaves out the field descriptions, which are the same as above it, to keep the schema short.
    private static JsonObject UnitOrder(bool described = true) => Object(
        ("unit", Str(described ? "Province id where your unit stands." : null)),
        ("order", Enum(["hold", "move", "support", "convoy", "disband"])),
        ("target", Str(described ? "move: destination. support: the province of the unit supported, or of a bought walled city (yours or another king's) to support its walls holding. convoy: province of the army. Otherwise empty." : null)),
        ("to", Str(described ? "support of a move, or convoy: the destination. Support to hold: empty." : null)));

    private static JsonObject OtherOrder(bool described = true) => Object(
        ("action", Enum(OtherActions)),
        ("province", Str(described ? "For raise, buy_city, cede_province, give_unit, or a province to spy on." : null)),
        ("power", Str(described ? "For cede_province, give_unit, or a court to spy on." : null)),
        ("person", Str(described ? "Person id, for hire, renew, dismiss, checks, spies, captives, release, ransom, forge." : null)),
        ("amount", Int(described ? "Wage (hire, renew), spend or ransom in shekels, as the action needs; else 0." : null)),
        ("term", Int(described ? "hire, renew: the seasons of service, 1-30 (0 means 6). Hire is only for people not in your service; renew keeps one of your own on, at your court or once they have given notice; else 0." : null)),
        ("text", Str(described ? "Forgery text, words for a released envoy, or what a turned spy should report." : null)),
        ("item", Str(described ? "Gold lot id for assay, tablet copy id for authenticate." : null)),
        ("seals", Array(Str(), described ? "Powers whose seals a forgery bears." : null)));

    /// <summary>
    /// A king's orders. With sleeping seats on, it sleeps after them: it may name a season to be woken in, add its own
    /// reasons to be woken, schedule orders for later seasons, and give or cancel standing orders. Nothing here names the
    /// cap on its sleep.
    /// </summary>
    public static JsonObject LeaderOrders(GameConfig? c = null)
    {
        var o = LeaderOrdersBase(c?.SharedVictory ?? false);
        if (c is not { SleepingSeats: true }) return o;
        var props = (JsonObject)o["properties"]!;
        var required = (JsonArray)o["required"]!;
        props["sleep"] = With(Object(
            ("wake_in_turn", Int("A later season (turn number) to be woken in, or 0 for none. Something that concerns you may wake you sooner. Like wake_on, it holds only until you are next woken: name it again to keep it.")),
            ("wake_on", Array(Object(
                ("trigger", Enum(WakeTriggers)),
                ("province", Str("unit_moves: where the unit stands now. troops_enter, province_changes_hands: the province. Otherwise empty.")),
                ("person", Str("envoy_returns: the person id. Otherwise empty.")),
                ("amount", Int("treasury_below: shekels. Otherwise 0.")),
                ("power", Str("troops_enter: whose troops, or empty for any foreign power's."))),
                "Your own reasons to be woken, on top of the usual ones (at most 8). Each fires on a change after you set it, not on a state that lasts. They hold until you are next woken."))),
            "You sleep after these orders, until something concerns you. What else should wake you.");
        props["schedule"] = Array(Object(
            ("turn", Int("The season (turn number) these orders run in: any later season, or this one (an entry for this season counts as orders given now).")),
            ("units", Array(UnitOrder(), "Name each of your units by the province it stands in now: the order follows that unit, and is given from wherever it then stands.")),
            ("other_orders", Array(OtherOrder()))),
            $"Orders for later seasons (or this one). Secret, and checked when they run, after the orders you give that season. An entry for a season replaces everything you scheduled for it; an entry with no orders cancels it. At most {TurnEngine.MaxScheduledPerSeason} orders a season, for at most {TurnEngine.MaxScheduledSeasons} seasons. A scheduled order that is refused or fails wakes you; a scheduled move that is stopped is tried once more (see the rulebook).");
        props["standing_orders"] = Array(Object(
            ("when", Enum(["unit_enters", "unit_attacked"])),
            ("province", Str("unit_enters: the province entered. unit_attacked: where your unit stands now.")),
            ("power", Str("unit_enters: whose troops, or empty for any foreign power's. Otherwise empty.")),
            ("units", Array(UnitOrder(described: false), "As in schedule: your units named by where they stand now.")),
            ("other_orders", Array(OtherOrder(described: false), "As in other_orders."))),
            $"New standing orders, kept until they fire or you cancel them (at most {TurnEngine.MaxStanding} in all, each with at most {TurnEngine.MaxScheduledPerSeason} orders). When you see the event, the orders run the next season, once, before your scheduled orders; orders you give that season replace them. Firing does not wake you; an order of it that fails does.");
        props["cancel_standing"] = Array(Str(), "Ids of your standing orders to cancel (like s3), or \"all\".");
        required.Add("sleep");
        required.Add("schedule");
        required.Add("standing_orders");
        required.Add("cancel_standing");
        return o;
    }

    private static JsonObject LeaderOrdersBase(bool sharedVictory) => Object(
        ("notes", Str($"Private notes to yourself, at most {Thousands(LeaderJournal.NotesMax)} characters (longer notes are cut): plans, promises made, suspicions. They are shown in full the next {LeaderJournal.SeasonsShown} times you give orders, then leave your record.")),
        ("summary", Str($"Your own summary of the seasons before those shown in full: plans, promises, what you have learned. At most {Thousands(LeaderJournal.SummaryMax)} characters. It replaces your previous summary; leave it empty to keep it.")),
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
            ("claim_great_king", Bool("Name yourself Great King in the greeting. False names you only as king of your land, which the recipient reads as not claiming the rank.")),
            ("your_name_first", Bool("Put your own name before the recipient's: presumptuous, and the recipient will notice. False keeps the custom, his name first.")),
            ("omit_greeting", Bool("Send no greeting at all, which is a slight. The other greeting flags are then ignored.")),
            ("tablet_to_seal", Str("Text for both kings to seal, or empty.")),
            ("sworn_alliance", Bool(sharedVictory
                ? "Mark the tablet as a sworn alliance (counts for a shared victory)."
                : "Mark the tablet as a sworn alliance, an oath of alliance before the gods that every reader of the tablet sees. It changes no rule and binds nobody.")),
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
