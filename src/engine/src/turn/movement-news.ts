/**
 * The season's movement news (moved from resolve.ts, by meaning): what each king's troops did, as the outcomes it may see
 * (GameState.lastSeen) and the notice "Movements last season", with why each of its moves failed.
 */
import { Dict, type HSet } from "../core/collections.ts";
import type { MoveFailure, ReportLine } from "../model/outcomes.ts";
import { stormed as assaultStormed, strengthWords } from "../model/outcomes.ts";
import { whose, type Power } from "../model/power.ts";
import { alive, logEvent, newId, notify } from "../model/state.ts";
import { newJourney } from "../model/records.ts";
import { ownLoss } from "./sleep.ts";
import type { Order, SallyOrder } from "../model/orders.ts";
import { groundText } from "../model/geography.ts";
import { WorldMap } from "../model/map.ts";
import type { AdjudicationResult, Adjudicator } from "../rules/adjudicator.ts";
import { TurnEngine } from "./core.ts";
import { listed, upper } from "../rules/wording.ts";
import { placesNamed } from "../model/order-reading.ts";

declare module "./core.ts" {
  interface TurnEngine {
    /** Bug #600: what befell a king's troops or walls beyond his couriers' season, told as word from there, with its season. */
    farMovements(p: Power, at: string, lines: string[]): void;
    movementNews(result: AdjudicationResult, sightBefore: Dict<Power, HSet<string>>, byProvince: Dict<string, Order>, sallies: SallyOrder[], unitOrders: [Power, Order][], adjudicator: Adjudicator): void;
  }
}

const P = TurnEngine.prototype;

P.movementNews = function (result, sightBefore, byProvince, sallies, unitOrders, adjudicator) {
  const S = this.s;
  const Map = this.map;
  // Bug #600: its own troops' outcomes where its couriers reach within the season; farther off, a loss wakes a sleeping
  // seat when word of it comes (`ownLoss`), and the lines come home by the road (below).
  const near = (p: Power, province: string): boolean => this.nearOf(province, p).length > 0;
  for (const p of alive(S)) {
    S.lastSeen.set(
      p,
      result.outcomes.filter((o) => (o.power === p && near(p, o.province)) || sightBefore.get(p).has(o.province) || (o.target !== null && sightBefore.get(p).has(o.target))),
    );
    for (const o of result.outcomes.filter((x) => x.power === p && !near(p, x.province) && !sightBefore.get(p).has(x.province))) {
      const lost = ownLoss(o);
      if (lost !== null && S.sleep.has(p)) S.journeys.push(newJourney({ id: newId(S, "j"), kind: "Word", departTurn: S.turn, arriveTurn: this.heardAt(p, o.province), from: p, to: p, news: "Foiled", text: lost }));
    }
  }

  // A unit that held but was beaten from its place has a second line, which says what became of it: its hold goes untold.
  const beaten = (l: ReportLine): boolean => result.lines.some((x) => x !== l && !x.ok && x.failure === null && x.void === null && x.province === l.province && x.power === l.power);
  for (const p of alive(S)) {
    const sight = sightBefore.get(p);
    // Its own orders, each failed move and void support with the reason; foreign orders where the unit stood, or moved to, in sight before the moves.
    const mine: string[] = [];
    const myHolds: ReportLine[] = [];
    // Bug #600: the lines of its troops beyond its couriers' season come home by the road, each from where it stood.
    const far = new Dict<string, string[]>();
    for (const l of result.lines.filter((l) => l.power === p)) {
      if (!near(p, l.province) && !far.has(l.province)) far.set(l.province, []);
      const lines = near(p, l.province) ? mine : far.get(l.province);
      if (heldPlace(l) !== null) {
        if (beaten(l)) continue;
        if (lines === mine) myHolds.push(l);
        else lines.push(...holdsText("Your", [l]));
      } else if (l.failure !== null) {
        const f = l.failure;
        const why = whyMoveFailed(p, l.province, l.target!, f, sight);
        // A scheduled move that others stopped wakes its sleeping seat, with the reason; one its own orders or
        // strength stopped does not.
        const mv = byProvince.tryGet(l.province);
        if (this.stoppedByOthers(p, f) && mv !== undefined) this.wakeFrom(p, mv, l.province, why);
        // Where the unit now stands: it stayed where it was, unless it was destroyed there, which its own line says.
        const stays = S.units.some((u) => u.power === p && u.province === l.province) ? `; it stays in ${Map.get(l.province).name}` : "";
        lines.push(`Your ${l.text}: ${why}${stays}.`);
      } else if (l.assault !== null) lines.push(`Your ${l.text}: ${this.assaultText(l.assault)}.`);
      else {
        lines.push(`Your ${l.text}${l.void !== null ? `: ${l.void}` : ""}.`);
        // So does a scheduled support that a foreign attack cut; not a support or convoy that matched no move,
        // which tells only that the seat guessed another unit's orders wrong.
        const help = byProvince.tryGet(l.province);
        if (l.cut !== null && help !== undefined) this.wakeFrom(p, help, l.province, l.cut);
      }
    }
    for (const [at, lines] of far) if (lines.length > 0) this.farMovements(p, at, lines);
    // The walls of his cities that sallied: whether they found the attack they were to support.
    for (const w of sallies.filter((o) => unitOrders.some(([q, x]) => q === p && x === o))) {
      const matched = adjudicator.sallyMatched(w);
      mine.push(`The walls of ${Map.get(w.city).name} ${matched ? "sallied" : "were to sally"} in support of the attack from ${Map.get(w.from).name}${matched ? "" : `, in vain: no unit moved from ${Map.get(w.from).name} to ${Map.get(w.city).name}`}.`);
      const won = result.moves.some((m) => m.from === w.from && m.to === w.city && m.succeeded);
      logEvent(
        S,
        "sally",
        `The walls of ${Map.get(w.city).name} sallied in support of the attack from ${Map.get(w.from).name}${won ? ", which drove out the troops within" : matched ? ", which failed" : ", but no attack came"}.`,
        [p],
        won ? "sally-won" : "sally",
      );
    }
    // An assault on a walled city of the king's own: his side of it, with the strengths, among his own lines.
    for (const a of result.assaults.filter((a) => a.owner === p)) {
      if (near(p, a.province)) mine.push(this.ownWallsText(a));
      else this.farMovements(p, a.province, [this.ownWallsText(a)]);
    }
    mine.push(...holdsText("Your", myHolds));
    // Foreign troops each name their power, so they need no heading: what they did, then those that held, by power.
    const seenLines = result.lines.filter((l) => l.power !== p && l.power !== null && (sight.has(l.province) || (l.target !== null && sight.has(l.target))));
    const held = seenLines.filter((l) => heldPlace(l) !== null && !beaten(l));
    const seen = seenLines
      .filter((l) => heldPlace(l) === null)
      .map(
        (l) =>
          `${upper(whose(l.power!))} ${l.text}${
            l.assault !== null && l.assault.owner !== p
              ? assaultStormed(l.assault)
                ? ` (it stormed the walls of ${Map.get(l.assault.province).name})`
                : ` (it stands within the walls of ${Map.get(l.assault.province).name} and does not take it)`
              : ""
          }.`,
      );
    for (const q of new Set(held.map((l) => l.power!))) seen.push(...holdsText(upper(whose(q)), held.filter((l) => l.power === q)));
    if (mine.length + seen.length === 0) continue;
    notify(S, p, "Battle", "Movements last season", placesNamed([...mine, ...seen].join("\n")));
  }
};

