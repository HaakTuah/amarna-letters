/**
 * The model schemas, defined once in Zod ("One source for model schemas"): the reply types are derived from them, every
 * reply is validated against them, and the same definitions go to the providers as JSON schemas ({@link jsonSchema}). They
 * stay small enough to compile: every field required (the model writes the default instead of leaving one out), one flat
 * shape per reply with a field naming an order's type, and provinces, units and people as plain strings the engine checks.
 * `Replies` builds the Zod objects; `Schemas` gives the JSON schemas sent, for the request text and the tests.
 */
import { z } from "zod";
import { AllPowers, MaxAnswerSay, MaxAnswers, MaxConditions, MaxScheduledPerSeason, MaxScheduledSeasons, MaxStanding, fmtN, type AudienceView, type GameConfig } from "@amarna/engine";
import { LeaderJournal } from "./journal.ts";

export type JsonObject = { [key: string]: unknown };

/** One reply's schema: a Zod object of required fields. */
export type ReplySchema = z.ZodObject<z.ZodRawShape>;

const withDescription = <T extends z.ZodType>(t: T, description: string | null): T => (description !== null ? t.describe(description) : t);
const str = (description: string | null = null) => withDescription(z.string(), description);
const int = (description: string | null = null) => withDescription(z.int(), description);
const bool = (description: string | null = null) => withDescription(z.boolean(), description);
const enumOf = <const T extends readonly [string, ...string[]]>(values: T, description: string | null = null) => withDescription(z.enum(values), description);
const array = <T extends z.ZodType>(items: T, description: string | null = null) => withDescription(z.array(items), description);

/** An object of required fields, in the order given. */
export function object(...props: [string, z.ZodType][]): ReplySchema {
  const shape: Record<string, z.ZodType> = {};
  for (const [name, schema] of props) shape[name] = schema;
  return z.object(shape);
}

/** The JSON schema a reply schema is sent as: Zod's own, without the dialect line or the safe-integer bounds it adds. */
export function jsonSchema(schema: z.ZodType): JsonObject {
  const out = z.toJSONSchema(schema) as JsonObject;
  delete out.$schema;
  const strip = (n: unknown): void => {
    if (n === null || typeof n !== "object") return;
    if (Array.isArray(n)) {
      for (const x of n) strip(x);
      return;
    }
    const o = n as JsonObject;
    if (o.type === "integer" && o.minimum === Number.MIN_SAFE_INTEGER && o.maximum === Number.MAX_SAFE_INTEGER) {
      delete o.minimum;
      delete o.maximum;
    }
    // A field's description reads after its type, as an agent reading the schema expects.
    if (typeof o.description === "string") {
      const d = o.description;
      delete o.description;
      o.description = d;
    }
    for (const v of Object.values(o)) strip(v);
  };
  strip(out);
  return out;
}

/** What a schema holds that providers limit: optional properties, union-typed ones, and objects not closed to others. */
export interface SchemaMeasure {
  optional: number;
  unions: number;
  open: number;
}

/** Measures a JSON schema, as sent, against what providers limit ({@link SchemaMeasure}). */
export function measure(schema: JsonObject): SchemaMeasure {
  const m: SchemaMeasure = { optional: 0, unions: 0, open: 0 };
  const walk = (n: unknown): void => {
    if (n === null || typeof n !== "object") return;
    if (Array.isArray(n)) return n.forEach(walk);
    const o = n as JsonObject;
    if (Array.isArray(o.type) || Array.isArray(o.anyOf) || Array.isArray(o.oneOf)) m.unions++;
    if (o.type === "object") {
      const props = Object.keys((o.properties as JsonObject | undefined) ?? {});
      const required = (o.required as string[] | undefined) ?? [];
      m.optional += props.filter((k) => !required.includes(k)).length;
      if (o.additionalProperties !== false) m.open++;
    }
    for (const v of Object.values(o)) walk(v);
  };
  walk(schema);
  return m;
}

