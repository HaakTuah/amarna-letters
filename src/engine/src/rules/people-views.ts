/**
 * How a court sees each person (split from `rules/views.ts` by meaning): its own people's lines (duty, where, timing,
 * term), what it believes of a servant it has lost sight of (a cover), captives and their ransom, and what it knows of
 * anyone else. `Views.character` and the seat view read them.
 */
import { newsOffered } from "./news.ts";
import { idiv } from "../core/num.ts";
import { WorldMap } from "../model/map.ts";
import { coverOf, factsKnownTo, falseNameAt, hiddenAt, jobKnown, newContract, type Character, type Contract, type Cover } from "../model/people.ts";
import { claimWords } from "./skills.ts";
import { tongueWords } from "../model/languages.ts";
import { AllPowers, land, powerName, reignKnown, type Power } from "../model/power.ts";
import { type PendingTask } from "../model/records.ts";
import { isAlive, type GameState } from "../model/state.ts";
import { newCharacterView, newNewsOffer, type CharacterView } from "../model/views.ts";
import { formatMoney, season } from "./calendar.ts";
import { courtOf, fallenRealmOf, kingLossUnheard, realmOfKing } from "./court.ts";
import { basePrice, LetterData } from "../turn/turn-engine.ts";
import { travelTurns } from "../turn/core.ts";

/**
 * Whether `viewer` sees `c` standing at its court: anyone there in the open (its own people, envoys received there, free
 * people, anyone it holds), but not a foreign spy posted there in secret.
 */
export function seenAtCourt(c: Character, viewer: Power): boolean {
  return c.at === viewer && !hiddenAt(c, viewer);
}

/**
 * Whether a court knows of a person, so that its view lists them (its court, or the people it knows): its own servants
 * (and one abroad whose fate it has not heard of, as it believes), anyone seen at its court, held there or who presented
 * themselves to it, and anyone a fact it knows names. A foreign spy posted at its court in secret is not seen there. The
 * dead are known only to the court they served.
 */
export function knows(c: Character, viewer: Power, s: GameState | null = null): boolean {
  if (coverOf(c, viewer) !== null) return true;
  if (c.status === "Dead" && c.employer !== viewer) return false;
  return (
    isOurs(c, viewer, s) ||
    seenAtCourt(c, viewer) ||
    c.heldBy === viewer ||
    c.pitches.has(viewer) ||
    c.facts.some((f) => f.secrecy !== "Public" && f.knownBy.includes(viewer))
  );
}

/** A servant of the court's, at home, abroad or held captive. */
export function isOurs(c: Character, viewer: Power, s: GameState | null = null): boolean {
  // Item 13: one who holds the king's command or governorship is his, in his service or free.
  if ((c.employer === viewer && (c.status === "Employed" || c.status === "Captured")) || (c.grantedBy === viewer && c.status !== "Dead")) return true;
  // Item 17b, part C: its own king, dead away from it, is its own until the word comes.
  return s !== null && c.employer === viewer && realmOfKing(s, c.id) === viewer && kingLossUnheard(s, viewer);
}

/** One its court does not know took its job yet (an offer taken abroad, whose word is on the road): it sees nothing of it. */
export function unheardHire(s: GameState, c: Character, viewer: Power): boolean {
  return c.employer === viewer && !jobKnown(c, s.turn);
}

/** Whom a captive held by `court` is known there to serve: a king's realm, to a court that knows he reigns (item 17b), else whom it confessed to serving. */
export function captiveMaster(s: GameState, id: string, court: Power): Power | null {
  const realm = realmOfKing(s, id);
  return realm !== null && reignKnown(court, realm) ? realm : confessedMaster(s, id, court);
}

/**
 * Whom a spy `court` caught confessed to serving when it was caught there (its latest capture there), or null if it would
 * not say: all the court learned of its master.
 */
export function confessedMaster(s: GameState, id: string, court: Power): Power | null {
  let found: Power | null = null;
  let any = false;
  for (const l of s.losses)
    if (l.characterId === id && l.court === court && l.kind === "Captured") {
      found = l.master;
      any = true;
    }
  return any ? found : null;
}

