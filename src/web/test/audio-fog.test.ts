import { describe, test } from "vitest";
import { WorldMap, isGreatKing, newGameEvent, type Power } from "@amarna/engine";
import { Assert } from "../../engine/test/support.ts";
import { city } from "../src/map/features.ts";
import { remember } from "../src/map/memory.ts";
import { bedAt, cuesAt, moodAt, shadeAt } from "../src/audio/situation.ts";
import { schedule } from "../src/audio/schedule.ts";
import type { FrameMove, SeasonFrame } from "../src/session/frames.ts";

// Nothing heard reveals the fog of war (Haakon, 1 November 2026: "Important! The music must never reveal what's outside
// the fog of war."), and a seat hears what its own map shows ("you know where a sea is, so some things you can zoom in on
// and hear, without it revealing anything"). Hand-built frames: three powers, a capital and a province or two.
function frame(index: number, over: Partial<SeasonFrame> = {}): SeasonFrame {
  return {
    index, turn: index + 1, ended: false, endReason: null, winners: [], owner: new Map(), walls: new Map(), knownWalls: new Map(),
    knownOwner: new Map(), sieges: [], units: [], moves: [], seenBy: new Map(), sight: new Map(), journeys: [], people: new Map(),
    sleep: new Map(), eliminated: new Set(), events: [], news: [], inboxCount: new Map(), openAge: false, ageBand: "Usual",
    ageEnded: null, climate: [], bands: [], built: new Map(), stores: new Map(), settled: new Map(), fed: new Map(),
    unrest: new Map(), caravans: [], walking: [], omen: "Quiet", ...over,
  } as SeasonFrame;
}

const map = WorldMap.default;
// A great king's capital that is not Egypt's: Hatti takes it, out of Egypt's sight.
const capital = map.provinces.find((p) => p.capital && p.home !== null && p.home !== "Egypt" && p.home !== "Hatti" && isGreatKing(p.home))!;
const victim = capital.home as Power;
const egyptKnows = (owner: Power) => new Map([["Egypt" as Power, new Map([[capital.id, { owner, turn: 1 }], ["gaza", { owner: "Egypt" as Power, turn: 1 }]])]]);

/** Everything a seat could hear of a season, zoomed in on the hidden place and zoomed out. */
function heard(frames: SeasonFrame[], viewer: Power) {
  const i = frames.length - 1;
  const c = cuesAt(frames, i, viewer);
  const near = { at: city(capital.id), zoom: 5 };
  const place = (id: string) => city(id);
  return JSON.stringify({
    mood: moodAt(frames, i, viewer),
    shade: shadeAt(frames, i, viewer),
    sting: c.sting,
    moment: c.moment,
    sounds: c.sounds.map((s) => s.name),
    map: c.map,
    near: schedule(c, near, 3000).map((s) => [s.name, s.layer]),
    far: schedule(c, { at: city(capital.id), zoom: 1 }, 3000).map((s) => [s.name, s.layer]),
    bed: bedAt(frames[i], near.at, near.zoom, viewer, place, remember(frames, i, viewer, new Set()).ruins),
  });
}

