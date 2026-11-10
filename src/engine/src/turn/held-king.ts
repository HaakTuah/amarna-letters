/**
 * A captive king's realm under a caretaker (#806; the owner, 7 and 9 November 2026; Victory, "One scoreboard for every
 * person"). Once his court has heard that he is held, his player plays the captive: he may write letters, which leave
 * through his captor's court, read there and stopped if the captor says so, and agree in a letter home to his ransom, to
 * giving in (land ceded, troops given, an envoy sent with a tablet), or to a spy hired or posted at his captor's court,
 * which his court carries out when the letter arrives. A spy so posted carries his letters home unread and helps him get
 * away, at his own risk, and may sell him out instead (`kingsHeld`). Meanwhile a script holds
 * the realm with a narrow mandate (the runner asks it, `TurnSubmission.caretaker`): his standing orders stand, his troops
 * defend his own land, his taxes, debts, fees and tribute are kept, and nothing new is started, no war, treaty or
 * campaign ({@link Mandate}).
 */
import type { Clause } from "../model/clauses.ts";
import { newWordHome } from "../model/held-king.ts";
import type { Character } from "../model/people.ts";
import { remember } from "../model/people.ts";
import type { Order } from "../model/orders.ts";
import { placeSpy } from "../model/order-makers.ts";
import { powerName, quoteWords, rulerStyle, type Power } from "../model/power.ts";
import { newJourney, Waiting, type Journey } from "../model/records.ts";
import { newTurnSubmission, type TurnSubmission } from "../model/submission.ts";
import { findCharacter, isAlive, logEvent, newId, notify, type GameState } from "../model/state.ts";
import { describe } from "../model/order-reading.ts";
import { heldKing, lettersKept, spyWith } from "../rules/court.ts";
import { TurnEngine } from "./core.ts";

/** What a dispatch keeps of an old bond: tribute paid or asked, protection asked, an oath recalled; never a new tablet. */
const KeepingClauses = new Set<Clause["kind"]>(["tribute", "askTribute", "askProtect", "brokenOath"]);

/**
 * The caretaker's mandate, by the order: the realm's own business kept, its own land defended, nothing new begun. A
 * march, support or convoy only into land the realm holds; gold and caravans only within it; a dispatch only one that
 * keeps a bond; nothing that starts a war, a treaty, a campaign, a grant or a hire.
 */
export function inMandate(s: GameState, p: Power, king: string, o: Order): boolean {
  const own = (province: string | null | undefined): boolean => province != null && s.owner.getOrDefault(province, null) === p;
  switch (o.type) {
    case "hold":
    case "sally":
    case "raise":
    case "disband":
    case "fold":
    case "upkeep":
    case "feed":
    case "supply":
    case "renew":
    case "payFee":
    case "repay":
    case "payCarriers":
    case "toll":
    case "census":
    case "sell":
    case "purchase":
    case "answer":
    case "check":
    case "authenticate":
    case "assay":
    case "hunt":
    case "huntBands":
    case "counterIntel":
    case "demand":
    case "returnRunaways":
      return true;
    case "move":
    case "convoy":
      return own(o.to);
    case "support":
      return own(o.to ?? o.supported);
    case "send":
      return own(o.province);
    case "caravan":
      return own(o.from) && own(o.to);
    case "payRansom":
      // His own ransom only by his word (below): the caretaker pays what he agrees to, never on its own.
      return o.character !== king;
    case "dispatch":
      return (o.proposal ?? null) === null && (o.clauses ?? []).length > 0 && (o.clauses ?? []).every((c) => KeepingClauses.has(c.kind));
    default:
      return false;
  }
}

/**
 * What a held king may agree to in a letter home: his own ransom; giving in, by land ceded or troops given, or by an envoy
 * his court sends with the tablet he names; or a spy hired or posted at his captor's court to free him.
 */
