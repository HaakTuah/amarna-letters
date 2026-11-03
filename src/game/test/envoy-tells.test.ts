import { describe, test } from "vitest";
import { newCharacter, newExchange, newFact, newHomeCargo, newMessageTrail, newMindRequest, newTraits, type Traits } from "@amarna/engine";
import { ScriptMind, newMindContext } from "@amarna/game";
import { Home } from "../src/bots/envoy-words.ts";
import { Assert } from "../../engine/test/support.ts";

/** A script envoy's report home from a warm court (Hatti spoke no threat), in season `turn`. */
async function reportOf(traits: Partial<Traits>, bribed: boolean, turn: number, asked = "Tell your lord that my armies are few."): Promise<string> {
  const envoy = newCharacter({ id: "c1", name: "Keliya", origin: "Mitanni", calling: "scribe", status: "Employed", employer: "Egypt", traits: newTraits(traits) });
  if (bribed) envoy.facts.push(newFact({ id: "f1", text: "Took 40 shekels from the king of Hatti.", secrecy: "Hidden", tag: "bribe", knownBy: ["Hatti"] }));
  const trail = newMessageTrail({
    id: "m1",
    turn,
    from: "Egypt",
    to: "Hatti",
    exchanges: [newExchange({ host: "Go in peace. My brother is dear to me.", envoy: "I will carry your words." })],
    outcomes: bribed ? [`accepted 40 shekels from Hatti (asked: ${asked})`] : [],
  });
  const ctx = newMindContext({
    request: newMindRequest({ task: "EnvoyReport", characterId: envoy.id, court: "Egypt", cargo: newHomeCargo() }),
    self: envoy,
    turn,
    seed: 1,
    trail,
  });
  return (await new ScriptMind().write(ctx)).text;
}

/** The fixed words of every form of every line an envoy says at home: what stands before its first blank. */
const stems = Object.entries(Home).flatMap(([line, forms]) => forms.map((f) => [line, f.split("{")[0].trim()] as const)).filter(([, s]) => s.length >= 12);

/** The forms these reports use. */
const used = (reports: readonly string[]): Set<string> => new Set(stems.filter(([, s]) => reports.some((r) => r.includes(s))).map(([l, s]) => `${l}: ${s}`));

// #591 (the owner, 3 November 2026: script characters only): no phrasing gives an envoy's hidden state away. Every form a
// bought or frightened envoy uses at home, an honest envoy back from a warm court uses too, in some season.
describe("EnvoyTellsTests", () => {
  test("Every form a bribed or frightened envoy says at home, an honest one at a warm court says too", async () => {
    const seasons = Array.from({ length: 60 }, (_, i) => i + 1);
    const honest = await Promise.all(seasons.map((t) => reportOf({ loyalty: 70, courage: 60, ambition: 30 }, false, t)));
    const bribed = await Promise.all(seasons.map((t) => reportOf({ loyalty: 30, greed: 80, courage: 60, ambition: 30 }, true, t)));
    const fearful = await Promise.all(seasons.map((t) => reportOf({ loyalty: 40, courage: 20, ambition: 30 }, false, t)));
    const fair = used(honest);
    for (const [who, reports] of [["bribed", bribed], ["frightened", fearful]] as const)
      for (const form of used(reports)) Assert.true(fair.has(form), `only a ${who} envoy says "${form}"`);
    Assert.true(fair.has(`quoted: The king spoke kindly: "`), "an honest envoy never tells of kind words");
  });
});
