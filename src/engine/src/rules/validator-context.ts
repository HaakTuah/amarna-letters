/**
 * What the order validator knows while it checks one seat's orders for a season: the state, what earlier orders in the
 * list have already claimed, and the shared refusals. Built by `OrderValidator.validate` and read by the checks split
 * from it (validator-armies.ts, validator-economy.ts, validator-people.ts).
 */
import type { HSet } from "../core/collections.ts";
import type { WorldMap } from "../model/map.ts";
import type { HireOrder, Order } from "../model/orders.ts";
import type { Character } from "../model/people.ts";
import type { Power } from "../model/power.ts";
import type { GameState } from "../model/state.ts";
import type { Unit } from "../model/units.ts";
import type { WorkKind } from "../model/works.ts";

export interface Checking {
  readonly S: GameState;
  readonly Map: WorldMap;
  readonly power: Power;
  readonly orders: readonly Order[];
  readonly assayed: HSet<string>;
  readonly roadsSet: HSet<string>;
  readonly ceded: HSet<string>;
  /** The kinds and provinces given a build order this season, as `kind:province` (item 15). */
  readonly fortified: HSet<string>;
  readonly sallied: HSet<string>;
  readonly orderedUnits: HSet<string>;
  readonly raisedIn: HSet<string>;
  readonly busyCharacters: HSet<string>;
  readonly ransomed: HSet<string>;
  readonly renewed: HSet<string>;
  readonly hiredNow: HSet<string>;
  readonly tollsSet: HSet<string>;
  readonly taxesSet: HSet<string>;
  readonly peopleSet: HSet<string>;
  readonly dispatches: number;
  readonly seekCount: number;
  readonly counterIntel: boolean;
  /**
   * Bug #600: the court's unit gone, whose end it has not heard of, that an order of command, recall, mandate or food names
   * (TurnEngine.sendOrders): checked as one that stands; null for any other.
   */
  gone(o: Order): Unit | null;
  heardFallen(x: Power): boolean;
  Sight(): HSet<string>;
  /** Who this court knows holds the province (bug #467): as it sees it, or as word last brought it; null for none or the sea. */
  knownOwner(province: string): Power | null;
  /** Whether this court knows the province besieged (bug #517): as it sees it, or as word of the siege has come. */
  knownSiege(province: string): boolean;
  /** The walls of the province as this court knows them (bug #517): as it sees them, or as it last saw them. */
  knownWalls(province: string): number;
  /** The level of a kind in a province of its own as this court knows it (bug #540): as its view shows its works. */
  knownWork(kind: WorkKind, province: string): number;
  nobody(id: string): string;
  covered(c: Character): boolean;
  hireRefusal(h: HireOrder): [string | null, Character | null];
  errandRefusal(o: { what?: string | null; where?: string | null; frees?: string | null }): string | null;
  errandFits(id: string, what: string, where: string): string | null;
  spend(cost: number): string | null;
  /** #587: as `spend` for a cost paid where its province is; beyond the season's reach, its coffer or a bill pays it: nothing is reserved. */
  spendAt(province: string, cost: number): string | null;
  /** Whether a province lies beyond the season's reach of this court, where gold that is there pays (#587). */
  far(province: string): boolean;
  ownUnit(province: string): [string | null, Unit | null];
  ownCharacter(id: string, mustBeHome?: boolean): string | null;
}
