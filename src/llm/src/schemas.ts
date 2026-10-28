/**
 * The model schemas, defined once in Zod ("One source for model schemas"): the reply types are derived from them, every
 * reply is validated against them, and the same definitions go to the providers as JSON schemas ({@link jsonSchema}). They
 * stay small enough to compile: every field required (the model writes the default instead of leaving one out), one flat
 * shape per reply with a field naming an order's type, and provinces, units and people as plain strings the engine checks.
 * `Replies` builds the Zod objects; `Schemas` gives the JSON schemas sent, for the request text and the tests.
 */
import { z } from "zod";
import { AllPowers, ClauseKindValues, SkillBands, MaxAnswerSay, MaxAnswers, MaxConditions, MaxScheduledPerSeason, MaxScheduledSeasons, MaxStanding, fmtN, type AudienceView, type GameConfig } from "@amarna/engine";
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
  "sell_grain",
  "buy_grain",
  "feed_town",
  "caravan",
  "trade",
  "smuggle",
  "ship_trade",
  "ship_deliver",
  "set_toll",
  "set_tax",
  "welcome_loose",
  "deport",
  "return_runaways",
  "expel_mouths",
  "seek_candidates",
  "hire",
  "renew",
  "pay_fee",
  "withhold_fee",
  "borrow",
  "repay",
  "buy_news",
  "dismiss",
  "background_check",
  "place_spy",
  "recall_spy",
  "counter_intelligence",
  "close_roads",
  "open_roads",
  "revoke_passage",
  "grant_passage",
  "grant_basing",
  "repudiate",
  "assay",
  "authenticate",
  "forge",
  "captive_execute",
  "captive_ransom",
  "captive_turn",
  "captive_release",
  "captive_question",
  "captive_hand_over",
  "steal_tablet",
  "give_gift",
  "release_detained",
  "pay_ransom",
  "seize_hoard",
  "sell_tablet",
  "pay_carriers",
  "stop_paying_carriers",
  "captive_take_purse",
] as const;

// The shapes of a unit order and of any other order. Repeated in the schedule and in standing orders; the copy in standing
// orders leaves out the field descriptions, which are the same as above it, to keep the schema short.
const unitOrder = (described = true): ReplySchema =>
  object(
    ["unit", str(described ? "Province id where your unit stands (sally: your walled city whose walls sally)." : null)],
    ["order", enumOf(["hold", "move", "support", "convoy", "disband", "settle", "besiege", "sally"])],
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
      str(described ? "For raise, buy_city, cede_province, give_unit, fortify (the province whose walls to strengthen), sell_grain, buy_grain, feed_town (the province of yours whose stores and market), caravan, trade, smuggle (where it sets out from), ship_trade, ship_deliver (your harbour where your fleet, in it or in its waters, loads), set_toll, set_tax (the province it applies in; empty for all your land), welcome_loose, return_runaways, expel_mouths (your province), deport (the land you took that they leave), a province to spy on, or revoke_passage (one province; empty for all you granted that king), grant_passage (one province of yours; empty for all your land), grant_basing (one province of yours)." : null),
    ],
    ["to", str(described ? "For caravan: the province it carries the grain to. For trade, smuggle, ship_trade: the foreign market. For ship_deliver: the harbour it unloads at. For deport: your province they go to. Otherwise empty." : null)],
    ["power", str(described ? "For cede_province, give_unit, close_roads, open_roads, revoke_passage (the king you granted it), grant_passage, grant_basing (the king you grant it), set_toll (the partner it applies to; empty for everyone), a court to spy on, captive_hand_over (the king you hand the captive to), or return_runaways (the king whose runaways you send back), or buy_news (the court whose news you buy)." : null)],
    ["person", str(described ? "Person id, for hire, renew, pay_fee, withhold_fee, borrow, buy_news, dismiss, checks, spies, steal_tablet, captives, release, ransom, forge, give_gift, seize_hoard, sell_tablet (the buyer)." : null)],
    ["amount", int(described ? "The whole fee for the job (hire, renew), the price (sell_tablet), the men a levy takes (raise_army, raise_fleet; 0 for a full unit), the gold to borrow (borrow) or repay (repay), spend, ransom or gift (captive_question: what the questioning costs; give_gift: the gold) in shekels, measures of grain (sell_grain, buy_grain, feed_town, caravan, trade, smuggle, ship_trade, ship_deliver), or the toll's percent (set_toll), or the tax's percent of the harvest (set_tax), or the people to deport (deport), or how many in a hundred of the mouths still inside a besieged city to put out (expel_mouths), or for how many seasons (grant_passage, grant_basing; 0 for until you revoke it), as the action needs; else 0." : null)],
    ["gold", int(described ? "trade, smuggle, ship_trade: the shekels it carries to buy grain with at that market; deport: 1 to let them carry their share of the purse; hire, renew: the part of the fee handed over now (0 means nothing now); borrow: the sum to repay, sealed on the debt tablet; else 0." : null)],
    [
      "term",
      int(
        described
          ? "hire, renew: the seasons by which the job's errand is to be done, 1-30 (0 means 6). Hire offers a job to someone not in your service, at your court or, through an envoy you send this season to where they stand (item: the envoy's id), elsewhere; renew offers one of your own at your court a new job; borrow: the seasons to repay in; else 0."
          : null,
      ),
    ],
    ["text", str(described ? "Forgery text, words for a released envoy, or what a turned spy should report." : null)],
    [
      "item",
      str(
        described
          ? "For repay, the debt (like d3), as your treasury gives it; for assay, your mark for the gold (like g7), as your treasury gives it; for authenticate or repudiate (a tablet your envoy sealed in your name), your mark for your copy of the tablet (like k8), as your archive gives it."
          : null,
      ),
    ],
    ["seals", array(str(), described ? "Powers whose seals a forgery bears." : null)],
    [
      "errand",
      enumOf(["", "envoy", "spy"], described ? "hire, renew: the job's errand: envoy (to the court named in power) or spy (on the court in power, or the province in province). Else empty." : null),
    ],
    [
      "standing",
      enumOf(
        ["", "pay_on_done", "offer_again", "both"],
        described ? "hire, renew: your standing orders with the job: pay the rest when it is done, offer the same job again when it is done, or both; empty for neither (the rest is then paid only by pay_fee)." : null,
      ),
    ],
  );

