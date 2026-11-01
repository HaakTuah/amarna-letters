/**
 * A ruler of his own (item 13+'s governors' seats, widened in item 17, "How cities become free"): a character comes to rule
 * a province in his own name, as a power risen in play with a seat of its own, like any city-state's ruler. Every way a
 * city becomes free ends here: a fallen kingdom's governor, a governor who turns on his recall with the levies he raised,
 * the man who leads a province's revolt, a chief or a commander who holds land without a ruler long enough (the new
 * Idrimi), and the elder its own people raise in lawless land ("A head rises in time").
 */
import { idiv } from "../core/num.ts";
import { cmpStr, sortBy, sum } from "../core/seq.ts";
import { BandData, type Band } from "../model/bands.ts";
import { forMen, levySize, menAvailable } from "../model/land.ts";
import { remember, spend, type Character } from "../model/people.ts";
import {
  addRisen,
  AllPowers,
  land,
  type Power,
  type RisenPower,
} from "../model/power.ts";
import {
  isAlive,
  logEvent,
  newId,
  newTreasury,
  newUnit,
  notify,
  type Unit,
} from "../model/state.ts";
import { UnrestData } from "../model/unrest.ts";
import { levelOf } from "../model/works.ts";
import { stateOfRealm } from "../rules/realm.ts";
import { kingTongues } from "../rules/tongues.ts";
import { Views } from "../rules/views.ts";
import { TurnEngine } from "./core.ts";

/** How a character came to rule: see `RisenPower.how`. */
export type RiseHow = "governor" | "turned" | "revolt" | "chief" | "elder";

export interface Rising {
  how: RiseHow;
  /** The power the province was part of, or null for land without a ruler. */
  from: Power | null;
  /** Units that follow him if he can pay them a season, each in turn (first guess); they become his. */
  followers: Unit[];
  /** His band, whose men become his army as he comes to rule (a chief's). */
  band?: Band | null;
  /** Gold of the province's people that comes to his treasury besides his purse (an elite's gold). */
  gold: number;
  /** The rising's men, raised from the province's men of fighting age at no price: they rose of their own accord. */
  rising: boolean;
  /** What he reads first: how he came to rule, in a sentence or two, to him ("You ..."). */
  story: string;
  /** The same in his own memory ("I ..."). */
  memory: string;
  /** The line of the record and of the news: "X rules Y in his own name ...". */
  line: string;
}

declare module "./core.ts" {
  interface TurnEngine {
    /** `c` rules `province` in his own name, as a power risen in play with a seat of its own. Returns the new power. */
    ruleOwn(province: string, c: Character, r: Rising): Power;
    /** A band's men become its chief's army as he comes to rule (the new Idrimi). */
    bandToArmy(b: Band, p: Power): Unit | null;
  }
}

const P = TurnEngine.prototype;

/** A risen power's name: its province's, or, if a power already goes by it, with its ruler's. */
function risenName(name: string, ruler: string): string {
  const taken = (x: string): boolean =>
    AllPowers.some(
      (p) =>
        p.toLowerCase() === x.toLowerCase() ||
        land(p).toLowerCase() === x.toLowerCase(),
    );
  if (!taken(name)) return name;
  // His own name without the place it adds when names are shared ("Yapahu of Suhu").
  const withRuler = `${name} of ${ruler.split(" of ")[0]}`;
  if (!taken(withRuler)) return withRuler;
  let n = 2;
  while (taken(`${withRuler} ${n}`)) n++;
  return `${withRuler} ${n}`;
}

