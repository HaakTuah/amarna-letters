/**
 * The script kings' names (build order item 17+, "A power's name is a claim"). A king who holds the capital of a realm
 * greater than his own claims its name, as the man who takes Ashur may call himself king of Aššur, since the name carries
 * that realm's brotherhood and its vassals' oaths; he keeps his own otherwise. Where two claim one name, his greetings
 * give it to the claimant his stakes favour: a bond friend or a friend, else the one holding the realm's capital, else the
 * one whose own land it is. `NamePlay` turns both off, for tests.
 */
import { AllPowers, claimName, isGreatKing, ownLand, tier, type Order, type Power, type Tier } from "@amarna/engine";
import type { Board } from "./board.ts";
import type { Brain } from "./brain.ts";

/** On for every script king, or (`only`) for these alone, to compare the two sides on the same seeds. */
export const NamePlay: { on: boolean; only: ReadonlySet<string> | null } = { on: true, only: null };

const playsNames = (p: Power): boolean => NamePlay.on && (NamePlay.only === null || NamePlay.only.has(p));

const Rank: Record<Tier, number> = { Strong: 3, Middle: 2, Weak: 1, City: 0 };

/** The power whose own land a name is, among the powers the map starts with; null for none. */
function realmOf(name: string): Power | null {
  return AllPowers.find((p) => ownLand(p) === name) ?? null;
}

/** The capital province of the realm a name belongs to, as the map draws it; null for none. */
function capitalOf(b: Board, name: string): string | null {
  const r = realmOf(name);
  if (r === null) return null;
  try {
    return b.Map.capital(r).id;
  } catch {
    return null;
  }
}

/** A claim to the name of the greatest realm whose capital this king holds, when it is greater than his own. */
export function nameClaims(b: Board, orders: Order[]): void {
  const v = b.v;
  // A Great King keeps his own name however much he takes, as Hatti and Assyria kept theirs.
  if (!playsNames(v.power) || isGreatKing(v.power)) return;
  let best: Power | null = null;
  for (const r of AllPowers) {
    if (r === v.power || !b.isMine(capitalOf(b, ownLand(r)) ?? "")) continue;
    if (Rank[tier(r)] <= Rank[tier(v.power)]) continue;
    if (best === null || Rank[tier(r)] > Rank[tier(best)]) best = r;
  }
  const name = best !== null ? ownLand(best) : ownLand(v.power);
  if (name !== v.claimedName) orders.push(claimName(name));
}

/**
 * Whether a greeting to `to` calls him by his house: where another claims the name he claims too and this king's stakes
 * give it to that other.
 */
export function byHouse(b: Board, brain: Brain, to: Power): boolean {
  const v = b.v;
  if (!playsNames(v.power)) return false;
  const c = v.nameClaims.find((x) => x.claimants.includes(to));
  if (c === undefined) return false;
  if (c.claimants.includes(v.power)) return to !== v.power;
  const friends = c.claimants.filter((x) => brain.bondFriends.has(x));
  const liked = c.claimants.filter((x) => brain.isFriend(x));
  const cap = capitalOf(b, c.name);
  const holder = c.claimants.filter((x) => cap !== null && b.ownerOf(cap) === x);
  const own = c.claimants.filter((x) => x === realmOf(c.name));
  const choice = [friends, liked, holder, own].find((l) => l.length === 1)?.[0] ?? c.givenTo ?? c.claimants[0];
  return choice !== to;
}
