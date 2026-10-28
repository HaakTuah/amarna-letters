/**
 * The doors (build order item 11a, "Arrivals come through doors"): where routes from beyond the map come in, each with its
 * share of arrivals, the lands beyond it, their names and why their men come. From `docs/history/08-beyond-the-edges.md`
 * ("The doors", "Who comes, and why", first guesses [G] for the shares and mixes) and the name styles of
 * `docs/history/06-attested-people.md`. The Red Sea is not a door until its sea zone is added, so its share is spread among
 * the rest. Until the edge markets exist, the shares are first guesses, not traffic.
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
}

const Aegean = ["Akhileus", "Ekerawon", "Amphimedes", "Theseus", "Alexandros", "Dorieus", "Antenor", "Ikarios"];

export const Doors: readonly Door[] = [
  {
    id: "westsea",
    name: "the western sea",
    provinces: ["apasa", "seha", "enkomi", "ugarit", "delta"],
    share: 37,
    beyond: [
      { land: "Ahhiyawa", people: "an Aegean of Ahhiyawa", weight: 50, names: Aegean, invented: false, tongue: "Mycenaean Greek, which no court reads" },
      { land: "Keftiu", people: "a Cretan of Keftiu", weight: 35, names: Aegean, invented: false, tongue: "the tongue of Keftiu, which no court reads" },
      { land: "the western isles", people: "a Sherden seafarer", weight: 10, names: ["Sherdanu", "Tarkhunu", "Shakaru"], invented: true, tongue: "a western tongue nobody on the map knows" },
      { land: "the far west", people: "a seafarer of a people later called the Shekelesh, Teresh or Peleset", weight: 5, names: ["Shekelu", "Tursha", "Pelesu"], invented: true, later: true, tongue: "a western tongue nobody on the map knows" },
    ],
    reasons: { trade: 40, soldiering: 15, flight: 10, feud: 10, wanderlust: 15, home: 10 },
    mapTongue: "Akkadian at Ugarit and Alashiya, Luwian on Arzawa's coast, Egyptian in the Delta",
  },
  {
    id: "east",
    name: "the eastern road",
    provinces: ["susa"],
    share: 26,
    beyond: [
      { land: "Elam", people: "an Elamite of Anshan", weight: 60, names: ["Kidin-Hutran", "Pahir-ishshan", "Attar-kittah", "Humban-numena", "Shilhak-Inshushinak", "Kutir-Nahhunte"], invented: false, tongue: "Elamite" },
      { land: "the Zagros", people: "a highlander of the Zagros, of the Lullubi or the Qutu", weight: 30, names: ["Zaba-zuna", "Tarlugal", "Anu-banini"], invented: true, tongue: "a highland tongue nobody on the map knows" },
      { land: "the tin lands", people: "a man from the tin lands far beyond Iran, who made the whole journey that almost nobody makes", weight: 1, names: ["Arwand", "Sogdu"], invented: true, tongue: "a tongue nobody on the map has ever heard" },
      { land: "Marhashi", people: "a man of Marhashi", weight: 9, names: ["Hubshumkibi", "Libanukshabash"], invented: false, tongue: "the tongue of Marhashi, which no court reads" },
    ],
    reasons: { trade: 45, soldiering: 15, flight: 10, feud: 10, wanderlust: 5, home: 15 },
    mapTongue: "Akkadian",
  },
  {
    id: "gulf",
    name: "the Gulf",
    provinces: ["ur", "dilmun"],
    share: 11,
    beyond: [
      { land: "Dilmun", people: "a trader of Dilmun", weight: 60, names: ["Ili-ippashra", "Inzak-gamil", "Ea-nasir"], invented: false, tongue: "the tongue of Dilmun, and some Akkadian" },
      { land: "Magan", people: "a copper trader of Magan", weight: 40, names: ["Nadubeli", "Manium"], invented: false, tongue: "the tongue of Magan, which no court reads" },
    ],
    reasons: { trade: 65, soldiering: 5, flight: 5, feud: 5, wanderlust: 5, home: 15 },
    mapTongue: "Akkadian",
  },
  {
    id: "nile",
    name: "the Nile beyond Nubia",
    provinces: ["nubia"],
    share: 26,
    beyond: [
      { land: "Kush", people: "a Nubian of Kush beyond Egypt's reach", weight: 60, names: ["Nehesy", "Penniut", "Kashta", "Aryamani"], invented: true, tongue: "a Nubian tongue" },
      { land: "Irem", people: "a man of Irem", weight: 20, names: ["Iremnakht", "Tawiaa"], invented: true, tongue: "a Nubian tongue" },
      { land: "the eastern desert", people: "a Medjay of the eastern desert", weight: 20, names: ["Medja", "Kherpu"], invented: true, tongue: "the Medjay's tongue" },
    ],
    reasons: { trade: 30, soldiering: 40, flight: 10, feud: 5, wanderlust: 5, home: 10 },
    mapTongue: "Egyptian",
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
