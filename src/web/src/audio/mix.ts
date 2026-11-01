/**
 * The soundscape's mix (Haakon, 1 November 2026: "your ears are being assaulted now. It plays dozens of sound effects at
 * any one time"): three layers, the music leading, in the manner of Crusader Kings II. The event sounds (one seat's own
 * clicks and what happens to its realm) and the world's sounds (what happens on the map near the view) both sit under the
 * music, each capped: at most three sounding at once and the same sound not again within a few seconds, so a busy season
 * is heard as a few clear sounds, never a din. Pure, so it is tested without a browser.
 */

/** The two sound layers under the music. */
export type Layer = "event" | "world";

/** The most sounds of a layer heard at once. */
export const AtOnce: Record<Layer, number> = { event: 3, world: 3 };

/** Milliseconds before the same sound may be heard again in its layer. */
export const Repeat: Record<Layer, number> = { event: 4000, world: 3000 };

/** Seconds a sound takes to rise to its level, so none starts sudden. */
export const Attack = 0.06;

/** The loudness of each bus at full volume: the music above everything, the event sounds under it, the world's below them. */
export const Level = { music: 0.9, event: 0.6, world: 0.5, bed: 0.45 } as const;

/**
 * Admits or drops each sound as it would start, by the layer's caps. Times are milliseconds on one clock (the page's),
 * the moment the sound is to be heard, not when it was asked for.
 */
export class Mixer {
  private sounding: Record<Layer, { name: string; from: number; to: number }[]> = { event: [], world: [] };

  /**
   * Whether a sound of `seconds` starting at `at` is heard; if so, it is counted from then on. `now` is the present on the
   * same clock: sounds are booked ahead (a season's are spread over a few seconds), so the past is forgotten by it, and a
   * sound booked later but starting sooner still counts every sound its span would overlap.
   */
  admit(name: string, layer: Layer, at: number, seconds: number, now: number = at): boolean {
    const list = this.sounding[layer].filter((s) => s.to > Math.min(now, at) - Repeat[layer]);
    this.sounding[layer] = list;
    if (list.some((s) => s.name === name && Math.abs(s.from - at) < Repeat[layer])) return false;
    const to = at + Math.max(0.2, seconds) * 1000;
    // The most heard together anywhere in its span: each overlapping sound's start, and its own.
    const over = list.filter((s) => s.from < to && s.to > at);
    const peak = Math.max(0, ...[at, ...over.map((s) => s.from)].filter((t) => t >= at).map((t) => over.filter((s) => s.from <= t && s.to > t).length));
    if (peak >= AtOnce[layer]) return false;
    list.push({ name, from: at, to });
    return true;
  }
}

/** How loud the world's bed is at a zoom: silent zoomed out, rising in from 1.5 to whole at 3, as the placed sounds do. */
export function bedLevel(zoom: number): number {
  return Math.min(1, Math.max(0, (zoom - 1.5) / 1.5));
}
