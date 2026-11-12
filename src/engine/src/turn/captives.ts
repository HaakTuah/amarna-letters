/** Captives and ransom: servants and kings taken, held, ransomed or let go; the rumours and demands that travel with them. */
import type { Rng } from "../core/rng.ts";
import type { CaptiveOrder, PayRansomOrder } from "../model/orders.ts";
import { coverOf, gain, newFact, remember, type Character } from "../model/people.ts";
import { AllPowers, land, powerName, type Power } from "../model/power.ts";
import { Waiting, newJourney, newLossAbroad, newPendingTask, type Journey, type NewsKind } from "../model/records.ts";
import { char, findCharacter, isAlive, logEvent, newId, notify } from "../model/state.ts";
import { formatMoney } from "../rules/calendar.ts";
import { upper } from "../rules/wording.ts";
import { fallenRealmOf, realmOfKing } from "../rules/court.ts";
import { cap } from "../rules/greeting.ts";
import { OrderValidator } from "../rules/validator.ts";
import { removeAll } from "./resolve.ts";
import { TurnEngine } from "./core.ts";

declare module "./core.ts" {
  interface TurnEngine {
    capture(c: Character, host: Power, rng: Rng): void;
    captive(host: Power, co: CaptiveOrder): void;
    /**
     * `where`: the province it is let go in, when not at its captor's court (a convoy stopped on the road); `memory`: how
     * it went free, when its captor did not let it go.
     */
    releaseCaptive(host: Power, c: Character, where?: string, memory?: string): void;
    payRansom(payer: Power, pr: PayRansomOrder): void;
    ransomArrives(j: Journey): void;
    rumor(to: Power, from: Power, text: string, about?: string | null, news?: NewsKind | null, demand?: string | null): void;
    demandArrives(j: Journey): boolean;
  }
}

const P = TurnEngine.prototype;

P.capture = function (c, host, rng) {
  const S = this.s;
  const employer = c.employer!;
  // Its master goes on seeing it at its post until word comes.
  this.coverFor(c, employer, "SpyPosted");
  const post = c.missionTarget !== null ? `the court of ${powerName(c.missionTarget)}` : c.watchProvince !== null ? this.map.get(c.watchProvince).name : "a post";
  c.status = "Captured";
  c.heldBy = host;
  c.duty = "None";
  // Gold he carried to stir the people is in his purse now, on him where he is held (item 17): kept from an errand, not
  // skimmed.
  gain(c, c.stirGold, "Carried");
  c.stirGold = 0;
  c.at = host;
  this.meet(c, host);
  this.outcome(c, host, `Was caught spying at ${post} (season ${S.turn}).`, false);
  const confesses = c.traits.courage < 50 || rng.chance(0.4);
  remember(c, S.turn, `I was caught spying in ${land(host)}.` + (confesses ? ` I told them I serve ${land(employer)}.` : " I did not say whom I serve."));
  notify(
    S,
    host,
    "Notice",
    "A spy is caught",
    `Your watchmen caught ${c.name}` + (confesses ? `, who confesses to serving ${powerName(employer)}.` : ", who will not say whom they serve.") + " You may execute, ransom, turn or release them.",
    c.id,
  );
  // The captor's record says what its court learned: whose spy, only if it confessed. The truth goes in a line
  // nobody's court sees (the god view's), which carries the success marker.
  if (confesses) logEvent(S, "spy-caught", `${host} caught ${c.name}, a spy of ${employer}.`, [host], "spy-caught");
  else {
    logEvent(S, "spy-caught", `${host} caught ${c.name}, a spy who will not say whom they serve.`, [host]);
    logEvent(S, "spy-caught", `${host} caught ${c.name}, a spy of ${employer} who would not say so.`, [], "spy-caught");
  }
  // The talk of the court that holds it, for the envoys and spies there to carry home: whose spy, if it confessed.
  S.losses.push(newLossAbroad({ turn: S.turn, kind: "Captured", characterId: c.id, court: host, master: confesses ? employer : null }));
};

