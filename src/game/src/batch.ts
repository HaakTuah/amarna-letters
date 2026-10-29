/** Plays games unattended and summarizes winners and signals across them (the batch runner's shared half). */
import {
  ClauseKindValues,
  standingOf,
  type Clause,
  AllPowers,
  GameStateSchema,
  TurnEngine,
  Wealth,
  addEarnings,
  align,
  cmpNum,
  cmpStr,
  courtDecided,
  earningsTotal,
  fmt,
  groupBy,
  hash,
  idNumber,
  inboxOf,
  max,
  min,
  newEarnings,
  newGame,
  parsePower,
  roundTo,
  sortBy,
  sum,
  tier,
  trim,
  type Earnings,
  type GameConfig,
  type GameState,
  type InboxItem,
  type Power,
} from "@amarna/engine";
import type { ModelCall, ShadowDecision, CharacterChoice } from "./log.ts";
import { GameLog } from "./log.ts";
import { GameRunner } from "./runner.ts";
import { SignalDetector } from "./signals.ts";

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
  /** The living characters at the end, richest first, one line each. */
  richest: string[];
  /** The richest character's wealth at the end. */
  topWealth: number;
  /** The kingdoms that fell with their capitals, each with the season it fell: the pace of war. */
  falls: FallMeasure[];
  /** What every character gained in the game, by source, the dead included. */
  gained: Earnings;
  /** The press in clauses (item 8): counts by what was written, recited, answered and reported (see pressOf). */
  press: Record<string, number>;
  /** The characters' decisions ("Characters sleep like kings", item 8): calls, wake-ups (character-seasons asked), pool, seasons. */
  characterCalls: number;
  characterWakeups: number;
  characterPool: number;
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

/** The press over many games: the clauses script players wrote, how envoys changed them, and how kings answered (item 8). */
export function pressReport(games: readonly GameSummary[]): string[] {
  const total: Record<string, number> = {};
  for (const g of games) for (const [k, v] of Object.entries(g.press)) total[k] = (total[k] ?? 0) + v;
  const n = (k: string): number => total[k] ?? 0;
  const lines = [`Press: ${n("letters")} letters, ${n("letters-with-clauses")} with clauses; gold sent without an inventory ${n("gold-without-inventory")} times.`];
  lines.push(`  Written: ${ClauseKindValues.filter((k) => n(`w:${k}`) > 0).map((k) => `${k} ${n(`w:${k}`)}`).join(", ")}.`);
  lines.push(`  Recited changed ${n("recited-changed")}: threat dropped ${n("threat-dropped")}, gift lowered ${n("gift-lowered")}, courtesy added ${n("courtesy-added")}, a clause lost ${n("clause-dropped")}; answers misreported ${n("misreported")}.`);
  lines.push(
    `  Vassalage: tribute sent ${n("tribute-sent")} times, ${n("tribute-delivered")} delivered (${n("tribute-gold")} shekels); vassal tablets offered ${n("bond-offered")}, sealed ${n("bond-sealed-by-vassal") + n("bond-sealed-by-overlord")} (${n("bond-sealed-by-vassal")} offered by the vassal, ${n("bond-sealed-by-overlord")} by the overlord).`,
  );
  const answers = Object.keys(total).filter((k) => /^(accept|refuse|counter):/.test(k)).sort();
  lines.push(`  Answers: ${answers.map((k) => `${k} ${total[k]}`).join(", ")}.`);
  return lines;
}

