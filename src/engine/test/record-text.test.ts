import { describe, test } from "vitest";
import {
  type Character,
  CommittedPrefix,
  Dict,
  type DispatchOrder,
  type GameState,
  Greeting,
  HSet,
  type PendingAudience,
  Personas,
  type Power,
  TurnEngine,
  type TurnSubmission,
  Views,
  authenticate,
  commitment,
  first,
  inboxOf,
  move,
  newAudienceRecord,
  newAudienceRound,
  newCharacter,
  newEnvoyReaction,
  newGame,
  newHostReply,
  newMindReply,
  newTablet,
  newTabletCopy,
  newTabletProposal,
  newTurnSubmission,
  range,
  single,
  support,
} from "@amarna/engine";
import { Assert, join } from "./support.ts";
import { dispatch as dispatchOrder } from "@amarna/engine";

// What the engine's records and notices say, after the second agent simulation's defects in the views (the fix pass after
// item 4, part 2).
describe("RecordTextTests", () => {
  // <summary>Egypt's envoy stands before Alashiya's king.</summary>
  function atAudience(
    letter: DispatchOrder | null = null,
    state: GameState | null = null,
    sent: Character | null = null,
  ): [GameState, TurnEngine, Character, PendingAudience] {
    let s = state ?? newGame(5);
    let envoy = sent ?? first(s.characters, (c) => c.employer === "Egypt");
    envoy.secretMaster = null;
    let e = new TurnEngine(s);
    e.beginTurn();
    e.resolve(new Dict([["Egypt", newTurnSubmission({ orders: [letter ?? dispatchOrder(envoy.id, "Alashiya", "Greetings, brother.")] })]]));
    while (s.audiences.length === 0) {
      e = new TurnEngine(s);
      e.beginTurn();
      if (s.audiences.length === 0) e.resolve(new Dict<Power, TurnSubmission>());
    }
    return [s, e, envoy, single(s.audiences)];
  }

  // <summary>A game where Egypt holds its copy k900 of a peace it sealed with Hatti, and Hatti its own, k901.</summary>
  function withPeace(): GameState {
    let s = newGame(5);
    s.tablets.push(
      newTablet({
        id: "t900",
        text: "Peace between Egypt and Hatti for all time.",
        proposedBy: "Egypt",
        partner: "Hatti",
        seals: ["Egypt", "Hatti"],
        createdTurn: 1,
        sealedTurn: 1,
      }),
    );
    s.copies.push(newTabletCopy({ id: "k900", tabletId: "t900", holder: "Egypt", acquiredTurn: 1, source: "sealed at audience" }));
    s.copies.push(newTabletCopy({ id: "k901", tabletId: "t900", holder: "Hatti", acquiredTurn: 1, source: "sealed at audience" }));
    return s;
  }

  test("A tablet is named by its seals and date the same at every court", () => {
    let s = withPeace();
    let egypt = single(Views.for(s, "Egypt").tablets);
    let hatti = single(Views.for(s, "Hatti").tablets);
    Assert.equal(["k900", "k901"], [egypt.copyId, hatti.copyId]);
    Assert.equal("the tablet sealed by Egypt and Hatti, dated turn 1", egypt.name);
    Assert.equal(egypt.name, hatti.name);

    // Two of the same seals and date in one archive: each named with its opening words, the same at every court.
    s.tablets.push(
      newTablet({
        id: "t902",
        text: "Egypt shall send Hatti forty shekels of gold every year, and Hatti shall send horses.",
        proposedBy: "Egypt",
        partner: "Hatti",
        seals: ["Egypt", "Hatti"],
        createdTurn: 1,
        sealedTurn: 1,
      }),
    );
    s.copies.push(newTabletCopy({ id: "k902", tabletId: "t902", holder: "Egypt", acquiredTurn: 1, source: "sealed at audience" }));
    let names = Views.for(s, "Egypt").tablets.map((t) => t.name);
    Assert.equal(
      [
        'the tablet sealed by Egypt and Hatti, dated turn 1, beginning "Peace between Egypt and Hatti for all time."',
        'the tablet sealed by Egypt and Hatti, dated turn 1, beginning "Egypt shall send Hatti forty shekels of gold…"',
      ],
      names,
    );
  });

  test("A kings marks for his copies and person ids reach other courts as names", () => {
    let s = withPeace();
    let envoy = first(s.characters, (c) => c.employer === "Egypt");
    envoy.secretMaster = null;
    let other = first(s.characters, (c) => c.id !== envoy.id);
    let e = new TurnEngine(s);
    e.beginTurn();
    e.resolve(
      new Dict([
        [
          "Egypt",
          newTurnSubmission({
            orders: [
              dispatchOrder(
                envoy.id,
                "Hatti",
                `The peace of k900 stands, and Tablet K900 binds us. Ask ${other.name} (${other.id}) and ${other.id}. Your k901 is yours.`,
                { mandate: "May confirm k900.", proposal: newTabletProposal({ text: "As the tablet k900 says, peace." }) },
              ),
            ],
          }),
        ],
      ]),
    );

    let name = "the tablet sealed by Egypt and Hatti, dated turn 1";
    let trail = single(s.trails);
    Assert.equal(
      `The peace of ${name} stands, and The tablet sealed by Egypt and Hatti, dated turn 1 binds us. Ask ${other.name} and ${other.name}. Your k901 is yours.`,
      trail.leaderLetter,
    );
    Assert.equal(`May confirm ${name}.`, trail.mandate);
    Assert.equal(`As ${name} says, peace.`, trail.proposalText);
    let dispatch = single(s.journeys, (j) => j.kind === "EnvoyOutbound").dispatch!;
    Assert.equal([trail.leaderLetter, trail.mandate, trail.proposalText], [dispatch.letter, dispatch.mandate, dispatch.proposal!.text]);
    Assert.equal(trail.proposalText, single(s.tablets, (t) => t.id === dispatch.proposalTabletId).text);
    // The envoy remembers the letter as the scribes wrote it.
    Assert.contains(envoy.memory, (m) => m.text.includes(`"The peace of ${name} stands`));
  });

  test("Scribes turn into names only the ids of people the writer knows", () => {
    // The review's probe (the review of the fix pass after item 4): Egypt's letter "Greetings. c3 c4 c5 c6 c7" came back
    // in its own view naming five people none of its lists held.
    let s = newGame(5);
    let envoy = first(s.characters, (c) => c.employer === "Egypt");
    envoy.secretMaster = null;
    let view = Views.for(s, "Egypt");
    let known = new HSet(view.court.concat(view.known).map((c) => c.id));
    let strangers = s.characters.filter((c) => !known.has(c.id)).slice(0, 3);
    Assert.equal(3, strangers.length);
    Assert.all(strangers, (c) => Assert.false(Views.knows(c, "Egypt")));
    let friend = first(s.characters, (c) => c.employer === "Egypt" && c.id !== envoy.id);
    Assert.true(Views.knows(friend, "Egypt"));
    let ids = join(
      " ",
      strangers.map((c) => c.id),
    );
    let e = new TurnEngine(s);
    e.beginTurn();
    e.resolve(
      new Dict([
        [
          "Egypt",
          newTurnSubmission({
            orders: [
              dispatchOrder(envoy.id, "Hatti", `Greetings. ${ids} and ${friend.id}. Ask ${strangers[0].name} (${strangers[0].id}).`, {
                mandate: `Speak of ${strangers[1].id}.`,
              }),
            ],
          }),
        ],
      ]),
    );

    // Ids it does not know stay as written, even beside a name it guessed; the one it knows becomes a name.
    let trail = single(s.trails);
    Assert.equal(`Greetings. ${ids} and ${friend.name}. Ask ${strangers[0].name} (${strangers[0].id}).`, trail.leaderLetter);
    Assert.equal(`Speak of ${strangers[1].id}.`, trail.mandate);
    // What Egypt reads back of its own letter (YOUR LETTERS) is the same text.
    let letter = single(Views.for(s, "Egypt").letters);
    Assert.equal(trail.leaderLetter, letter.message);
    Assert.all(strangers, (c) => Assert.doesNotContain(c.name, letter.message.replaceAll(`Ask ${strangers[0].name} (`, "")));
  });

  test("An examination names the tablet and gives its text in full", () => {
    let s = withPeace();
    let long_ = "Peace and brotherhood between our houses. ".repeat(10).trim();
    single(s.tablets, (t) => t.id === "t900").text = long_;
    let e = new TurnEngine(s);
    e.beginTurn();
    e.resolve(new Dict([["Egypt", newTurnSubmission({ orders: [authenticate("k900", 40)] })]]));
    e = new TurnEngine(s);
    e.beginTurn();
    let notice = single(inboxOf(s, "Egypt"), (i) => i.kind === "Authentication");
    Assert.startsWith(`The tablet sealed by Egypt and Hatti, dated turn 1 (your copy k900): "${long_}" — `, notice.body);
  });

  function battle(s: GameState, p: Power): string {
    return single(inboxOf(s, p), (i) => i.kind === "Battle" && i.title.startsWith("Movements")).body;
  }

  test("A stopped move says where the unit now stands", () => {
    // Assyria and Mitanni meet head to head between Ekallate and Terqa at equal strength: both bounce and stay.
    let s = newGame(1);
    new TurnEngine(s).resolve(
      new Dict([
        ["Assyria", newTurnSubmission({ orders: [move("ekallate", "terqa")] })],
        ["Mitanni", newTurnSubmission({ orders: [move("terqa", "ekallate")] })],
      ]),
    );

    Assert.contains(
      "- A ekallate -> terqa: fails: it met the unit from terqa (Mitanni's army) coming the other way; your strength 1 against 1; so your army stays in ekallate",
      battle(s, "Assyria"),
    );
    Assert.contains(
      "- A terqa -> ekallate: fails: it met the unit from ekallate (Assyria's army) coming the other way; your strength 1 against 1; so your army stays in terqa",
      battle(s, "Mitanni"),
    );

    // A unit whose move failed and that was then destroyed is not said to stay: its own line says it was destroyed.
    let t = newGame(1);
    new TurnEngine(t).resolve(
      new Dict([
        ["Assyria", newTurnSubmission({ orders: [move("ekallate", "terqa"), support("ashur", "ekallate", "terqa")] })],
        ["Mitanni", newTurnSubmission({ orders: [move("terqa", "ekallate")] })],
        ["Babylonia", newTurnSubmission({ orders: [support("sippar", "terqa", "ekallate"), support("durkurigalzu", "terqa", "ekallate")] })],
      ]),
    );
    let assyria = battle(t, "Assyria");
    Assert.contains("- A ekallate is destroyed", assyria);
    Assert.doesNotContain("stays in ekallate", assyria);
  });

  test("A kings letter is in his view in full while its envoy is away and beside the report when it comes", () => {
    let s = newGame(5);
    let envoy = first(s.characters, (c) => c.employer === "Egypt");
    envoy.secretMaster = null;
    let message = "Brother, my army will not cross into Alashiya. ".repeat(12).trim();
    let [, e, , a] = atAudience(
      dispatchOrder(envoy.id, "Alashiya", message, {
        mandate: "May promise peace for three years.",
        gold: 20,
        proposal: newTabletProposal({ text: "Peace between Egypt and Alashiya." }),
      }),
      s,
      envoy,
    );
    let letter = Assert.single(Views.for(s, "Egypt").letters);
    Assert.equal(
      [envoy.id, envoy.name, "Alashiya", 20, message, "May promise peace for three years.", "Peace between Egypt and Alashiya.", null],
      [letter.envoyId, letter.envoyName, letter.to, letter.gold, letter.message, letter.mandate, letter.tablet, letter.reportedTurn],
    );
    // Nobody else sees it.
    Assert.empty(Views.for(s, "Alashiya").letters);

    e.applyAudience(
      newAudienceRecord({
        audienceId: a.id,
        delivered: "Greetings.",
        rounds: [newAudienceRound({ host: newHostReply({ speech: "Go home.", end: true }), envoy: newEnvoyReaction({ speech: "I go." }) })],
      }),
    );
    Assert.single(Views.for(s, "Egypt").letters);
    e.resolve(new Dict<Power, TurnSubmission>());

    // Still shown on the road home; then once more, in the season its report comes; then it leaves the view.
    while (true) {
      e = new TurnEngine(s);
      e.beginTurn();
      for (const req of e.mindRequests.filter((r) => r.task === "EnvoyReport" && r.characterId === envoy.id))
        e.fulfil(req, newMindReply({ text: "My lord, I have returned." }));
      let letters = Views.for(s, "Egypt").letters;
      const reported = single(s.trails).reportTurn;
      if (reported !== null) {
        Assert.equal(reported, Assert.single(letters).reportedTurn);
        break;
      }
      Assert.single(letters);
      e.resolve(new Dict<Power, TurnSubmission>());
    }
    e.resolve(new Dict<Power, TurnSubmission>());
    new TurnEngine(s).beginTurn();
    Assert.empty(Views.for(s, "Egypt").letters);
  });

  test("An envoys promise is kept in full", () => {
    let [s, e, envoy, a] = atAudience();
    let promise = "My lord will hold Mira and Lukka and send no ships to Cyprus. ".repeat(10).trim(); // about 600 characters
    e.applyAudience(
      newAudienceRecord({
        audienceId: a.id,
        delivered: "Greetings.",
        rounds: [
          newAudienceRound({ host: newHostReply({ speech: "Swear it.", end: true }), envoy: newEnvoyReaction({ speech: "I swear.", commitments: promise }) }),
        ],
      }),
    );
    Assert.contains(CommittedPrefix + promise, single(s.trails).outcomes);
    Assert.contains(`${envoy.name} promised on behalf of Egypt: "${promise}"`, single(inboxOf(s, "Alashiya"), (i) => i.kind === "Audience").body);
  });

  test("The host reads the envoys own promise apart from what the audience brought about", () => {
    let [s, e, envoy, a] = atAudience();
    e.applyAudience(
      newAudienceRecord({
        audienceId: a.id,
        delivered: "Greetings.",
        rounds: [
          newAudienceRound({
            host: newHostReply({ speech: "Take this.", bribe: 10, end: true }),
            envoy: newEnvoyReaction({ speech: "I thank you.", acceptBribe: true, commitments: "the tablet sealed exactly as written" }),
          }),
        ],
      }),
    );

    // The record of the mission keeps the promise among its outcomes, marked as the envoy's own.
    let trail = single(s.trails);
    Assert.contains(CommittedPrefix + "the tablet sealed exactly as written", trail.outcomes);
    Assert.equal("the tablet sealed exactly as written", single(trail.outcomes.map(commitment).filter((x) => x !== null)));
    // The host reads it on a line of its own, as the envoy's promise, not among the outcomes.
    let body = single(inboxOf(s, "Alashiya"), (i) => i.kind === "Audience").body;
    let outcome = single(body.split("\n"), (l) => l.startsWith("Outcome: "));
    Assert.doesNotContain("sealed exactly", outcome);
    Assert.contains("accepted 10 shekels from Alashiya", outcome);
    Assert.contains(`${envoy.name} promised on behalf of Egypt: "the tablet sealed exactly as written"`, body);
  });

  test("An envoy remembers its mandate with one full stop", () => {
    // The follow-up's review: "You may agree to peace and an exchange of gifts.." in a character's memory.
    let s = newGame(5);
    let envoy = first(s.characters, (c) => c.employer === "Egypt");
    let e = new TurnEngine(s);
    e.beginTurn();
    e.resolve(
      new Dict([
        [
          "Egypt",
          newTurnSubmission({
            orders: [dispatchOrder(envoy.id, "Hatti", "Greetings, brother.", { mandate: "You may agree to peace and an exchange of gifts. Promise no land." })],
          }),
        ],
      ]),
    );
    let sent = single(envoy.memory, (m) => m.text.startsWith("My lord of Egypt sent me")).text;
    Assert.endsWith("I may agree to: You may agree to peace and an exchange of gifts. Promise no land.", sent);
    Assert.equal("Hold the border.", Greeting.stopped("Hold the border"));
    Assert.equal("Will he come?", Greeting.stopped("Will he come? "));
  });

  test("A calling takes the article its sound asks for", () => {
    // The follow-up's review: "Served as a interpreter".
    let interpreter = newCharacter({ name: "Keliya", origin: "Washukanni", calling: "interpreter" });
    Assert.equal("an interpreter", Personas.calling(interpreter));
    Assert.equal("a merchant", Personas.calling(newCharacter({ calling: "merchant" })));
    Assert.contains("once an interpreter. You are ", Personas.template(interpreter));
    for (const seed of range(1, 20).map((n) => n))
      for (const c of newGame(seed).characters) {
        Assert.doesNotContain(c.facts, (f) => f.text.startsWith("Served as a interpreter"));
        Assert.doesNotContain("once a interpreter", c.persona);
      }
  });
});
