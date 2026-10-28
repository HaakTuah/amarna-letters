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
}

const cast = (name: string, origin: string, court: Power, calling: string, core: Core | null = null, nubian = false): CastSeed => ({ name, origin, court, calling, core, nubian });

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
  cast("Hani", "Thebes", "Egypt", "royal envoy", { loyalty: 75, competence: 70 }),
  cast("Tutu", "Akhetaten", "Egypt", "chamberlain", { greed: 70, competence: 70, ambition: 70, loyalty: 45 }),
  cast("Mahu", "Akhetaten", "Egypt", "chief of the Medjay", { courage: 75, loyalty: 70, competence: 65 }),
  cast("Amanappa", "Memphis", "Egypt", "palace official", { loyalty: 55 }),
  cast("Haya", "Memphis", "Egypt", "commissioner", { competence: 60 }),
  cast("Maya", "Thebes", "Egypt", "commissioner"),
  cast("Addaya", "Gaza", "Egypt", "commissioner at Gaza", { greed: 60 }),
  cast("Irshappa", "Memphis", "Egypt", "royal envoy"),
  cast("Asali", "Washukanni", "Mitanni", "royal envoy"),
  // His caravan was robbed twice in Egypt's lands (EA 7): he kept going.
  cast("Salmu", "Babylon", "Babylonia", "royal envoy", { courage: 70, loyalty: 70 }),
  cast("Ahutabu", "Babylon", "Babylonia", "caravan master", { courage: 60 }),
  cast("Kalbaya", "Apasa", "Arzawa", "royal envoy", { competence: 60 }),
  cast("Lupakki", "Hattusa", "Hatti", "general", { courage: 80, ambition: 65, loyalty: 70 }),
  cast("Ilimilku", "Ugarit", "Hatti", "scribe", { competence: 80, loyalty: 60, courage: 35 }),
];

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
    origins: ["Thebes", "Memphis", "Akhetaten", "Byblos", "Gaza"],
    names: ["Ramose", "Ptahmose", "Paatenemheb", "Penre", "Amenemope", "Thutmose", "Abdi-Ashtarti", "Milkilu"],
    callings: ["scribe of the treasury", "caravan master", "interpreter", "temple scribe", "soldier", "merchant of the coast"],
  },
  {
    court: "Babylonia",
    origins: ["Babylon", "Nippur", "Sippar"],
    names: ["Marduk-nadin-ahhe", "Nabu-zuqup", "Kadashman-Harbe", "Kudur-Enlil", "Shagarakti"],
    callings: ["merchant", "temple scribe", "caravan master", "priest of Shamash"],
  },
  {
    court: "Assyria",
    origins: ["Ashur", "Nineveh", "Arbela"],
    names: ["Adad-iddina", "Ninurta-apil", "Enlil-ashared", "Ashur-iddin"],
    callings: ["merchant", "charioteer", "palace steward"],
  },
  {
    court: "Mitanni",
    origins: ["Washukanni", "Taidu", "Nuzi", "Harran"],
    names: ["Agib-Teshup", "Akip-tasenni", "Biridashwa", "Arih-hamanna", "Kelip-sharri"],
    callings: ["charioteer", "interpreter", "copper trader", "palace steward"],
  },
  {
    court: "Hatti",
    origins: ["Hattusa", "Kummanni", "Carchemish", "Ugarit"],
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
    origins: ["Enkomi", "Kition"],
    names: ["Eshuwara", "Kushmeshu-ziti", "Tamarisa"],
    callings: ["copper trader", "sailor", "merchant"],
  },
  // The city-states' regions (item 11+), in the dossier's styles for the Levant, Ugarit, Syria (Hurrian and Amorite), Nuzi,
  // Elam, the Suteans (West Semitic, as the Levant) and, where no names survive, Kaska and Lukka in the Anatolian style [G].
  {
    court: "Byblos",
    origins: ["Byblos", "Beirut", "Sidon", "Tyre"],
    names: ["Zimri-Addu", "Abdi-Baalu", "Ilu-rapi", "Shum-Hadda", "Milku-ahi"],
    callings: ["merchant of the coast", "sailor", "scribe", "timber trader"],
  },
  {
    court: "Megiddo",
    origins: ["Megiddo", "Shechem", "Jerusalem", "Hazor"],
    names: ["Ammu-rapi", "Hadda-yaqar", "Zimri-Baalu", "Abdi-Rasha"],
    callings: ["caravan master", "soldier", "scribe", "herdsman"],
  },
  {
    court: "Aleppo",
    origins: ["Aleppo", "Alalakh", "Qatna", "Carchemish"],
    names: ["Akit-Teshup", "Kili-Teshup", "Addu-mutu", "Shatu-ili"],
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
    origins: ["Damascus", "Qadesh", "Kumidi"],
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
    origins: ["Susa", "Anshan"],
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
];

/** Names invented by a character who gives a false one (item 10, "Declaring a name"), in the regions' styles. */
export const Aliases: readonly string[] = [
  "Amenmose", "Sennefer", "Nabu-ahhe", "Kudur-Nanna", "Adad-shumi", "Ehli-sharri", "Tulpi-Teshup", "Kurunta-ziti",
  "Pazzu", "Abdi-Hadda", "Yapah-Addu", "Ili-milku", "Tarhunta-muwa", "Eshu-walli",
];
