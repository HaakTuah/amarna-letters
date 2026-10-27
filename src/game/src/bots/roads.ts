/**
 * The script kings' roads (build order item 7b, "Passage and access"): a king closes his roads to a court he is at war
 * with, so his men turn its envoys and spies back at his border and his troops anywhere may seize them, with their letters,
 * gold and tablets; and opens them again once there is peace, or a treaty. Closing costs nothing and never keeps that
 * court's envoys from his own court, so the only reason to keep roads open to a foe would be to let its letters reach
 * third courts, which no competent king wants. `--no-road-play` turns this off, to measure it.
 */
import { AllPowers, roads, type Order } from "@amarna/engine";
import type { Board } from "./board.ts";
import type { Brain } from "./brain.ts";

/** On for every script king, or (`only`) for these alone, to compare the two sides on the same seeds. */
export const RoadPlay: { on: boolean; only: ReadonlySet<string> | null } = { on: true, only: null };

/** Seasons since the last blow either way that count as war, and as peace (first guesses of the bots', not game numbers). */
export const WarMemory = 4;
export const PeaceAfter = 8;

export function roadPolicy(b: Board, brain: Brain, orders: Order[]): void {
  const v = b.v;
  if (!RoadPlay.on || (RoadPlay.only !== null && !RoadPlay.only.has(v.power))) return;
  const foes = brain.swornFoes(b);
  for (const x of AllPowers) {
    if (x === v.power || v.fallen.includes(x)) continue;
    const r = brain.rel.tryGet(x);
    if (r === undefined) continue;
    const friend = brain.isFriend(x);
    const lastBlow = Math.max(r.lastAttackedUs, r.lastWeAttacked);
    // Only against a king at war with us: closing roads to one we merely distrust, or attack ourselves, makes him an enemy.
    const atWar = !friend && (r.lastAttackedUs >= v.turn - WarMemory || foes.has(x));
    const peace = friend || (lastBlow < v.turn - PeaceAfter && !foes.has(x) && !r.hostile);
    const closed = v.roadsClosed.includes(x);
    if (!closed && atWar) orders.push(roads(x, true));
    else if (closed && peace) orders.push(roads(x, false));
  }
}
