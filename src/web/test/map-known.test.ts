import { describe, test } from "vitest";
import { WorldMap, newGameEvent, type Power } from "@amarna/engine";
import { Assert } from "../../engine/test/support.ts";
import { remember } from "../src/map/memory.ts";
import { knownRuins } from "../src/map/known.ts";
import type { SeasonFrame } from "../src/session/frames.ts";

// One rule for the map and the ear (the sound lane, 1 November 2026): a seat knows of a sack, a ruin and its rebuilding
// only from its own record (shown it, its sight, its dated word of the city), never from the true owner or unrest. Four
// hand-built seasons, two powers and one city.
function frame(index: number, over: Partial<SeasonFrame> = {}): SeasonFrame {
  return {
    index, turn: index + 1, ended: false, endReason: null, winners: [], owner: new Map(), walls: new Map(), knownWalls: new Map(),
    knownOwner: new Map(), sieges: [], units: [], moves: [], seenBy: new Map(), sight: new Map(), journeys: [], people: new Map(),
    sleep: new Map(), eliminated: new Set(), events: [], news: [], inboxCount: new Map(), openAge: false, ageBand: "Usual",
    ageEnded: null, climate: [], bands: [], built: new Map(), stores: new Map(), settled: new Map(), fed: new Map(),
    unrest: new Map(), caravans: [], walking: [], omen: "Quiet", ...over,
  } as SeasonFrame;
}

const city = WorldMap.default.landProvinces.find((p) => p.capital)!;
const word = (owner: Power, turn: number) => new Map([["Egypt" as Power, new Map([[city.id, { owner, turn }]])]]);
const sack = (to: Power[]) => newGameEvent({ kind: "sack", text: `Hatti sacked ${city.name}.`, visibleTo: to });

// Egypt's own city, out of its sight, sacked and taken by Hatti; the sack shown to Hatti only; Egypt's word of the city
// stays a season old until frame 3.
const seasons = [
  frame(0, { owner: new Map([[city.id, "Egypt"]]), knownOwner: word("Egypt", 1) }),
  frame(1, { owner: new Map([[city.id, "Hatti"]]), knownOwner: word("Egypt", 1), unrest: new Map([[city.id, 500]]), events: [sack(["Hatti"])] }),
  frame(2, { owner: new Map([[city.id, "Hatti"]]), knownOwner: word("Egypt", 1), unrest: new Map([[city.id, 400]]) }),
  frame(3, { owner: new Map([[city.id, "Hatti"]]), knownOwner: word("Hatti", 2), unrest: new Map([[city.id, 300]]) }),
];

describe("MapKnownTests", () => {
  test("A distant sack the seat has not heard of draws nothing on its map; word of it then draws the ruin", () => {
    for (const i of [1, 2]) {
      Assert.false(remember(seasons, i, "Egypt", new Set()).ruins.has(city.id));
      // Nor does the true owner's change show the city as wild or anything else to Egypt.
      Assert.false(remember(seasons, i, "Egypt", new Set()).wild.has(city.id));
    }
    Assert.true(remember(seasons, 3, "Egypt", new Set()).ruins.has(city.id));
    // The map and the ear agree, season by season.
    for (let i = 0; i < seasons.length; i++)
      Assert.equal([...knownRuins(seasons, i, "Egypt")].join(), [...remember(seasons, i, "Egypt", new Set()).ruins].join());
    // God view draws it as it is.
    Assert.true(remember(seasons, 1, null, new Set()).ruins.has(city.id));
  });

  test("Out of sight a known ruin stays a ruin, however the city truly mends; in sight it is seen rebuilt", () => {
    const shown = seasons.map((f, i) => (i === 1 ? { ...f, events: [sack(["Hatti", "Egypt"])] } : f));
    const mended = frame(4, { owner: new Map([[city.id, "Hatti"]]), knownOwner: word("Hatti", 3) });
    Assert.true(remember([...shown, mended], 4, "Egypt", new Set()).ruins.has(city.id));
    const seen = { ...mended, sight: new Map([["Egypt" as Power, new Set([city.id])]]) };
    Assert.false(remember([...shown, seen], 4, "Egypt", new Set()).ruins.has(city.id));
  });
});
