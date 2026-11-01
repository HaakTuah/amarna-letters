/**
 * The powers, in their fixed order (C#'s enum order: sorting goes by it): the seven Great Kings of the Amarna
 * correspondence, then, since build order item 11+ ("City-states as powers"), the city-states and the lands under one
 * leader, each a power like the kings ("One scoreboard for every power"), north to south and west to east. Who they are
 * comes from the politics dossier (`docs/history/01-politics.md`).
 */
export const PowerValues = [
  "Egypt",
  "Hatti",
  "Babylonia",
  "Mitanni",
  "Assyria",
  "Arzawa",
  "Alashiya",
  "Kaska",
  "Lukka",
  "Seha",
  "Mira",
  "Isuwa",
  "Azzi",
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
  "Libya",
  "Terqa",
  "Suteans",
  "Arrapha",
  "Elam",
] as const;
/** The powers the map starts with. */
export type FixedPower = (typeof PowerValues)[number];
/**
 * A power: one the map starts with, or, since item 13+, one risen in play, named by its land (a fallen kingdom's
 * governor ruling his province with a seat of his own; item 17's free cities will rise the same way).
 */
export type Power = FixedPower | (string & {});

/** How a power is reckoned at the start: data, never a rule ("Different data, same rules"). */
export const TierValues = ["Strong", "Middle", "Weak", "City"] as const;
export type Tier = (typeof TierValues)[number];

/** The powers the map starts with, in their fixed order. */
export const FixedPowers: readonly Power[] = PowerValues;

/**
 * A power risen in play (item 13+): its names, its capital and the temper its ruler brings to the seat. Kept in the game
 * state (`GameState.risen`); the registry below mirrors it for the functions that name a power without the state.
 */
export interface RisenPower {
  power: string;
  /** The land's name in letters: its province's. */
  land: string;
  /** The ruler: the character who rose, by name. */
  king: string;
  /** His character's id. */
  ruler: string;
  /** Its one province, its capital. */
  capital: string;
  /** The season it rose. */
  turn: number;
  /** The kingdom it was part of. */
  from: string;
  /** His traits as a seat's temper (aggression, caution, honesty, greed), in hundredths, for script seats. */
  temper: number[];
  /**
   * How he came to rule (item 17): `governor` (his kingdom fell), `turned` (a governor who refused his recall), `revolt`
   * (he led his province's revolt), `chief` (a chief or a commander who held land without a ruler) or `elder` (lawless land's
   * own people raised him).
   */
  how: string;
}

const live: Power[] = [...PowerValues];
const risenData = new Map<string, RisenPower>();

/** Every power in play's order: the fixed powers, then those risen in play, as they rose. Changes only with `setRisen`. */
export const AllPowers: readonly Power[] = live;

/** Sets the powers risen in play to a game's (`GameState.risen`): a new game's none, a loaded game's its own. */
export function setRisen(list: readonly RisenPower[]): void {
  live.length = PowerValues.length;
  risenData.clear();
  powerIndex.clear();
  PowerValues.forEach((p, i) => powerIndex.set(p, i));
  for (const r of list) addRisen(r);
  byName = null;
}

/** Adds a power risen in play to the registry (the game state keeps it too). */
export function addRisen(r: RisenPower): void {
  if (risenData.has(r.power)) return;
  risenData.set(r.power, r);
  powerIndex.set(r.power, live.length);
  live.push(r.power);
  byName = null;
}

/** A power risen in play, or null for one the map starts with. */
export function risenOf(p: Power): RisenPower | null {
  return risenData.get(p) ?? null;
}

/** The seven Great Kings, who call each other brother: presentation and the claims to the rank (item 8), never a rule. */
export const GreatKings: readonly Power[] = PowerValues.slice(0, 7);

const powerIndex = new Map<string, number>(PowerValues.map((p, i) => [p, i]));
/** A power's place in the order (its enum value in C#; a risen power's after every fixed one, as it rose). */
export function powerOrdinal(p: Power): number {
  return powerIndex.get(p) ?? Number.MAX_SAFE_INTEGER;
}

/** Powers in their order (C#'s OrderBy on the enum), risen powers after the fixed ones. */
export const cmpPower = (a: Power, b: Power): number => powerOrdinal(a) - powerOrdinal(b);

/** Whether a power is one of the seven Great Kings (presentation: greetings, titles, the start's words). */
export function isGreatKing(p: Power): boolean {
  return powerOrdinal(p) < 7;
}

interface PowerData {
  /** The land's name as letters use it. */
  readonly land: string;
  /** The reigning ruler in 1346, by the name the letters use; "the king of ..." where the sources name none. */
  readonly king: string;
  readonly adjective: string;
  readonly tier: Tier;
  /** The name his own court uses, when it differs from the letters' (Egypt's Akhenaten); null: the same. */
  readonly home: string | null;
  /** His other names, for his card alone. */
  readonly others: readonly string[];
}

