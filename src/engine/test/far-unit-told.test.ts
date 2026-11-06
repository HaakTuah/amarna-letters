/**
 * Bug #615: a far unit of a king's own as he knows it, beyond its raising and end (`units-known.test.ts`): what befalls it
 * comes home by the road. The twin canary (`src/web/test/twin-canary.test.ts`) finds the leaks; these pin the rules.
 */
import { describe, test } from "vitest";
import {
  Dict,
  TurnEngine,
  Views,
  WorldMap,
  inboxOf,
  loseUnit,
  newGame,
  newGameConfig,
  newOwnerChange,
  newTurnSubmission,
  newUnit,
  supply,
  upkeep,
} from "@amarna/engine";
import { Assert, smallWorld } from "./support.ts";

const map = WorldMap.default;

/** Egypt holds Nippur, far from its court, with an army there that has sent a few seasons' reports. */
function farArmy() {
  const s = smallWorld(
    newGame(1, newGameConfig({ catastropheChance: 0 })),
    "Egypt",
    "Babylonia",
  );
  s.owner.set("nippur", "Egypt");
  s.ownerLog.push(
    newOwnerChange({ province: "nippur", turn: 0, owner: "Egypt" }),
  );
  s.ledger.set("nippur", new Dict([["Egypt", 5000]]));
  s.units = s.units.filter((u) => u.province !== "nippur");
  const u = newUnit({
    id: "u990",
    power: "Egypt",
    kind: "Army",
    province: "nippur",
    home: "thebes",
    men: 1000,
  });
  s.units.push(u);
  for (let i = 0; i < 3; i++) {
    new TurnEngine(s, map).beginTurn();
    new TurnEngine(s, map).resolve(new Dict());
  }
  new TurnEngine(s, map).beginTurn();
  const d = new TurnEngine(s, map).wordFrom("Egypt", "nippur");
  Assert.true(d >= 1);
  return { s, u, d };
}

const shown = (s: ReturnType<typeof farArmy>["s"]) =>
  Views.for(s, "Egypt").units.filter(
    (x) => x.power === "Egypt" && x.province === "nippur",
  );

describe("FarUnitToldTests", () => {
  test("A part that stays when a far army leaves its king is known to him once word of their parting could come", () => {
    const { s, u, d } = farArmy();
    // Its commander takes most of it away as his own; the rest stay their king's, a new unit.
    loseUnit(s, u);
    s.units.push(
      newUnit({
        id: "u991",
        power: "Egypt",
        kind: "Army",
        province: "nippur",
        home: "thebes",
        men: 400,
        since: s.turn,
        raisedAt: "nippur",
      }),
    );
    const heard = s.turn + 1 + d;
    while (s.turn < heard) {
      Assert.equal(
        [1000],
        shown(s).map((x) => x.men),
      );
      new TurnEngine(s, map).resolve(new Dict());
      new TurnEngine(s, map).beginTurn();
    }
    Assert.equal(
      [400],
      shown(s).map((x) => x.men),
    );
  });

  test("Gold sent for a far army's food that finds it gone comes home with the courier, as word from there does", () => {
    const { s, u } = farArmy();
    const e = new TurnEngine(s, map);
    e.resolve(
      new Dict([
        ["Egypt", newTurnSubmission({ orders: [supply("nippur", true, 30)] })],
      ]),
    );
    const word = s.foodWord.find((w) => w.power === "Egypt" && w.gold === 30)!;
    loseUnit(s, u);
    const back = (): boolean =>
      inboxOf(s, "Egypt").some((i) =>
        i.body.includes("you sent for your troops' food in Nippur came back"),
      );
    // The word arrives where it was sent, in its season, and finds the army gone: the gold rides home.
    while (s.foodWord.includes(word)) {
      new TurnEngine(s, map).beginTurn();
      new TurnEngine(s, map).resolve(new Dict());
    }
    const home = s.sent.find((x) => x.power === "Egypt" && x.food)!;
    Assert.true(home.due > s.turn);
    // Its court sees no gold sent while it is on the road, and hears of it in the season it comes.
    for (let i = 0; i < 6 && !back(); i++) {
      new TurnEngine(s, map).beginTurn();
      Assert.empty(Views.for(s, "Egypt").goldSent);
      new TurnEngine(s, map).resolve(new Dict());
    }
    Assert.equal(
      [home.due],
      inboxOf(s, "Egypt")
        .filter((i) =>
          i.body.includes("you sent for your troops' food in Nippur came back"),
        )
        .map((i) => i.turn),
    );
  });

  test("Pay held back in a province holds the troops its king's view shows there, not those that truly stand there", () => {
    const { s, u } = farArmy();
    // It marched on to Ur out of its king's sight: his view still shows it in Nippur.
    u.province = "ur";
    Assert.equal(1, shown(s).length);
    new TurnEngine(s, map).resolve(
      new Dict([
        [
          "Egypt",
          newTurnSubmission({ orders: [upkeep(false, null, "nippur")] }),
        ],
      ]),
    );
    Assert.equal(["u990"], s.upkeep.get("Egypt").payExcept);
  });
});
