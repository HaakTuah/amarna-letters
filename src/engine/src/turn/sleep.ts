/**
 * Sleeping seats. The world advances every season, but a seat that may sleep sleeps after every set of orders, and is
 * asked again only when something concerns it or the hidden cap is reached: a king never chooses when he wakes (the design
 * document's "Decided: sleep is the default" and "No triggers of the seat's own"). There is never a global skip: each seat
 * sees only its own wake-ups, and everything it is told comes from its own view. (Scheduled and standing orders are in
 * plans.ts.)
 */
import { EconomyData } from "../model/economy.ts";
import { HSet } from "../core/collections.ts";
import { sortBy, cmpNum } from "../core/seq.ts";
import { cmpStr, trimEnd } from "../core/text.ts";
import type { UnitKind } from "../model/map.ts";
import { characterOf, describe as describeOrder, type Order } from "../model/orders.ts";
import type { MoveFailure } from "../model/outcomes.ts";
import { cmpPower, type Power } from "../model/power.ts";
import type { InboxItem } from "../model/records.ts";
import { newCourtHeld, type PlannedOrder, type SleepState, type StandingOrder } from "../model/sleep.ts";
import { alive, findCharacter, inboxOf, isAlive, notify } from "../model/state.ts";
import { ArchiveTakenTitle } from "./archives.ts";
import { FeeDueTitle } from "./court.ts";
import { removeAll } from "./resolve.ts";
import { idNumber, TurnEngine } from "./core.ts";

/** The most orders a seat may schedule for one season. */
export const MaxScheduledPerSeason = 24;
/** The most seasons a seat may have orders scheduled for at once. */
export const MaxScheduledSeasons = 40;
/** The most standing orders a seat may keep at once. */
export const MaxStanding = 12;
/** The digest keeps this many lines; the oldest go first. */
export const MaxDigest = 60;
/** The notice that a scheduled move failed and will be tried again, its unit's later orders a season later. */
export const MarchHeldUpTitle = "A march is held up";
/** The notice that a unit's march ended, and which of its scheduled orders were dropped. */
export const MarchEndsTitle = "A march ends";
/** The notice that orders for troops the seat no longer has were dropped. */
export const LostTroopsTitle = "Orders for lost troops dropped";
/** The notice that a standing order fired, and what ran. */
export function standingFiredTitle(id: string): string {
  return `Standing order ${id} fired`;
}
/** Why a seat is woken when the hidden cap is reached: it says nothing of the cap. */
export const CapReason = "your counsellors woke you after a long sleep";
/** Why a seat whose last call failed (the stand-in played that season) is asked again, when nothing else concerns it. */
export const AskedAgainReason = "your counsellors woke you";
/**
 * Why a seat is woken when foreign troops end a move next to a province of its homeland that it holds, its capital among
 * them, followed by the move and the provinces it came next to.
 */
export const HomelandReason = "foreign troops came next to your homeland";
/** Why a seat is woken when a siege of a city it holds began last season (followed by the siege). */
export const SiegeBegunReason = "a siege of a city of yours has begun";
/** Why a seat that woke itself was woken (item 9+a: a human may wake himself to act whenever he likes). */
export const SelfWakeReason = "you woke yourself";
/** Why a seat is woken when a city of its own will surrender at the end of this season if its besiegers hold. */
export const SurrenderReason = "a city of yours surrenders at the end of this season unless the siege is broken";
/** Why a seat is woken when foreign troops end a move next to a walled city it holds (a bought city), and none of its homeland. */
export const WallsReason = "foreign troops came next to a walled city of yours";
/**
 * Why a seat is woken when a foreign move into a province it held, or against its troops, failed (followed by the move):
 * it was attacked, though nothing was lost.
 */
export const AttackedReason = "foreign troops attacked you, and failed";
/** Why a sleeping seat holds court: an envoy of `from` waits at its door. */
export function envoyWaits(from: Power): string {
  return `an envoy of ${from} waits to be received`;
}
/** Whether a wake reason is an envoy waiting, the one reason that wakes a seat for its audiences only. */
export function isEnvoyWaiting(reason: string): boolean {
  return reason.startsWith("an envoy of ") && reason.endsWith(" waits to be received");
}
/** Why a seat that held court asleep gives orders after all: it chose at one of its audiences to reopen them. */
export const ReopenReason = "you chose at your audience to reopen your orders";
/**
 * Why a seat that held court asleep gives orders after all although it did not choose to: a call failed at one of its
 * audiences and the script king answered the envoy in its place, so the choice to let its orders stand was never its own.
 */
