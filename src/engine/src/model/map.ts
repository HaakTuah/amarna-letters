import type { Dict } from "../core/collections.ts";
import { eqIgnoreCase, isBlank, trim } from "../core/text.ts";
import { isGreatKing, type Power } from "./power.ts";
import { crossingBetween } from "./geography.ts";

export const ProvinceKindValues = ["Land", "Coast", "Sea"] as const;
export type ProvinceKind = (typeof ProvinceKindValues)[number];

/** Land edges carry armies, sea edges carry fleets, coast edges (a shared shoreline) carry both. */
export const EdgeKindValues = ["Land", "Coast", "Sea"] as const;
export type EdgeKind = (typeof EdgeKindValues)[number];

export const UnitKindValues = ["Army", "Fleet"] as const;
export type UnitKind = (typeof UnitKindValues)[number];

export interface Province {
  readonly id: string;
  readonly name: string;
  readonly kind: ProvinceKind;
  readonly home: Power | null;
  readonly yield: number;
  readonly capital: boolean;
  readonly x: number;
  readonly y: number;
  /** Latitude and longitude of the province's town (of a sea zone, the harbour it lies off): the lengths of connections. */
  readonly lat: number;
  readonly lon: number;
  readonly isSea: boolean;
  readonly isCoastal: boolean;
  /** A coastal province's waters: the sea zone off its harbour and shore. Null inland and at sea. */
  readonly waters: string | null;
  /**
   * A land without a town (the Kaska lands, Lukka, the Sutean steppe): villages and herders under chiefs, with no walls and
   * no market ("The edges of the map"). Since item 11+ each starts under one leader of its own ("Land without a ruler").
   */
  readonly kingless: boolean;
}

export interface Edge {
  readonly a: string;
  readonly b: string;
  readonly kind: EdgeKind;
  /** An open-sea crossing between two waters, dangerous in winter: long, and hard to stop anyone on. */
  readonly open: boolean;
  /** Sailing from a to b goes with the current, so it is quicker than from b to a (a voyage's time is item 7b's). */
  readonly current: boolean;
}

/** The season of the year (0, 1 or 2) that is winter everywhere: Peret, when the open sea and the mountain passes are dangerous. */
export const WinterSeason = 1;

/** The season of the year (0 Akhet, 1 Peret, 2 Shemu) a turn falls in. */
export const seasonOfTurn = (turn: number): number => (((turn - 1) % 3) + 3) % 3;

/**
 * A connection dangerous in winter (item 9, "Winter is dangerous, never closed"): an open-sea crossing, or a mountain
 * pass. Never closed: a traveller is slowed and meets the road's check, an army or a fleet crossing one may be lost.
 */
export function dangerousInWinter(e: Edge): boolean {
  return e.open || crossingBetween(e.a, e.b)?.kind === "Mountain";
}

/** The abstract province graph. Static data: never part of the game state. */
export class WorldMap {
  private readonly byId = new Map<string, Province>();
  private readonly adj = new Map<string, { to: string; kind: EdgeKind }[]>();
  private readonly hopCache = new Map<string, number>();
  readonly provinces: readonly Province[];
  readonly edges: readonly Edge[];
  /** Every province that is not a sea zone, in the map's order. */
  readonly landProvinces: readonly Province[];

  constructor(provinces: readonly Province[], edges: readonly Edge[]) {
    this.provinces = provinces;
    this.edges = edges;
    for (const p of provinces) {
      if (this.byId.has(p.id)) throw new Error(`An item with the same key has already been added. Key: ${p.id}`);
      this.byId.set(p.id, p);
      this.adj.set(p.id, []);
    }
    for (const e of edges) {
      if (!this.byId.has(e.a) || !this.byId.has(e.b)) throw new Error(`Edge ${e.a}-${e.b} names an unknown province.`);
      this.adj.get(e.a)!.push({ to: e.b, kind: e.kind });
      this.adj.get(e.b)!.push({ to: e.a, kind: e.kind });
    }
    this.landProvinces = provinces.filter((p) => !p.isSea);
  }

  private static defaultMap: WorldMap | undefined;
  static get default(): WorldMap {
    return (WorldMap.defaultMap ??= buildMap());
  }

