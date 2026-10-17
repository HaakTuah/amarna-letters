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
        "raise_army", "raise_fleet", "buy_city", "cede_province", "give_unit", "seek_candidates", "hire", "dismiss",
        "background_check", "place_spy", "recall_spy", "counter_intelligence", "assay", "authenticate", "forge",
        "captive_execute", "captive_ransom", "captive_turn", "captive_release", "release_detained", "pay_ransom",
    ];

    public static JsonObject LeaderOrders() => Object(
        ("notes", Str("Private notes to yourself for next season: plans, promises made, suspicions.")),
        ("units", Array(Object(
            ("unit", Str("Province id where your unit stands.")),
            ("order", Enum(["hold", "move", "support", "convoy", "disband"])),
            ("target", Str("move: destination. support: province of the unit supported. convoy: province of the army. Otherwise empty.")),
            ("to", Str("support of a move, or convoy: the destination. Support to hold: empty."))))),
        ("letters", Array(Object(
            ("envoy", Str("Id of one of your people who is at court and ready.")),
            ("to", Enum(PowerNames)),
            ("message", Str("What the envoy should say, in your words.")),
            ("mandate", Str("What the envoy may agree to on your behalf.")),
            ("gold", Int("Shekels sent with the envoy, or 0.")),
            ("purity", Int("Purity of the gold in percent, 10-100. Below 100 is debased.")),
            ("call_brother", Bool()),
            ("call_them_great_king", Bool()),
            ("claim_great_king", Bool()),
            ("your_name_first", Bool()),
            ("omit_greeting", Bool()),
            ("tablet_to_seal", Str("Text for both kings to seal, or empty.")),
            ("sworn_alliance", Bool("Mark the tablet as a sworn alliance (counts for a shared victory).")),
            ("show_tablet_copies", Array(Str(), "Ids of tablet copies you hold to show as evidence."))))),
        ("other_orders", Array(Object(
            ("action", Enum(OtherActions)),
            ("province", Str("For raise, buy_city, cede_province, give_unit, or a province to spy on.")),
            ("power", Str("For cede_province, give_unit, or a court to spy on.")),
            ("person", Str("Person id, for hire, dismiss, checks, spies, captives, release, ransom, forge.")),
            ("amount", Int("Wage, spend or ransom in shekels, as the action needs; else 0.")),
            ("text", Str("Forgery text, words for a released envoy, or what a turned spy should report.")),
            ("item", Str("Gold lot id for assay, tablet copy id for authenticate.")),
            ("seals", Array(Str(), "Powers whose seals a forgery bears."))))));

    public static JsonObject HostReply() => Object(
        ("speech", Str("What you say to the envoy, to carry home.")),
        ("gift_to_envoy", Int("A personal gift (bribe) to the envoy in shekels, or 0.")),
        ("gift_request", Str("What you want from the envoy in return for the gift, or empty.")),
        ("offer_service_wage", Int("Offer the envoy service at this wage per season, or 0.")),
        ("seal_tablet", Bool("Seal the tablet the envoy brought, if any.")),
        ("detain_envoy", Bool()),
        ("send_gold_back", Int("Gold sent home with the envoy for their king, or 0.")),
        ("gold_back_purity", Int("Purity of that gold in percent, 10-100.")),
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
