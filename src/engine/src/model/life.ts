/**
 * A character's own season (build order item 11a, "A life of their own"): what it knows of where it stands, and what it
 * decides for itself: where to go, whether to seek service or work for itself, its hoard, what it offers to lend, one
 * approach to someone in the same place and its answers to approaches made to it, quitting, and an errand's gold.
 */
import { B, I, type ObjSchema, S, list, obj, opt } from "../core/json.ts";
import { type Hoard, HoardSchema, type LendOffer, LendOfferSchema } from "./money.ts";
import type { Power } from "./power.ts";

/** A court as a character knows it: how far, whether it is hiring, its record of paying, the price of bread there. */
export interface CourtSeen {
  court: Power;
  /** Seasons of travel from where it stands. */
  travel: number;
  /** The last season it asked for candidates, or null. */
  hiring: number | null;
  /** How much of a promised fee or loan it counts on there, in percent, from its record. */
  trust: number;
  /** Its record: promises to pay kept and broken. */
  kept: number;
  broken: number;
  /** Executions it is said to have done (item 4's wariness). */
  executions: number;
  /** The price of a measure of grain at its capital's market, in hundredths of a shekel (100 is the usual price). */
  grain: number;
  /** Its strength against its start, in percent, as all can reckon it; and whether its capital is besieged. */
  growth: number;
  besieged: boolean;
  /** What the person would ask that court a season of a job's term. */
  ask: number;
}

export function newCourtSeen(init: Partial<CourtSeen> = {}): CourtSeen {
  return { court: "Egypt", travel: 0, hiring: null, trust: 0, kept: 0, broken: 0, executions: 0, grain: 100, growth: 100, besieged: false, ask: 0, ...init };
}

export const CourtSeenSchema: ObjSchema<CourtSeen> = obj("CourtSeen", newCourtSeen, {
  court: S,
  travel: I,
  hiring: opt(I),
  trust: I,
  kept: I,
  broken: I,
  executions: I,
  grain: I,
  growth: I,
  besieged: B,
  ask: I,
});

/** A debt tablet as its holder or its borrower sees it. */
export interface DebtSeen {
  id: string;
  /** The other party, by name ("the king of Egypt", "Mane"), and its id. */
  other: string;
  otherId: string;
  left: number;
  dueTurn: number;
  /** Where the tablet lies ("on your person", "in your hoard", "in the archive of Hatti"). */
  kept: string;
}

export function newDebtSeen(init: Partial<DebtSeen> = {}): DebtSeen {
  return { id: "", other: "", otherId: "", left: 0, dueTurn: 0, kept: "", ...init };
}

export const DebtSeenSchema: ObjSchema<DebtSeen> = obj("DebtSeen", newDebtSeen, { id: S, other: S, otherId: S, left: I, dueTurn: I, kept: S });

/** Someone else in the same place. */
export interface PersonHere {
  id: string;
  name: string;
  /** "free", "serving Egypt", ... */
  standing: string;
  /** Its record of paying what it promised. */
  kept: number;
  broken: number;
}

export function newPersonHere(init: Partial<PersonHere> = {}): PersonHere {
  return { id: "", name: "", standing: "", kept: 0, broken: 0, ...init };
}

export const PersonHereSchema: ObjSchema<PersonHere> = obj("PersonHere", newPersonHere, { id: S, name: S, standing: S, kept: I, broken: I });

/** An approach made to it, waiting for its answer. */
export interface ApproachSeen {
  id: string;
  from: string;
  fromName: string;
  words: string;
  giveGold: number;
  askGold: number;
  giveDebts: string[];
  askDebts: string[];
  repay: number;
  seasons: number;
  collect: string | null;
  fee: number;
}

export function newApproachSeen(init: Partial<ApproachSeen> = {}): ApproachSeen {
  return { id: "", from: "", fromName: "", words: "", giveGold: 0, askGold: 0, giveDebts: [], askDebts: [], repay: 0, seasons: 0, collect: null, fee: 0, ...init };
}

export const ApproachSeenSchema: ObjSchema<ApproachSeen> = obj("ApproachSeen", newApproachSeen, {
  id: S,
  from: S,
  fromName: S,
  words: S,
  giveGold: I,
  askGold: I,
  giveDebts: list(S),
  askDebts: list(S),
  repay: I,
  seasons: I,
  collect: opt(S),
  fee: I,
});

