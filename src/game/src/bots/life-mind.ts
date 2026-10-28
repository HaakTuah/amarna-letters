/**
 * A script character's own season (build order item 11a), by formula from its traits, its strategy and road ("How the
 * strategy is made", "Bold or careful, one goal") and its horizon ("Time for script characters"): it weighs service
 * against working for itself by expected income ("Working for oneself"), goes where work, trust and bread are best
 * ("Hiring as a negotiation", "Characters live from the markets too"), keeps a hoard if careful, lends to kings and to
 * people at a rate set by its impatience and the borrower's record ("Lending to kings", "Lending to anyone"), borrows in
 * need or to lend on at a higher rate, hires a collector for a debt it cannot reach, quits a court that broke its word, and
 * hands over what it collected unless it is a man who keeps what passes through his hands. First guesses throughout.
 */
import {
  MoneyData,
  impatience,
  newApproachMade,
  newLifeChoice,
  type ApproachSeen,
  type Character,
  type CourtSeen,
  type LifeChoice,
  type LifeView,
  type Power,
} from "@amarna/engine";

/** The interest a season, in tenths of a percent, it asks of a borrower with this record: its impatience and the risk. */
export function rateAsked(c: Character, broken: number, war: { besieged: boolean; growth: number } | null): number {
  let r = impatience(c) + MoneyData.interestBase + MoneyData.interestBroken * broken;
  if (war !== null) {
    if (war.besieged) r += MoneyData.interestBesieged;
    if (war.growth < 90) r += MoneyData.interestShrunk;
  }
  return r;
}

/** The risk premium alone, which a careful lender keeps low and a bold one takes for its return. */
const riskOf = (broken: number, k: CourtSeen): number =>
  MoneyData.interestBroken * broken + (k.besieged ? MoneyData.interestBesieged : 0) + (k.growth < 90 ? MoneyData.interestShrunk : 0);

/** A season's rate of a loan, in tenths of a percent. */
const rateOf = (amount: number, repay: number, seasons: number): number => (amount <= 0 ? 0 : Math.round(((repay - amount) * 1000) / amount / Math.max(1, seasons)));

/** What it keeps in hand: a few seasons of living, and a little more. */
const reserveOf = (v: LifeView): number => v.living * 4 + 20;

/** Honest with an employer's gold unless it keeps what passes through its hands and takes the bold road, or is greedy and disloyal. */
export const handsOver = (c: Character): boolean => !(c.strategy === "Keeper" && c.bold) && !(c.traits.loyalty < 30 && c.traits.greed > 70);

/** How it scores a court to stand at, seeking service or working for itself. */
function courtScore(c: Character, v: LifeView, k: CourtSeen, seeking: boolean): number {
  const t = c.traits;
  const hiring = k.hiring !== null && v.turn - k.hiring <= 4 ? 30 : 0;
  let s = (seeking ? hiring + k.ask * (k.trust / 100) : k.trust / 4) - k.travel * 5;
  s -= k.executions * (t.courage < 40 ? 10 : 4);
  s -= Math.max(0, k.grain - 150) / 5;
  if (k.besieged) s -= 40;
  if (t.sympathy === k.court) s += 15;
  if (k.court === v.at) s += 10 - (v.waited > MoneyData.patience ? 30 : 0);
  return s;
}

/** Its answer to an approach: accept or not. */
function accepts(c: Character, v: LifeView, a: ApproachSeen, record: { kept: number; broken: number }): boolean {
  const r = impatience(c);
  if (a.collect !== null) {
    // A collector's job: the fee against what its time is worth for the journey there and back, from an employer it trusts.
    if (!v.free || v.errand !== null) return false;
    const here = v.courts.find((k) => k.court === v.at);
    const ask = here?.ask ?? 8;
    return a.fee >= ask * 2 && (record.broken <= record.kept || c.bold);
  }
  if (a.repay > 0 && a.giveGold > 0) {
    // It is offered a loan: taken in need, or when the rate is below its impatience (it values gold now more).
    const need = v.purse < v.living * 2 + 5;
    return need || rateOf(a.giveGold, a.repay, a.seasons) < r;
  }
  if (a.repay > 0 && a.askGold > 0) {
    // It is asked to lend: if it has the gold to spare and the rate pays its impatience and the borrower's risk.
    const spare = v.purse - reserveOf(v);
    const needed = r + MoneyData.interestBase + MoneyData.interestBroken * record.broken;
    return a.askGold <= spare && rateOf(a.askGold, a.repay, a.seasons) >= needed && (record.broken === 0 || c.bold);
  }
  // A plain exchange: gold for gold or tablets; only one that leaves it richer by the face of things.
  return a.giveGold >= a.askGold && a.askDebts.length === 0;
}

