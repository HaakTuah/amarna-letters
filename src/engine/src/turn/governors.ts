/**
 * Governors (build order item 13, "Governors" under "Ruling by mandate"): what commanders are to armies, governors are to
 * land. The king grants a person at his court a province's authority under a mandate; the man travels there and governs
 * from the season he arrives. A governor raises levies on the spot when foreign troops stand in or next to his province,
 * up to what his mandate allows, without waiting for the king's order to travel; and the province's yield passes through
 * his hands, so he may keep some of it, by his greed and disloyalty. A privilege, not a job: no fee. The king takes the
 * grant back by sending word; a disloyal, ambitious governor refuses and turns with the levies he raised.
 */
import { listed } from "../rules/wording.ts";
import { idiv } from "../core/num.ts";
import { cmpNum, cmpStr, sortBy } from "../core/seq.ts";
import { governorsKnown, newGovernor, newGovernorGone, seatKnown, seatOf, type Governor } from "../model/command.ts";
import { raise } from "../model/order-makers.ts";
import { type GovernOrder, type UnseatOrder } from "../model/orders.ts";
import { gain, remember, type Character } from "../model/people.ts";
import { type Power, powerName } from "../model/power.ts";
import { findCharacter, isAlive, logEvent, notify, unitAt } from "../model/state.ts";
import { type Unit, loseUnit } from "../model/units.ts";
import { courierSeasons, wordFromKing } from "../rules/court.ts";
import { TurnEngine } from "./core.ts";

declare module "./core.ts" {
  interface TurnEngine {
    grantGovernorship(p: Power, o: GovernOrder): void;
    unseatGovernor(p: Power, o: UnseatOrder): void;
    /** The governor in a province now (arrived, not gone), and his grant, or null. */
    governorOf(province: string): [Governor, Character] | null;
    /** As a season begins: word of recalls reaches governors; governors whose province is lost go home; arrivals. */
    governorsSeason(): void;
    /** After the season's levies: each governor raises his own where foreign troops threaten his province. */
    governorsLevy(): void;
    /** What a governor keeps of gold his province yields to its king (passing through his hands): returns what is left. */
    throughGovernor(province: string, gold: number): number;
    /** A governorship ends: gone from the game, kept in its king's view until word of the end reaches his court. */
    dropGovernor(g: Governor): void;
  }
}

const P = TurnEngine.prototype;

