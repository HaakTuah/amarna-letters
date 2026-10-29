/**
 * The lakes and marshes of 1346 that today's data lacks or draws smaller (build order item 11c++; dossier
 * `docs/history/13-the-land-drawn.md`): Lake Huleh and its swamp, drained in the 1950s; the Lake of Antioch in the Amuq
 * plain, Alalakh's, drained in the 1970s; the Faiyum's lake, larger than today's Birket Qarun; the Delta's lagoons along
 * its shore and Lake Mareotis behind it; and the marshes at the head of the Gulf, round Lagash, Ur and the Tigris' mouth.
 * Each traced by hand from the dossier's lines, in latitude and longitude; drawing only.
 */
import { LL, type Pt } from "./features.ts";

/** Open water. */
export const PeriodLakes: readonly Pt[][] = [
  // Lake Huleh, about 5 km by 4.
  LL(33.1, 35.603, 33.097, 35.625, 33.083, 35.638, 33.06, 35.636, 33.043, 35.622, 33.047, 35.602, 33.065, 35.594, 33.088, 35.596),
  // The Lake of Antioch, in the Amuq plain north-east of Alalakh.
  LL(36.42, 36.27, 36.41, 36.36, 36.36, 36.41, 36.3, 36.4, 36.26, 36.33, 36.28, 36.25, 36.34, 36.22, 36.39, 36.23),
  // The Faiyum's lake, its shore higher than Birket Qarun's today.
  LL(29.6, 30.38, 29.57, 30.62, 29.52, 30.85, 29.43, 30.95, 29.38, 30.8, 29.42, 30.55, 29.48, 30.4, 29.55, 30.35),
  // Lake Mareotis, behind the coastal ridge.
  LL(31.18, 29.62, 31.2, 29.85, 31.19, 30.02, 31.13, 30.14, 31.06, 30.12, 31.04, 29.95, 31.03, 29.72, 31.08, 29.6),
  // The lagoons of the Delta's shore: Idku, Burullus, and Manzala's by Pelusium's branch.
  LL(31.3, 30.12, 31.31, 30.3, 31.26, 30.32, 31.24, 30.15),
  LL(31.6, 30.55, 31.6, 30.85, 31.55, 31.1, 31.45, 31.12, 31.42, 30.9, 31.45, 30.62),
  LL(31.45, 31.8, 31.38, 32.1, 31.25, 32.25, 31.12, 32.2, 31.1, 32.0, 31.2, 31.85, 31.35, 31.78),
];

/** Marsh: reed beds and standing water. */
export const PeriodMarshes: readonly Pt[][] = [
  // The Huleh swamp, north of the lake.
  LL(33.175, 35.59, 33.175, 35.645, 33.1, 35.64, 33.1, 35.597),
  // The marshes at the Gulf's head: round Lagash and Girsu, east of Ur, and along the lower Tigris towards Susa's plain.
  LL(31.75, 46.3, 31.85, 46.8, 31.95, 47.35, 31.75, 47.75, 31.4, 47.8, 31.1, 47.65, 30.95, 47.3, 30.98, 46.8, 31.1, 46.45, 31.35, 46.25, 31.6, 46.2),
];
