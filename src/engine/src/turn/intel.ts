/** Spies, counter-intelligence, captives, assays, authentication and forgery. */
import { Dict, HSet } from "../core/collections.ts";
import { clamp, roundEven, toInt } from "../core/num.ts";
import type { Rng } from "../core/rng.ts";
import { cmpNum, distinct, groupBy, sortBy } from "../core/seq.ts";
import { cmpStr } from "../core/text.ts";
import { newMindRequest } from "../model/exchanges.ts";
import type { CaptiveOrder, Order, PayRansomOrder, PlaceSpyOrder, AssayOrder, ForgeOrder } from "../model/orders.ts";
import { coverOf, newFact, remember, type Character, type Cover } from "../model/people.ts";
import { AllPowers, land, type Power } from "../model/power.ts";
import { newJourney, newLossAbroad, newPendingTask, newSpyReport, newTablet, newTabletCopy, type Journey, type LossAbroad, type NewsKind, type PendingTask } from "../model/records.ts";
import { alive, char, findCharacter, isAlive, logEvent, newId, notify, ownedBy } from "../model/state.ts";
import { formatMoney } from "../rules/calendar.ts";
import { cap } from "../rules/greeting.ts";
import { checkClauses, renderClauses } from "../rules/clauses.ts";
import { OrderValidator } from "../rules/validator.ts";
import { Views } from "../rules/views.ts";
import { removeAll } from "./resolve.ts";
import { idNumber, TurnEngine } from "./core.ts";

/** How long a court talks of a servant it put to death: the season of the death and this many after. */
export const LossNewsSeasons = 3;

declare module "./core.ts" {
  interface TurnEngine {
    resolveIntelligence(orders: [Power, Order][]): void;
    placeSpy(p: Power, ps: PlaceSpyOrder): void;
    spyArrives(j: Journey): void;
    recall(p: Power, c: Character): void;
    recallCovered(p: Power, c: Character, cover: Cover): void;
    spyComesHome(j: Journey): void;
    watchAndReport(): void;
    spyObserve(c: Character, rng: Rng): string[];
    lossesHeard(carrier: Character, court: Power, held: number, death: number): string[];
    spyReportArrives(j: Journey): void;
    capture(c: Character, host: Power, rng: Rng): void;
    captive(host: Power, co: CaptiveOrder): void;
    releaseCaptive(host: Power, c: Character): void;
    payRansom(payer: Power, pr: PayRansomOrder): void;
    ransomArrives(j: Journey): void;
    rumor(to: Power, from: Power, text: string, about?: string | null, news?: NewsKind | null, demand?: string | null): void;
    demandArrives(j: Journey): boolean;
    assay(p: Power, a: AssayOrder): void;
    finishAuthentication(task: PendingTask): void;
    forge(p: Power, f: ForgeOrder): void;
  }
}

const P = TurnEngine.prototype;

P.resolveIntelligence = function (orders) {
  const S = this.s;
  for (const [p, o] of orders) if (o.type === "counterIntel" && this.pay(p, o.spend, "watchmen", o, "none were set")) S.counterIntel.set(p, o.spend);

  // Captors decide first, so that a ransom paid the same season meets the captive as its captor left them,
  // whichever court comes first.
  for (const [p, o] of orders) if (o.type === "captive") this.captive(p, o);

  for (const [p, o] of orders) {
    switch (o.type) {
      case "spy":
        this.placeSpy(p, o);
        break;
      case "recall": {
        const recalled = char(S, o.character);
        const cover = coverOf(recalled, p);
        if (cover !== null) this.recallCovered(p, recalled, cover);
        else if (recalled.employer === p && recalled.status === "Employed" && recalled.duty === "SpyPosted") this.recall(p, recalled);
        else this.failed(p, o, "Recall failed", `${recalled.name} was not watching anywhere for you, so could not be recalled.`, "not on a mission", true, recalled.id);
        break;
      }
      case "assay":
        this.assay(p, o);
        break;
      case "authenticate":
        if (this.pay(p, o.spend, "the examination of a tablet", o, `tablet ${o.copy} was not examined`))
          S.tasks.push(newPendingTask({ id: newId(S, "q"), kind: "Authenticate", requester: p, dueTurn: S.turn + 1, copyId: o.copy, spend: o.spend }));
        break;
      case "forge":
        this.forge(p, o);
        break;
      case "payRansom":
        this.payRansom(p, o);
        break;
    }
  }

  this.watchAndReport();
};

