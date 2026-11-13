/**
 * A realm's fall (`fall`, `capitalsTaken`), and what remains of a fallen kingdom: it hears of its fall as the news arrives
 * (the owner's answers to item 13's review, item 13+). Since item 17b, part B, only a realm that holds nothing falls, so no land is left to come apart: its armies hear
 * the word where they stand, carried by road from where it fell like any news, and are then their commanders' to decide,
 * as item 13 built; its governors and commanders are their own men once their army has heard. Gold still on its way to it
 * goes to whoever holds the city where it fell.
 */
import { idiv } from "../core/num.ts";
import { cmpNum, cmpStr, sortBy } from "../core/seq.ts";
import { BandData } from "../model/bands.ts";
import { AllPowers, king, land, powerName, type Power } from "../model/power.ts";
import { alive, findCharacter, isAlive, logEvent, newKingdomFall, notify, ownedBy, type KingdomFall } from "../model/state.ts";
import { type Unit, loseUnit } from "../model/units.ts";
import { KingdomFallsTitle, TurnEngine, travelTurns } from "./core.ts";
import { removeAll } from "./resolve.ts";
import { endSieges } from "../model/sieges-ended.ts";
import { shift } from "./people.ts";
import { listed, upper } from "../rules/wording.ts";
import { Views } from "../rules/views.ts";
import { chooseStrategy } from "../rules/strategy.ts";

declare module "./core.ts" {
  interface TurnEngine {
    /** Each season after the falls: the armies of fallen kingdoms that word of the fall has reached are on their own. */
    fallsSpread(): void;
    /** A fallen kingdom's unit, once word of the fall reaches it: its commander's, a captain's, or disbanded (item 13). */
    fallenUnit(u: Unit, p: Power): void;
    /** A power's fall, or null while it stands. */
    fallOf(p: Power): KingdomFall | null;
    /**
     * Gold that comes into a power's hands where it holds land: its treasury's, or, for a fallen kingdom whose land the
     * word has not reached, whoever holds its fallen capital's; with nobody there, the province's people's. `income`:
     * counted in the season's income.
     */
    credit(p: Power, gold: number, province: string, income?: boolean): void;
    capitalsTaken(): void;
    /**
     * A realm's fall: since item 17b, part B, one that holds nothing after the moves, `conqueror` holding its last city; or,
     * `ceded`, one whose king ceded his capital by agreement (item 11d), its land passing whole to `conqueror`.
     */
    fall(p: Power, conqueror: Power | null, ceded?: boolean): void;
  }
}

const P = TurnEngine.prototype;

/**
 * The season word of a kingdom's fall reaches a province: from its capital, by road, at the pace word of it reaches
 * foreign courts (`word`), as any news travels.
 */
function wordArrives(e: TurnEngine, f: KingdomFall, province: string): number {
  const t = travelTurns(e.s.config, e.map, f.capital, province, f.turn);
  return f.turn + (Number.isFinite(t) ? t : 0);
}

P.fallsSpread = function () {
  const S = this.s;
  for (const f of S.falls) {
    if (isAlive(S, f.power)) continue;
    const p = f.power;
    const units = S.units.filter((u) => u.power === p);
    if (units.length === 0 && !S.characters.some((c) => c.employer === p)) continue;
    // The armies hear it where they stand.
    for (const u of sortBy(units, [(u: Unit) => u.id, cmpStr])) {
      if (!S.units.includes(u) || u.power !== p) continue;
      if (S.turn < wordArrives(this, f, u.province)) continue;
      this.fallenUnit(u, p);
    }
    // His governors and commanders are their own men once their province or army has heard it.
    for (const c of S.characters.filter((c) => c.employer === p)) {
      const post = c.duty === "Governing" ? S.governors.find((g) => g.character === c.id && S.owner.getOrDefault(g.province, null) === p) : c.duty === "Commanding" ? S.units.find((u) => u.commander === c.id && u.power === p) : undefined;
      if (post !== undefined) continue;
      c.formerEmployer = p;
      c.employer = null;
      c.contract = null;
      if (c.status === "Employed") c.status = "Free";
    }
  }
};

P.fallOf = function (p) {
  return [...this.s.falls].reverse().find((f) => f.power === p) ?? null;
};

