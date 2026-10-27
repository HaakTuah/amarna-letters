/**
 * A king's ladder ("Minds follow what is at stake", built in item 6c): what each of its decisions is worth, what the engine
 * passes to its own mind by itself, what a small rung's reply may not do, and the requests only the ladder makes (routine
 * courts, light alerts, plans). Every judgement here reads only what the king himself could see, never a hidden fact such
 * as a forgery or true gold, so being given its own mind never tells a king that something matters.
 */
import { AnswerGoldShare, WorldMap, type AudienceView, type Power, type SeatView } from "@amarna/engine";
import { z } from "zod";
import { fieldsDiffer, type Ladder } from "./ladder.ts";
import { Replies } from "./schemas.ts";
import { object, type JsonObject, type ReplySchema } from "./schemas.ts";
import type { Stakes } from "./spending.ts";

/** A king's rungs beyond its own model, as the table set them. */
export interface KingRungs {
  ladder: Ladder;
  /** The small rung: routine audiences, light alerts and standing answers' words; null when the table turned it off. */
  small: string | null;
  /** Who plays a woken king: "large", its own model (the default), or "small", with its own model above for what is passed up. */
  plays: "large" | "small";
  /** The model that writes the king's plan, or null: planning is off. */
  planning: string | null;
}

const own = (v: SeatView): string[] => [...v.owner].filter(([, o]) => o === v.power).map(([k]) => k);

/** Foreign troops in or next to the king's land, as far as it can see: the provinces of its own they stand in or beside. */
function threatened(v: SeatView, by: Power | null = null): Set<string> {
  const map = WorldMap.default;
  const mine = new Set(own(v));
  const out = new Set<string>();
  for (const u of v.units) {
    if (u.power === v.power || (by !== null && u.power !== by)) continue;
    if (mine.has(u.province)) out.add(u.province);
    for (const n of map.neighbors(u.province)) if (mine.has(n)) out.add(n);
  }
  return out;
}

/**
 * What a woken king's orders can move (first guesses, tuned in item 18): a little always, the share of its land with foreign
 * troops in or beside it, and more for each thing that woke it.
 */
export function ordersStakes(v: SeatView, waited: number): Stakes {
  const land = Math.max(1, own(v).length);
  return { kind: "orders", moved: 0.15 + threatened(v).size / land + 0.1 * v.wokenBecause.length, waited };
}

/** What an envoy's audience can move: the gold he brings against the treasury, and more for a tablet or troops at the border. */
export function courtStakes(views: readonly AudienceView[], court: SeatView): Stakes {
  const gold = Math.max(1, court.gold);
  let moved = 0.05;
  for (const v of views) moved += Math.max(v.goldStated, v.goldWeighed) / gold + (v.proposal !== null ? 0.5 : 0) + (v.copiesShown.length > 0 ? 0.3 : 0);
  return { kind: "court", moved };
}

/** What a sleeping king's light alerts can move: little, more the more of them. */
export function alertStakes(n: number): Stakes {
  return { kind: "alerts", moved: 0.05 * n };
}

/** The most a small rung's answers may give away in a season, by the king's own ledger: the standing answers' backstop. */
export function backstop(court: SeatView): number {
  return Math.floor(Math.max(0, court.gold) * AnswerGoldShare);
}

/**
 * Why the engine passes an envoy to the king's own mind by itself ("What the engine passes on by itself"), or null: a
 * tablet offered for sealing or shown as evidence, gold above the backstop, his lord's troops at the king's border, or an
 * envoy who secretly serves the king. A forged tablet is a tablet, so it always goes up; nothing hidden is read.
 */
export function passedByEngine(v: AudienceView, court: SeatView): string | null {
  if (v.proposal !== null && !v.proposalSealed) return "a tablet offered for sealing";
  if (v.copiesShown.length > 0) return "tablets shown";
  if (Math.max(v.goldStated, v.goldWeighed) > backstop(court)) return "gold above the backstop";
  if (threatened(court, v.from).size > 0) return "his lord's troops at the border";
  if (v.secretMandate !== null || v.secretLetter !== null) return "an envoy who serves you";
  return null;
}