/** Where a reply breaks its schema, at most eight problems, each with its path ("units[0].order: ..."); empty when it fits. */
export function problems(reply: unknown, schema: z.ZodType): string[] {
  const r = schema.safeParse(reply);
  if (r.success) return [];
  return r.error.issues.slice(0, 8).map((i) => {
    const path = i.path.reduce<string>((s, k) => (typeof k === "number" ? `${s}[${k}]` : s.length === 0 ? String(k) : `${s}.${String(k)}`), "");
    return `${path.length === 0 ? "reply" : path}: ${i.message}`;
  });
}

// "2,000" whatever the machine's culture: every king reads the same schema.
const thousands = (n: number): string => fmtN(n, 0);

const powerNames = AllPowers as unknown as readonly [string, ...string[]];

export const OtherActions = [
  "raise_army",
  "raise_fleet",
  "buy_city",
  "cede_province",
  "give_unit",
  "fortify",
  "seek_candidates",
  "hire",
  "renew",
  "dismiss",
  "background_check",
  "place_spy",
  "recall_spy",
  "counter_intelligence",
  "assay",
  "authenticate",
  "forge",
  "captive_execute",
  "captive_ransom",
  "captive_turn",
  "captive_release",
  "release_detained",
  "pay_ransom",
] as const;

// The shapes of a unit order and of any other order. Repeated in the schedule and in standing orders; the copy in standing
// orders leaves out the field descriptions, which are the same as above it, to keep the schema short.
const unitOrder = (described = true): ReplySchema =>
  object(
    ["unit", str(described ? "Province id where your unit stands (sally: your walled city whose walls sally)." : null)],
    ["order", enumOf(["hold", "move", "support", "convoy", "disband", "besiege", "sally"])],
    [
      "target",
      str(
        described
          ? "move: destination. support: the province of the unit supported. convoy: province of the army. sally: the province the attack on the troops within your walls comes from. Otherwise empty (besiege: an army standing within walls you do not hold besieges that city)."
          : null,
      ),
    ],
    ["to", str(described ? "support of a move, or convoy: the destination. Support to hold: empty." : null)],
  );

const otherOrder = (described = true): ReplySchema =>
  object(
    ["action", enumOf(OtherActions)],
    [
      "province",
      str(described ? "For raise, buy_city, cede_province, give_unit, fortify (the province whose walls to strengthen), or a province to spy on." : null),
    ],
    ["power", str(described ? "For cede_province, give_unit, or a court to spy on." : null)],
    ["person", str(described ? "Person id, for hire, renew, dismiss, checks, spies, captives, release, ransom, forge." : null)],
    ["amount", int(described ? "Wage (hire, renew), spend or ransom in shekels, as the action needs; else 0." : null)],
    [
      "term",
      int(
        described
          ? "hire, renew: the seasons of service, 1-30 (0 means 6). Hire is only for people not in your service; renew keeps one of your own on, at your court or once they have given notice; else 0."
          : null,
      ),
    ],
    ["text", str(described ? "Forgery text, words for a released envoy, or what a turned spy should report." : null)],
    [
      "item",
      str(
        described
          ? "For assay, your mark for the gold (like g7), as your treasury gives it; for authenticate, your mark for your copy of the tablet (like k8), as your archive gives it."
          : null,
      ),
    ],
    ["seals", array(str(), described ? "Powers whose seals a forgery bears." : null)],
  );

/**
 * The conditions of a scheduled entry, a standing order or a standing answer, in the engine's own vocabulary ("Scheduled,
 * conditional orders"): read when they would run, from what the king knows then.
 */
