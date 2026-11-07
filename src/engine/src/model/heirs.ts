/**
 * The record of the kings who followed (build order item 17b, "One scoreboard for every person"): when a king dies, his
 * heir is the next name on his realm's line, each heir after him the next again, as far down as the record goes; past it,
 * a son or brother drawn as facts, named in his land's style. The lines are the dossier's
 * (`docs/history/16-the-kings-who-followed.md`, each by its anchor), the king of 1346 left out. Data only.
 */
import type { KingTrait } from "./kings.ts";
import type { Power } from "./power.ts";

/** One name on a realm's line. */
export interface Heir {
  /** His name as the record gives it; null where the record names the heir but not the man (Tunip's "son of Aki-Teshup"). */
  readonly name: string | null;
  /** How he stood to the king before him, as the record gives it ("son", "brother", "an official", "a usurper"). */
  readonly kin: string;
  /** What deeds show of him, in a line, for his card; empty where the record shows nothing. */
  readonly about: string;
  /** The traits his deeds show (0 to 100); the rest are drawn as a stranger's, about the middle. */
  readonly traits?: Partial<Record<KingTrait, number>>;
}

/** A realm's line: the dossier's anchor and the names after the king of 1346, in order. */
export interface Line {
  readonly anchor: string;
  readonly heirs: readonly Heir[];
}

const h = (name: string | null, kin: string, about = "", traits?: Partial<Record<KingTrait, number>>): Heir => ({ name, kin, about, traits });