P.placeSpy = function (p, ps) {
  const S = this.s;
  const Map = this.map;
  const c = char(S, ps.character);
  const court = ps.court ?? null;
  const province = ps.province ?? null;
  const target = court !== null ? Map.capital(court).id : province!;
  c.duty = "SpyOutbound";
  c.at = null;
  c.missionTarget = court;
  c.watchProvince = province;
  const j = newJourney({ id: newId(S, "j"), kind: "SpyOutbound", departTurn: S.turn, from: p, to: court ?? p, characterId: c.id });
  S.journeys.push(j);
  this.setOut(j, Map.capital(p).id, target);
  const travel = j.arriveTurn - S.turn;
  remember(c, S.turn, `My lord of ${land(p)} sent me quietly to watch ${court !== null ? land(court) : Map.get(province!).name}.`);
  notify(S, p, "Notice", "Agent sent", `${c.name} left last season to watch ${court ?? Map.get(province!).name}; the journey should take about ${travel} season(s).`, c.id);
};

P.spyArrives = function (j) {
  const c = char(this.s, j.characterId!);
  if (c.status === "Free") {
    // Dismissed on the way, or its kingdom fell: free at the court it was going to watch, or back from the province.
    if (c.missionTarget !== null) {
      const court = c.missionTarget;
      c.duty = "None";
      c.at = court;
      c.missionTarget = null;
      c.watchProvince = null;
    } else this.recall(j.from, c);
    return;
  }
  // Taken into another court's service on the way: it is there already.
  if (c.status !== "Employed" || c.employer !== j.from) return;
  c.duty = "SpyPosted";
  c.at = c.missionTarget;
};

P.recall = function (p, c) {
  const S = this.s;
  const Map = this.map;
  const from = c.missionTarget !== null ? Map.capital(c.missionTarget).id : (c.watchProvince ?? Map.capital(p).id);
  c.duty = "EnvoyHomebound";
  c.at = null;
  const j = newJourney({ id: newId(S, "j"), kind: "SpyHomebound", departTurn: S.turn, from: c.missionTarget ?? p, to: p, characterId: c.id });
  S.journeys.push(j);
  this.setOut(j, from, Map.capital(p).id);
};

/**
 * A spy its master still believes at its post, though it was caught or let go: the master now believes it on the road
 * home, and hears a season after it was due that it has not come back. If its captor turns it, it comes home as told.
 */
P.recallCovered = function (p, c, cover) {
  const S = this.s;
  const Map = this.map;
  cover.believed = "EnvoyHomebound";
  cover.recalled = true;
  cover.dutyText = "on the road home";
  cover.whereText = c.watchProvince !== null ? `in ${c.watchProvince}` : "travelling";
  const post = c.missionTarget !== null ? Map.capital(c.missionTarget).id : (c.watchProvince ?? Map.capital(p).id);
  const place = c.missionTarget !== null ? `the court of ${c.missionTarget}` : c.watchProvince !== null ? Map.get(c.watchProvince).name : p;
  const due = S.turn + this.travelTurnsBetween(post, Map.capital(p).id);
  // Due back as a spy really recalled now would be.
  cover.timingText = Views.homeTiming(due);
  this.overdue(p, c, c.heldBy ?? c.missionTarget ?? p, due, place);
};

P.spyComesHome = function (j) {
  const S = this.s;
  const c = char(S, j.characterId!);
  // Dismissed on the way: free at the court it came back to. Taken into another court's service: it is there already.
  const free = c.status === "Free";
  if (!free && (c.status !== "Employed" || c.employer !== j.to)) return;
  c.duty = "None";
  c.at = j.to;
  c.missionTarget = null;
  c.watchProvince = null;
  c.turnsAbroad = 0;
  this.bringNews(j, j.to, c);
  if (!free) notify(S, j.to, "Notice", "Agent returns", `${c.name} is back at court` + (j.turnedBack !== null ? `: ${j.turnedBack}.` : "."), c.id);
};

