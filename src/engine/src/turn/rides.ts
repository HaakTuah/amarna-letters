/**
 * A fast courier, hired (#601; the owner, 3 November 2026: "paying for a courier is always a supply to demand issue, a
 * negotiation, no?"): a king hires a person at his court, a job like any other ("Jobs, not wages"), to ride to one far
 * province of his and bring its officials' report home this season. The rider asks his price by what he has heard such a
 * ride pays and by how badly he is wanted (how much sooner the report comes, and how many such rides the court asks for
 * against the free people there who could take them), and takes less if the king haggles, down to what he will not go
 * below, which is higher the greedier he is. Nothing sets the price, and there is no menu: the offer is the king's.
 */
import { idiv, roundEven, toInt } from "../core/num.ts";
import { cmpNum, sortBy } from "../core/seq.ts";
import { MoneyData } from "../model/money.ts";
import { remember, type Character } from "../model/people.ts";
import type { Power } from "../model/power.ts";
import { isAlive, logEvent, newKnown, notify } from "../model/state.ts";
import { Dict } from "../core/collections.ts";
import { ownerAt, riderSource } from "../rules/known-land.ts";
import { basePrice } from "./court.ts";
import { idNumber, TurnEngine } from "./core.ts";

declare module "./core.ts" {
  interface TurnEngine {
    /**
     * What a person asks for a ride to a far province of the court's this season, and the least he takes: `rides` is how
     * many such rides the court offers this season.
     */
    rideAsk(c: Character, p: Power, province: string, rides: number): { ask: number; least: number };
    /** At the season's start: each rider hired last season is back with his province's report, and its notices with him. */
    ridersBack(): void;
  }
}

const P = TurnEngine.prototype;

/**
 * First guesses (item 18 tunes them): in a hundred, what a rider asks more for each season sooner the report comes beyond
 * the first, and at most more when the court asks for as many rides as there are free people to take them (less as there
 * are more of them); and at most how far below his ask he goes when the king haggles, a man of no greed (none at all
 * for the greediest).
 */
export const RideData = { sooner: 20, scarce: 50, give: 25 } as const;

/** The title of the notice. */
export const RiderBackTitle = "A rider's report";

P.rideAsk = function (c, p, province, rides) {
  const S = this.s;
  // What he has heard such a ride pays, as a job's pay a season moves what he asks part of the way towards it.
  let price = basePrice(c, p);
  if (c.heardRide !== null) price = Math.max(1, toInt(roundEven((price * (100 - MoneyData.heardWeight) + c.heardRide * MoneyData.heardWeight) / 100)));
  // How badly he is wanted: the seasons sooner the report comes, and the rides asked for against those free to take them.
  const sooner = Math.max(1, this.wordTo(p, province));
  const free = Math.max(1, S.characters.filter((x) => x.status === "Free" && x.at === p && x.heldBy === null && x.duty === "None").length);
  const want = 100 + RideData.sooner * (sooner - 1) + idiv(RideData.scarce * Math.min(rides, free), free);
  const ask = Math.max(1, idiv(price * want, 100));
  const least = Math.max(1, ask - idiv(ask * RideData.give * (100 - c.traits.greed), 100 * 100));
  return { ask, least };
};

P.ridersBack = function () {
  const S = this.s;
  for (const c of sortBy(
    S.characters.filter((c) => c.status === "Employed" && c.contract?.errand?.what === "ride" && !c.contract.errand.done && c.contract.startTurn < S.turn),
    [(c: Character) => idNumber(c.id), cmpNum],
  )) {
    const p = c.employer!;
    const k = c.contract!;
    const x = k.errand!.where;
    const t = k.startTurn;
    k.errand!.done = true;
    if (!isAlive(S, p) || c.heldBy !== null || !this.map.exists(x)) continue;
    // The report of the season he rode in, as its officials gave it then (GameState.reports), and who held the land then.
    let book = S.known.tryGet(p);
    if (book === undefined) S.known.set(p, (book = new Dict()));
    const had = book.tryGet(x);
    const owner = ownerAt(S, this.map, x, t);
    if (had === undefined || had.turn < t) book.set(x, newKnown({ owner, turn: t, source: riderSource(c.name) }));
    // The notices told from there by that season come with him (TurnEngine.tell).
    const brought = S.journeys.filter((j) => j.kind === "Word" && j.to === p && j.from === p && j.news === "Realm" && j.seen[0] === x && j.departTurn <= t && j.arriveTurn > S.turn);
    S.journeys = S.journeys.filter((j) => !brought.includes(j));
    for (const j of brought) this.wordArrives(j);
    const name = this.map.get(x).name;
    notify(S, p, "Notice", RiderBackTitle, `${c.name} rode to ${name} and back with its report of season ${t}${owner === p ? "" : `: it answers to ${owner === null ? "no king" : owner} now`}.`, c.id);
    remember(c, S.turn, `I rode to ${name} for ${p} and brought its report home.`);
    logEvent(S, "ride", `${c.name} rode to ${name} for ${p} and brought its report home.`, [p], "ride-back");
  }
};
