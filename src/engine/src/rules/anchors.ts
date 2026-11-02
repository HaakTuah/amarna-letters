/**
 * Where each real fact in the game's data rests (the full history check, archive item 167): the anchor of its line in
 * `docs/history/` (`<a id="..."></a>`), a line that quotes the few words of its source it relies on; or {@link Invented}
 * where the sources are silent and the game made it up [G]. Data only: never shown to a king, a character or a model.
 */
export const Invented = "invented";

/**
 * Every ruler of 1346 the sources name, by the name the letters use ({@link king}): the anchor of the politics dossier's line
 * that names him (`docs/history/01-politics.md`), or the people dossier's for the Lady of the Lions.
 */
export const RulerAnchors: ReadonlyMap<string, string> = new Map<string, string>([
  ["Naphurureya", "01-akhenaten"],
  ["Suppiluliuma", "01-suppiluliuma"],
  ["Burna-Buriash", "01-burna-buriash"],
  ["Tushratta", "01-tushratta"],
  ["Ashur-uballit", "01-ashur-uballit"],
  ["Tarhundaradu", "01-tarhundaradu"],
  ["Hukkana", "01-hukkana"],
  ["Takuwa", "01-takuwa"],
  ["Ammunira", "01-ammunira"],
  ["Mut-Bahlu", "01-mut-bahlu"],
  ["Ayyab", "01-ayyab"],
  ["Itur-Addu", "01-itur-addu"],
  ["Niqmaddu", "01-niqmaddu"],
  ["Addu-nirari", "01-addu-nirari"],
  ["Aitakama", "01-aitakama"],
  ["Akizzi", "01-akizzi"],
  ["Aziru", "01-aziru"],
  ["Rib-Hadda", "01-rib-hadda"],
  ["Zimrida", "01-zimrida"],
  ["Biryawaza", "01-biryawaza"],
  ["Abi-Milku", "01-abi-milku"],
  ["Biridiya", "01-biridiya"],
  ["Labaya", "01-labaya"],
  ["Abdi-Heba", "01-abdi-heba"],
  ["Surata", "01-cities-of-canaan"],
  ["Abdi-Tirshi", "01-cities-of-canaan"],
  ["Milkilu", "01-cities-of-canaan"],
  ["Yidya", "01-cities-of-canaan"],
  ["Zimreddi", "01-cities-of-canaan"],
  ["Shuwardata", "01-cities-of-canaan"],
  ["Baʿlat-nese", "06-balat-nese"],
]);

/**
 * Item 17++a (#403, "Places by their own names"): the four lands named for their peoples' own names, each with the line that
 * names it: the land of the Tjehenu, the Kaska's hills, the Shasu's Seir, and the Suteans' steppe.
 */
export const LandAnchors: ReadonlyMap<string, string> = new Map<string, string>([
  ["Tjehenu", "01-libya"],
  ["Kaska", "01-kaska-and-suteans"],
  ["Seir", "02-nb-shasu"],
  ["Sutu", "01-sutu"],
]);

/**
 * Every person the game presents as of 1346, by name: the anchor of the people dossier's line that holds him
 * (`docs/history/06-attested-people.md`), or {@link Invented} where the letters keep no name and the game gave one: the
 * Assyrian envoys of EA 16, the governor of Alashiya of EA 40 (named after a later one), the Nubian captains, and
 * Abdi-Heba's scribe.
 */
