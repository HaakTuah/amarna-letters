/**
 * The cast beyond the first eighteen (build order item 10): the attested people of 1346 who can serve as characters, the
 * Nubians in Egypt's service, and the name styles of each region for the ordinary people the pool needs. From the people
 * dossier, `docs/history/06-attested-people.md` ("Attested characters", "Nubians in Egypt's service", "Name styles for
 * everyone else"). Kings, queens and princes are seats or their households, never characters.
 */
import type { Power } from "../model/power.ts";

/** What the sources tell of a person, as traits on the 0–100 scale; each game varies them a little ("Attested characters"). */
export interface Core {
  loyalty?: number;
  greed?: number;
  competence?: number;
  ambition?: number;
  courage?: number;
}

export interface CastSeed {
  name: string;
  origin: string;
  /** The court it stands at when the game begins: where it lives, or where its work kept it. */
  court: Power;
  calling: string;
  core: Core | null;
  nubian: boolean;
  /** Item 17+: in its post from the first season, employed by its court (its post its job); else free at its court. */
  post: boolean;
  /** Item 17+: the gold on its person at the start, its means set against its king's as far as the sources go [G]. */
  purse: number;
  /** Item 17+: what the sources say of it, as public facts. */
  facts: readonly string[];
  /** Item 17+: a claim or a town of its own in this province, a stake in its people's love, which item 17++'s ledger seeds. */
  stake: string | null;
}

const cast = (name: string, origin: string, court: Power, calling: string, core: Core | null = null, nubian = false): CastSeed => ({ name, origin, court, calling, core, nubian, post: false, purse: 0, facts: [], stake: null });
/** One of the people of 1346 (item 17+): in his post unless he has a stake instead, with his purse and what the sources say of him. */
const person = (name: string, origin: string, court: Power, calling: string, core: Core, purse: number, facts: readonly string[], stake: string | null = null): CastSeed => ({ name, origin, court, calling, core, nubian: false, post: stake === null, purse, facts, stake });

/**
 * The attested cores of the first eighteen's attested envoys, by name (the first eighteen keep their names, posts and draws;
 * only their traits move towards what the sources say).
 */
export const FirstCores: ReadonlyMap<string, Core> = new Map<string, Core>([
  // Sent to Mitanni again and again, and held there for years without breaking (EA 19-29).
  ["Mane", { loyalty: 80, courage: 70, competence: 70 }],
  // Tushratta's envoy to Egypt again and again (EA 19-29): trusted, able.
  ["Keliya", { loyalty: 75, competence: 75 }],
  // Envoys detained in Egypt (EA 27-29): they waited it out.
  ["Pirissi", { loyalty: 70, courage: 60 }],
  ["Tulubri", { loyalty: 70, courage: 60 }],
  // Egypt's envoy (EA 20 names a Haamashshi): an envoy of standing.
  ["Haamashshi", { competence: 65 }],
  ["Artessupa", { loyalty: 60 }],
  ["Mazipalali", { loyalty: 60 }],
  // A commissioner in charge of the grain at Yarimuta (EA 83-86): able, his own man in the vassals' eyes.
  ["Yanhamu", { competence: 75, ambition: 70, greed: 60 }],
]);

/** The attested people added to the pool, in the dossier's order. */
export const AttestedCast: readonly CastSeed[] = [
  cast("Hani", "Waset", "Egypt", "royal envoy", { loyalty: 75, competence: 70 }),
  cast("Tutu", "Akhetaten", "Egypt", "chamberlain", { greed: 70, competence: 70, ambition: 70, loyalty: 45 }),
  cast("Mahu", "Akhetaten", "Egypt", "chief of the Medjay", { courage: 75, loyalty: 70, competence: 65 }),
  cast("Amanappa", "Men-nefer", "Egypt", "palace official", { loyalty: 55 }),
  cast("Haya", "Men-nefer", "Egypt", "commissioner", { competence: 60 }),
  cast("Maya", "Waset", "Egypt", "commissioner"),
  cast("Addaya", "Hazzatu", "Egypt", "commissioner at Gaza", { greed: 60 }),
  cast("Irshappa", "Men-nefer", "Egypt", "royal envoy"),
  cast("Asali", "Washukanni", "Mitanni", "royal envoy"),
  // His caravan was robbed twice in Egypt's lands (EA 7): he kept going.
  cast("Salmu", "Babili", "Babylonia", "royal envoy", { courage: 70, loyalty: 70 }),
  cast("Ahutabu", "Babili", "Babylonia", "caravan master", { courage: 60 }),
  cast("Kalbaya", "Apasa", "Arzawa", "royal envoy", { competence: 60 }),
  cast("Lupakki", "Hattusa", "Hatti", "general", { courage: 80, ambition: 65, loyalty: 70 }),
  // Ilimilku, Ugarit's scribe, is Ugarit's court scribe since item 17+ (NamedScribes).
];

