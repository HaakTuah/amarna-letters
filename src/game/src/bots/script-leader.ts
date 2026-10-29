/**
 * A script king. Each power plays with its own Personality, varied per game by the seed, and with a memory of every other
 * king (trust and grudges learned from what reached its court). Each season it reads the board, chooses a war (or none) and
 * whether to keep its oaths, plans troop operations, runs its treasury, court and intelligence, and writes its letters. It
 * sees exactly what any seat sees: the SeatView. The same bot stands in for a model seat whenever a model call fails,
 * playing in that king's character.
 */
import { vassalSeason } from "./vassals.ts";
import { huntBands, huntOrders } from "./outlaws.ts";
import {
  AllPowers,
  Dict,
  HSet,
  Rng,
  distinct,
  fmt,
  groupBy,
  newTurnSubmission,
  sha256,
  utf8,
  type AudienceView,
  type HostReply,
  type Order,
  type Power,
  type SeatView,
  type TurnSubmission,
} from "@amarna/engine";
import type { ISeat } from "../contracts.ts";
import { ahead } from "./ahead.ts";
import { Board } from "./board.ts";
import { commandOrders, courtMove, enlistOrders, governorOrders } from "./generals.ts";
import { Brain } from "./brain.ts";
import { Contingencies } from "./contingencies.ts";
import { personalityFor, type Personality } from "./personality.ts";
import { roadPolicy } from "./roads.ts";
import { heardRepudiations, keepMoving, leaveByOrder, repudiations, revocations } from "./authority.ts";
import { Search } from "./search.ts";
import { Statecraft } from "./statecraft.ts";
import { collecting, errandJobs } from "./errands.ts";
import { Tactics, type MilitaryPlan } from "./tactics.ts";
import { Council, CouncilPlay, follow } from "./council.ts";

export class ScriptLeader implements ISeat {
  readonly label: string = "Script bot";
  /** Each power's seat seed (see seatSeed); the game's own seed is not kept. */
  private readonly seeds = new Dict<Power, number>();
  private readonly brains = new Dict<Power, Brain>();
  /** Seat seeds for powers risen in play (item 13+), derived as they first play. */
  private readonly seedFor: (p: Power) => number;

  private readonly gameSeed: number;
  private council: Council | null = null;

  private councilOf(): Council {
    return (this.council ??= new Council(this.gameSeed));
  }

  /** `gameSeed`: the game's seed, from which each power's seat seed is derived. */
  constructor(gameSeed: number) {
    this.gameSeed = gameSeed;
    for (const p of AllPowers) this.seeds.set(p, seatSeed(gameSeed, p));
    this.seedFor = (p) => seatSeed(gameSeed, p);
  }

  private brain(p: Power): Brain {
    let b = this.brains.tryGet(p);
    if (b === undefined) this.brains.set(p, (b = new Brain(p, this.seeds.tryGet(p) ?? this.seedFor(p))));
    return b;
  }

  /**
   * Reads a season's view of a seat it may have to stand in for, deciding nothing, so that it remembers what that seat has
   * seen when it must play it. At most once a season.
   */
  observe(view: SeatView): void {
    this.brain(view.power).learn(view, new Board(view));
  }

  /** The memory this bot keeps for a power, if it has played or watched it. */
  brainOf(p: Power): Brain | null {
    return this.brains.tryGet(p) ?? null;
  }

  decide(view: SeatView, _signal?: AbortSignal): Promise<TurnSubmission> {
    return Promise.resolve(this.decideNow(view));
  }

