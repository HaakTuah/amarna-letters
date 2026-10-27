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
  newUnit,
  single,
  support,
  unitAt,
  wallsOf,
} from "@amarna/engine";
import { removeAll, Assert, subs } from "./support.ts";

// <summary>What a king reads about last season's movements: foreign moves into what it sees, and why its own moves failed.</summary>
describe("BattleReportTests", () => {
  function reportOf(s: GameState, p: Power): string {
    return single(inboxOf(s, p), (i) => i.kind === "Battle" && i.title.startsWith("Movements")).body;
  }

  function resolve(s: GameState, orders: Dict<Power, TurnSubmission>): void {
    new TurnEngine(s).resolve(orders);
  }

  test("A move from out of sight that bounces your move is reported with where it came from", () => {
    // Arbela lies beyond Babylon's sight; Susa, next to Dur-Kurigalzu, within it.
    let s = newGame(1);
    s.walls.delete("susa");
    s.units.push(newUnit({ id: "u90", power: "Assyria", kind: "Army", province: "arbela" }));
    Assert.doesNotContain("arbela", Views.sight(s, WorldMap.default, "Babylonia"));
    resolve(
      s,
      subs({
        Babylonia: { orders: [move("durkurigalzu", "susa")] },
        Assyria: { orders: [move("arbela", "susa")] },
      }),
    );

    let report = reportOf(s, "Babylonia");
    Assert.contains("- A durkurigalzu -> susa: fails: it met a move into susa from arbela by Assyria's army; your strength 1 against 1", report);
    Assert.contains("- Assyria: A arbela -> susa: fails", report);
  });

  test("A failed attack on a held province gives the strengths", () => {
    let s = newGame(1);
    resolve(
      s,
      subs({
        Assyria: { orders: [move("ashur", "terqa"), support("ekallatum", "ashur", "terqa")] },
        Mitanni: { orders: [support("washukanni", "terqa")] },
      }),
    );

    Assert.contains("- A ashur -> terqa: fails: the unit holding terqa (Mitanni's army) kept its place; your strength 2 against 2", reportOf(s, "Assyria"));
    Assert.equal("Mitanni", unitAt(s, "terqa")?.power);
  });

  test("When a stronger move takes the province that is the reason given", () => {
    // Babylon's army in Mari and Assyria's from Ashur both strike Terqa; only Assyria's is supported.
    let s = newGame(1);
    s.owner.set("mari", "Babylonia");
    s.walls.delete("mari");
    s.units.push(newUnit({ id: "u90", power: "Babylonia", kind: "Army", province: "mari" }));
    resolve(
      s,
      subs({
        Assyria: { orders: [move("ashur", "terqa"), support("ekallatum", "ashur", "terqa")] },
        Babylonia: { orders: [move("mari", "terqa")] },
      }),
    );

    Assert.equal("Assyria", unitAt(s, "terqa")?.power);
    Assert.contains("- A mari -> terqa: fails: it met a move into terqa from ashur by Assyria's army; your strength 1 against 2", reportOf(s, "Babylonia"));
  });

  test("A support whose unit is destroyed is void and a cut support says from where", () => {
    let s = newGame(1);
    resolve(
      s,
      subs({
        Assyria: { orders: [move("ashur", "terqa"), support("ekallatum", "ashur", "terqa")] },
        Babylonia: { orders: [move("sippar", "ekallatum"), support("durkurigalzu", "sippar", "ekallatum")] },
      }),
    );
    let destroyed = reportOf(s, "Assyria");
    Assert.contains("- A ekallatum supports ashur -> terqa: void: the supporting unit was destroyed", destroyed);
    Assert.contains("- A ekallatum is destroyed", destroyed);
    Assert.contains("- A ashur -> terqa: fails: the unit holding terqa (Mitanni's army) kept its place; your strength 1 against 1", destroyed);

    let t = newGame(1);
    resolve(
      t,
      subs({
        Assyria: { orders: [move("ashur", "terqa"), support("ekallatum", "ashur", "terqa")] },
        Babylonia: { orders: [move("sippar", "ekallatum")] },
      }),
    );
    Assert.contains("- A ekallatum supports ashur -> terqa: cut (attacked from sippar)", reportOf(t, "Assyria"));
    Assert.contains(
      "- A sippar -> ekallatum: fails: the unit holding ekallatum (Assyria's army) kept its place; your strength 1 against 1",
      reportOf(t, "Babylonia"),
    );
  });

  test("Your own units and a unit moving the other way are named as the reason and walls say what came of getting in", () => {
    let s = newGame(1);
    resolve(
      s,
      subs({
        Hatti: { orders: [move("kanesh", "carchemish")] },
        Assyria: { orders: [move("ashur", "nineveh"), move("ekallatum", "terqa")] },
        Mitanni: { orders: [move("terqa", "ekallatum")] },
      }),
    );

    // Walls stop no move since the siege package: the report says the army got within them and did not storm them.
    Assert.contains(
      "- A kanesh -> carchemish: succeeds: it got within the walls of carchemish but did not storm them (strength 1 against walls 2 and defenders 0): your army stands inside and takes nothing; besiege the city to wear it down",
      reportOf(s, "Hatti"),
    );
    let assyria = reportOf(s, "Assyria");
    Assert.contains("- A ashur -> nineveh: fails: your own army in nineveh did not leave, and you cannot dislodge your own unit", assyria);
    Assert.contains("- A ekallatum -> terqa: fails: it met the unit from terqa (Mitanni's army) coming the other way; your strength 1 against 1", assyria);
  });

  test("An assault on a walled city of the king s own is told among his own lines with his side and the strengths", () => {
    // The fix pass after item 4, minor finding 5: until the siege package such an assault showed only under "Seen nearby".
    let s = newGame(1);
    s.owner.set("mari", "Babylonia");
    resolve(s, subs({ Mitanni: { orders: [move("terqa", "mari")] } }));
    let own = reportOf(s, "Babylonia").split("\nSeen nearby:")[0];
    Assert.contains(
      "- Your walled city of Mari: Mitanni's army from terqa got within the walls but did not storm them (its strength 1 against your walls 2 and defenders 0): it stands inside, and Mari stays yours unless a siege wears it down.",
      own,
    );

    // Stormed with three against walls 2 and an army of Babylon's within them.
    s = newGame(1);
    s.owner.set("mari", "Babylonia");
    s.units.push(newUnit({ id: "u90", power: "Babylonia", kind: "Army", province: "mari" }));
    s.units.push(newUnit({ id: "u91", power: "Mitanni", kind: "Army", province: "damascus" }));
    s.units.push(newUnit({ id: "u92", power: "Mitanni", kind: "Army", province: "qadesh" }));
    s.owner.set("damascus", "Mitanni");
    s.owner.set("qadesh", "Mitanni");
    s.units.push(newUnit({ id: "u93", power: "Mitanni", kind: "Army", province: "ekallatum" }));
    removeAll(s.units, (u) => u.province === "ekallatum" && u.power === "Assyria");
    resolve(
      s,
      subs({
        Mitanni: {
          orders: [move("terqa", "mari"), support("damascus", "terqa", "mari"), support("qadesh", "terqa", "mari"), support("ekallatum", "terqa", "mari")],
        },
      }),
    );
    Assert.contains(
      "- Your walled city of Mari: Mitanni's army from terqa stormed the walls (its strength 4 against your walls 2 and defenders 1): Mari is taken.",
      reportOf(s, "Babylonia"),
    );
    Assert.equal("Mitanni", s.owner.get("mari"));
    Assert.equal(1, wallsOf(s, "mari"));
    Assert.contains(
      "- A terqa -> mari: succeeds: it stormed the walls of mari (strength 4 against walls 2 and defenders 1), and mari is yours",
      reportOf(s, "Mitanni"),
    );
  });

  test("The reasons reveal nothing to other kings", () => {
    let s = newGame(1);
    resolve(
      s,
      subs({
        Assyria: { orders: [move("ashur", "terqa"), support("ekallatum", "ashur", "terqa")] },
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