/**
 * Item 17+: everyone of 1346 who mattered but did not rule, from the people and courts dossiers and the letters' index of
 * persons (Moran), each weighed in the item's report ("every name weighed"): placed where the sources put him, in his
 * post (employed by his court from the first season) or with a stake in a province's love (a claimant, a town's ruler;
 * item 17++ seeds the ledger), holding the purse his standing against his king's allows [G]; what the sources say of him
 * is his traits and his public facts, never a script. None led armed men of his own in 1346.
 */
export const PeopleOf1346: readonly CastSeed[] = [
  // Egypt's court (the courts dossier, "Egypt"): the great officers of Akhetaten and the commissioners in Canaan
  person("Ay", "Akhetaten", "Egypt", "God's Father and Master of the Horse", { competence: 80, ambition: 80, loyalty: 65, greed: 55 }, 90, ["God's Father and Master of the Horse at Akhetaten: the chariotry and the king's household are his (his tomb at Amarna)."]),
  person("Nakht", "Akhetaten", "Egypt", "vizier", { competence: 75, loyalty: 70, ambition: 55 }, 60, ["Vizier at Akhetaten, head of the administration (his house at Amarna)."]),
  person("Panehesy", "Akhetaten", "Egypt", "chief servitor of the Aten", { loyalty: 75, competence: 60, ambition: 50 }, 40, ["Chief servitor of the Aten at Akhetaten (his tomb at Amarna); his name means 'the Nubian'."]),
  person("Huya", "Akhetaten", "Egypt", "steward of Queen Tiye", { loyalty: 70, competence: 65, greed: 45 }, 40, ["Steward of Queen Tiye, the king's mother, whose household he runs (his tomb at Amarna)."]),
  person("Thutmose", "Kush", "Egypt", "King's Son of Kush", { competence: 70, loyalty: 75, courage: 65 }, 60, ["King's Son of Kush, the viceroy who rules Nubia for Pharaoh and led his one campaign there (the Buhen and Amada stelae)."]),
  person("Paatenemheb", "Men-nefer", "Egypt", "general", { courage: 70, competence: 65, loyalty: 65 }, 50, ["A general of Akhenaten's, overseer of the army (his tomb at Amarna)."]),
  person("Pahanate", "Ṣumur", "Egypt", "commissioner at Ṣumur", { competence: 55, loyalty: 60 }, 30, ["Pharaoh's commissioner at Ṣumur, Egypt's base on Amurru's coast, whom Rib-Hadda of Gubla writes to (EA 60, 62, 68)."]),
  person("Pawura", "Gubla", "Egypt", "commissioner", { courage: 60, competence: 55, loyalty: 65, greed: 50 }, 30, ["Pharaoh's commissioner in the north, with archers under him, who comes and goes between Gubla, Ṣumur and Egypt (EA 117, 124, 131-132)."]),
  person("Ha'ip", "Ṣumur", "Egypt", "commissioner", { greed: 75, loyalty: 35, competence: 55 }, 40, ["An official of Pharaoh's in the north; Rib-Hadda says he handed Ṣumur to the sons of Abdi-Ashirta (EA 132)."]),
  person("Rianap", "Hazzatu", "Egypt", "commissioner", { competence: 60, loyalty: 65, greed: 50 }, 25, ["Pharaoh's commissioner in the south, to whom the rulers of Gazru and the coast answer (EA 292, 315-326)."]),
  person("Tahmashshi", "Hazzatu", "Egypt", "commissioner", { competence: 60, loyalty: 60 }, 25, ["Pharaoh's commissioner in Canaan, to whom Tagi writes (EA 265)."]),
  person("Hatip", "Men-nefer", "Egypt", "royal envoy", { greed: 75, competence: 60, loyalty: 50 }, 35, ["Came to Amurru with Hani and, Aziru complains, took the gold that was meant for Pharaoh (EA 161)."]),
  // Hatti
  person("Zida", "Hattusa", "Hatti", "chief of the bodyguard", { courage: 80, loyalty: 85, competence: 70, ambition: 50 }, 40, ["Chief of the bodyguard, the king's brother, who commands the guard at the king's person and often an army (the Deeds of Suppiluliuma)."]),
  // Mitanni: the rival line
  person("Artatama", "Taidu", "Mitanni", "rival king of the Hurrians", { ambition: 90, loyalty: 10, competence: 65, courage: 60, greed: 55 }, 70, ["Calls himself king of the Hurri lands against Tushratta, with Hittite backing (the Shattiwaza treaty); the lands east of the Habur lean to him."], "washukanni"),
  person("Shuttarna", "Taidu", "Mitanni", "son of the rival king", { ambition: 75, loyalty: 15, greed: 70, competence: 55 }, 30, ["Artatama's son and heir to his claim, who later gives the palace treasure to Assyria and Alshe (the Shattiwaza treaty)."], "washukanni"),
  // Babylonia
  person("Enlil-kidinni", "Nippur", "Babylonia", "governor of Nippur", { competence: 80, loyalty: 75, greed: 45 }, 60, ["Governor of Nippur, the kingdom's great official, keeping the city and its temple estates (the Nippur letters)."]),
  person("Ili-ippashra", "Dilmun", "Babylonia", "governor of Dilmun", { competence: 55, loyalty: 65, courage: 45 }, 25, ["Governor of Dilmun in the Gulf, who writes to Enlil-kidinni of the island's troubles (the Dilmun letters from Nippur)."]),
  person("Shindishugab", "Babili", "Babylonia", "royal envoy", { competence: 60, loyalty: 70 }, 15, ["Burna-Buriash's envoy to Egypt (EA 11)."]),
  // Assyria: the envoys Ashur-uballit complains were kept standing in the sun at Pharaoh's court (EA 16), unnamed, so
  // named in the Assyrian style [G]
  person("Ashur-iddin", "Ashur", "Assyria", "royal envoy", { loyalty: 70, courage: 60, competence: 60 }, 10, ["Ashur-uballit's envoy, kept standing in the sun at Pharaoh's court until the king complained of it (EA 16)."]),
  person("Adad-iddina", "Ninua", "Assyria", "royal envoy", { loyalty: 65, competence: 55 }, 10, ["Ashur-uballit's envoy, kept standing in the sun at Pharaoh's court with his fellow (EA 16)."]),
  // Alashiya: the governor who writes to his Egyptian counterpart (EA 40), unnamed, so named after a later governor [C]
  person("Eshuwara", "the harbour of Alashiya", "Alashiya", "the governor of Alashiya", { competence: 70, loyalty: 70, greed: 50 }, 40, ["The governor of Alashiya, a second voice of the island's state, who writes to Pharaoh's governor and sends gifts of his own (EA 40)."]),
  // The Levant: claimants, the brothers of rulers, the men of action, the rulers of towns too small for a province
  person("Ilirabih", "Gubla", "Byblos", "the ruler's brother", { ambition: 80, loyalty: 20, competence: 60, courage: 55 }, 20, ["Rib-Hadda's younger brother, who shut him out of Gubla and wrote to Pharaoh as its ruler (EA 137-140, 162)."], "byblos"),
  person("Pu-Baʿlu", "Amurru", "Amurru", "son of Abdi-Ashirta", { courage: 70, ambition: 70, loyalty: 45, greed: 60 }, 15, ["A son of Abdi-Ashirta and Aziru's brother, one of the sons who share Amurru and took the coast's towns (EA 104, 132)."], "amurru"),
  person("Baʿluya", "Amurru", "Amurru", "son of Abdi-Ashirta", { loyalty: 70, courage: 60, competence: 50 }, 10, ["Aziru's brother, who kept Amurru and wrote to him while he was held in Egypt (EA 170)."], "amurru"),
  person("Akit-Teshup", "Niya", "Niya", "the ruler's brother", { ambition: 80, loyalty: 20, courage: 60, competence: 55 }, 10, ["Takuwa's brother, who turned Niya against him and against Hatti (the Shattiwaza treaty)."], "niya"),
  person("Tagi", "Magidda", "Megiddo", "lord of Ginti-kirmil", { competence: 65, ambition: 60, loyalty: 40, greed: 60 }, 25, ["Rules his own town, Ginti-kirmil in the Carmel region, Labaya's ally and Milkilu's father-in-law (EA 249, 264-266)."], "megiddo"),
  person("Yashdata", "Magidda", "Megiddo", "a dispossessed lord", { courage: 65, loyalty: 60, ambition: 55, greed: 40 }, 5, ["Driven from his town by Labaya's men, he stands with Biridiya at Magidda and asks Pharaoh for his land back (EA 245, 248)."], "megiddo"),
  person("Endaruta", "Akka", "Akko", "lord of Akshapa", { competence: 55, loyalty: 60, courage: 50 }, 15, ["Rules Akshapa, a town near Akka, and writes to Pharaoh as his servant (EA 223, 366)."], "akko"),
  person("Shum-Adda", "Akka", "Akko", "a man of Akka", { greed: 80, courage: 65, loyalty: 35, competence: 45 }, 20, ["Son of Balumme, a man of Akka who killed Babylon's merchants at Hinnatuna and took their silver, Burna-Buriash says (EA 8)."]),
  person("Shutatna", "Akka", "Akko", "the ruler's son", { ambition: 65, greed: 65, loyalty: 50, courage: 55 }, 15, ["Son of Surata of Akka, who killed Babylon's merchants with Shum-Adda (EA 8); Akka's ruler after his father."], "akko"),
  person("Yapah-Hadda", "Ṣiduna", "Sidon", "a lord of the coast", { ambition: 65, loyalty: 35, greed: 60, competence: 55 }, 20, ["A lord of the coast at feud with Rib-Hadda, who says he sides with Aziru and seizes Gubla's ships (EA 83, 85, 98, 113-114, 116)."], "sidon"),
  person("Arzawiya", "Dimashqa", "Damascus", "lord of Ruhizzi", { ambition: 60, loyalty: 30, courage: 60, competence: 50 }, 15, ["Rules Ruhizzi in Upe and sides with Aitakama of Qadesh against Pharaoh's land, Akizzi says (EA 53-54, 191, 197)."], "damascus"),
  person("Teuwatti", "Dimashqa", "Damascus", "lord of Lapana", { ambition: 55, loyalty: 30, courage: 55, competence: 50 }, 15, ["Rules Lapana in Upe and sides with Aitakama of Qadesh, Akizzi says (EA 53-54, 193)."], "damascus"),
  person("Biridashwa", "Ashtartu", "Ashtaroth", "lord of Yanuamu", { ambition: 65, loyalty: 25, courage: 65, greed: 60 }, 20, ["Rules Yanuamu beyond the Jordan and took Biryawaza's chariots with Arzawiya, Biryawaza says (EA 197)."], "ashtaroth"),
  person("Yapahu", "Gazru", "Gezer", "the ruler's brother", { ambition: 60, loyalty: 55, competence: 55, greed: 50 }, 10, ["Milkilu's brother at Gazru, who rules it after him and writes to Pharaoh as its ruler (EA 297-300)."], "gezer"),
];