export const StandInCourtReason = "your counsellors answered an envoy in your place";
/**
 * Why a sleeping seat gives orders after a light alert it read ("Light alerts go to the cheaper model too"): it names
 * what came, never why it woke the king.
 */
export function wordCame(what: string): string {
  return `word came: ${what}`;
}

/** How many digest lines each seat's digest took this season, so that a seat woken by a light alert reads them as news. */
const digestAdded = new WeakMap<TurnEngine, Map<Power, number>>();

/**
 * Adds letters sent from an audience to those sent before it this season: only letters (dispatches, or one that could not
 * be read), in the order sent, a later letter for the same person replacing an earlier one.
 */
export function addLetters(sent: Order[], letters: readonly Order[] | null | undefined): void {
  for (const letter of letters ?? []) {
    if (!(letter.type === "dispatch" || letter.type === "unreadable")) continue;
    const who = characterOf(letter);
    if (who !== null) removeAll(sent, (x) => characterOf(x) === who);
    sent.push(letter);
  }
}

/**
 * Whether others stopped a move of `p`'s, so that its failure wakes the seat when the move was scheduled: another power's
 * unit held it off, met it or took the province first. Not a move stopped by the seat's own unit, or for want of a convoy.
 */
export function stoppedByOthers(p: Power, f: MoveFailure): boolean {
  if (f.stop === "NoConvoy" || f.stop === "OwnUnit") return false;
  return f.power !== null && f.power !== p;
}

export function kindName(k: UnitKind): string {
  return k === "Army" ? "army" : "fleet";
}

declare module "./core.ts" {
  interface TurnEngine {
    isAsleep(p: Power): boolean;
    wakeSelf(p: Power): void;
    sleepOf(p: Power): SleepState | null;
    standingOf(p: Power): StandingOrder[];
    wakeCheck(): void;
    wake(sl: SleepState, reasons: string[]): void;
    courtsHeld(): void;
    wakeReasons(p: Power, sl: SleepState): string[];
    wakeReason(i: InboxItem): string | null;
    collectDigest(p: Power, sl: SleepState): void;
    digestLine(i: InboxItem): string | null;
    lostUnits(p: Power, sl: SleepState | null): void;
    endSleep(p: Power): void;
    stoppedByOthers(p: Power, f: MoveFailure): boolean;
    lightAlerts(p: Power): { line: string; text: string; weighty: boolean }[];
    wakeOnWord(p: Power, line: string): void;
  }
}

const P = TurnEngine.prototype;

P.isAsleep = function (p) {
  const S = this.s;
  const sl = S.sleep.tryGet(p);
  return S.config.sleepingSeats && isAlive(S, p) && sl !== undefined && sl.asleep;
};

/** A sleeping seat wakes itself this season (a human who wants to act), as any other reason would wake it. */
P.wakeSelf = function (p) {
  const sl = this.sleepOf(p);
  if (sl !== null && sl.asleep) this.wake(sl, [SelfWakeReason]);
};

/** The sleep state of a seat that may sleep, or null for one that plays every season. */
P.sleepOf = function (p) {
  return this.s.config.sleepingSeats ? (this.s.sleep.tryGet(p) ?? null) : null;
};

/** A seat's standing orders as they stand (none for a seat that never kept one). For reading only. */
P.standingOf = function (p) {
  return this.s.standing.tryGet(p)?.orders ?? [];
};

P.stoppedByOthers = function (p, f) {
  return stoppedByOthers(p, f);
};

/**
 * Decides which sleeping seats wake this season. Call it once the season's arrivals and reports are in (after beginTurn
 * and the reports are fulfilled), before audiences and orders. A seat whose only reasons are envoys waiting is woken for
 * its audiences only (SleepState.holdsCourt): it stays asleep, and once the audiences are done courtsHeld reopens its
 * orders if it chose so. Every other reason reopens them directly, without asking.
 */
