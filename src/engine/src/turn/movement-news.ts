/**
 * The season's movement news (moved from resolve.ts, by meaning): what each king's troops did, as the outcomes it may see
 * (GameState.lastSeen) and the notice "Movements last season", with why each of its moves failed.
 */
import type { Dict, HSet } from "../core/collections.ts";
import type { MoveFailure } from "../model/outcomes.ts";
import { stormed as assaultStormed, strengthWords } from "../model/outcomes.ts";
import { land, type Power } from "../model/power.ts";
import { alive, logEvent, notify } from "../model/state.ts";
import type { Order, SallyOrder } from "../model/orders.ts";
import { groundText } from "../model/geography.ts";
import { WorldMap } from "../model/map.ts";
import type { AdjudicationResult, Adjudicator } from "../rules/adjudicator.ts";
import { TurnEngine } from "./core.ts";
import { upper, whose } from "./battles.ts";
import { placesNamed } from "../model/order-reading.ts";

declare module "./core.ts" {
  interface TurnEngine {
    movementNews(result: AdjudicationResult, sightBefore: Dict<Power, HSet<string>>, byProvince: Dict<string, Order>, sallies: SallyOrder[], unitOrders: [Power, Order][], adjudicator: Adjudicator): void;
  }
}

const P = TurnEngine.prototype;

P.movementNews = function (result, sightBefore, byProvince, sallies, unitOrders, adjudicator) {
  const S = this.s;
  const Map = this.map;
  for (const p of alive(S))
    S.lastSeen.set(
      p,
      result.outcomes.filter((o) => o.power === p || sightBefore.get(p).has(o.province) || (o.target !== null && sightBefore.get(p).has(o.target))),
    );

  for (const p of alive(S)) {
    const sight = sightBefore.get(p);
    // Its own orders, each failed move and void support with the reason; foreign orders where the unit stood, or moved to, in sight before the moves.
    const mine: string[] = [];
    for (const l of result.lines.filter((l) => l.power === p)) {
      if (l.failure !== null) {
        const f = l.failure;
        const why = whyMoveFailed(p, l.province, l.target!, f, sight);
        // A scheduled move that others stopped wakes its sleeping seat, with the reason; one its own orders or
        // strength stopped does not.
        const mv = byProvince.tryGet(l.province);
        if (this.stoppedByOthers(p, f) && mv !== undefined) this.scheduledFailed(p, mv, why);
        // Where the unit now stands: it stayed where it was, unless it was destroyed there, which its own line says.
        const stays = S.units.some((u) => u.power === p && u.province === l.province) ? `; it stays in ${Map.get(l.province).name}` : "";
        mine.push(`Your ${l.text}: ${why}${stays}.`);
      } else if (l.assault !== null) mine.push(`Your ${l.text}: ${this.assaultText(l.assault)}.`);
      else {
        mine.push(`Your ${l.text}${l.void !== null ? `: ${l.void}` : ""}.`);
        // So does a scheduled support that a foreign attack cut; not a support or convoy that matched no move,
        // which tells only that the seat guessed another unit's orders wrong.
        const help = byProvince.tryGet(l.province);
        if (l.cut !== null && help !== undefined) this.scheduledFailed(p, help, l.cut);
      }
    }
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
    for (const a of result.assaults.filter((a) => a.owner === p)) mine.push(this.ownWallsText(a));
    const seen = result.lines
      .filter((l) => l.power !== p && l.power !== null && (sight.has(l.province) || (l.target !== null && sight.has(l.target))))
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
    if (mine.length + seen.length === 0) continue;
    let body = mine.map((x) => "- " + x).join("\n");
    if (seen.length > 0) body += "\nSeen nearby:\n" + seen.map((x) => "- " + x).join("\n");
    notify(S, p, "Battle", "Movements last season", placesNamed(body.trim()));
  }
};

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
