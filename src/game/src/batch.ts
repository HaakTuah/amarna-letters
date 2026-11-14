/** Plays one game unattended and measures it: the summary a batch keeps (the batch runner's shared half; `batch-report.ts` reads many). */
import { pulseOf, type Pulse } from "./pulse.ts";
import {
  isAlive,
  standingOf,
  type Clause,
  AllPowers,
  CharacterParBest,
  GameStateSchema,
  TurnEngine,
  addEarnings,
  boardLine,
  characterResult,
  courtDecided,
  hash,
  inboxOf,
  isSealedAgreement,
  max,
  GreatKings,
  vassalTerms,
  min,
  newEarnings,
  newGame,
  roundTo,
  sum,
  type Earnings,
  type GameConfig,
  type GameState,
  type Power,
  UnheardOutcome,
  UnheardOnArrival,
} from "@amarna/engine";
import { GameLog } from "./log.ts";
import { GameRunner } from "./runner.ts";
import { SignalDetector } from "./signals.ts";
import { MoneyWatch, type MoneyMeasure } from "./money-report.ts";
import { SpendingWatch, type SpendingMeasure } from "./spending-report.ts";
import { HeldWatch, type HeldMeasure } from "./captives-report.ts";
import { BondWatch, type BondTake } from "./bonds-report.ts";

/**
 * A kingdom's fall as the pace of war measures it: the season, the conqueror, and the seasons from the conqueror's first
 * entry into its land, and from anyone's, to the fall (counting both seasons: an entry in the season it fell is 1).
 */
export interface FallMeasure {
  power: Power;
  turn: number;
  conqueror: Power | null;
  fromConquerorEntry: number | null;
  fromFirstEntry: number | null;
  /** Seasons for a letter from the fallen court to its conqueror's and the reply back, each leg by its own road (pillar 8), at the game's end; older summaries have none. */
  reply?: number | null;
}

export interface GameSummary {
  seed: number;
  turns: number;
  winners: string[];
  growth: Record<string, number>;
  /** Each living power's final score at the end (item 11e), a fallen one's left out. */
  score: Record<string, number>;
  signals: Record<string, number>;
  costUsd: number;
  errors: number;
  replayMatches: boolean;
  /** Seasons a sleeping seat held court while its orders stood, over all seats; reopened by the king; stood in for. */
  courtsHeld: number;
  courtsReopened: number;
  courtsStoodIn: number;
  /** Whether any seat could sleep in this game. */
  sleepers: boolean;
  /** Standing orders every seat kept over the game, and how many of them fired. */
  standingKept: number;
  standingFired: number;
  /** Every person on the scoreboard at the end (item 17b, part D), first place first, one line each (`boardLine`). */
  board: string[];
  /** The richest living character's wealth at the end, kings apart. */
  topWealth: number;
  /** Whether a king or a character stood first on the scoreboard; older summaries have none. */
  firstIsKing?: boolean;
  /** The best {@link CharacterParBest} results against par (`characterResult`) of the characters who never reigned, for `CharacterPar`; older summaries have every character's. */
  characterResults?: number[];
  /** Item 18, part D: where the gold sat, the fees agreed and the two roads ({@link MoneyWatch}). */
  money?: MoneyMeasure;
  /** Item 18, part E: what the Great Kings spent on, and their first marches ({@link SpendingWatch}). */
  spending?: SpendingMeasure;
  /** #806: the kings held captive and how long ({@link HeldWatch}); older summaries have none. */
  held?: HeldMeasure;
  /** Provinces overlords took from their own vassals (item 18, F3; `bonds-report.ts`). */
  bonds?: BondTake[];
  /** The kingdoms that fell with their capitals, each with the season it fell: the pace of war. */
  falls: FallMeasure[];
  /**
   * Item 17 (the age lengthened): whether the age saw a Great King's war decided, a Great King's capital taken ("capital")
   * or a Great King made another's vassal ("vassal"), whichever came first, or null (older summaries have none).
   */
  greatWar?: string | null;
  /** Item 17++a: how much happened, season by season and king by king (`pulse.ts`); older summaries have none. */
  pulse?: Pulse;
  /** What every character gained in the game, by source, the dead included. */
  gained: Earnings;
  /** The press in clauses (item 8): counts by what was written, recited, answered and reported (see pressOf). */
  press: Record<string, number>;
  /** The characters' decisions ("Characters sleep like kings", item 8): calls, wake-ups (character-seasons asked), pool, seasons. */
  characterCalls: number;
  characterWakeups: number;
  /** The most characters woken in any one season ("How many characters": the spike, not the average, is what to watch). */
  characterPeak?: number;
  characterPool: number;
  /** Item 17+: each attested person, by name: the seasons it was asked to decide, the times it was sent anywhere, and whether it served a court. */
  people?: Record<string, [number, number, number]>;
  /** Item 12: by the court a letter went to, the letters that found a carrier understood there and the seasons they waited. */
  lettersTo: Record<string, [number, number]>;
  /** Item 13+: the powers risen in play, and what their seats did with them (older summaries have none). */
  risen?: RisenMeasure[];
}

