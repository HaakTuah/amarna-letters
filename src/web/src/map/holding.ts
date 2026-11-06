/**
 * Who holds what, and the mood of the land (item 17++, part C; Interface, "Who holds what, and the mood of the land"): the
 * realms view's three steps of each power's colour (full where its king rules from his own seat, lighter where a governor
 * stands between, a faint wash of the overlord's over a vassal's land, the vassal keeping its own border), a thin inner
 * border round each governor's provinces, and the mood of the land as a view of its own, in four coarse steps fading as
 * the read ages. Presentation only.
 */
import { WorldMap, type Power, type Province } from "@amarna/engine";
import { F, Shapes, landClipOf } from "./art.ts";
import { glyphId } from "./glyphs.ts";
import type { MapScene } from "./scene.ts";

/** The map's view: who holds what (the default), or the mood of the land. */
export type MapMode = "realms" | "mood";

const Land: readonly Province[] = WorldMap.default.landProvinces.filter((p) => Shapes.has(p.id));

/** A province's tint: its holder's colour in full, lighter where governed, or its overlord's faint wash over a vassal. */
export function tintClass(s: MapScene, id: string, owner: Power | null): string {
  if (owner === null) return "tint free";
  const h = s.holding.get(id);
  if (h?.kind === "vassal") return `tint t-${glyphId(h.overlord)} h-vassal`;
  return `tint t-${glyphId(owner)}${h?.kind === "governed" ? " h-gov" : ""}`;
}

/** How strongly a read of this age shows, from whole when fresh to faint when old. */
const fade = (age: number): number => Math.max(0.3, 1 - age * 0.12);

/** Above the tints: each governor's bloc bounded, and in the mood view the mood of each province as the viewer reads it. */
export function holdingLayer(s: MapScene, mode: MapMode): string {
  let sb = "";
  // A thin inner border round each governor's provinces: the bloc's shapes eroded and cut out of themselves, so the line
  // runs only round the bloc's outside, never between his own provinces.
  const blocs = new Map<string, { power: Power; ids: string[] }>();
  for (const [id, g] of s.governors) {
    const b = blocs.get(g.character) ?? { power: g.power, ids: [] };
    b.ids.push(id);
    blocs.set(g.character, b);
  }
  if (blocs.size > 0) {
    sb += `<defs><filter id="govbloc" x="-5%" y="-5%" width="110%" height="110%"><feMorphology in="SourceAlpha" operator="erode" radius="1.6" result="in"/><feComposite in="SourceGraphic" in2="in" operator="out"/></filter></defs>`;
    for (const [c, b] of [...blocs].sort(([x], [y]) => (x < y ? -1 : 1))) {
      sb += `<g class="gov-bloc t-${glyphId(b.power)}" filter="url(#govbloc)" data-governor="${c}">`;
      for (const id of b.ids) sb += `<path d="${Shapes.get(id)}" clip-path="${landClipOf(id)}"/>`;
      sb += "</g>";
    }
  }
  if (mode === "mood") {
    sb += `<g class="moods">`;
    for (const p of Land) {
      const owner = s.owner.get(p.id) ?? null;
      if (owner === null) continue;
      const m = s.mood.get(p.id);
      sb += `<path class="mood ${m === undefined ? "mood-none" : `mood-${m.mood}`}" d="${Shapes.get(p.id)}" clip-path="${landClipOf(p.id)}"${m !== undefined && m.age > 0 ? ` style="opacity:${F(fade(m.age))}"` : ""}/>`;
    }
    sb += "</g>";
  }
  return sb;
}

/** The legend's line for the mood view. */
/** The mood view's legend: its four steps, each with its colour's class in map.css (`.mood-legend .sw`). */
export const MoodLegend = { title: "Mood of the land, as you last heard it; older reads fade:", steps: [["loyal", "loyal"], ["uneasy", "uneasy"], ["restless", "restless"], ["none", "no word"]] } as const;

/** Where a province's governor sits, for the card: his name and seat. */
export function governorLine(s: MapScene, id: string): string | null {
  const g = s.governors.get(id);
  if (g === undefined) return null;
  const seat = WorldMap.default.get(g.seat).name;
  return g.seat === id ? `Governed by ${g.name}, who sits here.` : `Governed by ${g.name}, from his seat at ${seat}.`;
}

