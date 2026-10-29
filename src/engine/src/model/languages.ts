/**
 * Languages (build order item 12, "Languages", "Where each language is spoken", "Who speaks what", "The court languages"):
 * the map data of who speaks what where, from `docs/history/07-languages.md` ("By province", "The languages") and the
 * doors' peoples of `docs/history/08-beyond-the-edges.md`; and the pure rules on it: a skill buys time, never noise.
 */
import { Dict } from "../core/collections.ts";
import type { Power } from "./power.ts";

/** How widely a language is spoken in a province, in a hundred: wide (most people), common, some, few (scribes, a court). */
export const Spread = { wide: 100, common: 60, some: 30, few: 10 } as const;
const { wide, common, some, few } = Spread;

/**
 * The languages spoken in each province, and how widely ("By province" in the languages dossier; shares are its first
 * guesses). A court adds its own language and, where it keeps Akkadian scribes, Akkadian ({@link spokenIn}).
 */
const ByProvince: Record<string, readonly (readonly [string, number])[]> = {
  delta: [
    ["Egyptian", wide],
    ["Canaanite", some],
    ["Akkadian", few],
  ],
  memphis: [
    ["Egyptian", wide],
    ["Canaanite", some],
    ["Akkadian", few],
  ],
  akhetaten: [["Egyptian", wide]],
  thebes: [["Egyptian", wide]],
  sinai: [
    ["Amorite", common],
    ["Egyptian", some],
  ],
  nubia: [
    ["Nubian", wide],
    ["Egyptian", common],
  ],
  sippar: [
    ["Akkadian", wide],
    ["Kassite", few],
  ],
  durkurigalzu: [
    ["Akkadian", wide],
    ["Kassite", few],
  ],
  babylon: [
    ["Akkadian", wide],
    ["Kassite", few],
  ],
  nippur: [
    ["Akkadian", wide],
    ["Kassite", few],
  ],
  ur: [["Akkadian", wide]],
  dilmun: [
    ["Dilmunite", wide],
    ["Akkadian", some],
  ],
  ashur: [
    ["Akkadian", wide],
    ["Hurrian", some],
  ],
  ekallate: [
    ["Akkadian", wide],
    ["Hurrian", some],
  ],
  nineveh: [
    ["Akkadian", wide],
    ["Hurrian", common],
  ],
  arbela: [
    ["Akkadian", wide],
    ["Hurrian", common],
  ],
  arrapha: [
    ["Hurrian", wide],
    ["Akkadian", common],
  ],
  washukanni: [
    ["Hurrian", wide],
    ["Amorite", some],
    ["Akkadian", some],
  ],
  taidu: [
    ["Hurrian", wide],
    ["Amorite", some],
    ["Akkadian", some],
  ],
  harran: [
    ["Hurrian", wide],
    ["Amorite", some],
    ["Akkadian", some],
  ],
  terqa: [
    ["Amorite", wide],
    ["Akkadian", wide],
    ["Hurrian", some],
  ],
  suhu: [
    ["Amorite", wide],
    ["Akkadian", wide],
  ],
  carchemish: [
    ["Hurrian", common],
    ["Amorite", common],
    ["Akkadian", some],
    ["Luwian", some],
  ],
  aleppo: [
    ["Hurrian", common],
    ["Amorite", common],
    ["Akkadian", some],
  ],
  alalakh: [
    ["Hurrian", common],
    ["Amorite", common],
    ["Akkadian", some],
  ],
  nuhashshe: [
    ["Amorite", wide],
    ["Hurrian", common],
  ],
  qatna: [
    ["Amorite", wide],
    ["Hurrian", common],
  ],
  qadesh: [
    ["Canaanite", wide],
    ["Amorite", wide],
    ["Hurrian", few],
  ],
  damascus: [
    ["Canaanite", wide],
    ["Amorite", wide],
    ["Hurrian", few],
  ],
  ugarit: [
    ["Ugaritic", wide],
    ["Hurrian", common],
    ["Akkadian", common],
    ["Luwian", some],
    ["Alashiyan", some],
    ["Egyptian", some],
  ],
  amurru: [
    ["Canaanite", wide],
    ["Akkadian", few],
    ["Egyptian", few],
  ],
  sumur: [
    ["Canaanite", wide],
    ["Akkadian", few],
    ["Egyptian", few],
  ],
  arwad: [
    ["Canaanite", wide],
    ["Akkadian", few],
    ["Egyptian", few],
  ],
  byblos: [
    ["Canaanite", wide],
    ["Akkadian", few],
    ["Egyptian", few],
  ],
  sidon: [
    ["Canaanite", wide],
    ["Akkadian", few],
    ["Egyptian", few],
  ],
  tyre: [
    ["Canaanite", wide],
    ["Akkadian", few],
    ["Egyptian", few],
  ],
  megiddo: [
    ["Canaanite", wide],
    ["Hurrian", few],
  ],
  shechem: [
    ["Canaanite", wide],
    ["Hurrian", few],
  ],
  jerusalem: [
    ["Canaanite", wide],
    ["Hurrian", few],
  ],
  // Item 11c's cities of Canaan, as the dossier gives Megiddo, Shechem and Jerusalem.
  akko: [["Canaanite", wide], ["Hurrian", few]],
  hazor: [["Canaanite", wide], ["Hurrian", few]],
  gezer: [["Canaanite", wide], ["Hurrian", few]],
  ashkelon: [["Canaanite", wide], ["Egyptian", some]],
  lachish: [["Canaanite", wide], ["Hurrian", few]],
  hebron: [["Canaanite", wide]],
  gaza: [
    ["Canaanite", wide],
    ["Egyptian", some],
  ],
  hattusa: [
    ["Hittite", common],
    ["Luwian", common],
    ["Hattic", few],
    ["Akkadian", few],
  ],
  sapinuwa: [
    ["Hittite", common],
    ["Luwian", common],
    ["Hattic", few],
  ],
  nesa: [
    ["Luwian", wide],
    ["Hittite", common],
  ],
  tuwanuwa: [
    ["Luwian", wide],
    ["Hittite", common],
  ],
  kizzuwatna: [
    ["Luwian", wide],
    ["Hurrian", common],
  ],
  isuwa: [
    ["Hurrian", common],
    ["Luwian", some],
  ],
  apasa: [
    ["Luwian", wide],
    ["Hittite", few],
  ],
  mira: [["Luwian", wide]],
  seha: [["Luwian", wide]],
  lukka: [["Luwian", wide]],
  enkomi: [
    ["Alashiyan", wide],
    ["Ugaritic", some],
    ["Akkadian", some],
  ],
  kalavasos: [
    ["Alashiyan", wide],
    ["Ugaritic", some],
    ["Akkadian", some],
  ],
  susa: [
    ["Elamite", wide],
    ["Akkadian", some],
  ],
  kaska: [["Kaskean", wide]],
  steppe: [["Amorite", wide]],
  // Item 11f's places, as the dossier gives their neighbours: Beirut as Byblos and Sidon, Niya and Tunip as Qatna and
  // Nuhashshe, Pella and Ashtaroth as the cities of Canaan; Samuha in the Upper Land, where the Hittite court sat and
  // Ishtar of Samuha was a Hurrian goddess; the highlanders', the Libyans' and the Shasu's own tongues, unknown but for the
  // Shasu's West Semitic.
  beirut: [["Canaanite", wide], ["Akkadian", few], ["Egyptian", few]],
  niya: [["Amorite", wide], ["Hurrian", common]],
  tunip: [["Amorite", wide], ["Hurrian", common]],
  pella: [["Canaanite", wide], ["Hurrian", few]],
  ashtaroth: [["Canaanite", wide], ["Hurrian", few]],
  samuha: [["Hittite", common], ["Luwian", common], ["Hurrian", some]],
  azzi: [["Hayasan", wide]],
  libya: [["Libyan", wide], ["Egyptian", few]],
  shasu: [["Canaanite", wide]],
};

