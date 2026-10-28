import { describe, test } from "vitest";
import {
  Dict,
  type GameState,
  type Order,
  type Power,
  TurnEngine,
  type TurnSubmission,
  assay,
  authenticate,
  buy,
  captive,
  cede,
  check,
  counterIntel,
  disband,
  dismiss,
  dispatch,
  first,
  forge,
  giftUnit,
  hire,
  inboxOf,
  move,
  newGame,
  newGameConfig,
  newGoldLot,
  newPendingTask,
  newPlannedOrder,
  newSleepSpell,
  newSleepState,
  newTablet,
  newTabletCopy,
  newTurnSubmission,
  newUnit,
  payRansom,
  raise,
  renew,
  single,
  support,
} from "@amarna/engine";
import { Assert, join, skilled, homeJob } from "./support.ts";
import { describe as describeOrder } from "@amarna/engine";

// Every order the validator accepts but the season cannot carry out is reported to its king next season, as a
// rejection notice with the reason in plain words.
describe("ResolutionFailureTests", () => {
  // <summary>Babylonia holds Jerusalem and Gaza with an army in each, next to Egypt's Sinai, where Egypt has an army too.</summary>
  function board(sleeping: boolean = false): GameState {
    let s = newGame(4, newGameConfig({ catastropheChance: 0, sleepingSeats: sleeping }));
    for (const [city, id] of [
      ["jerusalem", "u90"],
      ["gaza", "u91"],
    ]) {
      s.owner.set(city, "Babylonia");
      s.walls.delete(city);
      s.units.push(newUnit({ id: id, power: "Babylonia", kind: "Army", province: city }));
    }
    s.units.push(newUnit({ id: "u92", power: "Egypt", kind: "Army", province: "sinai" }));
    return s;
  }

  // <summary>Egypt's ledger counts 1,000 shekels of gold that was never fine: what it orders passes the check, then cannot be paid.</summary>
  function debased(s: GameState): void {
    s.treasuries.get("Egypt").gold = 0;
    s.treasuries.get("Egypt").lots.push(newGoldLot({ id: "g900", from: "Hatti", stated: 1000, face: 1000, true: 0, arrivedTurn: 1 }));
  }

  const TakeSinai: Order[] = [move("jerusalem", "sinai"), support("gaza", "jerusalem", "sinai")];

  test.each([
    ["cession of land lost in battle", "Cession failed", "Sinai was not ceded to Hatti: you no longer held it after movement.", true],
    ["cession of land with own troops in it", "Cession failed", "Memphis was not ceded to Hatti: your own troops still stood in it after movement.", false],
    ["gift of troops destroyed in battle", "Gift of troops failed", "No unit of yours stood in Sinai after movement, so none was given to Hatti.", false],
    ["disband of a unit destroyed in battle", "Disband failed", "No unit of yours stood in Sinai after movement, so none was disbanded.", false],
    ["levy in a province not empty", "Levy failed", "No army was raised in Thebes: Thebes was not empty after movement. No gold was paid.", false],
    [
      "levy in land ceded that season",
      "Levy failed",
      "No army was raised in Sinai: you ceded Sinai to Hatti last season, before the levy. No gold was paid.",
      false,
    ],
    ["levy that cannot be paid", "Not enough gold", "There was not enough gold to pay for a new army in Thebes; none was raised.", true],
    ["purchase between rival buyers", "Purchase failed", "The elders of Tyre would not choose between 2 buyers last season. No gold was paid.", true],
    ["purchase that cannot be paid", "Not enough gold", "There was not enough gold to pay for the city of Tyre; it was not bought.", true],
    ["dispatch that cannot be paid", "Not enough gold", "mission to Hatti; {envoy} stayed at your court.", true],
    ["background check that cannot be paid", "Not enough gold", "There was not enough gold to pay for inquiries into {stranger}; none were made.", true],
    ["watchmen who cannot be paid", "Not enough gold", "There was not enough gold to pay for watchmen; none were set.", true],
    ["assay that cannot be paid", "Not enough gold", "There was not enough gold to pay for an assay; gold lot g901 was not assayed.", true],
    [
      "assay of gold weighed when a payment fell short",
      "Assay failed",
      "Gold lot g901 was not assayed: your treasurers had already weighed all your unassayed gold last season, when a payment fell short. No fee was paid.",
      true,
    ],
    [
      "examination that cannot be paid",
      "Not enough gold",
      "There was not enough gold to pay for the examination of a tablet; tablet k900 was not examined.",
      true,
    ],
    ["forgery that cannot be paid", "Not enough gold", "There was not enough gold to pay for a forger's materials; nothing was forged.", true],
    ["forgery by a servant without the skill", "Forgery botched", "{envoy} said they could not fake a seal; the clay is ruined and nothing usable came of it.", false],
    ["ransom that cannot be paid", "Not enough gold", "There was not enough gold to pay for the ransom for {envoy}; none was sent.", true],
    ["ransom for a captive let go that season", "Ransom not sent", "The ransom for {envoy} could not be sent: {envoy} is no longer held by Hatti.", true],
    ["hire below the price", "Not hired", "{stranger} declined your offer of 1 shekels for 6 seasons: they ask", false],
    ["renewal below the price", "Not renewed", "{envoy} will not take a new job for 1 shekels within 6 seasons with 0 shekels now; they ask", false],
    [
      "captive turned once its king dismissed it",
      "Captive order failed",
      "{envoy} serves no king now: nobody is left to deceive. {envoy} remains your captive.",
      true,
    ],
  ] as const)(
    "Every order that fails as the season resolves is reported with the reason %s",
    (order: string, title: string, expected: string, wakes: boolean) => {
      play(order, title, expected, false, wakes);
      // The same order scheduled by a sleeping seat fails the same way, and wakes it with the reason if others foiled it.
      play(order, title, expected, true, wakes);
    },
  );

  // Plays one failing order. Scheduled, the failing king's orders run as a sleeping seat's scheduled orders; the order
  // that fails is always the last it lists.
  function play(order: string, title: string, expected: string, scheduled: boolean, wakes: boolean): void {
    let s = board(scheduled);
    let e = new TurnEngine(s);
    e.beginTurn();
    let envoy = first(s.characters, (c) => c.employer === "Egypt" && c.at === "Egypt");
    let stranger = first(s.characters, (c) => c.status === "Free");
    let who: Power = "Egypt";
    let orders = new Dict<Power, TurnSubmission>();
    function egypt(...o: Order[]): void {
      orders.set("Egypt", newTurnSubmission({ orders: o }));
    }

    switch (order) {
      case "cession of land lost in battle":
        orders.set("Babylonia", newTurnSubmission({ orders: [...TakeSinai] }));
        egypt(cede("sinai", "Hatti"));
        break;
      case "cession of land with own troops in it":
        egypt(cede("memphis", "Hatti"));
        break;
      case "gift of troops destroyed in battle":
        orders.set("Babylonia", newTurnSubmission({ orders: [...TakeSinai] }));
        egypt(giftUnit("sinai", "Hatti"));
        break;
      case "disband of a unit destroyed in battle":
        orders.set("Babylonia", newTurnSubmission({ orders: [...TakeSinai] }));
        egypt(disband("sinai"));
        break;
      case "levy in a province not empty":
        egypt(move("akhetaten", "thebes"), raise("thebes", "Army"));
        break;
      case "levy in land ceded that season":
        // Ceded before the levy: the notice says so, not that the land was lost in movement.
        // Sinai's own men are too few for an army (item 10+a): give it enough, so only the cession stops the levy.
        s.people.get("sinai").men = s.people.get("sinai").settled = 20000;
        egypt(cede("sinai", "Hatti"), move("sinai", "memphis"), raise("sinai", "Army"));
        single(s.units, (u) => u.province === "memphis").province = "thebes";
        break;
      case "levy that cannot be paid":
        debased(s);
        egypt(raise("thebes", "Army"));
        break;
      case "purchase between rival buyers":
        // Egypt reaches Tyre by a fleet in its waters; Babylonia by Gaza.
        s.units.push(newUnit({ id: "u93", power: "Egypt", kind: "Fleet", province: "tyrewaters" }));
        orders.set("Babylonia", newTurnSubmission({ orders: [buy("tyre")] }));
        for (const t of s.treasuries.values()) t.gold += 5000;
        egypt(buy("tyre"));
        break;
      case "purchase that cannot be paid":
        s.units.push(newUnit({ id: "u93", power: "Egypt", kind: "Fleet", province: "tyrewaters" }));
        debased(s);
        // Enough by the ledger for a city's price (item 9+a: what it adds), none of it fine.
        s.treasuries.get("Egypt").lots[0].face = s.treasuries.get("Egypt").lots[0].stated = 10000;
        egypt(buy("tyre"));
        break;
      case "dispatch that cannot be paid":
        debased(s);
        egypt(dispatch(envoy.id, "Hatti", "Greetings.", { gold: 50 }));
        break;
      case "background check that cannot be paid":
        debased(s);
        egypt(check(stranger.id, 40));
        break;
      case "watchmen who cannot be paid":
        debased(s);
        egypt(counterIntel(30));
        break;
      case "assay that cannot be paid":
        debased(s);
        s.treasuries.get("Egypt").lots.push(newGoldLot({ id: "g901", from: "Hatti", stated: 40, face: 40, true: 40, arrivedTurn: 1 }));
        s.treasuries.get("Egypt").gold = 5;
        egypt(assay("g901"));
        break;
      case "assay of gold weighed when a payment fell short":
        // A levy the debased gold cannot pay for: the treasurers weigh all the unassayed gold, the fine lot included.
        debased(s);
        s.treasuries.get("Egypt").lots.push(newGoldLot({ id: "g901", from: "Hatti", stated: 40, face: 40, true: 40, arrivedTurn: 1 }));
        s.treasuries.get("Egypt").gold = 50;
        egypt(raise("thebes", "Army"), assay("g901"));
        break;
      case "examination that cannot be paid":
        debased(s);
        s.tablets.push(
          newTablet({ id: "t900", text: "Peace.", proposedBy: "Hatti", partner: "Egypt", seals: ["Hatti", "Egypt"], createdTurn: 1, sealedTurn: 1 }),
        );
        s.copies.push(newTabletCopy({ id: "k900", tabletId: "t900", holder: "Egypt", acquiredTurn: 1, source: "sealed at audience" }));
        egypt(authenticate("k900", 40));
        break;
      case "forgery that cannot be paid":
        debased(s);
        skilled(envoy, 90);
        egypt(forge(envoy.id, "Hatti and Assyria swear to march together.", ["Hatti", "Assyria"]));
        break;
      case "forgery by a servant without the skill":
        skilled(envoy, 10);
        egypt(forge(envoy.id, "Hatti and Assyria swear to march together.", ["Hatti", "Assyria"]));
        break;
      case "ransom that cannot be paid":
      case "ransom for a captive let go that season":
        if (order.startsWith("ransom that")) debased(s);
        envoy.status = "Captured";
        envoy.heldBy = "Hatti";
        envoy.at = "Hatti";
        s.tasks.push(
          newPendingTask({
            id: "q900",
            kind: "RansomDemand",
            requester: "Egypt",
            other: "Hatti",
            characterId: envoy.id,
            spend: 60,
            dueTurn: 5,
            announced: true,
          }),
        );
        if (order.startsWith("ransom for")) orders.set("Hatti", newTurnSubmission({ orders: [captive(envoy.id, "Release")] }));
        egypt(payRansom(envoy.id));
        break;
      case "hire below the price":
        stranger.at = "Egypt";
        egypt(hire(stranger.id, 1, 6, 0, homeJob("Egypt")));
        break;
      case "renewal below the price":
        egypt(renew(envoy.id, 1, 6, 0, homeJob("Egypt")));
        break;
      case "captive turned once its king dismissed it":
        who = "Hatti";
        envoy.status = "Captured";
        envoy.heldBy = "Hatti";
        envoy.at = "Hatti";
        egypt(dismiss(envoy.id));
        orders.set("Hatti", newTurnSubmission({ orders: [captive(envoy.id, "Turn", 0, "All is quiet.")] }));
        break;
      default:
        throw new Error(order);
    }

    let mine = orders.get(who).orders;
    if (scheduled) {
      s.sleep.set(
        who,
        newSleepState({
          asleep: true,
          wakeAt: 50,
          history: [newSleepSpell({ from: s.turn })],
          scheduled: [...mine.map((o) => newPlannedOrder({ turn: s.turn, order: o }))],
        }),
      );
      orders.delete(who);
    }
    let valid = e.resolve(orders);
    Assert.empty(valid.get(who).rejected); // the validator accepted it: the failure came as the season resolved
    let text = expected.replaceAll("{envoy}", envoy.name).replaceAll("{stranger}", stranger.name);
    let notice = Assert.single(inboxOf(s, who), (i) => i.title === title);
    Assert.equal("Rejected", notice.kind);
    Assert.contains(text, notice.body);
    Assert.equal(s.turn, notice.turn); // read next season
    if (!scheduled) return;

    let wake = `orders you scheduled could not be carried out: ${describeOrder(mine.at(-1)!)} (`;
    if (!wakes) {
      // A failure of the seat's own making wakes nobody: it would let a king wake himself with an order he knows will
      // fail. (Troops destroyed in battle wake the seat by themselves, so a disband or gift of them wakes it for that.)
      Assert.doesNotContain(s.sleep.get(who).pendingWake, (w) => w.startsWith(wake));
      new TurnEngine(s).beginTurn();
      new TurnEngine(s).wakeCheck();
      Assert.doesNotContain(s.sleep.get(who).wokenBecause, (w) => w.startsWith(wake));
      if (s.sleep.get(who).asleep) Assert.contains(`an order was refused or failed (${title})`, join("\n", s.sleep.get(who).digest));
      else Assert.contains(s.sleep.get(who).wokenBecause, (w) => w.startsWith("your army in sinai was destroyed"));
      return;
    }
    // The failure wakes the sleeping seat next season, naming the order and why it failed.
    Assert.contains(s.sleep.get(who).pendingWake, (w) => w.startsWith(wake) && !w.endsWith("()"));
    new TurnEngine(s).beginTurn();
    new TurnEngine(s).wakeCheck();
    Assert.false(s.sleep.get(who).asleep);
    Assert.contains(s.sleep.get(who).wokenBecause, (w) => w.startsWith(wake));
  }
});
