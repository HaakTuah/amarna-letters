/**
 * The characters' money (build order item 11a): living from the markets, hoards and their keep, debt tablets between any
 * two parties, borrowing from a character and repaying whoever holds the tablet, and what becomes of gold and tablets when
 * a character is captured or dies, or a kingdom falls ("Characters live from the markets too", "Where characters keep
 * their gold", "Lending to kings", "Lending to anyone", "The debt tablet is the claim").
 */
import { idiv } from "../core/num.ts";
import { cmpNum, sortBy } from "../core/seq.ts";
import { needOf, priceAt } from "../model/economy.ts";
import { debtLeft, isPowerParty, MoneyData, newDebt, type Debt } from "../model/money.ts";
import type { BorrowOrder, RepayOrder, SeizeHoardOrder, SellDebtOrder } from "../model/orders.ts";
import { gain, hiddenAt, newFact, remember, spend, type Character } from "../model/people.ts";
import { newLossAbroad } from "../model/records.ts";
import { land, type Power } from "../model/power.ts";
import { char, findCharacter, isAlive, logEvent, newId, notify } from "../model/state.ts";
import { formatMoney } from "../rules/calendar.ts";
import { idNumber, TurnEngine } from "./core.ts";
import { trustIn } from "./jobs.ts";

declare module "./core.ts" {
  interface TurnEngine {
    debtsDie(p: Power): void;
    borrowOrder(p: Power, o: BorrowOrder): void;
    repayOrder(p: Power, o: RepayOrder): void;
    sealDebt(lender: string, borrower: string, amount: number, repay: number, seasons: number): Debt;
    payDebt(d: Debt, payer: string, amount: number): number;
    passTablet(d: Debt, to: string | null, kept: Debt["kept"]): void;
    missingAt(d: Debt, province: string | null): void;
    seizeHoard(p: Power, o: SeizeHoardOrder): void;
    sellDebtOrder(p: Power, o: SellDebtOrder): void;
    takePurse(p: Power, c: Character): void;
    debtsSeason(): void;
    livingSeason(): void;
    whereIs(c: Character): string | null;
    provinceOf(c: Character): string | null;
    travellerAt(c: Character): string | null;
    goldAndTabletsTaken(): void;
    partyName(x: string): string;
  }
}

const P = TurnEngine.prototype;

/** A party's name in a notice: a king by his land, a character by its name. */
P.partyName = function (x) {
  if (isPowerParty(x)) return `the king of ${land(x)}`;
  return findCharacter(this.s, x)?.name ?? x;
};

/** The province a character is in: its court's capital, the province it watches, or none on the road. */
P.whereIs = function (c) {
  if (c.at !== null) return this.courtAt(c.at);
  return c.watchProvince;
};

/** The province a character is in, on the road too: where its journey has brought it (null if it is nowhere on the map). */
P.provinceOf = function (c) {
  const at = this.whereIs(c);
  if (at !== null) return at;
  const j = this.s.journeys.find((x) => x.characterId === c.id && x.route.length > 0) ?? null;
  return j === null ? null : (j.route[Math.min(j.leg, j.route.length - 1)] ?? null);
};

/** A debt tablet sealed by both, held by the lender on his person (or in his archive, for a king). */
P.sealDebt = function (lender, borrower, amount, repay, seasons) {
  const S = this.s;
  const d = newDebt({
    id: newId(S, "d"),
    lender,
    borrower,
    principal: amount,
    owed: repay,
    sealedTurn: S.turn,
    dueTurn: S.turn + Math.max(1, seasons),
    holder: lender,
    kept: isPowerParty(lender) ? "Archive" : "Person",
  });
  S.debts.push(d);
  return d;
};

