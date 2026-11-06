import type { SeasonFrame } from "../src/session/frames.ts";

/** A hand-built season's frame for the audio tests: everything empty, with `over` laid on top. */
export function frame(index: number, over: Partial<SeasonFrame> = {}): SeasonFrame {
  return {
    index, turn: index + 1, ended: false, endReason: null, winners: [], owner: new Map(), walls: new Map(), knownWalls: new Map(), knownSieges: new Map(),
    knownOwner: new Map(), sieges: [], units: [], moves: [], seenBy: new Map(), sight: new Map(), journeys: [], people: new Map(),
    sleep: new Map(), eliminated: new Set(), events: [], news: [], inboxCount: new Map(), openAge: false, ageBand: "Usual",
    ageEnded: null, climate: [], bands: [], built: new Map(), stores: new Map(), settled: new Map(), counted: new Map(), fed: new Map(),
    unrest: new Map(), caravans: [], walking: [], omen: "Quiet", ...over,
  } as SeasonFrame;
}
