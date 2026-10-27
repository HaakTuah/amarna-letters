import { describe, test } from "vitest";
import { type Power, Views, characterOf, first, newCover, newGame, newPendingTask, single } from "@amarna/engine";
import { ScriptLeader } from "@amarna/game";
import { person, situation } from "@amarna/llm";
import { Assert } from "../../engine/test/support.ts";

// <summary>Script kings read the same view as everyone: a servant whose fate they have not heard of fools them too.</summary>
describe("CoverBotTests", () => {
  test.each([["Egypt"], ["Mitanni"], ["Arzawa"]] as const)("A script king never sends a servant it believes away %s", async (me: Power) => {
    let s = newGame(11);
    let servants = s.characters.filter((c) => c.employer === me);
    // One caught as a spy at Hatti's court, as its master does not know; the other gone over to Hatti.
    let caught = servants[0];
    caught.status = "Captured";
    caught.heldBy = "Hatti";
    caught.at = "Hatti";
    caught.covers.push(
      newCover({
        for: me,
        since: 1,
        believed: "SpyPosted",
        dutyText: "watching Hatti",
        whereText: "at the court of Hatti",
        wage: caught.contract!.wage,
        contractUntil: caught.contract!.untilTurn,
      }),
    );
    let gone = servants[1];
    gone.covers.push(
      newCover({
        for: me,
        since: 1,
        believed: "EnvoyHomebound",
        dutyText: "on the road home",
        whereText: "travelling",
        wage: gone.contract!.wage,
        contractUntil: gone.contract!.untilTurn,
      }),
    );
    gone.employer = "Hatti";
    gone.at = "Hatti";
    s.treasuries.get(me).gold = 3000;

    let view = Views.for(s, me);
    Assert.all(
      view.court.filter((c) => c.id === caught.id || c.id === gone.id),
      (c) => {
        Assert.equal("employed", c.status);
        Assert.false(c.ready);
      },
    );
    Assert.equal(caught.contract!.wage + gone.contract!.wage, view.wages);

    // A model king reads the same: the caught spy at its post, never "at court, ready".
    let text = situation(view);
    Assert.contains(
      `${caught.id} ${caught.name} of ${caught.origin}; watching Hatti; serves at ${caught.contract!.wage} a season through turn ${caught.contract!.untilTurn};`,
      text,
    );
    Assert.contains(`${gone.id} ${gone.name} of ${gone.origin}; on the road home;`, text);

    let king = new ScriptLeader(11);
    for (let turn = 2; turn <= 6; turn++) {
      s.turn = turn;
      let sub = await king.decide(Views.for(s, me));
      Assert.doesNotContain(sub.orders, (o) => {
        const id = characterOf(o);
        return id !== null && (id === caught.id || id === gone.id);
      });
    }
  });

  test("A captive known to its master reads as held with the demand never as ready", () => {
    let s = newGame(4);
    let spy = first(s.characters, (c) => c.employer === "Hatti");
    spy.status = "Captured";
    spy.heldBy = "Mitanni";
    spy.at = "Mitanni";
    let line = person(single(Views.for(s, "Hatti").court, (c) => c.id === spy.id));
    Assert.contains("held captive at the court of Mitanni;", line);
    Assert.doesNotContain("ready", line);
    // Its wage builds up as back pay while it is held: its line names the wage, not a wage paid.
    Assert.contains(`serves at ${spy.contract!.wage} a season`, line);

    // A demand shows only once its word has arrived.
    let demand = newPendingTask({ id: "q900", kind: "RansomDemand", requester: "Hatti", other: "Mitanni", characterId: spy.id, spend: 90, dueTurn: 6 });
    s.tasks.push(demand);
    Assert.doesNotContain("demands", person(single(Views.for(s, "Hatti").court, (c) => c.id === spy.id)));
    demand.announced = true;
    line = person(single(Views.for(s, "Hatti").court, (c) => c.id === spy.id));
    Assert.contains("held captive at the court of Mitanni; Mitanni demands 1 mina 30 shekels for their return (order pay_ransom)", line);
  });
});
