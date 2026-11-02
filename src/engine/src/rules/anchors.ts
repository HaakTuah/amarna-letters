/**
 * Where each real fact in the game's data rests (the full history check, archive item 167): the anchor of its line in
 * `docs/history/` (`<a id="..."></a>`), a line that quotes the few words of its source it relies on; or {@link Invented}
 * where the sources are silent and the game made it up [G]. Data only: never shown to a king, a character or a model.
 */
export const Invented = "invented";

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