export function characterView(s: GameState, c: Character, viewer: Power): CharacterView {
  // Item 17b, part C: its own king taken or dead away from his court, as the court last knew him until the word comes.
  if (c.status !== "Employed" && realmOfKing(s, c.id) === viewer && kingLossUnheard(s, viewer))
    return characterView(s, { ...c, status: "Employed", duty: "Ruling", heldBy: null, intercepted: false, at: viewer }, viewer);
  const cover = coverOf(c, viewer);
  if (cover !== null) return coveredView(s, c, cover);
  const ours = c.employer === viewer || c.grantedBy === viewer;
  const captive = ours && c.status === "Captured" && c.heldBy !== null;
  // A foreign spy hidden at your court is, to you, someone elsewhere: no place, no master.
  const here = seenAtCourt(c, viewer);
  // A free person at your court (not held by another) can be hired there at what they ask, whether or not they pitched.
  const freeHere = c.status === "Free" && here && (c.heldBy === null || c.heldBy === viewer);
  // The contract of one who still serves you (not of one dead in your service).
  const k: Contract | null = ours && (c.status === "Employed" || c.status === "Captured") ? c.contract : null;
  const price = c.askingPrice.tryGet(viewer);
  // The name it gave your court (item 10, "Declaring a name"): what you know of it is what you learned under that name, and
  // of a borrowed name, what you know of the man whose name it is.
  const alias = falseNameAt(c, viewer);
  const borrowed = alias?.as != null ? (s.characters.find((x) => x.id === alias.as) ?? null) : null;
  const facts = [...(borrowed !== null ? factsKnownTo(borrowed, viewer) : []), ...factsKnownTo(c, viewer)].map((f) => f.text);
  // Item 17b: a king the viewer knows reigns (an heir, once word of him has come).
  const realm = realmOfKing(s, c.id);
  const kingOf = realm !== null && reignKnown(viewer, realm) ? realm : null;
  return newCharacterView({
    id: c.id,
    name: alias?.name ?? c.name,
    origin: alias === null || alias.name === c.name ? c.origin : (borrowed?.origin ?? ""),
    ours,
    status: c.status === "Captured" && c.heldBy === viewer ? "your captive" : c.status.toLowerCase(),
    // A spy you caught: whom it confessed to serving, if it did.
    employer: ours || (c.status === "Employed" && here) || kingOf !== null ? c.employer : c.status === "Captured" && c.heldBy === viewer ? confessedMaster(s, c.id, viewer) : null,
    duty: captive ? captiveText(s, c.id, c.heldBy!, viewer) : ours ? dutyText(c) : "",
    where: ours || here ? whereText(c, viewer) : "",
    province: ours && !captive ? landPlace(c) : null,
    timing: ours ? timingText(s, c) : "",
    fee: k === null ? null : k.fee + k.carried,
    advance: k?.advance ?? null,
    contractFrom: k?.startTurn ?? null,
    contractUntil: k?.untilTurn ?? null,
    errandWhat: k?.errand?.what ?? null,
    errandWhere: k?.errand?.where ?? null,
    // Whether its errand is done its master knows once it is home with nothing to do.
    errandDone: (k?.errand?.done ?? false) && c.duty === "None" && c.at === viewer,
    payOnDone: k?.payOnDone ?? false,
    won: c.won,
    lost: c.lost,
    offerAgain: k?.offerAgain ?? false,
    term: k === null ? "" : termText(k.fee + k.carried, k.advance, k.untilTurn, s.turn, k),
    knownFacts: facts,
    pitch: c.pitches.tryGet(viewer) ?? null,
    // What it said it can do when it pitched to you (item 10, "Kings never see skills"): words, never its skill.
    claims: c.pitches.has(viewer) && c.claimed !== null ? claimWords(c.claimed) : [],
    // Item 12: the languages it says it speaks, to a court where it stands (its master's too) or where it pitched; of a
    // servant away its master knows only what it said before it went, and is not told it again here.
    speaks: here || c.pitches.has(viewer) ? tongueClaimsAs(c) : [],
    claimsToServe: alias?.employer ?? null,
    // Your own servant's price to serve on is in its term; an old asking price from before it was hired means nothing now.
    askingPrice: ours ? null : price !== undefined ? price : freeHere ? basePrice(c, viewer) : null,
    ready: ours && c.status === "Employed" && c.duty === "None" && c.at === viewer,
    heldByYou: c.heldBy === viewer,
    intercepted: c.heldBy === viewer && c.intercepted,
    kingOf,
    heirOf: heirKnown(s, viewer, c.id),
    ransomDemand: captive ? (knownDemand(s, c.id, c.heldBy!, viewer)?.spend ?? null) : null,
    ransomCarrier: c.status === "Captured" && c.heldBy === viewer ? ransomCarrier(s, c, viewer) : null,
    owed: c.owed.getOrDefault(viewer, 0) > 0 ? c.owed.get(viewer) : null,
    hoardHere: c.hoard !== null && c.hoard.at === viewer && c.status !== "Dead" ? c.hoard.gold : null,
    carries: c.status === "Captured" && c.heldBy === viewer ? c.purse + c.carriedFor : null,
    // Item 11a: one standing at your court, free to deal, who offers to lend you gold.
    // A copy: the view is what the court saw when it was asked, not a window on the lender's purse as the season moves it.
    lends: c.lendOffer !== null && c.at === viewer && c.heldBy === null && c.status !== "Dead" && !hiddenAt(c, viewer) && c.lendOffer.amount > 0 ? { ...c.lendOffer } : null,
    // Item 11b: the news of other courts they offer you, standing at your court.
    news: hiddenAt(c, viewer) ? [] : newsOffered(s, c, viewer).map((n) => newNewsOffer({ court: n.court, turn: n.turn, lines: n.lines.length, price: n.price })),
  });
}

