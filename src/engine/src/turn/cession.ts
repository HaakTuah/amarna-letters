/**
 * A capital ceded whole (build order item 11d, the owner's answer to item 11+'s review: "a ruler may cede his capital whole,
 * by agreement on a sealed tablet, losing his seat and living on as a character"). The validator lets the order stand only
 * where a sealed tablet between the two gives the city ({@link cessionAgreed}); here, after the season's other cessions
 * and gifts of troops, the kingdom falls as one whose capital was taken, but to the receiver, by agreement: its land
 * passes as land ceded (no new absorption), its troops disband, its debts die with it, the receiver takes its archive.
 * The ruler lives on as a free character standing at his old city, with nothing in his purse that was not his. Granting
 * him his city back is a governorship, a privilege, which comes with item 13 ("Governors").
 */
import { cessionAgreed } from "../model/cession.ts";
import type { CedeProvinceOrder } from "../model/orders.ts";
import { newFact } from "../model/people.ts";
import { land, type Power, powerName, whose } from "../model/power.ts";
import { findCharacter, isAlive, logEvent, newId, unitAt } from "../model/state.ts";
import { seasonWords } from "../rules/clauses.ts";
import { TurnEngine } from "./core.ts";

declare module "./core.ts" {
  interface TurnEngine {
    /** A king's capital ceded by agreement: his realm passes whole, and he lives on as a character. */
    realmCeded(p: Power, c: CedeProvinceOrder): void;
  }
}

const P = TurnEngine.prototype;

P.realmCeded = function (p, c) {
  const S = this.s;
  const name = this.map.get(c.province).name;
  if (S.owner.getOrDefault(c.province, null) !== p) {
    this.lostOrder(p, c, c.province, "Cession failed", `${name} was not ceded to ${powerName(c.to)}: you no longer held it when the moves were done.`, "you no longer held it");
    return;
  }
  // The agreement must still stand as the season resolves: a tablet repudiated (as he knows it) or carried off since gives nothing.
  if (!cessionAgreed(S.tablets, p, c.to, c.province, S.turn)) {
    this.failed(p, c, "Cession failed", `${name} was not ceded to ${powerName(c.to)}: no sealed tablet between you gives it any more.`, "the tablet no longer stands", false);
    return;
  }
  if (!isAlive(S, c.to)) {
    this.failed(p, c, "Cession failed", `${name} was not ceded to ${powerName(c.to)}: that kingdom is no more.`, "the receiver has fallen", true);
    return;
  }
  // Troops of his own standing in it go home with the rest when the kingdom falls; a foreign unit there would be the
  // receiver's to face, so an unhindered city is all the order needs.
  const u = unitAt(S, c.province);
  if (u !== null && u.power !== p && u.power !== c.to) {
    this.failed(p, c, "Cession failed", `${name} was not ceded to ${powerName(c.to)}: ${whose(u.power)} troops stood in it when the moves were done.`, "foreign troops stood there", true);
    return;
  }
  logEvent(S, "cession", `${p} ceded ${name}, its capital, and with it the whole realm, to ${c.to}.`, [p, c.to]);
  this.fall(p, c.to, true);
  // A capital ceded is a capital taken: its archive lies in the city.
  this.takeArchive(c.to, c.province);
  // Its king lives on, a free man at his old city (item 17b: he was a person all along).
  const k = findCharacter(S, S.reigns.get(p).character);
  if (k !== null) k.facts.push(newFact({ id: newId(S, "f"), text: `Ceded ${name}, and with it the whole of ${land(p)}, to ${powerName(c.to)} by a sealed tablet, in ${seasonWords(S.turn)}.`, secrecy: "Public", tag: "origin" }));
};