/** What each court speaks: its king's language ("The court languages"; the dossier's reading for Arzawa's lands). */
const CourtSpeaks: Partial<Record<Power, string>> = {
  Egypt: "Egyptian",
  Hatti: "Hittite",
  Babylonia: "Akkadian",
  Mitanni: "Hurrian",
  Assyria: "Akkadian",
  Arzawa: "Luwian",
  Alashiya: "Alashiyan",
  Kaska: "Kaskean",
  Lukka: "Luwian",
  Azzi: "Hayasan",
  Libya: "Libyan",
  Seha: "Luwian",
  Mira: "Luwian",
  Isuwa: "Hurrian",
  Carchemish: "Hurrian",
  Alalakh: "Hurrian",
  Aleppo: "Hurrian",
  Ugarit: "Ugaritic",
  Nuhashshe: "Amorite",
  Qadesh: "Canaanite",
  Qatna: "Amorite",
  Terqa: "Amorite",
  Suhu: "Amorite",
  Suteans: "Amorite",
  Arrapha: "Hurrian",
  Elam: "Elamite",
};

/**
 * What each court's scribes can read and write ("Reading a tablet": "Court reads" in the dossier). A court whose land is
 * not listed reads Akkadian if its capital keeps Akkadian scribes, else nothing ({@link courtReads}).
 */
