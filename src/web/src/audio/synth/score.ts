/**
 * The fallback's scores (item 19+++, after the original Civilization's method): each piece written once, as notes in
 * degrees of a tuning, in layers, each layer with the cue that switches it on; played by more than one arrangement
 * (arrange.ts) in any of the seven tunings (../tunings.ts). Nothing here sounds; the engine (engine.ts) plays it.
 *
 * Notation (`line`): space-separated `degree:beats` tokens, degrees counted from the tonic (0, 1 ... 7 the octave, -1 below),
 * `r:beats` a rest, `0+4:2` a chord, and for drums `D:beats` (the deep stroke at the frame's centre) and `T:beats` (the rim).
 * A token may end in `!` (accented) or `~` (soft).
 */
import type { Mood } from "../situation.ts";
import type { Tuning } from "../tunings.ts";

export type Role = "melody" | "counter" | "chord" | "bass" | "drum" | "jingle";

/** How the situation's mood is heard as well as the piece: -2 darkest (battle, siege, mourning) to +1 a feast. */
export type Shade = -2 | -1 | 0 | 1;

/** When a layer plays: in the moods listed (all if none), at the shades listed (all if none). */
export interface Cue {
  moods?: readonly Mood[];
  shades?: readonly Shade[];
}

export interface SNote {
  /** Beat from the score's start. */
  at: number;
  /** Degrees (a chord has several); for a drum 0 is the deep stroke, 1 the rim. */
  degrees: readonly number[];
  beats: number;
  vel: number;
}

export interface Layer {
  name: string;
  role: Role;
  notes: readonly SNote[];
  cue?: Cue;
}

export interface SynthScore {
  id: string;
  title: string;
  /** A working score that exercises the system, to be replaced by the composer. */
  placeholder: boolean;
  /** What it is after, shown on the listening page (a scholarly reconstruction, a court's theme...). */
  source: string;
  bpm: number;
  /** MIDI note of degree 0. */
  tonic: number;
  /** Its own tuning; when absent the court's home mode, shifted by the situation's shade. */
  mode?: Tuning;
  /** Beats where a phrase ends: the music may change piece or mode only there. The last is the score's length. */
  phrases: readonly number[];
  layers: readonly Layer[];
}

/** Parses a line of the notation, starting at `start` beats. */
export function line(text: string, start = 0, vel = 0.7): SNote[] {
  const out: SNote[] = [];
  let at = start;
  for (const tok of text.trim().split(/\s+/)) {
    const m = /^([^:]+):([0-9.]+)([!~]?)$/.exec(tok);
    if (m === null) throw new Error(`bad note "${tok}"`);
    const beats = Number(m[2]);
    const v = m[3] === "!" ? Math.min(1, vel + 0.2) : m[3] === "~" ? vel * 0.6 : vel;
    const head = m[1];
    if (head !== "r") {
      const degrees = head === "D" ? [0] : head === "T" ? [1] : head.split("+").map(Number);
      if (degrees.some((d) => !Number.isFinite(d))) throw new Error(`bad degree "${tok}"`);
      out.push({ at, degrees, beats, vel: v });
    }
    at += beats;
  }
  return out;
}

/** Repeats a line `times` times, each `every` beats apart. */
export function repeat(notes: readonly SNote[], times: number, every: number): SNote[] {
  return Array.from({ length: times }, (_, k) => notes.map((n) => ({ ...n, at: n.at + k * every }))).flat();
}

const war: readonly Mood[] = ["war", "battle", "siege"];

/**
 * PLACEHOLDER. The Hurrian Hymn (h.6), Ugarit's theme: the notation's first two lines in the dyad reading used across this
 * item (the first string named sings, the second sounds beneath it; the numerals are lengths), strings numbered rising in
 * nīd qablim, after Laroche's text of RS 15.30 + 15.49 + 17.387 as Wikipedia's "Hurrian songs" gives it. The composer
 * chooses one published reconstruction (West 1994, Kilmer, Dumbrill...) and writes it here.
 */
