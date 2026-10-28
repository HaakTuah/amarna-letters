import { describe, test } from "vitest";
import { court } from "../../game/src/bots/statecraft-court.ts";
import {
  type Character,
  Dict,
  type GameState,
  type Order,
  OrderValidator,
  type Power,
  TurnEngine,
  type TurnSubmission,
  Views,
  captive,
  dismiss,
  dispatch,
  first,
  hire,
  inboxOf,
  newAudienceRecord,
  newAudienceRound,
  newDispatch,
  newGame,
  newHostReply,
  newJourney,
  newMindReply,
  newTurnSubmission,
  placeSpy,
  release,
  single,
} from "@amarna/engine";
import { Assert, last, orderBy, homeJob } from "./support.ts";

// <summary>Nobody is moved by a dismissal: a servant dismissed while away keeps going where it was going, and one held stays held.</summary>
describe("DismissalTests", () => {
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

  // <summary>Babylon is two seasons from Egypt each way, so there is a season to dismiss someone on the road.</summary>
  function start(): [GameState, Character] {
    let s = newGame(5);
    let envoy = first(s.characters, (c) => c.employer === "Egypt");
    envoy.secretMaster = null;
    Assert.equal(2, new TurnEngine(s).travelTurns("Egypt", "Babylonia"));
    return [s, envoy];
  }

  test("An envoy dismissed on the way out arrives a free person with no audience and keeps the gold", () => {
    let [s, envoy] = start();
    begin(s).resolve(orders("Egypt", dispatch(envoy.id, "Babylonia", "Greetings.", { gold: 100 })));
    let e = begin(s);
    let purse = envoy.purse;
    e.resolve(orders("Egypt", dismiss(envoy.id)));
    Assert.equal("Free", envoy.status);
    Assert.null(envoy.at);
    Assert.equal(purse + 100, envoy.purse);
    Assert.contains(
      inboxOf(s, "Egypt"),
      (i) => i.title === "A servant leaves" && i.body === `${envoy.name} has been dismissed. The 1 mina 40 shekels of gold they carried is now theirs.`,
    );

    begin(s);
    Assert.empty(s.audiences);
    Assert.equal("Babylonia", envoy.at);
    Assert.equal("None", envoy.duty);
    Assert.contains(Views.for(s, "Babylonia").known, (c) => c.id === envoy.id && c.status === "free");
    Assert.doesNotContain(Views.for(s, "Egypt").court, (c) => c.id === envoy.id);
  });

  test("A dismissed traveller cannot be hired by another court on the way: a person is hired in person", () => {
    let [s, envoy] = start();
    begin(s).resolve(orders("Egypt", dispatch(envoy.id, "Babylonia", "Greetings.")));
    let e = begin(s);
    e.resolve(orders("Egypt", dismiss(envoy.id)));
    envoy.pitches.set("Hatti", "I would serve you.");
    envoy.askingPrice.set("Hatti", 10);
    // Journeys are short enough that a hire rarely falls inside one; put it back on the road for a season and hire it there.
    // When the old journey ends it must not carry the person off from its new master.
    e = begin(s);
    Assert.equal("Babylonia", envoy.at);
    envoy.at = null;
    envoy.duty = "EnvoyOutbound";
    s.journeys.push(
      newJourney({
        id: "j999",
        kind: "EnvoyOutbound",
        departTurn: s.turn,
        arriveTurn: s.turn + 1,
        from: "Egypt",
        to: "Babylonia",
        characterId: envoy.id,
        dispatch: newDispatch(),
      }),
    );
    e.resolve(orders("Hatti", hire(envoy.id, 72, 6, 72, homeJob("Hatti"))));
    Assert.null(envoy.employer);
    begin(s);
    // It arrives where it was going, free, and Hatti was told why it could not hire it.
    Assert.equal(["Babylonia", "None", "Free"], [envoy.at!, envoy.duty, envoy.status]);
    Assert.contains(inboxOf(s, "Hatti"), (i) => i.body.includes("goes with an envoy"));
  });

  test("An envoy dismissed on the way home still comes home reports and hands over the gold", () => {
    let [s, envoy] = start();
    begin(s).resolve(orders("Egypt", dispatch(envoy.id, "Babylonia", "Greetings.")));
    begin(s).resolve(none());
    let e = begin(s);
    e.applyAudience(
      newAudienceRecord({
        audienceId: single(s.audiences).id,
        delivered: "Greetings.",
        rounds: [newAudienceRound({ host: newHostReply({ goldBack: 60, end: true }) })],
      }),
    );
    e.resolve(none());
    begin(s).resolve(orders("Egypt", dismiss(envoy.id)));
    Assert.equal("EnvoyHomebound", envoy.duty);
    Assert.null(envoy.at);

    let gold = s.treasuries.get("Egypt").gold;
    e = new TurnEngine(s);
    e.beginTurn();
    let income = s.treasuries.get("Egypt").gold - gold;
    let report = single(e.mindRequests, (r) => r.task === "EnvoyReport" && r.characterId === envoy.id);
    e.fulfil(report, newMindReply({ text: "Babylon greets you." }));
    Assert.equal(gold + income + 60, s.treasuries.get("Egypt").gold);
    Assert.contains(inboxOf(s, "Egypt"), (i) => i.kind === "EnvoyReport" && i.subject === envoy.id);
    Assert.equal(["Free", "Egypt", "None"], [envoy.status, envoy.at, envoy.duty]);
  });

  test("A dismissed envoy on the way home cannot be hired by another court until it stands there", () => {
    let [s, envoy] = start();
    begin(s).resolve(orders("Egypt", dispatch(envoy.id, "Babylonia", "Greetings.")));
    begin(s).resolve(none());
    let e = begin(s);
    e.applyAudience(
      newAudienceRecord({ audienceId: single(s.audiences).id, delivered: "Greetings.", rounds: [newAudienceRound({ host: newHostReply({ end: true }) })] }),
    );
    e.resolve(orders("Egypt", dismiss(envoy.id)));
    Assert.equal(["Free", "EnvoyHomebound"], [envoy.status, envoy.duty]);
    let journey = single(s.journeys, (j) => j.characterId === envoy.id && j.kind === "EnvoyHomebound");
    Assert.true(journey.arriveTurn > s.turn);

    // Hatti cannot hire it while it is still on the road; it comes home free, and reports.
    envoy.pitches.set("Hatti", "I would serve you.");
    envoy.askingPrice.set("Hatti", 10);
    begin(s).resolve(orders("Hatti", hire(envoy.id, 72, 6, 72, homeJob("Hatti"))));
    Assert.null(envoy.employer);
    while (s.journeys.includes(journey)) begin(s).resolve(none());
    Assert.equal(["Egypt", "None", "Free"], [envoy.at!, envoy.duty, envoy.status]);
  });

  test("A detained envoy dismissed stays held and the jailers release frees it at the jailers court", () => {
    let [s, envoy] = start();
    begin(s).resolve(orders("Egypt", dispatch(envoy.id, "Babylonia", "Greetings.")));
    begin(s).resolve(none());
    let e = begin(s);
    e.applyAudience(
      newAudienceRecord({ audienceId: single(s.audiences).id, delivered: "Greetings.", rounds: [newAudienceRound({ host: newHostReply({ detain: true }) })] }),
    );
    e.resolve(orders("Egypt", dismiss(envoy.id)));
    Assert.equal(["Free", "Detained", "Babylonia"], [envoy.status, envoy.duty, envoy.heldBy]);
    Assert.empty(envoy.covers);

    begin(s).resolve(orders("Babylonia", release(envoy.id, "Go where you will.")));
    Assert.equal(["None", "Babylonia"], [envoy.duty, envoy.at]);
    Assert.null(envoy.heldBy);
    Assert.doesNotContain(s.journeys, (j) => j.characterId === envoy.id && j.kind === "EnvoyHomebound");
    Assert.contains(inboxOf(s, "Babylonia"), (i) => i.title === "Envoy released");
  });

  test("A dismissed captive stays a captive", () => {
    let s = newGame(4);
    let spy = first(s.characters, (c) => c.employer === "Hatti");
    spy.status = "Captured";
    spy.heldBy = "Mitanni";
    spy.at = "Mitanni";
    Assert.empty(new OrderValidator(s).validate("Hatti", newTurnSubmission({ orders: [dismiss(spy.id)] })).rejected);
    begin(s).resolve(orders("Hatti", dismiss(spy.id)));
    Assert.equal(["Captured", "Mitanni"], [spy.status, spy.heldBy]);
    Assert.null(spy.employer);
    Assert.doesNotContain(Views.for(s, "Hatti").court, (c) => c.id === spy.id);

    // Its captor is not told of another court's dismissal: a ransom it asks goes, as ever, to the king who sent the spy,
    // who may still pay it. Only a turning is refused, since the captive visibly stays in prison.
    begin(s).resolve(orders("Mitanni", captive(spy.id, "Ransom", 90)));
    Assert.doesNotContain(inboxOf(s, "Mitanni"), (i) => i.kind === "Rejected");
    Assert.contains(s.tasks, (t) => t.kind === "RansomDemand" && t.characterId === spy.id && t.requester === "Hatti");
    Assert.contains(s.journeys, (j) => j.kind === "Rumor" && j.to === "Hatti" && j.characterId === spy.id);
    begin(s).resolve(orders("Mitanni", captive(spy.id, "Turn", 0, "All is quiet.")));
    Assert.contains(
      inboxOf(s, "Mitanni"),
      (i) => i.kind === "Rejected" && i.body.includes(`${spy.name} serves no king now: nobody is left to deceive. ${spy.name} remains your captive`),
    );
    Assert.equal("Captured", spy.status);
  });

  test("A captive dismissed in the season its captor turns it stays a captive and the captor is told", () => {
    let s = newGame(4);
    let spy = first(s.characters, (c) => c.employer === "Hatti");
    spy.secretMaster = null;
    spy.status = "Captured";
    spy.heldBy = "Mitanni";
    spy.at = "Mitanni";
    begin(s).resolve(
      new Dict([
        ["Hatti", newTurnSubmission({ orders: [dismiss(spy.id)] })],
        ["Mitanni", newTurnSubmission({ orders: [captive(spy.id, "Turn", 0, "All is quiet.")] })],
      ]),
    );
    Assert.equal(["Captured", "Mitanni"], [spy.status, spy.heldBy]);
    Assert.null(spy.secretMaster);
    let notice = single(inboxOf(s, "Mitanni"), (i) => i.kind === "Rejected");
    Assert.equal("Captive order failed", notice.title);
    Assert.equal(
      `Your order for ${spy.name} could not be carried out: ${spy.name} serves no king now: nobody is left to deceive. ${spy.name} remains your captive.`,
      notice.body,
    );
  });

  test("A province watcher dismissed on its way out reaches the province and walks back free", () => {
    let s = newGame(5);
    let spy = first(s.characters, (c) => c.employer === "Egypt");
    begin(s).resolve(orders("Egypt", placeSpy(spy.id, null, farProvince(s))));
    Assert.equal("SpyOutbound", spy.duty);
    begin(s).resolve(orders("Egypt", dismiss(spy.id)));
    Assert.equal(["Free", "SpyOutbound"], [spy.status, spy.duty]);
    while (!s.journeys.some((j) => j.characterId === spy.id && j.kind === "SpyHomebound")) begin(s).resolve(none());
    while (spy.at === null) begin(s).resolve(none());
    Assert.equal(["Egypt", "None", "Free"], [spy.at!, spy.duty, spy.status]);
    Assert.null(spy.watchProvince);
  });

  // <summary>A province two seasons from Egypt's capital, so a spy sent there is still on its way a season later.</summary>
  function farProvince(s: GameState): string {
    let e = new TurnEngine(s);
    let cap = e.map.capital("Egypt").id;
    return first(
      orderBy(
        e.map.provinces.filter((p) => !p.isSea && e.travelTurnsBetween(cap, p.id) >= 2),
        (p) => p.id,
      ),
    ).id;
  }

  test("A dismissed spy is free where it watched and a province watcher walks back to the old court", () => {
    let s = newGame(5);
    let [court, field] = [first(s.characters, (c) => c.employer === "Egypt"), last(s.characters, (c) => c.employer === "Egypt")];
    begin(s).resolve(orders("Egypt", placeSpy(court.id, "Babylonia"), placeSpy(field.id, null, "sinai")));
    while (court.duty !== "SpyPosted" || field.duty !== "SpyPosted") begin(s).resolve(none());

    begin(s).resolve(orders("Egypt", dismiss(court.id), dismiss(field.id)));
    Assert.equal(["Free", "None", "Babylonia"], [court.status, court.duty, court.at]);
    Assert.equal("Free", field.status);
    Assert.null(field.at);
    Assert.contains(s.journeys, (j) => j.kind === "SpyHomebound" && j.characterId === field.id && j.to === "Egypt");

    while (field.at === null) begin(s).resolve(none());
    Assert.equal(["Egypt", "None", "Free"], [field.at!, field.duty, field.status]);
    Assert.null(field.watchProvince);
    Assert.contains(Views.for(s, "Egypt").known, (c) => c.id === field.id && c.status === "free");
  });

  test("A spy dismissed on its way out arrives free at the court it was sent to watch", () => {
    let s = newGame(5);
    let spy = first(s.characters, (c) => c.employer === "Egypt");
    begin(s).resolve(orders("Egypt", placeSpy(spy.id, "Babylonia")));
    begin(s).resolve(orders("Egypt", dismiss(spy.id)));
    Assert.equal(["Free", "SpyOutbound"], [spy.status, spy.duty]);
    begin(s);
    Assert.equal(["Babylonia", "None"], [spy.at!, spy.duty]);
    Assert.null(spy.missionTarget);
  });
});