/** A tablet changes hands; one that comes to its own borrower cancels the debt, as a repaid loan's tablet was broken. */
P.passTablet = function (d, to, kept) {
  const S = this.s;
  d.holder = to;
  d.for = null;
  d.kept = to === null ? "Missing" : kept;
  if (to === null) {
    d.ended = S.turn;
    d.how = "missing";
    // Haakon's answers to item 11a: a tablet's end is news; its borrower hears of it only when word comes (`missingAt`).
    d.endHeard = S.turn;
  } else if (to === d.borrower && d.ended === null) {
    d.ended = S.turn;
    d.endHeard = S.turn;
    d.how = debtLeft(d) === 0 ? "repaid" : "cancelled";
  }
};

/** A tablet gone missing in a province: its borrower hears that it ended when word of it comes from there by the roads. */
P.missingAt = function (d, province) {
  const S = this.s;
  this.passTablet(d, null, "Missing");
  if (province !== null && isPowerParty(d.borrower) && isAlive(S, d.borrower)) d.endHeard = S.turn + this.travelTurnsBetween(province, this.courtAt(d.borrower));
};

/**
 * Gold paid on a debt to whoever holds its tablet: paid in full, the tablet goes to the payer. The holder, a character,
 * gains the gold; if it is collecting for someone else (an errand), what it took is counted as its employer's. Returns
 * what was paid.
 */
P.payDebt = function (d, payer, amount) {
  const S = this.s;
  const paid = Math.max(0, Math.min(amount, debtLeft(d)));
  if (paid === 0 || d.holder === null) return 0;
  const h = isPowerParty(d.holder) ? null : char(S, d.holder);
  if (h === null) S.treasuries.get(d.holder as Power).gold += paid;
  // A king's envoy carrying the tablet for him: the gold is its master's, carried home.
  else if (d.for !== null) h.carriedFor += paid;
  else {
    gain(h, paid, "Loans");
    if (h.errand !== null && h.errand.debtId === d.id) h.errand.collected += paid;
  }
  d.repaid += paid;
  if (debtLeft(d) === 0) {
    this.recordPay(d.borrower, true, h?.at ?? (isPowerParty(payer) ? payer : null), h);
    this.passTablet(d, payer, isPowerParty(payer) ? "Archive" : "Person");
  }
  return paid;
};

/**
 * Order borrow: a king borrows from a person standing at his court who offers to lend, if the sum is within its offer and
 * what it carries, and the sum to repay gives it at least what it asks a season for the seasons named. The gold moves to
 * the treasury now, and a debt tablet is sealed, which the lender keeps.
 */
P.borrowOrder = function (p, o) {
  const S = this.s;
  const c = char(S, o.character);
  const offer = c.lendOffer;
  if (c.at !== p || c.heldBy !== null || c.status === "Dead" || offer === null || offer.amount <= 0) {
    this.failed(p, o, "No loan", `${c.name} is not at your court offering to lend.`, "no offer to lend at your court", true, c.id);
    return;
  }
  const amount = Math.min(o.amount, offer.amount, c.purse);
  const seasons = Math.max(1, o.seasons);
  // What it asks back: its rate a season, for the seasons named.
  const asked = amount + Math.ceil((amount * offer.perHundred * seasons) / (100 * Math.max(1, offer.seasons)));
  const repay = Math.max(o.repay, 0);
  if (amount <= 0 || repay < asked) {
    this.failed(p, o, "No loan", `${c.name} will not lend ${formatMoney(amount)} for ${formatMoney(repay)} back in ${seasons} seasons: they ask ${formatMoney(asked)} back.`, `they ask ${formatMoney(asked)} back`, true, c.id);
    return;
  }
  // Gold lent leaves the purse (counted as spent), and what is repaid comes back as dealt.
  spend(c, amount);
  S.treasuries.get(p).gold += amount;
  offer.amount = Math.max(0, offer.amount - amount);
  const d = this.sealDebt(c.id, p, amount, repay, seasons);
  remember(c, S.turn, `I lent the king of ${land(p)} ${formatMoney(amount)}, to be repaid ${formatMoney(repay)} by season ${d.dueTurn}; I hold the tablet.`);
  notify(S, p, "Notice", "A loan", `${c.name} lent you ${formatMoney(amount)}: a debt tablet sealed by both says you owe ${formatMoney(repay)}, to be repaid by turn ${d.dueTurn} (debt ${d.id}). Nothing forces you to repay; ${c.name} holds the tablet, which anyone can read.`, c.id);
  logEvent(S, "loan", `${c.name} lent ${p} ${amount}.`, [p], "loan");
};

