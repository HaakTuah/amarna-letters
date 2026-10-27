/**
 * Pure, synchronous phase functions over a GameState. A turn is one season:
 * 1. {@link TurnEngine.beginTurn}: servants whose notice ran out leave, income and upkeep, arrivals, tasks and contracts
 *    that fall due.
 * 2. The caller fulfils {@link TurnEngine.mindRequests} (reports, pitches), calls wakeCheck and runs audiences, then calls
 *    applyAudience for each and courtsHeld (a seat that held court asleep reopens its orders or sleeps on).
 * 3. Seats read Views.for and submit secret, simultaneous orders.
 * 4. {@link TurnEngine.resolve}: combat, transfers, dispatches, intelligence, world events, scoring, the end roll.
 * Nothing here calls a model or does I/O: every outside decision arrives as validated data.
 *
 * As in the C# build's partial class, the engine's parts live in their own files (envoys, intelligence, sleep, sieges,
 * archives, covers, events, inventories), each adding its methods to this class; import the class from "./turn-engine.ts",
 * which loads them all.
 */
import { Dict, HSet } from "../core/collections.ts";
import { clamp, idiv, roundEven, toInt } from "../core/num.ts";
import { Rng } from "../core/rng.ts";
import { cmpNum, count, desc, distinct, groupBy, sortBy, sum } from "../core/seq.ts";
import { cmpStr } from "../core/text.ts";
import type { GameConfig } from "../model/config.ts";
import { newMindRequest, type MindRequest } from "../model/exchanges.ts";
import { terrainOf } from "../model/geography.ts";
import { StartWalls, WorldMap } from "../model/map.ts";
import { EconomyData, harvestOf, taxOf } from "../model/economy.ts";
import type { Order } from "../model/orders.ts";
import { coverOf, gain, hiddenAt, remember, type Character } from "../model/people.ts";
import { land, type Power } from "../model/power.ts";
import { newKnown, newOwnerChange, alive, findCharacter, isAlive, ledger, logEvent, newId, notify, ownedBy, siegeOf, unitLabel, wallsOf, type GameState, type Unit } from "../model/state.ts";
import type { AdjudicationResult } from "../rules/adjudicator.ts";
import { formatMoney } from "../rules/calendar.ts";
import { Views } from "../rules/views.ts";
import type { SeatView } from "../model/views.ts";
import type { PlannedOrder } from "../model/sleep.ts";
import { wordSeasons } from "../model/travel.ts";
import type { Firing } from "./plans.ts";

export class TurnEngine {
  readonly s: GameState;
  readonly map: WorldMap;
  readonly mindRequests: MindRequest[] = [];

  constructor(state: GameState, map: WorldMap | null = null) {
    this.s = state;
    this.map = map ?? WorldMap.default;
  }

  /** The stream for a roll this season. */
  r(purpose: string, subject = ""): Rng {
    return Rng.for(this.s.seed, this.s.turn, purpose, subject);
  }

  // ---------------------------------------------------------------- state kept while a season resolves (set by the parts)

  /** Characters who missed pay this season: each counts it once, whether its wage or its back pay fell short. */
  readonly _missedPayNow = new HSet<string>();
  /** Provinces ceded while this season resolves, and to whom: a levy there later in the season is told so. */
  readonly _cededNow = new Dict<string, Power>();
  /** The season's battle, once the moves are resolved. */
  _battle: AdjudicationResult | null = null;
  /** The unit orders of the season, by the province of the unit. */
  _unitOrdersNow = new Dict<string, Order>();
  /** The units that moved this season (item 9: a guest passing through, not staying). */
  readonly _movedNow = new HSet<string>();
  /** The scheduled and standing orders running this season, per seat, to tell their failures from the seat's fresh ones. */
  readonly _scheduledNow = new Dict<Power, Order[]>();
  /** Of those, the ones from standing orders that fired, with the standing order's id. */
  readonly _standingNow = new Dict<Power, [Order, string][]>();
  /** The standing orders that fired this season, per seat, to be told once the orders are checked. */
  readonly _firedNow = new Dict<Power, Firing[]>();
  /** The scheduled moves running this season, per seat, with what was kept: a move that fails holds up its unit's march. */
  readonly _marchNow = new Dict<Power, [Order, PlannedOrder][]>();
  /** Each seat's view as the season begins, built once for the conditions of its orders (plans.ts). */
  readonly _viewsNow = new Dict<Power, SeatView>();