  decideNow(view: SeatView): TurnSubmission {
    const brain = this.brain(view.power);
    brain.learn(view, new Board(view));
    const board = new Board(view, brain.remembered(view), brain.treasury);
    const rng = brain.r(view.turn, "decide");

    heardRepudiations(board, brain);
    // The vassal bonds we know, the overlord we still serve and the tribute we owe this year (item 11+).
    vassalSeason(board, brain);
    Statecraft.strategy(board, brain, rng);
    const plan = Tactics.make(board, brain);
    Search.improve(board, brain, plan, brain.r(view.turn, "search"));
    Tactics.besiege(board, brain, plan);
    // Guests by passage move on, or they overstay and take a friend's land (item 9).
    keepMoving(board, plan);
    // Armies to spare march on the bands that rob our land (item 11b).
    huntBands(board, plan);
    const sallies = Tactics.sallies(board, plan.orders.values(), brain);
    for (const order of plan.orders.values()) {
      if (order.type !== "move") continue;
      const victim = board.unitAt.tryGet(order.to)?.power ?? board.ownerOf(order.to);
      const r = victim !== null && victim !== view.power ? brain.rel.tryGet(victim) : undefined;
      if (r !== undefined) r.lastWeAttacked = view.turn;
    }

    const orders: Order[] = [];
    Statecraft.economy(board, brain, plan, orders, rng);
    orders.splice(0, 0, ...plan.orders.values());
    orders.splice(plan.orders.size, 0, ...sallies);

    const busy = new HSet<string>();
    Statecraft.court(board, brain, orders, busy, rng);
    Statecraft.letters(board, brain, orders, busy, rng);
    // Haakon's answers to item 11a: each errand is a job offered to the man sent, and tablets owed ride with envoys.
    errandJobs(board, brain, orders);
    // Item 13: commanders for the armies away from the court, their mandates, and recalls.
    // A threatened province's governor before the season's grants of command: the levies he raises there need nobody's
    // order to travel (item 13's measures found command taking every free person first).
    governorOrders(board, brain, orders, busy);
    commandOrders(board, brain, orders, busy);
    enlistOrders(board, brain, orders);
    courtMove(board, brain, orders);
    // Haakon's answers to item 11b: armies fall on bands only by the king's order.
    huntOrders(board, orders);
    orders.splice(0, orders.length, ...collecting(board, orders));
    roadPolicy(board, brain, orders);
    // Tablets our envoys sealed beyond what we allow, and leave granted to kings turned foe (item 9).
    repudiations(board, brain, orders);
    revocations(board, brain, orders);
    leaveByOrder(board, brain, orders);
    // Measuring the royal council (item 16, `--council-play-half`): a king who plays his troops by its counsel.
    if (CouncilPlay.only?.has(view.power) === true) orders.splice(0, orders.length, ...follow(orders, this.councilOf().proposals(view)));
    // Standing orders last, against the season's whole plan: those kept may change it if the blow comes.
    const [cancel, give] = Contingencies.plan(board, brain, plan, orders);

    const top = board.leader();
    const notes =
      `War on ${brain.warTarget ?? "nobody"}` +
      (brain.betraying !== null ? `; turning on ${brain.betraying}` : "") +
      (top !== null ? `; ${top} leads` : "") +
      pacts(board, brain, plan)
        .map((s) => "; " + s)
        .join("") +
      (give.length > 0 ? `; standing orders guard ${give.map((g) => `${g.place} (${g.kind.toLowerCase()})`).join(", ")}` : "") +
      (cancel.length > 0 ? `; standing orders cancelled: ${cancel.map(([id, why]) => `${id} (${why})`).join(", ")}` : "") +
      `. Trust: ${[...brain.rel]
        .filter(([, r]) => Math.abs(r.trust) > 0.15)
        .map(([k, r]) => `${k} ${signed(r.trust)}`)
        .join(", ")}.`;
    return newTurnSubmission({
      orders,
      notes,
      standing: give.map((g) => g.request),
      cancelStanding: cancel.map(([id]) => id),
      // A king that sleeps also schedules what stays sound while it sleeps, each order with its condition.
      scheduled: ahead(view, orders),
    });
  }

  hostAudience(view: AudienceView, court: SeatView, _signal?: AbortSignal): Promise<HostReply> {
    const brain = this.brain(view.host);
    brain.learn(court, new Board(court));
    const board = new Board(court, null, brain.treasury);
    const rng = Rng.for(this.seeds.tryGet(view.host) ?? this.seedFor(view.host), view.turn, "bot:host", `${view.host}:${view.audienceId}:${view.round}`);
    return Promise.resolve(Statecraft.host(view, board, brain, rng));
  }
}

/** A number as "+0.0;-0.0" formats it. */
function signed(x: number): string {
  return x < 0 ? "-" + fmt(-x, "0.0") : "+" + fmt(x, "0.0");
}

/** For the notes: the coalitions in force, and the joint blows this season's orders strike. */
function pacts(board: Board, brain: Brain, plan: MilitaryPlan): string[] {
  const out: string[] = [];
  for (const [against, g] of groupBy(brain.coalitions(board), (c) => c[1])) out.push(`sworn against ${against} with ${g.map((c) => c[0]).join(" and ")}`);
  for (const j of Tactics.joints(board, brain)) {
    const place = Board.Map.get(j.target).name;
    if (j.lead.power === board.me) {
      const m = plan.orders.tryGet(j.lead.province);
      if (m !== undefined && m.type === "move" && m.to === j.target)
        out.push(
          `joint blow on ${place}: going in, ${distinct(j.support.map((s) => s.power).filter((x) => x !== board.me)).join(" and ")} supporting`,
        );
    } else if (
      j.support.some((s) => {
        if (s.power !== board.me) return false;
        const o = plan.orders.tryGet(s.province);
        return o !== undefined && o.type === "support" && o.to === j.target;
      })
    )
      out.push(`joint blow on ${place}: supporting ${j.lead.power}`);
  }
  return out;
}

/**
 * A script seat's own seed: the first eight bytes of a SHA-256 hash of the game's seed (eight bytes, little-endian), "seat:"
 * and the power, cut to 53 bits so that it is an exact number here. The hash is one-way: the seat seed gives no way back to
 * the game's seed.
 */
export function seatSeed(gameSeed: number, p: Power): number {
  const tag = utf8("seat:" + p);
  const input = new Uint8Array(8 + tag.length);
  let s = BigInt(gameSeed);
  for (let i = 0; i < 8; i++) {
    input[i] = Number(s & 0xffn);
    s >>= 8n;
  }
  input.set(tag, 8);
  const h = sha256(input);
  const lo = (h[0] | (h[1] << 8) | (h[2] << 16) | (h[3] << 24)) >>> 0;
  const hi = (h[4] | (h[5] << 8) | (h[6] << 16) | (h[7] << 24)) >>> 0;
  return (hi & 0x1fffff) * 4294967296 + lo;
}

/** The temperament a script king plays with in a game with this seed (drawn from its seat seed). */
export function temperament(p: Power, gameSeed: number): Personality {
  return personalityFor(p, seatSeed(gameSeed, p));
}
