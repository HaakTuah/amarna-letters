/**
 * The doors (build order item 11a, "Arrivals come through doors"): where routes from beyond the map come in, each with its
 * share of arrivals, the lands beyond it, their names and why their men come. From `docs/history/08-beyond-the-edges.md`
 * ("The doors", "Who comes, and why", first guesses [G] for the shares and mixes) and the name styles of
 * `docs/history/06-attested-people.md`. The Red Sea is a door since its sea zone was added (item 11c), at the dossier's
 * first-guess shares. Until the edge markets exist, the shares are first guesses, not traffic. Item 17++++a adds who raids
 * through each door, and how hard (`raids`, `Beyond.raids`; `model/raiders.ts`).
 */

/** Why a newcomer came. */
export const ReasonValues = ["trade", "soldiering", "flight", "feud", "wanderlust", "home"] as const;
export type Reason = (typeof ReasonValues)[number];

/** A land beyond a door: its weight among the door's arrivals, its names, and whether its names are invented. */
export interface Beyond {
  land: string;
  /** How the newcomer is described ("an Aegean of Ahhiyawa"). */
  people: string;
  weight: number;
  names: readonly string[];
  /** No names of the period survive: these are invented in a fitting style, marked so in the data. */
  invented: boolean;
  /** A people first recorded later than 1346 (the later Sea Peoples), marked so in the data. */
  later?: boolean;
  /** What his tongue is, in words, and whether any court reads it. */
  tongue: string;
  /**
   * Item 17++++a ("Pirates are bands at sea": raiders from beyond the map): its weight among the door's raiders, and how
   * its raiders are named ("Aegean raiders of Ahhiyawa"); none where the land sends no raiders. Only the raids the
   * dossiers attest: Attarissiya "of Ahhiya" raiding Alashiya (`docs/history/15-pirates-bandits-tolls.md`,
   * `15-madduwatta`) [A], and the Zagros highlanders, raiders in Mesopotamian memory (`docs/history/08-beyond-the-edges.md`,
   * `08-elam`) [A]; the later Sea Peoples rarely, as their arrivals are (`08-sea-peoples`). Not the Sherden, who appear in
   * 1346 only as soldiers (`15-sherden`), nor the Medjay, Egypt's police (`08-kush-irem-medjay`), nor Kush, whose raids no
   * source of the period records. The weights and the doors' `raids` are first guesses [G].
   */
  raids?: { weight: number; who: string };
}

export interface Door {
  id: string;
  name: string;
  /** Provinces where it opens. */
  provinces: readonly string[];
  /** Its share of arrivals, in percent. */
  share: number;
  beyond: readonly Beyond[];
  /** The mix of reasons, weights by {@link ReasonValues}. */
  reasons: Readonly<Record<Reason, number>>;
  /** The map language a returning trader or soldier through this door has some of. */
  mapTongue: string;
  /** Item 17++++a: how hard raiders press through it, in percent of the strongest door's (0: none come). */
  raids: number;
  /** Item 17++++a: whether its routes come by sea, so its raiders come in ships and only in the sailing season. */
  bySea: boolean;
}

const Aegean = ["Akhileus", "Ekerawon", "Amphimedes", "Theseus", "Alexandros", "Dorieus", "Antenor", "Ikarios"];

