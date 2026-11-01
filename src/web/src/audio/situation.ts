/**
 * What the music and the sounds follow (item 19+++): the situation of the seat being played, read only from what that
 * seat knows (its sight, the news that reached it, the owners as it knows them), or of the whole map in god view. Pure,
 * so it is tested without a browser. Presentation only: nothing here touches the game.
 */
import { Crossings, Rivers, UnrestData, WorldMap, isGreatKing, type Power } from "@amarna/engine";
import type { FrameMove, SeasonFrame } from "../session/frames.ts";

/** The music's moods, as Empire Earth's dynamic music chose its pieces by them (docs/design/45-the-music-and-the-sounds.md). */
export type Mood = "menu" | "calm" | "tension" | "war" | "siege" | "battle" | "last";

/** A piece played once for a moment, after its sting where it has one, before the mood's music resumes. */
export type Moment = "triumph" | "fall" | "solemn" | "fallen" | "ended";

export type Sting = "capital" | "king" | "end";

export type SoundName =
  | "stylus" | "seal" | "envelope" | "gold" | "courier" | "war_horn" | "war_trumpet" | "sistrum" | "envoy" | "battle"
  | "siege" | "taken" | "lost" | "harvest" | "famine" | "revolt" | "caravan" | "death" | "report" | "season" | "tap"
  | "march" | "waves" | "gust" | "storm" | "avalanche";

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
  const sight = f.sight.get(viewer);
  // Its own siege, or one of a city it holds as far as it knows and can see (a city lost unheard of tells it nothing).
  return f.sieges.some((s) => s.besieger === viewer || (own.get(s.province) === viewer && (sight === undefined || sight.has(s.province))));
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
  const sight = f.sight.get(viewer);
  for (const [p, u] of f.unrest) if (u >= UnrestData.threshold * 0.6 && own.get(p) === viewer && (sight === undefined || sight.has(p))) return "tension";
  if (f.news.some((n) => n.court === viewer && n.kind === "Rumor" && n.turn >= f.turn - 2)) return "tension";
  return "calm";
}

/**
 * How the mood is heard within a piece (item 19+++): darker as the situation worsens, brighter as it improves, as the
 * viewer knows it. -2 in a battle or a siege, or a king or capital of its own fallen in the last three seasons (mourning);
 * -1 at war, on grave omens, or with hunger in its land; +1 at a feast, read as a season that brought it land, or a harvest
 * it saw with no hunger in it and no war; 0 otherwise.
 */
export function shadeAt(frames: readonly SeasonFrame[], index: number, viewer: Power | null): -2 | -1 | 0 | 1 {
  const mood = moodAt(frames, index, viewer);
  if (mood === "battle" || mood === "siege") return -2;
  for (let k = index; k > Math.max(0, index - 3); k--) {
    const c = cuesAt(frames, k, viewer);
    if (c.moment === "fall" || c.moment === "solemn") return -2;
  }
  const f = frames[index];
  if (f === undefined) return 0;
  const seenHere = (kind: string): boolean => f.events.some((e) => e.kind === kind && (viewer === null || e.visibleTo.includes(viewer)));
  if (mood === "war" || grave(f) || seenHere("hunger") || seenHere("famine")) return -1;
  const c = cuesAt(frames, index, viewer);
  if (c.moment === "triumph" || seenHere("harvest")) return 1;
  return 0;
}

/** What a season brings to the ear, in the order it is heard. */
export interface Cues {
  sting: Sting | null;
  moment: Moment | null;
  /** The court's own news and the season's most telling sound: at most three, the most telling first. */
  sounds: Cue[];
  /**
   * The map's own sounds, each placed where it happened (an army marching, a fleet in the waves, a battle elsewhere, the
   * weather, a winter crossing and its avalanche): as many as the season had, heard only zoomed in near them
   * (`hearing`), in the order of their moments.
   */
  map: Cue[];
}

/**
 * A short sound, where on the map it happened (a province), or null for a court's own sound, heard at any zoom, and its
 * moment in the season as it plays out, 0 (the arrivals that opened it) to 1 (its last events), in the order the season
 * resolved: arrivals, the march, the weather on the roads, the clash, the sieges, then what followed, by the stream's order.
 */
export interface Cue {
  name: SoundName;
  at: string | null;
  t: number;
}

