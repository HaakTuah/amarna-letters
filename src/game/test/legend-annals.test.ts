import { afterEach, describe, test } from "vitest";
import { TemplateNarrator } from "../src/bots/template-narrator.ts";
import type { ChronicleContext } from "../src/contracts.ts";
import { addRisen, newGameEvent, setRisen, type Power } from "@amarna/engine";
import { Assert } from "../../engine/test/support.ts";

// Item 14, the echoes kept for the chronicle: "A new Idrimi" in the annals of the man who rose, and Finkel's line in those
// of the court begged for gold a third time; the beggar's own annals keep no such line.
describe("LegendAnnalsTests", () => {
  afterEach(() => setRisen([]));
  const annals = (power: Power, text: string, kind: string, signal: string | null): Promise<string> => {
    const ctx: ChronicleContext = { power, known: [newGameEvent({ turn: 6, kind, text, visibleTo: [power], signal })], scores: [], winners: [], lastTurn: 6 };
    return new TemplateNarrator().chronicle(ctx);
  };

  test("A risen ruler's annals name him a new Idrimi", async () => {
    addRisen({ power: "Tuwanuwa", land: "Tuwanuwa", king: "Pihhuniya", ruler: "c1", capital: "tuwanuwa", turn: 6, from: "Hatti", temper: [] });
    Assert.true((await annals("Tuwanuwa", "Pihhuniya, governor of Tuwanuwa for Hatti, rules it in his own name now that Hatti has fallen.", "rise", "risen")).includes("a new Idrimi"));
  });

  test("The court begged a third time writes Finkel's line; the beggar does not", async () => {
    const t = 'Babylonia begged Egypt for gold a third time: "I love you my gold owning brother."';
    Assert.true((await annals("Egypt", t, "begging", "third-plea")).includes("I love you my gold owning brother"));
    Assert.false((await annals("Babylonia", t, "begging", "third-plea")).includes("gold owning"));
  });
});
