/**
 * Everything built, season by season (build order item 15, "One rule for everything built", "Paid in gold or in labour"):
 * each king's standing orders for what he keeps and builds in his provinces, the upkeep each level costs, in gold or by
 * corvée, the decay of what goes unpaid, and the projects that raise a level over the seasons. War interrupts a project,
 * since the workers flee; an occupying army can raze what stands; a besieged city may repair its walls with the men and
 * food inside ("Walls price the storm, not the clock"). A conqueror takes over what stands, and its upkeep with it. The
 * figures are in `model/works.ts`.
 */
import { UnrestData } from "../model/unrest.ts";
import { Dict } from "../core/collections.ts";
import { cmpNum, sortBy, sum } from "../core/seq.ts";
import { idiv } from "../core/num.ts";
import { cmpStr } from "../core/text.ts";
import { LandData, menAvailable, unitCarried } from "../model/land.ts";
import { seasonOfTurn, WinterSeason } from "../model/map.ts";
import type { BuildOrder, RazeOrder } from "../model/orders.ts";
import { AllPowers, type Power } from "../model/power.ts";
import { alive, logEvent, notify, ownedBy, siegeOf, unitAt, type Unit } from "../model/state.ts";
import {
  buildGold,
  buildMen,
  harbourRoom,
  hostileAt,
  landRefusal,
  levelOf,
  newWorkPlan,
  planOf,
  RepairData,
  setLevel,
  upkeepGold,
  upkeepMen,
  WorkKindValues,
  WorksData,
  WorksEffect,
  workLevelText,
  workName,
  type WorkKind,
  type WorkPlan,
} from "../model/works.ts";
import { formatMoney } from "../rules/calendar.ts";
import { pick } from "../rules/wording.ts";
import { Views } from "../rules/views.ts";
import { TurnEngine } from "./core.ts";

declare module "./core.ts" {
  interface TurnEngine {
    /** A king's standing order for one kind in one province of his, from this season. */
    setWorks(p: Power, o: BuildOrder): void;
    /** An army razes a level of what stands where it is. */
    raze(p: Power, o: RazeOrder): void;
    /** At the end of each season: upkeep, decay, projects and repairs under siege, and each king's notice of them. */
    worksSeason(): void;
    /** At the end of winter, fleets beyond the room their king's harbours give them on their waters lose crews to storms. */
    harboursWinter(): void;
    /** A province changes hands: its old holder's orders for it lapse, and what stands is unkept until its new one orders. */
    worksChangeHands(province: string): void;
  }
}

const P = TurnEngine.prototype;

/**
 * The men a corvée brings to a work needing `need`: named (no share), the need if the men at home can spare it, else none;
 * by share (item 17++, "The king says how much he wants"), its share of the men at home, less what the province hides at
 * its count's age and distance, as a levy by share does, never more than the work takes.
 */
function corveeMen(e: TurnEngine, province: string, need: number, plan: WorkPlan | null): number {
  const home = menAvailable(e.s, province);
  if (plan?.share == null) return home >= need ? need : 0;
  return Math.min(need, idiv(idiv(home * plan.share, 100) * (100 - e.hiddenIn(province)), 100));
}

P.setWorks = function (p, o) {
  const S = this.s;
  const prov = this.map.get(o.province);
  if (S.owner.getOrDefault(o.province, null) !== p) {
    this.lostOrder(p, o, o.province, "Not built", `Your order for the ${workName(o.kind)} of ${prov.name} lapsed: you no longer held it.`, "you no longer held it");
    return;
  }
  let plan = planOf(S, o.kind, o.province);
  if (plan === null) S.works.push((plan = newWorkPlan({ province: o.province, kind: o.kind })));
  plan.keep = o.level;
  plan.labour = o.labour;
  plan.share = o.labour ? (o.share ?? null) : null;
  plan.since = S.turn;
};