export const HymnPlaceholder: SynthScore = {
  id: "hymn",
  title: "The Hurrian Hymn (placeholder)",
  placeholder: true,
  source: "Hurrian Hymn h.6, lines 1-2, a dyad reading of Laroche's text (placeholder for one named reconstruction)",
  bpm: 84,
  tonic: 57,
  phrases: [18, 27, 45, 54],
  layers: [
    // Degrees from string 5 (A in nīd qablim): string k is degree k - 5.
    { name: "the hymn", role: "melody", notes: [...line("0:3 -3:1 0:3 2:1 -3:10 -2:2 -1:1 2:2 -4:2 -3:2"), ...line("0:3 -3:1 0:3 2:1 -3:10 -2:2 -1:1 2:2 -4:2 -3:2", 27)] },
    { name: "the strings beneath", role: "counter", notes: [...line("-3:3 2:1 -3:3 0:1 1:10 0:2 1:1 0:2 1:2 2:2", 0, 0.5), ...line("-3:3 2:1 -3:3 0:1 1:10 0:2 1:1 0:2 1:2 2:2", 27, 0.5)] },
    { name: "the held chord", role: "chord", notes: line("-7+-3+0:9 -7+-3+0:9 -7+-3+0:9 -10+-7+-3:9 -7+-3+0:9 -7+-3+0:9", 0, 0.4), cue: { shades: [0, 1] } },
    { name: "the drone", role: "bass", notes: line("-14:9 -14:9 -14:9 -14:9 -14:9 -14:9", 0, 0.5) },
    { name: "the frame drum", role: "drum", notes: repeat(line("D:1! T:0.5 T:0.5 D:1 T:1"), 13, 4).filter((n) => n.at < 54), cue: { moods: war } },
    { name: "the slow drum", role: "drum", notes: repeat(line("D:3 T:1~"), 13, 4).filter((n) => n.at < 54), cue: { moods: ["calm", "tension", "menu", "last"] } },
    { name: "the sistrum", role: "jingle", notes: repeat(line("0:4"), 13, 4).filter((n) => n.at < 54), cue: { shades: [1] } },
  ],
};

/** A short test score that exercises every role in a few bars: the listening page plays it in every mode and both versions. */
export const ModeTest: SynthScore = {
  id: "mode-test",
  title: "Mode test (placeholder)",
  placeholder: true,
  source: "A test: the scale up and down, a cadence, the drums and the sistrum",
  bpm: 108,
  tonic: 57,
  phrases: [8, 16],
  layers: [
    { name: "the scale", role: "melody", notes: line("0:0.5 1:0.5 2:0.5 3:0.5 4:0.5 5:0.5 6:0.5 7:0.5 7:0.5 6:0.5 5:0.5 4:0.5 3:0.5 2:0.5 1:0.5 0:0.5 2:1 4:1 3:1 1:1 0:4") },
    { name: "the answer", role: "counter", notes: line("r:8 4:1 2:1 3:1 1:1 0:2 -1:2") },
    { name: "the chords", role: "chord", notes: line("0+2+4:4 3+5+7:4 4+6+8:4 0+2+4:4", 0, 0.45) },
    { name: "the bass", role: "bass", notes: line("-7:4 -4:4 -3:4 -7:4") },
    { name: "the drums", role: "drum", notes: repeat(line("D:1! T:0.5 T:0.5 D:0.5 D:0.5 T:1"), 4, 4) },
    { name: "the sistrum", role: "jingle", notes: line("0:4 0:4 0:4 0:4", 0, 0.5) },
  ],
};

/** The fallback's pieces by the ids the moods and moments use; every id plays the placeholder until the composer writes it. */
export const SynthPieces: Readonly<Record<string, SynthScore>> = {};

export const synthPiece = (id: string): SynthScore => SynthPieces[id] ?? HymnPlaceholder;
