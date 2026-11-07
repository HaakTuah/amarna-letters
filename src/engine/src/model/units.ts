/**
 * A unit: an army or a fleet, where it stands and what it carries (split from `state.ts` by meaning), and its leaving the
 * game.
 */
import { I, type ObjSchema, S, B, computed, list, obj, opt } from "../core/json.ts";
import { type Mandate, MandateSchema } from "./command.ts";
import { type UnitKind, WorldMap } from "./map.ts";
import type { Power } from "./power.ts";
import type { GameState } from "./state.ts";

export interface Unit {
  id: string;
  power: Power;
  kind: UnitKind;
  province: string;
  /** Where it was raised (its men's homes): their savings go into that province's purse when it disbands (item 9+a). */
  home: string;
  /** The grain it carries, in measures (item 9+a, "Armies need food as well as pay"). */
  food: number;
  /** The part of its men's pay and loot they have not spent, carried home ("Soldiers carry savings home"). */
  savings: number;
  /** Seasons in a row it went hungry, and went unpaid: a few of either and it mutinies. */
  hungry: number;
  unpaid: number;
  /** Its men, levied from the men of fighting age of its home (item 10+a); they go home when it disbands. */
  men: number;
  /**
   * Item 13, distance-based marching: the neighbouring province it is marching to across a connection longer than a
   * season's march, and the points it has made on it ({@link travel.legPoints}); null and 0 while it is not.
   */
  march: string | null;
  along: number;
  /**
   * Item 13, "Generals lead armies": the character the king granted command of it, and the season he joins it (he travels
   * from where the grant was given); null while nobody commands it. Command is a grant of authority, not a job: no fee.
   */
  commander: string | null;
  commandFrom: number;
  /** Item 13, "Army mandates": the king's intent with limits, and the season it reaches the army; null if none was given. */
  mandate: Mandate | null;
  mandateFrom: number;
  /** Item 13: the season word that the king takes back the command reaches the commander, or null. */
  relieveAt: number | null;
  /**
   * Item 13 ("Distance inside your own realm"): where it stood at the end of each of the last few seasons, newest last, as
   * `province|men`: what its king knows of it is the report his couriers bring, as old as the road from it is long.
   */
  trail: string[];
  /**
   * Item 13: men of a band enlisted into it (hiring bands as soldiers): how many, the last season of their term, after which
   * they leave as their chief's band again, and their chief; 0 and null otherwise.
   */
  hiredMen: number;
  hiredUntil: number | null;
  hiredChief: string | null;
  /**
   * Item 17 ("Armies need food as well as pay"): whether its king's word, as it last reached it, is to buy its food where it
   * stands by leave (at home or in a friend's land) with the gold it carries, or to take it; and the gold it carries for
   * food (`chest`), carried in its men's packs with their savings (so never more than `savings`). Without the gold, it
   * takes what it must, whatever it was told; its commander may keep the gold and take.
   */
  buy: boolean;
  chest: number;
  /** Bug #600: the season it was raised (0 for the troops a game begins with): its king knows of it once word could come. */
  since: number;
  /** Bug #615: where it came to be, if not at its home (a part split off another, where they parted); "" otherwise. */
  raisedAt: string;
  /** Bug #600: the season it left the game, 0 while it stands (GameState.unitsGone). */
  goneTurn: number;
  // computed in C#: $"{(Kind == UnitKind.Army ? "A" : "F")} {Province}"
}

export function newUnit(init: Partial<Unit> = {}): Unit {
  return {
    id: "",
    power: "Egypt",
    kind: "Army",
    province: "",
    home: "",
    food: 0,
    savings: 0,
    hungry: 0,
    unpaid: 0,
    men: 0,
    march: null,
    along: 0,
    commander: null,
    commandFrom: 0,
    mandate: null,
    mandateFrom: 0,
    relieveAt: null,
    trail: [],
    hiredMen: 0,
    hiredUntil: null,
    hiredChief: null,
    buy: false,
    chest: 0,
    since: 0,
    raisedAt: "",
    goneTurn: 0,
    ...init,
  };
}

export const UnitSchema: ObjSchema<Unit> = obj("Unit", newUnit, {
  id: S,
  power: S,
  kind: S,
  province: S,
  home: S,
  food: I,
  savings: I,
  hungry: I,
  unpaid: I,
  men: I,
  march: opt(S),
  along: I,
  commander: opt(S),
  commandFrom: I,
  mandate: opt(() => MandateSchema),
  mandateFrom: I,
  relieveAt: opt(I),
  trail: list(S),
  hiredMen: I,
  hiredUntil: opt(I),
  hiredChief: opt(S),
  buy: B,
  chest: I,
  since: I,
  raisedAt: S,
  goneTurn: I,
  label: computed(S, (o: Unit) => unitLabel(o)),
});

/**
 * Item 13: a unit's report of one season, as its trail keeps it (`Unit.trail`; read by `trailEntry`), with its commander's
 * record of battles won and lost, if it has one (bug #615).
 */
export const unitReport = (u: Unit, commander: { id: string; won: number; lost: number } | null = null): string =>
  `${u.province}|${u.men}|${u.food}|${u.hungry}|${u.unpaid}|${u.chest}|${u.buy ? 1 : 0}|${u.savings}` + (commander === null ? "" : `|${commander.won}|${commander.lost}|${commander.id}`);

/** Bug #600: how many seasons a unit that left the game is kept among those gone: longer than any word takes. */
export const UnitsGoneKept = 8;

/**
 * A unit leaves the game (destroyed, disbanded, mutinied, lost to winter or plague, folded into another). Bug #600: one
 * its king has reports of is kept among those gone, with them, so his view keeps it as last reported until word of its
 * end could come.
 */
export function loseUnit(s: GameState, u: Unit): void {
  const i = s.units.indexOf(u);
  if (i < 0) return;
  s.units.splice(i, 1);
  keepGone(s, u);
}

/**
 * Bug #600: a unit its king no longer has (it left the game, or passed to another: given away, following a rebel, taken
 * into cargo service) is kept among those gone, as he last heard of it, until word of it could reach him. One with no
 * report yet is not kept: he knows it only as it is, within his couriers' season.
 */
export function keepGone(s: GameState, u: Unit): void {
  // Its newest leaving is the one its king waits to hear of: a copy from an earlier one (a fleet back from cargo service,
  // troops given back) gives way.
  const kept = s.unitsGone.filter((x) => x.goneTurn > s.turn - UnitsGoneKept && !(x.id === u.id && x.power === u.power));
  s.unitsGone = u.trail.length > 0 ? [...kept, { ...u, trail: [...u.trail], goneTurn: s.turn }] : kept;
}

/** "A memphis", "F delta". */
export function unitLabel(u: Unit): string {
  // Item 17+ ("Requests are rules too"): the unit by what it is and where it stands, by the place's own name, never "A memphis".
  return `${u.kind === "Army" ? "army" : "fleet"} in ${WorldMap.default.exists(u.province) ? WorldMap.default.get(u.province).name : u.province}`;
}
