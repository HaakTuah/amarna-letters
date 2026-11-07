/** Spies, counter-intelligence, captives, assays, authentication and forgery. */
import { waysOf } from "../model/works.ts";
import { Dict, HSet } from "../core/collections.ts";
import { clamp, roundEven, toInt } from "../core/num.ts";
import type { Rng } from "../core/rng.ts";
import { cmpNum, distinct, groupBy, sortBy } from "../core/seq.ts";
import { cmpStr, isBlank } from "../core/text.ts";
import { newMindRequest } from "../model/exchanges.ts";
import type { CaptiveOrder, Order, PayRansomOrder, PlaceSpyOrder, AssayOrder, ForgeOrder } from "../model/orders.ts";
import { coverOf, gain, newFact, newJobErrand, remember, type Character, type Cover } from "../model/people.ts";
import { AllPowers, land, powerName, type Power, quoteWords, courtHead } from "../model/power.ts";
import { Waiting, newJourney, newLossAbroad, newPendingTask, newSpyReport, newTablet, newTabletCopy, type Journey, type LossAbroad, type NewsKind, type PendingTask } from "../model/records.ts";
import { alive, char, findCharacter, isAlive, logEvent, newId, newKnown, notify, ownedBy } from "../model/state.ts";
import { type Unit } from "../model/units.ts";
import { formatMoney } from "../rules/calendar.ts";
import { counted, listed, notTaken, pick, seasonsWords, upper } from "../rules/wording.ts";
import { cap } from "../rules/greeting.ts";
import { checkClauses, renderClauses } from "../rules/clauses.ts";
import { OrderValidator } from "../rules/validator.ts";
import { Views } from "../rules/views.ts";
import { removeAll } from "./resolve.ts";
import { idNumber, TurnEngine } from "./core.ts";
import { learn } from "../rules/skills.ts";
import { legPoints, PointsPerDay } from "../model/travel.ts";
import { seasonOfTurn, type WorldMap } from "../model/map.ts";
import { StealRisk } from "./knowledge.ts";

/** How long a court talks of a servant it put to death: the season of the death and this many after. */
export const LossNewsSeasons = 3;

