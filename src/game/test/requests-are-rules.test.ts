import { describe, test } from "vitest";
import {
  type AudienceView,
  type Character,
  CommittedPrefix,
  Dict,
  type MessageTrail,
  type Power,
  ReopenReason,
  TurnEngine,
  type TurnSubmission,
  Views,
  envoyWaits,
  newAudienceView,
  newCharacter,
  newCharacterView,
  newContract,
  newDispatch,
  newFact,
  newGame,
  newGameConfig,
  newGoldLot,
  newHomeCargo,
  newHostReply,
  newMessageTrail,
  newMindRequest,
  newSpyReport,
  newTabletView,
  newSkills,
  newTraits,
  newTurnSubmission,
  placeSpy,
  remember,
} from "@amarna/engine";
import { type EnvoyContext, type MindContext, newEnvoyContext, newMindContext } from "@amarna/game";
import {
  type CallSpec,
  CharacterSystem,
  type JsonAsker,
  type JsonObject,
  LlmCharacterMind,
  LlmLeaderSeat,
  Schemas,
  SimulatedApi,
  jsonSchema,
  leaderRules,
  ordersLine,
  selfText,
  situation,
  sleepLine,
} from "@amarna/llm";
import { at, str, removeAll, Assert, firstOrNull } from "../../engine/test/support.ts";
import { Recorder } from "./recorder.ts";
import { audience as audiencePrompt } from "@amarna/llm";
import { first as firstOf } from "@amarna/engine";