const CourtReads: Partial<Record<Power, readonly string[]>> = {
  Egypt: ["Egyptian", "Akkadian"],
  Hatti: ["Hittite", "Akkadian", "Luwian", "Hurrian"],
  Babylonia: ["Akkadian"],
  Mitanni: ["Hurrian", "Akkadian"],
  Assyria: ["Akkadian"],
  Arzawa: ["Hittite", "Luwian"],
  Seha: ["Hittite", "Luwian"],
  Mira: ["Hittite", "Luwian"],
  Alashiya: ["Akkadian"],
  Kaska: [],
  Lukka: [],
  Azzi: [],
  Libya: [],
  Shasu: [],
  Isuwa: [],
  Suteans: [],
  Carchemish: ["Akkadian", "Hurrian"],
  Alalakh: ["Akkadian", "Hurrian"],
  Aleppo: ["Akkadian", "Hurrian"],
  Ugarit: ["Ugaritic", "Akkadian", "Hurrian"],
  Arrapha: ["Akkadian", "Hurrian"],
  Elam: ["Elamite", "Akkadian"],
};

/**
 * Where a character comes from, when it is not a province's own name: towns of the cast and the lands of its name styles
 * ("Name styles"), each to the province whose tongues it grew up with.
 */
const OriginProvince: Record<string, string> = {
  Nuzi: "arrapha",
  Kummanni: "kizzuwatna",
  Kition: "kalavasos",
  Beirut: "beirut",
  Hayasa: "azzi",
  Azzi: "azzi",
  "the Tjehenu land": "libya",
  "the Tjemehu land": "libya",
  Edom: "shasu",
  "the Negev": "shasu",
  Kumidi: "damascus",
  Kanesh: "nesa",
  Tadmor: "steppe",
  "the Sutean steppe": "steppe",
  "the Kaska hills": "kaska",
  Kush: "nubia",
  Miam: "nubia",
  Anshan: "susa",
};

/**
 * The lands beyond the doors ("Arrivals come through doors"; the doors dossier's "Their languages"): each people's own
 * tongue, which no court reads, and which two of them still share ("Speaking").
 */
const BeyondTongue: Record<string, string> = {
  Ahhiyawa: "Mycenaean Greek",
  Keftiu: "Keftian",
  "the western isles": "Sherden",
  "the far west": "Sherden",
  Elam: "Elamite",
  Anshan: "Elamite",
  "the Zagros": "Zagros",
  "the tin lands": "the tin lands' tongue",
  Marhashi: "Marhashian",
  Dilmun: "Dilmunite",
  Magan: "Maganite",
  Kush: "Nubian",
  Irem: "Nubian",
  "the eastern desert": "Medjay",
};