/**
 * Item 12: the languages a person says it speaks, in words: what it believes, one who overrates itself claiming a level
 * more ("may boast that it is fluent").
 */
export function tongueClaimsAs(c: Character): string[] {
  const boast = c.inclination > 10 ? 40 : 0;
  return [...c.tongues.entries()]
    .filter(([, x]) => x > 0)
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
    .map(([l, x]) => `${l} (${tongueWords(Math.min(100, x + boast))})`);
}

/** A servant as its master still believes it to be: the same fields the master saw before, never ready. */
export function coveredView(s: GameState, c: Character, cover: Cover): CharacterView {
  const held = cover.heldAt;
  return newCharacterView({
    id: c.id,
    name: c.name,
    origin: c.origin,
    ours: true,
    status: held === null ? "employed" : "captured",
    employer: cover.for,
    duty: held !== null ? captiveText(s, c.id, held, cover.for) : cover.dutyText,
    where: held !== null ? `at the court of ${powerName(held)}` : cover.whereText,
    province: held !== null ? null : cover.province,
    timing: held === null ? cover.timingText : "",
    fee: cover.fee,
    advance: cover.advance,
    contractFrom: cover.startTurn,
    contractUntil: cover.contractUntil,
    errandWhat: cover.errand?.what ?? null,
    errandWhere: cover.errand?.where ?? null,
    errandDone: cover.errand?.done ?? false,
    payOnDone: cover.payOnDone,
    offerAgain: cover.offerAgain,
    term: termText(cover.fee, cover.advance, cover.contractUntil, s.turn, newContract({ fee: cover.fee, advance: cover.advance, errand: cover.errand, payOnDone: cover.payOnDone, offerAgain: cover.offerAgain })),
    // What it knew then and what its inquiries have found since, as for a servant really away.
    knownFacts: c.facts.filter((f) => cover.factIds.includes(f.id) || (f.secrecy !== "Public" && f.knownBy.includes(cover.for))).map((f) => f.text),
    pitch: c.pitches.tryGet(cover.for) ?? null,
    ransomDemand: held !== null ? (knownDemand(s, c.id, held, cover.for)?.spend ?? null) : null,
    owed: c.owed.getOrDefault(cover.for, 0) > 0 ? c.owed.get(cover.for) : null,
  });
}

/**
 * A servant's job in plain words, as its master reads it (item 11a, with the owner's answers): its errand, the fee, what was
 * handed over and what falls due when it is done, by when, and the standing orders that go with it. `fee` is null when
 * no job is to be said.
 */
/** Where an errand goes, by the name a king reads: a court by its realm's name, a province by its own (never its id). */
export const errandPlace = (where: string): string => ((AllPowers as readonly string[]).includes(where) ? land(where as Power) : placeName(where));