P.ruleOwn = function (id, c, r) {
  const S = this.s;
  const prov = this.map.get(id);
  const was = r.from;
  const t = c.traits;
  const risen: RisenPower = {
    power: risenName(prov.name, c.name),
    land: prov.name,
    king: c.name,
    ruler: c.id,
    capital: id,
    turn: S.turn,
    from: was ?? "",
    // His traits as a seat's temper: ambition its appetite for war, fear its caution, loyalty its honesty, greed its greed.
    temper: [t.ambition, 100 - t.courage, t.loyalty, t.greed],
    how: r.how,
  };
  S.risen.push(risen);
  addRisen(risen);
  const p = risen.power;
  // His purse becomes his realm's treasury, with any of the people's gold that comes to him: nothing appears or vanishes.
  S.treasuries.set(p, newTreasury({ gold: spend(c, c.purse) + r.gold }));
  S.inbox.set(p, []);
  S.wallsSeen.set(
    p,
    ((was !== null ? S.wallsSeen.tryGet(was) : undefined) ?? S.walls).clone(),
  );
  S.kingTongues.set(p, kingTongues(p, id));
  S.court.set(p, id);
  S.fallsHeard.set(p, was !== null && !isAlive(S, was) ? [was] : []);
  S.governors = S.governors.filter((x) => x.character !== c.id);
  this.setOwner(id, p);
  c.employer = p;
  c.status = "Employed";
  c.contract = null;
  c.duty = "Ruling";
  c.at = p;
  c.grantedBy = null;
  c.watchProvince = null;
  remember(c, S.turn, `${r.memory} I rule ${prov.name} now, in my own name.`);
  // The troops there follow him if he can pay them a season (first guess); those he cannot hear the news as others do.
  const pay = (u: Unit): number =>
    forMen(
      u.kind === "Army" ? S.config.armyUpkeep : S.config.fleetUpkeep,
      u.kind,
      u.men,
    );
  const followed: Unit[] = [];
  let left = S.treasuries.get(p).gold;
  for (const u of sortBy(r.followers, [(u: Unit) => u.id, cmpStr])) {
    if (left < pay(u)) continue;
    left -= pay(u);
    followed.push(u);
  }
  for (const u of followed) {
    u.power = p;
    u.commander = null;
    u.mandate = null;
    S.sieges = S.sieges.filter((x) => x.unitId !== u.id);
  }
  // His band becomes his army.
  if (r.band !== undefined && r.band !== null) {
    const u = this.bandToArmy(r.band, p);
    if (u !== null) followed.push(u);
  }
  // The rising itself: the province's men who rose with him, as many as a levy, where no troops of his stand there yet.
  if (
    r.rising &&
    !followed.some((u) => u.province === id) &&
    !S.units.some((u) => u.province === id)
  ) {
    const men = Math.min(levySize(S, id, "Army"), menAvailable(S, id));
    if (men >= BandData.least && this.levyMen(id, men))
      followed.push(newUnitFor(this, p, id, men));
  }
  // His people's regard for him is his realm's now: he rules in its name (item 17++).
  const book = S.ledger.tryGet(id);
  if (book !== undefined && book.has(c.id)) {
    book.set(p, book.getOrDefault(p, 0) + book.get(c.id));
    book.delete(c.id);
  }
  S.startStrength.set(p, this.strength(p));
  const men = sum(followed, (u) => u.men);
  const troops =
    followed.length === 0
      ? r.followers.length === 0
        ? "no troops stand with you"
        : "the troops there would not follow you, for you cannot pay them"
      : `${men} men follow you${followed.length < r.followers.length ? ", though not all: the rest you could not pay" : ""}`;
  const walls = levelOf(S, "Walls", id);
  notify(
    S,
    p,
    "Notice",
    "You rule in your own name",
    `${r.story} ${prov.name} is yours: you rule it in your own name now, with a seat of your own like any city's ruler${walls > 0 ? `, behind walls of level ${walls}` : ""}. ${troops.charAt(0).toUpperCase() + troops.slice(1)}. Your treasury is ${S.treasuries.get(p).gold} shekels. Nobody owes you anything, and you owe nobody: you may keep silent, or send envoys with whatever terms you like, to become a vassal, to pay to be left alone, or to serve another court${was !== null && isAlive(S, was) ? `; ${was} may come to take it back` : ""}.`,
    c.id,
  );
  notify(
    S,
    p,
    "Notice",
    "The state of the realm",
    stateOfRealm(S, this.map, p),
  );
  const tag = r.how === "governor" ? "risen" : `risen-${r.how}`;
  logEvent(
    S,
    "rise",
    `${r.line}${men > 0 ? `, with ${men} men` : ""}.`,
    [
      p,
      ...AllPowers.filter(
        (x) => x !== p && isAlive(S, x) && Views.sight(S, this.map, x).has(id),
      ),
    ],
    tag,
  );
  // Others hear of it as word travels from his city.
  for (const other of AllPowers.filter(
    (x) => x !== p && isAlive(S, x) && !Views.sight(S, this.map, x).has(id),
  ))
    this.word(
      p,
      other,
      "Realm",
      `Rumor|A new ruler|Word comes that ${r.line}.`,
    );
  return p;
};

/** A unit of `men` men of `province`, standing there, its home. */
function newUnitFor(
  e: TurnEngine,
  p: Power,
  province: string,
  men: number,
): Unit {
  const u = newUnit({
    id: newId(e.s, "u"),
    power: p,
    kind: "Army",
    province,
    home: province,
    men,
  });
  e.s.units.push(u);
  return u;
}

P.bandToArmy = function (b, p) {
  const S = this.s;
  S.bands = S.bands.filter((x) => x !== b);
  if (
    b.men < BandData.least ||
    S.units.some((u) => u.province === b.province)
  ) {
    // Too few to be an army, or another's troops stand there: his men go back to the loose men of the land.
    this.peopleOf(b.province).loose += b.men;
    return null;
  }
  return newUnitFor(this, p, b.province, b.men);
};

/** A share in a hundred of a number, rounded down (for the elite's gold). */
export function shareOf(n: number, percent: number): number {
  return idiv(Math.max(0, n) * percent, 100);
}

/** The elite's gold a new ruler starts with: a share of the province's purse, taken out of it. */
export function eliteGold(e: TurnEngine, province: string): number {
  const m = e.market(province);
  const g = shareOf(m.purse, UnrestData.elitePurse);
  m.purse -= g;
  return g;
}