/** Order repay: gold to whoever holds the tablet, if they stand at the court (a king who holds his own tablet owes nothing). */
P.repayOrder = function (p, o) {
  const S = this.s;
  const d = S.debts.find((x) => x.id === o.debt) ?? null;
  if (d === null || d.borrower !== p || d.ended !== null) {
    this.failed(p, o, "Nothing repaid", `There is no debt of yours ${o.debt} standing.`, "no such debt standing", true);
    return;
  }
  const h = d.holder === null || isPowerParty(d.holder) ? null : findCharacter(S, d.holder);
  if (h === null || h.at !== p || h.status === "Dead" || (h.heldBy !== null && h.heldBy !== p)) {
    this.failed(p, o, "Nothing repaid", `Nobody holding the tablet of debt ${d.id} stands at your court to be paid.`, "the tablet's holder is not at your court", true);
    return;
  }
  const t = S.treasuries.get(p);
  const amount = Math.min(o.amount, t.gold);
  if (amount <= 0) {
    this.failed(p, o, "Nothing repaid", `The treasury could not repay anything on debt ${d.id}.`, "the treasury is empty", false);
    return;
  }
  t.gold -= amount;
  const paid = this.payDebt(d, p, amount);
  t.gold += amount - paid;
  remember(h, S.turn, `The king of ${land(p)} paid me ${formatMoney(paid)} on the tablet I hold${d.ended !== null ? ", the whole debt; the tablet is his again" : ""}.`);
  notify(S, p, "Notice", "A debt repaid", d.ended !== null ? `You repaid debt ${d.id} in full to ${h.name}: the tablet is yours, and the debt is settled.` : `You repaid ${formatMoney(paid)} on debt ${d.id} to ${h.name}; ${formatMoney(debtLeft(d))} is left.`, h.id);
  logEvent(S, "repaid", `${p} repaid ${paid} to ${h.name}.`, [p], "repaid");
};

/**
 * A fallen kingdom's debts die with it, and so do the claims it held: its tablets go with its archive to whoever took its
 * capital, a claim on a dead kingdom worth nothing; a claim it held on anyone else passes to the taker.
 */
P.debtsDie = function (p) {
  const S = this.s;
  const taker = S.falls.find((f) => f.power === p)?.conqueror ?? null;
  for (const d of S.debts.filter((x) => x.ended === null)) {
    if (d.borrower === p) {
      d.ended = S.turn;
      d.how = "fallen";
      continue;
    }
    if (d.holder === p) this.passTablet(d, taker, "Archive");
  }
  // Hoards kept at its capital: the city falls, and its taker carries them off with the rest.
  for (const c of S.characters.filter((c) => c.hoard !== null && c.hoard.at === p)) {
    if (taker !== null && isAlive(S, taker)) S.treasuries.get(taker).gold += c.hoard!.gold;
    remember(c, S.turn, `${land(p)} fell, and my hoard there, ${formatMoney(c.hoard!.gold)}, was lost with it.`);
    c.earned.spent += c.hoard!.gold;
    // The tablets kept with it go with the rest to whoever took the city.
    for (const d of S.debts.filter((d) => d.ended === null && d.holder === c.id && d.kept === "Hoard")) this.passTablet(d, taker, "Archive");
    c.hoard = null;
  }
};

/**
 * Debts that pass their season unpaid: once the tablet's holder has stood where the borrower could pay it (his court, or the
 * same place) for a whole season past due, it counts once as a broken promise of the borrower ("A name made of outcomes"),
 * and the holder remembers it. Nothing else follows: what the world does about it is up to the world.
 */