export const PersonAnchors: ReadonlyMap<string, string> = new Map<string, string>([
  ["Hani", "06-hani"],
  ["Tutu", "06-tutu"],
  ["Mahu", "06-mahu"],
  ["Amanappa", "06-amanappa"],
  ["Haya", "06-haya"],
  ["Maya", "06-maya"],
  ["Addaya", "06-addaya"],
  ["Irshappa", "06-irshappa"],
  ["Asali", "06-asali"],
  ["Salmu", "06-salmu"],
  ["Ahutabu", "06-ahutabu"],
  ["Kalbaya", "06-kalbaya"],
  ["Lupakki", "06-lupakki"],
  ["Ay", "06-ay"],
  ["Nakht", "06-nakht"],
  ["Panehesy", "06-panehesy"],
  ["Huya", "06-huya"],
  ["Thutmose", "06-thutmose"],
  ["Paatenemheb", "06-paatenemheb"],
  ["Pahanate", "06-pahanate"],
  ["Pawura", "06-pawura"],
  ["Ha'ip", "06-haip"],
  ["Rianap", "06-rianap"],
  ["Tahmaya", "06-tahmaya"],
  ["Hatip", "06-hatip"],
  ["Zida", "06-zida"],
  ["Artatama", "06-artatama"],
  ["Shuttarna", "06-shuttarna"],
  ["Enlil-kidinni", "06-enlil-kidinni"],
  ["Ili-ippashra", "06-ili-ippashra"],
  ["Shindishugab", "06-shindishugab"],
  ["Ashur-iddin", Invented],
  ["Adad-iddina", Invented],
  ["Eshuwara", Invented],
  ["Ilirabih", "06-ilirabih"],
  ["Pu-Baʿlu", "06-pu-balu"],
  ["Baʿluya", "06-baluya"],
  ["Akit-Teshup", "06-akit-teshup-of-niya"],
  ["Tagi", "06-tagi"],
  ["Yashdata", "06-yashdata"],
  ["Endaruta", "06-endaruta"],
  ["Shum-Adda", "06-shum-adda"],
  ["Shutatna", "06-shutatna"],
  ["Yapah-Hadda", "06-yapah-hadda"],
  ["Arzawiya", "06-arzawiya"],
  ["Teuwatti", "06-teuwatti"],
  ["Biridashwa", "06-biridashwa"],
  ["Yapahu", "06-yapahu"],
  ["Hekanefer", "06-hekanefer"],
  ["Nehesy", Invented],
  ["Pakharu", Invented],
  ["Mane", "06-mane"],
  ["Keliya", "06-keliya"],
  ["Pirissi", "06-pirissi"],
  ["Tulubri", "06-tulubri"],
  ["Haamashshi", "06-haamashshi"],
  ["Artessupa", "06-artessupa"],
  ["Mazipalali", "06-mazipalali"],
  ["Yanhamu", "06-yanhamu"],
  ["Ilimilku", "06-ilimilku"],
  ["Shatu-ili", Invented],
]);

/** A map of keys to anchors, written as the groups that share one line: `on("10-egypt", "delta", "memphis")`. */
const on = (anchor: string, ...keys: string[]): [string, string][] => keys.map((k) => [k, anchor]);

/** The same anchor's own key: `own("10-", "seha", "apasa")` gives `seha -> 10-seha`, as the dossiers' city tables are keyed by map id. */
const own = (prefix: string, ...keys: string[]): [string, string][] => keys.map((k) => [k, prefix + k]);

/**
 * Each city's water (`CityWaters`): the water dossier's row for it (`docs/history/10-water.md`), or {@link Invented} for
 * the cities it has no row for, whose water the game guessed from their land.
 */
export const WaterAnchors: ReadonlyMap<string, string> = new Map<string, string>([
  ...own("10-", "seha", "apasa", "mira", "tuwanuwa", "hattusa", "sapinuwa", "nesa", "kizzuwatna", "harran", "washukanni", "taidu"),
  ...own("10-", "terqa", "nineveh", "arbela", "ashur", "ekallate", "sippar", "durkurigalzu", "babylon", "nippur", "ur", "dilmun"),
  ...own("10-", "delta", "sinai", "memphis", "akhetaten", "thebes", "nubia", "kalavasos", "enkomi", "isuwa", "carchemish", "alalakh"),
  ...own("10-", "aleppo", "ugarit", "nuhashshe", "qatna", "qadesh", "amurru", "sumur", "arwad", "byblos", "sidon", "damascus", "tyre"),
  ...own("10-", "megiddo", "shechem", "jerusalem", "gaza", "suhu", "arrapha", "susa", "lukka", "kaska", "steppe"),
  ...on(Invented, "tunip", "niya", "samuha", "gezer", "pella", "aijalon", "akko", "ashkelon", "lachish", "beirut", "ashtaroth"),
  ...on(Invented, "gath", "hazor", "azzi", "libya", "shasu"),
]);

