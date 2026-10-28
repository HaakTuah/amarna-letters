/**
 * Letters from abroad need a carrier (build order item 11b, "Messengers are errands", "No faceless channel"): a spy's
 * report written at a foreign court or a watch post abroad waits there until someone carries it home: one of its master's
 * own people going that way (for nothing), a traveller going that way (a small fee from its master on delivery, "Side
 * jobs on the road"), or, after a season, a free person at that court hired for the journey, half now from the spy's purse
 * and the rest from its master on delivery ("Paid on delivery"). The letter shares its carrier's road: lost if he is
 * robbed or killed, read by whoever catches him. Inside its master's own land the realm's couriers carry it, as before.
 */
import { idiv } from "../core/num.ts";
import { cmpNum, sortBy } from "../core/seq.ts";
import { gain, remember, type Character } from "../model/people.ts";
import type { Power } from "../model/power.ts";
import { Waiting, type Journey } from "../model/records.ts";
import { findCharacter, isAlive, logEvent, notify } from "../model/state.ts";
import { formatMoney } from "../rules/calendar.ts";
import { idNumber, TurnEngine } from "./core.ts";
import { basePrice } from "./court.ts";
import { trustIn } from "./jobs.ts";
import { isWalker } from "./travel.ts";

/**
 * First guesses: a hired carrier asks `hiredPercent` of a season of service at the going rate for each season of road; a
 * traveller already going that way `sidePercent` of that; a letter waits `hireAfter` seasons for a traveller before the
 * spy hires one; a carrier takes it all on delivery from a court it trusts `trustOnDelivery` in a hundred or more.
 * A carrier takes every letter waiting there for the same court. With nobody to carry them for `selfAfter` seasons, the
 * spy carries them home himself.
 */
export const LetterData = { hiredPercent: 50, sidePercent: 20, hireAfter: 1, selfAfter: 2, trustOnDelivery: 60 } as const;

declare module "./core.ts" {
  interface TurnEngine {
    /** Each season, before the travellers move: waiting letters find carriers. */
    carryLetters(): void;
    /** Each season, after the travellers moved: letters go with their carriers, or share their fate. */
    lettersGo(): void;
    /** A letter reaches the court it was written to: its carrier is paid the rest. */
    letterDelivered(j: Journey): void;
  }
}

const P = TurnEngine.prototype;

/** The court whose capital is a province, if any. */
function courtAt(engine: TurnEngine, province: string): Power | null {
  for (const p of engine.s.owner.values()) if (p !== null && isAlive(engine.s, p) && engine.map.capital(p).id === province) return p;
  return null;
}

