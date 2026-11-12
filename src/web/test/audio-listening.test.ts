import { describe, test } from "vitest";
import { WorldMap, type Power } from "@amarna/engine";
import { Assert } from "../../engine/test/support.ts";
import { earsOf, busiest, characterSignal, realmOfCharacter } from "../src/audio/listening.ts";
import { Heat } from "../src/audio/mood.ts";
import type { FrameMove, FramePerson, SeasonFrame } from "../src/session/frames.ts";
import { frame } from "./audio-frame.ts";

// Item 19+++c: a spectator hears the realm he watches, the character he follows, or, drifting, the world's heat in the
// music of the realm doing the most. Hand-built frames, no game.
const capitalOf = (p: Power) => WorldMap.default.provinces.find((x) => x.capital && x.home === p)!.id;
const attack = (power: Power, target: string, targetOwner: Power, from = "x"): FrameMove =>
  ({ power, kind: "Army", from, order: "move", target, to: target, helped: null, succeeded: false, destroyed: false, targetOwner }) as FrameMove;
const envoy = (employer: Power, at: Power): FramePerson =>
  ({ id: "c1", name: "Ra", origin: "", calling: "Envoy", employer, status: "Employed", duty: "Idle", at, watch: null, mission: null, heldBy: null, secretMaster: null, currentTrail: null, formerEmployer: null, covers: [], confessed: null }) as unknown as FramePerson;

