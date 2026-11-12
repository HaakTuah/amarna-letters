/** Places by their own names: each province's modern name and, where its name alone does not say it, what it is. */

/**
 * Item 17+ ("Places by their own names"): the modern name of each land province, for the province card's second line
 * ("Dimashqa, today Damascus") and the rulebook's gazetteer; the map, the seat view and every request show the period
 * name only. Every province has a proper name, never a description (polish lane, 2 November 2026): where the period gives
 * none, the oldest name the sources do give (Tamassos for the copper hills of Cyprus), and a modern one only where no
 * ancient name survives (Enkomi); what a description said is on the card ({@link describedAs}). Each checked against the dossiers (`docs/history/02-geography.md`, "Names for the provinces";
 * the politics dossier's table) and graded in the item's report.
 */
export const ModernNames: ReadonlyMap<string, string> = new Map<string, string>([
  ["tuwanuwa", "Tyana (Kemerhisar)"],
  ["hattusa", "Boğazkale"],
  ["sapinuwa", "Ortaköy"],
  ["nesa", "Kültepe (Kanesh)"],
  ["samuha", "Kayalıpınar, probably"],
  ["kizzuwatna", "Cilicia"],
  ["seha", "the Gediz valley, by most readings"],
  ["apasa", "Ephesus (Selçuk)"],
  ["mira", "the upper Meander valley"],
  ["harran", "Harran"],
  ["washukanni", "Tell Fakhariyah, probably"],
  ["taidu", "Tell Hamidiya, probably"],
  ["terqa", "Tell Ashara"],
  ["nineveh", "Nineveh (Mosul)"],
  ["arbela", "Erbil"],
  ["ashur", "Qal'at Sherqat"],
  ["ekallate", "Ekallatum, its site not securely found"],
  ["sippar", "Tell Abu Habbah"],
  ["durkurigalzu", "Aqar Quf"],
  ["babylon", "Babylon"],
  ["nippur", "Nuffar"],
  ["ur", "Ur (Tell el-Muqayyar)"],
  ["dilmun", "Bahrain"],
  ["delta", "the Nile Delta"],
  ["sinai", "the north Sinai"],
  ["memphis", "Memphis (Mit Rahina)"],
  ["akhetaten", "Amarna"],
  ["thebes", "Thebes (Luxor)"],
  ["nubia", "Nubia"],
  ["kalavasos", "Kalavasos"],
  ["isuwa", "the Elazığ plain"],
  ["azzi", "the Erzincan highlands"],
  ["carchemish", "Carchemish (Jerablus)"],
  ["alalakh", "Tell Atchana"],
  ["aleppo", "Aleppo"],
  ["ugarit", "Ras Shamra"],
  ["nuhashshe", "the land between Aleppo and Hama"],
  ["niya", "Qal'at al-Mudiq, probably"],
  ["tunip", "Tell Acharneh, probably"],
  ["qatna", "Tell Mishrifeh"],
  ["qadesh", "Tell Nebi Mend"],
  ["amurru", "the Akkar plain and the hills behind it"],
  ["sumur", "Tell Kazel"],
  ["arwad", "Arwad (Ruad)"],
  ["byblos", "Byblos (Jbeil)"],
  ["beirut", "Beirut"],
  ["sidon", "Sidon (Saida)"],
  ["damascus", "Damascus"],
  ["tyre", "Tyre (Sour)"],
  ["megiddo", "Megiddo"],
  ["shechem", "Shechem (Nablus)"],
  ["jerusalem", "Jerusalem"],
  ["akko", "Acre"],
  ["hazor", "Hazor"],
  ["gezer", "Gezer"],
  ["ashkelon", "Ashkelon"],
  ["lachish", "Lachish (Tell ed-Duweir)"],
  ["gath", "Gath (Tell es-Safi)"],
  ["aijalon", "the Aijalon valley; the site is uncertain"],
  ["pella", "Pella (Tabaqat Fahl)"],
  ["ashtaroth", "Tell Ashtara"],
  ["gaza", "Gaza"],
  ["suhu", "the middle Euphrates by Anah"],
  ["arrapha", "Kirkuk"],
  ["susa", "Susa (Shush)"],
  ["lukka", "Lycia"],
  ["kaska", "the Pontic mountains"],
  ["steppe", "the Syrian desert (Palmyra)"],
  ["libya", "Libya (Marmarica)"],
  ["shasu", "Edom and the Negev"],
]);

/** A province's modern name, where one is given; null for the seas and where the name is modern already (Enkomi). */
export const modernOf = (id: string): string | null => ModernNames.get(id) ?? null;

/**
 * What a province is, for the card under its name, where the name alone does not say ("Places by their own names": what a
 * description said moves to the province card). The human player's card only; no request carries it.
 */
const Descriptions: ReadonlyMap<string, string> = new Map<string, string>([
  ["kalavasos", "the copper hills of Alashiya"],
  ["enkomi", "the harbour of Alashiya"],
  ["kaska", "the hills of the Kaska"],
  ["steppe", "the steppe of the Suteans"],
  ["libya", "the land of the Tjehenu and Tjemehu"],
  ["shasu", "the land of the Shasu"],
]);

/** What a province is, where its card says it ({@link Descriptions}); null elsewhere. */
export const describedAs = (id: string): string | null => Descriptions.get(id) ?? null;
