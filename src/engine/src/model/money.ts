/**
 * Money and work (build order item 11a): what jobs, purses, hoards and loans are made of. A party to a job or a loan is a
 * power (its name) or a character (its id): "Anyone can hire anyone", "Lending to anyone".
 */
import { B, I, type ObjSchema, S, list, obj, opt } from "../core/json.ts";
import { AllPowers, type Power } from "./power.ts";

/**
 * First guesses (item 18 tunes them):
 * - `rate*`: the going rate of service, in percent of what a person would ask on its own ("Fees clear the market"): it
 *   starts at 100, moves by `rateStep` a season towards demand, between `rateLow` and `rateHigh`.
 * - `trust*`: how much of the rest of a fee a person counts on, in percent, from a court's record of paying what fell due
 *   ("Work on any terms"): `trustStart` with no record, `trustKept` more for each kept, `trustBroken` less for each broken.
 * - `living`: the grain a free person eats a season, bought at the market where it stays ("Characters live from the markets too").
 * - `hoardFee`: the keep of a hoard a season, in percent, at least `hoardFeeMin` shekels, paid to the town's purse.
 * - `arrival*`: the chance a season of a newcomer through the doors, in percent: `arrivalBase`, plus `arrivalShort` times
 *   the pool's shortfall below its baseline over the baseline, at most `arrivalMost`; none above the baseline.
 * - `loanSeasons`: the seasons a script lender lends for; `interest*`: the interest a script lender asks a season, in
 *   tenths of a percent: from its impatience, more for each broken promise of the borrower, for a borrower at war, besieged
 *   at its capital, or shrunk below its start.
 * - `patience`: the seasons a candidate waits unhired at a court before it may move on.
 */
export const MoneyData = {
  rateStart: 100,
  rateStep: 5,
  rateLow: 50,
  rateHigh: 300,
  trustStart: 80,
  trustKept: 4,
  trustBroken: 30,
  trustLow: 10,
  living: 2,
  hoardFee: 2,
  hoardFeeMin: 1,
  arrivalBase: 5,
  arrivalShort: 300,
  arrivalMost: 80,
  loanSeasons: 6,
  interestBase: 10,
  interestBroken: 60,
  interestWar: 15,
  interestBesieged: 40,
  interestShrunk: 20,
  patience: 3,
} as const;

/** Whether a party is a power (else a character's id). */
export const isPowerParty = (x: string): x is Power => (AllPowers as readonly string[]).includes(x);

/** A party's record of paying what it promised: fees that fell due, and loans repaid or defaulted ("A name made of outcomes"). */
export interface PayRecord {
  kept: number;
  broken: number;
}

export function newPayRecord(init: Partial<PayRecord> = {}): PayRecord {
  return { kept: 0, broken: 0, ...init };
}

export const PayRecordSchema: ObjSchema<PayRecord> = obj("PayRecord", newPayRecord, { kept: I, broken: I });

/** Where a debt tablet lies: on its holder's person, in his hoard, in a court's archive, or gone missing. */
export const DebtKeptValues = ["Person", "Hoard", "Archive", "Missing"] as const;
export type DebtKept = (typeof DebtKeptValues)[number];

/**
 * A debt tablet ("The debt tablet is the claim"): sealed by borrower and lender, recording the sum to be repaid. Whoever
 * holds it holds the claim; the borrower who gets it back has cancelled the debt. Interest, the due season and what
 * follows a default are words; the engine keeps the sum, the seals and where the tablet is.
 */
export interface Debt {
  id: string;
  lender: string;
  borrower: string;
  /** The gold lent. */
  principal: number;
  /** The sum to be repaid, interest included, as sealed. */
  owed: number;
  /** What has been repaid so far. */
  repaid: number;
  sealedTurn: number;
  /** The season by which it is to be repaid, as the words say (nothing enforces it). */
  dueTurn: number;
  /** Who holds the tablet now (a power or a character), or null once it has gone missing. */
  holder: string | null;
  kept: DebtKept;
  /** The season it ended: repaid in full, cancelled, missing, or dead with a fallen kingdom; null while it stands. */
  ended: number | null;
  /** How it ended, in a word ("repaid", "cancelled", "fallen", "missing", "dead"), or "". */
  how: string;
  /** Whether a season passed due without it being repaid, which counts once as a broken promise. */
  defaulted: boolean;
}

export function newDebt(init: Partial<Debt> = {}): Debt {
  return {
    id: "",
    lender: "",
    borrower: "",
    principal: 0,
    owed: 0,
    repaid: 0,
    sealedTurn: 0,
    dueTurn: 0,
    holder: null,
    kept: "Person",
    ended: null,
    how: "",
    defaulted: false,
    ...init,
  };
}

