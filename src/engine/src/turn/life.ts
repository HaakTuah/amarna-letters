/**
 * A life of their own (build order item 11a): each season a character with something to decide decides it for itself, a
 * script by formula and a model by its own judgement: where to go, whether to seek service or work for itself ("Working
 * for oneself"), its hoard, what it offers to lend the king where it stands, one approach to someone in the same place
 * and its answers to approaches made to it ("Characters deal with each other"), quitting, and an errand's gold. Free
 * people travel on their own way between courts, to volunteer where kings are hiring ("Hiring as a negotiation").
 */
import { clamp } from "../core/num.ts";
import { cmpNum, count, sortBy, sum } from "../core/seq.ts";
import { BandData } from "../model/bands.ts";
import { Dict } from "../core/collections.ts";
import { needOf, priceAt } from "../model/economy.ts";
import { newApproachSeen, newCourtSeen, newDebtSeen, newLifeView, newPersonHere, type LifeChoice, type LifeView } from "../model/life.ts";
import { debtLeft, isPowerParty, MoneyData, newApproach, newErrand, type Approach, type Debt } from "../model/money.ts";
import { newMindRequest } from "../model/exchanges.ts";
import { gain, hiddenAt, lossesHeardOf, newFact, remember, type Character } from "../model/people.ts";
import { AllPowers, land, type Power } from "../model/power.ts";
import { newJourney, type Journey } from "../model/records.ts";
import { alive, findCharacter, isAlive, logEvent, newId, notify } from "../model/state.ts";
import { formatMoney } from "../rules/calendar.ts";
import { ageBand, bandWords } from "../rules/ending.ts";
import { chooseStrategy } from "../rules/strategy.ts";
import { idNumber, TurnEngine } from "./core.ts";
import { tongueClaims } from "./languages.ts";
import { askingPrice } from "./court.ts";
import { recordKnown, restOf, trustIn } from "./jobs.ts";
import { strangerAt } from "./names.ts";

declare module "./core.ts" {
  interface TurnEngine {
    lifeRequests(): void;
    wantsLife(c: Character): boolean;
    lifeView(c: Character): LifeView;
    applyLife(c: Character, ch: LifeChoice): void;
    deal(a: Approach): boolean;
    deliverErrand(c: Character, deliver: boolean): void;
    startTravel(c: Character, to: Power, asName?: string | null, fromProvince?: string | null): void;
    travellerArrives(j: Journey): void;
  }
}

const P = TurnEngine.prototype;

/** The ending in words, as every seat is told it ("What kings are told"; characters from item 11a). */
export function endingWords(openAge: boolean, median: number): string {
  return openAge
    ? "This is an open age: it has no end. It goes on season after season until one kingdom is left or the table stops it."
    : `${bandWords(ageBand(median))} Nobody knows which season is the last, and nothing anyone sees foretells it.`;
}

/**
 * A court's land against its start, in percent, as anyone can reckon it from who holds what (the land standings): the
 * yield of the land it holds over its homeland's. Never its strength, which counts its private treasury.
 */
function landRatio(e: TurnEngine, p: Power): number {
  let now = 0;
  let start = 0;
  for (const x of e.map.provinces) {
    if (x.isSea) continue;
    if (e.s.owner.getOrDefault(x.id, null) === p) now += x.yield;
    if (x.home === p) start += x.yield;
  }
  return start <= 0 ? 0 : Math.round((100 * now) / start);
}

/** What a party's record of paying is, for a court or a person. */
/** A party's record of paying as a person has heard it (Haakon's answers to item 11a: records travel as news). */
const recordOf = (e: TurnEngine, party: string, c: Character): { kept: number; broken: number; keptAged: number; brokenAged: number } => {
  const r = recordKnown(e.s, party, c);
  const w = recordKnown(e.s, party, c, true);
  // In tenths, rounded up: talk heard, however old, never counts for nothing.
  return { kept: Math.round(r.kept), broken: Math.round(r.broken), keptAged: Math.ceil(w.kept * 10 - 1e-9), brokenAged: Math.ceil(w.broken * 10 - 1e-9) };
};

