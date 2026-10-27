import { describe, test } from "vitest";
import { type GameState, I, Rng, S, TraitsSchema, dict, distinct, hash, list, newGame, obj, opt, range } from "@amarna/engine";
import { Assert } from "./support.ts";

// <summary>Starting envoys' terms end at different seasons, drawn from a stream of their own.</summary>
describe("StartingTermTests", () => {
  // Everything a starting character is apart from its term's end and its ids. The ids are left out since item 4's fix (d)
  // renumbered them (each kind of object now counts on its own), which moved nothing else. Texts are read with the
  // article the follow-up's review of the fix pass after item 4 corrected put back ("Served as a interpreter", "once a
  // interpreter"), which changed no draw.
  function people(s: GameState): string {
    const fact = obj("Fact", () => ({}), { text: S, secrecy: S, tag: S, knownBy: list(S) });
    const person = obj("Person", () => ({}), {
      name: S,
      origin: S,
      calling: S,
      traits: TraitsSchema,
      facts: list(fact),
      status: S,
      employer: opt(S),
      at: opt(S),
      secretMaster: opt(S),
      persona: S,
      reputation: dict(I),
      wage: opt(I),
      start: opt(I),
    });
    return hash(
      list(person),
      s.characters.map((c) => ({
        name: c.name,
        origin: c.origin,
        calling: c.calling,
        traits: c.traits,
        facts: c.facts.map((f) => ({ text: beforeOf(f.text), secrecy: f.secrecy, tag: f.tag, knownBy: f.knownBy })),
        status: c.status,
        employer: c.employer,
        at: c.at,
        secretMaster: c.secretMaster,
        persona: beforeOf(c.persona),
        reputation: c.reputation,
        wage: c.contract?.wage ?? null,
        start: c.contract?.startTurn ?? null,
      })),
    );
  }

  function beforeOf(text: string): string {
    return text.replaceAll("as an interpreter", "as a interpreter").replaceAll("once an interpreter", "once a interpreter");
  }

  //
  // The fingerprint of the starting characters when every term ended with turn 10, ids left out (taken just before fix (d);
  // the version of this test before then, with the ids in, matched the fingerprint from before terms were staggered).
  // Taken again for save version 7, whose new generator draws every trait and fact anew (build order item 5+).
  //
  test.each([
    [1, "8bc56a55bc22b453"],
    [7, "f6e59af377749771"],
    [42, "eb401e1e13745795"],
  ] as const)("Starting terms end between turns 7 and 13 and every other draw is unchanged %s", (seed: number, before: string) => {
    let s = newGame(seed);
    let envoys = s.characters.filter((c) => c.contract !== null);
    Assert.equal(14, envoys.length);
    Assert.all(envoys, (c) => {
      Assert.equal(Rng.for(seed, 0, "start-term", c.id).range(7, 13), c.contract!.untilTurn);
      Assert.inRange(c.contract!.untilTurn, 7, 13);
    });
    // Traits, facts, wages, posts and plants are what they were before terms were staggered.
    Assert.equal(before, people(s));
  });

  test("The starting corps comes up for renewal over several seasons", () => {
    let ends = range(1, 20).flatMap((seed) =>
      newGame(seed)
        .characters.filter((c) => c.contract !== null)
        .map((c) => c.contract!.untilTurn),
    );
    Assert.equal(
      range(7, 7),
      distinct(ends).sort((a, b) => a - b),
    );
    // No game has every starting envoy's term end in the same season.
    Assert.all(range(1, 20), (seed) =>
      Assert.true(
        distinct(
          newGame(seed)
            .characters.filter((c) => c.contract !== null)
            .map((c) => c.contract!.untilTurn),
        ).length >= 3,
      ),
    );
  });
});
