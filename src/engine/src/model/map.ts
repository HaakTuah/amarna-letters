import type { Dict } from "../core/collections.ts";
import { eqIgnoreCase, isBlank, trim } from "../core/text.ts";
import type { Power } from "./power.ts";
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
  /** A land without a king (the Kaska lands, the Sutean steppe): no walls, and no elders to sell it ("The edges of the map"). */
  readonly kingless: boolean;
}

export interface Edge {
  readonly a: string;
  readonly b: string;
  readonly kind: EdgeKind;
  /** An open-sea crossing between two waters, closed in winter: long, and hard to stop anyone on. */
  readonly open: boolean;
  /** Sailing from a to b goes with the current, so it is quicker than from b to a (a voyage's time is item 7b's). */
  readonly current: boolean;
}

/** The season of the year (0, 1 or 2) that is winter everywhere: Peret, when the open sea and the mountain passes are closed. */
export const WinterSeason = 1;

/** The season of the year (0 Akhet, 1 Peret, 2 Shemu) a turn falls in. */
export const seasonOfTurn = (turn: number): number => (((turn - 1) % 3) + 3) % 3;

/** A connection closed in winter: an open-sea crossing, or a mountain pass. */
export function closedInWinter(e: Edge): boolean {
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
   * The map as it can be crossed in winter: the same provinces, without the open-sea crossings and the mountain passes,
   * closed by the same season (item 7b, "Land and climate").
   */
  get winter(): WorldMap {
    if (this.edges.every((e) => !closedInWinter(e))) return this;
    return (this.winterMap ??= new WorldMap(this.provinces, this.edges.filter((e) => !closedInWinter(e))));
  }

  /** The map as it can be crossed in a turn: in winter ({@link WinterSeason}) without the open-sea crossings and the passes. */
  forTurn(turn: number): WorldMap {
    return seasonOfTurn(turn) === WinterSeason ? this.winter : this;
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

  /**
   * Can a power buy this free city? It must border the power's land or troops, or lie one voyage from one of the
   * power's coasts ({@link sharesSea}): islands trade by ship.
   */
  withinReach(city: string, power: Power, owner: Dict<string, Power | null>, ownUnitProvinces: Iterable<string>): boolean {
    if (this.get(city).kingless) return false;
    const units = [...ownUnitProvinces];
    if (this.neighbors(city).some((n) => owner.getOrDefault(n, null) === power || units.includes(n))) return true;
    if (!this.get(city).isCoastal) return false;
    for (const [k, v] of owner.entries()) if (v === power && this.sharesSea(k, city)) return true;
    return false;
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
 * across the open sea, closed in winter ({@link WorldMap.forTurn}). Ships keep to the coasts, so an army is carried only
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

    // Free city-states: taken by force (each has walls: see StartWalls) or bought
    p("lukka", "Lukka", "Coast", null, 25, false, 175, 270, 36.4, 29.4),
    p("isuwa", "Isuwa", "Land", null, 30, false, 565, 105, 38.67, 39.22),
    p("carchemish", "Carchemish", "Land", null, 35, false, 575, 185, 36.83, 38.02),
    p("alalakh", "Alalakh", "Land", null, 25, false, 495, 245, 36.24, 36.38),
    p("aleppo", "Aleppo", "Land", null, 35, false, 560, 255, 36.2, 37.16),
    p("ugarit", "Ugarit", "Coast", null, 40, false, 478, 302, 35.6, 35.78),
    p("nuhashshe", "Nuhashshe", "Land", null, 25, false, 620, 300, 35.5, 37.0),
    p("qatna", "Qatna", "Land", null, 30, false, 648, 345, 34.84, 36.86),
    p("qadesh", "Qadesh", "Land", null, 30, false, 570, 355, 34.56, 36.52),
    // Amurru with Ṣumur, Egypt's base on its coast, as its harbour (built both ways in item 7a; see its report).
    p("amurru", "Amurru", "Coast", null, 20, false, 490, 380, 34.92, 35.98),
    p("arwad", "Arwad", "Coast", null, 20, false, 453, 366, 34.86, 35.86),
    p("byblos", "Byblos", "Coast", null, 30, false, 478, 428, 34.12, 35.65),
    p("sidon", "Sidon", "Coast", null, 25, false, 470, 478, 33.56, 35.37),
    p("damascus", "Damascus", "Land", null, 25, false, 580, 450, 33.51, 36.29),
    p("tyre", "Tyre", "Coast", null, 25, false, 462, 530, 33.27, 35.2),
    p("megiddo", "Megiddo", "Land", null, 20, false, 540, 525, 32.58, 35.18),
    p("shechem", "Shechem", "Land", null, 20, false, 548, 585, 32.21, 35.28),
    p("jerusalem", "Jerusalem", "Land", null, 15, false, 515, 632, 31.78, 35.23),
    p("gaza", "Gaza", "Coast", null, 20, false, 450, 595, 31.5, 34.46),
    p("suhu", "Suhu", "Land", null, 35, false, 690, 395, 34.47, 41.95),
    p("arrapha", "Arrapha", "Land", null, 30, false, 930, 262, 35.47, 44.39),
    p("susa", "Susa", "Coast", null, 35, false, 975, 470, 32.19, 48.26),
    // The edges: lands without a king
    { ...p("kaska", "Kaska Lands", "Land", null, 10, false, 440, 28, 41.1, 35.4), kingless: true },
    { ...p("steppe", "Sutean Steppe", "Land", null, 10, false, 690, 478, 34.55, 38.27), kingless: true },
  ];

  // Sea zones: the waters of each coastal province (Amurru's shared with Arwad), the open sea at the Aegean edge, and the Gulf.
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
    waters("amurru", "Amurru and Arwad waters", 432, 385),
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
  for (const [id, q] of coastal) (q as { waters: string | null }).waters = id === "arwad" ? watersId("amurru") : id === "ur" || id === "dilmun" || id === "susa" ? "gulf" : watersId(id);

  const edges: Edge[] = [];
  const add = (kind: EdgeKind, a: string, bs: string[], open = false, current = false): void => {
    for (const b of bs) edges.push({ a, b, kind, open, current });
  };
  const land = (a: string, ...bs: string[]) => add("Land", a, bs);
  const coast = (a: string, ...bs: string[]) => add("Coast", a, bs);
  /** A coastal hop between neighbouring waters; `current` when sailing from a to b goes with the current. */
  const hop = (a: string, b: string, current = false) => add("Sea", a, [b], false, current);
  /** An open-sea crossing, closed in winter. */
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
  coast("ugarit", "amurru");
  land("amurru", "qadesh", "nuhashshe");
  coast("amurru", "byblos");
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
  hop(w("byblos"), w("amurru"), true);
  hop(w("amurru"), w("ugarit"), true);
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
 * The walls each land province starts with, from 0 (none) to 3 (Build order item 5, the siege package): every capital 3;
 * the fortresses 2; the walled towns 1; every other land province none, and so it is left out. First guesses, tuned in
 * item 18. The walls standing now are the game state's (GameState.walls).
 */
export const StartWalls: ReadonlyMap<string, number> = new Map([
  // Capitals
  ["hattusa", 3], ["babylon", 3], ["ashur", 3], ["washukanni", 3], ["akhetaten", 3], ["apasa", 3], ["enkomi", 3],
  // Fortresses
  ["carchemish", 2], ["qadesh", 2], ["tyre", 2], ["megiddo", 2], ["gaza", 2], ["susa", 2],
  ["memphis", 2], ["nesa", 2], ["nineveh", 2], ["aleppo", 2], ["qatna", 2], ["arwad", 2],
  // Walled towns
  ["lukka", 1], ["isuwa", 1], ["ugarit", 1], ["amurru", 1], ["byblos", 1], ["damascus", 1],
  ["alalakh", 1], ["sidon", 1], ["jerusalem", 1], ["shechem", 1], ["arrapha", 1], ["suhu", 1], ["nuhashshe", 1],
]);

export interface StartUnit {
  readonly power: Power;
  readonly kind: UnitKind;
  readonly province: string;
}

const su = (power: Power, kind: UnitKind, province: string): StartUnit => ({ power, kind, province });

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
];

export const StartGold: ReadonlyMap<Power, number> = new Map<Power, number>([
  ["Egypt", 600],
  ["Hatti", 300],
  ["Babylonia", 650],
  ["Mitanni", 500],
  ["Assyria", 350],
  ["Arzawa", 300],
  ["Alashiya", 350],
]);

