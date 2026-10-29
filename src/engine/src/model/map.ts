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

function p(id: string, name: string, kind: ProvinceKind, home: Power | null, yld: number, capital: boolean, lat: number, lon: number): Province {
  return { id, name, kind, home, yield: yld, capital, lat, lon, isSea: kind === "Sea", isCoastal: kind === "Coast", waters: null, kingless: false };
}

/** The province at sea named for the coast it lies off: "ugaritwaters", "Ugarit waters". */
export const watersId = (coast: string): string => coast + "waters";

/**
 * The Late Bronze Age board after the map review of build order item 7a: 61 land provinces and 18 sea zones (with item
 * 11c's six cities of Canaan and the Red Sea). Latitude and longitude are those of each province's town (for a sea zone,
 * of the harbour it lies off), and give the lengths of the connections ({@link connectionKm}); where each is drawn is the
 * web map's (its true projection, item 11c). Yields are shekels of gold per season. The sources of each place, name and connection are in `docs/history/` and the item's report.
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
    // Arzawa (weak): western Anatolia. Since item 11d, Mira and the Seha River Land, "each with its own ruler, more allied
    // than ruled" (the politics dossier), are Arzawa's vassal city-states.
    p("seha", "Seha River Land", "Coast", "Seha", 30, true, 38.6, 27.4),
    p("apasa", "Apasa", "Coast", "Arzawa", 40, true, 37.94, 27.34),
    p("mira", "Mira", "Land", "Mira", 30, true, 38.5, 29.5),

    // Hatti (strong): central Anatolia. Nesa is Kanesh by its Hittite name (Kanesh mattered most in the Old Assyrian age).
    p("tuwanuwa", "Tuwanuwa", "Land", "Hatti", 30, false, 37.97, 34.68),
    p("hattusa", "Hattusa", "Land", "Hatti", 50, true, 40.02, 34.62),
    p("sapinuwa", "Sapinuwa", "Land", "Hatti", 25, false, 40.33, 35.32),
    p("nesa", "Nesa", "Land", "Hatti", 30, false, 38.85, 35.63),
    // Samuha (Kayalıpınar on the upper Halys), in Hatti's Upper Land, where the court sat while Hattusa was overrun (item
    // 11f, "What earns a place"), carved from Sapinuwa's and Nesa's land, each 5 less (first guesses, item 18).
    p("samuha", "Samuha", "Land", "Hatti", 25, false, 39.61, 36.52),
    p("kizzuwatna", "Kizzuwatna", "Coast", "Hatti", 35, false, 36.92, 34.9),

    // Mitanni (middle): upper Khabur
    p("harran", "Harran", "Land", "Mitanni", 35, false, 36.87, 39.03),
    p("washukanni", "Washukanni", "Land", "Mitanni", 50, true, 36.85, 40.07),
    p("taidu", "Taidu", "Land", "Mitanni", 30, false, 36.8, 41.0),
    // Terqa, the centre of Hana "under local kings, within Mitanni's reach": Mitanni's vassal city-state since item 11d
    p("terqa", "Terqa", "Land", "Terqa", 30, true, 34.92, 40.57),

    // Assyria (middle): the Tigris. Ekallate is Ekallatum by its Middle Assyrian name.
    p("nineveh", "Nineveh", "Land", "Assyria", 35, false, 36.36, 43.15),
    p("arbela", "Arbela", "Land", "Assyria", 30, false, 36.19, 44.01),
    p("ashur", "Ashur", "Land", "Assyria", 45, true, 35.46, 43.26),
    p("ekallate", "Ekallate", "Land", "Assyria", 25, false, 35.0, 43.5),

    // Babylonia (strong): Karduniash, with Dilmun in the Gulf under its governor
    p("sippar", "Sippar", "Land", "Babylonia", 35, false, 33.06, 44.25),
    p("durkurigalzu", "Dur-Kurigalzu", "Land", "Babylonia", 35, false, 33.35, 44.2),
    p("babylon", "Babylon", "Land", "Babylonia", 55, true, 32.54, 44.42),
    p("nippur", "Nippur", "Land", "Babylonia", 35, false, 32.13, 45.23),
    p("ur", "Ur", "Coast", "Babylonia", 35, false, 30.96, 46.1),
    p("dilmun", "Dilmun", "Coast", "Babylonia", 20, false, 26.23, 50.52),

    // Egypt (strong): the Nile, with Nubia (Kush) under the King's Son of Kush
    p("delta", "Nile Delta", "Coast", "Egypt", 40, false, 30.79, 31.82),
    p("sinai", "Sinai", "Coast", "Egypt", 20, false, 30.9, 33.5),
    p("memphis", "Memphis", "Land", "Egypt", 40, false, 29.85, 31.25),
    p("akhetaten", "Akhetaten", "Land", "Egypt", 50, true, 27.65, 30.9),
    p("thebes", "Thebes", "Coast", "Egypt", 40, false, 25.7, 32.64),
    p("nubia", "Nubia", "Land", "Egypt", 30, false, 22.67, 32.03),

    // Alashiya (weak): Cyprus, the copper island, east and west
    p("kalavasos", "Kalavasos", "Coast", "Alashiya", 40, false, 34.77, 33.3),
    p("enkomi", "Enkomi", "Coast", "Alashiya", 45, true, 35.16, 33.88),

    // The city-states, each a power of its own since item 11+ ("City-states as powers"), its one city its capital: taken by
    // force (each has walls: see StartWalls) or by agreement, never bought. Gaza and Sumur are Egypt's own land, governed
    // by its commissioners ("Opening relations as they were"; the politics dossier).
    p("isuwa", "Isuwa", "Land", "Isuwa", 30, true, 38.67, 39.22),
    // Item 11f ("What earns a place"): Azzi-Hayasa, the highlands beyond Isuwa under Hukkana (by Erzincan; its towns not
    // located), new land on the map
    p("azzi", "Azzi-Hayasa", "Land", "Azzi", 20, true, 39.75, 39.49),
    p("carchemish", "Carchemish", "Land", "Carchemish", 35, true, 36.83, 38.02),
    p("alalakh", "Alalakh", "Land", "Alalakh", 20, true, 36.24, 36.38),
    p("aleppo", "Aleppo", "Land", "Aleppo", 35, true, 36.2, 37.16),
    p("ugarit", "Ugarit", "Coast", "Ugarit", 40, true, 35.6, 35.78),
    p("nuhashshe", "Nuhashshe", "Land", "Nuhashshe", 20, true, 35.5, 37.0),
    // Item 11f: two cities on the Orontes, Niya (probably Qal'at al-Mudiq, above the Ghab) from Alalakh's land and Tunip
    // (probably Tell Acharneh) from Nuhashshe's, each of those 5 less
    p("niya", "Niya", "Land", "Niya", 15, true, 35.42, 36.4),
    p("tunip", "Tunip", "Land", "Tunip", 15, true, 35.29, 36.4),
    p("qatna", "Qatna", "Land", "Qatna", 30, true, 34.84, 36.86),
    p("qadesh", "Qadesh", "Land", "Qadesh", 30, true, 34.56, 36.52),
    // Amurru, the hill country behind the coast, and Ṣumur (Tell Kazel), Egypt's base on that coast, a province of its own
    // since item 8 (Haakon's answer to item 7a's review: the period first, the phone made to read it).
    p("amurru", "Amurru", "Land", "Amurru", 20, true, 34.7, 36.2),
    p("sumur", "Sumur", "Coast", "Egypt", 15, false, 34.82, 35.98),
    p("arwad", "Arwad", "Coast", "Arwad", 20, true, 34.86, 35.86),
    p("byblos", "Byblos", "Coast", "Byblos", 25, true, 34.12, 35.65),
    // Beirut under Ammunira (item 11f), carved from Byblos's and Sidon's land, each 5 less
    p("beirut", "Beirut", "Coast", "Beirut", 10, true, 33.9, 35.5),
    p("sidon", "Sidon", "Coast", "Sidon", 20, true, 33.56, 35.37),
    p("damascus", "Damascus", "Land", "Damascus", 20, true, 33.51, 36.29),
    p("tyre", "Tyre", "Coast", "Tyre", 25, true, 33.27, 35.2),
    p("megiddo", "Megiddo", "Land", "Megiddo", 15, true, 32.58, 35.18),
    p("shechem", "Shechem", "Land", "Shechem", 15, true, 32.21, 35.28),
    p("jerusalem", "Jerusalem", "Land", "Jerusalem", 10, true, 31.78, 35.23),
    // Six cities of Canaan that act in the letters (item 11c, "What earns a place"), carved from the provinces that held
    // them, each a city-state under its attested ruler and Egypt's vassal at the start: Akko from Megiddo's land, Hazor from
    // Damascus's, Gezer from Shechem's, Ashkelon from Gaza's, Shuwardata's hills from Jerusalem's, Lachish from Gaza's and
    // Jerusalem's. Each takes 10 of the yield, and the land it came from gives up 5 (first guesses, item 18).
    p("akko", "Akko", "Coast", "Akko", 10, true, 32.92, 35.08),
    p("hazor", "Hazor", "Land", "Hazor", 10, true, 33.02, 35.57),
    p("gezer", "Gezer", "Land", "Gezer", 10, true, 31.86, 34.92),
    p("ashkelon", "Ashkelon", "Coast", "Ashkelon", 10, true, 31.66, 34.55),
    p("lachish", "Lachish", "Land", "Lachish", 10, true, 31.56, 34.85),
    p("hebron", "Hebron Hills", "Land", "Hebron", 10, true, 31.53, 35.1),
    // Item 11f: east of the Jordan, Pella (Pihil, Tabaqat Fahl) under Mut-Bahlu and Ashtaroth (Tell Ashtara) under Ayyab,
    // new land on the map
    p("pella", "Pella", "Land", "Pella", 10, true, 32.45, 35.62),
    p("ashtaroth", "Ashtaroth", "Land", "Ashtaroth", 10, true, 32.8, 36.01),
    p("gaza", "Gaza", "Coast", "Egypt", 15, false, 31.5, 34.46),
    p("suhu", "Suhu", "Land", "Suhu", 35, true, 34.47, 41.95),
    p("arrapha", "Arrapha", "Land", "Arrapha", 30, true, 35.47, 44.39),
    p("susa", "Susa", "Coast", "Elam", 35, true, 32.19, 48.26),
    // The edges: lands without a king, each under one leader of its own since item 11+ ("Land without a ruler")
    // Lukka, the Lycian coast of seafarers and raiders, ruled by no king (since item 8: Haakon's answer to item 7a's review)
    { ...p("lukka", "Lukka", "Coast", "Lukka", 15, true, 36.4, 29.4), kingless: true },
    { ...p("kaska", "Kaska Lands", "Land", "Kaska", 10, true, 41.1, 35.4), kingless: true },
    { ...p("steppe", "Sutean Steppe", "Land", "Suteans", 10, true, 34.55, 38.27), kingless: true },
    // Item 11f ("The edges of the map"): Libya west of the Delta, the Tjehenu and Tjemehu, and the Shasu of the Negev and
    // Edom, each a desert land under a chief, no town: their centres are the herders' land, not a site [G]
    { ...p("libya", "Libya", "Land", "Libya", 10, true, 30.95, 28.6), kingless: true },
    { ...p("shasu", "Shasu Lands", "Land", "Shasu", 10, true, 30.6, 35.3), kingless: true },
  ];

  // Sea zones: the waters of each coastal province (Ṣumur's shared with Arwad), the open sea at the Aegean edge, and the Gulf.
  const waters = (coast: string, name: string): Province => {
    const c = provinces.find((q) => q.id === coast)!;
    return p(watersId(coast), name, "Sea", null, 0, false, c.lat, c.lon);
  };
  const seas: Province[] = [
    waters("seha", "Seha waters"),
    waters("apasa", "Apasa waters"),
    waters("lukka", "Lukka waters"),
    waters("kizzuwatna", "Kizzuwatna waters"),
    waters("kalavasos", "Kalavasos waters"),
    waters("enkomi", "Enkomi waters"),
    waters("ugarit", "Ugarit waters"),
    waters("sumur", "Sumur and Arwad waters"),
    waters("byblos", "Byblos waters"),
    waters("beirut", "Beirut waters"),
    waters("sidon", "Sidon waters"),
    waters("tyre", "Tyre waters"),
    waters("akko", "Akko waters"),
    waters("ashkelon", "Ashkelon waters"),
    waters("gaza", "Gaza waters"),
    waters("delta", "Delta waters"),
    p("westsea", "Western Sea", "Sea", null, 0, false, 35.5, 26.5),
    p("gulf", "The Gulf", "Sea", null, 0, false, 28.5, 50.0),
    // The Red Sea (item 11c, "The Red Sea" under Ideas): one zone, Egypt's alone, reached by the Sinai at the Gulf of Suez and
    // by Thebes over the Wadi Hammamat road to its harbour at Mersa Gawasis (whose latitude and longitude it takes). No sea
    // connection joins it to the Great Green: a fleet reaches it only by being built on its shore ("Ships carried overland").
    p("redsea", "The Red Sea", "Sea", null, 0, false, 26.55, 34.04),
  ];
  provinces.push(...seas);
  const coastal = new Map(provinces.filter((q) => q.isCoastal).map((q) => [q.id, q]));
  for (const [id, q] of coastal) (q as { waters: string | null }).waters = id === "arwad" ? watersId("sumur") : id === "ur" || id === "dilmun" || id === "susa" ? "gulf" : id === "sinai" || id === "thebes" ? "redsea" : watersId(id);

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
  // The road from Sapinuwa to Isuwa runs through the Upper Land, by Samuha (item 11f); Azzi beyond Samuha and Isuwa.
  land("sapinuwa", "nesa", "samuha", "kaska");
  land("samuha", "nesa", "isuwa", "kaska", "azzi", "hattusa");
  land("azzi", "isuwa");
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
  land("alalakh", "aleppo", "ugarit", "niya");
  land("aleppo", "nuhashshe");
  // Item 11f: the roads from the coast into the Orontes valley now reach Niya and Tunip, and go on to Nuhashshe from them.
  land("ugarit", "niya");
  land("niya", "nuhashshe", "tunip");
  land("tunip", "nuhashshe", "qatna", "qadesh", "amurru", "sumur");
  land("nuhashshe", "qatna", "qadesh");
  land("qatna", "qadesh", "steppe");
  land("suhu", "steppe");

  // The Levant
  coast("ugarit", "sumur");
  land("ugarit", "amurru");
  land("amurru", "sumur", "qadesh", "byblos");
  coast("sumur", "byblos");
  land("qadesh", "byblos", "damascus");
  land("steppe", "damascus");
  land("byblos", "damascus");
  coast("byblos", "beirut");
  coast("beirut", "sidon");
  land("beirut", "damascus");
  land("sidon", "damascus");
  coast("sidon", "tyre");
  land("tyre", "damascus", "megiddo");
  // The road from Megiddo to Damascus runs by Hazor, and the shore from Tyre to Gaza by Akko and Ashkelon (item 11c).
  land("hazor", "megiddo", "damascus", "akko", "tyre");
  coast("tyre", "akko");
  land("akko", "megiddo");
  coast("akko", "ashkelon");
  coast("ashkelon", "gaza");
  land("ashkelon", "gezer", "lachish");
  land("gezer", "jerusalem", "shechem", "megiddo", "lachish");
  land("lachish", "gaza", "jerusalem", "hebron");
  land("hebron", "jerusalem", "sinai");
  land("megiddo", "gaza", "shechem");
  land("shechem", "jerusalem", "gaza");
  land("jerusalem", "gaza", "sinai");
  land("gaza", "sinai");
  coast("gaza", "delta");
  // East of the Jordan (item 11f): Pella across from Beth-Shan, Ashtaroth in the Bashan on the road to Damascus, and the
  // Shasu's land south of the Dead Sea, reached from the Hebron hills, across the Sinai, and north by the King's Highway.
  land("pella", "megiddo", "shechem", "ashtaroth", "hazor");
  land("ashtaroth", "damascus", "hazor");
  land("shasu", "hebron", "sinai", "ashtaroth", "gaza");

  // Egypt and Nubia
  land("sinai", "delta", "memphis");
  land("libya", "delta", "memphis");
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
  hop(w("gaza"), w("ashkelon"), true);
  hop(w("ashkelon"), w("akko"), true);
  hop(w("akko"), w("tyre"), true);
  hop(w("tyre"), w("sidon"), true);
  hop(w("sidon"), w("beirut"), true);
  hop(w("beirut"), w("byblos"), true);
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
 * The walls each land province starts with, from 0 (none) to 3 (Build order item 5, the siege package): every Great King's
 * capital 3 (the walls dossier's own proposals for them wait for item 15); since item 11d each city-state's city as the
 * walls dossier (`docs/history/12-walls-roads-harbours.md`, "Walls by city", its "Proposed" column) gives it, with the
 * early falls that brings, and where the dossier knows nothing of a city-state's town (Mira, Seha, Terqa) 1, as it gives
 * the other unexcavated towns of the city-states; the fortresses 2; the walled towns 1; the lands without a town (Kaska,
 * Lukka, the Sutean steppe) none, as the sources give none, their defence the rough land and their scattered people
 * (Lukka's early falls left to item 18); every other land province none, and so it is left out. First guesses, tuned in
 * item 18. The walls standing now are the game state's (GameState.walls).
 */
