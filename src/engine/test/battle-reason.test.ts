import { describe, test } from "vitest";
import { orders } from "../../llm/src/parse.ts";
import {
  Dict,
  type GameState,
  type Power,
  TurnEngine,
  type TurnSubmission,
  Views,
  WorldMap,
  convoy,
  inboxOf,
  move,
  newGame,
  newGameConfig,
  newUnit,
  single,
  support,
  unitAt,
  LandData,
} from "@amarna/engine";
import { Assert, armiesBefore13, formerHome, formerHomes, subs } from "./support.ts";

// The reasons a battle report gives that the first battle report tests leave out: a head-to-head lost before a
// third move walked in, a unit out of sight left unnamed, a unit that could not leave, a missing convoy, and
// supports or convoys that matched nothing.
describe("BattleReasonTests", () => {
  function report(s: GameState, p: Power): string {
    return single(inboxOf(s, p), (i) => i.kind === "Battle" && i.title.startsWith("Movements")).body;
  }

  function resolve(s: GameState, orders: Dict<Power, TurnSubmission>): void {
    new TurnEngine(s).resolve(orders);
  }

  test("A head to head lost is the reason even when a third move takes the province", () => {
    // Assyria (2) and Mitanni (2.3, with Arrapha's small army) meet head to head between Ekallate and Suhu; Hatti walks into the Suhu Mitanni left.
    let s = formerHome(formerHomes(newGame(1, newGameConfig({ peopleDefence: 0 }))), "suhu", "Mitanni");
    unitAt(s, "terqa")!.power = "Hatti";
    resolve(
      s,
      subs({
        Assyria: { orders: [move("ekallate", "suhu"), support("ashur", "ekallate", "suhu")] },
        Mitanni: { orders: [move("suhu", "ekallate")] },
        Babylonia: { orders: [support("durkurigalzu", "suhu", "ekallate")] },
        Arrapha: { orders: [support("arrapha", "suhu", "ekallate")] },
        Hatti: { orders: [move("terqa", "suhu")] },
      }),
    );

    Assert.equal("Hatti", unitAt(s, "suhu")?.power);
    Assert.equal("Mitanni", unitAt(s, "ekallate")?.power);
    let assyria = report(s, "Assyria");
    Assert.contains("- army in Ekallate -> Suhu: fails: it met the unit from Suhu (Mitanni's army) coming the other way; your strength 2 against 2.3", assyria);
    // With nowhere to fall back (item 13), it is destroyed.
    Assert.contains("- army in Ekallate is destroyed", assyria);
    Assert.doesNotContain(
      "from Terqa",
      single(assyria.split("\n"), (l) => l.startsWith("- army in Ekallate -> Suhu")),
    );
  });

  test("A unit holding a coast out of sight is not named and a missing convoy is the reason", () => {
    // Egypt's army in the Delta crosses the open sea in Alashiya's ships, one in each sea zone of the way, to Lukka, which Arzawa
    // holds; Lukka lies beyond Egypt's sight.
    function board(): GameState {
      let s = armiesBefore13(newGame(1, newGameConfig({ peopleDefence: 0 })));
      Object.assign(single(s.units, (u) => u.province === "delta"), { kind: "Army", men: LandData.armyMen });
      single(s.units, (u) => u.province === "enkomi").province = "deltawaters";
      s.units.push(newUnit({ id: "u91", power: "Alashiya", kind: "Fleet", province: "westsea" }));
      s.units.push(newUnit({ id: "u92", power: "Alashiya", kind: "Fleet", province: "lukkawaters" }));
      s.walls.delete("lukka");
      s.owner.set("lukka", "Arzawa");
      s.units.push(newUnit({ id: "u90", power: "Arzawa", kind: "Army", province: "lukka" }));
      return s;
    }

    let s = board();
    Assert.doesNotContain("lukka", Views.sight(s, WorldMap.default, "Egypt"));
    resolve(
      s,
      subs({
        Egypt: { orders: [move("delta", "lukka")] },
        Alashiya: { orders: ["deltawaters", "westsea", "lukkawaters"].map((f) => convoy(f, "delta", "lukka")) },
      }),
    );
    let egypt = report(s, "Egypt");
    // Lukka is rough ground (Build order item 5, terrain): the unit holding it has 1 more, and the report gives its share.
    Assert.contains(
      "- army in Ta-Mehu -> Lukka (by sea): fails: the unit holding Lukka kept its place; your strength 1 against 2, 1 of it for the rough ground of lukka",
      egypt,
    );
    Assert.doesNotContain("Arzawa", egypt);

    // When the ships carry it somewhere else, nothing carried it to Lukka, and the fleet's king is told why its convoy was void.
    let t = board();
    resolve(
      t,
      subs({
        Egypt: { orders: [move("delta", "lukka")] },
        Alashiya: { orders: ["deltawaters", "westsea", "lukkawaters"].map((f) => convoy(f, "delta", "kalavasos")) },
      }),
    );
    Assert.contains("- army in Ta-Mehu -> Lukka (by sea): fails: no convoy carried it across the sea", report(t, "Egypt"));
    Assert.contains("- fleet in Ta-Mehu waters convoys Ta-Mehu -> the copper hills of Alashiya: void: no army moved from Ta-Mehu to the copper hills of Alashiya by sea", report(t, "Alashiya"));
    Assert.contains("- Alashiya: fleet in Ta-Mehu waters convoys Ta-Mehu -> the copper hills of Alashiya: void", report(t, "Egypt"));
  });

  test("A unit that could not leave kept its place", () => {
    // Mitanni's army in Terqa and Babylon's in Sippar strike Suhu and bounce, so Hatti's move into Terqa meets it still there.
    let s = formerHomes(newGame(1, newGameConfig({ peopleDefence: 0 })));
    s.units.push(newUnit({ id: "u90", power: "Hatti", kind: "Army", province: "harran" }));
    resolve(
      s,
      subs({
        Hatti: { orders: [move("harran", "terqa")] },
        Mitanni: { orders: [move("terqa", "suhu")] },
        Babylonia: { orders: [move("sippar", "suhu")] },
      }),
    );
    Assert.contains(
      "- army in Harran -> Terqa: fails: the unit in Terqa (Mitanni's army) could not leave, so it kept its place; your strength 1 against 1",
      report(s, "Hatti"),
    );
    Assert.contains("- army in Terqa -> Suhu: fails: it met a move into Suhu from Sippar by Karduniash's army; your strength 1 against 1", report(s, "Mitanni"));
  });

  test("A support that matches nothing is void and only its own king is told why", () => {
    let s = newGame(1, newGameConfig({ peopleDefence: 0 }));
    // Babylon's army at Nippur (item 17+) would hold, which this test's report must not show.
    s.units = s.units.filter((u) => u.province !== "nippur");
    resolve(
      s,
      subs({
        // Babylon supports a move Sippar does not make; Dur-Kurigalzu supports Sippar holding, but it moves.
        Babylonia: { orders: [support("babylon", "sippar", "nippur"), support("durkurigalzu", "sippar"), move("sippar", "suhu")] },
      }),
    );
    let babylonia = report(s, "Babylonia");
    Assert.contains("- army in Babili supports Sippar -> Nippur: void: no unit moved from Sippar to Nippur", babylonia);
    Assert.contains("- army in Dur-Kurigalzu supports Sippar holding: void: the unit in Sippar was ordered to move, not to hold", babylonia);
    let own = babylonia.split("\nSeen nearby:")[0];
    Assert.doesNotContain("holds", own);

    // Assyria, next door, sees the void support but not the reason.
    let assyria = report(s, "Assyria");
    Assert.contains("- Babylonia: army in Dur-Kurigalzu supports Sippar holding: void", assyria);
    Assert.doesNotContain("ordered to move", assyria);
  });
});