P.farMovements = function (p, at, lines) {
  this.tell(p, at, "Battle", FarMovementsTitle, placesNamed(`From ${this.map.get(at).name}, of turn ${this.s.turn}:\n${lines.join("\n")}`));
};

/** The title of word of a king's far troops' doings (`farMovements`): not "last season", since it comes later. */
export const FarMovementsTitle = "Word of your troops";

/** Where a unit that only held its ground stood, from its report line ("army in Apasa held"); null for any other line. */
function heldPlace(l: ReportLine): string | null {
  if (l.failure !== null || l.assault !== null || l.void !== null) return null;
  return /^(?:army|fleet) in (.+) held$/.exec(l.text)?.[1] ?? null;
}

/** The units of one side that held their ground, armies then fleets, each kind in one sentence ("Your armies held their ground in Apasa and Mira."). */
function holdsText(side: string, holds: readonly ReportLine[]): string[] {
  const out: string[] = [];
  for (const [kind, kinds, did, done] of [
    ["army", "armies", "held its ground in", "held their ground in"],
    ["fleet", "fleets", "stayed in", "stayed in"],
  ] as const) {
    const of = holds.filter((l) => l.text.startsWith(kind + " "));
    if (of.length === 0) continue;
    const places = [...new Set(of.map((l) => heldPlace(l)!))];
    const where = listed(places);
    out.push(`${side} ${of.length === 1 ? `${kind} ${did}` : `${kinds} ${done}`} ${where}.`);
  }
  return out;
}

/**
 * Why one of the viewer's own moves failed, in plain words, with the strengths the engine compared. The other side's
 * power is named only when the viewer could see that unit before the moves (where it stood, or where it was going); the
 * province it acted from is always named.
 */
function whyMoveFailed(viewer: Power, from: string, to: string, f: MoveFailure, sight: HSet<string>): string {
  const seen = f.power !== null && (sight.has(f.province) || (f.movingTo !== null && sight.has(f.movingTo)));
  const kind = f.kind === "Army" ? "army" : "fleet";
  const whom = f.power === viewer ? `your own ${kind}` : f.power !== null ? `${whose(f.power)} ${kind}` : "";
  const nm = (id: string): string => (WorldMap.default.exists(id) ? WorldMap.default.get(id).name : id);
  const strengths = `; your strength ${strengthWords(f.strength)} against ${strengthWords(f.against)}`;
  // The ground that helped the unit that held it off, in the strength it had to beat.
  // And the land's own men who stood beside it (item 11e).
  const held = strengths + (f.ground !== null ? `, ${strengthWords(f.groundBonus)} of it for ${groundText(f.ground)}` : "") + (f.people > 0 ? `, ${strengthWords(f.people)} of it for the men of the land beside it` : "");
  switch (f.stop) {
    case "NoConvoy":
      return "no convoy carried it across the sea";
    case "OwnUnit":
      return f.movingTo === from
        ? `your own ${kind} in ${nm(f.province)} was moving the other way, and you cannot dislodge your own unit`
        : `your own ${kind} in ${nm(f.province)} did not leave, and you cannot dislodge your own unit`;
    case "HeadToHead":
      return `it met the unit from ${nm(f.province)}${seen ? ` (${whom})` : ""} coming the other way${strengths}`;
    case "Held":
      return `the unit holding ${nm(f.province)}${seen ? ` (${whom})` : ""} kept its place${held}`;
    case "Stayed":
      return `the unit in ${nm(f.province)}${seen ? ` (${whom})` : ""} could not leave, so it kept its place${held}`;
    case "Bounced":
      return `it met a move into ${nm(to)} from ${nm(f.province)}${seen ? ` by ${whom}` : ""}${strengths}`;
    case "Resisted":
      return `the people of ${nm(to)} rose against it and held it off${strengths}`;
    default:
      return "it was stopped";
  }
}