export const StartWalls: ReadonlyMap<string, number> = new Map([
  // The Great Kings' capitals
  ["hattusa", 3], ["babylon", 3], ["ashur", 3], ["washukanni", 3], ["akhetaten", 3], ["apasa", 3], ["enkomi", 3],
  // The city-states' cities, by the walls dossier (item 11d): Qatna's and Qadesh's great ramparts 3; Carchemish's
  // citadel, Aleppo's, Ugarit's gate and glacis, Byblos's and Shechem's Middle Bronze walls, the islands Arwad and Tyre,
  // and Susa 2; Megiddo (no city wall: its gate and palace), Alalakh, Jerusalem, Nuzi, and the towns nobody has dug 1
  ["qatna", 3], ["qadesh", 3],
  ["carchemish", 2], ["aleppo", 2], ["ugarit", 2], ["arwad", 2], ["byblos", 2], ["tyre", 2], ["shechem", 2], ["susa", 2],
  ["isuwa", 1], ["alalakh", 1], ["nuhashshe", 1], ["amurru", 1], ["sidon", 1], ["damascus", 1], ["megiddo", 1],
  ["jerusalem", 1], ["suhu", 1],
  // Item 11f, by the same reading: Tunip's and Niya's, Beirut's, Pella's and Ashtaroth's towns, which the walls dossier
  // knows nothing of, and Azzi's mountain strongholds (Aripsa, Dukkamma) 1; Libya and the Shasu, no town, none
  ["tunip", 1], ["niya", 1], ["beirut", 1], ["pella", 1], ["ashtaroth", 1], ["azzi", 1], ["arrapha", 1], ["seha", 1], ["mira", 1], ["terqa", 1],
  // Item 11c's six cities of Canaan, by the same reading of the walls dossier: Hazor's great Middle Bronze rampart, still
  // used, 3; the five the dossier does not list 1, as the other towns it knows nothing of
  ["hazor", 3], ["akko", 1], ["gezer", 1], ["ashkelon", 1], ["lachish", 1], ["hebron", 1],
  // Fortresses
  ["gaza", 2], ["memphis", 2], ["nesa", 2], ["nineveh", 2],
  // Walled towns
  ["sumur", 1],
  // Samuha, the Upper Land's royal residence and army base (KBo VI 28), first guess 1
  ["samuha", 1],
]);

