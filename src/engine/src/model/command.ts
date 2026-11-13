import { B, I, type ObjSchema, S, list, obj, opt } from "../core/json.ts";
import type { Power } from "./power.ts";
import { type PlannedOrder, PlannedOrderSchema } from "./sleep.ts";

/**
 * Command at a distance (build order item 13): the numbers of battles fought in a season, of an army's pace by its size
 * and of forced marches. All are first guesses, tuned in item 18 ("Balance: first guesses during the build").
 */

/**
 * Battles: one season, losses, no dice ("Battles: one season, losses, no dice" under Territory and military). The
 * margin of a battle is how much stronger the winner was, in percent of its strength: (winner − loser) × 100 / winner.
 * - `loserLeast`, `loserPer`: the loser loses `loserLeast` percent of its men, and `loserPer` more for each ten points of
 *   margin (a battle lost by a hair costs a tenth, one lost by half about a third).
 * - `winnerShare`: the winner loses this share, in percent, of the men the loser lost, times the loser's strength over
 *   its own: an even fight costs both, a crushing one costs the winner little.
 * - `rout`: a unit beaten from where it stood by at least this margin is destroyed or scattered rather than falling back
 *   (beaten by far: three to one).
 * - `dead`: of the men a battle costs, the share killed; the rest run and turn loose where it was fought (as a destroyed
 *   unit's do: `LandData.battleDead`).
 */
export const BattleData = { loserLeast: 10, loserPer: 4, winnerShare: 50, rout: 67, dead: 50 } as const;

/**
 * An army's pace by its size, and forced marches ("What sets a company's pace": its size, pace as a choice).
 * - `armyPer`: an army takes a percent longer on every connection for each this many men, at most `armyMost` percent:
 *   a long column is slow to move and to water (5,000 men take half as long again as a messenger, 10,000 twice as long).
 * - `fleetPer`, `fleetMost`: the same for a fleet (ships keep together at the pace of the slowest).
 * - `forcedPercent`: a forced march takes this share of the time.
 * - `forcedLoss`: of an army on a forced march, the men who drop along the way each season it forces the pace, in percent:
 *   they turn loose where they fall out.
 */
export const MarchData = { armyPer: 100, armyMost: 100, fleetPer: 50, fleetMost: 50, forcedPercent: 67, forcedLoss: 5 } as const;

/** The loser's share of its men lost in a battle it lost by `margin` percent, and the winner's share of the men the loser lost. */
export function battleLosses(winnerStrength: number, loserStrength: number): { margin: number; loserPercent: number; winnerShare: number } {
  const w = Math.max(1, winnerStrength);
  const margin = Math.max(0, Math.min(100, Math.floor(((w - Math.max(0, loserStrength)) * 100) / w)));
  const loserPercent = Math.min(100, BattleData.loserLeast + Math.floor((margin * BattleData.loserPer) / 10));
  const winnerShare = Math.floor((BattleData.winnerShare * Math.min(w, Math.max(0, loserStrength))) / w);
  return { margin, loserPercent, winnerShare };
}

/**
 * An army's mandate (item 13, "Army mandates use a fixed vocabulary"): the king's intent with limits, which the commander on
 * the spot carries out when no order of the king's has reached the army for the season. A task, where it applies, rules of
 * engagement, a condition for withdrawal, and how long it holds.
 * - `task`: hold where it stands; guard `target` and the land around it; invade `target` (march on it and take it);
 *   besiege `target`; support `power`'s troops nearby; raid into `target` and come back; shadow `power`'s nearest army.
 * - `engage`: attack any foreign troops that come within reach (`attack`), only with the advantage (`advantage`), or never
 *   (`avoid`); and never `avoid` power (`avoidPower`).
 * - `withdraw`: fall back to its own land when outnumbered (`outnumbered`), or hold at all costs (`never`).
 * - `until`: the last season it holds, or null until new orders.
 */
export const MandateTaskValues = ["hold", "guard", "invade", "besiege", "support", "raid", "shadow"] as const;
export type MandateTask = (typeof MandateTaskValues)[number];
export const EngageValues = ["attack", "advantage", "avoid"] as const;
export type Engage = (typeof EngageValues)[number];
export const WithdrawValues = ["outnumbered", "never"] as const;
export type Withdraw = (typeof WithdrawValues)[number];

