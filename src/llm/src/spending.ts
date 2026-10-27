/**
 * What a call is worth, and a budget spent where it buys the most ("Minds follow what is at stake", revised 27 October
 * 2026; built in item 6c). The engine judges each decision from what the mind itself could see; the layer keeps a going
 * rate, the worth per dollar its recent calls bought, and sends a decision up the ladder only as far as each step clears
 * it. The rate rises when spending runs ahead of the pace and falls when it lags, so a quiet season spends little and a
 * crisis more, with no cut-off set by hand. With no limit, no season's cost and no target, every decision goes where it
 * starts: each job's model decides what it decides today.
 */
import { Rng, endChanceAt, type GameConfig } from "@amarna/engine";
import type { Price } from "./models.ts";

export type Rung = "script" | "small" | "large";

/**
 * How the layer spends: "off", every decision where it starts (each job's model decides what it does today); "limit",
 * paced from the game's spending limit; "season", a cost per season; "target", what keeping lower rungs to the target takes.
 */
export const SpendModes = ["off", "limit", "season", "target"] as const;
export type SpendMode = (typeof SpendModes)[number];

/** The table's settings for what the game may spend ("A budget, spent where it buys the most"). */
export interface SpendingSettings {
  mode: SpendMode;
  /** What the game may cost, in dollars (the limit at which it pauses); 0 sets none. With mode "limit" the layer paces itself from it over the seasons the game is expected to last. */
  limitUsd: number;
  /** What a season may cost, in dollars; 0 sets none. An open age, which has no expected end, paces by it. */
  seasonUsd: number;
  /**
   * A target instead of a budget: the share of the decisions lower rungs take that may differ from the rung above's in a
   * way that matters (0.1 is one in ten); 0 sets none. The layer then spends what keeping to it takes.
   */
  target: number;
  /** The share of lower rungs' decisions also put, out of play, to the rung above (first guess: one in twenty). */
  auditShare: number;
}

export function newSpendingSettings(init: Partial<SpendingSettings> = {}): SpendingSettings {
  return { mode: "off", limitUsd: 0, seasonUsd: 0, target: 0.1, auditShare: 0.05, ...init };
}

/** One decision as the layer weighs it, from what the mind itself could see. */
export interface Stakes {
  /** The kind of decision: "orders", "court", "alerts", "plan", "present", "react", "report", "pitch", "memory". */
  kind: string;
  /**
   * What the decision can move, in the mind's own terms: a share of its gold, land or troops (1 is all of it), more for
   * its freedom or life, and what it carries for others (a tablet, a mission).
   */
  moved: number;
  /** Seasons the decision has already waited for a call: what waits grows in worth. */
  waited?: number;
}

/**
 * First guesses (not tuned; item 18 tunes them): how often each rung decides as the large one would, in a way that
 * matters, before any audit says otherwise. The audits replace them kind by kind as the game goes.
 */
export const RungQuality: Readonly<Record<Rung, number>> = { script: 0.4, small: 0.75, large: 1 };
/** How many audits' worth of weight the first guesses carry against what the audits find. */
const PriorWeight = 5;
/** The going rate a game starts at: worth per dollar (first guess; it moves each season). */
export const StartRate = 2;

/** One rung a decision may go to: its model, and what a call there would cost (null: the price is unknown). */
export interface RungOption {
  rung: Rung;
  model: string;
  cost: number | null;
}

/**
 * The seasons a game can be expected to last from this turn on, by the table's own settings (the median and the cap's
 * range), never by the drawn last season, which nothing reads. Null for an open age, which has no expected end.
 */
export function expectedSeasonsLeft(turn: number, c: GameConfig): number | null {
  if (c.openAge) return null;
  const cap = c.capped ? (Math.min(c.capMin, c.capMax) + Math.max(c.capMin, c.capMax)) / 2 : 1000;
  let survive = 1;
  let left = 0;
  for (let t = Math.max(1, turn); t <= cap && survive > 1e-4; t++) {
    left += survive;
    survive *= 1 - endChanceAt(t, c.endMedian);
  }
  return Math.max(1, left);
}

/** The cost of a call of this many characters in, cached and fresh, and this many tokens out, at a price. */
export function callCost(price: Price, cachedChars: number, freshChars: number, out: number): number {
  return price.cost(Math.ceil(freshChars / 4), out, Math.ceil(cachedChars / 4), 0);
}

export class Spending {
  readonly settings: SpendingSettings;
  private readonly config: GameConfig;
  private readonly seed: number;
  /** What the game has spent so far (the log's calls), in dollars. */
  private readonly spent: () => number;
  /** The going rate: worth per dollar a call must buy. */
  rate = StartRate;
  private turn = 0;
  private spentAtTurn = 0;
  private pace = 0;
  /** What the audits found, by kind and rung: how many, and how much the differences mattered in all. */
  private readonly audits = new Map<string, { n: number; mattered: number }>();
  /** The audits of the season so far, for a target: how many, and how many differed in a way that matters. */
  private seasonAudits = { n: 0, mattered: 0 };