P.captive = function (host, co) {
  const S = this.s;
  const c = char(S, co.character);
  if (c.status !== "Captured" || c.heldBy !== host) {
    this.failed(host, co, "Captive order failed", `Your order for ${c.name} could not be carried out: ${c.name} was no longer your captive.`, "no longer your captive", true, c.id);
    return;
  }
  // Checked again as the season resolves: the captive's king may have dismissed them this season.
  const why = OrderValidator.captiveRefusal(S, c, co.fate);
  if (why !== null) {
    notify(S, host, "Rejected", "Captive order failed", `Your order for ${c.name} could not be carried out: ${why}.`, c.id);
    this.scheduledFailed(host, co, why);
    return;
  }
  const employer = c.employer;
  switch (co.fate) {
    case "StopLetters":
    case "PassLetters":
      // #806: the captive king's letters, kept at this court or let go, from now until the captor says otherwise.
      {
        // For all his letters: the word for each court is cleared. For one court: its keeping, or its exception to a
        // keeping of all of them (`id|!court`).
        const stop = co.fate === "StopLetters";
        if (co.to === undefined || co.to === null) {
          S.lettersStopped = S.lettersStopped.filter((x) => x !== c.id && !x.startsWith(`${c.id}|`));
          if (stop) S.lettersStopped.push(c.id);
        } else {
          S.lettersStopped = S.lettersStopped.filter((x) => x !== `${c.id}|${co.to}` && x !== `${c.id}|!${co.to}`);
          if (stop) S.lettersStopped.push(`${c.id}|${co.to}`);
          else if (S.lettersStopped.includes(c.id)) S.lettersStopped.push(`${c.id}|!${co.to}`);
        }
      }
      break;
    case "Execute": {
      // Its master goes on believing what it believed until the rumour of the death arrives; a king's realm knows at once,
      // for his heir reigns from this season (item 17b).
      const realm = realmOfKing(S, c.id);
      if (employer !== null && realm === null) this.coverFor(c, employer, "None");
      c.status = "Dead";
      c.duty = "None";
      // The dead are never paid: what any court owed it is gone.
      c.owed.clear();
      logEvent(S, "execution", `${host} executed ${c.name}.`, [host]);
      // The rumour reaches its king, and every court that still believes the dead one serves it.
      for (const heard of AllPowers.filter((p) => p !== realm && (p === employer || coverOf(c, p) !== null))) this.rumor(heard, host, `It is said that ${c.name} was put to death in ${powerName(host)}.`, c.id, "Death");
      // Other courts hear of it only from their envoys and spies at this court (see lossesHeard).
      let master: Power | null = null;
      for (const l of S.losses) if (l.characterId === c.id && l.court === host && l.kind === "Captured") master = l.master;
      S.losses.push(newLossAbroad({ turn: S.turn, kind: "PutToDeath", characterId: c.id, court: host, master }));
      if (realm !== null || fallenRealmOf(S, c.id) !== null) this.kingDied(c, `put to death by ${powerName(host)}`, this.courtAt(host));
      break;
    }
    case "Ransom": {
      const payer = OrderValidator.ransomPayer(S, c)!;
      // One open demand per captive: a new one replaces the old. A demand whose word is still on the road
      // goes at once and announces nothing; one the payer has heard of stands, and can be paid, until the
      // new one's word arrives.
      removeAll(S.tasks, (t) => t.kind === "RansomDemand" && t.characterId === c.id && !t.announced);
      const demand = newPendingTask({ id: newId(S, "q"), kind: "RansomDemand", requester: payer, other: host, characterId: c.id, spend: co.ransom, dueTurn: S.turn + 5 });
      S.tasks.push(demand);
      // The owner's answers to item 11b: a demand is a message, which waits at the captor's court for someone going that way.
      const before = S.journeys.length;
      this.rumor(payer, host, `${upper(powerName(host))} holds ${c.name} and demands ${formatMoney(co.ransom)} for their return (order pay_ransom for ${c.id}).`, c.id, "Ransom", demand.id);
      if (S.journeys.length > before) [S.journeys[before].arriveTurn, S.journeys[before].waitAt] = [Waiting, this.courtAt(host)];
      demand.dueTurn = S.turn + 8;
      break;
    }
    case "Turn": {
      const master = employer!;
      const cover = coverOf(c, master);
      // A master that has heard of the capture goes on believing its servant held until word comes from it again.
      if (cover === null) this.coverFor(c, master, "None");
      c.status = "Employed";
      c.secretMaster = host;
      c.poisonText = this.scribe(host, cap(co.poison, 600));
      c.duty = "SpyPosted";
      c.heldBy = null;
      // Back at its post, where it watched from before (a court, or out in a province): what its master believed all along.
      c.at = c.missionTarget;
      c.facts.push(newFact({ id: newId(S, "f"), text: `Was caught by ${land(host)} and now secretly serves it.`, secrecy: "Deep", tag: "turned", knownBy: [host] }));
      remember(c, S.turn, `To save my life I agreed to serve ${land(host)} in secret and send home what they tell me.`);
      logEvent(S, "double-agent", `${host} turned ${c.name} into a double agent against ${employer}.`, [host], "double-agent");
      // Recalled by a master that did not know it was caught: it comes home as told, and is seen when it arrives.
      if (cover !== null && cover.recalled) this.recall(master, c);
      else if (cover !== null) c.covers.splice(c.covers.indexOf(cover), 1);
      break;
    }
    case "Release":
      this.releaseCaptive(host, c);
      break;
    case "Question":
      this.questionCaptive(host, c, co);
      break;
    case "HandOver":
      this.handOver(host, c, co.to!);
      break;
    case "TakePurse":
      this.takePurse(host, c);
      break;
  }
};