const d = (land: string, king: string, adjective: string, tier: Tier = "City", home: string | null = null, others: readonly string[] = []): PowerData => ({ land, king, adjective, tier, home, others });

/**
 * Each power's names. The Great Kings' as before; the city-states' rulers from the politics dossier ("The Levant and
 * northern Syria, city by city"): Shechem under Labaya, who starts the game though he was probably dead by 1346 ("What
 * earns a place"; until item 11f Mut-Baal, his son, who rules Pella from then); the lands without a king
 * (Kaska, Lukka, the Suteans) under a chief ("Land without a ruler").
 */
const Data: Record<FixedPower, PowerData> = {
  // Item 17+ ("Places by their own names"): foreign courts and their letters call Pharaoh Naphurureya, as the letters do;
  // Egypt's own seat says Akhenaten; his other names show only on his card.
  Egypt: d("Egypt", "Naphurureya", "Egyptian", "Strong", "Akhenaten", ["Neferkheperure Waenre", "Amenhotep IV", "Naphurureya in the letters of other courts"]),
  Hatti: d("Hatti", "Suppiluliuma", "Hittite", "Strong"),
  Babylonia: d("Karduniash", "Burna-Buriash", "Babylonian", "Strong"),
  Mitanni: d("Mitanni", "Tushratta", "Mitannian", "Middle"),
  Assyria: d("Assyria", "Ashur-uballit", "Assyrian", "Middle"),
  Arzawa: d("Arzawa", "Tarhundaradu", "Arzawan", "Weak"),
  Alashiya: d("Alashiya", "the King of Alashiya", "Alashiyan", "Weak"),
  Kaska: d("the Kaska lands", "the chief of the Kaska", "Kaskan"),
  Lukka: d("Lukka", "the chief of the Lukka men", "Lukkan"),
  // Item 11d: Arzawa's lands with their own rulers, and Hana under Mitanni (the politics dossier names no ruler of 1346)
  Seha: d("the Seha River Land", "the king of the Seha River Land", "Sehan"),
  Mira: d("Mira", "the king of Mira", "Miran"),
  Terqa: d("Hana", "the king of Hana", "Hanean"),
  Isuwa: d("Isuwa", "the king of Isuwa", "Isuwan"),
  // Item 11f's places, their rulers from the politics and people dossiers: Hukkana (his treaty, Beckman no. 3), Takuwa of
  // Niya (the Shattiwaza treaty), Tunip's elders writing as one with no king named (EA 59), Ammunira (EA 141-143),
  // Mut-Bahlu at Pella and Ayyab at Ashtaroth (EA 255-256, 364), and the chiefs of the Shasu and the Tjehenu
  Azzi: d("Hayasa", "Hukkana", "Hayasan"),
  Niya: d("Niya", "Takuwa", "Niyan"),
  Tunip: d("Tunip", "the king of Tunip", "Tunipite"),
  Beirut: d("Biruta", "Ammunira", "Beirutite"),
  Pella: d("Pihil", "Mut-Bahlu", "Pellan"),
  Ashtaroth: d("Ashtartu", "Ayyab", "Ashtarothite"),
  Shasu: d("the land of the Shasu", "the chief of the Shasu", "Shasu"),
  Libya: d("the land of the Tjehenu", "the chief of the Tjehenu", "Libyan"),
  Carchemish: d("Karkamish", "the king of Karkamish", "Carchemishite"),
  Alalakh: d("Mukish", "Itur-Addu", "Mukishite"),
  Aleppo: d("Halab", "the king of Halab", "Halabite"),
  Ugarit: d("Ugarit", "Niqmaddu", "Ugaritic"),
  Nuhashshe: d("Nuhashshe", "Addu-nirari", "Nuhashshean"),
  Qadesh: d("Qadesh", "Aitakama", "Qadeshite"),
  Qatna: d("Qatna", "Akizzi", "Qatnean"),
  Arwad: d("Arwada", "the king of Arwada", "Arwadite"),
  Amurru: d("Amurru", "Aziru", "Amorite"),
  Byblos: d("Gubla", "Rib-Hadda", "Byblian"),
  Sidon: d("Ṣiduna", "Zimrida", "Sidonian"),
  Damascus: d("Upe", "Biryawaza", "Damascene"),
  Tyre: d("Ṣurru", "Abi-Milku", "Tyrian"),
  Megiddo: d("Magidda", "Biridiya", "Megiddite"),
  Shechem: d("Shakmu", "Labaya", "Shechemite"),
  Jerusalem: d("Urusalim", "Abdi-Heba", "Jerusalemite"),
  // Item 11c's six cities of Canaan, their rulers from the politics dossier (EA 8, 227-228, 245, 280-290, 320-326)
  Akko: d("Akka", "Surata", "Akkoite"),
  Hazor: d("Hasura", "Abdi-Tirshi", "Hazorite"),
  Gezer: d("Gazru", "Milkilu", "Gezerite"),
  Ashkelon: d("Ashqaluna", "Yidya", "Ashkelonite"),
  Lachish: d("Lakisha", "Zimreddi", "Lachishite"),
  // Item 17+: Shuwardata's land centred on Gath, his likely seat (Gimti in the letters; Hebron had no town in the Late
  // Bronze Age), and the Lady of the Lions, Baʿlat-nese, who wrote to Pharaoh from the Aijalon valley (EA 273-274). Suhu,
  // which the dossiers do not show as a polity in 1346, is Babylonia's land.
  Gath: d("Gimti", "Shuwardata", "Gittite"),
  Aijalon: d("Ayyaluna", "Baʿlat-nese", "Ayyalunite"),
  Suteans: d("the Sutean steppe", "the chief of the Suteans", "Sutean"),
  Arrapha: d("Arrapha", "the king of Arrapha", "Arraphan"),
  Elam: d("Elam", "the king of Elam", "Elamite"),
};

