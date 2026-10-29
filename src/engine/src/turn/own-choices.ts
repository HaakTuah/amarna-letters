/**
 * Haakon's answers to item 11b: a chief decides raids, ships and the way back in a request of his own, like every
 * character, and a posted spy whose reports wait for a carrier decides whether to wait, pay or carry them home itself.
 * Each season, after its own, a chief and such a spy are asked ("Chief", "Reports"). A model mind answers with its
 * choices, which the engine takes the next season; a script mind answers nothing, and the script's traits decide as
 * before (the formulas in `bands.ts` and `letters.ts`), so script games are unchanged.
 */
import { idiv } from "../core/num.ts";
import { cmpNum, sortBy, sum } from "../core/seq.ts";
import { cmpStr } from "../core/text.ts";
import { BandData, type Band } from "../model/bands.ts";
import { newMindRequest } from "../model/exchanges.ts";
import { KillValues, newChiefView, newReportsView, type ChiefChoice, type ChiefView, type Kill, type LandSeen, type ReportsChoice, type ReportsView } from "../model/life.ts";
import { remember, type Character } from "../model/people.ts";
import type { Power } from "../model/power.ts";
import { findCharacter, logEvent, newId } from "../model/state.ts";
import { idNumber, TurnEngine } from "./core.ts";
import { basePrice } from "./court.ts";
import { LetterData } from "./letters.ts";
import { endingWords } from "./life.ts";

declare module "./core.ts" {
  interface TurnEngine {
    /** Each season, after the characters' own: a request for every chief, and for every posted spy whose reports wait. */
    ownRequests(): void;
    chiefView(c: Character, b: Band): ChiefView;
    reportsView(c: Character): ReportsView | null;
    /** A chief's choices taken: the band's next season as he decided it. */
    applyChief(c: Character, ch: ChiefChoice): void;
    /**
     * At the start of a band's season: a chief who decided last season does as he chose. True if he did (the formula then
     * decides nothing for him this season); "gone" if he gave up the road.
     */
    chiefDecides(b: Band, chief: Character): boolean | "gone";
    /** A ship bought in the port where the band works, if it can be. */
    buyShip(b: Band, chief: Character): void;
  }
}

const P = TurnEngine.prototype;

/**
 * The choices made last season, if a model made them; null leaves the script's traits to decide. Both requests are made
 * as a season begins, after the bands' season and the letters' look for carriers, and answered before it resolves; the
 * choices are taken when the next season begins.
 */
function freshPlan<T extends { turn: number }>(plan: T | null, turn: number): T | null {
  return plan !== null && plan.turn === turn - 1 ? plan : null;
}

/** A chief's band kills this victim it robbed, by whom he chose to kill. */
export function killsByChoice(kill: Kill, victim: Character): boolean {
  return kill === "all" || (kill === "servants" && victim.employer !== null);
}

P.ownRequests = function () {
  const S = this.s;
  for (const b of sortBy([...S.bands], [(x: Band) => idNumber(x.id), cmpNum])) {
    const c = findCharacter(S, b.leaderId);
    if (c === null || c.status !== "Free" || c.duty !== "Leading") continue;
    this.mindRequests.push(newMindRequest({ id: newId(S, "r"), task: "Chief", characterId: c.id, court: null, chief: this.chiefView(c, b) }));
  }
  const spies = new Set(S.journeys.filter((j) => j.kind === "SpyReport" && j.waitAt !== null && j.carrier === null && j.characterId !== null).map((j) => j.characterId!));
  for (const id of [...spies].sort((a, b) => idNumber(a) - idNumber(b))) {
    const c = findCharacter(S, id);
    const v = c === null ? null : this.reportsView(c);
    if (v !== null) this.mindRequests.push(newMindRequest({ id: newId(S, "r"), task: "Reports", characterId: id, court: c!.employer, reports: v }));
  }
};

