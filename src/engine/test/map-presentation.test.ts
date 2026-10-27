import { describe, test } from "vitest";
import {
  Crossings,
  Desert,
  Rivers,
  Rough,
  WorldMap,
  crossingBetween,
  dateLabel,
  ending,
  joins,
  neutral,
  newGameConfig,
  riversThrough,
  season,
  shortDate,
  single,
  terrainOf,
  yearBce,
} from "@amarna/engine";
import { Assert } from "./support.ts";

// The date labels and the terrain data added for the visual overhaul (Build order item 2). Both are display data:
// no rule reads them, so they must name only real places and connections and the labels must count as the engine does.
describe("MapPresentationTests", () => {
  test("Turn 1 is the first season of 1345 BCE and each later year is one less", () => {
    Assert.equal("Akhet, 1345 BCE (turn 1)", dateLabel(1, "Egypt"));
    Assert.equal("the first season, 1345 BCE (turn 1)", dateLabel(1, "Hatti"));
    Assert.equal("season 1, 1345 BCE (turn 1)", dateLabel(1));
    Assert.equal("Shemu, 1345 BCE (turn 3)", dateLabel(3, "Egypt"));
    Assert.equal("Akhet, 1344 BCE (turn 4)", dateLabel(4, "Egypt"));
    Assert.equal("Peret, 1344 BCE (turn 5)", dateLabel(5, "Egypt"));
    Assert.equal("Shemu, 1341 BCE (turn 15)", dateLabel(15, "Egypt"));
    Assert.equal("the third season, 1341 BCE (turn 15)", dateLabel(15, "Babylonia"));
    Assert.equal("Peret, 1343 BCE (turn 8)", dateLabel(8, "Egypt"));
    Assert.equal("season 2, 1343 BCE (turn 8)", dateLabel(8));
    Assert.equal(1326, yearBce(60));
  });

  test("The short form keeps the year and season", () => {
    Assert.equal("Peret 1343 BCE", shortDate(8, "Egypt"));
    Assert.equal("s2 1343 BCE", shortDate(8, "Mitanni"));
    Assert.equal("s3 1341 BCE", shortDate(15));
  });

  test("The ending line names the first season that may end the age then the chance", () => {
    let c = newGameConfig();
    Assert.equal("The age cannot end before Shemu, 1341 BCE (turn 15).", ending(8, c.minTurns, c.endChance, "Egypt"));
    Assert.equal("The age cannot end before season 3, 1341 BCE (turn 15).", ending(14, c.minTurns, c.endChance));
    Assert.equal("Any season may now be the last (15% each season).", ending(15, c.minTurns, c.endChance));
  });

  test("The old court reckoning is unchanged", () => {
    // The seat view and the prompts read Season; the new labels must not have changed it.
    Assert.equal("Peret (growing), year 3", season(8, "Egypt"));
    Assert.equal("the second season, year 3", season(8, "Hatti"));
    Assert.equal("Season 2 of year 3 (turn 8)", neutral(8));
  });

  test("Terrain names only land provinces and Crossings only real connections", () => {
    let map = WorldMap.default;
    for (const id of Rough.concat(Desert)) Assert.true(map.exists(id) && !map.get(id).isSea, id);
    for (const c of Crossings) Assert.contains(map.edges, (e) => joins(c, e.a, e.b));
    Assert.equal("Rough", terrainOf("mira"));
    Assert.equal("Desert", terrainOf("sinai"));
    Assert.equal("Open", terrainOf("babylon"));
    Assert.equal("the Cilician Gates", crossingBetween("kizzuwatna", "tuwanuwa")?.name);
    Assert.null(crossingBetween("babylon", "nippur"));
  });

  test("The Rivers run in the decided order through land provinces", () => {
    let map = WorldMap.default;
    Assert.equal(["thebes", "akhetaten", "memphis", "delta"], single(Rivers, (r) => r.id === "nile").course);
    Assert.equal(["carchemish", "terqa", "mari", "sippar", "babylon", "nippur", "ur"], single(Rivers, (r) => r.id === "euphrates").course);
    Assert.equal(["nineveh", "ashur", "ekallatum", "durkurigalzu"], single(Rivers, (r) => r.id === "tigris").course);
    for (const r of Rivers) for (const id of r.course) Assert.true(map.exists(id) && !map.get(id).isSea, id);
    Assert.equal(
      ["Euphrates"],
      riversThrough("babylon").map((r) => r.name),
    );
  });
});
