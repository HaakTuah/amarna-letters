/**
 * News beyond sight (#618; the owner, 3 November 2026: "Agreed to all, expertly!"): word of a change of hands travels
 * beyond sight by the road. A vassal reports to his overlord what his own court saw, an ally to the king he is bound to,
 * each as he knows the bond. The report sets out from the reporter's court at the season's end and reaches the other court
 * when word from there could come (`TurnEngine.heardAt`, the couriers' clock for a road), and the province's holder in
 * that court's view is then as the reporter saw it. A king who sees the land himself, or took it, hears of it his own way,
 * and so does the king who held it, unless the reporter's word would come sooner; a fallen kingdom's capital is told as word of the fall is
 * (`KingdomFalls`). Each reporter's lands of a season go to each court in one word.
 */
import { Dict, HSet } from "../core/collections.ts";
import { cmpStr, sortBy } from "../core/seq.ts";
import { AllPowers, type Power } from "../model/power.ts";
import { isSealedAgreement, newJourney, repudiationKnown, type Journey } from "../model/records.ts";
import { isAlive, logEvent, newId, newKnown, notify, type GameState } from "../model/state.ts";
import { vassalBonds } from "../model/vassals.ts";
import { courtOf } from "../rules/court.ts";
import { ownerAt, SeenSource, sight } from "../rules/known-land.ts";
import { TurnEngine } from "./core.ts";

declare module "./core.ts" {
  interface TurnEngine {
    /** At the season's end: each change of hands a vassal's or ally's court saw goes as word to the king it is bound to. */
    sendTidings(): void;
    /** Word of a change of hands, from a vassal or an ally, reaches its court. */
    tidingsArrive(j: Journey): void;
  }
}

const P = TurnEngine.prototype;

/** The title of the notice. */
export const TidingsTitle = "Word from beyond your sight";

/** Whether a court's knowledge of a holder came from a vassal's or ally's word (`SeatView.ownerFrom`). */
export const isTidingsSource = (source: string): boolean => source.startsWith("your vassal ") || source.startsWith("your ally ");

/**
 * The kings `v` reports to, as `v` knows its bonds: its overlords by a vassal tablet, and the kings it is sworn to in
 * alliance, by a sealed tablet neither forged nor repudiated as far as it knows, of which it holds a copy (one its envoy
 * sealed abroad counts once his copy is home).
 */
export function reportsTo(s: GameState, v: Power): { overlords: Power[]; allies: Power[] } {
  const known = { p: v, turn: s.turn };
  const held = new Set(s.copies.filter((k) => k.holder === v).map((k) => k.tabletId));
  const tablets = s.tablets.filter((t) => held.has(t.id));
  const overlords = vassalBonds(tablets, known)
    .filter((b) => b.vassal === v)
    .map((b) => b.overlord);
  const allies = tablets
    .filter((t) => isSealedAgreement(t) && t.seals.includes(v) && !repudiationKnown(t, v, s.turn) && (t.allianceOath || t.clauses.some((c) => c.kind === "alliance")))
    .flatMap((t) => t.seals.filter((x) => x !== v));
  return { overlords: [...new Set(overlords)], allies: [...new Set(allies)].filter((x) => !overlords.includes(x)) };
}

/** What the reporter tells: the land and who holds it now, and who held it before if its court saw that too. */
function tidingsText(name: string, before: Power | null | undefined, now: Power | null): string {
  if (now === null) return before == null ? `${name} answers to no king.` : `${name} has thrown off ${before} and answers to no king.`;
  if (before === undefined) return `${name} now answers to ${now}.`;
  return before === null ? `${name}, which had no king, now answers to ${now}.` : `${name} has passed from ${before} to ${now}.`;
}