/**
 * A captive let go walks home. A master that believes it still at its post (or recalled) goes on believing that until it
 * is home; one that has heard of the capture sees it on the road home at once, so that no ransom is paid for a captive
 * already free.
 */
P.releaseCaptive = function (host, c, where, memory) {
  // A captive on the road under guard (item 10+b) is let go where it is: its convoy is over.
  let at = where ?? (c.at !== null ? this.courtAt(c.at) : this.courtAt(host));
  if (c.duty === "UnderGuard") {
    const convoy = this.s.journeys.find((j) => j.kind === "CaptiveConvoy" && j.characterId === c.id);
    if (convoy !== undefined && convoy.route.length > 0) at = convoy.route[convoy.leg];
    this.s.journeys = this.s.journeys.filter((j) => j !== convoy);
    c.duty = "None";
  }
  c.status = c.employer === null ? "Free" : "Employed";
  c.heldBy = null;
  c.intercepted = false;
  remember(c, this.s.turn, memory ?? `${land(host)} set me free.`);
  // Item 17b: a king set free walks home to his court, and reigns again when he is there.
  const realm = realmOfKing(this.s, c.id);
  if (realm !== null) this.kingGoesHome(c, realm, at);
  else if (c.employer !== null && isAlive(this.s, c.employer)) {
    c.duty = "SpyOutbound";
    this.recall(c.employer, c);
  } else {
    c.duty = "None";
    c.at = host;
  }
};

P.payRansom = function (payer, pr) {
  const S = this.s;
  // Checked again as the season resolves: the captor may have let the captive go, or an earlier order paid already.
  const c = char(S, pr.character);
  const [why, task] = OrderValidator.ransomRefusal(S, payer, c);
  if (why !== null) {
    // #806: his own court's ransom for its king is its business, as late to him as any (no subject, `notify`).
    notify(S, payer, "Rejected", "Ransom not sent", `The ransom for ${c.name} could not be sent: ${why}.`, realmOfKing(S, c.id) === payer ? null : c.id);
    this.scheduledFailed(payer, pr, why);
    return;
  }
  const host = task!.other!;
  if (!this.pay(payer, task!.spend, `the ransom for ${c.name}`, pr, "none was sent")) return;
  S.tasks.splice(S.tasks.indexOf(task!), 1);
  S.journeys.push(
    newJourney({
      id: newId(S, "j"),
      kind: "Ransom",
      departTurn: S.turn,
      arriveTurn: S.turn + this.travelTurns(payer, host),
      from: payer,
      to: host,
      characterId: pr.character,
      gold: task!.spend,
    }),
  );
};

P.ransomArrives = function (j) {
  const S = this.s;
  const c = findCharacter(S, j.characterId);
  S.treasuries.get(j.to).gold += j.gold;
  notify(S, j.to, "Notice", "Ransom paid", `${upper(powerName(j.from))} paid ${formatMoney(j.gold)} for ${c?.name ?? ""}.`, c?.id ?? null);
  if (c !== null && c.status === "Captured" && c.heldBy === j.to) this.releaseCaptive(j.to, c);
};

/**
 * A rumour sent from one court to another. `about`: one of the receiving court's own people the rumour is about, whose
 * cover it ends on arrival. `demand`: for a ransom demand's rumour, the demand it announces.
 */
P.rumor = function (to, from, text, about = null, news = null, demand = null) {
  const S = this.s;
  if (!isAlive(S, to)) return;
  S.journeys.push(
    newJourney({
      id: newId(S, "j"),
      kind: "Rumor",
      departTurn: S.turn,
      arriveTurn: S.turn + this.travelTurns(from, to),
      from,
      to,
      text,
      characterId: about,
      news,
      taskId: demand,
    }),
  );
};

/**
 * A ransom demand's rumour reaches the court asked to pay. Only a demand still standing for a captive still held is
 * announced: one replaced by a newer demand, or for a captive since freed, turned or put to death, announces nothing.
 */
P.demandArrives = function (j) {
  const S = this.s;
  const task = S.tasks.find((t) => t.id === j.taskId) ?? null;
  const c = findCharacter(S, j.characterId);
  if (task === null || c === null || c.status !== "Captured" || c.heldBy !== task.other) {
    if (task !== null) S.tasks.splice(S.tasks.indexOf(task), 1);
    return false;
  }
  task.announced = true;
  // It replaces the demand the payer had heard of before, which could be paid until now.
  removeAll(S.tasks, (t) => t.kind === "RansomDemand" && t.characterId === c.id && t !== task);
  return true;
};
