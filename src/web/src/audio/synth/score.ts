/**
 * The fallback's scores (item 19+++, after the original Civilization's method): each piece written once, as notes in
 * degrees of a tuning, in layers, each layer with the cue that switches it on; played by more than one arrangement
 * (arrange.ts) in any of the seven tunings (../tunings.ts). Nothing here sounds; the engine (engine.ts) plays it.
 *
 * Notation (`line`): space-separated `degree:beats` tokens, degrees counted from the tonic (0, 1 ... 7 the octave, -1 below),
 * `r:beats` a rest, `0+4:2` a chord, and for drums `D:beats` (the deep stroke at the frame's centre) and `T:beats` (the rim).
 * A token may end in `!` (accented) or `~` (soft).
 *
 * The scores, composed 31 October 2026: Ugarit's theme is the Hurrian Hymn (h.6), and each of the seven great courts has
 * a theme of its own and a march of its own, short, as the 1991 game gave each people a tune; the great moments (triumph, a city's
 * fall, a king's death, land lost, the last seasons) are shared. Each plays in the court's home mode, darker or brighter
 * by the shade, with layers that come and go by the mood (the drums of war, the heartbeat of unease, the sistrum at a
 * feast). A court's scores are heard in its home mode and up to two steps darker (Ugarit's, Mitanni's and Hatti's reach
 * qablītum, whose fifth is diminished), the shared moments in any; arrange.ts's `consonant` keeps every chord sounding
 * there, and the scores most exposed (Hatti's, Fall, the Lament) are written in fourths besides.
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
  /** A counter line written at the melody's pitch that sounds beneath it: the 8-bit version plays it an octave down (the period version's lyre already does). */
  below?: boolean;
}

