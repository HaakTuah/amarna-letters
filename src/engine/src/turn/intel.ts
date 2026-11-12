/**
 * Spies and counter-intelligence: placing and recalling spies, what they watch and report, and the word that comes home
 * about servants put to death. (Captives and ransom are in captives.ts; assays, authentication and forgery in
 * authentication.ts.)
 */
import { waysOf } from "../model/works.ts";
import { Dict, HSet } from "../core/collections.ts";
import { clamp } from "../core/num.ts";
import type { Rng } from "../core/rng.ts";
import { cmpNum, groupBy, sortBy } from "../core/seq.ts";
import { cmpStr, isBlank } from "../core/text.ts";
import { newMindRequest } from "../model/exchanges.ts";
import type { Order, PlaceSpyOrder } from "../model/orders.ts";
import { coverOf, gain, newJobErrand, remember, type Character, type Cover } from "../model/people.ts";
import { land, powerName, type Power, courtHead } from "../model/power.ts";
import { Waiting, newJourney, newPendingTask, newSpyReport, type Journey, type LossAbroad } from "../model/records.ts";
import { char, findCharacter, isAlive, logEvent, newId, newKnown, notify, ownedBy } from "../model/state.ts";
import { type Unit } from "../model/units.ts";
import { formatMoney } from "../rules/calendar.ts";
import { counted, listed, notTaken, pick, seasonsWords, upper } from "../rules/wording.ts";
import { Views } from "../rules/views.ts";
import { idNumber, TurnEngine } from "./core.ts";
import { learn } from "../rules/skills.ts";
import { legPoints, PointsPerDay } from "../model/travel.ts";
import { seasonOfTurn, type WorldMap } from "../model/map.ts";
import { StealRisk } from "./knowledge.ts";
import { AidData } from "./kings-fate.ts";

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
  }
}

const P = TurnEngine.prototype;

P.resolveIntelligence = function (orders) {
  const S = this.s;
  // Bug #878: the watch is set anew here, so the checks as the season begins (the road, the border, a held king's escape)
  // read the season just past's.
  S.counterIntel.clear();
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
  // #806: sent by a held king's word home, his job is to free him (one hired for it says so already).
  const frees = this._freeingNow.get(ps);
  const errand = c.contract?.errand ?? null;
  if (frees !== undefined && errand !== null) errand.frees = frees;
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
      // #806: one whose job is to free a king held here risks more, as one stealing a tablet does.
      const e = c.contract?.errand ?? null;
      const freeing = e !== null && e.what === "spy" && !e.done && e.frees !== "" && findCharacter(S, e.frees)?.heldBy === host;
      const risk = (this._stealing.has(c.id) ? StealRisk : 0) + (freeing ? AidData.risk : 0);
      const caughtAt = (skill: number): number => clamp(0.05 + watch / 300.0 - skill / 400.0 + risk, 0.02, 0.6 + risk);
      const caught = rng.chance(caughtAt(c.skills.stealth));
      learn(c, "stealth", !caught, (b) => 1 - caughtAt(b));
      if (caught) {
        if (freeing) logEvent(S, "king-aid-caught", `${c.name} was caught trying to free ${findCharacter(S, e!.frees)!.name} from ${host}.`, [host], "king-aid-caught");
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
