/**
 * The seas as a script king reads them (build order item 7a, "Finer seas"): an army is carried by a chain of fleets, one in
 * each sea zone it sails through, from the waters of its own coast to the waters of the coast it lands on; a fleet in a
 * coastal city's waters blockades it. Every path is over the map as it can be sailed this season (Board.Sail).
 */
import { Board } from "./board.ts";

/**
 * Whether script kings play the finer seas well: chains of fleets for a convoy, blockades of the coastal cities they
 * besiege, and fleets guarding the waters of their walled coasts. Off only to measure what that play is worth
 * (`--no-sea-play`): then a convoy needs one fleet touching both coasts, as before item 7a, and no blockade or guard is
 * planned.
 */
export const SeaPlay: { on: boolean } = { on: true };

/**
 * The sea zones from the waters of `from` (a coast) to every zone reachable through zones that `through` allows, each with
 * the chain of zones that leads there (the first is `from`'s waters), breadth first and in id order, up to `depth` zones.
 */
export function seaChains(from: string, through: (zone: string) => boolean, depth = 3): Map<string, string[]> {
  const out = new Map<string, string[]>();
  if (!SeaPlay.on) depth = 1;
  const start = Board.Map.get(from).waters;
  if (start === null || !through(start)) return out;
  out.set(start, [start]);
  let frontier = [start];
  while (frontier.length > 0) {
    const next: string[] = [];
    for (const z of frontier) {
      const chain = out.get(z)!;
      if (chain.length >= depth) continue;
      for (const n of [...Board.Sail.neighbors(z)].sort()) {
        if (!Board.Map.get(n).isSea || out.has(n) || !through(n)) continue;
        out.set(n, [...chain, n]);
        next.push(n);
      }
    }
    frontier = next;
  }
  return out;
}

/** The coasts an army carried to a sea zone can land on: those whose waters it is. */
export function landingsFrom(zone: string): string[] {
  return Board.Map.coastsOf(zone).map((p) => p.id);
}

/**
 * The first move of a fleet's shortest way, by sea zones that `through` allows, from where it stands to the sea zone
 * `to` (at most `depth` moves), or null if there is none; ties in id order.
 */
export function stepToward(from: string, to: string, through: (zone: string) => boolean, depth = 5): string | null {
  if (from === to) return null;
  const first = new Map<string, string>();
  let frontier = [from];
  for (let d = 0; d < depth && frontier.length > 0; d++) {
    const next: string[] = [];
    for (const z of frontier)
      for (const n of [...Board.Sail.movesFrom("Fleet", z)].sort()) {
        if (!Board.Map.get(n).isSea || first.has(n) || n === from) continue;
        if (n !== to && !through(n)) continue;
        first.set(n, z === from ? n : first.get(z)!);
        if (n === to) return first.get(n)!;
        next.push(n);
      }
    frontier = next;
  }
  return null;
}

/** The waters of our coastal home province nearest a sea zone, by sea zones `through` allows: where a fleet raised there starts. */
export function nearestHarbour(me: string, to: string, ours: (province: string) => boolean, through: (zone: string) => boolean): string | null {
  let best: [string | null, number] = [null, 99];
  for (const p of Board.Map.landProvinces.filter((x) => x.home === me && x.waters !== null && ours(x.id)).sort((a, b) => (a.id < b.id ? -1 : 1))) {
    const chains = seaChains(p.id, (z) => z === to || through(z), 5);
    const c = chains.get(to);
    if (c !== undefined && c.length < best[1]) best = [p.id, c.length];
  }
  return best[0];
}

/**
 * A landing a court has set its mind on, kept from season to season (Brain.landing) so that its fleets and its army come
 * together on it instead of each going its own way: the army waits on the coast `from` while a fleet of ours comes to stand
 * in each sea zone of `chain` (from the waters of `from` to the waters of `target`), and then it is carried over. A chain
 * needs a fleet in every zone, and most courts own one fleet or none, so without a plan that outlasts the season the pieces
 * never meet. Chosen in turn `since`.
 */
export interface Landing {
  readonly from: string;
  readonly target: string;
  readonly chain: readonly string[];
  readonly since: number;
}

/** How many seasons a court waits for a landing to come together before giving it up, and then rests from the idea. */
export const LandingPatience = 8;
export const LandingRest = 6;

/**
 * The landing most worth setting our mind on, or null: from a coast of ours (or one our army stands on) where an army stands,
 * can march in this season, or can be raised, over a chain of at most `depth` sea zones that `open` allows, to a coast the
 * army cannot reach by land and `worth` values. Each landing is weighed by its worth, less what the army's going leaves
 * open (`exposure`: a capital's garrison rarely sails), over the seasons it takes to make ready: one a zone, one a fleet we
 * lack (at most one), one if the army is not there yet. Short chains to islands and to coasts beyond the land's reach come
 * first by that measure.
 */
export function chooseLanding(
  b: Board,
  turn: number,
  worth: (target: string) => number,
  open: (zone: string) => boolean,
  armyCanCome: (from: string) => boolean,
  exposure: (from: string) => number,
  least: number,
  depth = 3,
): Landing | null {
  const fleets = b.mine.filter((u) => u.kind === "Fleet").length;
  let best: [Landing | null, number] = [null, least];
  for (const from of Board.Map.landProvinces.filter((p) => p.waters !== null).map((p) => p.id).sort()) {
    const there = b.unitAt.tryGet(from);
    const armyThere = there !== undefined && there.power === b.me && there.kind === "Army";
    if (!armyThere && (there !== undefined || !b.isMine(from) || !armyCanCome(from))) continue;
    for (const [zone, chain] of seaChains(from, open, depth)) {
      // A court more than a fleet short of the chain would spend seasons and gold it does not have before it sails.
      if (chain.length - fleets > 1) continue;
      for (const target of landingsFrom(zone)) {
        if (target === from || Board.Sail.canMove("Army", from, target) || b.unitAt.has(target)) continue;
        const w = worth(target) - exposure(from);
        if (w <= 0) continue;
        const steps = chain.length + Math.max(0, chain.length - fleets) + (armyThere ? 0 : 1);
        if (w / steps > best[1]) best = [{ from, target, chain, since: turn }, w / steps];
      }
    }
  }
  return best[0];
}
