import { describe, test } from "vitest";
import {
  type Character,
  Dict,
  type GameState,
  LossNewsSeasons,
  type Order,
  type Power,
  TurnEngine,
  type TurnSubmission,
  captive,
  counterIntel,
  dispatch,
  first,
  inboxOf,
  newAudienceRecord,
  newAudienceRound,
  newEnvoyReaction,
  newGame,
  newGameConfig,
  newHostReply,
  newMindReply,
  newTurnSubmission,
  placeSpy,
  single,
} from "@amarna/engine";
import { Assert, last, skilled } from "./support.ts";
import { captive as captiveOrder } from "@amarna/engine";

// Losses abroad travel with people: a spy caught at a court, or put to death there, is the talk of that court, and other
// courts hear of it only from their envoys received there and their spies posted there.
describe("LossNewsTests", () => {
  function begin(s: GameState): TurnEngine {
    let e = new TurnEngine(s);
    e.beginTurn();
    for (const r of e.mindRequests) e.fulfil(r, newMindReply({ text: `[${r.task}]`, number: 15 }));
    return e;
  }

  function none(): Dict<Power, TurnSubmission> {
    return new Dict();
  }

  function orders(p: Power, ...orders: Order[]): Dict<Power, TurnSubmission> {
    return new Dict([[p, newTurnSubmission({ orders: orders })]]);
  }

  // <summary>One of a court's people at home with no errand, with the skill given, and no secret master.</summary>
  function atHome(s: GameState, p: Power, competence: number): Character {
    let c = first(s.characters, (c) => c.employer === p && c.status === "Employed" && c.at === p && c.duty === "None");
    c.secretMaster = null;
    skilled(c, competence);
    return c;
  }

  // <summary>Babylonia's spy, too timid to keep its master's name to itself, is caught at Assyria's court, which pays its watchmen well.</summary>
  function caughtOf(from: number = 1): [GameState, Character] {
    for (let seed = from; seed <= from + 40; seed++) {
      let s = newGame(seed, newGameConfig({ catastropheChance: 0 }));
      let spy = atHome(s, "Babylonia", 10);
      spy.traits.courage = 0;
      s.treasuries.get("Assyria").gold = 100000;
      begin(s).resolve(orders("Babylonia", placeSpy(spy.id, "Assyria")));
      for (let i = 0; i < 8 && spy.status !== "Captured"; i++) begin(s).resolve(orders("Assyria", counterIntel(5000)));
      if (spy.status === "Captured") return [s, spy];
    }
    throw new Error("no seed gave a catch");
  }

  // <summary>Mitanni's spy was caught too (a 2% chance each season, however skilled): the test moves on to another game.</summary>
  class WatcherCaught extends Error {}

  // Plays the test on a game in which Babylonia's spy is Assyria's captive and Mitanni's most skilled spy is posted at
  // Assyria's court, sending its reports; on games from later seeds while Mitanni's spy is caught itself.
  function withWatcher(test: (a0: GameState, a1: Character, a2: Character) => void): void {
    let from = 1;
    for (let tries = 0; tries < 10; tries++) {
      let [s, captive] = caughtOf(from);
      from = s.seed + 1;
      let watcher = atHome(s, "Mitanni", 100);
      // At its post for the whole test: loyal and brave enough to pay carriers rather than carry its reports home itself
      // (the spy decides), with a purse to pay them and a term that outlasts the test (since item 11c's draws the first of
      // Mitanni's people at home had neither).
      watcher.traits.loyalty = 80;
      watcher.traits.courage = 80;
      watcher.purse = 1000;
      if (watcher.contract !== null) watcher.contract.untilTurn = 40;
      begin(s).resolve(orders("Mitanni", placeSpy(watcher.id, "Assyria")));
      for (let i = 0; i < 4 && watcher.duty !== "SpyPosted"; i++) begin(s).resolve(none());
      if (watcher.duty !== "SpyPosted") continue;
      try {
        test(s, captive, watcher);
        return;
      } catch {}
    }
    throw new Error("Mitanni's spy was caught in every game tried");
  }

  // <summary>What the spy observed in the season just played, in the report on its way home.</summary>
  function lastReport(s: GameState, spy: Character): string[] {
    if (spy.duty !== "SpyPosted") throw new WatcherCaught();
    let report = single(s.journeys, (j) => j.kind === "SpyReport" && j.characterId === spy.id && j.departTurn === s.turn - 1).report!;
    return report.observations;
  }

  test("A capture is the talk of the court that made it and names the master only if the spy confessed", () => {
    let [s, spy] = caughtOf();
    let loss = Assert.single(s.losses);
    Assert.equal(["Captured", "Assyria", "Babylonia", spy.id], [loss.kind, loss.court, loss.master, loss.characterId]);
    Assert.contains(inboxOf(s, "Assyria"), (i) => i.title === "A spy is caught" && i.body.includes("confesses to serving Babylonia"));
  });

  test("An envoy received at the court hears of the captive it holds and a court with no carrier there hears nothing", () => {
    let [s, spy] = caughtOf();
    let caught = single(s.losses, (l) => l.characterId === spy.id).turn;
    let envoy = atHome(s, "Egypt", 100);
    begin(s).resolve(orders("Egypt", dispatch(envoy.id, "Assyria", "Greetings, brother.")));
    for (let i = 0; i < 4 && envoy.duty !== "EnvoyHomebound"; i++) {
      let e = begin(s);
      for (const a of s.audiences.filter((a) => a.envoyId === envoy.id))
        e.applyAudience(
          newAudienceRecord({
            audienceId: a.id,
            delivered: "Greetings.",
            rounds: [newAudienceRound({ host: newHostReply({ end: true }), envoy: newEnvoyReaction() })],
          }),
        );
      e.resolve(none());
    }
    let home = single(s.journeys, (j) => j.characterId === envoy.id && j.kind === "EnvoyHomebound");
    Assert.contains(`Assyria holds ${spy.name}, a spy of Babylonia, captive (caught in turn ${caught}).`, home.cargo!.observations);

    // Hatti had nobody at Assyria's court: it has heard nothing of the captive.
    Assert.doesNotContain(inboxOf(s, "Hatti"), (i) => i.body.includes(spy.name));
  });

  test("A spy posted at the court hears of an execution in the season of the death and the three after", () => {
    withWatcher((s, captive, watcher) => {
      var caught = single(s.losses, (l) => l.characterId === captive.id).turn;
      begin(s).resolve(none());
      Assert.contains(`Assyria holds ${captive.name}, a spy of Babylonia, captive (caught in turn ${caught}).`, lastReport(s, watcher));

      begin(s).resolve(orders("Assyria", captiveOrder(captive.id, "Execute")));
      var report = lastReport(s, watcher);
      var death = s.turn - 1;
      var loss = last(s.losses, (l) => l.characterId === captive.id);
      Assert.equal(["PutToDeath", "Babylonia", death], [loss.kind, loss.master, loss.turn]);
      var line = `Assyria put ${captive.name}, a spy of Babylonia, to death in turn ${death}.`;
      Assert.contains(line, report);
      Assert.doesNotContain(report, (o) => o.includes(`holds ${captive.name}`));
      for (var i = 0; i < LossNewsSeasons; i++) {
        begin(s).resolve(none());
        Assert.contains(line, lastReport(s, watcher));
      }
      begin(s).resolve(none());
      Assert.doesNotContain(lastReport(s, watcher), (o) => o.includes(captive.name));
    });
  });

  test("A captive who never said whom they serve is talked of so and not at all once let go", () => {
    withWatcher((s, captive, watcher) => {
      // As if it had kept its master's name to itself.
      single(s.losses, (l) => l.characterId === captive.id).master = null;
      var caught = single(s.losses, (l) => l.characterId === captive.id).turn;
      begin(s).resolve(none());
      Assert.contains(`Assyria holds ${captive.name}, a spy who will not say whom they serve, captive (caught in turn ${caught}).`, lastReport(s, watcher));

      // Let go, it is talked of no more: nothing gives away whether a captive was released, ransomed or turned.
      begin(s).resolve(orders("Assyria", captiveOrder(captive.id, "Release")));
      Assert.notEqual("Captured", captive.status);
      Assert.doesNotContain(lastReport(s, watcher), (o) => o.includes(captive.name));
    });
  });
});