P.raze = function (p, o) {
  const S = this.s;
  const u = unitAt(S, o.unit);
  if (u === null || u.power !== p || u.kind !== "Army") {
    this.failed(p, o, "Nothing razed", `No army of yours stood in ${this.map.get(o.unit).name} when the moves were done, so nothing was razed.`, "the army is gone", false);
    return;
  }
  const level = levelOf(S, o.kind, u.province);
  const holder = S.owner.getOrDefault(u.province, null);
  const name = this.map.get(u.province).name;
  if (level <= 0 || holder === p || holder === null) {
    this.failed(p, o, "Nothing razed", `There were no ${workName(o.kind)} of another's to raze in ${name}.`, "nothing to raze", true);
    return;
  }
  setLevel(S, o.kind, u.province, level - 1);
  notify(S, p, "Resolution", "Razed", `Your army razed a level of ${named(o.kind, name)}, leaving ${workLevelText(o.kind, level - 1)}.`);
  this.tell(holder, u.province, "Notice", "Razed", `${p}'s army razed a level of ${named(o.kind, name)}, leaving ${workLevelText(o.kind, level - 1)}.`);
  logEvent(S, "raze", `${p}'s army razed a level of the ${workName(o.kind)} of ${name}.`, [p, holder], "raze");
};

P.worksChangeHands = function (province) {
  this.s.works = this.s.works.filter((w) => w.province !== province);
};

/** A work as the court's notice names it: "the walls of Gubla", "the watch of Gubla" (policing is paid watchmen). */
const named = (kind: WorkKind, place: string): string => `the ${kind === "Policing" ? "watch" : workName(kind)} of ${place}`;

/** Its verb: the walls were, the harbour was. */
const was = (kind: WorkKind): string => (kind === "Harbour" || kind === "Policing" ? "was" : "were");

/** "the roads, harbour and watch of Shushan": several works of one place in one phrase. */
const namedAll = (kinds: WorkKind[], place: string): string => {
  const nouns = kinds.map((k) => named(k, place).slice(4, -` of ${place}`.length));
  return `the ${nouns.length > 1 ? `${nouns.slice(0, -1).join(", ")} and ${nouns[nouns.length - 1]}` : nouns[0]} of ${place}`;
};

/** A notice's clauses as sentences. */
const sentences = (clauses: string[]): string => clauses.map((x) => `${x[0].toUpperCase()}${x.slice(1)}.`).join(" ");