export interface SynthScore {
  id: string;
  title: string;
  /** A working score that exercises the system, not a piece of the game's music. */
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
  /** The orchestra's pieces whose roles this score takes (ids in the manifest), for the listening page's side by side. */
  orchestra?: readonly string[];
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

/** A rhythm repeated to fill `length` beats. */
const fill = (notes: readonly SNote[], every: number, length: number): SNote[] =>
  repeat(notes, Math.ceil(length / every), every)
    .filter((n) => n.at < length)
    .map((n) => ({ ...n, beats: Math.min(n.beats, length - n.at) }));

const war: readonly Mood[] = ["war", "battle", "siege"];
const quiet: readonly Mood[] = ["calm", "menu", "last"];
const bright: readonly Shade[] = [0, 1];

// The drums, by the mood that calls them: for a theme (heard in peace and unease) the slow stroke of peace, the heartbeat
// of unease and the sistrum's jingle at a feast; for a march (heard in war, battle and siege) the march, the gallop of
// battle and the ram's knock in a siege. The hymn, heard in every mood, carries all.
const peaceDrums = (length: number, slow = "D:3 T:1~"): Layer[] => [
  { name: "the slow drum", role: "drum", notes: fill(line(slow), 4, length), cue: { moods: quiet } },
  { name: "the heartbeat", role: "drum", notes: fill(line("D:0.5! D:0.5~ r:3"), 4, length), cue: { moods: ["tension"] } },
  { name: "the sistrum", role: "jingle", notes: fill(line("0:2"), 2, length), cue: { shades: [1] } },
];
const warDrums = (length: number): Layer[] => [
  { name: "the march", role: "drum", notes: fill(line("D:1! T:0.5 T:0.5 D:1 T:1"), 4, length), cue: { moods: ["war"] } },
  { name: "the gallop", role: "drum", notes: fill(line("D:0.5! T:0.5 T:0.5 D:0.5 T:0.5 T:0.5 D:0.5 T:0.5"), 4, length), cue: { moods: ["battle"] } },
  { name: "the ram", role: "drum", notes: fill(line("D:1! r:1 D:1~ T:1~"), 4, length), cue: { moods: ["siege"] } },
];
const drumsOf = (length: number, slow = "D:3 T:1~"): Layer[] => [...peaceDrums(length, slow), ...warDrums(length)];

// The Hurrian Hymn by lines, in degrees from string 5 (string k is degree k - 5): the sung string first, the string
// beneath it second, as the reading below has them. Lines 1 to 4 are 18, 9, 16 and 18 beats.
const HymnSung = ["0:3 -3:1 0:3 2:1 -3:10", "-2:2 -1:1 2:2 -4:2 -3:2", "-2:1 2:2 -4:4 -1:1 2:1 -4:4 2:1 -4:2", "2:1 -4:2 -3:2 1:2 0:3 1:1 0:4 1:1 0:2"];
const HymnBeneath = ["-3:3 2:1 -3:3 0:1 1:10", "0:2 1:1 0:2 1:2 2:2", "2:1 0:2 1:4 1:1 0:1 1:4 0:1 1:2", "0:1 1:2 2:2 -2:2 -3:3 -2:1 -3:4 -2:1 -3:2"];
const HymnStarts = [0, 18, 27, 43];
const HymnLength = 61;
const hymnLayers = (vel: number): Layer[] => [
  { name: "the hymn", role: "melody", notes: HymnSung.flatMap((l, i) => line(l, HymnStarts[i], vel)) },
  { name: "the strings beneath", role: "counter", below: true, notes: HymnBeneath.flatMap((l, i) => line(l, HymnStarts[i], vel * 0.7)) },
  {
    name: "the lyre's chord", role: "chord", cue: { shades: bright },
    notes: line("-7+-3+0:8 -11+-7+-4:4 -9+-5+-2:3 -8+-4+-1:3 -9+-5+-2:3 -7+-3+0:6 -7+-3+0:4 -11+-7+-4:4 -7+-3+0:4 -8+-4+-1:2 -7+-3+0:2 -11+-7+-4:5 -7+-3+0:4 -8+-4+-1:2 -7+-3+0:7", 0, 0.4),
  },
  { name: "the drone", role: "bass", notes: line("-14:18 -14:9 -14:16 -14:18", 0, 0.5) },
];

/**
 * Ugarit's theme: the Hurrian Hymn to Nikkal (h.6, Ugarit, about 1400 BCE), the oldest written music that can be played.
 * The notation names pairs of the lyre's strings, each with a numeral; this score follows Anne Draffkorn Kilmer's reading
 * (Kilmer 1974; Kilmer, Crocker and Brown, "Sounds from Silence", 1976): the strings of each named pair sound together,
 * in the nīd qablim tuning the colophon names, the first-named string sung above the other; the numerals are taken as
 * lengths, and the text is Laroche's edition of RS 15.30 + 15.49 + 17.387. Other readings (Wulstan 1971, Duchesne-Guillemin
 * 1984, West 1994, Dumbrill 1998) hear the pairs one note after the other; this one keeps Kilmer's dyads.
 */
export const HurrianHymn: SynthScore = {
  id: "hymn",
  title: "The Hurrian Hymn (Ugarit's theme)",
  placeholder: false,
  source: "Hurrian Hymn h.6, all four lines, after Kilmer's reading of the dyads (1974; Sounds from Silence, 1976): each string pair sounded together in nīd qablim, the first-named string sung; Laroche's text",
  bpm: 80,
  tonic: 69,
  phrases: [8, 18, 27, 43, 61],
  layers: [...hymnLayers(0.7), ...drumsOf(HymnLength, "D:3 T:1~")],
  orchestra: ["hymn", "kings", "river"],
};

/** The last seasons: the hymn slow, as a clock. */
export const LastSeasons: SynthScore = {
  ...HurrianHymn,
  id: "last",
  title: "The Last Seasons (the hymn, slow)",
  source: "The Hurrian Hymn as above, slowed, the lyre striking the beat",
  bpm: 56,
  layers: [
    ...hymnLayers(0.6),
    { name: "the clock", role: "jingle", notes: fill(line("0:1~"), 1, HymnLength) },
  ],
  orchestra: ["last"],
};

/** Ugarit's march: the hymn's first line as a march. */
const UgaritMarch: SynthScore = {
  id: "ugarit-war",
  title: "Ugarit: the hymn's march",
  placeholder: false,
  source: "The hymn's first line (A E A C E) as a march; a theme of the game's own",
  bpm: 108,
  tonic: 69,
  phrases: [8, 16, 24, 32],
  layers: [
    { name: "the march", role: "melody", notes: line("0:1 0:0.5 0:0.5 -3:1 0:1 0:1 0:0.5 0:0.5 2:1 -3:1 -3:1 -3:1 -2:1 -1:1 2:1 -4:1 -3:2 -2:1 -1:1 2:2 -4:1 -3:1 -2:1 -1:1 0:1 1:1 0:1 1:1 0:4") },
    { name: "the answer", role: "counter", notes: line("-7:2 -7:2 -3:2 -7:2 -7:2 -7:2 -5:2 -3:2 -3:2 -3:2 -4:2 -3:2 -7:2 -7:2 -3:2 -7:2", 0, 0.5) },
    { name: "the chord", role: "chord", notes: line("-7+-3+0:8 -7+-3+0:4 -9+-5+-2:4 -11+-7+-4:4 -8+-4+-1:4 -7+-3+0:8", 0, 0.4), cue: { moods: ["war"] } },
    { name: "the bass", role: "bass", notes: line("-14:8 -14:4 -16:4 -18:4 -15:4 -14:8", 0, 0.55) },
    ...warDrums(32),
  ],
  orchestra: ["chariots", "battle", "siege"],
};

const theme = (id: string, title: string, source: string, bpm: number, tonic: number, phrases: number[], layers: Layer[], orchestra: string[]): SynthScore =>
  ({ id, title, placeholder: false, source, bpm, tonic, phrases, layers, orchestra });

const calm = ["kings", "river", "envoys", "shadows", "enmity"];
const marchIds = ["chariots", "battle", "siege"];

/** A court's own theme and its own march (each 32 beats), written in degrees so they play in the court's home mode. */
export interface CourtMusic {
  theme: SynthScore;
  march: SynthScore;
}

export const CourtScores: Readonly<Record<string, CourtMusic>> = {
  Ugarit: { theme: HurrianHymn, march: UgaritMarch },
  Egypt: {
    // A procession on the Nile: broad, the raised fourth of kitmum passing in the line, never rested on.
    theme: theme("egypt", "Egypt: the procession", "A theme of the game's own for Egypt's court, in kitmum (a reading: Egypt's tuning is unknown)", 80, 62, [8, 16, 24, 32], [
      { name: "the procession", role: "melody", notes: line("0:2 2:1 4:1 7:3 6:1 4:2 5:1 4:1 2:4 4:2 6:1 7:1 9:2 7:2 6:1 4:1 2:2 0:4") },
      { name: "the answer", role: "counter", notes: line("r:8 0:2 -1:2 0:4 r:8 4:2 2:2 0:4", 0, 0.5) },
      { name: "the chord", role: "chord", notes: line("0+4+7:8 1+5+8:8 4+8+11:8 0+4+7:8", 0, 0.4), cue: { shades: bright } },
      { name: "the bass", role: "bass", notes: line("-7:8 -6:8 -3:8 -7:8", 0, 0.5) },
      ...peaceDrums(32, "D:2 T:1~ T:1~"),
    ], calm),
    march: theme("egypt-war", "Egypt: the trumpets", "A march of the game's own for Egypt's court", 100, 62, [8, 16, 24, 32], [
      { name: "the trumpets", role: "melody", notes: line("4:1 4:1 7:2 4:1 4:1 9:2 7:1 6:1 5:1 4:1 2:2 0:2 4:1 4:1 7:2 9:1 9:1 11:2 9:1 7:1 6:1 5:1 4:4") },
      { name: "the answer", role: "counter", notes: line("0:2 0:2 4:2 0:2 2:2 2:2 0:4 0:2 0:2 4:4 5:2 4:2 0:4", 0, 0.5) },
      { name: "the chord", role: "chord", notes: line("0+4+7:8 1+5+8:4 0+4+7:4 0+4+7:8 5+9+12:4 0+4+7:4", 0, 0.4), cue: { moods: ["war"] } },
      { name: "the bass", role: "bass", notes: line("-7:4 -7:4 -3:4 -7:4 -7:4 -7:4 -2:4 -7:4", 0, 0.55) },
      ...warDrums(32),
    ], marchIds),
  },
  Hatti: {
    // The mountain court: the semitone of nīš tuḫrim at the top of the line, fourths in the chords (its darkest mode
    // is qablītum, whose fifth is diminished).
    theme: theme("hatti", "Hatti: the mountain court", "A theme of the game's own for Hatti's court, in nīš tuḫrim; its chords in fourths", 88, 64, [8, 16, 24, 32], [
      { name: "the theme", role: "melody", notes: line("0:2 1:1 0:1 -3:2 0:2 2:2 1:1 0:1 -1:2 0:2 4:2 3:1 2:1 1:2 0:2 2:1 1:1 0:2 -3:4") },
      { name: "the low answer", role: "counter", notes: line("-7:4 -3:4 -7:4 -3:4 -7:4 -5:4 -4:2 -3:2 -7:4", 0, 0.5) },
      { name: "the fourths", role: "chord", notes: line("0+3+7:8 -1+2+6:8 0+3+7:8 -4+0+3:4 0+3+7:4", 0, 0.4), cue: { shades: bright } },
      { name: "the bass", role: "bass", notes: line("-7:8 -8:8 -7:8 -10:4 -7:4", 0, 0.5) },
      ...peaceDrums(32),
    ], calm),
    march: theme("hatti-war", "Hatti: the march of the Hittites", "A march of the game's own for Hatti's court", 112, 64, [8, 16, 24, 32], [
      { name: "the march", role: "melody", notes: line("0:0.5 0:0.5 1:1 0:1 -3:1 0:0.5 0:0.5 2:1 1:1 0:1 4:1 3:1 2:1 1:1 0:1 1:1 0:2 4:1 5:1 7:2 5:1 4:1 2:2 1:1 2:1 1:1 0:1 -3:2 0:2") },
      { name: "the answer", role: "counter", notes: line("-7:2 -7:2 -3:2 -3:2 -7:2 -7:2 -4:2 -3:2 0:2 0:2 -3:2 -3:2 -4:2 -3:2 -7:4", 0, 0.5) },
      { name: "the fourths", role: "chord", notes: line("0+3+7:8 -1+2+6:4 0+3+7:4 0+3+7:8 -4+0+3:4 0+3+7:4", 0, 0.4), cue: { moods: ["war"] } },
      { name: "the bass", role: "bass", notes: line("-7:4 -7:4 -8:4 -7:4 -7:4 -7:4 -10:4 -7:4", 0, 0.55) },
      ...warDrums(32),
    ], marchIds),
  },
  Babylonia: {
    theme: theme("babylonia", "Babylonia: the learned court", "A theme of the game's own for Babylonia's court, in išartum, the normal tuning", 72, 62, [8, 16, 24, 32], [
      { name: "the theme", role: "melody", notes: line("4:3 5:1 7:2 6:2 5:1 4:1 2:2 3:2 2:2 4:3 2:1 1:2 2:2 1:1 0:1 -1:2 0:4") },
      { name: "the answer", role: "counter", notes: line("0:4 -2:4 -3:4 -1:4 0:4 -3:4 -1:4 0:4", 0, 0.5) },
      { name: "the chord", role: "chord", notes: line("0+4+7:4 -2+2+5:4 -3+0+4:4 -1+3+6:4 0+4+7:4 -3+0+4:4 -1+3+6:4 0+4+7:4", 0, 0.4), cue: { shades: bright } },
      { name: "the bass", role: "bass", notes: line("-7:4 -9:4 -10:4 -8:4 -7:4 -10:4 -8:4 -7:4", 0, 0.5) },
      ...peaceDrums(32, "D:4"),
    ], calm),
    march: theme("babylonia-war", "Babylonia: the king's array", "A march of the game's own for Babylonia's court", 96, 62, [8, 16, 24, 32], [
      { name: "the march", role: "melody", notes: line("0:2 0:1 2:1 4:2 4:1 5:1 7:2 5:1 4:1 2:4 0:2 0:1 2:1 4:2 5:1 6:1 7:1 6:1 5:1 4:1 2:2 0:2") },
      { name: "the answer", role: "counter", notes: line("-7:4 -3:4 -3:4 -5:4 -7:4 -3:4 -4:2 -3:2 -7:4", 0, 0.5) },
      { name: "the chord", role: "chord", notes: line("0+4+7:8 -3+0+4:4 -5+-2+2:4 0+4+7:8 -4+0+3:4 0+4+7:4", 0, 0.4), cue: { moods: ["war"] } },
      { name: "the bass", role: "bass", notes: line("-7:8 -10:4 -12:4 -7:8 -11:4 -7:4", 0, 0.55) },
      ...warDrums(32),
    ], marchIds),
  },
  Mitanni: {
    theme: theme("mitanni", "Mitanni: the horse-lords", "A theme of the game's own for Mitanni's court, in nīd qablim, the hymn's tuning", 100, 62, [8, 16, 24, 32], [
      { name: "the theme", role: "melody", notes: line("0:1 2:1 4:2 2:1 4:1 5:2 4:1 2:1 0:2 -1:2 0:2 0:1 2:1 4:2 5:1 7:1 9:2 7:1 5:1 4:2 2:2 0:2") },
      { name: "the answer", role: "counter", notes: line("r:8 0:2 -1:2 -3:2 0:2 r:8 4:2 2:2 0:4", 0, 0.5) },
      { name: "the chord", role: "chord", notes: line("0+4+7:8 -2+2+5:4 0+4+7:4 0+4+7:8 -1+3+6:4 0+4+7:4", 0, 0.4), cue: { shades: bright } },
      { name: "the bass", role: "bass", notes: line("-7:8 -9:4 -7:4 -7:8 -8:4 -7:4", 0, 0.5) },
      ...peaceDrums(32, "D:1 T:1~ D:1~ T:1~"),
    ], calm),
    march: theme("mitanni-war", "Mitanni: the chariots", "A march of the game's own for Mitanni's court", 120, 62, [8, 16, 24, 32], [
      { name: "the chariots", role: "melody", notes: line("0:0.5 0:0.5 0:1 4:1 0:1 2:0.5 2:0.5 2:1 5:1 2:1 4:0.5 4:0.5 7:1 5:1 4:1 2:1 1:1 0:2 7:1 5:1 4:1 2:1 4:1 2:1 0:2 5:1 4:1 2:1 1:1 0:4") },
      { name: "the answer", role: "counter", notes: line("-7:4 -5:4 -3:4 -4:2 -3:2 -7:4 -3:4 -5:4 -7:4", 0, 0.5) },
      { name: "the chord", role: "chord", notes: line("0+4+7:4 -2+2+5:4 -3+0+4:4 0+4+7:4 0+4+7:4 -3+0+4:4 -2+2+5:4 0+4+7:4", 0, 0.4), cue: { moods: ["war"] } },
      { name: "the bass", role: "bass", notes: line("-7:4 -9:4 -10:4 -7:4 -7:4 -10:4 -9:4 -7:4", 0, 0.55) },
      ...warDrums(32),
    ], marchIds),
  },
  Assyria: {
    theme: theme("assyria", "Assyria: the austere court", "A theme of the game's own for Assyria's court, in pītum", 84, 62, [8, 16, 24, 32], [
      { name: "the theme", role: "melody", notes: line("0:4 2:2 3:2 4:4 3:2 2:2 0:2 -1:2 0:2 2:2 1:2 0:6") },
      { name: "the low answer", role: "counter", notes: line("-7:8 -4:4 -3:4 -7:4 -8:4 -6:4 -7:4", 0, 0.5) },
      { name: "the chord", role: "chord", notes: line("0+4+7:8 3+7+10:4 4+8+11:4 0+4+7:4 -1+3+6:4 1+5+8:4 0+4+7:4", 0, 0.4), cue: { shades: bright } },
      { name: "the bass", role: "bass", notes: line("-7:8 -4:4 -3:4 -7:4 -8:4 -6:4 -7:4", 0, 0.5) },
      ...peaceDrums(32, "D:2 r:1 T:1~"),
    ], calm),
    march: theme("assyria-war", "Assyria: the host", "A march of the game's own for Assyria's court", 104, 62, [8, 16, 24, 32], [
      { name: "the host", role: "melody", notes: line("0:1 0:1 0:2 2:1 3:1 4:2 4:1 4:1 4:2 3:1 2:1 0:2 7:2 6:1 5:1 4:2 2:2 3:1 2:1 1:1 0:1 0:4") },
      { name: "the answer", role: "counter", notes: line("-7:4 -3:4 -3:4 -7:4 -3:4 -4:4 -5:2 -3:2 -7:4", 0, 0.5) },
      { name: "the chord", role: "chord", notes: line("0+4+7:8 0+4+7:4 -3+0+4:4 -3+0+4:4 -1+3+6:4 -2+2+5:4 0+4+7:4", 0, 0.4), cue: { moods: ["war"] } },
      { name: "the bass", role: "bass", notes: line("-7:8 -7:4 -10:4 -10:4 -8:4 -9:4 -7:4", 0, 0.55) },
      ...warDrums(32),
    ], marchIds),
  },
  Alashiya: {
    // The island court: a swaying theme, the copper fleet's march.
    theme: theme("alashiya", "Alashiya: the island", "A theme of the game's own for Alashiya's court, in embūbum", 92, 62, [8, 16, 24, 32], [
      { name: "the theme", role: "melody", notes: line("4:2 5:1 4:1 2:2 0:2 2:2 3:1 2:1 1:2 0:2 4:2 6:1 7:1 6:2 4:2 5:1 4:1 2:2 1:1 0:3") },
      { name: "the answer", role: "counter", notes: line("r:8 0:2 -1:2 0:4 r:8 2:2 1:2 0:4", 0, 0.5) },
      { name: "the chord", role: "chord", notes: line("0+4+7:8 -3+0+4:8 0+4+7:8 -1+3+6:4 0+4+7:4", 0, 0.4), cue: { shades: bright } },
      { name: "the bass", role: "bass", notes: line("-7:8 -10:8 -7:8 -8:4 -7:4", 0, 0.5) },
      ...peaceDrums(32, "D:2 T:1~ r:1"),
    ], calm),
    march: theme("alashiya-war", "Alashiya: the copper fleet", "A march of the game's own for Alashiya's court", 108, 62, [8, 16, 24, 32], [
      { name: "the march", role: "melody", notes: line("0:1 0:1 4:2 2:1 2:1 5:2 4:1 4:1 7:2 5:1 4:1 2:2 0:1 0:1 4:2 5:1 5:1 7:2 6:1 5:1 4:1 2:1 0:4") },
      { name: "the answer", role: "counter", notes: line("-7:4 -3:4 -7:4 -3:4 -7:4 -2:4 -3:2 -5:2 -7:4", 0, 0.5) },
      { name: "the chord", role: "chord", notes: line("0+4+7:8 -3+0+4:4 0+4+7:4 0+4+7:8 -2+2+5:4 0+4+7:4", 0, 0.4), cue: { moods: ["war"] } },
      { name: "the bass", role: "bass", notes: line("-7:8 -10:4 -7:4 -7:8 -9:4 -7:4", 0, 0.55) },
      ...warDrums(32),
    ], marchIds),
  },
  Arzawa: {
    // The western court: a dance in threes.
    theme: theme("arzawa", "Arzawa: the western dance", "A theme of the game's own for Arzawa's court, in embūbum, in threes", 96, 62, [6, 12, 18, 24, 32], [
      { name: "the dance", role: "melody", notes: line("0:1 2:1 4:1 7:2 4:1 5:1 4:1 2:1 4:3 7:1 6:1 5:1 4:2 2:1 4:1 2:1 1:1 0:3 2:1 1:1 0:1 -1:2 0:1 0:2") },
      { name: "the answer", role: "counter", notes: line("r:6 0:3 -3:3 r:6 4:3 0:3 0:2 -1:2 0:4", 0, 0.5) },
      { name: "the chord", role: "chord", notes: line("0+4+7:6 -3+0+4:6 -1+3+6:6 0+4+7:6 -1+3+6:4 0+4+7:4", 0, 0.4), cue: { shades: bright } },
      { name: "the bass", role: "bass", notes: line("-7:6 -10:6 -8:6 -7:6 -8:4 -7:4", 0, 0.5) },
      { name: "the slow drum", role: "drum", notes: fill(line("D:1 T:1~ T:1~"), 3, 32), cue: { moods: quiet } },
      { name: "the heartbeat", role: "drum", notes: fill(line("D:0.5! D:0.5~ r:2"), 3, 32), cue: { moods: ["tension"] } },
      { name: "the sistrum", role: "jingle", notes: fill(line("0:3"), 3, 32), cue: { shades: [1] } },
    ], calm),
    march: theme("arzawa-war", "Arzawa: the western march", "A march of the game's own for Arzawa's court", 112, 62, [6, 12, 18, 24, 32], [
      { name: "the march", role: "melody", notes: line("0:1 0:0.5 0:0.5 4:1 4:1 2:0.5 2:0.5 0:1 7:1 6:0.5 5:0.5 4:1 2:1 1:0.5 2:0.5 0:1 0:1 0:0.5 0:0.5 4:1 4:1 2:0.5 2:0.5 0:1 7:1 6:0.5 5:0.5 4:1 2:1 1:0.5 2:0.5 0:1 7:2 5:1 4:1 2:2 0:2") },
      { name: "the answer", role: "counter", notes: line("-7:3 -3:3 -7:3 -4:3 -7:3 -3:3 -7:3 -4:3 -3:4 -7:4", 0, 0.5) },
      { name: "the chord", role: "chord", notes: line("0+4+7:6 -3+0+4:6 0+4+7:6 -1+3+6:6 -3+0+4:4 0+4+7:4", 0, 0.4), cue: { moods: ["war"] } },
      { name: "the bass", role: "bass", notes: line("-7:6 -10:6 -7:6 -8:6 -10:4 -7:4", 0, 0.55) },
      { name: "the march", role: "drum", notes: fill(line("D:1! T:1 T:1"), 3, 32), cue: { moods: ["war"] } },
      { name: "the gallop", role: "drum", notes: fill(line("D:0.5! T:0.5 T:0.5 D:0.5 T:0.5 T:0.5"), 3, 32), cue: { moods: ["battle"] } },
      { name: "the ram", role: "drum", notes: fill(line("D:1! r:1 T:1~"), 3, 32), cue: { moods: ["siege"] } },
    ], marchIds),
  },
};

/** Triumph: a fanfare, bright and short, in the court's mode a step brighter. */
export const Triumph: SynthScore = theme("triumph", "Triumph", "A fanfare of the game's own: the fifth and the octave, the march, the sistrum", 104, 62, [8, 16, 24], [
  { name: "the fanfare", role: "melody", notes: line("0:1 4:1 7:2 7:1 9:1 7:2 4:1 7:1 9:2 11:3 r:1 7:2 9:1 7:1 4:4") },
  { name: "the answer", role: "counter", notes: line("r:2 0:2 4:2 0:2 r:2 4:2 7:2 4:2 0:2 4:2 0:4", 0, 0.55) },
  { name: "the chord", role: "chord", notes: line("0+4+7:8 4+8+11:4 5+9+12:4 0+4+7:8", 0, 0.45) },
  { name: "the bass", role: "bass", notes: line("-7:8 -3:4 -2:4 -7:8", 0, 0.6) },
  { name: "the march", role: "drum", notes: fill(line("D:1! T:0.5 T:0.5 D:1 T:1"), 4, 24) },
  { name: "the sistrum", role: "jingle", notes: fill(line("0:2"), 2, 24) },
], ["triumph"]);

/** The city falls: a line falling the octave, twice, the drums tolling. */
export const Fall: SynthScore = theme("fall", "The City Falls", "A falling line of the game's own, the octave down to the tonic, twice", 84, 62, [16, 32], [
  { name: "the fall", role: "melody", notes: [...line("7:2 6:1 5:1 4:3 3:1 2:2 1:2 0:4"), ...line("7:2 6:1 5:1 4:3 3:1 2:2 1:2 0:4", 16)] },
  { name: "the fall beneath", role: "counter", notes: line("0:2 -1:1 -2:1 -3:3 -4:1 -5:2 -6:2 -7:4", 16, 0.6) },
  { name: "the chord", role: "chord", notes: line("0+3+7:4 -1+3+6:4 -4+0+3:4 0+3+7:4 0+3+7:4 -1+3+6:4 -4+0+3:4 0+3+7:4", 0, 0.4) },
  { name: "the bass", role: "bass", notes: line("-7:4 -8:4 -11:4 -7:4 -7:4 -8:4 -11:4 -7:4", 0, 0.6) },
  { name: "the toll", role: "drum", notes: fill(line("D:2! T:2~"), 4, 32) },
], ["fall"]);

/** A lament: for a king fallen and for land lost, in the court's mode two steps darker. */
export const Lament: SynthScore = theme("lament", "Lament", "A lament of the game's own, falling by steps to the tonic; for a king fallen and for land lost", 60, 64, [16, 32], [
  { name: "the lament", role: "melody", notes: line("4:3 3:1 2:2 1:2 0:3 r:1 2:2 1:1 0:1 7:2 6:1 5:1 4:3 5:1 4:2 3:2 2:1 1:1 0:2") },
  { name: "the answer", role: "counter", notes: line("0:4 -1:4 -2:4 0:4 -2:4 -3:4 -1:2 -2:2 0:4", 0, 0.5) },
  { name: "the chord", role: "chord", notes: line("-7+-4+0:8 -11+-7+-4:4 -7+-4+0:4 -11+-7+-4:4 -8+-4+-1:4 -11+-7+-4:4 -7+-4+0:4", 0, 0.4) },
  { name: "the bass", role: "bass", notes: line("-14:8 -18:4 -14:4 -18:4 -15:4 -18:4 -14:4", 0, 0.5) },
  { name: "the slow drum", role: "drum", notes: fill(line("D:4~"), 4, 32), cue: { shades: [-2] } },
], ["solemn", "fallen"]);

/** A short test score that exercises every role in a few bars: the listening page plays it in every mode and both versions. */
export const ModeTest: SynthScore = {
  id: "mode-test",
  title: "The tuning's scale (a test)",
  placeholder: true,
  source: "A test, not a piece: the scale up and down, a cadence, the drums and the sistrum, for hearing each tuning",
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

/** The moments' scores, the same for every court. */
export const SharedScores: Readonly<Record<string, SynthScore>> = {
  hymn: HurrianHymn,
  last: LastSeasons,
  triumph: Triumph,
  fall: Fall,
  solemn: Lament,
  fallen: Lament,
};

/** The court whose music is heard: its own if it has one, else Ugarit's, the game's voice (god view and the menus too). */
export const courtMusic = (court: string | null): CourtMusic => (court !== null ? (CourtScores[court] ?? CourtScores.Ugarit) : CourtScores.Ugarit);

/**
 * The fallback's score for a piece id (the ids the moods and moments use) at a court: the moments' scores are shared;
 * the calm and tension pieces play the court's theme, the war pieces its march, each with the layers its mood calls for.
 */
export function synthPiece(id: string, court: string | null = null): SynthScore {
  const shared = SharedScores[id];
  if (shared !== undefined) return shared;
  const music = courtMusic(court);
  return marchIds.includes(id) ? music.march : music.theme;
}

/** The scores heard at a court, for the listening page: its theme and march, then the shared moments. */
export const scoresFor = (court: string | null): SynthScore[] => {
  const music = courtMusic(court);
  const own = music.theme === HurrianHymn ? [HurrianHymn, music.march] : [HurrianHymn, music.theme, music.march];
  return [...own, Triumph, Fall, Lament, LastSeasons];
};