export function termText(fee: number | null, advance: number | null, until: number | null, turn: number, k: Contract | null = null): string {
  if (fee === null) return "";
  const e = k?.errand ?? null;
  const errand = e === null ? "a job, its errand named when you send them" : e.what === "stay" ? "a job to stay at your court until its term ends (any other errand is a new job, with its own fee)" : e.what === "ride" ? `a job to ride to ${errandPlace(e.where)} and bring its report home this season` : `a job as ${e.what === "envoy" ? `envoy to ${errandPlace(e.where)}` : `spy on ${errandPlace(e.where)}`}`;
  const rest = Math.max(0, fee - (advance ?? 0));
  const due = k === null || k.payOnDone ? `${rest} when it is done` : `${rest} owed when it is done, paid only if you order it (pay_fee)`;
  const serves = `${errand}: ${fee} shekels, ${advance ?? 0} paid, ${due}`;
  const again = k !== null && k.offerAgain ? "; the same job is offered again when it is done" : "";
  if (until === null) return serves + again;
  return until >= turn
    ? `${serves}; term to turn ${until}${again}`
    : `${serves}; its term ended with turn ${until}, and the job ends when they are next at your court with nothing to do${again}`;
}

/**
 * When one of your servants away set out and when it is due back, as its master can reckon it from the travel table: an
 * envoy on its way out, at a foreign court or on the road home, a spy on its way to its post or home. Blank at court,
 * held, or at its post. A cover keeps this text as it stood (Cover.timingText).
 */
export function timingText(s: GameState, c: Character, map: WorldMap | null = null): string {
  const m = map ?? WorldMap.default;
  const home = c.employer;
  if (c.status !== "Employed" || home === null) return "";
  const journey = s.journeys.find(
    (j) => j.characterId === c.id && (j.kind === "EnvoyOutbound" || j.kind === "EnvoyHomebound" || j.kind === "SpyOutbound" || j.kind === "SpyHomebound"),
  );
  const trail = c.currentTrail !== null ? (s.trails.find((x) => x.id === c.currentTrail && x.from === home) ?? null) : null;
  const back = (from: Power): number => travelTurns(s.config, m, courtOf(s, m, from), courtOf(s, m, home), s.turn);
  switch (c.duty) {
    // On its way the reckoning is a reckoning ("due there"); only once it stands at that court is it "received there".
    case "EnvoyOutbound":
      if (journey?.kind === "EnvoyOutbound") return `set out in turn ${journey.departTurn} for ${powerName(journey.to)}; due there about turn ${journey.arriveTurn}; due back about turn ${journey.arriveTurn + back(journey.to)}`;
      return "";
    case "EnvoyAtCourt":
      if (trail !== null && c.at !== null) return `set out in turn ${trail.turn} for ${powerName(c.at)}; received there in turn ${s.turn}; due back about turn ${s.turn + back(c.at)}`;
      return "";
    case "EnvoyHomebound":
      if (journey?.kind === "EnvoyHomebound" && trail !== null) return envoyHomeTiming(trail.turn, trail.to, journey.arriveTurn);
      if (journey !== undefined && (journey.kind === "EnvoyHomebound" || journey.kind === "SpyHomebound")) return homeTiming(journey.arriveTurn);
      return "";
    case "SpyOutbound":
      if (journey?.kind === "SpyOutbound") return `set out in turn ${journey.departTurn}; due there about turn ${journey.arriveTurn}`;
      return "";
    default:
      return "";
  }
}

/** An envoy on the road home: what its master reads, and what a cover keeps when the envoy is held or goes over. */
export function envoyHomeTiming(setOut: number, to: Power, due: number): string {
  return `set out in turn ${setOut} for ${powerName(to)}; ${homeTiming(due)}`;
}

/** A servant on the road home with no mission of its own to name (a spy recalled). */
export function homeTiming(due: number): string {
  return `due back about turn ${due}`;
}

/** One of the viewer's people held captive abroad, with the ransom demanded if that word has reached it. */
export function captiveText(s: GameState, id: string, heldAt: Power, viewer: Power): string {
  const demand = knownDemand(s, id, heldAt, viewer);
  return demand !== null
    ? `held captive at the court of ${powerName(heldAt)}; ${powerName(heldAt)} demands ${formatMoney(demand.spend)} for their return (order pay_ransom)`
    : `held captive at the court of ${powerName(heldAt)}`;
}

