/** The opening of 1346 BCE: the walls, armies, fleets and gold each power starts with. */
import { isGreatKing, type Power } from "./power.ts";
import { WorldMap, type Province, type UnitKind } from "./map.ts";

/**
 * The walls each land province starts with, from 0 (none) to 3, city by city as the walls dossier gives them
 * (`docs/history/12-walls-roads-harbours.md`, "Walls by city", its "Proposed" column), the capitals included (item 15,
 * decided 29 October 2026): walls come from the city, not from its being a capital. So Akhetaten, which had no wall, its
 * defence Egypt's distance, starts with none, and Egypt's forts are raised: Tjaru at the Delta's edge 1, the Second
 * Cataract's forts in Nubia 2; Memphis's open town round its temple enclosure 1; Nineveh, Apasa and Enkomi as the dossier reads them, and Kanesh,
 * by 1346 perhaps deserted, none; the Kassite cities whose old walls their kings kept up 1. Where the sources are silent the level the
 * game had stands (Washukanni and Babylon 3, as capitals) and is marked a guess there. The lands without a town (Kaska,
 * Lukka, the Sutean steppe, Libya, the Shasu) none. Every other land province none, and so it is left out. Since item 15
 * walls are a level like everything built, with upkeep and decay; the walls standing now are the game state's
 * (GameState.walls).
 */
export const StartWalls: ReadonlyMap<string, number> = new Map([
  // The Great Kings' capitals (item 15): Hattusa's double wall and Ashur's on its bluff 3; Washukanni and Babylon, whose
  // walls nobody knows, 3 as capitals [G]; Apasa's citadel and Enkomi's fort 2; Akhetaten none
  ["hattusa", 3], ["babylon", 3], ["ashur", 3], ["washukanni", 3], ["apasa", 2], ["enkomi", 2],
  // Their other cities (item 15): Egypt's forts, Nubia's 2 and Tjaru's in the Delta 1, Memphis's White Walls 1;
  // Sapinuwa's royal city 1 [G]; Nineveh 1, Arbela's citadel 1 [G]; Dur-Kurigalzu's walled palace and
  // the old walls of Sippar, Nippur and Ur, kept up by Kassite kings, 1
  ["nubia", 2], ["delta", 1], ["memphis", 1], ["sapinuwa", 1], ["nineveh", 1], ["arbela", 1],
  ["durkurigalzu", 1], ["sippar", 1], ["nippur", 1], ["ur", 1],
  // The city-states' cities, by the walls dossier (item 11d): Qatna's and Qadesh's great ramparts 3; Carchemish's
  // citadel, Aleppo's, Ugarit's gate and glacis, Byblos's and Shechem's Middle Bronze walls, the islands Arwad and Tyre,
  // and Susa 2; Megiddo (no city wall: its gate and palace), Alalakh, Jerusalem, Nuzi, and the towns nobody has dug 1
  ["qatna", 3], ["qadesh", 3],
  ["carchemish", 2], ["aleppo", 2], ["ugarit", 2], ["arwad", 2], ["byblos", 2], ["tyre", 2], ["shechem", 2], ["susa", 2],
  ["isuwa", 1], ["alalakh", 1], ["nuhashshe", 1], ["amurru", 1], ["sidon", 1], ["damascus", 1], ["megiddo", 1],
  ["jerusalem", 1],
  // Item 11f, by the same reading: Tunip's and Niya's, Beirut's, Pella's and Ashtaroth's towns, which the walls dossier
  // knows nothing of, and Azzi's mountain strongholds (Aripsa, Dukkamma) 1; Libya and the Shasu, no town, none
  ["tunip", 1], ["niya", 1], ["beirut", 1], ["pella", 1], ["ashtaroth", 1], ["azzi", 1], ["arrapha", 1], ["seha", 1], ["mira", 1], ["terqa", 1],
  // Item 11c's six cities of Canaan, by the same reading of the walls dossier: Hazor's great Middle Bronze rampart, still
  // used, 3; the five the dossier does not list 1, as the other towns it knows nothing of
  ["hazor", 3], ["akko", 1], ["gezer", 1], ["ashkelon", 1], ["lachish", 1], ["gath", 1], ["aijalon", 1],
  // Fortresses: Gaza, Egypt's base on the Ways of Horus, 2 [G]
  ["gaza", 2],
  // Walled towns
  ["sumur", 1],
  // Samuha, the Upper Land's royal residence and army base (KBo VI 28), first guess 1
  ["samuha", 1],
]);

export interface StartUnit {
  readonly power: Power;
  readonly kind: UnitKind;
  readonly province: string;
  /** Its men (since item 13, from the armies dossier); null for a full unit of its kind. */
  readonly men: number | null;
  /** Where its men were levied: the province it stands in, or for a fleet in the waters, its port (item 13). */
  readonly home: string;
}

const su = (power: Power, kind: UnitKind, province: string, men: number | null = null, home: string = province): StartUnit => ({ power, kind, province, men, home });

