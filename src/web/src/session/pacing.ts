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
 * in the closing line. `line` is its part of that line ("Sumur fell to Amurru", "a battle at Gubla"). `big`: one of the
 * biggest events, a capital falling, which takes a beat even at Fast.
 */
export interface Moment {
  phase: Phase;
  kind: "great" | "routine" | "news";
  line: string;
  big?: boolean;
}

/**
 * How a speed paces a season, in milliseconds ("Pace of play" under Interface): `season`, about how long its playout lasts
 * (a quiet season at least `least`), shared among the marching, the sieges and its great moments, each of which lasts
 * between `shortest` and `great`, `together` at once, at most `most` of them; then `close` on the result. With `flash`, the
 * great moments but the biggest flash all at once for that long after the marching (Fast: a second of highlights).
 */
export interface Pace {
  season: number;
  least: number;
  march: number;
  siege: number;
  great: number;
  shortest: number;
  together: number;
  most: number;
  flash: number;
  close: number;
}

/**
 * The paces, by the speed's place in `Speeds` (ui/keys.ts), first guesses tuned in item 18: Slow, about 15 s and a few
 * on the result; Normal, about 6 s and a couple on the result; Fast, about a second of highlights, a capital falling still
 * taking a beat. Simulate draws nothing (session/client.ts: `simulating`), so it has no pace; its row is never played.
 */
export const Paces: readonly Pace[] = [
  { season: 15000, least: 9000, march: 3000, siege: 1500, great: 3500, shortest: 2000, together: 1, most: 6, flash: 0, close: 4000 },
  { season: 6000, least: 3500, march: 1200, siege: 500, great: 1800, shortest: 1000, together: 1, most: 4, flash: 0, close: 2000 },
  { season: 1000, least: 0, march: 450, siege: 0, great: 1000, shortest: 1000, together: 1, most: 2, flash: 550, close: 0 },
  { season: 0, least: 0, march: 0, siege: 0, great: 0, shortest: 0, together: 1, most: 0, flash: 0, close: 0 },
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
  const great = moments.filter((m) => m.kind === "great");
  // With a flash, the great moments but the biggest flash together; the rest play each in its turn, the biggest first, then
  // by rank (a fall before a battle), as many as the speed has time for. The rest land with the results, unplayed but told.
  const flashing = pace.flash > 0 ? great.filter((m) => m.big !== true) : [];
  const own = great.filter((m) => !flashing.includes(m));
  const order = (m: M): number => (m.big === true ? 0 : 1) * 10 + Rank[m.phase];
  const chosen = new Set([...own].sort((a, b) => order(a) - order(b)).slice(0, pace.most));
  const routine = (phase: Phase): M[] => moments.filter((m) => m.phase === phase && m.kind === "routine");
  // Each great moment's share of the season left once the marching, the flash and the sieges have theirs.
  const fixed = (routine("march").length > 0 ? pace.march : 0) + (flashing.length > 0 ? pace.flash : 0) + (routine("siege").length > 0 ? pace.siege : 0);
  const slots = Math.ceil(chosen.size / pace.together);
  const ms = slots === 0 ? 0 : Math.min(pace.great, Math.max(pace.shortest, (pace.season - fixed) / slots));
  const beats: Beat<M>[] = [];
  let t = 0;
  let marchAt = 0;
  let marchMs = 0;
  let landAt = 0;
  for (const phase of PhaseOrder) {
    if (phase === "fall") landAt = t;
    if (phase === "march" || phase === "siege") {
      const here = routine(phase);
      const len = phase === "march" ? pace.march : pace.siege;
      if (here.length > 0) {
        if (phase === "march") [marchAt, marchMs] = [t, len];
        for (const m of here) beats.push({ moment: m, at: t, ms: len });
        t += len;
      }
      if (phase === "march" && flashing.length > 0) {
        for (const m of flashing) beats.push({ moment: m, at: t, ms: pace.flash });
        t += pace.flash;
      }
      continue;
    }
    const playing = moments.filter((m) => m.phase === phase && chosen.has(m));
    playing.forEach((m, i) => beats.push({ moment: m, at: t + Math.floor(i / pace.together) * ms, ms }));
    t += Math.ceil(playing.length / pace.together) * ms;
  }
  const closeAt = Math.max(t, pace.least);
  return { beats, marchAt, marchMs, landAt, closeAt, total: closeAt + pace.close, moments: [...moments] };
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