P.grantGovernorship = function (p, o) {
  const S = this.s;
  const c = findCharacter(S, o.character);
  // Granted as the court knows the land (bug #467): to a province lost out of its sight he sets out all the same, finds it
  // another's, and comes home as any governor of lost land does (governorsSeason).
  if (c === null) return;
  // Item 17++: a governor already holding provinces of ours takes this one beside them from his seat: the word reaches him
  // there, and his word reaches the province from there.
  // As the court knows him (hidden information): a governor gone from his post before word of it came is not set out
  // anew; the grant fails where he was, and the road brings that home.
  const held = governorsKnown(S, S.turn).find((g) => g.character === c.id && g.power === p && g.relieved === null);
  const gone = governorsKnown(S, S.turn).find((g) => g.character === c.id && g.power === p && !S.governors.includes(g));
  if ((held !== undefined && !S.governors.includes(held)) || (held === undefined && c.at !== p)) {
    const where = held ?? gone;
    if (where !== undefined) this.tell(p, seatKnown(where, S.turn), "Rejected", "Governorship not given", `${c.name} could not take the governorship of ${this.map.get(o.province).name}: he no longer governs for you.`);
    else notify(S, p, "Rejected", "Governorship not given", `${c.name} could not take the governorship of ${this.map.get(o.province).name}: he is not at your court.`);
    return;
  }
  if (held !== undefined) {
    // The word goes to the seat his king knows him in, and on to where he sits; the court is shown that seat until word
    // of the move comes (hidden information).
    const seat = seatOf(held);
    const knownSeat = seatKnown(held, S.turn);
    const toSeat = wordFromKing(S, this.map, p, knownSeat);
    const forward = knownSeat === seat ? 0 : courierSeasons(S, this.map, knownSeat, seat);
    const onward = courierSeasons(S, this.map, seat, o.province);
    const from = S.turn + Math.max(1, (Number.isFinite(toSeat) ? toSeat : 1) + (Number.isFinite(forward) ? forward : 1) + (Number.isFinite(onward) ? onward : 1));
    S.governors.push(newGovernor({ province: o.province, seat, seatWas: held.seatWas, seatHeard: held.seatHeard, character: c.id, power: p, levies: o.levies, from }));
    remember(c, S.turn, `The king of ${p} gave me the governorship of ${this.map.get(o.province).name} too, from my seat at ${this.map.get(seat).name}.`);
    notify(S, p, "Resolution", "Governorship granted", `${c.name} governs ${this.map.get(o.province).name} too, from his seat at ${this.map.get(knownSeat).name}, from turn ${from}${o.levies > 0 ? `, free to raise up to ${o.levies} levies there if foreign troops threaten it` : ""}.`, c.id);
    logEvent(S, "govern", `${p} gave ${c.name} the governorship of ${this.map.get(o.province).name} too, from his seat at ${this.map.get(knownSeat).name}.`, [p], "govern-region");
    logEvent(S, "governor", `${p} granted ${c.name} the governorship of ${this.map.get(o.province).name} beside his own.`, [p], "governor");
    return;
  }
  // He sets out from the court, wherever the king is (item 17b, part C).
  const seasons = this.fromCourt(p, o.province);
  const from = S.turn + Math.max(1, Number.isFinite(seasons) ? seasons : 1);
  S.governors.push(newGovernor({ province: o.province, seat: o.province, character: c.id, power: p, levies: o.levies, from }));
  c.duty = "Governing";
  c.at = null;
  c.grantedBy = p;
  c.watchProvince = o.province;
  remember(c, S.turn, `The king of ${p} granted me the governorship of ${this.map.get(o.province).name}.`);
  notify(S, p, "Resolution", "Governorship granted", `${c.name} set out to govern ${this.map.get(o.province).name}, and governs it from turn ${from}${o.levies > 0 ? `, free to raise up to ${o.levies} levies there if foreign troops threaten it` : ""}.`, c.id);
  logEvent(S, "governor", `${p} granted ${c.name} the governorship of ${this.map.get(o.province).name}.`, [p], "governor");
};

P.unseatGovernor = function (p, o) {
  const S = this.s;
  // As the court knows it (hidden information): word to a governorship already ended goes all the same, and is lost.
  const g = governorsKnown(S, S.turn).find((x) => x.province === o.province && x.power === p && x.relieved === null);
  if (g === undefined) return;
  // The word goes to him where he sits (item 17++).
  const seasons = wordFromKing(S, this.map, p, seatKnown(g, S.turn));
  g.relieved = S.turn + Math.max(1, Number.isFinite(seasons) ? seasons : 1);
  notify(S, p, "Resolution", "Governorship taken back", `Your word taking back the governorship of ${this.map.get(o.province).name} is on its way to ${findCharacter(S, g.character)?.name ?? "your governor"}, and reaches him in turn ${g.relieved}.`);
};

P.governorOf = function (province) {
  const S = this.s;
  const g = S.governors.find((x) => x.province === province && S.turn >= x.from) ?? null;
  if (g === null) return null;
  const c = findCharacter(S, g.character);
  return c !== null && c.status !== "Dead" && c.duty === "Governing" ? [g, c] : null;
};

P.dropGovernor = function (g) {
  const S = this.s;
  S.governors = S.governors.filter((x) => x !== g);
  // Until the season word of the end can be read at his court, as `tell` carries it.
  const until = this.heardAt(g.power, g.province);
  if (isAlive(S, g.power) && until > S.turn) S.governorsGone.push(newGovernorGone({ governor: g, until }));
};

/**
 * A governor of several whose seat's province is no longer his (lost, or given up) takes up his seat in the first he keeps.
 * His king knows him in the old seat until word of the move, setting out with word of the province, is read at his court.
 */
