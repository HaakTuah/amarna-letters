import { describe, test } from "vitest";
import {
  type Character,
  type CharacterView,
  CharacterViewSchema,
  Dict,
  type GameState,
  GameStateSchema,
  type Order,
  type Power,
  type SeatView,
  SeatViewSchema,
  TurnEngine,
  type TurnSubmission,
  Views,
  char,
  clone,
  counterIntel,
  first,
  hiddenAt,
  inboxOf,
  newFact,
  newGame,
  newGameConfig,
  newId,
  newLossAbroad,
  newMindReply,
  newTurnSubmission,
  placeSpy,
  serialize,
  single,
} from "@amarna/engine";
import { fresh, Assert, last, skilled } from "./support.ts";
import { captive as captiveOrder } from "@amarna/engine";

// A spy watches a court in secret: the court does not see it there, nor whom it serves, until its watchmen catch it
// (and then learns its master only if it confesses), unless the spy secretly serves that court (a double agent it
// turned, or a plant in its pay).
describe("HiddenSpyTests", () => {
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

  function people(v: SeatView): CharacterView[] {
    return v.court.concat(v.known);
  }

  // <summary>Babylonia's spy, sent to watch Assyria, has just taken up its post there (the season's orders are still to come).</summary>
  function posted(seed: number = 8): [GameState, Character] {
    let s = newGame(seed, newGameConfig({ catastropheChance: 0 }));
    let spy = first(s.characters, (c) => c.employer === "Babylonia");
    spy.secretMaster = null;
    begin(s).resolve(orders("Babylonia", placeSpy(spy.id, "Assyria")));
    for (let i = 0; i < 10; i++) {
      let e = begin(s);
      if (spy.duty === "SpyPosted") return [s, spy];
      e.resolve(none());
    }
    throw new Error("the spy never reached its post");
  }

  // <summary>The same game with the spy back at its own court, as if it had never been sent.</summary>
  function atHome(s: GameState, id: string): GameState {
    let home = clone(GameStateSchema, s);
    let c = char(home, id);
    [c.duty, c.at, c.missionTarget, c.watchProvince] = ["None", "Babylonia", null, null];
    return home;
  }

  // <summary>Assyria pays its watchmen well until they catch the spy, as the engine catches one (TurnEngine.Capture).</summary>
  function doCatch(s: GameState, spy: Character): void {
    skilled(spy, 0);
    s.treasuries.get("Assyria").gold = 100000;
    for (let i = 0; i < 30 && spy.status !== "Captured"; i++) {
      new TurnEngine(s).resolve(orders("Assyria", counterIntel(200)));
      if (fresh(spy.status) !== "Captured") begin(s);
    }
    Assert.equal(["Captured", "Assyria"], [spy.status, spy.heldBy]);
  }

  test("A spy posted at a court is not in that courts view", () => {
    let [s, spy] = posted();
    Assert.equal(["SpyPosted", "Assyria", "Employed"], [spy.duty, spy.at, spy.status]);
    Assert.true(hiddenAt(spy, "Assyria"));

    let v = Views.for(s, "Assyria");
    Assert.doesNotContain(people(v), (c) => c.id === spy.id);
    // Not one field of the court's view betrays it: the view is the one the court would have with the spy at home.
    Assert.equal(serialize(SeatViewSchema, Views.for(atHome(s, spy.id), "Assyria")), serialize(SeatViewSchema, v));
    Assert.false(Views.seenAtCourt(spy, "Assyria"));

    // Its master sees it at its post.
    let mine = single(Views.for(s, "Babylonia").court, (c) => c.id === spy.id);
    Assert.equal(["watching Assyria", "at the court of Assyria"], [mine.duty, mine.where]);
  });

  test("A hidden spy the court knows of otherwise is listed as anywhere else with no place and no master", () => {
    let [s, spy] = posted();
    // Inquiries found something about this person once: the court knows of it, not that it is here.
    spy.facts.push(newFact({ id: newId(s, "f"), text: "Owes money in Babylon.", secrecy: "Hidden", tag: "test", knownBy: ["Assyria"] }));

    let seen = single(Views.for(s, "Assyria").known, (c) => c.id === spy.id);
    Assert.equal(["employed", null, "", false], [seen.status, seen.employer, seen.where, seen.ours]);
    Assert.contains("Owes money in Babylon.", seen.knownFacts);
    Assert.equal(
      serialize(
        CharacterViewSchema,
        single(Views.for(atHome(s, spy.id), "Assyria").known, (c) => c.id === spy.id),
      ),
      serialize(CharacterViewSchema, seen),
    );
  });

  test("A caught spy is seen as a captive with the master it confessed to and once turned at its post", () => {
    let [s, spy] = posted();
    doCatch(s, spy);

    // Caught: the court holds it, and knows whom it serves only if it confessed.
    let confessed = last(s.losses, (l) => l.characterId === spy.id).master;
    let captive = single(Views.for(s, "Assyria").known, (c) => c.id === spy.id);
    Assert.equal(["your captive", confessed, "in your prison", true], [captive.status, captive.employer, captive.where, captive.heldByYou]);
    Assert.contains(
      "A spy is caught",
      inboxOf(s, "Assyria")
        .filter((x) => x.subject === spy.id)
        .map((x) => x.title),
    );

    // Turned and sent back to its post: it serves Assyria in secret, so Assyria sees it there, and whom it reports to.
    begin(s).resolve(orders("Assyria", captiveOrder(spy.id, "Turn", 0, "Assyria has no army left.")));
    Assert.equal(["SpyPosted", "Assyria", "Assyria"], [spy.duty, spy.at, spy.secretMaster]);
    Assert.false(hiddenAt(spy, "Assyria"));
    let turned = single(Views.for(s, "Assyria").known, (c) => c.id === spy.id);
    Assert.equal(["employed", "Babylonia", "at your court"], [turned.status, turned.employer!, turned.where]);
  });

  test("A caught spy that would not confess is held with no master named", () => {
    let [s, spy] = posted();
    // Caught as the engine catches one (TurnEngine.Capture), keeping silent about its master.
    [spy.status, spy.heldBy, spy.duty, spy.at] = ["Captured", "Assyria", "None", "Assyria"];
    s.losses.push(newLossAbroad({ turn: s.turn, kind: "Captured", characterId: spy.id, court: "Assyria", master: null }));
    let captive = single(Views.for(s, "Assyria").known, (c) => c.id === spy.id);
    Assert.equal(["your captive", null], [captive.status, captive.employer]);

    // One that confessed names its master.
    s.losses.at(-1)!.master = "Babylonia";
    Assert.equal("Babylonia", single(Views.for(s, "Assyria").known, (c) => c.id === spy.id).employer);
  });

  test("The captors record of a capture names only the master the spy confessed to", () => {
    // A timid spy always confesses; a brave one does 40% of the time, so a few games give one that keeps silent.
    for (const [courage, confesses] of [
      [0, true],
      [100, false],
    ] as const) {
      let found = false;
      for (let seed = 1; seed <= 20 && !found; seed++) {
        let [s, spy] = posted(seed);
        spy.traits.courage = courage;
        doCatch(s, spy);
        if ((last(s.losses, (l) => l.characterId === spy.id).master !== null) !== confesses) continue;
        found = true;

        // What the captor's court has on record of it (in the web app, its Events and Season panels).
        let told = s.events.filter((e) => e.visibleTo.includes("Assyria") && e.text.includes(spy.name)).map((e) => e.text);
        let caught = s.events.filter((e) => e.kind === "spy-caught");
        if (confesses) {
          Assert.equal([`Assyria caught ${spy.name}, a spy of Babylonia.`], told);
          Assert.equal(
            ["spy-caught"],
            caught.map((e) => e.signal),
          );
        } else {
          Assert.equal([`Assyria caught ${spy.name}, a spy who will not say whom they serve.`], told);
          // The truth is on record for the god view alone, which counts the capture once.
          let truth = single(caught, (e) => e.visibleTo.length === 0);
          Assert.equal([`Assyria caught ${spy.name}, a spy of Babylonia who would not say so.`, "spy-caught"], [truth.text, truth.signal]);
          Assert.single(caught, (e) => e.signal !== null);
        }
      }
      Assert.true(found, confesses ? "no spy confessed" : "no spy kept silent");
    }
  });

  test("A spy secretly in the pay of the court it watches is seen there", () => {
    let [s, spy] = posted();
    // A plant: placed in Babylonia's service by Assyria, which it really serves.
    spy.secretMaster = "Assyria";
    Assert.false(hiddenAt(spy, "Assyria"));
    let seen = single(Views.for(s, "Assyria").known, (c) => c.id === spy.id);
    Assert.equal(["Babylonia", "at your court"], [seen.employer!, seen.where]);
  });

});
