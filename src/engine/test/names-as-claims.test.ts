import { describe, test } from "vitest";
import {
  asSeenBy,
  claimName,
  claimantsOf,
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
    // The god view keeps the engine's names.
    Assert.equal("Amurru", land("Amurru"));
  });
});