P.wakeCheck = function () {
  const S = this.s;
  // Every seat may keep standing orders: troops a seat that does not sleep has lost take their standing orders with them
  // here too, so that its view shows only those that can still fire (a sleeping seat's go below, with its schedule).
  for (const p of alive(S).filter((p) => this.sleepOf(p) === null)) this.lostUnits(p, null);
  // Envoys a king's standing answers cover are answered for it: they wake nobody.
  this.assignAnswers();
  if (!S.config.sleepingSeats) return;
  for (const [p, sl] of sortBy(S.sleep.entries(), [([k]: [Power, SleepState]) => k, cmpPower])) {
    const before = sl.wokenBecause;
    sl.wokenBecause = [];
    // What an earlier season's court left is never carried on (courtsHeld clears it; resolve uses the letters).
    sl.holdsCourt = false;
    sl.reopen = false;
    sl.stoodIn = false;
    sl.courtLetters.length = 0;
    if (!isAlive(S, p)) continue;
    // Troops lost since last season (in battle, by desertion or plague, disbanded or given away) take their orders with them.
    this.lostUnits(p, sl);
    if (!sl.asleep) {
      // Awake although it gave orders before: its last call failed and the stand-in played. It is asked again, told why it
      // was woken last season (it never read it) and what concerns it now, as if it had been woken. Its own choice at last
      // season's audience to reopen its orders is not carried: it made it, and it is spent.
      if (sl.lastCalled > 0 && sl.lastCalled < S.turn - 1) {
        const why = before.filter((r) => r !== AskedAgainReason && r !== ReopenReason);
        for (const r of this.wakeReasons(p, sl)) if (!why.includes(r)) why.push(r);
        sl.wokenBecause = why.length > 0 ? why : [AskedAgainReason];
      }
      continue;
    }
    const reasons = this.wakeReasons(p, sl);
    if (reasons.length === 0) {
      this.collectDigest(p, sl);
      continue;
    }
    // Only envoys waiting: an audience, not an orders call. The seat stays asleep and its orders stand; at its audiences it
    // judges whether the news changes its plan (Part H). Its digest for the season is collected once the audiences are
    // done, if it sleeps on.
    if (reasons.every(isEnvoyWaiting)) {
      sl.holdsCourt = true;
      sl.wokenBecause = reasons;
      sl.courts.push(newCourtHeld({ turn: S.turn, envoys: S.audiences.filter((a) => a.host === p && a.answer === null).length }));
      continue;
    }
    this.wake(sl, reasons);
  }
};

/** A sleeping seat wakes for an orders call: the reasons it waited on are spent, and its spell ends. */
P.wake = function (sl, reasons) {
  sl.asleep = false;
  sl.wokenBecause = reasons;
  sl.pendingWake.length = 0;
  const spell = sl.history.length > 0 ? sl.history[sl.history.length - 1] : null;
  if (spell !== null && spell.wokeAt === 0) {
    spell.wokeAt = this.s.turn;
    spell.reasons = [...reasons];
  }
};

/**
 * Once the season's audiences are applied (applyAudience): each seat that held court asleep either reopened its orders at
 * one of its audiences, and wakes for an orders call this season as when anything else wakes it, or sleeps on with its
 * orders standing, and what happened this season goes to its digest. Either way the court is recorded for the reports.
 * The letters it sent stay for resolve, which checks them first among its orders. Only the seat's own replies decide: if
 * a call failed at one of its audiences and the stand-in answered, it is asked for orders this season all the same.
 */
P.courtsHeld = function () {
  const S = this.s;
  if (!S.config.sleepingSeats) return;
  for (const [p, sl] of sortBy(S.sleep.entries(), [([k]: [Power, SleepState]) => k, cmpPower])) {
    if (!sl.holdsCourt) continue;
    sl.holdsCourt = false;
    const live = isAlive(S, p) && sl.asleep;
    const reopened = sl.reopen && live;
    const stoodIn = sl.stoodIn && live;
    sl.reopen = false;
    sl.stoodIn = false;
    const court = sl.courts.length > 0 ? sl.courts[sl.courts.length - 1] : null;
    if (court !== null && court.turn === S.turn) {
      court.reopened = reopened;
      court.standIn = stoodIn;
    }
    if (reopened) this.wake(sl, [...sl.wokenBecause, ReopenReason]);
    else if (stoodIn) this.wake(sl, [...sl.wokenBecause, StandInCourtReason]);
    else {
      sl.wokenBecause.length = 0;
      this.collectDigest(p, sl);
    }
  }
};

/**
 * What wakes a seat, and nothing else: the default triggers, events the engine itself judges to concern it, and the hidden
 * cap. An envoy waiting to be received; foreign troops entering or attacking its land or its troops, or ending a move next
 * to a province of its homeland or a walled city, while it holds it; a siege of a city of its own begun, or about to make
 * it surrender; land or troops lost; a scheduled or standing order that others foiled (scheduledFailed); a ransom
 * demanded; a servant giving notice; the hidden cap. The seat itself can neither name a season to be woken in nor set
 * triggers of its own, nor wake itself through its own orders. An envoy waiting wakes it for its audiences only; every
 * other reason here is an order trigger, which reopens its orders directly (wakeCheck).
 */