  private winterMap: WorldMap | undefined;
  /**
   * The map without the connections winter makes dangerous ({@link dangerousInWinter}): what can be crossed in winter at no
   * risk to troops. Nothing closes; this is for telling a safe winter move from a dangerous one.
   */
  get winter(): WorldMap {
    if (this.edges.every((e) => !dangerousInWinter(e))) return this;
    return (this.winterMap ??= new WorldMap(this.provinces, this.edges.filter((e) => !dangerousInWinter(e))));
  }

  /** The open-sea crossing between two sea zones, if that is what joins them (either way round). */
  openCrossing(a: string, b: string): Edge | null {
    return this.edges.find((e) => e.open && ((e.a === a && e.b === b) || (e.a === b && e.b === a))) ?? null;
  }

  /** The coastal provinces whose waters a sea zone is: those a fleet there blockades. */
  coastsOf(sea: string): Province[] {
    return this.provinces.filter((p) => p.waters === sea);
  }

  /** A province by id; throws when there is none (the C# indexer). */
  get(id: string): Province {
    const p = this.byId.get(id);
    if (!p) throw new Error(`The given key '${id}' was not present in the dictionary.`);
    return p;
  }

  exists(id: string | null | undefined): boolean {
    return id !== null && id !== undefined && this.byId.has(id);
  }

  /** A province by id or name, as a reply may name it. */
  find(idOrName: string | null | undefined): Province | null {
    if (idOrName === null || idOrName === undefined || isBlank(idOrName)) return null;
    const key = trim(idOrName);
    const p = this.byId.get(key) ?? this.byId.get(key.toLowerCase());
    if (p) return p;
    return this.provinces.find((x) => eqIgnoreCase(x.name, key)) ?? null;
  }

  capital(power: Power): Province {
    const p = this.provinces.find((x) => x.capital && x.home === power);
    if (!p) throw new Error("Sequence contains no matching element");
    return p;
  }

  homeOf(power: Power): Province[] {
    return this.provinces.filter((p) => p.home === power);
  }

  neighbors(id: string): string[] {
    return this.adjOf(id).map((a) => a.to);
  }

  private adjOf(id: string): { to: string; kind: EdgeKind }[] {
    const a = this.adj.get(id);
    if (!a) throw new Error(`The given key '${id}' was not present in the dictionary.`);
    return a;
  }

  canMove(kind: UnitKind, from: string, to: string): boolean {
    return this.adjOf(from).some((a) => a.to === to && (kind === "Army" ? a.kind !== "Sea" : a.kind !== "Land"));
  }

  movesFrom(kind: UnitKind, from: string): string[] {
    const out: string[] = [];
    for (const a of this.adjOf(from))
      if ((kind === "Army" ? a.kind !== "Sea" : a.kind !== "Land") && !out.includes(a.to)) out.push(a.to);
    return out;
  }

  areAdjacent(a: string, b: string): boolean {
    return this.adjOf(a).some((x) => x.to === b);
  }

  /** Two coastal provinces one voyage apart: their waters are the same, or joined by a coastal hop or an open-sea crossing. */
  sharesSea(a: string, b: string): boolean {
    if (a === b) return false;
    const wa = this.get(a).waters;
    const wb = this.get(b).waters;
    return wa !== null && wb !== null && (wa === wb || this.areAdjacent(wa, wb));
  }

  /** Is there a chain of sea zones linking two coastal provinces (ignoring fleets)? */
  seaRouteExists(from: string, to: string): boolean {
    if (!this.get(from).isCoastal || !this.get(to).isCoastal || from === to) return false;
    const seen = new Set<string>();
    const queue: string[] = [];
    for (const n of this.adjOf(from).filter((a) => this.get(a.to).isSea).map((a) => a.to))
      if (!seen.has(n)) {
        seen.add(n);
        queue.push(n);
      }
    while (queue.length > 0) {
      const s = queue.shift()!;
      for (const { to: n } of this.adjOf(s)) {
        if (n === to) return true;
        if (this.get(n).isSea && !seen.has(n)) {
          seen.add(n);
          queue.push(n);
        }
      }
    }
    return false;
  }

  /** Shortest number of steps between two provinces over every kind of edge. */
  hops(a: string, b: string): number {
    if (a === b) return 0;
    const cached = this.hopCache.get(a + "\u0000" + b);
    if (cached !== undefined) return cached;
    const dist = new Map<string, number>([[a, 0]]);
    const queue = [a];
    while (queue.length > 0) {
      const cur = queue.shift()!;
      for (const n of this.neighbors(cur)) {
        if (dist.has(n)) continue;
        dist.set(n, dist.get(cur)! + 1);
        queue.push(n);
      }
    }
    const d = dist.get(b) ?? 99;
    this.hopCache.set(a + "\u0000" + b, d);
    this.hopCache.set(b + "\u0000" + a, d);
    return d;
  }
}