/** Where a debt tablet lies, in words for its holder. */
function keptWords(d: Debt): string {
  switch (d.kept) {
    case "Person":
      return "on your person";
    case "Hoard":
      return "in your hoard";
    case "Archive":
      return d.holder !== null ? `in the archive of ${d.holder}` : "missing";
    default:
      return "missing";
  }
}

/**
 * Who decides a season of its own: anyone free and standing at a court, anyone an approach waits for, anyone on an errand
 * at a court, and a servant at its master's court with no task every third season (staggered by person) or when its master
 * owes it a fee. Nobody held, travelling, on a king's errand abroad or dead: they have their hands full.
 */
P.wantsLife = function (c) {
  const S = this.s;
  // Haakon's answers to item 11a: characters deal wherever they share a province, so a free traveller answers an
  // approach on the road.
  if (c.at === null && c.status === "Free" && c.duty === "Travelling" && c.heldBy === null) return S.approaches.some((a) => a.to === c.id && a.accepted === null);
  if (c.status === "Dead" || c.status === "Captured" || c.heldBy !== null || c.at === null || c.duty !== "None" || hiddenAt(c, c.at)) return false;
  if (S.approaches.some((a) => a.to === c.id && a.accepted === null)) return true;
  if (c.errand !== null) return true;
  // Characters sleep like kings: a free person decides when it has just arrived, when it has waited long enough, and otherwise every third season (staggered by person).
  const turn = (S.turn + idNumber(c.id)) % 3 === 0;
  if (c.status === "Free")
    return turn || c.lastLife === null || c.waited === MoneyData.patience;
  if (c.status === "Employed" && c.at === c.employer) return turn || c.owed.getOrDefault(c.employer, 0) > 0;
  return false;
};

/** Each season, after the jobs done: a request for every character with a season of its own to decide. */
P.lifeRequests = function () {
  const S = this.s;
  for (const c of sortBy(
    S.characters.filter((c) => this.wantsLife(c)),
    [(c: Character) => idNumber(c.id), cmpNum],
  )) {
    // Its strategy follows its traits as they are now ("When his traits drift, his strategy is rewritten with them").
    chooseStrategy(c);
    this.mindRequests.push(newMindRequest({ id: newId(S, "r"), task: "Life", characterId: c.id, court: c.employer ?? c.at, life: this.lifeView(c) }));
    c.lastLife = S.turn;
  }
};