P.wakeReasons = function (p, sl) {
  const S = this.s;
  const Map = this.map;
  const why: string[] = [];
  const add = (reason: string): void => {
    if (!why.includes(reason)) why.push(reason);
  };

  for (const r of sl.pendingWake) add(r);
  if (sl.asleep && S.turn >= sl.wakeAt) add(CapReason);

  for (const a of sortBy(
    S.audiences.filter((a) => a.host === p && a.answer === null),
    [(a) => idNumber(a.id), cmpNum],
  ))
    add(envoyWaits(a.from));

  // Last season's moves as it saw them: foreign troops that entered its land, its own troops destroyed; a threat to a
  // province of its homeland, or to a walled city it holds: foreign troops that ended a move next to one, while it holds
  // it. Troops that merely stand there do not wake it again, and a move into its land wakes it for that alone. An attack
  // that failed wakes it too: a foreign move into a province it held, or into one where its troops stood, that did not get
  // in.
  const home = new HSet(Map.homeOf(p).map((x) => x.id).filter((x) => S.owner.getOrDefault(x, null) === p));
  const walled = new HSet([...S.walls.keys()].filter((x) => S.owner.getOrDefault(x, null) === p));
  const seen = S.lastSeen.tryGet(p) ?? [];
  const stood = new HSet(seen.filter((o) => o.power === p).map((o) => o.province));
  for (const o of seen) {
    if (o.power === p) {
      if (o.destroyed) add(`your ${kindName(o.unitKind)} in ${o.province} was destroyed`);
      else if (o.fellBack !== null) add(`your ${kindName(o.unitKind)} in ${o.province} was beaten from it and fell back to ${o.fellBack}`);
      continue;
    }
    if (o.order !== "move" || o.target === null) continue;
    const t = o.target;
    if (!o.succeeded) {
      if (o.targetOwner === p || stood.has(t)) add(`${AttackedReason}: ${o.power}'s ${kindName(o.unitKind)} tried to move ${o.province} -> ${t}`);
      continue;
    }
    const move = `${o.power}'s ${kindName(o.unitKind)} moved ${o.province} -> ${t}`;
    if (o.targetOwner === p) add(o.guest ? `guests entered your land by the passage or basing you granted: ${move}` : `foreign troops entered your land: ${move}`);
    else {
      const near = sortBy(
        Map.neighbors(t).filter((x) => home.has(x) || walled.has(x)),
        [(x: string) => x, cmpStr],
      );
      if (near.length > 0) add(`${near.some((x) => home.has(x)) ? HomelandReason : WallsReason}: ${move}, next to ${near.join(", ")}`);
    }
  }
  // Sieges of its own cities: one begun last season, and one that will make the city surrender at the end of this season
  // if the besiegers just hold, the last season to break it. Each fires once.
  for (const x of sortBy(
    S.sieges.filter((x) => S.owner.getOrDefault(x.province, null) === p),
    [(x) => x.province, cmpStr],
  )) {
    const walls = S.walls.getOrDefault(x.province, 0);
    // Item 9+a: it falls by hunger (it could not feed its people as this season began) or once its walls are breached.
    const breach = walls * EconomyData.breachPerLevel;
    const state = `${x.power}'s army besieges ${x.province} (walls ${walls}), worn down ${x.progress} of ${breach}`;
    if (S.starving.includes(x.province)) add(`${SurrenderReason}: ${state}, and its food is gone`);
    else if (x.progress + 1 >= breach) add(`${SurrenderReason}: ${state}`);
    else if (x.since === S.turn - 1) add(`${SiegeBegunReason}: ${state}`);
  }
  for (const i of inboxOf(S, p).filter((i) => i.turn === S.turn)) {
    const reason = this.wakeReason(i);
    if (reason !== null) add(reason);
  }
  return why;
};

/** The notices of land lost: surrendered to a siege, gone over to another as the season began, risen against its master. */
const LandLostTitles: readonly string[] = ["Land lost", "A province lost", "A province rises"];