  // ---------------------------------------------------------------- phase 1

  beginTurn(): void {
    const S = this.s;
    if (S.ended) return;
    this.mindRequests.length = 0;
    S.audiences.length = 0;
    S.counterIntel.clear();
    this._missedPayNow.clear();
    // A siege whose army is gone since it was last pressed (disbanded, given away, lost to plague) is over: it costs nothing.
    this.liftLostSieges();
    // Land absorbed in full is no longer marked.
    for (const done of [...S.conquered.entries()].filter(([, v]) => S.turn - v >= 3).map(([k]) => k)) S.conquered.delete(done);
    // A servant whose notice has run out leaves before it is paid again.
    this.noticesRunOut();
    this.incomeAndUpkeep();
    // Where everyone stood before the season's travellers arrived: one standing at a court now that was not is back.
    const stood = new Dict<string, Power | null>(S.characters.map((c) => [c.id, c.at] as const));
    this.travel();
    this.arrivals();
    this.payBackPay(stood);
    this.tasksDue();
    this.memoriesDue();
  }

  /** Characters whose memory has grown long fold their oldest memories into a summary, written in their own voice. */
  memoriesDue(): void {
    const S = this.s;
    const keep = Math.max(4, S.config.memoryKeep);
    for (const c of sortBy(
      S.characters.filter((c) => c.status !== "Dead" && c.memory.length > keep),
      [(c: Character) => idNumber(c.id), cmpNum],
    )) {
      const fold = c.memory.length - idiv(keep, 2);
      this.mindRequests.push(
        newMindRequest({
          id: newId(S, "r"),
          task: "SummarizeMemory",
          characterId: c.id,
          // The court it belongs to, if any: one with no employer that stands at no court belongs to none.
          court: c.employer ?? c.at,
          facts: c.memory.slice(0, fold).map((m) => `season ${m.turn}: ${m.text}`),
          fold,
        }),
      );
    }
  }

