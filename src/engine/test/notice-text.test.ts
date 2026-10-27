import { describe, test } from "vitest";
import {
  Dict,
  HomelandReason,
  TurnEngine,
  dispatch,
  first,
  inboxOf,
  move,
  newGame,
  newGameConfig,
  newGoldLot,
  newSleepState,
  newTurnSubmission,
  raise,
  single,
  unitAt,
} from "@amarna/engine";
import { Assert } from "./support.ts";

// <summary>Notices are read the season after they are written, and say so; failures are rejection notices.</summary>
describe("NoticeTextTests", () => {
  test("News written as a season resolves speaks of last season", () => {
    let s = newGame(5);
    let envoy = first(s.characters, (c) => c.employer === "Egypt");
    let e = new TurnEngine(s);
    e.beginTurn();
    e.resolve(new Dict([["Egypt", newTurnSubmission({ orders: [move("memphis", "sinai"), dispatch(envoy.id, "Hatti", "Greetings, brother.")] })]]));
    // As long as its route makes it (item 7b).
    let travel = first(s.journeys, (j) => j.characterId === envoy.id).arriveTurn - s.turn + 1;

    let inbox = inboxOf(s, "Egypt");
    Assert.contains(inbox, (i) => i.kind === "Battle" && i.title === "Movements last season" && i.body.includes("A memphis -> sinai: succeeds"));
    Assert.contains(
      inbox,
      (i) => i.title === "Envoy dispatched" && i.body === `${envoy.name} set out for Hatti last season; the journey should take about ${travel} season(s).`,
    );
    Assert.doesNotContain(inbox, (i) => i.title.includes("this season"));
  });

  test("The treasury notice says audience gold comes later", () => {
    let s = newGame(5);
    new TurnEngine(s).beginTurn();
    let notice = single(inboxOf(s, "Egypt"), (i) => i.title === "The treasury");
    Assert.contains("After income, upkeep and wages, the treasury holds", notice.body);
    Assert.contains("gold received at audiences or brought home by your envoys this season is added later", notice.body);
  });

  test("A payment the treasury cannot make is a rejection even when debased gold is found", () => {
    let s = newGame(5);
    let e = new TurnEngine(s);
    e.beginTurn();
    // The ledger shows 150, but 100 of it was never fine gold: the levy is accepted, then cannot be paid.
    s.treasuries.get("Egypt").gold = 50;
    s.treasuries.get("Egypt").lots.push(newGoldLot({ id: "g900", from: "Hatti", stated: 100, face: 100, true: 0, arrivedTurn: 1 }));
    e.resolve(new Dict([["Egypt", newTurnSubmission({ orders: [raise("thebes", "Army")] })]]));

    let inbox = inboxOf(s, "Egypt");
    Assert.contains(inbox, (i) => i.kind === "Assay" && i.title === "The treasury is short");
    Assert.contains(inbox, (i) => i.kind === "Rejected" && i.title === "Not enough gold" && i.body.includes("a new army"));
    Assert.null(unitAt(s, "thebes"));
  });

  test("Wake reasons and the digest name whose troops moved", () => {
    let s = newGame(31, newGameConfig({ sleepingSeats: true, catastropheChance: 0 }));
    s.sleep.set("Alashiya", newSleepState({ asleep: true, wakeAt: 50 }));
    s.sleep.set("Babylonia", newSleepState({ asleep: true, wakeAt: 50 }));
    single(s.units, (u) => u.province === "delta" && u.kind === "Fleet").province = "lukkawaters";
    let e = new TurnEngine(s);
    e.beginTurn();
    e.resolve(
      new Dict([
        ["Egypt", newTurnSubmission({ orders: [move("lukkawaters", "kalavasoswaters")] })],
        ["Assyria", newTurnSubmission({ orders: [move("ashur", "arbela"), move("ekallate", "ashur")] })],
      ]),
    );
    e = new TurnEngine(s);
    e.beginTurn();
    e.wakeCheck();

    // A fleet off Kalavasos, away from its capital, wakes Alashiya since the fix pass after item 4 (a threat to a province
    // of its homeland), and the reason names whose fleet it was; an army beyond the border waits in Babylon's digest.
    Assert.equal([`${HomelandReason}: Egypt's fleet moved lukkawaters -> kalavasoswaters, next to kalavasos`], s.sleep.get("Alashiya").wokenBecause);
    Assert.empty(s.sleep.get("Babylonia").wokenBecause);
    Assert.contains("turn 1: Assyria's army moved ekallate -> ashur", s.sleep.get("Babylonia").digest);
  });
});