function reseat(e: TurnEngine, c: Character, kept: Governor[], was: string): void {
  if (kept.length === 0 || kept.some((x) => x.province === was)) return;
  const seat = sortBy([...kept], [(x: Governor) => x.province, cmpStr])[0].province;
  const heard = e.heardAt(kept[0].power, was);
  for (const x of kept) {
    x.seatWas = seatKnown(x, e.s.turn);
    x.seatHeard = Math.max(x.seatHeard, heard);
    x.seat = seat;
  }
  c.watchProvince = seat;
}

P.governorsSeason = function () {
  const S = this.s;
  S.governorsGone = S.governorsGone.filter((x) => x.until > S.turn && isAlive(S, x.governor.power));
  for (const g of sortBy([...S.governors], [(x: Governor) => x.province, cmpStr])) {
    const c = findCharacter(S, g.character);
    const gone = c === null || c.status === "Dead" || c.duty !== "Governing";
    // His province lost to another, or his king fallen: the grant is over, and he walks home if he has one.
    const lost = S.owner.getOrDefault(g.province, null) !== g.power;
    if (gone || lost) {
      this.dropGovernor(g);
      // A governor of several keeps the rest (item 17++); his seat lost, he takes it up in the first of those he keeps.
      const kept = gone || c === null ? [] : S.governors.filter((x) => x.character === c.id);
      if (!gone && c !== null && kept.length === 0) this.leaveCommand(c, seatOf(g));
      else if (c !== null) reseat(this, c, kept, seatOf(g));
      continue;
    }
    if (g.relieved === null || S.turn < g.relieved) continue;
    // Word of his recall reaches him: he steps down, or, disloyal and ambitious, turns with the levies he raised and rules
    // the province in his own name (item 17, the new Idrimi), unless other troops of his king's stand there.
    const t = c!.traits;
    const disloyal = t.loyalty < 30 && t.ambition > 60;
    // Item 17++: his levies follow him as far as their ledger stands with him, and each province he holds only if its people
    // would (a governor of several turns with those of them whose ledger stands better with him than with his king).
    const held = sortBy(
      S.governors.filter((x) => x.character === g.character && x.power === g.power && S.owner.getOrDefault(x.province, null) === g.power),
      [(x: Governor) => (x.province === seatOf(g) ? 0 : 1), cmpNum],
      [(x: Governor) => x.province, cmpStr],
    );
    const levies: Unit[] = [];
    const going: string[] = [];
    for (const x of disloyal ? held : []) {
      const turns = this.turnsWith(x.province, c!);
      levies.push(...turns.levies);
      const others = S.units.some((u) => u.power === g.power && u.province === x.province && !turns.levies.includes(u));
      // In the city where his king holds court he cannot make it his own (a coup is not modelled).
      if (turns.province && !others && this.courtAt(g.power) !== x.province) going.push(x.province);
    }
    this.dropGovernor(g);
    if (disloyal && going.length === 0 && levies.length > 0) {
      // He turns with his levies as a band, as before item 17. A governor of several (item 17++): the levies of his that
      // stand with him join it; those that follow him elsewhere leave the king's service where they stand, loose men, since
      // they cannot reach him.
      const u = levies[0];
      for (const o of levies.slice(1)) {
        loseUnit(S, o);
        S.armies.delete(o.id);
        if (o.province === u.province) {
          u.men += o.men;
          u.food += o.food;
        } else this.peopleOf(o.province).loose += o.men;
      }
      // His other governorships end with his turning.
      for (const x of S.governors.filter((y) => y.character === c!.id)) this.dropGovernor(x);
      this.tell(g.power, g.province, "Battle", "A governor turns", `${c!.name} refused to give up the governorship of ${this.map.get(g.province).name}, and turned with the ${u.men} men he raised there.`);
      logEvent(S, "defect", `${c!.name} refused his recall by ${g.power} and turned with the levies of ${this.map.get(g.province).name}.`, [g.power], "defect");
      this.armyToBand(u, c!, "commander");
      continue;
    }
    if (disloyal && going.length > 0) {
      const name = this.map.get(g.province).name;
      const lands = going.map((x) => this.map.get(x).name);
      const men = levies.reduce((a, u) => a + u.men, 0);
      this.tell(g.power, g.province, "Battle", "A governor turns", `${c!.name} refused to give up the governorship of ${name}, and turned${men > 0 ? ` with the ${men} men he raised` : ""}: he rules ${lands.join(", ")} in his own name now.`);
      logEvent(S, "defect", `${c!.name} refused his recall by ${g.power} and turned${men > 0 ? " with the levies" : ""} of ${lands.join(", ")}.`, [g.power], "defect");
      const own = this.ruleOwn(going[0], c!, {
        how: "turned",
        from: g.power,
        followers: levies,
        gold: 0,
        rising: levies.length === 0,
        story: `Word came that the king of ${powerName(g.power)} takes back your governorship of ${name}; you refused it.`,
        memory: `The king of ${g.power} took back my governorship of ${name}, and I refused it.`,
        line: `${c!.name}, governor of ${listed(lands)} for ${powerName(g.power)}, refused his recall and rules in his own name`,
      });
      // The rest of his provinces that would follow him go with him, ruled from the first, their people's regard for him his realm's.
      for (const x of going.slice(1)) this.joinRealm(x, c!, own);
      // His realm starts with all of it: growth is reckoned from there.
      S.startStrength.set(own, this.strength(own));
      continue;
    }
    remember(c!, S.turn, `I gave up the governorship of ${this.map.get(g.province).name}, as the king of ${g.power} ordered.`);
    const rest = S.governors.some((x) => x.character === c!.id);
    reseat(this, c!, S.governors.filter((x) => x.character === c!.id), seatOf(g));
    this.tell(g.power, g.province, "Resolution", "Governorship given up", `${c!.name} gave up the governorship of ${this.map.get(g.province).name}${rest ? ", and governs the rest from his seat" : " and is on the road to your court"}.`);
    if (!rest) this.leaveCommand(c!, seatOf(g));
  }
};