describe("AudioFogTests", () => {
  test("A hidden battle, siege or fall changes nothing a seat hears, even zoomed in on it", () => {
    const owner = new Map<string, Power | null>([[capital.id, victim], ["gaza", "Egypt"]]);
    const sight = new Map<Power, Set<string>>([["Egypt", new Set(["gaza"])]]);
    const base = (i: number, over: Partial<SeasonFrame> = {}) =>
      frame(i, { owner, knownOwner: egyptKnows(victim), sight, seenBy: new Map([["Egypt", []]]), ...over } as Partial<SeasonFrame>);
    const quiet = [base(0), base(1), base(2)];
    // The same seasons, with Hatti's assault, its siege, the capital's fall and the victim's end, none of it in Egypt's sight.
    const assault: FrameMove = { power: "Hatti", kind: "Army", from: "x", order: "move", target: capital.id, to: capital.id, helped: null, succeeded: true, destroyed: true, targetOwner: victim } as FrameMove;
    const hidden = [
      base(0),
      base(1, {
        moves: [assault],
        seenBy: new Map([["Egypt", []], ["Hatti", [0]]]),
        sieges: [{ province: capital.id, besieger: "Hatti", progress: 2, walls: 2, since: 1 }],
        units: [{ id: "h1", power: "Hatti", kind: "Army", province: capital.id }],
        events: [newGameEvent({ kind: "siege", signal: "siege-begun", visibleTo: ["Hatti"] }), newGameEvent({ kind: "sack", text: `Hatti sacked ${capital.name}.`, visibleTo: ["Hatti", victim] })],
      } as Partial<SeasonFrame>),
      base(2, {
        owner: new Map<string, Power | null>([[capital.id, "Hatti"], ["gaza", "Egypt"]]),
        eliminated: new Set([victim]),
        unrest: new Map([[capital.id, 500]]),
      } as Partial<SeasonFrame>),
    ];
    for (const n of [2, 3]) Assert.equal(heard(quiet.slice(0, n), "Egypt"), heard(hidden.slice(0, n), "Egypt"));
    // God view hears the true map: the same seasons are not quiet there.
    Assert.null(cuesAt(quiet, 2, null).sting);
    Assert.equal("capital", cuesAt(hidden, 2, null).sting);
    Assert.equal("battle", moodAt(hidden.slice(0, 2), 1, null));
  });

  test("A seat whose sight the record lacks sees nothing, never everything", () => {
    const units = [{ id: "h1", power: "Hatti" as Power, kind: "Army" as const, province: "gaza" }];
    const knownOwner = new Map([["Egypt" as Power, new Map([["gaza", { owner: "Egypt" as Power, turn: 1 }]])]]);
    Assert.equal("tension", moodAt([frame(0), frame(1, { units, knownOwner, sight: new Map([["Egypt", new Set(["gaza"])]]) })], 1, "Egypt"));
    Assert.equal("calm", moodAt([frame(0), frame(1, { units, knownOwner })], 1, "Egypt"));
    // And a seat with no knowledge of owners in the record knows none: a change of hands it never learned brings no sting.
    const fell = [frame(0, { owner: new Map([[capital.id, victim]]) }), frame(1, { owner: new Map([[capital.id, "Hatti"]]) })];
    Assert.null(cuesAt(fell, 1, "Egypt").sting);
    Assert.equal("capital", cuesAt(fell, 1, null).sting);
  });

  test("A town sounds as the seat last knew it: its market until the news of its sacking, then only the wind", () => {
    const at = city(capital.id);
    Assert.equal("market", bedAt(frame(1), at, 5, "Egypt", city, new Set()));
    Assert.equal("wind", bedAt(frame(1), at, 5, "Egypt", city, new Set([capital.id])));
    // Through the map's own memory: a sack Egypt was not told of leaves the market; once told, its ruin.
    const sack = (to: Power[]) => [frame(0), frame(1, { events: [newGameEvent({ kind: "sack", text: `Hatti sacked ${capital.name}.`, visibleTo: to })], unrest: new Map([[capital.id, 500]]) })];
    Assert.equal("market", bedAt(sack(["Hatti"])[1], at, 5, "Egypt", city, remember(sack(["Hatti"]), 1, "Egypt", new Set()).ruins));
    Assert.equal("wind", bedAt(sack(["Hatti", "Egypt"])[1], at, 5, "Egypt", city, remember(sack(["Hatti", "Egypt"]), 1, "Egypt", new Set()).ruins));
    // The land itself is known to all: the sea and the rivers are heard wherever the view goes, whatever the seat sees.
    const sea = map.provinces.find((p) => p.isSea)!;
    Assert.equal("nile", bedAt(frame(1), city(sea.id), 5, "Egypt", city));
  });
});
