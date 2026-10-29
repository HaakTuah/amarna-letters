/**
 * Archives: every tablet a court holds lies in its archive at its capital. A spy posted at a court copies from that
 * archive, and the copies go home with its report; whoever comes to hold a court's capital gains a copy of every tablet in
 * its archive. Nothing is taken away: the court keeps its own copies.
 */
import { HSet } from "../core/collections.ts";
import { rx } from "../core/regex.ts";
import { cmpBool, cmpNum, desc, distinct, sortBy } from "../core/seq.ts";
import { isUpper } from "../core/text.ts";
import { remember, type Character } from "../model/people.ts";
import { land, type Power } from "../model/power.ts";
import { newTabletCopy, type Journey, type Tablet, type TabletCopy } from "../model/records.ts";
import { alive, findCharacter, isAlive, logEvent, newId, notify, type GoldLot } from "../model/state.ts";
import { formatMoney } from "../rules/calendar.ts";
import { cap } from "../rules/greeting.ts";
import { Views } from "../rules/views.ts";
import { idNumber, TurnEngine } from "./core.ts";
import { learn } from "../rules/skills.ts";

/** The title of the notice a court reads when it has taken another court's capital, and with it its archive. */
export const ArchiveTakenTitle = "An archive taken";

declare module "./core.ts" {
  interface TurnEngine {
    archive(court: Power): Tablet[];
    copyFromArchive(spy: Character, court: Power, master: Power): string[];
    archiveCopiesArrive(j: Journey, spy: Character): string[];
    takeArchive(taker: Power, province: string): void;
    archiveArrives(holder: Power, tabletIds: readonly string[], court: string, place: string): void;
    copyLine(copy: TabletCopy): string;
    scribe(writer: Power, text: string | null): string;
    copiesLine(spy: Character, court: Power, copyIds: Iterable<string>): string;
  }
}

const P = TurnEngine.prototype;

/** The tablets in a court's archive: one for each tablet it holds a copy of, in the order the copies came. */
P.archive = function (court) {
  const S = this.s;
  const ids = distinct(S.copies.filter((k) => k.holder === court).map((k) => k.tabletId));
  const out: Tablet[] = [];
  for (const id of ids) {
    const t = S.tablets.find((t) => t.id === id);
    if (t !== undefined) out.push(t);
  }
  return out;
};

/**
 * What a spy posted at `court` copies from its archive this season for `master`: with a chance of its skill, one tablet
 * its master does not hold and has not already been sent, sealed agreements first, the newest first. Its own random
 * stream, so nothing else the spy sees or risks changes.
 */
P.copyFromArchive = function (spy, court, master) {
  const S = this.s;
  const rng = this.r("archive", spy.id);
  const copied = rng.chance(spy.skills.gather / 100.0);
  // Whether it got at the archive this season is an outcome it learns from (item 10, "Seeing oneself").
  learn(spy, "gather", copied, (b) => b / 100.0);
  if (!copied) return [];
  const held = new Set(S.copies.filter((k) => k.holder === master).map((k) => k.tabletId));
  // Copies already on the road home in an earlier report are not made twice.
  const sent = new Set(S.journeys.filter((j) => j.kind === "SpyReport" && j.to === master && j.report !== null).flatMap((j) => j.report!.tabletIds));
  const pick = sortBy(
    this.archive(court).filter((t) => !held.has(t.id) && !sent.has(t.id)),
    [(t: Tablet) => t.seals.length >= 2, desc(cmpBool)],
    [(t: Tablet) => t.sealedTurn ?? t.createdTurn, desc(cmpNum)],
    [(t: Tablet) => idNumber(t.id), desc(cmpNum)],
  )[0];
  if (pick === undefined) return [];
  remember(spy, S.turn, `I copied a tablet from the archive of ${land(court)}, sealed by ${pick.seals.join(" and ")}: "${cap(pick.text, 200)}"`);
  this.saw(spy, pick.id);
  return [pick.id];
};

/**
 * A spy's report reaches home with the copies it made: each tablet its master does not hold by now goes into the
 * master's archive. Returns the new copies.
 */
