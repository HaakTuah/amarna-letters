/**
 * How a script king plays. Every weight runs from 0 to 1. Each power has a historical archetype, and every game nudges
 * each weight by a seeded amount, so a king is recognisable from game to game but never quite the same.
 */
import { Rng, clamp, cmpNum, desc, risenOf, sortBy, type FixedPower, type Power } from "@amarna/engine";

export interface Personality {
  readonly epithet: string;
  readonly description: string;
  /** Appetite for war: how readily it attacks land that is not free. */
  readonly aggression: number;
  /** Weight on keeping what it has: troops held back, reserves of gold. */
  readonly caution: number;
  /** Keeps sealed oaths, sends fine gold, tells envoys the truth. */
  readonly honesty: number;
  /** Hoards gold rather than spending it. */
  readonly greed: number;
  /** Sends gifts and returns favours. */
  readonly generosity: number;
  /** Cares about titles: who is called brother and Great King. */
  readonly pride: number;
  /** Writes letters, seals tablets, builds coalitions. */
  readonly diplomacy: number;
  /** Spies, bribes, forgeries and turned captives. */
  readonly cunning: number;
  /** How long it remembers a wrong, and how hard it punishes one. */
  readonly vengeance: number;
  /** Prefers trade and bargains to conquest. */
  readonly commerce: number;
}

const greatArchetypes = {
  Egypt: {
    epithet: "Pharaoh of the gilded gifts",
    description: "Proud and lavish, sends gold to keep the other kings in his debt (not always fine gold), and keeps the cities of Canaan as his vassals.",
    aggression: 0.4,
    caution: 0.6,
    honesty: 0.45,
    greed: 0.35,
    generosity: 0.8,
    pride: 0.9,
    diplomacy: 0.75,
    cunning: 0.5,
    vengeance: 0.5,
    commerce: 0.75,
  },
  Hatti: {
    epithet: "the conqueror of Anatolia",
    description: "Expansionist and impatient, keeps oaths while they serve him, and strikes where a neighbour is weak.",
    aggression: 0.85,
    caution: 0.35,
    honesty: 0.4,
    greed: 0.45,
    generosity: 0.3,
    pride: 0.8,
    diplomacy: 0.5,
    cunning: 0.6,
    vengeance: 0.7,
    commerce: 0.3,
  },
  Babylonia: {
    epithet: "keeper of the old order",
    description: "Rich and status-conscious, counts every shekel of a gift, refuses to call upstarts brother, and fights only to protect his own.",
    aggression: 0.35,
    caution: 0.7,
    honesty: 0.65,
    greed: 0.75,
    generosity: 0.35,
    pride: 1.0,
    diplomacy: 0.7,
    cunning: 0.45,
    vengeance: 0.6,
    commerce: 0.6,
  },
  Mitanni: {
    epithet: "seeker of a patron",
    description: "Squeezed between Hatti and Assyria, courts the great kings with gifts and alliances, and keeps faith with whoever protects him.",
    aggression: 0.3,
    caution: 0.8,
    honesty: 0.75,
    greed: 0.4,
    generosity: 0.7,
    pride: 0.6,
    diplomacy: 0.95,
    cunning: 0.4,
    vengeance: 0.4,
    commerce: 0.5,
  },
  Assyria: {
    epithet: "the upstart who would be brother",
    description: "Ambitious newcomer, claims the title of Great King, pushes hard into Mitanni and Babylonia, and breaks oaths that hold him back.",
    aggression: 0.75,
    caution: 0.4,
    honesty: 0.35,
    greed: 0.5,
    generosity: 0.4,
    pride: 0.85,
    diplomacy: 0.6,
    cunning: 0.65,
    vengeance: 0.65,
    commerce: 0.4,
  },
  Arzawa: {
    epithet: "the western opportunist",
    description: "Survives by being courted, sells his friendship to the highest bidder, and is not above a forged tablet.",
    aggression: 0.5,
    caution: 0.55,
    honesty: 0.3,
    greed: 0.6,
    generosity: 0.35,
    pride: 0.5,
    diplomacy: 0.65,
    cunning: 0.8,
    vengeance: 0.5,
    commerce: 0.55,
  },
  Alashiya: {
    epithet: "the copper merchant",
    description: "Trade partner to all and threat to none: pays tribute rather than fights, and keeps his word.",
    aggression: 0.1,
    caution: 0.9,
    honesty: 0.8,
    greed: 0.55,
    generosity: 0.55,
    pride: 0.4,
    diplomacy: 0.75,
    cunning: 0.35,
    vengeance: 0.3,
    commerce: 1.0,
  },
};

/**
 * The city-states' archetypes (item 11+), from what the letters show of each ruler (the politics dossier); the weights
 * in the order aggression, caution, honesty, greed, generosity, pride, diplomacy, cunning, vengeance, commerce.
 */
