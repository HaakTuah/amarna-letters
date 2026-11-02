import { describe, test } from "vitest";
import { Dict, newCharacter, newGame, newGameConfig, newGovernor, newId, newInboxItem, newMoodRead } from "@amarna/engine";
import { Assert } from "../../engine/test/support.ts";
import { holdingLayer, tintClass } from "../src/map/holding.ts";
import { buildScene } from "../src/map/scene.ts";
import { frameFrom } from "../src/session/frames.ts";

// Who holds what, and the mood of the land (item 17++, part C): three steps of a realm's colour, governors' blocs, and the
// mood view drawn only from what the seat was told, dated; in god view as it is.
describe("MapHoldingTests", () => {
  test("Ruled, governed and a vassal's land read as three steps; a seat sees its own governors and reads the mood only from what reached it, dated when seen", () => {
    const s = newGame(1, newGameConfig({ catastropheChance: 0 }));
    const c = newCharacter({ id: newId(s, "c"), name: "Hutupiyanza", status: "Employed", employer: "Hatti", duty: "Governing", watchProvince: "tuwanuwa" });
    s.characters.push(c);
    s.governors = s.governors.filter((g) => g.province !== "tuwanuwa" && g.province !== "kizzuwatna");
    s.governors.push(newGovernor({ province: "tuwanuwa", seat: "tuwanuwa", character: c.id, power: "Hatti", from: 0 }));
    s.governors.push(newGovernor({ province: "kizzuwatna", seat: "tuwanuwa", character: c.id, power: "Hatti", from: 0 }));
    // His report, seen two seasons ago and just arrived; a newer one still on the road; a letter's prose is never read.
    s.moodReads.push(newMoodRead({ power: "Hatti", province: "tuwanuwa", mood: "uneasy", seen: s.turn - 2, known: s.turn, source: "governor" }));
    s.moodReads.push(newMoodRead({ power: "Hatti", province: "tuwanuwa", mood: "near revolt", seen: s.turn - 1, known: s.turn + 1, source: "governor" }));
    s.inbox.get("Hatti").push(newInboxItem({ turn: s.turn, kind: "Notice", title: "Your governor writes", body: `${c.name}, your governor of Kizzuwatna, writes that its people are restless.` }));
    const reads = s.moodReads.length;
    s.obeyed = new Dict([["tuwanuwa", 500]]);
    const f = frameFrom(s, 0, null);
    const hatti = buildScene([f], 0, "Hatti");
    Assert.equal("tint t-hatti", tintClass(hatti, "hattusa", "Hatti"));
    Assert.equal("tint t-hatti h-gov", tintClass(hatti, "tuwanuwa", "Hatti"));
    // Ugarit is Egypt's vassal in 1346: Egypt's faint wash, in god view and in Egypt's seat, which holds the tablet.
    const god = buildScene([f], 0, null);
    Assert.equal("tint t-egypt h-vassal", tintClass(god, "ugarit", "Ugarit"));
    Assert.equal("tint t-egypt h-vassal", tintClass(buildScene([f], 0, "Egypt"), "ugarit", "Ugarit"));
    // One bloc for the governor of two, his name on the card's line.
    Assert.equal(1, holdingLayer(hatti, "realms").split(`data-governor="${c.id}"`).length - 1);
    Assert.equal(2, [...hatti.governors.values()].filter((g) => g.character === c.id).length);
    // Another seat sees none of Hatti's governors.
    Assert.equal(0, [...buildScene([f], 0, "Egypt").governors.values()].filter((g) => g.power === "Hatti").length);
    // The mood: in Hatti's seat from the report that reached it, two seasons old, and no word where none came; its own city
    // as it sees it; another seat has none of Hatti's reads; in god view as it obeys. Building the frame changes nothing.
    Assert.equal({ mood: "uneasy", age: 2 }, hatti.mood.get("tuwanuwa"));
    Assert.false(hatti.mood.has("nesa"));
    Assert.false(hatti.mood.has("kizzuwatna"));
    Assert.equal({ mood: "loyal", age: 0 }, hatti.mood.get("hattusa"));
    Assert.false(buildScene([f], 0, "Egypt").mood.has("tuwanuwa"));
    Assert.equal(reads, s.moodReads.length);
    Assert.equal("restless", god.mood.get("tuwanuwa")!.mood);
    Assert.true(holdingLayer(hatti, "mood").includes("mood-none"));
    Assert.false(holdingLayer(hatti, "realms").includes("mood-"));
  });
});