/** Every posted spy risks detection, then observes what its competence allows and sends word home. */
P.watchAndReport = function () {
  const S = this.s;
  const Map = this.map;
  for (const c of sortBy(
    S.characters.filter((c) => c.duty === "SpyPosted" && c.status === "Employed"),
    [(c: Character) => idNumber(c.id), cmpNum],
  )) {
    const employer = c.employer!;
    const host = c.missionTarget ?? (c.watchProvince !== null ? S.owner.getOrDefault(c.watchProvince, null) : null);
    const rng = this.r("spy", c.id);

    // A fallen court has nobody left to catch a spy, nor to decide its fate.
    if (host !== null && host !== employer && c.secretMaster !== host && isAlive(S, host)) {
      const watch = S.counterIntel.getOrDefault(host, 0);
      const p = clamp(0.05 + watch / 300.0 - c.traits.competence / 400.0, 0.02, 0.6);
      if (rng.chance(p)) {
        this.capture(c, host, rng);
        continue;
      }
    }

    // What the spy was when it observed: a report that arrives after its capture is still written as it was then.
    const report = newSpyReport({
      spyId: c.id,
      court: c.missionTarget,
      province: c.watchProvince,
      observedTurn: S.turn,
      factCount: c.facts.length,
      secretMaster: c.secretMaster,
      lord: employer,
      wage: c.contract?.wage ?? 0,
      purse: c.purse,
      backPay: c.backPay.clone(),
    });
    report.observations.push(...this.spyObserve(c, rng));
    if (c.secretMaster !== null && c.secretMaster === host) {
      report.poison = c.poisonText;
      report.observations = report.observations.slice(0, 1);
    }
    // A spy at a living court copies from its archive; one turned by that court sends home only what it is told.
    else if (c.missionTarget !== null && isAlive(S, c.missionTarget)) report.tabletIds = this.copyFromArchive(c, c.missionTarget, employer);
    const from = c.missionTarget !== null ? Map.capital(c.missionTarget).id : (c.watchProvince ?? Map.capital(employer).id);
    S.journeys.push(
      newJourney({
        id: newId(S, "j"),
        kind: "SpyReport",
        departTurn: S.turn,
        arriveTurn: S.turn + this.travelTurnsBetween(from, Map.capital(employer).id),
        from: host ?? employer,
        to: employer,
        characterId: c.id,
        report,
      }),
    );
  }
};

P.spyObserve = function (c, rng) {
  const S = this.s;
  const Map = this.map;
  const obs: string[] = [];
  const skill = c.traits.competence / 100.0;
  if (c.missionTarget !== null) {
    const court = c.missionTarget;
    const landHeld = new HSet(ownedBy(S, court));
    const near = new HSet<string>(landHeld);
    for (const id of landHeld) for (const n of Map.neighbors(id)) near.add(n);
    for (const u of sortBy(
      S.units.filter((u) => near.has(u.province)),
      [(u) => u.province, cmpStr],
    ))
      if (rng.chance(0.35 + skill * 0.6)) obs.push(`${u.power} has ${u.kind === "Army" ? "an army" : "a fleet"} in ${Map.get(u.province).name}.`);
    if (rng.chance(skill)) {
      const g = S.treasuries.get(court).gold;
      const lo = Math.max(0, Math.trunc(g * (0.75 + rng.nextDouble() * 0.2)));
      const hi = Math.trunc(g * (1.05 + rng.nextDouble() * 0.25)) + 20;
      obs.push(`The treasury of ${court} holds between ${formatMoney(lo)} and ${formatMoney(hi)}.`);
    }
    for (const v of S.characters.filter((x) => x.at === court && x.id !== c.id && x.employer !== null && x.employer !== court && (x.duty === "EnvoyAtCourt" || x.duty === "Detained")))
      if (rng.chance(skill)) obs.push(`${v.name}, envoy of ${v.employer}, was received at ${court}${v.duty === "Detained" ? " and is being held there" : ""}.`);
    for (const cat of S.catastrophes.filter((x) => x.power === court && x.endTurn >= S.turn && x.startTurn <= S.turn + 1)) obs.push(`In ${court}: ${cat.text}`);
    // The captives the court holds, noticed as envoys at court are; its executions, always, as catastrophes are.
    obs.push(...this.lossesHeard(c, court, skill, 1));
    const lord = c.employer!;
    for (const x of S.characters.filter((x) => x.employer === court && x.at === court && x.id !== c.id)) {
      const secret = x.facts.find((f) => f.secrecy === "Hidden" && !f.knownBy.includes(lord)) ?? null;
      const deep = x.facts.find((f) => f.secrecy === "Deep" && !f.knownBy.includes(lord)) ?? null;
      if (secret !== null && rng.chance(skill / 2.5)) {
        secret.knownBy.push(lord);
        obs.push(`About ${x.name}: ${secret.text}`);
      } else if (deep !== null && rng.chance(skill / 6)) {
        deep.knownBy.push(lord);
        obs.push(`About ${x.name}: ${deep.text}`);
      }
    }
  } else if (c.watchProvince !== null) {
    const wp = c.watchProvince;
    const watched = new HSet([...Map.neighbors(wp), wp]);
    for (const u of sortBy(
      S.units.filter((u) => watched.has(u.province)),
      [(u) => u.province, cmpStr],
    ))
      if (rng.chance(0.5 + skill * 0.5)) obs.push(`${u.power} has ${u.kind === "Army" ? "an army" : "a fleet"} in ${Map.get(u.province).name}.`);
  }
  if (obs.length === 0) obs.push("Nothing of note this season.");
  return obs;
};