export interface Mandate {
  task: MandateTask;
  target: string | null;
  power: Power | null;
  engage: Engage;
  avoidPower: Power | null;
  withdraw: Withdraw;
  until: number | null;
}

export function newMandate(init: Partial<Mandate> = {}): Mandate {
  return { task: "hold", target: null, power: null, engage: "advantage", avoidPower: null, withdraw: "outnumbered", until: null, ...init };
}

export const MandateSchema: ObjSchema<Mandate> = obj("Mandate", newMandate, {
  task: S,
  target: opt(S),
  power: opt(S),
  engage: S,
  avoidPower: opt(S),
  withdraw: S,
  until: opt(I),
});

/** A mandate in words, as its king and the reports read it. */
export function mandateText(m: Mandate): string {
  const task =
    m.task === "hold"
      ? "hold where it stands"
      : m.task === "guard"
        ? `guard ${m.target ?? "where it stands"} and the land around it`
        : m.task === "invade"
          ? `invade ${m.target ?? "?"}`
          : m.task === "besiege"
            ? `besiege ${m.target ?? "?"}`
            : m.task === "support"
              ? `support ${m.power ?? "?"}'s troops nearby`
              : m.task === "raid"
                ? `raid into ${m.target ?? "?"} and come back`
                : `shadow ${m.power ?? "?"}'s nearest army`;
  const engage = m.engage === "attack" ? "attack foreign troops within reach" : m.engage === "advantage" ? "engage only with the advantage" : "avoid battle";
  return (
    `${task}; ${engage}${m.avoidPower !== null ? `; never fight ${m.avoidPower}` : ""}; ${m.withdraw === "outnumbered" ? "fall back if outnumbered" : "hold at all costs"}` +
    (m.until !== null ? `; until turn ${m.until}` : "; until new orders")
  );
}

/**
 * What a commander does better (item 13, "What a good general does better"), first guesses for item 18. Competence and
 * loyalty are the commander's traits (0-100); an army with nobody commanding it, near its king or not, fights, marches and
 * forages as its men alone do, at the average (as if 50). The king himself with an army commands it as an average man, since
 * a seat's decisions are its competence.
 * - `strengthPer`: an army's strength in battle moves by (competence − 50) × 100 / `strengthPer` percent: from 85% under
 *   the worst commander to 115% under the best.
 * - `winterPer`: winter's losses fall a percent for each this many points of competence above 50, and rise below it.
 * - `lootPer`: what an army taking from the land wastes besides what it eats, in percent of what it takes: half of 100 less its
 *   commander's competence, plus half of 100 less his loyalty (a good one takes in order; a poor or disloyal one loots).
 * - `spoilsPer`: of the king's share of a sack, what a commander keeps for himself: his greed over this.
 * - `searchLeast`, `searchPer`: the moves a commander weighs when he interprets his mandate (his look-ahead): this many, and
 *   one more for each this many points of competence.
 * - `seeThrough`: the chance in a hundred, times his competence over 100, that a commander sees through a feint (a move his
 *   standing order would answer that could not have got through anyway) and does not answer it.
 */
export const CommandData = { strengthPer: 333, winterPer: 2, lootPer: 2, spoilsPer: 4, searchLeast: 2, searchPer: 10, seeThrough: 100 } as const;

/** The traits that set how a unit is commanded: its commander's, or the average where nobody commands it. */
export interface CommandTraits {
  readonly competence: number;
  readonly loyalty: number;
  readonly greed: number;
}
export const Uncommanded: CommandTraits = { competence: 50, loyalty: 50, greed: 50 };

/** An army's strength in battle in percent, by its commander's competence. */
export function commandStrength(t: CommandTraits): number {
  return 100 + Math.trunc(((t.competence - 50) * 100) / CommandData.strengthPer);
}

/**
 * A governorship (item 13, "Governors"): `character` governs `province` for `power` from the season `from` (when he arrives
 * there), under a mandate: he may raise up to `levies` levies there on his own when foreign troops stand in or next to it,
 * of which he has raised `raised`. He collects the province's yield, which passes through his hands; `skimmed` is what he
 * kept of it in all. `relieved` is the season word of his recall reaches him, or null.
 */
