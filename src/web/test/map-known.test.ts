import { describe, test } from "vitest";
import { WorldMap, newGameEvent, type Power } from "@amarna/engine";
import { Assert } from "../../engine/test/support.ts";
import { remember } from "../src/map/memory.ts";
import { knownRuins, ownFiguresAt } from "../src/map/known.ts";
import { buildScene, ownEconomy } from "../src/map/scene.ts";
import { ownerFor, type SeasonFrame } from "../src/session/frames.ts";

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

  test("A city lost out of sight keeps its houses on the seat's map until word arrives, then leaves it", () => {
    // Egypt's own city, out of its sight, taken by Hatti (no sack) in frame 1; its people, stores and a band as Egypt last
    // held it; word of the loss reaches Egypt in frame 3.
    const own = (i: number, holder: Power, knows: Power, people: number) =>
      frame(i, {
        owner: new Map([[city.id, holder]]),
        knownOwner: word(knows, knows === "Egypt" ? 1 : i),
        settled: new Map([[city.id, people]]),
        stores: new Map([[city.id, people / 10]]),
        fed: new Map([[city.id, 600]]),
      });
    const fs = [own(0, "Egypt", "Egypt", 5000), own(1, "Hatti", "Egypt", 4000), own(2, "Hatti", "Egypt", 3000), own(3, "Hatti", "Hatti", 2000)];
    for (const i of [1, 2]) {
      const m = remember(fs, i, "Egypt", new Set());
      // As it last held it: the houses and the hunger of frame 0, not the new holder's.
      Assert.equal(5000, m.towns.get(city.id)?.now);
      Assert.equal(600, m.famine.get(city.id));
      Assert.equal(0, ownFiguresAt(fs, i, "Egypt", city.id));
    }
    Assert.false(remember(fs, 3, "Egypt", new Set()).towns.has(city.id));
    Assert.null(ownFiguresAt(fs, 3, "Egypt", city.id));
    // Land it holds and knows it holds: as it is now, as the engine's own view of the court shows it.
    Assert.equal(5000, remember(fs, 0, "Egypt", new Set()).towns.get(city.id)?.now);
    // God view: as it is.
    Assert.equal(3000, remember(fs, 2, null, new Set()).towns.get(city.id)?.now);
    // Hatti, which took it unseen by Egypt but knows it holds it, sees it as it is.
    const hatti = fs.map((f) => ({ ...f, knownOwner: new Map([["Hatti" as Power, new Map([[city.id, { owner: (f.index >= 1 ? "Hatti" : "Egypt") as Power, turn: f.turn }]])]]) }));
    Assert.equal(3000, remember(hatti, 2, "Hatti", new Set()).towns.get(city.id)?.now);
  });

  test("A province card tells of a city lost out of sight only what the stewards last sent; nothing of its new holder", () => {
    // Egypt's city taken by Hatti out of Egypt's sight in frame 1, word of it reaching Egypt in frame 3; a band there each
    // season, its stores and people changing under the new holder.
    const band = (men: number) => ({ province: city.id, men, ship: false, chief: "" });
    const at = (i: number, holder: Power, knows: Power, people: number) =>
      frame(i, {
        owner: new Map([[city.id, holder]]),
        knownOwner: word(knows, knows === "Egypt" ? 1 : i),
        settled: new Map([[city.id, people]]),
        stores: new Map([[city.id, people / 10]]),
        fed: new Map([[city.id, 900]]),
        bands: [band(people / 100)],
      });
    const fs = [at(0, "Egypt", "Egypt", 5000), at(1, "Hatti", "Egypt", 4000), at(2, "Hatti", "Egypt", 3000), at(3, "Hatti", "Hatti", 2000)];
    // Held and known: the card tells everything, from the court's own view.
    Assert.equal(JSON.stringify({ live: true }), JSON.stringify(ownEconomy(buildScene(fs, 0, "Egypt"), city.id)));
    for (const i of [1, 2]) {
      const scene = buildScene(fs, i, "Egypt");
      // Lost unawares: the stewards' last report (frame 0), with its age; never the live state or the new holder's figures.
      Assert.equal(JSON.stringify({ live: false, age: i, stores: 500, settled: 5000, fed: 900 }), JSON.stringify(ownEconomy(scene, city.id)));
      // The map's stores and bands as last held, the band faded with its age.
      Assert.equal(500, scene.stores.get(city.id));
      const b = scene.bands.find((x) => x.province === city.id)!;
      Assert.equal(50, b.men);
      Assert.equal(i, b.age);
    }
    // Word arrives: nothing of it any more, neither economy, stores nor band.
    const after = buildScene(fs, 3, "Egypt");
    Assert.null(ownEconomy(after, city.id));
    Assert.false(after.stores.has(city.id));
    Assert.false(after.bands.some((x) => x.province === city.id));
    // God view, and the new holder that knows it holds it: everything, as it is.
    Assert.equal(JSON.stringify({ live: true }), JSON.stringify(ownEconomy(buildScene(fs, 2, null), city.id)));
    const hatti = fs.map((f) => ({ ...f, knownOwner: new Map([["Hatti" as Power, new Map([[city.id, { owner: (f.index >= 1 ? "Hatti" : "Egypt") as Power, turn: f.turn }]])]]) }));
    Assert.equal(JSON.stringify({ live: true }), JSON.stringify(ownEconomy(buildScene(hatti, 2, "Hatti"), city.id)));
  });

  test("Who holds a province is as the record has it: known ownerless stays so, and what the record lacks is no one", () => {
    const f = frame(1, { owner: new Map([[city.id, "Hatti"]]), knownOwner: new Map([["Egypt" as Power, new Map([[city.id, { owner: null, turn: 1 }]])]]) });
    Assert.null(ownerFor(f, city.id, "Egypt"));
    Assert.null(ownerFor(f, city.id, "Babylonia"));
    Assert.equal("Hatti", ownerFor(f, city.id, null));
  });
});
