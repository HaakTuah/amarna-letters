import type { Power } from "@amarna/engine";
import { closingLine } from "./pacing.ts";
import { momentsOf } from "../map/moments.ts";
import { buildScene, type MapScene } from "../map/scene.ts";
import { nameSettings } from "../ui/names.ts";
import type { SeasonFrame } from "./frames.ts";

/** One season's closing line, the one the map shows as the season ends, and which season it closed. */
export interface LedgerLine {
  index: number;
  line: string;
}

/** How many seasons the Season tab's ledger keeps in view (#647: "a few seasons at a glance"). */
export const LedgerSeasons = 5;

/**
 * The closing lines of the last few seasons up to `index`, newest first, each as `viewer` knew its season (a seat's line
 * says only what word had reached it by then; the opening, which has no line, is left out). A line is made once from its
 * season's scene, which is not kept (a scene is megabytes): `cache` keeps the words, a season, a pair of eyes and the names shown each (a line is worded in the names the player's settings give).
 */
export function closingLedger(
  frames: readonly SeasonFrame[],
  index: number,
  viewer: Power | null,
  cache: Map<string, string>,
  sceneAt: (i: number) => MapScene = (i) => buildScene(frames, i, viewer),
): LedgerLine[] {
  const out: LedgerLine[] = [];
  for (let i = Math.min(index, frames.length - 1); i >= 1 && out.length < LedgerSeasons; i--) {
    const { places, realms } = nameSettings();
    const key = `${i}/${viewer ?? ""}/${places}/${realms}`;
    let line = cache.get(key);
    if (line === undefined) {
      line = closingLine(momentsOf(sceneAt(i)), viewer !== null);
      cache.set(key, line);
    }
    out.push({ index: i, line });
  }
  return out;
}