/**
 * Item 13 ("Starting positions come from the sources"): the men a ship carries into a fight, its crew and the soldiers
 * aboard, a first guess [G] from the armies dossier (`docs/history/11-armies-and-fleets.md`, "Fleets": the Uluburun ship,
 * whose crew's size its excavator says cannot be told, with archers and spearmen aboard when ships fought). A fleet's men are its ships times this.
 */
export const MenPerShip = 25;

/**
 * The city-states' own troops at the start. Until item 13 every city kept 50 men for each shekel its land yields a season
 * (item 11+, a first guess), and the lands without a town 250. Since item 13 the armies dossier sets them where it gives a
 * range ("The city-states"): the middle of the range for the cities that fight in the letters (Amurru, Damascus, Shechem,
 * Qatna), the low end for those that only plead (Byblos, Jerusalem, Megiddo, Tyre), and for the rest the old guess kept
 * within the dossier's range; where the dossier gives none, the old guess stands. Arwad, Sidon, Tyre, Byblos and Ugarit
 * also keep the ships the dossier gives them ("Fleets"), in the waters off their city.
 */
const CityRange: Readonly<Record<string, readonly [number, number, "low" | "middle" | null]>> = {
  megiddo: [100, 500, "low"],
  shechem: [100, 500, "middle"],
  jerusalem: [100, 500, "low"],
  akko: [100, 500, null],
  hazor: [100, 500, null],
  gezer: [100, 500, null],
  ashkelon: [100, 500, null],
  lachish: [100, 500, null],
  pella: [100, 500, null],
  ashtaroth: [100, 500, null],
  beirut: [100, 500, null],
  byblos: [200, 500, "low"],
  amurru: [500, 2000, "middle"],
  damascus: [500, 1000, "middle"],
  ugarit: [1000, 3000, null],
  qatna: [500, 2000, "middle"],
  qadesh: [500, 2000, null],
  aleppo: [500, 2000, null],
  alalakh: [500, 2000, null],
  nuhashshe: [500, 2000, null],
  tyre: [100, 500, "low"],
  sidon: [100, 500, null],
  kaska: [1000, 5000, null],
  lukka: [1000, 5000, null],
  steppe: [1000, 5000, null],
};

function cityMen(x: Province): number {
  const old = (x.kingless ? 250 : 50) * x.yield;
  const r = CityRange[x.id];
  if (r === undefined) return old;
  const [low, high, end] = r;
  return end === "low" ? low : end === "middle" ? Math.floor((low + high) / 2) : Math.min(high, Math.max(low, old));
}

/** The ships of the coastal cities (the armies dossier, "Fleets", its "Start from" column), by the city's capital province. */
const CityShips: Readonly<Record<string, number>> = { ugarit: 80, arwad: 20, sidon: 20, tyre: 20, byblos: 10 };

/**
 * Where a city-state's army or ships start elsewhere than its city (item 17+), by the city's capital province: data, read
 * by one rule for every city. Aziru's men need no entry: they stand in Amurru's own land beside Sumur, where Rib-Hadda
 * reports them pressing Egypt's base (EA 103-106) [B; C on the year], not in Sumur itself, since one province holds one
 * unit and Egypt's garrison holds it. Arwad keeps a fleet instead of an army, in its own waters beside Byblos's, whose
 * ships it blockaded with Amurru (EA 98, 105) [A]; Sidon's ships stand in Sidon's waters next to Tyre's, which hold Tyre's
 * own fleet (EA 148-149) [A, B that it was so in 1346]. Labaya's war on Megiddo (EA 244) was over before 1346, so
 * Shechem's men stand at home.
 */
const CityStarts: Readonly<Record<string, { army: string | null }>> = {
  arwad: { army: null },
};

/** The city-states' armies and ships, each in its city but where {@link CityStarts} places it. */
const cityUnits = (): StartUnit[] =>
  WorldMap.default.provinces
    .filter((x) => x.capital && x.home !== null && !isGreatKing(x.home))
    .flatMap((x) => {
      const home = x.home!;
      const armyAt = CityStarts[x.id] === undefined ? x.id : CityStarts[x.id].army;
      const out: StartUnit[] = armyAt === null ? [] : [su(home, "Army", armyAt, cityMen(x), x.id)];
      const ships = CityShips[x.id];
      if (ships !== undefined) out.push(su(home, "Fleet", x.waters ?? x.id, ships * MenPerShip, x.id));
      return out;
    });