const conditions = (what: string): z.ZodType =>
  array(
    object(
      ["test", enumOf(["if", "unless"])],
      ["kind", enumOf(["troops_in", "treasury_less_than", "treasury_at_least", "envoy_back", "tablet_sealed"])],
      ["power", str("troops_in: whose troops, or empty for any foreign power's. tablet_sealed: the court that sealed it with you, or empty for any. Otherwise empty.")],
      ["province", str("troops_in: the province. Otherwise empty.")],
      ["amount", int("treasury_less_than, treasury_at_least: shekels. Otherwise 0.")],
      ["person", str("envoy_back: the id of one of your people (like c3), back at your court and ready. Otherwise empty.")],
    ),
    `${what} only if every "if" holds and no "unless" does, as you know things then (see CONDITIONS). At most ${MaxConditions}; empty for none.`,
  );

/**
 * A king's standing answers ("Standing answers" under "Minds follow what is at stake"): its own answers given in advance
 * for the envoys that arrive at its court, in the engine's vocabulary; and the ids of those it cancels.
 */
const standingAnswers = (): [string, z.ZodType][] => [
  [
    "standing_answers",
    array(
      object(
        ["from", str("Whose envoys it answers: a court, or empty for any court's.")],
        ["brings", enumOf(["anything", "words", "gold", "tablet"])],
        ["min_gold", int("gold: the least his inventory must state, in shekels. Otherwise 0.")],
        ["seal", bool("tablet or anything: set your seal on the tablet he brings. Otherwise false.")],
        ["gold_back_percent", int("The share of the gold he brings to send back with him for his lord, 0-100 (100: a gift of like value). 0 for none.")],
        ["say", str(`The gist of what you say to him, in your own words, at most ${MaxAnswerSay} characters; your scribes word it.`)],
        ["conditions", conditions("It answers")],
      ),
      `New standing answers (at most ${MaxAnswers} in all), kept until you cancel them: the engine answers for you, in one exchange and for nothing, an envoy one covers, and he wakes nobody (see STANDING ANSWERS). Empty for none.`,
    ),
  ],
  ["cancel_answers", array(str(), 'Ids of your standing answers to cancel (like a2), or "all".')],
];

/**
 * A king's orders. Every king may give and cancel standing orders. With sleeping seats on, it sleeps after them until
 * something concerns it: it never chooses when it wakes, so it also schedules orders for later seasons.
 */
function leaderOrders(c: GameConfig | null = null): ReplySchema {
  const props = leaderOrdersBase(c?.sharedVictory ?? false);
  const sleeps = c !== null && c.sleepingSeats;
  if (sleeps) {
    props.push([
      "schedule",
      array(
        object(
          ["turn", int("The season (turn number) these orders run in: any later season, or this one (an entry for this season counts as orders given now).")],
          [
            "units",
            array(
              unitOrder(),
              "Name each of your units by the province it stands in now: the order follows that unit, and is given from wherever it then stands. A unit a levy is to raise (one you order now or schedule for an earlier season): the province of the levy.",
            ),
          ],
          ["other_orders", array(otherOrder())],
          ["conditions", conditions("They run")],
        ),
        `Orders for later seasons (or this one). Secret, and checked when they run, after the orders you give that season. The entries you give for a season together replace everything you scheduled for it, each with its own conditions; an entry with no orders cancels it. At most ${MaxScheduledPerSeason} orders a season, for at most ${MaxScheduledSeasons} seasons. A scheduled order wakes you only if others foil it, never if it is refused or fails by your own orders; a scheduled move that is stopped is tried once more (see the rulebook).`,
      ),
    ]);
  }
  props.push([
    "standing_orders",
    array(
      object(
        ["when", enumOf(["unit_enters", "unit_attacked"])],
        ["province", str("unit_enters: the province the troops move into. unit_attacked: where your unit stands now.")],
        ["power", str("unit_enters: whose troops, or empty for any foreign power's. Otherwise empty.")],
        [
          "units",
          array(
            unitOrder(false),
            "As in units, each of your units named by the province it stands in now: the order follows that unit, and is given from wherever it then stands.",
          ),
        ],
        ["other_orders", array(otherOrder(false), "As in other_orders.")],
        ["conditions", conditions("When its move comes, it fires")],
      ),
      `New standing orders, kept until they fire or you cancel them (at most ${MaxStanding} in all, each with at most ${MaxScheduledPerSeason} orders). When you see the move it waits for, its orders run in that same season, once, so they meet the move: they replace your other orders for the same units or people that season, those you give then among them${sleeps ? " and your scheduled ones" : ""} (cancel it to stop it). It first fires in the season after you give it.` +
        (sleeps ? " Firing does not wake you; an order of it that others foil does." : "") +
        " Giving one costs nothing; its orders cost what they cost when they run.",
    ),
  ]);
  props.push(["cancel_standing", array(str(), 'Ids of your standing orders to cancel (like s3), or "all". Cancelled now, one does not fire this season.')]);
  props.push(...standingAnswers());
  return object(...props);
}