const city = (epithet: string, description: string, w: readonly number[]): Personality => ({
  epithet,
  description,
  aggression: w[0],
  caution: w[1],
  honesty: w[2],
  greed: w[3],
  generosity: w[4],
  pride: w[5],
  diplomacy: w[6],
  cunning: w[7],
  vengeance: w[8],
  commerce: w[9],
});

const cityArchetypes: Record<Exclude<FixedPower, "Egypt" | "Hatti" | "Babylonia" | "Mitanni" | "Assyria" | "Arzawa" | "Alashiya">, Personality> = {
  Kaska: city("the burner of Hattusa", "Chiefs of the hill villages who raid the Hittite lands and bow to no king.", [0.8, 0.3, 0.4, 0.6, 0.2, 0.5, 0.2, 0.5, 0.7, 0.1]),
  Lukka: city("the sea raider", "Seafarers without a king who fall on Alashiya year by year.", [0.75, 0.3, 0.35, 0.7, 0.2, 0.4, 0.25, 0.6, 0.5, 0.4]),
  // Item 11d: Arzawa's two lands of their own rulers, and Hana under Mitanni
  Seha: city("the river land of the west", "Kings of the Seha River Land, Arzawa's allies more than its subjects, with harbours on the Aegean.", [0.4, 0.55, 0.5, 0.55, 0.4, 0.5, 0.55, 0.5, 0.5, 0.65]),
  Mira: city("the hill kingdom", "Kings of Mira beside Arzawa, who go with whoever rules the west.", [0.45, 0.55, 0.5, 0.5, 0.4, 0.55, 0.55, 0.5, 0.55, 0.4]),
  Terqa: city("the land of Hana", "Local kings of Hana on the middle Euphrates, within Mitanni's reach.", [0.35, 0.6, 0.55, 0.5, 0.4, 0.45, 0.55, 0.45, 0.5, 0.55]),
  Isuwa: city("the buffer", "A small kingdom between Hatti and Mitanni that goes with whoever is stronger.", [0.3, 0.75, 0.5, 0.5, 0.4, 0.4, 0.6, 0.55, 0.4, 0.4]),
  Carchemish: city("the warden of the crossing", "Mitanni's city on the Euphrates crossing, proud of its walls.", [0.4, 0.65, 0.6, 0.5, 0.4, 0.6, 0.5, 0.4, 0.5, 0.6]),
  Alalakh: city("the king of Mukish", "Mitanni's vassal on the Orontes, quick to join a league against a neighbour who changes sides.", [0.5, 0.5, 0.5, 0.5, 0.4, 0.5, 0.6, 0.5, 0.6, 0.5]),
  Aleppo: city("the city of the Storm-god", "An old royal city under Mitanni, rich and wary.", [0.35, 0.65, 0.55, 0.55, 0.45, 0.7, 0.55, 0.45, 0.5, 0.6]),
  Ugarit: city("the merchant port", "A rich harbour writing to Pharaoh as a servant while it weighs the Hittite's offer.", [0.2, 0.7, 0.5, 0.6, 0.5, 0.4, 0.75, 0.6, 0.3, 0.95]),
  Nuhashshe: city("the contested land", "Kings of Nuhashshe who ask Egypt for help against the Hittite, and change sides when they must.", [0.45, 0.55, 0.45, 0.5, 0.4, 0.5, 0.6, 0.55, 0.5, 0.4]),
  Qadesh: city("the turncoat", "Aitakama, who goes over to the Hittite and raids Pharaoh's lands with Hittite backing.", [0.7, 0.4, 0.25, 0.6, 0.3, 0.55, 0.5, 0.75, 0.6, 0.3]),
  Qatna: city("the loyal city", "Akizzi, who writes to Pharaoh of his loyalty and of Aitakama's treachery.", [0.3, 0.6, 0.75, 0.4, 0.5, 0.5, 0.7, 0.35, 0.5, 0.4]),
  Arwad: city("the island of ships", "Its ships blockade Byblos in league with Amurru.", [0.6, 0.45, 0.4, 0.65, 0.3, 0.5, 0.45, 0.6, 0.5, 0.8]),
  Amurru: city("the house of Abdi-Ashirta", "Aziru, who builds a state by playing Egypt against Hatti and takes the coast towns.", [0.85, 0.3, 0.2, 0.7, 0.3, 0.6, 0.7, 0.9, 0.6, 0.3]),
  Byblos: city("the pleading servant", "Rib-Hadda, loyal to Pharaoh, begging for troops and grain in letter after letter.", [0.15, 0.85, 0.8, 0.4, 0.4, 0.5, 0.9, 0.3, 0.6, 0.5]),
  Sidon: city("the wavering port", "Zimrida, Pharaoh's servant in name, friend to Aziru in deed.", [0.45, 0.5, 0.3, 0.6, 0.35, 0.45, 0.6, 0.7, 0.4, 0.75]),
  Damascus: city("the warden of Upe", "Biryawaza, Pharaoh's man in the Damascus land, with a hand in his neighbours' quarrels.", [0.55, 0.5, 0.5, 0.55, 0.4, 0.55, 0.55, 0.55, 0.5, 0.4]),
  Tyre: city("the island short of water", "Abi-Milku, loyal and hard pressed by Sidon from the mainland.", [0.2, 0.75, 0.7, 0.5, 0.45, 0.45, 0.8, 0.4, 0.5, 0.8]),
  Megiddo: city("the guard of the pass", "Biridiya, loyal, calling for men to guard his city.", [0.3, 0.75, 0.7, 0.45, 0.4, 0.45, 0.65, 0.4, 0.55, 0.45]),
  Shechem: city("the sons of Labaya", "Labaya's sons, taking their neighbours' towns while swearing they are Pharaoh's loyal servants.", [0.8, 0.3, 0.25, 0.65, 0.3, 0.55, 0.5, 0.75, 0.7, 0.3]),
  Jerusalem: city("the accuser", "Abdi-Heba, pleading for archers and denouncing his neighbours as traitors.", [0.3, 0.7, 0.55, 0.45, 0.35, 0.5, 0.75, 0.6, 0.7, 0.35]),
  Akko: city("the bribed harbour", "Surata, whose men killed Babylon's merchants, and who took Labaya captive and let him go for a bribe.", [0.45, 0.5, 0.25, 0.75, 0.35, 0.45, 0.55, 0.7, 0.4, 0.75]),
  Hazor: city("the king of Hazor", "Abdi-Tirshi of the largest town in Canaan, who calls himself king and keeps Pharaoh's city for him.", [0.45, 0.6, 0.5, 0.55, 0.4, 0.7, 0.6, 0.45, 0.6, 0.45]),
  Gezer: city("the accused", "Milkilu, accused of giving the king's land to the Habiru, protesting his loyalty and taking what he can.", [0.65, 0.4, 0.3, 0.65, 0.35, 0.5, 0.6, 0.7, 0.6, 0.35]),
  Ashkelon: city("the provisioner", "Yidya, who sends grain, oxen and sheep for Pharaoh's archers and asks little.", [0.2, 0.8, 0.75, 0.4, 0.45, 0.4, 0.8, 0.35, 0.5, 0.6]),
  Lachish: city("the hill fort", "Zimreddi of Lachish, Pharaoh's servant in a strong town of the lowland.", [0.4, 0.65, 0.55, 0.5, 0.4, 0.55, 0.6, 0.45, 0.5, 0.45]),
  Gath: city("the feuding lord", "Shuwardata of Gath and the southern hills, at feud with Abdi-Heba over the town of Qiltu.", [0.7, 0.4, 0.4, 0.6, 0.3, 0.55, 0.55, 0.6, 0.75, 0.3]),
  // Item 17+: the Lady of the Lions, who wrote to Pharaoh of the Habiru pressing her valley (EA 273-274): cautious, loyal, pleading.
  Aijalon: city("the lady of the lions", "Baʿlat-nese of the Aijalon valley, Pharaoh's servant between Gezer and Jerusalem, hard pressed by the Habiru.", [0.3, 0.7, 0.5, 0.45, 0.35, 0.6, 0.65, 0.4, 0.45, 0.4]),
  Suteans: city("the steppe raiders", "Herding tribes whose chiefs rob travellers and hire out as fighters.", [0.7, 0.35, 0.35, 0.7, 0.2, 0.35, 0.3, 0.6, 0.5, 0.3]),
  Arrapha: city("the land of Nuzi", "Mitanni's vassal beyond the Tigris, close to Assyria's reach.", [0.3, 0.65, 0.6, 0.5, 0.45, 0.45, 0.55, 0.4, 0.45, 0.55]),
  // Item 11f's places
  Azzi: city("the highland lord", "Hukkana of Hayasa, sworn to Suppiluliuma and wed to his sister, lord of mountain strongholds that raided the Upper Land.", [0.6, 0.45, 0.4, 0.55, 0.3, 0.6, 0.45, 0.55, 0.6, 0.25]),
  Niya: city("the elephant country", "Takuwa of Niya on the Orontes, between Mitanni and the Hittite, whose own brother would rise against him.", [0.35, 0.65, 0.5, 0.5, 0.4, 0.45, 0.6, 0.5, 0.45, 0.45]),
  Tunip: city("the weeping city", "The elders of Tunip, who write to Pharaoh as one and beg him to save them from Aziru.", [0.2, 0.8, 0.7, 0.45, 0.45, 0.4, 0.75, 0.35, 0.45, 0.55]),
  Beirut: city("the host of exiles", "Ammunira of Beirut, Pharaoh's servant, who took in Rib-Hadda when Byblos shut its gates on him.", [0.3, 0.65, 0.55, 0.5, 0.5, 0.4, 0.7, 0.45, 0.4, 0.7]),
  Pella: city("the son of Labaya", "Mut-Bahlu of Pella beyond the Jordan, who hid Ayyab and swore he did not know where he was.", [0.6, 0.45, 0.25, 0.6, 0.3, 0.5, 0.55, 0.75, 0.6, 0.35]),
  Ashtaroth: city("the fugitive lord", "Ayyab of Ashtaroth, who took a city of Pharaoh's and fled when called to answer for it.", [0.55, 0.5, 0.35, 0.6, 0.3, 0.5, 0.5, 0.65, 0.5, 0.35]),
  Shasu: city("the herders of Edom", "Shasu chiefs of the Negev and Edom, who rob the roads past their pastures and hire out their men.", [0.7, 0.35, 0.35, 0.7, 0.2, 0.4, 0.3, 0.6, 0.5, 0.25]),
  Libya: city("the western raiders", "Chiefs of the Tjehenu and Tjemehu, herders on the Delta's western edge who raid its fields.", [0.75, 0.35, 0.35, 0.7, 0.2, 0.5, 0.25, 0.55, 0.6, 0.15]),
  Elam: city("the king beyond the circle", "A kingdom outside the Great Kings' circle, watching Babylon.", [0.5, 0.55, 0.5, 0.55, 0.35, 0.75, 0.4, 0.5, 0.6, 0.5]),
};

