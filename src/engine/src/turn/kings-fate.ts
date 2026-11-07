/**
 * A king is a person (build order item 17b, part B; "One scoreboard for every person" under Victory): each power's king is
 * a character with the duty Ruling, as a ruler risen in play already was. Taken where he stands or on the road, he is his
 * captor's captive, his fate the captor's to decide by the orders for any captive (put to death, ransomed, released, handed
 * over), and his skill at going unseen may get him out; his court flees to the nearest city his realm still holds, and
 * rules in his name until he is back. He dies only by a cause where he is, never by dice: put to death, or on the road. When
 * he dies his player is out, and the next name on his realm's record of the kings who followed reigns (`model/heirs.ts`),
 * or past it a son or brother drawn as facts, from that season, inheriting a third of his father's standing.
 */
import { clamp } from "../core/num.ts";
import type { Rng } from "../core/rng.ts";
import { Dict } from "../core/collections.ts";
import { cmpNum, cmpStr, sortBy } from "../core/seq.ts";
import { HeirData, Lines, type Heir } from "../model/heirs.ts";
import { KingTraitValues, ReignData, type Reign } from "../model/kings.ts";
import { newCharacter, newFact, newTraits, remember, type Character } from "../model/people.ts";
import { AllPowers, heirsHeard, king, land, powerName, rulerNamed, rulerStyle, setCrowned, type Power } from "../model/power.ts";
import { newJourney } from "../model/records.ts";
import { alive, findCharacter, isAlive, logEvent, newId, notify, ownedBy } from "../model/state.ts";
import { styleOf } from "../rules/cast.ts";
import { crownedIn, realmOfKing } from "../rules/court.ts";
import { personaTemplate } from "../rules/personas.ts";
import { drawSkills } from "../rules/skills.ts";
import { chooseStrategy } from "../rules/strategy.ts";
import { upper } from "../rules/wording.ts";
import { TurnEngine } from "./core.ts";

/**
 * First guesses (item 18 tunes them): a king's competence as a person, from which his skills are drawn; the chance in a
 * thousand each season, for each point of his skill at going unseen, that a king held at his captor's court gets away.
 */
export const KingData = { competence: 60, escape: 1 } as const;

declare module "./core.ts" {
  interface TurnEngine {
    /** The game's start: each power's king as a person, reigning. */
    seatKings(): void;
    /** A power's king, taken by `by` where he stood (null: by nobody, and he gets away); his court flees, or his realm falls. */
    kingTaken(p: Power, by: Power | null): void;
    /** Each season: a king held at his captor's court may get away, by his skill at going unseen. */
    kingsHeld(): void;
    /** A king walks home, set free or escaped, from the province where he is. */
    kingGoesHome(c: Character, p: Power, from: string): void;
    /**
     * A reigning king has died (`how`, in words: "put to death by Hatti") in province `where`: his reign ends, and his
     * heir reigns once word of it reaches his court.
     */
    kingDied(c: Character, how: string, where: string): void;
    /** Word of the king's death has reached his court (`text`): his heir reigns. */
    heirReigns(p: Power, text: string): void;
    /** Word of a realm's new king, its `count`th heir, has reached court `by`, which knows him by his name from now. */
    heirHeard(p: Power, by: Power, count: number): void;
  }
}

const P = TurnEngine.prototype;

/** A king's traits as a person, from his traits as a king: his appetite for war his ambition, his caution his want of courage, his honesty his loyalty. */
function personTraits(t: readonly number[]): { ambition: number; courage: number; loyalty: number; greed: number; competence: number } {
  const at = (k: (typeof KingTraitValues)[number]): number => t[KingTraitValues.indexOf(k)] ?? 50;
  return { ambition: at("aggression"), courage: 100 - at("caution"), loyalty: at("honesty"), greed: at("greed"), competence: KingData.competence };
}

