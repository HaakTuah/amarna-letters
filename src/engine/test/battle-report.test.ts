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
import { removeAll, Assert, formerHome, subs, walled, oldWorld } from "./support.ts";

// <summary>What a king reads about last season's movements: foreign moves into what it sees, and why its own moves failed.</summary>
describe("BattleReportTests", () => {
  function reportOf(s: GameState, p: Power): string {
    return single(inboxOf(s, p), (i) => i.kind === "Battle" && i.title.startsWith("Movements")).body;
  }

  function resolve(s: GameState, orders: Dict<Power, TurnSubmission>): void {
    new TurnEngine(s).resolve(orders);
  }

  test("A move from out of sight that bounces your move is reported with where it came from", () => {
    // Terqa lies beyond Babylon's sight; Suhu, next to Sippar, within it.
    let s = oldWorld(newGame(1, newGameConfig({ peopleDefence: 0 })));
    Assert.doesNotContain("terqa", Views.sight(s, WorldMap.default, "Babylonia"));
    resolve(
      s,
      subs({
        Babylonia: { orders: [move("sippar", "suhu")] },
        Mitanni: { orders: [move("terqa", "suhu")] },
      }),
    );

    let report = reportOf(s, "Babylonia");
    Assert.contains("- army in Sippar -> Suhu: fails: it met a move into Suhu from Terqa by Mitanni's army; your strength 1 against 1", report);
    Assert.contains("- Mitanni: army in Terqa -> Suhu: fails", report);
  });

  test("A failed attack on a held province gives the strengths", () => {
    let s = formerHome(oldWorld(newGame(1, newGameConfig({ peopleDefence: 0 }))), "suhu", "Mitanni");
    resolve(
      s,
      subs({
        Assyria: { orders: [move("ashur", "suhu"), support("ekallate", "ashur", "suhu")] },
        Mitanni: { orders: [support("terqa", "suhu")] },
      }),
    );

    Assert.contains("- army in Ashur -> Suhu: fails: the unit holding Suhu (Mitanni's army) kept its place; your strength 2 against 2", reportOf(s, "Assyria"));
    Assert.equal("Mitanni", unitAt(s, "suhu")?.power);
  });

  test("When a stronger move takes the province that is the reason given", () => {
    // Babylon's army in Sippar and Assyria's from Ashur both strike Suhu, open and empty; only Assyria's is supported.
    let s = oldWorld(newGame(1, newGameConfig({ peopleDefence: 0 })));
    s.walls.delete("suhu");
    resolve(
      s,
      subs({
        Assyria: { orders: [move("ashur", "suhu"), support("ekallate", "ashur", "suhu")] },
        Babylonia: { orders: [move("sippar", "suhu")] },
      }),
    );

    Assert.equal("Assyria", unitAt(s, "suhu")?.power);
    Assert.contains("- army in Sippar -> Suhu: fails: it met a move into Suhu from Ashur by Assyria's army; your strength 1 against 2", reportOf(s, "Babylonia"));
  });

  test("A support whose unit is beaten from its place is void and a cut support says from where", () => {
    let s = formerHome(oldWorld(newGame(1, newGameConfig({ peopleDefence: 0 }))), "suhu", "Mitanni");
    s.units.push(newUnit({ id: "u90", power: "Babylonia", kind: "Army", province: "arrapha" }));
    resolve(
      s,
      subs({
        Assyria: { orders: [move("ashur", "suhu"), support("ekallate", "ashur", "suhu")] },
        Babylonia: { orders: [move("durkurigalzu", "ekallate"), support("arrapha", "durkurigalzu", "ekallate")] },
      }),
    );
    let destroyed = reportOf(s, "Assyria");
    Assert.contains("- army in Ekallate supports Ashur -> Suhu: void: the supporting unit was beaten from its place", destroyed);
    // Item 13: beaten from its place, it falls back rather than being destroyed, unless, as here, every way back is
    // held or is where the blow came from.
    Assert.contains("- army in Ekallate is destroyed", destroyed);
    Assert.contains("- army in Ashur -> Suhu: fails: the unit holding Suhu (Mitanni's army) kept its place; your strength 1 against 1", destroyed);

    let t = formerHome(oldWorld(newGame(1, newGameConfig({ peopleDefence: 0 }))), "suhu", "Mitanni");
    resolve(
      t,
      subs({
        Assyria: { orders: [move("ashur", "suhu"), support("ekallate", "ashur", "suhu")] },
        Babylonia: { orders: [move("durkurigalzu", "ekallate")] },
      }),
    );
    Assert.contains("- army in Ekallate supports Ashur -> Suhu: cut (attacked from Dur-Kurigalzu)", reportOf(t, "Assyria"));
    Assert.contains(
      "- army in Dur-Kurigalzu -> Ekallate: fails: the unit holding Ekallate (Assyria's army) kept its place; your strength 1 against 1",
      reportOf(t, "Babylonia"),
    );
  });

  test("Your own units and a unit moving the other way are named as the reason and walls say what came of getting in", () => {
    let s = formerHome(oldWorld(newGame(1, newGameConfig({ peopleDefence: 0 }))), "suhu", "Mitanni");
    resolve(
      s,
      subs({
        Hatti: { orders: [move("nesa", "carchemish")] },
        Assyria: { orders: [move("ashur", "nineveh"), move("ekallate", "suhu")] },
        Mitanni: { orders: [move("suhu", "ekallate")] },
      }),
    );

    // Walls stop no move since the siege package: the report says the army got within them and did not storm them.
    Assert.contains(
      "- army in Nesa -> Karkamish: succeeds: it got within the walls of Karkamish but did not storm them (strength 1 against walls 2 and no defenders on the walls): your army stands inside and takes nothing; besiege the city to wear it down",
      reportOf(s, "Hatti"),
    );
    let assyria = reportOf(s, "Assyria");
    Assert.contains("- army in Ashur -> Ninua: fails: your own army in Ninua did not leave, and you cannot dislodge your own unit", assyria);
    Assert.contains("- army in Ekallate -> Suhu: fails: it met the unit from Suhu (Mitanni's army) coming the other way; your strength 1 against 1", assyria);
  });

  test("An assault on a walled city of the king s own is told among his own lines with his side and the strengths", () => {
    // The fix pass after item 4, minor finding 5: until the siege package such an assault showed only under "Seen nearby".
    let s = walled(oldWorld(newGame(1, newGameConfig({ peopleDefence: 0 }))), "suhu", 2);
    s.owner.set("suhu", "Babylonia");
    resolve(s, subs({ Mitanni: { orders: [move("terqa", "suhu")] } }));
    let own = reportOf(s, "Babylonia").split("\nSeen nearby:")[0];
    Assert.contains(
      "- Your walled city of Suhu: Mitanni's army from Terqa got within the walls but did not storm them (its strength 1 against your walls 2 and no defenders on the walls): it stands inside, and Suhu stays yours unless a siege wears it down.",
      own,
    );

    // Stormed with four against walls 1 and an army of Babylon's within them, the walls doubling it (1 + 2 x 1 = 3).
    s = walled(oldWorld(newGame(1, newGameConfig({ peopleDefence: 0 }))), "suhu", 1);
    s.owner.set("suhu", "Babylonia");
    s.units.push(newUnit({ id: "u90", power: "Babylonia", kind: "Army", province: "suhu" }));
    removeAll(s.units, (u) => u.province === "sippar");
    s.units.push(newUnit({ id: "u91", power: "Mitanni", kind: "Army", province: "sippar" }));
    removeAll(s.units, (u) => u.province === "durkurigalzu");
    s.units.push(newUnit({ id: "u92", power: "Mitanni", kind: "Army", province: "durkurigalzu" }));
    s.units.push(newUnit({ id: "u93", power: "Mitanni", kind: "Army", province: "ekallate" }));
    removeAll(s.units, (u) => u.province === "ekallate" && u.power === "Assyria");
    resolve(
      s,
      subs({
        Mitanni: {
          orders: [move("terqa", "suhu"), support("sippar", "terqa", "suhu"), support("durkurigalzu", "terqa", "suhu"), support("ekallate", "terqa", "suhu")],
        },
      }),
    );
    Assert.contains(
      "- Your walled city of Suhu: Mitanni's army from Terqa stormed the walls (its strength 4 against your walls 1 and defenders 2 on the walls: the garrison 1, and the city's men 0, the walls making them twice as strong), and its men stand within them: it goes over to them if its people fear or love them more than you, as the next season begins.",
      reportOf(s, "Babylonia"),
    );
    Assert.equal("Mitanni", s.breached.get("suhu"));
    Assert.equal(0, wallsOf(s, "suhu"));
    Assert.contains(
      "- army in Terqa -> Suhu: succeeds: it stormed the walls of Suhu (strength 4 against walls 1 and defenders 2 on the walls: the garrison 1, and the city's men 0, the walls making them twice as strong), and stands within them: Suhu answers to you if its people fear or love you more than its master, as the next season begins",
      reportOf(s, "Mitanni"),
    );
  });

  test("The reasons reveal nothing to other kings", () => {
    let s = formerHome(oldWorld(newGame(1, newGameConfig({ peopleDefence: 0 }))), "suhu", "Mitanni");
    resolve(
      s,
      subs({
        Assyria: { orders: [move("ashur", "suhu"), support("ekallate", "ashur", "suhu")] },
        Mitanni: { orders: [support("terqa", "suhu")] },
      }),
    );
    // Mitanni sees Assyria's move into its land, but not Assyria's reckoning of it.
    let mitanni = reportOf(s, "Mitanni");
    Assert.contains("- Assyria: army in Ashur -> Suhu: fails", mitanni);
    Assert.doesNotContain(
      "your strength",
      mitanni
        .split("\n")
        .filter((l) => l.includes("Assyria:"))
        .join(""),
    );
  });
});