/**
 * Item 17+: the court scribes the sources name, in place of the generated one at their courts: Ilimilku of Ugarit, who wrote
 * down the Baal cycle under Niqmaddu (the colophons) [A]; Abdi-Heba's scribe at Urusalim, trained in north Syria, by his hand
 * (EA 286-289), his name lost and given in the north Syrian style [G].
 */
export const NamedScribes: ReadonlyMap<Power, { name: string; origin: string; core: Core; attested: boolean }> = new Map([
  ["Ugarit", { name: "Ilimilku", origin: "Ugarit", core: { competence: 80, loyalty: 60, courage: 35 }, attested: true }],
  ["Jerusalem", { name: "Shatu-ili", origin: "Halab", core: { competence: 70, loyalty: 65 }, attested: false }],
]);

/**
 * Nubians in Egypt's service: Hekanefer, prince of Miam and a child of the royal nursery, whose career spans 1346; and
 * captains of the Nubian troops (Meluhha, Kashi) who garrisoned Canaan, unnamed in the letters, so named here in the
 * Egyptian style many of them bore.
 */
export const NubianCast: readonly CastSeed[] = [
  cast("Hekanefer", "Miam", "Egypt", "prince of Miam raised in Pharaoh's nursery", { loyalty: 75, ambition: 60 }, true),
  cast("Nehesy", "Kush", "Egypt", "captain of Nubian troops", { courage: 70 }, true),
  cast("Pakharu", "Kush", "Egypt", "captain of Nubian troops", { courage: 65 }, true),
];

