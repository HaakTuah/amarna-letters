/**
 * The kings as persons (build order item 17b, "Attested characters" under Characters): no realm keeps a temper of its own;
 * each ruler has his own traits, set from what the sources show the man did, and a realm changes when its king does. The
 * kings of 1346 here; the record of the kings who followed in `docs/history/16-the-kings-who-followed.md`. Each game varies a king's traits by a seeded amount within a narrow band
 * (`ReignData.vary`, about 10 points either way, as for every attested character), so the essence holds while no game is
 * the same. Every trait runs from 0 to 100.
 */
import { Rng } from "../core/rng.ts";
import { cmpNum, desc, sortBy } from "../core/seq.ts";
import { B, I, S, type ObjSchema, list, obj } from "../core/json.ts";
import { type FixedPower, type Power, heirOf, risenOf } from "./power.ts";

/** The traits a king plays by, in this order wherever they are kept as a list. */
export const KingTraitValues = ["aggression", "caution", "honesty", "greed", "generosity", "pride", "diplomacy", "cunning", "vengeance", "commerce"] as const;
export type KingTrait = (typeof KingTraitValues)[number];

/**
 * What the sources show of a king: a short epithet, a line on what he did, and his traits in {@link KingTraitValues}'s
 * order: appetite for war; weight on keeping what he has; keeping oaths and telling the truth; hoarding gold; sending
 * gifts; caring about titles; writing letters and building coalitions; spies, bribes and forgeries; how long he remembers
 * a wrong; trade over conquest.
 */
export interface KingNature {
  readonly epithet: string;
  readonly description: string;
  readonly traits: readonly number[];
  /**
   * The Great Kings' (item 17b): the dossier lines each deed rests on (checked by `history-anchors.test.ts`), and how sure
   * the reading of the man is, by the dossiers' grades: B, an inference from his deeds most would share; C, where a part
   * of it is disputed or unknown (Ashur-uballit's honesty); G, a first guess where the sources are silent. The city-states' rulers rest on their rulers' lines (`RulerAnchors`) as item 11+ set them.
   */
  readonly anchors?: readonly string[];
  readonly grade?: "B" | "C" | "G";
}

const n = (epithet: string, description: string, traits: readonly number[], anchors?: readonly string[], grade?: "B" | "C" | "G"): KingNature => ({ epithet, description, traits, anchors, grade });

/**
 * The rulers of 1346, from the politics and people dossiers: the Great Kings as the item names them, the city-states' as
 * their letters show them (item 11+).
 */
