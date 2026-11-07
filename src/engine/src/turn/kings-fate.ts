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
import { newJourney, type Journey } from "../model/records.ts";
import { alive, findCharacter, isAlive, logEvent, newId, notify, ownedBy, type GameState } from "../model/state.ts";
import { styleOf } from "../rules/cast.ts";
import { crownedIn, fallenRealmOf, kingAfield, kingLossUnheard, kingRoute, realmOfKing, standsAt } from "../rules/court.ts";
import { formatMoney } from "../rules/calendar.ts";
import type { AdjudicationResult } from "../rules/adjudicator.ts";
import { KingAloneData, newKingRoad } from "../model/command.ts";
import { defenderLost } from "./battles.ts";
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
    /**
     * A power's king, taken by `by` where he stood (null: by nobody, and he gets away), in a city taken (`city`), where he
     * may die in its fall, or on the road.
     */
    kingTaken(p: Power, by: Power | null, city: boolean): void;
    /**
     * Item 17b, part C: a power's court lost to `by`, where it stood or on the road (`road`): its treasury lost with it
     * (part C2), it flees to the nearest city its realm holds, or the realm, holding nothing, falls.
     */
    courtFlees(p: Power, by: Power | null, road: boolean): void;
    /** Item 17b, part C: word that the king was taken (`text`) sets out from `where` to his court, unless he was with it. */
    kingLostWord(p: Power, where: string, text: string): void;
    /** Item 17b, part C: word that the king was taken reaches his court, which rules in his name from now. */
    kingLostHeard(p: Power, text: string): void;
    /** Item 17b, part C: a king whose side lost a battle where he stood dies in it, is taken, or gets away with his men. */
    kingsInBattle(result: AdjudicationResult): void;
    /** Each season: a king held at his captor's court may get away, by his skill at going unseen. */
    kingsHeld(): void;
    /** A king walks home, set free or escaped, from the province where he is. */
    kingGoesHome(c: Character, p: Power, from: string): void;
    /**
     * A reigning king has died (`how`, in words: "put to death by Hatti") in province `where`: his reign ends, and his
     * heir reigns once word of it reaches his court.
     */
    kingDied(c: Character, how: string, where: string): void;
    /** Word of the king's death has reached his court (`text`): his heir reigns, or, the realm fallen, lives on in exile. */
    heirReigns(p: Power, text: string): void;
    /** Part C2: word of a king's death sets out from `from` to his court in `seat`. */
    kingDeadWord(p: Power, from: string, seat: string, text: string): void;
    /** Part C2: word of a king's death arrives: sent on to a court that has moved since, else his heir reigns. */
    kingDeadHeard(j: Journey): void;
    /** Part C2: word reaches a man of the record, already elsewhere, that he is a fallen realm's heir: sent on after him, else his claim is his. */
    heirClaimHeard(j: Journey): void;
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

