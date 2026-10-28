/**
 * Every power's opening troops, treasury and starting strength: public facts every court knows (the script kings read them
 * from the map data too). Generated from the map data and the config alone, so the text stays byte-stable wherever it is shown.
 */
import { WorldMap, StartGold, StartUnits, type StartUnit, type UnitKind } from "../model/map.ts";
import type { GameConfig } from "../model/config.ts";
import { carriedOf, economyOf, grainWorth, harvestOf, needOf, startPurseOf, startStoresOf } from "../model/economy.ts";
import { strengthOf } from "./scoring.ts";
import { forMen, menOf } from "../model/land.ts";
import { AllPowers, type Power } from "../model/power.ts";
import { StartClaims } from "../model/recognition.ts";

export interface Opening {
  power: Power;
  units: readonly StartUnit[];
  /** What its homeland produces a season at reference prices (item 9+a): the whole harvest and the mines. */
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
    // The wealth of the realm at the start (item 9+a): its land's worth, its treasury, and its provinces' purses, stores
    // and markets and its troops' baggage, as rules/factory.ts sets them.
    let y = 0;
    let held = 0;
    for (const x of m.homeOf(p)) {
      y += grainWorth(harvestOf(x)) + economyOf(x).mine;
      held += startPurseOf(x) + grainWorth(startStoresOf(x) + needOf(x));
    }
    const units = StartUnits.filter((u) => u.power === p);
    for (const u of units) held += grainWorth(forMen(carriedOf(u.kind), u.kind, u.men ?? menOf(u.kind)));
    const gold = StartGold.get(p)!;
    return { power: p, units, homelandYield: y, gold, strength: strengthOf(config.provinceWeight, y, gold, held) };
  });
}

/** What the opening positions say of a power's rank ("Recognition is earned"): a claim to it that is still new, and who holds him a vassal. */
export function openingRank(p: Power): string {
  const c = StartClaims.find((x) => x.power === p);
  if (c === undefined) return "";
  return ` Its claim to be a Great King is new${c.overlord !== null ? `: ${c.overlord} holds ${p} to be its vassal` : ""}.`;
}

/** One line per power, as the rulebook gives it. */
export function openingLines(config: GameConfig): string[] {
  return openings(config).map((o) => `${o.power}: ${openingTroops(o)}; treasury ${o.gold} shekels; its land produces ${o.homelandYield} shekels' worth a season; starting strength ${o.strength}.${openingRank(o.power)}`);
}
