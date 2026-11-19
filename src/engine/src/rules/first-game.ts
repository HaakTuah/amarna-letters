/**
 * The first game ("The player's screen", build order item 18b): a setup for an evening, offered first on the start
 * screen, where the screen is built and tried first. Egypt, Hatti and Mitanni with the city-states and chiefs between
 * them, the other powers absent, and the random ending on a short curve; every rule as in the full game ("Different data,
 * same rules"). Its numbers are first guesses for the balance pass.
 */
import { newGameConfig, type GameConfig } from "../model/config.ts";
import { PowerValues, type Power } from "../model/power.ts";
import { isAlive, type GameState } from "../model/state.ts";
import type { WorldMap } from "../model/map.ts";

/**
 * The powers of the first game: the three Great Kings, Isuwa between Hatti and Mitanni, the cities of Syria and Canaan
 * and the coast between all three, and the chiefs of the steppe (the Suteans) and of Seir (the Shasu) on their roads.
 * Kaska and Azzi beyond Hatti, the lands of western Anatolia, Libya beyond Egypt, and Terqa, Arrapha and Elam towards
 * Babylonia and Assyria are not between them, and stay out with the other Great Kings.
 */
export const FirstGamePowers: readonly Power[] = [
  "Egypt",
  "Hatti",
  "Mitanni",
  "Isuwa",
  "Carchemish",
  "Alalakh",
  "Aleppo",
  "Ugarit",
  "Niya",
  "Nuhashshe",
  "Tunip",
  "Qadesh",
  "Qatna",
  "Arwad",
  "Amurru",
  "Byblos",
  "Beirut",
  "Sidon",
  "Damascus",
  "Tyre",
  "Akko",
  "Hazor",
  "Ashtaroth",
  "Megiddo",
  "Shechem",
  "Pella",
  "Gezer",
  "Jerusalem",
  "Ashkelon",
  "Lachish",
  "Aijalon",
  "Gath",
  "Shasu",
  "Suteans",
];

/** The powers absent from the first game: every other power the map starts with. */
export const FirstGameAbsent: readonly Power[] = PowerValues.filter((p) => !FirstGamePowers.includes(p));

/**
 * The first game's table settings: those powers absent, and the age ending on a short curve, half of all games by the
 * twentieth season and none past a cap drawn in secret from 28 to 32 (first guesses: "a median about 20 seasons, a cap
 * near 30").
 */
export function firstGameConfig(init: Partial<GameConfig> = {}): GameConfig {
  return newGameConfig({ absent: [...FirstGameAbsent], endMedian: 20, capped: true, capMin: 28, capMax: 32, ...init });
}

/** Whether a table's absent powers are the first game's. */
export function isFirstGame(c: GameConfig): boolean {
  return c.absent.length === FirstGameAbsent.length && FirstGameAbsent.every((p) => c.absent.includes(p));
}

/**
 * Leaves the absent powers out of a new game, before its first season: their land unruled and long known so to every
 * court, and beyond the map the game is played on (`WorldMap.play`), so nothing moves, travels, grows or rises there;
 * their troops, tablets, debts and claims gone, their people with them (a servant of a present court standing at an
 * absent one is at home instead), and every present court's ties and every province's loyalty to them gone. Every court
 * starts knowing who is in the game: an absent power is no news, and no fall.
 */
export function leaveOut(s: GameState, m: WorldMap, absent: readonly Power[]): void {
  const out = new Set(absent);
  if (out.size === 0) return;
  const gone = (p: Power | null): boolean => p !== null && out.has(p);
  for (const p of m.landProvinces) {
    if (!gone(s.owner.getOrDefault(p.id, null))) continue;
    s.owner.set(p.id, null);
    s.ownerLog.push({ province: p.id, turn: 0, owner: null });
  }
  for (const p of absent) if (!s.eliminated.includes(p)) s.eliminated.push(p);
  s.units = s.units.filter((u) => !gone(u.power));
  for (const id of [...s.armies.keys()]) if (!s.units.some((u) => u.id === id)) s.armies.delete(id);
  s.works = s.works.filter((w) => s.owner.getOrDefault(w.province, null) !== null);
  s.tablets = s.tablets.filter((t) => !t.seals.some(gone) && !gone(t.proposedBy) && !gone(t.partner));
  s.copies = s.copies.filter((k) => !gone(k.holder) && s.tablets.some((t) => t.id === k.tabletId));
  s.debts = s.debts.filter((d) => !gone(d.lender) && !gone(d.borrower) && !gone(d.holder));
  s.claims = s.claims.filter((c) => !gone(c.power)).map((c) => (gone(c.overlord) ? { ...c, overlord: null } : c));
  // Their people go with them; a present court's servant at an absent court is at his own instead.
  const before = s.characters.length;
  s.characters = s.characters.filter((c) => !gone(c.employer) && !(c.employer === null && gone(c.at)));
  // The pool's baseline is the people of the world in play: those who left with the absent courts leave it too, so the
  // newcomers do not come to fill their places.
  s.baseline -= before - s.characters.length;
  for (const c of s.characters) {
    if (gone(c.at)) c.at = c.employer;
    c.ties = c.ties.filter((t) => !gone(t.court));
  }
  const kept = new Set(s.characters.map((c) => c.id));
  s.governors = s.governors.filter((g) => kept.has(g.character));
  for (const book of s.ledger.values()) for (const k of [...book.keys()]) if (gone(k) || (/^c\d+$/u.test(k) && !kept.has(k))) book.delete(k);
  // Nothing left to rule is a fault of the setup, never of play.
  if (![...s.owner.values()].some((o) => o !== null && isAlive(s, o))) throw new Error("A setup must leave at least one power in the game.");
}