/** The season's phases, as moments (0 to 1): where each kind of sound falls as the season plays out. */
export const Moments = { arrivals: 0, march: 0.12, weather: 0.22, winter: 0.32, clash: 0.45, siege: 0.58, after: 0.68, end: 0.95 } as const;

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
  const out: Cues = { sting: null, moment: null, sounds: [], map: [] };
  if (f === undefined || prev === undefined) return out;
  const add = (s: SoundName, at: string | null = null, t: number = Moments.after): void => {
    if (!out.sounds.some((c) => c.name === s)) out.sounds.push({ name: s, at, t });
  };
  const placed = (s: SoundName, at: string, t: number): void => {
    if (!out.map.some((c) => c.name === s && c.at === at)) out.map.push({ name: s, at, t });
  };
  // An event's moment among what followed the clash: in the order the stream gives the season's events, counting only those
  // the viewer was shown, so what it was not shown never shifts what it hears.
  const shown = f.events.filter((e) => viewer === null || e.visibleTo.includes(viewer));
  const after = (e: (typeof shown)[number]): number => Moments.after + ((Moments.end - Moments.after) * (shown.indexOf(e) + 1)) / (shown.length + 1);
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
  // The seat's own fall; in god view a great king's (a city-state's falls quietly, as its capital does).
  if (fallen.length > 0 && (viewer === null ? fallen.some((p) => isGreatKing(p)) : fallen.includes(viewer))) {
    out.sting ??= "king";
    if (out.moment === null || out.moment === "triumph") out.moment = "solemn";
  }
  // Land taken and lost (other than a capital, whose moment is above).
  if (viewer !== null) {
    let gained = 0;
    let lost = 0;
    for (const [p, b] of now) {
      const a = was.get(p) ?? null;
      if (a === b) continue;
      if (b === viewer) gained++;
      else if (a === viewer) lost++;
    }
    // The court's own news, heard at any zoom.
    if (gained > 0) add("taken", null, Moments.siege);
    if (lost > 0) add("lost", null, Moments.siege);
    if (out.moment === null && gained > 0 && gained >= lost) out.moment = "triumph";
    if (out.moment === null && lost > 0) out.moment = "fallen";
  }
  // The first blow of a war: fighting this season after a quiet one.
  const fought = index > 0 && fightingAt(f, viewer);
  if (fought && !fightingAt(prev, viewer)) add(viewer === "Egypt" ? "war_trumpet" : "war_horn", null, Moments.clash);
  if (fought) add("battle", seen(f, viewer).find((m) => (hostile(m) || m.destroyed) && involves(m, viewer))?.target ?? null, Moments.clash);
  mapSounds(f, prev, viewer, placed);
  // What else it saw: by the events of the season, as far as it was shown them.
  shown.forEach((e) => {
    const add = (s: SoundName, at: string | null = null): void => {
      if (!out.sounds.some((c) => c.name === s)) out.sounds.push({ name: s, at, t: after(e) });
    };
    switch (e.kind) {
      case "siege":
        if (e.signal === "siege-begun") {
          // Placed only at a new siege the viewer is party to or can see; else heard as the court's news, unplaced.
          const sight = viewer === null ? null : f.sight.get(viewer);
          const own = owners(f, viewer);
          const fresh = f.sieges.filter((x) => !prev.sieges.some((y) => y.province === x.province));
          const mine = fresh.find((x) => viewer === null || x.besieger === viewer || own.get(x.province) === viewer || sight?.has(x.province) === true);
          if (!out.sounds.some((c) => c.name === "siege")) out.sounds.push({ name: "siege", at: mine?.province ?? null, t: Moments.siege });
        }
        break;
      case "winter":
        winter(e.text, e.signal, placed);
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
  });
  if (f.omen !== prev.omen && f.omen !== null && f.omen !== "Quiet") add("sistrum", null, Moments.end);
  if (viewer !== null) {
    const before = prev.inboxCount.get(viewer) ?? 0;
    if ((f.inboxCount.get(viewer) ?? 0) > before) add("courier", null, Moments.arrivals);
    if (f.news.some((n) => n.court === viewer && n.kind === "SpyReport")) add("report", null, Moments.arrivals);
  }
  add("season", null, Moments.arrivals);
  out.sounds = [...out.sounds].sort((a, b) => loud.indexOf(a.name) - loud.indexOf(b.name)).slice(0, 3);
  // A battle the court's own sounds carry is not heard twice.
  const main = out.sounds.find((c) => c.name === "battle");
  out.map = out.map.filter((c) => !(main !== undefined && c.name === "battle" && c.at === main.at)).sort((a, b) => a.t - b.t);
  return out;
}