/**
 * The conditions of a scheduled entry, a standing order or a standing answer, in the engine's own vocabulary ("Scheduled,
 * conditional orders"): read when they would run, from what the king knows then.
 */
const conditions = (what: string): z.ZodType =>
  array(
    object(
      ["test", enumOf(["if", "unless"])],
      ["kind", enumOf(["troops_in", "treasury_less_than", "treasury_at_least", "envoy_back", "tablet_sealed", "stores_at_least"])],
      ["power", str("troops_in: whose troops, or empty for any foreign power's. tablet_sealed: the court that sealed it with you, or empty for any. Otherwise empty.")],
      ["province", str("troops_in, stores_at_least: the province. Otherwise empty.")],
      ["amount", int("treasury_less_than, treasury_at_least: shekels. stores_at_least: measures of grain. Otherwise 0.")],
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
  const props = leaderOrdersBase(c);
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

const leaderOrdersBase = (c: GameConfig | null): [string, z.ZodType][] => [
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
  ["letters", array(letter(c))],
  ["other_orders", array(otherOrder())],
];

/** One clause of a letter, a tablet or an answer (item 8): its kind, and the fields its kind uses (see CLAUSES in the rules). */
const clauseObject = (): ReplySchema =>
  object(
    ["kind", enumOf(ClauseKindValues as unknown as [string, ...string[]], "The clause's kind, as CLAUSES in the rules lists them.")],
    ["king", enumOf(["", ...AllPowers] as [string, ...string[]], "The king the clause names (against whom, whose troops, who besieges, who is in league with the Habiru), or empty.")],
    ["province", str("The province it names (given, asked for, attacked, besieged, told of), or the start of a move; empty if none.")],
    ["into", str("The end of a move (support, askSupport), or empty.")],
    ["season", int("The turn a move is to be made, a turn to come (support, askSupport), or 0.")],
    ["gold", int("Shekels of gold (gift, tribute, askGold, askTribute, counter), or for newsStrength 0 (few) or 1 (many); otherwise 0.")],
    ["answers", enumOf(["", ...ClauseKindValues] as [string, ...string[]], "For accept, refuse or counter: the kind of clause it answers; otherwise empty.")],
  );

const clauses = (description: string): z.ZodType => array(clauseObject(), description);

/** What a host's answer in clauses is, in either press. */
const AnswerClauses = (structured: boolean): string =>
  structured
    ? "Your answer, set out in clauses (CLAUSES in the rules): accept, refuse or counter what the letter proposes or asks, and anything else you would say. In this game it is all you say."
    : "Your answer's formulas as clauses (CLAUSES in the rules): accept, refuse or counter what the letter proposes or asks. Kings who read only clauses read these.";
const GiftNews = "Only with a gift: news the envoy is to tell his lord as what he saw for himself (newsTroops, newsStrength, newsTaken, newsSiege), or empty.";

/** One letter: an envoy sent abroad. The same in an orders reply and in an audience held while the king's orders stand. */
const letter = (c: GameConfig | null): ReplySchema => {
  const structured = c?.pressMode === "structured";
  const sharedVictory = c?.sharedVictory ?? false;
  return object(
    ["envoy", str("Id of one of your people who is at court and ready.")],
    ["to", enumOf(powerNames)],
    ...(structured ? [] : ([["message", str("What the envoy should say, in your words. Empty: the envoy speaks your clauses alone.")]] as [string, z.ZodType][])),
    [
      "clauses",
      clauses(
        structured
          ? "The letter, set out in clauses from the templates (CLAUSES in the rules): in this game kings write only these, and the envoy recites them."
          : "The letter's formulas as clauses (CLAUSES in the rules), carried with your words: kings who read only clauses read these. Where your words and clauses differ, each reader goes by what he reads.",
      ),
    ],
    ["mandate", str("What the envoy may agree to on your behalf, in your words: it guides his tone.")],
    [
      "carry_seal",
      bool("Give the envoy your seal: he may then seal, in your name, a tablet the king he visits offers him, and the engine marks it within or beyond the limits below. False: nothing he agrees binds you."),
    ],
    ["seal_max_gold", int("With the seal: the most gold he may give or promise in a tablet he seals, or 0.")],
    ["seal_may_cede", array(str(), "With the seal: ids of your provinces he may give away; empty for none.")],
    ["seal_may_open", array(str(), "With the seal: ids of your provinces he may open to the other king's troops, by passage or basing; empty for none.")],
    [
      "show_credentials",
      bool("Let him show his credentials: the king he visits reads this mandate and these limits, which builds trust, but you lose the excuse that he went beyond them. False keeps them hidden."),
    ],
    ["gold", int("Shekels sent with the envoy, or 0.")],
    ["no_inventory", bool("Only with gold: send it without an inventory tablet, saving the scribe's fee. Nobody can then check what arrived. False otherwise.")],
    ["check_claim", str("The id of a person at your court who says they serve the king you write to (like c31): your envoy asks there whether they do. Empty otherwise.")],
    ["collect", str("A debt tablet in your archive (like d3, as DEBT TABLETS YOU HOLD gives it) your envoy carries to present to its borrower where it goes, bringing home what is repaid. Empty otherwise.")],
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
    ...(structured ? [] : ([["tablet_to_seal", str("Text for both kings to seal, or empty.")]] as [string, z.ZodType][])),
    [
      "tablet_clauses",
      clauses(
        structured
          ? "A tablet for both kings to seal, set out in clauses; empty for none."
          : "The clauses of the tablet to seal, carried with its text (or alone, written out in their words); empty for none.",
      ),
    ],
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
};

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
  /** The envoy carries its king's seal (item 9): the host may offer a tablet of its own for it to seal. */
  sealCarried: boolean;
  tabletToSeal: boolean;
  giftOpen: boolean;
  lastExchange: boolean;
  reopenChosen: boolean;
}

export function asksOf(a: AudienceView): AudienceAsks {
  return {
    ordersStand: a.ordersStand,
    sealCarried: a.sealCarried,
    tabletToSeal: a.proposal !== null && !a.proposalSealed,
    giftOpen: a.giftAccepted === 0,
    lastExchange: a.round >= a.maxRounds,
    reopenChosen: a.reopenChosen,
  };
}

/** A tablet of the host's own for an envoy that carries its king's seal to seal (item 9): its clauses, and in full press its words. */
const yourTablet = (structured: boolean, when: string): [string, z.ZodType][] => [
  ...(structured ? [] : ([["your_tablet", str(`${when}: words of a tablet of your own for him to seal in his king's name, or empty.`)]] as [string, z.ZodType][])),
  [
    "your_tablet_clauses",
    clauses(`${when}: a tablet of your own for him to seal in his king's name, set out in clauses written from you to his king (askPassage or askBasing for leave in his land, askGold, peace, against...; passage or basing would open your own land to his troops); empty for none.`),
  ],
];

/** A host's reply with every field, or at one exchange of an audience: only the fields that apply to it. */
function hostReply(c: GameConfig | null = null, a: AudienceView | boolean = false): ReplySchema {
  const asks: AudienceAsks =
    typeof a === "boolean" ? { ordersStand: a, sealCarried: true, tabletToSeal: true, giftOpen: true, lastExchange: false, reopenChosen: false } : asksOf(a);
  const structured = c?.pressMode === "structured";
  const fields: [string, z.ZodType][] = structured ? [] : [["speech", str("What you say to the envoy, to carry home.")]];
  fields.push(["clauses", clauses(AnswerClauses(structured))]);
  if (asks.giftOpen) {
    fields.push([
      "gift_to_envoy",
      int("A personal gift (bribe) to the envoy in shekels, or 0. An envoy takes one gift per audience: once one is accepted, a later gift is not given."),
    ]);
    fields.push(structured ? ["gift_news", clauses(GiftNews)] : ["gift_request", str("What you want from the envoy in return for the gift, or empty.")]);
  }
  fields.push(["offer_service_wage", int("Offer the envoy a six-season job in your service at this fee a season (half the whole handed over now), or 0.")]);
  if (asks.tabletToSeal) fields.push(["seal_tablet", bool("Seal the tablet the envoy brought.")]);
  if (asks.sealCarried) fields.push(...yourTablet(structured, "The envoy carries his king's seal"));
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
        letter(c),
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
  const structured = c?.pressMode === "structured";
  const answer = object(
    ["envoy", str("The id of the envoy you answer (like c13), as the audience names him.")],
    ...(structured ? [] : ([["speech", str("What you say to this envoy, to carry home.")]] as [string, z.ZodType][])),
    ["clauses", clauses(AnswerClauses(structured))],
    [
      "gift_to_envoy",
      int("A personal gift (bribe) to the envoy in shekels, or 0. An envoy takes one gift per audience: once he has accepted one, a later gift is not given."),
    ],
    structured ? ["gift_news", clauses(GiftNews)] : ["gift_request", str("What you want from the envoy in return for the gift, or empty.")],
    ["offer_service_wage", int("Offer the envoy a six-season job in your service at this fee a season (half the whole handed over now), or 0.")],
    ["seal_tablet", bool("Only if this envoy brought a tablet you have not yet chosen to seal: seal it. False otherwise.")],
    ...yourTablet(structured, "Only if this envoy carries his king's seal"),
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
        letter(c),
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

/**
 * Item 11a+ (Haakon's answer to item 8's review, "Full press"): a model envoy may alter the letter's clauses as a script
 * envoy can, in the same call: leave some out, state the gift as less, add a courtesy. Asked only of a letter with clauses,
 * the gift only where one names an amount.
 */
const ReciteFields = (clauses: number, gift: boolean): [string, z.ZodType][] => {
  if (clauses <= 0) return [];
  const f: [string, z.ZodType][] = [
    ["leave_out", array(z.int(), "The numbers of the letter's clauses you leave out when you recite them, or none: the king's scribes hear the rest as you recite them.")],
    ["add_courtesy", bool("True: you add a clause of good wishes from your lord that he did not write.")],
  ];
  if (gift) f.push(["gift_stated", int("The gift you state, in shekels: less than written if you keep some of the gold and say so to match; 0 states it as written.")]);
  return f;
};

/** An envoy's presentation: the gold fields only of an envoy that carries gold, the swap only of one whose hand can fake a seal. */
function present(carriesGold = true, canForge = true, clauses = 0, gift = false): ReplySchema {
  const recite = ReciteFields(clauses, gift);
  if (!carriesGold) return object(AsWritten, ["speech", str(PresentSpeech)], ...recite);
  return canForge
    ? object(AsWritten, ["speech", str(PresentSpeech)], ["keep_gold", int(KeepGold)], ["swap_inventory", bool(SwapInventory)], ...recite)
    : object(AsWritten, ["speech", str(PresentSpeech)], ["keep_gold", int(KeepGold)], ...recite);
}

/** An envoy's answer at an audience: whether to take a gift or a post only when one is offered. */
function react(giftOffered = true, serviceOffered = true, tabletOffered = false): ReplySchema {
  const fields: [string, z.ZodType][] = [["speech", str("What you say in answer.")]];
  if (giftOffered) fields.push(["accept_gift", bool("Accept the king's personal gift.")]);
  if (tabletOffered) fields.push(["seal_tablet", bool("Set your lord's seal on the tablet the king offers you, binding your lord unless he repudiates it.")]);
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
function report(carriesGold = true, canForge = true, toLord = true, received = false, answers = 0): ReplySchema {
  const fields: [string, z.ZodType][] = [];
  if (received)
    fields.push([
      "as_given",
      bool("True: you report the king's answer word for word, as he gave it, and add nothing of your own, nothing of what you did there either (leave report empty). False: you write your report yourself."),
    ]);
  fields.push(["report", str((received ? "Only if as_given is false: " : "") + (toLord ? ReportText : ReportToSender))]);
  if (carriesGold) fields.push(["keep_gold", int(KeepGoldHome)]);
  if (carriesGold && canForge) fields.push(["swap_inventory", bool(SwapInventory)]);
  // Item 11a+: the king's answer in clauses as the envoy reports it, changed as a script envoy may change it.
  if (answers > 0) {
    fields.push(["answers_left_out", array(z.int(), "The numbers of the king's answers (in clauses) you leave out of your report, or none.")]);
    fields.push(["refusals_as_accepted", array(z.int(), "The numbers of the king's refusals you report as acceptance, or none.")]);
  }
  return object(...fields);
}

/**
 * A pitch (item 10): the name it gives only when this court has never seen it, and the false envoy's claim only at the court
 * where it stands, so that no field implies a choice that does not exist.
 */
const pitch = (alias: string | null = null, envoyOf: string | null = null): ReplySchema => {
  const fields: [string, z.ZodType][] = [
    ["pitch", str("How you present yourself, in a few sentences.")],
    ["asking_price", int("What you ask a season of a job's term, in shekels.")],
    // Item 10+b: what it says it can do is its own choice, from what it believes of itself (its request says so).
    ["say_gather", enumOf(SkillBands.gather, "What you tell this court you can do at gathering what a court knows (you may claim more or less than you believe).")],
    ["say_stealth", enumOf(SkillBands.stealth, "What you tell this court you can do at slipping past guards.")],
    ["say_forge", enumOf(SkillBands.forge, "What you tell this court you can do at copying a hand and faking a seal.")],
  ];
  if (alias !== null) fields.push(["name", str(`The name you give this court: empty for your own, or "${alias}" to go by that name here instead.`)]);
  if (envoyOf !== null) fields.push(["envoy_of", bool(`True: instead of seeking service, you say you are an envoy of the king of ${envoyOf}, whom you do not serve, hoping for a host's gifts.`)]);
  return object(...fields);
};

/**
 * A captive that gave way under questioning (item 10+b): its words, and whether it tells what it saw or recites a league
 * of its lord's against its captor that never was; the king it names only when there is one to name.
 */
const questioned = (kings: readonly string[]): ReplySchema => {
  const fields: [string, z.ZodType][] = [
    ["words", str("What you say to your questioners, in one to three sentences.")],
    ["lie", bool("True: instead of the tablets you saw, you recite one that never was, a league of your lord's against your captor, to mislead them. False: you tell them what you saw.")],
  ];
  if (kings.length > 0) fields.push(["league_with", enumOf(kings as [string, ...string[]], "Only if lie is true: the king you say your lord sealed that league with.")]);
  return object(...fields);
};

const text = (field: string, description: string): ReplySchema => object([field, str(description)]);

/** A phrasing call's reply: only the words. */
const phrase = (): ReplySchema => object(["speech", str("The king's words to the envoy, as he would speak them, in one to three sentences.")]);

/** The reply schemas in Zod, as calls carry them. */
export const Replies = { leaderOrders, hostReply, courtReply, phrase, present, react, report, pitch, questioned, text };

/** The same schemas as the JSON sent to a provider. */
export const Schemas = {
  object: (...props: [string, z.ZodType][]): JsonObject => jsonSchema(object(...props)),
  leaderOrders: (c: GameConfig | null = null): JsonObject => jsonSchema(leaderOrders(c)),
  hostReply: (c: GameConfig | null = null, a: AudienceView | boolean = false): JsonObject => jsonSchema(hostReply(c, a)),
  courtReply: (c: GameConfig | null = null, ordersStand = false, reopenChosen = false): JsonObject => jsonSchema(courtReply(c, ordersStand, reopenChosen)),
  asksOf,
  present: (carriesGold = true, canForge = true, clauses = 0, gift = false): JsonObject => jsonSchema(present(carriesGold, canForge, clauses, gift)),
  react: (giftOffered = true, serviceOffered = true): JsonObject => jsonSchema(react(giftOffered, serviceOffered)),
  report: (carriesGold = true, canForge = true, toLord = true, received = false, answers = 0): JsonObject => jsonSchema(report(carriesGold, canForge, toLord, received, answers)),
  pitch: (): JsonObject => jsonSchema(pitch()),
  text: (field: string, description: string): JsonObject => jsonSchema(text(field, description)),
  ReportText,
  ReportToSender,
  OtherActions,
};

/** What the orders reply, read back from the model, holds (every field, with a sleeping seat's schedule). */
export type LeaderOrdersReply = z.infer<ReturnType<typeof leaderOrders>>;