/**
 * The Great Kings' armies and fleets at the start, where the sources place them in 1346 (item 17+, "Starting positions come
 * from the sources": a garrison in its city, a field force where it campaigned, an occupier in what it held), at the sizes
 * the armies dossier's "Start from" columns give (item 13): Egypt and Hatti 15,000 men, Mitanni, Babylonia and Arzawa
 * 10,000, Assyria 4,000 and Alashiya 1,500. Egypt's army is "at home and in Nubia" (the armies dossier): at Men-nefer, the
 * army's base [B], at Akhetaten with the king [B], at Waset [G], and in Kush under the viceroy, whose campaign of year 12
 * (or year 2) is Akhenaten's only attested one [B: the Buhen stela, the viceroy's name lost there; C: the year, how many];
 * its garrisons in its centres in Canaan, Gaza and Sumur, a hundred men each [G] (the low end of a town's range; the
 * letters ask for tens to a hundred: EA 244, EA 289); Kumidi's waits for its
 * commissioner (item 17++). Hatti's, recovered under Suppiluliuma and turning to Syria (the politics dossier): at Hattusa,
 * at Samuha, the army base of the Upper Land facing Hayasa and the Kaska [B: Bryce, Letters, p. 28], in Kizzuwatna under Telipinu
 * facing Syria [B], at Tuwanuwa in the Lower Land facing Arzawa [B], and at Nesa and Sapinuwa [G]. Mitanni's, split
 * between Tushratta and Artatama II [B]: at Washukanni, Taidu and Harran, the west where the Hittite war is coming [C].
 * Babylonia's at Babylon, Dur-Kurigalzu (Kurigalzu's royal city) [B], Nippur under its governor [B] and Sippar [G].
 * Assyria's in the Tigris triangle, Ashur, Nineveh and Arbela [B]. Arzawa's at Apasa, its one land. Alashiya's at Enkomi
 * and in the copper hills [G]. Ships: Egypt 40 (at Peru-nefer, the Delta's dockyard [A]), Alashiya 30, Arzawa 10, Hatti 5
 * off Kizzuwatna, each {@link MenPerShip} men. The city-states' are {@link cityUnits}. Until item 13 every unit was a full
 * levy, 5,000 men or a fleet's 2,000; until item 17+ each Great King's men stood in two or three of its cities.
 */
export const StartUnits: readonly StartUnit[] = [
  su("Egypt", "Army", "memphis", 6000),
  su("Egypt", "Army", "akhetaten", 4000),
  su("Egypt", "Army", "thebes", 2200),
  su("Egypt", "Army", "nubia", 2800),
  su("Egypt", "Army", "gaza", 100),
  su("Egypt", "Army", "sumur", 100),
  su("Egypt", "Fleet", "delta", 40 * MenPerShip),
  su("Hatti", "Army", "hattusa", 5500),
  su("Hatti", "Army", "samuha", 3000),
  su("Hatti", "Army", "kizzuwatna", 3000),
  su("Hatti", "Army", "tuwanuwa", 1500),
  su("Hatti", "Army", "nesa", 1000),
  su("Hatti", "Army", "sapinuwa", 1000),
  su("Hatti", "Fleet", "kizzuwatnawaters", 5 * MenPerShip, "kizzuwatna"),
  su("Babylonia", "Army", "babylon", 4000),
  su("Babylonia", "Army", "durkurigalzu", 3000),
  su("Babylonia", "Army", "nippur", 1500),
  su("Babylonia", "Army", "sippar", 1500),
  su("Mitanni", "Army", "washukanni", 5000),
  su("Mitanni", "Army", "harran", 3000),
  su("Mitanni", "Army", "taidu", 2000),
  su("Assyria", "Army", "ashur", 2000),
  su("Assyria", "Army", "nineveh", 1000),
  su("Assyria", "Army", "arbela", 1000),
  su("Arzawa", "Army", "apasa", 10000),
  su("Arzawa", "Fleet", "apasawaters", 10 * MenPerShip, "apasa"),
  su("Alashiya", "Army", "enkomi", 1000),
  su("Alashiya", "Army", "kalavasos", 500),
  su("Alashiya", "Fleet", "enkomiwaters", 30 * MenPerShip, "enkomi"),
  ...cityUnits(),
];

/**
 * The treasuries at the start (since item 9+a, set from the sources as "Starting positions come from the sources" asks;
 * the dossiers give no sums, so these are proportions marked [G]): Egypt by far the richest, "in my brother's land gold is
 * as plentiful as dirt" (EA 19); Babylonia, which reckoned in gold from Egypt's gifts, and Mitanni, which received them,
 * next; Alashiya rich from its copper; Hatti, Assyria and Arzawa least. Until item 9+a: 600, 300, 650, 500, 350, 300, 350.
 */
export const StartGold: ReadonlyMap<Power, number> = new Map<Power, number>([
  ["Egypt", 900],
  ["Hatti", 300],
  ["Babylonia", 600],
  ["Mitanni", 450],
  ["Assyria", 300],
  ["Arzawa", 300],
  ["Alashiya", 400],
  // The city-states (item 11+): four seasons of what their land yields, a first guess for item 18 (the dossiers give no sums).
  ...WorldMap.default.provinces.filter((x) => x.capital && x.home !== null && !isGreatKing(x.home)).map((x) => [x.home!, 4 * x.yield] as [Power, number]),
]);