  constructor(settings: SpendingSettings, config: GameConfig, seed: number, spent: () => number) {
    this.settings = settings;
    this.config = config;
    this.seed = seed;
    this.spent = spent;
  }

  /** Whether the table set anything to spend by: otherwise every decision goes where it starts. */
  get active(): boolean {
    const s = this.settings;
    return (s.mode === "limit" && s.limitUsd > 0) || (s.mode === "season" && s.seasonUsd > 0) || (s.mode === "target" && s.target > 0);
  }

  /**
   * What a season may spend at the pace the table set: its season's cost, or what is left of the limit spread over the
   * seasons to come (an open age, with no expected end, by its season's cost, or else over a median game's length).
   */
  paceFor(turn: number): number {
    const s = this.settings;
    if (s.mode === "season" && s.seasonUsd > 0) return s.seasonUsd;
    if (s.mode !== "limit" || s.limitUsd <= 0) return Number.POSITIVE_INFINITY;
    if (this.config.openAge && s.seasonUsd > 0) return Math.min(s.seasonUsd, Math.max(0, s.limitUsd - this.spent()));
    const left = expectedSeasonsLeft(turn, this.config) ?? Math.max(1, this.config.endMedian);
    return Math.max(0, s.limitUsd - this.spent()) / left;
  }

  /** A new season: the rate moves by how the last one kept to its pace (or, for a target, to the target). */
  private season(turn: number): void {
    if (turn <= this.turn) return;
    if (this.turn > 0) {
      const last = this.spent() - this.spentAtTurn;
      if (this.settings.mode === "target" && this.seasonAudits.n > 0) {
        const share = this.seasonAudits.mattered / this.seasonAudits.n;
        this.rate = share > this.settings.target ? this.rate / 1.5 : this.rate * 1.2;
      } else if (Number.isFinite(this.pace)) {
        if (last > this.pace * 1.1) this.rate *= 1.5;
        else if (last < this.pace * 0.6) this.rate /= 1.5;
      }
      this.rate = Math.min(Math.max(this.rate, 1e-3), 1e7);
    }
    this.turn = turn;
    this.spentAtTurn = this.spent();
    this.pace = this.paceFor(turn);
    this.seasonAudits = { n: 0, mattered: 0 };
  }

  /** How often a rung decides as the large one would, for a kind of decision: the first guess, moved by the audits. */
  quality(kind: string, rung: Rung): number {
    if (rung === "large") return 1;
    const a = this.audits.get(`${kind}/${rung}`);
    const prior = 1 - RungQuality[rung];
    return 1 - (prior * PriorWeight + (a?.mattered ?? 0)) / (PriorWeight + (a?.n ?? 0));
  }

  /** What a decision is worth: what it can move, grown by each season it has waited. */
  static worth(stakes: Stakes): number {
    return Math.max(0, stakes.moved) * (1 + 0.5 * (stakes.waited ?? 0));
  }

  /**
   * The rung a decision goes to. With nothing set to spend by it goes where it starts. Otherwise, from the cheapest rung it
   * may take (the script, where it may decide), it climbs each step whose added worth per added dollar clears the going
   * rate, raised while the season spends past its pace; a free rung is always taken, and nothing climbs once the limit is
   * spent. A price that is unknown counts as free only under a target, which counts no money (a game with a limit does not
   * start with an unpriced model).
   */
  choose(turn: number, stakes: Stakes, options: RungOption[], start: Rung): Rung {
    this.season(turn);
    if (!this.active || options.length === 0) return start;
    const worth = Spending.worth(stakes);
    const over = Number.isFinite(this.pace) && this.pace > 0 ? Math.max(0, (this.spent() - this.spentAtTurn) / this.pace - 1) : 0;
    const rate = this.rate * (1 + 2 * over);
    const spentOut = this.settings.mode === "limit" && this.settings.limitUsd > 0 && this.spent() >= this.settings.limitUsd;
    let at = options[0];
    for (const next of options.slice(1)) {
      const added = worth * (this.quality(stakes.kind, next.rung) - this.quality(stakes.kind, at.rung));
      const cost = (next.cost ?? 0) - (at.cost ?? 0);
      if (cost <= 0 ? added >= 0 : !spentOut && added / cost >= rate) at = next;
    }
    return at.rung;
  }

  /** Whether this decision is audited: a seeded draw, so a game audits the same decisions however its calls are timed. */
  audited(key: string): boolean {
    return this.settings.auditShare > 0 && Rng.for(this.seed, 0, "audit", key).chance(this.settings.auditShare);
  }

  /** What an audit found: the rung's rates for the kind move, and a target counts it. */
  learn(kind: string, rung: Rung, mattered: number): void {
    const k = `${kind}/${rung}`;
    const a = this.audits.get(k) ?? { n: 0, mattered: 0 };
    a.n++;
    a.mattered += Math.min(1, Math.max(0, mattered));
    this.audits.set(k, a);
    this.seasonAudits.n++;
    if (mattered >= 0.25) this.seasonAudits.mattered++;
  }
}