/** Seasons by courier, a road that cannot be travelled counting as none (the levy then answers what stands now). */
const seasonsOf = (n: number): number => (Number.isFinite(n) ? n : 0);

P.governorsLevy = function () {
  const S = this.s;
  for (const g of sortBy([...S.governors], [(x: Governor) => x.province, cmpStr])) {
    if (g.raised >= g.levies || this.governorOf(g.province) === null) continue;
    if (S.owner.getOrDefault(g.province, null) !== g.power || unitAt(S, g.province) !== null) continue;
    const near = [g.province, ...this.map.neighbors(g.province)];
    // Item 17++: a governor of several acts from his seat: word of a threat to a far province of his reaches him late, and
    // his levy order goes back by the same road, so he raises now against the troops as they stood that many seasons ago.
    const seat = seatOf(g);
    const lag = seat === g.province ? 0 : seasonsOf(courierSeasons(S, this.map, g.province, seat)) + seasonsOf(courierSeasons(S, this.map, seat, g.province));
    const placeThen = (u: Unit): string => (lag === 0 || u.trail.length === 0 ? u.province : u.trail[Math.max(0, u.trail.length - 1 - lag)].split("|")[0]);
    const threat = S.units.some((u) => u.power !== g.power && u.kind === "Army" && near.includes(placeThen(u)));
    if (!threat) continue;
    const before = S.units.length;
    this.raise(g.power, raise(g.province, "Army"));
    if (S.units.length > before) {
      g.raised++;
      const c = findCharacter(S, g.character)!;
      this.tell(g.power, g.province, "Resolution", "A governor's levy", `${c.name}, your governor of ${this.map.get(g.province).name}, raised a levy there on his own against the foreign troops beside it, as his mandate allows: ${g.raised} of the ${g.levies} he may raise.`);
    }
  }
};

P.throughGovernor = function (province, gold) {
  const found = this.governorOf(province);
  if (found === null || gold <= 0) return gold;
  const [g, c] = found;
  // First guess: he keeps his greed times his disloyalty, in ten-thousandths, of what passes through his hands (at most half).
  const kept = idiv(gold * c.traits.greed * (100 - c.traits.loyalty), 20000);
  if (kept <= 0) return gold;
  g.skimmed += kept;
  gain(c, kept, "Skimmed");
  return gold - kept;
};