/** What a character knows of its own situation, from where it stands. */
P.lifeView = function (c) {
  const S = this.s;
  const Map = this.map;
  // On the road, it reckons from the court it set out for.
  const here = c.at ?? S.journeys.find((j) => j.kind === "Travel" && j.characterId === c.id)?.to ?? c.formerEmployer ?? alive(S)[0];
  const province = this.provinceOf(c);
  const grainAt = (p: Power): number => {
    const cap = Map.get(this.courtAt(p));
    return priceAt(this.market(cap.id).stock, needOf(cap));
  };
  const guest = c.status === "Employed" && c.at === c.employer;
  const k = c.contract;
  const courts = alive(S).map((p) => {
    const r = recordOf(this, p, c);
    const heard = lossesHeardOf(c, p);
    return newCourtSeen({
      court: p,
      travel: p === here ? 0 : this.travelTurnsBetween(this.courtAt(here), this.courtAt(p)),
      hiring: S.hiring.tryGet(p) ?? null,
      trust: trustIn(S, p, c),
      kept: r.kept,
      broken: r.broken,
      keptAged: r.keptAged,
      brokenAged: r.brokenAged,
      // Item 11b: as it heard of them, news that travels with people.
      executions: heard.killed,
      lost: heard.lost,
      seized: heard.seized,
      grain: grainAt(p),
      growth: landRatio(this, p),
      besieged: this.capitalSiege(p) !== null,
      ask: askingPrice(c, p),
      stranger: strangerAt(c, p),
    });
  });
  const debtSeen = (d: Debt, other: string): ReturnType<typeof newDebtSeen> =>
    newDebtSeen({ id: d.id, other: this.partyName(other), otherId: other, left: debtLeft(d), dueTurn: d.dueTurn, kept: keptWords(d) });
  const e = c.errand;
  return newLifeView({
    turn: S.turn,
    at: here,
    free: c.status === "Free",
    employer: c.employer,
    jobUntil: k?.untilTurn ?? null,
    restDue: k === null ? 0 : restOf(k),
    payOnDone: k?.payOnDone ?? false,
    seeking: c.seeking,
    waited: c.waited,
    purse: c.purse,
    hoard: c.hoard,
    lendOffer: c.lendOffer,
    living: guest ? 0 : Math.ceil((MoneyData.living * grainAt(here)) / 100),
    heardRate: c.heardRate,
    courts,
    // An invented name, for a court that knows nothing of it (item 10's "Declaring a name", given on arrival since item 11a+).
    alias: courts.some((k) => k.stranger) ? (this.aliasesFor(c, courts.find((k) => k.stranger)!.court)[0] ?? null) : null,
    held: S.debts.filter((d) => d.ended === null && d.holder === c.id).map((d) => debtSeen(d, d.borrower)),
    // Who holds a tablet it owes on, as far as it can know: one standing here, else the lender it sealed it with.
    owes: S.debts
      .filter((d) => d.ended === null && d.borrower === c.id)
      .map((d) => {
        // A king whose archive holds the tablet is its holder where he holds court.
        if (d.holder !== null && isPowerParty(d.holder) && d.holder === c.at) return debtSeen(d, d.holder);
        const h = d.holder !== null && !isPowerParty(d.holder) ? findCharacter(S, d.holder) : null;
        return debtSeen(d, h !== null && this.provinceOf(h) === province && h.status !== "Dead" ? h.id : d.lender);
      }),
    owedFees: AllPowers.filter((p) => c.owed.getOrDefault(p, 0) > 0).map((p) => ({ court: p, amount: c.owed.get(p) })),
    here: sortBy(
      S.characters.filter((x) => x !== c && province !== null && this.provinceOf(x) === province && x.status !== "Dead" && x.heldBy === null && (x.at === null || !hiddenAt(x, x.at))),
      [(x: Character) => idNumber(x.id), cmpNum],
    ).map((x) => {
      const r = recordOf(this, x.id, c);
      // Item 12: whom it can make itself understood to this season, settled before any model is called, and through whom.
      const understood = this.understands(c, x);
      const g = understood ? null : this.bridgeFor(c, x);
      return newPersonHere({ id: x.id, name: x.name, standing: x.status === "Free" ? "free" : x.employer !== null ? `serving ${x.employer}` : x.status.toLowerCase(), kept: r.kept, broken: r.broken, keptAged: r.keptAged, brokenAged: r.brokenAged, understood, through: g?.name ?? null, throughPrice: g?.bridgePrice ?? null });
    }),
    approaches: S.approaches
      .filter((a) => a.to === c.id && a.accepted === null)
      .map((a) =>
        newApproachSeen({ id: a.id, from: a.from, fromName: findCharacter(S, a.from)?.name ?? a.from, words: a.words, giveGold: a.giveGold, askGold: a.askGold, giveDebts: [...a.giveDebts], askDebts: [...a.askDebts], repay: a.repay, seasons: a.seasons, collect: a.collect, fee: a.fee, payOnDone: a.payOnDone }),
      ),
    errand:
      e === null
        ? null
        : { employer: e.employer, employerName: findCharacter(S, e.employer)?.name ?? e.employer, debtId: e.debtId, borrower: S.debts.find((d) => d.id === e.debtId)?.borrower ?? "", collected: e.collected, home: e.home, since: e.since, reached: e.reached, payOnDone: e.payOnDone },
    offers: AllPowers.filter((p) => c.offers.has(p)).map((p) => ({ court: p, rate: c.offers.get(p) })),
    ending: endingWords(S.config.openAge, S.config.endMedian),
    leftRoad: c.leftRoad,
    tongues: tongueClaims(c),
    bridgePrice: c.bridgePrice,
    // Item 11b: crowds it could gather into a band, where it stands and next door.
    crowds: c.status !== "Free"
      ? []
      : [this.courtAt(here), ...Map.neighbors(this.courtAt(here))]
          .filter((x) => !Map.get(x).isSea && this.peopleOf(x).loose >= BandData.gatherLoose)
          .map((x) => ({ province: x, name: Map.get(x).name, loose: this.peopleOf(x).loose, band: sum(this.bandsAt(x), (b) => b.men) })),
  });
};

