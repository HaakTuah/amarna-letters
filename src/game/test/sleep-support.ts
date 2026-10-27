import { describe, test } from "vitest";
import { court } from "../src/bots/statecraft-court.ts";
import { host } from "../src/bots/statecraft-letters.ts";
import {
  AllPowers,
  type AudienceView,
  Dict,
  type GameConfig,
  type GameState,
  type HostReply,
  type InboxItem,
  type Order,
  type Power,
  type SeatView,
  type SleepState,
  type StandingOrder,
  type StandingRequest,
  type TurnSubmission,
  convoy,
  first,
  inboxOf,
  move,
  newGame,
  newGameConfig,
  newHostReply,
  newId,
  newPlannedOrder,
  newScheduledOrders,
  newSleepSpell,
  newSleepState,
  newStandingOrder,
  newStandingRequest,
  newTurnSubmission,
  newUnit,
  support,
  unitAt,
  unitOf,
} from "@amarna/engine";
import { GameRunner, type ISeat, ScriptMind, TemplateNarrator } from "@amarna/game";
import { type CallSpec, type JsonAsker, type JsonObject } from "@amarna/llm";
import { removeAll, Assert, toDict } from "../../engine/test/support.ts";
import { convoy as convoyOrder } from "@amarna/engine";
import { first as firstOf } from "@amarna/engine";
import { support as supportOrder } from "@amarna/engine";
import { describe as describeOrder } from "@amarna/engine";

// The sleeping seats' tests share these seats, games and helpers (split from one file, since files stay under 50 KB).

// <summary>A seat that may sleep, deciding from a script, and remembering when it was asked.</summary>
export class Sleeper implements ISeat {
  readonly #decide: (a0: SeatView) => TurnSubmission;
  readonly #host: ((a0: AudienceView) => HostReply) | null;
  constructor(decide: (a0: SeatView) => TurnSubmission, host: ((a0: AudienceView) => HostReply) | null = null) {
    this.#decide = decide;
    this.#host = host;
  }
  views: SeatView[] = [];
  hosted: number[] = [];
  courts: SeatView[] = [];
  audiences: AudienceView[] = [];
  get calls(): number[] {
    return this.views.map((v) => v.turn);
  }
  get label(): string {
    return "Test sleeper";
  }
  get canSleep(): boolean {
    return true;
  }