type Place = (s: SoundName, at: string, t: number) => void;

/**
 * The map's sounds of a season, from what the viewer saw of it: each army's march where it went, each fleet in the waves
 * where it sailed or lay at sea, every battle where it was fought, and new weather (a flood's rains, a drought's dry wind)
 * where it came, in sight.
 */
function mapSounds(f: SeasonFrame, prev: SeasonFrame, viewer: Power | null, placed: Place): void {
  const sight = viewer === null ? null : (f.sight.get(viewer) ?? new Set<string>());
  const visible = (p: string): boolean => sight === null || sight.has(p);
  const moves = seen(f, viewer);
  moves.forEach((m, i) => {
    const t = Moments.march + (0.08 * i) / Math.max(1, moves.length);
    if (m.order === "move" && m.target !== null) {
      // On the road it marches from where it set out; the sound sits at its goal, where the season sees it arrive or fail.
      placed(m.kind === "Fleet" ? "waves" : "march", m.target, t);
    } else if (m.kind === "Fleet" && map.exists(m.from) && map.get(m.from).isSea) placed("waves", m.from, t);
    // The clash where it was fought: at the goal of an attack, and where a unit that was driven out or destroyed stood.
    const clash = Moments.clash + (0.08 * i) / Math.max(1, moves.length);
    if (hostile(m) && m.target !== null) placed("battle", m.target, clash);
    if (m.destroyed) placed("battle", m.from, clash);
  });
  // A fleet lying at sea is still in the waves: heard when the view comes near it.
  for (const u of f.units) {
    if (u.kind !== "Fleet" || !map.exists(u.province) || !map.get(u.province).isSea) continue;
    if (u.power !== viewer && !visible(u.province)) continue;
    placed("waves", u.province, Moments.march);
  }
  const before = new Set(prev.climate.map((c) => `${c.kind}:${c.name}`));
  for (const c of f.climate) {
    if (before.has(`${c.kind}:${c.name}`)) continue;
    const at = c.provinces.find(visible);
    if (at !== undefined) placed(c.kind === "Flood" ? "storm" : "gust", at, Moments.weather);
  }
}

/**
 * A winter crossing the viewer was shown: the wind on a snowbound pass, an avalanche's thunder where it cost men there, the
 * storm on the open sea or on open beaches. An event carries no place of its own, so it is read from the goal its words
 * name ("into X in winter", "to X in winter", "fleets in X lost"), matched to a province by its whole name.
 */
function winter(text: string, signal: string | null, placed: Place): void {
  const sea = text.includes("the open sea") || signal === "harbour-short";
  const named = /\binto ([^,]+?) in winter/.exec(text)?.[1] ?? /\bto ([^,]+?) in winter/.exec(text)?.[1] ?? /fleets in (.+?) lost/.exec(text)?.[1] ?? null;
  const at = map.find(named);
  if (at === null) return;
  placed(sea ? "storm" : signal === "winter-loss" ? "avalanche" : "gust", at.id, Moments.winter);
}

const riverLands = new Set(Rivers.flatMap((r) => r.course));
const wildLands = new Set(Crossings.filter((c) => c.kind === "Desert" || c.kind === "Mountain").flatMap((c) => [c.a, c.b]));

/**
 * The world's bed under the music, from what the map shows at its centre: a siege camp where a siege is near, a city's
 * market close in on a town, the water of the great rivers and the coasts, the wind of the steppe, the desert and the
 * mountains; at every zoom, since zoomed out the world's bed and the great moments are what is heard (item 17+++).
 */
export function bedAt(f: SeasonFrame | undefined, centre: { x: number; y: number } | null, zoom: number, viewer: Power | null,
  place: (id: string) => { x: number; y: number }): Bed {
  if (f === undefined || centre === null) return null;
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
  if (p.isSea) return zoom >= 3 ? "nile" : "wind";
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
