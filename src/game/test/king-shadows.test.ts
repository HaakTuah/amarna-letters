import { describe, test } from "vitest";
import { GameStateSchema, hash, newGame, newHostReply, newTurnSubmission, newGameConfig, type Power } from "@amarna/engine";
import { GameLog, GameRunner, hostDiffer, submissionsDiffer } from "@amarna/game";
import { SeatChoices, SimulatedApi, Spending, buildSeats, newSpendingSettings, providersFor } from "@amarna/llm";
import { Assert } from "../../engine/test/support.ts";
import { Near, smallSeats, seasons } from "./small-world.ts";

/** Item 18, part E2: how close the script's call was, and the shadow script beside every model king ("Shadow scripts"). */
describe("Shadow scripts and the script's margins (item 18)", () => {
  test("An obvious call is worth less in a model: quality grows with the margin, and the budget climbs less", () => {
    const s = new Spending(newSpendingSettings({ mode: "limit", limitUsd: 10, auditShare: 0 }), newGameConfig(), 7, () => 0);
    Assert.true(s.quality("orders", "script", 1) > s.quality("orders", "script", 0.5));
    Assert.true(s.quality("orders", "script", 0.5) > s.quality("orders", "script", 0));
    Assert.equal(1, s.quality("orders", "large", 0));
    const options = [
      { rung: "script" as const, model: "", cost: 0 },
      { rung: "large" as const, model: "m", cost: 0.05 },
    ];
    const rank = { script: 0, small: 1, large: 2 };
    // Stakes high enough that a coin toss pays for the model; the same stakes on an obvious call climb no higher.
    const close = s.choose(1, { kind: "orders", moved: 3, margin: 0 }, options, "large");
    const obvious = s.choose(1, { kind: "orders", moved: 3, margin: 1 }, options, "large");
    Assert.true(rank[obvious] <= rank[close]);
    Assert.equal("large", close);
  });

  test("Two kings' orders differ by what they do, unit by unit and action by action; two answers by what they give and seal", () => {
    const a = newTurnSubmission({ orders: [{ type: "move", unit: "u1", to: "harran" }, { type: "hold", unit: "u2" }] });
    const b = newTurnSubmission({ orders: [{ type: "move", unit: "u1", to: "harran" }] });
    Assert.equal(0, submissionsDiffer(a, b));
    const c = newTurnSubmission({ orders: [{ type: "move", unit: "u1", to: "nineveh" }] });
    Assert.equal(0.5, submissionsDiffer(a, c));
    Assert.equal(0, hostDiffer(newHostReply(), newHostReply()));
    Assert.equal(1, hostDiffer(newHostReply({ sealProposal: true }), newHostReply()));
  });

  test("Beside every model king's orders and every envoy it answers, the script's decision is logged; the game replays exactly", async () => {
    const c = new SeatChoices();
    for (const p of Near) c.leaders.set(p, p === "Assyria" ? "Sonnet" : "Script");
    const state = newGame(3, seasons(6));
    let runner: GameRunner | null = null;
    const set = buildSeats(c, state, providersFor(c, new SimulatedApi(), {}), () => runner!.log);
    runner = new GameRunner(state, smallSeats((p: Power) => set.seats.get(p)), set.minds, set.narrator, { jobs: c.jobs });
    await runner.prepare();
    for (let i = 0; i < 6 && (await runner.playTurn()); i++) {}
    const orders = runner.log.decisions.filter((d) => /^t\d+\/orders\/Assyria$/.test(d.key) && d.by?.kind === "model");
    Assert.notEmpty(orders);
    const shadows = runner.log.kingShadows;
    Assert.equal(orders.length, shadows.filter((s) => s.kind === "orders" && s.error === null).length);
    Assert.all(shadows, (s) => Assert.equal("Assyria", s.power));
    Assert.all(shadows.filter((s) => s.kind === "orders"), (s) => Assert.true(s.margin >= 0 && s.margin <= 1));
    const hosted = runner.log.decisions.filter((d) => /^t\d+\/aud\/.*\/host\//.test(d.key) && d.by?.kind === "model" && d.by.name.includes("Sonnet"));
    Assert.equal(hosted.length, shadows.filter((s) => s.kind === "court" && s.error === null).length);
    Assert.notEmpty(hosted);
    // The record comes back from the log, and the shadow, out of play, changes nothing a replay reads.
    const log = GameLog.fromJsonl(runner.log.toJsonl());
    Assert.equal(shadows.length, log.kingShadows.length);
    const replay = GameRunner.forReplay(log);
    await replay.prepare();
    for (let i = 0; i < 6 && (await replay.playTurn()); i++) {}
    Assert.equal(hash(GameStateSchema, runner.state), hash(GameStateSchema, replay.state));
  });
});
