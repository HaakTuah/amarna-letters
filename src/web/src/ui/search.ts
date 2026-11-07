/**
 * One search over everything a seat knows ("History, search and names" under Interface, build order item 17+++b): every
 * province, realm, title and person it knows, by any of its names, period or modern, forgiving misspellings. What a seat
 * knows is its own: its people and those come to its notice, every place and realm on its map, the names it has heard
 * claimed; in god view, and for every seat once the record opens, everything. Counts are of what is known, never the truth.
 */
import {
  AllPowers, FamiliarPlaceNames, PeriodRealmNames, Views, WorldMap, alive, changes, claimableNames, describedAs, kingFor, kingOtherNames, modernOf,
  realmNames, type GameState, type HistoryKind, type Power,
} from "@amarna/engine";
import type { MapScene } from "../map/scene.ts";
import { placeName, realmName, shown } from "./names.ts";

/** One thing a seat knows, as the search and its filters read it. */
export interface Known {
  kind: HistoryKind;
  id: string;
  /** Its name as the player's settings show it. */
  name: string;
  /** Every name it goes by, for the search: period and modern, claimed and given. */
  names: string[];
  /** A line under the name: what it is. */
  what: string;
  /** The realms it belongs to as the seat knows it: a province's holder, a person's employer, a title's claimants. */
  realms: Power[];
  /** The province it stands in, where the seat knows one. */
  place: string | null;
  /** A person alive, a realm standing; null where it does not apply. */
  alive: boolean | null;
  /** A province or title the seat holds now, or once held and lost; null where it does not apply or in god view. */
  held: "held" | "lost" | null;
}

/** Everything the seat knows (`viewer` null: the whole record). */
export function knownTo(state: GameState, viewer: Power | null, scene: MapScene): Known[] {
  const out: Known[] = [];
  const lost = new Set(viewer === null ? [] : changes(state).filter((m) => m.from === viewer).map((m) => m.province));
  const view = viewer !== null ? Views.for(state, viewer) : null;
  const standing = alive(state);
  const fallen = (p: Power): boolean => (view !== null ? view.fallen.includes(p) : !standing.includes(p));
  for (const p of WorldMap.default.provinces) {
    const owner = scene.owner.get(p.id) ?? null;
    out.push({
      kind: "province",
      id: p.id,
      name: placeName(p.id),
      names: [p.name, FamiliarPlaceNames.get(p.id) ?? "", modernOf(p.id) ?? "", describedAs(p.id) ?? "", p.id].filter((n) => n !== ""),
      what: p.isSea ? "a sea zone" : owner !== null ? `a province of ${realmName(owner)}` : "a province held by no one",
      realms: owner !== null ? [owner] : [],
      place: p.id,
      alive: null,
      held: viewer === null || p.isSea ? null : owner === viewer ? "held" : lost.has(p.id) ? "lost" : null,
    });
  }
  for (const p of AllPowers) {
    const capital = WorldMap.default.provinces.find((x) => x.home === p && x.capital);
    out.push({
      kind: "realm",
      id: p,
      name: realmName(p),
      names: [...realmNames(p), PeriodRealmNames.get(p as never)?.name ?? "", kingFor(viewer, p), ...kingOtherNames(viewer, p)].filter((n) => n !== ""),
      what: `a realm, under ${kingFor(viewer, p)}${capital !== undefined ? `, from ${placeName(capital.id)}` : ""}`,
      realms: [p],
      place: capital?.id ?? null,
      alive: !fallen(p),
      held: null,
    });
  }
  const titles = new Set([...AllPowers.map((p) => realmNames(p)[0]), ...(view !== null ? view.nameClaims.map((c) => c.name) : claimableNames())]);
  for (const t of titles) {
    const claimants = AllPowers.filter((p) => realmNames(p)[0] === t || (view?.nameClaims.find((c) => c.name === t)?.claimants.includes(p) ?? false));
    out.push({
      kind: "title",
      id: t,
      name: `the throne of ${titleName(t)}`,
      names: [t, titleName(t)],
      what: claimants.length > 1 ? `a title claimed by ${claimants.map(realmName).join(", ")}` : "a title",
      realms: claimants,
      place: null,
      alive: null,
      held: viewer === null ? null : claimants.includes(viewer) ? "held" : null,
    });
  }
  if (view !== null)
    for (const c of [...view.court, ...view.known])
      out.push({
        kind: "person",
        id: c.id,
        name: c.name,
        names: [c.name],
        what: [c.ours ? "your servant" : c.employer !== null ? `serves ${realmName(c.employer)}` : "serves no one", shown(c.where)].filter((x) => x !== "").join(", "),
        realms: c.employer !== null ? [c.employer] : [],
        place: c.province,
        alive: c.status !== "Dead",
        held: null,
      });
  else
    for (const c of state.characters) {
      const capital = c.at !== null ? WorldMap.default.provinces.find((x) => x.home === c.at && x.capital) : undefined;
      out.push({
        kind: "person",
        id: c.id,
        name: c.name,
        names: [c.name, ...c.declared.map((d) => d.name)],
        what: [c.calling, c.employer !== null ? `serves ${realmName(c.employer)}` : "serves no one", c.status === "Dead" ? "dead" : ""].filter((x) => x !== "").join(", "),
        realms: c.employer !== null ? [c.employer] : [],
        place: capital?.id ?? null,
        alive: c.status !== "Dead",
        held: null,
      });
    }
  return out;
}

/** A title as the player reads it: by its own realm's name as shown (Babylonia's is Karduniash), else as the name is. */
export function titleName(t: string): string {
  const own = AllPowers.find((p) => realmNames(p)[0] === t);
  return own !== undefined ? realmName(own) : shown(t);
}

/** A name as the search compares it: no diacritics, no ʿ or ', any case. */
export const plain = (s: string): string =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[ʿʾ'’]/g, "")
    .toLowerCase();

/** The edits (insert, delete, change, swap two letters) between two words. */
function edits(a: string, b: string): number {
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array<number>(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  return d[a.length][b.length];
}

/**
 * How well a query finds a name, lower is better, null for not at all: the whole name or a word of it beginning with the
 * query first, then the query inside it, then a word of the name within a misspelling's reach of the query (one edit for
 * a short word, two for a long one), its beginning as far as the query goes.
 */
export function matchScore(query: string, name: string): number | null {
  const q = plain(query).trim();
  if (q === "") return 0;
  const n = plain(name);
  if (n === q) return 0;
  if (n.startsWith(q)) return 1;
  const words = n.split(/[\s,()-]+/).filter((w) => w !== "" && w !== "the" && w !== "of");
  if (words.some((w) => w.startsWith(q))) return 2;
  if (n.includes(q)) return 3;
  // Written together or apart: "Ribhadda" and "rib hadda" find Rib-Hadda.
  const joined = (x: string): string => x.replace(/[\s-]+/g, "");
  if (joined(n).startsWith(joined(q))) return 2;
  if (joined(n).includes(joined(q))) return 3;
  const reach = q.length <= 4 ? 1 : 2;
  if (q.length < 3) return null;
  let best: number | null = null;
  for (const w of words) {
    const e = Math.min(edits(q, w), w.length > q.length ? edits(q, w.slice(0, q.length)) : Infinity);
    if (e <= reach && (best === null || e < best)) best = e;
  }
  return best === null ? null : 3 + best;
}

/** The best score of any of a thing's names; null if none matches. */
export function scoreOf(query: string, k: Known): number | null {
  let best: number | null = null;
  for (const n of k.names) {
    const s = matchScore(query, n);
    if (s !== null && (best === null || s < best)) best = s;
  }
  return best;
}