P.debtsSeason = function () {
  const S = this.s;
  for (const d of sortBy(
    S.debts.filter((x) => x.ended === null && !x.defaulted && x.dueTurn < S.turn),
    [(x) => idNumber(x.id), cmpNum],
  )) {
    const h = d.holder !== null && !isPowerParty(d.holder) ? findCharacter(S, d.holder) : null;
    const where = isPowerParty(d.borrower) ? d.borrower : (findCharacter(S, d.borrower)?.at ?? null);
    const present = h !== null && h.status !== "Dead" && h.heldBy === null && where !== null && h.at === where;
    if (d.presented === null) {
      if (present) {
        d.presented = S.turn;
        if (isPowerParty(d.borrower) && isAlive(S, d.borrower))
          notify(S, d.borrower, "Notice", "A debt presented", `${h!.name} stands at your court with the tablet of your debt ${d.id}, past its season: ${formatMoney(debtLeft(d))} is left to repay (order repay).`, h!.id);
      }
      continue;
    }
    if (!present || d.presented >= S.turn) continue;
    d.defaulted = true;
    this.recordPay(d.borrower, false, h?.at ?? null, h);
    if (h !== null) remember(h, S.turn, `${this.partyName(d.borrower)} has not repaid by the season agreed: ${formatMoney(debtLeft(d))} is still owed on the tablet I hold.`);
    if (isPowerParty(d.borrower) && isAlive(S, d.borrower)) notify(S, d.borrower, "Notice", "A debt past its season", `Debt ${d.id}, ${formatMoney(debtLeft(d))} to ${this.partyName(d.holder ?? d.lender)}, was to be repaid by turn ${d.dueTurn}. Those who lend hear of it.`);
    logEvent(S, "default", `${d.borrower} let debt ${d.id} pass its season.`, isPowerParty(d.borrower) ? [d.borrower] : [], "default");
  }
};

/**
 * The season's living ("Characters live from the markets too"): a free person, at a court or on its way, buys its food at
 * the market where it is, its gold going into that people's purse and the grain out of its stock; a servant lives on its
 * master's hospitality, or on the advance abroad, and a captive on its jailer's. One who can pay nothing lives as the town
 * does. A hoard pays its keep to the town that keeps it.
 */
P.livingSeason = function () {
  const S = this.s;
  for (const c of sortBy(
    S.characters.filter((c) => c.status === "Free"),
    [(c: Character) => idNumber(c.id), cmpNum],
  )) {
    if (c.at === null) c.lendOffer = null;
    const at = this.whereIs(c) ?? (c.duty === "Travelling" ? this.travellerAt(c) : null);
    if (at === null || this.map.get(at).isSea) continue;
    const m = this.market(at);
    const price = priceAt(m.stock, needOf(this.map.get(at)));
    const cost = Math.ceil((MoneyData.living * price) / 100);
    const paid = spend(c, cost);
    if (paid <= 0) continue;
    m.purse += paid;
    m.stock = Math.max(0, m.stock - MoneyData.living);
  }
  for (const c of S.characters.filter((c) => c.hoard !== null && c.status !== "Dead")) {
    const h = c.hoard!;
    const fee = Math.min(h.gold, Math.max(MoneyData.hoardFeeMin, idiv(h.gold * MoneyData.hoardFee, 100)));
    h.gold -= fee;
    c.earned.spent += fee;
    this.market(this.courtAt(h.at)).purse += fee;
    if (h.gold <= 0) {
      // An empty hoard is closed: the tablets kept with it come back to its owner's person.
      for (const d of S.debts.filter((d) => d.ended === null && d.holder === c.id && d.kept === "Hoard")) d.kept = "Person";
      c.hoard = null;
    }
  }
};

/**
 * Gold and tablets taken from the captured and the dead, once a season ("The debt tablet is the claim", "Where characters
 * keep their gold"): a captive's purse and the tablets on its person go to its captor; the dead's tablets on its person pass
 * to the court where it died, or go missing on the road; its hoard, and the tablets in it, to the court that kept it.
 */