/**
 * What a carrier (an envoy received at `court`, or a spy posted there) hears of the servants of other courts caught or put
 * to death there: the captives the court still holds, each with the chance `held`, and those it put to death in the last
 * LossNewsSeasons seasons, with the chance `death`, named with their master where the court knows it. Its own random
 * stream, so nothing else the carrier notices changes. Each line begins with the court's name, as the carrier's other news
 * of the court does.
 */
P.lossesHeard = function (carrier, court, held, death) {
  const S = this.s;
  const rng = this.r("losses-heard", carrier.id);
  const heard: string[] = [];
  const talk = sortBy(
    groupBy(
      S.losses.filter((l) => l.court === court && l.characterId !== carrier.id),
      (l) => `${l.characterId}\u0000${l.kind}`,
    ).map(([, g]) => g[g.length - 1]),
    [(l: LossAbroad) => l.turn, cmpNum],
    [(l: LossAbroad) => idNumber(l.characterId), cmpNum],
  );
  for (const l of talk) {
    const x = findCharacter(S, l.characterId);
    if (x === null) continue;
    if (l.kind === "Captured" && x.status === "Captured" && x.heldBy === court) {
      if (rng.chance(held))
        heard.push(`${court} holds ${x.name}, ${l.master !== null ? `a spy of ${l.master}` : "a spy who will not say whom they serve"}, captive (caught in turn ${l.turn}).`);
    } else if (l.kind === "PutToDeath" && S.turn - l.turn <= LossNewsSeasons && rng.chance(death))
      heard.push(`${court} put ${x.name}, ${l.master !== null ? `a spy of ${l.master}` : "a spy who would not say whom they served"}, to death in turn ${l.turn}.`);
  }
  return heard;
};

P.spyReportArrives = function (j) {
  const S = this.s;
  const c = findCharacter(S, j.characterId);
  if (c === null || j.report === null) return;
  // A report it sent after its master's belief was frozen (a captive turned and back at its post): word has come from it.
  const cover = coverOf(c, j.to);
  if (cover !== null && j.report.observedTurn >= cover.since) c.covers.splice(c.covers.indexOf(cover), 1);
  // The copies it made of the watched court's archive come home with the report.
  const copies = this.archiveCopiesArrive(j, c);
  this.mindRequests.push(newMindRequest({ id: newId(S, "r"), task: "SpyReport", characterId: c.id, court: j.to, report: j.report, copyIds: copies }));
};

