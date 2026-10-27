/**
 * The templates of structured press (build order item 8, "Two press modes"): each clause in the words of the age, and the
 * checks a clause must pass. The words are the same whoever writes the letter, so a clause leaves no tell of its writer.
 */
import { AllPowers, type Power, land } from "../model/power.ts";
import { AnswerKinds, ClauseKindValues, NewsKinds, ProposalKinds, RequestKinds, type Clause, type ClauseKind } from "../model/clauses.ts";
import { WorldMap } from "../model/map.ts";
import { year, seasonIndex } from "./calendar.ts";

/** At most this many clauses in a letter, a tablet or an answer: a letter of the age is short. */
export const MaxClauses = 8;

const ordinal = ["first", "second", "third"];
/** "the second season of year 3": the year every court counts alike. */
export const seasonWords = (turn: number): string => `the ${ordinal[seasonIndex(turn)]} season of year ${year(turn)}`;

const place = (id: string | null): string => (id !== null && WorldMap.default.exists(id) ? WorldMap.default.get(id).name : "a land of mine");
const shekels = (n: number | null): string => `${Math.max(0, n ?? 0)} shekels of gold`;
const kingOf = (p: Power | null, from: Power, to: Power): string => (p === null ? "the king" : p === to ? "you" : p === from ? "I" : `the king of ${land(p)}`);
const up = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);
const troopsOf = (p: Power | null, from: Power, to: Power): string =>
  p === null ? "troops" : p === to ? "your troops" : p === from ? "my troops" : `the troops of ${land(p)}`;

/** What an answer names: "your offer of peace", "your request for gold". */
function named(k: ClauseKind | null): string {
  switch (k) {
    case "peace":
      return "your offer of peace";
    case "noAttack":
      return "your word that your troops will not enter my land";
    case "alliance":
      return "your offer of alliance";
    case "against":
      return "your call to stand together";
    case "support":
      return "your offer of support";
    case "tribute":
      return "your offer of tribute";
    case "cede":
      return "your offer of land";
    case "passage":
      return "your offer of passage";
    case "basing":
      return "your offer of a place within your walls";
    case "askGold":
      return "your request for gold";
    case "askSupport":
      return "your request for support";
    case "askWithdraw":
      return "your demand that my troops withdraw";
    case "askCede":
      return "your demand for land";
    case "askTribute":
      return "your demand for tribute";
    case "askHelp":
      return "your plea for help";
    case "askOath":
      return "your call for an oath";
    case "askPassage":
      return "your request for passage";
    case "askBasing":
      return "your request for a place within my walls";
    default:
      return "your words";
  }
}

/** "until the third season of year 2", or nothing for a grant that stands until revoked. */
const until = (turn: number | null): string => (turn !== null ? ` until ${seasonWords(turn)}` : "");