const leaderOrdersBase = (sharedVictory: boolean): [string, z.ZodType][] => [
  [
    "notes",
    str(
      `Private notes to yourself, at most ${thousands(LeaderJournal.NotesMax)} characters (longer notes are cut): plans, promises made, suspicions. They are shown in full the next time you give orders, by their opening words the ${LeaderJournal.SeasonsShown - 1} times after, then leave your record: put what matters most first.`,
    ),
  ],
  [
    "summary",
    str(
      `Your own summary of the seasons before those shown in full: plans, promises, what you have learned. At most ${thousands(LeaderJournal.SummaryMax)} characters. It replaces your previous summary; leave it empty to keep it.`,
    ),
  ],
  ["ledger", ledger()],
  ["units", array(unitOrder())],
  ["letters", array(letter(sharedVictory))],
  ["other_orders", array(otherOrder())],
];

/** One letter: an envoy sent abroad. The same in an orders reply and in an audience held while the king's orders stand. */
const letter = (sharedVictory: boolean): ReplySchema =>
  object(
    ["envoy", str("Id of one of your people who is at court and ready.")],
    ["to", enumOf(powerNames)],
    ["message", str("What the envoy should say, in your words.")],
    ["mandate", str("What the envoy may agree to on your behalf.")],
    ["gold", int("Shekels sent with the envoy, or 0.")],
    ["purity", int("Purity of the gold in percent, 10-100 (100 when you send none). Below 100 is debased.")],
    // The sealed greeting is written from these flags alone: say what each one claims or withholds.
    [
      "call_brother",
      bool("Greet the recipient as your brother, as Great Kings greet their equals, and wish well to his household and country. False withholds it: a slight."),
    ],
    ["call_them_great_king", bool("Give the recipient the title Great King. False denies him that rank.")],
    [
      "claim_great_king",
      bool("Name yourself Great King in the greeting. False names you only as king of your land, which the recipient reads as not claiming the rank."),
    ],
    ["your_name_first", bool("Put your own name before the recipient's: presumptuous, and the recipient will notice. False keeps the custom, his name first.")],
    ["omit_greeting", bool("Send no greeting at all, which is a slight. The other greeting flags are then ignored.")],
    ["tablet_to_seal", str("Text for both kings to seal, or empty.")],
    [
      "sworn_alliance",
      bool(
        sharedVictory
          ? "Only with a tablet to seal (false without one): mark the tablet as a sworn alliance (counts for a shared victory)."
          : "Only with a tablet to seal (false without one): mark the tablet as a sworn alliance, an oath of alliance before the gods that every reader of the tablet sees. It changes no rule and binds nobody.",
      ),
    ],
    ["show_tablet_copies", array(str(), "Your marks for the copies of tablets you hold (like k8), as your archive gives them, to show as evidence.")],
  );

