import type { Dict } from "../core/collections.ts";
import { eqIgnoreCase, isBlank, trim } from "../core/text.ts";
import type { Power } from "./power.ts";

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
  readonly isSea: boolean;
  readonly isCoastal: boolean;
}

export interface Edge {
  readonly a: string;
  readonly b: string;
  readonly kind: EdgeKind;
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

  /** Two coastal provinces on the same sea zone: one short voyage apart. */
  sharesSea(a: string, b: string): boolean {
    return a !== b && this.get(a).isCoastal && this.get(b).isCoastal && this.adjOf(a).some((x) => this.get(x.to).isSea && this.areAdjacent(x.to, b));
  }

  /**
   * Can a power buy this free city? It must border the power's land or troops, or lie across
   * one sea zone from one of the power's coasts: islands trade by ship.
   */
  withinReach(city: string, power: Power, owner: Dict<string, Power | null>, ownUnitProvinces: Iterable<string>): boolean {
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

function p(id: string, name: string, kind: ProvinceKind, home: Power | null, yld: number, capital: boolean, x: number, y: number): Province {
  return { id, name, kind, home, yield: yld, capital, x, y, isSea: kind === "Sea", isCoastal: kind === "Coast" };
}

/**
 * The Late Bronze Age board: 41 land provinces and 5 sea zones. Coordinates are for a
 * 1000x720 SVG view. Yields are shekels of gold per season. Historical geography serves the
 * dynamics, not the reverse.
 */
export function buildMap(): WorldMap {
  const provinces: Province[] = [
    // Arzawa (weak): western Anatolia
    p("seha", "Seha River Land", "Coast", "Arzawa", 30, false, 85, 95),
    p("apasa", "Apasa", "Coast", "Arzawa", 40, true, 70, 200),
    p("mira", "Mira", "Land", "Arzawa", 30, false, 170, 150),

    // Hatti (strong): central Anatolia
    p("tuwanuwa", "Tuwanuwa", "Land", "Hatti", 30, false, 275, 150),
    p("hattusa", "Hattusa", "Land", "Hatti", 50, true, 375, 70),
    p("sapinuwa", "Sapinuwa", "Land", "Hatti", 30, false, 480, 50),
    p("kanesh", "Kanesh", "Land", "Hatti", 35, false, 400, 165),
    p("kizzuwatna", "Kizzuwatna", "Coast", "Hatti", 35, false, 390, 255),

    // Mitanni (middle): upper Khabur
    p("harran", "Harran", "Land", "Mitanni", 35, false, 615, 200),
    p("washukanni", "Washukanni", "Land", "Mitanni", 50, true, 700, 145),
    p("taidu", "Taidu", "Land", "Mitanni", 30, false, 775, 75),
    p("terqa", "Terqa", "Land", "Mitanni", 30, false, 705, 275),

    // Assyria (middle): the Tigris
    p("nineveh", "Nineveh", "Land", "Assyria", 35, false, 865, 95),
    p("arbela", "Arbela", "Land", "Assyria", 30, false, 950, 175),
    p("ashur", "Ashur", "Land", "Assyria", 45, true, 850, 220),
    p("ekallatum", "Ekallatum", "Land", "Assyria", 25, false, 840, 320),

    // Babylonia (strong): Karduniash
    p("sippar", "Sippar", "Land", "Babylonia", 35, false, 770, 420),
    p("durkurigalzu", "Dur-Kurigalzu", "Land", "Babylonia", 35, false, 880, 405),
    p("babylon", "Babylon", "Land", "Babylonia", 55, true, 820, 505),
    p("nippur", "Nippur", "Land", "Babylonia", 35, false, 910, 570),
    p("ur", "Ur", "Land", "Babylonia", 35, false, 950, 665),

    // Egypt (strong): the Nile
    p("delta", "Nile Delta", "Coast", "Egypt", 40, false, 340, 600),
    p("sinai", "Sinai", "Land", "Egypt", 20, false, 430, 665),
    p("memphis", "Memphis", "Land", "Egypt", 40, false, 290, 660),
    p("akhetaten", "Akhetaten", "Land", "Egypt", 50, true, 195, 680),
    p("thebes", "Thebes", "Land", "Egypt", 40, false, 90, 690),

    // Alashiya (weak): Cyprus, the copper island
    p("tamassos", "Tamassos", "Coast", "Alashiya", 40, false, 290, 410),
    p("enkomi", "Enkomi", "Coast", "Alashiya", 45, true, 365, 395),

    // Neutral city-states: taken by force (each has walls: see StartWalls) or bought
    p("lukka", "Lukka", "Coast", null, 25, false, 175, 270),
    p("isuwa", "Isuwa", "Land", null, 30, false, 570, 110),
    p("carchemish", "Carchemish", "Land", null, 35, false, 555, 225),
    p("ugarit", "Ugarit", "Coast", null, 40, false, 480, 305),
    p("qadesh", "Qadesh", "Land", null, 30, false, 575, 345),
    p("amurru", "Amurru", "Coast", null, 20, false, 490, 380),
    p("mari", "Mari", "Land", null, 35, false, 690, 395),
    p("byblos", "Byblos", "Coast", null, 30, false, 475, 450),
    p("damascus", "Damascus", "Land", null, 25, false, 580, 450),
    p("tyre", "Tyre", "Coast", null, 25, false, 470, 520),
    p("megiddo", "Megiddo", "Land", null, 20, false, 550, 545),
    p("gaza", "Gaza", "Coast", null, 20, false, 455, 590),
    p("susa", "Susa", "Land", null, 35, false, 975, 470),

    // Sea zones
    p("westsea", "Western Sea", "Sea", null, 0, false, 45, 330),
    p("greatgreen", "Great Green", "Sea", null, 0, false, 165, 500),
    p("cilicia", "Cilician Sea", "Sea", null, 0, false, 285, 310),
    p("syriansea", "Syrian Sea", "Sea", null, 0, false, 425, 335),
    p("levantsea", "Levantine Sea", "Sea", null, 0, false, 385, 505),
  ];

  const edges: Edge[] = [];
  const land = (a: string, ...bs: string[]) => {
    for (const b of bs) edges.push({ a, b, kind: "Land" });
  };
  const coast = (a: string, ...bs: string[]) => {
    for (const b of bs) edges.push({ a, b, kind: "Coast" });
  };
  const sea = (a: string, ...bs: string[]) => {
    for (const b of bs) edges.push({ a, b, kind: "Sea" });
  };

  // Anatolia
  coast("seha", "apasa");
  land("seha", "mira", "tuwanuwa");
  land("apasa", "mira");
  coast("apasa", "lukka");
  land("mira", "lukka", "tuwanuwa");
  land("lukka", "tuwanuwa");
  coast("lukka", "kizzuwatna");
  land("tuwanuwa", "hattusa", "kanesh", "kizzuwatna");
  land("hattusa", "sapinuwa", "kanesh");
  land("sapinuwa", "kanesh", "isuwa");
  land("kanesh", "kizzuwatna", "isuwa", "carchemish");
  land("kizzuwatna", "carchemish");
  coast("kizzuwatna", "ugarit");

  // Upper Mesopotamia
  land("isuwa", "harran", "washukanni", "carchemish");
  land("carchemish", "harran", "ugarit", "qadesh");
  land("harran", "washukanni", "terqa");
  land("washukanni", "taidu", "terqa");
  land("taidu", "nineveh");
  land("terqa", "mari", "ashur", "ekallatum");
  land("nineveh", "arbela", "ashur");
  land("arbela", "ashur", "ekallatum");
  land("ashur", "ekallatum");

  // Babylonia and Elam
  land("ekallatum", "sippar", "durkurigalzu", "mari");
  land("susa", "durkurigalzu", "nippur", "arbela", "ur");
  land("sippar", "durkurigalzu", "babylon", "mari");
  land("durkurigalzu", "babylon", "nippur");
  land("babylon", "nippur");
  land("nippur", "ur");

  // The Levant
  land("ugarit", "qadesh");
  coast("ugarit", "amurru");
  land("amurru", "qadesh");
  coast("amurru", "byblos");
  land("qadesh", "byblos", "damascus", "mari");
  land("mari", "damascus");
  land("byblos", "damascus");
  coast("byblos", "tyre");
  land("tyre", "damascus", "megiddo");
  land("damascus", "megiddo");
  coast("tyre", "gaza");
  land("megiddo", "gaza", "sinai");
  land("gaza", "sinai");
  coast("gaza", "delta");

  // Egypt
  land("sinai", "delta", "memphis");
  land("delta", "memphis");
  land("memphis", "akhetaten");
  land("akhetaten", "thebes");

  // Cyprus
  coast("tamassos", "enkomi");

  // Seas
  sea("westsea", "seha", "apasa", "lukka", "greatgreen");
  sea("greatgreen", "lukka", "tamassos", "delta", "cilicia", "levantsea");
  sea("cilicia", "lukka", "kizzuwatna", "ugarit", "tamassos", "enkomi", "syriansea");
  sea("syriansea", "enkomi", "ugarit", "amurru", "byblos", "levantsea");
  sea("levantsea", "byblos", "tyre", "gaza", "delta", "enkomi");

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
  ["carchemish", 2], ["qadesh", 2], ["tyre", 2], ["megiddo", 2], ["gaza", 2], ["mari", 2], ["susa", 2],
  ["memphis", 2], ["kanesh", 2], ["nineveh", 2],
  // Walled towns
  ["lukka", 1], ["isuwa", 1], ["ugarit", 1], ["amurru", 1], ["byblos", 1], ["damascus", 1],
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
  su("Hatti", "Army", "kanesh"),
  su("Hatti", "Fleet", "kizzuwatna"),
  su("Babylonia", "Army", "babylon"),
  su("Babylonia", "Army", "sippar"),
  su("Babylonia", "Army", "durkurigalzu"),
  su("Mitanni", "Army", "washukanni"),
  su("Mitanni", "Army", "taidu"),
  su("Mitanni", "Army", "terqa"),
  su("Assyria", "Army", "ashur"),
  su("Assyria", "Army", "nineveh"),
  su("Assyria", "Army", "ekallatum"),
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

