import { describe, test } from "vitest";
import { WorldMap, newGameEvent, type Power } from "@amarna/engine";
import { Assert } from "../../engine/test/support.ts";
import { bedAt, cuesAt, hearing, moodAt, shadeAt } from "../src/audio/situation.ts";
import type { FrameMove, SeasonFrame } from "../src/session/frames.ts";

// Item 19+++: the music follows the seat's situation as that seat knows it, and a season's sounds what it saw. Each test
// builds only the frames it needs, by hand: two powers, a province or two, no game.
function frame(index: number, over: Partial<SeasonFrame> = {}): SeasonFrame {
  return {
    index, turn: index + 1, ended: false, endReason: null, winners: [], owner: new Map(), walls: new Map(), knownWalls: new Map(),
    knownOwner: new Map(), sieges: [], units: [], moves: [], seenBy: new Map(), sight: new Map(), journeys: [], people: new Map(),
    sleep: new Map(), eliminated: new Set(), events: [], news: [], inboxCount: new Map(), openAge: false, ageBand: "Usual",
    ageEnded: null, climate: [], bands: [], built: new Map(), stores: new Map(), settled: new Map(), fed: new Map(),
    unrest: new Map(), caravans: [], walking: [], omen: "Quiet", ...over,
  } as SeasonFrame;
}

const attack = (power: Power, target: string, targetOwner: Power): FrameMove =>
  ({ power, kind: "Army", from: "x", order: "move", target, to: target, helped: null, succeeded: false, destroyed: false, targetOwner }) as FrameMove;

const known = (viewer: Power, owners: Record<string, Power | null>, turn = 1) =>
  new Map([[viewer, new Map(Object.entries(owners).map(([k, v]) => [k, { owner: v, turn }]))]]);