P.worksSeason = function () {
  const S = this.s;
  const Map = this.map;
  for (const p of alive(S)) {
    const t = S.treasuries.get(p);
    const court = this.courtAt(p);
    let gold = 0;
    let men = 0;
    // What the king is told, province by province: word of far provinces comes by courier, as any report does.
    const said = new Dict<string, string[]>();
    const say = (id: string, line: string): void => {
      said.set(id, [...said.getOrDefault(id, []), line]);
    };
    // Nearest the court first: what the treasury cannot keep goes unpaid far away first, as walls did since item 5.
    for (const id of sortBy(ownedBy(S, p), [(x: string) => Map.hops(court, x), cmpNum], [(x: string) => x, cmpStr])) {
      const prov = Map.get(id);
      const hostile = hostileAt(S, id, p);
      const siege = siegeOf(S, id);
      // The works that went unpaid here, and those war halted, each told in one clause.
      const unpaid: WorkKind[] = [];
      const halted: WorkKind[] = [];
      for (const kind of WorkKindValues) {
        let level = levelOf(S, kind, id);
        const plan: WorkPlan | null = planOf(S, kind, id);
        // What no order keeps goes unkept: nothing is kept unless someone orders it.
        const keep = plan?.keep ?? 0;
        const labour = plan?.labour ?? true;
        if (level <= 0 && keep <= 0) {
          if (plan !== null) S.works.splice(S.works.indexOf(plan), 1);
          continue;
        }
        // What can be reached: under siege only the walls and water works, with the men inside (gold buys only what is
        // there); where hostile troops stand, nothing outside a city's walls.
        const inside = kind === "Walls" || kind === "Water";
        const reach = (siege === null && !hostile) || (inside && (siege === null || labour));
        // Upkeep, for the levels kept.
        const kept = Math.min(level, keep);
        let paid = false;
        if (kept > 0 && reach) {
          if (labour) {
            const need = upkeepMen(kind, kept);
            // By share, only men enough to keep it keep it; fewer leave it unkept this season.
            const come = corveeMen(this, id, need, plan);
            if (come >= need) {
              S.corvee.set(id, S.corvee.getOrDefault(id, 0) + need);
              men += need;
              paid = true;
            }
          } else {
            const cost = upkeepGold(kind, kept);
            if (t.gold >= cost) {
              t.gold -= cost;
              this.spendAt(id, cost);
              gold += cost;
              paid = true;
            }
          }
        }
        // Decay: what stands unpaid or unkept, by its kind's rate; paid people (policing) go at once.
        const standing = paid ? kept : 0;
        const work = plan ?? newWorkPlan({ province: id, kind, keep: 0 });
        if (level > standing) {
          if (kept > 0 && !paid) unpaid.push(kind);
          const data = WorksData[kind];
          work.neglect++;
          if (data.decay <= 0) {
            say(id, `${named(kind, prov.name)}, unkept, fell from ${workLevelText(kind, level)} to ${workLevelText(kind, standing)}`);
            level = standing;
            setLevel(S, kind, id, level);
            work.neglect = 0;
          } else if (work.neglect >= data.decay) {
            level--;
            setLevel(S, kind, id, level);
            say(id, `${named(kind, prov.name)}, unkept, fell to ${workLevelText(kind, level)}`);
            work.neglect = 0;
          }
        } else work.neglect = 0;
        // Repair under siege: walls ordered kept during the siege (not by the standing order from the start) mend a step of its wear with the men and food inside.
        if (kind === "Walls" && siege !== null && plan !== null && plan.since > 0 && plan.since >= siege.since && plan.keep >= level && level > 0 && siege.progress > 0) {
          if (menAvailable(S, id) >= RepairData.men && this.stores(id) >= RepairData.food) {
            S.corvee.set(id, S.corvee.getOrDefault(id, 0) + RepairData.men);
            this.takeFromStores(id, RepairData.food);
            siege.progress--;
            men += RepairData.men;
            say(id, `the walls of ${prov.name} were mended a step under siege`);
            logEvent(S, "repair", `${p} repaired the walls of ${prov.name} under siege.`, [p, siege.power], "wall-repair");
          } else say(id, `the walls of ${prov.name} could not be repaired: too few men or too little food inside`);
        }
        // A project: a level at a time, a season's work each season it can be paid and worked.
        if (keep > level && level < WorksData[kind].most && landRefusal(kind, prov) === null) {
          if (siege !== null || hostile) halted.push(kind);
          else {
            const next = kind === "Policing" ? keep : level + 1;
            const hire = kind === "Policing" ? next - level : next;
            let done = false;
            let part = false;
            if (labour) {
              const need = buildMen(kind, id, hire);
              const come = corveeMen(this, id, need, plan);
              if (come > 0) {
                S.corvee.set(id, S.corvee.getOrDefault(id, 0) + come);
                men += come;
                // Item 17++: the work goes as fast as the men who come; a share short of its need does part of a season's.
                if (come >= need) done = true;
                else {
                  // Counted in men-seasons, so even a few men a season add up to a season's work in time.
                  work.done += come;
                  if (work.done >= need) {
                    work.done -= need;
                    done = true;
                  } else {
                    part = true;
                    say(id, `your share brought ${come} of the ${need} men ${named(kind, prov.name)} needed, and the work went slower`);
                  }
                }
              }
            } else {
              const cost = buildGold(kind, id, hire);
              if (t.gold >= cost) {
                t.gold -= cost;
                this.spendAt(id, cost);
                gold += cost;
                done = true;
              }
            }
            if (!done && !part) say(id, `no work was done on ${named(kind, prov.name)}: ${labour ? (plan?.share != null ? "the share you asked brought no men" : "too few men at home") : "too little gold"}`);
            else if (done) {
              work.progress++;
              const seasons = WorksData[kind].seasons;
              if (work.progress >= seasons) {
                level = next;
                setLevel(S, kind, id, level);
                work.progress = 0;
                say(id, `${named(kind, prov.name)} ${was(kind)} raised to ${workLevelText(kind, level)}`);
                // Item 17++: works paid in gold are a giving its people remember of the king who built them; their own corvée
                // they built themselves.
                if (!labour) this.give(id, p, UnrestData.work);
                logEvent(S, "built", `${p} raised the ${workName(kind)} of ${prov.name} to ${workLevelText(kind, level)}.`, AllPowers.filter((x) => x === p || (kind === "Walls" && Views.sight(S, Map, x).has(id))), "built");
              } else say(id, `${named(kind, prov.name)}: ${work.progress} of ${seasons} seasons' work done towards ${workLevelText(kind, level + 1)}`);
            }
          }
        }
        // Keep the plan while it orders anything, has work under way or counts neglect.
        const needed = work.keep > 0 || !work.labour || work.progress > 0 || work.neglect > 0;
        if (plan === null && needed) S.works.push(work);
        else if (plan !== null && !needed) S.works.splice(S.works.indexOf(plan), 1);
      }
      if (unpaid.length > 0) said.set(id, [`${namedAll(unpaid, prov.name)} went unpaid`, ...said.getOrDefault(id, [])]);
      if (halted.length > 0) say(id, `war halted the work on ${namedAll(halted, prov.name)}`);
    }
    // One notice for what the court's couriers bring this season; word of farther provinces comes when it arrives.
    const near: string[] = [];
    for (const [id, l] of said.entries()) {
      if (this.wordTo(p, id) === 0) near.push(...l);
      else this.tell(p, id, "Resolution", "Works", `From ${Map.get(id).name}: ${l.join("; ")}.`);
    }
    const spent = [gold > 0 ? formatMoney(gold) : "", men > 0 ? `${men} men from the fields by corvée` : ""].filter((x) => x !== "").join(" and ");
    const forms = [`Your works took ${spent} this season.`, `Upkeep and building cost ${spent} this season.`, `This season the works cost ${spent}.`];
    const cost = spent !== "" ? pick(forms, `${S.turn}|${p}|works`) : "";
    if (cost !== "" || near.length > 0) notify(S, p, "Resolution", "Works", [cost, sentences(near)].filter((x) => x !== "").join(" "));
  }
  if (seasonOfTurn(S.turn) === WinterSeason) this.harboursWinter();
};