P.chiefView = function (c, b) {
  const S = this.s;
  const seen = (id: string): LandSeen => {
    const p = this.map.get(id);
    return {
      province: id,
      name: p.name,
      holder: S.owner.getOrDefault(id, null),
      // What one hears of a land's wealth: in round numbers.
      purse: Math.round(this.market(id).purse / 50) * 50,
      stores: Math.round(this.stores(id) / 50) * 50,
      // The land's own troops: they halve what a band takes, and only its king's army hunts it.
      army: S.units.some((u) => u.province === id && u.power === S.owner.getOrDefault(id, null)),
      bands: sum(
        S.bands.filter((o) => o !== b && o.province === id),
        (o) => o.men,
      ),
      coast: p.isCoastal,
      hunted: this.huntHeard(b.province, id),
    };
  };
  const here = this.map.get(b.province);
  return newChiefView({
    turn: S.turn,
    men: b.men,
    ship: b.ship,
    purse: c.purse,
    cost: b.cost,
    short: b.short,
    here: seen(b.province),
    next: sortBy(
      this.map.movesFrom("Army", b.province).filter((n) => !this.map.get(n).isSea),
      [(n: string) => n, cmpStr],
    ).map(seen),
    shipCost: !b.ship && here.isCoastal && b.men >= BandData.shipMen ? BandData.shipCost : null,
    shipMen: BandData.shipMen,
    kill: c.chiefPlan?.kill ?? null,
    ending: endingWords(S, b.province),
  });
};

P.reportsView = function (c) {
  const S = this.s;
  if (c.status !== "Employed" || c.employer === null || c.duty !== "SpyPosted") return null;
  const master = c.employer as Power;
  const waiting = S.journeys.filter((j) => j.kind === "SpyReport" && j.waitAt !== null && j.carrier === null && j.characterId === c.id && j.to === master);
  if (waiting.length === 0) return null;
  const at = waiting[0].waitAt!;
  const seasons = Math.max(1, this.travelTurnsBetween(at, this.courtAt(master)));
  // What a carrier would ask, as the spy reckons it from what it would ask itself.
  const price = basePrice(c, master) * seasons;
  const court = [...S.owner.values()].some((p) => p !== null && this.courtAt(p) === at);
  return newReportsView({
    turn: S.turn,
    post: this.map.get(at).name,
    master,
    reports: waiting.length,
    waited: Math.max(...waiting.map((j) => S.turn - j.departTurn)),
    purse: c.purse,
    home: seasons,
    passing: idiv(price * LetterData.sidePercent, 100),
    hired: court ? idiv(price * LetterData.hiredPercent, 100) : null,
    paysOnDelivery: S.payCarriers.includes(master),
    border: ((b) => (b === null ? null : this.map.get(b).name))(this.borderOf(c, master)),
  });
};

P.applyChief = function (c, ch) {
  if (c.status !== "Free" || c.duty !== "Leading") return;
  c.chiefPlan = { ...ch, kill: (KillValues as readonly string[]).includes(ch.kill) ? ch.kill : "none" };
};

P.chiefDecides = function (b, chief) {
  const S = this.s;
  const plan = freshPlan(chief.chiefPlan, S.turn);
  if (plan === null) return false;
  if (plan.giveUp) {
    remember(chief, S.turn, `I chose to give up the road in ${this.map.get(b.province).name}.`);
    this.wayBack(b, "he chose to");
    return "gone";
  }
  // A ship is bought only where the band stays by the sea: moved inland, it would be left behind at once.
  if (plan.ship && (plan.go === null || plan.go === b.province || this.map.get(plan.go).isCoastal)) this.buyShip(b, chief);
  if (plan.go !== null && plan.go !== b.province && this.map.movesFrom("Army", b.province).includes(plan.go) && !this.map.get(plan.go).isSea) {
    b.province = plan.go;
    chief.watchProvince = plan.go;
    if (!this.map.get(plan.go).isCoastal) b.ship = false;
    logEvent(S, "band", `${chief.name}'s band moved to ${this.map.get(plan.go).name}.`, [], "band-moved");
  }
  return true;
};

P.buyShip = function (b, chief) {
  const S = this.s;
  const here = this.map.get(b.province);
  if (b.ship || !here.isCoastal || b.men < BandData.shipMen || chief.purse < BandData.shipCost) return;
  chief.purse -= BandData.shipCost;
  chief.earned.spent += BandData.shipCost;
  this.spendAt(b.province, BandData.shipCost);
  b.ship = true;
  remember(chief, S.turn, `I bought a ship at ${here.name}: my band works the sea now too.`);
  logEvent(S, "band", `${chief.name}'s band bought a ship at ${here.name} and took to the sea.`, [], "band-ship");
};

/** The spy's own choice for its waiting reports this season, if it made one: the most it pays now, and whether it carries them. */
export function reportsChoice(c: Character, turn: number): ReportsChoice | null {
  return freshPlan(c.reportsPlan, turn);
}
