/**
 * Legends, read from the record (build order item 14, "Legends, read from the record" and "The narrator illuminates; it
 * never steers" under Spectator mode): biographies of characters, histories of tablets, the rise and fall of courts, and,
 * when a game ends, every hidden fact opened to every seat. Nothing here is written in advance or invented: each line
 * reads what the engine recorded (events, tablets and their copies, who held each province, the falls, the scores), and
 * nothing here is read by the engine, a seat's view or a request.
 */
import { cmpNum, cmpStr, desc, sortBy } from "../core/seq.ts";
import type { Character } from "../model/people.ts";
import { AllPowers, type Power, type RisenPower } from "../model/power.ts";
import type { GameEvent, Tablet } from "../model/records.ts";
import type { GameState } from "../model/state.ts";
import { WorldMap } from "../model/map.ts";
import { renderClauses } from "./clauses.ts";

/** One dated line of a legend: the season it happened (0 for none), what the record says, and where, if anywhere. */
export interface LegendLine {
  turn: number;
  text: string;
  province: string | null;
}

/** A tablet's history: what it is, and its life from proposal to the last copy shown. */
export interface TabletLegend {
  id: string;
  title: string;
  turn: number;
  lines: LegendLine[];
}

/** One kind of deception the record opens at the end, and every instance of it. */
export interface Revelation {
  title: string;
  lines: LegendLine[];
}

const line = (turn: number, text: string, province: string | null = null): LegendLine => ({ turn, text, province });
const provinceName = (id: string): string => WorldMap.default.get(id).name;
const listed = (xs: readonly string[]): string => (xs.length <= 1 ? (xs[0] ?? "") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);
const byTurn = (ls: LegendLine[]): LegendLine[] => sortBy(ls, [(l: LegendLine) => l.turn, cmpNum]);

interface Change {
  province: string;
  turn: number;
  from: Power | null;
  to: Power | null;
  /** Ceded by its holder (a cession, or a whole realm ceded with its capital), not taken. */
  ceded: boolean;
}

/** Each change of a province's holder, oldest first, with the holder it passed from and whether it was ceded. */
function changes(s: GameState): Change[] {
  const cessions = s.events.filter((e) => e.kind === "cession");
  const ceded = (province: string, turn: number, from: Power | null, to: Power | null): boolean =>
    from !== null &&
    to !== null &&
    cessions.some(
      (e) => e.turn === turn && e.text.startsWith(`${from} ceded `) && (e.text.endsWith(` to ${to}.`) || e.text.endsWith(`, to ${to}.`)) && (e.text.includes("the whole realm") || wordIn(e.text, provinceName(province))),
    );
  const held = new Map<string, Power | null>();
  const out: Change[] = [];
  for (const c of s.ownerLog) {
    const from = held.has(c.province) ? held.get(c.province)! : WorldMap.default.get(c.province).home;
    held.set(c.province, c.owner);
    if (from !== c.owner) out.push({ province: c.province, turn: c.turn, from, to: c.owner, ceded: ceded(c.province, c.turn, from, c.owner) });
  }
  return out;
}

// ---------------------------------------------------------------- characters

/**
 * The record of one person's life beyond the follow view's service, places and missions: every event that names them (only
 * when no one else bears the name, so nothing is pinned on the wrong man), the tablets sealed by their hand or forged by
 * them, and their losses abroad. `viewer` keeps the events to those its court saw; null is the whole record.
 */
export function characterLegend(s: GameState, id: string, viewer: Power | null): LegendLine[] {
  const c = s.characters.find((x) => x.id === id);
  if (c === undefined) return [];
  const out: LegendLine[] = [];
  const unique = s.characters.filter((x) => x.name === c.name).length === 1;
  if (unique)
    for (const e of s.events)
      if (namesIn(e, c) && (viewer === null || e.visibleTo.includes(viewer))) out.push(line(e.turn, e.text));
  for (const r of s.risen) if (r.ruler === id && (viewer === null || viewer === r.power || viewer === r.from)) out.push(newIdrimi(r));
  if (viewer === null) {
    for (const t of s.tablets) {
      if (t.inventory) continue;
      if (t.byHand === c.name && t.byHandOf !== null && t.sealedTurn !== null && unique)
        out.push(line(t.sealedTurn, `Set the seal of ${t.byHandOf} on a tablet with ${listed(t.seals.filter((p) => p !== t.byHandOf))}${t.within === false ? ", beyond their authority" : ""}.`));
    }
    for (const l of s.losses) if (l.characterId === id) out.push(line(l.turn, `${l.kind === "PutToDeath" ? "Put to death" : l.kind === "Seized" ? "Seized" : "Caught"} at the court of ${l.court}.`));
  }
  // Events already say most of it: drop a line the same season says word for word.
  const seen = new Set<string>();
  return byTurn(out).filter((l) => (seen.has(`${l.turn}|${l.text}`) ? false : (seen.add(`${l.turn}|${l.text}`), true)));
}

