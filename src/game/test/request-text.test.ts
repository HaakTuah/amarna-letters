import { describe, test } from "vitest";
import {
  AllPowers,
  type AudienceView,
  type Character,
  CommittedPrefix,
  type HostReply,
  type MessageTrail,
  Personas,
  type SeatView,
  type TurnSubmission,
  dispatch,
  first,
  king,
  newCharacter,
  newContract,
  newDispatch,
  newExchange,
  newFact,
  newGame,
  newGameConfig,
  newHomeCargo,
  newHostReply,
  newMessageTrail,
  newMindRequest,
  newTablet,
  newTabletCopy,
  newTraits,
  newTurnSubmission,
  single,
} from "@amarna/engine";
import { type EnvoyContext, GameRunner, type ISeat, type MindContext, ScriptMind, TemplateNarrator, newEnvoyContext, newMindContext } from "@amarna/game";
import { CharacterSystem, LlmCharacterMind, Parse } from "@amarna/llm";
import { at, Assert, toDict } from "../../engine/test/support.ts";
import { Recorder } from "./recorder.ts";

// What a model character is asked, after the second agent simulation's defects in the request texts (the fix pass after
// item 4, part 2): the gold questions only when gold is carried, the envoy's own commitment kept apart from what the engine
// records, and its trait words as its traits are now.
describe("RequestTextTests", () => {
  // <summary>Keeps every request a model character makes and answers with the plainest reply its schema allows.</summary>

  function envoyOf(loyalty: number = 50, greed: number = 50): Character {
    return newCharacter({
      id: "c1",
      name: "Keliya",
      origin: "Washukanni",
      calling: "scribe",
      status: "Employed",
      employer: "Egypt",
      contract: newContract({ wage: 10 }),
      at: "Hatti",
      traits: newTraits({ loyalty: loyalty, greed: greed, competence: 60, ambition: 40, courage: 50 }),
    });
  }

  function audience(envoy: Character, gold: number): EnvoyContext {
    return newEnvoyContext({
      self: envoy,
      sender: "Egypt",
      host: "Hatti",
      dispatch: newDispatch({ letter: "Greetings, brother.", gold: gold }),
      turn: 2,
      seed: 1,
      forgeMinCompetence: 55,
      delivered: "Greetings.",
    });
  }

  function reportOf(envoy: Character, gold: number, trail: MessageTrail | null = null): MindContext {
    return newMindContext({
      request: newMindRequest({ task: "EnvoyReport", characterId: envoy.id, court: "Egypt", cargo: newHomeCargo({ gold: gold, goldStated: gold }) }),
      self: envoy,
      turn: 4,
      seed: 1,
      forgeMinCompetence: 55,
      trail: trail,
    });
  }

  test("An envoy is asked what it keeps of the gold only when it carries gold", async () => {
    let asker = new Recorder();
    let mind = new LlmCharacterMind(asker);
    let envoy = envoyOf();

    await mind.present(audience(envoy, 0));
    await mind.present(audience(envoy, 40));
    await mind.write(reportOf(envoy, 0));
    await mind.write(reportOf(envoy, 25));

    let [bare, laden, home, homeLaden] = [asker.calls[0], asker.calls[1], asker.calls[2], asker.calls[3]];
    Assert.equal(["as_written", "speech"], Recorder.fields(bare));
    Assert.equal(["as_written", "speech", "keep_gold", "swap_inventory"], Recorder.fields(laden));
    Assert.equal(["report"], Recorder.fields(home));
    Assert.equal(["report", "keep_gold", "swap_inventory"], Recorder.fields(homeLaden));
    // Nor does its request speak of gold or of faking a seal when it carries none.
    Assert.doesNotContain("gold", bare.user);
    Assert.doesNotContain("gold", home.user);
    Assert.contains("You carry gold in sealed bags", laden.user);
    Assert.contains("You carry back gold the king sent your lord", homeLaden.user);
    // The shared text says the gold decisions come only with gold.
    Assert.contains("only when you carry gold, how much of it to keep for yourself", CharacterSystem);
    Assert.doesNotContain("how much of the gold you carry to keep", CharacterSystem);
  });

  test("An envoy is asked whether to take a gift or a post only when one is offered", async () => {
    let asker = new Recorder();
    let mind = new LlmCharacterMind(asker);
    let envoy = envoyOf();

    await mind.react(audience(envoy, 0), newHostReply({ speech: "Welcome." }));
    await mind.react(audience(envoy, 0), newHostReply({ speech: "Take this.", bribe: 10 }));
    await mind.react(audience(envoy, 0), newHostReply({ speech: "Serve me.", jobOffer: 30 }));

    Assert.equal(["speech", "commitments"], Recorder.fields(asker.calls[0]));
    Assert.equal(["speech", "accept_gift", "commitments"], Recorder.fields(asker.calls[1]));
    Assert.equal(["speech", "accept_service", "commitments"], Recorder.fields(asker.calls[2]));
  });

  test("An envoys own promise is its own line in its report request not something that happened", async () => {
    let asker = new Recorder();
    let mind = new LlmCharacterMind(asker);
    let envoy = envoyOf();
    let trail = newMessageTrail({
      id: "m1",
      turn: 2,
      from: "Egypt",
      to: "Hatti",
      envoyId: envoy.id,
      envoyName: envoy.name,
      delivered: "Greetings.",
      exchanges: [newExchange({ host: "I will think on it.", envoy: "My lord will hold to it." })],
      outcomes: ["accepted 10 shekels from Hatti", CommittedPrefix + "the tablet sealed exactly as written"],
    });

    await mind.write(reportOf(envoy, 0, trail));

    let user = Assert.single(asker.calls).user;
    let happened = single(user.split("\n"), (l) => l.startsWith("What happened: "));
    Assert.equal("What happened: accepted 10 shekels from Hatti.", happened.trimEnd());
    Assert.doesNotContain("committed", user);
    Assert.contains(
      'What you yourself promised on your lord\'s behalf, in your own words at the audience (your promise, not anything the king did or sealed): "the tablet sealed exactly as written"',
      user,
    );

    // With only its own promise, there is no "What happened" line at all.
    trail.outcomes = [CommittedPrefix + "nothing beyond the mandate"];
    await mind.write(reportOf(envoy, 0, trail));
    Assert.doesNotContain("What happened", asker.calls[1].user);
    Assert.contains('"nothing beyond the mandate"', asker.calls[1].user);
  });

  test("A characters trait words follow its traits as they are now", async () => {
    let envoy = envoyOf(80, 20);
    envoy.facts.push(newFact({ id: "f1", text: "Keeps a lover in Ugarit.", secrecy: "Hidden", tag: "lover" }));
    envoy.persona = Personas.template(envoy);
    Assert.contains("steadfast to whoever treats you fairly; indifferent to riches", envoy.persona);
    Assert.equal(envoy.persona, Personas.current(envoy));

    // Years unpaid and a court's gold: loyalty falls and greed rises. The template persona is rewritten in place.
    [envoy.traits.loyalty, envoy.traits.greed] = [30, 70];
    let now = Personas.current(envoy);
    Assert.contains("You are Keliya, born in Washukanni, once a scribe. You are loyal mostly to yourself; fond of gold and quick to see a profit;", now);
    Assert.contains("What you want most: gold, enough to never serve again.", now);
    Assert.doesNotContain("steadfast", now);
    Assert.doesNotContain("to serve well and be trusted", now);
    // The rest stays as written, its secrets among them; the persona it was given is not changed.
    Assert.contains("Things about yourself you do not volunteer: Keeps a lover in Ugarit.", now);
    Assert.endsWith("You speak in the formal manner of a royal messenger of the Late Bronze Age.", now);
    Assert.contains("steadfast", envoy.persona);

    // What the model reads is the persona as it is now.
    let asker = new Recorder();
    await new LlmCharacterMind(asker).present(audience(envoy, 0));
    Assert.startsWith(now, Assert.single(asker.calls).seatSystem);

    // A persona the narrator wrote cannot be rewritten without a model: the trait words as they are now follow it.
    envoy.persona = "You are Keliya, a scribe who has served one master faithfully all his life. You speak softly.";
    Assert.equal(
      envoy.persona +
        "\nAs you are now (where anything above differs, this is how you are now): you are loyal mostly to yourself; fond of gold and quick to see a profit; capable enough; hopeful of advancement; careful with powerful men. What you want most: gold, enough to never serve again.",
      Personas.current(envoy),
    );
  });

  // <summary>Sends one envoy to Hatti in the first season; answers every audience plainly.</summary>
  class Sender implements ISeat {
    readonly #envoyId: string;
    constructor(envoyId: string) {
      this.#envoyId = envoyId;
    }
    get label(): string {
      return "Sender";
    }
    decide(view: SeatView, ct: AbortSignal): Promise<TurnSubmission> {
      return Promise.resolve(view.turn === 1 ? newTurnSubmission({ orders: [dispatch(this.#envoyId, "Hatti", "Greetings, brother.")] }) : newTurnSubmission());
    }
    hostAudience(view: AudienceView, court: SeatView, ct: AbortSignal): Promise<HostReply> {
      return Promise.resolve(newHostReply({ end: true }));
    }
  }

  // <summary>Hatti's king, who speaks of his copy of a tablet by his own mark and of a person by id.</summary>
  class Marker implements ISeat {
    readonly #words: string;
    constructor(words: string) {
      this.#words = words;
    }
    get label(): string {
      return "Marker";
    }
    decide(view: SeatView, ct: AbortSignal): Promise<TurnSubmission> {
      return Promise.resolve(newTurnSubmission());
    }
    hostAudience(view: AudienceView, court: SeatView, ct: AbortSignal): Promise<HostReply> {
      return Promise.resolve(newHostReply({ speech: this.#words, bribe: 5, bribeAsk: "Remember k901.", end: true }));
    }
  }

  class Idle implements ISeat {
    get label(): string {
      return "Idle";
    }
    decide(view: SeatView, ct: AbortSignal): Promise<TurnSubmission> {
      return Promise.resolve(newTurnSubmission());
    }
    hostAudience(view: AudienceView, court: SeatView, ct: AbortSignal): Promise<HostReply> {
      return Promise.resolve(newHostReply({ end: true }));
    }
  }

  test("A hosts marks for his copies reach the envoy as the tablets names", async () => {
    let state = newGame(5, newGameConfig({ catastropheChance: 0, endMedian: 10000 }));
    state.tablets.push(
      newTablet({ id: "t900", text: "Peace.", proposedBy: "Egypt", partner: "Hatti", seals: ["Egypt", "Hatti"], createdTurn: 1, sealedTurn: 1 }),
    );
    state.copies.push(newTabletCopy({ id: "k901", tabletId: "t900", holder: "Hatti", acquiredTurn: 1, source: "sealed at audience" }));
    let envoy = first(state.characters, (c) => c.employer === "Egypt");
    envoy.secretMaster = null;
    // Greedy enough to take the gift, so it remembers what was asked for it.
    [envoy.traits.greed, envoy.traits.loyalty] = [95, 10];
    let seats = toDict(
      AllPowers,
      (p) => p,
      (p) => (p === "Egypt" ? new Sender(envoy.id) : p === "Hatti" ? new Marker(`The peace of k901 holds, as ${envoy.id} knows.`) : new Idle()),
    );
    let runner = Object.assign(new GameRunner(state, seats, new ScriptMind(), new TemplateNarrator()), { writeChronicles: false });
    await runner.prepare();
    for (let i = 0; i < 4 && state.trails.every((t) => t.exchanges.length === 0); i++) await runner.playTurn();

    let heard = single(single(state.trails).exchanges).host;
    Assert.equal(`The peace of the tablet sealed by Egypt and Hatti, dated turn 1 holds, as ${envoy.name} knows.`, heard);
    // What it asked for a gift too; the log keeps the king's own words.
    Assert.contains(envoy.memory, (m) => m.text.includes("Remember the tablet sealed by Egypt and Hatti, dated turn 1."));
    Assert.contains(runner.log.decisions, (d) => d.key.endsWith("/host/1") && d.json.includes("k901"));
  });

  test("A reply without the gold fields keeps nothing and swaps nothing", () => {
    let present = Parse.present(JSON.parse(`{"speech":"Hail."}`)!);
    Assert.equal([0, false], [present.skim, present.swapInventory]);
    let report = Parse.report(JSON.parse(`{"report":"Back."}`)!);
    Assert.equal([0, false], [report.number, report.swapInventory]);
    let react = Parse.react(JSON.parse(`{"speech":"Thank you.","commitments":""}`)!);
    Assert.equal([false, false], [react.acceptBribe, react.acceptJob]);
  });
});
