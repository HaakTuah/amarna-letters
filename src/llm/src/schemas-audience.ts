/**
 * The schemas of the replies at an audience and around it: the host's and the court's, the envoy's presentation, answer and
 * report, a person's pitch, a captive questioned, a phrasing call and a plain text.
 */
import { z } from "zod";
import { SkillBands, type AudienceView, type GameConfig } from "@amarna/engine";
import { array, bool, enumOf, int, object, str, type ReplySchema } from "./schema-tools.ts";
import { AnswerClauses, GiftNews, clauses, ledger, letter, standingAnswers } from "./schemas-orders.ts";

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
export function hostReply(c: GameConfig | null = null, a: AudienceView | boolean = false): ReplySchema {
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
export function courtReply(c: GameConfig | null = null, ordersStand = false, reopenChosen = false): ReplySchema {
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
 * Item 11a+ (the owner's answer to item 8's review, "Full press"): a model envoy may alter the letter's clauses as a script
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
export function present(carriesGold = true, canForge = true, clauses = 0, gift = false): ReplySchema {
  const recite = ReciteFields(clauses, gift);
  if (!carriesGold) return object(AsWritten, ["speech", str(PresentSpeech)], ...recite);
  return canForge
    ? object(AsWritten, ["speech", str(PresentSpeech)], ["keep_gold", int(KeepGold)], ["swap_inventory", bool(SwapInventory)], ...recite)
    : object(AsWritten, ["speech", str(PresentSpeech)], ["keep_gold", int(KeepGold)], ...recite);
}

/** An envoy's answer at an audience: whether to take a gift or a post only when one is offered. */
export function react(giftOffered = true, serviceOffered = true, tabletOffered = false): ReplySchema {
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
export function report(carriesGold = true, canForge = true, toLord = true, received = false, answers = 0): ReplySchema {
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
export const pitch = (alias: string | null = null, envoyOf: string | null = null): ReplySchema => {
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
export const questioned = (kings: readonly string[]): ReplySchema => {
  const fields: [string, z.ZodType][] = [
    ["words", str("What you say to your questioners, in one to three sentences.")],
    ["lie", bool("True: instead of the tablets you saw, you recite one that never was, a league of your lord's against your captor, to mislead them. False: you tell them what you saw.")],
  ];
  if (kings.length > 0) fields.push(["league_with", enumOf(kings as [string, ...string[]], "Only if lie is true: the king you say your lord sealed that league with.")]);
  return object(...fields);
};

export const text = (field: string, description: string): ReplySchema => object([field, str(description)]);

/** A phrasing call's reply: only the words. */
export const phrase = (): ReplySchema => object(["speech", str("The king's words to the envoy, as he would speak them, in one to three sentences.")]);