  /**
   * The season's economy as it begins (build order item 9+a): the harvest's tax into the stores and the mines' gold into
   * the treasury, spoiling, the towns' meals and the sieges' clocks; then each king pays his troops, the walls he raised
   * (their builders' pay goes into the province's purse) and his people at court; then every unit eats, the hungry and
   * the unpaid mutiny in time, and the caravans go on. Each king reads it in one notice.
   */
  incomeAndUpkeep(): void {
    const S = this.s;
    const Map = this.map;
    const notes = this.harvestSeason();
    this.townsEat();
    for (const p of alive(S)) {
      const t = S.treasuries.get(p);
      const troops = this.payTroops(p);
      // Walls above the map's own are kept up after the troops: what the treasury cannot keep falls a level.
      const crumbled: string[] = [];
      while (this.wallsUpkeep(p) > Math.max(0, t.gold)) {
        const cap = Map.capital(p).id;
        const weakest = sortBy(
          ownedBy(S, p).filter((x) => wallsOf(S, x) > (StartWalls.get(x) ?? 0)),
          [(x: string) => Map.hops(cap, x), desc(cmpNum)],
          [(x: string) => x, cmpStr],
        )[0];
        if (weakest === undefined) throw new Error("Sequence contains no elements");
        this.lowerWalls(weakest);
        crumbled.push(Map.get(weakest).name);
      }
      const walls = this.wallsUpkeep(p);
      t.gold -= walls;
      for (const x of ownedBy(S, p)) this.spendAt(x, Math.max(0, wallsOf(S, x) - (StartWalls.get(x) ?? 0)) * S.config.wallUpkeep);

      let wages = 0;
      let owed = 0;
      const unpaid: string[] = [];
      // Only people at court are paid their wage. The wages of those away (on a mission, posted as a spy, detained or
      // captive) build up as back pay, paid when they are back, and no gold leaves for them, so the treasury betrays
      // nothing of what befell anyone away. A servant abroad whose fate the court has not heard of is owed it as the
      // court believes it (its cover), and its real back pay builds up too if it still truly serves.
      for (const c of sortBy(S.characters, [(c: Character) => c.id, cmpStr])) {
        const cover = coverOf(c, p);
        if (cover !== null) {
          cover.backPay += cover.wage;
          owed += cover.wage;
        }
        const k = c.contract;
        if (c.employer !== p || !(c.status === "Employed" || c.status === "Captured") || k === null || !(k.wage > 0)) continue;
        if (c.status === "Captured" || c.at !== p || c.duty !== "None") {
          c.backPay.set(p, c.backPay.getOrDefault(p, 0) + k.wage);
          if (cover === null) owed += k.wage;
          continue;
        }
        if (t.gold >= k.wage) {
          t.gold -= k.wage;
          gain(c, k.wage, "Wages");
          c.unpaidTurns = 0;
          wages += k.wage;
          continue;
        }
        this.missedPay(c, p, `My wage from ${land(p)} was not paid this season.`);
        unpaid.push(c.name);
      }

      // Written before the season's audiences and envoys' returns: their gold comes after this figure.
      const lines = notes.getOrDefault(p, []);
      lines.push(
        `Gold in since your last orders: ${formatMoney(t.income)}, from your mines and your sales at your markets. Paid: your troops ${formatMoney(troops.paid)}${walls > 0 ? `, walls ${formatMoney(walls)}` : ""}, wages ${formatMoney(wages)} (to your people at court).` +
          (owed > 0 ? ` The wages of your people away, ${formatMoney(owed)}, were added to their back pay, which is paid when they are back at your court.` : "") +
          ` The treasury now holds ${formatMoney(ledger(t))}; gold received at audiences or brought home by your envoys this season is added later.`,
      );
      if (troops.unpaid.length > 0)
        lines.push(`Not paid this season: ${troops.unpaid.join(", ")}. Missing pay acts slowly: a unit unpaid ${EconomyData.unpaidMutiny} seasons running mutinies.`);
      if (crumbled.length > 0)
        lines.push(`Unkept, walls fell a level: ${groupBy(crumbled, (x) => x).map(([k, g]) => (g.length === 1 ? k : `${k} (${g.length} levels)`)).join(", ")}.`);
      if (unpaid.length > 0) lines.push(`Could not pay: ${unpaid.join(", ")}.`);
      notes.set(p, lines);
      if (troops.unpaid.length > 0) logEvent(S, "unpaid", `${p} could not pay its troops: ${troops.unpaid.join(", ")}.`, [p], "unpaid");
    }
    const fed = this.feedTroops();
    for (const p of alive(S)) notify(S, p, "Notice", "The treasury", [...notes.getOrDefault(p, []), ...fed.getOrDefault(p, [])].join(" "));
    this.caravansTravel();
  }

  /**
   * A servant not paid in full (its wage at court, or its back pay once it is back): it loses loyalty, remembers it and
   * counts another unpaid season, once a season; if its loyalty falls low while it is at court with no task, it leaves.
   */
  missedPay(c: Character, p: Power, memory: string): void {
    if (!this._missedPayNow.add(c.id)) return;
    c.unpaidTurns++;
    c.traits.loyalty = Math.max(0, c.traits.loyalty - 15);
    remember(c, this.s.turn, memory);
    if (c.traits.loyalty < 20 && c.duty === "None") this.quit(c, `${c.name} has left your service, unpaid.`);
  }

