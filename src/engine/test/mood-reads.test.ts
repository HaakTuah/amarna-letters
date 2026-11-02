import { describe, test } from "vitest";
import { TalkData, TurnEngine, moodsKnown, newCharacter, newGame, newGameConfig, newId, newMoodRead, newSkills, pruneMoodReads, type GameState, type MoodRead } from "@amarna/engine";
import { Assert, smallWorld } from "./support.ts";

// The mood of the land as each court knows it (item 17++, part C; "Who holds what, and the mood of the land"): dated reads
// from governors, spies, envoys, scribes, travellers and the court's own eyes, each known only from when it reaches the
// court. The starting world, with only the steps each test needs.
describe("MoodReadsTests", () => {
  // Couriers slowed (travelDays) where a test needs word to take seasons.
  const fresh = (travelDays = 45): GameState => smallWorld(newGame(1, newGameConfig({ catastropheChance: 0, travelDays })), "Babylonia", "Egypt", "Hatti");
  const readsOf = (s: GameState, p: string, source: MoodRead["source"]): MoodRead[] => s.moodReads.filter((r) => r.power === p && r.source === source);

  test("Every court starts seeing its own city, and only that", () => {
    const s = fresh();
    const e = new TurnEngine(s);
    for (const p of ["Egypt", "Hatti"] as const) {
      const known = moodsKnown(s, p);
      Assert.equal([e.courtAt(p)], [...known.keys()]);
      Assert.equal({ source: "court", seen: s.turn, known: s.turn }, (({ source, seen, known }) => ({ source, seen, known }))(known.get(e.courtAt(p))!));
    }
  });

  test("A quiet governed province is reported every season, though its governor writes only when the words change", () => {
    const s = fresh(5);
    const g = s.governors.find((x) => x.power === "Egypt" && x.province === "nubia")!;
    Assert.notNull(g);
    const e = new TurnEngine(s);
    // His letters of Nubia, at court or on the road.
    const letters = (): number =>
      s.inbox.get("Egypt").filter((i) => i.title === "Your governor writes" && i.body.includes("of Nubia")).length +
      s.journeys.filter((j) => j.kind === "Word" && (j.text ?? "").includes("Your governor writes") && (j.text ?? "").includes("of Nubia")).length;
    for (let i = 0; i < 2; i++) {
      const before = letters();
      const was = g.mood;
      e.obeySeason();
      const r = readsOf(s, "Egypt", "governor").find((x) => x.province === "nubia" && x.seen === s.turn)!;
      Assert.notNull(r);
      // The words of his letter, known when his letter would arrive.
      Assert.equal(g.mood, r.mood);
      Assert.equal(e.heardAt("Egypt", g.seat === "" ? g.province : g.seat), r.known);
      Assert.true(r.known > r.seen);
      Assert.equal(was === g.mood ? before : before + 1, letters());
      s.turn++;
    }
  });

  test("A spy's read of the province he watches reaches his master only with his report, dated when he saw it", () => {
    const s = fresh(5);
    const spy = newCharacter({ id: newId(s, "c"), name: "Watcher", status: "Employed", employer: "Egypt", duty: "SpyPosted", watchProvince: "nubia", skills: newSkills({ stealth: 100 }) });
    s.characters.push(spy);
    const e = new TurnEngine(s);
    const seen = s.turn;
    e.watchAndReport();
    const j = s.journeys.find((x) => x.kind === "SpyReport" && x.characterId === spy.id)!;
    Assert.equal(e.moodOf("nubia"), j.report!.mood);
    Assert.true(j.arriveTurn > seen);
    Assert.empty(readsOf(s, "Egypt", "spy"));
    s.turn = Math.max(s.turn, j.arriveTurn);
    e.arrivals();
    const r = readsOf(s, "Egypt", "spy").find((x) => x.province === "nubia")!;
    Assert.equal({ mood: e.moodOf("nubia"), seen, known: s.turn }, { mood: r.mood, seen: r.seen, known: r.known });
  });

  test("An envoy sees the mood of the court's city by his skill, carried home in his cargo", () => {
    const s = fresh();
    const c = newCharacter({ id: newId(s, "c"), name: "Envoy", status: "Employed", employer: "Egypt", duty: "EnvoyAtCourt", at: "Babylonia", skills: newSkills({ gather: 100 }) });
    s.characters.push(c);
    const e = new TurnEngine(s);
    const o = e.observe(c, "Babylonia");
    const city = e.courtAt("Babylonia");
    Assert.equal({ power: "Egypt", province: city, mood: e.moodOf(city), source: "envoy" }, (({ power, province, mood, source }) => ({ power, province, mood, source }))(o.mood!));
    Assert.true(o.observations.some((x) => x.startsWith(`The people of ${e.map.get(city).name} are`)));
    c.skills.gather = 0;
    Assert.null(e.observe(c, "Babylonia").mood);
  });

  test("A census brings its province's mood home with the count, dated when counted", () => {
    const s = fresh(5);
    const e = new TurnEngine(s);
    const prov = [...s.owner.entries()].find(([id, p]) => p === "Egypt" && e.wordTo("Egypt", id) > 0)![0];
    s.censuses.push({ power: "Egypt", province: prov, counted: s.turn, home: 0, count: null, mood: "" });
    const mood = e.moodOf(prov);
    const counted = s.turn;
    e.censusSeason();
    Assert.equal(mood, s.censuses[0].mood);
    Assert.empty(readsOf(s, "Egypt", "census"));
    while (s.censuses.length > 0) {
      s.turn++;
      e.censusSeason();
    }
    const r = readsOf(s, "Egypt", "census").find((x) => x.province === prov)!;
    Assert.equal({ mood, seen: counted, known: s.turn }, { mood: r.mood, seen: r.seen, known: r.known });
    Assert.true(s.inbox.get("Egypt").some((i) => i.title === "A census" && i.body.includes(`its people were ${mood}`)));
  });

  test("Travellers' talk of the land near the court is coarse, a region's worst, and heard a season later", () => {
    const s = fresh();
    const e = new TurnEngine(s);
    const court = e.courtAt("Hatti");
    const next = e.map.neighbors(court).find((x) => !e.map.get(x).isSea && s.owner.getOrDefault(x, null) !== null)!;
    s.restless.set(next, e.revoltAt(next) * 2);
    Assert.equal("near revolt", e.moodOf(next));
    e.travellersTalk();
    const talk = readsOf(s, "Hatti", "travellers");
    Assert.notEmpty(talk);
    for (const r of talk) Assert.equal(s.turn + TalkData.late, r.known);
    // Never how near a revolt is, and the trouble next door colours the talk of the land beside it.
    Assert.equal("restless", talk.find((r) => r.province === next)!.mood);
    for (const r of talk.filter((r) => e.map.neighbors(next).includes(r.province))) Assert.equal("restless", r.mood);
    // Its own city it sees for itself: no talk of it.
    Assert.false(talk.some((r) => r.province === court));
    Assert.false(moodsKnown(s, "Hatti").has(next));
    Assert.equal("restless", moodsKnown(s, "Hatti", s.turn + 1).get(next)!.mood);
    // Heard lately, it is not talked of again.
    e.travellersTalk();
    Assert.equal(talk.length, readsOf(s, "Hatti", "travellers").length);
  });

  test("A seat never gets a read it was not told, and the list keeps only the newest heard and those on their way", () => {
    const s = fresh();
    const e = new TurnEngine(s);
    e.obeySeason();
    e.travellersTalk();
    // Nubia is Egypt's, its governor reporting; Hatti hears nothing of it.
    Assert.true(s.moodReads.some((r) => r.power === "Egypt" && r.province === "nubia"));
    Assert.false(s.moodReads.some((r) => r.power === "Hatti" && r.province === "nubia"));
    for (const r of s.moodReads.filter((r) => r.source === "governor")) Assert.true(s.governors.some((g) => g.power === r.power && g.province === r.province));
    s.moodReads = [
      newMoodRead({ power: "Egypt", province: "nubia", mood: "uneasy", seen: 1, known: 2, source: "governor" }),
      newMoodRead({ power: "Egypt", province: "nubia", mood: "quiet", seen: 2, known: 3, source: "governor" }),
      newMoodRead({ power: "Egypt", province: "nubia", mood: "restless", seen: 3, known: 6, source: "governor" }),
    ];
    s.turn = 4;
    pruneMoodReads(s, () => true);
    Assert.equal(["quiet", "restless"], s.moodReads.map((r) => r.mood));
    Assert.equal("quiet", moodsKnown(s, "Egypt").get("nubia")!.mood);
    pruneMoodReads(s, (p) => p !== "Egypt");
    Assert.empty(s.moodReads);
  });
});
