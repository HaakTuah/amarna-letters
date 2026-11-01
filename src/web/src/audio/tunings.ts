/**
 * The seven Babylonian lyre tunings (item 19+++), as the tablets from Nippur (CBS 10996) and Ur (UET VII 126) name them,
 * read as the seven diatonic modes after Kilmer and Crocker; and each court's home mode, as presentation only ("Different
 * data, same rules": voice may differ by power). One score, written in degrees, plays in any of them.
 */
import type { Power } from "@amarna/engine";

export type Tuning = "kitmum" | "isartum" | "embubum" | "pitum" | "nid_qablim" | "nis_tuhrim" | "qablitum";

export interface TuningInfo {
  id: Tuning;
  /** The name as the theory texts write it. */
  name: string;
  /** The modern mode it is read as. */
  mode: string;
  /** Semitones above the scale's first note, degree by degree. */
  steps: readonly number[];
}

/** From the brightest to the darkest: each one step darker lowers one degree by a semitone. */
export const Tunings: readonly TuningInfo[] = [
  { id: "kitmum", name: "kitmum", mode: "Lydian", steps: [0, 2, 4, 6, 7, 9, 11] },
  { id: "isartum", name: "išartum", mode: "Ionian", steps: [0, 2, 4, 5, 7, 9, 11] },
  { id: "embubum", name: "embūbum", mode: "Mixolydian", steps: [0, 2, 4, 5, 7, 9, 10] },
  { id: "pitum", name: "pītum", mode: "Dorian", steps: [0, 2, 3, 5, 7, 9, 10] },
  { id: "nid_qablim", name: "nīd qablim", mode: "Aeolian", steps: [0, 2, 3, 5, 7, 8, 10] },
  { id: "nis_tuhrim", name: "nīš tuḫrim", mode: "Phrygian", steps: [0, 1, 3, 5, 7, 8, 10] },
  { id: "qablitum", name: "qablītum", mode: "Locrian", steps: [0, 1, 3, 5, 6, 8, 10] },
];

const byId = new Map(Tunings.map((t, i) => [t.id, { t, i }]));

export const tuning = (id: Tuning): TuningInfo => byId.get(id)!.t;

/** The MIDI note of a degree (0 the tonic, 7 the octave above, negative below) in a tuning on a tonic. */
export function pitch(id: Tuning, tonic: number, degree: number): number {
  const steps = tuning(id).steps;
  const o = Math.floor(degree / 7);
  const d = degree - 7 * o;
  return tonic + 12 * o + steps[d];
}

/** A tuning moved `by` steps brighter (positive) or darker (negative), stopping at the ends. */
export function shift(id: Tuning, by: number): Tuning {
  const i = byId.get(id)!.i;
  return Tunings[Math.max(0, Math.min(Tunings.length - 1, i - by))].id;
}

/**
 * Each court's home mode (readings, in the item's report): Ugarit's and Mitanni's the hymn's own nīd qablim (h.6 is
 * "in the nitkibli tuning"), Babylonia's išartum (the "normal" tuning the Nippur text starts from), Hatti's nīš tuḫrim,
 * Assyria's pītum, Arzawa's and Alashiya's embūbum, and Egypt's kitmum: a reading, since how Egypt's harps were tuned
 * is unknown. Every other court plays in nīd qablim.
 */
const Home: Partial<Record<string, Tuning>> = {
  Ugarit: "nid_qablim",
  Mitanni: "nid_qablim",
  Babylonia: "isartum",
  Hatti: "nis_tuhrim",
  Assyria: "pitum",
  Arzawa: "embubum",
  Alashiya: "embubum",
  Egypt: "kitmum",
};

export const homeMode = (p: Power | null): Tuning => (p === null ? "nid_qablim" : (Home[p] ?? "nid_qablim"));