/** Its choices, applied at once, in the order the requests were made. */
P.applyLife = function (c, ch) {
  const S = this.s;
  if (c.status === "Dead" || c.heldBy !== null) return;
  // A traveller on the road only answers the approaches waiting for it.
  if (c.at === null && c.duty !== "Travelling") return;
  // Answers first: an approach it accepts is dealt now, if both are still here and have what was offered.
  for (const a of sortBy(
    S.approaches.filter((a) => a.to === c.id && a.accepted === null && a.turn < S.turn),
    [(a: Approach) => idNumber(a.id), cmpNum],
  )) {
    if (ch.accept.includes(a.id) && this.deal(a)) continue;
    a.accepted = false;
    const from = findCharacter(S, a.from);
    if (from !== null) remember(from, S.turn, `${c.name} ${ch.accept.includes(a.id) ? "agreed to my offer, but it could not be done" : "refused my offer"}.`);
  }
  if (c.at === null) return;
  // A servant quits: its job broken, which is recorded, and its master hears of it.
  if (ch.quit && c.status === "Employed" && c.at === c.employer && c.duty === "None") {
    const emp = c.employer!;
    c.facts.push(newFact({ id: newId(S, "f"), text: `Left the service of ${land(emp)} before the job was done.`, secrecy: "Public", tag: "quit" }));
    c.reputation.set(emp, c.reputation.getOrDefault(emp, 0) - 20);
    this.recordPay(c.id, false, emp);
    remember(c, S.turn, `I left the service of ${land(emp)}${c.owed.getOrDefault(emp, 0) > 0 ? ", which owes me a fee it did not pay" : ""}.`);
    this.quit(c, `${c.name} has left your service before the job was done${c.owed.getOrDefault(emp, 0) > 0 ? ", owed a fee you did not pay" : ""}.`);
    c.formerEmployer = emp;
    c.at = emp;
    logEvent(S, "quit", `${c.name} quit the service of ${emp}.`, [emp], "quit");
  }
  // Debts it repays, to holders in the same province, or to the king whose archive holds the tablet, at his court.
  for (const id of ch.repay) {
    const d = S.debts.find((x) => x.id === id && x.ended === null && x.borrower === c.id) ?? null;
    if (d === null || d.holder === null || c.purse < debtLeft(d)) continue;
    const left = debtLeft(d);
    if (isPowerParty(d.holder)) {
      if (d.holder !== c.at || !isAlive(S, d.holder)) continue;
      c.purse -= left;
      c.earned.spent += left;
      this.payDebt(d, c.id, left);
      remember(c, S.turn, `I repaid the king of ${land(d.holder)} the ${formatMoney(left)} I owed.`);
      notify(S, d.holder, "Notice", "A debt repaid to you", `${c.name} repaid you ${formatMoney(left)} on debt ${d.id}, the tablet you held; it is theirs again.`, c.id);
      logEvent(S, "character-repaid", `${c.name} repaid ${d.holder}.`, [d.holder], "character-repaid");
      continue;
    }
    const h = findCharacter(S, d.holder);
    if (h === null || this.provinceOf(h) !== this.provinceOf(c) || h.status === "Dead" || h.heldBy !== null) continue;
    c.purse -= left;
    c.earned.spent += left;
    this.payDebt(d, c.id, left);
    remember(c, S.turn, `I repaid ${h.name} the ${formatMoney(left)} I owed.`);
    remember(h, S.turn, `${c.name} repaid me ${formatMoney(left)}.`);
    logEvent(S, "character-repaid", `${c.name} repaid ${h.name}.`, [], "character-repaid");
  }
  // Back from an errand: it hands over to its employer if it finds it here; one that moved on is followed to where it is.
  if (c.errand !== null && c.errand.home === c.at && (c.errand.collected > 0 || c.errand.reached || S.debts.find((d) => d.id === c.errand!.debtId)?.ended !== null)) {
    const emp = findCharacter(S, c.errand.employer);
    if (emp !== null && emp.status !== "Dead" && emp.heldBy === null && emp.at !== null && emp.at !== c.at && isAlive(S, emp.at)) c.errand.home = emp.at;
    else this.deliverErrand(c, ch.deliver);
  }
  // Its hoard, kept with a temple or merchant house in the city where it stands: one city only.
  if (ch.hoard > 0 && c.purse > 0 && isAlive(S, c.at) && (c.hoard === null || c.hoard.at === c.at)) {
    const amount = Math.min(ch.hoard, c.purse);
    c.purse -= amount;
    c.hoard = { at: c.at, gold: (c.hoard?.gold ?? 0) + amount };
    // The tablets it holds go into the hoard with the gold, all but one it carries on an errand.
    for (const d of S.debts.filter((d) => d.ended === null && d.holder === c.id && d.kept === "Person" && d.id !== c.errand?.debtId)) d.kept = "Hoard";
    logEvent(S, "hoard", `${c.name} put ${amount} into a hoard at ${c.at}.`, [], "hoard");
  } else if (ch.hoard < 0 && c.hoard !== null && c.hoard.at === c.at) {
    const amount = Math.min(-ch.hoard, c.hoard.gold);
    c.hoard.gold -= amount;
    c.purse += amount;
    if (c.hoard.gold <= 0) {
      c.hoard = null;
      for (const d of S.debts.filter((d) => d.ended === null && d.holder === c.id && d.kept === "Hoard")) d.kept = "Person";
    }
  }
  // What it offers to lend the king where it stands, from what it carries.
  const l = ch.lend;
  c.lendOffer = l !== null && l.amount > 0 && c.purse > 0 ? { amount: Math.min(l.amount, c.purse), perHundred: clamp(l.perHundred, 0, 200), seasons: clamp(l.seasons, 1, 30) } : null;
  if (c.status === "Free") {
    c.seeking = ch.seek;
    c.waited = c.seeking ? c.waited + 1 : 0;
  }
  // One approach a season, to someone in the same province (Haakon's answers to item 11a: "characters deal wherever they
  // share a province").
  const m = ch.approach;
  if (m !== null) {
    const to = findCharacter(S, m.to);
    const there = to !== null && to !== c && this.provinceOf(to) === this.provinceOf(c) && to.status !== "Dead" && to.heldBy === null && (to.at === null || !hiddenAt(to, to.at));
    // Item 12: words pass only between people who understand each other, or through a go-between paid for each message.
    const heard = there && (this.understands(c, to!) || this.bridgeTo(c, to!));
    if (there && !heard) remember(c, S.turn, `I could not make ${to!.name} understand me, and found nobody here to carry my words.`);
    else if (to !== null && there) {
      const a = newApproach({
        id: newId(S, "h"),
        from: c.id,
        to: to.id,
        turn: S.turn,
        words: m.words.slice(0, 600),
        giveGold: Math.max(0, m.giveGold),
        askGold: Math.max(0, m.askGold),
        giveDebts: [...m.giveDebts],
        askDebts: [...m.askDebts],
        repay: Math.max(0, m.repay),
        seasons: clamp(m.seasons, 0, 30),
        collect: m.collect,
        fee: Math.max(0, m.fee),
        payOnDone: m.payOnDone === true,
      });
      S.approaches.push(a);
      remember(c, S.turn, `I approached ${to.name}${a.words !== "" ? `: "${a.words.slice(0, 160)}"` : ""}.`);
      // Meetings can be seen: others in the same place may notice, and what they saw is something they know.
      const rng = this.r("meeting-seen", a.id);
      for (const w of sortBy(
        S.characters.filter((x) => x !== c && x !== to && x.at === c.at && x.status !== "Dead" && x.heldBy === null),
        [(x: Character) => idNumber(x.id), cmpNum],
      ))
        if (rng.chance(0.2)) remember(w, S.turn, `I saw ${c.name} and ${to.name} meet at the court of ${c.at}.`);
    }
  }
  // Setting out: a free person on its own way, or one on an errand to the borrower's court or home.
  // Item 11b: a free person takes to the hills with a crowd where it stands or next door ("Turning outlaw").
  if (ch.outlaw !== null && c.status === "Free" && c.errand === null && c.duty === "None") {
    const cap = this.courtAt(c.at);
    if ((ch.outlaw === cap || this.map.neighbors(cap).includes(ch.outlaw)) && !this.map.get(ch.outlaw).isSea && this.peopleOf(ch.outlaw).loose >= BandData.gatherLoose) {
      this.turnOutlaw(c, ch.outlaw);
      return;
    }
  }
  if (ch.go !== null && ch.go !== c.at && isAlive(S, ch.go) && (c.status === "Free" || c.errand !== null) && c.duty === "None") this.startTravel(c, ch.go, ch.goAs);
};

