/**
 * The measures of the balance pass's script kings' spending (item 18, part E): what the Great Kings do with their gold, in
 * the opening, the middle of the age and its last seasons ("The wealth of a realm": whether kings build, give and campaign
 * or sit on their treasure, and what the last seasons look like); the grabs the score pays for when the omens are darkest
 * (raising the share of the harvest taken, troops' pay held back, hoards seized, fees withheld) and whether kings still
 * hire then; and whether the courts play distinctly across seeds, by the first foe each marches against ("Each court plays
 * differently"). Read from each king's orders as the game's log keeps them, and his treasury.
 */
import { GreatKings, TurnSubmissionSchema, isAlive, TurnEngine, fmt, sum, type GameState, type Order, type Power, type TurnSubmission } from "@amarna/engine";
import type { GameLog } from "./log.ts";

/** What one king did in one season. */
interface KingSeason {
  turn: number;
  power: Power;
  /** Gold sent abroad: envoys' gold (gifts, tribute) and gold given to persons. */
  given: number;
  ransoms: number;
  /** Jobs offered and renewed. */
  hires: number;
  levies: number;
  builds: number;
  /** The grabs: a higher share of a harvest demanded than he last set there, troops' pay held back, hoards seized, fees withheld. */
  taxUp: number;
  payHeld: number;
  seized: number;
  feesHeld: number;
  /** His treasury as a share of his realm's wealth, in a hundred. */
  treasury: number;
}

/** A game's spending measures. */
export interface SpendingMeasure {
  seasons: KingSeason[];
  /** The last season played. */
  last: number;
  /** Each Great King's first march into another's land: the season and whose land it was (null if he never marched). */
  firstCampaign: Record<string, { turn: number; foe: string } | null>;
}

const giftOf = (o: Order): number => (o.type === "dispatch" || o.type === "gift" ? Math.max(0, o.gold) : 0);

/** Watches a game as it plays: call `season` after every season with its number, `end` once. */
export class SpendingWatch {
  private readonly m: SpendingMeasure = { seasons: [], last: 0, firstCampaign: {} };
  private readonly shares = new Map<string, number>();
  /** Who held each province when the season began (after the last). */
  private owners = new Map<string, Power | null>();

  season(s: GameState, played: number, log: GameLog): void {
    this.m.last = played;
    const engine = new TurnEngine(s);
    for (const p of GreatKings) {
      const sub = log.tryGet<TurnSubmission>(`t${played}/orders/${p}`, TurnSubmissionSchema);
      if (sub === undefined) continue;
      const os = sub.orders;
      const count = (t: Order["type"]): number => os.filter((o) => o.type === t).length;
      let taxUp = 0;
      for (const o of os) {
        if (o.type !== "demand" || o.how !== "share") continue;
        const key = `${p}|${o.province ?? ""}`;
        if (o.n > (this.shares.get(key) ?? o.n)) taxUp++;
        this.shares.set(key, o.n);
      }
      const strength = Math.max(1, engine.strength(p));
      this.m.seasons.push({
        turn: played,
        power: p,
        given: sum(os, giftOf),
        ransoms: count("payRansom"),
        hires: count("hire") + count("renew"),
        levies: count("raise"),
        builds: count("build"),
        taxUp,
        payHeld: os.filter((o) => o.type === "upkeep" && o.pay === false).length,
        seized: count("seize"),
        feesHeld: os.filter((o) => o.type === "payFee" && !o.pay).length,
        treasury: Math.round((100 * s.treasuries.get(p).gold) / strength),
      });
      if (!this.m.firstCampaign[p]) {
        // The first march into land another power held when the season began: a campaign begun.
        const foes = os.flatMap((o) => {
          const foe = o.type === "move" ? (this.owners.get(o.to) ?? s.owner.getOrDefault(o.to, null)) : null;
          return foe !== null && foe !== p && isAlive(s, foe) ? [foe] : [];
        });
        this.m.firstCampaign[p] = foes.length === 0 ? null : { turn: played, foe: foes[0] };
      }
    }
    this.owners = new Map(s.owner.entries());
  }

  end(): SpendingMeasure {
    return this.m;
  }
}

/** Which part of the age a season falls in: the opening (the first 20), the last 8, or the middle. */
const partOf = (turn: number, last: number): 0 | 1 | 2 => (turn > last - 8 ? 2 : turn <= 20 ? 0 : 1);

/** The report's lines over many games. */
export function spendingReport(ms: readonly SpendingMeasure[]): string[] {
  const lines = ["The Great Kings' spending (item 18, part E), a king-season's mean in the opening (seasons 1-20), the middle, and the last 8 seasons:"];
  const parts = [0, 1, 2].map((i) => ms.flatMap((m) => m.seasons.filter((x) => partOf(x.turn, m.last) === i)));
  const row = (name: string, f: (x: KingSeason) => number, form: "0.0" | "0.00" = "0.00"): string =>
    `  ${name}: ${parts.map((xs) => (xs.length === 0 ? "-" : fmt(sum(xs, f) / xs.length, form))).join(" / ")}`;
  lines.push(
    row("gold given abroad", (x) => x.given, "0.0"),
    row("jobs offered", (x) => x.hires),
    row("levies raised", (x) => x.levies),
    row("works ordered", (x) => x.builds),
    row("ransoms paid", (x) => x.ransoms),
    row("treasury, % of the realm's wealth", (x) => x.treasury, "0.0"),
    row("grabs: a higher share of a harvest", (x) => x.taxUp),
    row("grabs: troops' pay held back", (x) => x.payHeld),
    row("grabs: hoards seized", (x) => x.seized),
    row("grabs: fees withheld", (x) => x.feesHeld),
  );
  const firsts: string[] = [];
  for (const p of GreatKings) {
    const xs = ms.map((m) => m.firstCampaign[p] ?? null);
    const foes = new Map<string, number>();
    for (const x of xs) if (x !== null) foes.set(x.foe, (foes.get(x.foe) ?? 0) + 1);
    const top = [...foes.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 3);
    const turns = xs.flatMap((x) => (x === null ? [] : [x.turn])).sort((a, b) => a - b);
    firsts.push(
      `${p} ${turns.length} of ${xs.length}${turns.length === 0 ? "" : ` (season ${turns[Math.floor((turns.length - 1) / 2)]} on the median; ${foes.size} foes, most ${top.map(([f, n]) => `${f} ${n}`).join(", ")})`}`,
    );
  }
  lines.push(`  The first march into another's land, by court (games with one, its season, its foes): ${firsts.join("; ")}.`);
  return lines;
}