/** Whether a unit order moves into land another power holds, as the king sees it: the start of a war. */
const attacks = (o: JsonObject, v: SeatView): boolean => {
  if (o.order !== "move" && o.order !== "support") return false;
  const to = String(o.order === "move" ? o.target : o.to || o.target);
  const holder = v.owner.tryGet(to) ?? null;
  return holder !== null && holder !== v.power;
};

const list = (x: unknown): JsonObject[] => (Array.isArray(x) ? (x as JsonObject[]) : []);

/**
 * Why a small rung's orders would commit the king, or null ("only a ruler's own model, the top rung, commits him"): a
 * tablet to seal, a sum past the backstop, land or troops given, a life taken, or a move or support into another king's
 * land, now, scheduled or standing.
 */
export function ordersCommit(json: JsonObject, v: SeatView): string | null {
  const letters = list(json.letters);
  if (letters.some((l) => String(l.tablet_to_seal ?? "").trim().length > 0)) return "a tablet to seal";
  const others = [...list(json.other_orders), ...list(json.schedule).flatMap((s) => list(s.other_orders)), ...list(json.standing_orders).flatMap((s) => list(s.other_orders))];
  if (others.some((o) => o.action === "cede_province" || o.action === "give_unit")) return "land or troops given";
  if (others.some((o) => o.action === "captive_execute")) return "a life";
  const sum = letters.reduce((s, l) => s + Math.max(0, Number(l.gold) || 0), 0) + others.reduce((s, o) => s + (o.action === "buy_city" || o.action === "pay_ransom" ? Math.max(0, Number(o.amount) || 0) : 0), 0);
  if (sum > Math.floor(Math.max(0, v.gold) * AnswerGoldShare)) return "a large sum";
  const units = [...list(json.units), ...list(json.schedule).flatMap((s) => list(s.units)), ...list(json.standing_orders).flatMap((s) => list(s.units))];
  if (units.some((u) => attacks(u, v))) return "a move into another king's land";
  if (list(json.standing_answers).some((a) => a.seal === true)) return "a standing answer that seals";
  return null;
}

/** How far two orders replies differ: by what each orders, unit by unit and action by action. */
export function ordersDiffer(a: JsonObject, b: JsonObject): number {
  const key = (x: JsonObject[], f: (o: JsonObject) => string): Set<string> => new Set(x.map(f));
  const units = (j: JsonObject) => key(list(j.units).filter((u) => u.order !== "hold"), (u) => `${String(u.unit)} ${String(u.order)} ${String(u.target)}`);
  const acts = (j: JsonObject) => key([...list(j.other_orders), ...list(j.letters).map((l) => ({ action: `letter ${String(l.to)}` }))], (o) => String(o.action));
  const jaccard = (x: Set<string>, y: Set<string>): number => {
    const all = new Set([...x, ...y]);
    if (all.size === 0) return 0;
    let same = 0;
    for (const k of all) if (x.has(k) && y.has(k)) same++;
    return 1 - same / all.size;
  };
  return (jaccard(units(a), units(b)) + jaccard(acts(a), acts(b))) / 2;
}

/** How far two answers to one envoy differ: what is given, sealed and done. */
export function answerDiffer(a: JsonObject, b: JsonObject): number {
  return fieldsDiffer(a, b, ["gift_to_envoy", "send_gold_back", "seal_tablet", "detain_envoy", "offer_service_wage"]);
}

/**
 * What the small rung answers when it holds a routine court for the king: the same answer to each envoy as the king's own,
 * less what only his own mind may do (seal, detain, take an envoy into service), with a way to leave each envoy to fuller
 * deliberation and to ask counsel first.
 */