/** A new person for a power's throne, at its court, reigning (the reign is set by the caller). */
function newKing(e: TurnEngine, p: Power, name: string, traits: readonly number[], facts: readonly string[]): Character {
  const S = e.s;
  const seat = e.map.get(e.courtAt(p)).name;
  const c = newCharacter({
    id: newId(S, "c"),
    name: S.characters.some((x) => x.name === name) ? `${name} of ${land(p)}` : name,
    origin: seat,
    calling: `${rulerStyle(p)} of ${land(p)}`,
    traits: newTraits(personTraits(traits)),
  });
  for (const text of [`Rules ${land(p)} from ${seat}.`, ...facts]) c.facts.push(newFact({ id: newId(S, "f"), text, secrecy: "Public", tag: "origin" }));
  c.status = "Employed";
  c.employer = p;
  c.duty = "Ruling";
  c.at = p;
  drawSkills(S.seed, c);
  chooseStrategy(c);
  c.persona = personaTemplate(c);
  S.characters.push(c);
  return c;
}

/** A name in a realm's style nobody has yet (an unnamed ruler, a drawn heir). */
function drawnName(e: TurnEngine, p: Power, rng: Rng): string {
  const names = styleOf(p).names;
  const free = names.filter((n) => !e.s.characters.some((c) => c.name === n));
  return rng.pick(free.length > 0 ? free : names);
}

P.seatKings = function () {
  const S = this.s;
  for (const p of AllPowers) {
    const r = S.reigns.get(p);
    // The sources' name where they give one; else one in his land's style, the letters still calling him by his title.
    const name = rulerNamed(p) ? king(p) : drawnName(this, p, this.r("king-name", p));
    const c = newKing(this, p, name, r.traits, []);
    r.character = c.id;
  }
  // The pool's baseline counts the kings: an heir takes his father's place in it.
  S.baseline += AllPowers.length;
};

P.kingTaken = function (p, by) {
  const S = this.s;
  const where = this.courtAt(p);
  const c = findCharacter(S, S.reigns.get(p).character);
  // Only a king at his court, or with it on the road, is taken with it: one walking home elsewhere is not.
  if (c !== null && c.status === "Employed" && c.duty === "Ruling" && by !== null && isAlive(S, by)) {
    // Taken alive: under his captor's guard to his court, like any captive given over, so he may be freed on the road.
    c.status = "Captured";
    c.heldBy = by;
    c.duty = "UnderGuard";
    // He was no spy at a post: he can be put to death, ransomed, released or handed over, never turned.
    c.intercepted = true;
    c.at = null;
    const j = newJourney({ id: newId(S, "j"), kind: "CaptiveConvoy", departTurn: S.turn, from: by, to: by, characterId: c.id });
    S.journeys.push(j);
    this.setOut(j, where, this.courtAt(by));
    this.meet(c, by);
    remember(c, S.turn, `I was taken by ${land(by)} in ${this.map.get(where).name}.`);
    notify(S, by, "Notice", "A king taken", `Your men took ${c.name}, ${rulerStyle(p)} of ${powerName(p)}, in ${this.map.get(where).name}; your guards bring him to your court. His fate is yours: you may put him to death, ransom him, release him or hand him over (order captive).`, c.id);
    logEvent(S, "king-taken", `${by} took ${c.name}, king of ${p}, in ${this.map.get(where).name}.`, [p, by], "king-taken");
  }
  S.kingRoads = S.kingRoads.filter((r) => r.power !== p);
  // His court flees to the nearest city his realm still holds; a realm that holds nothing has fallen.
  const held = ownedBy(S, p);
  if (held.length === 0) {
    this.fall(p, by);
    return;
  }
  const to = sortBy(held, [(x: string) => this.travelTurnsBetween(where, x), cmpNum], [(x: string) => x, cmpStr])[0];
  if (to === where) return;
  S.court.set(p, to);
  const king = c !== null && c.status === "Captured" ? `${c.name} is ${by === null ? "lost" : `held by ${powerName(by)}`}, and ` : "";
  notify(S, p, "Notice", "The court flees", `${this.map.get(where).name} is lost: ${king}your court has fled to ${this.map.get(to).name}, from where it rules${king === "" ? "" : " in his name until he is back"}.`);
};

