import { describe, test } from "vitest";
import { spy } from "../src/character-checks.ts";
import {
  AllPowers,
  Dict,
  HSet,
  LossNewsSeasons,
  OrderValidator,
  type Power,
  TurnEngine,
  Views,
  WorldMap,
  dispatch,
  first,
  fmt,
  newAudienceView,
  newCharacterView,
  newGame,
  newGameConfig,
  newTablet,
  newTabletCopy,
  newTurnSubmission,
  notify,
  openingTroops,
  openings,
  placeSpy,
  single,
  sum,
} from "@amarna/engine";
import { type CallSpec, type JsonAsker, type JsonObject, LlmLeaderSeat, Parse, Schemas, leaderRules, situation, standings } from "@amarna/llm";
import { removeAll, Assert } from "../../engine/test/support.ts";
import { describe as describeOrder } from "@amarna/engine";

// <summary>Rules the engine applies that a king must be able to read.</summary>
describe("RulebookTextTests", () => {
  const Rules: string = leaderRules(true, newGameConfig());

  test("The rulebook states dislodgement, hunger and mutiny", () => {
    Assert.contains("A unit dislodged (beaten from where it stood) falls back to a neighbouring province of yours", Rules);
    Assert.contains("A unit with nowhere to fall back, or beaten by 67 in a hundred or more (three to one), is destroyed, and a unit destroyed gives no support", Rules);
    Assert.contains("A unit that cannot eat in full goes hungry; one hungry 2 seasons running mutinies. One not paid in full counts a season of missing pay; one unpaid 3 seasons running mutinies.", Rules);
    Assert.contains("Your battle report says why each of your moves that failed was stopped", Rules);
  });

  test("The rulebook says that word of captives and executions travels with envoys and spies", () => {
    Assert.equal(3, LossNewsSeasons);
    Assert.contains(
      "- Word of captives and executions travels with people: an envoy received at a court, or a spy posted there, may hear which servants of other courts it holds captive and whom it has put to death within the last 3 seasons, and brings that home in its report. Other courts' envoys and spies hear the same at yours.",
      Rules,
    );
  });

  test("The rulebook says that a spy at a court is hidden from it until caught", () => {
    Assert.contains(
      "A spy posted at a court watches in secret: that court does not see it there, nor whom it serves, until its watchmen catch it, " +
        "unless the spy secretly serves that court (as a double agent it turned does). So a foreign spy may stand at your court without your knowing. " +
        "A caught spy may confess whom it serves.",
      Rules,
    );
    Assert.contains("people travelling on their own way reach the courts they set out for", Rules);
  });

  test("The rulebook says that tablets lie in archives that spies copy or steal and conquerors carry off", () => {
    Assert.contains(
      "- Archives: every tablet you hold (those you sealed, and the copies you were shown or brought) lies in your archive at your capital, and so it is at every court. " +
        "A spy watching a court copies from its archive: each season it is not caught, with a chance of (its skill at seeing what a court hides, 0-100)/100, it copies one tablet you do not hold yet (tablets bearing two or more seals first, the newest first), and the copy comes home with its report; a spy turned by that court, or watching a court that has fallen, copies nothing for you. " +
        "A spy watching a court may instead be told to steal a tablet (steal_tablet): that season, with the same chance, it takes the tablet you would most want out of the archive, which that court then no longer holds",
      Rules,
    );
    Assert.contains("Whoever takes a king's capital carries off his archive: every tablet in it is his, and the king who lost it holds none of them any more", Rules);

    // The seat view names the archive the rule speaks of.
    let s = newGame(4);
    s.tablets.push(newTablet({ id: "t900", text: "Peace.", proposedBy: "Hatti", partner: "Egypt", seals: ["Hatti", "Egypt"], createdTurn: 1, sealedTurn: 1 }));
    s.copies.push(
      newTabletCopy({ id: "k900", tabletId: "t900", holder: "Egypt", acquiredTurn: 1, source: "copied from the archive of Hatti by your spy Mane" }),
    );
    let text = situation(Views.for(s, "Egypt"));
    Assert.contains(
      "YOUR ARCHIVE (kept at your capital; a tablet you have read in full at an earlier orders by its opening words):",
      text,
    );
    Assert.contains(
      '- the tablet sealed by Hatti and Egypt, dated turn 1 [your copy k900]: "Peace." (copied from the archive of Hatti by your spy Mane)',
      text,
    );
  });

  test("The rulebook says that gold comes with an inventory an envoy may swap for a forgery", () => {
    Assert.contains(
      "- Gold an envoy carries goes with an inventory tablet sealed by the court that sends it, stating the amount, for the scribe's fee of 20 (gold a host sends back has one too, free): the receiving court's weighers report what they found against it, and the court keeps the inventory in its archive. You may send gold without an inventory (no_inventory), saving the fee: then nobody can check what arrived, not the receiver and not you, and an envoy who keeps some cannot be caught by it. " +
        "An envoy that keeps some of the gold, but not all of it, may hand over, in place of the sealed inventory, one it forges itself stating only what is left, if it has a forger's skill: the weight then matches the inventory, and only having the inventory examined can show it, as for any forgery. " +
        "A forged inventory that is found is traced, with the same chance as any forgery, to the envoy who brought it, and every court hears of it.",
      Rules,
    );
  });

  test("The rulebook says when a support is void and when the other side is named", () => {
    Assert.contains(
      "A support or convoy counts only if the unit it names does what it helps (stays in place, or makes that very move); otherwise it is void too, and the unit holds.",
      Rules,
    );
    Assert.contains(
      "with the strengths compared where strength decided it, and that the unit stays where it was (a unit whose move fails does not move), and why each of your supports or convoys was void.",
      Rules,
    );
    Assert.contains("It names the other side's power only if that unit stood, or was moving, where you could see.", Rules);
  });

  test("Every court reads every power s opening troops treasury and starting strength", () => {
    Assert.contains("OPENING POSITIONS (known to every court)", Rules);
    // Item 13: each unit at the size the armies dossier gives it.
    // Item 17+: each where the sources place it in 1346.
    Assert.contains("- Egypt: armies in memphis (6000 men), akhetaten (4000 men), thebes (2200 men), nubia (2800 men), gaza (100 men) and sumur (100 men), a fleet of 1000 men in delta; treasury 900 shekels; its land produces 913 shekels' worth a season; starting strength 17975.", Rules);
    Assert.contains("- Babylonia: armies in babylon (4000 men), durkurigalzu (3000 men), nippur (1500 men) and sippar (1500 men); treasury 600 shekels;", Rules);
    Assert.contains("- Alashiya: armies in enkomi (1000 men) and kalavasos (500 men), a fleet of 750 men in enkomiwaters; treasury 400 shekels;", Rules);
    Assert.contains("- Arwad: a fleet of 500 men in sumurwaters;", Rules);
    Assert.contains("- Amurru: an army of 1250 men in amurru;", Rules);

    // The figures are the game's own: every unit, treasury and starting strength as a new game sets them.
    let s = newGame(9);
    for (const o of openings(s.config)) {
      Assert.equal(s.startStrength.get(o.power), o.strength);
      Assert.equal(s.treasuries.get(o.power).gold, o.gold);
      Assert.equal(
        s.units.filter((u) => u.power === o.power).map((u) => [u.kind, u.province]),
        o.units.map((u) => [u.kind, u.province]),
      );
      Assert.contains(`- ${o.power}: ${openingTroops(o)};`, Rules);
    }
  });

  test("The opening positions keep the rulebook byte stable", () => {
    // The rulebook is one cached block: building it again, from a fresh cache key, gives the same bytes.
    let a = leaderRules(false, newGameConfig({ capMin: 61, capMax: 61, endMedian: 10000 }));
    let b = leaderRules(false, newGameConfig({ capMin: 61, capMax: 61, endMedian: 10000 }));
    Assert.equal(a, b);
    let opening = a.slice(a.indexOf("OPENING POSITIONS"), a.indexOf("HOW TO ANSWER"));
    Assert.equal(opening, Rules.slice(Rules.indexOf("OPENING POSITIONS"), Rules.indexOf("HOW TO ANSWER")));
  });
});