/** What a character knows of its own situation when it decides its season. */
export interface LifeView {
  turn: number;
  /** The court where it stands, or null on the road. */
  at: Power | null;
  free: boolean;
  employer: Power | null;
  /** Its job: the last season of its term, and the rest of the fee still to come. */
  jobUntil: number | null;
  restDue: number;
  seeking: boolean;
  waited: number;
  purse: number;
  hoard: Hoard | null;
  lendOffer: LendOffer | null;
  /** What its living costs a season where it stands, in shekels (nothing as a guest). */
  living: number;
  /** The going rate of service, in percent of what people would ask on their own. */
  goingRate: number;
  courts: CourtSeen[];
  held: DebtSeen[];
  owes: DebtSeen[];
  /** Fees courts let fall due unpaid to it, by court. */
  owedFees: { court: Power; amount: number }[];
  here: PersonHere[];
  approaches: ApproachSeen[];
  /** On an errand: whose, the debt to collect, the borrower's court, what it has collected, and where its employer waits. */
  errand: { employer: string; employerName: string; debtId: string; borrower: string; collected: number; home: Power; since: number } | null;
  /** Real offers made to it last season, a season's rate by court, which it may cite. */
  offers: { court: Power; rate: number }[];
  /** The ending, in words (what every seat is told). */
  ending: string;
}

export function newLifeView(init: Partial<LifeView> = {}): LifeView {
  return {
    turn: 0,
    at: null,
    free: true,
    employer: null,
    jobUntil: null,
    restDue: 0,
    seeking: true,
    waited: 0,
    purse: 0,
    hoard: null,
    lendOffer: null,
    living: 0,
    goingRate: 100,
    courts: [],
    held: [],
    owes: [],
    owedFees: [],
    here: [],
    approaches: [],
    errand: null,
    offers: [],
    ending: "",
    ...init,
  };
}

const ErrandSeenSchema = obj("ErrandSeen", () => ({ employer: "", employerName: "", debtId: "", borrower: "", collected: 0, home: "Egypt" as Power, since: 0 }), {
  employer: S,
  employerName: S,
  debtId: S,
  borrower: S,
  collected: I,
  home: S,
  since: I,
});

export const LifeViewSchema: ObjSchema<LifeView> = obj("LifeView", newLifeView, {
  turn: I,
  at: opt(S),
  free: B,
  employer: opt(S),
  jobUntil: opt(I),
  restDue: I,
  seeking: B,
  waited: I,
  purse: I,
  hoard: () => HoardSchema,
  lendOffer: () => LendOfferSchema,
  living: I,
  goingRate: I,
  courts: list(() => CourtSeenSchema),
  held: list(() => DebtSeenSchema),
  owes: list(() => DebtSeenSchema),
  owedFees: list(obj("OwedFee", () => ({ court: "Egypt" as Power, amount: 0 }), { court: S, amount: I })),
  here: list(() => PersonHereSchema),
  approaches: list(() => ApproachSeenSchema),
  errand: () => ErrandSeenSchema,
  offers: list(obj("OfferSeen", () => ({ court: "Egypt" as Power, rate: 0 }), { court: S, rate: I })),
  ending: S,
});

/** An approach it makes: the same fields as an {@link Approach}, to someone in the same place. */
export interface ApproachMade {
  to: string;
  words: string;
  giveGold: number;
  askGold: number;
  giveDebts: string[];
  askDebts: string[];
  repay: number;
  seasons: number;
  collect: string | null;
  fee: number;
}

export function newApproachMade(init: Partial<ApproachMade> = {}): ApproachMade {
  return { to: "", words: "", giveGold: 0, askGold: 0, giveDebts: [], askDebts: [], repay: 0, seasons: 0, collect: null, fee: 0, ...init };
}

export const ApproachMadeSchema: ObjSchema<ApproachMade> = obj("ApproachMade", newApproachMade, {
  to: S,
  words: S,
  giveGold: I,
  askGold: I,
  giveDebts: list(S),
  askDebts: list(S),
  repay: I,
  seasons: I,
  collect: opt(S),
  fee: I,
});

/** What a character decides for its season. Every field defaults to leaving things as they are. */
export interface LifeChoice {
  /** Set out for this court (a free person, or one on an errand); null: stay. */
  go: Power | null;
  /** A free person: seek service (true) or work for itself (false). */
  seek: boolean;
  /** Gold into its hoard where it stands (above 0) or out of it (below 0). */
  hoard: number;
  /** What it offers to lend the king where it stands; null withdraws any offer. */
  lend: LendOffer | null;
  approach: ApproachMade | null;
  /** The ids of approaches made to it that it accepts; the rest it refuses. */
  accept: string[];
  /** A servant leaves its master's service, breaking its job. */
  quit: boolean;
  /** On an errand, back with its employer: hand over what it collected (true) or keep it (false). */
  deliver: boolean;
  /** Debts it owes that it repays in full now, to whoever holds each tablet, if they stand in the same place. */
  repay: string[];
}

export function newLifeChoice(init: Partial<LifeChoice> = {}): LifeChoice {
  return { go: null, seek: true, hoard: 0, lend: null, approach: null, accept: [], quit: false, deliver: true, repay: [], ...init };
}

export const LifeChoiceSchema: ObjSchema<LifeChoice> = obj("LifeChoice", newLifeChoice, {
  go: opt(S),
  seek: B,
  hoard: I,
  lend: () => LendOfferSchema,
  approach: () => ApproachMadeSchema,
  accept: list(S),
  quit: B,
  deliver: B,
  repay: list(S),
});
