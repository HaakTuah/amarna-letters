/**
 * What the music listens to (item 19+++c). A player's music is his seat's, with 19+++b's clearer triggers. A spectator
 * hears what he chose to watch, as in the spectator modes of Civilization VI and Paradox's games: a realm he watches,
 * that realm's heat in its music; a character he follows, that character's own (his battles, his danger, his captivity)
 * in his realm's music; and drifting over the whole world, the world's own heat, in the music of whichever realm is doing
 * the most at that moment, kept until another clearly does more. Never the middle of the view, which pans fast and,
 * zoomed out, shows no more than the rest. Everything here reads only what the viewer's eyes know (the frames' seen moves,
 * sight and known owners; the truth in god view). Pure. Presentation only.
 */
import { isGreatKing, type Power } from "@amarna/engine";
import { peopleOf, stepAt } from "../map/scene.ts";
import type { SeasonFrame } from "../session/frames.ts";
import type { Ears } from "./crossing.ts";
import { Drag, Heat, Skirmish, quietSignal, raiseSignal, signalAt, siegeHeat, sizeable, type Signal } from "./mood.ts";
import { capitals, hostile, owners, seen, sightOf } from "./situation.ts";

/** Whose ears: a player's own seat; else the character he follows, the realm he watches, or the world he drifts over. */
export function earsOf(viewer: Power | null, playing: boolean, following: boolean): Ears {
  if (viewer !== null && playing) return "own";
  if (following) return "character";
  return viewer === null ? "world" : "realm";
}

/** The realm a followed character serves, as the viewer knows it (null: not known). */
export function realmOfCharacter(f: SeasonFrame, viewer: Power | null, id: string): Power | null {
  if (viewer === null) return f.people.get(id)?.employer ?? null;
  const marker = peopleOf(f, viewer)[1].find((p) => p.id === id);
  if (marker !== undefined) return marker.owner;
  return f.people.get(id)?.employer === viewer ? viewer : null;
}

/**
 * What a season tells the music of a followed character, from what the viewer knows of him: his battles (a fight where
 * he stands), his danger (the place besieged, foreign troops in it) and his captivity. A real battle is one with a Great
 * King on both sides, a sizeable one, or in his own realm's land; the rest are skirmishes. Nothing where the viewer knows
 * no place for him (on the road, or unknown).
 */
export function characterSignal(frames: readonly SeasonFrame[], index: number, viewer: Power | null, id: string): Signal {
  const f = frames[index];
  const out = quietSignal(f);
  if (f === undefined) return out;
  const marker = peopleOf(f, viewer)[1].find((p) => p.id === id);
  // Held captive, as the viewer knows it: unease, the tension's music.
  if (marker?.kind === "Captive") raiseSignal(out, Heat.unease);
  const step = stepAt(f, index, viewer, id);
  const place = step !== null && "province" in step.on ? step.on.province : null;
  if (place === null) return out;
  const realm = realmOfCharacter(f, viewer, id);
  const sight = viewer === null ? null : sightOf(f, viewer);
  const held = owners(f, viewer).get(place) ?? null;
  const moves = index > 0 ? seen(f, viewer) : [];
  for (const m of moves) {
    if ((m.target !== place && m.from !== place) || !(hostile(m) || m.destroyed)) continue;
    const kings = m.targetOwner !== null && isGreatKing(m.power) && isGreatKing(m.targetOwner);
    if (kings || sizeable(moves, place, m.targetOwner) || (realm !== null && held === realm)) {
      raiseSignal(out, Heat.battle, "battle");
      out.clear = true;
    } else out.add = Skirmish.add;
  }
  for (const s of f.sieges) {
    if (s.province !== place || (sight !== null && !sight.has(place))) continue;
    raiseSignal(out, siegeHeat(Heat.battle, f, s), "siege");
    if (f.turn - s.since < Drag) out.clear = true;
  }
  if (f.units.some((u) => u.province === place && u.power !== realm && (sight === null || sight.has(place)))) raiseSignal(out, Heat.unease);
  return out;
}

/** What the world's own heat reads, for a spectator drifting over it (god view): the true map's, as the music has it for god view. */
export const worldSignal = (frames: readonly SeasonFrame[], index: number): Signal => signalAt(frames, index, null);

/** How many seasons of a realm's doings the world's music counts, and how fast they fade. */
const Doing = { seasons: 6, fade: 0.6 } as const;

/** What a Great King did in a season, in god view: the blows it struck and took, the sieges it laid and bore. */
function doing(f: SeasonFrame, p: Power): number {
  let n = 0;
  for (const m of f.moves) {
    if (!hostile(m)) continue;
    if (m.power === p) n += isGreatKing(m.targetOwner!) ? 3 : 1;
    else if (m.targetOwner === p) n += isGreatKing(m.power) ? 2 : 1;
  }
  for (const s of f.sieges) {
    if (s.besieger === p) n += 2;
    else if (f.owner.get(s.province) === p) n += capitals.some((c) => c.id === s.province && c.home === p) ? 4 : 2;
  }
  return n;
}

/** A realm must do this much more than the one whose music it is, and by this much, to take the music: clearly more. */
const Clearly = { times: 1.5, plus: 2 } as const;

/**
 * The Great King whose music the drifting world has: the one doing the most over the last few seasons, kept until another
 * clearly does more. `kept` is whose music it was; null where none has done anything yet.
 */
export function busiest(frames: readonly SeasonFrame[], index: number, kept: Power | null): Power | null {
  const score = new Map<Power, number>();
  for (let k = Math.max(0, index - Doing.seasons + 1); k <= index; k++) {
    for (const [p, v] of score) score.set(p, v * Doing.fade);
    const f = frames[k];
    for (const p of f.owner.values()) if (p !== null && isGreatKing(p) && !score.has(p)) score.set(p, 0);
    for (const [p, v] of score) score.set(p, v + doing(f, p));
  }
  let best: Power | null = null;
  for (const [p, v] of score) if (v > 0 && (best === null || v > score.get(best)!)) best = p;
  if (best === null) return kept;
  const mine = kept === null ? 0 : (score.get(kept) ?? 0);
  return kept !== null && score.get(best)! < mine * Clearly.times + Clearly.plus ? kept : best;
}