// <summary>Captive orders the engine refuses, and replaced ransom demands, in the rulebook's own words.</summary>
describe("CaptiveRulebookTests", () => {
  const Rules: string = leaderRules(true, newGameConfig());

  test("The rulebook says which captive orders are refused and when a replaced demand can still be paid", () => {
    Assert.contains(
      "Ransoming or turning a captive whose kingdom has fallen is refused, and so is turning one whose king has dismissed them: nobody is left to pay or to deceive.",
      Rules,
    );
    Assert.contains("a new demand replaces the old one once its word reaches you, and until then the old one can still be paid", Rules);
    Assert.contains(
      "a spy watching a court, or on its way to one, is free at that court; one watching a province, or on its way to one, walks back to your court and is free there",
      Rules,
    );
    Assert.doesNotContain("does nothing: nobody is left", Rules);
  });
});

// <summary>The rulebook's "HOW A SEASON RESOLVES": the engine's own order, and the rules kings were refused for not knowing.</summary>
describe("SeasonRulebookTests", () => {
  const Rules: string = leaderRules(true, newGameConfig());

  test("The season is told step by step in the engine s order and the old list is gone", () => {
    Assert.doesNotContain("EACH SEASON", Rules);
    Assert.doesNotContain("Resolution, catastrophes, and reports", Rules);
    let section = Rules.slice(Rules.indexOf("HOW A SEASON RESOLVES"), Rules.indexOf("MOVEMENT AND COMBAT"));
    let steps = [
      "1. Departures",
      "2. The economy",
      "3. Arrivals",
      "4. Your court",
      "5. Audiences",
      "6. Orders",
      "7. Movement and battles",
      "8. Sieges",
      "9. Land changes hands",
      "10. A kingdom falls with its capital",
      "11. Cessions and gifts of troops",
      "12. Purchases",
      "13. Disbanding",
      "14. Levies",
      "15. Envoys set out",
      "16. Intelligence",
      "17. Catastrophes",
      "18. Strength and growth are reckoned",
    ];
    let at = steps.map((x) => section.indexOf("\n" + x));
    Assert.doesNotContain(-1, at);
    Assert.equal(
      [...at].sort((a, b) => a - b),
      at,
    );
  });

  test.each([
    ["a person hired this season enters your service at the end of the season and can be sent on an errand from next season"],
    [
      "Yours are checked in the order your reply lists them (units, then letters, then other orders), then those of your standing orders that fire, and the gold each needs is reserved as it is accepted, so a later order can be refused for lack of gold.",
    ],
    [
      "Then each standing order that fires (see STANDING ORDERS) answers the moves just ordered and puts its orders in place of yours for the same units or people.",
    ],
    [
      'There is no "else": a refused order is not replaced by another, and a purchase meant as a fallback is refused if an earlier bid has reserved the gold, even if that city is then not sold.',
    ],
    ["A city taken by troops this season is not sold; when two or more kings bid for one city, its elders will not choose between them and sell to none."],
    [
      "a new army or fleet is raised only in a province of your homeland that you still hold and that is empty after movement; otherwise none is raised and nothing is paid.",
    ],
    ["a spy must be one of your own people at your court, sent to watch a court or a province"],
    ["You pay your troops (20 an army, 25 a fleet, nearest your capital first)"],
    [
      "Every order that was refused or failed is reported with the reason, and gold reserved for an order that failed stays in your treasury (except the clay of a botched forgery, which is paid for).",
    ],
    ["one who says it cannot ruins the clay, which you still pay for"],
    [
      "Walls add nothing to a battle: combat resolves as above, and a unit within walls defends with 1 plus its supports like any other (and the ground's help, see TERRAIN).",
    ],
    [
      "a move that wins its way into a walled province you do not hold takes it at once only if its strength also beats the level of the walls plus the defenders on them, multiplied by the walls",
    ],
    ["You may move your own troops into your own walled provinces. A fleet may enter walls, but never storms or besieges them"],
    [
      "Walls price a storm, not how long a city holds: a city falls by hunger, or once it has been worn down 3 steps for each level of its walls, when they are breached.",
    ],
    ["Each siege costs the besieger 15 a season on top of the army's pay."],
    [
      "A kingdom falls with its capital, which is wherever you are. If another king takes you, by taking the city where you are (storming its walls or by a siege) or on the road, you have fallen and your game is over: your realm comes apart (step 10 of how a season resolves, below), and what you owe dies with you. You may cede your capital only by agreement: a sealed tablet between you and the receiver that gives it",
    ],
  ] as const)("The rulebook states each rule %s", (rule: string) => {
    Assert.contains(rule, Rules);
  });

  test("Malformed orders reach the validator and are refused with the reason", () => {
    // A reply that leaves out where a unit goes, or names a power nobody knows: the king is told, the order never vanishes.
    let sub = Parse.orders(
      JSON.parse(
        `{"notes":"","command":[],"letters":[],
 "units":[{"unit":"memphis","order":"move","target":"","to":""},
          {"unit":"akhetaten","order":"support","target":"","to":"sinai"},
          {"unit":"deltawaters","order":"convoy","target":"memphis","to":""}],
 "other_orders":[{"action":"cede_province","province":"sinai","power":"","person":"","amount":0,"term":0,"text":"","item":"","seals":[]},
                 {"action":"give_unit","province":"memphis","power":"the Hittites","person":"","amount":0,"term":0,"text":"","item":"","seals":[]},
                 {"action":"place_spy","province":"","power":"Kush","person":"c3","amount":0,"term":0,"text":"","item":"","seals":[]},
                 {"action":"forge","province":"","power":"","person":"c3","amount":0,"term":0,"text":"Peace.","item":"","seals":["Hatti","Kush"]}]}`,
      )!,
    );
    Assert.equal(7, sub.orders.length);
    let s = newGame(5);
    single(s.units, (u) => u.province === "delta").province = "deltawaters";
    let reasons = new OrderValidator(s).validate("Egypt", sub).rejected.map((r) => `${describeOrder(r.order)}: ${r.reason}`);
    Assert.equal(
      [
        "memphis -> ?: name the province the unit should move to",
        "akhetaten supports ? -> sinai: name the unit to support, by the province it stands in",
        "deltawaters convoys memphis -> ?: name the coast where the army should land",
        "cede sinai to '': name the power to cede it to",
        "give memphis to 'the Hittites': there is no power called 'the Hittites'",
        "send c3 to spy on 'Kush': there is no power called 'Kush'",
        "have c3 forge a tablet sealed by Hatti, Kush: there is no power called 'Kush'",
      ],
      reasons,
    );
  });

  test("Scheduled orders are checked after the season s own", () => {
    Assert.contains("checked when they run, after the orders you give that season", leaderRules(true, newGameConfig({ sleepingSeats: true })));
  });

  test("A spy order with nowhere to watch is refused with the reason rather than dropped", () => {
    let sub = Parse.orders(
      JSON.parse(
        `{"notes":"","units":[],"command":[],"letters":[],"other_orders":[{"action":"place_spy","province":"","power":"","person":"c3","amount":0,"term":0,"text":"","item":"","seals":[]}]}`,
      )!,
    );
    Assert.equal(placeSpy("c3"), Assert.single(sub.orders));
  });
});

