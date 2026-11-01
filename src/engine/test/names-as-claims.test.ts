import { describe, test } from "vitest";
import {
  asSeenBy,
  claimName,
  claimantsOf,
  land,
  newGame,
  newGameConfig,
  newGreetingOptions,
  newTurnSubmission,
  OrderValidator,
  ownLand,
  renderGreeting,
  TurnEngine,
  Views,
} from "@amarna/engine";
import { Assert } from "./support.ts";

// Item 17+ ("A power's name is a claim"): a power goes by the name it claims; where two claim one name, each court gives it
// to the one its greetings name so and calls the other by his house; a claim gives nothing by rule.
describe("NamesAsClaims", () => {
  function game(): [ReturnType<typeof newGame>, TurnEngine] {
    const s = newGame(3, newGameConfig({ catastropheChance: 0 }));
    return [s, new TurnEngine(s)];
  }

  test("Every power goes by its own land's name until it claims another", () => {
    const [s] = game();
    Assert.equal("Gubla", land("Byblos"));
    Assert.equal("Amurru", land("Amurru"));
    Assert.equal(0, s.names.size);
    Assert.empty(Views.for(s, "Egypt").nameClaims);
  });

  test("A contested name stays with its own land in the record and the other claimant is called by his house", () => {
    const [s, e] = game();
    e.claimName("Amurru", claimName("Gubla"));
    Assert.equal("Gubla", s.names.get("Amurru").name);
    Assert.equal(2, claimantsOf("Gubla").length);
    Assert.equal("Gubla", land("Byblos"));
    Assert.equal("Bit-Aziru", land("Amurru"));
    // His own court gives the name to him.
    Assert.equal("Gubla", asSeenBy("Amurru", () => land("Amurru")));
    Assert.equal("Bit-Rib-Hadda", asSeenBy("Amurru", () => land("Byblos")));
    Assert.true(s.events.some((x) => x.signal === "name-claim"));
  });

  test("A court's greeting gives the name, and one by his house takes it back", () => {
    const [s, e] = game();
    e.claimName("Amurru", claimName("Gubla"));
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
    s.eliminated.push("Byblos");
    e.syncNames();
    Assert.equal(1, claimantsOf("Gubla").length);
    Assert.equal("Gubla", land("Amurru"));
  });
});