/** A power risen in play (item 13+), measured: when it rose, whether it lasted, and how its seat used it. */
export interface RisenMeasure {
  power: string;
  from: string;
  /** How its ruler rose (item 17): governor, turned, revolt, chief or elder. */
  how?: string;
  turn: number;
  /** The seasons it ruled: to its fall, or to the end. */
  seasons: number;
  alive: boolean;
  growth: number;
  /** Envoys it sent, and tablets it sealed with another court (of them, vassal tablets). */
  envoys: number;
  sealed: number;
  vassal: number;
}

/** The powers risen in a game (item 13+), measured. */
export function risenMeasures(s: GameState, engine: TurnEngine): RisenMeasure[] {
  const end = s.scores.length === 0 ? s.turn : max(s.scores, (x) => x.turn);
  return s.risen.map((r) => {
    const fell = s.falls.find((f) => f.power === r.power) ?? null;
    const sealed = s.tablets.filter((t) => isSealedAgreement(t) && t.seals.includes(r.power) && t.seals.length > 1);
    return {
      power: r.power,
      from: r.from,
      how: r.how,
      turn: r.turn,
      seasons: (fell?.turn ?? end) - r.turn,
      alive: fell === null,
      growth: roundTo(engine.growth(r.power), 3),
      envoys: s.trails.filter((t) => t.from === r.power).length,
      sealed: sealed.length,
      vassal: sealed.filter((t) => t.vassal !== null).length,
    };
  });
}


/**
 * The press of one game in counts (item 8): clauses written by kind ("w:askGold"), letters whose clauses an envoy changed
 * in reciting them ("recited-changed") and how ("threat-dropped", "gift-lowered", "courtesy-added", "clause-dropped"),
 * answers given ("accept:askGold"), answers reported other than given ("misreported"), and gold sent without an inventory.
 */
export function pressOf(s: GameState): Record<string, number> {
  const out: Record<string, number> = {};
  const add = (k: string, n = 1): void => {
    out[k] = (out[k] ?? 0) + n;
  };
  const kinds = (cs: readonly Clause[], k: string): number => cs.filter((x) => x.kind === k).length;
  for (const t of s.trails) {
    if (t.pretended) {
      add("false-envoy-audiences");
      continue;
    }
    add("letters");
    if (t.clauses.length > 0) add("letters-with-clauses");
    for (const c of t.clauses) add(`w:${c.kind}`);
    if (t.noInventory) add("gold-without-inventory");
    // Tribute (item 11+): gold sent under a tribute clause, and what of it arrived.
    if (t.goldStated > 0 && t.clauses.some((c) => c.kind === "tribute")) add("tribute-sent");
    if (t.audienceTurn === null) continue;
    if (t.goldDelivered > 0 && t.clauses.some((c) => c.kind === "tribute")) {
      add("tribute-delivered");
      add("tribute-gold", t.goldDelivered);
    }
    // Item 12: envoys arrived, and those nobody at the court understood as they arrived, by the court that sent them.
    add(`arrived:${t.from}`);
    if (t.outcomes.includes(UnheardOnArrival)) add(`unheard:${t.from}`);
    // Item 12: an envoy nobody understood recited nothing; his letter is no change of words.
    if (t.outcomes.some((o) => o.startsWith(UnheardOutcome))) {
      add("unheard");
      continue;
    }
    const said = t.clauses;
    const heard = t.deliveredClauses;
    if (JSON.stringify(said) !== JSON.stringify(heard)) add("recited-changed");
    if (kinds(heard, "threat") < kinds(said, "threat")) add("threat-dropped");
    if (kinds(heard, "wellWishes") > kinds(said, "wellWishes")) add("courtesy-added");
    const gift = (cs: readonly Clause[]): number => cs.filter((x) => x.kind === "gift").reduce((a, x) => a + (x.amount ?? 0), 0);
    if (gift(heard) < gift(said)) add("gift-lowered");
    if (heard.filter((x) => x.kind !== "wellWishes").length < said.filter((x) => x.kind !== "threat" && x.kind !== "wellWishes").length) add("clause-dropped");
    const given = t.exchanges.flatMap((x) => x.clauses);
    for (const c of given) if (c.answers !== null) add(`${c.kind}:${c.answers}`);
    if (t.reportTurn !== null && JSON.stringify(given.filter((x) => x.answers !== null)) !== JSON.stringify(t.reportClauses.filter((x) => x.answers !== null))) add("misreported");
  }
  // Vassal tablets (item 11+): offered in play, and sealed, by the vassal's side or the overlord's.
  for (const t of s.tablets) {
    if (t.vassal === null || t.createdTurn === 0) continue;
    add("bond-offered");
    if (t.sealedTurn !== null && t.seals.length >= 2) add(t.vassal === t.proposedBy ? "bond-sealed-by-vassal" : "bond-sealed-by-overlord");
  }
  return out;
}


