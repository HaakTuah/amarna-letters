/**
 * Bands, a character's soldiers (build order item 11b, "Bands are a character's soldiers", "How many bands", "A head rises
 * where men lack one", "Pirates are bands at sea"): men a chief gathers from a province's loose people and keeps as long as
 * he can pay and feed them. A band is no power: it holds no land, seals nothing and is led by a character.
 */
import { B, I, type ObjSchema, S, obj } from "../core/json.ts";

export interface Band {
  id: string;
  /** Its chief, a character (duty "Leading"): the men follow him. */
  leaderId: string;
  /** The land province it works. A band with a ship also works the sea beside that coast. */
  province: string;
  men: number;
  /** A ship, bought in a port: a band with one is a pirate crew ("Pirates are bands at sea"). */
  ship: boolean;
  /** What it took last season, in shekels' worth, and what its men cost: the share its men weigh against the roads alone. */
  take: number;
  cost: number;
  /** Seasons in a row it could not pay and feed its men. */
  short: number;
  /** The season it was gathered. */
  since: number;
  /** How its chief rose (`crowd`, `mutiny`, `refugees`, `successor`, `split`, `outlaw`), for the report and its facts. */
  rose: string;
}

export function newBand(init: Partial<Band> = {}): Band {
  return { id: "", leaderId: "", province: "", men: 0, ship: false, take: 0, cost: 0, short: 0, since: 0, rose: "crowd", ...init };
}

export const BandSchema: ObjSchema<Band> = obj("Band", newBand, { id: S, leaderId: S, province: S, men: I, ship: B, take: I, cost: I, short: I, since: I, rose: S });

/**
 * First guesses (item 18 tunes them).
 * - `crowd`: the loose men a province needs before one of them may rise as a chief; `riseScale`: each this many more adds
 *   a percent to the chance a season, at most `riseMost`; a band already working there or next door halves it (each).
 * - `startShare`: of the crowd, the share in a hundred who follow a new chief at once, at most `startMost`.
 * - `robPermille`: what a band takes of its province's purse and stores, times its men / (men + `robHalf`): organised men
 *   take more than the same number loose; halved where the holder's troops stand (`LandData.policedPercent`).
 * - `menCost`: what a man costs a season in shekels a thousand men, his food and his share: more than a levy is paid,
 *   since he risks his neck (about three times the army's rate).
 * - `chiefCut`: of what is left over, the chief's share in a hundred, from 20 for the generous to 50 for the greedy.
 * - `joinPercent`: of the loose men the surplus could pay, the share who join a season; `leavePercent` leave a season short.
 * - `shortMutiny`: seasons short after which the men turn on their chief; `least`: fewer men than this and it melts away.
 * - `splitMen`: a band short this large may split instead: a lieutenant walks off with `splitPercent` of the men.
 * - `successorPercent`: the chance a band that lost its chief raises one of its own, plus a percent for each 10 men.
 * - `shipCost`: a ship bought in a port (spent at its market); `shipMen`: the men a band needs to man one.
 * - `roadOdds`: a band's road check in its province (and, with a ship, the sea beside), times men / (men + `roadHalf`).
 * - `killPercent`: the chance a traveller a band robs is killed ("the road", "Natural losses").
 * - `huntLoss`: of a band caught by an army hunting it, the share of its men lost, in a hundred; `captureChief` the
 *   chance its chief is taken.
 * - `mutinyHead`: the chance in a hundred that a mutinous unit follows one of its own as a band, plus a percent for each
 *   500 men; `refugeesHead` the chance a fallen court's refugees raise one.
 * - `outlawWait`: seasons unhired after which a poor, bold free person may take to the hills; `gatherLoose` the crowd it
 *   needs where it stands or next door.
 * - `wayBack`: a chief whose band is down to this many men gives up the road.
 */
export const BandData = {
  crowd: 3000,
  riseScale: 3000,
  riseMost: 8,
  startShare: 2,
  startMost: 80,
  robPermille: 15,
  robHalf: 100,
  menCost: 20,
  chiefCut: { least: 20, most: 50 },
  joinPercent: 20,
  leavePercent: 20,
  shortMutiny: 3,
  least: 10,
  splitMen: 200,
  splitPercent: 33,
  successorPercent: 40,
  shipCost: 40,
  shipMen: 30,
  roadOdds: 20,
  roadHalf: 200,
  killPercent: 10,
  huntLoss: 40,
  captureChief: 25,
  mutinyHead: 20,
  refugeesHead: 50,
  outlawWait: 6,
  gatherLoose: 500,
  wayBack: 15,
} as const;

/** What a band's men cost a season, in shekels: their food and their share. */
export function bandCost(men: number): number {
  return Math.ceil((men * BandData.menCost) / 1000);
}