P.sendTidings = function () {
  const S = this.s;
  const map = this.map;
  const changed = sortBy(
    [...new Set(S.ownerLog.filter((c) => c.turn === S.turn).map((c) => c.province))],
    [(x: string) => x, cmpStr],
  );
  if (changed.length === 0) return;
  // A fallen kingdom's capital is told as word of the fall is (KingdomFalls); the land that passed with it is told here.
  const capitals = new Set(S.falls.filter((f) => f.turn === S.turn).map((f) => f.capital));
  const living = AllPowers.filter((p) => isAlive(S, p));
  const sights = new Dict<Power, HSet<string>>(living.map((p) => [p, sight(S, map, p)] as const));
  // The earliest word to each court of each land, from whichever of its vassals and allies saw it.
  const best = new Map<string, { o: Power; at: number; from: Power; bond: "vassal" | "ally"; x: string; line: string }>();
  for (const x of changed.filter((x) => !capitals.has(x))) {
    const now = S.owner.getOrDefault(x, null);
    const old = ownerAt(S, map, x, S.turn - 1);
    if (now === old) continue;
    for (const v of living.filter((v) => sights.get(v).has(x))) {
      // Who held it before, as the reporter's court saw it as the season began (`seeLand`); else only the new holder.
      const seenBefore = S.known.tryGet(v)?.tryGet(x);
      const before = seenBefore !== undefined && seenBefore.turn === S.turn && seenBefore.source === SeenSource && seenBefore.owner !== now ? seenBefore.owner : undefined;
      const { overlords, allies } = reportsTo(S, v);
      for (const [o, bond] of [...overlords.map((o) => [o, "vassal"] as const), ...allies.map((o) => [o, "ally"] as const)]) {
        if (!isAlive(S, o) || o === now || sights.get(o).has(x)) continue;
        const d = this.wordTo(o, courtOf(S, map, v));
        if (!Number.isFinite(d)) continue;
        const at = this.heardAt(o, courtOf(S, map, v));
        // The king who lost it hears of it from there by his own road; from his vassal or ally only if that is sooner.
        if (o === old && this.heardAt(o, x) <= at) continue;
        const key = `${o}|${x}`;
        const had = best.get(key);
        if (had === undefined || at < had.at || (at === had.at && v < had.from)) best.set(key, { o, at, from: v, bond, x, line: tidingsText(map.get(x).name, before, now) });
      }
    }
  }
  // One word from each reporter to each court, its lands together.
  const words = new Map<string, { o: Power; at: number; from: Power; bond: "vassal" | "ally"; lands: { x: string; line: string }[] }>();
  for (const w of sortBy([...best.values()], [(w) => `${w.o}|${w.from}|${w.x}`, cmpStr])) {
    const key = `${w.o}|${w.from}|${w.at}`;
    const g = words.get(key) ?? { o: w.o, at: w.at, from: w.from, bond: w.bond, lands: [] };
    g.lands.push({ x: w.x, line: w.line });
    words.set(key, g);
  }
  for (const g of words.values()) {
    const j = newJourney({
      id: newId(S, "j"),
      kind: "Word",
      departTurn: S.turn,
      arriveTurn: g.at,
      from: g.from,
      to: g.o,
      news: g.bond === "vassal" ? "TidingsVassal" : "TidingsAlly",
      text: `Your ${g.bond} ${g.from} sends word of season ${S.turn}: ${g.lands.map((l) => l.line).join(" ")}`,
      seen: g.lands.map((l) => l.x),
      reached: g.lands.map(() => S.turn),
    });
    if (g.at <= S.turn + S.deliveryOffset) this.tidingsArrive(j);
    else S.journeys.push(j);
  }
};

P.tidingsArrive = function (j) {
  const S = this.s;
  if (!isAlive(S, j.to)) return;
  const source = `your ${j.news === "TidingsVassal" ? "vassal" : "ally"} ${j.from}`;
  let book = S.known.tryGet(j.to);
  if (book === undefined) S.known.set(j.to, (book = new Dict()));
  j.seen.forEach((x, i) => {
    const turn = j.reached[i] ?? j.departTurn;
    const had = book!.tryGet(x);
    if (this.map.exists(x) && (had === undefined || had.turn < turn)) book!.set(x, newKnown({ owner: ownerAt(S, this.map, x, turn), turn, source }));
  });
  notify(S, j.to, "Rumor", TidingsTitle, j.text ?? "");
  // Dated, as its notice is, to the season it is read in (word that comes within the season is read in the next).
  logEvent(S, "tidings", j.text ?? "", [j.to], "tidings").turn = S.turn + S.deliveryOffset;
};
