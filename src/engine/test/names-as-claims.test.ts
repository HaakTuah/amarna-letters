import { describe, test } from "vitest";
import {
  asSeenBy,
  claimName,
  claimantsOf,
  dispatch,
  quoteWords,
  inboxOf,
  land,
  newGame,
  newGameConfig,
  newGreetingOptions,
  newTurnSubmission,
  notify,
  OrderValidator,
  ownLand,
  renderGreeting,
  TurnEngine,
  Views,
} from "@amarna/engine";
import { Assert, smallWorld } from "./support.ts";

// Item 17+ ("A power's name is a claim"): a power goes by the name it claims; where two claim one name, each court gives it
// to the one its greetings name so and calls the other by his house; a claim gives nothing by rule.
describe("NamesAsClaims", () => {
  function game(): [ReturnType<typeof newGame>, TurnEngine] {
    const s = smallWorld(newGame(3, newGameConfig({ catastropheChance: 0 })), "Egypt", "Hatti", "Amurru", "Byblos");
    return [s, new TurnEngine(s)];
  }

  test("Every power goes by its own land's name until it claims another", () => {
    const [s] = game();
    Assert.equal("Gubla", land("Byblos"));
    Assert.equal("Amurru", land("Amurru"));
    Assert.equal(0, s.names.size);
    Assert.empty(Views.for(s, "Egypt").nameClaims);
  });

  test("A claim is the claimant's own at once and reaches another court only in his greetings", () => {
    const [s, e] = game();
    e.claimName("Amurru", claimName("Gubla"));
    Assert.equal("Gubla", s.names.get("Amurru"));
    Assert.equal(2, claimantsOf("Gubla", "Amurru").length);
    // The engine's own words name each power by its own land (a notice is put into its court's names: below).
    Assert.equal("Gubla", land("Byblos"));
    Assert.equal("Amurru", land("Amurru"));
    // A court that has read no greeting of his knows nothing of it.
    Assert.equal("Amurru", asSeenBy("Egypt", () => land("Amurru")));
    Assert.empty(Views.for(s, "Egypt").nameClaims);
    e.claimHeard("Egypt", "Amurru", "Gubla", s.turn);
    Assert.equal(1, Views.for(s, "Egypt").nameClaims.length);
    // Nobody given the name yet: Egypt gives it to the power whose own land it is.
    Assert.equal("Gubla", asSeenBy("Egypt", () => land("Byblos")));
    Assert.equal("Bit-Aziru", asSeenBy("Egypt", () => land("Amurru")));
    // His own court gives the name to him.
    Assert.equal("Gubla", asSeenBy("Amurru", () => land("Amurru")));
    Assert.equal("Bit-Rib-Hadda", asSeenBy("Amurru", () => land("Byblos")));
    Assert.true(s.events.some((x) => x.signal === "name-claim"));
  });

  // From #348's review, round 2 (c): whom a court gives a name to reads the claims as it knows them, not the true ones.
  test("A court still gives a name to the land's own power after he claims another out of its hearing", () => {
    const [s, e] = game();
    e.claimName("Amurru", claimName("Gubla"));
    e.claimHeard("Egypt", "Amurru", "Gubla", s.turn);
    // Byblos claims Amurru's name; Egypt has read no greeting of his saying so.
    e.claimName("Byblos", claimName("Amurru"));
    Assert.equal("Gubla", asSeenBy("Egypt", () => land("Byblos")));
    Assert.equal("Byblos", Views.for(s, "Egypt").nameClaims[0].givenTo);
  });

  test("A court's greeting gives the name, and one by his house takes it back", () => {
    const [s, e] = game();
    e.claimName("Amurru", claimName("Gubla"));
    e.claimHeard("Egypt", "Amurru", "Gubla", s.turn);
    const text = renderGreeting("Egypt", "Amurru", newGreetingOptions());
    Assert.contains("king of Gubla", text);
    e.recordGreeting("Egypt", "Amurru", newGreetingOptions());
    Assert.equal("Gubla", asSeenBy("Egypt", () => land("Amurru")));
    Assert.equal("Bit-Rib-Hadda", asSeenBy("Egypt", () => land("Byblos")));
    const view = Views.for(s, "Egypt");
    Assert.equal("Amurru", view.nameClaims[0].givenTo);
    // By his house: the name goes back to the record's holder.
    Assert.contains("Bit-Aziru", renderGreeting("Egypt", "Amurru", newGreetingOptions({ byHouse: true })));
    e.recordGreeting("Egypt", "Amurru", newGreetingOptions({ byHouse: true }));
    Assert.equal("Bit-Aziru", asSeenBy("Egypt", () => land("Amurru")));
    // Other courts still name them as the record does.
    Assert.equal("Gubla", asSeenBy("Hatti", () => land("Byblos")));
  });

  test("Only a name the map knows may be claimed, and one's own name returns one to it", () => {
    const [s, e] = game();
    const v = new OrderValidator(s).validate("Amurru", newTurnSubmission({ orders: [claimName("Atlantis"), claimName("Amurru")] }));
    Assert.equal(2, v.rejected.length);
    Assert.empty(new OrderValidator(s).validate("Amurru", newTurnSubmission({ orders: [claimName("egypt")] })).rejected);
    e.claimName("Amurru", claimName("Gubla"));
    e.claimName("Amurru", claimName(ownLand("Amurru")));
    Assert.equal(0, s.names.size);
    Assert.equal("Amurru", land("Amurru"));
  });

  test("A fallen court claims nothing, so a name it held is free", () => {
    const [s, e] = game();
    e.claimName("Amurru", claimName("Gubla"));
    e.claimHeard("Egypt", "Amurru", "Gubla", s.turn);
    s.eliminated.push("Byblos");
    e.syncNames();
    // Until word of the fall reaches Egypt, it still knows two claimants.
    Assert.equal(2, claimantsOf("Gubla", "Egypt").length);
    s.fallsHeard.set("Egypt", ["Byblos"]);
    e.syncNames();
    Assert.equal(1, claimantsOf("Gubla", "Egypt").length);
    Assert.equal("Gubla", asSeenBy("Egypt", () => land("Amurru")));
  });

  // Issue #417 (i): a court keeps the newest greeting it has read, by the season it was sealed.
  test("An older greeting arriving late does not set a court's knowledge of a claim back", () => {
    const [s, e] = game();
    e.claimName("Amurru", claimName("Gubla"));
    e.claimHeard("Egypt", "Amurru", "Gubla", 5);
    e.claimHeard("Egypt", "Amurru", null, 3);
    Assert.equal("Bit-Aziru", asSeenBy("Egypt", () => land("Amurru")));
    e.claimHeard("Egypt", "Amurru", null, 6);
    Assert.equal("Amurru", asSeenBy("Egypt", () => land("Amurru")));
    Assert.equal(6, s.namesHeard.get("Egypt").get("Amurru").sealed);
  });

  // The same through the envoys: the season a tablet is sealed rides with it, and its arrival brings it to the host.
  test("A tablet sealed before the newest greeting a court read, arriving after it, sets nothing back", () => {
    const [s, e] = game();
    const c = s.characters.find((x) => x.employer === "Amurru" && x.status === "Employed" && x.duty === "None")!;
    e.dispatch("Amurru", dispatch(c.id, "Egypt", "Greetings."));
    const j = s.journeys.find((x) => x.characterId === c.id)!;
    const sealed = s.turn;
    Assert.equal(sealed, j.dispatch!.sealed);
    e.claimName("Amurru", claimName("Gubla"));
    e.claimHeard("Egypt", "Amurru", "Gubla", sealed + 1);
    // The old tablet comes two seasons on, after the newer greeting: only its sealing season keeps it from counting.
    s.turn = sealed + 2;
    e.envoyArrivesAbroad(j);
    Assert.equal("Gubla", s.namesHeard.get("Egypt").get("Amurru").name);
    Assert.equal("Bit-Aziru", asSeenBy("Egypt", () => land("Amurru")));
  });

  // Issue #417 (a): a notice names the powers as its recipient's court knows and gives them, so one name means one power
  // in all a court reads; a notice about a name itself keeps it.
  test("Notices name powers as their recipient's court does", () => {
    const [s, e] = game();
    e.claimName("Amurru", claimName("Gubla"));
    const said = (p: string): string => inboxOf(s, p).at(-1)!.body;
    Assert.equal("Your court now calls you the king of Gubla.", said("Amurru").split(" Another")[0]);
    // A court that has read no claim reads the engine's names.
    notify(s, "Egypt", "Notice", "News", "Amurru marches on Gubla.");
    Assert.equal("Amurru marches on Gubla.", said("Egypt"));
    e.claimHeard("Egypt", "Amurru", "Gubla", s.turn);
    notify(s, "Egypt", "Notice", "News", "Amurru marches on Gubla.");
    Assert.equal("Bit-Aziru marches on Gubla.", said("Egypt"));
    // The claimant's own court gives the name to him, and the house name of the other is left as it is.
    notify(s, "Amurru", "Notice", "News", "Amurru marches on Gubla, and Bit-Rib-Hadda is afraid.");
    Assert.equal("Gubla marches on Bit-Rib-Hadda, and Bit-Rib-Hadda is afraid.", said("Amurru"));
    // What the engine quotes stays as it was written: a sealed greeting, a letter, someone's words.
    notify(s, "Amurru", "Audience", "Audience", 'The sealed greeting reads: "Say to the king of Gubla, of Amurru your servant." Amurru said: "Gubla (the city) is mine".\nOutcome: Gubla wept.');
    Assert.equal('The sealed greeting reads: "Say to the king of Gubla, of Amurru your servant." Gubla said: "Gubla (the city) is mine".\nOutcome: Bit-Rib-Hadda wept.', said("Amurru"));
    // Words the engine marks as quoted stay whole, even with double quotes of their writer's own inside them.
    notify(s, "Amurru", "Audience", "Audience", `Amurru said: ${quoteWords('I, the "true" king of Gubla, say Amurru is mine.')} Gubla wept.`);
    Assert.equal('Gubla said: "I, the "true" king of Gubla, say Amurru is mine." Bit-Rib-Hadda wept.', said("Amurru"));
    // The engine's narration between two quotations is its own, and renamed: an audience whose envoy promised something.
    notify(s, "Amurru", "Audience", "Audience", `Addu said: ${quoteWords("hello")}\nOutcome: Gubla wept.\nAddu promised on behalf of Amurru: ${quoteWords("gold")}`);
    Assert.equal('Addu said: "hello"\nOutcome: Bit-Rib-Hadda wept.\nAddu promised on behalf of Gubla: "gold"', said("Amurru"));
    // A fallen claimant claims nothing, once a court hears of the fall: before the word comes it names him as it did.
    s.eliminated.push("Amurru");
    e.syncNames();
    Assert.equal("Bit-Aziru", asSeenBy("Egypt", () => land("Amurru")));
    notify(s, "Egypt", "Notice", "News", "Amurru waits.");
    Assert.equal("Bit-Aziru waits.", said("Egypt"));
    // When it hears, he goes by his own land's name again, and the name he claimed is its own power's.
    s.fallsHeard.set("Egypt", ["Amurru"]);
    e.syncNames();
    Assert.equal("Amurru", asSeenBy("Egypt", () => land("Amurru")));
    notify(s, "Egypt", "Rumor", "A kingdom falls", "Amurru has fallen; Gubla stands. The Kaska lands are quiet.");
    Assert.equal("Amurru has fallen; Gubla stands. The Kaska lands are quiet.", said("Egypt"));
    // A name beginning with "the" is found at the head of a sentence too.
    e.claimName("Hatti", claimName("the Kaska lands"));
    notify(s, "Hatti", "Notice", "News", `The Kaska lands are quiet; Hatti waits. Hatti is patient. He said: ${quoteWords("wait.")} Hatti waits.`);
    Assert.equal(`${asSeenBy("Hatti", () => land("Kaska"))} are quiet; the Kaska lands waits. The Kaska lands is patient. He said: "wait." The Kaska lands waits.`, said("Hatti"));
    // The god view keeps the engine's names.
    Assert.equal("Amurru", land("Amurru"));
  });
});