/**
 * An approach accepted: both sides change hands together, if both are still in the same place and have what was offered.
 * A loan seals a debt tablet for the receiver of the gold; a job hands the collector the tablet and the advance.
 */
P.deal = function (a) {
  const S = this.s;
  const A = findCharacter(S, a.from);
  const B = findCharacter(S, a.to);
  if (A === null || B === null || this.provinceOf(A) === null || this.provinceOf(A) !== this.provinceOf(B) || A.status === "Dead" || B.status === "Dead" || A.heldBy !== null || B.heldBy !== null) return false;
  const holds = (x: Character, ids: string[]): boolean => ids.every((id) => S.debts.some((d) => d.id === id && d.ended === null && d.holder === x.id && d.kept === "Person"));
  if (A.purse < a.giveGold || B.purse < a.askGold || !holds(A, a.giveDebts) || !holds(B, a.askDebts)) return false;
  if (a.collect !== null) {
    const d = S.debts.find((x) => x.id === a.collect && x.ended === null && x.holder === A.id) ?? null;
    if (d === null || B.status !== "Free" || B.errand !== null || A.at === null || !isPowerParty(d.borrower) || !isAlive(S, d.borrower)) return false;
    A.purse -= a.giveGold;
    A.earned.spent += a.giveGold;
    gain(B, a.giveGold, "Fees");
    this.passTablet(d, B.id, "Person");
    B.errand = newErrand({ employer: A.id, debtId: d.id, fee: Math.max(a.fee, a.giveGold), advance: a.giveGold, home: A.at, since: S.turn, payOnDone: a.payOnDone });
    B.seeking = false;
    remember(B, S.turn, `${A.name} hired me to collect the debt of ${this.partyName(d.borrower)} (${formatMoney(debtLeft(d))}), for ${formatMoney(B.errand.fee)}, ${formatMoney(a.giveGold)} of it now; I carry the tablet.`);
    remember(A, S.turn, `I hired ${B.name} to collect the debt of ${this.partyName(d.borrower)}; they carry the tablet.`);
    logEvent(S, "collector-hired", `${A.name} hired ${B.name} to collect a debt.`, [], "collector-hired");
    a.accepted = true;
    if (B.at !== d.borrower) {
      // One met on the road leaves its own way for the errand's.
      const from = B.at === null ? this.provinceOf(B) : null;
      if (B.at === null) S.journeys = S.journeys.filter((j) => !(j.kind === "Travel" && j.characterId === B.id));
      this.startTravel(B, d.borrower, null, from);
    }
    return true;
  }
  // Gold both ways, and tablets both ways.
  const move = (from: Character, to: Character, gold: number): void => {
    if (gold <= 0) return;
    from.purse -= gold;
    from.earned.spent += gold;
    gain(to, gold, "Loans");
    // Item 12: gold handed over, a motive with a name on it.
    to.handed.push({ by: from.id, turn: S.turn });
  };
  move(A, B, a.giveGold);
  move(B, A, a.askGold);
  for (const id of a.giveDebts) this.passTablet(S.debts.find((d) => d.id === id)!, B.id, "Person");
  for (const id of a.askDebts) this.passTablet(S.debts.find((d) => d.id === id)!, A.id, "Person");
  if (a.repay > 0) {
    if (a.giveGold > 0) this.sealDebt(A.id, B.id, a.giveGold, a.repay, Math.max(1, a.seasons));
    else if (a.askGold > 0) this.sealDebt(B.id, A.id, a.askGold, a.repay, Math.max(1, a.seasons));
  }
  const what = a.repay > 0 ? "a loan" : a.giveDebts.length + a.askDebts.length > 0 ? "a sale of tablets" : "an exchange";
  remember(A, S.turn, `${B.name} accepted my offer: ${what}.`);
  remember(B, S.turn, `I accepted ${A.name}'s offer: ${what}.`);
  logEvent(S, a.repay > 0 ? "character-loan" : "character-deal", `${A.name} and ${B.name} dealt: ${what}.`, [], a.repay > 0 ? "character-loan" : "character-deal");
  a.accepted = true;
  return true;
};

