import { I, type ObjSchema, S, obj, opt } from "../core/json.ts";
import type { Power } from "./power.ts";

/**
 * The formulas a letter is set out in, as the Amarna letters set theirs out (build order item 8, "Two press modes"):
 * courtesies and gifts, proposals, requests, threats, grievances and accusations, news to pass on, and answers. Every
 * letter carries its clauses beside its words in full press, and only its clauses in structured press, so a script king
 * reads any letter by them, whoever wrote the words. The greeting stays its own sealed formula ({@link GreetingOptions}).
 */
export const ClauseKindValues = [
  // Courtesies and gifts
  "wellWishes",
  "gift",
  // Proposals
  "peace",
  "noAttack",
  "alliance",
  "against",
  "support",
  "tribute",
  "cede",
  "passage",
  "basing",
  "tollFree",
  "fugitives",
  "protect",
  "serve",
  // Requests
  "askGold",
  "askSupport",
  "askWithdraw",
  "askCede",
  "askTribute",
  "askHelp",
  "askOath",
  "askPassage",
  "askBasing",
  "askTollFree",
  "askProtect",
  "askServe",
  // Threats
  "threat",
  // Grievances and accusations
  "grievance",
  "brokenOath",
  "lightGift",
  "envoyLied",
  "habiru",
  // News to pass on
  "newsTroops",
  "newsStrength",
  "newsTaken",
  "newsSiege",
  // Answers
  "accept",
  "refuse",
  "counter",
] as const;
export type ClauseKind = (typeof ClauseKindValues)[number];

/** The kinds a king offers or asks for, which an answer (accept, refuse, counter) can name. */
export const ProposalKinds: readonly ClauseKind[] = ["peace", "noAttack", "alliance", "against", "support", "tribute", "cede", "passage", "basing", "tollFree", "fugitives", "protect", "serve"];
export const RequestKinds: readonly ClauseKind[] = ["askGold", "askSupport", "askWithdraw", "askCede", "askTribute", "askHelp", "askOath", "askPassage", "askBasing", "askTollFree", "askProtect", "askServe"];
export const NewsKinds: readonly ClauseKind[] = ["newsTroops", "newsStrength", "newsTaken", "newsSiege"];
export const AnswerKinds: readonly ClauseKind[] = ["accept", "refuse", "counter"];
/**
 * What the one who receives the letter would give, were he to agree: a script king never seals a tablet that holds one,
 * except the passage or basing he means to grant (item 9).
 */
export const GivingKinds: readonly ClauseKind[] = ["askGold", "askCede", "askTribute", "askWithdraw", "askPassage", "askBasing", "askTollFree", "askServe"];
/** The clauses that grant a right once the tablet that holds them is sealed (item 9): every other clause obliges nobody. */
export const GrantingKinds: readonly ClauseKind[] = ["passage", "basing", "askPassage", "askBasing"];

/**
 * One clause. Only the fields its kind uses are set; the rest stay null. `power`: the king it names (against whom, whose
 * troops, who is in league with the Habiru, who besieges). `province`: the land it names (ceded, asked for, attacked, a
 * move's start). `to`: a move's end. `turn`: the season of a move. `amount`: shekels of gold, or for `newsStrength` 0
 * (few) or 1 (many). `answers`: for an answer, the kind of clause it answers. For passage and basing (item 9), `province` is
 * the land opened (none: all the granting king's land, for passage) and `turn` the last season the grant stands (none: until
 * revoked). For a trade right (item 9+b), `tollFree` promises that the writer takes no toll on the reader's goods entering
 * his land, and `askTollFree` asks it of the reader: words, like every other clause, since the rate is what is charged.
 * `fugitives` (item 10+b, "Fugitive clauses"): each sends back the other's runaways who come into his land, as Hittite
 * treaties wrote; words too, kept by the order that sends runaways back. `protect` and `serve` (item 11+, "Vassalage is
 * words"): the writer takes the reader's land under his protection, or is the reader's servant (takes up no arms against
 * him or his friends, and sends troops when called), with their requests `askProtect` and `askServe`; with `tribute` they
 * are the vassal tablet's template, words like every other clause.
 */
export interface Clause {
  kind: ClauseKind;
  power: Power | null;
  province: string | null;
  to: string | null;
  turn: number | null;
  amount: number | null;
  answers: ClauseKind | null;
}

export function newClause(init: Partial<Clause> & Pick<Clause, "kind">): Clause {
  return { power: null, province: null, to: null, turn: null, amount: null, answers: null, ...init };
}

export const ClauseSchema: ObjSchema<Clause> = obj("Clause", () => newClause({ kind: "wellWishes" }), {
  kind: S,
  power: opt(S),
  province: opt(S),
  to: opt(S),
  turn: opt(I),
  amount: opt(I),
  answers: opt(S),
});

export const clause = (kind: ClauseKind, init: Partial<Omit<Clause, "kind">> = {}): Clause => newClause({ kind, ...init });

/** Whether the press is free text with clauses beside it, or clauses alone (the table's setting; see GameConfig.pressMode). */
export const PressModeValues = ["full", "structured"] as const;
export type PressMode = (typeof PressModeValues)[number];