function p(id: string, name: string, kind: ProvinceKind, home: Power | null, yld: number, capital: boolean, x: number, y: number, lat: number, lon: number): Province {
  return { id, name, kind, home, yield: yld, capital, x, y, lat, lon, isSea: kind === "Sea", isCoastal: kind === "Coast", waters: null, kingless: false };
}

/** The province at sea named for the coast it lies off: "ugaritwaters", "Ugarit waters". */
export const watersId = (coast: string): string => coast + "waters";

/**
 * The Late Bronze Age board after the map review of build order item 7a: 54 land provinces and 15 sea zones. Coordinates
 * are for a 1000x720 SVG view; latitude and longitude are those of each province's town (for a sea zone, of the harbour it
 * lies off), and give the lengths of the connections ({@link connectionKm}). Yields are shekels of gold per season. The
 * sources of each place, name and connection are in `docs/history/` and the item's report.
 *
 * The seas ("Finer seas"): each coastal province has waters of its own, its harbour and shore, which only Amurru and the
 * island of Arwad share; coastal hops link neighbouring waters along the shore, and a few open-sea crossings link waters
 * across the open sea, dangerous in winter ({@link dangerousInWinter}). Ships keep to the coasts, so an army is carried only
 * by fleets standing in the waters it sails through, and lands only from the waters of the coast it lands on: where the
 * enemy's fleet holds those waters, no army lands. Currents run counterclockwise, north along the Levant and west along
 * Anatolia, as data on each sea connection ({@link Edge.current}).
 */