export const Natures: Record<FixedPower, KingNature> = {
  // Item 17b: the kings on the thrones in 1346, set from what each did as the sources show, deeds over the tone of his
  // letters ("Attested characters" under Characters, with the design session's corrections).
  Egypt: n(
    "the king of the sun-disc",
    "Proud and slow to answer, keeping foreign envoys for years; ungenerous with gold, sending gilded wood for the solid gold his father promised (EA 27, 29); unwarlike, though he could summon a vassal sternly (EA 162).",
    [20, 60, 50, 60, 25, 90, 40, 40, 50, 60],
    ["01-akhenaten", "09-tushratta-statues", "09-tushratta-envoys", "01-aziru"],
    "B",
  ),
  Hatti: n(
    "the patient conqueror",
    "Patient, a master of treaties and marriages, cunning, and aggressive when he strikes; he keeps the treaty forms, yet broke the Kurustama treaty with Egypt.",
    [70, 60, 50, 45, 45, 75, 80, 80, 60, 30],
    ["01-suppiluliuma", "01-kurustama", "01-babylonia-hatti"],
    "B",
  ),
  Babylonia: n(
    "keeper of the old order",
    "Proud of his rank, counting every shekel of a gift, refusing to call upstarts brother, and loyal to his treaty with Egypt.",
    [30, 65, 70, 75, 35, 95, 70, 40, 55, 60],
    ["01-burna-buriash", "01-egypt-babylonia", "01-babylonia-assyria", "14-kurigalzu-refusal"],
    "B",
  ),
  Mitanni: n(
    "the loving brother",
    "Lavish, loyal and proud, writing to Pharaoh as his equal and loving brother, and sending rich gifts to keep the friendship of his fathers.",
    [40, 45, 75, 30, 90, 85, 80, 35, 55, 50],
    ["01-tushratta", "01-egypt-mitanni"],
    "B",
  ),
  Assyria: n(
    "the upstart who would be brother",
    "Ambitious, claiming the brotherhood of the Great Kings and marrying his daughter into Babylon; his honesty the sources do not show.",
    [70, 45, 50, 55, 45, 80, 70, 60, 55, 45],
    ["01-ashur-uballit", "01-egypt-assyria", "06-muballitat-sherua"],
    "C",
  ),
  Arzawa: n(
    "the western opportunist",
    "Unknown in 1346: a first guess from his land's push east while Hatti was weak, ready to take land from a weak neighbour.",
    [60, 50, 50, 55, 40, 60, 55, 45, 50, 50],
    ["01-tarhundaradu", "01-hatti-arzawa"],
    "G",
  ),
  Alashiya: n(
    "the copper merchant",
    "A trader who keeps his word and calls Pharaoh brother, paying in copper rather than fighting.",
    [15, 75, 80, 55, 55, 50, 75, 35, 35, 95],
    ["01-king-of-alashiya", "01-egypt-alashiya"],
    "B",
  ),

  Kaska: n("the burner of Hattusa", "Chiefs of the hill villages who raid the Hittite lands and bow to no king.", [80, 30, 40, 60, 20, 50, 20, 50, 70, 10]),
  Lukka: n("the sea raider", "Seafarers without a king who fall on Alashiya year by year.", [75, 30, 35, 70, 20, 40, 25, 60, 50, 40]),
  // Item 11d: Arzawa's two lands of their own rulers, and Hana under Mitanni
  Seha: n("the river land of the west", "Kings of the Seha River Land, Arzawa's allies more than its subjects, with harbours on the Aegean.", [40, 55, 50, 55, 40, 50, 55, 50, 50, 65]),
  Mira: n("the hill kingdom", "Kings of Mira beside Arzawa, who go with whoever rules the west.", [45, 55, 50, 50, 40, 55, 55, 50, 55, 40]),
  Terqa: n("the land of Hana", "Local kings of Hana on the middle Euphrates, within Mitanni's reach.", [35, 60, 55, 50, 40, 45, 55, 45, 50, 55]),
  Isuwa: n("the buffer", "A small kingdom between Hatti and Mitanni that goes with whoever is stronger.", [30, 75, 50, 50, 40, 40, 60, 55, 40, 40]),
  Carchemish: n("the warden of the crossing", "Mitanni's city on the Euphrates crossing, proud of its walls.", [40, 65, 60, 50, 40, 60, 50, 40, 50, 60]),
  Alalakh: n("the king of Mukish", "Mitanni's vassal on the Orontes, quick to join a league against a neighbour who changes sides.", [50, 50, 50, 50, 40, 50, 60, 50, 60, 50]),
  Aleppo: n("the city of the Storm-god", "An old royal city under Mitanni, rich and wary.", [35, 65, 55, 55, 45, 70, 55, 45, 50, 60]),
  Ugarit: n("the merchant port", "A rich harbour writing to Pharaoh as a servant while it weighs the Hittite's offer.", [20, 70, 50, 60, 50, 40, 75, 60, 30, 95]),
  Nuhashshe: n("the contested land", "Kings of Nuhashshe who ask Egypt for help against the Hittite, and change sides when they must.", [45, 55, 45, 50, 40, 50, 60, 55, 50, 40]),
  Qadesh: n("the turncoat", "Aitakama, who goes over to the Hittite and raids Pharaoh's lands with Hittite backing.", [70, 40, 25, 60, 30, 55, 50, 75, 60, 30]),
  Qatna: n("the loyal city", "Akizzi, who writes to Pharaoh of his loyalty and of Aitakama's treachery.", [30, 60, 75, 40, 50, 50, 70, 35, 50, 40]),
  Arwad: n("the island of ships", "Its ships blockade Byblos in league with Amurru.", [60, 45, 40, 65, 30, 50, 45, 60, 50, 80]),
  Amurru: n("the house of Abdi-Ashirta", "Aziru, who builds a state by playing Egypt against Hatti and takes the coast towns.", [85, 30, 20, 70, 30, 60, 70, 90, 60, 30]),
  Byblos: n("the pleading servant", "Rib-Hadda, loyal to Pharaoh, begging for troops and grain in letter after letter.", [15, 85, 80, 40, 40, 50, 90, 30, 60, 50]),
  Sidon: n("the wavering port", "Zimrida, Pharaoh's servant in name, friend to Aziru in deed.", [45, 50, 30, 60, 35, 45, 60, 70, 40, 75]),
  Damascus: n("the warden of Upe", "Biryawaza, Pharaoh's man in the Damascus land, with a hand in his neighbours' quarrels.", [55, 50, 50, 55, 40, 55, 55, 55, 50, 40]),
  Tyre: n("the island short of water", "Abi-Milku, loyal and hard pressed by Sidon from the mainland.", [20, 75, 70, 50, 45, 45, 80, 40, 50, 80]),
  Megiddo: n("the guard of the pass", "Biridiya, loyal, calling for men to guard his city.", [30, 75, 70, 45, 40, 45, 65, 40, 55, 45]),
  Shechem: n("the sons of Labaya", "Labaya's sons, taking their neighbours' towns while swearing they are Pharaoh's loyal servants.", [80, 30, 25, 65, 30, 55, 50, 75, 70, 30]),
  Jerusalem: n("the accuser", "Abdi-Heba, pleading for archers and denouncing his neighbours as traitors.", [30, 70, 55, 45, 35, 50, 75, 60, 70, 35]),
  Akko: n("the bribed harbour", "Surata, whose men killed Babylon's merchants, and who took Labaya captive and let him go for a bribe.", [45, 50, 25, 75, 35, 45, 55, 70, 40, 75]),
  Hazor: n("the king of Hazor", "Abdi-Tirshi of the largest town in Canaan, who calls himself king and keeps Pharaoh's city for him.", [45, 60, 50, 55, 40, 70, 60, 45, 60, 45]),
  Gezer: n("the accused", "Milkilu, accused of giving the king's land to the Habiru, protesting his loyalty and taking what he can.", [65, 40, 30, 65, 35, 50, 60, 70, 60, 35]),
  Ashkelon: n("the provisioner", "Yidya, who sends grain, oxen and sheep for Pharaoh's archers and asks little.", [20, 80, 75, 40, 45, 40, 80, 35, 50, 60]),
  Lachish: n("the hill fort", "Zimreddi of Lachish, Pharaoh's servant in a strong town of the lowland.", [40, 65, 55, 50, 40, 55, 60, 45, 50, 45]),
  Gath: n("the feuding lord", "Shuwardata of Gath and the southern hills, at feud with Abdi-Heba over the town of Qiltu.", [70, 40, 40, 60, 30, 55, 55, 60, 75, 30]),
  // Item 17+: the Lady of the Lions, who wrote to Pharaoh of the Habiru pressing her valley (EA 273-274): cautious, loyal, pleading.
  Aijalon: n("the lady of the lions", "Baʿlat-nese of the Aijalon valley, Pharaoh's servant between Gezer and Jerusalem, hard pressed by the Habiru.", [30, 70, 50, 45, 35, 60, 65, 40, 45, 40]),
  Suteans: n("the steppe raiders", "Herding tribes whose chiefs rob travellers and hire out as fighters.", [70, 35, 35, 70, 20, 35, 30, 60, 50, 30]),
  Arrapha: n("the land of Nuzi", "Mitanni's vassal beyond the Tigris, close to Assyria's reach.", [30, 65, 60, 50, 45, 45, 55, 40, 45, 55]),
  // Item 11f's places
  Azzi: n("the highland lord", "Hukkana of Hayasa, sworn to Suppiluliuma and wed to his sister, lord of mountain strongholds that raided the Upper Land.", [60, 45, 40, 55, 30, 60, 45, 55, 60, 25]),
  Niya: n("the elephant country", "Takuwa of Niya on the Orontes, between Mitanni and the Hittite, whose own brother would rise against him.", [35, 65, 50, 50, 40, 45, 60, 50, 45, 45]),
  Tunip: n("the weeping city", "The elders of Tunip, who write to Pharaoh as one and beg him to save them from Aziru.", [20, 80, 70, 45, 45, 40, 75, 35, 45, 55]),
  Beirut: n("the host of exiles", "Ammunira of Beirut, Pharaoh's servant, who took in Rib-Hadda when Byblos shut its gates on him.", [30, 65, 55, 50, 50, 40, 70, 45, 40, 70]),
  Pella: n("the son of Labaya", "Mut-Bahlu of Pella beyond the Jordan, who hid Ayyab and swore he did not know where he was.", [60, 45, 25, 60, 30, 50, 55, 75, 60, 35]),
  Ashtaroth: n("the fugitive lord", "Ayyab of Ashtaroth, who took a city of Pharaoh's and fled when called to answer for it.", [55, 50, 35, 60, 30, 50, 50, 65, 50, 35]),
  Shasu: n("the herders of Edom", "Shasu chiefs of the Negev and Edom, who rob the roads past their pastures and hire out their men.", [70, 35, 35, 70, 20, 40, 30, 60, 50, 25]),
  Libya: n("the western raiders", "Chiefs of the Tjehenu and Tjemehu, herders on the Delta's western edge who raid its fields.", [75, 35, 35, 70, 20, 50, 25, 55, 60, 15]),
  Elam: n("the king beyond the circle", "A kingdom outside the Great Kings' circle, watching Babylon.", [50, 55, 50, 55, 35, 75, 40, 50, 60, 50]),
};

