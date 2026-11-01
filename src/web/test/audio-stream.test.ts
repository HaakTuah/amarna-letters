import { describe, test } from "vitest";
import { WorldMap, newGameEvent, type Power } from "@amarna/engine";
import { Assert } from "../../engine/test/support.ts";
import { city } from "../src/map/features.ts";
import { Moments, cuesAt } from "../src/audio/situation.ts";
import { Apart, MapHeard, schedule } from "../src/audio/schedule.ts";
import type { FrameMove, SeasonFrame } from "../src/session/frames.ts";

// Item 19+++ fed by item 17a's stream: each sound of a season at its event's moment and place, heard by zoom. Each test
// builds the two frames it needs by hand: a power or two, a province or two, no game.
function frame(index: number, over: Partial<SeasonFrame> = {}): SeasonFrame {
  return {
    index, turn: index + 1, ended: false, endReason: null, winners: [], owner: new Map(), walls: new Map(), knownWalls: new Map(),
    knownOwner: new Map(), sieges: [], units: [], moves: [], seenBy: new Map(), sight: new Map(), journeys: [], people: new Map(),
    sleep: new Map(), eliminated: new Set(), events: [], news: [], inboxCount: new Map(), openAge: false, ageBand: "Usual",
    ageEnded: null, climate: [], bands: [], built: new Map(), stores: new Map(), settled: new Map(), fed: new Map(),
    unrest: new Map(), caravans: [], walking: [], omen: "Quiet", ...over,
  } as SeasonFrame;
}

const move = (power: Power, kind: "Army" | "Fleet", from: string, target: string, targetOwner: Power | null = null): FrameMove =>
  ({ power, kind, from, order: "move", target, to: null, helped: null, succeeded: true, destroyed: false, targetOwner }) as FrameMove;

const map = WorldMap.default;
const sea = map.provinces.find((p) => p.isSea)!.id;
const near = (id: string, zoom = 4) => ({ at: city(id), zoom });