P.carryLetters = function () {
  const S = this.s;
  const waiting = sortBy(
    S.journeys.filter((j) => j.waitAt !== null && j.carrier === null),
    [(j: Journey) => idNumber(j.id), cmpNum],
  );
  for (const letter of waiting) {
    if (!isAlive(S, letter.to)) {
      S.journeys.splice(S.journeys.indexOf(letter), 1);
      continue;
    }
    const at = letter.waitAt!;
    const home = this.map.capital(letter.to).id;
    const seasons = Math.max(1, this.travelTurnsBetween(at, home));
    // Travellers setting out from here for its master's capital.
    const going = sortBy(
      S.journeys.filter((j) => isWalker(j) && j.kind !== "CaptiveConvoy" && j.route.length > 1 && j.route[j.leg] === at && j.route[j.route.length - 1] === home && j.characterId !== null),
      [(j: Journey) => idNumber(j.id), cmpNum],
    );
    const own = going.find((j) => findCharacter(S, j.characterId)?.employer === letter.to) ?? null;
    const passer = own ?? going.find((j) => findCharacter(S, j.characterId)?.status !== "Captured") ?? null;
    let carrier: Character | null = null;
    let fee = 0;
    const spy = findCharacter(S, letter.characterId);
    const waited = S.turn - letter.departTurn;
    const court = courtAt(this, at);
    if (passer !== null) {
      carrier = findCharacter(S, passer.characterId)!;
      fee = own !== null ? 0 : idiv(basePrice(carrier, letter.to, S.goingRate) * seasons * LetterData.sidePercent, 100);
    } else if (spy !== null && waited >= LetterData.hireAfter && court !== null) {
      // Hired at the court where it waits: a free person standing there, half now from the spy's purse, or all of it on
      // delivery from a court whose record of paying the carrier trusts.
      const ask = (c: Character): number => idiv(basePrice(c, letter.to, S.goingRate) * seasons * LetterData.hiredPercent, 100);
      const trusted = trustIn(S, letter.to) >= LetterData.trustOnDelivery;
      const hire =
        sortBy(
          S.characters.filter((c) => c.status === "Free" && c.at === court && c.duty === "None" && c.heldBy === null && c.errand === null && (trusted || spy.purse >= Math.ceil(ask(c) / 2))),
          [(c: Character) => ask(c), cmpNum],
          [(c: Character) => idNumber(c.id), cmpNum],
        )[0] ?? null;
      if (hire !== null) {
        const whole = ask(hire);
        const now = Math.min(spy.purse, Math.ceil(whole / 2));
        spy.purse -= now;
        spy.earned.spent += now;
        gain(hire, now, "News");
        fee = whole - now;
        this.startTravel(hire, letter.to);
        remember(hire, S.turn, `${spy.name} paid me ${formatMoney(now)} to carry a sealed letter to the court of ${letter.to}, the rest on delivery.`);
        carrier = hire;
      }
    }
    // Nobody to carry it, long enough: the spy carries it home himself, leaving its post ("or the person himself").
    if (carrier === null && spy !== null && waited >= LetterData.selfAfter && spy.status === "Employed" && spy.employer === letter.to && spy.duty === "SpyPosted") {
      // Its master goes on believing it at its post until it stands at court again.
      this.coverFor(spy, letter.to, "SpyPosted");
      this.recall(letter.to, spy);
      remember(spy, S.turn, `Nobody would carry my reports home from ${this.map.get(at).name}, so I set out with them myself.`);
      carrier = spy;
    }
    if (carrier === null) continue;
    letter.fee = fee;
    for (const l of waiting.filter((x) => x.carrier === null && x.waitAt === at && x.to === letter.to)) {
      l.carrier = carrier.id;
      S.lettersCarried.set(l.from, S.lettersCarried.getOrDefault(l.from, 0) + 1);
      S.lettersWaited.set(l.from, S.lettersWaited.getOrDefault(l.from, 0) + (S.turn - l.departTurn));
    }
    logEvent(S, "letter", `${carrier.name} took a letter from ${this.map.get(at).name} for ${letter.to}${fee > 0 ? ` for ${formatMoney(fee)} on delivery` : ""}.`, [], carrier === spy ? "carrier-self" : passer === null ? "carrier-hired" : own !== null ? "carrier-own" : "carrier-passing");
  }
};

P.lettersGo = function () {
  const S = this.s;
  for (const letter of S.journeys.filter((j) => j.waitAt !== null && j.carrier !== null)) {
    const c = findCharacter(S, letter.carrier);
    const walk = c === null ? null : (S.journeys.find((j) => isWalker(j) && j.characterId === c.id) ?? null);
    const home = this.map.capital(letter.to).id;
    if (walk !== null && walk.route[walk.route.length - 1] === home) {
      letter.arriveTurn = walk.arriveTurn;
      continue;
    }
    if (c !== null && c.at === letter.to) {
      letter.arriveTurn = S.turn;
      continue;
    }
    S.journeys.splice(S.journeys.indexOf(letter), 1);
    if (c !== null && c.status === "Captured" && c.heldBy !== null && c.heldBy !== letter.to && letter.report !== null) {
      // Whoever caught the carrier reads what it carried ("The carrier can be intercepted").
      const spy = findCharacter(S, letter.characterId);
      notify(S, c.heldBy, "Notice", "A letter taken on the road", `Among what ${c.name} carried was a sealed report to ${letter.to} from ${spy?.name ?? "an agent"}, written in season ${letter.departTurn}: ${letter.report.observations.join(" ")}`, spy?.id ?? null);
      logEvent(S, "letter", `${c.heldBy} read a report to ${letter.to} taken from ${c.name}.`, [c.heldBy], "letter-read");
    } else logEvent(S, "letter", `A letter to ${letter.to} was lost on the road with ${c?.name ?? "its carrier"}.`, [], "letter-lost");
  }
};

P.letterDelivered = function (j) {
  const S = this.s;
  const c = findCharacter(S, j.carrier);
  if (c === null || j.fee <= 0 || c.status === "Dead") return;
  const t = S.treasuries.get(j.to);
  const paid = Math.min(j.fee, Math.max(0, t.gold));
  t.gold -= paid;
  gain(c, paid, "News");
  this.recordPay(j.to, paid >= j.fee);
};