/** One clause in the words of the age, as `from` writes it to `to`. */
export function renderClause(c: Clause, from: Power, to: Power): string {
  switch (c.kind) {
    case "wellWishes":
      return "May it be well with you, with your house, your wives, your sons, your chariots and your horses.";
    case "gift":
      return `As a greeting-gift I send you ${shekels(c.amount)}.`;
    case "peace":
      return "Let there be peace between us: let neither of us send troops into the land of the other.";
    case "noAttack":
      return "My troops will not enter your land.";
    case "alliance":
      return "Let us be allies: let your enemy be my enemy, and your friend my friend.";
    case "against":
      return `Let us stand together against ${kingOf(c.power, from, to)}.`;
    case "support":
      return `In ${c.turn !== null ? seasonWords(c.turn) : "the coming season"}, my troops will support the move of your troops from ${place(c.province)} into ${place(c.to)}.`;
    case "tribute":
      return `I will send you ${shekels(c.amount)} each year as tribute.`;
    case "cede":
      return `I give you the land of ${place(c.province)}.`;
    case "passage":
      return `Let your troops pass through ${c.province !== null ? `my land of ${place(c.province)}` : "my land"}${until(c.turn)}: my men will not stop them, and the land stays mine.`;
    case "basing":
      return `Let your troops stand within the walls of my city of ${place(c.province)}${until(c.turn)}, as my guests.`;
    case "askGold":
      return `Send me ${shekels(c.amount)}.`;
    case "askSupport":
      return `In ${c.turn !== null ? seasonWords(c.turn) : "the coming season"}, let your troops support the move of my troops from ${place(c.province)} into ${place(c.to)}.`;
    case "askWithdraw":
      return `Withdraw your troops from ${place(c.province)}.`;
    case "askCede":
      return `Give me the land of ${place(c.province)}.`;
    case "askTribute":
      return `Send me ${shekels(c.amount)} each year as tribute.`;
    case "askHelp":
      return `${up(troopsOf(c.power, from, to))} besiege my city of ${place(c.province)}: send your troops to drive them out.`;
    case "askOath":
      return "Swear to me that your troops will stand with mine, as mine will stand with yours.";
    case "askPassage":
      return `Let my troops pass through ${c.province !== null ? `your land of ${place(c.province)}` : "your land"}${until(c.turn)}: let your men not stop them, and the land stays yours.`;
    case "askBasing":
      return `Let my troops stand within the walls of your city of ${place(c.province)}${until(c.turn)}, as your guests.`;
    case "threat":
      return c.province !== null ? `If you do not do as I ask, my troops will march on ${place(c.province)}.` : "If you do not do as I ask, my troops will march into your land.";
    case "grievance":
      return c.province !== null ? `Your troops have entered my land at ${place(c.province)}, and I have not forgotten it.` : "You have wronged me, and I have not forgotten it.";
    case "brokenOath":
      return "You have broken the oath you swore to me before the gods.";
    case "lightGift":
      return `The gold your messenger brought weighed ${c.amount !== null && c.amount > 0 ? `${c.amount} shekels ` : ""}less than the inventory states.`;
    case "envoyLied":
      return "Your messenger has lied to me.";
    case "habiru":
      return c.power === to ? "You are in league with the Habiru." : `${up(kingOf(c.power, from, to))} is in league with the Habiru.`;
    case "newsTroops":
      return `${up(troopsOf(c.power, from, to))} stand in ${place(c.province)}.`;
    case "newsStrength":
      return `${up(troopsOf(c.power, from, to))} are ${c.amount === 1 ? "many, and friendship with " + (c.power === from ? "me" : "them") + " is worth keeping" : "few, and " + (c.power === from ? "my" : "their") + " thoughts are of peace"}.`;
    case "newsTaken":
      return `${up(kingOf(c.power, from, to))} ${c.power === from ? "have" : c.power === to ? "have" : "has"} taken ${place(c.province)}.`;
    case "newsSiege":
      return `${up(kingOf(c.power, from, to))} ${c.power === from || c.power === to ? "besiege" : "besieges"} ${place(c.province)}.`;
    case "accept":
      return `I accept ${named(c.answers)}.`;
    case "refuse":
      return `I refuse ${named(c.answers)}.`;
    case "counter":
      return counter(c);
  }
}

function counter(c: Clause): string {
  switch (c.answers) {
    case "askGold":
    case "gift":
      return `I cannot send what you ask, but I will send ${shekels(c.amount)}.`;
    case "askTribute":
    case "tribute":
      return `Not that much: ${shekels(c.amount)} each year.`;
    case "askSupport":
    case "support":
      return `Not then: my troops will support the move of yours from ${place(c.province)} into ${place(c.to)} in ${c.turn !== null ? seasonWords(c.turn) : "a later season"}.`;
    case "askCede":
    case "cede":
      return `Not that land, but ${place(c.province)}.`;
    default:
      return `Not as you ask: ${named(c.answers).replace(/^your /, "let us speak again of ")}.`;
  }
}

/** A letter, a tablet or an answer set out in its clauses, one after the other. */
export function renderClauses(cs: readonly Clause[], from: Power, to: Power): string {
  return cs.map((c) => renderClause(c, from, to)).join(" ");
}

/**
 * Why a clause cannot stand, or null. `turn`: the season it is written in (a move must lie ahead).
 */
