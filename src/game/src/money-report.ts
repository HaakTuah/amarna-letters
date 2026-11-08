/**
 * The measures of the balance pass's money and characters (item 18, part D): where the world's gold sits as a game goes on
 * ("Where gold comes from and where it goes": creeping inflation in the markets' purses, or gold draining into
 * characters' hoards), the fees agreed for jobs as the age goes on ("Fees clear the market"), and what bold and careful
 * characters earn, from what, and how often they die ("Bold or careful, one goal").
 */
import { addEarnings, characterResult, earningsTotal, fmt, newEarnings, sum, type Earnings, type GameState, type PersonScore } from "@amarna/engine";

/** The seasons the gold stocks are read at, and the width of the windows fees are counted in. */
export const MoneyMarks = [1, 20, 40, 60, 80] as const;
const FeeWindow = 20;

/** Where the world's gold sits, in shekels. */
export interface GoldStocks {
  treasuries: number;
  /** The markets' purses: the gold of the local people. */
  purses: number;
  /** The characters' purses, the living's. */
  carried: number;
  hoards: number;
  /** The loose men's loot. */
  loot: number;
}

export function goldStocks(s: GameState): GoldStocks {
  const living = s.characters.filter((c) => c.status !== "Dead");
  return {
    treasuries: sum([...s.treasuries.values()], (t) => t.gold),
    purses: sum([...s.markets.values()], (m) => m.purse),
    carried: sum(living, (c) => c.purse),
    hoards: sum(living, (c) => c.hoard?.gold ?? 0),
    loot: sum([...s.loot.values()], (x) => x),
  };
}

/** One road's characters at the end of a game. */
export interface RoadMeasure {
  people: number;
  dead: number;
  /** Among the five and the twenty best-placed living characters. */
  top5: number;
  top20: number;
  /** The living's results summed ({@link characterResult}: 1 for what he brought, 1 more for every shekel gained). */
  result: number;
  earned: Earnings;
}

/** A game's money measures, gathered season by season while it plays. */
export interface MoneyMeasure {
  /** The stocks at each of {@link MoneyMarks} the game reached. */
  stocks: GoldStocks[];
  /** Per window of {@link FeeWindow} seasons: jobs agreed, their fees a season summed, and the living characters in service and free, summed over its seasons. */
  fees: { jobs: number; perSeason: number; serving: number; free: number }[];
  roads?: { bold: RoadMeasure; careful: RoadMeasure };
}

/** Watches a game as it plays: call `season` after every season, `end` once with the scoreboard. */
export class MoneyWatch {
  readonly m: MoneyMeasure = { stocks: [], fees: [] };
  private readonly seen = new Set<string>();

  season(s: GameState): void {
    if ((MoneyMarks as readonly number[]).includes(s.turn)) this.m.stocks.push(goldStocks(s));
    const w = Math.floor((s.turn - 1) / FeeWindow);
    while (this.m.fees.length <= w) this.m.fees.push({ jobs: 0, perSeason: 0, serving: 0, free: 0 });
    const f = this.m.fees[w];
    for (const c of s.characters) {
      if (c.status === "Dead" || c.duty === "Ruling") continue;
      if (c.employer !== null) f.serving++;
      else f.free++;
      const k = c.contract;
      if (k === null || this.seen.has(`${c.id}:${k.startTurn}`)) continue;
      this.seen.add(`${c.id}:${k.startTurn}`);
      f.jobs++;
      f.perSeason += k.fee / Math.max(1, k.untilTurn - k.startTurn + 1);
    }
  }

  end(characters: readonly PersonScore[]): MoneyMeasure {
    const road = (bold: boolean): RoadMeasure => {
      const xs = characters.filter((x) => x.character.bold === bold);
      const living = characters.filter((x) => !x.dead);
      const r: RoadMeasure = {
        people: xs.length,
        dead: xs.filter((x) => x.dead).length,
        top5: living.slice(0, 5).filter((x) => x.character.bold === bold).length,
        top20: living.slice(0, 20).filter((x) => x.character.bold === bold).length,
        result: sum(xs.filter((x) => !x.dead), (x) => characterResult(x.character) - 1),
        earned: newEarnings(),
      };
      for (const x of xs) addEarnings(r.earned, x.character.earned);
      return r;
    };
    this.m.roads = { bold: road(true), careful: road(false) };
    return this.m;
  }
}

/** The report's lines over many games. */
export function moneyReport(ms: readonly MoneyMeasure[]): string[] {
  const lines = ["Money and characters (item 18, part D):"];
  MoneyMarks.forEach((mark, i) => {
    const at = ms.flatMap((m) => (m.stocks[i] !== undefined ? [m.stocks[i]] : []));
    if (at.length === 0) return;
    const avg = (k: keyof GoldStocks): string => fmt(sum(at, (x) => x[k]) / at.length, "0");
    lines.push(`  Gold at season ${mark} (${at.length} games, mean): treasuries ${avg("treasuries")}, markets' purses ${avg("purses")}, characters' purses ${avg("carried")}, hoards ${avg("hoards")}, loose men ${avg("loot")}.`);
  });
  const windows = Math.max(0, ...ms.map((m) => m.fees.length));
  const fees: string[] = [];
  for (let w = 0; w < windows; w++) {
    const xs = ms.flatMap((m) => (m.fees[w] !== undefined ? [m.fees[w]] : []));
    const jobs = sum(xs, (x) => x.jobs);
    const serving = sum(xs, (x) => x.serving);
    const all = serving + sum(xs, (x) => x.free);
    fees.push(`${w * FeeWindow + 1}-${(w + 1) * FeeWindow}: ${jobs} jobs at ${jobs === 0 ? "-" : fmt(sum(xs, (x) => x.perSeason) / jobs, "0.0")} a season, ${all === 0 ? "-" : fmt((100 * serving) / all, "0")}% in service`);
  }
  lines.push(`  Jobs agreed by season, their mean fee a season, and the living characters in service: ${fees.join("; ")}.`);
  for (const bold of [true, false]) {
    const rs = ms.flatMap((m) => (m.roads !== undefined ? [bold ? m.roads.bold : m.roads.careful] : []));
    const n = sum(rs, (r) => r.people);
    if (n === 0) continue;
    const e = newEarnings();
    for (const r of rs) addEarnings(e, r.earned);
    const total = earningsTotal(e) - e.savings;
    const share = (x: number): string => (total <= 0 ? "-" : `${fmt((100 * x) / total, "0")}%`);
    const dead = sum(rs, (r) => r.dead);
    lines.push(
      `  ${bold ? "Bold" : "Careful"}: ${n} characters, ${fmt((100 * dead) / n, "0")}% dead at the end; ${sum(rs, (r) => r.top5)} of the top five, ${sum(rs, (r) => r.top20)} of the top twenty; ` +
        `the living gained ${fmt(sum(rs, (r) => r.result) / Math.max(1, n - dead), "0")} a head; earned (savings aside) ${fmt(total / n, "0")} a head: fees ${share(e.fees)}, dealing ${share(e.dealt)}, skimmed ${share(e.skimmed)}, gifts ${share(e.gifts)}, kept ${share(e.carried)}, loot ${share(e.loot)}, news ${share(e.news)}; spent ${fmt(e.spent / n, "0")} a head.`,
    );
  }
  return lines;
}
