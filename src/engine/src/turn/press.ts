/**
 * What letters set in motion beyond the audience (build order item 8): the record of who calls whom brother and grants whom
 * the title, a new claim to the rank of Great King becoming established, and supports promised in clauses being kept.
 */
import { Dict } from "../core/collections.ts";
import type { ClaimNameOrder, SupportOrder } from "../model/orders.ts";
import { claimantsOf, claimedName, house, isGreatKing, knownName, land, nameKnown, ownLand, setNameClaims, type Power } from "../model/power.ts";
import { newRecognition } from "../model/recognition.ts";
import type { GreetingOptions } from "../model/records.ts";
import { alive, logEvent, notify } from "../model/state.ts";
import { TurnEngine } from "./core.ts";

declare module "./core.ts" {
  interface TurnEngine {
    recordGreeting(from: Power, to: Power, g: GreetingOptions | null): void;
    claimName(p: Power, o: ClaimNameOrder): void;
    syncNames(): void;
    claimHeard(court: Power, claimant: Power, name: string | null): void;
    recognise(): void;
    promisesKept(supports: readonly [Power, SupportOrder][]): void;
  }
}

const P = TurnEngine.prototype;

/** The title of the notice every court reads when a new claim becomes established. */
export const ClaimEstablishedTitle = "A claim is established";

/**
 * A greeting sent: whether it calls the recipient brother and grants him the title Great King. A greeting in the king's own
 * words (custom) records nothing, since nothing in it is a formula the engine can read; no greeting at all withholds both.
 */
P.recordGreeting = function (from, to, g) {
  const S = this.s;
  if (g !== null && g.custom !== null && g.custom.trim().length > 0) return;
  let r = S.recognition.find((x) => x.from === from && x.to === to);
  if (r === undefined) {
    r = newRecognition({ from, to });
    S.recognition.push(r);
  }
  const omit = g?.omit === true;
  const brother = !omit && (g?.callBrother ?? true);
  const title = !omit && (g?.grantGreatKing ?? true);
  r.brotherSince = brother ? (r.brotherSince ?? S.turn) : null;
  r.titleSince = title ? (r.titleSince ?? S.turn) : null;
  r.lastTurn = S.turn;
  // Item 17+ ("A power's name is a claim"): a greeting gives the recipient the name he claims, where another claims it
  // too, unless it calls him by his house; one calling him by his house takes back a name given him before.
  // As the sender knows the claims: those he has read in the claimants' own greetings.
  const name = knownName(from, to);
  if (claimantsOf(name, from).length < 2) return;
  const given = S.nameGiven.tryGet(from) ?? new Dict<string, Power>();
  if (omit || g?.byHouse === true) {
    if (given.tryGet(name) === to) given.delete(name);
  } else given.set(name, to);
  S.nameGiven.set(from, given);
  this.syncNames();
};

/** The registry of names (`power.ts`) set to the state's, after a claim or a greeting changed it (item 17+). */
P.syncNames = function () {
  setNameClaims(this.s.names, this.s.eliminated, this.s.nameGiven, this.s.namesHeard);
};

/** A court reads in a claimant's sealed greeting the name he claims (item 17+); null: his own land's. */
P.claimHeard = function (court, claimant, name) {
  const S = this.s;
  const n = name ?? ownLand(claimant);
  const heard = S.namesHeard.tryGet(court) ?? new Dict<Power, string>();
  if ((heard.tryGet(claimant) ?? ownLand(claimant)) === n) return;
  if (n === ownLand(claimant)) heard.delete(claimant);
  else heard.set(claimant, n);
  S.namesHeard.set(court, heard);
  this.syncNames();
};

/** The title of the notice a court reads when its own claim to a name is recorded. */
export const NameClaimTitle = "A name claimed";

/**
 * A king claims a realm's name (item 17+): any the map knows or a power claims; his own land's name returns him to it. The
 * claim gives nothing by rule. His own court hears of it at once; others by his greetings, which name him so.
 */
P.claimName = function (p, o) {
  const S = this.s;
  const name = nameKnown(o.name);
  if (name === null || claimedName(p) === name) return;
  if (name === ownLand(p)) S.names.delete(p);
  else S.names.set(p, { name, since: S.turn });
  this.syncNames();
  // The rivals his court knows of: those whose greetings it has read.
  const rivals = claimantsOf(name, p).filter((x) => x !== p);
  notify(
    S,
    p,
    "Notice",
    NameClaimTitle,
    `Your court now calls you the king of ${name}.${rivals.length > 0 ? ` Another claims the name too: each court gives it to the claimant it recognises, in the greetings it sends, and calls the other by his house (yours is ${house(p)}).` : ""}`,
  );
  logEvent(S, "recognition", `${land(p)} claims the name of ${name}${rivals.length > 0 ? `, claimed also by ${rivals.map(land).join(", ")}` : ""}.`, [p], "name-claim");
};

/**
 * A new claim becomes established once more than half of the other living Great Kings have called the claimant brother for
 * `recognitionSeasons` seasons without a greeting since that withheld it. Every court hears of it.
 */
P.recognise = function () {
  const S = this.s;
  for (const c of S.claims) {
    if (c.established !== null || !alive(S).includes(c.power)) continue;
    // The others of the rank: the city-states (item 11+) do not make a Great King.
    const others = alive(S).filter((x) => x !== c.power && isGreatKing(x));
    const long = S.recognition.filter((r) => r.to === c.power && others.includes(r.from) && r.brotherSince !== null && S.turn - r.brotherSince >= S.config.recognitionSeasons);
    if (others.length === 0 || long.length * 2 <= others.length) continue;
    c.established = S.turn;
    const by = long.map((r) => r.from).join(", ");
    for (const p of alive(S))
      notify(S, p, "Notice", ClaimEstablishedTitle, `The claim of the king of ${land(c.power)} to be a Great King is no longer new: ${by} have called him brother for years.${c.overlord !== null && c.overlord !== c.power ? ` ${c.overlord} once held him a vassal.` : ""}`);
    logEvent(S, "recognition", `${c.power}'s claim to be a Great King is established: ${by} have called its king brother for years.`, null, "claim-established");
  }
};

/**
 * Supports given this season that keep a promise made in clauses: a letter's offer of support for that move in this season,
 * or a request for it the supporter accepted at its own court (item 8). Each is an event, for the spectator and the counts.
 */
P.promisesKept = function (supports) {
  const S = this.s;
  for (const [p, o] of supports) {
    if (o.to === null || o.to === undefined) continue;
    const match = (k: "support" | "askSupport") => (c: { kind: string; province: string | null; to: string | null; turn: number | null }) =>
      c.kind === k && c.province === o.supported && c.to === o.to && c.turn === S.turn;
    const offered = S.trails.some((t) => t.from === p && t.clauses.some(match("support")));
    const asked = S.trails.some(
      (t) => t.to === p && t.deliveredClauses.some(match("askSupport")) && t.exchanges.some((x) => x.clauses.some((c) => c.kind === "accept" && c.answers === "askSupport")),
    );
    if (offered || asked) logEvent(S, "press", `${p} kept its word and supported the move from ${o.supported} into ${o.to}.`, null, "support-kept");
  }
};
