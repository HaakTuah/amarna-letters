/**
 * A capital ceded whole (build order item 11d, Haakon's answer to item 11+'s review: "a ruler may cede his capital whole,
 * by agreement on a sealed tablet, losing his seat and living on as a character"). The validator lets the order stand only
 * where a sealed tablet between the two gives the city ({@link cessionAgreed}); here, after the season's other cessions
 * and gifts of troops, the kingdom falls as one whose capital was taken, but to the receiver, by agreement: its land
 * passes as land ceded (no new absorption), its troops disband, its debts die with it, the receiver takes its archive.
 * The ruler lives on as a free character standing at his old city, with nothing in his purse that was not his. Granting
 * him his city back is a governorship, a privilege, which comes with item 13 ("Governors").
 */
import { clamp } from "../core/num.ts";
import { cmpNum, sortBy } from "../core/seq.ts";
import type { CedeProvinceOrder } from "../model/orders.ts";
import { newCharacter, newFact, newTraits, type Character } from "../model/people.ts";
import { AllPowers, king, land, rulerNamed, type Power } from "../model/power.ts";
import { isAlive, logEvent, newId, unitAt } from "../model/state.ts";
import { seasonWords } from "../rules/clauses.ts";
import { personaTemplate } from "../rules/personas.ts";
import { drawSkills } from "../rules/skills.ts";
import { chooseStrategy } from "../rules/strategy.ts";
import { Styles } from "../rules/cast.ts";
import { TurnEngine } from "./core.ts";

declare module "./core.ts" {
  interface TurnEngine {
    /** A king's capital ceded by agreement: his realm passes whole, and he lives on as a character. */
    realmCeded(p: Power, c: CedeProvinceOrder): void;
    /** The ruler of a realm he ceded, put on the map as a free man at his old city. */
    formerRuler(p: Power, to: Power): Character;
  }
}

const P = TurnEngine.prototype;

P.realmCeded = function (p, c) {
  const S = this.s;
  const name = this.map.get(c.province).name;
  if (S.owner.getOrDefault(c.province, null) !== p) {
    this.failed(p, c, "Cession failed", `${name} was not ceded to ${c.to}: you no longer held it after movement.`, "you no longer held it", true);
    return;
  }
  if (!isAlive(S, c.to)) {
    this.failed(p, c, "Cession failed", `${name} was not ceded to ${c.to}: that kingdom is no more.`, "the receiver has fallen", true);
    return;
  }
  // Troops of his own standing in it go home with the rest when the kingdom falls; a foreign unit there would be the
  // receiver's to face, so an unhindered city is all the order needs.
  const u = unitAt(S, c.province);
  if (u !== null && u.power !== p && u.power !== c.to) {
    this.failed(p, c, "Cession failed", `${name} was not ceded to ${c.to}: ${u.power}'s troops stood in it after movement.`, "foreign troops stood there", true);
    return;
  }
  logEvent(S, "cession", `${p} ceded ${name}, its capital, and with it the whole realm, to ${c.to}.`, [p, c.to]);
  this.fall(p, c.to, c.to, true);
  // A capital ceded is a capital taken: its archive lies in the city.
  this.takeArchive(c.to, c.province);
  this.formerRuler(p, c.to);
};

P.formerRuler = function (p, to) {
  const S = this.s;
  const capital = this.map.capital(p);
  const rng = this.r("ceded", p);
  // His own name where the sources give one; else one in his land's style (or the nearest court's that has one).
  const nearest = sortBy([...AllPowers].filter((x) => Styles.some((st) => st.court === x)), [(x: Power) => this.map.hops(this.map.capital(x).id, capital.id), cmpNum])[0];
  const style = Styles.find((st) => st.court === p) ?? Styles.find((st) => st.court === nearest) ?? Styles[0];
  const base = rulerNamed(p) ? king(p) : rng.pick(style.names);
  const c = newCharacter({
    id: newId(S, "c"),
    name: S.characters.some((x) => x.name === base) ? `${base} of ${capital.name}` : base,
    origin: capital.name,
    calling: `former ruler of ${land(p)}`,
    // A man who held a throne: able and ambitious, his loyalty his own (first guesses, item 18).
    traits: newTraits({
      loyalty: rng.range(20, 80),
      greed: rng.range(20, 90),
      competence: Math.min(rng.range(30, 95), rng.range(30, 95)),
      ambition: clamp(rng.range(40, 95), 0, 100),
      courage: rng.range(20, 90),
    }),
  });
  const add = (text: string): void => {
    c.facts.push(newFact({ id: newId(S, "f"), text, secrecy: "Public", tag: "origin" }));
  };
  add(`Ruled ${land(p)} from ${capital.name}.`);
  add(`Ceded ${capital.name}, and with it the whole of ${land(p)}, to ${to} by a sealed tablet, in ${seasonWords(S.turn)}.`);
  c.traits.sympathy = null;
  c.traits.sympathyStrength = 0;
  c.arrived = S.turn;
  c.status = "Free";
  c.seeking = true;
  // He stands where his court stood, at his old city, now the receiver's.
  c.at = p;
  drawSkills(S.seed, c);
  chooseStrategy(c);
  c.persona = personaTemplate(c);
  S.characters.push(c);
  return c;
};
