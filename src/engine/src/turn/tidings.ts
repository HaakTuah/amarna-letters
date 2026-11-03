/**
 * News beyond sight (#618; the owner, 3 November 2026: "Agreed to all, expertly!"): word of a change of hands travels
 * beyond sight by the road. A vassal reports to his overlord what his own court saw, an ally to the king he is bound to,
 * each as he knows the bond. The report sets out from the reporter's court at the season's end and reaches the other court
 * when word from there could come (`TurnEngine.heardAt`, the couriers' clock for a road), and the province's holder in
 * that court's view is then as the reporter saw it. A king who sees the land himself, or who held or took it, hears of it
 * his own way; a kingdom's fall travels as word of the fall does (`KingdomFalls`).
 */
import { Dict, HSet } from "../core/collections.ts";
import { cmpStr, sortBy } from "../core/seq.ts";
import { AllPowers, type Power } from "../model/power.ts";
import { isSealedAgreement, newJourney, repudiationKnown, type Journey } from "../model/records.ts";
import { isAlive, logEvent, newId, newKnown, notify, type GameState } from "../model/state.ts";
import { vassalBonds } from "../model/vassals.ts";
import { courtOf } from "../rules/court.ts";
import { ownerAt, sight } from "../rules/known-land.ts";
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
 * alliance, by a sealed tablet neither forged nor repudiated as far as it knows.
 */
export function reportsTo(s: GameState, v: Power): { overlords: Power[]; allies: Power[] } {
  const known = { p: v, turn: s.turn };
  const overlords = vassalBonds(s.tablets, known)
    .filter((b) => b.vassal === v)
    .map((b) => b.overlord);
  const allies = s.tablets
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
  // A kingdom's fall travels as word of the fall does.
  const fallen = new Set(S.falls.filter((f) => f.turn === S.turn).flatMap((f) => [f.capital, ...f.land]));
  const living = AllPowers.filter((p) => isAlive(S, p));
  const sights = new Dict<Power, HSet<string>>(living.map((p) => [p, sight(S, map, p)] as const));
  for (const x of changed.filter((x) => !fallen.has(x))) {
    const now = S.owner.getOrDefault(x, null);
    const old = ownerAt(S, map, x, S.turn - 1);
    if (now === old) continue;
    const name = map.get(x).name;
    // The earliest word to each court, from whichever of its vassals and allies saw it.
    const best = new Map<Power, { at: number; from: Power; bond: "vassal" | "ally"; text: string }>();
    for (const v of living.filter((v) => sights.get(v).has(x))) {
      // Who held it before, as the reporter's court last saw it (this season or the last); else it names only the new holder.
      const seenBefore = S.known.tryGet(v)?.tryGet(x);
      const before = seenBefore !== undefined && seenBefore.turn >= S.turn - 1 && seenBefore.source === "seen" ? old : undefined;
      const { overlords, allies } = reportsTo(S, v);
      for (const [o, bond] of [...overlords.map((o) => [o, "vassal"] as const), ...allies.map((o) => [o, "ally"] as const)]) {
        if (!isAlive(S, o) || o === now || o === old || sights.get(o).has(x)) continue;
        const d = this.wordTo(o, courtOf(S, map, v));
        if (!Number.isFinite(d)) continue;
        const at = this.heardAt(o, courtOf(S, map, v));
        const had = best.get(o);
        if (had === undefined || at < had.at || (at === had.at && v < had.from)) best.set(o, { at, from: v, bond, text: tidingsText(name, before, now) });
      }
    }
    for (const [o, w] of sortBy([...best.entries()], [([o]) => o, cmpStr])) {
      const j = newJourney({
        id: newId(S, "j"),
        kind: "Word",
        departTurn: S.turn,
        arriveTurn: w.at,
        from: w.from,
        to: o,
        news: "Tidings",
        text: `${w.bond}|Your ${w.bond} ${w.from} sends word of season ${S.turn}: ${w.text}`,
        seen: [x],
        reached: [S.turn],
      });
      if (w.at <= S.turn + S.deliveryOffset) this.tidingsArrive(j);
      else S.journeys.push(j);
    }
  }
};

P.tidingsArrive = function (j) {
  const S = this.s;
  if (!isAlive(S, j.to)) return;
  const [bond, ...words] = (j.text ?? "").split("|");
  const text = words.join("|");
  const x = j.seen[0];
  const turn = j.reached[0] ?? j.departTurn;
  if (x !== undefined && this.map.exists(x)) {
    let book = S.known.tryGet(j.to);
    if (book === undefined) S.known.set(j.to, (book = new Dict()));
    const had = book.tryGet(x);
    if (had === undefined || had.turn < turn) book.set(x, newKnown({ owner: ownerAt(S, this.map, x, turn), turn, source: `your ${bond} ${j.from}` }));
  }
  notify(S, j.to, "Rumor", TidingsTitle, text);
  logEvent(S, "tidings", text, [j.to], "tidings");
};