/** What the cheapest free person at the captor's court would ask to carry its ransom demand to the captive's king, or null. */
export function ransomCarrier(s: GameState, c: Character, captor: Power): number | null {
  const payer = c.employer !== null ? c.employer : c.formerEmployer;
  if (payer === null || !isAlive(s, payer) || !isAlive(s, captor)) return null;
  const m = WorldMap.default;
  const seasons = Math.max(1, travelTurns(s.config, m, courtOf(s, m, captor), courtOf(s, m, payer), s.turn));
  const asks = s.characters
    .filter((x) => x.status === "Free" && x.at === captor && x.duty === "None" && x.heldBy === null && x.errand === null)
    .map((x) => idiv(basePrice(x, payer) * seasons * LetterData.hiredPercent, 100));
  return asks.length === 0 ? null : Math.min(...asks);
}

/** The open ransom demand for a captive, once its rumour has reached the court asked to pay. */
export function knownDemand(s: GameState, id: string, heldAt: Power, payer: Power): PendingTask | null {
  let found: PendingTask | null = null;
  for (const t of s.tasks) if (t.kind === "RansomDemand" && t.announced && t.characterId === id && t.requester === payer && t.other === heldAt) found = t;
  return found;
}

/** A province as the map names it (bug #734): never its id, which a king could repeat. */
export const placeName = (id: string | null): string => (id !== null && WorldMap.default.exists(id) ? WorldMap.default.get(id).name : (id ?? ""));

/**
 * The province one of the court's own people stands in out in the land, as his duty has it (bug #734), so it says no more
 * than the words do: a post, a command, a governorship, or the road to one; null at a court.
 */
export function landPlace(c: Character): string | null {
  const posted = c.duty === "Leading" || c.duty === "Commanding" || c.duty === "Governing" || ((c.duty === "SpyPosted" || c.duty === "SpyOutbound") && c.missionTarget === null);
  return posted || (c.at === null && c.status !== "Captured") ? c.watchProvince : null;
}

export function dutyText(c: Character): string {
  if (c.duty === "UnderGuard") return "a captive on the road under guard";
  if (c.status === "Captured" && c.heldBy !== null) return `held captive at the court of ${powerName(c.heldBy)}`;
  switch (c.duty) {
    case "None":
      return "at court, ready for a mission";
    case "EnvoyOutbound":
      return `travelling as envoy to ${c.missionTarget !== null ? powerName(c.missionTarget) : ""}`;
    // Where he is, the line's other half says (`whereText`): each place once (bug #734).
    case "EnvoyAtCourt":
      return "as envoy";
    case "EnvoyHomebound":
      return "on the road home";
    case "Detained":
      return `has not returned from ${c.missionTarget !== null ? powerName(c.missionTarget) : ""}`;
    case "SpyOutbound":
      return `travelling on a quiet errand to ${c.missionTarget !== null ? powerName(c.missionTarget) : placeName(c.watchProvince)}`;
    case "SpyPosted":
      return `watching ${c.missionTarget !== null ? land(c.missionTarget) : placeName(c.watchProvince)}`;
    case "Travelling":
      return "travelling on their own way";
    case "Leading":
      return `leading a band in ${placeName(c.watchProvince)}`;
    case "Commanding":
      return `commanding an army in ${placeName(c.watchProvince)}`;
    case "Governing":
      return `governing ${placeName(c.watchProvince)}`;
    case "Ruling":
      return "ruling in his own name";
    case "Abroad":
      return "gone beyond the map";
  }
}

/** Where one of a court's people is, every court by the name the game shows it (bug #797), never its id. */
export function whereText(c: Character, viewer: Power): string {
  if (c.status === "Captured") return c.heldBy === viewer ? "in your prison" : c.heldBy !== null && c.employer === viewer ? `at the court of ${powerName(c.heldBy)}` : "unknown";
  if (c.duty === "Detained" && c.employer === viewer) return "unknown";
  if (c.at !== null) return c.at === viewer ? "at your court" : `at the court of ${powerName(c.at)}`;
  // Out in the land: the province by its name, unless the duty already names it (bug #734).
  if (c.watchProvince === null) return "travelling";
  if (c.duty === "Leading" || c.duty === "Commanding" || c.duty === "Governing" || (c.duty === "SpyPosted" && c.missionTarget === null)) return "";
  return `in ${placeName(c.watchProvince)}`;
}

/** Item 17b, part C2: the fallen realm a character claims, once the viewer has heard of its fall (a fallen court sees all). */
export function heirKnown(s: GameState, viewer: Power, id: string): Power | null {
  const p = fallenRealmOf(s, id);
  return p !== null && (!isAlive(s, viewer) || (s.fallsHeard.tryGet(viewer) ?? []).includes(p)) ? p : null;
}