export interface StartUnit {
  readonly power: Power;
  readonly kind: UnitKind;
  readonly province: string;
  /** Its men (since item 13, from the armies dossier); null for a full unit of its kind. */
  readonly men: number | null;
  /** Where its men were levied: the province it stands in, or for a fleet in the waters, its port (item 13). */
  readonly home: string;
}

const su = (power: Power, kind: UnitKind, province: string, men: number | null = null, home: string = province): StartUnit => ({ power, kind, province, men, home });

/**
 * Item 13 ("Starting positions come from the sources"): the men a ship carries into a fight, its crew and the soldiers
 * aboard, a first guess [G] from the armies dossier (`docs/history/11-armies-and-fleets.md`, "Fleets": the Uluburun ship's
 * crew of five to ten, with archers and spearmen aboard when ships fought). A fleet's men are its ships times this.
 */
export const MenPerShip = 25;

/**
 * The city-states' own troops at the start. Until item 13 every city kept 50 men for each shekel its land yields a season
 * (item 11+, a first guess), and the lands without a town 250. Since item 13 the armies dossier sets them where it gives a
 * range ("The city-states"): the middle of the range for the cities that fight in the letters (Amurru, Damascus, Shechem,
 * Qatna), the low end for those that only plead (Byblos, Jerusalem, Megiddo, Tyre), and for the rest the old guess kept
 * within the dossier's range; where the dossier gives none, the old guess stands. Arwad, Sidon, Tyre, Byblos and Ugarit
 * also keep the ships the dossier gives them ("Fleets"), in the waters off their city.
 */