/** A power's tier at the start (data for script players' styles and the start screen; no rule reads it). */
export function tier(p: Power): Tier {
  return dataOf(p).tier;
}

/** A power's names: a fixed power's from the table, a risen one's from its rising (its land's name, its ruler's). */
function dataOf(p: Power): PowerData {
  const fixed = (Data as Record<string, PowerData | undefined>)[p];
  if (fixed !== undefined) return fixed;
  const r = risenData.get(p);
  // A risen power is named by its land, so a page that has not seen it rise still names it.
  return d(r?.land ?? p, r?.king ?? `the ruler of ${p}`, r?.land ?? p, "City");
}

/** The land's name a power started with, or rose with: the name it claims unless it claims another (item 17+). */
export function ownLand(p: Power): string {
  return dataOf(p).land;
}

/**
 * Item 17+ ("A power's name is a claim"): the name each power in play claims, where it claims another than its own land's
 * (`GameState.names`), the season it claimed it, and whom each court gives a contested name to (`GameState.nameGiven`),
 * mirrored here, as the risen powers are, for the functions that name a power without the state.
 */
const claimed = new Map<string, { name: string; since: number }>();
const fallenNow = new Set<string>();
const givenBy = new Map<string, Map<string, string>>();
let viewerNow: Power | null = null;

/** Sets the name claims to a game's (`GameState.names`, `nameGiven` and the fallen, who claim nothing). */
export function setNameClaims(
  names: Iterable<[string, { name: string; since: number }]>,
  fallen: Iterable<Power>,
  given: Iterable<[string, Iterable<[string, string]>]> = [],
): void {
  claimed.clear();
  fallenNow.clear();
  givenBy.clear();
  for (const [p, c] of names) claimed.set(p, { name: c.name, since: c.since });
  for (const p of fallen) fallenNow.add(p);
  for (const [court, m] of given) givenBy.set(court, new Map(m));
  byName = null;
}

/**
 * Names powers as `viewer`'s court gives them while `fn` runs (its seat view, its requests): a contested name goes to the
 * claimant it recognises. Without a viewer, names are the world's record.
 */
export function asSeenBy<T>(viewer: Power | null, fn: () => T): T {
  const before = viewerNow;
  viewerNow = viewer;
  try {
    return fn();
  } finally {
    viewerNow = before;
  }
}

/** Names powers as `viewer`'s court does until changed (the web page names everything as its seat's court does). */
export function setNameViewer(viewer: Power | null): void {
  viewerNow = viewer;
}

/** The name a power claims: its own land's unless it claimed another. */
export function claimedName(p: Power): string {
  return claimed.get(p)?.name ?? ownLand(p);
}

let byName: Map<string, Power[]> | null = null;

/** The powers in play claiming a name, in their order (reckoned once each time the claims or the powers change). */
export function claimantsOf(name: string): Power[] {
  if (byName === null) {
    byName = new Map();
    for (const p of AllPowers) {
      if (fallenNow.has(p)) continue;
      const n = claimedName(p);
      const l = byName.get(n);
      if (l === undefined) byName.set(n, [p]);
      else l.push(p);
    }
  }
  return byName.get(name) ?? [];
}

/**
 * Whom the world's record gives a name to: the power whose own land it is while it claims it, else the one that claimed it
 * first; two who claimed it in the same season share it with nobody (the order of resolution never decides). Null: nobody.
 */
