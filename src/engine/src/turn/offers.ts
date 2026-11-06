/**
 * Who carries a province's offer (item 17++, part D; the owner's answer to #431, 2 November 2026: "Yes, expertly, if you
 * think it is best"; "Whom a province obeys" under War). A province declaring for a power whose troops are not there sends
 * him its offer only if someone carries it: talk of its leaning spreads at the roads' pace to him, to its holder and to the
 * holder's enemies, but the offer itself is a letter waiting in the province, as a spy's report waits ("Messengers are
 * errands"). His own spy watching it reports it with his reports; a man of his going that way carries it for nothing; and
 * only a people far gone in his favour, with the gold, pays a traveller going that way from its own purse, or a free person
 * at the court there to take it; a caravan going that way carries it too (`offer-caravans.ts`, #543). A carrier knows whom he carries for and to whom, and may sell that as news. An offer nobody carries never arrives, and fades as the people's leaning does.
 */
import { idiv } from "../core/num.ts";
import { cmpNum, cmpStr, sortBy } from "../core/seq.ts";
import { OfferUnheard, type Declaration } from "../model/declarations.ts";
import { gain, newNewsHeld, remember, type Character } from "../model/people.ts";
import { type Power, powerName, quoteWords } from "../model/power.ts";
import { upper } from "../rules/wording.ts";
import { newJourney, offerWords, provinceOf, Waiting, type Journey } from "../model/records.ts";
import { findCharacter, isAlive, logEvent, newId } from "../model/state.ts";
import { bidden } from "../model/works.ts";
import { formatMoney } from "../rules/calendar.ts";
import { idNumber, TurnEngine } from "./core.ts";
import { basePrice } from "./court.ts";
import { LetterData } from "./letters.ts";
import { sellsSecrets } from "./news.ts";
import { isWalker } from "./travel.ts";
import { LetterSent } from "./held-letters.ts";

/**
 * First guesses, for item 18: how far a people's lean toward a power must pass its holder's weight before it pays a
 * courier from its purse.
 */
export const OfferData = { farGone: 40 } as const;

declare module "./core.ts" {
  interface TurnEngine {
    /**
     * A province declares for an absent power: its offer, the people's own words (`text`), waits there for a carrier, and
     * talk of its leaning spreads.
     */
    sendOffer(d: Declaration, holder: Power | null, text: string): void;
    /** Each season, with the letters: a waiting offer finds a carrier, or waits. */
    carryOffer(letter: Journey): void;
    /** An offer reaches the court it was sent to: from then he knows it and may answer it. */
    offerArrives(j: Journey): void;
    /** A declaration ended: its offer, waiting or on the road, no longer stands. */
    dropOffer(d: Declaration): void;
    /** A carrier robbed on the road: the offers he carried are lost with what was taken. */
    offersRobbed(c: Character): void;
  }
}

const P = TurnEngine.prototype;

/** The court whose capital is a province, if any. */
function courtIn(e: TurnEngine, province: string): Power | null {
  for (const p of e.s.owner.values()) if (p !== null && isAlive(e.s, p) && e.courtAt(p) === province) return p;
  return null;
}

/**
 * A king's enemies, by the game's own marks of enmity: those whose troops stand in his land unbidden (`bidden`), and
 * those who have closed their roads to him or he to them.
 */
function enemiesOf(e: TurnEngine, holder: Power, but: Power): Set<Power> {
  const S = e.s;
  const out = new Set<Power>();
  for (const u of S.units) if (u.power !== holder && u.power !== but && S.owner.getOrDefault(u.province, null) === holder && !bidden(S, u.power, u.province, holder)) out.add(u.power);
  for (const p of S.roadsClosed.tryGet(holder) ?? []) if (p !== but) out.add(p);
  for (const [p, closed] of S.roadsClosed.entries()) if (p !== holder && p !== but && closed.includes(holder)) out.add(p);
  return new Set([...out].filter((p) => isAlive(S, p)));
}

/**
 * A carrier knows whom he carries for and to whom (the owner: "this is also information he can pass on or sell"): he
 * remembers it, and holds it as news to sell at any other court he stands at, by its king's order (`buy_news`), as anyone
 * may sell what he knows; one in the claimant's own service sells it only if he would sell his master's secrets.
 */