/** The news this season that wakes a seat: land lost, troops lost to desertion or plague, a ransom demanded, a servant's notice. */
P.wakeReason = function (i) {
  switch (i.kind) {
    case "Battle":
      // Item 17++: land goes over to another, or rises, by the season's rule.
      return LandLostTitles.includes(i.title) ? `land lost: ${i.body}` : null;
    case "Catastrophe":
      return i.body.includes("it has destroyed your") ? "plague destroyed troops of yours" : null;
    case "Notice": {
      if (i.title === FeeDueTitle) return `a fee fell due unpaid: ${findCharacter(this.s, i.subject)?.name ?? i.body}`;
      // The economy's failures (item 9+a): troops that mutinied, went hungry or unpaid, a caravan lost.
      if (i.title === "The treasury" && i.body.includes("mutinied")) return "troops of yours mutinied";
      if (i.title === "The treasury" && (i.body.includes("Hungry this season") || i.body.includes("Not paid this season"))) return "troops of yours went hungry or unpaid";
      if (i.title === "Markets and caravans" && (i.body.includes("was taken") || i.body.includes("Outlaws") || i.body.includes("deserted") || i.body.includes("sank") || i.body.includes("were seized"))) return "a caravan of yours was lost";
      return null;
    }
    case "Rumor":
      return i.body.includes("order pay_ransom") ? "a ransom is demanded for one of your people" : null;
    default:
      return null;
  }
};

/**
 * What happened this season that did not wake a sleeping seat, one line each, for the digest it reads when it wakes: troop
 * movements it saw, and a line for each report, catastrophe, forgery, caught spy and refused or failed order whose full
 * text waits in its news.
 */
P.collectDigest = function (p, sl) {
  const S = this.s;
  const before = sl.digest.length;
  let added = digestAdded.get(this);
  if (added === undefined) digestAdded.set(this, (added = new Map()));
  for (const o of S.lastSeen.tryGet(p) ?? []) {
    if (o.power === p || o.order !== "move" || o.target === null) continue;
    const who = `${o.power}'s ${kindName(o.unitKind)}`;
    sl.digest.push(o.succeeded ? `turn ${S.turn - 1}: ${who} moved ${o.province} -> ${o.target}` : `turn ${S.turn - 1}: ${who} tried to move ${o.province} -> ${o.target} and failed`);
  }
  // Each line is dated by the season its news came, except a standing order's firing, dated by the season it fired.
  for (const i of inboxOf(S, p).filter((i) => i.turn === S.turn)) {
    const line = this.digestLine(i);
    if (line !== null) sl.digest.push(`turn ${isFiring(i) ? S.turn - 1 : S.turn}: ${line}`);
  }
  added.set(p, (added.get(p) ?? 0) + sl.digest.length - before);
  if (sl.digest.length > MaxDigest) {
    sl.digestLeftOut += sl.digest.length - MaxDigest;
    sl.digest.splice(0, sl.digest.length - MaxDigest);
  }
};

P.digestLine = function (i) {
  switch (i.kind) {
    case "EnvoyReport": {
      const envoy = findCharacter(this.s, i.subject);
      return envoy !== null ? `your envoy ${envoy.name} came home with a report` : `an envoy came home with a report (${i.title})`;
    }
    case "SpyReport":
      return `a spy's report arrived (${i.title})`;
    case "CheckResult":
    case "Assay":
    case "Authentication":
      return `a report arrived (${i.title})`;
    case "Candidates":
      return i.title === "No candidates" ? "nobody came forward to seek service" : `a candidate presented themselves (${i.title})`;
    case "Catastrophe":
      return `a catastrophe struck your land (${i.title})`;
    case "Tablet":
      return `a tablet you ordered is ready (${i.title})`;
    case "Notice":
      if (i.title === "A spy is caught") return "a spy was caught at your court";
      if (i.title === ArchiveTakenTitle) return firstClause(i.body);
      return null;
    case "Rejected":
      return `an order was refused or failed (${i.title})`;
    case "Resolution":
      return isFiring(i) ? "your s" + i.title.slice(1) : null;
    default:
      return null;
  }
};

/**
 * The light alerts of a seat that sleeps on this season ("Light alerts go to the cheaper model too"): the season's news
 * that went to its digest, each with its digest line and its full text. None for a seat awake, holding court or fallen:
 * those read their news in their own call. Only what the seat itself could see, so routing never tells it anything.
 */
