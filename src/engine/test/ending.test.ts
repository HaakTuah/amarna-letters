import { describe, test } from "vitest";
import { GameStateSchema, Views, canPlayOn, drawFinalSeason, endChanceAt, newGame, newGameConfig, playOn, serialize, AllPowers } from "@amarna/engine";
import { Assert } from "./support.ts";

// The random ending (build order item 6a): the last season drawn once in secret at the start, the cap and the median as
// settings, the open age, and nothing shown that reads the drawn season.
describe("EndingTests", () => {
  test("The rising chance follows the first guess: tiny at first, about 1% by season 15, 3% by season 44", () => {
    Assert.inRange(endChanceAt(1, 44), 0.0006, 0.0008);
    Assert.inRange(endChanceAt(15, 44), 0.009, 0.012);
    Assert.inRange(endChanceAt(30, 44), 0.019, 0.023);
    Assert.inRange(endChanceAt(44, 44), 0.029, 0.034);
  });

  test("Half of all ages end by the median season, and the cap is drawn from its range", () => {
    const c = newGameConfig();
    const seasons = Array.from({ length: 4000 }, (_, i) => drawFinalSeason(i + 1, c)!);
    const share = (n: number): number => seasons.filter((f) => f.season <= n).length / seasons.length;
    Assert.inRange(share(44), 0.47, 0.53);
    Assert.inRange(share(14), 0.05, 0.1);
    Assert.inRange(share(30), 0.22, 0.29);
    for (const f of seasons) Assert.inRange(f.season, 1, 100);
    for (const f of seasons.filter((x) => x.byCap)) Assert.inRange(f.season, 80, 100);
    // About one game in thirty plays season 90.
    Assert.inRange(seasons.filter((f) => f.season >= 90).length / seasons.length, 0.015, 0.05);
  });

  test("The median is a setting: a later median makes longer ages", () => {
    const later = newGameConfig({ endMedian: 60 });
    const seasons = Array.from({ length: 2000 }, (_, i) => drawFinalSeason(i + 1, later)!.season);
    Assert.inRange(seasons.filter((s) => s <= 60).length / seasons.length, 0.46, 0.54);
  });

  test("A range of one season is a known cap; no cap leaves the rising chance alone; an open age draws nothing", () => {
    const known = newGameConfig({ capMin: 10, capMax: 10, endMedian: 10000 });
    Assert.equal(10, drawFinalSeason(3, known)!.season);
    Assert.true(drawFinalSeason(3, known)!.byCap);
    for (let seed = 1; seed <= 300; seed++) Assert.false(drawFinalSeason(seed, newGameConfig({ capped: false }))!.byCap);
    Assert.null(drawFinalSeason(3, newGameConfig({ openAge: true })));
  });

  test("The last season is drawn once at the start, from its own stream, and the game ends there", () => {
    const s = newGame(7);
    const drawn = drawFinalSeason(7, s.config)!;
    Assert.equal(drawn.season, s.finalSeason);
    Assert.equal(drawn.byCap, s.finalByCap);
  });

  test("No seat's view carries the drawn season or the ending's numbers", () => {
    const s = newGame(7, newGameConfig({ capMin: 87, capMax: 87, endMedian: 10000 }));
    Assert.equal(87, s.finalSeason);
    for (const p of AllPowers) {
      const v = Views.for(s, p) as unknown as Record<string, unknown>;
      Assert.false("finalSeason" in v);
      Assert.false("endMedian" in v);
      Assert.false(JSON.stringify(v).includes('"finalSeason"'));
    }
  });

  test("Playing on opens the age after its end, keeps the winners and never ends again by itself", () => {
    const s = newGame(5, newGameConfig({ capMin: 2, capMax: 2, endMedian: 10000 }));
    Assert.false(canPlayOn(s));
    s.ended = true;
    s.endReason = "the age has run its course";
    s.winners = ["Hatti"];
    Assert.true(canPlayOn(s));
    const turn = s.turn;
    playOn(s);
    Assert.false(s.ended);
    Assert.true(s.config.openAge);
    Assert.null(s.finalSeason);
    Assert.equal(turn, s.ageEndedTurn);
    Assert.equal(turn + 1, s.turn);
    Assert.equal("Hatti", s.winners[0]);
    Assert.contains("ageEndedTurn", serialize(GameStateSchema, s));
  });

  test("An age that ended with one kingdom left cannot be played on", () => {
    const s = newGame(5);
    s.ended = true;
    s.endReason = "only one kingdom remains";
    Assert.false(canPlayOn(s));
  });
});