// <summary>The standings line every court reads, and the travel times the rulebook gives.</summary>
describe("StandingsAndTravelTests", () => {
  test("The land standings line gives every power s land yield ratio from who holds what and says it is not growth", () => {
    let s = newGame(5);
    let map = WorldMap.default;
    function home(p: Power): number {
      return sum(map.homeOf(p), (x) => x.yield);
    }
    // Egypt holds Jerusalem (yield 10); Mitanni has taken all of Assyria, which has fallen.
    s.owner.set("jerusalem", "Egypt");
    for (const x of map.homeOf("Assyria")) s.owner.set(x.id, "Mitanni");
    removeAll(s.units, (u) => u.power === "Assyria");
    s.eliminated.push("Assyria");
    // Long enough ago for word of it to have reached every court (item 7b).
    s.ownerLog.push({ province: "jerusalem", turn: 0, owner: "Egypt" }, ...map.homeOf("Assyria").map((x) => ({ province: x.id, turn: 0, owner: "Mitanni" as Power })));
    for (const p of ["Egypt", "Hatti"] as Power[]) s.fallsHeard.set(p, ["Assyria"]);
    s.treasuries.get("Egypt").gold = 5000; // treasuries are left out

    let line = standings(Views.for(s, "Egypt"));
    let mitanni = (home("Mitanni") + home("Assyria")) / home("Mitanni");
    // Labelled for what it is: a land-yield ratio, not the growth that wins, as the rulebook says too.
    Assert.startsWith(
      "LAND STANDINGS (land-yield ratios, not growth; see WHAT YOU SEE): Mitanni ",
      line,
    );
    Assert.contains(
      "- LAND STANDINGS in your view give each power's land-yield ratio: the yield of the land it holds now over its homeland's yield at the start, which anyone can reckon from who holds what. It is not growth: growth, which decides who wins, measures strength (land, treasury and holdings) against a starting strength that includes the starting treasury, and rivals' treasuries are private. Your own growth, by your ledger, is on your treasury line.",
      leaderRules(true, newGameConfig()),
    );
    Assert.contains(
      `Mitanni ${fmt(mitanni, "0.00")} (land yield ${home("Mitanni") + home("Assyria")}, at the start ${home("Mitanni")}); Egypt (you) 1.04 (land yield 259, at the start 250); `,
      line,
    );
    Assert.contains(`Hatti 1.00 (land yield ${home("Hatti")}, at the start ${home("Hatti")})`, line);
    Assert.endsWith(" Fallen: Assyria.", line);
    Assert.doesNotContain("Assyria 0", line);
    Assert.contains(line, situation(Views.for(s, "Egypt")));

    // Every court reads the same figures once the news has reached it.
    Assert.equal(line.replaceAll("Egypt (you)", "Egypt"), standings(Views.for(s, "Hatti")).replaceAll("Hatti (you)", "Hatti"));
  });

  test("The rulebook gives the travel times the map makes", () => {
    let rules = leaderRules(true, newGameConfig());
    // Since item 11f the farthest courts, Elam and Libya or the Kaska, are three seasons apart, as far as any province.
    Assert.contains(
      "Envoys take about 1 to 3 seasons each way between courts in the sailing season (ENVOY TRAVEL in your view gives each court this season; see NEWS AND TRAVEL).",
      rules,
    );

    let s = newGame(5);
    let e = new TurnEngine(s);
    let courts = new HSet(AllPowers.flatMap((a) => AllPowers.filter((b) => b !== a).map((b) => e.travelTurns(a, b))));
    Assert.equal(
      [1, 2, 3],
      [...courts].sort((a, b) => a - b),
    );
    Assert.all(Views.for(s, "Egypt").travelTimes, (t) => Assert.matches("^[A-Za-z]+: [12] season\\(s\\) each way$", t));
  });
});