/**
 * The map language a returning trader or soldier for hire has some of, by the province where his door opens ("What each
 * door's men know of a map language": broken Akkadian at Ugarit and Alashiya, some Luwian on Arzawa's coast, Egyptian in
 * the Delta and Nubia, Akkadian on the eastern road and the Gulf).
 */
const DoorTongue: Record<string, string> = {
  ugarit: "Akkadian",
  enkomi: "Akkadian",
  kalavasos: "Akkadian",
  apasa: "Luwian",
  seha: "Luwian",
  delta: "Egyptian",
  nubia: "Egyptian",
  susa: "Akkadian",
  ur: "Akkadian",
  dilmun: "Akkadian",
};

export const doorTongue = (province: string): string | null => DoorTongue[province] ?? null;
export const beyondTongue = (landName: string): string | null => BeyondTongue[landName] ?? null;
export const originProvince = (origin: string): string | null => OriginProvince[origin] ?? null;

/** The languages spoken in a province by its people, as the dossier gives them (the court's own are added by {@link spokenIn}). */
export function peopleSpeak(province: string): readonly (readonly [string, number])[] {
  return ByProvince[province] ?? [];
}

/** What a court speaks: its king's language, or, for a court the table does not name, the widest tongue of its capital. */
export function courtSpeaks(p: Power, capital: string): string {
  const named = CourtSpeaks[p];
  if (named !== undefined) return named;
  const spoken = peopleSpeak(capital);
  let best: string | null = null;
  let most = -1;
  for (const [l, w] of spoken)
    if (w > most) {
      best = l;
      most = w;
    }
  return best ?? "Akkadian";
}

/** What a court's scribes read and write: the table's, or Akkadian where its capital keeps Akkadian scribes. */
export function courtReads(p: Power, capital: string): readonly string[] {
  const named = CourtReads[p];
  if (named !== undefined) return named;
  return peopleSpeak(capital).some(([l]) => l === "Akkadian") || CourtSpeaks[p] === "Canaanite" || CourtSpeaks[p] === "Amorite" ? ["Akkadian"] : [];
}

/**
 * The languages spoken in a province, and how widely: its people's, and at a court's capital the court's own language and,
 * where it reads Akkadian, Akkadian among its scribes ("Where each language is spoken": "A court adds its own language, and
 * Akkadian where it keeps Akkadian scribes"). `court`: the court whose capital this is, if any.
 */
export function spokenIn(province: string, court: Power | null): Dict<string, number> {
  const out = new Dict<string, number>(peopleSpeak(province).map(([l, w]) => [l, w] as const));
  if (court !== null) {
    const own = courtSpeaks(court, province);
    out.set(own, Math.max(out.getOrDefault(own, 0), few));
    if (courtReads(court, province).includes("Akkadian")) out.set("Akkadian", Math.max(out.getOrDefault("Akkadian", 0), few));
  }
  return out;
}

/** A language skill in words, for a persona, its claims and the narrator ("none, halting, good or fluent"). */
export function tongueWords(skill: number): "none" | "halting" | "good" | "fluent" {
  return skill <= 0 ? "none" : skill < 40 ? "halting" : skill < 80 ? "good" : "fluent";
}

/** Fluent enough that crossing the language succeeds at once ("from about 80 it succeeds at once"). */
export const AtOnce = 80;

/**
 * The chance in a hundred that something crosses a language this season, from the weakest skill along the way ("Language
 * skill buys time, never noise"): 100 from {@link AtOnce}, else the skill itself, and 0 at 0.
 */
export function crossChance(weakest: number): number {
  return weakest >= AtOnce ? 100 : Math.max(0, weakest);
}

/** Any two speakers' best shared language and the poorer of their two skills in it (the language, or null if none). */
export function bestShared(a: Dict<string, number>, b: Dict<string, number>): [string | null, number] {
  let best: string | null = null;
  let skill = 0;
  for (const [l, x] of a.entries()) {
    const y = b.getOrDefault(l, 0);
    const m = Math.min(x, y);
    if (m > skill || (m === skill && m > 0 && best !== null && l < best)) {
      best = l;
      skill = m;
    }
  }
  return [best, skill];
}
