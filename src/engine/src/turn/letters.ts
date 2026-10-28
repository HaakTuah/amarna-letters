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
import { land, type Power } from "../model/power.ts";
import { Waiting, type Journey } from "../model/records.ts";
import { findCharacter, isAlive, logEvent, notify } from "../model/state.ts";
import { formatMoney } from "../rules/calendar.ts";
import { idNumber, TurnEngine } from "./core.ts";
import { basePrice } from "./court.ts";
import { trustIn } from "./jobs.ts";
import { reportsChoice } from "./own-choices.ts";
import { isWalker } from "./travel.ts";

/**
 * First guesses: a hired carrier asks `hiredPercent` of a season of service at the going rate for each season of road; a
 * traveller already going that way `sidePercent` of that; a letter waits `hireAfter` seasons for a traveller before the
 * spy hires one; a carrier takes it all on delivery from a court it trusts `trustOnDelivery` in a hundred or more.
 * A carrier takes every letter waiting there for the same court. With nobody to carry them for `selfAfter` seasons, the
 * spy carries them home himself.
 */
export const LetterData = { hiredPercent: 50, sidePercent: 20, hireAfter: 1, selfAfter: 2, trustOnDelivery: 60, payLoyalty: 30 } as const;

/**
 * How many seasons a spy waits for a carrier before it carries its reports home itself (Haakon's answers to item 11b: the
 * spy decides, a script spy by its traits): `selfAfter`, a season more for a brave one and for a loyal one.
 */