/** The attested Nubians are real; the two captains are generated, since the letters do not name them. */
export const NubiansAttested: ReadonlySet<string> = new Set(["Hekanefer"]);

/** Names in each region's style, from the dossier's table; marked generated. */
export const Styles: readonly { court: Power; origins: readonly string[]; names: readonly string[]; callings: readonly string[] }[] = [
  {
    court: "Egypt",
    origins: ["Waset", "Men-nefer", "Akhetaten", "Gubla", "Hazzatu"],
    names: ["Ramose", "Ptahmose", "Nebamun", "Penre", "Amenemope", "Userhat", "Abdi-Ashtarti", "Yapa-ilu"],
    callings: ["scribe of the treasury", "caravan master", "interpreter", "temple scribe", "soldier", "merchant of the coast"],
  },
  {
    court: "Babylonia",
    origins: ["Babili", "Nippur", "Sippar"],
    names: ["Marduk-nadin-ahhe", "Nabu-zuqup", "Kadashman-Harbe", "Kudur-Enlil", "Shagarakti"],
    callings: ["merchant", "temple scribe", "caravan master", "priest of Shamash"],
  },
  {
    court: "Assyria",
    origins: ["Ashur", "Ninua", "Arbail"],
    names: ["Shamash-aha-iddina", "Ninurta-apil", "Enlil-ashared", "Mushallim-Ashur"],
    callings: ["merchant", "charioteer", "palace steward"],
  },
  {
    court: "Mitanni",
    origins: ["Washukanni", "Taidu", "Nuzi", "Harran"],
    names: ["Agib-Teshup", "Akip-tasenni", "Biryashura", "Arih-hamanna", "Kelip-sharri"],
    callings: ["charioteer", "interpreter", "copper trader", "palace steward"],
  },
  {
    court: "Hatti",
    origins: ["Hattusa", "Kummanni", "Karkamish", "Ugarit"],
    names: ["Kurunta", "Tarhunta-piya", "Hutupiyanza", "Yarimanu", "Pihha-ziti"],
    callings: ["soldier", "temple scribe", "merchant", "charioteer"],
  },
  {
    court: "Arzawa",
    origins: ["Apasa", "Mira", "Lukka"],
    names: ["Piyama-Kurunta", "Mashhuitta", "Uhha-muwa"],
    callings: ["merchant", "sailor", "soldier"],
  },
  {
    court: "Alashiya",
    origins: ["the harbour of Alashiya", "the copper hills of Alashiya"],
    names: ["Kushmeshusha", "Kushmeshu-ziti", "Tamarisa"],
    callings: ["copper trader", "sailor", "merchant"],
  },
  // The city-states' regions (item 11+), in the dossier's styles for the Levant, Ugarit, Syria (Hurrian and Amorite), Nuzi,
  // Elam, the Suteans (West Semitic, as the Levant) and, where no names survive, Kaska and Lukka in the Anatolian style [G].
  {
    court: "Byblos",
    origins: ["Gubla", "Biruta", "Ṣiduna", "Ṣurru"],
    names: ["Zimri-Addu", "Abdi-Baalu", "Ilu-rapi", "Shum-Hadda", "Milku-ahi"],
    callings: ["merchant of the coast", "sailor", "scribe", "timber trader"],
  },
  {
    court: "Megiddo",
    origins: ["Magidda", "Shakmu", "Urusalim", "Hasura", "Akka", "Gazru", "Lakisha", "Ashqaluna", "Pihil", "Ashtartu", "Gimti", "Ayyaluna"],
    names: ["Ammu-rapi", "Hadda-yaqar", "Zimri-Baalu", "Abdi-Rasha"],
    callings: ["caravan master", "soldier", "scribe", "herdsman"],
  },
  {
    court: "Aleppo",
    origins: ["Halab", "Alalakh", "Qatna", "Karkamish", "Niya", "Tunip"],
    names: ["Tulpi-Teshup", "Kili-Teshup", "Addu-mutu", "Shatu-ili"],
    callings: ["charioteer", "merchant", "interpreter", "scribe"],
  },
  {
    court: "Ugarit",
    origins: ["Ugarit"],
    names: ["Abdi-Anati", "Puzru", "Yadinu", "Ilu-shalim"],
    callings: ["merchant", "sailor", "scribe", "copper trader"],
  },
  {
    court: "Damascus",
    origins: ["Dimashqa", "Qadesh", "Kumidi"],
    names: ["Addu-bani", "Shuttiya"],
    callings: ["caravan master", "soldier"],
  },
  {
    court: "Arrapha",
    origins: ["Arrapha", "Nuzi"],
    names: ["Akip-tilla", "Hut-Teshup", "Kipaya"],
    callings: ["scribe", "merchant", "charioteer"],
  },
  {
    court: "Elam",
    origins: ["Shushan", "Anshan"],
    names: ["Pahir-ili", "Humban-ahpi", "Kutir-Huban"],
    callings: ["merchant", "soldier", "scribe"],
  },
  {
    court: "Suteans",
    origins: ["the Sutean steppe", "Tadmor"],
    names: ["Ammu-ili", "Yaqqim-Addu", "Sumu-ilu"],
    callings: ["herdsman", "caravan guide", "hired fighter"],
  },
  {
    court: "Kaska",
    origins: ["the Kaska hills"],
    names: ["Piyapili", "Hinnuwa"],
    callings: ["herdsman", "hired fighter"],
  },
  {
    court: "Lukka",
    origins: ["Lukka"],
    names: ["Kuwatalla", "Zarniya"],
    callings: ["sailor", "hired fighter"],
  },
  // Item 11f's edges: Azzi-Hayasa by the names its treaty and Mursili II's annals give (Mariya, Anniya); the Libyans by
  // the chiefs Egypt named a century and more later (Didi, Kaper); the Shasu, whose names do not survive, in the West
  // Semitic style of their neighbours [G].
  {
    court: "Azzi",
    origins: ["Hayasa", "Azzi"],
    names: ["Mariya", "Anniya"],
    callings: ["herdsman", "hired fighter"],
  },
  {
    court: "Libya",
    origins: ["the Tjehenu land", "the Tjemehu land"],
    names: ["Didi", "Kaper"],
    callings: ["herdsman", "hired fighter"],
  },
  {
    court: "Shasu",
    origins: ["Edom", "the Negev"],
    names: ["Yamu-ilu", "Abdi-Qaus"],
    callings: ["herdsman", "caravan guide"],
  },
];

