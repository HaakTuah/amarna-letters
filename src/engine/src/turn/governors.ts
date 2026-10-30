/**
 * Governors (build order item 13, "Governors" under "Ruling by mandate"): what commanders are to armies, governors are to
 * land. The king grants a person at his court a province's authority under a mandate; the man travels there and governs
 * from the season he arrives. A governor raises levies on the spot when foreign troops stand in or next to his province,
 * up to what his mandate allows, without waiting for the king's order to travel; and the province's yield passes through
 * his hands, so he may keep some of it, by his greed and disloyalty. A privilege, not a job: no fee. The king takes the
 * grant back by sending word; a disloyal, ambitious governor refuses and turns with the levies he raised.
 */
import { idiv } from "../core/num.ts";
import { cmpStr, sortBy } from "../core/seq.ts";
import { newGovernor, type Governor } from "../model/command.ts";
import { raise, type GovernOrder, type UnseatOrder } from "../model/orders.ts";
import { gain, remember, type Character } from "../model/people.ts";
import type { Power } from "../model/power.ts";
import { findCharacter, logEvent, notify, unitAt } from "../model/state.ts";
import { wordFromKing } from "../rules/court.ts";
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
  }
}

const P = TurnEngine.prototype;

P.grantGovernorship = function (p, o) {
  const S = this.s;
  const c = findCharacter(S, o.character);
  if (c === null || S.owner.getOrDefault(o.province, null) !== p) return;
  const seasons = wordFromKing(S, this.map, p, o.province);
  const from = S.turn + Math.max(1, Number.isFinite(seasons) ? seasons : 1);
  S.governors.push(newGovernor({ province: o.province, character: c.id, power: p, levies: o.levies, from }));
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
  const g = S.governors.find((x) => x.province === o.province && x.power === p && x.relieved === null);
  if (g === undefined) return;
  const seasons = wordFromKing(S, this.map, p, o.province);
  g.relieved = S.turn + Math.max(1, Number.isFinite(seasons) ? seasons : 1);
  notify(S, p, "Resolution", "Governorship taken back", `Word that you take back the governorship of ${this.map.get(o.province).name} is on its way; it reaches him in turn ${g.relieved}.`);
};

P.governorOf = function (province) {
  const S = this.s;
  const g = S.governors.find((x) => x.province === province && S.turn >= x.from) ?? null;
  if (g === null) return null;
  const c = findCharacter(S, g.character);
  return c !== null && c.status !== "Dead" && c.duty === "Governing" ? [g, c] : null;
};

P.governorsSeason = function () {
  const S = this.s;
  for (const g of sortBy([...S.governors], [(x: Governor) => x.province, cmpStr])) {
    const c = findCharacter(S, g.character);
    const gone = c === null || c.status === "Dead" || c.duty !== "Governing";
    // His province lost to another, or his king fallen: the grant is over, and he walks home if he has one.
    const lost = S.owner.getOrDefault(g.province, null) !== g.power;
    if (gone || lost) {
      S.governors = S.governors.filter((x) => x !== g);
      if (!gone && c !== null) this.leaveCommand(c, g.province);
      continue;
    }
    if (g.relieved === null || S.turn < g.relieved) continue;
    // Word of his recall reaches him: he steps down, or, disloyal and ambitious, turns with the levies he raised and rules
    // the province in his own name (item 17, the new Idrimi), unless other troops of his king's stand there.
    const t = c!.traits;
    const levies = S.units.filter((u) => u.power === g.power && u.home === g.province && u.province === g.province && u.commander === null);
    const others = S.units.some((u) => u.power === g.power && u.province === g.province && !levies.includes(u));
    S.governors = S.governors.filter((x) => x !== g);
    // In the city where his king holds court he cannot make it his own (a coup is not modelled): he turns with his levies
    // as a band, as before item 17.
    const court = this.courtAt(g.power) === g.province;
    if (t.loyalty < 30 && t.ambition > 60 && court && levies.length > 0) {
      const u = levies[0];
      this.tell(g.power, g.province, "Battle", "A governor turns", `${c!.name} refused to give up the governorship of ${this.map.get(g.province).name}, and turned with the ${u.men} men he raised there.`);
      logEvent(S, "defect", `${c!.name} refused his recall by ${g.power} and turned with the levies of ${this.map.get(g.province).name}.`, [g.power], "defect");
      this.armyToBand(u, c!, "commander");
      continue;
    }
    if (t.loyalty < 30 && t.ambition > 60 && !others && !court) {
      const name = this.map.get(g.province).name;
      const men = levies.reduce((a, u) => a + u.men, 0);
      this.tell(g.power, g.province, "Battle", "A governor turns", `${c!.name} refused to give up the governorship of ${name}, and turned${men > 0 ? ` with the ${men} men he raised there` : ""}: he rules it in his own name now.`);
      logEvent(S, "defect", `${c!.name} refused his recall by ${g.power} and turned${men > 0 ? " with the levies" : ""} of ${name}.`, [g.power], "defect");
      this.ruleOwn(g.province, c!, {
        how: "turned",
        from: g.power,
        followers: levies,
        gold: 0,
        rising: levies.length === 0,
        story: `Word came that the king of ${g.power} takes back your governorship of ${name}; you refused it.`,
        memory: `The king of ${g.power} took back my governorship of ${name}, and I refused it.`,
        line: `${c!.name}, governor of ${name} for ${g.power}, refused his recall and rules it in his own name`,
      });
      continue;
    }
    remember(c!, S.turn, `I gave up the governorship of ${this.map.get(g.province).name}, as the king of ${g.power} ordered.`);
    this.tell(g.power, g.province, "Resolution", "Governorship given up", `${c!.name} gave up the governorship of ${this.map.get(g.province).name} and is on the road to your court.`);
    this.leaveCommand(c!, g.province);
  }
};

P.governorsLevy = function () {
  const S = this.s;
  for (const g of sortBy([...S.governors], [(x: Governor) => x.province, cmpStr])) {
    if (g.raised >= g.levies || this.governorOf(g.province) === null) continue;
    if (S.owner.getOrDefault(g.province, null) !== g.power || unitAt(S, g.province) !== null) continue;
    const near = [g.province, ...this.map.neighbors(g.province)];
    const threat = S.units.some((u) => u.power !== g.power && u.kind === "Army" && near.includes(u.province));
    if (!threat) continue;
    const before = S.units.length;
    this.raise(g.power, raise(g.province, "Army"));
    if (S.units.length > before) {
      g.raised++;
      const c = findCharacter(S, g.character)!;
      this.tell(g.power, g.province, "Resolution", "A governor's levy", `${c.name}, your governor of ${this.map.get(g.province).name}, raised a levy there on his own, as his mandate allows, against the foreign troops beside it (${g.raised} of ${g.levies}).`);
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
