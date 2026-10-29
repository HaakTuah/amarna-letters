import { describe, test } from "vitest";
import {
  Dict,
  type GameState,
  type PendingAudience,
  type Power,
  TurnEngine,
  type TurnSubmission,
  characterLegend,
  clause,
  courtLegend,
  dispatch,
  first,
  logEvent,
  newAudienceRecord,
  newAudienceRound,
  newGame,
  newGameConfig,
  newHostReply,
  newMessageTrail,
  newOwnerChange,
  newTablet,
  newTabletCopy,
  newTurnSubmission,
  revelations,
  single,
  tabletLegends,
  type RisenPower,
} from "@amarna/engine";
import { Assert } from "./support.ts";

// Legends, read from the record (build order item 14): tablets' histories, courts' rise and fall, biographies, the record
// opened at the end, and the third plea for gold kept by the chronicle ("Finkel's version").
describe("LegendsTests", () => {
  const game = (): GameState => newGame(5, newGameConfig({ catastropheChance: 0 }));

  /** Egypt's envoy sent to Alashiya asking gold, and the game run until he stands at Alashiya's court. */
  function plea(s: GameState): [TurnEngine, PendingAudience] {
    let envoy = first(s.characters, (c) => c.employer === "Egypt");
    envoy.secretMaster = null;
    let e = new TurnEngine(s);
    e.beginTurn();
    e.resolve(new Dict([["Egypt", newTurnSubmission({ orders: [dispatch(envoy.id, "Alashiya", "Send gold.", { clauses: [clause("askGold", { amount: 50 })] })] })]]));
    while (s.audiences.length === 0) {
      e = new TurnEngine(s);
      e.beginTurn();
      if (s.audiences.length === 0) e.resolve(new Dict<Power, TurnSubmission>());
    }
    return [e, single(s.audiences)];
  }

  const heardBefore = (s: GameState, n: number): void => {
    for (let i = 0; i < n; i++)
      s.trails.push(newMessageTrail({ id: `old${i}`, turn: 0, from: "Egypt", to: "Alashiya", audienceTurn: 0, deliveredClauses: [clause("askGold", { amount: 20 })] }));
  };

  const hear = (e: TurnEngine, a: PendingAudience, asks: boolean): void =>
    e.applyAudience(
      newAudienceRecord({ audienceId: a.id, delivered: "Send gold.", clauses: asks ? [clause("askGold", { amount: 50 })] : [], rounds: [newAudienceRound({ host: newHostReply({ end: true }) })] }),
    );

  test("The third plea for gold a court hears from one king is a line in the chronicle, heard by the court begged", () => {
    let s = game();
    heardBefore(s, 2);
    let [e, a] = plea(s);
    hear(e, a, true);
    let line = single(s.events, (x) => x.kind === "begging");
    Assert.equal(["Alashiya"], line.visibleTo);
    Assert.true(line.text.includes("I love you my gold owning brother"));
    Assert.contains(courtLegend(s, "Egypt"), (l) => l.text === line.text);
    Assert.contains(courtLegend(s, "Alashiya"), (l) => l.text === line.text);
  });

  test("Not the fourth, nor a plea an impostor made in the king's name", () => {
    let s = game();
    heardBefore(s, 3);
    let [e, a] = plea(s);
    hear(e, a, true);
    Assert.false(s.events.some((x) => x.kind === "begging"));
    let t = game();
    heardBefore(t, 1);
    t.trails.push(newMessageTrail({ id: "fake", turn: 0, from: "Egypt", to: "Alashiya", audienceTurn: 0, pretended: true, deliveredClauses: [clause("askGold", { amount: 20 })] }));
    let [e2, a2] = plea(t);
    hear(e2, a2, true);
    Assert.false(t.events.some((x) => x.kind === "begging"));
  });

  test("Only the third: a second plea, or one the envoy left out, keeps no line", () => {
    let s = game();
    heardBefore(s, 1);
    let [e, a] = plea(s);
    hear(e, a, true);
    Assert.false(s.events.some((x) => x.kind === "begging"));
    let t = game();
    heardBefore(t, 2);
    let [e2, a2] = plea(t);
    hear(e2, a2, false);
    Assert.false(t.events.some((x) => x.kind === "begging"));
  });

  test("A tablet's history: sealed, its copy shown to a third court, and broken by land taken after it", () => {
    let s = game();
    s.tablets.push(newTablet({ id: "legend1", proposedBy: "Egypt", partner: "Hatti", seals: ["Egypt", "Hatti"], createdTurn: 1, sealedTurn: 2, clauses: [clause("peace")] }));
    s.copies.push(newTabletCopy({ id: "c1", tabletId: "legend1", holder: "Mitanni", acquiredTurn: 5, source: "shown by Egypt" }));
    s.ownerLog.push(newOwnerChange({ province: "tuwanuwa", turn: 4, owner: "Egypt" }));
    let t = single(tabletLegends(s), (x) => x.id === "legend1");
    Assert.contains(t.lines, (l) => l.turn === 2 && l.text.startsWith("Sealed by Egypt and Hatti"));
    Assert.contains(t.lines, (l) => l.turn === 4 && l.text === "Broken: Egypt took Tuwanuwa from Hatti.");
    Assert.contains(t.lines, (l) => l.turn === 5 && l.text === "A copy came to Mitanni, shown by Egypt.");
  });

  test("Land ceded between the two, or taken after a repudiated tablet, is no broken oath", () => {
    let s = game();
    s.tablets.push(newTablet({ id: "legend1", proposedBy: "Egypt", partner: "Hatti", seals: ["Egypt", "Hatti"], createdTurn: 1, sealedTurn: 2, clauses: [clause("peace"), clause("cede", { province: "tuwanuwa" })] }));
    s.ownerLog.push(newOwnerChange({ province: "tuwanuwa", turn: 4, owner: "Egypt" }));
    s.turn = 4;
    logEvent(s, "cession", "Hatti ceded Tuwanuwa to Egypt.", ["Hatti", "Egypt"]);
    Assert.false(single(tabletLegends(s), (x) => x.id === "legend1").lines.some((l) => l.text.startsWith("Broken")));
    Assert.contains(courtLegend(s, "Hatti"), (l) => l.text === "Ceded Tuwanuwa to Egypt.");
    let t = game();
    t.tablets.push(newTablet({ id: "legend1", proposedBy: "Egypt", partner: "Hatti", seals: ["Egypt", "Hatti"], createdTurn: 1, sealedTurn: 2, repudiatedTurn: 3, byHandOf: "Hatti", clauses: [clause("peace")] }));
    t.ownerLog.push(newOwnerChange({ province: "tuwanuwa", turn: 4, owner: "Egypt" }));
    Assert.false(single(tabletLegends(t), (x) => x.id === "legend1").lines.some((l) => l.text.startsWith("Broken")));
  });

  test("A forged tablet names its forger and the seals it bears falsely; inventories and unsealed tablets are left out", () => {
    let s = game();
    let forger = first(s.characters, (c) => c.employer === "Assyria");
    s.tablets.push(newTablet({ id: "legend1", proposedBy: "Egypt", seals: ["Egypt", "Hatti"], createdTurn: 3, forged: true, forgerId: forger.id, forgerEmployer: "Assyria" }));
    s.tablets.push(newTablet({ id: "legend2", proposedBy: "Egypt", partner: "Hatti", seals: ["Egypt"], createdTurn: 3 }));
    s.tablets.push(newTablet({ id: "legend3", proposedBy: "Egypt", partner: "Hatti", seals: ["Egypt"], createdTurn: 3, sealedTurn: 3, inventory: true }));
    let t = single(tabletLegends(s), (x) => x.id === "legend1");
    Assert.equal("A forged tablet of Egypt and Hatti", t.title);
    Assert.contains(t.lines, (l) => l.text.startsWith(`Forged by ${forger.name} for Assyria`));
  });

  test("A court's rise and fall: what it took and lost, and its fall", () => {
    let s = game();
    s.ownerLog.push(newOwnerChange({ province: "tuwanuwa", turn: 4, owner: "Egypt" }));
    s.ownerLog.push(newOwnerChange({ province: "tuwanuwa", turn: 7, owner: null }));
    let egypt = courtLegend(s, "Egypt");
    Assert.contains(egypt, (l) => l.turn === 4 && l.text === "Took Tuwanuwa from Hatti.");
    Assert.contains(egypt, (l) => l.turn === 7 && l.text === "Lost Tuwanuwa, which fell lawless.");
    Assert.contains(courtLegend(s, "Hatti"), (l) => l.turn === 4 && l.text === "Lost Tuwanuwa to Egypt.");
  });

  test("A biography reads the events naming the person, a court only those it saw, and nothing for a shared name", () => {
    let s = game();
    let c = first(s.characters, (x) => x.employer === "Egypt");
    s.turn = 3;
    logEvent(s, "skim", `${c.name} kept 20 of the 50 shekels Egypt sent to Hatti.`, [], "skim");
    logEvent(s, "travel", `${c.name} reached Hattusa.`, ["Hatti"]);
    Assert.equal(2, characterLegend(s, c.id, null).length);
    Assert.equal([`${c.name} reached Hattusa.`], characterLegend(s, c.id, "Hatti").map((l) => l.text));
    Assert.empty(characterLegend(s, c.id, "Egypt"));
    first(s.characters, (x) => x.id !== c.id).name = c.name;
    Assert.empty(characterLegend(s, c.id, null));
  });

  test("A governor who rises to rule his province is a new Idrimi, in his life and in both courts' legends", () => {
    let s = game();
    let c = first(s.characters, (x) => x.employer === "Hatti");
    const r: RisenPower = { power: "Tuwanuwa", land: "Tuwanuwa", king: c.name, ruler: c.id, capital: "tuwanuwa", turn: 6, from: "Hatti", temper: [] };
    s.risen.push(r);
    const idrimi = (l: { text: string }): boolean => l.text.startsWith(`A new Idrimi: ${c.name}, who governed Tuwanuwa for Hatti`);
    Assert.contains(characterLegend(s, c.id, null), idrimi);
    Assert.contains(courtLegend(s, "Hatti"), idrimi);
    Assert.contains(courtLegend(s, "Tuwanuwa"), idrimi);
    Assert.empty(characterLegend(s, c.id, "Egypt").filter(idrimi));
  });

  test("The record opens: each deception by kind, secret masters, and the season the end was drawn for only once it has ended", () => {
    let s = game();
    let c = first(s.characters, (x) => x.employer === "Egypt");
    c.secretMaster = "Hatti";
    s.turn = 2;
    logEvent(s, "skim", `${c.name} kept 20 shekels on the way home.`, [], "skim");
    logEvent(s, "bridge", `${c.name} bent the words of someone at Hatti's court.`, [], "bent-words");
    let open = revelations(s);
    Assert.equal(["Who skimmed", "Which go-betweens were paid to bend the words they passed on", "Who served another king in secret"], open.map((r) => r.title));
    Assert.false(open.some((r) => r.title.includes("drawn")));
    s.ended = true;
    s.finalSeason = 20;
    s.turn = 20;
    Assert.contains(revelations(s), (r) => r.title === "The season the end was drawn for" && r.lines[0].text.includes("turn 20"));
  });
});
