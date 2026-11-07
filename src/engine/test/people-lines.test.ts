import { describe, test } from "vitest";
import { TurnEngine, Views, WorldMap, newGame, newGameConfig, type Character } from "@amarna/engine";
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
  test("A court is named as the game shows it, never by its id (bug #797)", () => {
    const s = smallWorld(newGame(1, newGameConfig({ catastropheChance: 0 })), "Egypt", "Byblos", "Seha");
    const c = s.characters.find((x) => x.employer === "Egypt" && x.status === "Employed")!;
    const line = () => Views.for(s, "Egypt").court.find((x) => x.id === c.id)!;
    c.at = "Byblos";
    c.duty = "EnvoyAtCourt";
    Assert.equal("at the court of Gubla", line().where);
    Assert.equal("at the court of Gubla", Views.character(s, c, "Egypt").where);
    c.at = null;
    c.duty = "Detained";
    c.missionTarget = "Seha";
    Assert.equal("has not returned from the Seha River Land", line().duty);
    c.duty = "EnvoyOutbound";
    Assert.equal("travelling as envoy to the Seha River Land", line().duty);
    // A cover keeps the court by its id beside the words, for the map to place it (never read back from a name).
    c.at = "Byblos";
    c.duty = "EnvoyAtCourt";
    new TurnEngine(s).coverFor(c, "Egypt", "EnvoyAtCourt");
    Assert.equal(["at the court of Gubla", "Byblos"], [c.covers[0].whereText, c.covers[0].court]);
  });
  test("A fallen king still rules his realm to a court that has not heard of its fall (bug #817)", () => {
    const s = smallWorld(newGame(1, newGameConfig({ catastropheChance: 0 })), "Egypt", "Byblos");
    const king = s.characters.find((x) => x.id === s.reigns.get("Byblos").character)!;
    const origin = king.facts.find((f) => f.tag === "origin" && f.text.startsWith("Rules "))!;
    const rules = origin.text;
    // Gubla falls (as `fall` in turn/resolve.ts writes it); Egypt has not heard.
    s.eliminated.push("Byblos");
    origin.text = `Ruled ${rules.slice("Rules ".length)}`;
    Assert.contains(Views.character(s, king, "Egypt").knownFacts, (f) => f === rules);
    s.fallsHeard.set("Egypt", ["Byblos"]);
    Assert.contains(Views.character(s, king, "Egypt").knownFacts, (f) => f === origin.text);
  });
});