function homeWord(o: Order, king: Character): boolean {
  const host = king.heldBy;
  switch (o.type) {
    case "payRansom":
      return o.character === king.id;
    case "cede":
    case "giftUnit":
    case "dispatch":
      return true;
    case "hire":
    case "renew":
      return o.what === "spy" && o.where === host;
    case "spy":
      return o.court === host;
    default:
      return false;
  }
}

declare module "./core.ts" {
  interface TurnEngine {
    /**
     * The season's orders of a realm whose king is held: the caretaker's within its mandate, with what his letters home
     * agreed to and his court now carries out; the captive's own orders become his letters. Any other realm's as given.
     */
    heldSeason(p: Power, sub: TurnSubmission): TurnSubmission;
    /** A captive king's letter arrives: its words to the court, and what he agreed to for his own court to carry out. */
    captiveLetterArrives(j: Journey): void;
  }
}

const P = TurnEngine.prototype;

P.heldSeason = function (p, sub) {
  const S = this.s;
  const king = heldKing(S, p);
  // What his letters home agreed to, arrived: carried out this season, as the court's own business, held or free.
  const arrived = S.wordHome.filter((w) => w.power === p && w.journey === "").map((w) => w.order);
  S.wordHome = S.wordHome.filter((w) => !(w.power === p && w.journey === ""));
  for (const o of arrived.filter((o) => o.type === "cede" || o.type === "giftUnit" || o.type === "dispatch")) logEvent(S, "king-gave-in", `The court of ${p} carries out its king's word from captivity: ${describe(o)}.`, [p], "king-gave-in");
  // His word is his own, given now; a script king standing in after the seat's call failed only fills what it leaves free.
  if (king === null)
    return arrived.length === 0 && sub.caretaker === null
      ? sub
      : newTurnSubmission({ ...sub, orders: sub.fromFallback ? arrived : [...arrived, ...sub.orders], caretaker: sub.fromFallback ? newTurnSubmission({ orders: sub.orders }) : null });
  // A man his word hires or keeps on as a spy at his captor's court is on the errand to free him: his job says so
  // (`JobErrand.frees`); one at his court is sent there now, unless the word sends him itself. A spy his word posts there
  // goes on that errand once he is sent (`placeSpy`).
  const host = king.heldBy!;
  for (const [i, o] of [...arrived.entries()].reverse()) {
    if ((o.type === "hire" || o.type === "renew") && o.what === "spy" && o.where === host) {
      arrived[i] = { ...o, frees: king.id };
      const man = findCharacter(S, o.character);
      const sent = arrived.some((x) => x.type === "spy" && x.character === o.character);
      if (!sent && man !== null && man.at === p && man.heldBy === null) arrived.splice(i + 1, 0, placeSpy(o.character, host));
    }
  }
  for (const o of arrived) if (o.type === "spy" && o.court === host) this._freeingNow.set(o, king.id);
  this.captiveWrites(p, king, sub.orders);
  const care = sub.caretaker ?? newTurnSubmission();
  const kept = care.orders.filter((o) => inMandate(S, p, king.id, o));
  // His standing orders stand as he left them: the caretaker gives, changes and cancels none; and its orders, as a
  // stand-in's, only fill what his word and his own scheduled and standing orders leave free (`planSeason`, `compose`).
  return newTurnSubmission({ orders: arrived, caretaker: newTurnSubmission({ orders: kept }), notes: care.notes, summary: care.summary, fromFallback: true });
};

declare module "./core.ts" {
  interface TurnEngine {
    /** The captive's own orders: each letter, and each word home, sent through his captor's court; the rest refused. */
    captiveWrites(p: Power, king: Character, orders: readonly Order[]): void;
  }
}

