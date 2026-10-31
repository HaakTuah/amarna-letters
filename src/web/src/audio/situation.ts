/**
 * What the music and the sounds follow (item 19+++): the situation of the seat being played, read only from what that
 * seat knows (its sight, the news that reached it, the owners as it knows them), or of the whole map in god view. Pure,
 * so it is tested without a browser. Presentation only: nothing here touches the game.
 */
import { Crossings, Rivers, UnrestData, WorldMap, isGreatKing, type Power } from "@amarna/engine";
import type { FrameMove, SeasonFrame } from "../session/frames.ts";

/** The music's moods, as Empire Earth's dynamic music chose its pieces by them (docs/audio/MUSIC.md). */
export type Mood = "menu" | "calm" | "tension" | "war" | "siege" | "battle" | "last";

/** A piece played once for a moment, after its sting where it has one, before the mood's music resumes. */
export type Moment = "triumph" | "fall" | "solemn" | "fallen" | "ended";

export type Sting = "capital" | "king" | "end";

export type SoundName =
  | "stylus" | "seal" | "envelope" | "gold" | "courier" | "war_horn" | "war_trumpet" | "sistrum" | "envoy" | "battle"
  | "siege" | "taken" | "lost" | "harvest" | "famine" | "revolt" | "caravan" | "death" | "report" | "season" | "tap";

export type Bed = "nile" | "wind" | "market" | "siege" | null;

/** The pieces each mood and moment plays, by their ids in the manifest. */
export const MoodPieces: Record<Mood, readonly string[]> = {
  menu: ["hymn"],
  calm: ["kings", "river"],
  tension: ["envoys", "shadows", "enmity"],
  war: ["chariots"],
  siege: ["siege"],
  battle: ["battle"],
  last: ["last"],
};

export const MomentPieces: Record<Moment, string> = {
  triumph: "triumph",
  fall: "fall",
  solemn: "solemn",
  fallen: "fallen",
  ended: "last",
};

const map = WorldMap.default;
const capitals = map.provinces.filter((p) => p.capital && p.home !== null);

/** The moves of a season the viewer saw resolve (all of them in god view). */
function seen(f: SeasonFrame, viewer: Power | null): FrameMove[] {
  if (viewer === null) return f.moves;
  const idx = f.seenBy.get(viewer) ?? [];
  return idx.map((i) => f.moves[i]).filter((m): m is FrameMove => m !== undefined);
}

/** A move against someone else's land or troops: an attack, whoever it was. */
const hostile = (m: FrameMove): boolean => m.target !== null && m.targetOwner !== null && m.targetOwner !== m.power;

const involves = (m: FrameMove, viewer: Power | null): boolean => viewer === null || m.power === viewer || m.targetOwner === viewer;

/** Who holds each province, as the viewer knows it (the truth in god view). */
function owners(f: SeasonFrame, viewer: Power | null): Map<string, Power | null> {
  if (viewer === null) return f.owner;
  const known = f.knownOwner.get(viewer);
  if (known === undefined) return f.owner;
  return new Map([...known].map(([k, v]) => [k, v.owner]));
}

function fightingAt(f: SeasonFrame, viewer: Power | null): boolean {
  return seen(f, viewer).some((m) => (hostile(m) || m.destroyed) && involves(m, viewer));
}

function besieged(f: SeasonFrame, viewer: Power | null): boolean {
  if (viewer === null) return f.sieges.length > 0;
  const own = owners(f, viewer);
  return f.sieges.some((s) => s.besieger === viewer || own.get(s.province) === viewer);
}

/** Foreign troops standing in the viewer's own land, as far as it can see. */
function threatened(f: SeasonFrame, viewer: Power): boolean {
  const own = owners(f, viewer);
  const sight = f.sight.get(viewer);
  return f.units.some((u) => u.power !== viewer && own.get(u.province) === viewer && (sight === undefined || sight.has(u.province)));
}

const grave = (f: SeasonFrame): boolean => f.omen === "Grave" || f.omen === "Borrowed" || f.omen === "Darkest";

/**
 * The mood at a season: battle where the viewer's men fought this season, siege where it besieges or is besieged, war
 * where it fought in the last three seasons, the last seasons when the diviners read the omens of the end as grave,
 * tension where foreign troops stand in its land, the omens are troubled, unrest runs high or rumours came, calm
 * otherwise. In god view the whole map: any battle or siege anywhere, war when fighting was seen in the last two.
 */
