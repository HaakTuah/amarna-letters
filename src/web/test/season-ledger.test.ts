import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { WorldMap, newGameEvent, type Power } from "@amarna/engine";
import { SeasonPanel } from "../src/components/SeasonPanel.tsx";
import { buildScene } from "../src/map/scene.ts";
import type { SeasonFrame } from "../src/session/frames.ts";
import { closingLedger, LedgerSeasons } from "../src/session/ledger.ts";

// The Season tab keeps the closing lines of the last few seasons (#647): the line the map shows as each season ends, newest
// first, as the eyes shown knew each season. Eight hand-built seasons; a ship lost to a storm in the fourth, visible to Hatti only.
function frame(index: number, over: Partial<SeasonFrame> = {}): SeasonFrame {
  return {
    index, turn: index + 1, ended: false, endReason: null, winners: [], owner: new Map(), walls: new Map(), knownWalls: new Map(), knownSieges: new Map(),
    knownOwner: new Map(), sieges: [], units: [], moves: [], seenBy: new Map(), sight: new Map(), journeys: [], people: new Map(),
    sleep: new Map(), eliminated: new Set(), events: [], news: [], inboxCount: new Map(), openAge: false, ageBand: "Usual",
    ageEnded: null, climate: [], bands: [], built: new Map(), stores: new Map(), settled: new Map(), counted: new Map(), fed: new Map(),
    unrest: new Map(), caravans: [], knownCaravans: new Map(), walking: [], omen: "Quiet", governed: new Map(), governedKnown: new Map(), bonds: new Map(), knownBonds: new Map(), moodRead: new Map(), obeyed: new Map(), ...over,
  } as SeasonFrame;
}

const place = WorldMap.default.landProvinces.find((p) => !p.capital)!;
const lost = newGameEvent({ kind: "ship-lost", text: `A ship was lost near ${place.name}.`, visibleTo: ["Hatti" as Power] });
const frames = Array.from({ length: 8 }, (_, i) => frame(i, i === 3 ? { events: [lost] } : {}));
const words = (x: { line: string }[]): string[] => x.map((l) => l.line);

describe("SeasonLedger", () => {
  test("The ledger holds the last few seasons' closing lines, newest first, and never the opening", () => {
    const god = closingLedger(frames, 7, null, new Map());
    expect(god.map((l) => l.index)).toEqual([7, 6, 5, 4, 3]);
    expect(god).toHaveLength(LedgerSeasons);
    expect(words(god)[4]).toBe(`A ship lost to a storm near ${place.name}.`);
    expect(words(god).slice(0, 4)).toEqual(Array(4).fill("A quiet season."));
    // Looking back, or early in the game: the seasons that were, none before the first.
    expect(closingLedger(frames, 4, null, new Map()).map((l) => l.index)).toEqual([4, 3, 2, 1]);
    expect(closingLedger(frames, 2, null, new Map()).map((l) => l.index)).toEqual([2, 1]);
    expect(closingLedger(frames, 0, null, new Map())).toEqual([]);
  });

  test("A seat's ledger tells only what word had reached it; each pair of eyes has its own words", () => {
    const cache = new Map<string, string>();
    const egypt = closingLedger(frames, 7, "Egypt", cache);
    expect(words(egypt)).toEqual(Array(5).fill("A quiet season, as far as word has reached you."));
    const hatti = closingLedger(frames, 7, "Hatti", cache);
    expect(words(hatti)[4]).toContain("storm");
    expect(words(closingLedger(frames, 7, null, cache))[4]).toContain("storm");
    expect(words(closingLedger(frames, 7, "Egypt", cache))).toEqual(words(egypt));
  });

  test("A season's line is made once: its scene is built the first time only", () => {
    let built = 0;
    const cache = new Map<string, string>();
    const sceneAt = (i: number) => (built++, buildScene(frames, i, null));
    closingLedger(frames, 7, null, cache, sceneAt);
    expect(built).toBe(5);
    closingLedger(frames, 7, null, cache, sceneAt);
    expect(built).toBe(5);
    // One season back: only the one that comes into view is made.
    closingLedger(frames, 6, null, cache, sceneAt);
    expect(built).toBe(6);
  });

  test("The Season tab shows the ledger, each season dated, under the season's own heading", () => {
    const ledger = closingLedger(frames, 7, null, new Map());
    const text = renderToStaticMarkup(createElement(SeasonPanel, { scene: buildScene(frames, 7, null), ledger, onProvince: () => {}, onPerson: () => {} }));
    expect(text).toContain("The last seasons");
    expect(text).toContain(`A ship lost to a storm near ${place.name}.`);
    expect(text.indexOf("A quiet season.")).toBeLessThan(text.indexOf("A ship lost"));
    // None at the opening, where there is nothing to say.
    const opening = renderToStaticMarkup(createElement(SeasonPanel, { scene: buildScene(frames, 0, null), ledger: [], onProvince: () => {}, onPerson: () => {} }));
    expect(opening).not.toContain("The last seasons");
  });
});