/**
 * A collector back with its employer: it hands over what it collected and the tablet if the debt still stands, and its
 * employer pays the rest of the fee if it can; or it keeps the gold, a job broken, which is recorded. If its employer is
 * gone, the errand ends and it keeps what it carries.
 */
P.deliverErrand = function (c, deliver) {
  const S = this.s;
  const e = c.errand!;
  const emp = findCharacter(S, e.employer);
  const d = S.debts.find((x) => x.id === e.debtId) ?? null;
  c.errand = null;
  if (emp === null || emp.status === "Dead" || emp.at !== c.at || emp.heldBy !== null) {
    remember(c, S.turn, `My employer was not there to take what I collected; I keep it.`);
    return;
  }
  if (!deliver) {
    this.recordPay(c.id, false, c.at);
    c.facts.push(newFact({ id: newId(S, "f"), text: `Kept the gold collected for ${emp.name}.`, secrecy: "Public", tag: "kept-collection" }));
    remember(emp, S.turn, `${c.name} came back and kept what they collected for me, ${formatMoney(e.collected)}.`);
    remember(c, S.turn, `I kept what I collected for ${emp.name}.`);
    logEvent(S, "collector-kept", `${c.name} kept what they collected for ${emp.name}.`, [], "collector-kept");
    return;
  }
  const handed = Math.min(c.purse, e.collected);
  c.purse -= handed;
  c.earned.spent += handed;
  gain(emp, handed, "Loans");
  if (d !== null && d.ended === null && d.holder === c.id) this.passTablet(d, emp.id, "Person");
  // The rest is due only for a job done: the borrower's court reached with the tablet (item 11a, "done" is what the engine
  // can see). One that turned back on the way is owed nothing more, and breaks nothing.
  // Paid only by its employer's own order, given with the job (Haakon's answers to item 11a: "unpaid is unpaid").
  const rest = e.reached ? Math.max(0, e.fee - e.advance) : 0;
  const paid = e.payOnDone ? Math.min(rest, emp.purse) : 0;
  emp.purse -= paid;
  emp.earned.spent += paid;
  gain(c, paid, "Fees");
  if (rest > 0) this.recordPay(emp.id, paid >= rest, c.at, c);
  if (e.reached) this.recordPay(c.id, true, c.at, emp);
  remember(c, S.turn, `I handed ${emp.name} the ${formatMoney(handed)} I collected${paid >= rest ? `, and was paid the rest of my fee, ${formatMoney(paid)}` : `; they paid me only ${formatMoney(paid)} of the ${formatMoney(rest)} they owed`}.`);
  remember(emp, S.turn, `${c.name} handed me the ${formatMoney(handed)} they collected.`);
  logEvent(S, "collected", `${c.name} delivered ${handed} collected for ${emp.name}.`, [], "collected");
};

