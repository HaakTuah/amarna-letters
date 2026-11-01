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
import { idiv, roundEven, toInt } from "../core/num.ts";
import { Rng } from "../core/rng.ts";
import { cmpNum, count, desc, distinct, groupBy, sortBy, sum } from "../core/seq.ts";
import { cmpStr } from "../core/text.ts";
import type { GameConfig } from "../model/config.ts";
import { newMindRequest, type MindRequest } from "../model/exchanges.ts";
import { terrainOf } from "../model/geography.ts";
import { StartWalls, WorldMap } from "../model/map.ts";
import { EconomyData, harvestOf, taxOf } from "../model/economy.ts";
import { forMen } from "../model/land.ts";
import type { HireOrder, Order } from "../model/orders.ts";
import { courtOf } from "../rules/court.ts";
import { coverOf, remember, type Character } from "../model/people.ts";
import { setNameClaims, setRisen, type Power } from "../model/power.ts";
import { Views } from "../rules/views.ts";
import { newKnown, newOwnerChange, alive, findCharacter, isAlive, ledger, logEvent, newId, notify, ownedBy, siegeOf, unitLabel, wallsOf, type GameState, type Unit } from "../model/state.ts";
import type { AdjudicationResult } from "../rules/adjudicator.ts";
import { formatMoney } from "../rules/calendar.ts";
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
    // The powers risen in play are the state's (item 13+): a loaded or replayed game brings its own.
    setRisen(state.risen);
    // And the names they claim (item 17+), which the functions naming a power read.
    setNameClaims(state.names, state.eliminated, state.nameGiven, state.namesHeard);
  }

  /** The stream for a roll this season. */
  r(purpose: string, subject = ""): Rng {
    return Rng.for(this.s.seed, this.s.turn, purpose, subject);
  }

  // ---------------------------------------------------------------- state kept while a season resolves (set by the parts)

  /** Item 13: the orders each seat's commanders gave this season by their mandates, for units no order of the king's reached. */
  readonly _mandatedNow = new Dict<Power, Order[]>();
  /** Item 12: each traveller's road this season, the points it spent in each province (for learning by living there). */
  readonly _roadNow = new Dict<string, Dict<string, number>>();
  /** Item 12: the season's rolls of who understands whom, by pair, so each pair is settled once a season. */
  readonly _heardNow = new Dict<string, boolean>();
  /** Characters who missed pay this season: each counts it once, whether its wage or its back pay fell short. */
  readonly _missedPayNow = new HSet<string>();
  /** Jobs offered this season through an envoy (the hire order's `via`), by the envoy, until it is sent. */
  readonly _offersNow = new Dict<string, [Power, HireOrder][]>();
  /** What each province's countryside kept of this season's harvest, after the tax (item 10+a): what its people eat. */
  readonly _foodNow = new Dict<string, number>();
  /** Provinces ceded while this season resolves, and to whom: a levy there later in the season is told so. */
  readonly _cededNow = new Dict<string, Power>();
  /** The season's battle, once the moves are resolved. */
  _battle: AdjudicationResult | null = null;
  /** The unit orders of the season, by the province of the unit. */
  _unitOrdersNow = new Dict<string, Order>();
  /** The units that moved this season (item 9: a guest passing through, not staying). */
  readonly _movedNow = new HSet<string>();
  /** The scheduled and standing orders running this season, per seat, to tell their failures from the seat's fresh ones. */
  /** Item 10: the spies told this season to steal a tablet from the archive they watch. */
  readonly _stealing = new Set<string>();
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
    this.incomeAndUpkeep();
    // Where everyone stood before the season's travellers arrived: one standing at a court now that was not is back.
    const stood = new Dict<string, Power | null>(S.characters.map((c) => [c.id, c.at] as const));
    this.travel();
    // Item 12: everyone learns the languages spoken where he spent the season just past.
    this.learnTongues();
    this.arrivals();
    // Item 13: word reaches commanders and governors, and those whose army or province is gone go home.
    this.commandSeason();
    this.governorsSeason();
    this.tasksDue();
    this.jobsDone(stood);
    // Item 11a: the characters' money and their own seasons.
    S.approaches = S.approaches.filter((a) => a.accepted === null && a.turn >= S.turn - 2);
    this.debtsSeason();
    this.goldAndTabletsTaken();
    this.livingSeason();
    // Item 11b: news travels with people.
    this.newsSeason();
    this.naturalLosses();
    this.newcomers();
    // Item 12: the dice of who understands whom fall before any model is called.
    this.settleSpeech();
    this.lifeRequests();
    this.ownRequests();
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
   * the treasury, spoiling, the towns' meals and the sieges' clocks; then each king pays his troops and his people at court
   * (what he keeps and builds he pays at the end of the season, item 15); then every unit eats, the hungry and
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
      // Written before the season's audiences and envoys' returns: their gold comes after this figure.
      const lines = notes.getOrDefault(p, []);
      lines.push(
        `Gold in since your last orders: ${formatMoney(t.income)}, from your mines and your sales at your markets. Paid: your troops ${formatMoney(troops.paid)}.` +
          ` The treasury now holds ${formatMoney(ledger(t))}; gold received at audiences or brought home by your envoys this season is added later.`,
      );
      if (troops.unpaid.length > 0)
        lines.push(`Not paid this season: ${troops.unpaid.join(", ")}. Missing pay acts slowly: a unit unpaid ${EconomyData.unpaidMutiny} seasons running mutinies.`);
      if (troops.held.length > 0) lines.push(`Held back from pay by your standing order: ${troops.held.join(", ")}; they count it as a season of missing pay.`);
      notes.set(p, lines);
      if (troops.unpaid.length > 0) logEvent(S, "unpaid", `${p} could not pay its troops: ${troops.unpaid.join(", ")}.`, [p], "unpaid");
    }
    const fed = this.feedTroops();
    // The people of the land, after troops foraging there took their share of the farmers' food: hunger, births and the
    // flows between them (item 10+a).
    for (const [p, l] of this.peopleSeason(this._foodNow).entries()) fed.set(p, [...fed.getOrDefault(p, []), ...l]);
    // Item 17++: the ledger kept, and whom each province obeys.
    this.obeySeason();
    for (const p of alive(S)) notify(S, p, "Notice", "The treasury", [...notes.getOrDefault(p, []), ...fed.getOrDefault(p, [])].join(" "));
    this.caravansTravel();
    // The foreign markets each court sees this season (item 9+b).
    this.seeMarkets();
  }

  /**
   * A servant whose fee its master let fall due unpaid, withheld or could not pay (item 11a): it loses loyalty, remembers
   * it and counts another broken promise, once a season.
   */
  missedPay(c: Character, p: Power, memory: string): void {
    if (!this._missedPayNow.add(c.id)) return;
    c.unpaidTurns++;
    c.traits.loyalty = Math.max(0, c.traits.loyalty - 15);
    remember(c, this.s.turn, memory);
  }

  /** The pay of a power's troops a season in gold, and the cost of each siege it presses (GameConfig.siegeUpkeep). */
  upkeep(p: Power): number {
    const S = this.s;
    return (
      sum(
        S.units.filter((u) => u.power === p),
        // In proportion to its men (item 11a+).
        (u) => forMen(u.kind === "Army" ? S.config.armyUpkeep : S.config.fleetUpkeep, u.kind, u.men),
      ) +
      count(S.sieges, (x) => x.power === p) * S.config.siegeUpkeep
    );
  }

  /** Item 11a: the rest of its servants' fees a court will owe when their jobs are done, as it reckons them (a covered servant's as it believes it). */
  feesDue(p: Power): number {
    return sum(this.s.characters, (c) => this.restOf(c, p));
  }

  /** What a court's servants' jobs cost it a season, each fee over its term, as it reckons them (item 11a). */
  feeRates(p: Power): number {
    return sum(this.s.characters, (c) => {
      const k = coverOf(c, p);
      if (k !== null) return idiv(k.fee, Math.max(1, (k.contractUntil ?? k.startTurn) - k.startTurn));
      const j = c.contract;
      return c.employer === p && (c.status === "Employed" || c.status === "Captured") && j !== null && (j.knownFrom ?? 0) <= this.s.turn ? idiv(j.fee, Math.max(1, j.untilTurn - j.startTurn)) : 0;
    });
  }

  /** The fees a court let fall due unpaid, to anyone (item 11a): facts, counted in no score. */
  feesOwed(p: Power): number {
    return sum(this.s.characters, (c) => c.owed.getOrDefault(p, 0));
  }

  /**
   * The grain a province's tax brings into its stores a season: a third of its last harvest at its tax rate (item 11a+),
   * cut by absorption and catastrophes, and nothing while it is besieged (its holder keeps it and counts it, but it yields
   * nothing); the granary bounds what is collected (harvestSeason).
   */
  effectiveYield(province: string): number {
    // The harvest already bore the catastrophes; the tax bears only how fully it obeys, and nothing reaches it under a siege.
    if (siegeOf(this.s, province) !== null) return 0;
    return toInt(roundEven(idiv(idiv(this.s.reaped.getOrDefault(province, 0), 3) * this.taxRate(province), 100) * obeyedIn(this.s, province)));
  }

  /** The gold that came in since a king's last orders: his mines this season and his sales at his markets last season. */
  income(p: Power): number {
    return this.s.treasuries.get(p).income;
  }

  /**
   * How fully a province obeys its holder ("Whom a province obeys", item 17++; until then slow absorption, item 5): it pays
   * and counts in his strength by it, a third at the least, all of it where he holds it by a wide margin.
   */
  obedience(province: string): number {
    return obeyedIn(this.s, province);
  }

  /** A province passes to a new holder (or to none): the change is logged, so word of it travels (item 7b). */
  setOwner(province: string, owner: Power | null): void {
    const S = this.s;
    const old = S.owner.getOrDefault(province, null);
    if (old === owner) return;
    S.owner.set(province, owner);
    // Item 17: when it changed hands. What its people remember of each actor stays with them (item 17++).
    S.takenAt.set(province, S.turn);
    // What stands there passes with the land, and its upkeep with it; the old holder's orders for it lapse (item 15).
    this.worksChangeHands(province);
    // The old holder's tax goes with him: the new one collects the default until he sets his own (item 10+a).
    S.taxes.delete(province);
    // The king who lost it knows at once, as his notice tells him, though it leaves his sight; since item 13 only where
    // his couriers bring word within the season (farther off, word of it comes as word does).
    if (old !== null && this.wordTo(old, province) === 0) {
      let book = S.known.tryGet(old);
      if (book === undefined) S.known.set(old, (book = new Dict()));
      book.set(province, newKnown({ owner, turn: S.turn, source: "seen" }));
    } else if (old !== null && isAlive(S, old) && !this.map.get(province).isSea) {
      // Item 17++: out of his couriers' reach, his officials' last report of it stands in his view until word arrives.
      let last = S.ownLast.tryGet(old);
      if (last === undefined) S.ownLast.set(old, (last = new Dict()));
      last.set(province, Views.provinceEconomy(S, this, this.map, province));
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
      // Item 13: one reaching a court whose king has moved on is sent on after him, from his old seat.
      if (j.route.length > 1 && ForwardedKinds.has(j.kind) && isAlive(S, j.to) && j.leg >= j.route.length - 1) {
        const end = j.route[j.route.length - 1];
        const court = this.courtAt(j.to);
        if (end !== court) {
          this.setOut(j, end, court);
          continue;
        }
      }
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
        case "CaptiveConvoy":
          this.captiveArrives(j);
          break;
        case "Travel":
          this.travellerArrives(j);
          break;
        case "Rumor": {
          if (!isAlive(S, j.to)) break;
          // Talk of what a character was seen to do (item 10): it goes into the court's records, not its inbox.
          if (j.news === "Name") {
            this.nameHeard(j);
            break;
          }
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

  /** The province where a king is, his court and capital (item 13, "The capital is wherever the king is"). */
  courtAt(p: Power): string {
    return courtOf(this.s, this.map, p);
  }

  travelTurns(from: Power, to: Power): number {
    return travelTurns(this.s.config, this.map, this.courtAt(from), this.courtAt(to), this.s.turn);
  }

  travelTurnsBetween(fromProvince: string, toProvince: string): number {
    return travelTurns(this.s.config, this.map, fromProvince, toProvince, this.s.turn);
  }
}

/** Item 13: travellers that go to a court, and are sent on after its king when he has moved. */
const ForwardedKinds = new Set<string>(["EnvoyOutbound", "EnvoyHomebound", "SpyHomebound", "SpyReport", "Travel", "CaptiveConvoy"]);

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

/** How fully a province obeys its holder (see TurnEngine.obedience). */
export function obeyedIn(s: GameState, province: string): number {
  return s.obeyed.getOrDefault(province, 1000) / 1000;
}

/** The notice that someone at court was paid the back pay owed, or could not be paid it all. */
export const BackPayTitle = "Back pay";

/** The notice to the power that took a king's capital, and with it his kingdom. */
export const KingdomFallsTitle = "A kingdom falls to you";