export function moodAt(frames: readonly SeasonFrame[], index: number, viewer: Power | null): Mood {
  const f = frames[index];
  if (f === undefined) return "calm";
  if (f.ended) return "last";
  if (index > 0 && fightingAt(f, viewer)) return "battle";
  if (besieged(f, viewer)) return "siege";
  const span = viewer === null ? 2 : 3;
  for (let k = index; k > Math.max(0, index - span); k--) if (fightingAt(frames[k], viewer)) return "war";
  if (grave(f)) return "last";
  if (f.omen === "Troubled") return "tension";
  if (viewer === null) {
    for (let k = index; k > Math.max(0, index - 6); k--) if (frames[k].sieges.length > 0 || fightingAt(frames[k], null)) return "tension";
    return "calm";
  }
  if (threatened(f, viewer)) return "tension";
  const own = owners(f, viewer);
  // Its own people's mood it knows (in words); restless well short of rising is tension enough.
  for (const [p, u] of f.unrest) if (u >= UnrestData.threshold * 0.6 && own.get(p) === viewer) return "tension";
  if (f.news.some((n) => n.court === viewer && n.kind === "Rumor" && n.turn >= f.turn - 2)) return "tension";
  return "calm";
}

/** What a season brings to the ear, in the order it is heard. */
export interface Cues {
  sting: Sting | null;
  moment: Moment | null;
  sounds: Cue[];
}

/** A short sound, and where on the map it happened (a province), or null for a court's own sound, heard at any zoom. */
export interface Cue {
  name: SoundName;
  at: string | null;
}

const loud: readonly SoundName[] = ["war_horn", "war_trumpet", "battle", "siege", "taken", "lost", "revolt", "death", "famine", "sistrum", "harvest", "caravan", "gold", "courier", "report", "season"];

/**
 * What the viewer hears as a season arrives, from the frame before: a sting and a piece for the great moments it learns
 * of (a capital fallen, its own fall, the age's end), a land taken or lost, and the short sounds of what it saw happen,
 * at most three, the most telling first. Egypt's seat hears Egypt's trumpets where the others hear a war horn (voice may
 * differ by power: "Different data, same rules").
 */
export function cuesAt(frames: readonly SeasonFrame[], index: number, viewer: Power | null): Cues {
  const f = frames[index];
  const prev = frames[index - 1];
  const out: Cues = { sting: null, moment: null, sounds: [] };
  if (f === undefined || prev === undefined) return out;
  const add = (s: SoundName, at: string | null = null): void => {
    if (!out.sounds.some((c) => c.name === s)) out.sounds.push({ name: s, at });
  };
  const was = owners(prev, viewer);
  const now = owners(f, viewer);

  if (f.ended && !prev.ended) {
    out.sting = "end";
    out.moment = "ended";
  }
  // Capitals that changed hands, as the viewer knows it.
  for (const c of capitals) {
    const a = was.get(c.id) ?? null;
    const b = now.get(c.id) ?? null;
    if (a === b) continue;
    // The great moment is a great king's capital, or one the seat itself lost or took; a city-state's falls quietly.
    const great = isGreatKing(c.home!) || (viewer !== null && (a === viewer || b === viewer));
    if (!great) continue;
    if (out.sting === null) out.sting = "capital";
    if (viewer !== null && a === viewer) out.moment = "fall";
    else if (viewer !== null && b === viewer && out.moment === null) out.moment = "triumph";
  }
  // A king gone: the viewer's own fall, or any in god view.
  const fallen = [...f.eliminated].filter((p) => !prev.eliminated.has(p));
  if (fallen.length > 0 && (viewer === null || fallen.includes(viewer))) {
    out.sting ??= "king";
    if (out.moment === null || out.moment === "triumph") out.moment = "solemn";
  }
  // Land taken and lost (other than a capital, whose moment is above).
  if (viewer !== null) {
    let gained = 0;
    let lost = 0;
    let where: [string | null, string | null] = [null, null];
    for (const [p, b] of now) {
      const a = was.get(p) ?? null;
      if (a === b) continue;
      if (b === viewer) {
        gained++;
        where[0] ??= p;
      } else if (a === viewer) {
        lost++;
        where[1] ??= p;
      }
    }
    if (gained > 0) add("taken", where[0]);
    if (lost > 0) add("lost", where[1]);
    if (out.moment === null && gained > 0 && gained >= lost) out.moment = "triumph";
    if (out.moment === null && lost > 0) out.moment = "fallen";
  }
  // The first blow of a war: fighting this season after a quiet one.
  const fought = index > 0 && fightingAt(f, viewer);
  if (fought && !fightingAt(prev, viewer)) add(viewer === "Egypt" ? "war_trumpet" : "war_horn");
  if (fought) add("battle", seen(f, viewer).find((m) => (hostile(m) || m.destroyed) && involves(m, viewer))?.target ?? null);
  // What else it saw: by the events of the season, as far as it was shown them.
  for (const e of f.events) {
    if (viewer !== null && !e.visibleTo.includes(viewer)) continue;
    switch (e.kind) {
      case "siege":
        if (e.signal === "siege-begun") add("siege", f.sieges.find((x) => !prev.sieges.some((y) => y.province === x.province))?.province ?? null);
        break;
      case "revolt":
      case "mutiny":
        add("revolt");
        break;
      case "death":
      case "execution":
        add("death");
        break;
      case "hunger":
      case "famine":
        add("famine");
        break;
      case "catastrophe":
        add("sistrum");
        break;
      case "harvest":
        add("harvest");
        break;
      case "caravan":
      case "sale":
        add("caravan");
        break;
      case "gift":
      case "loan":
      case "repaid":
      case "collected":
      case "hire":
        add("gold");
        break;
    }
  }
  if (f.omen !== prev.omen && f.omen !== null && f.omen !== "Quiet") add("sistrum");
  if (viewer !== null) {
    const before = prev.inboxCount.get(viewer) ?? 0;
    if ((f.inboxCount.get(viewer) ?? 0) > before) add("courier");
    if (f.news.some((n) => n.court === viewer && n.kind === "SpyReport")) add("report");
  }
  add("season");
  out.sounds = [...out.sounds].sort((a, b) => loud.indexOf(a.name) - loud.indexOf(b.name)).slice(0, 3);
  return out;
}

