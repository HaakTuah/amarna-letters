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
  inboxOf,
  move,
  newGame,
  newGameConfig,
  newUnit,
  single,
  support,
  unitAt,
  wallsOf,
} from "@amarna/engine";
import { removeAll, Assert, subs, walled, oldWorld } from "./support.ts";

// <summary>What a king reads about last season's movements: foreign moves into what it sees, and why its own moves failed.</summary>
describe("BattleReportTests", () => {
  function reportOf(s: GameState, p: Power): string {
    return single(inboxOf(s, p), (i) => i.kind === "Battle" && i.title.startsWith("Movements")).body;
  }

  function resolve(s: GameState, orders: Dict<Power, TurnSubmission>): void {
    new TurnEngine(s).resolve(orders);
  }

  test("A move from out of sight that bounces your move is reported with where it came from", () => {
    // The Sutean steppe lies beyond Babylon's sight; Suhu, next to Sippar, within it.
    let s = oldWorld(newGame(1, newGameConfig({ peopleDefence: 0 })));
    s.units.push(newUnit({ id: "u90", power: "Assyria", kind: "Army", province: "steppe" }));
    Assert.doesNotContain("steppe", Views.sight(s, WorldMap.default, "Babylonia"));
    resolve(
      s,
      subs({
        Babylonia: { orders: [move("sippar", "suhu")] },
        Assyria: { orders: [move("steppe", "suhu")] },
      }),
    );

    let report = reportOf(s, "Babylonia");
    Assert.contains("- A sippar -> suhu: fails: it met a move into suhu from steppe by Assyria's army; your strength 1 against 1", report);
    Assert.contains("- Assyria: A steppe -> suhu: fails", report);
  });

  test("A failed attack on a held province gives the strengths", () => {
    let s = oldWorld(newGame(1, newGameConfig({ peopleDefence: 0 })));
    resolve(
      s,
      subs({
        Assyria: { orders: [move("ashur", "terqa"), support("ekallate", "ashur", "terqa")] },
        Mitanni: { orders: [support("washukanni", "terqa")] },
      }),
    );

    Assert.contains("- A ashur -> terqa: fails: the unit holding terqa (Mitanni's army) kept its place; your strength 2 against 2", reportOf(s, "Assyria"));
    Assert.equal("Mitanni", unitAt(s, "terqa")?.power);
  });

  test("When a stronger move takes the province that is the reason given", () => {
    // Babylon's army in Suhu and Assyria's from Ashur both strike Terqa; only Assyria's is supported.
    let s = oldWorld(newGame(1, newGameConfig({ peopleDefence: 0 })));
    s.owner.set("suhu", "Babylonia");
    s.walls.delete("suhu");
    s.units.push(newUnit({ id: "u90", power: "Babylonia", kind: "Army", province: "suhu" }));
    resolve(
      s,
      subs({
        Assyria: { orders: [move("ashur", "terqa"), support("ekallate", "ashur", "terqa")] },
        Babylonia: { orders: [move("suhu", "terqa")] },
      }),
    );

    Assert.equal("Assyria", unitAt(s, "terqa")?.power);
    Assert.contains("- A suhu -> terqa: fails: it met a move into terqa from ashur by Assyria's army; your strength 1 against 2", reportOf(s, "Babylonia"));
  });

  test("A support whose unit is destroyed is void and a cut support says from where", () => {
    let s = oldWorld(newGame(1, newGameConfig({ peopleDefence: 0 })));
    resolve(
      s,
      subs({
        Assyria: { orders: [move("ashur", "terqa"), support("ekallate", "ashur", "terqa")] },
        Babylonia: { orders: [move("sippar", "ekallate"), support("durkurigalzu", "sippar", "ekallate")] },
      }),
    );
    let destroyed = reportOf(s, "Assyria");
    Assert.contains("- A ekallate supports ashur -> terqa: void: the supporting unit was destroyed", destroyed);
    Assert.contains("- A ekallate is destroyed", destroyed);
    Assert.contains("- A ashur -> terqa: fails: the unit holding terqa (Mitanni's army) kept its place; your strength 1 against 1", destroyed);

    let t = oldWorld(newGame(1, newGameConfig({ peopleDefence: 0 })));
    resolve(
      t,
      subs({
        Assyria: { orders: [move("ashur", "terqa"), support("ekallate", "ashur", "terqa")] },
        Babylonia: { orders: [move("sippar", "ekallate")] },
      }),
    );
    Assert.contains("- A ekallate supports ashur -> terqa: cut (attacked from sippar)", reportOf(t, "Assyria"));
    Assert.contains(
      "- A sippar -> ekallate: fails: the unit holding ekallate (Assyria's army) kept its place; your strength 1 against 1",
      reportOf(t, "Babylonia"),
    );
  });

  test("Your own units and a unit moving the other way are named as the reason and walls say what came of getting in", () => {
    let s = oldWorld(newGame(1, newGameConfig({ peopleDefence: 0 })));
    resolve(
      s,
      subs({
        Hatti: { orders: [move("nesa", "carchemish")] },
        Assyria: { orders: [move("ashur", "nineveh"), move("ekallate", "terqa")] },
        Mitanni: { orders: [move("terqa", "ekallate")] },
      }),
    );

    // Walls stop no move since the siege package: the report says the army got within them and did not storm them.
    Assert.contains(
      "- A nesa -> carchemish: succeeds: it got within the walls of carchemish but did not storm them (strength 1 against walls 2 and no defenders on the walls): your army stands inside and takes nothing; besiege the city to wear it down",
      reportOf(s, "Hatti"),
    );
    let assyria = reportOf(s, "Assyria");
    Assert.contains("- A ashur -> nineveh: fails: your own army in nineveh did not leave, and you cannot dislodge your own unit", assyria);
    Assert.contains("- A ekallate -> terqa: fails: it met the unit from terqa (Mitanni's army) coming the other way; your strength 1 against 1", assyria);
  });

  test("An assault on a walled city of the king s own is told among his own lines with his side and the strengths", () => {
    // The fix pass after item 4, minor finding 5: until the siege package such an assault showed only under "Seen nearby".
    let s = walled(oldWorld(newGame(1, newGameConfig({ peopleDefence: 0 }))), "suhu", 2);
    s.owner.set("suhu", "Babylonia");
    resolve(s, subs({ Mitanni: { orders: [move("terqa", "suhu")] } }));
    let own = reportOf(s, "Babylonia").split("\nSeen nearby:")[0];
    Assert.contains(
      "- Your walled city of Suhu: Mitanni's army from terqa got within the walls but did not storm them (its strength 1 against your walls 2 and no defenders on the walls): it stands inside, and Suhu stays yours unless a siege wears it down.",
      own,
    );

    // Stormed with four against walls 1 and an army of Babylon's within them, the walls doubling it (1 + 2 x 1 = 3).
    s = walled(oldWorld(newGame(1, newGameConfig({ peopleDefence: 0 }))), "suhu", 1);
    s.owner.set("suhu", "Babylonia");
    s.units.push(newUnit({ id: "u90", power: "Babylonia", kind: "Army", province: "suhu" }));
    removeAll(s.units, (u) => u.province === "sippar");
    s.units.push(newUnit({ id: "u91", power: "Mitanni", kind: "Army", province: "sippar" }));
    s.units.push(newUnit({ id: "u92", power: "Mitanni", kind: "Army", province: "steppe" }));
    s.units.push(newUnit({ id: "u93", power: "Mitanni", kind: "Army", province: "ekallate" }));
    removeAll(s.units, (u) => u.province === "ekallate" && u.power === "Assyria");
    resolve(
      s,
      subs({
        Mitanni: {
          orders: [move("terqa", "suhu"), support("sippar", "terqa", "suhu"), support("steppe", "terqa", "suhu"), support("ekallate", "terqa", "suhu")],
        },
      }),
    );
    Assert.contains(
      "- Your walled city of Suhu: Mitanni's army from terqa stormed the walls (its strength 4 against your walls 1 and defenders 2 on the walls: the garrison 1, and the city's men 0, the walls making them twice as strong): Suhu is taken.",
      reportOf(s, "Babylonia"),
    );
    Assert.equal("Mitanni", s.owner.get("suhu"));
    Assert.equal(0, wallsOf(s, "suhu"));
    Assert.contains(
      "- A terqa -> suhu: succeeds: it stormed the walls of suhu (strength 4 against walls 1 and defenders 2 on the walls: the garrison 1, and the city's men 0, the walls making them twice as strong), and suhu is yours",
      reportOf(s, "Mitanni"),
    );
  });

  test("The reasons reveal nothing to other kings", () => {
    let s = oldWorld(newGame(1, newGameConfig({ peopleDefence: 0 })));
    resolve(
      s,
      subs({
        Assyria: { orders: [move("ashur", "terqa"), support("ekallate", "ashur", "terqa")] },
        Mitanni: { orders: [support("washukanni", "terqa")] },
      }),
    );
    // Mitanni sees Assyria's move into its land, but not Assyria's reckoning of it.
    let mitanni = reportOf(s, "Mitanni");
    Assert.contains("- Assyria: A ashur -> terqa: fails", mitanni);
    Assert.doesNotContain(
      "your strength",
      mitanni
        .split("\n")
        .filter((l) => l.includes("Assyria:"))
        .join(""),
    );
  });
});