/** Names invented by a character who gives a false one (item 10, "Declaring a name"), in the regions' styles. */
export const Aliases: readonly string[] = [
  "Amenmose", "Sennefer", "Nabu-ahhe", "Kudur-Nanna", "Adad-shumi", "Ehli-sharri", "Tulpi-Teshup", "Kurunta-ziti",
  "Pazzu", "Abdi-Hadda", "Yapah-Addu", "Ili-milku", "Tarhunta-muwa", "Eshu-walli",
];

/**
 * Item 17++ ("Whom a province obeys"): every governor the sources name in office in 1346, over the province they give him,
 * holding his post from the first season as a grant at his king's pleasure, paid and housed by him (no fee); where the
 * office is attested for a province its own king holds but its holder's name is lost, a governor in the court's name style,
 * marked invented (`name` null); heartlands, and a prince holding land for his father, stay out. Graded as the dossiers
 * grade: [A] named in office there, [B] the office attested there, [C] a reading of how far a district reached.
 */
export const Governors1346: readonly { name: string | null; court: Power; province: string; grade: string }[] = [
  { name: "Thutmose", court: "Egypt", province: "nubia", grade: "A: King's Son of Kush (the Buhen and Amada stelae)" },
  { name: "Addaya", court: "Egypt", province: "gaza", grade: "A: Pharaoh's man at Hazzatu (EA 254, 285, 287)" },
  { name: "Pahanate", court: "Egypt", province: "sumur", grade: "B: commissioner at Ṣumur (EA 60, 62, 68), Ṣumur still Egypt's in 1346" },
  { name: "Enlil-kidinni", court: "Babylonia", province: "nippur", grade: "A: governor of Nippur (the Nippur letters)" },
  { name: "Ili-ippashra", court: "Babylonia", province: "dilmun", grade: "A: governor of Dilmun (the Dilmun letters from Nippur)" },
  { name: "Eshuwara", court: "Alashiya", province: "kalavasos", grade: "C: the governor of Alashiya (EA 40), over the copper hills, whose copper he sends" },
  { name: null, court: "Hatti", province: "tuwanuwa", grade: "B: a lord of the watchtower of the Lower Land, facing Arzawa" },
  { name: null, court: "Hatti", province: "samuha", grade: "B: a lord of the watchtower of the Upper Land, facing the Kaska" },
  { name: null, court: "Babylonia", province: "sippar", grade: "B: a provincial governor (šakin māti), the office attested under the Kassites" },
  { name: null, court: "Babylonia", province: "ur", grade: "B: a provincial governor of the south" },
  { name: null, court: "Babylonia", province: "suhu", grade: "C: a governor of Suhu, folded into Babylonia (item 17+)" },
];

