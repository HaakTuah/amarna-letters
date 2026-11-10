/**
 * Item 17+++, "the season plays out": the season's moments as the viewer knows them, found in its scene, and the medallion
 * a great one shows as it plays. Only what the seat knows plays (hidden information): its scene holds only the marches it
 * saw, the captures as its map knows them and the travellers it knows of; an event plays only where the seat could see it
 * happen, and a disaster far away is news, told in the closing line, not a scene. God view sees everything move.
 */
import { WorldMap, parsePower, type GameEvent, type Power } from "@amarna/engine";
import { F, city, type Pt } from "./art.ts";
import { glyphId } from "./glyphs.ts";
import { peopleOf, type MapScene, type SceneMove } from "./scene.ts";
import { closingLine, Paces, paceSeason, type Moment, type Phase, type Timeline } from "../session/pacing.ts";
import { powerName, provinceName } from "../ui/format.ts";

const Map_ = WorldMap.default;
const esc = (s: string): string => s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;");

/** The figure a moment shows: a great one's medallion, the world's own hazards among them (part E), and a siege closing in. */
export type Figure = "gift" | "envoy" | "clash" | "sack" | "disaster" | "storm" | "avalanche" | "flood" | "drought" | "quake" | "siege";

/**
 * A moment on the map: where it plays (null: nowhere, news), its figure and the words on hovering it; for a battle, the side
 * that won it, where the seat could tell (part E: "battles flare as a clash with their outcome").
 */
export interface MapMoment extends Moment {
  at: Pt | null;
  figure: Figure;
  title: string;
  side?: Power;
}

/** The season shown, laid out in time for the viewer at a speed (its place in `Speeds`), with its closing line. */
export interface SeasonPlay {
  timeline: Timeline<MapMoment>;
  line: string;
}

export function seasonPlay(s: MapScene, speed: number): SeasonPlay {
  const moments = momentsOf(s);
  return { timeline: paceSeason(moments, Paces[Math.min(Math.max(0, speed), Paces.length - 1)]), line: closingLine(moments, s.viewer !== null) };
}