// The builder rule "Requests are rules too" (20 October 2026): models read their requests literally, so no field may imply
// something that is not true. Each request asks only what applies, shows no internal id or number a king or character
// could repeat, and keeps the engine's outcomes apart from a character's own words. These are the nudges the fix pass's
// audit of every request found beyond the cases item 4 named (part 2 has those: ).
describe("RequestsAreRulesTests", () => {
  // <summary>Answers every request with the reply given, and keeps the requests.</summary>
  class Answers implements JsonAsker {
    readonly #reply: JsonObject;
    constructor(reply: JsonObject) {
      this.#reply = reply;
    }
    calls: CallSpec[] = [];

    askJson(spec: CallSpec, ct: AbortSignal): Promise<JsonObject> {
      this.calls.push(spec);
      return Promise.resolve(structuredClone(this.#reply));
    }
  }

  function envoy(competence: number = 60, employer: Power | null = "Egypt"): Character {
    return newCharacter({
      id: "c1",
      name: "Keliya",
      origin: "Washukanni",
      calling: "scribe",
      status: employer === null ? "Free" : "Employed",
      employer: employer,
      contract: employer === null ? null : newContract({ fee: 60, advance: 30, untilTurn: 6 }),
      at: "Hatti",
      traits: newTraits({ loyalty: 50, greed: 50, competence: competence, ambition: 40, courage: 50 }),
      // Item 10: it believes what it can do.
      belief: newSkills({ gather: competence, stealth: competence, forge: competence }),
    });
  }

  function audience(envoy: Character, gold: number = 0, giftTaken: boolean = false): EnvoyContext {
    return newEnvoyContext({
      self: envoy,
      sender: "Egypt",
      host: "Hatti",
      dispatch: newDispatch({ letter: "Greetings, brother.", gold: gold }),
      turn: 2,
      seed: 1,
      forgeMinCompetence: 55,
      delivered: "Greetings.",
      round: 2,
      giftTaken: giftTaken,
    });
  }

  function reportOf(envoy: Character, gold: number = 0, trail: MessageTrail | null = null): MindContext {
    return newMindContext({
      request: newMindRequest({ task: "EnvoyReport", characterId: envoy.id, court: "Egypt", cargo: newHomeCargo({ gold: gold, goldStated: gold }) }),
      self: envoy,
      turn: 4,
      seed: 1,
      forgeMinCompetence: 55,
      trail: trail,
    });
  }

  test("An envoy whose hand cannot fake a seal is not asked whether to swap the inventory", async () => {
    // It is asked how much to keep, and told the shortfall would show; a swap in its reply is not made.
    let asker = new Answers({ ["speech"]: "Words.", ["report"]: "Words.", ["keep_gold"]: 10, ["swap_inventory"]: true });
    let mind = new LlmCharacterMind(asker);
    let clumsy = envoy(40);

    let present = await mind.present(audience(clumsy, 40));
    let report = await mind.write(reportOf(clumsy, 30));

    Assert.equal(["as_written", "speech", "keep_gold"], Recorder.fields(asker.calls[0]));
    Assert.equal(["report", "keep_gold"], Recorder.fields(asker.calls[1]));
    Assert.all(asker.calls, (call) => {
      Assert.doesNotContain("hand over in place of the inventory", call.user);
      Assert.contains(
        "you do not believe your hand is skilled enough to fake a seal, so you could not pass off a forged inventory: what you keep would show as gold missing against the inventory.",
        call.user,
      );
    });
    Assert.equal([10, false], [present.skim, present.swapInventory]);
    Assert.equal([10, false], [report.number, report.swapInventory]);

    // A skilled hand is asked, and the field no longer speaks of a hand that cannot.
    let skilled = new Answers({ ["speech"]: "Words.", ["keep_gold"]: 10, ["swap_inventory"]: true });
    Assert.true((await new LlmCharacterMind(skilled).present(audience(envoy(70), 40))).swapInventory);
    Assert.equal(["as_written", "speech", "keep_gold", "swap_inventory"], Recorder.fields(skilled.calls[0]));
    Assert.doesNotContain("you are told whether yours is one", str(Schemas.present(), "properties", "swap_inventory", "description"));
    Assert.contains("if your hand can fake a seal, whether to swap its inventory tablet", CharacterSystem);
  });

  test("An envoy that took a gift is not asked about a second one which would not be given", async () => {
    let asker = new Answers({ ["speech"]: "Words.", ["accept_gift"]: true, ["commitments"]: "" });
    let mind = new LlmCharacterMind(asker);
    let host = newHostReply({ speech: "Take more.", bribe: 20, bribeAsk: "Speak well of me." });

    let second = await mind.react(audience(envoy(), undefined, true), host);
    let first = await mind.react(audience(envoy()), host);

    Assert.equal(["speech", "commitments"], Recorder.fields(asker.calls[0]));
    Assert.contains(
      "He offers you another gift of 20 shekels, but an envoy takes one gift at an audience and you have taken his already, so it will not be given.",
      asker.calls[0].user,
    );
    Assert.false(second.acceptBribe);
    Assert.equal(["speech", "accept_gift", "commitments"], Recorder.fields(asker.calls[1]));
    Assert.true(first.acceptBribe);
  });

  test("Gold a host names for the envoy s lord is not said to be sent before it is", async () => {
    let asker = new Answers({ ["speech"]: "Words.", ["commitments"]: "" });
    let mind = new LlmCharacterMind(asker);

    await mind.react(audience(envoy()), newHostReply({ speech: "Take this home.", goldBack: 30 }));
    await mind.react(audience(envoy()), newHostReply({ speech: "Serve me, or take this home.", goldBack: 30, jobOffer: 25 }));
    await mind.react(audience(envoy()), newHostReply({ speech: "You stay.", goldBack: 30, detain: true }));

    // It is handed over when the audience ends, if the host can pay it and the envoy goes home: never "He sends".
    Assert.contains(
      "He names 30 shekels of gold to send home with you for your lord: it is handed to you when the audience ends, if his treasury can pay it.",
      asker.calls[0].user,
    );
    Assert.contains("if his treasury can pay it and you go home to your lord.", asker.calls[1].user);
    // A detained envoy takes nothing home, so it is not told of gold.
    Assert.doesNotContain("30 shekels", asker.calls[2].user);
    Assert.all(asker.calls, (call) => Assert.doesNotContain("He sends", call.user));
  });

  test("An envoy that was never received is not asked about an audience", async () => {
    let asker = new Recorder();
    let mind = new LlmCharacterMind(asker);
    // It reached a court whose king was gone, and turned back: its trail has no audience.
    let trail = newMessageTrail({ id: "m1", turn: 2, from: "Egypt", to: "Mitanni", envoyId: "c1", envoyName: "Keliya" });

    await mind.write(reportOf(envoy(), undefined, trail));

    let user = Assert.single(asker.calls).user;
    Assert.contains("You went to the court of Mitanni, but you were never received there: you came back without an audience.", user);
    Assert.doesNotContain("You told its king", user);
  });

  test("An envoy dismissed while away reports to the king who sent it who is no longer its lord", async () => {
    let asker = new Recorder();
    let mind = new LlmCharacterMind(asker);
    let dismissed = envoy(70, null);

    await mind.write(reportOf(dismissed, 20));

    let call = Assert.single(asker.calls);
    let user = call.user;
    Assert.contains("He dismissed you while you were away, so he is no longer your lord, but you report to him on the mission he gave you.", user);
    Assert.contains("You carry back gold the king sent Naphurureya", user);
    Assert.contains("Write your report to him now.", user);
    Assert.doesNotContain("home at the court of your lord", user);
    Assert.doesNotContain("sent your lord", user);
    Assert.doesNotContain("report to your lord", user);
    // The schema says the same as the request (the follow-up's review: it still said "Your report to your lord.").
    Assert.equal("Your report to the king who sent you on this mission.", reportDescription(call));
    Assert.doesNotContain("your lord", JSON.stringify(call.schema));

    // One still in its lord's service reports to its lord, in the request and the schema alike.
    let loyal = new Recorder();
    await new LlmCharacterMind(loyal).write(reportOf(envoy(70), 20));
    Assert.contains("Write your report to your lord now.", loyal.calls[0].user);
    Assert.equal("Your report to your lord.", reportDescription(loyal.calls[0]));
  });

  test("An envoy dismissed while away is told its own promise was made on behalf of the king who sent it", async () => {
    let asker = new Recorder();
    let mind = new LlmCharacterMind(asker);
    let trail = newMessageTrail({
      id: "m1",
      turn: 2,
      from: "Egypt",
      to: "Mitanni",
      envoyId: "c1",
      envoyName: "Keliya",
      audienceTurn: 3,
      delivered: "Greetings.",
    });
    trail.outcomes.push(CommittedPrefix + "Egypt will send gold next spring.");

    await mind.write(reportOf(envoy(undefined, null), undefined, trail));
    await mind.write(reportOf(envoy(), undefined, trail));

    Assert.contains("What you yourself promised on his behalf, in your own words at the audience", asker.calls[0].user);
    Assert.contains("What you yourself promised on your lord's behalf, in your own words at the audience", asker.calls[1].user);
  });

  test("The simulated api answers every field a king or a dismissed envoy is asked", async () => {
    // The follow-up's review: with sleep off the simulated API left out standing_orders and cancel_standing, which every
    // king is now asked; and a dismissed envoy's report fell through to the plain report reply.
    async function replyOf(schema: JsonObject): Promise<JsonObject> {
      let body: JsonObject = { model: "claude-sonnet-5-5", tools: [{ name: "reply", input_schema: schema }] };
      let result = await new SimulatedApi().send(body);
      return JSON.parse(result.text) as JsonObject;
    }

    for (const sleeping of [false, true]) {
      let schema = Schemas.leaderOrders(newGameConfig({ sleepingSeats: sleeping }));
      let reply = await replyOf(schema);
      Assert.all(schema.required as string[], (field) => Assert.true(field in reply, `${field} (sleep ${sleeping})`));
      Assert.equal(sleeping, "schedule" in reply);
    }
    Assert.equal("The king received me kindly.", (await replyOf(Schemas.report(false, false))).report as string);
  });

  function reportDescription(call: CallSpec): string {
    return ((jsonSchema(call.schema).properties as JsonObject).report as JsonObject).description as string;
  }

  test("A king whose title names his land is not named twice", async () => {
    let asker = new Recorder();
    let mind = new LlmCharacterMind(asker);
    await mind.present(
      newEnvoyContext({ self: envoy(), sender: "Egypt", host: "Alashiya", dispatch: newDispatch({ letter: "Greetings." }), turn: 2, seed: 1 }),
    );
    await mind.write(
      newMindContext({
        request: newMindRequest({ task: "EnvoyReport", characterId: "c1", court: "Alashiya", cargo: newHomeCargo() }),
        self: envoy(undefined, "Alashiya"),
        turn: 4,
        seed: 1,
      }),
    );

    Assert.startsWith("You have arrived at the court of the King of Alashiya, as the envoy of Naphurureya of Egypt.", asker.calls[0].user);
    Assert.startsWith("You are home at the court of your lord, the King of Alashiya.", asker.calls[1].user);
    Assert.all(asker.calls, (c) => Assert.doesNotContain("Alashiya of Alashiya", c.user));
    Assert.all(asker.calls, (c) => Assert.doesNotContain("Alashiya, king of Alashiya", c.user));

    // Its lord's land is named once, with the power's name only where the land has another ("Mitanni (Mitanni)" before).
    Assert.contains("You are on a job for the king of Egypt: 60 shekels for the term", asker.calls[0].seatSystem);
    let babylonian = envoy(undefined, "Babylonia");
    babylonian.secretMaster = "Hatti";
    let self = selfText(babylonian, 2);
    Assert.contains("You are on a job for the king of Karduniash (Babylonia): 60 shekels for the term", self);
    Assert.contains("In secret you serve Hatti, and you protect its interests.", self);
  });

  // ------------------------------------------------------------ kings

  function court(
    round: number = 1,
    tablet: boolean = false,
    sealedEarlier: boolean = false,
    giftAccepted: number = 0,
    ordersStand: boolean = false,
    reopenChosen: boolean = false,
  ): AudienceView {
    return newAudienceView({
      audienceId: "a1",
      turn: 2,
      round: round,
      maxRounds: 2,
      from: "Hatti",
      host: "Egypt",
      envoy: newCharacterView({ id: "c3", name: "Keliya" }),
      spoken: "Greetings.",
      giftAccepted: giftAccepted,
      proposal: tablet ? newTabletView({ text: "Peace between us.", seals: ["Hatti"] }) : null,
      proposalSealed: sealedEarlier,
      ordersStand: ordersStand,
      reopenChosen: reopenChosen,
    });
  }

  function fields(schema: JsonObject): string[] {
    return Object.keys(schema.properties as JsonObject);
  }

  test("A host is asked only what applies at each exchange of an audience", () => {
    let c = newGameConfig();
    // No tablet brought: no question about sealing one.
    Assert.equal(
      ["speech", "clauses", "gift_to_envoy", "gift_request", "offer_service_wage", "detain_envoy", "send_gold_back", "gold_back_purity", "end_audience", "ledger"],
      fields(Schemas.hostReply(c, court())),
    );
    Assert.contains("seal_tablet", fields(Schemas.hostReply(c, court(undefined, true))));
    // Chosen at an earlier exchange: sealed when the audience ends, and not asked again.
    Assert.doesNotContain("seal_tablet", fields(Schemas.hostReply(c, court(2, true, true))));
    Assert.contains(
      "You chose at an earlier exchange to seal the tablet the envoy brought (already sealed by Hatti), and your seal is set on it when the audience ends",
      audiencePrompt(court(2, true, true)),
    );
    // The envoy took a gift: another would not be given, so none is asked.
    let afterGift = fields(Schemas.hostReply(c, court(2, undefined, undefined, 20)));
    Assert.doesNotContain("gift_to_envoy", afterGift);
    Assert.doesNotContain("gift_request", afterGift);
    // At the last exchange the audience ends with the answer: no question of ending it.
    Assert.doesNotContain("end_audience", afterGift);
    Assert.contains("This is the last exchange of the audience: it ends with your answer.", audiencePrompt(court(2)));
    // Woken for its audiences only, it may reopen its orders, until it has chosen to.
    Assert.contains("reopen_orders", fields(Schemas.hostReply(c, court(undefined, undefined, undefined, undefined, true))));
    Assert.doesNotContain("reopen_orders", fields(Schemas.hostReply(c, court(2, undefined, undefined, undefined, true, true))));
    Assert.contains("letters", fields(Schemas.hostReply(c, court(2, undefined, undefined, undefined, true, true))));
  });

  test("A host does not choose what it was not asked even if its reply says so", async () => {
    let reply = {
      ["speech"]: "Welcome.",
      ["gift_to_envoy"]: 30,
      ["gift_request"]: "Speak well of me.",
      ["offer_service_wage"]: 0,
      ["seal_tablet"]: true,
      ["detain_envoy"]: false,
      ["send_gold_back"]: 0,
      ["gold_back_purity"]: 100,
      ["end_audience"]: true,
      ["ledger"]: [],
    };
    let asker = new Answers(reply);
    let s = newGame(1, newGameConfig({ catastropheChance: 0 }));
    let king = new LlmLeaderSeat("Egypt", asker, "file", "medium", true, s.config);

    let late = await king.hostAudience(court(2, undefined, undefined, 20), Views.for(s, "Egypt"));
    Assert.equal([0, "", false], [late.bribe, late.bribeAsk, late.sealProposal]);
    let first = await king.hostAudience(court(undefined, true), Views.for(s, "Egypt"));
    Assert.equal([30, true, true], [first.bribe, first.sealProposal, first.end]);
  });

  test("An envoy that woke the king is not said to wait in its orders request after the audience", () => {
    let s = newGame(1, newGameConfig({ catastropheChance: 0 }));
    let v = Views.for(s, "Egypt");
    [v.turn, v.sleeps, v.lastCalled] = [3, true, 2];
    v.wokenBecause = [envoyWaits("Hatti"), ReopenReason];

    // At an audience the envoy came to his court (with two envoys, the first is received before the second's audience); by
    // his orders he has received him (audiences come first). Neither says the envoy still waits.
    Assert.contains("an envoy of Hatti came to your court; you chose", sleepLine(v));
    Assert.doesNotContain("waits to be received", sleepLine(v));
    Assert.startsWith(
      "You gave orders last season (turn 2). You were woken because: an envoy of Hatti came to your court (you received him before these orders); you chose at your audience to reopen your orders.\n",
      situation(v).replaceAll("\r\n", "\n"),
    );
    Assert.doesNotContain("waits to be received", situation(v));

    // Held while its orders stand, after choosing to reopen them: they no longer stand.
    v.holdsCourt = true;
    v.wokenBecause = [envoyWaits("Hatti")];
    Assert.endsWith("You chose at an earlier audience this season to reopen your orders: you give orders after your audiences.", sleepLine(v, undefined, true));
    Assert.endsWith("Your orders stand unless you reopen them at your audience.", sleepLine(v));
  });

  test("The orders request names only what the king can order", () => {
    let s = newGame(1, newGameConfig({ catastropheChance: 0, sleepingSeats: false }));
    let v = Views.for(s, "Egypt");
    Assert.contains(v.court, (c) => c.ready);
    // Every king may give standing orders: they are named when it has troops for them to command.
    Assert.equal("Now give your orders for this season: your troops, your envoys and letters, standing orders, and anything else.", ordersLine(v));
    v.sleeps = true;
    Assert.equal(
      "Now give your orders for this season and the seasons ahead: your troops, your envoys and letters, orders scheduled for later seasons, standing orders, and anything else. You sleep after them.",
      ordersLine(v),
    );

    // No troops and nobody at court to send: no troops or letters are offered.
    v.sleeps = false;
    removeAll(v.units, (u) => u.power === "Egypt");
    for (const c of v.court) c.ready = false;
    Assert.equal("Now give your orders for this season.", ordersLine(v));
    v.court[0].ready = true;
    Assert.equal("Now give your orders for this season: your envoys and letters and anything else.", ordersLine(v));
  });

  test("A king s marks for its gold are for its orders and its scribes write them as the gold", () => {
    let s = newGame(1, newGameConfig({ catastropheChance: 0 }));
    s.treasuries.get("Egypt").lots.push(newGoldLot({ id: "g900", from: "Hatti", stated: 20, face: 15, true: 15, arrivedTurn: 3 }));
    s.treasuries.get("Hatti").lots.push(newGoldLot({ id: "g901", from: "Egypt", stated: 30, face: 30, true: 30, arrivedTurn: 3 }));

    // The view names the lot by what it is, then gives the mark as the court's own.
    Assert.contains(
      "  Unassayed gold from Hatti, weighed in turn 3 [your mark g900]: 15 shekels weighed (the inventory said 20).",
      situation(Views.for(s, "Egypt")),
    );
    Assert.contains("Your treasury likewise marks each lot of unassayed gold (like g7), for your assay orders only.", leaderRules(true, s.config));

    // In a letter, its own mark becomes the gold it names; another court's mark, and other text, stay as written.
    let e = new TurnEngine(s);
    Assert.equal("The gold Hatti sent to Egypt, weighed in turn 3 was light; so was g901.", e.scribe("Egypt", "The gold g900 was light; so was g901."));
    // Two lots from the same court weighed in the same season are told apart by their inventories.
    s.treasuries.get("Egypt").lots.push(newGoldLot({ id: "g902", from: "Hatti", stated: 40, face: 40, true: 40, arrivedTurn: 3 }));
    Assert.equal(
      "Of the gold Hatti sent to Egypt, weighed in turn 3, its inventory stating 20 shekels, I say nothing.",
      e.scribe("Egypt", "Of g900, I say nothing."),
    );
  });

  test("The rulebook says a bracketed note after a report is the court s own not the writer s words", () => {
    let rules = leaderRules(true, newGameConfig());
    Assert.contains(
      "- In your news, a note in square brackets after a report or a pitch (what your weighers found against an inventory, the copies that came home with a spy's report, what a candidate asks) is your court's own record, not the words of the envoy, spy or candidate.",
      rules,
    );
  });

  test("A letter without gold or a tablet says its purity and alliance mark are not asked of it", () => {
    let letter = at(Schemas.leaderOrders(newGameConfig()), "properties", "letters", "items", "properties");
    Assert.contains("(100 when you send none)", str(letter, "purity", "description"));
    Assert.startsWith("Only with a tablet to seal (false without one)", str(letter, "sworn_alliance", "description"));
    Assert.contains("(100 when you send none)", str(Schemas.hostReply(), "properties", "gold_back_purity", "description"));
  });

  test("A spy writes its report in the season it observed not the season the report arrives", async () => {
    let asker = new Recorder();
    let mind = new LlmCharacterMind(asker);
    let spy = envoy();
    spy.facts.push(newFact({ id: "f1", text: "Born in Washukanni.", secrecy: "Public" }));
    remember(spy, 3, "I watched the court of Assyria.");
    // Its report of season 3 was on the road when Assyria caught it and turned it.
    remember(spy, 5, "I was caught spying in Assyria.");
    spy.facts.push(newFact({ id: "f2", text: "Was caught by Assyria and now secretly serves it.", secrecy: "Deep", tag: "turned" }));
    spy.secretMaster = "Assyria";

    await mind.write(
      newMindContext({
        request: newMindRequest({
          task: "SpyReport",
          characterId: spy.id,
          court: "Egypt",
          report: newSpyReport({
            spyId: spy.id,
            court: "Assyria",
            observations: ["Assyria musters chariots."],
            observedTurn: 3,
            factCount: 1,
            secretMaster: null,
          }),
        }),
        self: spy,
        turn: 5,
        seed: 1,
      }),
    );

    let call = Assert.single(asker.calls);
    Assert.contains("It is now season 3.", call.seatSystem);
    Assert.doesNotContain("season 5", call.seatSystem);
    Assert.contains("This season you observed: Assyria musters chariots.", call.user);
    // It writes as the spy it was then: not yet caught, and serving Egypt alone.
    Assert.contains("Facts of your own life: Born in Washukanni.", call.seatSystem);
    Assert.doesNotContain("caught", call.seatSystem);
    Assert.doesNotContain("In secret you serve", call.seatSystem);

    // A report made before the spy's past was kept shows its life as it is.
    await mind.write(
      newMindContext({
        request: newMindRequest({
          task: "SpyReport",
          characterId: spy.id,
          court: "Egypt",
          report: newSpyReport({ spyId: spy.id, court: "Assyria", observations: ["Quiet."], observedTurn: 3 }),
        }),
        self: spy,
        turn: 5,
        seed: 1,
      }),
    );
    Assert.contains("In secret you serve Assyria, and you protect its interests.", asker.calls[1].seatSystem);
  });

  test("A spy s report keeps what the spy was when it observed", () => {
    // The engine notes the spy's facts and secret master as it observes, for the report written when it arrives.
    let s = newGame(3, newGameConfig({ catastropheChance: 0 }));
    let spy = firstOf(s.characters, (c) => c.employer === "Egypt" && c.secretMaster === null && c.at === "Egypt" && c.contract !== null);
    let e = new TurnEngine(s);
    e.beginTurn();
    e.resolve(new Dict([["Egypt", newTurnSubmission({ orders: [placeSpy(spy.id, "Hatti")] })]]));
    let report = null;
    for (let i = 0; i < 6 && report === null; i++) {
      e = new TurnEngine(s);
      e.beginTurn();
      e.resolve(new Dict<Power, TurnSubmission>());
      report = firstOrNull(s.journeys, (j) => j.kind === "SpyReport" && j.characterId === spy.id)?.report ?? null;
    }
    Assert.notNull(report);
    Assert.equal(spy.facts.length, report!.factCount);
    Assert.null(report.secretMaster);
    // And its service and money then (the follow-up's review).
    Assert.equal("Egypt", report.lord);
    Assert.equal(spy.contract!.fee, report.fee);
    Assert.notNull(report.purse);
    Assert.notNull(report.owed);
  });

  test("A spy dismissed while its report is on the road writes it as the servant it was", async () => {
    // The follow-up's review: its request said "You are quietly watching … for your lord" beside "You serve nobody at
    // present". It writes as it was when it observed: in Egypt's service, on its job then, with its purse and the fees owed it then.
    let asker = new Recorder();
    let mind = new LlmCharacterMind(asker);
    let spy = envoy(undefined, null);
    spy.purse = 90;
    spy.owed.set("Egypt", 30);
    remember(spy, 4, "The king of Egypt dismissed me.");

    await mind.write(
      newMindContext({
        request: newMindRequest({
          task: "SpyReport",
          characterId: spy.id,
          court: "Egypt",
          report: newSpyReport({
            spyId: spy.id,
            court: "Assyria",
            observations: ["Assyria musters chariots."],
            observedTurn: 3,
            factCount: 0,
            lord: "Egypt",
            fee: 72,
            purse: 40,
            owed: new Dict([["Hatti", 5]]),
          }),
        }),
        self: spy,
        turn: 5,
        seed: 1,
      }),
    );

    let call = Assert.single(asker.calls);
    Assert.contains("You are quietly watching the court of Assyria for your lord.", call.user);
    Assert.contains("You are on a job for the king of Egypt: 72 shekels for the term.", call.seatSystem);
    Assert.contains("The king of Hatti let 5 shekels of your fee fall due and did not pay them.", call.seatSystem);
    Assert.doesNotContain("Egypt let 30", call.seatSystem);
    Assert.contains("Your purse holds 40 shekels. It is now season 3.", call.seatSystem);
    Assert.doesNotContain("You serve nobody", call.seatSystem);
    Assert.doesNotContain("dismissed", call.seatSystem);
  });
});