/**
 * Harbours shelter ships through the winter (the walls dossier, "What a harbour held": a harbour's level limits the ships
 * that can winter there, not those that can land). Each king's fleets on a sea's waters share the room of the harbours he
 * holds, or has basing in, on that coast; the crews beyond it winter on open beaches and the storms take a share of them.
 */
P.harboursWinter = function () {
  const S = this.s;
  const Map = this.map;
  const watersOf = (id: string): string | null => (Map.get(id).isSea ? id : Map.get(id).waters);
  const groups = new Dict<string, Unit[]>();
  for (const u of S.units.filter((x) => x.kind === "Fleet")) {
    const w = watersOf(u.province);
    if (w === null) continue;
    const key = `${u.power}|${w}`;
    groups.set(key, [...groups.getOrDefault(key, []), u]);
  }
  for (const [key, fleets] of sortBy([...groups.entries()], [([k]) => k, cmpStr])) {
    const [power, waters] = key.split("|") as [Power, string];
    const room = sum(
      Map.landProvinces.filter((x) => x.waters === waters),
      (x) => {
        const holder = S.owner.getOrDefault(x.id, null);
        const ours = holder === power || (holder !== null && this.grantCovers(holder, power, x.id)?.kind === "basing");
        return ours ? harbourRoom(levelOf(S, "Harbour", x.id)) : 0;
      },
    );
    const men = sum(fleets, (u) => u.men);
    const exposed = Math.max(0, men - room);
    if (exposed <= 0) continue;
    const lost = idiv(exposed * WorksEffect.exposedPercent, 100);
    if (lost <= 0) continue;
    let left = lost;
    for (const [i, u] of fleets.entries()) {
      const share = i === fleets.length - 1 ? left : Math.min(left, idiv(lost * u.men, men));
      u.men -= share;
      u.food = Math.min(u.food, unitCarried(u));
      left -= share;
    }
    for (const u of fleets.filter((x) => x.men < LandData.levyLeast)) S.units.splice(S.units.indexOf(u), 1);
    notify(S, power, "Resolution", "Winter at sea", `Your fleets in ${Map.get(waters).name} found harbour room for ${room} of their ${men} men; winter storms on the open beaches took ${lost} of the rest.`);
    logEvent(S, "winter", `${power}'s fleets in ${Map.get(waters).name} lost ${lost} men to winter storms on open beaches.`, [power], "harbour-short");
  }
};