/** The lines the record keeps; a realm not here has no successor on record, and its heirs are drawn. */
export const Lines: Partial<Record<Power, Line>> = {
  Egypt: {
    anchor: "16-line-egypt",
    heirs: [
      h("Smenkhkare", "of kin unknown"),
      h("Tutankhamun", "son", "A boy king steered by his officials.", { aggression: 25, caution: 65 }),
      h("Ay", "an official", "The God's Father, who took the throne as an old man."),
      h("Horemheb", "an official", "The general, a stern restorer who struck at corrupt officials and soldiers.", { honesty: 70, aggression: 60 }),
      h("Ramesses", "an official", "Horemheb's vizier."),
      h("Seti", "son", "A warrior king, at war with the Shasu, Qadesh, the Hittites and the Libyans.", { aggression: 80 }),
      h("Ramesses the Second", "son", "A warrior who made peace with Hatti, and a great builder.", { aggression: 65, pride: 90, diplomacy: 65 }),
      h("Merneptah", "son", "He beat the Libyans and the peoples of the sea.", { aggression: 65 }),
      h("Seti the Second", "son"),
    ],
  },
  Hatti: {
    anchor: "16-line-hatti",
    heirs: [
      h("Arnuwanda", "son", "The heir, who had led armies in Syria.", { aggression: 65 }),
      h("Mursili", "brother", "Pious and dutiful, and slow to forgive a mockery.", { honesty: 70, vengeance: 85 }),
      h("Muwatalli", "son", "He moved his seat south and fought at Qadesh.", { aggression: 65 }),
      h("Urhi-Teshub", "son", "A son of a lesser wife."),
      h("Hattusili", "uncle", "A usurper who wrote an apology for it, and made peace with Egypt.", { diplomacy: 75, cunning: 70 }),
      h("Tudhaliya", "son", "He took Alashiya.", { aggression: 60 }),
      h("Arnuwanda the Third", "son"),
      h("Suppiluliuma the Second", "brother"),
    ],
  },
  Babylonia: {
    anchor: "16-line-babylonia",
    heirs: [
      h("Kara-hardash", "son or grandson"),
      h("Nazi-Bugash", "a usurper", "A son of nobody, raised by the army."),
      h("Kurigalzu", "son", "Warlike: he beat Elam and fought Assyria.", { aggression: 75 }),
      h("Nazi-Maruttash", "son"),
      h("Kadashman-Turgu", "son"),
      h("Kadashman-Enlil", "son", "A boy whose vizier ruled for him.", { caution: 65 }),
      h("Kudur-Enlil", "of kin unclear"),
      h("Shagarakti-Shuriash", "son"),
      h("Kashtiliash", "son"),
    ],
  },
  Mitanni: {
    anchor: "16-line-mitanni",
    heirs: [
      h("Shattiwaza", "son", "An exile who won back his throne with a foreign army.", { diplomacy: 65 }),
      h("Shattuara", "of kin unclear", "He rose against Assyria and was made its vassal."),
      h("Wasashatta", "son", "He rose again, and sought help that never came.", { aggression: 60 }),
      h("Shattuara the Second", "of kin unclear"),
    ],
  },
  Assyria: {
    anchor: "16-line-assyria",
    heirs: [
      h("Enlil-nirari", "son"),
      h("Arik-den-ili", "son", "He campaigned in the mountains.", { aggression: 60 }),
      h("Adad-nirari", "son", "Warlike: he beat Babylon and crushed Hanigalbat.", { aggression: 80 }),
      h("Shalmaneser", "son", "He boasted of blinding his captives.", { aggression: 75, vengeance: 85 }),
      h("Tukulti-Ninurta", "son", "He sacked Babylon.", { aggression: 85, pride: 90 }),
      h("Ashur-nadin-apli", "son"),
      h("Ashur-nirari", "son"),
      h("Enlil-kudurri-usur", "uncle"),
      h("Ninurta-apil-Ekur", "a usurper"),
    ],
  },
  Arzawa: {
    anchor: "16-line-arzawa",
    heirs: [h("Uhhaziti", "of kin unknown", "He defied Hatti and took in its fugitives.", { aggression: 65, pride: 70 }), h("Piyama-Kurunta", "son")],
  },
  Alashiya: { anchor: "16-line-alashiya", heirs: [h("Kushmeshusha", "of kin unknown")] },
  Seha: {
    anchor: "16-line-seha",
    heirs: [
      h("Ura-Hattusa", "son"),
      h("Manapa-Tarhunta", "brother", "A wavering survivor.", { caution: 70 }),
      h("Masturi", "son"),
      h("Tarhunaradu", "a usurper"),
    ],
  },
  Mira: {
    anchor: "16-line-mira",
    heirs: [h("Mashhuiluwa", "of kin unknown", "Set in by a Great King, he later rose against him."), h("Kupanta-Kurunta", "nephew"), h("Alantalli", "of kin unclear"), h("Tarkasnawa", "son")],
  },
  Azzi: { anchor: "16-line-azzi", heirs: [h("Anniya", "of kin unclear", "He fought Hatti for years.", { aggression: 65 })] },
  Isuwa: { anchor: "16-line-isuwa", heirs: [h("Ali-Sharruma", "of kin unclear"), h("Ari-Sharruma", "of kin unclear"), h("Ehli-Sharruma", "of kin unclear")] },
  Carchemish: {
    anchor: "16-line-carchemish",
    heirs: [
      h("Piyassili", "a conqueror's son", "A general, set over Syria.", { aggression: 70 }),
      h("Shahurunuwa", "son"),
      h("Ini-Teshub", "son"),
      h("Talmi-Teshub", "son"),
      h("Kuzi-Teshub", "son"),
    ],
  },
  Aleppo: { anchor: "16-line-aleppo", heirs: [h("Telipinu", "a conqueror's son", "A priest-king."), h("Talmi-Sharruma", "son"), h("Halpa-ziti", "son")] },
  Ugarit: {
    anchor: "16-line-ugarit",
    heirs: [h("Arhalba", "son"), h("Niqmepa", "brother"), h("Ammistamru", "son"), h("Ibiranu", "son", "He withheld his homage.", { pride: 65 }), h("Niqmaddu the Third", "son"), h("Ammurapi", "of kin unclear")],
  },
  Amurru: {
    anchor: "16-line-amurru",
    heirs: [h("DU-Teshub", "son"), h("Duppi-Teshub", "son"), h("Benteshina", "son", "A survivor, deposed and restored.", { caution: 65 }), h("Shaushga-muwa", "son")],
  },
  Qadesh: { anchor: "16-line-qadesh", heirs: [h("Niqmaddu", "son", "He killed his own father in a revolt.", { aggression: 70, honesty: 25 })] },
  Nuhashshe: { anchor: "16-line-nuhashshe", heirs: [h("Tette", "of kin unclear", "He rose against Hatti.")] },
  Niya: { anchor: "16-line-niya", heirs: [h("Akit-Teshup", "brother", "He turned the town against his brother.", { cunning: 70, honesty: 30 })] },
  Tunip: { anchor: "16-line-tunip", heirs: [h(null, "the son of Aki-Teshup", "The son of Aki-Teshup, whom the elders asked for as their king.")] },
  Elam: { anchor: "16-line-elam", heirs: [h("Untash-Napirisha", "son", "A pious builder.", { commerce: 60 }), h("Unpahash-Napirisha", "cousin")] },
  Byblos: { anchor: "16-line-byblos", heirs: [h("Ilirabih", "younger brother", "He shut his brother out of the city.", { honesty: 35 })] },
  Akko: { anchor: "16-line-akko", heirs: [h("Zatatna", "son")] },
  Gezer: { anchor: "16-line-gezer", heirs: [h("Yapahu", "of kin unknown"), h("Ba'lu-shipti", "of kin unknown")] },
  Lachish: { anchor: "16-line-lachish", heirs: [h("Shipti-Ba'lu", "of kin unknown"), h("Yabni-ilu", "of kin unknown")] },
};

/** First guesses (item 18 tunes them): how far a trait the record does not show is drawn either side of the middle; the chance in a hundred that a drawn heir is a son (else a brother). */
export const HeirData = { spread: 25, son: 75 } as const;
