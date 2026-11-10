import { describe, test } from "vitest";
import { WorldMap, newGameEvent, type Power } from "@amarna/engine";
import { Assert } from "../../engine/test/support.ts";
import { Heat, Hold, MoodDirector, Skirmish, shadeAt, signalAt } from "../src/audio/mood.ts";
import type { FrameMove, SeasonFrame } from "../src/session/frames.ts";
import { frame } from "./audio-frame.ts";

// Item 19+++b: the music follows the seat's state as that seat knows it, from a heat that rises fast and cools slow. Each
// test builds only the frames it needs, by hand: two or three powers, a province or two, no game.
const attack = (power: Power, target: string, targetOwner: Power, from = "x"): FrameMove =>
  ({ power, kind: "Army", from, order: "move", target, to: target, helped: null, succeeded: false, destroyed: false, targetOwner }) as FrameMove;

const known = (viewer: Power, owners: Record<string, Power | null>, turn = 1) =>
  new Map([[viewer, new Map(Object.entries(owners).map(([k, v]) => [k, { owner: v, turn }]))]]);

const egyptsCapital = WorldMap.default.provinces.find((p) => p.capital && p.home === "Egypt")!.id;

/** A season in which the seat saw these moves. */
const fight = (i: number, viewer: Power, moves: FrameMove[], over: Partial<SeasonFrame> = {}): SeasonFrame =>
  frame(i, { moves, seenBy: new Map([[viewer, moves.map((_, k) => k)]]), ...over } as Partial<SeasonFrame>);

/** The director's moods over a game: each season shown `gap` seconds after the last, the mood asked every second. */
function play(frames: SeasonFrame[], viewer: Power | null, gap: number, tail = 0): string[] {
  const d = new MoodDirector();
  const out: string[] = [];
  let t = 0;
  frames.forEach((_, i) => {
    d.season(frames, i, viewer, "g", t);
    for (let s = 0; s < gap; s++) out.push(d.at(t + s));
    t += gap;
  });
  for (let s = 0; s < tail; s++) out.push(d.at(t + s));
  return out;
}

/** The moods heard, in order, each once (a run of the same counted as one). */
const runs = (moods: string[]): string[] => moods.filter((m, i) => i === 0 || moods[i - 1] !== m);