export function clauseError(c: Clause, from: Power, to: Power, turn: number): string | null {
  const Map = WorldMap.default;
  if (!(ClauseKindValues as readonly string[]).includes(c.kind)) return `there is no clause '${c.kind}'`;
  const needs = (what: string): string => `the clause '${c.kind}' needs ${what}`;
  const land_ = (id: string | null): boolean => id !== null && Map.exists(id) && !Map.get(id).isSea;
  const anywhere = (id: string | null): boolean => id !== null && Map.exists(id);
  const king_ = (p: Power | null): boolean => p !== null && (AllPowers as readonly string[]).includes(p);
  switch (c.kind) {
    case "gift":
    case "tribute":
    case "askGold":
    case "askTribute":
      if (c.amount === null || c.amount <= 0) return needs("an amount of gold above 0");
      if (c.amount > 5000) return "no king sends more than 5000 shekels in one clause";
      return null;
    case "against":
      if (!king_(c.power)) return needs("a king to stand against");
      if (c.power === from || c.power === to) return "a stand together is against a third king";
      return null;
    case "support":
    case "askSupport":
      if (!anywhere(c.province) || !anywhere(c.to)) return needs("the move's start and end (provinces or waters)");
      if (!Map.areAdjacent(c.province!, c.to!)) return `${Map.get(c.province!).name} and ${Map.get(c.to!).name} do not border each other`;
      if (c.turn === null || c.turn <= turn) return needs("a season to come (a turn after this one)");
      return null;
    case "cede":
    case "askCede":
    case "askWithdraw":
      return land_(c.province) ? null : needs("a land province");
    case "passage":
    case "askPassage":
    case "basing":
    case "askBasing":
      if ((c.kind === "basing" || c.kind === "askBasing") && !land_(c.province)) return needs("the city its troops would stand in");
      if (c.province !== null && !land_(c.province)) return `there is no land called '${c.province}'`;
      if (c.turn !== null && c.turn <= turn) return needs("a season to come (a turn after this one), or none for as long as it is not revoked");
      return null;
    case "askHelp":
      if (!land_(c.province)) return needs("the besieged city");
      return king_(c.power) ? null : needs("the besieger");
    case "threat":
    case "grievance":
      return c.province === null || land_(c.province) ? null : `there is no land called '${c.province}'`;
    case "habiru":
      return king_(c.power) ? null : needs("the king in league with the Habiru");
    case "newsTroops":
    case "newsTaken":
    case "newsSiege":
      if (!king_(c.power)) return needs("the king it tells of");
      return anywhere(c.province) ? null : needs("the province it tells of");
    case "newsStrength":
      if (!king_(c.power)) return needs("the king it tells of");
      return c.amount === 0 || c.amount === 1 ? null : needs("an amount of 0 (few) or 1 (many)");
    case "accept":
    case "refuse":
    case "counter":
      if (c.answers === null || !([...ProposalKinds, ...RequestKinds, "gift"] as readonly string[]).includes(c.answers)) return needs("the kind of proposal or request it answers");
      if (c.kind === "counter" && ["askGold", "askTribute", "tribute", "gift"].includes(c.answers) && (c.amount === null || c.amount < 0)) return needs("the amount offered instead");
      if (c.kind === "counter" && c.province !== null && !anywhere(c.province)) return `there is no province called '${c.province}'`;
      if (c.kind === "counter" && c.to !== null && (!anywhere(c.to) || c.province === null || !Map.areAdjacent(c.province, c.to))) return "a counter's move must be between bordering provinces";
      return null;
    default:
      return null;
  }
}

/** The fields each kind uses: any other is cleared, so that no field carries words of its own between kings. */
export const ClauseFields: Record<ClauseKind, readonly ("power" | "province" | "to" | "turn" | "amount" | "answers")[]> = {
  wellWishes: [],
  gift: ["amount"],
  peace: [],
  noAttack: [],
  alliance: [],
  against: ["power"],
  support: ["province", "to", "turn"],
  tribute: ["amount"],
  cede: ["province"],
  passage: ["province", "turn"],
  basing: ["province", "turn"],
  askGold: ["amount"],
  askSupport: ["province", "to", "turn"],
  askWithdraw: ["province"],
  askCede: ["province"],
  askTribute: ["amount"],
  askHelp: ["province", "power"],
  askOath: [],
  askPassage: ["province", "turn"],
  askBasing: ["province", "turn"],
  threat: ["province"],
  grievance: ["province"],
  brokenOath: [],
  lightGift: ["amount"],
  envoyLied: [],
  habiru: ["power"],
  newsTroops: ["power", "province"],
  newsStrength: ["power", "amount"],
  newsTaken: ["power", "province"],
  newsSiege: ["power", "province"],
  accept: ["answers"],
  refuse: ["answers"],
  counter: ["answers", "amount", "province", "to", "turn"],
};

