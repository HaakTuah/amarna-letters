/**
 * Caravans carry word with their goods (#543, the owner's yes, 3 November 2026: "Yes to all, expertly!"; after item 17++
 * part D, `offers.ts`). In the period word between towns went with merchants on the trade roads: Burna-Buriash's
 * merchants travelled with his envoy, and he warns that robbers on the road will "kill again, be it a caravan of mine or
 * your own messengers" (EA 8; `docs/history/15-pirates-bandits-tolls.md`, "Merchants killed at Hinnatuna", and
 * `docs/history/09-the-letters.md`, Burna-Buriash's grievance). So a caravan or ship leaving a province for its claimant's
 * land carries the province's offer as a traveller going that way would: the claimant's own for nothing, another king's
 * only for a fee its people pay from their purse, and only where they are far gone in his favour. The offer shares the
 * caravan's road: robbed or lost, it is lost; taken by troops, their king reads it. And a caravan carries talk of a
 * province's leaning along its road: the king whose land it ends its road in hears it, as travellers' talk, by his
 * couriers from there.
 */
import { cmpStr, sortBy } from "../core/seq.ts";
import { caravanAt, type Caravan } from "../model/caravans.ts";
import { type Declaration } from "../model/declarations.ts";
import { type Power, powerName, quoteWords, whose } from "../model/power.ts";
import { newJourney, OfferCaught, offerWords, provinceOf, type Journey } from "../model/records.ts";
import { isAlive, logEvent, newId } from "../model/state.ts";
import { formatMoney } from "../rules/calendar.ts";
import { wordHomeAt } from "../rules/court.ts";
import { TurnEngine } from "./core.ts";
import { LetterHeldTerms } from "./held-letters.ts";

/** First guesses, for item 18: what a caravan's master asks a province's people to carry their offer, a season of its road. */
export const CaravanOfferData = { feePerSeason: 10 } as const;

declare module "./core.ts" {
  interface TurnEngine {
    /**
     * A waiting offer goes with a caravan standing in its province whose road ends in its claimant's land: his own for
     * nothing, else, where its people are far gone in his favour (`far`), another's for a fee from their purse. Whether one took it.
     */
    caravanTakesOffer(letter: Journey, far: boolean, only?: Caravan): boolean;
    /**
     * Before the caravans set out on the season's road, each offer waiting where one stands goes with one that may take it,
     * chosen among all of them there at once (`caravanTakesOffer`: the claimant's own first).
     */
    caravansPickUp(): void;
    /** A caravan ends its road where it stands: the offers it carries are delivered there or lost, and its talk is told. */
    caravanUnloads(c: Caravan): void;
    /** A caravan taken by a king's troops at `where`: the offers it carried are his to read, by word from there, never delivered (#553's rule). */
    caravanOffersTaken(c: Caravan, taker: Power, where: string): void;
    /** Each season, after the caravans travel: an offer whose caravan is gone was lost with it. */
    caravanOffersLost(): void;
    /** Where a caravan stands and passed this season, it hears talk of the leaning of each province that declared. */
    caravanHearsTalk(c: Caravan, places: string[]): void;
    /**
     * Talk of a province's leaning toward `claimant`, away from `holder`, as it was in season `seen`, sent to `to`, arriving
     * in season `known`; marked on its declaration while it stands, so each power hears it once (`Declaration.talked`).
     */
    talkTo(province: string, claimant: Power, holder: Power | null, to: Power, seen: number, known: number, travellers: string): void;
  }
}

const P = TurnEngine.prototype;

/** The offers a caravan carries, still on its road. */
const carried = (e: TurnEngine, c: Caravan): Journey[] => e.s.journeys.filter((j) => j.kind === "Offer" && j.caravan === c.id && j.waitAt !== null);

const noun = (c: Caravan): string => `${whose(c.power)} ${c.ship !== null ? "ship" : "caravan"}`;

P.caravanTakesOffer = function (letter, far, only) {
  const S = this.s;
  const at = letter.waitAt!;
  const p = letter.to;
  const going = sortBy(
    (only !== undefined ? [only] : S.caravans).filter((c) => caravanAt(c) === at && c.at < c.route.length - 1 && S.owner.getOrDefault(c.route[c.route.length - 1], null) === p),
    [(c: Caravan) => c.id, cmpStr],
  );
  const own = going.find((c) => c.power === p) ?? null;
  const purse = this.market(at);
  const fee = (c: Caravan): number => CaravanOfferData.feePerSeason * Math.max(1, this.travelTurnsBetween(at, c.route[c.route.length - 1]));
  const paid = own !== null || !far ? null : (going.find((c) => purse.purse >= fee(c)) ?? null);
  const c = own ?? paid;
  if (c === null) return false;
  const name = this.map.get(at).name;
  if (paid !== null) {
    // Its master's: carried home with what it brings.
    purse.purse -= fee(paid);
    paid.gold += fee(paid);
  }
  letter.caravan = c.id;
  letter.fee = 0;
  logEvent(S, "letter", `${noun(c)} took the offer of ${name}'s people to ${p}${paid !== null ? ` for ${formatMoney(fee(paid))}` : ""}.`, [], paid !== null ? "offer-caravan-paid" : "offer-caravan");
  return true;
};