const CityRange: Readonly<Record<string, readonly [number, number, "low" | "middle" | null]>> = {
  megiddo: [100, 500, "low"],
  shechem: [100, 500, "middle"],
  jerusalem: [100, 500, "low"],
  akko: [100, 500, null],
  hazor: [100, 500, null],
  gezer: [100, 500, null],
  ashkelon: [100, 500, null],
  lachish: [100, 500, null],
  hebron: [100, 500, null],
  pella: [100, 500, null],
  ashtaroth: [100, 500, null],
  beirut: [100, 500, null],
  byblos: [200, 500, "low"],
  amurru: [500, 2000, "middle"],
  damascus: [500, 1000, "middle"],
  ugarit: [1000, 3000, null],
  qatna: [500, 2000, "middle"],
  qadesh: [500, 2000, null],
  aleppo: [500, 2000, null],
  alalakh: [500, 2000, null],
  nuhashshe: [500, 2000, null],
  tyre: [100, 500, "low"],
  sidon: [100, 500, null],
  kaska: [1000, 5000, null],
  lukka: [1000, 5000, null],
  steppe: [1000, 5000, null],
};

function cityMen(x: Province): number {
  const old = (x.kingless ? 250 : 50) * x.yield;
  const r = CityRange[x.id];
  if (r === undefined) return old;
  const [low, high, end] = r;
  return end === "low" ? low : end === "middle" ? Math.floor((low + high) / 2) : Math.min(high, Math.max(low, old));
}