function cleaned(c: Clause): Clause {
  const uses = ClauseFields[c.kind];
  return {
    kind: c.kind,
    power: uses.includes("power") ? c.power : null,
    province: uses.includes("province") ? c.province : null,
    to: uses.includes("to") ? c.to : null,
    turn: uses.includes("turn") ? c.turn : null,
    amount: uses.includes("amount") && c.amount !== null ? Math.trunc(c.amount) : null,
    answers: uses.includes("answers") ? c.answers : null,
  };
}

/** The clauses that stand, each one cleaned of fields its kind does not use, and the reasons the others were dropped. */
export function checkClauses(cs: readonly Clause[] | null | undefined, from: Power, to: Power, turn: number): { kept: Clause[]; dropped: string[] } {
  const kept: Clause[] = [];
  const dropped: string[] = [];
  for (const c of cs ?? []) {
    if (kept.length >= MaxClauses) {
      dropped.push(`more than ${MaxClauses} clauses: the rest were left out`);
      break;
    }
    const why = clauseError(c, from, to, turn);
    if (why !== null) dropped.push(why);
    else kept.push(cleaned(c));
  }
  return { kept, dropped };
}

export const isProposal = (c: Clause): boolean => ProposalKinds.includes(c.kind);
export const isRequest = (c: Clause): boolean => RequestKinds.includes(c.kind);
export const isNews = (c: Clause): boolean => NewsKinds.includes(c.kind);
export const isAnswer = (c: Clause): boolean => AnswerKinds.includes(c.kind);

/** A clause by its kind and the fields it names, for lists where its words would be too long: "askGold (gold 50)". */
export function clauseTag(c: Clause): string {
  const parts: string[] = [];
  if (c.power !== null) parts.push(`king ${c.power}`);
  if (c.province !== null) parts.push(c.to !== null ? `from ${c.province}` : `province ${c.province}`);
  if (c.to !== null) parts.push(`into ${c.to}`);
  if (c.turn !== null) parts.push(`turn ${c.turn}`);
  if (c.amount !== null) parts.push(c.kind === "newsStrength" ? (c.amount === 1 ? "many" : "few") : `gold ${c.amount}`);
  if (c.answers !== null) parts.push(`answers ${c.answers}`);
  return parts.length > 0 ? `${c.kind} (${parts.join(", ")})` : c.kind;
}

/** Every clause the templates hold, with the fields it uses and its words, as the rulebook lists them. */
export const ClauseGuide: readonly string[] = [
  "Courtesies and gifts: wellWishes (May it be well with you, your house, your wives, your sons...); gift (gold: As a greeting-gift I send you N shekels of gold).",
  "Proposals: peace (Let there be peace between us...); noAttack (My troops will not enter your land); alliance (Let us be allies...); against (king: Let us stand together against him); support (province, into, season: In that season my troops will support the move of yours from one into the other); tribute (gold: I will send you N shekels each year as tribute); cede (province: I give you that land); passage (province or none for all my land, season or none: let your troops pass through it until then); basing (province, season or none: let your troops stand within the walls of that city until then).",
  "Requests: askGold (gold); askSupport (province, into, season: let your troops support the move of mine); askWithdraw (province); askCede (province); askTribute (gold); askHelp (province, king: the troops of that king besiege my city; send yours to drive them out); askOath (Swear that your troops will stand with mine); askPassage (province or none for all your land, season or none); askBasing (province, season or none).",
  "Threats: threat (province or none: If you do not do as I ask, my troops will march on it, or into your land).",
  "Grievances and accusations: grievance (province or none: your troops have entered my land there); brokenOath; lightGift (gold: the gold your messenger brought weighed less than the inventory states); envoyLied (Your messenger has lied to me); habiru (king: he is in league with the Habiru).",
  "News: newsTroops (king, province: his troops stand there); newsStrength (king, gold 0 for few or 1 for many); newsTaken (king, province: he has taken it); newsSiege (king, province: he besieges it).",
  "Answers: accept, refuse, counter (answers: the kind of clause answered; a counter names what it offers instead, gold, season or province).",
];