declare module "./core.ts" {
  interface TurnEngine {
    resolveIntelligence(orders: [Power, Order][]): void;
    reportRoad(from: string, employer: Power): number;
    borderOf(c: Character, employer: Power): string | null;
    walkToBorder(c: Character, employer: Power, border: string): Journey;
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


/** What an assay says of a lot that is all fine gold (to a hundredth); the script kings read it. */
export const FullWeight = "all fine gold";
const P = TurnEngine.prototype;

P.resolveIntelligence = function (orders) {
  const S = this.s;
  for (const [p, o] of orders) if (o.type === "counterIntel" && this.pay(p, o.spend, "watchmen", o, "none were set")) S.counterIntel.set(p, o.spend);

  // Captors decide first, so that a ransom paid the same season meets the captive as its captor left them,
  // whichever court comes first.
  for (const [p, o] of orders) if (o.type === "captive" && o.fate === "TakePurse") this.captive(p, o);
  for (const [p, o] of orders) if (o.type === "captive" && o.fate !== "TakePurse") this.captive(p, o);

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
      case "steal":
        // Taken out of the archive during the season's watch (watchAndReport), at a greater risk of being caught.
        this._stealing.add(o.character);
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
  const target = court !== null ? this.courtAt(court) : province!;
  // The owner's answers to item 11a: a job is one errand; one who did not take the job offered, or whose job is another, stays.
  const job = c.contract?.errand ?? null;
  if (c.employer !== p || c.status !== "Employed" || (job !== null && (job.what !== "spy" || job.where !== (court ?? province) || job.done))) {
    this.failed(p, ps, "Spy not sent", c.employer !== p ? notTaken(c.name, `${S.turn}|${c.id}|spy`) : `${c.name}'s job is not to watch ${court !== null ? powerName(court) : Map.get(province!).name}: another errand is a new job (order renew).`, "not the errand of their job", true, c.id);
    return;
  }
  // Item 17: gold for stirring the province's people, carried with him.
  const stir = province !== null ? Math.max(0, ps.stir ?? 0) : 0;
  if (stir > 0 && !this.pay(p, stir, `gold for ${c.name} to spend among the people of ${Map.get(province!).name}`, ps, "he went without it")) return;
  if (c.contract !== null && job === null) c.contract.errand = newJobErrand({ what: "spy", where: court ?? province! });
  c.stirGold += stir;
  c.duty = "SpyOutbound";
  c.at = null;
  c.missionTarget = court;
  c.watchProvince = province;
  const j = newJourney({ id: newId(S, "j"), kind: "SpyOutbound", departTurn: S.turn, from: p, to: court ?? p, characterId: c.id });
  S.journeys.push(j);
  c.sent++;
  this.setOut(j, this.courtAt(p), target);
  const travel = j.arriveTurn - S.turn;
  remember(c, S.turn, `My lord of ${land(p)} sent me quietly to watch ${court !== null ? land(court) : Map.get(province!).name}.`);
  if (province !== null) logEvent(S, "spy", `${p} sent a spy to watch ${Map.get(province).name}.`, [p], "spy-watching");
  const watch = court !== null ? powerName(court) : Map.get(province!).name;
  notify(
    S,
    p,
    "Notice",
    "Agent sent",
    pick([`${c.name} left last season to watch ${watch}, ${seasonsWords(travel)} away.`, `${c.name} set out last season to watch ${watch}; the road there takes ${seasonsWords(travel)}.`], `${S.turn}|${c.id}|agent`),
    c.id,
  );
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
  // A watcher posted by order goes as any spy does, unseen if he can be (item 17++: only the opening's residents are open).
  c.openly = false;
};

P.recall = function (p, c) {
  const S = this.s;
  // Its stay is over, recalled or its term served: its job is done when it is home.
  if (c.contract?.errand?.what === "spy") c.contract.errand.done = true;
  const from = c.missionTarget !== null ? this.courtAt(c.missionTarget) : (c.watchProvince ?? this.courtAt(p));
  c.duty = "EnvoyHomebound";
  c.at = null;
  const j = newJourney({ id: newId(S, "j"), kind: "SpyHomebound", departTurn: S.turn, from: c.missionTarget ?? p, to: p, characterId: c.id });
  S.journeys.push(j);
  this.setOut(j, from, this.courtAt(p));
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
  // As a free one's would read (bug #734): the province by its name, and its place for looking it up.
  cover.whereText = c.watchProvince !== null ? `in ${Map.get(c.watchProvince).name}` : "travelling";
  cover.province = c.watchProvince;
  const post = c.missionTarget !== null ? this.courtAt(c.missionTarget) : (c.watchProvince ?? this.courtAt(p));
  const place = c.missionTarget !== null ? `the court of ${powerName(c.missionTarget)}` : c.watchProvince !== null ? Map.get(c.watchProvince).name : p;
  const due = S.turn + this.travelTurnsBetween(post, this.courtAt(p));
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
  // What its master saw: a spy home from a post it watched unseen, or one that gave up on the road (item 10).
  if (!free && j.gaveUp) this.outcome(c, j.to, `Turned back on the road to a post (season ${S.turn}).`, false);
  else if (!free && c.turnsAbroad >= 2) {
    const post = c.missionTarget !== null ? `the court of ${powerName(c.missionTarget)}` : c.watchProvince !== null ? this.map.get(c.watchProvince).name : "a post";
    // The court it watched never learns of it: a spy unseen is unseen (item 4's hidden spies).
    this.outcome(c, j.to, `Watched ${post} unseen for ${c.turnsAbroad} seasons and came home (season ${S.turn}).`, true, c.missionTarget);
  }
  c.duty = "None";
  c.at = j.to;
  c.missionTarget = null;
  c.watchProvince = null;
  c.turnsAbroad = 0;
  // What he did not spend of the gold to stir a province he hands back (item 17).
  if (c.stirGold > 0) {
    if (!free && isAlive(S, j.to)) this.credit(j.to, c.stirGold, this.courtAt(j.to), false);
    // Dismissed, or his master fallen: the gold on him is his now, kept from an errand (item 17+: the purse holds only
    // what is counted), not skimmed.
    else gain(c, c.stirGold, "Carried");
    c.stirGold = 0;
  }
  this.bringNews(j, j.to, c);
  if (!free) notify(S, j.to, "Notice", "Agent returns", `${c.name} is back at court` + (j.turnedBack !== null ? `: ${j.turnedBack}.` : "."), c.id);
};

/** Every posted spy risks detection, then observes what its competence allows and sends word home. */
P.watchAndReport = function () {
  const S = this.s;
  for (const c of sortBy(
    S.characters.filter((c) => c.duty === "SpyPosted" && c.status === "Employed"),
    [(c: Character) => idNumber(c.id), cmpNum],
  )) {
    const employer = c.employer!;
    const host = c.missionTarget ?? (c.watchProvince !== null ? S.owner.getOrDefault(c.watchProvince, null) : null);
    const rng = this.r("spy", c.id);

    // A fallen court has nobody left to catch a spy, nor to decide its fate; nobody hunts a resident known to all (item 17++).
    if (host !== null && host !== employer && c.secretMaster !== host && isAlive(S, host) && !c.openly) {
      const watch = S.counterIntel.getOrDefault(host, 0);
      const risk = this._stealing.has(c.id) ? StealRisk : 0;
      const caughtAt = (skill: number): number => clamp(0.05 + watch / 300.0 - skill / 400.0 + risk, 0.02, 0.6 + risk);
      const caught = rng.chance(caughtAt(c.skills.stealth));
      learn(c, "stealth", !caught, (b) => 1 - caughtAt(b));
      if (caught) {
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
      fee: c.contract?.fee ?? 0,
      purse: c.purse,
      owed: c.owed.clone(),
    });
    report.observations.push(...this.spyObserve(c, rng));
    // Item 17++, part C: the watched province's mood, which its master reads when the report reaches him.
    if (c.missionTarget === null && c.watchProvince !== null && S.owner.getOrDefault(c.watchProvince, null) !== null) report.mood = this.moodOf(c.watchProvince);
    if (c.secretMaster !== null && c.secretMaster === host) {
      report.mood = "";
      report.poison = c.poisonText;
      report.observations = report.observations.slice(0, 1);
    }
    // A spy at a living court copies from its archive; one turned by that court sends home only what it is told.
    else if (c.missionTarget !== null && isAlive(S, c.missionTarget)) {
      // Item 10: a tablet stolen this season goes home with the report; its court has lost it, so it is not copied too.
      if (this._stealing.has(c.id)) {
        const stolen = this.stealFromArchive(c, c.missionTarget, employer);
        if (stolen !== null) report.stolenIds = [stolen];
      }
      report.tabletIds = this.copyFromArchive(c, c.missionTarget, employer);
    }
    const from = c.missionTarget !== null ? this.courtAt(c.missionTarget) : (c.watchProvince ?? this.courtAt(employer));
    // Item 11b ("Messengers are errands"): from abroad it waits for a carrier; inside its master's own land the realm's
    // couriers carry it ("Distance inside your own realm"). From a watch post just across its master's border too it waits:
    // the spy may walk it to the border himself, leaving his post (the owner's answers to item 11b+).
    const abroad = S.owner.getOrDefault(from, null) !== employer;
    S.journeys.push(
      newJourney({
        id: newId(S, "j"),
        kind: "SpyReport",
        departTurn: S.turn,
        arriveTurn: abroad ? Waiting : S.turn + this.reportRoad(from, employer),
        from: host ?? employer,
        to: employer,
        characterId: c.id,
        report,
        waitAt: abroad ? from : null,
      }),
    );
  }
};

/** How long a report from a post inside its master's land takes to reach him: the realm's couriers carry it. */
P.reportRoad = function (from, employer) {
  return this.travelTurnsBetween(from, this.courtAt(employer));
};

/**
 * The province of its master's next to a spy's watch post across the border, nearest his capital, where the realm's
 * couriers would take its reports (the owner's answers to items 11b and 11b+); null for a post at a court or deeper abroad.
 */
P.borderOf = function (c, employer) {
  const S = this.s;
  if (c.missionTarget !== null || c.watchProvince === null) return null;
  const home = this.courtAt(employer);
  return (
    sortBy(
      this.map.neighbors(c.watchProvince).filter((n) => S.owner.getOrDefault(n, null) === employer),
      [(n: string) => this.travelTurnsBetween(n, home), cmpNum],
      [(n: string) => n, cmpStr],
    )[0] ?? null
  );
};

/**
 * A spy walks its reports to the border himself (the owner's answers to item 11b+): he leaves his post, meets the road's
 * dangers there and back, and takes up his post again when he returns; the couriers take the reports at the border.
 */
P.walkToBorder = function (c, employer, border) {
  const S = this.s;
  const post = c.watchProvince!;
  logEvent(S, "letter", `${c.name} left the watch on ${this.map.get(post).name} to take reports to the border of ${employer}.`, [], "border-walk");
  c.duty = "SpyOutbound";
  c.at = null;
  const j = newJourney({ id: newId(S, "j"), kind: "SpyOutbound", departTurn: S.turn, from: employer, to: employer, characterId: c.id });
  S.journeys.push(j);
  c.sent++;
  this.setOut(j, post, border);
  const there = [...j.route];
  this.setOut(j, border, post);
  j.route = [...there, ...j.route.slice(1)];
  j.seen = [post];
  j.reached = [S.turn];
  const perSeason = S.config.travelDays * PointsPerDay;
  let cost = 0;
  for (let i = 0; i < j.route.length - 1; i++) cost += legPoints(this.map, j.route[i], j.route[i + 1], seasonOfTurn(S.turn), { sneaking: false, ways: waysOf(S) });
  j.arriveTurn = S.turn + Math.max(1, Math.ceil(cost / perSeason));
  return j;
};

P.spyObserve = function (c, rng) {
  const S = this.s;
  const Map = this.map;
  const obs: string[] = [];
  const seen: Unit[] = [];
  const skill = c.skills.gather / 100.0;
  if (c.missionTarget !== null) {
    const court = c.missionTarget;
    const landHeld = new HSet(ownedBy(S, court));
    const near = new HSet<string>(landHeld);
    for (const id of landHeld) for (const n of Map.neighbors(id)) near.add(n);
    for (const u of sortBy(
      S.units.filter((u) => near.has(u.province)),
      [(u) => u.province, cmpStr],
    ))
      if (rng.chance(0.35 + skill * 0.6)) seen.push(u);
    if (seen.length > 0) obs.push(sightings(Map, seen, "has"));
    if (rng.chance(skill)) {
      const g = S.treasuries.get(court).gold;
      const lo = Math.max(0, Math.trunc(g * (0.75 + rng.nextDouble() * 0.2)));
      const hi = Math.trunc(g * (1.05 + rng.nextDouble() * 0.25)) + 20;
      // A reckoning to the nearest five shekels, as a spy would give it: "some 15 to 40 shekels".
      const [from, to] = [lo, hi].map((n) => formatMoney(Math.max(5, Math.round(n / 5) * 5)));
      obs.push(`The treasury of ${powerName(court)} holds some ${to.includes("mina") ? from : from.replace(/ shekels?$/, "")} to ${to}.`);
    }
    for (const v of S.characters.filter((x) => x.at === court && x.id !== c.id && x.employer !== null && x.employer !== court && (x.duty === "EnvoyAtCourt" || x.duty === "Detained")))
      if (rng.chance(skill)) obs.push(`${v.name}, envoy of ${powerName(v.employer!)}, was received at ${powerName(court)}${v.duty === "Detained" ? " and is being held there" : ""}.`);
    for (const cat of S.catastrophes.filter((x) => x.power === court && x.endTurn >= S.turn && x.startTurn <= S.turn + 1)) obs.push(`In ${powerName(court)}: ${cat.text}`);
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
      if (rng.chance(0.5 + skill * 0.5)) seen.push(u);
    if (seen.length > 0) obs.push(sightings(Map, seen, "has"));
    // Item 17: the people's mood there, in words, as anyone living among them hears it (its holder never sees the number).
    const holder = S.owner.getOrDefault(wp, null);
    if (holder !== null) obs.push(`The people of ${Map.get(wp).name} are ${this.moodOf(wp)} under ${powerName(holder)}.`);
  }
  if (obs.length === 0) obs.push("Nothing of note this season.");
  return obs;
};

/**
 * The troops a report saw, in one sentence, a clause to each power in the order first seen, powers seen alike in one:
 * "Hatti has two armies, at home and in Nesa; Niya and Tunip each have an army at home." A power's own capital is "at
 * home"; one more of a power `before` names is "another army". The script kings read it (`SpiedUnit` in the game's
 * brain), each unit once, by the count.
 */
export function sightings(map: WorldMap, units: readonly Unit[], verb: "has" | "had", before: ReadonlySet<Power> = new Set()): string {
  const seen = groupBy(units, (u) => u.power).map(([p, us]): [Power, string] => {
    const home = map.capital(p).id;
    const kinds = (["Army", "Fleet"] as const)
      .map((k) => us.filter((u) => u.kind === k))
      .filter((g) => g.length > 0)
      .map((g) => {
        const away = g.filter((u) => u.province !== home).map((u) => map.get(u.province).name);
        const where = [...(away.length < g.length ? ["at home"] : []), ...(away.length > 0 ? [`in ${listed(away)}`] : [])].join(" and ");
        const army = g[0].kind === "Army";
        return g.length === 1 ? `${before.has(p) ? "another" : army ? "an" : "a"} ${army ? "army" : "fleet"} ${where}` : `${counted(g.length)} ${army ? "armies" : "fleets"}, ${where}`;
      });
    return [p, kinds.join(", and ")];
  });
  const clauses = groupBy(seen, ([, what]) => what).map(([what, ps]) => (ps.length === 1 ? `${powerName(ps[0][0])} ${verb} ${what}` : `${listed(ps.map(([p]) => powerName(p)))} each ${verb === "has" ? "have" : "had"} ${what}`));
  return `${upper(clauses.join("; "))}.`;
}

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
        heard.push(`${courtHead(court)} holds ${x.name}, ${l.master !== null ? `a spy of ${powerName(l.master)}` : "a spy who will not say whom they serve"}, captive (caught in turn ${l.turn}).`);
    } else if (l.kind === "PutToDeath" && S.turn - l.turn <= LossNewsSeasons && rng.chance(death))
      heard.push(`${courtHead(court)} put ${x.name}, ${l.master !== null ? `a spy of ${powerName(l.master)}` : "a spy who would not say whom they served"}, to death in turn ${l.turn}.`);
  }
  return heard;
};