P.credit = function (p, gold, province, income = true) {
  const S = this.s;
  if (gold <= 0) return;
  const fall = isAlive(S, p) ? null : this.fallOf(p);
  const to = fall === null ? p : S.owner.getOrDefault(fall.capital, null);
  if (to === null || !isAlive(S, to)) {
    this.spendAt(province, gold);
    return;
  }
  // #587: gold taken in a far province of his goes into its coffer, as its own gold does.
  this.receiveAt(to, province, gold, income);
};

P.fallenUnit = function (u, p) {
  const S = this.s;
  const c = this.commanderOf(u);
  if (c !== null) {
    this.armyToBand(u, c, "commander");
    return;
  }
  const ranks = this.r("captain", `${p}|${u.id}`);
  const land_ = this.map.get(u.province).isSea ? (this.map.landProvinces.find((x) => x.waters === u.province)?.id ?? null) : u.province;
  if (u.kind === "Army" && land_ !== null && u.men >= BandData.least && (u.unpaid > 0 || u.hungry > 0) && ranks.chance(Math.min(100, BandData.mutinyHead + idiv(u.men, 500)) / 100)) {
    loseUnit(S, u);
    this.headRises(land_, u.men, "captain", ranks, p);
    S.loot.set(land_, S.loot.getOrDefault(land_, 0) + u.savings);
    return;
  }
  this.disbandUnit(u);
};

/**
 * Item 17b, part B: a king taken where he stands, or stopped on the road, is his taker's captive, or dies in a city's fall
 * (part C), and a court lost flees to the nearest city its realm still holds (`TurnEngine.kingTaken`, `courtFlees`); only a
 * realm that holds nothing falls.
 */
P.capitalsTaken = function () {
  const S = this.s;
  const taken = this.kingsTaken();
  const lost = this.courtsLost();
  for (const p of alive(S).filter((x) => taken.has(x))) this.kingTaken(p, taken.get(p)!.by, taken.get(p)!.city);
  for (const p of alive(S).filter((x) => lost.has(x))) this.courtFlees(p, lost.get(p)!.by, lost.get(p)!.road);
  // A realm left holding nothing falls, wherever its king is (one whose court stood abroad among them).
  for (const p of alive(S).filter((x) => ownedBy(S, x).length === 0)) this.fall(p, S.owner.getOrDefault(this.courtAt(p), null));
};