/** A free person (or a collector) sets out on its own way to a court. */
P.startTravel = function (c, to, asName = null, fromProvince = null) {
  const S = this.s;
  const from = c.at;
  if (from === null && fromProvince === null) return;
  const fromProv = fromProvince ?? this.courtAt(from!);
  // Item 11b: it walks the road like any traveller, and meets its outlaws ("Robbing purses on the road").
  const j = newJourney({ id: newId(S, "j"), kind: "Travel", departTurn: S.turn, from: from ?? to, to, characterId: c.id, asName });
  this.setOut(j, fromProv, this.courtAt(to));
  S.journeys.push(j);
  c.at = null;
  c.duty = "Travelling";
  c.waited = 0;
  c.lendOffer = null;
  remember(c, S.turn, `I set out for the court of ${to}.`);
};

/** Where a traveller on its own way is, for its living: where it set out from. */
P.travellerAt = function (c) {
  const j = this.s.journeys.find((x) => x.kind === "Travel" && x.characterId === c.id) ?? null;
  return j?.seen[0] ?? null;
};

/**
 * A traveller arrives: it stands at the court, free (or on its errand). One whose court fell on the way goes on to whoever
 * took its capital. A collector at the borrower's court presents the tablet: the king learns who holds his debt.
 */
P.travellerArrives = function (j) {
  const S = this.s;
  const c = findCharacter(S, j.characterId);
  if (c === null || c.status === "Dead" || c.duty !== "Travelling") return;
  let to = j.to;
  if (!isAlive(S, to)) to = S.falls.find((f) => f.power === to)?.conqueror ?? alive(S)[0];
  if (to === undefined || !isAlive(S, to)) return;
  // It gives the court its name as it arrives: the invented one it chose, where the court knows nothing of it (item 11a+).
  const stranger = strangerAt(c, to);
  c.duty = "None";
  c.lastLife = null;
  if (stranger && j.asName !== null) this.declare(c, to, j.asName, null);
  c.at = to;
  this.meet(c, to);
  remember(c, S.turn, `I arrived at the court of ${to}.`);
  const e = c.errand;
  if (e !== null) {
    const d = S.debts.find((x) => x.id === e.debtId) ?? null;
    if (d !== null && d.borrower === to) e.reached = true;
    if (d !== null && d.ended === null && d.borrower === to && d.holder === c.id)
      notify(S, to, "Notice", "A debt presented", `${c.name} stands at your court with the tablet of your debt ${d.id}: ${formatMoney(debtLeft(d))} is left to repay to whoever holds it (order repay). Whoever holds the tablet holds the claim.`, c.id);
  }
};

/** How many characters are alive, which the pool keeps near its baseline. */
export const living = (e: TurnEngine): number => count(e.s.characters, (c) => c.status !== "Dead");
