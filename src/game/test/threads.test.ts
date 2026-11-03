import { describe, test } from "vitest";
import { Views, WorldMap, newGame, newSiege, newUnit, type Power } from "@amarna/engine";
import {
  GameLog,
  GameRunner,
  ScriptMind,
  TemplateNarrator,
  byStake,
  findThreads,
  newThread,
  seatThreads,
  threadWords,
  threadsFor,
  threadsKey,
  worldThreads,
  type ChronicleContext,
  type ThreadContext,
} from "@amarna/game";
import { scriptSeats, seasons } from "./small-world.ts";
import { Assert } from "../../engine/test/support.ts";

/** A narrator whose words show who told them and how many times it was asked. */
class Teller extends TemplateNarrator {
  override readonly label = "Teller";
  asked = 0;
  annals = 0;
  private readonly word: string;
  constructor(word: string) {
    super();
    this.word = word;
  }
  override threads(ctx: ThreadContext): Promise<string[]> {
    this.asked++;
    return Promise.resolve(ctx.threads.map((t) => `${this.word}: ${t.kind} at ${t.province}`));
  }
  override chronicle(ctx: ChronicleContext): Promise<string> {
    this.annals++;
    return Promise.resolve(`${this.word} annals of ${ctx.power}`);
  }
}

async function played(narrator: TemplateNarrator, n = 3): Promise<GameRunner> {
  const r = new GameRunner(newGame(5, seasons(n)), scriptSeats(5), new ScriptMind(), narrator);
  await r.prepare();
  while (await r.playTurn());
  return r;
}

