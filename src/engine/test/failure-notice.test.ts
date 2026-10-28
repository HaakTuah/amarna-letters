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
  feeFor,
  hire,
  inboxOf,
  newGame,
  newTurnSubmission,
  placeSpy,
  seekCandidates,
  single,
} from "@amarna/engine";
import { escapeRegex, Assert, last, homeJob } from "./support.ts";

// <summary>The kind and words of notices a king reads the season after it gave the orders behind them.</summary>
describe("FailureNoticeTests", () => {
  function begin(s: GameState): TurnEngine {
    let e = new TurnEngine(s);
    e.beginTurn();
    return e;
  }

  test("A hire the person declines is a rejection notice", () => {
    let s = newGame(6);
    for (const c of s.characters) c.seeking = false;
    let [free, other] = s.characters.filter((c) => c.status === "Free" && c.duty === "None").slice(0, 2);
    free.at = "Hatti";
    other.at = "Assyria";
    let e = begin(s);
    free.askingPrice.set("Hatti", 20);
    other.askingPrice.set("Assyria", 20);
    e.resolve(
      new Dict([
        ["Egypt", newTurnSubmission({ orders: [hire(free.id, 600, 6, 600, homeJob("Egypt"))] }) /* not where the person stands */],
        ["Hatti", newTurnSubmission({ orders: [hire(free.id, 120, 6, 120, homeJob("Hatti"))] }) /* wins */],
        ["Assyria", newTurnSubmission({ orders: [hire(other.id, 60, 6, 60, homeJob("Assyria"))] }) /* below the price */],
      ]),
    );
    begin(s);

    Assert.equal("Hatti", free.employer);
    Assert.contains(inboxOf(s, "Egypt"), (i) => i.kind === "Rejected" && i.body.includes("goes with an envoy"));
    let notice = single(inboxOf(s, "Assyria"), (i) => i.title === "Not hired");
    Assert.equal("Rejected", notice.kind);
    Assert.equal(
      `${other.name} declined your offer of ${formatMoney(60)} for 6 seasons: they ask 20 shekels a season of the term, ${formatMoney(feeFor(20, 6, 100, 80))} for this one with this advance, counting the rest only as far as they trust your court to pay it, from what they have heard.`,
      notice.body,
    );
    Assert.doesNotContain(inboxOf(s, "Hatti"), (i) => i.title === "Not hired");
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
      `^${escapeRegex(court.name)} left last season to watch Assyria; the journey should take about [0-9]+ season\\(s\\)\\.$`,
      single(sent, (i) => i.subject === court.id).body,
    );
    Assert.matches(
      `^${escapeRegex(province.name)} left last season to watch Carchemish; the journey should take about [0-9]+ season\\(s\\)\\.$`,
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
