import { describe, test } from "vitest";
import { GameStateSchema, newGame, serialize } from "@amarna/engine";
import { GameRunner, ScriptMind, SnapshotStore, TemplateNarrator } from "@amarna/game";
import { Assert } from "../../engine/test/support.ts";
import { scriptSeats, seasons } from "./small-world.ts";

// Item 17a, the crash: a whole state kept as JSON for every season ran to a gigabyte by the age's end and crashed the page
// on a phone. The snapshots share what did not change between seasons, and read back exactly what was pushed.
describe("Snapshots", () => {
  test("Pieces read back as pushed, whatever the shape", () => {
    const store = new SnapshotStore();
    const texts = [
      `{"a":1,"b":[1,2,{"c":"x,y[]{}\\"q"}],"d":{"k":[[1,[2,[3]]]],"m":{"n":{"o":{"p":1}}}},"e":"tail"}`,
      `{"a":1,"b":[1,2,{"c":"x,y[]{}\\"q"}],"d":{"k":[[1,[2,[3]]]],"m":{"n":{"o":{"p":2}}}},"e":"tail"}`,
      "[]",
      "{}",
      `"just a string, with [brackets] and {braces}"`,
      "12",
    ];
    texts.forEach((t) => store.push(t));
    texts.forEach((t, i) => Assert.equal(t, store.get(i)));
    Assert.equal(6, store.length);
    Assert.equal(null, store.get(6));
  });

  test("Seasons share what did not change", async () => {
    // The smallest game that shows it: a few script kings on part of the map, a dozen seasons.
    const r = new GameRunner(newGame(9, seasons(14)), scriptSeats(9), new ScriptMind(), new TemplateNarrator());
    r.writeChronicles = false;
    await r.prepare();
    for (let i = 0; i < 12 && !r.state.ended; i++) await r.playTurn();
    const last = serialize(GameStateSchema, r.state);
    Assert.equal(r.state.turn, r.snapshots.length);
    // Exact: the newest snapshot is the state as it stands, and an older one reads back as a state of its own season.
    Assert.equal(last, r.snapshots.get(r.snapshots.length - 1));
    Assert.equal(4, r.stateAt(3)!.turn);
    // Kept whole, thirteen snapshots would be many times the last one; shared, they are little more than it.
    Assert.true(r.snapshots.totalLength > 5 * last.length, `whole: ${r.snapshots.totalLength} against ${last.length}`);
    Assert.true(r.snapshots.uniqueLength < 2.5 * last.length, `kept: ${r.snapshots.uniqueLength} against ${last.length}`);
  });
});