/** The king's ledger of dealings, written the same way in an orders reply and in an audience reply. */
const ledger = () =>
  array(
    object(["court", enumOf(powerNames)], ["entry", str(`At most ${thousands(LeaderJournal.LedgerEntryMax)} characters; empty removes that court's line.`)]),
    "Your ledger of dealings, in your own words, per court: what was promised, sealed, broken and paid. An entry replaces that court's line, an empty entry removes it, and courts you leave out keep their lines. It is shown in full whenever you give orders or hold an audience, and you may write it in either reply.",
  );

/**
 * What a host is asked at one exchange of an audience, by the builder rule "Requests are rules too": whether to seal only
 * while a tablet the envoy brought waits to be sealed, a gift only until the envoy has accepted one, whether to end the
 * audience only before its last exchange, and whether to reopen its orders only while its orders stand and it has not
 * already chosen to.
 */
export interface AudienceAsks {
  ordersStand: boolean;
  tabletToSeal: boolean;
  giftOpen: boolean;
  lastExchange: boolean;
  reopenChosen: boolean;
}

export function asksOf(a: AudienceView): AudienceAsks {
  return {
    ordersStand: a.ordersStand,
    tabletToSeal: a.proposal !== null && !a.proposalSealed,
    giftOpen: a.giftAccepted === 0,
    lastExchange: a.round >= a.maxRounds,
    reopenChosen: a.reopenChosen,
  };
}

/** A host's reply with every field, or at one exchange of an audience: only the fields that apply to it. */
function hostReply(c: GameConfig | null = null, a: AudienceView | boolean = false): ReplySchema {
  const asks: AudienceAsks =
    typeof a === "boolean" ? { ordersStand: a, tabletToSeal: true, giftOpen: true, lastExchange: false, reopenChosen: false } : asksOf(a);
  const fields: [string, z.ZodType][] = [["speech", str("What you say to the envoy, to carry home.")]];
  if (asks.giftOpen) {
    fields.push([
      "gift_to_envoy",
      int("A personal gift (bribe) to the envoy in shekels, or 0. An envoy takes one gift per audience: once one is accepted, a later gift is not given."),
    ]);
    fields.push(["gift_request", str("What you want from the envoy in return for the gift, or empty.")]);
  }
  fields.push(["offer_service_wage", int("Offer the envoy service at this wage per season, or 0.")]);
  if (asks.tabletToSeal) fields.push(["seal_tablet", bool("Seal the tablet the envoy brought.")]);
  fields.push(["detain_envoy", bool("Keep the envoy at your court against its will: it does not go home when the audience ends.")]);
  fields.push([
    "send_gold_back",
    int(
      "Gold sent home with the envoy for their king, or 0. In a later exchange of the same audience, a new amount replaces the one you named before, and 0 keeps it.",
    ),
  ]);
  fields.push([
    "gold_back_purity",
    int("Purity of that gold in percent, 10-100 (100 when you send none). The purity named with the amount that is sent applies."),
  ]);
  if (!asks.lastExchange) fields.push(["end_audience", bool("End the audience now.")]);
  if (asks.ordersStand) {
    fields.push([
      "letters",
      array(
        letter(c?.sharedVictory ?? false),
        "Envoys of yours to send from this audience, as the letters of your orders: they set out at the end of this season with everyone's orders and are checked like them, before any orders you give, and each costs what a letter in your orders costs. A new letter for a person you already sent this season replaces it. Empty for none.",
      ),
    ]);
    if (!asks.reopenChosen)
      fields.push([
        "reopen_orders",
        bool(
          "True if the news changes your plan: after your audiences you give orders this season with your full view, as when anything else wakes you. False: your orders stand and you sleep on. Once true, it holds for the season.",
        ),
      ]);
  }
  fields.push(["ledger", ledger()]);
  return object(...fields);
}