/** The ships of the coastal cities (the armies dossier, "Fleets", its "Start from" column), by the city's capital province. */
const CityShips: Readonly<Record<string, number>> = { ugarit: 80, arwad: 20, sidon: 20, tyre: 20, byblos: 10 };

const cityUnits = (): StartUnit[] =>
  WorldMap.default.provinces
    .filter((x) => x.capital && x.home !== null && !isGreatKing(x.home))
    .flatMap((x) => {
      const home = x.home!;
      // Arwad, the island whose ships blockade Byblos (EA 98 and 105), keeps a fleet in its city instead of an army.
      if (home === "Arwad") return [su(home, "Fleet", x.id, CityShips[x.id] * MenPerShip)];
      const army = su(home, "Army", x.id, cityMen(x));
      const ships = CityShips[x.id];
      return ships === undefined ? [army] : [army, su(home, "Fleet", x.waters ?? x.id, ships * MenPerShip, x.id)];
    });

/**
 * The Great Kings' armies and fleets at the start (item 13, "Starting positions come from the sources"), from the armies
 * dossier's "Start from" columns: Egypt and Hatti 15,000 men, Mitanni, Babylonia and Arzawa 10,000, Assyria 4,000 and
 * Alashiya 1,500, split between the cities where each kept its troops before item 13; Egypt's garrisons in its centres in
 * Canaan, Gaza and Sumur, a hundred men each (the low end of a town's range: EA 287, EA 289). Ships: Egypt 40, Alashiya 30,
 * Arzawa 10, Hatti 5, each {@link MenPerShip} men. Until item 13 every unit was a full levy, 5,000 men or a fleet's 2,000.
 */