/** Whether an event names a person: their name as a whole word. */
const namesIn = (e: GameEvent, c: Character): boolean => wordIn(e.text, c.name);

/** Whether a text holds a name as a whole word, anywhere in it. */
function wordIn(text: string, name: string): boolean {
  for (let i = text.indexOf(name); i >= 0; i = text.indexOf(name, i + 1)) {
    const before = i === 0 ? " " : text[i - 1];
    const after = text[i + name.length] ?? " ";
    if (!/[A-Za-z]/.test(before) && !/[A-Za-z-]/.test(after)) return true;
  }
  return false;
}

// ---------------------------------------------------------------- tablets

/** The kinds of clause a breach of which shows on the map: a promise not to march on the other. */
const PeaceKinds = new Set(["peace", "noAttack", "alliance"]);

/**
 * Every tablet sealed or forged, oldest first, with its history: who proposed and sealed it, by whose hand, what it says,
 * who forged it, who repudiated it, where its copies went and were shown, and, for a tablet of peace, the first province
 * one of its kings took from the other after sealing it, which the record shows as the oath broken. Inventories of gold
 * are left out (their story is the envoy's, in the revelations).
 */
export function tabletLegends(s: GameState): TabletLegend[] {
  const moved = changes(s);
  const out: TabletLegend[] = [];
  for (const t of s.tablets) {
    if (t.inventory || (t.sealedTurn === null && !t.forged)) continue;
    const lines: LegendLine[] = [];
    const turn = t.sealedTurn ?? t.createdTurn;
    lines.push(line(t.createdTurn, `Proposed by ${t.proposedBy}${t.partner !== null ? ` to ${t.partner}` : ""}.`));
    if (t.forged) lines.push(line(t.createdTurn, `Forged${forgerOf(s, t)}: it bears the seal${t.seals.length > 1 ? "s" : ""} of ${listed(t.seals)}, who never set ${t.seals.length > 1 ? "them" : "it"} there.`));
    else if (t.sealedTurn !== null)
      lines.push(
        line(
          t.sealedTurn,
          `Sealed by ${listed(t.seals)}` +
            (t.byHandOf !== null && t.byHand !== null ? `, ${t.byHandOf}'s seal set by the hand of its envoy ${t.byHand}${t.within === false ? ", beyond his authority" : ""}` : "") +
            ".",
        ),
      );
    const says = t.clauses.length > 0 && t.partner !== null ? renderClauses(t.clauses, t.proposedBy, t.partner) : t.text;
    if (says.length > 0) lines.push(line(0, `It says: ${says.length > 300 ? says.slice(0, 297) + "..." : says}`));
    if (t.repudiatedTurn !== null && t.byHandOf !== null) lines.push(line(t.repudiatedTurn, `${t.byHandOf} repudiated it, as beyond its envoy's authority.`));
    // Broken: a king of a sealed peace taking land from the other afterwards.
    // Land ceded between them is agreed, not taken; a tablet its king repudiated never stood.
    if (!t.forged && t.sealedTurn !== null && t.repudiatedTurn === null && t.seals.length === 2 && t.clauses.some((c) => PeaceKinds.has(c.kind))) {
      const [a, b] = t.seals;
      const breach = moved.find((m) => !m.ceded && m.turn >= t.sealedTurn! && ((m.from === a && m.to === b) || (m.from === b && m.to === a)));
      if (breach !== undefined) lines.push(line(breach.turn, `Broken: ${breach.to} took ${provinceName(breach.province)} from ${breach.from}.`, breach.province));
    }
    // Its copies: who came to hold one, how, and whether its seals were found false.
    for (const c of sortBy(
      s.copies.filter((x) => x.tabletId === t.id),
      [(x) => x.acquiredTurn, cmpNum],
      [(x) => x.id, cmpStr],
    )) {
      if (t.seals.includes(c.holder) && c.source.startsWith("sealed")) continue;
      const found = c.authResult !== null && c.authResult.length > 0 ? ` (examined: ${c.authResult})` : "";
      lines.push(line(c.acquiredTurn, `A copy came to ${c.holder}, ${c.source}${found}.`));
    }
    const title = `${t.forged ? "A forged tablet" : t.allianceOath ? "An oath of alliance" : t.vassal !== null ? "A vassal treaty" : "A tablet"} of ${listed(t.seals)}`;
    out.push({ id: t.id, title, turn, lines: byTurn(lines) });
  }
  return sortBy(out, [(x: TabletLegend) => x.turn, cmpNum], [(x: TabletLegend) => x.id, cmpStr]);
}