/** The falls of a game, measured. */
export function fallsOf(s: GameState): FallMeasure[] {
  return s.falls.map((f) => {
    const by = s.invaded.tryGet(f.power) ?? null;
    const since = (entry: number | null): number | null => (entry !== null ? f.turn - entry + 1 : null);
    const mine = f.conqueror !== null && by !== null ? (by.tryGet(f.conqueror) ?? null) : null;
    const first = by !== null && by.size > 0 ? min([...by.values()], (x) => x) : null;
    return { power: f.power, turn: f.turn, conqueror: f.conqueror, fromConquerorEntry: since(mine), fromFirstEntry: since(first) };
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

/** Plays one game to its end (and, with verifyReplay, replays its log and compares the final states). */
export async function playGame(seed: number, build: (state: GameState) => GameRunner, verifyReplay: boolean, config: GameConfig | null = null, log: ((line: string) => void) | null = null): Promise<[GameSummary, GameRunner]> {
  const runner = build(newGame(seed, config));
  // A batch never reads the turn-by-turn snapshots, which a long game's memory cannot hold twice over (with its replay).
  runner.keepSnapshots = false;
  await runner.prepare();
  while (await runner.playTurn()) {
    /* the whole game */
  }
  const s = runner.state;

  let matches = true;
  if (verifyReplay) {
    const replay = GameRunner.forReplay(GameLog.fromJsonl(runner.log.toJsonl()));
    replay.writeChronicles = runner.writeChronicles;
    replay.keepSnapshots = false;
    await replay.prepare();
    while (await replay.playTurn()) {
      /* the whole game */
    }
    matches = hash(GameStateSchema, replay.state) === hash(GameStateSchema, s);
    if (!matches) log?.(`seed ${seed}: replay diverged`);
  }

  const engine = new TurnEngine(s);
  const [held, reopened, stoodIn] = courtsOf(s);
  const ranking = Wealth.ranking(s);
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
  const summary: GameSummary = {
    richest: ranking.map(Wealth.line),
    topWealth: ranking.length === 0 ? 0 : ranking[0].total,
    gained,
    press: pressOf(s),
    characterCalls: sum([...runner.characterAsks.values()], (x) => x.length),
    characterWakeups: sum([...runner.characterAsks.values()], (x) => new Set(x).size),
    characterPool: s.characters.length,
    courtsHeld: held,
    courtsReopened: reopened,
    courtsStoodIn: stoodIn,
    sleepers: s.sleep.size > 0,
    standingKept,
    standingFired: sum(AllPowers, (p) => inboxOf(s, p).filter((i) => i.kind === "Resolution" && i.title.startsWith("Standing order ") && i.title.endsWith(" fired")).length),
    seed,
    falls: fallsOf(s),
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

const mean = (xs: readonly number[]): number => (xs.length === 0 ? 0 : sum(xs, (x) => x) / xs.length);

function median(xs: readonly number[]): number {
  const s = sortBy(xs, [(x: number) => x, cmpNum]);
  return s.length % 2 === 1 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2.0;
}

/** The pace of war over many games: games that saw a capital fall, the first fall, and the seasons from entry to fall. */
export function warReport(games: readonly GameSummary[]): string[] {
  const falls = games.flatMap((g) => g.falls);
  const out = [
    `Wars: a capital fell in ${games.filter((g) => g.falls.length > 0).length} of ${games.length} games (${falls.length} kingdoms fell in all; at most ${games.length === 0 ? 0 : max(games, (g) => g.falls.length)} in one game).`,
  ];
  if (falls.length === 0) return out;
  const first = games.filter((g) => g.falls.length > 0).map((g) => min(g.falls, (f) => f.turn));
  out.push(`  The first fall of a game came in season ${median(first)} on the median (range ${min(first, (x) => x)}-${max(first, (x) => x)}).`);
  // The builder rules' line for a playable game: no capital falling within the game's first two seasons (item 11e).
  out.push(`  Games with a kingdom fallen in the first two seasons: ${first.filter((t) => t <= 2).length} of ${games.length}.`);
  const spread = (xs: number[]): string =>
    xs.length === 0
      ? "none"
      : `median ${median(xs)}, range ${min(xs, (x) => x)}-${max(xs, (x) => x)}, ${fmt((100.0 * xs.filter((x) => x >= 5 && x <= 10).length) / xs.length, "0")}% within 5-10`;
  out.push(`  Seasons from the conqueror's first entry into the fallen king's land to the fall: ${spread(falls.filter((f) => f.fromConquerorEntry !== null).map((f) => f.fromConquerorEntry!))}.`);
  out.push(`  From anyone's first entry into it: ${spread(falls.filter((f) => f.fromFirstEntry !== null).map((f) => f.fromFirstEntry!))}.`);
  out.push(`  Kingdoms fallen: ${AllPowers.map((p) => `${p} ${falls.filter((f) => f.power === p).length}`).join(", ")}.`);
  return out;
}

/** How often kings woken for an audience only reopened their orders (courts where the stand-in answered left out). */
export function reopenRate([held, reopened, stoodIn]: [number, number, number]): string {
  if (held === 0) return "Courts held while orders stood: none.";
  if (stoodIn === 0) return `Courts held while orders stood: ${held}; orders reopened at ${reopened} (${fmt((100.0 * reopened) / held, "0")}%).`;
  const decided = held - stoodIn;
  const rate = decided === 0 ? "none left the choice to the king" : `orders reopened at ${reopened} of the ${decided} where the king chose (${fmt((100.0 * reopened) / decided, "0")}%)`;
  return `Courts held while orders stood: ${held}; ${rate}; at ${stoodIn} a call failed, the stand-in answered and the king was asked for orders without choosing (left out of the rate).`;
}

/** A wake reason without its particulars, to count reasons of one kind together ("land lost: Gaza ..." is "land lost"). */
export const reasonKind = (reason: string): string => trim(reason.split(/[:(]/)[0]);

/** Orders a notice reports as refused or failed. */
export const failedOrders = (item: InboxItem): number => (item.kind !== "Rejected" ? 0 : Math.max(1, item.body.split("\n").filter((l) => l.startsWith("- ")).length));

/** Per seat: how often it was asked, orders refused, fallbacks, courts held while orders stood, sleeps and what woke it. */
export function seatReport(runner: GameRunner): string {
  const s = runner.state;
  const lines = ["  Power       seat                 orders  audiences  invalid  fallbacks  courts  slept (seasons)       woken by"];
  const cut = (t: string, n: number): string => (t.length <= n ? t : t.slice(0, n));
  for (const p of AllPowers) {
    const label = runner.log.header.seats.tryGet(p) ?? "?";
    const orders = runner.log.decisions.filter((d) => d.key.startsWith("t") && d.key.endsWith(`/orders/${p}`)).length;
    // Audiences answered by a model or file seat: one per logged key (a retry is the same audience). Script seats log no calls.
    const hostKeys = new Set(runner.log.calls.filter((c) => c.role === `host:${p}`).map((c) => c.key)).size;
    const hosted = runner.log.calls.some((c) => c.role === `leader:${p}` || c.role === `host:${p}`) ? String(hostKeys) : "-";
    const invalid = sum(inboxOf(s, p), failedOrders);
    const fallbacks = runner.errors.filter(
      (e) => e.includes(`/orders/${p}:`) || (e.includes("/host/") && runner.log.calls.some((c) => c.role === `host:${p}` && e.startsWith(c.key))),
    ).length;
    let sleeps = "";
    let woken = "";
    const held = s.sleep.tryGet(p);
    let courts = "-";
    if (held !== undefined) {
      const stood = held.courts.filter((c) => !courtDecided(c)).length;
      courts = `${held.courts.length}/${held.courts.filter((c) => c.reopened).length}` + (stood > 0 ? ` (${stood} by stand-in)` : "");
    }
    if (held !== undefined && held.history.length > 0) {
      // A spell still open at the end counts the seasons slept so far.
      sleeps = held.history.map((h) => (h.wokeAt > 0 ? `${h.wokeAt - h.from}` : `${s.turn - h.from + 1}+`)).join(" ");
      // Every reason a seat was woken, not only the first, counted over its spells.
      woken = groupBy(
        held.history.flatMap((h) => h.reasons),
        reasonKind,
      )
        .map(([k, g]) => `${k} x${g.length}`)
        .join("; ");
    }
    lines.push(
      `  ${align(p, -10)}  ${align(cut(label, 19), -19)}  ${align(String(orders), 6)}  ${align(hosted, 9)}  ${align(String(invalid), 7)}  ${align(String(fallbacks), 9)}  ${align(courts, 6)}  ${align(sleeps, -20)}  ${woken}`,
    );
  }
  if (s.sleep.size > 0) lines.push("  " + reopenRate(courtsOf(s)));
  return lines.join("\n");
}

/** Model (or file) characters beside the script with the same traits, decision by decision in the same situations. */
export function characterReport(log: GameLog): string {
  const all = sortBy(log.shadows, [(s: ShadowDecision) => s.turn, cmpNum], [(s: ShadowDecision) => s.key, cmpStr]);
  const made = all.filter((s) => s.model !== null);
  const lines = [
    `  Characters: ${made.length} decisions by the characters' own minds, each beside the script's with the same traits in the same situation` +
      (all.length > made.length ? `; ${all.length - made.length} more fell back to the script (no reply or an unreadable one)` : "") +
      ".",
    "                                         mind                script",
  ];
  const countLine = (what: string, of: readonly ShadowDecision[], yes: (c: CharacterChoice) => boolean): void => {
    lines.push(`    ${align(what, -36)} ${align(String(of.filter((s) => yes(s.model!)).length), -19)} ${of.filter((s) => yes(s.script)).length}`);
  };

  const gold = made.filter((s) => s.kind === "present" && s.goldCarried > 0);
  lines.push(`  Speeches abroad: ${made.filter((s) => s.kind === "present").length}, ${gold.length} with gold (${sum(gold, (s) => s.goldCarried)} shekels carried)`);
  countLine("kept some of the gold", gold, (c) => c.kept > 0);
  lines.push(`    ${align("shekels kept", -36)} ${align(String(sum(gold, (s) => s.model!.kept)), -19)} ${sum(gold, (s) => s.script.kept)}`);
  countLine("swapped the inventory", gold, (c) => c.swap);
  countLine(
    "softened a threat to the host",
    made.filter((s) => s.kind === "present"),
    (c) => c.flags.includes("softened-threat"),
  );

  const gifts = made.filter((s) => s.kind === "react" && s.giftOffered > 0);
  const posts = made.filter((s) => s.kind === "react" && s.serviceOffered > 0);
  lines.push(`  Audience replies: ${made.filter((s) => s.kind === "react").length}; gifts offered ${gifts.length}, posts offered ${posts.length}`);
  countLine("took the gift", gifts, (c) => c.acceptGift);
  countLine("refused the gift", gifts, (c) => !c.acceptGift);
  countLine("went over to the host", posts, (c) => c.acceptService);
  countLine("refused the post", posts, (c) => !c.acceptService);
  countLine(
    "committed its lord to something",
    made.filter((s) => s.kind === "react"),
    (c) => trim(c.commitments).length > 0,
  );

  const reports = made.filter((s) => s.kind === "report");
  const home = reports.filter((s) => s.goldCarried > 0);
  lines.push(`  Reports home: ${reports.length}, ${home.length} with gold (${sum(home, (s) => s.goldCarried)} shekels)`);
  countLine("kept some of the gold", home, (c) => c.kept > 0);
  lines.push(`    ${align("shekels kept", -36)} ${align(String(sum(home, (s) => s.model!.kept)), -19)} ${sum(home, (s) => s.script.kept)}`);
  countLine("swapped the inventory", home, (c) => c.swap);
  countLine("hid or contradicted something", reports, (c) => c.flags.length > 0);
  for (const flag of sortBy(new Set(reports.flatMap((s) => [...s.model!.flags, ...s.script.flags])), [(x: string) => x, cmpStr]))
    countLine("  " + flag, reports, (c) => c.flags.includes(flag));

  const spies = made.filter((s) => s.kind === "spy");
  if (spies.length > 0) {
    lines.push(`  Spy reports: ${spies.length}`);
    countLine("passed on its masters' words", spies, (c) => c.flags.includes("passed-poison"));
    countLine("left out observations", spies, (c) => c.dropped > 0);
  }
  const pitches = made.filter((s) => s.kind === "pitch");
  if (pitches.length > 0) {
    lines.push(`  Pitches: ${pitches.length}`);
    lines.push(
      `    ${align("mean asking price (shekels a season)", -36)} ${align(fmt(mean(pitches.map((s) => s.model!.price)), "0"), -19)} ${fmt(mean(pitches.map((s) => s.script.price)), "0")}`,
    );
  }
  const memories = made.filter((s) => s.kind === "memory").length;
  if (memories > 0) lines.push(`  Memory summaries: ${memories}`);

  lines.push("  Per character (traits loyalty/greed/competence/ambition/courage): decisions; gold kept, gifts taken, posts taken and reports flagged, mind / script");
  for (const [, g] of sortBy(
    groupBy(made, (s) => s.character),
    [(x: [string, ShadowDecision[]]) => idNumber(x[0]), cmpNum],
  )) {
    const first = g[0];
    const both = (f: (s: ShadowDecision, c: CharacterChoice) => number): string => `${sum(g, (s) => f(s, s.model!))}/${sum(g, (s) => f(s, s.script))}`;
    lines.push(
      `    ${first.name} (${first.character}, ${first.traits}): ${g.length}; kept ${both((_, c) => c.kept)}, gifts ${both((_, c) => (c.acceptGift ? 1 : 0))}, ` +
        `posts ${both((_, c) => (c.acceptService ? 1 : 0))}, flagged ${both((s, c) => (s.kind === "report" && c.flags.length > 0 ? 1 : 0))}`,
    );
  }
  return lines.join("\n");
}

/** A call's kind, from its role and key: a king's orders or audience, or what a character was asked. */
export function callKind(c: ModelCall): string {
  if (c.role.startsWith("leader:")) return "king: orders";
  if (c.role.startsWith("host:")) return "king: audience";
  if (c.key.includes("/aud/present/")) return "character: speech";
  if (c.key.includes("/aud/react/")) return "character: reply";
  if (c.key.includes("/report/")) return "character: report";
  if (c.key.includes("/pitch/")) return "character: pitch";
  if (c.key.includes("/spy/")) return "character: spy report";
  if (c.key.includes("/memory/")) return "character: memory";
  return "other: " + c.role.split(":")[0];
}

/** How large each kind of request was: for file seats the request file's length, for API calls the input tokens. */
export function callSizes(log: GameLog): string {
  const lines = ["  Requests by kind        calls   mean chars   max chars   mean tokens (file: chars/3.6; API: input)"];
  for (const [kind, g] of sortBy(groupBy(log.calls, callKind), [(x: [string, ModelCall[]]) => x[0], cmpStr])) {
    const files = g.filter((c) => c.requestChars > 0);
    const api = g.filter((c) => c.requestChars === 0 && c.inputTokens + c.cacheReadTokens + c.cacheWriteTokens > 0);
    const chars = files.length === 0 ? "-" : fmt(mean(files.map((c) => c.requestChars)), "0");
    const most = files.length === 0 ? "-" : `${max(files, (c) => c.requestChars)}`;
    const tokens =
      files.length > 0
        ? fmt(mean(files.map((c) => c.requestChars)) / 3.6, "0")
        : api.length > 0
          ? fmt(mean(api.map((c) => c.inputTokens + c.cacheReadTokens + c.cacheWriteTokens)), "0")
          : "-";
    lines.push(`  ${align(kind, -22)} ${align(String(g.length), 6)}   ${align(chars, 10)}   ${align(most, 9)}   ${tokens}`);
  }
  return lines.join("\n");
}

/** Current bot against the frozen baseline: growth and wins for each side, overall and per power. */
export function versusReport(games: readonly GameSummary[], current: readonly Set<Power>[]): string {
  const lines = ["", "Current bot against the baseline (the same kings play both sides across seeds):"];
  const newGrowth: number[] = [];
  const oldGrowth: number[] = [];
  let newWins = 0;
  let oldWins = 0;
  for (let i = 0; i < games.length; i++) {
    for (const p of AllPowers) (current[i].has(p) ? newGrowth : oldGrowth).push(games[i].growth[p]);
    for (const w of games[i].winners) {
      const p = parsePower(w);
      if (p === null) continue;
      if (current[i].has(p)) newWins += 1.0 / games[i].winners.length;
      else oldWins += 1.0 / games[i].winners.length;
    }
  }
  const newSeats = sum(current, (c) => c.size);
  const oldSeats = games.length * AllPowers.length - newSeats;
  lines.push(
    `  Current bot: mean growth ${fmt(mean(newGrowth), "0.00")}, wins ${fmt(newWins, "0.0")} of ${games.length} (${fmt((100 * newWins) / games.length, "0")}%) from ${fmt((100.0 * newSeats) / (games.length * AllPowers.length), "0")}% of the seats`,
  );
  lines.push(
    `  Baseline:    mean growth ${fmt(mean(oldGrowth), "0.00")}, wins ${fmt(oldWins, "0.0")} of ${games.length} (${fmt((100 * oldWins) / games.length, "0")}%) from ${fmt((100.0 * oldSeats) / (games.length * AllPowers.length), "0")}% of the seats`,
  );
  lines.push("  Per power, mean growth as current / as baseline:");
  for (const p of AllPowers) {
    const asNew = mean(games.filter((_, i) => current[i].has(p)).map((g) => g.growth[p]));
    const asOld = mean(games.filter((_, i) => !current[i].has(p)).map((g) => g.growth[p]));
    lines.push(`    ${align(p, -10)} ${fmt(asNew, "0.00")} / ${fmt(asOld, "0.00")}`);
  }
  return lines.join("\n");
}

/** The richest characters over many games: how rich the richest was at the end, and where all characters' gold came from. */
export function richestReport(games: readonly GameSummary[]): string[] {
  const top = games.map((g) => g.topWealth);
  const gained = newEarnings();
  for (const g of games) addEarnings(gained, g.gained);
  const total = earningsTotal(gained);
  const share = (part: number): string => (total === 0 ? "0%" : `${fmt((100.0 * part) / total, "0.0")}%`);
  return [
    "The richest characters (the second game, played under the kings'):",
    `  The richest held ${fmt(mean(top), "0")} shekels at the end on average (range ${min(top, (x) => x)}-${max(top, (x) => x)}).`,
    `  All the gold characters gained, ${total} shekels: fees ${share(gained.fees)}, lending and dealing ${share(gained.dealt)}, skimmed ${share(gained.skimmed)}, gifts ${share(gained.gifts)}, gold kept on dismissal ${share(gained.carried)}, savings brought in ${share(gained.savings)}, loot ${share(gained.loot)}, news and carrying ${share(gained.news)}; they spent ${gained.spent}.`,
    "  " + Wealth.WhatCounts,
  ];
}

/**
 * Par's results from these games (item 11e, "One scoreboard for every power"): each power's growth in each game, a fall
 * as 0, sorted, as the source of `src/engine/src/rules/par-results.ts`.
 */
export function parResultsSource(games: readonly GameSummary[], seeds: string): string {
  const rows = AllPowers.map((p) => `  ${p}: [${[...games.map((g) => (g.growth[p] > 0 ? Math.max(0.01, g.growth[p]) : 0))].sort((a, b) => a - b).map((x) => fmt(x, "0.00")).join(", ")}],`);
  return [
    "/**",
    ` * Par's results (item 11e, "One scoreboard for every power"): each power's growth at the end of ${games.length} script games (${seeds}), a fall`,
    " * counted as 0, sorted. Generated by `scripts/sim.sh --par-out`; refreshed when the rules change who falls and grows.",
    " */",
    'import type { Power } from "../model/power.ts";',
    "",
    "export const ParResults: Partial<Record<Power, readonly number[]>> = {",
    ...rows,
    "};",
    "",
  ].join("\n");
}

export function batchReport(games: readonly GameSummary[]): string {
  const lines: string[] = [];
  lines.push(`${games.length} games, ${fmt(mean(games.map((g) => g.turns)), "0.0")} turns on average (range ${min(games, (g) => g.turns)}-${max(games, (g) => g.turns)}).`);
  lines.push("");
  lines.push("Wins by power (shared wins count for each partner):");
  for (const p of AllPowers) {
    const wins = games.filter((g) => g.winners.includes(p)).length;
    const avg = mean(games.map((g) => g.growth[p]));
    // The mean growth, a fall counted as 0, the survivors' own mean, and the mean standing against par's results (item
    // 11e: each result ranked among its position's, 1 at their middle).
    const standing = games.filter((g) => g.growth[p] > 0);
    const survived = standing.length === 0 ? "" : `  survivors ${align(String(standing.length), 3)} at ${fmt(mean(standing.map((g) => g.growth[p])), "0.00")}`;
    const ranked = mean(games.map((g) => standingOf(p, g.growth[p])));
    // Its final score where it lived (item 11e: size and performance blended).
    const scored = games.filter((g) => g.score?.[p] !== undefined).map((g) => g.score[p]);
    const final = scored.length === 0 ? "" : `  score ${fmt(mean(scored), "0.00")}`;
    lines.push(`  ${align(p, -10)} ${align(tier(p), -7)} wins ${align(String(wins), 3)}  (${align(fmt((100.0 * wins) / games.length, "0.0"), 5)}%)  mean growth ${fmt(avg, "0.00")} (standing ${fmt(ranked, "0.00")})${final}${survived}`);
  }
  const weakWins = games.filter((g) =>
    g.winners.some((w) => {
      const p = parsePower(w);
      return p !== null && tier(p) === "Weak";
    }),
  ).length;
  const cityWins = games.filter((g) => g.winners.some((w) => parsePower(w) !== null && tier(parsePower(w)!) === "City")).length;
  lines.push(`  Games won by a weak power: ${weakWins}; by a city-state: ${cityWins}`);
  lines.push(`  Shared victories: ${games.filter((g) => g.winners.length > 1).length}`);
  lines.push("");
  lines.push("Signals (games with at least one / total):");
  for (const kind of SignalDetector.Kinds) {
    const withIt = games.filter((g) => (g.signals[kind] ?? 0) > 0).length;
    const total = sum(games, (g) => g.signals[kind] ?? 0);
    lines.push(`  ${align(kind, -24)} ${align(String(withIt), 3)} / ${total}`);
  }
  lines.push("");
  lines.push(
    `Standing orders, every seat's: ${sum(games, (g) => g.standingKept)} kept in ${games.filter((g) => g.standingKept > 0).length} games; ${sum(games, (g) => g.standingFired)} fired in ${games.filter((g) => g.standingFired > 0).length} games.`,
  );
  lines.push("");
  lines.push(...warReport(games));
  lines.push("");
  lines.push(...pressReport(games));
  const seasons = sum(games, (g) => g.turns);
  const pool = sum(games, (g) => g.characterPool * g.turns);
  if (seasons > 0 && pool > 0)
    lines.push(
      `Characters as agents would be asked ${fmt(sum(games, (g) => g.characterCalls) / seasons, "0.0")} times a season (calls), ` +
        `${fmt(sum(games, (g) => g.characterWakeups) / seasons, "0.0")} wake-ups a season over a pool of ${fmt(mean(games.map((g) => g.characterPool)), "0")}: ` +
        `${fmt(sum(games, (g) => g.characterWakeups) / pool, "0.00")} wake-ups and ${fmt(sum(games, (g) => g.characterCalls) / pool, "0.00")} calls per character per season.`,
    );
  lines.push("");
  lines.push(...richestReport(games));
  const cost = sum(games, (g) => g.costUsd);
  if (cost > 0) lines.push(`\nModel cost: $${fmt(cost, "0.00")} total, $${fmt(cost / games.length, "0.00")} per game.`);
  const errors = sum(games, (g) => g.errors);
  if (errors > 0) lines.push(`Seat or model errors replaced by script fallbacks: ${errors}.`);
  if (games.some((g) => g.sleepers))
    lines.push(reopenRate([sum(games, (g) => g.courtsHeld), sum(games, (g) => g.courtsReopened), sum(games, (g) => g.courtsStoodIn)]));
  if (games.some((g) => !g.replayMatches)) lines.push(`REPLAY MISMATCH in ${games.filter((g) => !g.replayMatches).length} game(s).`);
  return lines.join("\n");
}

/** The solo benchmark's table: each king alone with the current bot against six baselines, against the same seed all-baseline. */
export function soloReport(seeds: number, baseGrowth: Record<string, number[]>, soloGrowth: Record<string, number[]>, baseWins: Record<string, number>, soloWins: Record<string, number>): string {
  const lines = [`One current king against ${AllPowers.length - 1} baselines, ${seeds} seeds:`, "  Power       growth alone / all-baseline   wins alone / all-baseline"];
  for (const p of AllPowers)
    lines.push(
      `  ${align(p, -10)}  ${align(fmt(mean(soloGrowth[p]), "0.00"), 5)} / ${align(fmt(mean(baseGrowth[p]), "0.00"), 4)}                  ${align(fmt((100 * soloWins[p]) / seeds, "0"), 3)}% / ${align(fmt((100 * baseWins[p]) / seeds, "0"), 3)}%`,
    );
  const allSolo = mean(AllPowers.map((p) => mean(soloGrowth[p])));
  const allBase = mean(AllPowers.map((p) => mean(baseGrowth[p])));
  const sumSolo = sum(AllPowers, (p) => soloWins[p]);
  const sumBase = sum(AllPowers, (p) => baseWins[p]);
  lines.push(
    `  All kings   ${align(fmt(allSolo, "0.00"), 5)} / ${align(fmt(allBase, "0.00"), 4)}                  ${align(fmt((100 * sumSolo) / (seeds * 7), "0"), 3)}% / ${align(fmt((100 * sumBase) / (seeds * 7), "0"), 3)}%`,
  );
  return lines.join("\n");
}

