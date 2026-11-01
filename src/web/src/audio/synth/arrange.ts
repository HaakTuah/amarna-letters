/**
 * The fallback's two arrangements of one score (item 19+++), as the 1991 game's one score played through whichever sound
 * card a player had. Pure: a stretch of a score, a tuning, the situation, and the version give the notes to play.
 *
 * - "chip", pure 8-bit: square-wave lead, a thinner square for the counter line, held chords spread into quick arpeggios,
 *   the lead echoed, a triangle bass, noise for the drums.
 * - "period", period timbres: the reed pipe sings the lead, the lyre plays the counter, the chords and the bass and lets
 *   them ring, the frame drum and the sistrum, with looser timing.
 */
import type { Mood } from "../situation.ts";
import { pitch, type Tuning } from "../tunings.ts";
import type { Cue, Layer, Shade, SynthScore } from "./score.ts";

export type Version = "chip" | "period";

export type Voice = "square" | "square-thin" | "triangle" | "noise-deep" | "noise-rim" | "noise-jingle" | "reed" | "lyre" | "drum-deep" | "drum-rim" | "sistrum";

export interface Played {
  /** Beats from the stretch's start. */
  at: number;
  beats: number;
  midi: number;
  vel: number;
  voice: Voice;
}

export interface Situation {
  mood: Mood;
  shade: Shade;
}

export const cueHolds = (c: Cue | undefined, s: Situation): boolean =>
  c === undefined || ((c.moods === undefined || c.moods.includes(s.mood)) && (c.shades === undefined || c.shades.includes(s.shade)));

/** A small deterministic noise, so a stretch played twice is played alike (and tests can count on it). */
function rng(seed: number): () => number {
  let x = seed >>> 0 || 1;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return ((x >>> 0) % 10000) / 10000;
  };
}

/**
 * The degrees of a chord as a tuning lets them sound: where two of them stand a tritone apart (the tonic and its fifth in
 * qablītum, the fourth degree and the octave in kitmum, the second and the sixth in nīd qablim...), the upper one steps
 * down a degree, so a fifth becomes a fourth, as a lyre tuned to that pair would be struck; and a chord rooted a tritone
 * from the tonic (qablītum's fifth degree, kitmum's fourth) moves up a degree. One rule for every score in every
 * tuning, as Mode.chord and roots do for the orchestra's pieces.
 */
export function consonant(degrees: readonly number[], mode: Tuning, tonic: number): number[] {
  let notes = [...degrees].sort((a, b) => a - b);
  if (groundDegree(notes[0], mode) !== notes[0]) notes = notes.map((d) => d + 1);
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 1; i < notes.length; i++) {
      const upper = pitch(mode, tonic, notes[i]);
      if (notes.slice(0, i).some((d) => (((upper - pitch(mode, tonic, d)) % 12) + 12) % 12 === 6)) notes[i] -= 1;
    }
  }
  return notes;
}

/** A root or bass note as a tuning lets it sound against the tonic: a degree a tritone from it (the fifth in qablītum, the fourth in kitmum) moves up a degree. */
export const groundDegree = (degree: number, mode: Tuning): number => ((((pitch(mode, 0, degree) % 12) + 12) % 12) === 6 ? degree + 1 : degree);

/**
 * The variations of a pass through a score, chosen in turn so none repeats twice running: 0 as written, 1 the lead an
 * octave up and the counter silent, 2 sparse (no held chords, the drums halved).
 */
export const Variations = 3;

