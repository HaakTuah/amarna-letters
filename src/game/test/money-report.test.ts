import { describe, test } from "vitest";
import { newEarnings } from "@amarna/engine";
import { moneyReport, type MoneyMeasure, type RoadMeasure, type RoadPart } from "../src/money-report.ts";
import { Assert } from "../../engine/test/support.ts";

const part = (people: number, top5: number, top20: number, result: number): RoadPart => ({ people, top5, top20, living: people, result });

const road = (init: Partial<RoadMeasure>): RoadMeasure => ({ people: 100, dead: 0, top5: 0, top20: 0, result: 0, earned: newEarnings(), dangerJobs: 0, safeJobs: 0, ...init });

const game = (bold: Partial<RoadMeasure>, careful: Partial<RoadMeasure>): MoneyMeasure => ({ stocks: [], fees: [], roads: { bold: road(bold), careful: road(careful) } });

/** Item 18, part F4: the roads told apart from who came late and who leads a band ("Bold or careful, one goal"). */
describe("The money report's lines on the roads", () => {
  test("Those there from the start and those leading a band at the end, by road, over the games", () => {
    const lines = moneyReport([
      game({ start: part(40, 2, 6, 800), chiefs: part(30, 1, 3, 600) }, { start: part(50, 1, 8, 500), chiefs: part(5, 0, 0, 10) }),
      game({ start: part(60, 1, 4, 1200), chiefs: part(20, 0, 2, 400) }, { start: part(50, 2, 4, 1500), chiefs: part(5, 0, 1, 40) }),
    ]);
    const start = lines.find((l) => l.includes("There from the start"));
    Assert.contains("bold 100, 3 of the top five (3.0), 10 of the top twenty (10.0), the living gained 20 a head", start!);
    Assert.contains("careful 100, 3 of the top five (3.0), 12 of the top twenty (12.0), the living gained 20 a head", start!);
    const chiefs = lines.find((l) => l.includes("Leading a band at the end"));
    Assert.contains("bold 50, 1 of the top five (2.0), 5 of the top twenty (10.0), the living gained 20 a head", chiefs!);
    Assert.contains("careful 10, 0 of the top five (0.0), 1 of the top twenty (10.0), the living gained 5 a head", chiefs!);
  });

  test("Summaries from before the measure give no line of it", () => {
    const lines = moneyReport([game({}, {})]);
    Assert.false(lines.some((l) => l.includes("There from the start") || l.includes("Leading a band")));
  });
});
