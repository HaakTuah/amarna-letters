import { describe, test } from "vitest";
import { TextKit } from "../src/bots/textkit.ts";
import { type GameState, newGame, newGameEvent, newMessageTrail, newTablet } from "@amarna/engine";
import { type Signal, SignalDetector } from "@amarna/game";
import { Assert } from "../../engine/test/support.ts";

describe("SignalTests", () => {
  function withPeace(sealedTurn: number): GameState {
    let s = newGame(7);
    s.tablets.push(
      newTablet({
        id: "t1",
        text: "Arzawa and Hatti are brothers.",
        proposedBy: "Arzawa",
        partner: "Hatti",
        seals: ["Arzawa", "Hatti"],
        createdTurn: sealedTurn,
        sealedTurn: sealedTurn,
      }),
    );
    return s;
  }

  function broken(s: GameState): Signal[] {
    return SignalDetector.detect(s).filter((x) => x.kind === "broken-promise");
  }

  test("A conquest in the season a tablet was sealed breaks it", () => {
    // Audiences come before orders: the tablet sealed in season 2 already bound the troops that moved in season 2.
    let s = withPeace(2);
    s.events.push(newGameEvent({ turn: 2, kind: "conquest", text: "Arzawa took Tuwanuwa from Hatti." }));
    Assert.single(broken(s));

    let before = withPeace(3);
    before.events.push(newGameEvent({ turn: 2, kind: "conquest", text: "Arzawa took Tuwanuwa from Hatti." }));
    Assert.empty(broken(before));
  });

  test("A king who takes back his own homeland breaks no promise", () => {
    let s = withPeace(2);
    // Tuwanuwa is Hatti's own: taking it back is no breach. Mira is Arzawa's: taking it is one.
    s.events.push(newGameEvent({ turn: 4, kind: "conquest", text: "Hatti took Tuwanuwa from Arzawa." }));
    Assert.empty(broken(s));
    s.events.push(newGameEvent({ turn: 5, kind: "conquest", text: "Hatti took Mira from Arzawa." }));
    Assert.equal("Hatti took Mira from Arzawa.", Assert.single(broken(s)).text);
  });

  test.each([
    ["You lied to me about the gold."],
    ["This is a lie, and you know it."],
    ["Your envoy spreads lies at every court."],
    ["You are a liar and a thief."],
    ["You lie!"],
    ["You swore before the gods and broke your oath."],
    ["Hatti betrayed us at Kanesh."],
    ["The gold you sent is false."],
    ["You seek to deceive me."],
  ] as const)("Accusations are found %s", (text: string) => {
    Assert.true(TextKit.isAccusation(text));
  });

  test.each([
    ["I received your messenger with joy."],
    ["Let your envoy rest at my court until the river falls."],
    ["Let the dead lie in peace."],
    ["The road to Qadesh lies in the hills."],
    ["My armies lie quiet, and the lands lying beyond the river are yours to trade with."],
    ["I would never betray my brother."],
    ["I have not lied to you."],
  ] as const)("Lying down and courtesies are no accusation %s", (text: string) => {
    Assert.false(TextKit.isAccusation(text));
  });

  test("Only accusing letters count as accusations", () => {
    let s = newGame(7);
    s.trails.push(
      newMessageTrail({ id: "m1", turn: 1, from: "Egypt", to: "Hatti", leaderLetter: "I received your messenger with joy. The road to my court lies open." }),
    );
    s.trails.push(newMessageTrail({ id: "m2", turn: 2, from: "Hatti", to: "Egypt", leaderLetter: "Your gold was light, and your words were a lie." }));
    let hit = Assert.single(SignalDetector.detect(s), (x) => x.kind === "accusation");
    Assert.startsWith("Hatti/Egypt", hit.text);
  });
});
