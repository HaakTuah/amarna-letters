/**
 * Raiders from beyond the map (build order item 17++++a; War, "Pirates are bands at sea"): crews and bands based beyond
 * the map's edge, as the Lukka who raided Alashiya year by year (EA 38) and the Sherden of the Gubla letters. They come
 * through the doors (`Doors`, each with how hard raiders press through it and which lands beyond send them), act by the
 * rules of every band, and go home with their spoils and captives, or melt away. How often they come follows the season,
 * the sea and the policing of the coast they reach, never a scripted event.
 */
import { Doors, type Beyond, type Door } from "./doors.ts";

/**
 * First guesses (item 18 tunes them).
 * - `most`: the chance in a hundred a season that raiders come through the door raiders press hardest through, onto a
 *   coast nobody polices, in the sailing season; a door's `raids` scales it.
 * - `winterLand`: in winter raiders over land come this share as often, in percent; nobody sails in winter.
 * - `fleetPercent`: the landing coast's holder's fleet on the waters off it holds a crew's chance down to this share.
 * - `ships`: a crew comes in 1 to this many ships of `BandData.shipMen` men; `landMen` the fewest and most of a band over land.
 * - `purse`: the fewest and most shekels its chief brings.
 * - `spoils`: seasons of its men's cost in its chief's purse, after which a script chief goes home content.
 * - `stay`: seasons a band over land stays at most before it turns home.
 * - `reach`: how many provinces from its door a band over land roams, so it can still go home.
 * - `captivesPercent`: of its men, the share in a hundred of the settled it carries off a season where it robs.
 * - `returnPercent`: the chance in a hundred that a chief who went home through this door leads the next raid himself.
 */
export const RaiderData = {
  most: 20,
  winterLand: 50,
  fleetPercent: 50,
  ships: 4,
  landMen: { least: 40, most: 160 },
  purse: { least: 5, most: 30 },
  spoils: 6,
  stay: 4,
  reach: 2,
  captivesPercent: 10,
  returnPercent: 50,
} as const;

/** The door a land beyond the map comes through, and that land; null if no door's data names it. */
export function raidersHome(land: string): { door: Door; beyond: Beyond } | null {
  for (const door of Doors) {
    const beyond = door.beyond.find((b) => b.land === land);
    if (beyond !== undefined) return { door, beyond };
  }
  return null;
}