P.caravanUnloads = function (c) {
  const S = this.s;
  const at = caravanAt(c);
  for (const j of carried(this, c)) {
    if (S.owner.getOrDefault(at, null) === j.to && isAlive(S, j.to)) {
      // In his land: his couriers take it on to his court from there.
      j.waitAt = null;
      j.arriveTurn = Math.max(S.turn, wordHomeAt(S, this.map, this.courtAt(j.to), at, S.turn));
      logEvent(S, "letter", `${noun(c)} brought the offer of ${this.map.get(provinceOf(j)).name}'s people into ${j.to}'s land.`, [], "offer-caravan-brought");
    } else {
      S.journeys.splice(S.journeys.indexOf(j), 1);
      logEvent(S, "letter", `The offer ${noun(c)} carried to ${j.to} went no farther than ${this.map.get(at).name}.`, [], "offer-caravan-lost");
    }
  }
  // Its talk, to the king whose land its road ends in.
  const h = this.map.get(at).isSea ? null : S.owner.getOrDefault(at, null);
  if (h === null || !isAlive(S, h)) return;
  // As the traders heard it, whatever has changed there since (`caravanHearsTalk`).
  for (const t of c.talk) {
    const [x, claimant, holder, heard] = t.split("|");
    const d = standing(this, x, claimant);
    if (d !== null && d.talked.includes(h)) continue;
    this.talkTo(x, claimant, holder === "" ? null : holder, h, Number(heard), Math.max(S.turn + 1, wordHomeAt(S, this.map, this.courtAt(h), at, S.turn)), "Traders");
    logEvent(S, "declare", `Traders carried talk of ${this.map.get(x).name}'s leaning toward ${claimant} to ${h}.`, [], "offer-talk-traders");
  }
  // Talk of a leaning since ended, which no declaration marks as told, is told once only.
  c.talk = c.talk.filter((t) => standing(this, t.split("|")[0], t.split("|")[1]) !== null);
};

/** The declaration of a province's people for `claimant`, while it stands. */
function standing(e: TurnEngine, province: string, claimant: string): Declaration | null {
  return e.s.declarations.find((d) => d.province === province && d.power === claimant && d.from === null && d.gone === null) ?? null;
}

P.caravansPickUp = function () {
  const S = this.s;
  const places = new Set(S.caravans.map(caravanAt));
  for (const letter of S.journeys.filter((j) => j.kind === "Offer" && j.waitAt !== null && places.has(j.waitAt) && j.carrier === null && j.caravan === null)) {
    if (standing(this, letter.waitAt!, letter.to) === null || !isAlive(S, letter.to)) continue;
    this.caravanTakesOffer(letter, this.offerFarGone(letter.waitAt!, letter.to));
  }
};

P.caravanOffersTaken = function (c, taker, where) {
  const S = this.s;
  for (const j of carried(this, c)) {
    S.journeys.splice(S.journeys.indexOf(j), 1);
    if (!isAlive(S, taker)) continue;
    const from = this.map.get(provinceOf(j)).name;
    if (taker === j.to) {
      // His own troops took it: he reads his people's word, as if it were brought to him.
      S.journeys.push({ ...j, waitAt: null, arriveTurn: Math.max(S.turn, wordHomeAt(S, this.map, this.courtAt(taker), where, S.turn)) });
      continue;
    }
    // By word from where it was taken, as any news from there (`tell`); he holds it from then (#592).
    this.tell(taker, where, "Notice", "A letter taken on the road", `${OfferCaught.opens}${noun(c)}${OfferCaught.people}${from} to ${powerName(j.to)}: ${quoteWords(offerWords(j))} ${LetterHeldTerms}`);
    this.holdLetter(taker, j, this.heardAt(taker, where));
    logEvent(S, "letter", `${taker} read the offer of ${from}'s people to ${j.to}, taken with ${noun(c)}.`, [taker], "offer-read");
  }
};

P.caravanOffersLost = function () {
  const S = this.s;
  for (const j of S.journeys.filter((x) => x.kind === "Offer" && x.caravan !== null && x.waitAt !== null && !S.caravans.some((c) => c.id === x.caravan))) {
    S.journeys.splice(S.journeys.indexOf(j), 1);
    logEvent(S, "letter", `The offer of ${this.map.get(provinceOf(j)).name}'s people to ${j.to} was lost with the caravan that carried it.`, [], "offer-robbed");
  }
};

P.caravanHearsTalk = function (c, places) {
  const S = this.s;
  // What they heard, kept as heard: the province, whom its people lean toward and away from, and the season.
  for (const x of places)
    for (const d of S.declarations.filter((y) => y.province === x && y.from === null && y.gone === null))
      if (!c.talk.some((t) => t.startsWith(`${x}|${d.power}|`))) c.talk.push(`${x}|${d.power}|${S.owner.getOrDefault(x, null) ?? ""}|${S.turn}`);
};

P.talkTo = function (province, claimant, holder, to, seen, known, travellers) {
  const S = this.s;
  const name = this.map.get(province).name;
  const words =
    to === claimant
      ? `${travellers} say the people of ${name} lean your way. It is talk, not their word: they offer you nothing unless someone brings it.`
      : to === holder
        ? `${travellers} say the people of ${name} lean toward ${powerName(claimant)}.`
        : `${travellers} say the people of ${name} lean toward ${powerName(claimant)}${holder !== null ? `, away from ${powerName(holder)}` : ""}.`;
  // Talk bends as it travels: its holder keeps it as a travellers' read of the land's mood, dated, no more than restless.
  if (to === holder) this.readMood({ power: to, province, mood: "restless", seen, known, source: "travellers" });
  S.journeys.push(newJourney({ id: newId(S, "j"), kind: "Word", departTurn: S.turn, arriveTurn: known, from: to, to, news: "Realm", text: `Rumor|Talk of ${name}|${words}` }));
  const d = standing(this, province, claimant);
  if (d !== null && !d.talked.includes(to)) d.talked.push(to);
};