P.capture = function (c, host, rng) {
  const S = this.s;
  const employer = c.employer!;
  // Its master goes on seeing it at its post until word comes.
  this.coverFor(c, employer, "SpyPosted");
  c.status = "Captured";
  c.heldBy = host;
  c.duty = "None";
  c.at = host;
  const confesses = c.traits.courage < 50 || rng.chance(0.4);
  remember(c, S.turn, `I was caught spying in ${land(host)}.` + (confesses ? ` I told them I serve ${land(employer)}.` : " I did not say whom I serve."));
  notify(
    S,
    host,
    "Notice",
    "A spy is caught",
    `Your watchmen caught ${c.name}` + (confesses ? `, who confesses to serving ${employer}.` : ", who will not say whom they serve.") + " You may execute, ransom, turn or release them.",
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
    case "Execute": {
      // Its master goes on believing what it believed until the rumour of the death arrives.
      if (employer !== null) this.coverFor(c, employer, "None");
      c.status = "Dead";
      c.duty = "None";
      // The dead are never paid: what any court owed it is gone (a court that has not heard keeps its own belief).
      c.backPay.clear();
      logEvent(S, "execution", `${host} executed ${c.name}.`, [host]);
      // The rumour reaches its king, and every court that still believes the dead one serves it.
      for (const heard of AllPowers.filter((p) => p === employer || coverOf(c, p) !== null)) this.rumor(heard, host, `It is said that ${c.name} was put to death in ${host}.`, c.id, "Death");
      // Other courts hear of it only from their envoys and spies at this court (see lossesHeard).
      let master: Power | null = null;
      for (const l of S.losses) if (l.characterId === c.id && l.court === host && l.kind === "Captured") master = l.master;
      S.losses.push(newLossAbroad({ turn: S.turn, kind: "PutToDeath", characterId: c.id, court: host, master }));
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
      this.rumor(payer, host, `${host} holds ${c.name} and demands ${formatMoney(co.ransom)} for their return (order pay_ransom for ${c.id}).`, c.id, "Ransom", demand.id);
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
  }
};

/**
 * A captive let go walks home. A master that believes it still at its post (or recalled) goes on believing that until it
 * is home; one that has heard of the capture sees it on the road home at once, so that no ransom is paid for a captive
 * already free.
 */
P.releaseCaptive = function (host, c) {
  c.status = c.employer === null ? "Free" : "Employed";
  c.heldBy = null;
  c.intercepted = false;
  remember(c, this.s.turn, `${land(host)} set me free.`);
  if (c.employer !== null && isAlive(this.s, c.employer)) {
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
    notify(S, payer, "Rejected", "Ransom not sent", `The ransom for ${c.name} could not be sent: ${why}.`, c.id);
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
  notify(S, j.to, "Notice", "Ransom paid", `${j.from} paid ${formatMoney(j.gold)} for ${c?.name ?? ""}.`, c?.id ?? null);
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

P.assay = function (p, a) {
  const S = this.s;
  const t = S.treasuries.get(p);
  const lot = t.lots.find((l) => l.id === a.lot) ?? null;
  if (lot === null) {
    // The validator refuses a lot that is not there, or one assayed twice: the only way it is gone now is an
    // earlier payment this season that fell short, when the treasurers weighed all the unassayed gold.
    this.failed(
      p,
      a,
      "Assay failed",
      `Gold lot ${a.lot} was not assayed: your treasurers had already weighed all your unassayed gold last season, when a payment fell short. No fee was paid.`,
      "your treasurers had already weighed it",
      true,
    );
    return;
  }
  if (!this.pay(p, S.config.assayFee, "an assay", a, `gold lot ${a.lot} was not assayed`)) return;
  t.lots.splice(t.lots.indexOf(lot), 1);
  const pct = lot.face === 0 ? 100 : toInt(roundEven((100.0 * lot.true) / lot.face));
  let text = `Of the ${formatMoney(lot.face)} weighed from ${lot.from}, ${formatMoney(lot.true)} is fine gold (${pct}%).`;
  if (lot.stated !== lot.face) text += ` The inventory had promised ${formatMoney(lot.stated)}.`;
  notify(S, p, "Assay", "Assay of gold", text);
  logEvent(S, "assay", `${p} assayed gold from ${lot.from}: ${pct}% fine.`, [p], pct < 100 ? "debasement-found" : "assay");
};

P.finishAuthentication = function (task) {
  const S = this.s;
  const copy = S.copies.find((x) => x.id === task.copyId) ?? null;
  const tablet = copy === null ? null : (S.tablets.find((t) => t.id === copy.tabletId) ?? null);
  if (copy === null || tablet === null) return;
  const rng = this.r("authenticate", task.id);
  // A forgery the scribes miss reads exactly as a genuine tablet that reads genuine: the words betray nothing.
  const genuine = "The seals are genuine.";
  let result: string;
  if (!tablet.forged) result = rng.chance(0.95) ? genuine : "The scribes cannot agree; the result is inconclusive.";
  else {
    const detect = clamp(0.2 + task.spend / 200.0 - tablet.forgerSkill / 150.0, 0.05, 0.95);
    if (rng.chance(detect)) {
      result = "The seals are false: this tablet is a forgery.";
      // The event names the tablet as the court does, not by the engine's id, which a narrator reading its events could repeat.
      logEvent(S, "forgery-detected", `${task.requester} found that ${Views.tabletName(tablet, this.archive(task.requester))} is forged.`, [task.requester], "forgery-detected");
      // A swapped inventory is traced, with the same chance, to the envoy who forged it and brought it.
      if (tablet.inventory) {
        const bearer = findCharacter(S, tablet.forgerId);
        if (bearer !== null && rng.chance(clamp(0.3 + task.spend / 400.0, 0.3, 0.8))) result += this.inventoryExposed(task.requester, tablet, bearer);
      } else if (tablet.forgerEmployer !== null && rng.chance(clamp(0.3 + task.spend / 400.0, 0.3, 0.8))) {
        const culprit = tablet.forgerEmployer;
        const forger = findCharacter(S, tablet.forgerId);
        result += ` The scribes trace it to the hand of ${forger?.name ?? "a scribe"} in the service of ${culprit}.`;
        if (forger !== null) {
          for (const p of AllPowers) forger.reputation.set(p, forger.reputation.getOrDefault(p, 0) - 30);
          forger.facts.push(newFact({ id: newId(S, "f"), text: `Exposed as a forger of seals in the service of ${land(culprit)}.`, secrecy: "Public", tag: "forger" }));
        }
        for (const p of alive(S).filter((p) => p !== task.requester))
          this.rumor(p, task.requester, `The scribes of ${task.requester} declare that a tablet bearing the seal of ${tablet.seals.join(" and ")} was forged by ${forger?.name ?? "a scribe"} of ${culprit}.`);
        logEvent(S, "forgery-exposed", `${task.requester} publicly traced a forgery to ${culprit}.`, null, "forgery-exposed");
      }
    } else result = genuine;
  }
  copy.authResult = result;
  // The tablet as every court names it, the court's own mark for its copy, and its text in full.
  notify(
    S,
    task.requester,
    "Authentication",
    "Examination of a tablet",
    `${Views.capitalized(Views.tabletName(tablet, this.archive(task.requester)))} (your copy ${copy.id}): "${tablet.text}" — ${result}`,
  );
  logEvent(S, "authenticate", `${task.requester} paid to authenticate a tablet.`, [task.requester], "authentication");
};

P.forge = function (p, f) {
  const S = this.s;
  const c = char(S, f.character);
  if (c.traits.competence < S.config.forgeMinCompetence) {
    // A failed order like any other, though the clay is still paid for.
    this.failed(p, f, "Forgery botched", `${c.name} lacks the skill; the clay is ruined and nothing usable came of it.`, "the forger lacked the skill", false, c.id);
    this.pay(p, S.config.forgeFee, "spoiled clay");
    return;
  }
  const seals = distinct(f.seals);
  // Set out in clauses like any tablet (item 8), as its first sealer would write them to the second; in structured press
  // its words are theirs, and a forgery with no clause that stands is not made (nor paid for).
  const by = seals[0] ?? p;
  const partner = seals.length > 1 ? seals[1] : by;
  const checked = checkClauses(f.clauses, by, partner, S.turn);
  if (checked.dropped.length > 0) notify(S, p, "Notice", "Clauses left out", `In the forgery the scribes left out what could not stand: ${checked.dropped.join("; ")}.`);
  const clauses = checked.kept;
  if (S.config.pressMode === "structured" && clauses.length === 0) {
    this.failed(p, f, "Nothing to forge", "In this game a tablet is set out in clauses, and none of the forgery's could stand: nothing was forged and nothing paid.", "it had no clause that could stand", false, c.id);
    return;
  }
  if (!this.pay(p, S.config.forgeFee, "a forger's materials", f, "nothing was forged")) return;
  const tablet = newTablet({
    id: newId(S, "t"),
    text: S.config.pressMode === "structured" ? renderClauses(clauses, by, partner) : this.scribe(p, cap(f.text, 1200)),
    clauses,
    proposedBy: seals[0],
    partner: seals.length > 1 ? seals[1] : null,
    seals,
    createdTurn: S.turn,
    sealedTurn: Math.max(1, S.turn - this.r("forge-date", c.id).range(1, 4)),
    forged: true,
    forgerId: c.id,
    forgerEmployer: p,
    forgerSkill: c.traits.competence,
  });
  S.tablets.push(tablet);
  S.copies.push(newTabletCopy({ id: newId(S, "k"), tabletId: tablet.id, holder: p, acquiredTurn: S.turn, source: `made by ${c.name}` }));
  c.facts.push(newFact({ id: newId(S, "f"), text: `Forged a tablet bearing the seal of ${seals.join(" and ")}.`, secrecy: "Deep", tag: "forgery", knownBy: [p] }));
  remember(c, S.turn, `I forged a tablet with the seals of ${seals.join(" and ")} for ${land(p)}.`);
  notify(S, p, "Tablet", "A tablet is ready", `${c.name} has produced a tablet bearing the seals of ${seals.join(" and ")}.`, c.id);
  logEvent(S, "forgery", `${p} had ${c.name} forge a tablet sealed by ${seals.join(" and ")}.`, [p], "forgery");
};