describe("AudioSituationTests", () => {
  test("A seat at peace hears calm; a fight it saw is battle, then war for three seasons", () => {
    const quiet = [frame(0), frame(1)];
    Assert.equal("calm", moodAt(quiet, 1, "Egypt"));
    const fight = frame(2, { moves: [attack("Hatti", "gaza", "Egypt")], seenBy: new Map([["Egypt", [0]]]) });
    const frames = [frame(0), frame(1), fight, frame(3), frame(4), frame(5)];
    Assert.equal("battle", moodAt(frames, 2, "Egypt"));
    Assert.equal("war", moodAt(frames, 3, "Egypt"));
    Assert.equal("war", moodAt(frames, 4, "Egypt"));
    Assert.equal("calm", moodAt(frames, 5, "Egypt"));
  });

  test("A fight the seat did not see, or that was not its own, leaves its music calm", () => {
    const unseen = frame(1, { moves: [attack("Hatti", "gaza", "Egypt")], seenBy: new Map([["Egypt", []]]) });
    Assert.equal("calm", moodAt([frame(0), unseen], 1, "Egypt"));
    const others = frame(1, { moves: [attack("Hatti", "ugarit", "Mitanni")], seenBy: new Map([["Egypt", [0]]]) });
    Assert.equal("calm", moodAt([frame(0), others], 1, "Egypt"));
    // In god view the whole map: anyone's fight is battle.
    Assert.equal("battle", moodAt([frame(0), others], 1, null));
  });

  test("A siege of the seat's city, as it knows the city's owner, is siege; grave omens are the last seasons", () => {
    const sieged = frame(1, { sieges: [{ province: "gaza", besieger: "Hatti", progress: 1, walls: 2, since: 1 }], knownOwner: known("Egypt", { gaza: "Egypt" }) });
    Assert.equal("siege", moodAt([frame(0), sieged], 1, "Egypt"));
    Assert.equal("calm", moodAt([frame(0), sieged], 1, "Babylonia"));
    Assert.equal("last", moodAt([frame(0), frame(1, { omen: "Grave" })], 1, "Egypt"));
    Assert.equal("tension", moodAt([frame(0), frame(1, { omen: "Troubled" })], 1, "Egypt"));
  });

  test("Foreign troops in the seat's land, in its sight, are tension", () => {
    const f = frame(1, {
      units: [{ id: "u1", power: "Hatti", kind: "Army", province: "gaza" }],
      knownOwner: known("Egypt", { gaza: "Egypt" }),
      sight: new Map([["Egypt", new Set(["gaza"])]]),
    } as Partial<SeasonFrame>);
    Assert.equal("tension", moodAt([frame(0), f], 1, "Egypt"));
  });

  test("Its own capital lost brings the capital's sting and The City Falls; the taker hears its triumph", () => {
    const capital = WorldMap.default.provinces.find((p) => p.capital && p.home === "Egypt")!.id;
    const before = frame(0, { knownOwner: known("Egypt", { [capital]: "Egypt" }) });
    const after = frame(1, { knownOwner: known("Egypt", { [capital]: "Hatti" }) });
    const c = cuesAt([before, after], 1, "Egypt");
    Assert.equal("capital", c.sting);
    Assert.equal("fall", c.moment);
    const b2 = frame(0, { knownOwner: known("Hatti", { [capital]: "Egypt" }) });
    const a2 = frame(1, { knownOwner: known("Hatti", { [capital]: "Hatti" }) });
    Assert.equal("triumph", cuesAt([b2, a2], 1, "Hatti").moment);
  });

  test("The first blow of a war sounds Egypt's trumpets in Egypt's seat and a war horn in the others; at most three sounds", () => {
    const fight = (v: Power): SeasonFrame[] => [
      frame(0),
      frame(1, {
        moves: [attack("Hatti", "gaza", "Egypt"), attack("Egypt", "kadesh", "Hatti")],
        seenBy: new Map([[v, [0, 1]]]),
        events: [newGameEvent({ kind: "revolt", visibleTo: [v] }), newGameEvent({ kind: "catastrophe", visibleTo: [v] })],
      }),
    ];
    const e = cuesAt(fight("Egypt"), 1, "Egypt").sounds.map((c) => c.name);
    Assert.true(e.includes("war_trumpet"));
    Assert.false(e.includes("war_horn"));
    Assert.true(cuesAt(fight("Hatti"), 1, "Hatti").sounds.some((c) => c.name === "war_horn"));
    Assert.true(e.length <= 3);
    // A second season of fighting is a battle, not a new war.
    const frames = [...fight("Egypt"), frame(2, { moves: [attack("Hatti", "gaza", "Egypt")], seenBy: new Map([["Egypt", [0]]]) })];
    Assert.false(cuesAt(frames, 2, "Egypt").sounds.some((c) => c.name === "war_trumpet"));
    // The battle is placed where it was fought; the war's first horn is the court's, heard at any zoom.
    Assert.equal("gaza", cuesAt(frames, 2, "Egypt").sounds.find((c) => c.name === "battle")!.at);
    Assert.null(cuesAt(fight("Egypt"), 1, "Egypt").sounds.find((c) => c.name === "war_trumpet")!.at);
  });

  test("The age's end brings its sting and the last seasons' piece", () => {
    const c = cuesAt([frame(0), frame(1, { ended: true })], 1, null);
    Assert.equal("end", c.sting);
    Assert.equal("ended", c.moment);
  });

  test("The world's bed follows the map: none in the wide view, a siege camp by a siege, a market close in on a town", () => {
    const place = (id: string) => {
      const p = WorldMap.default.get(id);
      return { x: p.lon * 10, y: -p.lat * 10 };
    };
    const at = place("babylon");
    // The world's bed is heard at every zoom.
    Assert.equal("nile", bedAt(frame(0), at, 1, null, place));
    Assert.equal("market", bedAt(frame(0), at, 5, null, place));
    Assert.equal("nile", bedAt(frame(0), at, 2.5, null, place));
    const sieged = frame(0, { sieges: [{ province: "babylon", besieger: "Assyria", progress: 1, walls: 2, since: 1 }] });
    Assert.equal("siege", bedAt(sieged, at, 2.5, null, place));
  });

  test("A placed sound is silent zoomed out and heard zoomed in, louder the nearer, on its side of the screen", () => {
    const at = { x: 500, y: 300 };
    Assert.equal(0, hearing(at, { at, zoom: 1 }, 1000).gain);
    Assert.equal(1, hearing(at, { at, zoom: 4 }, 1000).gain);
    const near = hearing({ x: 560, y: 300 }, { at, zoom: 4 }, 1000);
    const far = hearing({ x: 900, y: 300 }, { at, zoom: 4 }, 1000);
    Assert.true(near.gain > far.gain);
    Assert.true(near.pan > 0);
    Assert.equal(0, far.gain);
    // A court's own sound has no place: always heard whole.
    Assert.equal(1, hearing(null, { at, zoom: 1 }, 1000).gain);
  });

  test("A siege begun out of the seat's sight is never placed there", () => {
    const hidden = { province: "babylon", besieger: "Assyria" as Power, progress: 0, walls: 2, since: 1 };
    const f = frame(1, { sieges: [hidden], sight: new Map([["Egypt", new Set(["gaza"])]]), events: [newGameEvent({ kind: "siege", signal: "siege-begun", visibleTo: ["Egypt"] })] });
    Assert.null(cuesAt([frame(0), f], 1, "Egypt").sounds.find((c) => c.name === "siege")!.at);
    const mine = { province: "gaza", besieger: "Egypt" as Power, progress: 0, walls: 2, since: 1 };
    const g = frame(1, { sieges: [hidden, mine], sight: new Map([["Egypt", new Set(["gaza"])]]), events: f.events });
    Assert.equal("gaza", cuesAt([frame(0), g], 1, "Egypt").sounds.find((c) => c.name === "siege")!.at);
  });

  test("The shade: darkest in battle, darker at war or in hunger, brighter at a feast, its own otherwise", () => {
    const fight = frame(2, { moves: [attack("Hatti", "gaza", "Egypt")], seenBy: new Map([["Egypt", [0]]]) });
    const frames = [frame(0), frame(1), fight, frame(3), frame(4, { events: [newGameEvent({ kind: "harvest", visibleTo: ["Egypt"] })] }), frame(5), frame(6)];
    Assert.equal(0, shadeAt(frames, 1, "Egypt"));
    Assert.equal(-2, shadeAt(frames, 2, "Egypt"));
    Assert.equal(-1, shadeAt(frames, 3, "Egypt"));
    Assert.equal(-1, shadeAt(frames, 4, "Egypt"));
    Assert.equal(0, shadeAt(frames, 6, "Egypt"));
    const feast = [frame(0), frame(1, { events: [newGameEvent({ kind: "harvest", visibleTo: ["Egypt"] })] })];
    Assert.equal(1, shadeAt(feast, 1, "Egypt"));
    const hungry = [frame(0), frame(1, { events: [newGameEvent({ kind: "harvest", visibleTo: ["Egypt"] }), newGameEvent({ kind: "hunger", visibleTo: ["Egypt"] })] })];
    Assert.equal(-1, shadeAt(hungry, 1, "Egypt"));
  });

  test("In god view a great king's fall is a great moment; a city-state's falls quietly", () => {
    Assert.equal("king", cuesAt([frame(0), frame(1, { eliminated: new Set(["Mitanni"]) })], 1, null).sting);
    Assert.null(cuesAt([frame(0), frame(1, { eliminated: new Set(["Byblos"]) })], 1, null).sting);
    Assert.equal("king", cuesAt([frame(0), frame(1, { eliminated: new Set(["Byblos"]) })], 1, "Byblos").sting);
  });
});