  /**
   * Back pay, once the season's travellers have arrived: everyone standing at a court that owes it back pay, and not
   * held there, is paid from that court's true treasury, as much as it holds, whether or not it still serves that
   * court. What the treasury cannot pay stays owed, and for one of the court's own servants counts as missed pay.
   * `stood`: where each character stood before the arrivals: one now at a court it was not at is back.
   */
  payBackPay(stood: Dict<string, Power | null>): void {
    const S = this.s;
    for (const c of sortBy(S.characters, [(c: Character) => c.id, cmpStr])) {
      // A foreign spy posted at the court in secret does not stand there in the open, so it is not paid there.
      const court = c.at;
      if (court === null || c.heldBy === court || c.status === "Dead" || !isAlive(S, court) || hiddenAt(c, court)) continue;
      const owed = c.backPay.getOrDefault(court, 0);
      if (owed <= 0) continue;
      const t = S.treasuries.get(court);
      // As for any payment, a shortfall shows the treasurers that the ledger counted debased gold.
      if (t.gold < owed) this.exposeDebasement(court, `${c.name}'s back pay`);
      const paid = clamp(t.gold, 0, owed);
      t.gold -= paid;
      gain(c, paid, "Wages");
      if (paid === owed) c.backPay.delete(court);
      else c.backPay.set(court, owed - paid);
      const who = stood.getOrDefault(c.id, null) !== court ? `${c.name} is back at your court and` : c.name;
      if (paid > 0) remember(c, S.turn, `The king of ${land(court)} paid me ${formatMoney(paid)} of the wages he owed me.`);
      if (paid === owed) {
        notify(S, court, "Notice", BackPayTitle, `${who} was paid ${formatMoney(paid)} of back pay.`, c.id);
        continue;
      }
      notify(
        S,
        court,
        "Notice",
        BackPayTitle,
        `${who} is owed ${formatMoney(owed)} of back pay, but the treasury could pay only ${formatMoney(paid)}: the other ${formatMoney(owed - paid)} stays owed, and counts as missed pay.`,
        c.id,
      );
      if (c.employer === court && c.status === "Employed") this.missedPay(c, court, `The king of ${land(court)} could not pay all the wages he owes me.`);
    }
  }

  /**
   * The upkeep of the walls a power holds above the map's own for each province (GameConfig.wallUpkeep a level a season),
   * paid after its troops' upkeep.
   */
  wallsUpkeep(p: Power): number {
    const S = this.s;
    return sum(ownedBy(S, p), (x) => Math.max(0, wallsOf(S, x) - (StartWalls.get(x) ?? 0))) * S.config.wallUpkeep;
  }

  /** The pay of a power's troops a season in gold, and the cost of each siege it presses (GameConfig.siegeUpkeep). */
  upkeep(p: Power): number {
    const S = this.s;
    return (
      sum(
        S.units.filter((u) => u.power === p),
        (u) => (u.kind === "Army" ? S.config.armyUpkeep : S.config.fleetUpkeep),
      ) +
      count(S.sieges, (x) => x.power === p) * S.config.siegeUpkeep
    );
  }

  /**
   * The wages a court owes its people each season, as it reckons them (a covered servant's as it believes it): paid to
   * those at court, built up as back pay for those away.
   */
  wages(p: Power): number {
    return sum(this.s.characters, (c) => this.wageOf(c, p));
  }

  /** The back pay a court really owes, to anyone, servant or not: what its score counts. */
  backPayOwed(p: Power): number {
    return sum(this.s.characters, (c) => c.backPay.getOrDefault(p, 0));
  }

  /**
   * The back pay a court believes it owes: to its people (a covered servant's as it believes it), and to anyone standing
   * at its court. What its seat sees, and what its strength by its ledger counts.
   */
  believedBackPay(p: Power): number {
    return sum(this.s.characters, (c) => Views.backPayOwed(c, p) ?? 0);
  }