export const Doors: readonly Door[] = [
  {
    id: "westsea",
    name: "the western sea",
    provinces: ["apasa", "seha", "enkomi", "ugarit", "delta"],
    share: 35,
    beyond: [
      { land: "Ahhiyawa", people: "an Aegean of Ahhiyawa", weight: 50, names: Aegean, invented: false, tongue: "Mycenaean Greek, which no court reads", raids: { weight: 90, who: "Aegean raiders of Ahhiyawa" } },
      { land: "Keftiu", people: "a Cretan of Keftiu", weight: 35, names: Aegean, invented: false, tongue: "the tongue of Keftiu, which no court reads" },
      { land: "the western isles", people: "a Sherden seafarer", weight: 10, names: ["Sherdanu", "Tarkhunu", "Shakaru"], invented: true, tongue: "a western tongue nobody on the map knows" },
      { land: "the far west", people: "a seafarer of a people later called the Shekelesh, Teresh or Peleset", weight: 5, names: ["Shekelu", "Tursha", "Pelesu"], invented: true, later: true, tongue: "a western tongue nobody on the map knows", raids: { weight: 10, who: "raiders from the far west" } },
    ],
    reasons: { trade: 40, soldiering: 15, flight: 10, feud: 10, wanderlust: 15, home: 10 },
    mapTongue: "Akkadian at Ugarit and Alashiya, Luwian on Arzawa's coast, Egyptian in the Delta",
    raids: 100,
    bySea: true,
  },
  {
    id: "east",
    name: "the eastern road",
    provinces: ["susa"],
    share: 25,
    beyond: [
      { land: "Elam", people: "an Elamite of Anshan", weight: 60, names: ["Kidin-Hutran", "Pahir-ishshan", "Attar-kittah", "Humban-numena", "Shilhak-Inshushinak", "Kutir-Nahhunte"], invented: false, tongue: "Elamite" },
      { land: "the Zagros", people: "a highlander of the Zagros, of the Lullubi or the Qutu", weight: 30, names: ["Zaba-zuna", "Tarlugal", "Anu-banini"], invented: true, tongue: "a highland tongue nobody on the map knows", raids: { weight: 100, who: "highland raiders of the Zagros" } },
      { land: "the tin lands", people: "a man from the tin lands far beyond Iran, who made the whole journey that almost nobody makes", weight: 1, names: ["Arwand", "Sogdu"], invented: true, tongue: "a tongue nobody on the map has ever heard" },
      { land: "Marhashi", people: "a man of Marhashi", weight: 9, names: ["Hubshumkibi", "Libanukshabash"], invented: false, tongue: "the tongue of Marhashi, which no court reads" },
    ],
    reasons: { trade: 45, soldiering: 15, flight: 10, feud: 10, wanderlust: 5, home: 15 },
    mapTongue: "Akkadian",
    raids: 50,
    bySea: false,
  },
  {
    id: "gulf",
    name: "the Gulf",
    provinces: ["ur", "dilmun"],
    share: 10,
    beyond: [
      { land: "Dilmun", people: "a trader of Dilmun", weight: 60, names: ["Ili-ippashra", "Inzak-gamil", "Ea-nasir"], invented: false, tongue: "the tongue of Dilmun, and some Akkadian" },
      { land: "Magan", people: "a copper trader of Magan", weight: 40, names: ["Nadubeli", "Manium"], invented: false, tongue: "the tongue of Magan, which no court reads" },
    ],
    reasons: { trade: 65, soldiering: 5, flight: 5, feud: 5, wanderlust: 5, home: 15 },
    mapTongue: "Akkadian",
    raids: 0,
    bySea: true,
  },
  {
    id: "nile",
    name: "the Nile beyond Nubia",
    provinces: ["nubia"],
    share: 25,
    beyond: [
      { land: "Kush", people: "a Nubian of Kush beyond Egypt's reach", weight: 60, names: ["Nehesy", "Penniut", "Kashta", "Aryamani"], invented: true, tongue: "a Nubian tongue" },
      { land: "Irem", people: "a man of Irem", weight: 20, names: ["Iremnakht", "Tawiaa"], invented: true, tongue: "a Nubian tongue" },
      { land: "the eastern desert", people: "a Medjay of the eastern desert", weight: 20, names: ["Medja", "Kherpu"], invented: true, tongue: "the Medjay's tongue" },
    ],
    reasons: { trade: 30, soldiering: 40, flight: 10, feud: 5, wanderlust: 5, home: 10 },
    mapTongue: "Egyptian",
    raids: 0,
    bySea: false,
  },
  {
    // Punt beyond the Red Sea (item 11c): an expedition's men above all, and Egyptians back from it [B, G]
    id: "redsea",
    name: "the Red Sea",
    provinces: ["thebes", "sinai"],
    share: 5,
    beyond: [
      { land: "Punt", people: "a man of Punt, from the far shore of the Red Sea", weight: 70, names: ["Parehu", "Ity"], invented: false, tongue: "the tongue of Punt, which no court reads" },
      { land: "the Red Sea's shore", people: "an Egyptian sailor back from Punt", weight: 30, names: ["Nehsy", "Thutiy", "Penre"], invented: true, tongue: "Egyptian" },
    ],
    reasons: { trade: 60, soldiering: 5, flight: 5, feud: 5, wanderlust: 5, home: 20 },
    mapTongue: "Egyptian",
    raids: 0,
    bySea: true,
  },
];

/** Why he came, in words for his facts. */
export const ReasonWords: Readonly<Record<Reason, string>> = {
  trade: "to trade",
  soldiering: "to sell his spear",
  flight: "fleeing a war at home",
  feud: "fleeing a blood feud",
  wanderlust: "to see the lands of the Great Kings",
  home: "coming home after years beyond the edge of the world",
};
