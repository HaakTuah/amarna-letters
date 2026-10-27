import { describe, test } from "vitest";
import {
  BackPayTitle,
  type Character,
  Dict,
  type GameConfig,
  type GameState,
  NoticeTitle,
  type Order,
  type Power,
  TurnEngine,
  type TurnSubmission,
  Views,
  WorldMap,
  economyOf,
  captive,
  dismiss,
  dispatch,
  first,
  formatMoney,
  inboxOf,
  newAudienceRecord,
  newAudienceRound,
  newContract,
  newEnvoyReaction,
  newGame,
  newGameConfig,
  newHostReply,
  newMindReply,
  newTurnSubmission,
  ownedBy,
  payRansom,
  renewalPrice,
  single,
  strength,
  sum,
} from "@amarna/engine";
import { fresh, removeAll, Assert, firstOrNull, last } from "./support.ts";

// Wages are paid on return: people away build up back pay instead of being paid, and are paid in gold when they are back
// at the court that owes it. Whoever never comes back is never paid.
describe("BackPayTests", () => {
  function begin(s: GameState): TurnEngine {
    let e = new TurnEngine(s);
    e.beginTurn();
    for (const r of e.mindRequests) e.fulfil(r, newMindReply({ text: `[${r.task}]` }));
    return e;
  }

  function none(): Dict<Power, TurnSubmission> {
    return new Dict();
  }

  function orders(p: Power, ...orders: Order[]): Dict<Power, TurnSubmission> {
    return new Dict([[p, newTurnSubmission({ orders: orders })]]);
  }

  // <summary>One of Egypt's envoys at a wage of 12, with a long term; Babylon is two seasons away each way.</summary>
  function start(config: GameConfig | null = null): [GameState, Character] {
    let s = newGame(5, config ?? newGameConfig({ catastropheChance: 0 }));
    let envoy = first(s.characters, (c) => c.employer === "Egypt");
    envoy.secretMaster = null;
    envoy.contract = newContract({ wage: 12, startTurn: 1, untilTurn: 30 });
    Assert.equal(2, new TurnEngine(s).travelTurns("Egypt", "Babylonia"));
    return [s, envoy];
  }

  test("A servant away is not paid but owed and is paid in full the season it comes home", () => {
    let [s, envoy] = start();
    begin(s).resolve(orders("Egypt", dispatch(envoy.id, "Babylonia", "Greetings.")));
    let purse = envoy.purse;

    // Turn 2: on the road, its wage is owed, not paid, and the treasury notice says so.
    let gold = s.treasuries.get("Egypt").gold;
    let e = new TurnEngine(s);
    // Gold comes in from the mines as the season begins (item 9+a), and from sales, none here.
    let income = sum(ownedBy(s, "Egypt"), (id) => economyOf(WorldMap.default.get(id)).mine);
    let [upkeep, wages] = [e.upkeep("Egypt"), e.wages("Egypt")];
    begin(s);
    Assert.equal(12, envoy.backPay.get("Egypt"));
    Assert.equal(purse, envoy.purse);
    Assert.equal(gold + income - upkeep - (wages - 12), s.treasuries.get("Egypt").gold);
    Assert.contains(
      inboxOf(s, "Egypt"),
      (i) =>
        i.turn === 2 &&
        i.title === "The treasury" &&
        i.body.includes(
          `wages ${formatMoney(wages - 12)} (to your people at court). The wages of your people away, 12 shekels, were added to their back pay, which is paid when they are back at your court.`,
        ),
    );
    let line = single(Views.for(s, "Egypt").court, (c) => c.id === envoy.id);
    Assert.equal(12, line.backPay);
    Assert.equal(12, Views.for(s, "Egypt").backPay);
    new TurnEngine(s).resolve(none());

    // It is received in turn 3 and is home in turn 5: four seasons away, paid the season it arrives.
    let e3 = begin(s);
    let a = single(s.audiences, (x) => x.envoyId === envoy.id);
    e3.applyAudience(
      newAudienceRecord({
        audienceId: a.id,
        delivered: "Greetings.",
        rounds: [newAudienceRound({ host: newHostReply({ end: true }), envoy: newEnvoyReaction() })],
      }),
    );
    e3.resolve(none());
    begin(s).resolve(none());
    Assert.equal(36, envoy.backPay.get("Egypt"));
    begin(s);
    Assert.equal([5, "Egypt"], [s.turn, envoy.at!]);
    Assert.false(envoy.backPay.has("Egypt"));
    Assert.equal(purse + 48, envoy.purse);
    Assert.contains(
      inboxOf(s, "Egypt"),
      (i) =>
        i.turn === 5 &&
        i.title === BackPayTitle &&
        i.subject === envoy.id &&
        i.body === `${envoy.name} is back at your court and was paid 48 shekels of back pay.`,
    );
    Assert.null(single(Views.for(s, "Egypt").court, (c) => c.id === envoy.id).backPay);

    // Back at court with no task, it is paid its wage each season again.
    new TurnEngine(s).resolve(none());
    begin(s);
    Assert.equal(purse + 48 + 12, envoy.purse);
  });

  test("A shortfall stays owed costs loyalty and turns the next term end into a notice", () => {
    let [t, other] = start();
    [other.traits.loyalty, other.traits.greed, other.traits.competence, other.traits.sympathy] = [90, 0, 0, null];
    // Its term ends with turn 4, while it is away: it is checked when it is home, in turn 5. Content with its wage, it
    // would serve on.
    other.contract!.untilTurn = 4;
    Assert.true(renewalPrice(other, "Egypt") <= 12);
    // No troops to pay for, so an empty treasury costs nothing else.
    removeAll(t.units, (u) => u.power === "Egypt");
    begin(t).resolve(orders("Egypt", dispatch(other.id, "Babylonia", "Greetings.")));
    while (true) {
      // The treasury is empty the season it comes home.
      if (t.journeys.some((j) => j.characterId === other.id && j.kind === "EnvoyHomebound" && j.arriveTurn === t.turn)) t.treasuries.get("Egypt").gold = -1000;
      let e = begin(t);
      if (other.at === "Egypt") break;
      const a = firstOrNull(t.audiences, (x) => x.envoyId === other.id);
      if (a !== null && a !== undefined)
        e.applyAudience(
          newAudienceRecord({
            audienceId: a.id,
            delivered: "Greetings.",
            rounds: [newAudienceRound({ host: newHostReply({ end: true }), envoy: newEnvoyReaction() })],
          }),
        );
      e.resolve(none());
    }
    Assert.equal(5, t.turn);
    Assert.true(t.treasuries.get("Egypt").gold <= 0);
    Assert.equal(48, other.backPay.get("Egypt"));
    Assert.equal(75, other.traits.loyalty);
    Assert.contains(other.memory, (m) => m.text.includes("could not pay all the wages he owes me"));
    Assert.contains(
      inboxOf(t, "Egypt"),
      (i) =>
        i.turn === 5 &&
        i.title === BackPayTitle &&
        i.body ===
          `${other.name} is back at your court and is owed 48 shekels of back pay, but the treasury could pay only 0 shekels: the other 48 shekels stays owed, and counts as missed pay.`,
    );
    Assert.equal(48, single(Views.for(t, "Egypt").court, (c) => c.id === other.id).backPay);
    Assert.equal(1, other.unpaidTurns);

    // Its term has ended: content with the wage, it would serve on, but owed back pay it gives notice instead.
    Assert.contains(
      inboxOf(t, "Egypt"),
      (i) =>
        i.turn === 5 &&
        i.title === NoticeTitle &&
        i.body.startsWith(`${other.name}'s term has ended, and you still owe them 48 shekels of back pay. They ask 12 shekels a season to serve on`),
    );
    Assert.equal(12, other.contract!.noticePrice);
    Assert.doesNotContain(inboxOf(t, "Egypt"), (i) => i.title === "Contract renewed");

    // Next season, with gold in hand, the rest is paid.
    new TurnEngine(t).resolve(none());
    t.treasuries.get("Egypt").gold = 1000;
    begin(t);
    Assert.false(other.backPay.has("Egypt"));
    Assert.contains(inboxOf(t, "Egypt"), (i) => i.turn === 6 && i.title === BackPayTitle && i.body === `${other.name} was paid 48 shekels of back pay.`);
  });

  test("A captive keeps its back pay and is paid after it is ransomed and comes home", () => {
    let s = newGame(4, newGameConfig({ catastropheChance: 0 }));
    let spy = first(s.characters, (c) => c.employer === "Egypt");
    spy.secretMaster = null;
    spy.contract = newContract({ wage: 10, startTurn: 1, untilTurn: 30 });
    [spy.status, spy.heldBy, spy.at, spy.missionTarget] = ["Captured", "Babylonia", "Babylonia", "Babylonia"];
    s.treasuries.get("Egypt").gold = 2000;
    let purse = spy.purse;
    begin(s).resolve(orders("Babylonia", captive(spy.id, "Ransom", 90)));
    while (true) {
      let e = begin(s);
      Assert.equal(10 * s.turn, spy.backPay.get("Egypt"));
      if (single(Views.for(s, "Egypt").court, (c) => c.id === spy.id).ransomDemand !== null) {
        e.resolve(orders("Egypt", payRansom(spy.id)));
        break;
      }
      e.resolve(none());
    }
    while (fresh(spy.at) !== "Egypt") {
      begin(s);
      if (fresh(spy.at) === "Egypt") break;
      Assert.equal(10 * s.turn, spy.backPay.get("Egypt"));
      new TurnEngine(s).resolve(none());
    }
    // Held, then walking home, it was owed every season it was away, the season it came home included.
    Assert.equal(purse + 10 * s.turn, spy.purse);
    Assert.false(spy.backPay.has("Egypt"));
  });

  test("A servant put to death is never paid", () => {
    let s = newGame(4, newGameConfig({ catastropheChance: 0 }));
    let spy = first(s.characters, (c) => c.employer === "Egypt");
    spy.secretMaster = null;
    [spy.status, spy.heldBy, spy.at, spy.missionTarget] = ["Captured", "Babylonia", "Babylonia", "Babylonia"];
    begin(s);
    Assert.true(spy.backPay.get("Egypt") > 0);
    new TurnEngine(s).resolve(orders("Babylonia", captive(spy.id, "Execute")));
    Assert.empty(spy.backPay);
    Assert.equal(0, new TurnEngine(s).backPayOwed("Egypt"));
  });

  test("A fallen kingdom s debts are lost", () => {
    let [s, envoy] = start();
    begin(s).resolve(orders("Egypt", dispatch(envoy.id, "Babylonia", "Greetings.")));
    begin(s);
    Assert.equal(12, envoy.backPay.get("Egypt"));
    removeAll(s.units, (u) => u.power === "Egypt");
    for (const id of [...s.owner.entries()].filter((x) => x[1] === "Egypt").map((x) => x[0])) s.owner.set(id, "Babylonia");
    new TurnEngine(s).resolve(none());
    Assert.contains("Egypt", s.eliminated);
    Assert.false(envoy.backPay.has("Egypt"));
  });

  test("A servant dismissed on the way home is still paid what it was owed when it arrives", () => {
    let [s, envoy] = start();
    begin(s).resolve(orders("Egypt", dispatch(envoy.id, "Babylonia", "Greetings.")));
    begin(s).resolve(none());
    let e = begin(s);
    let a = single(s.audiences, (x) => x.envoyId === envoy.id);
    e.applyAudience(
      newAudienceRecord({
        audienceId: a.id,
        delivered: "Greetings.",
        rounds: [newAudienceRound({ host: newHostReply({ end: true }), envoy: newEnvoyReaction() })],
      }),
    );
    e.resolve(orders("Egypt", dismiss(envoy.id)));
    // Dismissed in turn 3, its wage ends there: it is owed the two seasons it was away in service (turns 2 and 3).
    begin(s).resolve(none());
    Assert.equal(24, envoy.backPay.get("Egypt"));
    Assert.doesNotContain(Views.for(s, "Egypt").court, (c) => c.id === envoy.id);
    let purse = envoy.purse;
    begin(s);
    Assert.equal(["Egypt", "Free"], [envoy.at!, envoy.status]);
    Assert.equal(purse + 24, envoy.purse);
    Assert.contains(
      inboxOf(s, "Egypt"),
      (i) => i.title === BackPayTitle && i.body === `${envoy.name} is back at your court and was paid 24 shekels of back pay.`,
    );
  });

  test("Strength and growth do not count back pay owed (what is owed counts neither way, since item 9+a)", () => {
    let [s, envoy] = start();
    begin(s).resolve(orders("Egypt", dispatch(envoy.id, "Babylonia", "Greetings.")));
    begin(s);
    let e = new TurnEngine(s);
    let land = e.landYield("Egypt");
    Assert.equal(12, e.backPayOwed("Egypt"));
    Assert.equal(strength(s.config, land, s.treasuries.get("Egypt").gold, e.holdings("Egypt")), e.strength("Egypt"));
    Assert.equal(10 * land + s.treasuries.get("Egypt").gold + e.holdings("Egypt"), e.strength("Egypt"));
    Assert.equal(e.strength("Egypt") / s.startStrength.get("Egypt"), e.growth("Egypt"));
    let v = Views.for(s, "Egypt");
    Assert.equal(10 * land + v.gold + e.holdings("Egypt"), v.strength);
    Assert.equal(e.ledgerStrength("Egypt"), v.strength);
    // The season's score is reckoned the same way.
    e.resolve(none());
    let row = last(s.scores, (r) => r.power === "Egypt");
    Assert.equal(10 * e.landYield("Egypt") + row.gold + e.holdings("Egypt"), row.strength);
  });
});
