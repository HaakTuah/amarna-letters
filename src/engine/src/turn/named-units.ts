/** The units an order for later names: one lost out of sight whose end its king has not heard, and one named by a province. */
import type { Power } from "../model/power.ts";
import { unitAt } from "../model/state.ts";
import type { Unit } from "../model/units.ts";
import { goneHeard } from "../rules/units-known.ts";
import type { TurnEngine } from "./core.ts";

/** A unit of the seat's lost out of sight whose end it has not heard of (bug #600), by its id. */
export function goneUnheard(e: TurnEngine, p: Power, id: string | null): Unit | undefined {
  return id === null ? undefined : e.s.unitsGone.find((x) => x.id === id && x.power === p && !goneHeard(e, p, id));
}

/**
 * The unit an order for later names by a province: whoever's unit stands there, or, where none of the seat's does, its own
 * unit lost out of sight whose end it has not heard of, which its view still shows there (bug #600): the order is kept,
 * and fails where it arrives or drops when word of the end comes, as one given this season does.
 */
export function ownNamed(e: TurnEngine, p: Power, at: string): Unit | null {
  const here = unitAt(e.s, at);
  if (here !== null && here.power === p) return here;
  const gone = e.unitShownAt(p, at);
  return gone !== null && !e.s.units.includes(gone) ? gone : here;
}