describe("AudioListeningTests", () => {
  test("A player hears his own seat; a spectator the character he follows, else the realm he watches, else the world", () => {
    Assert.equal("own", earsOf("Egypt", true, false));
    Assert.equal("own", earsOf("Egypt", true, true));
    Assert.equal("character", earsOf("Egypt", false, true));
    Assert.equal("character", earsOf(null, false, true));
    Assert.equal("realm", earsOf("Hatti", false, false));
    Assert.equal("world", earsOf(null, false, false));
  });

  test("A followed character's own battle, danger and captivity, in his realm's music; the rest of the world's wars not at all", () => {
    const home = capitalOf("Egypt");
    const person = new Map([["c1", envoy("Egypt", "Egypt")]]);
    const season = (i: number, over: Partial<SeasonFrame> = {}) => frame(i, { people: person, ...over } as Partial<SeasonFrame>);
    // He stands at his court, a Great King's army attacks it: his battle.
    const battle = [season(0), season(1, { moves: [attack("Hatti", home, "Egypt")] })];
    const s = characterSignal(battle, 1, null, "c1");
    Assert.equal([Heat.battle, "battle", true], [s.heat, s.top, s.clear]);
    Assert.equal("Egypt", realmOfCharacter(battle[1], null, "c1"));
    // A war elsewhere is not his.
    const elsewhere = [season(0), season(1, { moves: [attack("Hatti", "gaza", "Mitanni"), attack("Egypt", "kadesh", "Hatti")] })];
    Assert.equal(0, characterSignal(elsewhere, 1, null, "c1").heat);
    // An army setting out from his province to fight elsewhere is not a battle where he stands.
    const leaving = [season(0), season(1, { moves: [attack("Egypt", "kadesh", "Hatti", home)] })];
    Assert.equal(0, characterSignal(leaving, 1, null, "c1").heat);
    // His place besieged is his danger; foreign troops standing in it, unease.
    const siege = { province: home, besieger: "Hatti" as Power, progress: 1, walls: 2, since: 2 };
    Assert.equal([Heat.battle, "siege"], ((x) => [x.heat, x.top])(characterSignal([season(0), season(1, { sieges: [siege] })], 1, null, "c1")));
    const troops = [{ id: "u", power: "Hatti" as Power, kind: "Army" as const, province: home, men: 100 }];
    Assert.equal(Heat.unease, characterSignal([season(0), season(1, { units: troops } as Partial<SeasonFrame>)], 1, null, "c1").heat);
    // A skirmish with a city-state in his place adds a little, never battle.
    const skirmish = characterSignal([season(0), season(1, { moves: [attack("Byblos", home, "Egypt")] })], 1, null, "c1");
    Assert.true(skirmish.heat < Heat.battle);
  });

  test("A character the viewer does not know the place of tells the music nothing, and a hidden fight changes nothing he hears", () => {
    const home = capitalOf("Egypt");
    const person = new Map([["c1", envoy("Egypt", "Egypt")]]);
    const hidden = [frame(0, { people: person }), frame(1, { people: person, moves: [attack("Hatti", home, "Egypt")] })];
    const quiet = [frame(0, { people: person }), frame(1, { people: person })];
    // Through Hatti's eyes: he is not Hatti's servant and not at its court, so no place is known; nothing seen either.
    Assert.equal(JSON.stringify(characterSignal(quiet, 1, "Hatti", "c1")), JSON.stringify(characterSignal(hidden, 1, "Hatti", "c1")));
    Assert.equal(0, characterSignal(hidden, 1, "Hatti", "c1").heat);
  });

  test("A seat's own governor is its realm's whatever his true employer, which it may not know has changed", () => {
    const gov = (employer: Power): Partial<SeasonFrame> => ({
      people: new Map([["c1", envoy(employer, null as unknown as Power)]]),
      governedKnown: new Map([["Egypt" as Power, new Map([["gaza", { character: "c1", seat: "gaza" }]])]]),
      units: [{ id: "u", power: "Egypt" as Power, kind: "Army" as const, province: "gaza", men: 100 }],
      sight: new Map([["Egypt" as Power, new Set(["gaza"])]]),
    } as unknown as Partial<SeasonFrame>);
    const signal = (employer: Power) => JSON.stringify(characterSignal([frame(0, gov(employer)), frame(1, gov(employer))], 1, "Egypt", "c1"));
    // He turned to Hatti and word has not reached the seat: nothing it hears changes, and its own troops are not foreign.
    Assert.equal(signal("Egypt"), signal("Hatti"));
    Assert.equal(0, characterSignal([frame(0, gov("Hatti")), frame(1, gov("Hatti"))], 1, "Egypt", "c1").heat);
    Assert.equal("Egypt", realmOfCharacter(frame(1, gov("Hatti")), "Egypt", "c1"));
  });

  test("Drifting, the music of the realm doing the most, kept until another clearly does more", () => {
    const struck = (i: number, who: Power, target: string, owner: Power): Partial<SeasonFrame> => ({ moves: [attack(who, target, owner), attack(who, target, owner, "y")] });
    const owner = new Map<string, Power | null>([["a", "Egypt"], ["b", "Hatti"], ["c", "Mitanni"]]);
    const frames = [frame(0, { owner })];
    for (let i = 1; i < 6; i++) frames.push(frame(i, { owner, ...struck(i, "Egypt", "kadesh", "Hatti") }));
    Assert.equal("Egypt", busiest(frames, 5, null));
    // Quiet for a while, nobody doing anything: whose music it was is kept.
    const quiet = [...frames];
    for (let i = 6; i < 16; i++) quiet.push(frame(i, { owner }));
    Assert.equal("Egypt", busiest(quiet, 15, "Egypt"));
    // Another does a little more: not clearly more, the music stays.
    const near = [...frames, frame(6, { owner, ...struck(6, "Hatti", "gaza", "Egypt") })];
    Assert.equal("Egypt", busiest(near, 6, "Egypt"));
    // Another does far more, season after season: it takes the music.
    const more = [...frames];
    for (let i = 6; i < 14; i++) more.push(frame(i, { owner, moves: [attack("Mitanni", "kadesh", "Hatti"), attack("Mitanni", "kadesh", "Hatti", "y"), attack("Mitanni", "kadesh", "Hatti", "z"), attack("Mitanni", "gaza", "Egypt"), attack("Mitanni", "gaza", "Egypt", "y")] }));
    Assert.equal("Mitanni", busiest(more, 13, "Egypt"));
  });
});