/**
 * Each city's walls at the start (`StartWalls`): the walls dossier's row for it (`docs/history/12-walls-roads-harbours.md`,
 * "Walls by city"), or {@link Invented} for the towns it knows nothing of, which start with one level [G].
 */
export const WallAnchors: ReadonlyMap<string, string> = new Map<string, string>([
  ...own("12-walls-", "hattusa", "babylon", "ashur", "washukanni", "apasa", "enkomi", "nubia", "memphis", "sapinuwa"),
  ...own("12-walls-", "nineveh", "arbela", "durkurigalzu", "qatna", "qadesh", "carchemish", "aleppo", "ugarit", "arwad", "byblos"),
  ...own("12-walls-", "tyre", "shechem", "susa", "isuwa", "alalakh", "nuhashshe", "amurru", "sidon", "damascus", "megiddo"),
  ...own("12-walls-", "jerusalem", "arrapha", "hazor", "gaza", "sumur"),
  ...on("12-walls-delta-sinai", "delta"),
  ...on("12-walls-sippar-nippur-ur", "sippar", "nippur", "ur"),
  ...on(Invented, "tunip", "niya", "beirut", "pella", "ashtaroth", "azzi", "seha", "mira", "terqa", "akko", "gezer", "ashkelon"),
  ...on(Invented, "lachish", "gath", "aijalon", "samuha"),
]);

/** Who speaks what in each province (`peopleSpeak`): the languages dossier's line for it (`docs/history/07-languages.md`, "By province"). */
export const TongueAnchors: ReadonlyMap<string, string> = new Map<string, string>([
  ...on("07-egypt", "delta", "memphis", "akhetaten", "thebes"),
  ...own("07-", "sinai", "nubia", "dilmun", "arrapha", "carchemish", "ugarit", "beirut", "samuha", "kizzuwatna", "isuwa", "lukka", "susa", "kaska"),
  ...on("07-babylonia", "sippar", "durkurigalzu", "babylon", "nippur", "ur"),
  ...on("07-assyria", "ashur", "nineveh", "arbela", "ekallate"),
  ...on("07-mitanni", "washukanni", "taidu", "harran", "terqa"),
  ...on("07-middle-euphrates", "suhu"),
  ...on("07-aleppo-alalakh", "aleppo", "alalakh"),
  ...on("07-nuhashshe-qatna", "nuhashshe", "qatna"),
  ...on("07-qadesh-damascus", "qadesh", "damascus"),
  ...on("07-amurru-coast", "amurru", "sumur", "arwad", "byblos", "sidon", "tyre"),
  ...on("07-niya-tunip", "niya", "tunip"),
  ...on("07-pella-ashtaroth", "pella", "ashtaroth"),
  ...on("07-azzi-libya-shasu", "azzi", "libya", "shasu"),
  ...on("07-canaan", "megiddo", "gaza", "jerusalem", "shechem", "akko", "hazor", "gezer", "ashkelon", "lachish", "gath", "aijalon"),
  ...on("07-hatti", "hattusa", "sapinuwa"),
  ...on("07-kanesh", "nesa", "tuwanuwa"),
  ...on("07-arzawa", "apasa", "mira", "seha"),
  ...on("07-alashiya", "enkomi", "kalavasos"),
  ...on("07-sutean-steppe", "steppe"),
]);

/** Each language the game knows: the languages dossier's line for it, or for a tongue beyond the edges the line of its people. */
export const LanguageAnchors: ReadonlyMap<string, string> = new Map<string, string>([
  ...on("07-babylonian", "Akkadian"),
  ...own("07-", "egyptian", "canaanite", "ugaritic", "amorite", "hurrian", "hittite", "luwian", "hattic", "elamite", "kassite", "nubian", "kaskean").map(
    ([k, a]): [string, string] => [k[0]!.toUpperCase() + k.slice(1), a],
  ),
  ...on("07-alashiyan", "Alashiyan"),
  ...on("07-mycenaean-greek", "Mycenaean Greek"),
  ...on("08-tin-lands", "the tin lands' tongue"),
  ...on("07-dilmun", "Dilmunite"),
  ...on("07-azzi-libya-shasu", "Hayasan", "Libyan"),
  ...on("08-keftiu", "Keftian"),
  ...on("08-sherden", "Sherden"),
  ...on("08-elam", "Zagros"),
  ...on("08-dilmun-and-magan", "Maganite"),
  ...on("08-eastern-road", "Marhashian"),
  ...on("08-kush-irem-medjay", "Medjay"),
]);

