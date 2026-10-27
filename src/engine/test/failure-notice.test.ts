import { describe, test } from "vitest";
import { court } from "../../game/src/bots/statecraft-court.ts";
import {
  Dict,
  type GameState,
  type Power,
  TurnEngine,
  counterIntel,
  dispatch,
  first,
  formatMoney,
  hire,
  inboxOf,
  newGame,
  newTurnSubmission,
  placeSpy,
  seekCandidates,
  single,
} from "@amarna/engine";
import { escapeRegex, Assert, last } from "./support.ts";

// <summary>The kind and words of notices a king reads the season after it gave the orders behind them.</summary>
describe("FailureNoticeTests", () => {
  function begin(s: GameState): TurnEngine {
    let e = new TurnEngine(s);
    e.beginTurn();
    return e;
  }

  test("A hire the person declines is a rejection notice", () => {
    let s = newGame(6);
    let free = first(s.characters, (c) => c.status === "Free");
    let e = begin(s);
    for (const p of ["Egypt", "Hatti", "Assyria"] as const) {
      free.pitches.set(p, "I am worth it.");
      free.askingPrice.set(p, 20);
    }
    e.resolve(
      new Dict([
        ["Egypt", newTurnSubmission({ orders: [hire(free.id, 25)] }) /* outbid */],
        ["Hatti", newTurnSubmission({ orders: [hire(free.id, 40)] }) /* wins */],
        ["Assyria", newTurnSubmission({ orders: [hire(free.id, 10)] }) /* below the price */],
      ]),
    );

    Assert.equal("Hatti", free.employer);
    for (const [p, wage, why] of [
      ["Egypt", 25, "another court offered more"],
      ["Assyria", 10, "they ask 20 shekels"],
    ] as const) {
      let notice = single(inboxOf(s, p), (i) => i.title === "Not hired");
      Assert.equal("Rejected", notice.kind);
      Assert.equal(`${free.name} declined your offer of ${formatMoney(wage)} a season: ${why}.`, notice.body);
    }
    Assert.doesNotContain(inboxOf(s, "Hatti"), (i) => i.title === "Not hired");
    // The winner reads the rulebook's words: in service at the end of the season, sent on errands from the next.
    Assert.equal(
      `${free.name} entered your service at the end of last season, at ${formatMoney(40)} a season, and can be sent on an errand now.`,
      single(inboxOf(s, "Hatti"), (i) => i.title === "Hired").body,
    );
  });

  test("A hire lost to an equal offer says so", () => {
    let s = newGame(6);
    let free = first(s.characters, (c) => c.status === "Free");
    free.traits.sympathy = null;
    let e = begin(s);
    for (const p of ["Egypt", "Hatti"] as const) {
      free.pitches.set(p, "I am worth it.");
      free.askingPrice.set(p, 20);
    }
    e.resolve(
      new Dict([
        ["Egypt", newTurnSubmission({ orders: [hire(free.id, 30)] })],
        ["Hatti", newTurnSubmission({ orders: [hire(free.id, 30)] })],
      ]),
    );

    let loser: Power = free.employer === "Egypt" ? "Hatti" : "Egypt";
    let notice = single(inboxOf(s, loser), (i) => i.title === "Not hired");
    Assert.equal("Rejected", notice.kind);
    Assert.equal(`${free.name} declined your offer of ${formatMoney(30)} a season: they chose another court that offered as much.`, notice.body);
  });

  test("A spy sent out is reported as having left last season", () => {
    let s = newGame(8);
    let [court, province] = [first(s.characters, (c) => c.employer === "Babylonia"), last(s.characters, (c) => c.employer === "Babylonia")];
    Assert.notEqual(court.id, province.id);
    begin(s).resolve(new Dict([["Babylonia", newTurnSubmission({ orders: [placeSpy(court.id, "Assyria"), placeSpy(province.id, null, "carchemish")] })]]));

    let sent = inboxOf(s, "Babylonia").filter((i) => i.title === "Agent sent");
    Assert.equal(2, sent.length);
    Assert.all(sent, (i) => Assert.equal("Notice", i.kind));
    Assert.matches(
      `^${escapeRegex(court.name)} left last season to watch Assyria; the journey takes [0-9]+ season\\(s\\)\\.$`,
      single(sent, (i) => i.subject === court.id).body,
    );
    Assert.matches(
      `^${escapeRegex(province.name)} left last season to watch Carchemish; the journey takes [0-9]+ season\\(s\\)\\.$`,
      single(sent, (i) => i.subject === province.id).body,
    );
  });

  test("Refusals are worded for the season they are read in", () => {
    let s = newGame(8);
    let envoy = first(s.characters, (c) => c.employer === "Babylonia");
    begin(s).resolve(
      new Dict([
        [
          "Babylonia",
          newTurnSubmission({
            orders: [
              placeSpy(envoy.id, "Assyria"),
              dispatch(envoy.id, "Hatti", "Greetings, brother."),
              seekCandidates(),
              seekCandidates(),
              counterIntel(10),
              counterIntel(10),
            ],
          }),
        ],
      ]),
    );

    let notice = single(inboxOf(s, "Babylonia"), (i) => i.title === "Orders that could not be carried out");
    Assert.equal("Rejected", notice.kind);
    Assert.contains(`${envoy.name} was already given a task by an earlier order`, notice.body);
    Assert.contains("you had already asked for candidates that season", notice.body);
    Assert.contains("you had already set your watch that season", notice.body);
    Assert.doesNotContain("this season", notice.body);
  });
});
