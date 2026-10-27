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
  newUnit,
  single,
  support,
  unitAt,
} from "@amarna/engine";
import { Assert, subs } from "./support.ts";

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
    // Assyria (2) and Mitanni (3) meet head to head between Ekallatum and Terqa; Hatti walks into the Terqa Mitanni left.
    let s = newGame(1);
    s.units.push(newUnit({ id: "u90", power: "Hatti", kind: "Army", province: "harran" }));
    resolve(
      s,
      subs({
        Assyria: { orders: [move("ekallatum", "terqa"), support("ashur", "ekallatum", "terqa")] },
        Mitanni: { orders: [move("terqa", "ekallatum")] },
        Babylonia: { orders: [support("sippar", "terqa", "ekallatum"), support("durkurigalzu", "terqa", "ekallatum")] },
        Hatti: { orders: [move("harran", "terqa")] },
      }),
    );

    Assert.equal("Hatti", unitAt(s, "terqa")?.power);
    Assert.equal("Mitanni", unitAt(s, "ekallatum")?.power);
    let assyria = report(s, "Assyria");
    Assert.contains("- A ekallatum -> terqa: fails: it met the unit from terqa (Mitanni's army) coming the other way; your strength 2 against 3", assyria);
    Assert.contains("- A ekallatum is destroyed", assyria);
    Assert.doesNotContain(
      "from harran",
      single(assyria.split("\n"), (l) => l.startsWith("- A ekallatum -> terqa")),
    );
  });

  test("A unit holding a coast out of sight is not named and a missing convoy is the reason", () => {
    // Egypt's army in the Delta crosses the Great Green in Alashiya's ships to Lukka, which Arzawa holds; Lukka lies beyond Egypt's sight.
    function board(): GameState {
      let s = newGame(1);
      single(s.units, (u) => u.province === "delta").kind = "Army";
      single(s.units, (u) => u.province === "enkomi").province = "greatgreen";
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
        Alashiya: { orders: [convoy("greatgreen", "delta", "lukka")] },
      }),
    );
    let egypt = report(s, "Egypt");
    // Lukka is rough ground (Build order item 5, terrain): the unit holding it has 1 more, and the report gives its share.
    Assert.contains(
      "- A delta -> lukka (by sea): fails: the unit holding lukka kept its place; your strength 1 against 2, 1 of it for the rough ground of lukka",
      egypt,
    );
    Assert.doesNotContain("Arzawa", egypt);

    // When the ships carry it somewhere else, nothing carried it to Lukka, and the fleet's king is told why its convoy was void.
    let t = board();
    resolve(
      t,
      subs({
        Egypt: { orders: [move("delta", "lukka")] },
        Alashiya: { orders: [convoy("greatgreen", "delta", "tamassos")] },
      }),
    );
    Assert.contains("- A delta -> lukka (by sea): fails: no convoy carried it across the sea", report(t, "Egypt"));
    Assert.contains("- F greatgreen convoys delta -> tamassos: void: no army moved from delta to tamassos by sea", report(t, "Alashiya"));
    Assert.contains("- Alashiya: F greatgreen convoys delta -> tamassos: void", report(t, "Egypt"));
  });

  test("A unit that could not leave kept its place", () => {
    // Mitanni's army in Terqa and Babylon's in Sippar strike Mari and bounce, so Assyria's move into Terqa meets it still there.
    let s = newGame(1);
    resolve(
      s,
      subs({
        Assyria: { orders: [move("ashur", "terqa")] },
        Mitanni: { orders: [move("terqa", "mari")] },
        Babylonia: { orders: [move("sippar", "mari")] },
      }),
    );
    Assert.contains(
      "- A ashur -> terqa: fails: the unit in terqa (Mitanni's army) could not leave, so it kept its place; your strength 1 against 1",
      report(s, "Assyria"),
    );
    Assert.contains("- A terqa -> mari: fails: it met a move into mari from sippar by Babylonia's army; your strength 1 against 1", report(s, "Mitanni"));
  });

  test("A support that matches nothing is void and only its own king is told why", () => {
    let s = newGame(1);
    resolve(
      s,
      subs({
        // Babylon supports a move Dur-Kurigalzu does not make; Sippar supports Dur-Kurigalzu holding, but it moves.
        Babylonia: { orders: [support("babylon", "durkurigalzu", "nippur"), support("sippar", "durkurigalzu"), move("durkurigalzu", "susa")] },
      }),
    );
    let babylonia = report(s, "Babylonia");
    Assert.contains("- A babylon supports durkurigalzu -> nippur: void: no unit moved from durkurigalzu to nippur", babylonia);
    Assert.contains("- A sippar supports durkurigalzu holding: void: the unit in durkurigalzu was ordered to move, not to hold", babylonia);
    let own = babylonia.split("\nSeen nearby:")[0];
    Assert.doesNotContain("holds", own);

    // Assyria, next door, sees the void support but not the reason.
    let assyria = report(s, "Assyria");
    Assert.contains("- Babylonia: A sippar supports durkurigalzu holding: void", assyria);
    Assert.doesNotContain("ordered to move", assyria);
  });
});
