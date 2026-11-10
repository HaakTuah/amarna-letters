import { describe, test } from "vitest";
import { WorldMap, newGame, newGameConfig, newGameEvent } from "@amarna/engine";
import { Assert } from "../../engine/test/support.ts";
import { momentsOf, seasonPlay } from "../src/map/moments.ts";
import { buildScene } from "../src/map/scene.ts";
import { frameFrom, type FramePerson, type SeasonFrame } from "../src/session/frames.ts";
import { PageGate } from "../src/session/page-gate.ts";
import { closingLine, Paces, paceSeason, type Moment } from "../src/session/pacing.ts";

const [Slow, Normal, Fast, Simulate] = Paces;
const m = (phase: Moment["phase"], kind: Moment["kind"], line: string): Moment => ({ phase, kind, line });

// Item 17+++, "the season plays out": a season's moments in sequence, paced by meaning, closed by a line of what changed.
describe("PacingTests", () => {
  test("A season plays in the engine's order: arrivals, marches, battles, sieges, then the falls, when its results land", () => {
    const t = paceSeason([m("fall", "great", "Sumur fell to Amurru"), m("battle", "great", "Gubla"), m("march", "routine", "a"), m("march", "routine", "b"), m("arrival", "great", "Hattusa"), m("siege", "routine", "the siege of Tunip pressed on")], Normal);
    Assert.equal(["arrival", "march", "march", "battle", "siege", "fall"], t.beats.map((b) => b.moment.phase));
    // Both marches move together, after the arrival; the results land as the fall begins; Normal plays it in about 6 s and
    // leaves a couple of seconds on the result.
    const arrival = t.beats[0];
    Assert.equal([arrival.ms, arrival.ms], t.beats.filter((b) => b.moment.phase === "march").map((b) => b.at));
    Assert.equal(arrival.ms, t.marchAt);
    const fall = t.beats.find((b) => b.moment.phase === "fall")!;
    Assert.equal(fall.at, t.landAt);
    Assert.equal(6000, Math.round(t.closeAt));
    Assert.equal(2000, Math.round(t.total - t.closeAt));
  });

  test("Slow plays a season in about 15 s, Normal in about 6, Fast in about a second of highlights", () => {
    const season = [m("march", "routine", "a"), m("battle", "great", "Gubla"), m("battle", "great", "Sumur"), m("battle", "great", "Qadesh"), m("arrival", "great", "Babylon")];
    const [slow, normal, fast] = [Slow, Normal, Fast].map((p) => paceSeason(season, p));
    Assert.true(slow.closeAt >= 12000 && slow.closeAt <= 16000, `Slow: ${slow.closeAt}`);
    Assert.true(slow.total - slow.closeAt >= 3000, "a few seconds on the result");
    Assert.true(Math.abs(normal.closeAt - 6000) <= 500, `Normal: ${normal.closeAt}`);
    Assert.equal(1000, fast.total);
    // At Fast the battles and the arrival flash together, after the units have slid to their places.
    Assert.equal([fast.marchMs], [...new Set(fast.beats.filter((b) => b.moment.kind === "great").map((b) => b.at))]);
    // A great moment is never cut below a second when it plays alone; a quiet season still plays at its calm length.
    Assert.true(slow.beats.concat(normal.beats).filter((b) => b.moment.kind === "great").every((b) => b.ms >= 1000));
    Assert.equal(Slow.least, paceSeason([m("march", "routine", "a")], Slow).closeAt);
  });

  test("A crowded season plays its greatest moments, a capital falling first, and at Fast that still takes its beat", () => {
    const fall = { ...m("fall", "great", "Hattusa fell to Mitanni"), big: true };
    const season = [...["A", "B", "C", "D", "E"].map((x) => m("battle", "great", x)), fall];
    const normal = paceSeason(season, Normal);
    Assert.equal(Normal.most, normal.beats.length);
    Assert.true(normal.beats.some((b) => b.moment === fall));
    const fast = paceSeason(season, Fast);
    const beat = fast.beats.find((b) => b.moment === fall)!;
    Assert.true(beat.ms >= 1000 && beat.at >= Fast.flash, "the fall takes its own beat after the flash");
    Assert.equal(fast.landAt, beat.at);
    // Two capitals falling run a Fast season past two seconds, and still the land changes at once there (part D).
    const two = paceSeason([m("march", "routine", "a"), fall, { ...m("fall", "great", "Sumur fell to Amurru"), big: true }], Fast);
    Assert.true(two.total > 2000);
    Assert.equal([true, true, false], [paceSeason(season, Slow).ground, normal.ground, two.ground]);
    Assert.equal("Hattusa fell to Mitanni; battles at A, B, C and two more.", closingLine(season, false));
  });

  test("Simulate has no pace: nothing waits", () => {
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

  test("An envoy caught on his last season of road never arrives: not for his king, his host, nor in god view", () => {
    const s = newGame(1, newGameConfig({ catastropheChance: 0 }));
    const f0 = frameFrom(s, 0, null);
    const envoy: FramePerson = { id: "c-envoy", name: "Mane", origin: "Egypt", calling: "Envoy", employer: "Egypt", status: "Employed", duty: "EnvoyOutbound", at: null, watch: null, mission: "Hatti", heldBy: null, secretMaster: null, currentTrail: null, formerEmployer: null, covers: [], confessed: null };
    const road = { id: "j-envoy", kind: "EnvoyOutbound" as const, depart: f0.turn - 1, arrive: f0.turn + 1, from: "Egypt" as const, to: "Hatti" as const, characterId: envoy.id, gold: 40, trailId: null, reportCourt: null, reportProvince: null, observedTurn: f0.turn, text: null };
    const before: SeasonFrame = { ...f0, journeys: [road], people: new Map([...f0.people, [envoy.id, envoy]]) };
    const after = (who: FramePerson): SeasonFrame => ({ ...f0, index: 1, turn: f0.turn + 1, journeys: [], people: new Map([...f0.people, [who.id, who]]) });
    const arrivals = (f1: SeasonFrame, viewer: "Egypt" | "Hatti" | "Mitanni" | null): string[] => momentsOf(buildScene([before, f1], 1, viewer)).filter((x) => x.phase === "arrival").map((x) => x.title);
    // Caught by Mitanni on his last road (travel.ts, caughtOnRoad): Egypt keeps a cover, Hatti never saw him.
    for (const believed of ["EnvoyOutbound", "EnvoyAtCourt"] as const) {
      const caught = after({ ...envoy, status: "Captured", heldBy: "Mitanni", duty: "None", covers: [{ for: "Egypt", believed, heldAt: null, whereText: "at the court of Hatti", province: null, court: "Hatti", timingText: "", since: f0.turn }] });
      for (const viewer of ["Egypt", "Hatti", "Mitanni", null] as const) Assert.true(arrivals(caught, viewer).length === 0, `${viewer ?? "god"} (Egypt believes ${believed})`);
    }
    // Received at Hattusa: his king, his host and god view see him arrive; a court with no part in it does not.
    const received = after({ ...envoy, duty: "EnvoyAtCourt", at: "Hatti" });
    for (const viewer of ["Egypt", "Hatti", null] as const) Assert.true(arrivals(received, viewer).length === 1, viewer ?? "god");
    Assert.equal([], arrivals(received, "Mitanni"));
  });

  test("Simulate runs with a human seat asleep, and stops only when something is asked of him", async () => {
    // The page's session talks to its worker (one is started as the module loads); here nothing answers.
    const had = globalThis.Worker;
    globalThis.Worker = class {
      postMessage(): void {}
    } as unknown as typeof Worker;
    try {
      const { Session } = await import("../src/session/client.ts");
      const s = new Session();
      s.live = { ...s.live, humans: ["Mitanni"], hasRunner: true, auto: true };
      s.setDelay(0);
      // Asleep: his entry asks nothing.
      s.asks = [{ power: "Mitanni", orders: null, audience: null }];
      Assert.true(s.simulating);
      // Woken for his orders: the simulation stops for him.
      s.asks = [{ power: "Mitanni", orders: s.asks[0].orders ?? ({} as never), audience: null }];
      Assert.false(s.simulating);
      // At another pace there is nothing to simulate.
      s.asks = [];
      s.setDelay(400);
      Assert.false(s.simulating);
    } finally {
      globalThis.Worker = had;
    }
  });
});