P.goldAndTabletsTaken = function () {
  const S = this.s;
  for (const c of sortBy(
    S.characters.filter((c) => c.status === "Captured" || c.status === "Dead"),
    [(c: Character) => idNumber(c.id), cmpNum],
  )) {
    const held = S.debts.filter((d) => d.ended === null && d.holder === c.id);
    // Haakon's answers to item 11a: a captive's purse, and the tablets on it, stay on it where it is held, until its captor
    // orders them taken (order captive, fate TakePurse).
    if (c.status === "Captured" && c.heldBy !== null) {
      if (c.contract !== null) c.contract.captured = true;
      continue;
    }
    if (c.status !== "Dead") continue;
    c.diedWith ??= c.purse + (c.hoard?.gold ?? 0);
    const court = c.at ?? c.heldBy;
    // Haakon's answers to item 11b+: a dead man's purse goes to whoever is with him, his killers (robbers take it as they
    // rob) or his captor, and otherwise into the purse of the town where he died; on the road, of the province.
    const carried = c.purse + c.carriedFor;
    const captor = c.heldBy !== null && isAlive(S, c.heldBy) ? c.heldBy : null;
    const where = court !== null ? this.courtAt(court) : this.provinceOf(c);
    if (carried > 0 && captor !== null) {
      S.treasuries.get(captor).gold += carried;
      notify(S, captor, "Notice", "A dead captive's purse", `${c.name} died in your hands; the ${formatMoney(carried)} they carried is now in your treasury.`, c.id);
    } else if (carried > 0 && where !== null && !this.map.get(where).isSea) this.market(where).purse += carried;
    if (carried > 0) {
      c.earned.spent += c.purse;
      c.purse = 0;
      c.carriedFor = 0;
    }
    for (const d of held) {
      if (d.kept === "Hoard") this.passTablet(d, c.hoard !== null && isAlive(S, c.hoard.at) ? c.hoard.at : null, "Archive");
      else if (court === null) this.missingAt(d, this.provinceOf(c));
      else this.passTablet(d, court, "Archive");
    }
    if (c.hoard !== null) {
      if (isAlive(S, c.hoard.at)) {
        S.treasuries.get(c.hoard.at).gold += c.hoard.gold;
        notify(S, c.hoard.at, "Notice", "A hoard falls to you", `${c.name} is dead, and the hoard kept in your city, ${formatMoney(c.hoard.gold)}, has come to your treasury.`, c.id);
      }
      c.hoard = null;
    }
    // A dead borrower's debts die with it.
    for (const d of S.debts.filter((d) => d.ended === null && d.borrower === c.id)) {
      d.ended = S.turn;
      d.how = "dead";
    }
  }
};

/**
 * Order captive, fate TakePurse (Haakon's answers to item 11a): the captor takes what the captive carries, its purse and
 * any gold it carried for its master, and the debt tablets on its person. It stays a captive.
 */
P.takePurse = function (p, c) {
  const S = this.s;
  const gold = c.purse + c.carriedFor;
  S.treasuries.get(p).gold += gold;
  c.earned.spent += c.purse;
  c.purse = 0;
  c.carriedFor = 0;
  remember(c, S.turn, `The king of ${land(p)} took what I carried, ${formatMoney(gold)}.`);
  const tablets = S.debts.filter((d) => d.ended === null && d.holder === c.id && d.kept === "Person");
  for (const d of tablets) this.passTablet(d, p, "Archive");
  notify(S, p, "Notice", "A captive's purse", `You took what ${c.name} carried: ${formatMoney(gold)}${tablets.length > 0 ? `, and ${tablets.length === 1 ? "a debt tablet" : `${tablets.length} debt tablets`} (${tablets.map((d) => `${this.partyName(d.borrower)} owes ${formatMoney(debtLeft(d))}, debt ${d.id}`).join("; ")}): whoever holds a tablet holds the claim` : ""}.`, c.id);
  logEvent(S, "purse-taken", `${p} took ${c.name}'s purse.`, [p], "purse-taken");
};

/**
 * Order seize (Haakon's answers to item 11a: "a king may order a living man's hoard seized, at its real cost"): the hoard
 * kept in the king's capital, and the tablets kept with it, go to his treasury and archive. No rule punishes it: it is a
 * fact, talked of at the court and carried by those who hear it, and people who hear of it ask more of that court and keep
 * their gold elsewhere.
 */