  decide(view: SeatView, ct: AbortSignal): Promise<TurnSubmission> {
    this.views.push(view);
    return Promise.resolve(this.#decide(view));
  }

  hostAudience(view: AudienceView, court: SeatView, ct: AbortSignal): Promise<HostReply> {
    {
      this.hosted.push(view.turn);
      this.courts.push(court);
      this.audiences.push(view);
    }
    return Promise.resolve(this.#host?.(view) ?? newHostReply({ speech: "Go in peace.", end: true }));
  }
}

// <summary>A seat that never sleeps and does what it is told each season (nothing, by default).</summary>
export class Scripted implements ISeat {
  readonly #decide: ((a0: SeatView) => TurnSubmission) | null;
  constructor(decide: ((a0: SeatView) => TurnSubmission) | null = null) {
    this.#decide = decide;
  }
  get label(): string {
    return "Scripted";
  }
  decide(view: SeatView, ct: AbortSignal): Promise<TurnSubmission> {
    return Promise.resolve(this.#decide?.(view) ?? newTurnSubmission());
  }
  hostAudience(view: AudienceView, court: SeatView, ct: AbortSignal): Promise<HostReply> {
    return Promise.resolve(newHostReply({ end: true }));
  }
}

// <summary>Records what a model king is sent, and holds everything. With , it reopens its orders at every audience held while they stand.</summary>
export class ModelRecorder implements JsonAsker {
  readonly #reopen: boolean;
  constructor(reopen: boolean = false) {
    this.#reopen = reopen;
  }
  specs: CallSpec[] = [];

  askJson(spec: CallSpec, ct: AbortSignal): Promise<JsonObject> {
    this.specs.push(spec);
    // A court reply welcomes every envoy the request names, by his id.
    if (spec.key.includes("/court/")) {
      const answers = [...spec.user.matchAll(/\((c\d+)\), envoy of /g)].map(
        (m) => `{"envoy":"${m[1]}","speech":"Welcome.","gift_to_envoy":0,"gift_request":"","offer_service_wage":0,"seal_tablet":false,"detain_envoy":false,"send_gold_back":0,"gold_back_purity":100,"end_audience":true}`,
      );
      return Promise.resolve(JSON.parse(`{"answers":[${answers.join(",")}],"letters":[],"reopen_orders":${this.#reopen},"ledger":[],"standing_answers":[],"cancel_answers":[]}`)!);
    }
    let json = spec.key.includes("/orders/")
      ? `{"notes":"Hold fast.","summary":"","ledger":[],"units":[],"letters":[],"other_orders":[],"schedule":[],"standing_orders":[],"cancel_standing":[],"standing_answers":[],"cancel_answers":[]}`
      : `{"speech":"Welcome.","gift_to_envoy":0,"gift_request":"","offer_service_wage":0,"seal_tablet":false,"detain_envoy":false,"send_gold_back":0,"gold_back_purity":100,"end_audience":true,"ledger":[],"letters":[],"reopen_orders":REOPEN}`.replaceAll(
          "REOPEN",
          this.#reopen ? "true" : "false",
        );
    return Promise.resolve(JSON.parse(json)!);
  }
}

// <summary>Sleeping seats are on by default: nothing here switches them on.</summary>
export const Quiet: GameConfig = newGameConfig({ endMedian: 10000, catastropheChance: 0 });

export function nothing(): TurnSubmission {
  return newTurnSubmission();
}

// A game whose hidden cap wakes a seat that slept this many seasons. A king cannot ask to be woken, so the tests that need
// a seat awake in a given season use the cap: having given orders in turn t, it is woken in turn t + 1 + seasons.
export function cap(seasons: number): GameConfig {
  return { ...Quiet, maxSleep: seasons };
}

// <summary>One sleeper; every other king does nothing unless told.</summary>
export async function play(
  who: Power,
  sleeper: ISeat,
  turns: number,
  config: GameConfig | null = null,
  others: Dict<Power, ISeat> | null = null,
  setup: ((a0: GameState) => void) | null = null,
): Promise<GameRunner> {
  let state = newGame(31, config ?? Quiet);
  setup?.(state);
  let seats = toDict(
    AllPowers,
    (p) => p,
    (p): ISeat => (p === who ? sleeper : (others?.tryGet(p) ?? new Scripted())),
  );
  let runner = Object.assign(new GameRunner(state, seats, new ScriptMind(), new TemplateNarrator()), { writeChronicles: false });
  await runner.prepare();
  for (let i = 0; i < turns && !state.ended; i++) await runner.playTurn();
  return runner;
}

// <summary>A sleeping seat in an engine-only game: it gave orders in turn 1 and sleeps in turn 3, with nothing scheduled.</summary>
export function asleep(p: Power): [GameState, SleepState] {
  let s = newGame(31, newGameConfig({ catastropheChance: 0 }));
  let sleep = newSleepState({ asleep: true, lastCalled: 1, wakeAt: 50, history: [newSleepSpell({ from: 2 })] });
  s.sleep.set(p, sleep);
  s.turn = 3;
  return [s, sleep];
}

// <summary>Orders for later seasons, each season's in one entry.</summary>
export function plan(...seasons: [number, Order[]][]): TurnSubmission {
  return newTurnSubmission({ scheduled: seasons.map(([turn, orders]) => newScheduledOrders({ turn, orders })) });
}

export function enters(power: Power | null, province: string, ...orders: Order[]): StandingRequest {
  return newStandingRequest({ when: "UnitEnters", power: power, province: province, orders: orders });
}

export function attackedOf(province: string, ...orders: Order[]): StandingRequest {
  return newStandingRequest({ when: "UnitAttacked", province: province, orders: orders });
}

// <summary>A seat's standing orders, which every seat keeps in the game state (none if it never kept one).</summary>
export function standingOf(s: GameState, p: Power): StandingOrder[] {
  return s.standing.tryGet(p)?.orders ?? [];
}

// <summary>The notice with this title, delivered in the given season.</summary>
export function noticeOf(s: GameState, p: Power, title: string): InboxItem {
  return Assert.single(inboxOf(s, p), (i) => i.title === title);
}

// <summary>Babylon's army in Durkurigalzu is gone, so that an Assyrian army from Ekallatum can contest the province.</summary>
export function emptyDurkurigalzu(s: GameState): void {
  removeAll(s.units, (u) => u.province === "durkurigalzu");
}

// <summary>An Assyrian army in Susa, which Babylon can see from its homeland; the city is Assyria's, its walls gone.</summary>
export function assyriaInSusa(s: GameState): void {
  s.walls.delete("susa");
  s.owner.set("susa", "Assyria");
  s.units.push(newUnit({ id: newId(s, "u"), power: "Assyria", kind: "Army", province: "susa" }));
}

// <summary>A standing order of Babylon's waiting for Assyria to enter Arbela, bound to its units.</summary>
export function waiting(s: GameState, id: string, ...orders: Order[]): StandingOrder {
  return newStandingOrder({
    id: id,
    when: "UnitEnters",
    power: "Assyria",
    province: "arbela",
    orders: orders.map((o) => newPlannedOrder({ order: o, unitId: unitOf(o) !== null ? unitAt(s, unitOf(o)!)!.id : null })),
  });
}

// <summary>Assyria's army leaves Ekallatum, which Babylon can see, for Arbela.</summary>
export function assyriaToArbela(babylon: TurnSubmission | null = null): Dict<Power, TurnSubmission> {
  let orders = new Dict<Power, TurnSubmission>([["Assyria", newTurnSubmission({ orders: [move("ekallatum", "arbela")] })]]);
  if (babylon !== null) orders.set("Babylonia", babylon);
  return orders;
}

// <summary>A model king that answers each orders call with the reply given for its season (holding otherwise).</summary>
export class Replying implements JsonAsker {
  readonly #orders: (a0: number) => string | null;
  constructor(orders: (a0: number) => string | null) {
    this.#orders = orders;
  }
  specs: CallSpec[] = [];

  askJson(spec: CallSpec, ct: AbortSignal): Promise<JsonObject> {
    this.specs.push(spec);
    let json = spec.key.includes("/orders/")
      ? (this.#orders(spec.turn) ?? `{"notes":"Hold fast.","summary":"","ledger":[],"units":[],"letters":[],"other_orders":[],"schedule":[],"standing_orders":[],"cancel_standing":[]}`)
      : `{"speech":"Welcome.","gift_to_envoy":0,"gift_request":"","offer_service_wage":0,"seal_tablet":false,"detain_envoy":false,"send_gold_back":0,"gold_back_purity":100,"end_audience":true,"ledger":[],"letters":[],"reopen_orders":false}`;
    return Promise.resolve(JSON.parse(json)!);
  }
}

// <summary>A reply with a march, two standing orders (one for any foreign power, one for a power nobody knows) and cancellations.</summary>
export const PlanningReply: string = `{"notes":"Plan ahead.","summary":"","ledger":[],"units":[],"letters":[],"other_orders":[],
 "schedule":[{"turn":3,"units":[{"unit":"Babylon","order":"move","target":"nippur","to":""}],"other_orders":[],"conditions":[]}],
 "standing_orders":[
 {"when":"unit_attacked","province":"Sippar","power":"","units":[{"unit":"durkurigalzu","order":"support","target":"sippar","to":""}],"other_orders":[{"action":"counter_intelligence","province":"","power":"","person":"","amount":20,"term":0,"text":"","item":"","seals":[]}],"conditions":[]},
 {"when":"unit_enters","province":"mari","power":"","units":[{"unit":"sippar","order":"hold","target":"","to":""}],"other_orders":[],"conditions":[]},
 {"when":"unit_enters","province":"mari","power":"Kush","units":[{"unit":"sippar","order":"hold","target":"","to":""}],"other_orders":[],"conditions":[]}],
 "cancel_standing":["s9", "all"],"standing_answers":[],"cancel_answers":[]}`;