P.spyReportArrives = function (j) {
  const S = this.s;
  if (j.carrier !== null) this.letterDelivered(j);
  const c = findCharacter(S, j.characterId);
  if (c === null || j.report === null) return;
  // A report it sent after its master's belief was frozen (a captive turned and back at its post): word has come from it.
  const cover = coverOf(c, j.to);
  if (cover !== null && j.report.observedTurn >= cover.since) c.covers.splice(c.covers.indexOf(cover), 1);
  // A report from a watched province brings home who held it and the land beside it when the spy wrote (item 9: by road,
  // not in live sight); one a host had a turned spy send carries only what the host told it.
  if (j.report.province !== null && isBlank(j.report.poison) && isAlive(S, j.to)) {
    let book = S.known.tryGet(j.to);
    if (book === undefined) S.known.set(j.to, (book = new Dict()));
    for (const prov of [j.report.province, ...this.map.neighbors(j.report.province)]) {
      if (this.map.get(prov).isSea) continue;
      const had = book.tryGet(prov);
      if (had !== undefined && had.turn >= j.report.observedTurn) continue;
      book.set(prov, newKnown({ owner: Views.ownerAt(S, this.map, prov, j.report.observedTurn), turn: j.report.observedTurn, source: c.name }));
    }
  }
  if (j.report.province !== null && j.report.mood !== "" && isAlive(S, j.to))
    this.readMood({ power: j.to, province: j.report.province, mood: j.report.mood, seen: j.report.observedTurn, source: "spy" });
  // The copies it made of the watched court's archive come home with the report.
  const copies = this.archiveCopiesArrive(j, c);
  this.mindRequests.push(newMindRequest({ id: newId(S, "r"), task: "SpyReport", characterId: c.id, court: j.to, report: j.report, copyIds: copies }));
};

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
    case "Execute": {
      // Its master goes on believing what it believed until the rumour of the death arrives.
      if (employer !== null) this.coverFor(c, employer, "None");
      c.status = "Dead";
      c.duty = "None";
      // The dead are never paid: what any court owed it is gone.
      c.owed.clear();
      logEvent(S, "execution", `${host} executed ${c.name}.`, [host]);
      // The rumour reaches its king, and every court that still believes the dead one serves it.
      for (const heard of AllPowers.filter((p) => p === employer || coverOf(c, p) !== null)) this.rumor(heard, host, `It is said that ${c.name} was put to death in ${powerName(host)}.`, c.id, "Death");
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
P.releaseCaptive = function (host, c) {
  // A captive on the road under guard (item 10+b) is let go where it is: its convoy is over.
  if (c.duty === "UnderGuard") {
    this.s.journeys = this.s.journeys.filter((j) => !(j.kind === "CaptiveConvoy" && j.characterId === c.id));
    c.duty = "None";
  }
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
  const weighed = `The lot of ${formatMoney(lot.face)} weighed from ${powerName(lot.from)}`;
  let text =
    pct < 100
      ? `${weighed} holds only ${formatMoney(lot.true)} of fine gold, ${pct}%.`
      : lot.true === lot.face
        ? `${weighed} is ${FullWeight}.`
        : `${weighed} is ${FullWeight} near enough: ${formatMoney(lot.true)} of it.`;
  if (lot.stated > lot.face) text += ` The inventory sent with it promised ${formatMoney(lot.stated)}, so it came ${formatMoney(lot.stated - lot.face)} short.`;
  else if (lot.stated < lot.face) text += ` The inventory sent with it named only ${formatMoney(lot.stated)}.`;
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
        result += ` The scribes trace it to the hand of ${forger?.name ?? "a scribe"} in the service of ${powerName(culprit)}.`;
        if (forger !== null) {
          for (const p of AllPowers) forger.reputation.set(p, forger.reputation.getOrDefault(p, 0) - 30);
          forger.facts.push(newFact({ id: newId(S, "f"), text: `Exposed as a forger of seals in the service of ${land(culprit)}.`, secrecy: "Public", tag: "forger" }));
        }
        for (const p of alive(S).filter((p) => p !== task.requester))
          this.rumor(p, task.requester, `The scribes of ${powerName(task.requester)} declare that a tablet bearing the seal of ${listed(tablet.seals.map((x) => powerName(x)))} was forged by ${forger?.name ?? "a scribe"} of ${powerName(culprit)}.`);
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
    `${Views.capitalized(Views.tabletName(tablet, this.archive(task.requester)))}: ${quoteWords(tablet.text)} — ${result}`,
  );
  logEvent(S, "authenticate", `${task.requester} paid to authenticate a tablet.`, [task.requester], "authentication");
};