/**
 * Item 17++: Pharaoh's commissioners who oversaw vassals' lands, characters and not governors, since their king does not
 * hold those lands: each starts in Pharaoh's service as an open resident in that province, known to all as his man,
 * reporting home (`name` null: the commissioner at Kumidi, in the Egyptian style, marked invented). Graded as above.
 */
export const Residents1346: readonly { name: string | null; province: string; grade: string }[] = [
  { name: "Maya", province: "gezer", grade: "C: Maya in the south, who took Gazru's town (EA 300)" },
  { name: "Haya", province: "amurru", grade: "C: a commissioner sent to Amurru (EA 101)" },
  { name: "Rianap", province: "ashkelon", grade: "C: the coast's rulers answer to him (EA 315-326)" },
  { name: "Tahmashshi", province: "megiddo", grade: "B: Tagi of the Carmel writes to him (EA 265)" },
  { name: "Yanhamu", province: "byblos", grade: "B: over the grain at Yarimuta that fed Gubla (EA 83-86)" },
  { name: null, province: "damascus", grade: "A for the post at Kumidi in Upe (EA 116, 129, 132); the name is lost" },
];

/**
 * Item 17++: where the letters show a province's people leaning to a power other than its ruler, that power's share of its
 * love at the start: Gubla's villages gone over to the Habiru and its own men urging peace with Aziru's house (EA 74-91,
 * 136-138) [A]. A man's own share comes from his stake (`CastSeed.stake`).
 */
export const Leanings1346: readonly { province: string; to: Power; grade: string }[] = [{ province: "byblos", to: "Amurru", grade: "A: EA 74-91, 136-138" }];
