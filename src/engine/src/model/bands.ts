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
  /** What it took on the roads and at sea since its last season, in shekels' worth, and what its men cost a season. */
  take: number;
  cost: number;
  /** Item 17++++a: what it took in all last season, in shekels' worth: what its chief gives up to serve or to leave. */
  took: number;
  /** Seasons in a row it could not pay and feed its men. */
  short: number;
  /** The season it was gathered. */
  since: number;
  /** How its chief rose (`crowd`, `mutiny`, `refugees`, `successor`, `split`, `outlaw`), for the report and its facts. */
  rose: string;
  /** Item 17: the seasons it has stood in `heldAt`, land without a ruler, with its chief wanting it (the new Idrimi). */
  held: number;
  heldAt: string;
  /**
   * Item 17++++a: the land beyond the map it is based in, by its name in the doors' data (`Doors`), or "" for a band of
   * the map's own loose men. A band based beyond the map came through that land's door and may go home through it.
   */
  from: string;
  /** Item 17++++a: the people it carried off where it robbed, kept until it goes home with them or they go free. */
  captives: number;
  /** Item 17++++a: the king who paid it to keep out of his land (`pay_off`), and the last season it keeps out; "" if none. */
  paidBy: string;
  paidUntil: number;
}

export function newBand(init: Partial<Band> = {}): Band {
  return { id: "", leaderId: "", province: "", men: 0, ship: false, take: 0, cost: 0, took: 0, short: 0, since: 0, rose: "crowd", held: 0, heldAt: "", from: "", captives: 0, paidBy: "", paidUntil: 0, ...init };
}

export const BandSchema: ObjSchema<Band> = obj("Band", newBand, { id: S, leaderId: S, province: S, men: I, ship: B, take: I, cost: I, took: I, short: I, since: I, rose: S, held: I, heldAt: S, from: S, captives: I, paidBy: S, paidUntil: I });

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
 * - `shortMutiny`: seasons short after which the men of a band of `splitMen` or more turn on their chief; `least`: fewer men than this and it melts away.
 * - `splitMen`: a band short this large may split instead: a lieutenant walks off with `splitPercent` of the men.
 * - `successorPercent`: the chance a band that lost its chief raises one of its own, plus a percent for each 10 men.
 * - `shipCost`: a ship bought in a port (spent at its market); `shipMen`: the men a band needs to man one.
 * - `roadOdds`: a band's road check in its province (and, with a ship, the sea beside), times men / (men + `roadHalf`).
 * - `huntLoss`: of a band caught by an army hunting it, the share of its men lost, in a hundred; `captureChief` the
 *   chance its chief is taken.
 * - `mutinyHead`: the chance in a hundred that a mutinous unit follows one of its own as a band, plus a percent for each
 *   500 men; `refugeesHead` the chance a fallen court's refugees raise one.
 * - `outlawWait`: seasons unhired after which a poor, bold free person may take to the hills; `gatherLoose` the crowd it
 *   needs where it stands or next door; `outlawAgain`: seasons after giving up the road before a script person turns
 *   outlaw again.
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
  huntLoss: 40,
  captureChief: 25,
  mutinyHead: 20,
  refugeesHead: 50,
  outlawWait: 8,
  outlawAgain: 12,
  gatherLoose: 500,
  wayBack: 15,
} as const;

/** What a band's men cost a season, in shekels: their food and their share. */
export function bandCost(men: number): number {
  return Math.ceil((men * BandData.menCost) / 1000);
}

/**
 * What a band of `men` robs a season of `of` (a purse, or stores), where the land is policed down to `policed` in a hundred:
 * organised men take more than the same number loose.
 */
export function bandRobs(men: number, of: number, policed: number): number {
  return Math.floor((Math.floor((of * BandData.robPermille * men) / (1000 * (men + BandData.robHalf))) * policed) / 100);
}

/**
 * What a script chief asks to give up his band's work for `term` seasons, to serve a king (item 13) or to leave his land
 * (item 17++++a): what his men cost him and take on the roads over the term, whichever is more, and his own cut by his greed.
 */
export function chiefAsks(b: Band, greed: number, term: number): number {
  return Math.max(bandCost(b.men), b.took) * term + Math.floor((bandCost(b.men) * term * greed) / 100);
}