P.captiveWrites = function (p, king, orders) {
  const S = this.s;
  const host = king.heldBy!;
  const refused: string[] = [];
  const home = orders.filter((o) => homeWord(o, king));
  const letters = orders.filter((o) => o.type === "write");
  for (const o of orders) if (o.type !== "write" && !homeWord(o, king)) refused.push(describe(o));
  if (refused.length > 0)
    notify(
      S,
      p,
      "Rejected",
      "Held at a foreign court",
      `You are held at the court of ${powerName(host)}, and your realm is kept in your name: your standing orders stand, your troops defend your land and your debts, fees and tribute are kept, but nothing new is begun. From here you may only write letters (order write_from_captivity), and in a letter home agree to your ransom, to giving in (land ceded, troops given, an envoy sent with a tablet), or to a spy hired or posted at this court to free you. Not carried out: ${refused.join("; ")}.`,
      king.id,
    );
  if (king.duty === "UnderGuard") {
    if (letters.length + home.length > 0) notify(S, p, "Rejected", "No letters on the road", "You are on the road under guard and can write nothing until you reach your captor's court.", king.id);
    return;
  }
  // A word home with no letter of its own goes in a letter home of a line.
  const toHome = letters.find((o) => o.type === "write" && o.to === p) ?? null;
  const all: { to: Power; text: string; word: Order[] }[] = letters.map((o) => (o.type === "write" ? { to: o.to, text: o.letter, word: o === toHome ? home : [] } : { to: p, text: "", word: [] }));
  if (toHome === null && home.length > 0) all.push({ to: p, text: home.map((o) => `I agree: ${describe(o)}.`).join(" "), word: home });
  const spy = spyWith(S, p, host, true);
  for (const l of all) {
    if (!isAlive(S, l.to) || l.to === host) {
      if (l.to === host) notify(S, host, "Notice", "A letter from your captive", `${king.name}, the ${rulerStyle(p)} of ${powerName(p)} you hold, writes to you: ${quoteWords(l.text)}`, king.id);
      continue;
    }
    // Smuggled out by his own spy, home only: unread, and no captor stops it.
    const smuggled = spy !== null && l.to === p;
    if (!smuggled) {
      const stopped = lettersKept(S, king.id, l.to);
      notify(S, host, "Notice", stopped ? "A captive's letter kept" : "A captive's letter read", `${king.name}, the ${rulerStyle(p)} of ${powerName(p)} you hold, wrote to ${powerName(l.to)}${stopped ? ", and your guards kept the letter at your court" : ", and it goes out through your court as you let his letters go"}: ${quoteWords(l.text)}`, king.id);
      if (stopped) {
        logEvent(S, "captive-letter", `${host} kept a letter of ${king.name}'s to ${l.to}.`, [host], "captive-letter-kept");
        continue;
      }
    }
    const j = newJourney({ id: newId(S, "j"), kind: "CaptiveLetter", departTurn: S.turn, arriveTurn: Waiting, from: p, to: l.to, characterId: smuggled ? spy.id : king.id, text: l.text, waitAt: this.courtAt(host) });
    S.journeys.push(j);
    for (const o of l.word) S.wordHome.push(newWordHome({ journey: j.id, power: p, order: o }));
    remember(king, S.turn, `I wrote to the court of ${powerName(l.to)} from my captivity in ${powerName(host)}${smuggled ? `, and ${spy.name} took the letter out unseen` : ""}.`);
    logEvent(S, "captive-letter", `${king.name}, held by ${host}, wrote to ${l.to}${smuggled ? " (smuggled)" : ""}.`, [p], smuggled ? "captive-letter-smuggled" : "captive-letter-sent");
  }
};

P.captiveLetterArrives = function (j) {
  const S = this.s;
  for (const w of S.wordHome) if (w.journey === j.id) w.journey = "";
  if (!isAlive(S, j.to)) return;
  const k = S.reigns.tryGet(j.from);
  const king = k === undefined ? null : findCharacter(S, k.character);
  const who = king === null ? `the ${rulerStyle(j.from)} of ${powerName(j.from)}` : king.name;
  notify(S, j.to, "Notice", "A letter from a captive king", `A letter from ${who}, ${j.to === j.from ? "your king" : `${rulerStyle(j.from)} of ${powerName(j.from)}`}, written in captivity in turn ${j.departTurn}: ${quoteWords(j.text ?? "")}`, king?.id ?? null);
  this.letterDelivered(j);
};