P.archiveCopiesArrive = function (j, spy) {
  const S = this.s;
  const report = j.report;
  if (report === null || (report.tabletIds.length === 0 && report.stolenIds.length === 0) || !isAlive(S, j.to)) return [];
  const court = report.court!;
  const held = new HSet(S.copies.filter((k) => k.holder === j.to).map((k) => k.tabletId));
  const made: string[] = [];
  for (const tid of report.tabletIds) {
    if (!(S.tablets.some((t) => t.id === tid) && held.add(tid))) continue;
    const copy = newTabletCopy({ id: newId(S, "k"), tabletId: tid, holder: j.to, acquiredTurn: S.turn, source: `copied from the archive of ${court} by your spy ${spy.name}` });
    S.copies.push(copy);
    made.push(copy.id);
  }
  // Stolen tablets (item 10): the tablet itself, which its court no longer holds.
  for (const tid of report.stolenIds) {
    if (!(S.tablets.some((t) => t.id === tid) && held.add(tid))) continue;
    const copy = newTabletCopy({ id: newId(S, "k"), tabletId: tid, holder: j.to, acquiredTurn: S.turn, source: `stolen from the archive of ${court} by your spy ${spy.name}` });
    S.copies.push(copy);
    made.push(copy.id);
  }
  if (made.length > 0) logEvent(S, "archive-copied", `${spy.name}, a spy of ${j.to}, brought home copies of ${made.length} tablet(s) from the archive of ${court}.`, [j.to], "archive-copied");
  return made;
};

/**
 * Whoever takes a court's capital carries off its archive (item 10): the court holds none of its tablets any more, and the
 * taker's scribes carry them home to his capital as a load that can be waylaid (item 10+b), becoming his copies when they
 * arrive.
 */
P.takeArchive = function (taker, province) {
  const S = this.s;
  const prov = this.map.get(province);
  // Item 13: the archive moves with the court, so it lies wherever its king is.
  const court = alive(S).find((q) => q !== taker && this.courtAt(q) === province) ?? (prov.capital && prov.home !== null && !alive(S).includes(prov.home) ? prov.home : null);
  if (court === null || court === taker) return;
  const held = new HSet(S.copies.filter((k) => k.holder === taker).map((k) => k.tabletId));
  const tablets = this.archive(court)
    .map((t) => t.id)
    .filter((id) => !held.has(id));
  const lost = S.copies.filter((k) => k.holder === court).length;
  S.copies = S.copies.filter((k) => k.holder !== court);
  if (lost > 0 && isAlive(S, court))
    notify(S, court, "Notice", "Your archive taken", `With ${prov.name}, ${taker} carried off your archive: the ${lost} tablet${lost === 1 ? "" : "s"} it held are no longer yours.`);
  logEvent(S, "archive-taken", `${taker} took the archive of ${court} with ${prov.name}.`, [taker], "archive-taken");
  if (tablets.length === 0) {
    notify(S, taker, "Notice", ArchiveTakenTitle, `With ${prov.name} you took the archive of ${court}; it held no tablet you did not hold already.`);
    return;
  }
  if (this.lootHome(taker, province, 0, tablets, court))
    notify(S, taker, "Notice", ArchiveTakenTitle, `With ${prov.name} you took the archive of ${court}: your scribes are carrying its ${tablets.length} tablet${tablets.length === 1 ? "" : "s"} home to your capital.`);
};

/** A captured archive reaches a court (item 10+b): copies of every tablet in it it did not hold already. */
P.archiveArrives = function (holder, tabletIds, court, place) {
  const S = this.s;
  if (tabletIds.length === 0 || !isAlive(S, holder)) return;
  const held = new HSet(S.copies.filter((k) => k.holder === holder).map((k) => k.tabletId));
  const taken: TabletCopy[] = [];
  for (const id of tabletIds) {
    if (!S.tablets.some((t) => t.id === id) || !held.add(id)) continue;
    const copy = newTabletCopy({ id: newId(S, "k"), tabletId: id, holder, acquiredTurn: S.turn, source: `taken with the archive of ${court} (${place})` });
    S.copies.push(copy);
    taken.push(copy);
  }
  notify(
    S,
    holder,
    "Notice",
    ArchiveTakenTitle,
    taken.length === 0
      ? `The archive of ${court} reached you; it held no tablet you did not hold already.`
      : `The archive of ${court} reached you: copies of ${taken.length} tablet${taken.length === 1 ? "" : "s"} you did not hold are now in your archive: ${taken.map((k) => this.copyLine(k)).join(", ")}.`,
  );
};

/**
 * A copy as a court reads it in a notice: the tablet as every court names it (its seals and date), then the court's own
 * mark for its copy. The text is in the archive the court reads.
 */