/**
 * What a king is asked when it holds court ("One call per wake-up"): one answer for every envoy before it, each by the
 * envoy's id, in one call. The shape of an answer is the same at every court of the game, so the request's fixed part,
 * which a provider caches together with the schema, stays the same from call to call; a field that does not apply to an
 * envoy says so, and the engine ignores it there (Schemas.asksOf). With its orders standing it may also send letters and,
 * unless it has already chosen to, reopen its orders.
 */
function courtReply(c: GameConfig | null = null, ordersStand = false, reopenChosen = false): ReplySchema {
  const answer = object(
    ["envoy", str("The id of the envoy you answer (like c13), as the audience names him.")],
    ["speech", str("What you say to this envoy, to carry home.")],
    [
      "gift_to_envoy",
      int("A personal gift (bribe) to the envoy in shekels, or 0. An envoy takes one gift per audience: once he has accepted one, a later gift is not given."),
    ],
    ["gift_request", str("What you want from the envoy in return for the gift, or empty.")],
    ["offer_service_wage", int("Offer the envoy service at this wage per season, or 0.")],
    ["seal_tablet", bool("Only if this envoy brought a tablet you have not yet chosen to seal: seal it. False otherwise.")],
    ["detain_envoy", bool("Keep the envoy at your court against its will: it does not go home when the audience ends.")],
    [
      "send_gold_back",
      int("Gold sent home with the envoy for their king, or 0. In a later exchange of the same audience, a new amount replaces the one you named before, and 0 keeps it."),
    ],
    ["gold_back_purity", int("Purity of that gold in percent, 10-100 (100 when you send none). The purity named with the amount that is sent applies.")],
    ["end_audience", bool("End this audience now. At the last exchange of an audience it ends with your answer whatever you choose.")],
  );
  const fields: [string, z.ZodType][] = [["answers", array(answer, "One answer for each envoy before you, by his id.")], ...standingAnswers()];
  if (ordersStand) {
    fields.push([
      "letters",
      array(
        letter(c?.sharedVictory ?? false),
        "Envoys of yours to send from your court, as the letters of your orders: they set out at the end of this season with everyone's orders and are checked like them, before any orders you give, and each costs what a letter in your orders costs. A new letter for a person you already sent this season replaces it. Empty for none.",
      ),
    ]);
    if (!reopenChosen)
      fields.push([
        "reopen_orders",
        bool(
          "True if the news changes your plan: after your audiences you give orders this season with your full view, as when anything else wakes you. False: your orders stand and you sleep on. Once true, it holds for the season.",
        ),
      ]);
  }
  fields.push(["ledger", ledger()]);
  return object(...fields);
}

const KeepGold = "Shekels of the gold you carry that you quietly keep for yourself, or 0.";
const PresentSpeech = "Only if as_written is false: what you say to the king, delivering your lord's message in your own words. Empty if as_written is true.";
/** Passing the lord's words on as written: the engine reads them out, and the envoy writes nothing ("Output is the other half"). */
const AsWritten: [string, z.ZodType] = [
  "as_written",
  bool("True: you deliver your lord's message word for word, as he wrote it, and say nothing of your own (leave speech empty). False: you deliver it in your own words, in speech."),
];
/** What an envoy that keeps gold, and whose hand can fake a seal (the only one asked), may do with the inventory tablet it carries. */
const SwapInventory =
  "Only if you keep some of the gold but not all of it: hand over, in place of the sealed inventory, one you forge yourself stating only what is left, so the shortfall goes unnoticed. A forged inventory can be found out if the king pays to have it examined, and you may then be named as its forger before every court.";

/** An envoy's presentation: the gold fields only of an envoy that carries gold, the swap only of one whose hand can fake a seal. */
function present(carriesGold = true, canForge = true): ReplySchema {
  if (!carriesGold) return object(AsWritten, ["speech", str(PresentSpeech)]);
  return canForge
    ? object(AsWritten, ["speech", str(PresentSpeech)], ["keep_gold", int(KeepGold)], ["swap_inventory", bool(SwapInventory)])
    : object(AsWritten, ["speech", str(PresentSpeech)], ["keep_gold", int(KeepGold)]);
}

