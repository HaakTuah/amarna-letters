/**
 * A caught offer is a thing held (#592; the model and its reasons: `model/held-letters.ts`). Its captor holds it from
 * the season he reads it; by order he sends it on (to its claimant, who may then take the province up, or to the land's
 * king, who reads his people's own words), or asks one of them a price, which that king pays by order (buy_letter) when
 * word of the asking has reached him; the gold goes to the seller by the road, the letter to the buyer. Kept, it stands
 * only while the people lean the claimant's way (`dropOffer`).
 */
import { newHeldLetter, type HeldLetter } from "../model/held-letters.ts";
import type { BuyLetterOrder, LetterOrder } from "../model/orders.ts";
import { type Power, powerName, quoteWords } from "../model/power.ts";
import { newJourney, type Journey } from "../model/records.ts";
import { isAlive, logEvent, newId, notify } from "../model/state.ts";
import { formatMoney } from "../rules/calendar.ts";
import { upper } from "../rules/wording.ts";
import { TurnEngine } from "./core.ts";

/**
 * How a notice of a caught offer sent on reads: to the land's king "Hatti sends you the word of the people of Babili to
 * Egypt, taken on the road: "..."", to its claimant "Hatti has sent on to you the word of ..."; script kings read both.
 */
export const LetterSent = { toHolder: " sends you the word of the people of ", taken: ", taken on the road: ", toClaimant: " has sent on to you the word of " } as const;

/** What a captor is told he may do with an offer he caught, after its words. */
export const LetterHeldTerms = "You hold it: send it on to its claimant or to the king of their land, ask either a price for it, or keep it back (order letter).";

declare module "./core.ts" {
  interface TurnEngine {
    /** A captor reads a province's offer he caught on the road (`j`) and holds it. */
    holdLetter(captor: Power, j: Journey): void;
    /** The holder's order: send the offer on, or ask a price for it. */
    letterOrder(p: Power, o: LetterOrder): void;
    /** A king buys an offer whose price he was asked. */
    buyLetter(p: Power, o: BuyLetterOrder): void;
    /** The price of an offer reaches its seller. */
    letterPriceArrives(j: Journey): void;
  }
}

const P = TurnEngine.prototype;

const named = (e: TurnEngine, h: HeldLetter): string => e.map.get(h.province).name;

/** The letter goes to `to`: an offer its claimant may answer, or his own people's words to the land's king. */
function sendOn(e: TurnEngine, h: HeldLetter, from: Power, to: Power): void {
  const S = e.s;
  S.lettersHeld.splice(S.lettersHeld.indexOf(h), 1);
  const arrive = S.turn + e.travelTurns(from, to);
  if (to === h.claimant) {
    S.journeys.push(newJourney({ id: newId(S, "j"), kind: "Offer", departTurn: S.turn, arriveTurn: arrive, from, to, text: `${h.province}|${h.words}`, sentOnBy: from }));
    return;
  }
  e.word(from, to, "Realm", `Notice|A letter taken on the road|${upper(powerName(from))}${LetterSent.toHolder}${named(e, h)} to ${powerName(h.claimant)}${LetterSent.taken}${quoteWords(h.words)}`);
}

P.holdLetter = function (captor, j) {
  const S = this.s;
  const province = (j.text ?? "").split("|")[0];
  if (S.lettersHeld.some((h) => h.heldBy === captor && h.province === province && h.claimant === j.to)) return;
  S.lettersHeld.push(newHeldLetter({ province, claimant: j.to, words: (j.text ?? "").split("|").slice(1).join("|"), heldBy: captor, since: S.turn }));
};

P.letterOrder = function (p, o) {
  const S = this.s;
  const h = S.lettersHeld.find((x) => x.heldBy === p && x.province === o.province) ?? null;
  // Its leaning ended since: the letter lapsed with it (`dropOffer`).
  if (h === null || !isAlive(S, o.to)) return;
  if (o.fate === "Send") {
    sendOn(this, h, p, o.to);
    logEvent(S, "letter", `${p} sent the offer of ${named(this, h)}'s people on to ${o.to}.`, [p], o.to === h.claimant ? "letter-sent-on" : "letter-sent-holder");
    return;
  }
  h.askedOf = o.to;
  h.price = o.price;
  h.askKnown = S.turn + this.travelTurns(p, o.to);
  const whose = o.to === h.claimant ? "to you" : `to ${powerName(h.claimant)}`;
  this.word(p, o.to, "Realm", `Notice|An offer for sale|${upper(powerName(p))} holds the word of the people of ${named(this, h)} ${whose}, taken on the road, and will send it to you for ${formatMoney(o.price)} (order buy_letter for ${named(this, h)}).`);
  logEvent(S, "letter", `${p} asked ${o.to} ${formatMoney(o.price)} for the offer of ${named(this, h)}'s people.`, [p], "letter-asked");
};

P.buyLetter = function (p, o) {
  const S = this.s;
  const h = S.lettersHeld.find((x) => x.askedOf === p && x.province === o.province && x.askKnown !== null && x.askKnown <= S.turn) ?? null;
  if (h === null) {
    notify(S, p, "Rejected", "Offer not bought", `The offer of ${this.map.get(o.province).name}'s people was no longer to be had.`);
    return;
  }
  if (!this.pay(p, h.price, `the offer of ${named(this, h)}'s people`, o, "it was not bought")) return;
  S.journeys.push(newJourney({ id: newId(S, "j"), kind: "LetterPrice", departTurn: S.turn, arriveTurn: S.turn + this.travelTurns(p, h.heldBy), from: p, to: h.heldBy, gold: h.price, text: h.province }));
  logEvent(S, "letter", `${p} bought the offer of ${named(this, h)}'s people from ${h.heldBy} for ${formatMoney(h.price)}.`, [p], "letter-bought");
  sendOn(this, h, h.heldBy, p);
};

P.letterPriceArrives = function (j) {
  const S = this.s;
  if (!isAlive(S, j.to)) return;
  S.treasuries.get(j.to).gold += j.gold;
  notify(S, j.to, "Notice", "An offer sold", `${upper(powerName(j.from))} paid ${formatMoney(j.gold)} for the offer of the people of ${this.map.get(j.text ?? "").name}.`);
};