export function buildMap(): WorldMap {
  const provinces: Province[] = [
    // Arzawa (weak): western Anatolia
    p("seha", "Seha River Land", "Coast", "Arzawa", 30, false, 85, 95, 38.6, 27.4),
    p("apasa", "Apasa", "Coast", "Arzawa", 40, true, 70, 200, 37.94, 27.34),
    p("mira", "Mira", "Land", "Arzawa", 30, false, 170, 150, 38.5, 29.5),

    // Hatti (strong): central Anatolia. Nesa is Kanesh by its Hittite name (Kanesh mattered most in the Old Assyrian age).
    p("tuwanuwa", "Tuwanuwa", "Land", "Hatti", 30, false, 275, 150, 37.97, 34.68),
    p("hattusa", "Hattusa", "Land", "Hatti", 50, true, 375, 70, 40.02, 34.62),
    p("sapinuwa", "Sapinuwa", "Land", "Hatti", 30, false, 480, 55, 40.33, 35.32),
    p("nesa", "Nesa", "Land", "Hatti", 35, false, 405, 160, 38.85, 35.63),
    p("kizzuwatna", "Kizzuwatna", "Coast", "Hatti", 35, false, 390, 255, 36.92, 34.9),

    // Mitanni (middle): upper Khabur
    p("harran", "Harran", "Land", "Mitanni", 35, false, 640, 205, 36.87, 39.03),
    p("washukanni", "Washukanni", "Land", "Mitanni", 50, true, 715, 140, 36.85, 40.07),
    p("taidu", "Taidu", "Land", "Mitanni", 30, false, 785, 70, 36.8, 41.0),
    p("terqa", "Terqa", "Land", "Mitanni", 30, false, 715, 275, 34.92, 40.57),

    // Assyria (middle): the Tigris. Ekallate is Ekallatum by its Middle Assyrian name.
    p("nineveh", "Nineveh", "Land", "Assyria", 35, false, 865, 95, 36.36, 43.15),
    p("arbela", "Arbela", "Land", "Assyria", 30, false, 955, 160, 36.19, 44.01),
    p("ashur", "Ashur", "Land", "Assyria", 45, true, 850, 215, 35.46, 43.26),
    p("ekallate", "Ekallate", "Land", "Assyria", 25, false, 835, 320, 35.0, 43.5),

    // Babylonia (strong): Karduniash, with Dilmun in the Gulf under its governor
    p("sippar", "Sippar", "Land", "Babylonia", 35, false, 770, 420, 33.06, 44.25),
    p("durkurigalzu", "Dur-Kurigalzu", "Land", "Babylonia", 35, false, 880, 405, 33.35, 44.2),
    p("babylon", "Babylon", "Land", "Babylonia", 55, true, 820, 505, 32.54, 44.42),
    p("nippur", "Nippur", "Land", "Babylonia", 35, false, 900, 570, 32.13, 45.23),
    p("ur", "Ur", "Coast", "Babylonia", 35, false, 930, 655, 30.96, 46.1),
    p("dilmun", "Dilmun", "Coast", "Babylonia", 20, false, 985, 702, 26.23, 50.52),

    // Egypt (strong): the Nile, with Nubia (Kush) under the King's Son of Kush
    p("delta", "Nile Delta", "Coast", "Egypt", 40, false, 340, 600, 30.79, 31.82),
    p("sinai", "Sinai", "Land", "Egypt", 20, false, 425, 665, 30.9, 33.5),
    p("memphis", "Memphis", "Land", "Egypt", 40, false, 290, 660, 29.85, 31.25),
    p("akhetaten", "Akhetaten", "Land", "Egypt", 50, true, 195, 680, 27.65, 30.9),
    p("thebes", "Thebes", "Land", "Egypt", 40, false, 105, 690, 25.7, 32.64),
    p("nubia", "Nubia", "Land", "Egypt", 30, false, 30, 655, 22.67, 32.03),

    // Alashiya (weak): Cyprus, the copper island, east and west
    p("kalavasos", "Kalavasos", "Coast", "Alashiya", 40, false, 290, 410, 34.77, 33.3),
    p("enkomi", "Enkomi", "Coast", "Alashiya", 45, true, 365, 395, 35.16, 33.88),

    // The city-states, each a power of its own since item 11+ ("City-states as powers"), its one city its capital: taken by
    // force (each has walls: see StartWalls) or by agreement, never bought. Gaza and Sumur are Egypt's own land, governed
    // by its commissioners ("Opening relations as they were"; the politics dossier).
    p("isuwa", "Isuwa", "Land", "Isuwa", 30, true, 565, 105, 38.67, 39.22),
    p("carchemish", "Carchemish", "Land", "Carchemish", 35, true, 575, 185, 36.83, 38.02),
    p("alalakh", "Alalakh", "Land", "Alalakh", 25, true, 495, 245, 36.24, 36.38),
    p("aleppo", "Aleppo", "Land", "Aleppo", 35, true, 560, 255, 36.2, 37.16),
    p("ugarit", "Ugarit", "Coast", "Ugarit", 40, true, 478, 302, 35.6, 35.78),
    p("nuhashshe", "Nuhashshe", "Land", "Nuhashshe", 25, true, 620, 300, 35.5, 37.0),
    p("qatna", "Qatna", "Land", "Qatna", 30, true, 648, 345, 34.84, 36.86),
    p("qadesh", "Qadesh", "Land", "Qadesh", 30, true, 570, 355, 34.56, 36.52),
    // Amurru, the hill country behind the coast, and Ṣumur (Tell Kazel), Egypt's base on that coast, a province of its own
    // since item 8 (Haakon's answer to item 7a's review: the period first, the phone made to read it).
    p("amurru", "Amurru", "Land", "Amurru", 20, true, 520, 390, 34.7, 36.2),
    p("sumur", "Sumur", "Coast", "Egypt", 15, false, 477, 372, 34.82, 35.98),
    p("arwad", "Arwad", "Coast", "Arwad", 20, true, 453, 366, 34.86, 35.86),
    p("byblos", "Byblos", "Coast", "Byblos", 30, true, 478, 428, 34.12, 35.65),
    p("sidon", "Sidon", "Coast", "Sidon", 25, true, 470, 478, 33.56, 35.37),
    p("damascus", "Damascus", "Land", "Damascus", 25, true, 580, 450, 33.51, 36.29),
    p("tyre", "Tyre", "Coast", "Tyre", 25, true, 462, 530, 33.27, 35.2),
    p("megiddo", "Megiddo", "Land", "Megiddo", 20, true, 540, 525, 32.58, 35.18),
    p("shechem", "Shechem", "Land", "Shechem", 20, true, 548, 585, 32.21, 35.28),
    p("jerusalem", "Jerusalem", "Land", "Jerusalem", 15, true, 515, 632, 31.78, 35.23),
    p("gaza", "Gaza", "Coast", "Egypt", 20, false, 450, 595, 31.5, 34.46),
    p("suhu", "Suhu", "Land", "Suhu", 35, true, 690, 395, 34.47, 41.95),
    p("arrapha", "Arrapha", "Land", "Arrapha", 30, true, 930, 262, 35.47, 44.39),
    p("susa", "Susa", "Coast", "Elam", 35, true, 975, 470, 32.19, 48.26),
    // The edges: lands without a king, each under one leader of its own since item 11+ ("Land without a ruler")
    // Lukka, the Lycian coast of seafarers and raiders, ruled by no king (since item 8: Haakon's answer to item 7a's review)
    { ...p("lukka", "Lukka", "Coast", "Lukka", 15, true, 175, 270, 36.4, 29.4), kingless: true },
    { ...p("kaska", "Kaska Lands", "Land", "Kaska", 10, true, 440, 28, 41.1, 35.4), kingless: true },
    { ...p("steppe", "Sutean Steppe", "Land", "Suteans", 10, true, 690, 478, 34.55, 38.27), kingless: true },
  ];

  // Sea zones: the waters of each coastal province (Ṣumur's shared with Arwad), the open sea at the Aegean edge, and the Gulf.
  const waters = (coast: string, name: string, x: number, y: number): Province => {
    const c = provinces.find((q) => q.id === coast)!;
    return p(watersId(coast), name, "Sea", null, 0, false, x, y, c.lat, c.lon);
  };
  const seas: Province[] = [
    waters("seha", "Seha waters", 20, 110),
    waters("apasa", "Apasa waters", 12, 228),
    waters("lukka", "Lukka waters", 165, 318),
    waters("kizzuwatna", "Kizzuwatna waters", 345, 300),
    waters("kalavasos", "Kalavasos waters", 240, 450),
    waters("enkomi", "Enkomi waters", 405, 330),
    waters("ugarit", "Ugarit waters", 442, 296),
    waters("sumur", "Sumur and Arwad waters", 432, 385),
    waters("byblos", "Byblos waters", 432, 438),
    waters("sidon", "Sidon waters", 425, 490),
    waters("tyre", "Tyre waters", 415, 545),
    waters("gaza", "Gaza waters", 405, 565),
    waters("delta", "Delta waters", 320, 560),
    p("westsea", "Western Sea", "Sea", null, 0, false, 60, 420, 35.5, 26.5),
    p("gulf", "The Gulf", "Sea", null, 0, false, 985, 640, 28.5, 50.0),
  ];
  provinces.push(...seas);
  const coastal = new Map(provinces.filter((q) => q.isCoastal).map((q) => [q.id, q]));
  for (const [id, q] of coastal) (q as { waters: string | null }).waters = id === "arwad" ? watersId("sumur") : id === "ur" || id === "dilmun" || id === "susa" ? "gulf" : watersId(id);

  const edges: Edge[] = [];
  const add = (kind: EdgeKind, a: string, bs: string[], open = false, current = false): void => {
    for (const b of bs) edges.push({ a, b, kind, open, current });
  };
  const land = (a: string, ...bs: string[]) => add("Land", a, bs);
  const coast = (a: string, ...bs: string[]) => add("Coast", a, bs);
  /** A coastal hop between neighbouring waters; `current` when sailing from a to b goes with the current. */
  const hop = (a: string, b: string, current = false) => add("Sea", a, [b], false, current);
  /** An open-sea crossing, dangerous in winter. */
  const crossing = (a: string, b: string, current = false) => add("Sea", a, [b], true, current);

  // Anatolia
  coast("seha", "apasa");
  land("seha", "mira", "tuwanuwa");
  land("apasa", "mira");
  coast("apasa", "lukka");
  land("mira", "lukka", "tuwanuwa");
  land("lukka", "tuwanuwa");
  coast("lukka", "kizzuwatna");
  land("tuwanuwa", "hattusa", "nesa", "kizzuwatna");
  land("hattusa", "sapinuwa", "nesa", "kaska");
  land("sapinuwa", "nesa", "isuwa", "kaska");
  land("nesa", "kizzuwatna", "isuwa", "carchemish");
  land("kizzuwatna", "carchemish", "alalakh");

  // Upper Mesopotamia
  land("isuwa", "harran", "washukanni", "carchemish");
  land("carchemish", "harran", "aleppo", "alalakh");
  land("harran", "washukanni", "terqa", "aleppo");
  land("washukanni", "taidu", "terqa");
  land("taidu", "nineveh");
  land("terqa", "suhu", "ashur", "ekallate", "nuhashshe");
  land("nineveh", "arbela", "ashur");
  land("arbela", "ashur", "arrapha");
  land("ashur", "ekallate", "arrapha");

  // Babylonia and Elam
  land("arrapha", "ekallate", "susa");
  land("ekallate", "sippar", "durkurigalzu", "suhu");
  land("susa", "durkurigalzu", "nippur", "ur");
  land("sippar", "durkurigalzu", "babylon", "suhu");
  land("durkurigalzu", "babylon", "nippur");
  land("babylon", "nippur");
  land("nippur", "ur");

  // Northern Syria
  land("alalakh", "aleppo", "ugarit");
  land("aleppo", "nuhashshe");
  land("ugarit", "nuhashshe");
  land("nuhashshe", "qatna", "qadesh");
  land("qatna", "qadesh", "steppe");
  land("suhu", "steppe");

  // The Levant
  coast("ugarit", "sumur");
  land("ugarit", "amurru");
  land("amurru", "sumur", "qadesh", "nuhashshe", "byblos");
  coast("sumur", "byblos");
  land("qadesh", "byblos", "damascus");
  land("steppe", "damascus");
  land("byblos", "damascus");
  coast("byblos", "sidon");
  land("sidon", "damascus");
  coast("sidon", "tyre");
  land("tyre", "damascus", "megiddo");
  land("damascus", "megiddo");
  coast("tyre", "gaza");
  land("megiddo", "gaza", "shechem");
  land("shechem", "jerusalem", "gaza");
  land("jerusalem", "gaza", "sinai");
  land("gaza", "sinai");
  coast("gaza", "delta");

  // Egypt and Nubia
  land("sinai", "delta", "memphis");
  land("delta", "memphis");
  land("memphis", "akhetaten");
  land("akhetaten", "thebes");
  land("thebes", "nubia");

  // Cyprus
  coast("kalavasos", "enkomi");

  // Each coast and its waters
  for (const [id, q] of coastal) add("Sea", id, [q.waters!]);

  // Coastal hops, counterclockwise with the current: north along the Levant, west along Anatolia
  const w = watersId;
  hop(w("delta"), w("gaza"), true);
  hop(w("gaza"), w("tyre"), true);
  hop(w("tyre"), w("sidon"), true);
  hop(w("sidon"), w("byblos"), true);
  hop(w("byblos"), w("sumur"), true);
  hop(w("sumur"), w("ugarit"), true);
  hop(w("ugarit"), w("kizzuwatna"), true);
  hop(w("kizzuwatna"), w("lukka"), true);
  hop(w("lukka"), w("apasa"), true);
  hop(w("apasa"), w("seha"), true);
  hop(w("enkomi"), w("kalavasos"), true);
  hop(w("lukka"), "westsea");
  hop(w("apasa"), "westsea");

  // Open-sea crossings: Cyprus to the Levant and to Anatolia, and from the Aegean edge home to Egypt with the north wind
  crossing(w("ugarit"), w("enkomi"), true);
  crossing(w("byblos"), w("enkomi"), true);
  crossing(w("kalavasos"), w("kizzuwatna"), true);
  crossing(w("kalavasos"), w("lukka"), true);
  crossing("westsea", w("delta"), true);

  return new WorldMap(provinces, edges);
}