/** A power's king of 1346's traits as the sources show him; none (a middling ruler) for a power risen in play. */
export function natureTraits(p: Power): readonly number[] {
  return fixedNature(p)?.traits ?? [];
}

const fixedNature = (p: Power): KingNature | undefined => (Natures as Record<string, KingNature | undefined>)[p];

/** First guesses (item 18 tunes them): how far a game varies each trait either way. */
export const ReignData = { vary: 10 };

/**
 * The reign of a power's king: his traits as this game drew them, the season he began to reign, and (part B) the person he
 * is (his character's id), and, for an heir,
 * his name and what the record shows of him (empty for the king the game began with, or a ruler risen in play, whose
 * names are his power's).
 */
export interface Reign {
  traits: number[];
  since: number;
  character: string;
  name: string;
  about: string;
  /** His place on his realm's record of the kings who followed (`model/heirs.ts`): -1 for the king the game began with. */
  line: number;
  /** Item 17b, part C2: an heir raised in exile after his realm fell, whose claim others see only as it reaches them. */
  exiled: boolean;
}

export function newReign(init: Partial<Reign> = {}): Reign {
  return { traits: [], since: 1, character: "", name: "", about: "", line: -1, exiled: false, ...init };
}

export const ReignSchema: ObjSchema<Reign> = obj("Reign", newReign, {
  traits: list(I),
  since: I,
  character: S,
  name: S,
  about: S,
  line: I,
  exiled: B,
});

