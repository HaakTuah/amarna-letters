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
        "raise_army", "raise_fleet", "buy_city", "cede_province", "give_unit", "fortify", "seek_candidates", "hire", "renew", "dismiss",
        "background_check", "place_spy", "recall_spy", "counter_intelligence", "assay", "authenticate", "forge",
        "captive_execute", "captive_ransom", "captive_turn", "captive_release", "release_detained", "pay_ransom",
    ];

    // The shapes of a unit order and of any other order. Repeated in the schedule and in standing orders; the copy in
    // standing orders leaves out the field descriptions, which are the same as above it, to keep the schema short.
    private static JsonObject UnitOrder(bool described = true) => Object(
        ("unit", Str(described ? "Province id where your unit stands (sally: your walled city whose walls sally)." : null)),
        ("order", Enum(["hold", "move", "support", "convoy", "disband", "besiege", "sally"])),
        ("target", Str(described ? "move: destination. support: the province of the unit supported. convoy: province of the army. sally: the province the attack on the troops within your walls comes from. Otherwise empty (besiege: an army standing within walls you do not hold besieges that city)." : null)),
        ("to", Str(described ? "support of a move, or convoy: the destination. Support to hold: empty." : null)));

    private static JsonObject OtherOrder(bool described = true) => Object(
        ("action", Enum(OtherActions)),
        ("province", Str(described ? "For raise, buy_city, cede_province, give_unit, fortify (the province whose walls to strengthen), or a province to spy on." : null)),
        ("power", Str(described ? "For cede_province, give_unit, or a court to spy on." : null)),
        ("person", Str(described ? "Person id, for hire, renew, dismiss, checks, spies, captives, release, ransom, forge." : null)),
        ("amount", Int(described ? "Wage (hire, renew), spend or ransom in shekels, as the action needs; else 0." : null)),
        ("term", Int(described ? "hire, renew: the seasons of service, 1-30 (0 means 6). Hire is only for people not in your service; renew keeps one of your own on, at your court or once they have given notice; else 0." : null)),
        ("text", Str(described ? "Forgery text, words for a released envoy, or what a turned spy should report." : null)),
        ("item", Str(described ? "For assay, your mark for the gold (like g7), as your treasury gives it; for authenticate, your mark for your copy of the tablet (like k8), as your archive gives it." : null)),
        ("seals", Array(Str(), described ? "Powers whose seals a forgery bears." : null)));

    /// <summary>
    /// A king's orders. Every king may give and cancel standing orders (since the additions to the fix pass after item 4:
    /// "Every feature is every seat's"). With sleeping seats on, it sleeps after them until something concerns it: it never
    /// chooses when it wakes, so it also schedules orders for later seasons. Nothing here names the cap on its sleep.
    /// </summary>
    public static JsonObject LeaderOrders(GameConfig? c = null)
    {
        var o = LeaderOrdersBase(c?.SharedVictory ?? false);
        var sleeps = c is { SleepingSeats: true };
        var props = (JsonObject)o["properties"]!;
        var required = (JsonArray)o["required"]!;
        if (sleeps)
        {
            props["schedule"] = Array(Object(
                ("turn", Int("The season (turn number) these orders run in: any later season, or this one (an entry for this season counts as orders given now).")),
                ("units", Array(UnitOrder(), "Name each of your units by the province it stands in now: the order follows that unit, and is given from wherever it then stands. A unit a levy is to raise (one you order now or schedule for an earlier season): the province of the levy.")),
                ("other_orders", Array(OtherOrder()))),
                $"Orders for later seasons (or this one). Secret, and checked when they run, after the orders you give that season. An entry for a season replaces everything you scheduled for it; an entry with no orders cancels it. At most {TurnEngine.MaxScheduledPerSeason} orders a season, for at most {TurnEngine.MaxScheduledSeasons} seasons. A scheduled order wakes you only if others foil it, never if it is refused or fails by your own orders; a scheduled move that is stopped is tried once more (see the rulebook).");
            required.Add("schedule");
        }
        props["standing_orders"] = Array(Object(
            ("when", Enum(["unit_enters", "unit_attacked"])),
            ("province", Str("unit_enters: the province the troops move into. unit_attacked: where your unit stands now.")),
            ("power", Str("unit_enters: whose troops, or empty for any foreign power's. Otherwise empty.")),
            ("units", Array(UnitOrder(described: false), "As in units, each of your units named by the province it stands in now: the order follows that unit, and is given from wherever it then stands.")),
            ("other_orders", Array(OtherOrder(described: false), "As in other_orders."))),
            $"New standing orders, kept until they fire or you cancel them (at most {TurnEngine.MaxStanding} in all, each with at most {TurnEngine.MaxScheduledPerSeason} orders). When you see the move it waits for, its orders run in that same season, once, so they meet the move: they replace your other orders for the same units or people that season, those you give then among them{(sleeps ? " and your scheduled ones" : "")} (cancel it to stop it). It first fires in the season after you give it."
            + (sleeps ? " Firing does not wake you; an order of it that others foil does." : "")
            + " Giving one costs nothing; its orders cost what they cost when they run.");
        props["cancel_standing"] = Array(Str(), "Ids of your standing orders to cancel (like s3), or \"all\". Cancelled now, one does not fire this season.");
        required.Add("standing_orders");
        required.Add("cancel_standing");
        return o;
    }

    private static JsonObject LeaderOrdersBase(bool sharedVictory) => Object(
        ("notes", Str($"Private notes to yourself, at most {Thousands(LeaderJournal.NotesMax)} characters (longer notes are cut): plans, promises made, suspicions. They are shown in full the next {LeaderJournal.SeasonsShown} times you give orders, then leave your record.")),
        ("summary", Str($"Your own summary of the seasons before those shown in full: plans, promises, what you have learned. At most {Thousands(LeaderJournal.SummaryMax)} characters. It replaces your previous summary; leave it empty to keep it.")),
        ("ledger", Ledger()),
        ("units", Array(UnitOrder())),
        ("letters", Array(Letter(sharedVictory))),
        ("other_orders", Array(OtherOrder())));

    /// <summary>One letter: an envoy sent abroad. The same in an orders reply and in an audience held while the king's orders stand.</summary>
    private static JsonObject Letter(bool sharedVictory) => Object(
            ("envoy", Str("Id of one of your people who is at court and ready.")),
            ("to", Enum(PowerNames)),
            ("message", Str("What the envoy should say, in your words.")),
            ("mandate", Str("What the envoy may agree to on your behalf.")),
            ("gold", Int("Shekels sent with the envoy, or 0.")),
            ("purity", Int("Purity of the gold in percent, 10-100 (100 when you send none). Below 100 is debased.")),
            // The sealed greeting is written from these flags alone: say what each one claims or withholds.
            ("call_brother", Bool("Greet the recipient as your brother, as Great Kings greet their equals, and wish well to his household and country. False withholds it: a slight.")),
            ("call_them_great_king", Bool("Give the recipient the title Great King. False denies him that rank.")),
            ("claim_great_king", Bool("Name yourself Great King in the greeting. False names you only as king of your land, which the recipient reads as not claiming the rank.")),
            ("your_name_first", Bool("Put your own name before the recipient's: presumptuous, and the recipient will notice. False keeps the custom, his name first.")),
            ("omit_greeting", Bool("Send no greeting at all, which is a slight. The other greeting flags are then ignored.")),
            ("tablet_to_seal", Str("Text for both kings to seal, or empty.")),
            ("sworn_alliance", Bool(sharedVictory
                ? "Only with a tablet to seal (false without one): mark the tablet as a sworn alliance (counts for a shared victory)."
                : "Only with a tablet to seal (false without one): mark the tablet as a sworn alliance, an oath of alliance before the gods that every reader of the tablet sees. It changes no rule and binds nobody.")),
            ("show_tablet_copies", Array(Str(), "Your marks for the copies of tablets you hold (like k8), as your archive gives them, to show as evidence.")));

    /// <summary>The king's ledger of dealings, written the same way in an orders reply and in an audience reply.</summary>
    private static JsonObject Ledger() => Array(Object(
            ("court", Enum(PowerNames)),
            ("entry", Str($"At most {Thousands(LeaderJournal.LedgerEntryMax)} characters; empty removes that court's line."))),
        "Your ledger of dealings, in your own words, per court: what was promised, sealed, broken and paid. An entry replaces that court's line, an empty entry removes it, and courts you leave out keep their lines. It is shown in full whenever you give orders or hold an audience, and you may write it in either reply.");

    /// <summary>
    /// A host's reply at an audience, with every field (the schema's shape before "Requests are rules too": tests compare
    /// against it). A king that sleeps and was woken for its audiences only (its orders stand) may also send letters from the
    /// audience and choose whether to reopen its orders; at any other audience the reply has neither field.
    /// </summary>
    public static JsonObject HostReply(GameConfig? c = null, bool ordersStand = false) => HostReply(c, new AudienceAsks(OrdersStand: ordersStand));

    /// <summary>
    /// What a host is asked at one exchange of an audience, by the builder rule "Requests are rules too" (no field may imply
    /// something that is not true): whether to seal only while a tablet the envoy brought waits to be sealed, a gift only
    /// until the envoy has accepted one (an envoy takes one gift per audience), whether to end the audience only before its
    /// last exchange, and whether to reopen its orders only while its orders stand and it has not already chosen to.
    /// </summary>
    public readonly record struct AudienceAsks(bool OrdersStand = false, bool TabletToSeal = true, bool GiftOpen = true, bool LastExchange = false, bool ReopenChosen = false)
    {
        public static AudienceAsks Of(AudienceView a) => new(a.OrdersStand, a.Proposal is not null && !a.ProposalSealed, a.GiftAccepted == 0, a.Round >= a.MaxRounds, a.ReopenChosen);
    }

    /// <summary>A host's reply at this exchange of an audience: only the fields that apply to it (<see cref="AudienceAsks"/>).</summary>
    public static JsonObject HostReply(GameConfig? c, AudienceView a) => HostReply(c, AudienceAsks.Of(a));

    private static JsonObject HostReply(GameConfig? c, AudienceAsks asks)
    {
        var fields = new List<(string Name, JsonObject Schema)> { ("speech", Str("What you say to the envoy, to carry home.")) };
        if (asks.GiftOpen)
        {
            fields.Add(("gift_to_envoy", Int("A personal gift (bribe) to the envoy in shekels, or 0. An envoy takes one gift per audience: once one is accepted, a later gift is not given.")));
            fields.Add(("gift_request", Str("What you want from the envoy in return for the gift, or empty.")));
        }
        fields.Add(("offer_service_wage", Int("Offer the envoy service at this wage per season, or 0.")));
        if (asks.TabletToSeal) fields.Add(("seal_tablet", Bool("Seal the tablet the envoy brought.")));
        fields.Add(("detain_envoy", Bool("Keep the envoy at your court against its will: it does not go home when the audience ends.")));
        fields.Add(("send_gold_back", Int("Gold sent home with the envoy for their king, or 0. In a later exchange of the same audience, a new amount replaces the one you named before, and 0 keeps it.")));
        fields.Add(("gold_back_purity", Int("Purity of that gold in percent, 10-100 (100 when you send none). The purity named with the amount that is sent applies.")));
        if (!asks.LastExchange) fields.Add(("end_audience", Bool("End the audience now.")));
        if (asks.OrdersStand)
        {
            fields.Add(("letters", Array(Letter(c?.SharedVictory ?? false),
                "Envoys of yours to send from this audience, as the letters of your orders: they set out at the end of this season with everyone's orders and are checked like them, before any orders you give, and each costs what a letter in your orders costs. A new letter for a person you already sent this season replaces it. Empty for none.")));
            if (!asks.ReopenChosen)
                fields.Add(("reopen_orders", Bool("True if the news changes your plan: after your audiences you give orders this season with your full view, as when anything else wakes you. False: your orders stand and you sleep on. Once true, it holds for the season.")));
        }
        fields.Add(("ledger", Ledger()));
        return Object([.. fields]);
    }

    /// <summary>
    /// An envoy's presentation. The gold fields are asked only of an envoy that carries gold: one that carries none is not
    /// asked what it keeps of it (in the second agent simulation, asked every time, envoys spoke of gold they never had).
    /// Whether to swap the inventory is asked only of an envoy whose hand can fake a seal (<paramref name="canForge"/>):
    /// one without the skill could not use a forgery, so the question would offer it something it cannot do.
    /// </summary>
    public static JsonObject Present(bool carriesGold = true, bool canForge = true) => !carriesGold
        ? Object(("speech", Str(PresentSpeech)))
        : canForge
            ? Object(
                ("speech", Str(PresentSpeech)),
                ("keep_gold", Int(KeepGold)),
                ("swap_inventory", Bool(SwapInventory)))
            : Object(
                ("speech", Str(PresentSpeech)),
                ("keep_gold", Int(KeepGold)));

    private const string KeepGold = "Shekels of the gold you carry that you quietly keep for yourself, or 0.";

    private const string PresentSpeech = "What you say to the king, delivering your lord's message in your own words.";

    /// <summary>What an envoy that keeps gold, and whose hand can fake a seal (the only one asked), may do with the inventory tablet it carries.</summary>
    private const string SwapInventory = "Only if you keep some of the gold but not all of it: hand over, in place of the sealed inventory, one you forge yourself stating only what is left, so the shortfall goes unnoticed. A forged inventory can be found out if the king pays to have it examined, and you may then be named as its forger before every court.";

    /// <summary>
    /// An envoy's answer at an audience: whether to take a gift or a post only when one is offered (and a gift only while it
    /// can still be taken: an envoy takes one gift per audience, so a later one is not asked about).
    /// </summary>
    public static JsonObject React(bool giftOffered = true, bool serviceOffered = true)
    {
        var fields = new List<(string Name, JsonObject Schema)> { ("speech", Str("What you say in answer.")) };
        if (giftOffered) fields.Add(("accept_gift", Bool("Accept the king's personal gift.")));
        if (serviceOffered) fields.Add(("accept_service", Bool("Leave your lord and enter this king's service.")));
        fields.Add(("commitments", Str("Anything you promised on your lord's behalf, or empty.")));
        return Object([.. fields]);
    }

    /// <summary>
    /// An envoy's report home, with the gold fields only when it carries gold home (gold a host sent back with it), and the
    /// swap only when its hand can fake a seal, as in <see cref="Present"/>. An envoy whose king dismissed it while it was
    /// away (<paramref name="toLord"/> false) reports to the king who sent it, who is no longer its lord, and its schema
    /// says so as its request does ("Requests are rules too"; until the follow-up's review the schema still said "Your
    /// report to your lord.").
    /// </summary>
    public static JsonObject Report(bool carriesGold = true, bool canForge = true, bool toLord = true)
    {
        var report = ("report", Str(toLord ? ReportText : ReportToSender));
        return !carriesGold
            ? Object(report)
            : canForge
                ? Object(report, ("keep_gold", Int(KeepGoldHome)), ("swap_inventory", Bool(SwapInventory)))
                : Object(report, ("keep_gold", Int(KeepGoldHome)));
    }

    private const string KeepGoldHome = "Shekels of the gold you carry home that you quietly keep, or 0.";

    /// <summary>What an envoy's report is, as its schema says (a spy's report is "Your report home.").</summary>
    public const string ReportText = "Your report to your lord.";

    /// <summary>What the report of an envoy dismissed while away is: its king is no longer its lord.</summary>
    public const string ReportToSender = "Your report to the king who sent you on this mission.";

    public static JsonObject Pitch() => Object(
        ("pitch", Str("How you present yourself, in a few sentences.")),
        ("asking_price", Int("Your wage per season in shekels.")));

    public static JsonObject Text(string field, string description) => Object((field, Str(description)));
}