const riverLands = new Set(Rivers.flatMap((r) => r.course));
const wildLands = new Set(Crossings.filter((c) => c.kind === "Desert" || c.kind === "Mountain").flatMap((c) => [c.a, c.b]));

/**
 * The world's bed under the music, from what the map shows at its centre: a siege camp where a siege is near, a city's
 * market close in on a town, the water of the great rivers and the coasts, the wind of the steppe, the desert and the
 * mountains; nothing over the open sea far out or in the wide view of the whole board.
 */
export function bedAt(f: SeasonFrame | undefined, centre: { x: number; y: number } | null, zoom: number, viewer: Power | null,
  place: (id: string) => { x: number; y: number }): Bed {
  if (f === undefined || centre === null || zoom < 1.6) return null;
  let best: string | null = null;
  let bestD = Infinity;
  for (const p of map.provinces) {
    const at = place(p.id);
    const d = (at.x - centre.x) ** 2 + (at.y - centre.y) ** 2;
    if (d < bestD) {
      bestD = d;
      best = p.id;
    }
  }
  if (best === null) return null;
  const near = (id: string): boolean => {
    const a = place(id);
    const b = place(best!);
    return Math.hypot(a.x - b.x, a.y - b.y) < 40 / zoom + 6;
  };
  const sight = viewer === null ? null : f.sight.get(viewer);
  if (f.sieges.some((s) => near(s.province) && (sight === null || sight === undefined || sight.has(s.province)))) return "siege";
  const p = map.get(best);
  if (p.isSea) return zoom >= 3 ? "nile" : null;
  if (zoom >= 4 && !p.kingless) return "market";
  if (riverLands.has(p.id) || p.isCoastal) return "nile";
  if (p.kingless || wildLands.has(p.id)) return "wind";
  return "wind";
}

/** How a sound placed on the map is heard from the view (item 19+++, "zoom shapes what you see and hear"). */
export interface Hearing {
  /** 0 (silent) to 1. */
  gain: number;
  /** -1 (left) to 1 (right). */
  pan: number;
}

/**
 * A placed sound heard from where the map looks: zoomed out it is silent, the world's bed and the great moments speaking
 * for the whole board; zoomed in it comes up, louder the nearer the view's centre, panned to its side of the screen. A
 * court's own sound (no place) is always heard whole. `width` is the board's width, `aspect` the view's width over height.
 */
export function hearing(at: { x: number; y: number } | null, view: { at: { x: number; y: number }; zoom: number } | null, width: number): Hearing {
  if (at === null) return { gain: 1, pan: 0 };
  if (view === null) return { gain: 0, pan: 0 };
  // From a zoom of 1.5 the near sounds rise in, whole by 3.
  const z = Math.min(1, Math.max(0, (view.zoom - 1.5) / 1.5));
  const half = width / 2 / view.zoom;
  const dx = at.x - view.at.x;
  const dy = at.y - view.at.y;
  const d = Math.hypot(dx, dy) / half;
  // Whole within half the screen, fading out to nothing at one and a half screens away.
  const near = d <= 0.5 ? 1 : Math.max(0, 1 - (d - 0.5));
  return { gain: z * near * near, pan: Math.max(-1, Math.min(1, dx / half)) * 0.8 };
}
