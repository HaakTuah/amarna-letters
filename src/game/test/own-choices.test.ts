import { describe, test } from "vitest";
import { BandData, TurnEngine, WorldMap, first, newGame, newMindReply, type GameState, type MindRequest } from "@amarna/engine";
import { ScriptMind, newMindContext } from "@amarna/game";
import { LlmCharacterMind, type CallSpec, type JsonAsker, type JsonObject } from "@amarna/llm";
import { Assert } from "../../engine/test/support.ts";
import { Recorder } from "./recorder.ts";

const Map = WorldMap.default;

/** Answers every call with the reply given. */
class Answers implements JsonAsker {
  calls: CallSpec[] = [];
  private readonly reply: JsonObject;
  constructor(reply: JsonObject) {
    this.reply = reply;
  }
  askJson(spec: CallSpec): Promise<JsonObject> {
    this.calls.push(spec);
    return Promise.resolve(this.reply);
  }
}

/** A land province with no troops in it, held by a king, with land next door. */
function quiet(s: GameState, coast: boolean | null = null): string {
  return first(Map.landProvinces, (p) => !Map.get(p.id).kingless && (coast === null || p.isCoastal === coast) && !s.units.some((u) => u.province === p.id) && Map.movesFrom("Army", p.id).some((n) => !Map.get(n).isSea)).id;
}

/** A band of `men` in a quiet province, its chief, and the engine's request for him. */
function chiefAsked(s: GameState, men: number, coast: boolean | null = null) {
  const e = new TurnEngine(s);
  const prov = quiet(s, coast);
  const b = e.headRises(prov, men, "crowd", e.r("test"));
  const chief = first(s.characters, (c) => c.id === b.leaderId);
  e.ownRequests();
  const req = first(e.mindRequests, (r) => r.task === "Chief" && r.characterId === chief.id);
  return { e, prov, b, chief, req };
}

async function answer(mind: LlmCharacterMind, s: GameState, req: MindRequest) {
  return await mind.write(newMindContext({ request: req, self: first(s.characters, (c) => c.id === req.characterId), turn: s.turn, seed: s.seed }));
}

/** A spy posted at Hatti for Babylonia, its report waiting there, nobody to carry it. */
function spyWaiting(seed: number) {
  const s = newGame(seed);
  const e = new TurnEngine(s);
  const spy = first(s.characters, (c) => c.employer === "Babylonia" && c.at === "Babylonia");
  spy.duty = "SpyPosted";
  spy.at = "Hatti";
  spy.missionTarget = "Hatti";
  spy.purse = 500;
  spy.traits.loyalty = 80;
  spy.traits.courage = 80;
  for (const c of s.characters) if (c.status === "Free" && c.at === "Hatti") c.at = "Egypt";
  e.watchAndReport();
  const letter = first(s.journeys, (j) => j.kind === "SpyReport" && j.characterId === spy.id);
  e.ownRequests();
  const req = first(e.mindRequests, (r) => r.task === "Reports" && r.characterId === spy.id);
  return { s, e, spy, letter, req };
}