/**
 * The walls each land province starts with, from 0 (none) to 3 (Build order item 5, the siege package): every capital 3,
 * the city-states' cities among them since item 11+ (until then they were fortresses at 2 or walled towns at 1); the
 * fortresses 2; the walled towns 1; the lands without a town (Kaska, Lukka, the Sutean steppe) 2, their chiefs'
 * strongholds; every other land province none, and so it is left out. First guesses, tuned in item 18. The walls standing now are the game state's (GameState.walls).
 */
export const StartWalls: ReadonlyMap<string, number> = new Map([
  // Capitals: the Great Kings' and, since item 11+, the city-states' (each city-state's city is its capital)
  ["hattusa", 3], ["babylon", 3], ["ashur", 3], ["washukanni", 3], ["akhetaten", 3], ["apasa", 3], ["enkomi", 3],
  ["isuwa", 3], ["carchemish", 3], ["alalakh", 3], ["aleppo", 3], ["ugarit", 3], ["nuhashshe", 3], ["qadesh", 3], ["qatna", 3],
  ["arwad", 3], ["amurru", 3], ["byblos", 3], ["sidon", 3], ["damascus", 3], ["tyre", 3], ["megiddo", 3], ["shechem", 3],
  ["jerusalem", 3], ["suhu", 3], ["arrapha", 3], ["susa", 3],
  // Fortresses
  ["gaza", 2], ["memphis", 2], ["nesa", 2], ["nineveh", 2],
  // Walled towns
  ["sumur", 1],
  // The lands without a town (item 11+, from the review): no town's walls, but the chiefs' hill strongholds and the
  // steppe's wells hold an army off like a fortress's (the Kaska burned Hattusa and were never subdued; the Lukka men held
  // their mountains) [G]
  ["kaska", 2], ["lukka", 2], ["steppe", 2],
]);