const archetypes: Record<FixedPower, Personality> = { ...greatArchetypes, ...cityArchetypes };

/**
 * A power risen in play (item 13+): its ruler's temper (his ambition, fear, loyalty and greed, as his rising records
 * them) on a city's middling weights, so the same mind that governed plays the seat.
 */
function risenArchetype(p: Power): Personality {
  const r = risenOf(p);
  const [ambition, fear, loyalty, greed] = (r?.temper ?? [50, 50, 50, 50]).map((x) => clamp(x / 100, 0, 1));
  return city(`the risen governor`, `${r?.king ?? "A governor"}, who ruled ${r?.land ?? p} for ${r?.from ?? "a fallen king"} and rules it now in his own name.`, [0.2 + 0.6 * ambition, 0.2 + 0.6 * fear, 0.2 + 0.6 * loyalty, 0.2 + 0.6 * greed, 0.4, 0.5, 0.55, 0.5, 0.5, 0.5]);
}

/** The archetype for a power, varied by a seed: a script seat's own (see ScriptLeader.seatSeed), never the game's. */
export function personalityFor(p: Power, seed: number): Personality {
  const a = (archetypes as Record<string, Personality | undefined>)[p] ?? risenArchetype(p);
  const r = Rng.for(seed, 0, "personality", p);
  const j = (v: number): number => clamp(v + (r.nextDouble() - 0.5) * 0.3, 0, 1);
  // The jitter is drawn in the order of the C# record's with-expression: aggression first, commerce last.
  const aggression = j(a.aggression);
  const caution = j(a.caution);
  const honesty = j(a.honesty);
  const greed = j(a.greed);
  const generosity = j(a.generosity);
  const pride = j(a.pride);
  const diplomacy = j(a.diplomacy);
  const cunning = j(a.cunning);
  const vengeance = j(a.vengeance);
  const commerce = j(a.commerce);
  return { ...a, aggression, caution, honesty, greed, generosity, pride, diplomacy, cunning, vengeance, commerce };
}

export function archetype(p: Power): Personality {
  return (archetypes as Record<string, Personality | undefined>)[p] ?? risenArchetype(p);
}

/** The two or three traits that stand out, for display. */
export function highlights(t: Personality): string[] {
  const traits: [string, string, number][] = [
    ["warlike", "peaceable", t.aggression],
    ["cautious", "reckless", t.caution],
    ["honest", "faithless", t.honesty],
    ["greedy", "open-handed", t.greed],
    ["generous", "stingy", t.generosity],
    ["proud", "humble", t.pride],
    ["diplomatic", "aloof", t.diplomacy],
    ["cunning", "guileless", t.cunning],
    ["vengeful", "forgiving", t.vengeance],
    ["mercantile", "martial", t.commerce],
  ];
  return sortBy(traits, [(x: [string, string, number]) => Math.abs(x[2] - 0.5), desc(cmpNum)])
    .slice(0, 3)
    .map(([high, low, v]) => (v >= 0.5 ? high : low));
}
