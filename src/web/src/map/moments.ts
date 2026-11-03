/**
 * Item 17+++, "the season plays out": the season's moments as the viewer knows them, found in its scene, and the medallion
 * a great one shows as it plays. Only what the seat knows plays (hidden information): its scene holds only the marches it
 * saw, the captures as its map knows them and the travellers it knows of; an event plays only where the seat could see it
 * happen, and a disaster far away is news, told in the closing line, not a scene. God view sees everything move.
 */
import { WorldMap, parsePower, type GameEvent } from "@amarna/engine";
import { F, city, type Pt } from "./art.ts";
import { peopleOf, type MapScene } from "./scene.ts";
import { closingLine, Paces, paceSeason, type Moment, type Phase, type Timeline } from "../session/pacing.ts";
import { powerName, provinceName } from "../ui/format.ts";

const Map_ = WorldMap.default;
const esc = (s: string): string => s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;");

/** The figure a great moment's medallion shows. */
export type Figure = "gift" | "envoy" | "clash" | "sack" | "disaster";

/** A moment on the map: where it plays (null: nowhere, news), its figure and the words on hovering it. */
export interface MapMoment extends Moment {
  at: Pt | null;
  figure: Figure;
  title: string;
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
function disasterWords(e: GameEvent, place: string | null): { seen: string; heard: string } | null {
  const near = place === null ? "" : ` near ${provinceName(place)}`;
  if (e.kind === "ship-lost") return { seen: `a ship lost to a storm${near}`, heard: "of a ship lost to a storm" };
  if (e.kind === "winter" && e.signal === "winter-loss") return { seen: `men lost to winter${near}`, heard: "of men lost to winter on the road" };
  if (e.kind === "caravan-robbed" || e.signal === "road-outlaws") return { seen: `a caravan robbed${near}`, heard: "of a caravan robbed on the road" };
  if (e.kind !== "catastrophe") return null;
  if (e.signal === "drought") return { seen: `drought over ${place === null ? "the land" : provinceName(place)}`, heard: "of the rains failing" };
  if (e.signal === "flood") return { seen: `a flood in ${place === null ? "the river lands" : provinceName(place)}`, heard: "of a river in flood" };
  const who = parsePower(/strikes (\S+):/u.exec(e.text)?.[1]);
  const where = place !== null ? provinceName(place) : who !== null ? powerName(who) : "a far land";
  return e.text.startsWith("Plague") ? { seen: `plague in ${where}`, heard: `of plague in ${where}` } : { seen: `an earthquake in ${where}`, heard: `of an earthquake in ${where}` };
}

/** The season's moments in the scene shown, as its viewer knows them, in the order the engine resolved them. */
export function momentsOf(s: MapScene): MapMoment[] {
  const prev = s.prev;
  if (prev === null) return [];
  const f = s.frame;
  const out: MapMoment[] = [];
  const add = (phase: Phase, kind: Moment["kind"], line: string, at: Pt | null, figure: Figure, title: string): void => {
    out.push({ phase, kind, line, at, figure, title });
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
  const fought = new Set<string>();
  for (const m of s.moves) {
    if (m.style !== "Move" && m.style !== "Attack" && m.style !== "Bounce") continue;
    add("march", "routine", m.text, null, "envoy", m.text);
    if (m.against === null || fought.has(m.to)) continue;
    fought.add(m.to);
    add("battle", "great", provinceName(m.to), city(m.to), "clash", m.text);
  }
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
    add("disaster", seen ? "great" : "news", seen ? words.seen : words.heard, seen ? city(place) : null, "disaster", e.text);
  }
  // The sieges the viewer knows of, laid or pressed on.
  const before = viewer === null ? prev.sieges : (prev.knownSieges.get(viewer) ?? []);
  for (const x of s.sieges) {
    const was = before.some((b) => b.province === x.province && b.besieger === x.besieger);
    add("siege", "routine", was ? `the siege of ${provinceName(x.province)} pressed on` : `${powerName(x.besieger)} laid siege to ${provinceName(x.province)}`, null, "clash", "");
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

const Figures: Readonly<Record<Figure, string>> = {
  gift: `<use href="#fig-envoy" x="-11" y="-7" width="13" height="13"/><use href="#g-ingot" x="1" y="-3" width="9" height="9"/>`,
  envoy: `<use href="#fig-envoy" x="-6.5" y="-7" width="13" height="13"/>`,
  clash: `<use href="#fig-clash" x="-6.5" y="-7" width="13" height="13"/>`,
  sack: `<use href="#fig-fire" x="-7" y="-8" width="14" height="14"/>`,
  disaster: `<use href="#fig-fire" x="-7" y="-8" width="14" height="14"/>`,
};

/** A great moment's medallion, which the stylesheet plays once from `at` for `ms` (playback.css) and the renderer then takes away. */
export function momentMarkup(m: MapMoment, at: number, ms: number): string {
  if (m.at === null) return "";
  return (
    `<g class="scene ${m.figure}" transform="translate(${F(m.at.x)},${F(m.at.y)})" style="animation-delay:${Math.round(at)}ms;animation-duration:${Math.round(ms)}ms"><title>${esc(m.title)}</title>` +
    `<g class="sym"><g transform="translate(0,-34)"><circle class="scene-bg" r="15"/><g class="scene-figs">${Figures[m.figure]}</g></g></g></g>`
  );
}