P.lightAlerts = function (p) {
  const S = this.s;
  const sl = this.sleepOf(p);
  if (sl === null || !sl.asleep || sl.holdsCourt || !isAlive(S, p)) return [];
  const out: { line: string; text: string; weighty: boolean }[] = [];
  for (const i of inboxOf(S, p).filter((i) => i.turn === S.turn)) {
    const line = this.digestLine(i);
    // "Straight to the seat's own model": a failed or refused order, a check, an assay or an authentication (forgery and
    // evidence), a caught spy or a taken archive. The rest is light: reports home, rumours, candidates, a catastrophe to
    // the fields (one that destroys troops or land wakes the king by itself).
    const weighty = ["Rejected", "CheckResult", "Assay", "Authentication", "Notice"].includes(i.kind);
    if (line !== null) out.push({ line, text: `${i.title}: ${i.body}`, weighty });
  }
  return out;
};

/**
 * A sleeping seat is woken for an orders call by a light alert its cheaper model read: the season's lines leave its digest
 * (it reads them in full as this season's news), and it is told what came, never why that woke it.
 */
P.wakeOnWord = function (p, line) {
  const sl = this.sleepOf(p);
  if (sl === null || !sl.asleep || sl.holdsCourt) return;
  const n = Math.min(digestAdded.get(this)?.get(p) ?? 0, sl.digest.length);
  sl.digest.splice(sl.digest.length - n, n);
  this.wake(sl, [wordCame(line)]);
};

/**
 * A notice's first clause, up to its first colon or semicolon, begun in lower case for the digest: "With Ashur you took the
 * archive of Assyria: copies of …" reads "with Ashur you took the archive of Assyria".
 */
function firstClause(body: string): string {
  const clause = trimEnd(body.split(/[:;]/)[0], ". ");
  if (clause.length === 0) return clause;
  const low = clause[0].toLowerCase();
  return (low.length === 1 ? low : clause[0]) + clause.slice(1);
}

/** The notice that one of the seat's standing orders fired (standingFiredTitle). */
function isFiring(i: InboxItem): boolean {
  return i.kind === "Resolution" && i.title.startsWith("Standing order ") && i.title.endsWith(" fired");
}

/**
 * Orders bound to troops the seat no longer has (destroyed, deserted, disbanded or given away) can never run: they are
 * dropped (the scheduled orders of a seat that sleeps, and any seat's standing orders), a standing order with them if it
 * waited on that unit or has no orders left, and the seat is told in its news. Dropping them wakes nobody.
 */
P.lostUnits = function (p, sl) {
  const S = this.s;
  const gone = (id: string | null): boolean => id !== null && !S.units.some((u) => u.id === id && u.power === p);
  const lost = (x: PlannedOrder): boolean => gone(x.unitId) || gone(x.otherUnitId);
  const lines: string[] = [];
  if (sl !== null) {
    lines.push(...sl.scheduled.filter(lost).map((x) => `turn ${x.turn}: ${describeOrder(x.order)}`));
    removeAll(sl.scheduled, lost);
  }
  for (const st of [...this.standingOf(p)]) {
    if (gone(st.unitId) || st.orders.every(lost)) {
      const book = S.standing.get(p).orders;
      book.splice(book.indexOf(st), 1);
      lines.push(`standing order ${st.id} (${st.when === "UnitAttacked" ? `when your unit that stood in ${st.province ?? ""} is attacked` : entersText(p, st.power, st.province ?? "?")})`);
    } else {
      const lostOrders = st.orders.filter(lost).map((x) => describeOrder(x.order));
      if (lostOrders.length > 0) {
        removeAll(st.orders, lost);
        lines.push(`from standing order ${st.id}: ${lostOrders.join("; ")}`);
      }
    }
  }
  if (lines.length === 0) return;
  notify(
    S,
    p,
    "Rejected",
    LostTroopsTitle,
    "These orders were for troops you no longer have (destroyed, deserted, disbanded or given away), so they were dropped. Each names its unit by where it stood when you gave the order:\n" +
      lines.map((x) => "- " + x).join("\n"),
  );
};

/** A sleeping seat whose kingdom falls stops sleeping: its last spell ends that season. */
P.endSleep = function (p) {
  const sl = this.s.sleep.tryGet(p);
  if (sl === undefined || !sl.asleep) return;
  sl.asleep = false;
  const spell = sl.history.length > 0 ? sl.history[sl.history.length - 1] : null;
  if (spell !== null && spell.wokeAt === 0) {
    spell.wokeAt = this.s.turn + 1;
    spell.reasons = ["the kingdom fell"];
  }
};

/** The words for StandingWhen.UnitEnters: whose troops, and where. */
export function entersText(viewer: Power, power: Power | null, province: string): string {
  return `when ${power !== null ? (power === viewer ? "your own" : `${power}'s`) : "foreign"} troops enter ${province}`;
}