P.forge = function (p, f) {
  const S = this.s;
  const c = char(S, f.character);
  // The servant tries only if it believes its hand can fake a seal; a king learns that only by asking (item 10).
  if (c.belief.forge < S.config.forgeMinCompetence) {
    // A failed order like any other, though the clay is still paid for.
    this.failed(p, f, "Forgery botched", `${c.name} said they could not fake a seal; the clay is ruined and nothing usable came of it.`, "the forger lacked the skill", false, c.id);
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
    forgerSkill: c.skills.forge,
  });
  S.tablets.push(tablet);
  S.copies.push(newTabletCopy({ id: newId(S, "k"), tabletId: tablet.id, holder: p, acquiredTurn: S.turn, source: `made by ${c.name}` }));
  c.facts.push(newFact({ id: newId(S, "f"), text: `Forged a tablet bearing the seal of ${seals.join(" and ")}.`, secrecy: "Deep", tag: "forgery", knownBy: [p] }));
  remember(c, S.turn, `I forged a tablet with the seals of ${seals.join(" and ")} for ${land(p)}.`);
  notify(S, p, "Tablet", "A tablet is ready", `${c.name} has produced a tablet bearing the seals of ${seals.join(" and ")}.`, c.id);
  logEvent(S, "forgery", `${p} had ${c.name} forge a tablet sealed by ${seals.join(" and ")}.`, [p], "forgery");
};