function forgerOf(s: GameState, t: Tablet): string {
  const c = t.forgerId !== null ? s.characters.find((x) => x.id === t.forgerId) : undefined;
  if (c === undefined) return t.forgerEmployer !== null ? ` for ${t.forgerEmployer}` : "";
  return ` by ${c.name}${t.forgerEmployer !== null ? ` for ${t.forgerEmployer}` : ""}`;
}

// ---------------------------------------------------------------- courts

/**
 * The rise and fall of a court: its land at the start and at its height, each province won and lost and to whom, its
 * wars as first begun, its tablets, its fall, and the lines the chronicle keeps of it ("a new Idrimi", a third plea for
 * gold). Read from the record, oldest first.
 */
export function courtLegend(s: GameState, p: Power): LegendLine[] {
  const out: LegendLine[] = [];
  const start = WorldMap.default.provinces.filter((x) => x.home === p).length;
  out.push(line(0, `Began the age holding ${start} province${start === 1 ? "" : "s"}.`));
  const rows = s.scores.filter((r) => r.power === p);
  if (rows.length > 0) {
    const peak = sortBy(rows, [(r) => r.provinces, desc(cmpNum)], [(r) => r.turn, cmpNum])[0];
    if (peak.provinces > start) out.push(line(peak.turn, `At its height, held ${peak.provinces} provinces.`));
  }
  for (const m of changes(s)) {
    if (m.ceded && m.to === p) out.push(line(m.turn, `Was ceded ${provinceName(m.province)} by ${m.from}.`, m.province));
    else if (m.ceded && m.from === p) out.push(line(m.turn, `Ceded ${provinceName(m.province)} to ${m.to}.`, m.province));
    else if (m.to === p) out.push(line(m.turn, `Took ${provinceName(m.province)}${m.from !== null ? ` from ${m.from}` : ", which no one held"}.`, m.province));
    else if (m.from === p) out.push(line(m.turn, `Lost ${provinceName(m.province)}${m.to !== null ? ` to ${m.to}` : ", which fell lawless"}.`, m.province));
  }
  for (const q of AllPowers) {
    const by = s.invaded.tryGet(q)?.tryGet(p);
    if (by !== undefined) out.push(line(by, `Its troops first entered land of ${q}.`));
    const of = s.invaded.tryGet(p)?.tryGet(q);
    if (of !== undefined) out.push(line(of, `Troops of ${q} first entered its land.`));
  }
  for (const t of s.tablets)
    if (!t.inventory && !t.forged && t.sealedTurn !== null && t.seals.includes(p))
      out.push(line(t.sealedTurn, `Sealed ${t.allianceOath ? "an oath of alliance" : t.vassal !== null ? "a vassal treaty" : "a tablet"} with ${listed(t.seals.filter((x) => x !== p))}.`));
  for (const f of s.falls) {
    if (f.power === p) out.push(line(f.turn, `Fell: ${provinceName(f.capital)} taken${f.conqueror !== null ? ` by ${f.conqueror}` : ""}.`, f.capital));
    else if (f.conqueror === p) out.push(line(f.turn, `Brought down ${f.power}, taking ${provinceName(f.capital)}.`, f.capital));
  }
  for (const e of s.events) if (ChronicleKinds.has(e.kind) && wordIn(e.text, p)) out.push(line(e.turn, e.text));
  for (const r of s.risen) if (r.power === p || r.from === p) out.push(newIdrimi(r));
  if (s.ended || s.ageEndedTurn !== null) {
    const won = (s.ageEndedTurn !== null ? s.ageWinners : s.winners).includes(p);
    const last = rows.length > 0 ? rows[rows.length - 1] : null;
    out.push(line(s.ageEndedTurn ?? s.turn, `${won ? "Won the age" : "Ended the age"}${last !== null ? ` holding ${last.provinces} province${last.provinces === 1 ? "" : "s"}` : ""}.`));
  }
  return byTurn(out);
}