/** A reign ended by the king's death (part B): whose, who he was, from when to when, and how he died, in words ("put to death by Hatti"). */
export interface ReignEnded {
  power: Power;
  character: string;
  since: number;
  until: number;
  how: string;
}

export const ReignEndedSchema: ObjSchema<ReignEnded> = obj("ReignEnded", (init: Partial<ReignEnded> = {}) => ({ power: "Egypt", character: "", since: 1, until: 1, how: "", ...init }), {
  power: S,
  character: S,
  since: I,
  until: I,
  how: S,
});

/** Item 18: the range a rolled trait is drawn from (`GameConfig.rolledTraits`), a first guess. */
export const RolledRange = [15, 85] as const;

/** Item 18: a king's nature rolled for the game, each trait within `RolledRange`, in place of the sources'. */
export function rolledNature(seed: number, p: Power): number[] {
  const r = Rng.for(seed, 0, "rolled-nature", p);
  return KingTraitValues.map(() => r.range(RolledRange[0], RolledRange[1]));
}

/** A king's traits for a game: his nature's, each moved by a seeded amount within `ReignData.vary`. */
export function drawTraits(seed: number, p: Power, nature: readonly number[]): number[] {
  const r = Rng.for(seed, 0, "reign", p);
  return nature.map((v) => Math.max(0, Math.min(100, v + r.range(-ReignData.vary, ReignData.vary))));
}

/**
 * A ruler risen in play (item 13+) was a character before he ruled: his traits as a king come from his own, his ambition
 * his appetite for war, his fear his caution, his loyalty his honesty and his greed his greed, on a city's middling
 * weights for the rest.
 */
export function risenTraits(t: { ambition: number; courage: number; loyalty: number; greed: number }): number[] {
  const w = (x: number): number => Math.round(20 + 0.6 * x);
  return [w(t.ambition), w(100 - t.courage), w(t.loyalty), w(t.greed), 40, 50, 55, 50, 50, 50];
}

/** What is known of a power's king for display: a ruler of 1346's nature, a risen ruler's story, or an heir's line (his traits are his reign's). */
export function natureOf(p: Power): { epithet: string; description: string } {
  // Part B: a realm's heir, as the record shows him.
  const heir = heirOf(p);
  if (heir !== null) return { epithet: "the heir", description: heir.about };
  const fixed = fixedNature(p);
  if (fixed !== undefined) return fixed;
  const r = risenOf(p);
  return { epithet: "the risen ruler", description: `${r?.king ?? "A ruler"}, who rules ${r?.land ?? p} in his own name${r === null || r.from === "" ? "" : `, once ${r.from}'s`}.` };
}

/** Each trait's word when high and when low, in `KingTraitValues`' order. */
const Words: readonly (readonly [string, string])[] = [
  ["warlike", "peaceable"],
  ["cautious", "reckless"],
  ["honest", "faithless"],
  ["greedy", "open-handed"],
  ["generous", "stingy"],
  ["proud", "humble"],
  ["diplomatic", "aloof"],
  ["cunning", "guileless"],
  ["vengeful", "forgiving"],
  ["mercantile", "martial"],
];

/** The three traits furthest from the middle, in words ("proud", "stingy", "peaceable"), the furthest first. */
export function standout(traits: readonly number[]): string[] {
  return sortBy(
    Words.map((w, i) => ({ w, v: traits[i] ?? 50, i })),
    [(x) => Math.abs(x.v - 50), desc(cmpNum)],
  )
    .slice(0, 3)
    .map((x) => (x.v >= 50 ? x.w[0] : x.w[1]));
}
