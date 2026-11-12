import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { WorldMap, type Power } from "@amarna/engine";
import { BandsHere } from "../src/components/BandsHere.tsx";
import { buildScene } from "../src/map/scene.ts";
import type { SeasonFrame } from "../src/session/frames.ts";

// The province card lists the bands and pirate crews the seat knows of there (#631), from the scene's bands, which are only
// what the seat knows: the bands in its sight now, and in its own land as that land's figures stand on its map.
function frame(over: Partial<SeasonFrame> = {}): SeasonFrame {
  return {
    index: 0, turn: 1, ended: false, endReason: null, winners: [], owner: new Map(), walls: new Map(), knownWalls: new Map(), knownSieges: new Map(),
    knownOwner: new Map(), sieges: [], units: [], moves: [], seenBy: new Map(), sight: new Map(), journeys: [], people: new Map(),
    sleep: new Map(), eliminated: new Set(), events: [], news: [], inboxCount: new Map(), openAge: false, ageBand: "Usual",
    ageEnded: null, climate: [], bands: [], built: new Map(), stores: new Map(), settled: new Map(), counted: new Map(), fed: new Map(),
    unrest: new Map(), caravans: [], knownCaravans: new Map(), walking: [], omen: "Quiet", governed: new Map(), governedKnown: new Map(), bonds: new Map(), knownBonds: new Map(), moodRead: new Map(), obeyed: new Map(), ...over,
  } as SeasonFrame;
}

const [near, far] = WorldMap.default.landProvinces.filter((p) => !p.capital).map((p) => p.id);
const here = (id: string, scene: ReturnType<typeof buildScene>): string => renderToStaticMarkup(createElement(BandsHere, { scene, id }));
const world = frame({
  sight: new Map([["Egypt" as Power, new Set([near])]]),
  bands: [
    { province: near, men: 1200, ship: false, chief: "Abdi" },
    { province: near, men: 40, ship: true, chief: "" },
    { province: far, men: 300, ship: false, chief: "Zimri" },
  ],
});

describe("ProvinceBands", () => {
  test("A seat's card lists the bands and crews in its sight there, and not those out of it", () => {
    const seat = buildScene([world], 0, "Egypt");
    const text = here(near, seat);
    expect(text).toContain("A band of 1,200 men, led by Abdi, works here.");
    expect(text).toContain("A pirate crew of 40 men works here.");
    // Out of the seat's sight: nothing, though the band is there in the world and in god view.
    expect(here(far, seat)).toBe("");
    expect(here(far, buildScene([world], 0, null))).toContain("A band of 300 men, led by Zimri, works here.");
  });

  test("A band last told of in the seat's own land says how old the word is, and the freshest word comes first", () => {
    const seat = buildScene([world], 0, "Egypt");
    seat.bands.push({ province: near, men: 7, ship: false, chief: "", age: 3 }, { province: near, men: 8, ship: false, chief: "", age: 1 });
    const text = here(near, seat);
    expect(text).toContain("A band of 7 men works here: as your people last told of it, 3 seasons ago.");
    expect(text).toContain("A band of 8 men works here: as your people last told of it, 1 season ago.");
    expect(text.indexOf("8 men")).toBeLessThan(text.indexOf("7 men"));
    expect(text.indexOf("1,200 men")).toBeLessThan(text.indexOf("8 men"));
  });
});