// Item 17+++, part F: the threads to watch, found from what the engine released, ranked by the stake its model calls
// measure, worded by the narrator once and kept in the record; only what the eyes they were found for know.
describe("ThreadTests", () => {
  test("Troops in one's own capital come first, then the stake; each pair of eyes gets only its own", () => {
    const a = newThread({ court: "Egypt", kind: "envoy", moved: 0.9 });
    const b = newThread({ court: "Egypt", kind: "siege", moved: 0.2, capital: true });
    const c = newThread({ court: "Egypt", kind: "siege", moved: 0.4 });
    const god = newThread({ court: "", kind: "rising", moved: 5 });
    Assert.equal([b, a, c], [a, c, b].sort(byStake));
    Assert.equal([b, a, c], threadsFor([a, god, c, b], "Egypt"));
    Assert.equal([god], threadsFor([a, god, c, b], null));
    Assert.equal([], threadsFor([a, god, c, b], "Hatti"));
  });

  test("A capital a season from falling leads god view and its holder's seat, and a far court never hears of it", () => {
    const s = newGame(2, seasons(3));
    const assur = WorldMap.default.capital("Assyria").id;
    const u = newUnit({ id: "u-siege", power: "Mitanni", kind: "Army", province: assur, men: 5000 });
    s.units.push(u);
    s.sieges.push(newSiege({ province: assur, power: "Mitanni", unitId: u.id, since: s.turn - 1, progress: 100 }));
    const god = worldThreads(s, s.turn)[0];
    Assert.equal(["siege", assur, true, true], [god.kind, god.province, god.capital, god.soon]);
    Assert.contains("may fall to Mitanni next season", threadWords(god, {}));
    const holder = seatThreads(Views.for(s, "Assyria"), s)[0];
    Assert.equal(["Assyria", true], [holder.court, holder.capital]);
    Assert.contains("Your city of", threadWords(holder, {}));
    // Egypt's court knows nothing of a siege at Assur: no thread of it, though god view's leads with it.
    Assert.false(seatThreads(Views.for(s, "Egypt"), s).some((t) => t.province === assur));
    Assert.true(findThreads(s, s.turn).some((t) => t.court === "Assyria" && t.province === assur));
  });

  test("A bribed envoy on his road is god view's story; his own king sees only his letter away", async () => {
    const r = new GameRunner(newGame(5, seasons(4)), scriptSeats(5), new ScriptMind(), new TemplateNarrator());
    await r.prepare();
    let j = null;
    for (let i = 0; i < 4 && j === null; i++) {
      await r.playTurn();
      j = r.state.journeys.find((x) => x.kind === "EnvoyOutbound" && x.dispatch !== null && !x.dispatch.pretended && x.characterId !== null) ?? null;
    }
    Assert.true(j !== null);
    const s = r.state;
    const envoy = s.characters.find((c) => c.id === j!.characterId)!;
    const briber = (["Egypt", "Hatti", "Mitanni", "Assyria", "Babylonia"] as Power[]).find((p) => p !== j!.from && p !== j!.to)!;
    envoy.secretMaster = briber;
    const names = { [envoy.id]: envoy.name };
    const god = worldThreads(s, s.turn).find((t) => t.person === envoy.id)!;
    Assert.equal([j!.from, j!.to, briber, j!.dispatch!.trailId], [god.from, god.to, god.power, god.trail]);
    Assert.contains(`${envoy.name}, envoy of`, threadWords(god, names));
    Assert.contains(`pay`, threadWords(god, names));
    const own = seatThreads(Views.for(s, j!.from), s).find((t) => t.person === envoy.id)!;
    Assert.equal("", own.power);
    Assert.contains("is away with your letter", threadWords(own, names));
    Assert.false(threadWords(own, names).includes("pay"));
    // Where he goes, never where he is on his road.
    Assert.equal(WorldMap.default.capital(j!.to).id, own.province);
    // The briber's court is not shown his road: no seat is.
    Assert.false(seatThreads(Views.for(s, briber), s).some((t) => t.person === envoy.id));
  });

  test("Each season's threads are told once and kept; a replay reads them back and never tells them again", async () => {
    const teller = new Teller("First");
    const r = await played(teller);
    Assert.equal(3, teller.asked);
    const told = [1, 2, 3].map((t) => r.tellings(t));
    Assert.true(told.every((x) => x.length === 1));
    Assert.true(told.some((x) => x[0].length > 0));
    Assert.true(told.flat(2).every((t) => t.text.startsWith("First: ")));
    // God view's and the seats' own, each the few most at stake.
    Assert.true(told.flat(2).some((t) => t.court === ""));
    const back = GameLog.fromJsonl(r.log.toJsonl());
    const replay = GameRunner.forReplay(back);
    await replay.prepare();
    while (await replay.playTurn());
    Assert.equal(told, [1, 2, 3].map((t) => replay.tellings(t)));
  });

  test("Told anew at the owner's asking, the first telling stands beside the new, through a save and a replay", async () => {
    const r = await played(new Teller("First"), 2);
    const first = r.tellings(2)[0];
    Object.assign(r, { narrator: new Teller("Second") });
    const both = await r.tellThreadsAnew(2);
    Assert.equal(2, both.length);
    Assert.equal(first, both[0]);
    Assert.true(both[1].every((t) => t.text.startsWith("Second: ")));
    Assert.equal(first.map((t) => t.province), both[1].map((t) => t.province));
    Assert.equal(3, (await r.tellThreadsAnew(2)).length);
    const replay = GameRunner.forReplay(GameLog.fromJsonl(r.log.toJsonl()));
    await replay.prepare();
    while (await replay.playTurn());
    Assert.equal(r.tellings(2), replay.tellings(2));
    Assert.equal(1, replay.tellings(1).length);
  });

  test("The annals told anew stand beside the first, and a replay reads both back without writing again", async () => {
    const teller = new Teller("First");
    const r = await played(teller, 2);
    Assert.true(r.chronicles.size > 0);
    const written = teller.annals;
    Object.assign(r, { narrator: new Teller("Second") });
    await r.tellChroniclesAnew();
    const [p, text] = [...r.chronicles][0];
    Assert.contains("First annals", text);
    Assert.equal([`Second annals of ${p}`], r.chroniclesAnew.get(p));
    Assert.equal(written, teller.annals);
    const replay = GameRunner.forReplay(GameLog.fromJsonl(r.log.toJsonl()));
    await replay.prepare();
    while (await replay.playTurn());
    Assert.equal(text, replay.chronicles.get(p));
    Assert.equal([`Second annals of ${p}`], replay.chroniclesAnew.get(p));
  });

  test("A log with an older game's record, without threads, replays and has them told then", async () => {
    const r = await played(new TemplateNarrator(), 2);
    const lines = r.log
      .toJsonl()
      .split("\n")
      .filter((l) => !l.includes(`"key":"${threadsKey(1)}"`));
    const replay = GameRunner.forReplay(GameLog.fromJsonl(lines.join("\n")));
    await replay.prepare();
    while (await replay.playTurn());
    Assert.equal(r.tellings(1), replay.tellings(1));
  });

  test("A shared log whose threads are malformed fails to load, cleanly", () => {
    const good = newThread({ court: "", kind: "siege", province: "assur", from: "Mitanni", to: "Assyria", moved: 0.2, text: "Mitanni besieges Assur." });
    const line = (v: unknown): string => `{"type":"decision","key":"t2/threads","value":${JSON.stringify(v)}}`;
    Assert.true(GameLog.fromJsonl(line([good])).has("t2/threads"));
    for (const bad of [
      { ...good, kind: "murder" },
      { ...good, text: { x: "hello" } },
      { ...good, gold: 2.5 },
      { ...good, moved: "0.2" },
      { ...good, soon: "true" },
      { ...good, court: "Egypt\u0007" },
      { ...good, text: "x".repeat(3000) },
      { ...good, extra: 1 },
      Object.fromEntries(Object.entries(good).filter(([k]) => k !== "text")),
    ])
      Assert.throws(() => GameLog.fromJsonl(line([bad])));
    Assert.throws(() => GameLog.fromJsonl(line({ 0: good })));
  });
});