  /**
   * The grain a province's tax brings into its stores this season: its harvest's share at the default rate, cut by
   * absorption and catastrophes, and nothing while it is besieged (its holder keeps it and counts it, but it yields nothing).
   */
  effectiveYield(province: string): number {
    return toInt(roundEven(taxOf(harvestOf(this.map.get(province))) * this.yieldFactor(province)));
  }

  /** The gold that came in since a king's last orders: his mines this season and his sales at his markets last season. */
  income(p: Power): number {
    return this.s.treasuries.get(p).income;
  }

  /**
   * How much of a province its holder has absorbed (slow absorption, Build order item 5): land taken by force yields, and
   * counts in his strength, a third of its yield in its first season under him, two thirds in the second, all of it from
   * the third. Land held from the start, bought, ceded, or retaken of the holder's own homeland counts in full.
   */
  absorbed(province: string): number {
    return absorbedIn(this.s, province);
  }

  /**
   * A province changes hands by force (stormed, surrendered to a siege, taken by troops standing in it, or passing with a
   * fallen kingdom): its new holder absorbs it slowly, unless it is of his own homeland, which he retakes in full.
   */
  takenByForce(province: string, taker: Power | null): void {
    if (taker !== null && this.map.get(province).home !== taker) this.s.conquered.set(province, this.s.turn);
    else this.s.conquered.delete(province);
  }

  /** A province passes to a new holder (or to none): the change is logged, so word of it travels (item 7b). */
  setOwner(province: string, owner: Power | null): void {
    const S = this.s;
    const old = S.owner.getOrDefault(province, null);
    if (old === owner) return;
    S.owner.set(province, owner);
    // The king who lost it knows at once, as his notice tells him, though it leaves his sight.
    if (old !== null) {
      let book = S.known.tryGet(old);
      if (book === undefined) S.known.set(old, (book = new Dict()));
      book.set(province, newKnown({ owner, turn: S.turn, source: "seen" }));
    }
    S.ownerLog.push(newOwnerChange({ province, turn: S.turn, owner }));
  }

  quit(c: Character, notice: string): void {
    if (c.employer !== null) notify(this.s, c.employer, "Notice", "A servant leaves", notice, c.id);
    c.employer = null;
    c.contract = null;
    c.status = "Free";
    c.duty = "None";
  }

  /**
   * Takes gold from the true treasury. A shortfall exposes any debased gold the ledger was counting, and is reported as
   * a failure: what could not be paid for and, for an order, what came of it (a scheduled order then wakes its seat).
   */
  pay(p: Power, amount: number, what: string, order: Order | null = null, outcome: string | null = null): boolean {
    const t = this.s.treasuries.get(p);
    if (amount <= 0) return true;
    if (t.gold >= amount) {
      t.gold -= amount;
      return true;
    }
    this.exposeDebasement(p, what);
    // Every order that fails for want of gold is reported as a failure, whether or not debased gold was found.
    notify(this.s, p, "Rejected", "Not enough gold", `There was not enough gold to pay for ${what}${outcome === null ? "" : "; " + outcome}.`);
    if (order !== null) this.scheduledFailed(p, order, "not enough gold");
    return false;
  }

  /** A payment the true treasury cannot cover: the treasurers find any debased gold the ledger was counting, all at once. */
  exposeDebasement(p: Power, what: string): void {
    const S = this.s;
    const t = S.treasuries.get(p);
    if (!t.lots.some((l) => l.face > l.true)) return;
    const missing = sum(t.lots, (l) => l.face - l.true);
    const sources = distinct(t.lots.filter((l) => l.face > l.true).map((l) => l.from)).join(", ");
    t.lots.length = 0;
    notify(
      S,
      p,
      "Assay",
      "The treasury is short",
      `Paying for ${what}, your treasurers found the treasury lighter than the ledger: ${formatMoney(missing)} of gold received from ${sources} was never fine gold.`,
    );
    logEvent(S, "debasement", `${p} discovers ${formatMoney(missing)} of debased gold from ${sources}.`, [p], "debasement-found");
  }