function knows(e: TurnEngine, c: Character, at: string, p: Power, own: boolean): void {
  const S = e.s;
  const name = e.map.get(at).name;
  remember(c, S.turn, `I carry the word of the people of ${name} to the court of ${p}: they lean his way and offer themselves to him.`);
  if (own && !sellsSecrets(c)) return;
  // One piece of news a court: added to what he holds of the claimant's court, or held on its own, telling only its lines.
  const line = `The people of ${name} lean toward ${powerName(p)} and have sent him their offer.`;
  const had = c.news.find((n) => n.court === p) ?? null;
  if (had !== null) {
    if (!had.lines.includes(line)) had.lines.push(line);
  } else c.news.push(newNewsHeld({ court: p, turn: S.turn, lines: [line], landSeen: false }));
  logEvent(S, "letter", `${c.name} knows of the offer he carries, and may sell it.`, [], "offer-news");
}

/** What the power an offer reaches is told of answering it, after the people's words (the rulebook has the rest). */
export const OfferTerms = "Take it up or refuse it (order take_up_province or refuse_province).";

P.sendOffer = function (d, holder, text) {
  const S = this.s;
  const name = this.map.get(d.province).name;
  d.known = OfferUnheard;
  S.journeys.push(newJourney({ id: newId(S, "j"), kind: "Offer", departTurn: S.turn, arriveTurn: Waiting, from: holder ?? d.power, to: d.power, waitAt: d.province, text: `${d.province}|${text}` }));
  logEvent(S, "declare", `The people of ${name} would send to ${d.power}.`, [], "offer-sent");
  // Talk of it: to the power it leans to, to its holder, and to its holder's enemies, at the roads' pace from there
  // (`talkTo`); caravans carry it farther (`offer-caravans.ts`).
  const near = holder === null ? new Set<Power>() : enemiesOf(this, holder, d.power);
  const told = [d.power, ...(holder !== null && isAlive(S, holder) ? [holder] : []), ...sortBy([...near], [(x: Power) => x, cmpStr])];
  for (const p of told) {
    const seasons = this.travelTurnsBetween(d.province, this.courtAt(p));
    this.talkTo(d, holder, p, S.turn + 1 + (Number.isFinite(seasons) ? seasons : 1), "Travellers");
  }
  logEvent(S, "declare", `Talk of ${name}'s leaning toward ${d.power} spread.`, [], "offer-talk");
};

P.dropOffer = function (d) {
  const S = this.s;
  // On the road too, so a letter of an ended offer never stands for a later one from the same people.
  S.journeys = S.journeys.filter((j) => !(j.kind === "Offer" && j.to === d.power && provinceOf(j) === d.province));
  // And caught and held (#592): a letter of a leaning that ended is worth nothing.
  S.lettersHeld = S.lettersHeld.filter((h) => !(h.claimant === d.power && h.province === d.province));
};

P.offersRobbed = function (c) {
  const S = this.s;
  for (const j of S.journeys.filter((x) => x.kind === "Offer" && x.carrier === c.id)) {
    S.journeys.splice(S.journeys.indexOf(j), 1);
    logEvent(S, "letter", `The offer ${c.name} carried to ${j.to} was taken from him on the road.`, [], "offer-robbed");
  }
};

