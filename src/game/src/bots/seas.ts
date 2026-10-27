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