P.kingsHeld = function () {
  const S = this.s;
  for (const p of alive(S)) {
    const c = findCharacter(S, S.reigns.get(p).character);
    if (c === null || c.status !== "Captured" || c.heldBy === null || c.duty === "UnderGuard") continue;
    if (!this.r("king-escape", c.id).chance((c.skills.stealth * KingData.escape) / 1000)) continue;
    const host = c.heldBy;
    S.tasks = S.tasks.filter((t) => !(t.kind === "RansomDemand" && t.characterId === c.id));
    c.status = "Employed";
    c.heldBy = null;
    c.intercepted = false;
    remember(c, S.turn, `I got away from my guards in ${land(host)}.`);
    notify(S, host, "Notice", "A king escapes", `${c.name}, the ${rulerStyle(p)} of ${powerName(p)} you held, has got away from your guards.`, c.id);
    logEvent(S, "king-escapes", `${c.name}, king of ${p}, escaped from ${host}.`, [host], "king-escapes");
    this.kingGoesHome(c, p, this.courtAt(host));
  }
};

P.kingGoesHome = function (c, p, from) {
  // He walks the road like any traveller, and is king again at his court when he gets there.
  c.at = null;
  this.startTravel(c, p, null, from);
};

P.kingDied = function (c, how, where) {
  const S = this.s;
  const p = realmOfKing(S, c.id);
  if (p === null) return;
  const r = S.reigns.get(p);
  // His reign, and his player's game, end where he dies.
  S.reignsEnded.push({ power: p, character: c.id, since: r.since, until: S.turn, how });
  // His seat wakes: a death concerns it, and a human player's heir is played by a script from now.
  this.endSleep(p, "the king is dead");
  logEvent(S, "king-dies", `${c.name}, king of ${p}, died ${how}.`, [], "king-dies");
  // His court learns of it as word comes from where he died (at once, if he died there), and his heir reigns from then.
  const seat = this.courtAt(p);
  const text = `${c.name}, ${rulerStyle(p)} of ${powerName(p)}, is dead, ${how}.`;
  if (where === seat) {
    this.heirReigns(p, text);
    return;
  }
  S.journeys.push(newJourney({ id: newId(S, "j"), kind: "Word", departTurn: S.turn, arriveTurn: S.turn + this.travelTurnsBetween(where, seat), from: p, to: p, news: "KingDead", text }));
};

P.heirReigns = function (p, text) {
  const S = this.s;
  const r = S.reigns.get(p);
  const dead = findCharacter(S, r.character);
  if (dead === null || dead.status !== "Dead" || !isAlive(S, p)) return;
  // The heir inherits a third of his father's standing, love and hate alike, with the people and the soldiers.
  for (const book of [...S.ledger.values(), ...S.armies.values()]) {
    const v = book.tryGet(p);
    if (v !== undefined) book.set(p, Math.trunc(v / 3));
  }
  const heir = raiseHeir(this, p, dead, r);
  const news = `${text} ${heir.name} reigns in his place: ${S.reigns.get(p).about}`;
  const coming = heir.duty === "Ruling" ? "" : " You are on your way to your court, and it rules in your name until you are there.";
  notify(S, p, "Notice", "The king is dead", `${news} You are ${heir.name} now, and you reign from this season: the people and the soldiers remember a third of what they owed your father, his love and his hate alike, and his debts and promises are yours to honour or not.${coming}`, heir.id);
  logEvent(S, "king-heir", `${heir.name} reigns over ${p}.`, [p], "king-heir");
  // The word carries how many heirs there have been, so a slow word names no later one.
  const count = heirsHeard(null, p);
  for (const other of alive(S).filter((x) => x !== p)) {
    this.word(p, other, "Succession", `Word comes that ${news}`);
    S.journeys[S.journeys.length - 1].gold = count;
  }
};