P.carryOffer = function (letter) {
  const S = this.s;
  const at = letter.waitAt!;
  const p = letter.to;
  const d = S.declarations.find((x) => x.province === at && x.power === p && x.gone === null && x.from === null) ?? null;
  if (d === null || !isAlive(S, p)) {
    S.journeys.splice(S.journeys.indexOf(letter), 1);
    return;
  }
  // His own spy watching it reports it with his reports: it goes with their carrier, whoever that is.
  // Only while that carrier is still there: at the court in the province, or setting out from it.
  const here = (id: string | null): boolean => {
    const c = findCharacter(S, id);
    if (c === null) return false;
    const walk = S.journeys.find((j) => isWalker(j) && j.characterId === c.id) ?? null;
    return walk !== null ? walk.route[walk.leg] === at : c.at !== null && this.courtAt(c.at) === at;
  };
  const report = S.journeys.find((j) => j.kind === "SpyReport" && j.waitAt === at && j.to === p && j.carrier !== null && here(j.carrier)) ?? null;
  if (report !== null) {
    letter.carrier = report.carrier;
    letter.border = report.border;
    const c = findCharacter(S, report.carrier);
    if (c !== null) knows(this, c, at, p, c.employer === p);
    logEvent(S, "letter", `The offer of ${this.map.get(at).name}'s people went to ${p} with its spy's reports.`, [], "offer-spy");
    return;
  }
  const home = this.courtAt(p);
  const seasons = Math.max(1, this.travelTurnsBetween(at, home));
  const understood = (c: Character | null): boolean => c !== null && this.reach(c.tongues, p, c.id).skill > 0;
  const going = sortBy(
    S.journeys.filter((j) => isWalker(j) && j.kind !== "CaptiveConvoy" && j.route.length > 1 && j.route[j.leg] === at && j.route[j.route.length - 1] === home && j.characterId !== null && understood(findCharacter(S, j.characterId))),
    [(j: Journey) => idNumber(j.id), cmpNum],
  ).map((j) => findCharacter(S, j.characterId)!);
  // A man whose stakes it serves carries it for nothing: one in his service, one his grant made what he is, or one whose
  // sympathy lies with his court.
  const own = going.find((c) => c.status !== "Captured" && (c.employer === p || c.grantedBy === p || c.traits.sympathy === p)) ?? null;
  const holder = S.owner.getOrDefault(at, null);
  const purse = this.market(at);
  const far = this.weightIn(at, p) >= (holder !== null && isAlive(S, holder) ? this.weightIn(at, holder) : 0) + OfferData.farGone;
  // #543: else a caravan going from there to his land, his own for nothing, another's for a fee where they are far gone.
  if (own === null && this.caravanTakesOffer(letter, far)) return;
  let carrier: Character | null = own;
  let how = "offer-own";
  if (carrier === null && far) {
    // Paid from its people's purse: a traveller going that way his side fee, else a free person at the court there his
    // fee for the whole journey.
    const side = (c: Character): number => idiv(basePrice(c, p) * seasons * LetterData.sidePercent, 100);
    const passer = going.find((c) => c.status !== "Captured" && purse.purse >= side(c)) ?? null;
    if (passer !== null) {
      purse.purse -= side(passer);
      gain(passer, side(passer), "News");
      remember(passer, S.turn, `The people of ${this.map.get(at).name} paid me ${formatMoney(side(passer))} to carry their word to the court of ${p} on my way.`);
      carrier = passer;
      how = "offer-paid";
    } else {
      const court = courtIn(this, at);
      const ask = (c: Character): number => idiv(basePrice(c, p) * seasons * LetterData.hiredPercent, 100);
      const hire =
        court === null
          ? null
          : (sortBy(
              S.characters.filter((c) => c.status === "Free" && c.at === court && c.duty === "None" && c.heldBy === null && c.errand === null && purse.purse >= ask(c) && understood(c)),
              [(c: Character) => ask(c), cmpNum],
              [(c: Character) => idNumber(c.id), cmpNum],
            )[0] ?? null);
      if (hire !== null) {
        purse.purse -= ask(hire);
        gain(hire, ask(hire), "News");
        this.startTravel(hire, p);
        remember(hire, S.turn, `The people of ${this.map.get(at).name} paid me ${formatMoney(ask(hire))} to carry their word to the court of ${p}.`);
        carrier = hire;
        how = "offer-hired";
      }
    }
  }
  if (carrier === null) return;
  letter.carrier = carrier.id;
  letter.fee = 0;
  logEvent(S, "letter", `${carrier.name} took the offer of ${this.map.get(at).name}'s people to ${p}.`, [], how);
  knows(this, carrier, at, p, how === "offer-own");
};

P.offerArrives = function (j) {
  const S = this.s;
  const province = provinceOf(j);
  const d = S.declarations.find((x) => x.province === province && x.power === j.to && x.gone === null && x.from === null) ?? null;
  if (d === null || !isAlive(S, j.to)) return;
  d.known = S.turn;
  const c = findCharacter(S, j.carrier);
  const people = `the people of ${this.map.get(province).name}`;
  const by =
    j.sentOnBy !== null
      ? `${upper(powerName(j.sentOnBy))}${LetterSent.toClaimant}${people}, which it took on the road`
      : c !== null
        ? `${c.name} has brought you the word of ${people}`
        : j.caravan !== null
          ? `Traders have brought you the word of ${people}`
          : `${upper(people)} send you their word`;
  notify(this, j.to, `${by}: ${quoteWords(offerWords(j))} ${OfferTerms}`);
  logEvent(S, "declare", `The offer of ${this.map.get(province).name}'s people reached ${j.to}.`, [j.to], "offer-arrived");
};

function notify(e: TurnEngine, p: Power, text: string): void {
  e.tell(p, e.courtAt(p), "Notice", "A province looks to you", text);
}
