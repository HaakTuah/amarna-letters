/**
 * Sieges that have ended (bug #517): a court that knew of a siege far off keeps it in what it knows until word of its end,
 * setting out the season it ended, reaches it (`siegesKnown` in rules/known-land.ts). The engine keeps each for as long as
 * any word could take, then lets it go.
 */
import { I, type ObjSchema, S, list, obj, opt } from "../core/json.ts";
import type { Power } from "./power.ts";
import type { GameState, Siege } from "./state.ts";

export interface SiegeEnded {
  province: string;
  /** The besieger. */
  power: Power;
  /** Who held the city as the siege ended (before it changed hands, if it fell). */
  holder: Power | null;
  since: number;
  progress: number;
  /** Its progress at the end of each season it stood (Siege.history). */
  history: number[];
  /** The season it ended. */
  ended: number;
}

export function newSiegeEnded(init: Partial<SiegeEnded> = {}): SiegeEnded {
  return { province: "", power: "Egypt", holder: null, since: 0, progress: 0, history: [], ended: 0, ...init };
}

export const SiegeEndedSchema: ObjSchema<SiegeEnded> = obj("SiegeEnded", newSiegeEnded, { province: S, power: S, holder: opt(S), since: I, progress: I, history: list(I), ended: I });

/** The longest word takes to reach a court, in seasons, with room to spare (`Views.knownHolders` looks back six). */
export const SiegeEndedKept = 8;

/** Ends the sieges that match, recording each so far courts keep it until word of its end comes. */
export function endSieges(s: GameState, ends: (x: Siege) => boolean): void {
  for (let i = s.sieges.length - 1; i >= 0; i--) {
    const x = s.sieges[i];
    if (!ends(x)) continue;
    s.sieges.splice(i, 1);
    s.siegesEnded.push(newSiegeEnded({ province: x.province, power: x.power, holder: s.owner.getOrDefault(x.province, null), since: x.since, progress: x.progress, history: [...x.history], ended: s.turn }));
  }
  s.siegesEnded = s.siegesEnded.filter((e) => e.ended > s.turn - SiegeEndedKept);
}