P.copyLine = function (copy) {
  const t = this.s.tablets.find((x) => x.id === copy.tabletId)!;
  return `${Views.tabletName(t, this.archive(copy.holder))} (your copy ${copy.id})`;
};

const CopyMark = rx("\\b(?:(?:the\\s+)?(?:tablet|copy)\\s+)?(?<id>k\\d+)\\b", "gi");
const NamedPerson = rx("(?<name>[\\p{L}][\\p{L}-]*)\\s*\\((?<id>c\\d+)\\)", "g");
const PersonMark = rx("\\b(?<id>c\\d+)\\b", "g");
const GoldMark = rx("\\b(?:(?:the\\s+)?(?:gold|lot)\\s+)?(?<id>g\\d+)\\b", "gi");

/** The first letter upper-cased, as char.ToUpperInvariant does it. */
function upFirst(name: string): string {
  const u = name[0].toUpperCase();
  return (u.length === 1 ? u : name[0]) + name.slice(1);
}

/**
 * What a court's scribes write down for another court to read (its letters, mandates and tablets, its words at an
 * audience): each mark of the writer's own for a copy in its archive ("k8"), which another court numbers differently or
 * not at all, becomes the tablet as every court names it ("the tablet sealed by Babylonia and Mitanni, dated turn 2"), and
 * the id of each person the writer knows (its view lists them: Views.knows) becomes the person's name. Any other text is
 * left as written: an id the writer does not know stays an id, so that what it reads back of its own letters (and what the
 * envoy and the host read) never names someone it has not met.
 */
P.scribe = function (writer, text) {
  const S = this.s;
  const known = (id: string): Character | null => {
    const c = findCharacter(S, id);
    return c !== null && Views.knows(c, writer) ? c : null;
  };
  if (text === null || text === undefined || text.length === 0) return text ?? "";
  const archive = this.archive(writer);
  let written = text.replace(CopyMark, (...args) => {
    const m = args[0] as string;
    const groups = args[args.length - 1] as Record<string, string>;
    const id = groups.id.toLowerCase();
    const copy = S.copies.find((k) => k.holder === writer && k.id === id);
    const tablet = copy !== undefined ? S.tablets.find((t) => t.id === copy.tabletId) : undefined;
    if (copy === undefined || tablet === undefined) return m;
    const name = Views.tabletName(tablet, archive);
    return isUpper(m[0]) ? upFirst(name) : name;
  });
  // A mark of the writer's own for a lot of its unassayed gold ("g7"), which only its assay orders use, is the gold it names.
  const lots = S.treasuries.tryGet(writer)?.lots ?? [];
  written = written.replace(GoldMark, (...args) => {
    const m = args[0] as string;
    const groups = args[args.length - 1] as Record<string, string>;
    const id = groups.id.toLowerCase();
    const lot = lots.find((l) => l.id === id);
    if (lot === undefined) return m;
    const name = goldName(writer, lot, lots);
    return isUpper(m[0]) ? upFirst(name) : name;
  });
  // "Mane (c12)" is Mane; a bare "c12" is the person's name.
  written = written.replace(NamedPerson, (...args) => {
    const m = args[0] as string;
    const groups = args[args.length - 1] as Record<string, string>;
    const c = known(groups.id);
    return c !== null && c.name === groups.name ? c.name : m;
  });
  return written.replace(PersonMark, (...args) => {
    const m = args[0] as string;
    const groups = args[args.length - 1] as Record<string, string>;
    return known(groups.id)?.name ?? m;
  });
};

/**
 * A lot of gold as any court could name it: who sent it to whom and when it was weighed ("the gold Hatti sent to Egypt,
 * weighed in turn 3"), with what its inventory stated where another of the holder's lots shares all three.
 */
export function goldName(holder: Power, lot: GoldLot, lots: Iterable<GoldLot>): string {
  const name = `the gold ${lot.from} sent to ${holder}, weighed in turn ${lot.arrivedTurn}`;
  for (const l of lots) if (l.id !== lot.id && l.from === lot.from && l.arrivedTurn === lot.arrivedTurn) return `${name}, its inventory stating ${formatMoney(lot.stated)}`;
  return name;
}

/** The line the engine adds to a spy's report for the copies that came home with it. */
P.copiesLine = function (spy, court, copyIds) {
  const S = this.s;
  return `[With this report came copies ${spy.name} made in the archive of ${court}, now in your archive: ${[...copyIds].map((id) => this.copyLine(S.copies.find((k) => k.id === id)!)).join(", ")}.]`;
};