export const selfWait = (c: Character): number => LetterData.selfAfter + (c.traits.courage >= 60 ? 1 : 0) + (c.traits.loyalty >= 60 ? 1 : 0);

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
    // Taken already this season, with another letter waiting there for the same court.
    if (letter.carrier !== null) continue;
    if (!isAlive(S, letter.to)) {
      S.journeys.splice(S.journeys.indexOf(letter), 1);
      continue;
    }
    // A ransom demand replaced by a newer one, or lapsed, is no longer the captor's to send.
    if (letter.kind !== "SpyReport" && letter.taskId !== null && !S.tasks.some((t) => t.id === letter.taskId)) {
      S.journeys.splice(S.journeys.indexOf(letter), 1);
      continue;
    }
    const at = letter.waitAt!;
    // A report left at a watch post whose spy is gone (recalled, caught or dead), with no court there to hire a carrier
    // at: nobody keeps it, and it is lost.
    const writer = findCharacter(S, letter.characterId);
    const posted = writer !== null && writer.status === "Employed" && writer.employer === letter.to && writer.duty === "SpyPosted";
    if (!posted && courtAt(this, at) === null && S.turn - letter.departTurn >= LetterData.selfAfter) {
      S.journeys.splice(S.journeys.indexOf(letter), 1);
      logEvent(S, "letter", `A report to ${letter.to} left at ${this.map.get(at).name} was lost: nobody was there to carry it.`, [], "letter-lost");
      continue;
    }
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
    // A ransom demand (Haakon's answers to item 11b: a message someone sends, which needs a carrier) has no spy behind it:
    // it goes with whoever sets out that way, as the captor asks of them.
    const spy = letter.kind === "SpyReport" ? findCharacter(S, letter.characterId) : null;
    const demand = letter.kind !== "SpyReport";
    // The spy decides (no rule moves it): a model spy in its own request (`own-choices.ts`), the most it pays now and
    // whether it carries them itself; a script spy by its traits: one loyal enough pays from its own purse, and how long
    // it waits before carrying its reports home itself is its own, the brave and loyal waiting longest.
    const plan = spy === null ? null : reportsChoice(spy, S.turn);
    const willing = spy !== null && (plan !== null || spy.traits.loyalty >= LetterData.payLoyalty);
    const most = plan?.payUpTo ?? Number.MAX_SAFE_INTEGER;
    const waited = S.turn - letter.departTurn;
    const court = courtAt(this, at);
    const passing = passer === null ? null : findCharacter(S, passer.characterId)!;
    const side = passing === null ? 0 : idiv(basePrice(passing, letter.to) * seasons * LetterData.sidePercent, 100);
    // Haakon's answers to item 11a: a traveller carries it for a fee on delivery from a court whose standing order is to
    // pay carriers; for any other court only if the spy pays it now from its purse.
    const paysNow = own === null && passing !== null && !demand && !S.payCarriers.includes(letter.to);
    if (passing !== null && (demand || !paysNow || (willing && spy!.purse >= side && side <= most))) {
      carrier = passing;
      if (own !== null || demand) fee = 0;
      else if (paysNow) {
        spy!.purse -= side;
        spy!.earned.spent += side;
        gain(carrier, side, "News");
      } else fee = side;
    } else if (demand && court !== null && isAlive(S, court)) {
      // The captor who demands a ransom sends it: with nobody going that way, it hires a free person at its court, paying
      // the whole fee now from its treasury as part of the demand it ordered.
      const ask = (c: Character): number => idiv(basePrice(c, letter.to) * seasons * LetterData.hiredPercent, 100);
      const t = S.treasuries.get(court);
      const hire =
        sortBy(
          S.characters.filter((c) => c.status === "Free" && c.at === court && c.duty === "None" && c.heldBy === null && c.errand === null && t.gold >= ask(c)),
          [(c: Character) => ask(c), cmpNum],
          [(c: Character) => idNumber(c.id), cmpNum],
        )[0] ?? null;
      if (hire !== null) {
        t.gold -= ask(hire);
        gain(hire, ask(hire), "News");
        this.startTravel(hire, letter.to);
        remember(hire, S.turn, `The king of ${land(court)} paid me ${formatMoney(ask(hire))} to carry his word to the court of ${letter.to}.`);
        carrier = hire;
      }
    } else if (spy !== null && willing && (plan !== null || waited >= LetterData.hireAfter) && court !== null) {
      // Hired at the court where it waits: a free person standing there, half now from the spy's purse, or all of it on
      // delivery from a court whose standing order is to pay carriers and whose record of paying, as it heard it, it trusts.
      const ask = (c: Character): number => idiv(basePrice(c, letter.to) * seasons * LetterData.hiredPercent, 100);
      const trusted = (c: Character): boolean => S.payCarriers.includes(letter.to) && trustIn(S, letter.to, c) >= LetterData.trustOnDelivery;
      const nowOf = (c: Character): number => (S.payCarriers.includes(letter.to) ? Math.ceil(ask(c) / 2) : ask(c));
      const hire =
        sortBy(
          S.characters.filter((c) => c.status === "Free" && c.at === court && c.duty === "None" && c.heldBy === null && c.errand === null && (trusted(c) || (spy.purse >= ask(c) && nowOf(c) <= most))),
          [(c: Character) => ask(c), cmpNum],
          [(c: Character) => idNumber(c.id), cmpNum],
        )[0] ?? null;
      if (hire !== null) {
        // The rest on delivery only by its court's standing order; without it the spy pays it all now from its purse.
        const whole = ask(hire);
        // One who trusts the court's record takes what the spy gives now, no more than it chose to pay.
        const now = S.payCarriers.includes(letter.to) ? Math.min(spy.purse, most, Math.ceil(whole / 2)) : Math.min(spy.purse, whole);
        spy.purse -= now;
        spy.earned.spent += now;
        gain(hire, now, "News");
        fee = whole - now;
        this.startTravel(hire, letter.to);
        remember(hire, S.turn, `${spy.name} paid me ${formatMoney(now)} to carry a sealed letter to the court of ${letter.to}${fee > 0 ? ", the rest on delivery" : ""}.`);
        carrier = hire;
      }
    }
    // Nobody to carry it, long enough: the spy carries it home himself, leaving its post ("or the person himself").
    if (carrier === null && spy !== null && (plan !== null ? plan.carry : waited >= selfWait(spy)) && spy.status === "Employed" && spy.employer === letter.to && spy.duty === "SpyPosted") {
      // Its master goes on believing it at its post until it stands at court again.
      this.coverFor(spy, letter.to, "SpyPosted");
      this.recall(letter.to, spy);
      remember(spy, S.turn, `Nobody would carry my reports home from ${this.map.get(at).name}, so I set out with them myself.`);
      carrier = spy;
    }
    if (carrier === null) continue;
    letter.fee = fee;
    for (const l of waiting.filter((x) => x.carrier === null && x.waitAt === at && x.to === letter.to && (x.kind === "SpyReport") === !demand)) {
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
  // Haakon's answers to item 11a: paid on delivery only by the court's own standing order (payCarriers); else it falls
  // due, paid by order pay_fee while the carrier stands at court, or not.
  const t = S.treasuries.get(j.to);
  if (S.payCarriers.includes(j.to) && t.gold >= j.fee) {
    t.gold -= j.fee;
    gain(c, j.fee, "News");
    this.recordPay(j.to, true, j.to, c);
    return;
  }
  this.fallsDue(c, j.to, j.fee, `I carried a letter to the court of ${j.to}, and was not paid on delivery.`);
};