export const DebtSchema: ObjSchema<Debt> = obj("Debt", newDebt, {
  id: S,
  lender: S,
  borrower: S,
  principal: I,
  owed: I,
  repaid: I,
  sealedTurn: I,
  dueTurn: I,
  holder: opt(S),
  kept: S,
  ended: opt(I),
  how: S,
  defaulted: B,
});

/** What is left to repay on a debt. */
export const debtLeft = (d: Debt): number => Math.max(0, d.owed - d.repaid);

/**
 * A character's hoard ("Where characters keep their gold"): gold kept with a temple or merchant house in one city, the
 * capital of a court, for a keep each season; seized if that court turns on him, lost if the city falls.
 */
export interface Hoard {
  at: Power;
  gold: number;
}

export function newHoard(init: Partial<Hoard> = {}): Hoard {
  return { at: "Egypt", gold: 0, ...init };
}

export const HoardSchema: ObjSchema<Hoard> = obj("Hoard", newHoard, { at: S, gold: I });

/**
 * A character's standing offer to lend to the king of the court where it stands: how much, and how much in a hundred
 * more it asks back after `seasons` (the king sees it, and borrows by order).
 */
export interface LendOffer {
  amount: number;
  perHundred: number;
  seasons: number;
}

export function newLendOffer(init: Partial<LendOffer> = {}): LendOffer {
  return { amount: 0, perHundred: 0, seasons: 0, ...init };
}

export const LendOfferSchema: ObjSchema<LendOffer> = obj("LendOffer", newLendOffer, { amount: I, perHundred: I, seasons: I });

/**
 * An approach from one character to another in the same place ("Characters deal with each other"): words, and an exchange
 * the other may accept in its next decision, when both sides change hands together. A loan: the gold that moves is lent,
 * and its receiver seals a debt tablet for `repay`. A job (item 11a, "Anyone can hire anyone"): the sender hires the other
 * to collect a debt it holds: it hands over the tablet and the advance, and owes the rest when the gold is brought back.
 */
export interface Approach {
  id: string;
  from: string;
  to: string;
  turn: number;
  words: string;
  giveGold: number;
  askGold: number;
  giveDebts: string[];
  askDebts: string[];
  /** With a loan: the sum the receiver of the gold is to repay, and in how many seasons; 0 if no loan. */
  repay: number;
  seasons: number;
  /** With a job: the debt to collect, the whole fee and the advance; null if none. */
  collect: string | null;
  fee: number;
  /** Answered: null while waiting, true accepted (and done), false refused or failed. */
  accepted: boolean | null;
}

export function newApproach(init: Partial<Approach> = {}): Approach {
  return {
    id: "",
    from: "",
    to: "",
    turn: 0,
    words: "",
    giveGold: 0,
    askGold: 0,
    giveDebts: [],
    askDebts: [],
    repay: 0,
    seasons: 0,
    collect: null,
    fee: 0,
    accepted: null,
    ...init,
  };
}

export const ApproachSchema: ObjSchema<Approach> = obj("Approach", newApproach, {
  id: S,
  from: S,
  to: S,
  turn: I,
  words: S,
  giveGold: I,
  askGold: I,
  giveDebts: list(S),
  askDebts: list(S),
  repay: I,
  seasons: I,
  collect: opt(S),
  fee: I,
  accepted: opt(B),
});

/**
 * A character's errand for another character (item 11a): collecting a debt. The collector carries the tablet to the
 * borrower's court, takes what is paid there, and brings it back to its employer, who owes it the rest of the fee.
 */
export interface Errand {
  employer: string;
  debtId: string;
  fee: number;
  advance: number;
  /** The court where its employer waits for it. */
  home: Power;
  /** The gold it collected, carried home (it is in its purse; this says how much is its employer's). */
  collected: number;
  /** The season it set out. */
  since: number;
}

export function newErrand(init: Partial<Errand> = {}): Errand {
  return { employer: "", debtId: "", fee: 0, advance: 0, home: "Egypt", collected: 0, since: 0, ...init };
}

export const ErrandSchema: ObjSchema<Errand> = obj("Errand", newErrand, { employer: S, debtId: S, fee: I, advance: I, home: S, collected: I, since: I });

/**
 * The ways to a fortune ("How the strategy is made"): the steady hired man, the man who keeps what passes through his hands,
 * the seller of secrets, the climber who wants command, the man drawn to the outlaw's life.
 */
export const StrategyValues = ["Steady", "Keeper", "Seller", "Climber", "Outlaw"] as const;
export type Strategy = (typeof StrategyValues)[number];