/** The season's choices of a script character, from what it knows. */
export function scriptLife(c: Character, v: LifeView): LifeChoice {
  const ch = newLifeChoice({ seek: v.seeking });
  const t = c.traits;
  const here = v.courts.find((k) => k.court === v.at) ?? null;
  const record = (id: string): { kept: number; broken: number } => v.here.find((p) => p.id === id) ?? { kept: 0, broken: 0 };
  for (const a of v.approaches) if (accepts(c, v, a, record(a.from))) ch.accept.push(a.id);

  // Debts it owes to holders here: repaid when it can, unless it keeps what it can and the holder cannot make it pay.
  let purse = v.purse;
  for (const d of v.owes)
    if (v.here.some((p) => p.id === d.otherId) && purse - d.left >= v.living && (handsOver(c) || d.dueTurn >= v.turn)) {
      ch.repay.push(d.id);
      purse -= d.left;
    }

  // A servant whose master broke his word to it, or keeps breaking it to others, quits.
  if (!v.free && v.employer !== null) {
    const owed = v.owedFees.some((f) => f.court === v.employer);
    const master = v.courts.find((k) => k.court === v.employer);
    if (owed || (master !== undefined && master.broken >= 2 && t.loyalty < 50)) ch.quit = true;
  }

  // An errand: to the borrower's court, wait there for the gold, then home to hand it over (or keep it).
  const e = v.errand;
  if (e !== null) {
    const stillHeld = v.held.some((d) => d.id === e.debtId);
    const done = e.collected > 0 || !stillHeld || e.reached;
    if (v.at === e.home && done) ch.deliver = handsOver(c);
    else if (v.at === e.borrower) {
      const waited = v.turn - e.since;
      if (e.collected > 0 || !stillHeld || waited >= MoneyData.patience + 4) ch.go = e.home;
    } else if (!done && e.borrower !== "" && v.courts.some((k) => k.court === e.borrower)) ch.go = e.borrower as Power;
    else ch.go = e.home;
  }

  // Service against working for itself, by expected income a season: the best fee it could get, counted as far as it
  // trusts the court, against what its gold would earn lent at the rate it asks.
  if (v.free && e === null) {
    const hiring = v.courts.filter((k) => k.hiring !== null && v.turn - k.hiring <= 6);
    const service = Math.max(0, ...(hiring.length > 0 ? hiring : v.courts).map((k) => (k.ask * k.trust) / 100 / (hiring.length > 0 ? 1 : 2)));
    const capital = v.purse + (v.hoard?.gold ?? 0);
    const enterprise = (capital * (impatience(c) + MoneyData.interestBase)) / 1000;
    ch.seek = service >= enterprise;
    // Where to stand: the best court for what it seeks, if it beats where it stands by a margin; dear bread pushes it on.
    const best = [...v.courts].sort((a, b) => courtScore(c, v, b, ch.seek) - courtScore(c, v, a, ch.seek) || a.court.localeCompare(b.court))[0];
    if (best !== undefined && here !== null && best.court !== v.at && courtScore(c, v, best, ch.seek) > courtScore(c, v, here, ch.seek) + 10) ch.go = best.court;
    // A debt falling due on a king it can reach: it goes to his court to be repaid, unless it stands there already.
    // One seeking service at a court that is hiring stays and sends a collector instead (below), if there is one to send.
    const due = v.held.find((d) => d.dueTurn <= v.turn + 1 && d.kept !== "missing" && v.courts.some((k) => k.court === d.otherId));
    const staying = ch.seek && here !== null && here.hiring !== null && v.turn - here.hiring <= 4 && v.here.some((p) => p.standing === "free");
    if (due !== undefined && !staying) ch.go = due.otherId === v.at ? null : (due.otherId as Power);
  }

  // Its hoard: the careful keep one where they stand, if that court looks safe; anyone pulls it out of a court in danger.
  if (here !== null && ch.go === null) {
    const safe = !here.besieged && here.growth >= 90;
    if (v.hoard !== null && v.hoard.at === v.at && !safe) ch.hoard = -v.hoard.gold;
    else if (!c.bold && safe && purse > 150 && (v.hoard === null || v.hoard.at === v.at)) {
      ch.hoard = purse - 60;
      purse = 60;
    }
  }

  // What it offers to lend the king where it stands: the careful only to a king whose word holds and whose kingdom stands,
  // the bold to anyone, at a rate for the risk.
  if (here !== null && ch.go === null && e === null) {
    const spare = purse - reserveOf(v);
    const risk = riskOf(here.broken, here);
    if (spare >= 30 && (c.bold || risk <= MoneyData.interestShrunk) && (here.court !== v.employer || t.loyalty >= 50)) {
      const perSeason = rateAsked(c, here.broken, here);
      ch.lend = { amount: spare, perHundred: Math.ceil((perSeason * MoneyData.loanSeasons) / 10), seasons: MoneyData.loanSeasons };
    }
  }

  // One approach a season: a collector for an overdue debt it cannot reach; a loan in need; or a loan to lend on to the king
  // at a higher rate, if its name is good (the gathering lender).
  if (ch.approach === null) {
    const overdue = v.held.find((d) => d.dueTurn <= v.turn + 1 && d.kept !== "missing" && v.courts.some((k) => k.court === d.otherId) && d.otherId !== v.at);
    const freeHere = v.here.filter((p) => p.standing === "free" && p.broken <= p.kept).sort((a, b) => a.broken - b.broken || b.kept - a.kept || a.id.localeCompare(b.id));
    if (overdue !== undefined && freeHere.length > 0 && e === null) {
      // A fee for the journey there and back, at the going rate, or a share of what it brings, whichever is more.
      const travel = v.courts.find((k) => k.court === overdue.otherId)?.travel ?? 2;
      const fee = Math.max(Math.trunc((overdue.left * 15) / 100), Math.trunc((8 * (2 * travel + 1) * v.goingRate) / 100));
      ch.approach = newApproachMade({ to: freeHere[0].id, words: `Carry this tablet to ${overdue.other} and bring me what is paid on it, and you will have ${fee} shekels.`, giveGold: Math.trunc(fee / 3), fee, collect: overdue.id });
    } else if (purse < v.living * 2 + 5 && v.here.length > 0 && v.free && ch.seek && v.owes.length === 0 && here !== null && here.hiring !== null && v.turn - here.hiring <= 2) {
      // In need, seeking service at a court that is hiring: it borrows to live until the first advance, once.
      const lender = v.here.find((p) => p.standing !== "free") ?? v.here[0];
      const amount = v.living * 4 + 10;
      const rate = impatience(c) + 30;
      ch.approach = newApproachMade({ to: lender.id, words: "Lend me enough to live on, and I will repay you with interest.", askGold: amount, repay: amount + Math.ceil((amount * rate * 4) / 1000), seasons: 4 });
    } else if (here !== null && ch.lend !== null && purse < 120 && c.bold && v.here.length > 0) {
      const perSeason = Math.max(1, Math.trunc((ch.lend.perHundred * 10) / ch.lend.seasons) - 20);
      const lender = v.here.find((p) => p.standing !== "free" && p.broken === 0);
      if (lender !== undefined)
        ch.approach = newApproachMade({ to: lender.id, words: "Lend me a hundred shekels; I have a borrower who pays well.", askGold: 100, repay: 100 + Math.ceil((100 * perSeason * MoneyData.loanSeasons) / 1000), seasons: MoneyData.loanSeasons });
    }
  }
  return ch;
}