/** Each door at the map's edge (`Doors`), by its id, and each land beyond it, by name: the edges dossier's line (`docs/history/08-beyond-the-edges.md`). */
export const DoorAnchors: ReadonlyMap<string, string> = new Map<string, string>([
  ["westsea", "08-western-sea"],
  ["east", "08-eastern-road"],
  ["gulf", "08-gulf"],
  ["nile", "08-nile"],
  ["redsea", "08-red-sea"],
  ["Ahhiyawa", "08-ahhiyawa"],
  ["Keftiu", "08-keftiu"],
  ["the western isles", "08-sherden"],
  ["the far west", "08-sea-peoples"],
  ["Elam", "08-elam"],
  ["the Zagros", "08-elam"],
  ["the tin lands", "08-tin-lands"],
  ["Marhashi", "08-eastern-road"],
  ["Dilmun", "08-dilmun-and-magan"],
  ["Magan", "08-dilmun-and-magan"],
  ["Kush", "08-kush-irem-medjay"],
  ["Irem", "08-kush-irem-medjay"],
  ["the eastern desert", "08-kush-irem-medjay"],
  ["Punt", "08-punt"],
  ["the Red Sea's shore", "08-red-sea"],
]);

/**
 * Each crossing (`Crossings`), by its two provinces as `a-b`: the geography dossier's line for it
 * (`docs/history/02-geography.md`, "The great routes", "Terrain by connection" and "The crossings of 1346").
 */
export const CrossingAnchors: ReadonlyMap<string, string> = new Map<string, string>([
  ...on("02-terrain-passes", "tuwanuwa-kizzuwatna", "nesa-kizzuwatna", "nesa-carchemish", "kizzuwatna-carchemish", "byblos-damascus"),
  ...on("02-taurus-passes", "kizzuwatna-alalakh"),
  ...on("02-nb-samuha-carchemish", "samuha-carchemish"),
  ...on("02-crossing-lebanon-beirut", "sidon-damascus", "beirut-damascus"),
  ...on("02-euphrates-road", "carchemish-harran", "aleppo-harran"),
  ...on("02-crossing-upper-euphrates", "isuwa-harran", "samuha-isuwa"),
  ...on("02-crossing-tigris", "taidu-nineveh"),
  ...on("02-crossing-marassantiya", "hattusa-nesa", "hattusa-tuwanuwa"),
  ...on("02-crossing-shabtuna", "damascus-qadesh"),
  ...on("02-crossing-orontes-niya", "ugarit-niya"),
  ...on("02-crossing-jordan-hazor", "hazor-damascus", "hazor-ashtaroth"),
  ...on("02-crossing-jordan-beth-shan", "megiddo-pella", "shechem-pella", "hazor-pella"),
  ...on("02-nb-jericho-fords", "jerusalem-pella"),
  ...on("02-syrian-desert", "steppe-qatna", "steppe-damascus"),
  ...on("02-nb-sutean-steppe", "steppe-terqa", "steppe-aleppo", "steppe-harran", "steppe-nuhashshe", "steppe-qadesh"),
  ...on("02-nb-delta-gaza", "delta-sinai"),
  ...on("02-ways-of-horus", "gaza-sinai"),
  ...on("02-route-thebes-redsea", "thebes-redsea"),
  ...on("02-route-sinai-redsea", "sinai-redsea"),
  ...on("02-crossing-western-desert", "libya-delta", "libya-memphis"),
  ...on("02-crossing-negev", "shasu-gath", "shasu-sinai", "shasu-gaza", "shasu-lachish"),
]);

