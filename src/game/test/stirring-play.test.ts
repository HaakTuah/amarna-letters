import { describe, test } from "vitest";
import { Board } from "../src/bots/board.ts";
import { watchedProvinces } from "../src/bots/freedom.ts";
import { Views, newGame, newGameConfig } from "@amarna/engine";
import { Assert } from "../../engine/test/support.ts";

// Build order item 17++: a script king stirs a people, and weighs their land as a target, by the provinces his spies watch,
// which he reads from his own court as the seat view shows it.
describe("Stirring, as the script kings play it", () => {
  test("A king knows the provinces his spies watch, on their way and at their posts, and not those a court's resident watches", () => {
    const s = newGame(1, newGameConfig({ catastropheChance: 0 }));
    const spy = s.characters.find((c) => c.status === "Free")!;
    Object.assign(spy, { status: "Employed", employer: "Hatti", duty: "SpyOutbound", at: null, missionTarget: null, watchProvince: "kizzuwatna" });
    Assert.true(watchedProvinces(new Board(Views.for(s, "Hatti"))).has("kizzuwatna"));
    spy.duty = "SpyPosted";
    Assert.true(watchedProvinces(new Board(Views.for(s, "Hatti"))).has("kizzuwatna"));
    // Pharaoh's commissioner at Magidda is a resident at its court, out in no province.
    Assert.false(watchedProvinces(new Board(Views.for(s, "Egypt"))).has("megiddo"));
  });
});
