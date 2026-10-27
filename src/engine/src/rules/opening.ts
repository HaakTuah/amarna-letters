/**
 * Every power's opening troops, treasury and starting strength: public facts every court knows (the script kings read them
 * from the map data too). Generated from the map data and the config alone, so the text stays byte-stable wherever it is shown.
 */
import { WorldMap, StartGold, StartUnits, type StartUnit, type UnitKind } from "../model/map.ts";
import type { GameConfig } from "../model/config.ts";
import { AllPowers, type Power } from "../model/power.ts";

export interface Opening {
  power: Power;
  units: readonly StartUnit[];
  homelandYield: number;
  gold: number;
  strength: number;
}

/** "armies in memphis and akhetaten, a fleet in delta". */
export function openingTroops(o: Opening): string {
  const group = (kind: UnitKind): string => {
    const at = o.units.filter((u) => u.kind === kind).map((u) => u.province);
    const noun = kind === "Army" ? "army" : "fleet";
    if (at.length === 0) return "";
    if (at.length === 1) return `a ${noun} in ${at[0]}`;
    return `${kind === "Army" ? "armies" : "fleets"} in ${at.slice(0, at.length - 1).join(", ")} and ${at[at.length - 1]}`;
  };
  return [group("Army"), group("Fleet")].filter((x) => x.length > 0).join(", ");
}

/** Each power in the fixed order: its opening troops, homeland yield, treasury and starting strength (as newGame sets it). */
export function openings(config: GameConfig, map: WorldMap | null = null): Opening[] {
  const m = map ?? WorldMap.default;
  return AllPowers.map((p) => {
    let y = 0;
    for (const x of m.homeOf(p)) y += x.yield;
    const gold = StartGold.get(p)!;
    return { power: p, units: StartUnits.filter((u) => u.power === p), homelandYield: y, gold, strength: config.provinceWeight * y + gold };
  });
}

/** One line per power, as the rulebook gives it. */
export function openingLines(config: GameConfig): string[] {
  return openings(config).map((o) => `${o.power}: ${openingTroops(o)}; treasury ${o.gold} shekels; homeland yield ${o.homelandYield}; starting strength ${o.strength}.`);
}