/** A reigning king taken alive by `by` at `where`: under his captor's guard to his court, like any captive given over. */
function captureKing(e: TurnEngine, c: Character, p: Power, by: Power, where: string): void {
  const S = e.s;
  // Apart from his court, his realm learns of it only when the word comes (`kingLostWord`).
  const apart = S.kingAt.has(p) && where !== e.courtAt(p);
  c.status = "Captured";
  c.heldBy = by;
  c.duty = "UnderGuard";
  // He was no spy at a post: he can be put to death, ransomed, released or handed over, never turned.
  c.intercepted = true;
  c.at = null;
  const j = newJourney({ id: newId(S, "j"), kind: "CaptiveConvoy", departTurn: S.turn, from: by, to: by, characterId: c.id });
  S.journeys.push(j);
  // So he may be freed on the road.
  e.setOut(j, where, e.courtAt(by));
  e.meet(c, by);
  remember(c, S.turn, `I was taken by ${land(by)} in ${e.map.get(where).name}.`);
  notify(S, by, "Notice", "A king taken", `Your men took ${c.name}, ${rulerStyle(p)} of ${powerName(p)}, in ${e.map.get(where).name}; your guards bring him to your court. His fate is yours: you may put him to death, ransom him, release him or hand him over (order captive).`, c.id);
  logEvent(S, "king-taken", `${by} took ${c.name}, king of ${p}, in ${e.map.get(where).name}.`, apart ? [by] : [p, by], "king-taken");
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

P.kingTaken = function (p, by, city) {
  const S = this.s;
  const where = standsAt(S, this.map, p);
  const c = findCharacter(S, S.reigns.get(p).character);
  // Only a king free and reigning where it fell, or on the road, is taken: one walking home elsewhere is not.
  if (c === null || c.status !== "Employed" || c.duty !== "Ruling" || by === null || !isAlive(S, by)) return;
  // His own road ends.
  S.kingRoads = S.kingRoads.filter((r) => !(r.power === p && r.alone));
  // Item 17b, part C: in a city taken he may die in its fall.
  if (city && this.r("king-city", p).chance(KingAloneData.diesInCity / 100)) {
    this.dies(c, where, "as the city fell");
    return;
  }
  captureKing(this, c, p, by, where);
  this.kingLostWord(p, where, `Word comes that ${c.name} was taken by ${powerName(by)} in ${this.map.get(where).name}.`);
};

P.kingLostWord = function (p, where, text) {
  const S = this.s;
  // With his court, it knows at once; apart from it, it knows when the word comes, and believes him where he was till then.
  if (!S.kingAt.has(p) || where === this.courtAt(p)) {
    S.kingAt.delete(p);
    return;
  }
  // He commands from nowhere now: what the court believes is kept apart from where he is.
  S.kingHeard.set(p, S.kingAt.get(p));
  S.kingAt.delete(p);
  S.journeys.push(newJourney({ id: newId(S, "j"), kind: "Word", departTurn: S.turn, arriveTurn: S.turn + this.travelTurnsBetween(where, this.courtAt(p)), from: p, to: p, news: "KingTaken", text }));
};

P.kingLostHeard = function (p, text) {
  const S = this.s;
  S.kingHeard.delete(p);
  const c = findCharacter(S, S.reigns.get(p).character);
  const still = c !== null && c.status === "Captured" ? " Your court rules in his name until he is back." : "";
  notify(S, p, "Notice", "The king taken", `${text}${still}`);
  logEvent(S, "king-taken-heard", text, [p]);
};

P.courtFlees = function (p, by, road) {
  const S = this.s;
  const where = this.courtAt(p);
  S.kingRoads = S.kingRoads.filter((r) => !(r.power === p && !r.alone));
  // Part C2: its treasury is lost with it, to whoever took it (or to the people there, if nobody holds it); on the road its
  // archive too, which a city taken gives up by its own rule (`takeArchive`).
  const t = S.treasuries.get(p);
  const gold = Math.max(0, t.gold);
  t.gold -= gold;
  // Its shipments not yet weighed are lost with it: what they held in fine gold is in that gold already.
  t.lots.length = 0;
  const taker = by !== null && isAlive(S, by) ? by : null;
  if (gold > 0 && taker !== null) {
    const went = this.receiveAt(taker, where, gold, false);
    const to = { treasury: "into your treasury", coffer: "kept there in your own coffer", home: "on the road home to your treasury", people: "left among the people there, with no road home for it" }[went];
    this.tell(taker, where, "Notice", "A treasury taken", `With the court of ${powerName(p)} in ${this.map.get(where).name} your men took its treasury: ${formatMoney(gold)}, ${to}.`);
  } else if (gold > 0) this.spendAt(where, gold);
  if (road && taker !== null) this.takeArchive(taker, where, p);
  if (gold > 0 || road) logEvent(S, "court-taken", `The court of ${powerName(p)} was taken in ${this.map.get(where).name}${gold > 0 ? `, its treasury of ${formatMoney(gold)} lost` : ""}.`, taker === null ? [] : [taker], road ? "court-taken-road" : "court-treasury");
  // Its people flee to the nearest city the realm still holds, a real journey; a realm that holds nothing has fallen.
  const held = ownedBy(S, p);
  if (held.length === 0) {
    this.fall(p, by);
    return;
  }
  const to = sortBy(held, [(x: string) => this.travelTurnsBetween(where, x), cmpNum], [(x: string) => x, cmpStr])[0];
  const lost = gold > 0 ? ` Its treasury, ${formatMoney(gold)}, is lost with it.` : "";
  const c = findCharacter(S, S.reigns.get(p).character);
  const r = to === where ? null : kingRoute(S, this.map, p, to);
  if (r !== null) S.kingRoads.push(newKingRoad({ power: p, to, route: r.route, leg: 0, along: 0, since: S.turn, alone: false }));
  else S.court.set(p, to);
  // Fled to where the king stands (as it knows), it is with him again.
  if (r === null && kingAfield(S, p) === to) {
    S.kingAt.delete(p);
    S.kingHeard.delete(p);
  }
  // Its king held, as the court knows (a capture whose word is still on the road it does not know of).
  const king = c !== null && c.status === "Captured" && !kingLossUnheard(S, p) ? `${c.name} is ${c.heldBy === null ? "lost" : `held by ${powerName(c.heldBy)}`}, and ` : "";
  const afield = kingAfield(S, p);
  const apart = afield !== undefined ? ` You are in ${this.map.get(afield).name}, apart from it.` : "";
  const flees = r !== null ? `your court flees to ${this.map.get(to).name}, and rules from the road` : to === where ? `your court shelters in ${this.map.get(to).name}, from where it rules` : `your court is in ${this.map.get(to).name}, from where it rules`;
  const how = road ? `Your court was stopped and taken on the road in ${this.map.get(where).name}` : `${this.map.get(where).name} is lost`;
  notify(S, p, "Notice", road ? "The court taken on the road" : "The court flees", `${how}: ${king}${flees}${king === "" ? "" : " in his name until he is back"}.${lost}${apart}`);
};

P.kingsInBattle = function (result) {
  const S = this.s;
  for (const p of alive(S)) {
    const c = findCharacter(S, S.reigns.get(p).character);
    if (c === null || c.status !== "Employed" || c.duty !== "Ruling") continue;
    // A battle his side lost where he stands: his men beaten from it, or crushed holding it.
    const x = standsAt(S, this.map, p);
    const f = result.fights.find((f) => f.at === x && S.units.find((u) => u.id === f.defender)?.power === p && defenderLost(f));
    if (f === undefined) continue;
    const by = S.units.find((u) => u.id === f.attacker)?.power ?? null;
    const rng = this.r("king-battle", p);
    const roll = rng.range(0, 99);
    if (roll < KingAloneData.fallsInBattle) {
      this.dies(c, x, "in battle");
      continue;
    }
    if (by !== null && isAlive(S, by) && roll < KingAloneData.fallsInBattle + KingAloneData.takenInBattle) {
      S.kingRoads = S.kingRoads.filter((r) => !(r.power === p && r.alone));
      captureKing(this, c, p, by, x);
      this.kingLostWord(p, x, `Word comes that ${c.name} was taken by ${powerName(by)} in battle in ${this.map.get(x).name}.`);
      continue;
    }
    // He gets away with his beaten men, where they fall back, apart from his court.
    const to = result.newPositions.tryGet(f.defender) ?? x;
    if (to === x || this.map.get(to).isSea) continue;
    S.kingRoads = S.kingRoads.filter((r) => !(r.power === p && r.alone));
    S.kingAt.set(p, to);
    if (to === this.courtAt(p)) S.kingAt.delete(p);
    remember(c, S.turn, `My men were beaten in ${this.map.get(x).name}, and I got away with them to ${this.map.get(to).name}.`);
    logEvent(S, "king-battle", `${c.name}, king of ${p}, got away from the battle in ${this.map.get(x).name}.`, [p], "king-away");
    notify(S, p, "Battle", "You got away", `Your men were beaten in ${this.map.get(x).name}, where you stood; you got away with them to ${this.map.get(to).name}, and your orders go out from there.`);
  }
};

P.kingsHeld = function () {
  const S = this.s;
  // A king back at his court before word of his loss came: it knows where he is.
  for (const p of [...S.kingHeard.keys()]) {
    const k = findCharacter(S, S.reigns.get(p).character);
    if (k !== null && k.status === "Employed" && k.duty === "Ruling" && k.at === p) S.kingHeard.delete(p);
  }
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
  // Part C2: the last king of a realm that has fallen: word of his death goes to its refugees where it fell, and his heir
  // lives on in exile when it comes (`kingDeadHeard`).
  const fallen = p === null ? fallenRealmOf(S, c.id) : null;
  if (fallen !== null) this.kingDeadWord(fallen, where, this.fallOf(fallen)?.capital ?? this.map.capital(fallen).id, `${c.name}, once ${rulerStyle(fallen)} of ${powerName(fallen)}, is dead, ${how}.`);
  if (p === null) return;
  const r = S.reigns.get(p);
  // Part D: what he held when he died is his realm, as it stood then.
  c.diedWith = Math.round(Math.max(0, this.strength(p)));
  // His reign, and his player's game, end where he dies; his road ends with him. Apart from his court, it believes him
  // where he was until the word comes.
  S.kingRoads = S.kingRoads.filter((x) => !(x.power === p && x.alone));
  S.reignsEnded.push({ power: p, character: c.id, since: r.since, until: S.turn, how });
  logEvent(S, "king-dies", `${c.name}, king of ${p}, died ${how}.`, [], "king-dies");
  // His court learns of it as word comes from where he died (at once, if he died there), and his heir reigns from then.
  const seat = this.courtAt(p);
  const text = `${c.name}, ${rulerStyle(p)} of ${powerName(p)}, is dead, ${how}.`;
  if (where === seat) {
    S.kingAt.delete(p);
    this.heirReigns(p, text);
    return;
  }
  if (S.kingAt.has(p)) S.kingHeard.set(p, S.kingAt.get(p));
  S.kingAt.delete(p);
  this.kingDeadWord(p, where, seat, text);
};

P.kingDeadWord = function (p, from, seat, text) {
  const S = this.s;
  S.journeys.push(newJourney({ id: newId(S, "j"), kind: "Word", departTurn: S.turn, arriveTurn: S.turn + this.travelTurnsBetween(from, seat), from: p, to: p, news: "KingDead", text, toProvince: seat }));
};

P.kingDeadHeard = function (j) {
  const S = this.s;
  const p = j.to;
  const seat = this.courtAt(p);
  // Part C2: a court that has moved since he died has the word sent on from where it was.
  if (isAlive(S, p) && j.toProvince !== null && j.toProvince !== seat) {
    this.kingDeadWord(p, j.toProvince, seat, j.text ?? "");
    return;
  }
  // The word has come: it no longer believes him afield.
  S.kingHeard.delete(p);
  this.heirReigns(p, j.text ?? "");
};

P.heirReigns = function (p, text) {
  const S = this.s;
  const r = S.reigns.get(p);
  const dead = findCharacter(S, r.character);
  if (dead === null || dead.status !== "Dead") return;
  // Part C2: the realm fell before the word came: its heir lives on in exile, unless it was given away by sealed tablet.
  if (!isAlive(S, p)) {
    if ((this.fallOf(p)?.land.length ?? 0) === 0) exileHeir(this, p, dead);
    return;
  }
  // Its seat wakes as the word comes: a death concerns it, and a human player's heir is played by a script from now.
  this.endSleep(p, "the king is dead");
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

/** The next heir as the record or the draw gives him: his place on the line, his traits, his name, what is known of him, and the man of the record already on the map, if he is. */
function nextHeir(e: TurnEngine, p: Power, dead: Character, was: Reign): { at: number; traits: number[]; name: string; about: string; there: Character | null } {
  const S = e.s;
  const rng = e.r("heir", p);
  const line = Lines[p]?.heirs ?? [];
  // The next name on the record whose man is not already dead or held; past it, a son or brother drawn as facts.
  let at = was.line + 1;
  const living = (h: Heir): Character | null | undefined => {
    // The man of the record himself: one of the sources' people on the map by that name, never a namesake who reigns elsewhere.
    const c = h.name === null ? undefined : S.characters.find((x) => x.name === h.name && x.attested && realmOfKing(S, x.id) === null);
    if (c === undefined) return null;
    // He must be free to come: standing at a court with no errand, post or road of his own, and held by nobody. One dead,
    // held, detained or away on a mission is passed by, so nothing he carries or keeps is lost.
    return c.status !== "Dead" && c.status !== "Captured" && c.heldBy === null && c.duty === "None" && c.errand === null && c.at !== null ? c : undefined;
  };
  while (at < line.length && living(line[at]) === undefined) at++;
  const h: Heir | null = at < line.length ? line[at] : null;
  const kin = h?.kin ?? (rng.chance(HeirData.son / 100) ? "son" : "brother");
  const traits = KingTraitValues.map((k) => clamp((h?.traits?.[k] ?? 50 + rng.range(-HeirData.spread, HeirData.spread)) + rng.range(-ReignData.vary, ReignData.vary), 0, 100));
  const name = h?.name ?? drawnName(e, p, rng);
  const kinLine = kin.startsWith("of ") ? `Followed ${dead.name}, ${kin}.` : kin.startsWith("a ") || kin.startsWith("an ") || kin.startsWith("the ") ? `${upper(kin)}, who followed ${dead.name}.` : `${upper(kin)} of ${dead.name}.`;
  const about = h === null || h.about === "" ? kinLine : `${kinLine} ${h.about}`;
  // A man of the record already on the map is the heir himself, wherever he is.
  const there = h !== null ? (living(h) ?? null) : null;
  return { at, traits, name, about, there };
}

/** The heir's reign as the record or the draw gives him (`nextHeir`). */
function raiseHeir(e: TurnEngine, p: Power, dead: Character, was: Reign): Character {
  const S = e.s;
  const { at, traits, name, about, there } = nextHeir(e, p, dead, was);
  // A man of the record already on the map takes the throne himself, from wherever he is.
  if (there !== null) crownPerson(e, there, p, about);
  const c = there ?? newKing(e, p, name, traits, [about]);
  S.reigns.set(p, { traits, since: S.turn, character: c.id, name: c.name, about, line: at, exiled: false });
  // Part D: his growth, and his score, are measured from what he inherited.
  S.startStrength.set(p, e.strength(p));
  setCrowned(crownedIn(S));
  e.syncNames();
  remember(c, S.turn, `${dead.name} is dead, and I reign over ${land(p)}.`);
  return c;
}


/**
 * Part C2 ("A realm holds by its ledger": "abroad, and he is an exile with a claim"): the last king of a fallen realm is
 * dead, and its heir, by the record or drawn, lives on among its refugees abroad, at the court nearest where it fell, a free
 * man with a claim to its throne that any king may take up, as Suppiluliuma put Shattiwaza on his father's throne of
 * Mitanni (`docs/history/14-courts-and-free-cities.md`, "Shattiwaza"). He reigns over nothing; the record goes on through him if he dies too.
 */
function exileHeir(e: TurnEngine, p: Power, dead: Character): void {
  const S = e.s;
  const was = S.reigns.get(p);
  const { at, traits, name, about, there } = nextHeir(e, p, dead, was);
  const fell = e.fallOf(p)?.capital ?? e.map.capital(p).id;
  const host = sortBy(alive(S), [(q: Power) => e.travelTurnsBetween(fell, e.courtAt(q)), cmpNum], [(q: Power) => AllPowers.indexOf(q), cmpNum])[0] ?? null;
  const news = `${dead.name} is dead, and ${land(p)} has fallen: I am the heir of its kings, in exile.`;
  let c = there;
  if (c === null) {
    c = newCharacter({ id: newId(S, "c"), name: S.characters.some((x) => x.name === name) ? `${name} of ${land(p)}` : name, origin: e.map.get(fell).name, calling: `heir of ${land(p)}, in exile`, traits: newTraits(personTraits(traits)) });
    c.status = "Free";
    c.at = null;
    c.seeking = true;
    drawSkills(S.seed, c);
    chooseStrategy(c);
    c.persona = personaTemplate(c);
    S.characters.push(c);
    // He sets out among its refugees from where it fell, as a free man walks to a court (C2's design check).
    if (host !== null) e.startTravel(c, host, null, fell);
    // A new man, he carries his claim from where it fell: whoever meets him on the road or at a court hears it from him.
    claimHis(e, c, p, about, news, "Public");
  } else {
    // A man of the record already elsewhere learns it as word from where it fell reaches him (`heirClaimHeard`); till
    // then neither he nor those who know him know of it (Codex's third round, the design escalation).
    const to = c.at ?? host;
    if (to !== null) S.journeys.push(newJourney({ id: newId(S, "j"), kind: "Word", departTurn: S.turn, arriveTurn: S.turn + e.travelTurnsBetween(fell, e.courtAt(to)), from: p, to, news: "HeirClaim", text: news, characterId: c.id, toProvince: e.courtAt(to) }));
  }
  S.reigns.set(p, { ...was, traits, character: c.id, name: c.name, about, line: at, exiled: true });
  logEvent(S, "king-exile", `${c.name}, heir of ${land(p)}, lives on in exile.`, [], "king-exile");
}

/**
 * Part C2: an heir in exile's claim, his own from now: facts of it and of who he is, and the memory of the news. A new man
 * carries them in the open from where his realm fell; a man of the record already known elsewhere keeps them hidden, and a
 * court learns his claim where he stands (`claimKnown`), so word of it never runs ahead of him.
 */
function claimHis(e: TurnEngine, c: Character, p: Power, about: string, news: string, secrecy: "Public" | "Hidden"): void {
  const S = e.s;
  const knownBy = secrecy === "Public" || c.at === null ? [] : [c.at];
  c.facts.push(newFact({ id: newId(S, "f"), text: `Heir of the kings of ${land(p)}, in exile; claims its throne.`, secrecy, tag: "claim", knownBy }));
  c.facts.push(newFact({ id: newId(S, "f"), text: about, secrecy, tag: "claim", knownBy: [...knownBy] }));
  remember(c, S.turn, news);
}

P.heirClaimHeard = function (j) {
  const S = this.s;
  const c = findCharacter(S, j.characterId ?? "");
  const p = j.from;
  // Dead, or no longer its heir (made king again, or dead and followed), by the time the word comes: it is moot.
  if (c === null || c.status === "Dead" || S.reigns.get(p).character !== c.id || fallenRealmOf(S, c.id) !== p) return;
  // The word must find him where he is: at a court standing where it came, else it follows him there; on the road, to
  // where he is going; nowhere to be found (held, or away on some errand), it waits a season and tries again.
  const at = c.at ?? S.journeys.find((x) => x.kind === "Travel" && x.characterId === c.id)?.to ?? null;
  const from = j.toProvince ?? this.courtAt(j.to);
  // Among a fallen court's people the fall is no news; and word that has sought him a year of seasons reaches him at last.
  const found = c.at !== null && (!isAlive(S, c.at) || this.courtAt(c.at) === from);
  if (found || j.gold >= HeirWordTries) {
    claimHis(this, c, p, S.reigns.get(p).about, j.text ?? "", "Hidden");
    return;
  }
  const to = at !== null && isAlive(S, at) ? at : null;
  const arrive = S.turn + (to === null ? 1 : Math.max(1, this.travelTurnsBetween(from, this.courtAt(to))));
  S.journeys.push(newJourney({ id: newId(S, "j"), kind: "Word", departTurn: S.turn, arriveTurn: arrive, from: p, to: to ?? j.to, news: "HeirClaim", text: j.text, characterId: c.id, toProvince: to === null ? from : this.courtAt(to), gold: j.gold + 1 }));
};

/** Part C2: how many times word of a record heir's claim seeks him before it reaches him wherever he is (a first guess). */
const HeirWordTries = 4;

/** One already on the map comes to the throne: his service, errands and roads end, and he is at his court. */
function crownPerson(e: TurnEngine, c: Character, p: Power, about: string): void {
  const S = e.s;
  const seat = e.courtAt(p);
  const where = e.courtAt(c.at!);
  c.employer = p;
  c.status = "Employed";
  c.contract = null;
  c.duty = "Ruling";
  c.seeking = false;
  c.calling = `${rulerStyle(p)} of ${land(p)}`;
  for (const text of [`Rules ${land(p)} from ${e.map.get(seat).name}.`, about]) c.facts.push(newFact({ id: newId(S, "f"), text, secrecy: "Public", tag: "origin" }));
  // He reigns from the court where he stands, and walks to his own like any traveller.
  if (where === seat) c.at = p;
  else e.kingGoesHome(c, p, where);
}