export function routineCourt(counsel: boolean): ReplySchema {
  const full = Replies.courtReply(null, false);
  const answer = object(
    ["envoy", z.string().describe("The id of the envoy you answer (like c13), as the audience names him.")],
    ["speech", z.string().describe("What you say to this envoy, to carry home. Empty if you leave him to fuller deliberation.")],
    ["gift_to_envoy", z.int().describe("A personal gift to the envoy in shekels, or 0. An envoy takes one gift per audience.")],
    ["gift_request", z.string().describe("What you want from the envoy in return for the gift, or empty.")],
    ["send_gold_back", z.int().describe("Gold sent home with the envoy for his king, or 0: a gift in return, so that he does not go home empty-handed.")],
    ["gold_back_purity", z.int().describe("Purity of that gold in percent, 10-100 (100 when you send none).")],
    ["end_audience", z.boolean().describe("End this audience now. At the last exchange of an audience it ends with your answer whatever you choose.")],
    [
      "pass_up",
      z.string().describe("Empty to answer him now. Otherwise why his matter needs fuller deliberation: he is then answered after it, and nothing else you wrote for him is used."),
    ],
  );
  const fields: [string, z.ZodType][] = [
    ["answers", z.array(answer).describe("One answer for each envoy before you, by his id.")],
    ["ledger", full.shape.ledger as z.ZodType],
  ];
  if (counsel)
    fields.push([
      "ask_counsel",
      z.string().describe("Empty for none. Otherwise a brief of a few hundred words for counsel: the situation, your options and what you are unsure of. You are asked again, with the counsel."),
    ]);
  return object(...fields);
}

/** What the small rung reads after a routine court: what it may do, and what it leaves to the king's fuller deliberation. */
export const RoutineCourtNote =
  "\n\nTHESE ARE ROUTINE AUDIENCES: answer greetings, courtesy gifts, routine requests and renewals of peace as you judge best, and give gifts in return where it is fitting, since an envoy sent home empty-handed is slighted; your treasury is not to be emptied. You do not seal, detain, take anyone into service, send letters or change your orders here. Any envoy whose matter is weightier than it looks, or about whom you are unsure, leave to fuller deliberation (pass_up, with your reason). Or first take counsel: write a brief in ask_counsel, and you are asked again with the counsel.";

/** What a sleeping king's light-alert reader answers. */
export function alertsReply(): ReplySchema {
  return object(
    ["notes", z.string().describe("What you make of this news, for your record, in a few sentences.")],
    [
      "wake",
      z
        .boolean()
        .describe("True if anything in this news may need new orders from you this season: you then give orders with your full view. False: your orders stand and you sleep on."),
    ],
  );
}

/** What the planning call answers: the plan for the seasons ahead, and standing answers to leave with it. */
export function planReply(): ReplySchema {
  const orders = Replies.leaderOrders(null);
  return object(
    ["plan", z.string().describe("Your plan for the seasons ahead, in your own words: aims, friends and enemies, what to do and what to watch for. At most 2,000 characters.")],
    ["standing_answers", orders.shape.standing_answers as z.ZodType],
    ["cancel_answers", orders.shape.cancel_answers as z.ZodType],
  );
}

/** The orders field a king playing by a plan reads only when planning is on: he may ask for the plan to be written anew. */
export const NewPlan = z
  .string()
  .describe("Empty, or why your plan needs writing anew: it is then written again, from the year's events, before your next orders.");

/**
 * Something large since the plan was written, read from the king's own view ("When planning is on"): land lost, the capital
 * threatened, or an ally fallen.
 */
export interface PlanMark {
  turn: number;
  land: number;
  capitalThreatened: boolean;
  fallen: number;
}

export function planMark(v: SeatView): PlanMark {
  const capital = WorldMap.default.capital(v.power).id;
  return { turn: v.turn, land: own(v).length, capitalThreatened: v.owner.tryGet(capital) === v.power && threatened(v).has(capital), fallen: v.fallen.length };
}

/** Why the plan is due anew, or null: none yet, a year gone by, something large since, or the king asked. */
export function planDue(mark: PlanMark | null, v: SeatView, asked: string, seasonsPerYear: number): string | null {
  if (mark === null) return "the first plan";
  if (asked.trim().length > 0) return `asked: ${asked.trim()}`;
  if (v.turn - mark.turn >= seasonsPerYear) return "a year gone by";
  const now = planMark(v);
  if (now.land < mark.land) return "land lost";
  if (now.capitalThreatened && !mark.capitalThreatened) return "the capital threatened";
  if (now.fallen > mark.fallen) return "a kingdom fallen";
  return null;
}