export interface StartUnit {
  readonly power: Power;
  readonly kind: UnitKind;
  readonly province: string;
  /** Its men, when fewer than a full levy's (a city-state's, item 11+); null for a full unit. */
  readonly men: number | null;
}

const su = (power: Power, kind: UnitKind, province: string, men: number | null = null): StartUnit => ({ power, kind, province, men });

/**
 * The city-states' own troops (item 11+, first guesses for item 18): an army at its city of 50 men for each shekel its land
 * yields a season (Byblos, 30, keeps 1,500), a tenth to a third of a Great King's full levy; Arwad, the island whose ships
 * blockade Byblos (EA 98 and 105), a fleet of 20 men for each shekel instead. The lands without a town, whose villages and
 * herders all fight (the Kaska who burned Hattusa, the Lukka men raiding Alashiya, EA 38, the Suteans robbing travellers),
 * start with 250 men for each shekel.
 */
const cityUnits = (): StartUnit[] =>
  WorldMap.default.provinces
    .filter((x) => x.capital && x.home !== null && !isGreatKing(x.home))
    .map((x) => (x.home === "Arwad" ? su(x.home, "Fleet", x.id, 20 * x.yield) : su(x.home!, "Army", x.id, (x.kingless ? 250 : 50) * x.yield)));