/** The notes of the score's stretch [from, to) beats, arranged for a version, in a tuning, for a situation and variation. */
export function arrange(score: SynthScore, from: number, to: number, mode: Tuning, version: Version, s: Situation, variation = 0, seed = 1): Played[] {
  const out: Played[] = [];
  const r = rng(seed * 7919 + Math.floor(from * 16));
  const loose = version === "period" ? 0.04 : 0;
  const deg = (d: number): number => pitch(mode, score.tonic, d);
  for (const layer of score.layers) {
    if (!cueHolds(layer.cue, s)) continue;
    if (variation === 1 && layer.role === "counter") continue;
    if (variation === 2 && layer.role === "chord") continue;
    for (const n of layer.notes) {
      if (n.at < from || n.at >= to) continue;
      if (variation === 2 && layer.role === "drum" && Math.floor(n.at) % 2 === 1) continue;
      const at = n.at - from;
      const vel = n.vel * (version === "period" ? 0.9 + r() * 0.2 : 1);
      play(layer, n.degrees, at, n.beats, vel);
    }
  }
  return out.sort((a, b) => a.at - b.at);

  function play(layer: Layer, degrees: readonly number[], at: number, beats: number, vel: number): void {
    const up = variation === 1 && layer.role === "melody" ? 7 : 0;
    const j = (): number => (loose > 0 ? (r() - 0.5) * 2 * loose : 0);
    if (version === "chip") {
      switch (layer.role) {
        case "melody":
          for (const d of degrees) {
            out.push({ at, beats: beats * 0.92, midi: deg(d + up), vel, voice: "square" });
            // The echo, a dotted eighth behind and softer, as the 1991 machines faked a hall.
            out.push({ at: at + 0.75, beats: Math.min(beats, 1) * 0.6, midi: deg(d + up), vel: vel * 0.3, voice: "square" });
          }
          return;
        case "counter":
          for (const d of degrees) out.push({ at, beats: beats * 0.85, midi: deg(d) - (layer.below ? 12 : 0), vel: vel * 0.7, voice: "square-thin" });
          return;
        case "chord": {
          // A held chord spread into an arpeggio of sixteenths across its length.
          const notes = consonant(degrees, mode, score.tonic);
          for (let k = 0, t = 0; t < beats - 1e-6; k++, t += 0.25) out.push({ at: at + t, beats: 0.22, midi: deg(notes[k % notes.length]) + 12, vel: vel * 0.55, voice: "square-thin" });
          return;
        }
        case "bass":
          for (const d of degrees) out.push({ at, beats: beats * 0.95, midi: deg(groundDegree(d, mode)), vel, voice: "triangle" });
          return;
        case "drum":
          out.push({ at, beats: 0.1, midi: 0, vel, voice: degrees[0] === 0 ? "noise-deep" : "noise-rim" });
          return;
        case "jingle":
          out.push({ at, beats: 0.15, midi: 0, vel: vel * 0.6, voice: "noise-jingle" });
          return;
      }
    }
    switch (layer.role) {
      case "melody":
        for (const d of degrees) out.push({ at: at + j(), beats: beats * 1.02, midi: deg(d + up), vel, voice: "reed" });
        return;
      case "counter":
        for (const d of degrees) out.push({ at: at + j(), beats: Math.max(beats, 1.5), midi: deg(d) - 12, vel: vel * 0.85, voice: "lyre" });
        return;
      case "chord": {
        // The lyre's strings struck one after another and let ring; struck again each bar of a long chord.
        const notes = consonant(degrees, mode, score.tonic);
        for (let t = 0; t < beats - 1e-6; t += 4) {
          notes.forEach((d, k) => out.push({ at: at + t + k * 0.06 + j(), beats: Math.min(4, beats - t) + 1, midi: deg(d), vel: vel * (0.8 - 0.08 * k), voice: "lyre" }));
        }
        return;
      }
      case "bass":
        for (let t = 0; t < beats - 1e-6; t += 4) for (const d of degrees) out.push({ at: at + t + j(), beats: 4, midi: deg(groundDegree(d, mode)), vel, voice: "lyre" });
        return;
      case "drum":
        out.push({ at: at + j() * 0.5, beats: 0.3, midi: 0, vel, voice: degrees[0] === 0 ? "drum-deep" : "drum-rim" });
        return;
      case "jingle":
        out.push({ at: at + j(), beats: 0.6, midi: 0, vel: vel * 0.7, voice: "sistrum" });
        return;
    }
  }
}

/** The phrase stretches of a score: [start, end) beats each. */
export function stretches(score: SynthScore): [number, number][] {
  const out: [number, number][] = [];
  let a = 0;
  for (const b of score.phrases) {
    out.push([a, b]);
    a = b;
  }
  return out;
}
