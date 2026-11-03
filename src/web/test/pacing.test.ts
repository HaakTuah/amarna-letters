import { describe, test } from "vitest";
import { WorldMap, newGame, newGameConfig, newGameEvent } from "@amarna/engine";
import { Assert } from "../../engine/test/support.ts";
import { momentsOf, seasonPlay } from "../src/map/moments.ts";
import { buildScene } from "../src/map/scene.ts";
import { frameFrom, type SeasonFrame } from "../src/session/frames.ts";
import { PageGate } from "../src/session/page-gate.ts";
import { closingLine, Paces, paceSeason, type Moment } from "../src/session/pacing.ts";

const [Slow, Normal, Fast, Simulate] = Paces;
const m = (phase: Moment["phase"], kind: Moment["kind"], line: string): Moment => ({ phase, kind, line });

// Item 17+++, "the season plays out": a season's moments in sequence, paced by meaning, closed by a line of what changed.
describe("PacingTests", () => {
  test("A season plays in the engine's order: arrivals, marches, battles, sieges, then the falls, when its results land", () => {
    const t = paceSeason([m("fall", "great", "Sumur fell to Amurru"), m("battle", "great", "Gubla"), m("march", "routine", "a"), m("march", "routine", "b"), m("arrival", "great", "Hattusa"), m("siege", "routine", "the siege of Tunip pressed on")], Normal);
    Assert.equal(["arrival", "march", "march", "battle", "siege", "fall"], t.beats.map((b) => b.moment.phase));
    // Both marches move together, after the arrival; the results land as the fall begins, and the line closes it.
    Assert.equal([Normal.great, Normal.great], t.beats.filter((b) => b.moment.phase === "march").map((b) => b.at));
    Assert.equal(Normal.great, t.marchAt);
    const fall = t.beats.find((b) => b.moment.phase === "fall")!;
    Assert.equal(fall.at, t.landAt);
    Assert.equal(fall.at + Normal.great, t.closeAt);
    Assert.equal(t.closeAt + Normal.close, t.total);
  });

  test("At fast speed the routine compresses while a great moment still lasts long enough to take in", () => {
    const season = [m("march", "routine", "a"), m("battle", "great", "Gubla"), m("battle", "great", "Sumur"), m("battle", "great", "Qadesh")];
    const slow = paceSeason(season, Slow);
    const fast = paceSeason(season, Fast);
    Assert.true(fast.marchMs < slow.marchMs / 3);
    Assert.true(Paces.slice(0, 3).every((p) => p.great >= 1000), "a great moment is never cut below a second");
    // One battle at a time when slow; two side by side when fast.
    Assert.equal([1600, 4200, 6800], slow.beats.filter((b) => b.moment.phase === "battle").map((b) => b.at));
    Assert.equal([350, 350, 1550], fast.beats.filter((b) => b.moment.phase === "battle").map((b) => b.at));
    Assert.true(fast.total < slow.total / 2);
  });

  test("A crowded season plays its greatest moments, a fall before a battle, and tells the rest", () => {
    const season = [...["A", "B", "C", "D", "E"].map((x) => m("battle", "great", x)), m("fall", "great", "Sumur fell to Amurru")];
    const t = paceSeason(season, Fast);
    const played = t.beats.map((b) => b.moment.line);
    Assert.equal(Fast.most, played.length);
    Assert.true(played.includes("Sumur fell to Amurru"));
    Assert.equal("Sumur fell to Amurru; battles at A, B, C and two more.", closingLine(season, false));
  });

  test("Simulate skips to the result: nothing waits", () => {
    const t = paceSeason([m("march", "routine", "a"), m("battle", "great", "Gubla"), m("fall", "great", "Sumur fell to Amurru")], Simulate);
    Assert.equal(0, t.total);
    Assert.equal(0, t.beats.filter((b) => b.moment.kind === "great").length);
  });

  test("The closing line says what changed, the greatest first, and a quiet season as quiet", () => {
    const season = [m("arrival", "great", "Babylon"), m("march", "routine", "a"), m("march", "routine", "b"), m("siege", "routine", "the siege of Tunip pressed on"), m("disaster", "news", "of plague in Mitanni")];
    Assert.equal("An envoy reached Babylon; two columns on the march; the siege of Tunip pressed on; word came of plague in Mitanni.", closingLine(season, true));
    Assert.equal("A quiet season.", closingLine([], false));
    Assert.equal("A quiet season, as far as word has reached you.", closingLine([], true));
  });

  test("Only what the seat knows plays: a raid it saw is a scene, one beyond its sight is news, one it never heard of is nothing", () => {
    const s = newGame(1, newGameConfig({ catastropheChance: 0 }));
    const f0 = frameFrom(s, 0, null);
    const place = WorldMap.default.landProvinces.find((p) => p.id !== WorldMap.default.capital("Egypt").id && /^[A-Z][a-z]+$/u.test(p.name))!;
    const raid = newGameEvent({ turn: 1, kind: "caravan-robbed", text: `Outlaws robbed Egypt's caravan near ${place.name}.`, visibleTo: ["Egypt"] });
    const f1: SeasonFrame = { ...f0, index: 1, turn: f0.turn + 1, events: [raid] };
    const seen = (sight: Set<string>): SeasonFrame => ({ ...f0, sight: new Map([...f0.sight, ["Egypt", sight]]) });
    const kinds = (frames: SeasonFrame[], viewer: "Egypt" | "Hatti" | null): string[] => momentsOf(buildScene(frames, 1, viewer)).filter((x) => x.phase === "disaster").map((x) => x.kind);
    Assert.equal(["great"], kinds([seen(new Set([place.id])), f1], "Egypt"));
    Assert.equal(["news"], kinds([seen(new Set()), f1], "Egypt"));
    Assert.equal([], kinds([f0, f1], "Hatti"));
    Assert.equal(["great"], kinds([f0, f1], null));
    // Told as news, with no place given away and no medallion drawn.
    const egypt = seasonPlay(buildScene([seen(new Set()), f1], 1, "Egypt"), 1);
    Assert.true(egypt.line.includes("Word came of a caravan robbed on the road"), egypt.line);
    Assert.false(egypt.line.includes(place.name), egypt.line);
  });

  test("The worker plays one season ahead of what the page shows, and none ahead while a human seat is awake", async () => {
    const gate = new PageGate();
    // The opening (frame 0) is sent; season 1 may be computed at once, while the page shows the opening.
    Assert.true(gate.ready(1, true));
    Assert.false(gate.ready(2, true), "season 2 waits until the page has played the opening");
    gate.told(0);
    Assert.true(gate.ready(2, true));
    Assert.false(gate.ready(2, false), "a human seat sees season 1 play out before he is asked again");
    gate.told(1);
    Assert.true(gate.ready(2, false));
    // A wait ends when the page answers, or when auto-play stops.
    let on = true;
    const waited = gate.wait(() => on, () => gate.ready(4, true));
    gate.told(2);
    await waited;
    const stopped = gate.wait(() => on, () => gate.ready(9, true));
    on = false;
    gate.wake();
    await stopped;
  });
});