// <summary>What the view, the schema and the audience request say that the simulation's kings asked for.</summary>
describe("ViewTextTests", () => {
  const Rules: string = leaderRules(true, newGameConfig());

  test.each([
    [
      "You see troops only in your own land and where your troops stand, and one link of any kind (land, coast or sea) from those. Troops two links away, or an army carried across the sea by fleets, can still arrive next season without being seen first.",
    ],
    [
      "Background checks (at least 10 shekels) report next season: every public fact about the person, each hidden fact with a chance of shekels paid/150 (at most 90%), and each deep secret with a chance of shekels paid/400 (at most 60%).",
    ],
    [
      "Each season a spy is caught with a chance of 5% + (what the court it watches, or the one holding the province it watches, spends on watchmen that season)/300 - (its skill at slipping past guards, 0-100)/400, between 2% and 60%",
    ],
    [
      "a genuine tablet reads genuine 95% of the time (otherwise the scribes cannot agree); a forgery is found with a chance of 20% + shekels paid/200 - (the forger's skill, 0-100)/150, between 5% and 95%, and once found is traced to the forger's court with a chance of 30% + shekels paid/400, between 30% and 80%",
    ],
    ["a spy watching a province that no power holds, or one you hold yourself, is never caught, nor is one still watching a court that has fallen."],
    ["the receiver sees its weight, not its fineness, until they pay 10 for an assay"],
  ] as const)("The rulebook states sight and the costs and odds of intelligence %s", (rule: string) => {
    Assert.contains(rule, Rules);
  });

  test("The schema says how to besiege a city and what each greeting flag means", () => {
    // As the king reads it: the JSON text escapes an apostrophe, which the model reads as the apostrophe.
    let schema = JSON.stringify(Schemas.leaderOrders(newGameConfig()));
    Assert.contains('"enum":["hold","move","force_march","support","convoy","disband","settle","besiege","sally","raze"]', schema);
    Assert.contains("sally: the province the attack on the troops within your walls comes from", schema);
    Assert.contains("besiege: an army standing within walls you do not hold besieges that city", schema);
    Assert.doesNotContain("support its walls holding", schema);
    Assert.contains("Greet the recipient as your brother, as Great Kings greet their equals", schema);
    Assert.contains("Give the recipient the title Great King. False denies him that rank.", schema);
    Assert.contains(
      "Name yourself Great King in the greeting. False names you only as king of your land, which the recipient reads as not claiming the rank.",
      schema,
    );
    Assert.contains("presumptuous, and the recipient will notice", schema);
    Assert.contains("Send no greeting at all, which is a slight.", schema);
    Assert.contains("an oath of alliance before the gods that every reader of the tablet sees. It changes no rule and binds nobody.", schema);
  });

  test("The situation explains sight and shows when an envoy is due back", () => {
    let s = newGame(5, newGameConfig({ catastropheChance: 0 }));
    let envoy = first(s.characters, (c) => c.employer === "Egypt");
    let e = new TurnEngine(s);
    e.beginTurn();
    e.resolve(new Dict([["Egypt", newTurnSubmission({ orders: [dispatch(envoy.id, "Hatti", "Greetings.")] })]]));
    // Due there when its route says (item 7b); due back by the word's road home from there, as reckoned now.
    let due = first(s.journeys, (j) => j.characterId === envoy.id).arriveTurn;
    let back = e.travelTurns("Hatti", "Egypt");

    let text = situation(Views.for(s, "Egypt"));
    Assert.contains(
      "You can see troops in: ",
      text,
    );
    Assert.contains(
      `${envoy.id} ${envoy.name} of ${envoy.origin}; travelling as envoy to Hatti; set out in turn 1 for Hatti; due there about turn ${due}; due back about turn ${due + back}; a job as envoy to Hatti, for`,
      text,
    );
  });

  class Recorder implements JsonAsker {
    specs: CallSpec[] = [];

    askJson(spec: CallSpec): Promise<JsonObject> {
      this.specs.push(spec);
      return Promise.resolve(
        JSON.parse(
          `{"speech":"Welcome.","gift_to_envoy":0,"gift_request":"","offer_service_wage":0,"seal_tablet":false,"detain_envoy":false,"send_gold_back":0,"gold_back_purity":100,"end_audience":true}`,
        )!,
      );
    }
  }

  test("An audience request carries the season s news and the host s own land and troops", async () => {
    let s = newGame(5);
    let e = new TurnEngine(s);
    e.beginTurn();
    notify(s, "Egypt", "Rejected", "Levy failed", "No army was raised in Thebes: Thebes was not empty after movement. No gold was paid.");
    let recorder = new Recorder();
    let seat = new LlmLeaderSeat("Egypt", recorder, "claude-sonnet-5-5", "medium", true, s.config);
    let view = newAudienceView({
      audienceId: "a1",
      turn: 1,
      round: 1,
      maxRounds: 2,
      from: "Hatti",
      host: "Egypt",
      envoy: newCharacterView({ id: "c1", name: "Mane" }),
      spoken: "Greetings.",
    });
    await seat.hostAudience(view, Views.for(s, "Egypt"), undefined);

    let user = Assert.single(recorder.specs).user;
    Assert.contains("YOUR LAND: akhetaten, delta, gaza, memphis, nubia, sinai, sumur, thebes. YOUR TROOPS: army in memphis, army in akhetaten, army in thebes, army in nubia, army in gaza, army in sumur, fleet in delta.", user);
    Assert.contains("NEWS THIS SEASON:", user);
    Assert.contains("[Rejected] Levy failed: No army was raised in Thebes: Thebes was not empty after movement. No gold was paid.", user);
    Assert.contains("[Notice] The treasury: ", user);
    Assert.true(user.indexOf("NEWS THIS SEASON:") < user.indexOf("AN AUDIENCE"));
  });
});