export interface Governor {
  province: string;
  /**
   * Item 17++ ("Governors": one governor may hold several neighbouring provinces): the province he sits in, his capital for
   * every distance; the province itself for a governor of one.
   */
  seat: string;
  /**
   * Item 17++ (hidden information): a seat moved (his seat's province lost or given up) shows its king the seat he knew,
   * `seatWas`, until word of the move can be read at his court in the season `seatHeard`.
   */
  seatWas: string;
  seatHeard: number;
  character: string;
  power: Power;
  levies: number;
  raised: number;
  from: number;
  skimmed: number;
  relieved: number | null;
  /** Item 17: the people's mood as he last reported it to his king, in words ("quiet", "uneasy", "restless", "near revolt"). */
  mood: string;
}

export function newGovernor(init: Partial<Governor> = {}): Governor {
  return { province: "", seat: "", seatWas: "", seatHeard: 0, character: "", power: "Egypt", levies: 0, raised: 0, from: 0, skimmed: 0, relieved: null, mood: "quiet", ...init };
}

export const GovernorSchema: ObjSchema<Governor> = obj("Governor", newGovernor, {
  province: S,
  seat: S,
  seatWas: S,
  seatHeard: I,
  character: S,
  power: S,
  levies: I,
  raised: I,
  from: I,
  skimmed: I,
  relieved: opt(I),
  mood: S,
});

/**
 * Item 17++ (hidden information): a governorship ended (his death, his turning, the province lost, his stepping down), as
 * its king still believes it stands until word of the end reaches his court in the season `until`.
 */
export interface GovernorGone {
  governor: Governor;
  until: number;
}

export function newGovernorGone(init: Partial<GovernorGone> = {}): GovernorGone {
  return { governor: newGovernor(), until: 0, ...init };
}

export const GovernorGoneSchema: ObjSchema<GovernorGone> = obj("GovernorGone", newGovernorGone, {
  governor: () => GovernorSchema,
  until: I,
});

/** The province a governor sits in (item 17++): his seat, or his one province. */
export const seatOf = (g: Governor): string => (g.seat === "" ? g.province : g.seat);

/**
 * The governorships as their kings know them in the season `turn` (hidden information): those that stand, and those ended
 * whose word has not yet reached their king's court.
 */
export const governorsKnown = (s: { governors: readonly Governor[]; governorsGone: readonly GovernorGone[] }, turn: number): Governor[] => [
  ...s.governors,
  ...s.governorsGone.filter((x) => x.until > turn).map((x) => x.governor),
];

/** The seat a governor's king knows him in, in the season `turn`: the one he left until word of the move is read. */
export const seatKnown = (g: Governor, turn: number): string => (g.seatHeard > turn ? g.seatWas : seatOf(g));

/**
 * Item 17++ ("Governors": a vassal king by a grant under oath): a king's grant of kingship over provinces of his to a
 * governor or a character of his, as Suppiluliuma made his sons kings of Carchemish and Aleppo. The word travels to the
 * man at his seat; he answers by his stakes; if he takes it, the land becomes his, a power bound by a vassal tablet for
 * the tribute agreed, and the price he pays travels to the king with his answer.
 */
export interface Crown {
  id: string;
  power: Power;
  character: string;
  provinces: string[];
  /** Where he sits and rules from: his governor's seat, or the first province named. */
  seat: string;
  /** The tribute a year and the price, as the grant names them. */
  tribute: number;
  price: number;
  /** The season the word reaches him. */
  arrives: number;
  /** His answer, once the word reached him (taken the season after, so a model may give it): null until then. */
  answered: number | null;
  accept: boolean;
  /** Once he took it: the season his price, carried with his answer, reaches the king (null before, and once paid). */
  paidArrives: number | null;
  /** Once it is settled (taken, refused or not to be given): the season word of it reaches the king's court (null before). */
  heard: number | null;
  /** Refused: the terms on which he would take it, in his own words, carried home with his answer (empty: none given). */
  terms: string;
  /** Taken: the sealed vassal tablet whose copy rides home to the king with the answer (empty once delivered, or none). */
  tablet: string;
}

export function newCrown(init: Partial<Crown> = {}): Crown {
  return { id: "", power: "Egypt", character: "", provinces: [], seat: "", tribute: 0, price: 0, arrives: 0, answered: null, accept: false, paidArrives: null, heard: null, terms: "", tablet: "", ...init };
}