export const StartUnits: readonly StartUnit[] = [
  su("Egypt", "Army", "memphis", 7500),
  su("Egypt", "Army", "akhetaten", 7500),
  su("Egypt", "Army", "gaza", 100),
  su("Egypt", "Army", "sumur", 100),
  su("Egypt", "Fleet", "delta", 40 * MenPerShip),
  su("Hatti", "Army", "hattusa", 7500),
  su("Hatti", "Army", "nesa", 7500),
  su("Hatti", "Fleet", "kizzuwatna", 5 * MenPerShip),
  su("Babylonia", "Army", "babylon", 4000),
  su("Babylonia", "Army", "sippar", 3000),
  su("Babylonia", "Army", "durkurigalzu", 3000),
  su("Mitanni", "Army", "washukanni", 5000),
  su("Mitanni", "Army", "taidu", 5000),
  su("Assyria", "Army", "ashur", 2000),
  su("Assyria", "Army", "nineveh", 1000),
  su("Assyria", "Army", "ekallate", 1000),
  su("Arzawa", "Army", "apasa", 10000),
  su("Arzawa", "Fleet", "apasawaters", 10 * MenPerShip, "apasa"),
  su("Alashiya", "Army", "enkomi", 1500),
  su("Alashiya", "Fleet", "enkomiwaters", 30 * MenPerShip, "enkomi"),
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