const ByName = new Map(Map_.provinces.map((p) => [p.name, p.id] as const));
/** The place an event names at its end, as the engine writes it ("... sacked Name.", "... near Name.", "... in Name ..."). */
const placeIn = (text: string): string | null => {
  const m = /\b(?:sacked|near|in|over) ([A-Z][^,.():]*?)(?:,| of | \(|:|\.)/u.exec(text) ?? /\b(?:sacked|near|in|over) ([A-Z][^,.():]*)\.?$/u.exec(text);
  return m === null ? null : (ByName.get(m[1].trim()) ?? null);
};

/** What a disaster or a raid on the road was, in the closing line's words: where it is seen, and as word of it. */
function disasterWords(e: GameEvent, place: string | null): { seen: string; heard: string; figure: Figure } | null {
  const near = place === null ? "" : ` near ${provinceName(place)}`;
  if (e.kind === "ship-lost") return { seen: `a ship lost to a storm${near}`, heard: "of a ship lost to a storm", figure: "storm" };
  // Winter's toll: a storm on the open sea, an avalanche in a pass (as the sounds hear it: audio/situation.ts).
  if (e.kind === "winter" && e.signal === "winter-loss")
    return { seen: `men lost to winter${near}`, heard: "of men lost to winter on the road", figure: place !== null && Map_.get(place).isSea ? "storm" : "avalanche" };
  if (e.kind === "caravan-robbed" || e.signal === "road-outlaws") return { seen: `a caravan robbed${near}`, heard: "of a caravan robbed on the road", figure: "disaster" };
  if (e.kind !== "catastrophe") return null;
  if (e.signal === "drought") return { seen: `drought over ${place === null ? "the land" : provinceName(place)}`, heard: "of the rains failing", figure: "drought" };
  if (e.signal === "flood") return { seen: `a flood in ${place === null ? "the river lands" : provinceName(place)}`, heard: "of a river in flood", figure: "flood" };
  const who = parsePower(/strikes (\S+):/u.exec(e.text)?.[1]);
  const where = place !== null ? provinceName(place) : who !== null ? powerName(who) : "a far land";
  return e.text.startsWith("Plague")
    ? { seen: `plague in ${where}`, heard: `of plague in ${where}`, figure: "disaster" }
    : { seen: `an earthquake in ${where}`, heard: `of an earthquake in ${where}`, figure: "quake" };
}

/**
 * The battles among the marches the viewer saw, one a province, each with the side that won it as the moves layer's clash
 * shows it: a march that took the place, else the troops that threw every march back (part E: "battles flare as a clash
 * with their outcome").
 */
export function battlesOf(moves: readonly SceneMove[]): Map<string, { text: string; side: Power }> {
  const out = new Map<string, { text: string; side: Power }>();
  for (const m of moves) {
    if (m.against === null || (m.style !== "Move" && m.style !== "Attack" && m.style !== "Bounce")) continue;
    const won = m.style !== "Bounce";
    const had = out.get(m.to);
    if (had === undefined || (won && had.side === m.against)) out.set(m.to, { text: m.text, side: won ? m.power : m.against });
  }
  return out;
}

/** The season's moments in the scene shown, as its viewer knows them, in the order the engine resolved them. */
export function momentsOf(s: MapScene): MapMoment[] {
  const prev = s.prev;
  if (prev === null) return [];
  const f = s.frame;
  const out: MapMoment[] = [];
  const add = (phase: Phase, kind: Moment["kind"], line: string, at: Pt | null, figure: Figure, title: string, side?: Power): void => {
    out.push({ phase, kind, line, at, figure, title, ...(side !== undefined ? { side } : {}) });
  };
  const viewer = s.viewer;
  // Envoys the viewer knows to stand at a court they did not stand at before: a foreign envoy received at its own court, or
  // its own envoy known to be there (god view: every one). Never from a journey's end alone, since an envoy caught on his
  // last road leaves it too; and never where the viewer only believes him there (a cover).
  const stood = new Set(peopleOf(prev, viewer)[1].filter((p) => p.kind === "Envoy" && !p.believed).map((p) => `${p.id}@${p.province}`));
  for (const p of s.people) {
    if (p.kind !== "Envoy" || p.believed || stood.has(`${p.id}@${p.province}`)) continue;
    const gold = prev.journeys.find((j) => j.kind === "EnvoyOutbound" && j.characterId === p.id)?.gold ?? 0;
    const who = p.owner === null ? "An envoy" : `${powerName(p.owner)}'s envoy`;
    add("arrival", "great", provinceName(p.province), city(p.province), gold > 0 ? "gift" : "envoy", `${who} arrived at ${provinceName(p.province)}${gold > 0 ? " with gifts" : ""}`);
  }
  // The marches the viewer saw, and the battles among them: a march that met troops, and a unit destroyed where it stood.
  for (const m of s.moves) if (m.style === "Move" || m.style === "Attack" || m.style === "Bounce") add("march", "routine", m.text, null, "envoy", m.text);
  const won = battlesOf(s.moves);
  for (const [province, b] of won) add("battle", "great", provinceName(province), city(province), "clash", b.text, b.side);
  const fought = new Set(won.keys());
  for (const u of s.destroyed) {
    if (fought.has(u.province)) continue;
    fought.add(u.province);
    add("battle", "great", provinceName(u.province), city(u.province), "clash", `${powerName(u.power)}'s ${u.kind === "Army" ? "army" : "fleet"} in ${provinceName(u.province)} was destroyed`);
  }
  // What the road and the weather did, and the sacks: a scene where the viewer saw it, else word of it.
  const sightBefore = viewer === null ? null : (prev.sight.get(viewer) ?? new Set<string>());
  const sacked = new Map<string, { seen: boolean; text: string }>();
  for (const e of f.events) {
    if (viewer !== null && !e.visibleTo.includes(viewer)) continue;
    const place = placeIn(e.text);
    const seen = place !== null && (sightBefore === null || sightBefore.has(place) || s.owner.get(place) === viewer);
    if (e.kind === "sack") {
      if (place !== null) sacked.set(place, { seen, text: e.text });
      continue;
    }
    const words = disasterWords(e, place);
    if (words === null) continue;
    add("disaster", seen ? "great" : "news", seen ? words.seen : words.heard, seen ? city(place) : null, words.figure, e.text);
  }
  // The sieges the viewer knows of, laid or pressed on.
  const before = viewer === null ? prev.sieges : (prev.knownSieges.get(viewer) ?? []);
  for (const x of s.sieges) {
    const was = before.some((b) => b.province === x.province && b.besieger === x.besieger);
    add("siege", "routine", was ? `the siege of ${provinceName(x.province)} pressed on` : `${powerName(x.besieger)} laid siege to ${provinceName(x.province)}`, city(x.province), "siege", "");
  }
  // The cities that changed hands, sacked or not: seen taken or passed, else heard of; then the sacks of cities that did not.
  for (const c of s.captures) {
    const place = provinceName(c.province);
    const to = c.to === null ? null : powerName(c.to);
    const sack = sacked.get(c.province);
    sacked.delete(c.province);
    if (c.how === "Unseen") {
      add("fall", "news", to === null ? `that ${place} is held by nobody now` : `that ${place} is now held by ${to}`, null, "sack", "");
      continue;
    }
    const line = to === null ? `${place} fell away from ${c.from === null ? "its holder" : powerName(c.from)}` : c.how === "Taken" ? `${place} fell to ${to}` : `${place} passed to ${to}`;
    add("fall", "great", sack !== undefined ? `${line}, sacked` : line, city(c.province), "sack", sack?.text ?? line);
    // A capital falling is among the biggest events: it takes a beat even at Fast.
    if (c.from !== null && Map_.capital(c.from).id === c.province) out[out.length - 1].big = true;
  }
  for (const [id, x] of sacked) add("fall", x.seen ? "great" : "news", x.seen ? `${provinceName(id)} was sacked` : `that ${provinceName(id)} was sacked`, x.seen ? city(id) : null, "sack", x.text);
  return out;
}

const fig = (id: string): string => `<use href="#fig-${id}" x="-7" y="-7.5" width="14" height="14"/>`;
const Figures: Readonly<Record<Figure, string>> = {
  gift: `<use href="#fig-envoy" x="-11" y="-7" width="13" height="13"/><use href="#g-ingot" x="1" y="-3" width="9" height="9"/>`,
  envoy: `<use href="#fig-envoy" x="-6.5" y="-7" width="13" height="13"/>`,
  clash: `<use href="#fig-clash" x="-6.5" y="-7" width="13" height="13"/>`,
  sack: `<use href="#fig-fire" x="-7" y="-8" width="14" height="14"/>`,
  disaster: `<use href="#fig-fire" x="-7" y="-8" width="14" height="14"/>`,
  storm: fig("storm"),
  avalanche: fig("avalanche"),
  flood: fig("flood"),
  drought: fig("drought"),
  quake: fig("quake"),
  siege: fig("tent"),
};

/**
 * What the world does where a hazard strikes, under its medallion (part E: "the world acts on them visibly"): rain driving
 * over a storm, snow and stone tumbling down a pass, the water swelling over a flood. Drawn still, fading in and out with
 * the medallion (an animated shape repaints every frame, which cost a slow phone a third more long frames).
 */
const Weather: Partial<Readonly<Record<Figure, string>>> = {
  storm: `<g class="weather rain">${[-16, -8, 0, 8, 16].map((x, i) => `<path d="M${x + 4},${-14 + (i % 2) * 5}l-5,12"/>`).join("")}</g>`,
  avalanche: `<g class="weather slide">${[0, 1, 2, 3].map((i) => `<circle cx="${-12 + i * 5}" cy="${-12 + i * 5}" r="${2.6 - i * 0.3}"/>`).join("")}</g>`,
  flood: `<g class="weather swell"><ellipse rx="12" ry="5"/><ellipse rx="18" ry="8"/></g>`,
};

/** A siege's tents round its city at a ring's radius (sym units). */
const tents = (r: number): string =>
  [0, 1, 2, 3, 4, 5]
    .map((k) => {
      const a = (k * Math.PI) / 3 + Math.PI / 6;
      return `<use href="#fig-tent" x="${F(r * Math.cos(a) - 5)}" y="${F(r * Math.sin(a) - 5)}" width="10" height="10"/>`;
    })
    .join("");
/** The tents closing in (part E: "sieges tighten"): a wide ring giving way to a tight one, by their opacity alone. */
const Closing = `<g class="ring wide">${tents(44)}</g><g class="ring tight">${tents(28)}</g>`;

/**
 * A moment as the stylesheet plays it once from `at` for `ms` (playback.css), which the renderer then takes away: a great
 * moment's medallion, a battle's flaring with the winner's seal, a hazard's weather; a siege's tents closing in.
 */
export function momentMarkup(m: MapMoment, at: number, ms: number): string {
  if (m.at === null) return "";
  const time = `animation-delay:${Math.round(at)}ms;animation-duration:${Math.round(ms)}ms;--d:${Math.round(at)}ms;--ms:${Math.round(ms)}ms`;
  const place = `transform="translate(${F(m.at.x)},${F(m.at.y)})" style="${time}"`;
  if (m.kind === "routine") return m.figure === "siege" ? `<g class="scene siege" ${place}><g class="sym">${Closing}</g></g>` : "";
  if (m.kind !== "great") return "";
  const side = m.side === undefined ? "" : `<g transform="translate(11,-11)"><circle class="tok-badge" r="5.6"/><use href="#em-${glyphId(m.side)}" class="tok-em e-${glyphId(m.side)}" x="-4.3" y="-4.3" width="8.6" height="8.6"/></g>`;
  const flare = m.figure === "clash" ? `<use href="#g-burst" class="flare" x="-25" y="-25" width="50" height="50"/>` : "";
  return (
    `<g class="scene ${m.phase === "disaster" ? "disaster " : ""}${m.figure}" ${place}><title>${esc(m.title)}</title>` +
    `<g class="sym">${Weather[m.figure] ?? ""}<g transform="translate(0,-34)">${flare}<circle class="scene-bg" r="15"/><g class="scene-figs">${Figures[m.figure]}</g>${side}</g></g></g>`
  );
}
