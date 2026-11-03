/**
 * Item 17+++, "the season plays out": a season's moments laid out in time, paced by meaning and the chosen speed, and the
 * short line that closes it. Plain functions of what the seat knows (map/moments.ts finds the moments in its scene), so the
 * page, the map and the tests share one reckoning. Every number here is a first guess, presentation only (balance waits for
 * item 18; these are not balance, but they are tuned with it).
 */

/**
 * The order a season plays in, as the engine resolves it: the arrivals that open it, the marches, what the road and the
 * weather did to those on it, the battles, the sieges tightening, and the cities that fell.
 */
export type Phase = "arrival" | "march" | "disaster" | "battle" | "siege" | "fall";
const PhaseOrder: readonly Phase[] = ["arrival", "march", "disaster", "battle", "siege", "fall"];

/** Which great moments are played first when a season holds more than the speed gives time for: a fall before a battle. */
const Rank: Readonly<Record<Phase, number>> = { fall: 0, battle: 1, disaster: 2, arrival: 3, march: 4, siege: 5 };

/**
 * One thing that happened this season, as the seat knows it. A great moment plays alone, long enough to take in; a routine
 * one plays with the others of its phase; news (something the seat heard of but did not see) plays nowhere and is only told
 * in the closing line. `line` is its part of that line ("Sumur fell to Amurru", "a battle at Gubla").
 */
export interface Moment {
  phase: Phase;
  kind: "great" | "routine" | "news";
  line: string;
}

/** How a speed paces a season, in milliseconds: a great moment, the marching, the sieges, the closing line. */
export interface Pace {
  great: number;
  march: number;
  siege: number;
  close: number;
  /** How many great moments play at once (at Fast, two side by side), and how many a season plays at most. */
  together: number;
  most: number;
}

/**
 * The paces, by the speed's place in `Speeds` (ui/keys.ts): Slow, Normal, Fast, Simulate. At Fast the routine compresses
 * while a great moment still lasts over a second; Simulate skips to the result.
 */
export const Paces: readonly Pace[] = [
  { great: 2600, march: 1600, siege: 900, close: 2400, together: 1, most: 6 },
  { great: 1800, march: 900, siege: 500, close: 1600, together: 1, most: 5 },
  { great: 1200, march: 350, siege: 200, close: 900, together: 2, most: 4 },
  { great: 0, march: 0, siege: 0, close: 0, together: 1, most: 0 },
];

/** A moment's place in the season's time: from `at`, for `ms`. */
export interface Beat<M extends Moment> {
  moment: M;
  at: number;
  ms: number;
}

/** A season laid out in time. Every time is in milliseconds from the season's start. */
export interface Timeline<M extends Moment> {
  /** The moments that play, in the order they play. */
  beats: Beat<M>[];
  /** When the marching starts and how long it takes: every unit and traveller slides then. */
  marchAt: number;
  marchMs: number;
  /** When the season's results land on the map (who holds what, the fog, the season's arrows): as the cities fall. */
  landAt: number;
  /** When the closing line shows, and when the season is over and the next may begin. */
  closeAt: number;
  total: number;
  moments: M[];
}

/** Lays a season's moments out in time at a pace. */
export function paceSeason<M extends Moment>(moments: readonly M[], pace: Pace): Timeline<M> {
  // The great moments a season has time for, by rank; the rest land with the season's results, unplayed but told.
  const great = moments.filter((m) => m.kind === "great");
  const chosen = new Set([...great].sort((a, b) => Rank[a.phase] - Rank[b.phase]).slice(0, pace.most));
  const beats: Beat<M>[] = [];
  let t = 0;
  let marchAt = 0;
  let marchMs = 0;
  let landAt = -1;
  for (const phase of PhaseOrder) {
    if (phase === "fall") landAt = t;
    const here = moments.filter((m) => m.phase === phase);
    if (phase === "march" || phase === "siege") {
      const routine = here.filter((m) => m.kind !== "news");
      if (routine.length === 0) continue;
      const ms = phase === "march" ? pace.march : pace.siege;
      if (phase === "march") [marchAt, marchMs] = [t, ms];
      for (const m of routine) beats.push({ moment: m, at: t, ms });
      t += ms;
      continue;
    }
    const playing = here.filter((m) => chosen.has(m));
    playing.forEach((m, i) => beats.push({ moment: m, at: t + Math.floor(i / pace.together) * pace.great, ms: pace.great }));
    t += Math.ceil(playing.length / pace.together) * pace.great;
  }
  return { beats, marchAt, marchMs, landAt, closeAt: t, total: t + pace.close, moments: [...moments] };
}

const Numbers = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
const number = (n: number): string => Numbers[n] ?? String(n);

/** "A", "A and B", "A, B and C". */
export function listed(xs: readonly string[]): string {
  return xs.length <= 1 ? (xs[0] ?? "") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;
}

/**
 * The line that closes a season: what changed, the greatest first, in a few clauses. Battles and arrivals each fold into
 * one clause ("battles at Gubla and Sumur"); the marching and the sieges are counted. `seat`: told to a seat, whose quiet
 * season is quiet only as far as word has come.
 */
export function closingLine(moments: readonly Moment[], seat: boolean): string {
  const by = (phase: Phase, kinds: readonly Moment["kind"][] = ["great"]): Moment[] => moments.filter((m) => m.phase === phase && kinds.includes(m.kind));
  const parts: string[] = [];
  for (const m of by("fall")) parts.push(m.line);
  const battles = by("battle");
  if (battles.length === 1) parts.push(`a battle at ${battles[0].line}`);
  else if (battles.length > 3) parts.push(`battles at ${battles.slice(0, 3).map((m) => m.line).join(", ")} and ${number(battles.length - 3)} more`);
  else if (battles.length > 1) parts.push(`battles at ${listed(battles.map((m) => m.line))}`);
  for (const m of by("disaster")) parts.push(m.line);
  const arrivals = by("arrival");
  if (arrivals.length === 1) parts.push(`an envoy reached ${arrivals[0].line}`);
  else if (arrivals.length > 1) parts.push(`${number(arrivals.length)} envoys arrived`);
  const marches = by("march", ["routine"]).length;
  if (marches > 0) parts.push(`${number(marches)} ${marches === 1 ? "column on the march" : "columns on the march"}`);
  const sieges = by("siege", ["routine"]);
  if (sieges.length === 1) parts.push(sieges[0].line);
  else if (sieges.length > 1) parts.push(`${number(sieges.length)} sieges pressed on`);
  const news = moments.filter((m) => m.kind === "news");
  if (news.length > 0) parts.push(`word came ${news.length === 1 ? news[0].line : `of ${number(news.length)} things beyond your sight`}`);
  if (parts.length === 0) return seat ? "A quiet season, as far as word has reached you." : "A quiet season.";
  const shown = parts.length > 5 ? [...parts.slice(0, 4), "and more besides"] : parts;
  const line = shown.join("; ");
  return `${line[0].toUpperCase()}${line.slice(1)}.`;
}
