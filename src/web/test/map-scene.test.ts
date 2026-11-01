import { describe, test } from "vitest";
import { scriptSeats } from "../../game/test/small-world.ts";
import {
  AllPowers,
  type GameState,
  type Power,
  TurnEngine,
  Views,
  WorldMap,
  first,
  isAlive,
  newGame,
  newLossAbroad,
  single,
} from "@amarna/engine";
import { GameRunner, type ISeat, ScriptLeader, ScriptMind, TemplateNarrator } from "@amarna/game";
import { Assert, removeAll, toDict } from "../../engine/test/support.ts";
import { buildScene, type ScenePerson, wallsIn } from "../src/map/scene.ts";
import { seasonLayer } from "../src/map/seasons.ts";
import { roadsLayer, worksAtCities } from "../src/map/built.ts";
import { lifeLayer, memoryLayer, sceneMarkup, scenesOf } from "../src/map/life.ts";
import { catchUpFrames, coverOf, frameFrom, isMove, type SeasonFrame } from "../src/session/frames.ts";
import { buildLifeRecord } from "../src/session/life-record.ts";
import { dated } from "../src/ui/format.ts";

// The web map's view of a game (the visual overhaul, Build order item 2): what each court's map may show, the fog drawn
// from its own earlier sights, and frames that agree with the snapshots they stand for. Games of script kings, played as
// the web app plays them.
describe("MapSceneTests", () => {
  interface Played {
    runner: GameRunner;
    frames: SeasonFrame[];
  }

  function runnerOf(state: GameState, seed: number): [GameRunner, SeasonFrame[]] {
    // The small world (small-world.ts): the default few are script kings, every other power idle.
    let runner = Object.assign(new GameRunner(state, scriptSeats(seed), new ScriptMind(), new TemplateNarrator()), { writeChronicles: false });
    let frames: SeasonFrame[] = [];
    runner.changed.push(() => catchUpFrames(frames, runner));
    return [runner, frames];
  }

  const cache = new Map<number, Promise<Played>>();

  // A game of script kings with a frame taken after every season, as the web session takes them.
  function play(seed: number, turns: number): Promise<Played> {
    let done = cache.get(seed);
    if (done === undefined) {
      done = (async () => {
        let state = newGame(seed);
        let [runner, frames] = runnerOf(state, seed);
        await runner.prepare();
        for (let i = 0; i < turns && !state.ended; i++) await runner.playTurn();
        return { runner, frames };
      })();
      cache.set(seed, done);
    }
    return done;
  }

  const living = (s: GameState): Power[] => AllPowers.filter((p) => isAlive(s, p));
  const sorted = <T>(xs: Iterable<T>): string[] => [...xs].map((x) => JSON.stringify(x)).sort();
  const entries = (m: ReadonlyMap<string, unknown>): string[] => sorted(m.entries());

  test("A caught spy is marked on its captors map only with the master it confessed to", async () => {
    async function drawn(confessed: Power | null): Promise<ScenePerson> {
      let state = newGame(5);
      let spy = first(state.characters, (c) => c.employer === "Babylonia");
      // Caught at Assyria's court, as the engine catches a spy.
      [spy.status, spy.heldBy, spy.duty, spy.at, spy.secretMaster] = ["Captured", "Assyria", "None", "Assyria", null];
      state.losses.push(newLossAbroad({ turn: 1, kind: "Captured", characterId: spy.id, court: "Assyria", master: confessed }));
      let [runner, frames] = runnerOf(state, 5);
      await runner.prepare();
      catchUpFrames(frames, runner);
      let person = single(buildScene(frames, 0, "Assyria").people, (x) => x.id === spy.id);
      Assert.equal("Captive", person.kind);
      Assert.equal(
        confessed,
        single(Views.for(state, "Assyria").known, (x) => x.id === spy.id).employer,
      );
      return person;
    }

    Assert.null((await drawn(null)).owner);
    Assert.equal("Babylonia", (await drawn("Babylonia")).owner);
  });

  test("A spy a court has not caught is neither drawn nor followed there", async () => {
    let state = newGame(5);
    let spy = first(state.characters, (c) => c.employer === "Babylonia");
    // Posted at Assyria's court, watching it in secret.
    [spy.duty, spy.at, spy.missionTarget, spy.secretMaster] = ["SpyPosted", "Assyria", "Assyria", null];
    let [runner, frames] = runnerOf(state, 5);
    await runner.prepare();
    catchUpFrames(frames, runner);

    Assert.doesNotContain(buildScene(frames, 0, "Assyria").people, (x) => x.id === spy.id);
    // The People panel lists the court's view; the follow view knows nothing of the spy.
    let view = Views.for(state, "Assyria");
    Assert.doesNotContain([...view.court, ...view.known], (x) => x.id === spy.id);
    let life = buildLifeRecord(frames, (i) => buildScene(frames, i, "Assyria"), 0, state, "Assyria", spy.id);
    Assert.false(life.known);
    Assert.null(life.employer);
    // Its master follows it to its post.
    let own = buildLifeRecord(frames, (i) => buildScene(frames, i, "Babylonia"), 0, state, "Babylonia", spy.id);
    Assert.true(own.known);
    Assert.equal("Babylonia", own.employer);
  });

  test.each([3, 7])("A court sees only its own people and foreign envoys at its court %s", async (seed) => {
    let { runner, frames } = await play(seed, 16);
    let shown = 0;
    for (let k = 0; k < frames.length; k++) {
      let f = frames[k];
      let state = runner.stateAt(k)!;
      // Its risen powers registered as they were then (item 17++ makes risings common).
      new TurnEngine(state);
      for (const p of living(state)) {
        let scene = buildScene(frames, k, p);
        let view = Views.for(state, p);
        let known = new Set([...view.court, ...view.known].map((c) => c.id));
        for (const person of scene.people) {
          shown++;
          let c = f.people.get(person.id)!;
          // Every person drawn is one the engine's own view of that court lists.
          Assert.true(known.has(person.id), `seed ${seed}, after turn ${k}: ${p} shown ${c.name}, whom its view does not list`);
          let own = c.employer === p || coverOf(c, p) !== null;
          let held = c.heldBy === p;
          let envoyHere = c.duty === "EnvoyAtCourt" && c.at === p;
          Assert.true(own || held || envoyHere, `seed ${seed}, after turn ${k}: ${p} shown ${c.name} (${c.duty} at ${c.at}, serving ${c.employer})`);
          Assert.false(!own && !held && c.duty === "SpyPosted", `${p} shown a foreign spy, ${c.name}`);
          // A foreign person is marked with no other master than the view names (a captive: the one it confessed to).
          if (!own)
            Assert.equal(
              single(view.known, (x) => x.id === person.id).employer,
              person.owner,
            );
        }
        for (const t of scene.travellers) {
          shown++;
          if (t.kind === "Gold") {
            Assert.equal(p, t.owner);
            continue;
          }
          let c = f.people.get(t.characterId!)!;
          Assert.true(c.employer === p || coverOf(c, p) !== null, `${p} shown ${c.name} on the road, who does not serve it`);
        }
      }
    }
    Assert.true(shown > 0, "the games put nobody on a court's map");
  });

  // Seeds 4 and 7: since item 11d seed 3's game leaves no unit seen and then lost to sight in its sixteen seasons.
  // Seeds whose games leave ghosts to check (seed 3 for seed 4 since item 11e, whose land defended by its men moves fewer
  // troops; seed 4 again for seed 3 since item 12, whose envoys wait to be understood; seed 1 for seed 7 since item 11f).
  test.each([4, 1])("The fog is clear exactly where the court sees and ghosts stand only out of sight %s", async (seed) => {
    let { runner, frames } = await play(seed, 16);
    let ghosts = 0;
    for (let k = 0; k < frames.length; k++) {
      let state = runner.stateAt(k)!;
      for (const p of living(state)) {
        let scene = buildScene(frames, k, p);
        let view = Views.for(state, p);
        let visible = new Set(view.visible);
        for (const prov of WorldMap.default.provinces) {
          let age = scene.fogAge.get(prov.id) ?? -1;
          Assert.equal(visible.has(prov.id), age === 0);
        }
        // The units drawn as seen now are exactly the units in the court's view.
        let now = sorted(scene.units.filter((u) => !u.ghost).flatMap((u) => Array.from({ length: u.count }, () => [u.power, u.kind, u.province])));
        let engine = sorted(view.units.map((u) => [u.power, u.kind, u.province]));
        Assert.equal(engine, now);
        for (const g of scene.units.filter((u) => u.ghost)) {
          ghosts++;
          Assert.false(visible.has(g.province));
          Assert.true(g.age >= 1 && g.seenAt === k - g.age);
          // A ghost is a unit the court really saw there, in that season's sight.
          Assert.true(frames[g.seenAt].sight.get(p)!.has(g.province));
          Assert.contains(frames[g.seenAt].units, (u) => u.province === g.province && u.power === g.power && u.kind === g.kind);
        }
      }
    }
    Assert.true(ghosts > 0, "the games left no ghost to check");
  });

  test("God view shows every unit and no fog", async () => {
    let { runner, frames } = await play(7, 16);
    for (let k = 0; k < frames.length; k++) {
      let scene = buildScene(frames, k, null);
      Assert.equal(0, scene.fogAge.size);
      Assert.equal(
        runner.stateAt(k)!.units.length,
        scene.units.reduce((n, u) => n + u.count, 0),
      );
      Assert.doesNotContain(scene.units, (u) => u.ghost);
    }
  });

  test("A court draws the walls standing only where it sees and god view draws them all", async () => {
    let { runner, frames } = await play(7, 16);
    let differ = 0;
    for (let k = 0; k < frames.length; k++) {
      let f = frames[k];
      Assert.equal(entries(f.walls), entries(buildScene(frames, k, null).walls));
      for (const p of living(runner.stateAt(k)!)) {
        let walls = buildScene(frames, k, p).walls;
        Assert.equal(entries(f.knownWalls.get(p)!), entries(walls));
        for (const id of [...f.sight.get(p)!].filter((id) => !WorldMap.default.get(id).isSea)) Assert.equal(f.walls.get(id) ?? 0, walls.get(id) ?? 0);
        differ += WorldMap.default.landProvinces.filter((x) => (f.walls.get(x.id) ?? 0) !== (walls.get(x.id) ?? 0)).length;
      }
    }
    Assert.true(differ > 0, "no court's walls ever differed from the truth out of its sight, so nothing was checked");
  });

  // Item 19: the year shows everywhere, but this game's droughts and floods only where the court's own eyes saw the land.
  test("A court draws a drought only where it saw the land, as it was then, and god view draws it everywhere", async () => {
    let { runner, frames } = await play(7, 16);
    let k = frames.length - 1;
    let p = living(runner.stateAt(k)!)[0];
    let land = WorldMap.default.landProvinces.map((x) => x.id);
    let inSight = land.find((id) => frames[k].sight.get(p)!.has(id))!;
    let out = land.filter((id) => frames.every((f) => !f.sight.get(p)!.has(id)));
    Assert.true(inSight !== undefined && out.length >= 2, "the court saw all the land or none of it");
    // One province never seen, and one the court saw a season ago only (its sight that season widened to it).
    let [neverSeen, seenBefore] = out;
    let dry = (f: SeasonFrame, ids: string[]): SeasonFrame => ({ ...f, climate: [{ kind: "Drought", name: "a drought", provinces: ids, river: null, ruinous: false, since: 0 }] });
    let edited = frames.map((f, i) =>
      i === k ? dry(f, [inSight, neverSeen]) : i === k - 1 ? { ...dry(f, [seenBefore]), sight: new Map([...f.sight].map(([q, v]) => [q, q === p ? new Set([...v, seenBefore]) : v] as const)) } : f,
    );
    let seat = buildScene(edited, k, p).land;
    Assert.equal("Drought", seat.get(inSight));
    Assert.false(seat.has(neverSeen));
    Assert.equal("Drought", seat.get(seenBefore));
    let god = buildScene(edited, k, null).land;
    Assert.equal("Drought", god.get(inSight));
    Assert.equal("Drought", god.get(neverSeen));
    // God view draws the land as it is now: the drought the court remembers there has ended.
    Assert.false(god.has(seenBefore));
  });

  // Item 19: bands are drawn as the engine's own view of a court shows them, and a battle only where the court saw troops.
  test("A court draws the bands its view shows and a battle only where it saw the troops met", async () => {
    let { runner, frames } = await play(7, 16);
    let bands = 0;
    let battles = 0;
    for (let k = 1; k < frames.length; k++) {
      let state = runner.stateAt(k)!;
      Assert.equal(sorted(state.bands.map((b) => b.province)), sorted(buildScene(frames, k, null).bands.map((b) => b.province)));
      for (const p of living(state)) {
        let scene = buildScene(frames, k, p);
        Assert.equal(sorted(Views.for(state, p).bands.map((b) => [b.province, b.men])), sorted(scene.bands.map((b) => [b.province, b.men])));
        bands += scene.bands.length;
        for (const m of scene.moves.filter((x) => x.against !== null)) {
          battles++;
          // It met troops the court saw standing there as the season began.
          Assert.true(frames[k - 1].sight.get(p)!.has(m.to));
          Assert.contains(frames[k - 1].units, (u) => u.province === m.to && u.power === m.against);
        }
      }
    }
    Assert.true(bands > 0 && battles > 0, "the game had no band or no battle to check");
  });

  // Item 19: a court knows its own works as they stand, others' as its eyes last saw them, and nothing of land never seen.
  test("A court draws what is built in its own land as it stands and elsewhere as it last saw it", async () => {
    let { runner, frames } = await play(7, 16);
    let k = frames.length - 1;
    let p = living(runner.stateAt(k)!)[0];
    let land = WorldMap.default.landProvinces.map((x) => x.id);
    let own = land.find((id) => frames[k].owner.get(id) === p)!;
    let out = land.filter((id) => frames[k].owner.get(id) !== p && frames.every((f) => !f.sight.get(p)!.has(id)));
    Assert.true(own !== undefined && out.length >= 2, "the court saw all the land or held none");
    let [neverSeen, seenBefore] = out;
    let roads = (f: SeasonFrame, levels: [string, number][]): SeasonFrame => ({ ...f, built: new Map([...f.built, ...levels.map(([id, l]) => [`Roads:${id}`, l] as [string, number])]) });
    let edited = frames.map((f, i) =>
      i === k
        ? roads(f, [[own, 3], [neverSeen, 2], [seenBefore, 1]])
        : i === k - 1
          ? { ...roads(f, [[own, 1], [seenBefore, 3]]), sight: new Map([...f.sight].map(([q, v]) => [q, q === p ? new Set([...v, seenBefore]) : v] as const)) }
          : f,
    );
    let seat = buildScene(edited, k, p);
    Assert.equal(3, seat.built.get(`Roads:${own}`));
    Assert.equal(3, seat.built.get(`Roads:${seenBefore}`));
    Assert.false(seat.built.has(`Roads:${neverSeen}`));
    Assert.false(seat.builtKnown!.has(neverSeen));
    let god = buildScene(edited, k, null);
    Assert.equal(1, god.built.get(`Roads:${seenBefore}`));
    Assert.equal(2, god.built.get(`Roads:${neverSeen}`));
    // Its own stores it counts; another's it does not.
    Assert.true([...seat.stores.keys()].every((id) => frames[k].owner.get(id) === p));
  });

  // Item 19, pass 4: the map remembers only battles the court saw, and shows the roads' life only where it can see.
  test("A court remembers the battles it saw and sees caravans and walkers only on roads it can see", async () => {
    let { runner, frames } = await play(7, 16);
    let k = frames.length - 1;
    let god = buildScene(frames, k, null).memory;
    let memorials = 0;
    for (const p of living(runner.stateAt(k)!)) {
      let seat = buildScene(frames, k, p);
      // Every battlefield the court remembers is one god view remembers, with no more battles there.
      for (const [id, b] of seat.memory.memorials) {
        memorials++;
        Assert.true((god.memorials.get(id)?.count ?? 0) >= b.count);
      }
      // Its own land by its own record (who it knows holds it), or what it sees; never by the true owner.
      let sees = (id: string): boolean => frames[k].knownOwner.get(p)?.get(id)?.owner === p || frames[k].sight.get(p)!.has(id);
      // Its own caravans only, as the engine's view; deportees on roads it sees; its own people's numbers only.
      for (const r of seat.memory.caravans) Assert.equal(p, r.power);
      for (const r of seat.memory.walking) Assert.true(frames[k].sight.get(p)!.has(r.from) || frames[k].sight.get(p)!.has(r.to));
      for (const id of seat.memory.wild) Assert.true(sees(id));
      // Its own people only: land it knows it holds (as it last held it, where lost without its knowing).
      for (const id of [...seat.memory.famine.keys(), ...seat.memory.towns.keys()]) Assert.equal(p, frames[k].knownOwner.get(p)?.get(id)?.owner);
    }
    Assert.true(god.memorials.size > 0 && memorials > 0, "no battle was fought, or none seen, so nothing was checked");
  });

  // Item 19: every layer the living map adds draws without error, every season, in god view and every court's.
  test("The living map's layers draw for every season and every view", async () => {
    let { runner, frames } = await play(7, 16);
    let drawn = 0;
    for (let k = 1; k < frames.length; k++)
      for (const p of [null, ...living(runner.stateAt(k)!)]) {
        let scene = buildScene(frames, k, p);
        for (const markup of [seasonLayer(scene), roadsLayer(scene), worksAtCities(scene), memoryLayer(scene), lifeLayer(scene), ...scenesOf(frames[k - 1], frames[k], p).map(sceneMarkup)]) {
          Assert.false(markup.includes("undefined") || markup.includes("NaN"), markup.slice(0, 120));
          drawn += markup.length;
        }
      }
    Assert.true(drawn > 0);
  });

  test("A frame from the live state matches one read back from its snapshot", async () => {
    let { runner, frames } = await play(7, 16);
    for (let k = 0; k < frames.length; k++) {
      // The state as it stood then, its risen powers registered as they were (a power rising later is not yet one).
      const then = runner.stateAt(k)!;
      new TurnEngine(then);
      let again = frameFrom(then, k, k > 0 ? frames[k - 1] : null);
      let live = frames[k];
      Assert.equal(JSON.stringify(live.units), JSON.stringify(again.units));
      Assert.equal(JSON.stringify(live.moves), JSON.stringify(again.moves));
      Assert.equal(JSON.stringify(live.journeys), JSON.stringify(again.journeys));
      Assert.equal(JSON.stringify(live.news), JSON.stringify(again.news));
      Assert.equal(entries(live.owner), entries(again.owner));
      // Every court the frame records, risen ones among them.
      Assert.equal(sorted(live.sight.keys()), sorted(again.sight.keys()));
      for (const p of live.sight.keys()) Assert.equal(sorted(live.sight.get(p)!), sorted(again.sight.get(p)!));
      for (const p of AllPowers) Assert.equal(entries(live.knownWalls.get(p)!), entries(again.knownWalls.get(p)!));
    }
  });

  test("Every move of a season is in the god view and a court draws only what it saw", async () => {
    let { runner, frames } = await play(3, 16);
    for (let k = 1; k < frames.length; k++) {
      let state = runner.stateAt(k)!;
      let god = buildScene(frames, k, null);
      // Every order seen by a court standing as the season began is among the season's moves.
      for (const p of living(runner.stateAt(k - 1)!))
        for (const o of state.lastSeen.tryGet(p) ?? [])
          Assert.contains(frames[k].moves, (m) => m.power === o.power && m.from === o.province && m.order === o.order);
      for (const p of living(state)) {
        let seen = state.lastSeen.tryGet(p) ?? [];
        let scene = buildScene(frames, k, p);
        for (const m of scene.moves) Assert.contains(seen, (o) => o.power === m.power && o.province === m.from);
        Assert.true(scene.moves.length <= god.moves.length);
      }
    }
  });

  test.each([1, 3, 5, 7, 9])("A court learns how land changed hands only from moves it saw %s", async (seed) => {
    let { runner, frames } = await play(seed, 16);
    let captures = 0;
    for (let k = 1; k < frames.length; k++) {
      let state = runner.stateAt(k)!;
      let prev = frames[k - 1];
      let god = buildScene(frames, k, null);
      for (const c of god.captures) {
        let marched = frames[k].moves.some((m) => isMove(m) && m.succeeded && m.target === c.province && m.power === c.to);
        Assert.equal(marched ? "Taken" : "Passed", c.how);
      }
      for (const p of living(state)) {
        let seen = state.lastSeen.tryGet(p) ?? [];
        let scene = buildScene(frames, k, p);
        // Who holds what reaches each court as its news does (item 7b): the changes it reads are changes in what it knows.
        for (const c of scene.captures) Assert.equal(c.to, scene.owner.get(c.province) ?? null);
        scene.captures.forEach((c) => {
          let truth = god.captures.find((g) => g.province === c.province && g.from === c.from && g.to === c.to) ?? null;
          captures++;
          // How it changed hands is not public: "taken" only when the court saw the new owner's troops march in.
          let sawIt = seen.some((o) => o.order === "move" && o.succeeded && o.target === c.province && o.power === c.to);
          Assert.true(sawIt === (c.how === "Taken"), `seed ${seed}, after turn ${k}: ${p} reads ${c.province} to ${c.to} as ${c.how}, saw the move: ${sawIt}`);
          // A court on either side is told the truth; any other that saw no march, only who holds it now.
          let party = c.from === p || c.to === p;
          Assert.equal(truth !== null ? (party || sawIt ? truth.how : "Unseen") : sawIt ? "Taken" : party ? "Passed" : "Unseen", c.how);
        });
        // An attack is called one only from what the court could tell: the target's owner, its walls, or a foreign unit
        // standing there in its sight.
        let sight = prev.sight.get(p)!;
        for (const m of scene.moves.filter((m) => m.style === "Attack" || m.text.endsWith("(an attack)"))) {
          let o = first(seen, (o) => o.power === m.power && o.province === m.from && o.order === "move" && o.target === m.to);
          let foreignLand = o.targetOwner !== null && o.targetOwner !== m.power;
          let walls = o.targetOwner !== m.power && wallsIn(prev, p).has(m.to);
          Assert.true(foreignLand || walls || sight.has(m.to), `seed ${seed}, after turn ${k}: ${p} told of an attack on ${m.to}, out of its sight`);
        }
      }
    }
    Assert.true(captures > 0, "the games changed no hands");
  });

  test("A life read in a court holds only the messages that court sent or heard", async () => {
    let { runner, frames } = await play(7, 16);
    let k = frames.length - 1;
    let state = runner.stateAt(k)!;
    let read = 0;
    let received = 0;
    for (const p of living(state)) {
      let view = Views.for(state, p);
      for (const c of [...view.court, ...view.known]) {
        let life = buildLifeRecord(frames, (i) => buildScene(frames, i, p), k, state, p, c.id);
        Assert.true(life.known);
        let missions = life.sections.find((s) => s.title.startsWith("Missions"));
        let expected = state.trails
          .filter((t) => t.envoyId === c.id && (t.from === p || (t.to === p && t.audienceTurn !== null)))
          .sort((a, b) => a.turn - b.turn);
        Assert.equal(expected.length, missions?.entries.length ?? 0);
        (missions?.entries ?? []).forEach((e, i) => {
          let t = expected[i];
          // The sender's dates run from sending to the report home; a court that only received the envoy knows the
          // audience it gave, not when or whether the envoy reported home.
          Assert.equal(t.from === p ? t.turn : t.audienceTurn, e.from);
          Assert.equal(t.from === p ? t.reportTurn : null, e.until);
          if (t.from !== p) received++;
        });
        // No hidden traits or memory outside god view.
        Assert.doesNotContain(life.sections, (s) => s.title.startsWith("Hidden") || s.title.startsWith("Their own memory"));
        read++;
      }
    }
    Assert.true(read > 0);
    Assert.true(received > 0, "no court read a mission it only received");
    // God view reads everyone's whole record.
    let anyone = first(state.characters, (c) => state.trails.some((t) => t.envoyId === c.id));
    let full = buildLifeRecord(frames, (i) => buildScene(frames, i, null), k, state, null, anyone.id);
    Assert.contains(full.sections, (s) => s.title.startsWith("Hidden"));
  });

  test("Engine texts get their date label for display", () => {
    Assert.equal(
      "set out in Akhet, 1346 BCE (turn 1) for Hatti; due back about Peret, 1345 BCE (turn 5)",
      dated("set out in turn 1 for Hatti; due back about turn 5", "Egypt"),
    );
    Assert.equal("serves at 8 a season through season 3, 1343 BCE (turn 12)", dated("serves at 8 a season through turn 12", null));
    Assert.equal("Turn them", dated("Turn them", null));
    // A spy's report dates what it saw by "season of turn N": the label alone names the season.
    Assert.equal("From Arzawa, the second season, 1344 BCE (turn 8).", dated("From Arzawa, season of turn 8.", "Hatti"));
    Assert.equal("From Arzawa, season 2, 1344 BCE (turn 8).", dated("From Arzawa, season of turn 8.", null));
    Assert.equal("Season 2, 1344 BCE (turn 8) was quiet", dated("Turn 8 was quiet", null));
  });

  test("A fallen courts last orders are not drawn again", async () => {
    // Seed 1, with Alashiya's island given to Egypt by decree after the second season, as a test: Alashiya falls in the
    // third (since the siege package walls make a fall in the first seasons rare).
    let state = newGame(1);
    let [runner, frames] = runnerOf(state, 1);
    await runner.prepare();
    for (let i = 0; i < 8 && !state.ended; i++) {
      if (i === 2) {
        state.owner.set("enkomi", "Egypt");
        state.owner.set("kalavasos", "Egypt");
        removeAll(state.units, (u) => u.power === "Alashiya");
      }
      await runner.playTurn();
    }
    let after = 0;
    for (let k = 1; k < frames.length; k++) {
      // Every order of the season was given by a unit standing where it was given from as the season began, or by a fleet
      // back from cargo service as it began (item 9+b), which the last frame did not show.
      // A power that rose as the season began (item 17++: a governor leading his province) has troops no frame showed yet.
      const rose = new Set(state.risen.filter((r) => r.turn >= frames[k - 1].turn).map((r) => r.power));
      for (const m of frames[k].moves.filter((x) => x.kind !== "Fleet" && !rose.has(x.power))) Assert.contains(frames[k - 1].units, (u) => u.province === m.from && u.power === m.power && u.kind === m.kind);
      if (frames[k - 1].eliminated.size > 0) after++;
    }
    Assert.true(after > 0, "no court fell early enough in the game to check");
  });
});
