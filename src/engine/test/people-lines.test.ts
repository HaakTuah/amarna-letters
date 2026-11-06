import { describe, test } from "vitest";
import { Views, WorldMap, newGame, newGameConfig, type Character } from "@amarna/engine";
import { Assert, smallWorld } from "./support.ts";

// Bug #734: a court's own people are described with each place named as the map names it, and said once; the view keeps
// the province such a person stands in as a field of its own for anyone who must look it up.
describe("PeopleLineTests", () => {
  const map = WorldMap.default;
  function egypt(): [ReturnType<typeof newGame>, Character] {
    const s = smallWorld(newGame(1, newGameConfig({ catastropheChance: 0 })), "Egypt", "Hatti");
    const c = s.characters.find((x) => x.employer === "Egypt" && x.status === "Employed")!;
    return [s, c];
  }
  const line = (s: ReturnType<typeof newGame>, c: Character) => Views.for(s, "Egypt").court.find((x) => x.id === c.id)!;

  test("A governor's province is named as the map names it, once", () => {
    const [s, c] = egypt();
    c.at = null;
    c.duty = "Governing";
    c.watchProvince = "delta";
    const v = line(s, c);
    Assert.equal(`governing ${map.get("delta").name}`, v.duty);
    Assert.equal("", v.where);
    Assert.equal("delta", v.province);
  });

  test("A general, a band's leader and a spy on his errand name their place by its name", () => {
    const [s, c] = egypt();
    c.at = null;
    c.watchProvince = "kizzuwatna";
    for (const [duty, words] of [["Commanding", "commanding an army in"], ["Leading", "leading a band in"]] as const) {
      c.duty = duty;
      Assert.equal(`${words} ${map.get("kizzuwatna").name}`, line(s, c).duty);
      Assert.equal("", line(s, c).where);
    }
    c.duty = "SpyOutbound";
    c.missionTarget = null;
    Assert.equal(`travelling on a quiet errand to ${map.get("kizzuwatna").name}`, line(s, c).duty);
    Assert.equal(`in ${map.get("kizzuwatna").name}`, line(s, c).where);
  });

  test("An envoy at a foreign court is said to be there once", () => {
    const [s, c] = egypt();
    c.at = "Hatti";
    c.duty = "EnvoyAtCourt";
    const v = line(s, c);
    Assert.equal("as envoy", v.duty);
    Assert.equal("at the court of Hatti", v.where);
    Assert.null(v.province);
  });
});