/** Whether the age saw a Great King's war decided (item 17), and how first: his capital taken, or he made another's vassal. */
export function greatWarOf(s: GameState): string | null {
  const great = new Set<string>(GreatKings);
  const fell = s.falls.filter((f) => great.has(f.power)).map((f) => f.turn);
  const bonds = s.tablets
    .map((t) => vassalTerms(t))
    .filter((v) => v !== null && great.has(v.vassal) && great.has(v.overlord))
    .map((v) => v!.sealedTurn);
  if (fell.length === 0 && bonds.length === 0) return null;
  const f = fell.length > 0 ? Math.min(...fell) : Infinity;
  const b = bonds.length > 0 ? Math.min(...bonds) : Infinity;
  return f <= b ? "capital" : "vassal";
}

/** The falls of a game, measured. */
export function fallsOf(s: GameState, engine: TurnEngine): FallMeasure[] {
  return s.falls.map((f) => {
    // The letter there and the reply back: each leg by its own road, since the winds and currents differ.
    const court = f.conqueror !== null && isAlive(s, f.conqueror) ? engine.courtAt(f.conqueror) : null;
    const there = court === null ? null : engine.travelTurnsBetween(f.capital, court) + engine.travelTurnsBetween(court, f.capital);
    const by = s.invaded.tryGet(f.power) ?? null;
    const since = (entry: number | null): number | null => (entry !== null ? f.turn - entry + 1 : null);
    const mine = f.conqueror !== null && by !== null ? (by.tryGet(f.conqueror) ?? null) : null;
    const first = by !== null && by.size > 0 ? min([...by.values()], (x) => x) : null;
    return { power: f.power, turn: f.turn, conqueror: f.conqueror, fromConquerorEntry: since(mine), fromFirstEntry: since(first), reply: there !== null && Number.isFinite(there) ? there : null };
  });
}

/** The courts held while orders stood in one game, over every seat: held, reopened by the king, stood in for. */
export function courtsOf(s: GameState): [number, number, number] {
  let held = 0;
  let reopened = 0;
  let stoodIn = 0;
  for (const x of s.sleep.values()) {
    held += x.courts.length;
    reopened += x.courts.filter((c) => c.reopened).length;
    stoodIn += x.courts.filter((c) => !courtDecided(c)).length;
  }
  return [held, reopened, stoodIn];
}

/** The most characters woken in one season, from each character's seasons asked. */
function peakOf(asks: ReadonlyMap<string, readonly number[]>): number {
  const per = new Map<number, number>();
  for (const turns of asks.values()) for (const t of new Set(turns)) per.set(t, (per.get(t) ?? 0) + 1);
  return Math.max(0, ...per.values());
}