export const CrownSchema: ObjSchema<Crown> = obj("Crown", newCrown, {
  id: S,
  power: S,
  character: S,
  provinces: list(S),
  seat: S,
  tribute: I,
  price: I,
  arrives: I,
  answered: opt(I),
  accept: B,
  paidArrives: opt(I),
  heard: opt(I),
  terms: S,
  tablet: S,
});

/**
 * What a man offered a kingship sees (item 17++, the "Crown" request): who offers it, over which provinces and from which
 * seat, the tribute and the price named, his own purse, and roughly what the land yields a year; nothing he could not know.
 */
export interface CrownView {
  crownId: string;
  turn: number;
  from: Power;
  lands: string[];
  seat: string;
  governs: boolean;
  tribute: number;
  price: number;
  purse: number;
  /** Roughly the gold the land yields a year, as one who stands there sees it. */
  yearly: number;
}

export function newCrownView(init: Partial<CrownView> = {}): CrownView {
  return { crownId: "", turn: 0, from: "Egypt", lands: [], seat: "", governs: false, tribute: 0, price: 0, purse: 0, yearly: 0, ...init };
}

/** His answer to a grant of kingship: whether he takes it. */
export interface CrownChoice {
  crownId: string;
  accept: boolean;
  /** Refusing, the terms on which he would take it, in his own words ("whatever the two sides settle"); else empty. */
  terms: string;
}

export function newCrownChoice(init: Partial<CrownChoice> = {}): CrownChoice {
  return { crownId: "", accept: false, terms: "", ...init };
}

export const CrownChoiceSchema: ObjSchema<CrownChoice> = obj("CrownChoice", newCrownChoice, { crownId: S, accept: B, terms: S });

/** The most levies a governor's mandate may allow him to raise on his own. */
export const MostGovernorLevies = 3;

/**
 * A court on the road, with its king or without him (item 13, "The capital is wherever the king is"), or the king on the
 * road alone with his guard (`alone`, item 17b, part C): where it goes, its route, the route's province it last reached and
 * the points made beyond it, and the season it set out.
 */
export interface KingRoad {
  power: Power;
  to: string;
  route: string[];
  leg: number;
  along: number;
  since: number;
  alone: boolean;
}

export function newKingRoad(init: Partial<KingRoad> = {}): KingRoad {
  return { power: "Egypt", to: "", route: [], leg: 0, along: 0, since: 0, alone: false, ...init };
}

export const KingRoadSchema: ObjSchema<KingRoad> = obj("KingRoad", newKingRoad, { power: S, to: S, route: list(S), leg: I, along: I, since: I, alone: B });

/**
 * Moving the court, first guesses (item 18 tunes them): it costs `moveBase` shekels and `movePer` more for every ten days
 * of road (his guard, his household, the tents and the archive carried), and the king travels as a company of
 * `companyMen` people, at their pace.
 */
export const CourtData = { moveBase: 20, movePer: 5, companyMen: 300 } as const;

/**
 * The king travelling without his court (item 17b, part C), first guesses (item 18 tunes them): his guard and household
 * cost `base` shekels and `per` more for every ten days of road, and go as a company of `companyMen`, faster than the court.
 * Where he stands, a battle his side loses there kills him `fallsInBattle` times in a hundred and takes him
 * `takenInBattle` in a hundred, else he gets away with his beaten men; a city taken where he stands kills him `diesInCity` in a hundred,
 * else takes him.
 */
export const KingAloneData = { base: 5, per: 2, companyMen: 60, fallsInBattle: 20, takenInBattle: 30, diesInCity: 30 } as const;

/**
 * An order on the road with the realm's couriers (item 13, "Distance inside your own realm"): men of the realm carrying
 * a king's order from his court to where it is carried out; it is carried out in the season it arrives, given from where
 * its unit then stands. `plan` binds it to its unit as a scheduled order is bound.
 */
export interface Courier {
  power: Power;
  plan: PlannedOrder;
  given: number;
  arrives: number;
}

export function newCourier(init: Partial<Courier> = {}): Courier {
  return { power: "Egypt", plan: null!, given: 0, arrives: 0, ...init };
}

export const CourierSchema: ObjSchema<Courier> = obj("Courier", newCourier, { power: S, plan: () => PlannedOrderSchema, given: I, arrives: I });
