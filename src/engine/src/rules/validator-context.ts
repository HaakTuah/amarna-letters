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
import type { GameState, Unit } from "../model/state.ts";

export interface Checking {
  readonly S: GameState;
  readonly Map: WorldMap;
  readonly power: Power;
  readonly orders: readonly Order[];
  readonly assayed: HSet<string>;
  readonly roadsSet: HSet<string>;
  readonly ceded: HSet<string>;
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
  heardFallen(x: Power): boolean;
  Sight(): HSet<string>;
  nobody(id: string): string;
  covered(c: Character): boolean;
  hireRefusal(h: HireOrder): [string | null, Character | null];
  errandRefusal(o: { what?: string | null; where?: string | null }): string | null;
  errandFits(id: string, what: string, where: string): string | null;
  spend(cost: number): string | null;
  ownUnit(province: string): [string | null, Unit | null];
  ownCharacter(id: string, mustBeHome?: boolean): string | null;
}