/** Plays one game to its end (and, with verifyReplay, replays its log and compares the final states). */
export async function playGame(seed: number, build: (state: GameState) => GameRunner, verifyReplay: boolean, config: GameConfig | null = null, log: ((line: string) => void) | null = null): Promise<[GameSummary, GameRunner]> {
  const runner = build(newGame(seed, config));
  // A batch never reads the turn-by-turn snapshots, which a long game's memory cannot hold twice over (with its replay).
  runner.keepSnapshots = false;
  // Nor shows the threads to watch: nobody watches a batch.
  runner.tellThreads = false;
  await runner.prepare();
  const watch = new MoneyWatch();
  const spent = new SpendingWatch(runner.state);
  const captives = new HeldWatch();
  const bonds = new BondWatch(runner.state);
  // Each season read once it is played, by its own number, the last (when playTurn says the age is over) included.
  for (let more = true; more; ) {
    const played = runner.state.turn;
    more = await runner.playTurn();
    watch.season(runner.state, played);
    spent.season(runner.state, played, runner.log);
    captives.season(runner.state);
    bonds.season(runner.state);
  }
  const s = runner.state;

  let matches = true;
  if (verifyReplay) {
    const replay = GameRunner.forReplay(GameLog.fromJsonl(runner.log.toJsonl()));
    replay.writeChronicles = runner.writeChronicles;
    replay.keepSnapshots = false;
    replay.tellThreads = false;
    await replay.prepare();
    while (await replay.playTurn()) {
      /* the whole game */
    }
    matches = hash(GameStateSchema, replay.state) === hash(GameStateSchema, s);
    if (!matches) log?.(`seed ${seed}: replay diverged`);
  }

  const engine = new TurnEngine(s);
  const [held, reopened, stoodIn] = courtsOf(s);
  const board = engine.scoreboard();
  const characters = board.filter((x) => x.power === null);
  const gained = newEarnings();
  for (const c of s.characters) addEarnings(gained, c.earned);
  const growth: Record<string, number> = {};
  for (const p of AllPowers) growth[p] = roundTo(engine.growth(p), 3);
  const score: Record<string, number> = {};
  for (const x of engine.finalScores()) score[x.power] = roundTo(x.score, 3);
  const signals: Record<string, number> = {};
  for (const [k, v] of SignalDetector.count(s)) signals[k] = v;
  let standingKept = 0;
  for (const b of s.standing.values()) standingKept += b.last;
  // The bold and careful roads are the characters' own: no king, reigning, fallen or dead, is counted on them (item 18, F2).
  const reigned = new Set([...[...s.reigns.values()].map((r) => r.character), ...s.reignsEnded.map((r) => r.character)]);
  const summary: GameSummary = {
    board: board.map(boardLine),
    topWealth: Math.max(0, ...characters.filter((x) => !x.dead).map((x) => x.holding)),
    firstIsKing: board.length > 0 && board[0].power !== null,
    characterResults: characters.filter((x) => !reigned.has(x.character.id)).map((x) => characterResult(x.character)).sort((a, b) => b - a).slice(0, CharacterParBest),
    money: watch.end(characters.filter((x) => !reigned.has(x.character.id))),
    spending: spent.end(),
    held: captives.end(s, (p) => standingOf(p, engine.growth(p))),
    bonds: bonds.taken,
    gained,
    press: pressOf(s),
    characterCalls: sum([...runner.characterAsks.values()], (x) => x.length),
    characterWakeups: sum([...runner.characterAsks.values()], (x) => new Set(x).size),
    characterPeak: peakOf(runner.characterAsks),
    characterPool: s.characters.length,
    people: Object.fromEntries(
      s.characters.filter((c) => c.attested).map((c) => [c.name, [new Set(runner.characterAsks.get(c.id) ?? []).size, c.sent, c.employer !== null || c.formerEmployer !== null ? 1 : 0] as [number, number, number]]),
    ),
    lettersTo: Object.fromEntries(AllPowers.map((p) => [p, [s.lettersToCarried.getOrDefault(p, 0), s.lettersToWaited.getOrDefault(p, 0)] as [number, number]])),
    risen: risenMeasures(s, engine),
    courtsHeld: held,
    courtsReopened: reopened,
    courtsStoodIn: stoodIn,
    sleepers: s.sleep.size > 0,
    standingKept,
    standingFired: sum(AllPowers, (p) => inboxOf(s, p).filter((i) => i.kind === "Resolution" && i.title.startsWith("Standing order ") && i.title.endsWith(" fired")).length),
    seed,
    falls: fallsOf(s, engine),
    greatWar: greatWarOf(s),
    pulse: pulseOf(s),
    turns: s.scores.length === 0 ? 0 : max(s.scores, (x) => x.turn),
    winners: [...s.winners],
    growth,
    score,
    signals,
    costUsd: sum(runner.log.calls, (c) => c.costUsd),
    errors: runner.errors.length,
    replayMatches: matches,
  };
  return [summary, runner];
}