  /**
   * An order that could not be carried out as the season resolved: its king reads why next season, as a rejection
   * notice, and a scheduled one that others foiled (`byOthers`) wakes its seat.
   */
  failed(p: Power, order: Order, title: string, body: string, why: string, byOthers: boolean, subject: string | null = null): void {
    notify(this.s, p, "Rejected", title, body, subject);
    if (byOthers) this.scheduledFailed(p, order, why);
  }

  // ---------------------------------------------------------------- arrivals and tasks (filled out by the envoy and intelligence parts)

  arrivals(): void {
    const S = this.s;
    const due = sortBy(
      S.journeys.filter((j) => j.arriveTurn <= S.turn),
      [(j) => j.arriveTurn, cmpNum],
      [(j) => idNumber(j.id), cmpNum],
    );
    for (const j of due) {
      const i = S.journeys.indexOf(j);
      if (i >= 0) S.journeys.splice(i, 1);
      switch (j.kind) {
        case "EnvoyOutbound":
          this.envoyArrivesAbroad(j);
          break;
        case "EnvoyHomebound":
          this.envoyArrivesHome(j);
          break;
        case "SpyOutbound":
          this.spyArrives(j);
          break;
        case "SpyReport":
          this.spyReportArrives(j);
          break;
        case "SpyHomebound":
          this.spyComesHome(j);
          break;
        case "Ransom":
          this.ransomArrives(j);
          break;
        case "Word":
          this.wordArrives(j);
          break;
        case "Rumor": {
          if (!isAlive(S, j.to)) break;
          if (j.taskId !== null && !this.demandArrives(j)) break;
          // Word that a servant has not returned, to a court that no longer believes anything of it
          // (it heard of a death, dismissed the servant, or saw it seeking service): nothing to tell.
          const who = findCharacter(S, j.characterId);
          if (j.news === "Overdue" && (who === null || coverOf(who, j.to) === null)) break;
          notify(S, j.to, "Rumor", "Rumor", j.text ?? "", j.characterId);
          this.newsArrives(j);
          break;
        }
      }
    }
    this.coversAtCourt();
  }

  travelTurns(from: Power, to: Power): number {
    return travelTurns(this.s.config, this.map, this.map.capital(from).id, this.map.capital(to).id, this.s.turn);
  }

  travelTurnsBetween(fromProvince: string, toProvince: string): number {
    return travelTurns(this.s.config, this.map, fromProvince, toProvince, this.s.turn);
  }
}

/** The number in an id ("c12" is 12; 0 if it has none), the order of making within a kind. */
export function idNumber(id: string): number {
  let digits = "";
  for (const ch of id) if (ch >= "0" && ch <= "9") digits += ch;
  if (digits === "") return 0;
  const n = Number(digits);
  return n > 2147483647 ? 0 : n;
}

/**
 * Seasons for word to go between two provinces, setting out in a turn, by the fastest route open then
 * ({@link wordSeasons}): what reports, rumours and ransoms take, and about what a traveller takes on the road.
 */
export function travelTurns(config: GameConfig, map: WorldMap, fromProvince: string, toProvince: string, turn: number): number {
  return wordSeasons(config.travelDays, map, fromProvince, toProvince, turn);
}

/** How much of a province its holder has absorbed (see TurnEngine.absorbed). */
export function absorbedIn(s: GameState, province: string): number {
  const taken = s.conquered.tryGet(province);
  if (taken === undefined) return 1.0;
  const d = s.turn - taken;
  return d <= 1 ? 1 / 3.0 : d === 2 ? 2 / 3.0 : 1.0;
}

/** The notice that someone at court was paid the back pay owed, or could not be paid it all. */
export const BackPayTitle = "Back pay";

/** The notice to the power that took a king's capital, and with it his kingdom. */
export const KingdomFallsTitle = "A kingdom falls to you";
