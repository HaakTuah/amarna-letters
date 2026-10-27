import { describe, test } from "vitest";
import { AllPowers, type Power, fmt, newGame, newGameConfig } from "@amarna/engine";
import { GameLog, GameRunner } from "@amarna/game";
import { CostEstimate, ModelIds, Preset, Presets, SeatChoices, SimulatedApi, buildSeats, choicesFromHeader, providersFor } from "@amarna/llm";
import { str, Assert } from "../../engine/test/support.ts";

describe("PresetTests", () => {
  function doWith(p: Preset, human: Power | null = null): SeatChoices {
    let c = new SeatChoices();
    const h = human;
    if (h !== null && h !== undefined) c.leaders.set(h, "Human");
    p.applyTo(c);
    return c;
  }

  test("Presets keep the players own seat", () => {
    let c = doWith(Presets.Showcase, "Egypt");
    Assert.equal("Human", c.leaders.get("Egypt"));
    Assert.all(
      AllPowers.filter((p) => p !== "Egypt"),
      (p) => Assert.equal("Opus", c.leaders.get(p)),
    );
    Assert.equal("Haiku", c.characters);
    Assert.equal("Opus", c.narrator);
    Assert.same(Presets.Showcase, Presets.matching(c));

    c.leaders.set("Hatti", "Sonnet");
    Assert.null(Presets.matching(c));
  });

  test("Only the free preset works without a key", () => {
    Assert.false(Presets.Free.needsKey);
    Assert.false(doWith(Presets.Free).usesModels);
    Assert.all(
      Presets.all.filter((p) => p !== Presets.Free),
      (p) => Assert.true(p.needsKey),
    );
  });

  test("Estimates rise with the models", () => {
    let free = CostEstimate.perGame(doWith(Presets.Free));
    let budget = CostEstimate.perGame(doWith(Presets.Budget));
    let standard = CostEstimate.perGame(doWith(Presets.Standard));
    let showcase = CostEstimate.perGame(doWith(Presets.Showcase));
    console.log(`free ${fmt(free, "0.00")}, budget ${fmt(budget, "0.00")}, standard ${fmt(standard, "0.00")}, showcase ${fmt(showcase, "0.00")}`);
    Assert.equal(0, free);
    Assert.inRange(budget, 0.05, 1.0);
    Assert.true(standard > budget * 5);
    Assert.true(showcase > standard * 1.5);
    Assert.equal("free", CostEstimate.describe(free));
    Assert.equal("under $1", CostEstimate.describe(budget));
    Assert.true(CostEstimate.suggestedBudget(standard) >= standard);

    let human = CostEstimate.perGame(doWith(Presets.Standard, "Egypt"));
    Assert.true(human < standard);
  });

  test("Haiku kings play through the simulated api", async () => {
    let fake = new SimulatedApi();
    let state = newGame(5, newGameConfig({ minTurns: 2, endChance: 1.0 }));
    let runner: GameRunner | null = null;
    let budget = doWith(Presets.Budget);
    let set = buildSeats(budget, state, providersFor(budget, fake, {}), () => runner!.log);
    runner = new GameRunner(state, set.seats, set.minds, set.narrator);
    while (await runner.playTurn()) {}
    Assert.empty(runner.errors);
    Assert.all(fake.requests, (r) => Assert.equal(ModelIds.Haiku, str(r, "model")));
    Assert.all(fake.requests, (r) => Assert.null(r.fallbacks ?? null));
    Assert.equal("Haiku 5.5 leader", runner.log.header.seats.get("Egypt"));
  });

  test("Saved games remember who played what", () => {
    let c = doWith(Presets.Showcase, "Arzawa");
    c.leaders.set("Hatti", "Haiku");
    c.characters = "Sonnet";
    let state = newGame(1);
    let runner: GameRunner | null = null;
    let set = buildSeats(c, state, providersFor(c, new SimulatedApi(), {}), () => runner!.log);
    runner = new GameRunner(state, set.seats, set.minds, set.narrator);
    let back = choicesFromHeader(GameLog.fromJsonl(runner.log.toJsonl()).header);
    Assert.equal(c.leaders, back.leaders);
    Assert.equal(c.characters, back.characters);
    Assert.equal(c.narrator, back.narrator);
  });
});
