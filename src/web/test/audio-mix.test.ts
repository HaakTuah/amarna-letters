import { describe, test } from "vitest";
import { Assert } from "../../engine/test/support.ts";
import { city } from "../src/map/features.ts";
import { AtOnce, Level, Mixer, Repeat, bedLevel } from "../src/audio/mix.ts";
import { cuesAt } from "../src/audio/situation.ts";
import { schedule } from "../src/audio/schedule.ts";
import type { FrameMove, SeasonFrame } from "../src/session/frames.ts";

// The soundscape (Haakon, 1 November 2026): three layers, the music leading; event sounds for one seat only; both sound
// layers under the music and capped. Two hand-built frames, two powers, one province.
function frame(index: number, over: Partial<SeasonFrame> = {}): SeasonFrame {
  return {
    index, turn: index + 1, ended: false, endReason: null, winners: [], owner: new Map(), walls: new Map(), knownWalls: new Map(),
    knownOwner: new Map(), sieges: [], units: [], moves: [], seenBy: new Map(), sight: new Map(), journeys: [], people: new Map(),
    sleep: new Map(), eliminated: new Set(), events: [], news: [], inboxCount: new Map(), openAge: false, ageBand: "Usual",
    ageEnded: null, climate: [], bands: [], built: new Map(), stores: new Map(), settled: new Map(), fed: new Map(),
    unrest: new Map(), caravans: [], walking: [], omen: "Quiet", ...over,
  } as SeasonFrame;
}

const attack: FrameMove = { power: "Hatti", kind: "Army", from: "kadesh", order: "move", target: "gaza", to: null, helped: null, succeeded: false, destroyed: false, targetOwner: "Egypt" } as FrameMove;

describe("AudioMixTests", () => {
  test("At most three sounds of a layer at once; the same sound not again within a few seconds", () => {
    const m = new Mixer();
    Assert.true(m.admit("battle", "event", 0, 3));
    Assert.false(m.admit("battle", "event", 1000, 3));
    Assert.true(m.admit("battle", "event", Repeat.event + 10, 3));
    const n = new Mixer();
    for (let i = 0; i < AtOnce.event; i++) Assert.true(n.admit(`s${i}`, "event", i * 100, 5));
    Assert.false(n.admit("another", "event", 400, 1));
    // The world's sounds are capped on their own: a full event layer does not silence them.
    Assert.true(n.admit("another", "world", 400, 1));
    // Once the first have ended, room again.
    Assert.true(n.admit("later", "event", 6000, 1));
    // Booked out of order: a click at once, after three sounds booked a little ahead, would overlap all three.
    const o = new Mixer();
    for (let i = 0; i < 3; i++) Assert.true(o.admit(`ahead${i}`, "event", 500 + i * 700, 3, 0));
    Assert.false(o.admit("click", "event", 0, 3, 0));
    // A sound booked far ahead does not make the mixer forget one heard a moment ago.
    const r = new Mixer();
    Assert.true(r.admit("envelope", "event", 0, 0.5, 0));
    Assert.true(r.admit("season", "event", 6000, 0.5, 500));
    Assert.false(r.admit("envelope", "event", 1500, 0.5, 1500));
  });

  test("Both sound layers sit under the music", () => {
    Assert.true(Level.event < Level.music && Level.world < Level.music && Level.bed < Level.world);
  });

  test("The world's bed is heard only zoomed in, rising with the zoom", () => {
    Assert.equal(0, bedLevel(1));
    Assert.equal(0, bedLevel(1.5));
    Assert.true(bedLevel(2.2) > 0 && bedLevel(2.2) < 1);
    Assert.equal(1, bedLevel(4));
  });

  test("Event sounds are one seat's own: god view hears the world's sounds and no event sounds", () => {
    const f = frame(1, { moves: [attack], seenBy: new Map([["Egypt", [0]], ["Hatti", [0]]]), inboxCount: new Map([["Egypt", 2]]) });
    const seat = cuesAt([frame(0), f], 1, "Egypt");
    Assert.true(seat.sounds.length > 0);
    const god = cuesAt([frame(0), f], 1, null);
    Assert.equal(0, god.sounds.length);
    // God view still hears the battle where it was fought, zoomed in near it, as a world sound.
    const heard = schedule(god, { at: city("gaza"), zoom: 4 }, 3000);
    Assert.true(heard.some((s) => s.name === "battle" && s.layer === "world"));
    Assert.true(heard.every((s) => s.layer === "world"));
    Assert.true(schedule(seat, { at: city("gaza"), zoom: 4 }, 3000).some((s) => s.layer === "event"));
  });
});
