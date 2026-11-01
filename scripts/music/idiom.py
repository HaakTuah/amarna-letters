"""The idiom the pieces share: lines written in degrees of a tuning, the hymn sung over the lyre's string pairs, and the
period's open harmony."""

from __future__ import annotations

from hymn import Mode
from parts import lyre, melody
from score import Score


def deg(mode: Mode, line, octave: int = 0):
    """A line written in degrees of a tuning: (degree, beats), None for a rest."""
    return [(None if d is None else mode(d, octave), b) for d, b in line]


def length(line) -> float:
    return float(sum(b for _, b in line))


def open5(mode: Mode, d: int, octave: int = 0) -> list[int]:
    """The open fifth (or fourth, where the fifth is diminished) on a degree."""
    return mode.chord(d, "open", octave)


def fifth(mode: Mode, d: int = 0, octave: int = 0) -> int:
    """The note an open chord on a degree holds above its root: the fifth, or the fourth where the fifth is diminished."""
    return mode.chord(d, "open", octave)[1]


def wide(mode: Mode, d: int, octave: int = 0) -> list[int]:
    """Root and fifth low, the octave and the third above: the period's chord as the strings hold it."""
    root, fifth = mode.chord(d, "open", octave)
    return [root, fifth, root + 12, mode(d + 2, octave + 1)]


def play_hymn(s: Score, b: float, lines, lead: str, vel: float = 0.55, octave: int = 0, lyre_vel: float = 0.42,
              figure: bool = True, double: str | None = None, ornament: float = 0.5, lyre_inst: str = "lyre",
              phrase: bool = True, unison: str | None = None) -> float:
    """The hymn's lines as the reading has them: the lead sings the first string of each pair and the lyre sounds both
    strings beneath it, an octave down, filling the long notes with a rising figure; `double` plays the song an octave
    below, `unison` at pitch and softer. A note of eight beats or more is a resting point, marked as a phrase end where it
    begins. Returns the beat it ends."""
    for line in lines:
        mel = [(m + 12 * octave, c) for m, _, c in line]
        melody(s, lead, b, mel, vel, ornament=ornament)
        if double:
            melody(s, double, b, [(m - 12, c) for m, c in mel], vel * 0.6, ornament=0)
        if unison:
            melody(s, unison, b, mel, vel * 0.6, ornament=0)
        t = b
        for m, low, c in line:
            if phrase and c >= 8 and t > b:
                s.phrase(t)
            s.note(lyre_inst, t, low - 12, 0, lyre_vel)
            s.note(lyre_inst, t + 0.03, m - 12, 0, lyre_vel * 0.8)
            if figure and c >= 3:
                lyre(s, t + 1, c - 1, [low - 12, m - 12, low], "rise", lyre_vel * 0.7, inst=lyre_inst)
            t += c
        if phrase:
            s.phrase(t)
        b = t
    return b