describe("AudioStreamTests", () => {
  test("An army's march and a fleet's waves are placed where they went, in the order the season saw them", () => {
    const f = frame(1, { moves: [move("Egypt", "Army", "memphis", "gaza"), move("Egypt", "Fleet", sea, sea)], seenBy: new Map([["Egypt", [0, 1]]]) });
    const c = cuesAt([frame(0), f], 1, "Egypt");
    Assert.equal("gaza", c.map.find((s) => s.name === "march")!.at);
    Assert.equal(sea, c.map.find((s) => s.name === "waves")!.at);
    Assert.true(c.map.every((s) => s.t >= Moments.march && s.t <= Moments.end));
    // A move the seat did not see makes no sound.
    const unseen = frame(1, { moves: [move("Hatti", "Army", "x", "gaza")], seenBy: new Map([["Egypt", []]]) });
    Assert.equal(0, cuesAt([frame(0), unseen], 1, "Egypt").map.length);
  });

  test("Zoomed in near the march it is heard, louder the nearer; zoomed out only the court's own sounds", () => {
    const f = frame(1, { moves: [move("Egypt", "Army", "memphis", "gaza")], seenBy: new Map([["Egypt", [0]]]) });
    const c = cuesAt([frame(0), f], 1, "Egypt");
    const close = schedule(c, near("gaza"), 3000).find((s) => s.name === "march");
    Assert.notNull(close ?? null);
    Assert.true(close!.heard.gain > 0.5);
    Assert.false(schedule(c, near("gaza", 1), 3000).some((s) => s.name === "march"));
    Assert.true(schedule(c, near("gaza", 1), 3000).some((s) => s.name === "season"));
  });

  test("A fleet lying at sea in sight is in the waves; one out of sight is not", () => {
    const f = frame(1, { units: [{ id: "u1", power: "Hatti", kind: "Fleet", province: sea }], sight: new Map([["Egypt", new Set([sea])]]) });
    Assert.true(cuesAt([frame(0), f], 1, "Egypt").map.some((s) => s.name === "waves" && s.at === sea));
    const hidden = frame(1, { units: [{ id: "u1", power: "Hatti", kind: "Fleet", province: sea }], sight: new Map([["Egypt", new Set<string>()]]) });
    Assert.false(cuesAt([frame(0), hidden], 1, "Egypt").map.some((s) => s.name === "waves"));
  });

  test("A winter crossing: the wind on the pass, an avalanche where it cost men, the storm on the open sea", () => {
    const to = map.get("gaza");
    const ev = (signal: string, text: string) =>
      frame(1, { moves: [move("Egypt", "Army", "memphis", "gaza")], seenBy: new Map([["Egypt", [0]]]), events: [newGameEvent({ kind: "winter", visibleTo: ["Egypt"], signal, text })] });
    const name = (f: SeasonFrame) => cuesAt([frame(0), f], 1, "Egypt").map.filter((s) => s.t === Moments.winter).map((s) => `${s.name}@${s.at}`);
    Assert.equal("gust@gaza", name(ev("winter-crossed", `Egypt's army crossed the pass into ${to.name} in winter.`)).join());
    Assert.equal("avalanche@gaza", name(ev("winter-loss", `Egypt's A memphis lost 300 men to cold, hunger and desertion, crossing the pass into ${to.name} in winter.`)).join());
    Assert.equal("storm@gaza", name(ev("winter-loss", `Egypt's army lost 300 men to the storms, crossing the open sea to ${to.name} in winter.`)).join());
    // Fleets on open beaches: the storm at the waters named, not at the land whose name is inside the waters' name.
    const waters = map.provinces.find((p) => p.isSea && p.name.includes(to.name))!;
    Assert.equal(`storm@${waters.id}`, name(ev("harbour-short", `Egypt's fleets in ${waters.name} lost 40 men to winter storms on open beaches.`)).join());
  });

  test("New weather in sight: a flood's rains, a drought's dry wind; weather already there is silent", () => {
    const flood = { kind: "Flood" as const, name: "The Nile's flood", provinces: ["gaza"], river: null, ruinous: false, since: 1 };
    const f = frame(1, { climate: [flood], sight: new Map([["Egypt", new Set(["gaza"])]]) });
    Assert.true(cuesAt([frame(0), f], 1, "Egypt").map.some((s) => s.name === "storm" && s.at === "gaza"));
    Assert.false(cuesAt([frame(0, { climate: [flood] }), f], 1, "Egypt").map.some((s) => s.name === "storm"));
    const dry = frame(1, { climate: [{ ...flood, kind: "Drought" }] });
    Assert.true(cuesAt([frame(0), dry], 1, null).map.some((s) => s.name === "gust"));
  });

  test("Each sound at its moment: arrivals first, the clash after the march, never two starting together, faster play packs them closer", () => {
    const f = frame(1, {
      moves: [move("Egypt", "Army", "memphis", "gaza"), move("Hatti", "Army", "x", "gaza", "Egypt")],
      seenBy: new Map([["Egypt", [0, 1]]]),
      owner: new Map([["gaza", "Egypt"]]),
      // What the seat knows, never the truth, decides what it hears (a record without it counts as knowing nothing).
      knownOwner: new Map([["Egypt", new Map([["gaza", { owner: "Egypt", turn: 1 }]])]]),
    } as Partial<SeasonFrame>);
    const c = cuesAt([frame(0), f], 1, "Egypt");
    const s = schedule(c, near("gaza"), 4000);
    const at = (n: string) => s.find((x) => x.name === n)!.delay;
    // In a busy season the court's three most telling sounds are kept (the season's own stroke gives way).
    Assert.false(s.some((x) => x.name === "season"));
    Assert.true(at("march") < at("battle"));
    for (let i = 1; i < s.length; i++) Assert.true(s[i].delay - s[i - 1].delay >= Apart - 1e-9);
    // A courier's arrival opened the season: heard before the march.
    const arrived = frame(1, { moves: [move("Egypt", "Army", "memphis", "gaza")], seenBy: new Map([["Egypt", [0]]]), inboxCount: new Map([["Egypt", 1]]) });
    const q = schedule(cuesAt([frame(0), arrived], 1, "Egypt"), near("gaza"), 4000);
    Assert.true(q.find((x) => x.name === "courier")!.delay < q.find((x) => x.name === "march")!.delay);
    const fast = schedule(c, near("gaza"), 1200);
    Assert.true(fast.find((x) => x.name === "battle")!.delay < at("battle"));
  });

  test("A battle is heard where it was fought: at an attack's goal, and where a unit was driven out; in god view, all of them", () => {
    const struck = { ...move("Egypt", "Army", "gaza", "gaza"), order: "hold", target: null, destroyed: true } as FrameMove;
    const f = frame(1, { moves: [move("Hatti", "Army", "x", "ugarit", "Mitanni"), struck] });
    // The first battle rides with the court's own sounds, the rest are the map's: together, every place fought over.
    const all = cuesAt([frame(0), f], 1, null);
    const c = [...all.sounds, ...all.map].filter((s) => s.name === "battle").map((s) => s.at);
    Assert.true(c.includes("ugarit"));
    Assert.true(c.includes("gaza"));
  });

  test("A crowded view hears only the nearest few of the map's sounds", () => {
    const lands = map.provinces.filter((p) => !p.isSea).slice(0, 12).map((p) => p.id);
    const moves = lands.map((p) => move("Egypt", "Army", p, p));
    const f = frame(1, { moves, seenBy: new Map([["Egypt", moves.map((_, i) => i)]]) });
    const c = cuesAt([frame(0), f], 1, "Egypt");
    Assert.true(c.map.length > MapHeard);
    const heard = schedule(c, { at: city(lands[0]), zoom: 3 }, 3000).filter((x) => x.name === "march");
    Assert.true(heard.length <= MapHeard);
  });
});
