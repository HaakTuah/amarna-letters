/**
 * The map's marks for what makes a journey hard (item 11c+, "the map says at a glance what each crossing does"): every
 * crossing in the rules (a pass, a ford or ferry, a desert's edge; a strait once the rules have one) where its road crosses
 * the border, and every province of rough ground at the heart of its land. A tap on one says its effect in words, from
 * the engine's own numbers: how much longer it makes the journey and in which season, whether winter makes it dangerous,
 * and whether it helps a defender who stands.
 */
import {
  Crossings,
  PointsPerDay,
  Pace,
  Rough,
  Rivers,
  TravelData,
  WinterSeason,
  WorldMap,
  connectionKm,
  legPoints,
  newGameConfig,
  snowbound,
  terrainOf,
  type Crossing,
  type GameConfig,
} from "@amarna/engine";
import { provinceName } from "../ui/format.ts";
import { RoughSpot, along, city, roadBetween, type Pt } from "./art.ts";

export type MarkKind = "pass" | "ford" | "strait" | "desert" | "rough";

/** A mark on the map: where it stands, which way its road runs there, and what it marks. */
export interface MapMark {
  key: string;
  kind: MarkKind;
  at: Pt;
  angle: number;
  crossing: Crossing | null;
  province: string | null;
}

const Map_ = WorldMap.default;

export const markKind = (c: Crossing): MarkKind => (c.kind === "Mountain" ? "pass" : c.kind === "River" ? "ford" : /strait/iu.test(c.name) ? "strait" : "desert");

/** What each kind is called in the legend. */
export const MarkNames: Readonly<Record<MarkKind, string>> = {
  pass: "a mountain pass",
  ford: "a ford or ferry over a great river",
  strait: "a strait",
  desert: "a desert's edge",
  rough: "rough ground",
};

const crossingKey = (a: string, b: string): string => (a < b ? `${a}|${b}` : `${b}|${a}`);

/** Where a crossing's mark stands: where its road crosses the border, or, for a desert road to a sea, halfway along it. */
function placeOf(c: Crossing): { at: Pt; angle: number } {
  const r = roadBetween(c.a, c.b);
  const i = r.cross >= 0 ? r.cross : -1;
  const at = i >= 0 ? r.pts[i] : along(r.pts, 0.5);
  const before = i > 0 ? r.pts[i - 1] : r.pts[0];
  const after = i >= 0 && i + 1 < r.pts.length ? r.pts[i + 1] : r.pts[r.pts.length - 1];
  return { at, angle: (Math.atan2(after.y - before.y, after.x - before.x) * 180) / Math.PI };
}

/** Every mark on the map, crossings first, then rough ground. */
export const Marks: readonly MapMark[] = [
  ...Crossings.map((c) => ({ key: `x:${crossingKey(c.a, c.b)}`, kind: markKind(c), ...placeOf(c), crossing: c, province: null })),
  ...Rough.filter((id) => Map_.exists(id)).map((id) => ({ key: `r:${id}`, kind: "rough" as const, at: RoughSpot.get(id) ?? city(id), angle: 0, crossing: null, province: id })),
];

/** The kinds present on this map, in the legend's order. */
export const MarkKindsShown: readonly MarkKind[] = (["pass", "ford", "strait", "desert", "rough"] as const).filter((k) => Marks.some((m) => m.kind === k));

const SeasonNames = ["Akhet", "Peret (winter)", "Shemu"];
const days = (points: number): string => {
  const d = Math.round((points / PointsPerDay) * 10) / 10;
  return `${d} day${d === 1 ? "" : "s"}`;
};

/** A mark's effect in words: a title and a few plain sentences. */
export function markText(m: MapMark, config: GameConfig = newGameConfig()): { title: string; lines: string[] } {
  const defence = config.terrainDefence;
  if (m.crossing === null) {
    const p = m.province!;
    return {
      title: `${provinceName(p)}: rough ground`,
      lines: [
        `The roads in it are slow: a company makes ${Pace.rough} km a day there, against ${Pace.open} on open ground.`,
        "Winter brings it no danger of its own, though the roads are slower in Peret where the winter is cool or hard.",
        defence > 0 ? `It helps a defender who stands: a unit holding its ground here is ${defence} stronger against any attack.` : "In this game the ground gives a defender no help.",
      ],
    };
  }
  const c = m.crossing;
  const { a, b } = c;
  const lines = [`On the road between ${provinceName(a)} and ${provinceName(b)}.`];
  const bySeason = [0, 1, 2].map((s) => legPoints(Map_, a, b, s));
  const open = (connectionKm(Map_, a, b) / Pace.open) * PointsPerDay;
  const same = bySeason.every((x) => x === bySeason[0]);
  lines.push(
    same
      ? `The journey takes ${days(bySeason[0])} in every season, against ${days(open)} on open ground.`
      : `The journey takes ${bySeason.map((x, s) => `${days(x)} in ${SeasonNames[s]}`).join(", ")}, against ${days(open)} on open ground.`,
  );
  if (c.kind === "River") {
    const river = Rivers.find((r) => r.id === c.river);
    lines.push(
      `The ferry holds a company up ${days(TravelData.ferryDays * PointsPerDay)}` +
        (river !== undefined ? `, and ${days(TravelData.floodDays * PointsPerDay)} more in ${SeasonNames[river.flood]}, when the ${river.name} is in flood and its fords are closed.` : "."),
    );
  }
  if (snowbound(Map_, a, b, WinterSeason))
    lines.push(
      `Winter makes it dangerous: in Peret the pass is under snow, twice as slow, and a full army crossing it loses about ${config.winterArmyLoss} in a hundred of its men to cold, hunger and desertion, between half that and half again as much by the weather (half as many if it carries a season's food).`,
    );
  else lines.push("Winter brings no danger on it, though the roads are slower in Peret where the winter is cool or hard.");
  for (const end of [a, b])
    if (terrainOf(end) === "Desert")
      lines.push(`${provinceName(end)} is desert and feeds nobody: an army there lives on its baggage, its king's stores there if he holds it, and the caravans he sends.`);
  lines.push(
    c.kind === "Desert" || defence <= 0
      ? "It gives a defender no help."
      : `It helps a defender who stands: a unit holding its ground on either side is ${defence} stronger against an attack over it.`,
  );
  const kind = markKind(c);
  return { title: `${c.name.charAt(0).toUpperCase()}${c.name.slice(1)}, ${MarkNames[kind]}`, lines };
}

/** The mark's glyph, drawn about (0, 0) with its road running left to right. */
export function markGlyph(kind: MarkKind): string {
  switch (kind) {
    case "pass":
      return `<path class="xm-line" d="M-4,-7Q0,0 -4,7 M4,-7Q0,0 4,7"/>`;
    case "ford":
      return `<path class="xm-line ford" d="M-3,-7V7 M3,-7V7"/>`;
    case "strait":
      return `<path class="xm-line ford" d="M-7,-3Q-3.5,-6 0,-3T7,-3 M-7,3Q-3.5,0 0,3T7,3"/>`;
    case "desert":
      return `<path class="xm-line" d="M0,-8V8" stroke-dasharray="1.6 2.2"/><circle class="xm-dot" cx="-4" cy="-3" r="1.2"/><circle class="xm-dot" cx="-4" cy="3" r="1.2"/><circle class="xm-dot" cx="4" cy="0" r="1.2"/>`;
    case "rough":
      return `<path class="xm-line" d="M-8,5L-3.5,-3L1,5 M-1,5L3.5,-5L8,5"/>`;
  }
}