P.heirHeard = function (p, by, count) {
  const S = this.s;
  let book = S.reignsHeard.tryGet(p);
  if (book === undefined) S.reignsHeard.set(p, (book = new Dict()));
  book.set(by, Math.max(book.getOrDefault(by, 0), count));
  setCrowned(crownedIn(S));
};

/** The heir's reign as the record or the draw gives him: his place on the line, his traits, his name and what is known of him. */
function raiseHeir(e: TurnEngine, p: Power, dead: Character, was: Reign): Character {
  const S = e.s;
  const rng = e.r("heir", p);
  const line = Lines[p]?.heirs ?? [];
  // The next name on the record whose man is not already dead or held; past it, a son or brother drawn as facts.
  let at = was.line + 1;
  const living = (h: Heir): Character | null | undefined => {
    // The man of the record himself: one of the sources' people on the map by that name, never a namesake who reigns elsewhere.
    const c = h.name === null ? undefined : S.characters.find((x) => x.name === h.name && x.attested && realmOfKing(S, x.id) === null);
    if (c === undefined) return null;
    return c.status === "Dead" || c.status === "Captured" ? undefined : c;
  };
  while (at < line.length && living(line[at]) === undefined) at++;
  const h: Heir | null = at < line.length ? line[at] : null;
  const kin = h?.kin ?? (rng.chance(HeirData.son / 100) ? "son" : "brother");
  const traits = KingTraitValues.map((k) => clamp((h?.traits?.[k] ?? 50 + rng.range(-HeirData.spread, HeirData.spread)) + rng.range(-ReignData.vary, ReignData.vary), 0, 100));
  const name = h?.name ?? drawnName(e, p, rng);
  const kinLine = kin.startsWith("of ") ? `Followed ${dead.name}, ${kin}.` : kin.startsWith("a ") || kin.startsWith("an ") || kin.startsWith("the ") ? `${upper(kin)}, who followed ${dead.name}.` : `${upper(kin)} of ${dead.name}.`;
  const about = h === null || h.about === "" ? kinLine : `${kinLine} ${h.about}`;
  // A man of the record already on the map takes the throne himself, from wherever he is.
  const there = h !== null ? (living(h) ?? null) : null;
  if (there !== null) crownPerson(e, there, p, about);
  const c = there ?? newKing(e, p, name, traits, [about]);
  S.reigns.set(p, { traits, since: S.turn, character: c.id, strength: e.strength(p), name: c.name, about, line: at });
  setCrowned(crownedIn(S));
  e.syncNames();
  remember(c, S.turn, `${dead.name} is dead, and I reign over ${land(p)}.`);
  return c;
}

/** One already on the map comes to the throne: his service, errands and roads end, and he is at his court. */
function crownPerson(e: TurnEngine, c: Character, p: Power, about: string): void {
  const S = e.s;
  const seat = e.courtAt(p);
  // Where he is: at a court, on a road (where his journey has brought him), or out in a province.
  const road = S.journeys.find((j) => j.characterId === c.id && j.route.length > 0);
  const where = c.at !== null ? e.courtAt(c.at) : road !== undefined ? road.route[road.leg] : (c.watchProvince ?? seat);
  for (const g of S.governors.filter((x) => x.character === c.id)) e.dropGovernor(g);
  S.journeys = S.journeys.filter((j) => j.characterId !== c.id);
  c.employer = p;
  c.status = "Employed";
  c.contract = null;
  c.duty = "Ruling";
  c.watchProvince = null;
  c.missionTarget = null;
  c.seeking = false;
  c.calling = `${rulerStyle(p)} of ${land(p)}`;
  for (const text of [`Rules ${land(p)} from ${e.map.get(seat).name}.`, about]) c.facts.push(newFact({ id: newId(S, "f"), text, secrecy: "Public", tag: "origin" }));
  // He reigns from where he is, and walks to his court like any traveller.
  if (where === seat) c.at = p;
  else e.kingGoesHome(c, p, where);
}
