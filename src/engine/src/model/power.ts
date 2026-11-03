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
  byName.clear();
  renaming.clear();
}

/** Adds a power risen in play to the registry (the game state keeps it too). */
export function addRisen(r: RisenPower): void {
  if (risenData.has(r.power)) return;
  risenData.set(r.power, r);
  powerIndex.set(r.power, live.length);
  live.push(r.power);
  byName.clear();
  renaming.clear();
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
  Egypt: d("Egypt", "Naphurureya", "Egyptian", "Strong", "Akhenaten", ["Neferkheperure Waenre", "Amenhotep IV"]),
  Hatti: d("Hatti", "Suppiluliuma", "Hittite", "Strong"),
  Babylonia: d("Karduniash", "Burna-Buriash", "Babylonian", "Strong"),
  Mitanni: d("Mitanni", "Tushratta", "Mitannian", "Middle"),
  Assyria: d("Assyria", "Ashur-uballit", "Assyrian", "Middle"),
  Arzawa: d("Arzawa", "Tarhundaradu", "Arzawan", "Weak"),
  Alashiya: d("Alashiya", "the King of Alashiya", "Alashiyan", "Weak"),
  Kaska: d("Kaska", "the chief of the Kaska", "Kaskan"),
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
  Shasu: d("Seir", "the chief of the Shasu", "Shasu"),
  Libya: d("Tjehenu", "the chief of the Tjehenu", "Libyan"),
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
  Suteans: d("Sutu", "the chief of the Suteans", "Sutean"),
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

/** Every name a fixed power's table gives it: its id, its land's, its king's, his own court's and his others. */
export function namesOf(p: FixedPower): string[] {
  const x = Data[p];
  return [p, x.land, x.king, ...(x.home !== null ? [x.home] : []), ...x.others];
}

/** The land's name a power started with, or rose with: the name it claims unless it claims another (item 17+). */
export function ownLand(p: Power): string {
  return dataOf(p).land;
}

/**
 * Item 17+ ("A power's name is a claim"): the name each power in play claims, where it claims another than its own land's
 * (`GameState.names`); the names each court has read in the claimants' sealed greetings
 * (`GameState.namesHeard`), since a court learns of a claim only from the claimant's own letters; and whom each court gives a
 * contested name to (`GameState.nameGiven`). Mirrored here, as the risen powers are, for the functions that name a power
 * without the state.
 */
const claimed = new Map<string, string>();
const fallenNow = new Set<string>();
const givenBy = new Map<string, Map<string, string>>();
const heardBy = new Map<string, Map<string, string>>();
/** The falls each court has heard of (`GameState.fallsHeard`): only these it knows to claim nothing. */
const fallsBy = new Map<string, Set<string>>();
let viewerNow: Power | null = null;
/** Each court's claimants by name, as it knows them, reckoned when first asked. */
const byName = new Map<string, Map<string, Power[]>>();
/** Each court's renaming of the engine's words ({@link namedFor}), reckoned when first asked; null: it renames nothing. */
const renaming = new Map<string, { swaps: Map<string, string>; name: RegExp } | null>();
/** Whether any power claims another name, or any court has read a claim of one: else nobody renames anything. */
let anyClaim = false;

type Pairs<V> = Iterable<[string, V]>;

/** Sets the name claims to a game's (`GameState.names`, `nameGiven`, `namesHeard` and the fallen, who claim nothing). */
export function setNameClaims(
  names: Pairs<string>,
  fallen: Iterable<Power>,
  given: Pairs<Pairs<string>> = [],
  heard: Pairs<Pairs<{ name: string }>> = [],
  falls: Pairs<Iterable<Power>> = [],
): void {
  claimed.clear();
  fallsBy.clear();
  for (const [court, l] of falls) fallsBy.set(court, new Set(l));
  fallenNow.clear();
  givenBy.clear();
  heardBy.clear();
  for (const [p, name] of names) claimed.set(p, name);
  for (const p of fallen) fallenNow.add(p);
  for (const [court, m] of given) givenBy.set(court, new Map(m));
  for (const [court, m] of heard) heardBy.set(court, new Map([...m].map(([q, h]) => [q, h.name])));
  byName.clear();
  renaming.clear();
  anyClaim = claimed.size > 0 || [...heardBy.values()].some((m) => [...m].some(([q, n]) => n !== ownLand(q)));
}

/**
 * Names powers as `viewer`'s court knows and gives them while `fn` runs (its seat view, its requests). Without a viewer,
 * names are the engine's own: each power by its own land's name.
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
  return claimed.get(p) ?? ownLand(p);
}

/**
 * The name a power goes by as `viewer`'s court knows it: its own claim for itself, else the name the claimant's last
 * greeting to it styled him by, else his own land's.
 */
export function knownName(viewer: Power, p: Power): string {
  if (viewer === p) return claimedName(p);
  return heardBy.get(viewer)?.get(p) ?? ownLand(p);
}

/**
 * Whether `viewer`'s court knows `p` to have fallen: it has heard word of the fall (`GameState.fallsHeard`), or has fallen
 * itself and sees what every fallen seat sees, as its seat view's `fallen` does.
 */
function fallenFor(viewer: Power, p: Power): boolean {
  return fallenNow.has(p) && (fallenNow.has(viewer) || (fallsBy.get(viewer)?.has(p) ?? false));
}

/** The powers in play claiming a name, in their order, as `viewer`'s court knows them (the falls it has heard of left out). */
export function claimantsOf(name: string, viewer: Power): Power[] {
  let m = byName.get(viewer);
  if (m === undefined) {
    m = new Map();
    for (const p of AllPowers) {
      if (fallenFor(viewer, p)) continue;
      const n = knownName(viewer, p);
      const l = m.get(n);
      if (l === undefined) m.set(n, [p]);
      else l.push(p);
    }
    byName.set(viewer, m);
  }
  return m.get(name) ?? [];
}

/** The names two or more powers in play claim, as `viewer`'s court knows them. */
export function contestedNames(viewer: Power): string[] {
  claimantsOf("", viewer);
  return [...byName.get(viewer)!.entries()].filter(([, l]) => l.length > 1).map(([n]) => n);
}

/** The names a power may claim (item 17+): every realm's the map knows or a power rose with, and every name claimed. */
export function claimableNames(): string[] {
  const out = new Set<string>();
  for (const p of AllPowers) out.add(ownLand(p));
  for (const c of claimed.values()) out.add(c);
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
 * Whom a court gives a contested name to: itself, if it claims it; else the claimant its greetings last named so
 * (`GameState.nameGiven`), if he still claims it as the court knows; else the power whose own land it is, if he still
 * claims it as the court knows (it has read no greeting of his claiming another); else nobody, and every claimant is
 * called by his house. Only a court gives names: the engine's logs and god view name each power by its own land.
 */
export function nameGivenBy(viewer: Power, name: string): Power | null {
  const cs = claimantsOf(name, viewer);
  if (cs.length === 0) return null;
  if (cs.length === 1) return cs[0];
  if (cs.includes(viewer)) return viewer;
  const g = givenBy.get(viewer)?.get(name);
  if (g !== undefined && cs.includes(g)) return g;
  // A claimant known by his own land's name is one whose newest greeting the court has read claims nothing else, whatever
  // he has claimed since out of its hearing.
  return cs.find((p) => ownLand(p) === name) ?? null;
}

/** A power's name as `viewer`'s court knows and gives it: the name it claims, or its house where the court gives that name to another. */
export function landFor(viewer: Power, p: Power): string {
  // A fallen power claims nothing, once the court has heard of the fall: it goes by its own land's name, or by its house
  // where another still claims that name.
  if (fallenFor(viewer, p)) return claimantsOf(ownLand(p), viewer).length > 0 ? house(p) : ownLand(p);
  const name = knownName(viewer, p);
  if (claimantsOf(name, viewer).length < 2) return name;
  return nameGivenBy(viewer, name) === p ? name : house(p);
}

/**
 * The land's name as it appears in letters (item 17+): as the court naming it knows and gives it, inside `asSeenBy`; else
 * the engine's own, each power by its own land's name, which {@link namedFor} turns into the recipient's names when a
 * notice is written to a court.
 */
export function land(p: Power): string {
  return viewerNow === null ? ownLand(p) : landFor(viewerNow, p);
}

/**
 * A power as a player reads it named, in every notice and on every screen: its land's name as the court gives it
 * ({@link land}: Gubla, Sutu, the Seha River Land), Babylonia by that name rather than its land's Karduniash, which the
 * letters keep. One form for every power, so one name means one power wherever it is read.
 */
export function powerName(p: Power): string {
  const l = land(p);
  return p === "Babylonia" && l === ownLand(p) ? "Babylonia" : l;
}

/** {@link powerName} as `viewer`'s court gives it: how a notice written to that court names the power. */
export function powerNameFor(viewer: Power, p: Power): string {
  return asSeenBy(viewer, () => powerName(p));
}

/** ", Hatti's land" after a province's name, or nothing where the province bears its power's name (Lakisha, Lakisha's land). */
export function whoseLand(place: string, p: Power | null): string {
  return p === null || powerName(p).replace(/^the /, "") === place.replace(/^the /, "") ? "" : `, ${whose(p)} land`;
}

/**
 * A court's name at the head of a carrier's line about it ("Gubla keeps one army…", "Gubla holds …"): the words a reader
 * tests to find what a court's own people showed its visitor (a bribed envoy drops them).
 */
export function courtHead(p: Power): string {
  const n = powerName(p);
  return n.length === 0 ? n : n[0].toUpperCase() + n.slice(1);
}

/** {@link powerName} with its possessive: "Hatti's", "the Seha River Land's". */
export function whose(p: Power): string {
  const n = powerName(p);
  return n.endsWith("s") ? `${n}'` : `${n}'s`;
}

/** Someone's own words the engine quotes in a notice, marked where they are written (`quoteWords`) so no renaming touches them. */
const Marked = /"\uE000([^\uE000\uE001]*)\uE001"/gu;
/** Words between double quotes the engine wrote without marking them: closed before a space, a stop or the end. */
const Quoted = /(?<=^|[\s(])"[^"]*"(?=$|[\s.,;:!?)\]\u2014])/gu;

/**
 * Someone's own words (a sealed greeting, a letter, what a king, an envoy or a captive said) as a notice quotes them:
 * between double quotes, and marked so that {@link namedFor} leaves them as they were written.
 */
export function quoteWords(words: string): string {
  return `"\uE000${words.replace(/[\uE000\uE001]/gu, "")}\uE001"`;
}

/** A notice's text with the marks of what it quotes taken out, its names left as they are. */
export function unmarked(text: string): string {
  return text.replace(/[\uE000\uE001]/gu, "");
}

/** The renaming of `viewer`'s court: each own-land name it knows or gives otherwise, and the pattern that finds them. */
function renamingOf(viewer: Power): { swaps: Map<string, string>; name: RegExp } | null {
  let r = renaming.get(viewer);
  if (r === undefined) {
    const swaps = new Map<string, string>();
    for (const p of AllPowers) {
      const own = ownLand(p);
      const seen = landFor(viewer, p);
      if (seen === own) continue;
      swaps.set(own, seen);
      // A name that begins with "the" begins a sentence with "The".
      if (own.startsWith("the ")) swaps.set("T" + own.slice(1), seen);
      // The name the engine gives it where that is not its land's (Babylonia).
      const shown = asSeenBy(null, () => powerName(p));
      if (shown !== own) swaps.set(shown, seen);
    }
    const names = [...swaps.keys()].sort((x, y) => y.length - x.length).map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    r = swaps.size === 0 ? null : { swaps, name: new RegExp(`(?<![\\p{L}-])(?:${names.join("|")})(?![\\p{L}])`, "gu") };
    renaming.set(viewer, r);
  }
  return r;
}

/** The engine's own narration renamed, a name at the head of a sentence capitalised; what it quotes unmarked is left. */
function renamed(text: string, r: { swaps: Map<string, string>; name: RegExp }, before: string): string {
  const one = (part: string, prior: string): string =>
    part.replace(r.name, (m: string, at: number) => {
      const seen = r.swaps.get(m)!;
      return /(?:^|[.!?]["')\]]*\s+|\n\s*)["'(]*$/u.test(prior + part.slice(0, at)) ? seen[0].toUpperCase() + seen.slice(1) : seen;
    });
  let out = before;
  let from = 0;
  for (const q of text.matchAll(Quoted)) {
    out += one(text.slice(from, q.index), out) + q[0];
    from = q.index + q[0].length;
  }
  return (out + one(text.slice(from), out)).slice(before.length);
}

/**
 * The engine's words, which name each power by its own land's name, with the names `viewer`'s court knows and gives
 * (item 17+): so a name in a notice means the same power it means in the rest of what the court reads. Only the engine's
 * own narration is renamed: what it quotes (`quoteWords`, or else between double quotes) stays as it was written, and a land's
 * name joined to a word before it ("Bit-Hatti") is not a power's name and is left. The marks of the quotes are taken out.
 */
export function namedFor(viewer: Power, text: string): string {
  const r = anyClaim ? renamingOf(viewer) : null;
  if (r === null) return unmarked(text);
  let out = "";
  let from = 0;
  for (const q of text.matchAll(Marked)) {
    out += renamed(text.slice(from, q.index), r, out) + `"${q[1]}"`;
    from = q.index + q[0].length;
  }
  return out + renamed(text.slice(from), r, out);
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

/**
 * A king's other names, shown only on his card when one clicks him, never in a letter, report or request (item 17+): every
 * name the sources give him besides the one this viewer's court uses ({@link kingFor}): his own court's name for a
 * foreign court, the letters' name for his own. Names from the sources, the same in every game, not a court's knowledge of the game.
 */
export function kingOtherNames(viewer: Power | null, p: Power): readonly string[] {
  const x = dataOf(p);
  const shown = kingFor(viewer, p);
  return [x.home, x.king, ...x.others].filter((n): n is string => n !== null && n !== shown);
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