export const StartUnits: readonly StartUnit[] = [
  su("Egypt", "Army", "memphis"),
  su("Egypt", "Army", "akhetaten"),
  su("Egypt", "Fleet", "delta"),
  su("Hatti", "Army", "hattusa"),
  su("Hatti", "Army", "nesa"),
  su("Hatti", "Fleet", "kizzuwatna"),
  su("Babylonia", "Army", "babylon"),
  su("Babylonia", "Army", "sippar"),
  su("Babylonia", "Army", "durkurigalzu"),
  su("Mitanni", "Army", "washukanni"),
  su("Mitanni", "Army", "taidu"),
  su("Mitanni", "Army", "terqa"),
  su("Assyria", "Army", "ashur"),
  su("Assyria", "Army", "nineveh"),
  su("Assyria", "Army", "ekallate"),
  su("Arzawa", "Army", "mira"),
  su("Arzawa", "Army", "apasa"),
  su("Arzawa", "Fleet", "seha"),
  su("Alashiya", "Fleet", "enkomi"),
  ...cityUnits(),
];

/**
 * The treasuries at the start (since item 9+a, set from the sources as "Starting positions come from the sources" asks;
 * the dossiers give no sums, so these are proportions marked [G]): Egypt by far the richest, "in my brother's land gold is
 * as plentiful as dirt" (EA 19); Babylonia, which reckoned in gold from Egypt's gifts, and Mitanni, which received them,
 * next; Alashiya rich from its copper; Hatti, Assyria and Arzawa least. Until item 9+a: 600, 300, 650, 500, 350, 300, 350.
 */
export const StartGold: ReadonlyMap<Power, number> = new Map<Power, number>([
  ["Egypt", 900],
  ["Hatti", 300],
  ["Babylonia", 600],
  ["Mitanni", 450],
  ["Assyria", 300],
  ["Arzawa", 300],
  ["Alashiya", 400],
  // The city-states (item 11+): four seasons of what their land yields, a first guess for item 18 (the dossiers give no sums).
  ...WorldMap.default.provinces.filter((x) => x.capital && x.home !== null && !isGreatKing(x.home)).map((x) => [x.home!, 4 * x.yield] as [Power, number]),
]);