/** An envoy's answer at an audience: whether to take a gift or a post only when one is offered. */
function react(giftOffered = true, serviceOffered = true): ReplySchema {
  const fields: [string, z.ZodType][] = [["speech", str("What you say in answer.")]];
  if (giftOffered) fields.push(["accept_gift", bool("Accept the king's personal gift.")]);
  if (serviceOffered) fields.push(["accept_service", bool("Leave your lord and enter this king's service.")]);
  fields.push(["commitments", str("Anything you promised on your lord's behalf, or empty.")]);
  return object(...fields);
}

const KeepGoldHome = "Shekels of the gold you carry home that you quietly keep, or 0.";
/** What an envoy's report is, as its schema says (a spy's report is "Your report home."). */
export const ReportText = "Your report to your lord.";
/** What the report of an envoy dismissed while away is: its king is no longer its lord. */
export const ReportToSender = "Your report to the king who sent you on this mission.";

/**
 * An envoy's report home, with the gold fields only when it carries gold home, and the swap only when its hand can fake a
 * seal; after an audience, also the choice to report the king's answer as given, which the engine then writes.
 */
function report(carriesGold = true, canForge = true, toLord = true, received = false): ReplySchema {
  const fields: [string, z.ZodType][] = [];
  if (received)
    fields.push([
      "as_given",
      bool("True: you report the king's answer word for word, as he gave it, with what happened, and add nothing of your own (leave report empty). False: you write your report yourself."),
    ]);
  fields.push(["report", str((received ? "Only if as_given is false: " : "") + (toLord ? ReportText : ReportToSender))]);
  if (carriesGold) fields.push(["keep_gold", int(KeepGoldHome)]);
  if (carriesGold && canForge) fields.push(["swap_inventory", bool(SwapInventory)]);
  return object(...fields);
}

const pitch = (): ReplySchema =>
  object(["pitch", str("How you present yourself, in a few sentences.")], ["asking_price", int("Your wage per season in shekels.")]);

const text = (field: string, description: string): ReplySchema => object([field, str(description)]);

/** A phrasing call's reply: only the words. */
const phrase = (): ReplySchema => object(["speech", str("The king's words to the envoy, as he would speak them, in one to three sentences.")]);

/** The reply schemas in Zod, as calls carry them. */
export const Replies = { leaderOrders, hostReply, courtReply, phrase, present, react, report, pitch, text };

/** The same schemas as the JSON sent to a provider. */
export const Schemas = {
  object: (...props: [string, z.ZodType][]): JsonObject => jsonSchema(object(...props)),
  leaderOrders: (c: GameConfig | null = null): JsonObject => jsonSchema(leaderOrders(c)),
  hostReply: (c: GameConfig | null = null, a: AudienceView | boolean = false): JsonObject => jsonSchema(hostReply(c, a)),
  courtReply: (c: GameConfig | null = null, ordersStand = false, reopenChosen = false): JsonObject => jsonSchema(courtReply(c, ordersStand, reopenChosen)),
  asksOf,
  present: (carriesGold = true, canForge = true): JsonObject => jsonSchema(present(carriesGold, canForge)),
  react: (giftOffered = true, serviceOffered = true): JsonObject => jsonSchema(react(giftOffered, serviceOffered)),
  report: (carriesGold = true, canForge = true, toLord = true, received = false): JsonObject => jsonSchema(report(carriesGold, canForge, toLord, received)),
  pitch: (): JsonObject => jsonSchema(pitch()),
  text: (field: string, description: string): JsonObject => jsonSchema(text(field, description)),
  ReportText,
  ReportToSender,
  OtherActions,
};

/** What the orders reply, read back from the model, holds (every field, with a sleeping seat's schedule). */
export type LeaderOrdersReply = z.infer<ReturnType<typeof leaderOrders>>;