/**
 * "A new Idrimi" (Voice of the age): when a character rises to rule a city of his own, the chronicle names it after the
 * legend, by how he rose (item 13+'s fallen kingdom's governor; item 17's governor who turned, the leader of a revolt, the
 * chief who held land without a ruler, the elder its people raised), from the record of the powers risen.
 */
export function newIdrimi(r: RisenPower): LegendLine {
  const city = provinceName(r.capital);
  const how =
    r.how === "turned"
      ? `who governed ${city} for ${r.from}, refused his recall and rose to rule it in his own name with the levies he raised.`
      : r.how === "revolt"
        ? `led ${city} in revolt against ${r.from} and rose to rule it in his own name.`
        : r.how === "chief"
          ? `whose band held ${city}, a land without a ruler, rose to rule it in his own name.`
          : r.how === "elder"
            ? `was raised by the people of ${city}, a land without a ruler, to rule them in his own name.`
            : `who governed ${city} for ${r.from}, rose to rule it in his own name when ${r.from} fell.`;
  return line(r.turn, `A new Idrimi: ${r.king}, ${how}`, r.capital);
}

/** The events the chronicle keeps as legends of their own ("Finkel's version"; "A new Idrimi" reads the powers risen). */
export const ChronicleKinds: ReadonlySet<string> = new Set(["begging"]);

// ---------------------------------------------------------------- the record opens

/** The hidden events that tell each kind of deception, by the signal the engine gave them. */
const Deceptions: readonly { title: string; signals: readonly string[] }[] = [
  { title: "Who lied", signals: ["questioned-lie", "unheard-lie", "false-name", "false-envoy", "false-envoy-paid"] },
  { title: "Who skimmed", signals: ["skim", "collector-kept", "inventory-swapped"] },
  { title: "Which seals were forged", signals: ["forgery"] },
  { title: "Which go-betweens were paid to bend the words they passed on", signals: ["bent-words"] },
  { title: "Who sent false gold", signals: ["debased-gift"] },
  { title: "Who sold what they knew", signals: ["report-sold", "secrets-caught"] },
  { title: "Which envoys took a host's gold", signals: ["bribe"] },
  { title: "Which tablets were stolen", signals: ["tablet-stolen"] },
  { title: "Who carried words between courts", signals: ["go-between", "court-go-between"] },
];

/**
 * When a game ends, the record opens ("Legends, read from the record"): every hidden fact readable to every seat. Each
 * kind of deception with every instance the record holds, those who served one king in secret for another, and, once the
 * age has ended, the season the end was drawn for. Empty kinds are left out.
 */
export function revelations(s: GameState): Revelation[] {
  const out: Revelation[] = [];
  for (const d of Deceptions) {
    const lines = s.events.filter((e) => e.signal !== null && d.signals.includes(e.signal)).map((e) => line(e.turn, e.text));
    if (lines.length > 0) out.push({ title: d.title, lines: byTurn(lines) });
  }
  const secret = sortBy(
    s.characters.filter((c) => c.secretMaster !== null),
    [(c: Character) => c.id, cmpStr],
  ).map((c) => line(0, `${c.name}${c.employer !== null ? `, in the service of ${c.employer},` : ""} served ${c.secretMaster} in secret.`));
  if (secret.length > 0) out.push({ title: "Who served another king in secret", lines: secret });
  // The drawn season is secret while the age runs: nothing shown reads it until it has ended.
  if (s.ended || s.ageEndedTurn !== null) out.push({ title: "The season the end was drawn for", lines: [endDrawn(s)] });
  return out;
}

function endDrawn(s: GameState): LegendLine {
  if (s.finalSeason === null) return line(0, "No end was drawn: the age was open.");
  return line(
    s.finalSeason,
    `Drawn in secret at the start for turn ${s.finalSeason}, ${s.finalByCap ? "the hard cap's season" : "by the rising chance"}` +
      (s.ended && s.turn < s.finalSeason ? `; the age ended sooner, at turn ${s.turn}: ${s.endReason ?? ""}` : "") +
      ".",
  );
}
