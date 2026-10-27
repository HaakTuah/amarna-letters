import { describe, test } from "vitest";
import {
  AllPowers,
  type AudienceView,
  CapReason,
  type HostReply,
  type Power,
  type SeatView,
  type TurnSubmission,
  inboxOf,
  move,
  newGame,
  newHostReply,
  newInboxItem,
  newSleepSpell,
  newSleepState,
  newTurnSubmission,
  raise,
  single,
} from "@amarna/engine";
import { GameRunner, type ISeat, ScriptMind, TemplateNarrator, failedOrders, seatReport } from "@amarna/game";
import { Assert, toDict } from "../../engine/test/support.ts";

describe("SeatReportTests", () => {
  class Orders implements ISeat {
    readonly #decide: (a0: SeatView) => TurnSubmission;
    constructor(decide: (a0: SeatView) => TurnSubmission) {
      this.#decide = decide;
    }
    get label(): string {
      return "Tester";
    }
    decide(view: SeatView, ct: AbortSignal): Promise<TurnSubmission> {
      return Promise.resolve(this.#decide(view));
    }
    hostAudience(view: AudienceView, court: SeatView, ct: AbortSignal): Promise<HostReply> {
      return Promise.resolve(newHostReply({ end: true }));
    }
  }

  function rowOf(report: string, p: Power): string[] {
    return single(report.split("\n"), (l) => l.trimStart().startsWith(p.toString() + " "))
      .split(" ")
      .filter((x) => x.length > 0);
  }

  test("The invalid count includes levies and other orders that failed as the season resolved", async () => {
    // Egypt sends an army to Thebes and raises a levy there (it fails after movement), and orders an impossible move.
    let egypt = new Orders((v) =>
      v.turn !== 1
        ? newTurnSubmission()
        : newTurnSubmission({
            orders: [move("akhetaten", "thebes"), raise("thebes", "Army"), move("memphis", "hattusa")],
          }),
    );
    let seats = toDict(
      AllPowers,
      (p) => p,
      (p) => (p === "Egypt" ? egypt : new Orders((_) => newTurnSubmission())),
    );
    let r = Object.assign(new GameRunner(newGame(3), seats, new ScriptMind(), new TemplateNarrator()), { writeChronicles: false });
    await r.playTurn();

    Assert.contains(inboxOf(r.state, "Egypt"), (i) => i.kind === "Rejected" && i.title === "Levy failed");
    let row = rowOf(seatReport(r), "Egypt");
    Assert.equal("Tester", row[1]);
    Assert.equal("2", row[4]); // invalid: the impossible move and the levy
  });

  test("Every rejection notice counts and other news does not", () => {
    Assert.equal(
      2,
      failedOrders(
        newInboxItem({ kind: "Rejected", title: "Orders that could not be carried out", body: "- memphis -> hattusa: no\n- raise army in babylon: no" }),
      ),
    );
    for (const title of ["Levy failed", "Purchase failed", "Not enough gold", "Not hired", "Cession failed"])
      Assert.equal(1, failedOrders(newInboxItem({ kind: "Rejected", title: title, body: "It could not be done." })));
    Assert.equal(0, failedOrders(newInboxItem({ kind: "Notice", title: "The treasury", body: "- Income 100" })));
  });

  test("The seat report shows every reason a sleeper woke", () => {
    let seats = toDict(
      AllPowers,
      (p) => p,
      (_) => new Orders((_) => newTurnSubmission()),
    );
    let r = new GameRunner(newGame(3), seats, new ScriptMind(), new TemplateNarrator());
    r.state.turn = 8;
    r.state.sleep.set(
      "Babylonia",
      newSleepState({
        history: [
          newSleepSpell({ from: 2, wokeAt: 4, reasons: ["an envoy of Egypt waits to be received", "land lost: Sippar has been taken by Assyria."] }),
          newSleepSpell({ from: 5, wokeAt: 7, reasons: [CapReason, "land lost: Kish has been taken by Assyria."] }),
          newSleepSpell({ from: 8 }),
        ],
      }),
    );
    let report = seatReport(r);
    let line = single(report.split("\n"), (l) => l.trimStart().startsWith("Babylonia"));
    Assert.contains("an envoy of Egypt waits to be received x1", line);
    Assert.contains("land lost x2", line);
    Assert.contains(`${CapReason} x1`, line);
    // Each sleep's length in seasons, + while it still sleeps.
    Assert.contains(" 2 2 1+ ", line);
  });
});