describe("OwnChoicesTests", () => {
  test("Every chief is asked; a script mind answers nothing and its traits decide as before", async () => {
    const s = newGame(3);
    const { req, chief } = chiefAsked(s, 80);
    Assert.notNull(req.chief);
    Assert.equal(80, req.chief!.men);
    Assert.equal(Map.get(req.chief!.here.province).name, req.chief!.here.name);
    const reply = await new ScriptMind().write(newMindContext({ request: req, self: chief, turn: s.turn, seed: s.seed }));
    Assert.null(reply.chief);
    Assert.null(reply.reports);
  });

  test("A chief's request asks only what applies, and shows no ids", async () => {
    const s = newGame(3);
    const { req, chief, b } = chiefAsked(s, BandData.shipMen - 1, false);
    chief.purse = 0;
    const rec = new Recorder();
    await answer(new LlmCharacterMind(rec), s, req);
    Assert.equal(1, rec.calls.length);
    const fields = Recorder.fields(rec.calls[0]);
    Assert.contains(fields, (f) => f === "go");
    Assert.contains(fields, (f) => f === "kill");
    Assert.contains(fields, (f) => f === "give_up_the_road");
    // No coast, so no ship to buy, and no word of one.
    Assert.false(fields.includes("buy_ship"));
    Assert.false(rec.calls[0].user.includes("ship"));
    Assert.false(rec.calls[0].user.includes(b.id));
    Assert.false(rec.calls[0].user.includes(chief.id));
  });

  test("A model chief's choices are taken next season instead of the formula: he moves where he chose, and kills whom he chose", async () => {
    const s = newGame(3);
    const { e, req, chief, b, prov } = chiefAsked(s, 80);
    const to = first(req.chief!.next, () => true);
    const reply = await answer(new LlmCharacterMind(new Answers({ go: to.name, kill: "everyone", give_up_the_road: false })), s, req);
    Assert.equal(to.province, reply.chief!.go);
    e.fulfil(req, reply);
    Assert.notNull(chief.chiefPlan);
    // Whom he kills holds at once, until he says otherwise: a free traveller too.
    const free = first(s.characters, (c) => c.status === "Free" && c.id !== chief.id);
    Assert.true(e.chiefKills(b, free, prov));
    s.turn++;
    new TurnEngine(s).bandsSeason();
    const band = first(s.bands, (x) => x.leaderId === chief.id);
    Assert.equal(to.province, band.province);
    Assert.equal(to.province, chief.watchProvince);
    // A choice not renewed is not his: the season after, the formula decides again.
    s.turn++;
    Assert.equal(false, new TurnEngine(s).chiefDecides(band, chief));
  });

  test("A model chief may give up the road whenever he chooses", async () => {
    const s = newGame(3);
    const { e, req, chief } = chiefAsked(s, 200);
    e.fulfil(req, await answer(new LlmCharacterMind(new Answers({ go: "", kill: "nobody", give_up_the_road: true })), s, req));
    s.turn++;
    new TurnEngine(s).bandsSeason();
    Assert.false(s.bands.some((x) => x.leaderId === chief.id));
    Assert.true(chief.duty !== "Leading");
    Assert.true(chief.seeking);
    Assert.equal(s.turn, chief.leftRoad);
  });

  test("A model spy carries its reports home at once if it chooses, or waits past what its traits would", async () => {
    const carry = spyWaiting(5);
    carry.e.fulfil(carry.req, await answer(new LlmCharacterMind(new Answers({ pay_up_to: 0, carry_home: true })), carry.s, carry.req));
    carry.s.turn++;
    new TurnEngine(carry.s).carryLetters();
    Assert.equal(carry.spy.id, carry.letter.carrier);

    const wait = spyWaiting(5);
    const mind = new LlmCharacterMind(new Answers({ pay_up_to: 0, carry_home: false }));
    // Four seasons, more than its traits would wait (selfWait: two, a season more brave, another loyal).
    for (let i = 0; i < 5; i++) {
      const e = new TurnEngine(wait.s);
      e.ownRequests();
      const req = first(e.mindRequests, (r) => r.task === "Reports" && r.characterId === wait.spy.id);
      Assert.true(req.reports!.reports >= 1);
      e.fulfil(req, await answer(mind, wait.s, req));
      wait.s.turn++;
      new TurnEngine(wait.s).carryLetters();
    }
    Assert.null(wait.letter.carrier);
  });

  test("A model spy pays a carrier no more than it chose", async () => {
    const run = async (most: number) => {
      const w = spyWaiting(5);
      const free = first(w.s.characters, (c) => c.status === "Free" && c.at !== null && c.errand === null);
      free.at = "Hatti";
      free.duty = "None";
      w.e.fulfil(w.req, await answer(new LlmCharacterMind(new Answers({ pay_up_to: most, carry_home: false })), w.s, w.req));
      w.s.turn++;
      new TurnEngine(w.s).carryLetters();
      return w;
    };
    const none = await run(0);
    Assert.null(none.letter.carrier);
    Assert.equal(500, none.spy.purse);
    const enough = await run(500);
    Assert.notNull(enough.letter.carrier);
    Assert.true(enough.spy.purse < 500);
    // Its request names its post and its master, never an id.
    Assert.false(enough.req.reports === null);
    Assert.equal("Babylonia", enough.req.reports!.master);
  });

  test("A request answered with no choice leaves the script's traits deciding", () => {
    const { e, req, spy } = spyWaiting(5);
    e.fulfil(req, newMindReply());
    Assert.null(spy.reportsPlan);
  });
});