P.fall = function (p, conqueror, ceded = false) {
  const S = this.s;
  // Item 13: the capital is wherever the king was.
  const capital = this.map.get(this.courtAt(p));
  // A capital ceded by sealed tablet (item 11d) passes whole with its land, as agreed; a realm taken holds nothing.
  const passed = ceded ? ownedBy(S, p) : [];
  for (const id of passed) {
    this.setOwner(id, conqueror);
    // A siege the conqueror pressed against land that is now his is over.
    if (conqueror !== null) endSieges(S, this.map, (x) => x.province === id && x.power === conqueror);
  }
  S.falls.push(newKingdomFall({ power: p, turn: S.turn, conqueror, capital: capital.id, land: passed }));
  S.eliminated.push(p);
  // A fallen court claims no name (item 17+).
  this.syncNames();
  this.endSleep(p);
  // Its court's journey and its couriers on the road end with it; its king stands apart from no court (below).
  S.kingRoads = S.kingRoads.filter((r) => r.power !== p);
  S.couriers = S.couriers.filter((x) => x.power !== p);
  // Item 13: its armies in the field are their commanders' to decide once word of the fall reaches them (item 13+,
  // fallsSpread); a kingdom ceded whole disbands its troops at once.
  if (ceded) for (const u of sortBy(S.units.filter((u) => u.power === p), [(u: Unit) => u.id, cmpStr])) this.disbandUnit(u);
  // Item 11b: its court's refugees at the fallen capital may raise a head of their own, carrying its tongue ("A fallen
  // court's people"): the loose there, or, with too few, the townsfolk who fled their homes.
  const heads = this.r("refugees", p);
  if (heads.chance(BandData.refugeesHead / 100)) {
    const x = this.peopleOf(capital.id);
    const men = Math.min(BandData.startMost, Math.max(BandData.least, idiv(x.loose * BandData.startShare, 100)));
    if (x.loose >= men) {
      x.loose -= men;
      this.looseLeave(capital.id, 0);
    } else shift(x, -Math.min(men, x.settled), -Math.min(x.men, idiv(men, 2)));
    this.headRises(capital.id, men, "refugees", heads, p);
  }
  // What a fallen kingdom believed, and what it owed, go with it: fees it owed are lost, and its debts die with it (item 11a).
  for (const c of S.characters) {
    c.covers = removeAll(c.covers, (k) => k.for === p);
    c.owed.delete(p);
  }
  this.debtsDie(p);
  // Nobody is left to hold its prisoners: they are let go, and walk home as if released.
  for (const c of S.characters.filter((c) => c.heldBy === p)) {
    if (c.status === "Captured") this.releaseCaptive(p, c, undefined, `${upper(land(p))} that held me fell, and nobody was left to guard me.`);
    else if (c.duty === "Detained") this.letEnvoyGo(p, c, null);
  }
  // Item 13+: a governor or commander far off serves on until word of the fall reaches him (fallsSpread).
  for (const c of S.characters.filter((c) => c.employer === p && (ceded || (c.duty !== "Governing" && c.duty !== "Commanding")))) {
    c.formerEmployer = p;
    c.employer = null;
    c.contract = null;
    if (c.status === "Employed") c.status = "Free";
    // Its king (item 17b), as a risen power's ruler (item 13+), has fallen with it, and lives on as a free man where he is.
    if (c.duty === "Ruling") c.duty = "None";
  }
  const ruler = findCharacter(S, S.reigns.get(p).character);
  if (ruler !== null && ruler.status !== "Dead") {
    ruler.calling = `former ruler of ${land(p)}`;
    for (const f of ruler.facts) if (f.tag === "origin" && f.text.startsWith("Rules ")) f.text = `Ruled ${f.text.slice("Rules ".length)}`;
    if (ruler.status === "Free") {
      ruler.seeking = true;
      chooseStrategy(ruler);
      // Item 17b, part C: one away from his court stands where he was, and walks to the nearest court still standing.
      const afield = S.kingAt.tryGet(p);
      const host = afield === undefined ? undefined : sortBy(alive(S), [(q: Power) => this.travelTurnsBetween(afield, this.courtAt(q)), cmpNum], [(q: Power) => AllPowers.indexOf(q), cmpNum])[0];
      if (afield !== undefined && host !== undefined) {
        ruler.at = null;
        this.startTravel(ruler, host, null, afield);
      }
    }
  }
  S.kingAt.delete(p);
  S.kingHeard.delete(p);
  const who = ceded ? `its king ceded its capital, ${capital.name}, to ${conqueror}` : conqueror !== null ? `${conqueror} took ${capital.name}, the last it held` : `${capital.name}, the last it held, was lost`;
  // Word of the fall travels (item 7b): a court that sees the capital hears at once, the rest when word reaches them.
  const seeing = alive(S).filter((x) => x === conqueror || Views.sight(S, this.map, x).has(capital.id));
  const parts = ceded && conqueror !== null ? `, and its land passes to ${powerName(conqueror)}` : "";
  logEvent(S, "fall", `The kingdom of ${land(p)} has fallen: ${who}${parts}.`, [p, ...seeing], null);
  const text = ceded
    ? `Word spreads that the king of ${powerName(p)} has ceded his capital, ${capital.name}, to ${powerName(conqueror!)}, and his kingdom is no more.`
    : `Word spreads that ${conqueror !== null ? `${powerName(conqueror)} has taken ${capital.name}` : `${capital.name} has fallen`}, the last land of ${powerName(p)}, and its kingdom is no more.`;
  for (const other of alive(S).filter((x) => x !== conqueror)) {
    if (seeing.includes(other)) {
      S.fallsHeard.set(other, [...(S.fallsHeard.tryGet(other) ?? []), p]);
      this.syncNames();
      notify(S, other, "Rumor", "A kingdom falls", text);
    } else this.word(p, other, "KingdomFalls", text);
  }
  if (conqueror !== null) S.fallsHeard.set(conqueror, [...(S.fallsHeard.tryGet(conqueror) ?? []), p]);
  // The fallen claim nothing, as each court that has heard of the fall knows (item 17+).
  this.syncNames();
  if (conqueror !== null) {
    const rest = passed.filter((x) => x !== capital.id).map((x) => this.map.get(x).name);
    notify(
      S,
      conqueror,
      "Battle",
      KingdomFallsTitle,
      ceded
        ? `${upper(king(p))} has ceded ${capital.name} to you, and with it the kingdom of ${powerName(p)}: his troops have disbanded, and ${rest.length === 0 ? "none of his other land is yours" : `his land is yours: ${listed(rest)}`}.`
        : `With ${capital.name} you took the last land of ${powerName(p)}: the kingdom has fallen, and its armies are their own commanders' or disband as word reaches them.`,
    );
  }
};