export function holderOfName(name: string): Power | null {
  const cs = claimantsOf(name);
  if (cs.length === 0) return null;
  if (cs.length === 1) return cs[0];
  const own = cs.find((p) => ownLand(p) === name && !claimed.has(p));
  if (own !== undefined) return own;
  const first = Math.min(...cs.map((p) => claimed.get(p)?.since ?? 0));
  const firsts = cs.filter((p) => (claimed.get(p)?.since ?? 0) === first);
  return firsts.length === 1 ? firsts[0] : null;
}

/** The names two or more powers in play claim (item 17+). */
export function contestedNames(): string[] {
  claimantsOf("");
  return [...byName!.entries()].filter(([, l]) => l.length > 1).map(([n]) => n);
}

/** The names a power may claim (item 17+): every realm's the map knows or a power rose with, and every name claimed. */
export function claimableNames(): string[] {
  const out = new Set<string>();
  for (const p of AllPowers) out.add(ownLand(p));
  for (const c of claimed.values()) out.add(c.name);
  return [...out];
}

/** A name as the claimable names spell it, matched in any case; null if none. */
export function nameKnown(name: string): string | null {
  const l = name.trim().toLowerCase();
  return claimableNames().find((n) => n.toLowerCase() === l) ?? null;
}

/** A power's house (item 17+): Bit- and its first king's name (Bit-Biryawaza), or Bit- and its land where he is unnamed. */
export function house(p: Power): string {
  const x = dataOf(p);
  return `Bit-${rulerNamed(p) ? x.king : x.land.replace(/^the land of the |^the /, "")}`;
}

/**
 * Whom a court gives a contested name to: the claimant its greetings last named so (`GameState.nameGiven`), if he still
 * claims it, else the world's record. A court gives its own claimed name to itself.
 */
export function nameGivenBy(viewer: Power | null, name: string): Power | null {
  if (viewer !== null && claimedName(viewer) === name && !fallenNow.has(viewer)) return viewer;
  const g = viewer !== null ? givenBy.get(viewer)?.get(name) : undefined;
  if (g !== undefined && !fallenNow.has(g) && claimedName(g) === name) return g;
  return holderOfName(name);
}

/** A power's name as `viewer`'s court gives it: the name it claims, or its house where the court gives that name to another. */
export function landFor(viewer: Power | null, p: Power): string {
  const name = claimedName(p);
  if (claimantsOf(name).length < 2) return name;
  return nameGivenBy(viewer, name) === p ? name : house(p);
}

/** The land's name as it appears in letters: the name it claims, as the court naming it gives it (item 17+). */
export function land(p: Power): string {
  return landFor(viewerNow, p);
}

/** The reigning king (or chief), by the names the letters use: what foreign courts call him. */
export function king(p: Power): string {
  return dataOf(p).king;
}

/**
 * The king's name as a court uses it (item 17+): his own seat by the name his own court uses (Akhenaten), every other
 * court and every letter by the letters' name (Naphurureya). A viewer of null is the world's record, which uses the letters'.
 */
export function kingFor(viewer: Power | null, p: Power): string {
  const x = dataOf(p);
  return viewer === p && x.home !== null ? x.home : x.king;
}

/** A king's other names, shown only on his card when one clicks him, never in a letter, report or request (item 17+). */
export function kingOtherNames(p: Power): readonly string[] {
  return dataOf(p).others;
}

/** Whether the sources name the ruler: an unnamed one is "the king of ...", and is written so. */
export function rulerNamed(p: Power): boolean {
  return !dataOf(p).king.toLowerCase().startsWith("the ");
}

export function adjective(p: Power): string {
  return dataOf(p).adjective;
}

/**
 * A power named by its name or its land's (any case), as Powers.TryParse reads it; null if none. Like C#'s
 * Enum.TryParse it also takes a power's number ("0" is Egypt).
 */
export function parsePower(s: string | null | undefined): Power | null {
  if (s === null || s === undefined) return null;
  const t = s.trim();
  if (t === "") return null;
  const lower = t.toLowerCase();
  for (const p of AllPowers) if (p.toLowerCase() === lower) return p;
  if (/^[+-]?\d+$/.test(t)) {
    const n = Number(t);
    return n >= 0 && n < AllPowers.length ? AllPowers[n] : null;
  }
  for (const p of AllPowers) if (land(p).toLowerCase() === lower) return p;
  for (const p of AllPowers) if (house(p).toLowerCase() === lower || ownLand(p).toLowerCase() === lower) return p;
  return null;
}

/** An enum value parsed as C#'s Enum.TryParse(ignoreCase: true) does: by name, or by number. */
export function parseEnum<T extends string>(values: readonly T[], s: string | null | undefined): T | null {
  if (s === null || s === undefined) return null;
  const t = s.trim();
  const lower = t.toLowerCase();
  for (const v of values) if (v.toLowerCase() === lower) return v;
  if (/^[+-]?\d+$/.test(t)) {
    const n = Number(t);
    return n >= 0 && n < values.length ? values[n] : null;
  }
  return null;
}
