/**
 * The measures of the balance pass's money and characters (item 18, part D): where the world's gold sits as a game goes on
 * ("Where gold comes from and where it goes": creeping inflation in the markets' purses, or gold draining into
 * characters' hoards), the fees agreed for jobs as the age goes on against what a free man takes in working for himself
 * ("Fees clear the market"), and what bold and careful characters earn, from what, how often they serve courts that lose
 * their people, and how often they die ("Bold or careful, one goal").
 */
import { StrategyValues, addEarnings, characterResult, earningsTotal, fmt, lossesHeardOf, newEarnings, sum, type Character, type Earnings, type GameState, type PersonScore, type StayLeft, type Strategy } from "@amarna/engine";

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
  /** The kings' gold away from their treasuries: in far coffers, on the road to or from them, with caravans and envoys. */
  away: number;
}

export function goldStocks(s: GameState): GoldStocks {
  const living = s.characters.filter((c) => c.status !== "Dead");
  return {
    treasuries: sum([...s.treasuries.values()], (t) => t.gold),
    purses: sum([...s.markets.values()], (m) => m.purse),
    carried: sum(living, (c) => c.purse),
    hoards: sum(living, (c) => c.hoard?.gold ?? 0),
    loot: sum([...s.loot.values()], (x) => x),
    away:
      sum(s.coffers, (c) => c.gold) +
      sum(s.sent, (r) => r.gold) +
      sum(s.caravans, (c) => c.gold) +
      sum(s.journeys, (j) => (j.dispatch?.gold ?? 0) + (j.cargo?.gold ?? 0)),
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
  /** Jobs it took with a court it had heard loses its people abroad or puts others to death, and with any other. */
  dangerJobs: number;
  safeJobs: number;
  /** Item 18, part F3: by way to a fortune, its characters and how many of them stood in the top five (older summaries have none). */
  ways?: Partial<Record<Strategy, [number, number]>>;
}

/** One window of {@link FeeWindow} seasons. */
export interface FeeWindowMeasure {
  /** Jobs agreed, and their fees a season summed. */
  jobs: number;
  perSeason: number;
  /** The living characters in service and free, summed over its seasons. */
  serving: number;
  free: number;
  /** What the free took in working for themselves (lending and dealing, loot, news and carrying), summed. */
  selfEarned: number;
}

/** A game's money measures, gathered season by season while it plays. */
export interface MoneyMeasure {
  /** The stocks at each of {@link MoneyMarks} the game reached. */
  stocks: GoldStocks[];
  fees: FeeWindowMeasure[];
  roads?: { bold: RoadMeasure; careful: RoadMeasure };
}

const selfOf = (c: Character): number => c.earned.dealt + c.earned.loot + c.earned.news;

/** Watches a game as it plays: call `season` after every season with its number, `end` once with the scoreboard. */
export class MoneyWatch {
  readonly m: MoneyMeasure = { stocks: [], fees: [] };
  private readonly seen = new Set<string>();
  private readonly self = new Map<string, number>();
  /** Each character's stay carried by its contract last season ({@link StayLeft}). */
  private readonly stays = new Map<string, StayLeft | null>();
  private readonly jobs = { bold: [0, 0], careful: [0, 0] };

  season(s: GameState, played: number): void {
    if (this.m.stocks.length < MoneyMarks.length && played >= MoneyMarks[this.m.stocks.length]) this.m.stocks.push(goldStocks(s));
    const w = Math.floor((played - 1) / FeeWindow);
    while (this.m.fees.length <= w) this.m.fees.push({ jobs: 0, perSeason: 0, serving: 0, free: 0, selfEarned: 0 });
    const f = this.m.fees[w];
    for (const c of s.characters) {
      const before = this.self.get(c.id) ?? selfOf(c);
      this.self.set(c.id, selfOf(c));
      if (c.status === "Dead" || c.duty === "Ruling") continue;
      if (c.employer !== null) f.serving++;
      else {
        f.free++;
        f.selfEarned += selfOf(c) - before;
      }
      const k = c.contract;
      const stay = this.stays.get(c.id) ?? null;
      this.stays.set(c.id, k?.stay ?? null);
      if (k === null || c.employer === null || this.seen.has(`${c.id}:${k.startTurn}`)) continue;
      this.seen.add(`${c.id}:${k.startTurn}`);
      // A stay resumed after an errand (`jobsDone`) is the old job going on, not a new one: the rest of the stay the last
      // contract carried, to the same season.
      if (stay !== null && k.advance === 0 && k.untilTurn === stay.until && k.fee === stay.rest) continue;
      f.jobs++;
      // The term agreed: a job runs from its first season to `untilTurn` = start + term.
      f.perSeason += k.fee / Math.max(1, k.untilTurn - k.startTurn);
      const heard = lossesHeardOf(c, c.employer);
      this.jobs[c.bold ? "bold" : "careful"][heard.lost + heard.killed > 0 ? 0 : 1]++;
    }
  }

  end(characters: readonly PersonScore[]): MoneyMeasure {
    const road = (bold: boolean): RoadMeasure => {
      const xs = characters.filter((x) => x.character.bold === bold);
      const living = characters.filter((x) => !x.dead);
      const [dangerJobs, safeJobs] = this.jobs[bold ? "bold" : "careful"];
      const r: RoadMeasure = {
        people: xs.length,
        dead: xs.filter((x) => x.dead).length,
        top5: living.slice(0, 5).filter((x) => x.character.bold === bold).length,
        top20: living.slice(0, 20).filter((x) => x.character.bold === bold).length,
        result: sum(xs.filter((x) => !x.dead), (x) => characterResult(x.character) - 1),
        earned: newEarnings(),
        dangerJobs,
        safeJobs,
        ways: {},
      };
      const top = new Set(living.slice(0, 5).map((x) => x.character.id));
      for (const x of xs) {
        const w = (r.ways![x.character.strategy] ??= [0, 0]);
        w[0]++;
        if (top.has(x.character.id)) w[1]++;
      }
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
    lines.push(
      `  Gold at season ${mark} (${at.length} games, mean): treasuries ${avg("treasuries")}, away from them ${avg("away")}, markets' purses ${avg("purses")}, characters' purses ${avg("carried")}, hoards ${avg("hoards")}, loose men ${avg("loot")}.`,
    );
  });
  const windows = Math.max(0, ...ms.map((m) => m.fees.length));
  const fees: string[] = [];
  for (let w = 0; w < windows; w++) {
    const xs = ms.flatMap((m) => (m.fees[w] !== undefined ? [m.fees[w]] : []));
    const jobs = sum(xs, (x) => x.jobs);
    const serving = sum(xs, (x) => x.serving);
    const free = sum(xs, (x) => x.free);
    const all = serving + free;
    fees.push(
      `${w * FeeWindow + 1}-${(w + 1) * FeeWindow}: ${jobs} jobs at ${jobs === 0 ? "-" : fmt(sum(xs, (x) => x.perSeason) / jobs, "0.0")} a season, ${all === 0 ? "-" : fmt((100 * serving) / all, "0")}% in service, the free taking in ${free === 0 ? "-" : fmt(sum(xs, (x) => x.selfEarned) / free, "0.0")} a season`,
    );
  }
  lines.push(`  By season: jobs agreed and their mean fee a season, the living characters in service, and what the free took in a season for themselves (lending and dealing at face, loot, news and carrying): ${fees.join("; ")}.`);
  for (const bold of [true, false]) {
    const rs = ms.flatMap((m) => (m.roads !== undefined ? [bold ? m.roads.bold : m.roads.careful] : []));
    const n = sum(rs, (r) => r.people);
    if (n === 0) continue;
    const e = newEarnings();
    for (const r of rs) addEarnings(e, r.earned);
    const total = earningsTotal(e) - e.savings;
    const share = (x: number): string => (total <= 0 ? "-" : `${fmt((100 * x) / total, "0")}%`);
    const dead = sum(rs, (r) => r.dead);
    const danger = sum(rs, (r) => r.dangerJobs);
    const jobs = danger + sum(rs, (r) => r.safeJobs);
    lines.push(
      `  ${bold ? "Bold" : "Careful"}: ${n} characters, ${fmt((100 * dead) / n, "0")}% dead at the end; ${sum(rs, (r) => r.top5)} of the top five, ${sum(rs, (r) => r.top20)} of the top twenty; ` +
        `${jobs} jobs, ${jobs === 0 ? "-" : fmt((100 * danger) / jobs, "0")}% with a court heard to lose its people; ` +
        `the living gained ${fmt(sum(rs, (r) => r.result) / Math.max(1, n - dead), "0")} a head; earned (savings aside) ${fmt(total / n, "0")} a head: fees ${share(e.fees)}, dealing ${share(e.dealt)}, skimmed ${share(e.skimmed)}, gifts ${share(e.gifts)}, kept ${share(e.carried)}, loot ${share(e.loot)}, news ${share(e.news)}; spent ${fmt(e.spent / n, "0")} a head.`,
    );
  }
  // Item 18, part F3: each way to a fortune by road, so a gap between the roads can be told from a gap between the ways.
  const ways = StrategyValues.flatMap((w) => {
    const of = (bold: boolean): [number, number] => {
      const rs = ms.flatMap((m) => (m.roads !== undefined ? [bold ? m.roads.bold : m.roads.careful] : []));
      return [sum(rs, (r) => r.ways?.[w]?.[0] ?? 0), sum(rs, (r) => r.ways?.[w]?.[1] ?? 0)];
    };
    const [b, c] = [of(true), of(false)];
    const rate = (x: [number, number]): string => (x[0] === 0 ? "-" : fmt((100 * x[1]) / x[0], "0.0"));
    return b[0] + c[0] === 0 ? [] : [`${w} bold ${b[1]} of ${b[0]} (${rate(b)}), careful ${c[1]} of ${c[0]} (${rate(c)})`];
  });
  if (ways.length > 0) lines.push(`  The top five by way to a fortune (of those who never reigned; in a hundred heads): ${ways.join("; ")}.`);
  return lines;
}