P.seizeHoard = function (p, o) {
  const S = this.s;
  const c = char(S, o.character);
  if (c.status === "Dead" || c.hoard === null || c.hoard.at !== p) {
    this.failed(p, o, "Nothing seized", `${c.name} keeps no hoard in your city.`, "no hoard in your city", true, c.id);
    return;
  }
  const gold = c.hoard.gold;
  S.treasuries.get(p).gold += gold;
  c.earned.spent += gold;
  for (const d of S.debts.filter((d) => d.ended === null && d.holder === c.id && d.kept === "Hoard")) this.passTablet(d, p, "Archive");
  c.hoard = null;
  c.facts.push(newFact({ id: newId(S, "f"), text: `Had a hoard of ${formatMoney(gold)} seized by the king of ${land(p)} (season ${S.turn}).`, secrecy: "Public", tag: "seized" }));
  remember(c, S.turn, `The king of ${land(p)} seized my hoard there, ${formatMoney(gold)}.`);
  S.losses.push(newLossAbroad({ kind: "Seized", court: p, master: null, characterId: c.id, turn: S.turn }));
  notify(S, p, "Notice", "A hoard seized", `You seized ${c.name}'s hoard, ${formatMoney(gold)}, with any tablets kept in it. It is known at your court, and those who hear of it will remember it.`, c.id);
  logEvent(S, "hoard-seized", `${p} seized ${c.name}'s hoard of ${gold}.`, [p], "hoard-seized");
};

/**
 * Order sellDebt (Haakon's answers to item 11a: "a king who holds the tablet may collect or sell it"): a tablet in the
 * king's archive sold to a person at his court for its price, if the buyer thinks the claim worth it: what is left to
 * repay, as far as it trusts the borrower to repay, from what it has heard, and has the gold.
 */
P.sellDebtOrder = function (p, o) {
  const S = this.s;
  const d = S.debts.find((x) => x.id === o.debt) ?? null;
  const c = char(S, o.character);
  if (d === null || d.ended !== null || d.holder !== p) {
    this.failed(p, o, "Tablet not sold", `You hold no tablet of a standing debt ${o.debt}.`, "no such tablet in your archive", true);
    return;
  }
  if (c.at !== p || c.heldBy !== null || c.status === "Dead" || hiddenAt(c, p)) {
    this.failed(p, o, "Tablet not sold", `${c.name} is not at your court.`, "not at your court", true, c.id);
    return;
  }
  const worth = idiv(debtLeft(d) * trustIn(S, d.borrower, c), 100);
  if (o.price <= 0 || o.price > worth || c.purse < o.price || d.borrower === c.id) {
    const why = d.borrower === c.id ? "it is their own debt" : c.purse < o.price ? "they do not have the gold" : `they would give at most ${formatMoney(worth)} for a claim of ${formatMoney(debtLeft(d))} on ${this.partyName(d.borrower)}`;
    this.failed(p, o, "Tablet not sold", `${c.name} would not buy the tablet of debt ${d.id} for ${formatMoney(o.price)}: ${why}.`, why, true, c.id);
    return;
  }
  c.purse -= o.price;
  c.earned.spent += o.price;
  S.treasuries.get(p).gold += o.price;
  this.passTablet(d, c.id, "Person");
  remember(c, S.turn, `I bought from the king of ${land(p)} the tablet of a debt of ${this.partyName(d.borrower)}, ${formatMoney(debtLeft(d))} left to repay, for ${formatMoney(o.price)}.`);
  notify(S, p, "Notice", "A tablet sold", `You sold ${c.name} the tablet of debt ${d.id} (${this.partyName(d.borrower)} owes ${formatMoney(debtLeft(d))}) for ${formatMoney(o.price)}. The claim is theirs.`, c.id);
  logEvent(S, "tablet-sold", `${p} sold debt ${d.id} to ${c.name}.`, [p], "tablet-sold");
};