/** Each attested road distance (`AttestedKm`), by its two provinces as `a-b`: the geography dossier's line for it. */
export const DistanceAnchors: ReadonlyMap<string, string> = new Map<string, string>([
  ...on("02-route-delta-gaza", "delta-sinai", "sinai-gaza"),
  ...on("02-route-memphis-akhetaten", "memphis-akhetaten"),
  ...on("02-route-akhetaten-thebes", "akhetaten-thebes"),
  ...on("02-route-thebes-redsea", "thebes-redsea"),
  ...on("02-route-sinai-redsea", "sinai-redsea"),
  ...on("02-route-megiddo-damascus", "megiddo-hazor", "hazor-damascus"),
  ...on("02-route-byblos-damascus", "byblos-damascus"),
  ...on("02-route-damascus-qadesh", "damascus-qadesh"),
  ...on("02-route-carchemish-harran", "carchemish-harran"),
  ...on("02-route-harran-washukanni", "harran-washukanni"),
  ...on("02-route-hattusa-kanesh", "hattusa-nesa"),
  ...on("02-route-kanesh-kizzuwatna", "nesa-kizzuwatna"),
  ...on("02-route-enkomi-ugarit", "ugaritwaters-enkomiwaters"),
]);

/**
 * Each army and fleet at the start (`StartUnits`), by its Great King, or by its city's capital province for a city-state's
 * (`StartUnits`, by its home): the armies dossier's line for its size, or {@link Invented} for a city whose men are the game's
 * old guess from its land's yield (`docs/history/11-armies-and-fleets.md`).
 */
export const ArmyAnchors: ReadonlyMap<string, string> = new Map<string, string>([
  ...own("11-", "Egypt", "Hatti", "Mitanni", "Babylonia", "Assyria", "Arzawa", "Alashiya").map(([k, a]): [string, string] => [k, a.toLowerCase() + "-army"]),
  ...on("11-canaanite-town", "megiddo", "shechem", "jerusalem", "akko", "hazor", "gezer", "ashkelon", "lachish", "pella", "ashtaroth", "beirut"),
  ...own("11-", "byblos", "amurru", "damascus", "ugarit"),
  ...on("11-syrian-cities", "qatna", "qadesh", "aleppo", "alalakh", "nuhashshe"),
  ...on("11-arwad-tyre-sidon", "tyre", "sidon"),
  ...on("11-raiders", "kaska", "lukka", "steppe"),
  // The cities the armies dossier gives no range for keep the game's old guess, 50 men for each shekel their land yields
  ...on(Invented, "seha", "mira", "terqa", "isuwa", "azzi", "carchemish", "niya", "tunip", "gath", "aijalon", "arrapha", "susa", "libya", "shasu"),
]);

/** Each fleet at the start, by its Great King or its city's capital province: the armies dossier's line in "Fleets". */
export const FleetAnchors: ReadonlyMap<string, string> = new Map<string, string>([
  ...own("11-", "Egypt", "Hatti", "Arzawa", "Alashiya").map(([k, a]): [string, string] => [k, a.toLowerCase() + "-fleet"]),
  ["ugarit", "11-ugarit-fleet"],
  ...on("11-phoenician-fleets", "arwad", "sidon", "tyre", "byblos"),
]);

/** Each port that starts with more than a beach (`startHarbour` above 1): the geography dossier's line in "Coasts and harbours". */
export const HarbourAnchors: ReadonlyMap<string, string> = new Map<string, string>([
  ...own("02-", "ugarit", "byblos", "sidon", "tyre", "akko", "enkomi"),
  ...on("02-peru-nefer", "delta"),
  ...on("12-harbour-islands", "arwad"),
  ...on("02-gaza-ashkelon", "gaza", "ashkelon"),
  ...on("02-kizzuwatna-harbours", "kizzuwatna"),
  ...on("02-apasa-millawanda", "apasa"),
]);

/** Each river the game draws or crosses (`Rivers`, `CrossedRivers`), by its id: the geography dossier's row in "Rivers". */
export const RiverAnchors: ReadonlyMap<string, string> = new Map<string, string>([
  ...own("02-", "nile", "euphrates", "tigris", "orontes"),
  ["halys", "02-marassantiya"],
  ["jordan", "02-jordan-litani"],
]);