describe("AudioMoodTests", () => {
  test("A real battle is battle; a skirmish with a city-state adds only a little, a fight the seat did not see nothing", () => {
    // Against a Great King, or in its own land, or sizeable: a real battle.
    Assert.equal(Heat.battle, signalAt([frame(0), fight(1, "Egypt", [attack("Egypt", "kadesh", "Hatti")])], 1, "Egypt").heat);
    Assert.equal("battle", signalAt([frame(0), fight(1, "Egypt", [attack("Byblos", "gaza", "Egypt")], { knownOwner: known("Egypt", { gaza: "Egypt" }) })], 1, "Egypt").top);
    const big = [attack("Egypt", "byblos", "Byblos"), attack("Egypt", "byblos", "Byblos", "y"), { ...attack("Byblos", "byblos", "Byblos"), from: "byblos", order: "hold", target: null }];
    Assert.equal(Heat.battle, signalAt([frame(0), fight(1, "Egypt", big as FrameMove[])], 1, "Egypt").heat);
    // One unit against a city-state abroad: a skirmish, its drums, a little heat.
    const small = signalAt([frame(0), fight(1, "Egypt", [attack("Egypt", "byblos", "Byblos")])], 1, "Egypt");
    Assert.equal([0, Skirmish.add, null], [small.heat, small.add, small.top]);
    Assert.equal(0, signalAt([frame(0), frame(1, { moves: [attack("Hatti", "gaza", "Egypt")], seenBy: new Map([["Egypt", []]]) })], 1, "Egypt").heat);
    Assert.equal(0, signalAt([frame(0), fight(1, "Egypt", [attack("Hatti", "ugarit", "Mitanni")])], 1, "Egypt").heat);
  });

  test("Its land besieged is the siege's music, its capital attacked lets the music rise at once; a siege it lays is war", () => {
    const siege = (province: string, besieger: Power) => ({ province, besieger, progress: 1, walls: 2, since: 1 });
    const sight = new Map([["Egypt" as Power, new Set(["gaza", egyptsCapital])]]);
    const owns = known("Egypt", { gaza: "Egypt", [egyptsCapital]: "Egypt" });
    const at = (s: ReturnType<typeof siege>) => signalAt([frame(0), frame(1, { sieges: [s], knownOwner: owns, sight } as Partial<SeasonFrame>)], 1, "Egypt");
    Assert.equal([Heat.battle, "siege", false], ((x) => [x.heat, x.top, x.capital])(at(siege("gaza", "Hatti"))));
    Assert.true(at(siege(egyptsCapital, "Hatti")).capital);
    Assert.equal([Heat.war, null], ((x) => [x.heat, x.top])(at(siege("kadesh", "Egypt"))));
    // A siege out of its sight, or of a city it does not know is its own, tells it nothing.
    Assert.equal(0, signalAt([frame(0), frame(1, { sieges: [siege("gaza", "Hatti")], knownOwner: owns })], 1, "Egypt").heat);
  });

  test("Foreign troops, troubled omens and rumours are unease; grave omens the last seasons below war; the end the last", () => {
    const units = [{ id: "u1", power: "Hatti" as Power, kind: "Army" as const, province: "gaza" }];
    const troops = frame(1, { units, knownOwner: known("Egypt", { gaza: "Egypt" }), sight: new Map([["Egypt", new Set(["gaza"])]]) } as Partial<SeasonFrame>);
    Assert.equal(Heat.unease, signalAt([frame(0), troops], 1, "Egypt").heat);
    Assert.equal(Heat.unease, signalAt([frame(0), frame(1, { omen: "Troubled" })], 1, "Egypt").heat);
    Assert.equal(["last", "last"], [runs(play([frame(0), frame(1, { omen: "Grave" })], "Egypt", 5)).at(-1), runs(play([frame(0), frame(1, { ended: true })], "Egypt", 5)).at(-1)]);
    // At war, grave omens do not quiet the war.
    const war = [frame(0), fight(1, "Egypt", [attack("Egypt", "kadesh", "Hatti")]), frame(2, { omen: "Grave" })];
    Assert.equal("battle", play(war, "Egypt", 5).at(-1));
  });

  test("It rises at once and falls one step at a time, each mood held about 90 s, watched at speed", () => {
    // A battle at the third season, then quiet; a season every 6 s (Normal), cooling by seconds, the slower clock there.
    const frames = [frame(0), frame(1), fight(2, "Egypt", [attack("Hatti", "gaza", "Egypt")], { knownOwner: known("Egypt", { gaza: "Egypt" }) })];
    for (let i = 3; i < 80; i++) frames.push(frame(i));
    const moods = play(frames, "Egypt", 6);
    Assert.equal(["calm", "battle", "war", "tension", "calm"], runs(moods));
    // The rise came with the battle's season; each step down came no sooner than the hold.
    Assert.equal(12, moods.indexOf("battle"));
    Assert.true(moods.indexOf("war") - moods.indexOf("battle") >= Hold);
    Assert.true(moods.indexOf("tension") - moods.indexOf("war") >= Hold);
    Assert.true(moods.lastIndexOf("tension") + 1 - moods.indexOf("tension") >= Hold);
  });

  test("Played a season at a time it cools by seasons: a long look at one season keeps its mood", () => {
    const frames = [frame(0), fight(1, "Egypt", [attack("Egypt", "kadesh", "Hatti")])];
    for (let i = 2; i < 12; i++) frames.push(frame(i));
    // Ten minutes on each season: the heat cools only as seasons pass.
    const moods = play(frames, "Egypt", 600);
    Assert.equal(["calm", "battle", "war", "tension", "calm"], runs(moods));
    Assert.equal("battle", moods[2 * 600 - 1]);
    // Battle for two seasons, war for two, tension for three.
    Assert.equal([2, 2, 3], ["battle", "war", "tension"].map((m) => moods.filter((x) => x === m).length / 600));
  });

  test("A mood just entered holds against a rise, unless the seat's own capital is attacked", () => {
    const owns = { knownOwner: known("Egypt", { gaza: "Egypt", [egyptsCapital]: "Egypt" }), sight: new Map([["Egypt" as Power, new Set(["gaza", egyptsCapital])]]) };
    const units = [{ id: "u1", power: "Hatti" as Power, kind: "Army" as const, province: "gaza" }];
    const uneasy = frame(1, { units, ...owns } as Partial<SeasonFrame>);
    // Troops in its land bring tension; the battle a season later waits out the hold.
    const battle = [frame(0), uneasy, fight(2, "Egypt", [attack("Hatti", "gaza", "Egypt")], owns)];
    Assert.equal("tension", play(battle, "Egypt", 6).at(-1));
    const capital = [frame(0), uneasy, fight(2, "Egypt", [attack("Hatti", egyptsCapital, "Egypt")], owns)];
    Assert.equal("battle", play(capital, "Egypt", 6).at(-1));
  });

  test("A heat between a mood's two thresholds keeps it: hard to enter, easy to stay", () => {
    const units = [{ id: "u1", power: "Hatti" as Power, kind: "Army" as const, province: "gaza" }];
    const troops = (i: number) => frame(i, { units, knownOwner: known("Egypt", { gaza: "Egypt" }), sight: new Map([["Egypt", new Set(["gaza"])]]) } as Partial<SeasonFrame>);
    // Skirmishes with a city-state, season after season, climb to war at most, never to battle.
    const skirmishes = [frame(0)];
    for (let i = 1; i < 30; i++) skirmishes.push(fight(i, "Egypt", [attack("Egypt", "byblos", "Byblos")]));
    Assert.equal(["calm", "tension", "war"], runs(play(skirmishes, "Egypt", 6)));
    // Foreign troops standing in its land keep the music in tension, however long, and never above it.
    const standing = [frame(0)];
    for (let i = 1; i < 40; i++) standing.push(troops(i));
    Assert.equal(["calm", "tension"], runs(play(standing, "Egypt", 6)));
  });

  test("A jump or a change of eyes starts afresh from the seasons before, as if long past", () => {
    const frames = [frame(0), frame(1), fight(2, "Egypt", [attack("Egypt", "kadesh", "Hatti")]), frame(3), frame(4)];
    const d = new MoodDirector();
    d.season(frames, 0, "Egypt", "g:Egypt", 0);
    // Straight to the battle: battle at once, hold or no hold.
    d.season(frames, 2, "Egypt", "g:Egypt", 1);
    Assert.equal("battle", d.at(1));
    // Back a season and on to the one after the battle: its heat cooled one season, entered afresh as war.
    d.season(frames, 0, "Egypt", "g:Egypt", 1);
    d.season(frames, 3, "Egypt", "g:Egypt", 1);
    Assert.equal("war", d.at(1));
    // The same season through Hatti's eyes, who saw nothing of it: calm at once.
    d.season(frames, 3, "Hatti", "g:Hatti", 2);
    Assert.equal("calm", d.at(2));
  });

  test("God view follows the world's temperature: the Great Kings' wars, their capitals, little for the city-states", () => {
    const all = (i: number, moves: FrameMove[], over: Partial<SeasonFrame> = {}) => frame(i, { moves, ...over });
    // A city-state's war, season after season: calm.
    const small = [frame(0)];
    for (let i = 1; i < 30; i++) small.push(all(i, [attack("Byblos", "sidon", "Sidon")]));
    Assert.equal(["calm"], runs(play(small, null, 2)));
    // Two Great Kings at war: tension; three or more: war; a great battle between them: battle.
    const pair = [frame(0)];
    for (let i = 1; i < 30; i++) pair.push(all(i, [attack("Egypt", "kadesh", "Hatti")]));
    Assert.equal(["calm", "tension"], runs(play(pair, null, 2)));
    const three = [frame(0)];
    for (let i = 1; i < 30; i++) three.push(all(i, [attack("Egypt", "kadesh", "Hatti"), attack("Assyria", "babylon", "Babylonia")]));
    Assert.equal(["calm", "war"], runs(play(three, null, 2)));
    const great = [attack("Egypt", "kadesh", "Hatti"), attack("Egypt", "kadesh", "Hatti", "y"), { ...attack("Hatti", "kadesh", "Hatti"), from: "kadesh", order: "hold", target: null }];
    Assert.equal("battle", signalAt([frame(0), all(1, great as FrameMove[])], 1, null).top);
    Assert.equal(Heat.battle, signalAt([frame(0), all(1, great as FrameMove[])], 1, null).heat);
    // A Great King's capital besieged: the siege's music.
    const siege = { province: egyptsCapital, besieger: "Hatti" as Power, progress: 1, walls: 2, since: 1 };
    const s = signalAt([frame(0), frame(1, { sieges: [siege], owner: new Map([[egyptsCapital, "Egypt" as Power]]) })], 1, null);
    Assert.equal([Heat.battle, "siege"], [s.heat, s.top]);
  });

  test("The shade: darkest in battle, darker at war or in hunger, brighter at a feast, its own otherwise", () => {
    const frames = [frame(0), frame(1), fight(2, "Egypt", [attack("Hatti", "gaza", "Egypt")]), frame(3), frame(4, { events: [newGameEvent({ kind: "harvest", visibleTo: ["Egypt"] })] }), frame(5), frame(6)];
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
});
