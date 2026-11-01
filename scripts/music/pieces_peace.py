"""The pieces of peace and of the great moments that are not war: the Hymn to Nikkal (the first screen), the two calm
pieces, the last seasons, the chorale for a fallen king and the triumph. Each is a function of its variation (0, 1, 2):
the same music scored again, with another lead and another course, and some variations in a darker or brighter tuning
(`Score.shade`), which the player picks as the seat's situation worsens or improves (item 19+++).

The melodies are the Hurrian Hymn's (hymn.py) and new themes in the Babylonian tunings; nothing is Empire Earth's own.
"""

from __future__ import annotations

from hymn import Mode, hymn_in, shaded
from idiom import deg, length, open5, play_hymn, wide
from parts import choir, drone, drums, held, held_ramp, lyre, melody, pad, roots, strokes, swell
from score import Score


def _shade(s: Score, base: str, by: int) -> Mode:
    """The piece's tuning moved by the shade asked, marked on the score."""
    s.shade = by
    return shaded(base, by)


# 1. The Hymn to Nikkal (after Empire Earth's "Main Theme"): the first screen and the menus. The hymn whole: stated by one
# voice over the lyre, taken up by the strings with the frame drum, answered by a theme of our own, raised by all, and
# let go on the pipe. About two and a half minutes.
def hymn_theme(v: int) -> Score:
    s = Score(bpm=64, seed=100 + v)
    m = Mode(_shade(s, "nid_qablim", [0, -1, 0][v]), 69)  # the hymn's own tuning on A
    H = hymn_in(m)
    low = m(0, -2)
    lead1, lead2, lead3, lead4 = [("reed", "violins", "choir", "pipe"), ("choir", "reed", "violins", "recorder"), ("pipe", "recorder", "reed", "reed")][v]
    # The lyre tunes: a strum on the open strings, the drone, one voice humming.
    s.level(0, -7)
    s.hit("gong", 0, 0.2)
    drone(s, 0, 8, low, 0.36)
    lyre(s, 0, 4, [m(0, -1), m(4, -1), m(0), m(4)], "strum", 0.5)
    lyre(s, 4, 4, [m(0, -1), m(4, -1), m(0)], "strum", 0.42)
    choir(s, 1.5, 6.5, [m(0, -1)], 0.24, "u", 4)
    s.phrase(8)
    b = 8.0
    # I. Lines 1 and 2, one voice over the lyre.
    s.level(b, -5)
    drone(s, b, 27, low, 0.34)
    held(s, "violas", b, 27, m(0, -1), 0.2)
    b = play_hymn(s, b, H[0:2], lead1, 0.52, lyre_vel=0.42)
    # II. Lines 3 and 4: the strings take the song, the harp flows under it, the voices hold the chord, the drum begins.
    s.level(b, -3)
    drone(s, b, 34, low, 0.36)
    choir(s, b, 16, open5(m, 0, -1), 0.28, "o")
    choir(s, b + 16, 10, open5(m, -4, -1), 0.28, "o")
    choir(s, b + 26, 8, open5(m, 0, -1), 0.3, "o")
    lyre(s, b, 34, [m(0, -1), m(4, -1), m(0), m(2)], "wave", 0.3, inst="harp")
    drums(s, b, 34, "wahda", 0.3)
    b = play_hymn(s, b, H[2:4], lead2, 0.5, double="violas" if lead2 != "violins" else "celli", lyre_vel=0.34, figure=False)
    # III. An answer of our own, from the hymn's close (B A, B A): the strings, the horn beneath, the chord walking.
    s.level(b, -2)
    inter = [(1, 2), (0, 1), (1, 1), (2, 3), (1, 1), (0, 2), (-1, 1), (-3, 2), (-2, 1), (-1, 1), (0, 1)]
    for i, d in enumerate([0, -2, -1, 0]):
        pad(s, b + 4 * i, 4, wide(m, d, -2), 0.34 + 0.02 * i)
    held(s, "horn", b, 8, m(4, -1), 0.36)
    held(s, "horn", b + 8, 4, m(-1, -1), 0.36)
    held(s, "horn", b + 12, 4, m(4, -1), 0.4)
    melody(s, "violins", b, deg(m, inter), 0.5, ornament=0.2)
    melody(s, "celli", b, deg(m, [(0, 4), (-2, 4), (-1, 4), (0, 4)], -1), 0.36, ornament=0)
    drums(s, b, 16, "wahda", 0.32)
    s.phrase(b + 16)
    b += 16
    # IV. The height: lines 1 and 2 by all, the choir on the song, the horn's long notes, the drums in baladi.
    s.level(b - 1, -1)
    s.level(b, 0)
    s.hit("timpani", b, 0.55)
    s.hit("cymbal", b, 0.4)
    drone(s, b, 27, low, 0.48)
    pad(s, b, 8, wide(m, 0, -2), 0.44)
    pad(s, b + 8, 4, wide(m, 0, -2), 0.44)
    pad(s, b + 12, 3, wide(m, -2, -2), 0.44)
    pad(s, b + 15, 3, wide(m, -1, -2), 0.46)
    pad(s, b + 18, 3, wide(m, -2, -2), 0.46)
    pad(s, b + 21, 6, wide(m, 0, -2), 0.48)
    held(s, "horn", b, 12, m(4, -1), 0.42)
    held(s, "horn", b + 12, 6, m(-1, -1), 0.42)
    held(s, "horn", b + 18, 9, m(4, -1), 0.46)
    drums(s, b, 27, "baladi", 0.42, fill="darbuka")
    choir(s, b, 18, open5(m, 0, -1), 0.34, "a", 8)
    choir(s, b + 18, 9, open5(m, 0, -1), 0.34, "o", 8)
    b = play_hymn(s, b, H[0:2], lead3, 0.6, double="violas" if lead3 != "violins" else "celli", unison="reed" if lead3 != "reed" else None, ornament=0.3)
    # V. Lines 3 and 4 again, quietly: the pipe and the lyre alone, the voices humming.
    s.level(b + 1, -1)
    s.level(b + 3, -6)
    drone(s, b, 34, low, 0.3)
    choir(s, b, 34, [m(0, -1)], 0.22, "u", 4)
    b = play_hymn(s, b, H[2:4], lead4, 0.44, lyre_vel=0.36, ornament=0.6)
    # The going: the end of the last line, the lyre rising, a bell, the gong.
    s.level(b, -6)
    s.level(b + 14, -9)
    drone(s, b, 14, low, 0.3)
    tail = [(a, c) for a, _, c in H[3][-4:]]
    melody(s, lead4 if lead4 != "pipe" else "pipe", b + 1, tail, 0.42, ornament=0.4)
    lyre(s, b + 9, 4, [m(0, -2), m(4, -2), m(0, -1), m(4, -1), m(0)], "rise", 0.4, per_beat=2)
    s.hit("bells", b + 11, 0.3)
    s.note("lyre", b + 13, m(0, -1), 0, 0.45)
    s.hit("gong", b + 13, 0.16)
    s.phrase(b + 14)
    return s


# 2. The Brotherhood of Kings (after "Balance of Power"): calm; the great kings at peace, stately and warm. A theme of
# our own in išartum on D, in two halves and a middle, over the lyre's waves and the strings; a quiet reprise.
A_KINGS = [(4, 2), (5, 1), (6, 1), (7, 3), (6, 1), (4, 2), (2, 2), (1, 1), (2, 1), (0, 2)]
A2_KINGS = [(4, 2), (6, 1), (7, 1), (9, 3), (8, 1), (7, 2), (6, 1), (5, 1), (4, 4)]
B_KINGS = [(5, 3), (4, 1), (3, 2), (2, 2), (3, 1), (4, 1), (5, 2), (6, 1), (4, 3)]
B2_KINGS = [(7, 2), (6, 1), (5, 1), (4, 3), (3, 1), (2, 2), (1, 1), (2, 1), (0, 4)]


def kings(v: int) -> Score:
    s = Score(bpm=68, seed=200 + v)
    m = Mode(_shade(s, "isartum", [0, 1, -1][v]), 62)
    lead1, lead2 = [("recorder", "violins"), ("reed", "recorder"), ("violins", "reed")][v]
    below = {"recorder": "violas", "reed": "low_reed", "violins": "violas"}[lead1]  # the song an octave down
    low = m(0, -2)
    progA = roots(m, [0, 4, 3, 0])
    progA2 = roots(m, [0, 5, 3, 0])
    progB = roots(m, [3, 5, 0, 3])
    progB2 = roots(m, [4, 3, 5, 0])

    def waves(at: float, prog: list[int], vel: float, inst: str = "lyre") -> None:
        for i, d in enumerate(prog):
            lyre(s, at + 4 * i, 4, m.chord(d, "triad", -1), "wave", vel, inst=inst)

    def chords(at: float, prog: list[int], vel: float, full: bool = True) -> None:
        for i, d in enumerate(prog):
            pad(s, at + 4 * i, 4, wide(m, d, -2) if full else open5(m, d, -1), vel)

    # The harp alone, the bass beneath it, one bell.
    s.level(0, -6)
    waves(0, [0, 0], 0.4, "harp")
    held(s, "bass", 0, 8, low, 0.3)
    s.hit("bells", 0, 0.25)
    s.phrase(8)
    b = 8.0
    # A: the theme on one voice, the lyre's waves, the celli's fifth.
    s.level(b, -5)
    waves(b, progA, 0.38)
    chords(b, progA, 0.26, full=False)
    melody(s, lead1, b, deg(m, A_KINGS), 0.5)
    s.phrase(b + 16)
    b += 16
    # A': the answer, the strings widen, the horn holds the roots.
    s.level(b, -3)
    waves(b, progA2, 0.38)
    chords(b, progA2, 0.3)
    for i, d in enumerate(progA2):
        held(s, "horn", b + 4 * i, 4, m(d, -1), 0.3)
    melody(s, lead1, b, deg(m, A2_KINGS), 0.52)
    s.phrase(b + 16)
    b += 16
    # B: the middle, the celli walking the roots.
    s.level(b, -2)
    waves(b, progB, 0.36, "harp")
    chords(b, progB, 0.32)
    melody(s, "celli", b, deg(m, [(d, 4) for d in progB], -1), 0.34, ornament=0)
    melody(s, lead1, b, deg(m, B_KINGS), 0.52)
    melody(s, lead2, b + 8, deg(m, B_KINGS[4:], 0 if lead2 != "violins" else -1), 0.3, ornament=0)
    s.phrase(b + 16)
    b += 16
    # C: a dialogue, the pipe asking with the theme's head, the lyre answering, the drum soft beneath.
    s.level(b, -2)
    s.level(b + 2, -6)
    waves(b, progA, 0.34)
    held(s, "celli", b, 16, m(0, -1), 0.26)
    held(s, "bass", b, 16, low, 0.3)
    drums(s, b, 16, "wahda", 0.24)
    melody(s, "pipe", b, deg(m, A_KINGS[:4], 1), 0.42)
    for i, (d, c) in enumerate(A_KINGS[:4]):
        s.note("lyre", b + 8 + sum(x for _, x in A_KINGS[:i]), m(d), 0, 0.45)
    s.phrase(b + 16)
    b += 16
    # A'': the theme by all: the second voice takes it, the first answers below, the choir and the drum.
    s.level(b, -5)
    s.level(b + 1, -1)
    waves(b, progA, 0.4)
    chords(b, progA, 0.36)
    choir(s, b, 16, open5(m, 0, -1), 0.28, "o")
    drums(s, b, 16, "wahda", 0.3)
    melody(s, lead2, b, deg(m, A_KINGS), 0.54)
    melody(s, below, b, deg(m, A_KINGS, -1), 0.3, ornament=0)
    for i, d in enumerate(progA):
        held(s, "horn", b + 4 * i, 4, m(d + 4, -1), 0.28)
    s.phrase(b + 16)
    b += 16
    # B': the second half by all, the strings at their fullest.
    s.level(b, 0)
    waves(b, progB2, 0.4, "harp")
    chords(b, progB2, 0.4)
    choir(s, b, 8, open5(m, progB2[0], -1), 0.3, "o")
    choir(s, b + 8, 8, open5(m, 0, -1), 0.32, "a")
    drums(s, b, 16, "wahda", 0.32)
    melody(s, lead2, b, deg(m, B2_KINGS), 0.56)
    melody(s, below, b, deg(m, B2_KINGS, -1), 0.32, ornament=0)
    s.phrase(b + 16)
    b += 16
    # A''': the theme once more, the lyre alone, the voices humming.
    s.level(b, 0)
    s.level(b + 2, -6)
    waves(b, progA, 0.36)
    held(s, "bass", b, 16, low, 0.3)
    choir(s, b, 16, [m(0, -1)], 0.2, "u", 4)
    melody(s, lead1, b, deg(m, A_KINGS), 0.42, ornament=0.3)
    s.phrase(b + 16)
    b += 16
    # The close, slowing.
    s.level(b, -5)
    s.level(b + 10, -8)
    s.tempo_map = [(b, 58)]
    pad(s, b, 10, wide(m, 0, -2), 0.32)
    held(s, "bass", b, 10, low, 0.3)
    melody(s, lead1, b, deg(m, [(2, 2), (1, 2), (0, 5)]), 0.42, ornament=0)
    lyre(s, b + 4, 5, m.chord(0, "triad", -1) + [m(7, -1)], "rise", 0.36, inst="harp", per_beat=1)
    s.hit("bells", b + 8, 0.25)
    s.phrase(b + 10)
    return s


# 3. The River (after "Rivers"): calm; the Nile, the two rivers, the year's water. Lines 2 and 3 of the hymn in embūbum
# on F over the harp flowing in threes, and a pastoral theme of our own between them.
T_RIVER = [(0, 2), (1, 1), (2, 1), (4, 2), (3, 1), (2, 1), (1, 3), (2, 1), (0, 4)]
T2_RIVER = [(4, 2), (5, 1), (6, 1), (7, 2), (6, 1), (5, 1), (4, 3), (2, 1), (0, 4)]


def river(v: int) -> Score:
    s = Score(bpm=60, seed=300 + v)
    m = Mode(_shade(s, "embubum", [0, -1, 1][v]), 65)
    H = hymn_in(m, [1, 2])
    low = m(0, -2)
    lead1, lead2, lead3 = [("pipe", "violins", "recorder"), ("recorder", "reed", "pipe"), ("choir", "pipe", "violins")][v]
    flow = ["harp", "lyre", "psaltery"][v]

    def water(at: float, beats: float, d: int, vel: float = 0.32) -> None:
        lyre(s, at, beats, m.chord(d, "triad", -1) + [m(d + 7, -1)], "wave", vel, inst=flow, per_beat=3)

    def bed(at: float, beats: float, prog: list[int], vel: float = 0.26) -> None:
        for i, d in enumerate(prog):
            if 4 * i >= beats:
                break
            water(at + 4 * i, min(4, beats - 4 * i), d)
            pad(s, at + 4 * i, min(4, beats - 4 * i), open5(m, d, -1), vel)

    # The water first.
    s.level(0, -6)
    s.hit("ocean", 0, 0.3)
    held(s, "bass", 0, 8, low, 0.28)
    water(0, 8, 0, 0.3)
    s.phrase(8)
    b = 8.0
    # Line 2 of the hymn on the pipe.
    s.level(b, -5)
    bed(b, 9, roots(m, [0, 3, 0]))
    held(s, "bass", b, 9, low, 0.3)
    b = play_hymn(s, b, H[0:1], lead1, 0.46, octave=1 if lead1 != "choir" else 0, lyre_inst=flow if flow != "psaltery" else "lyre", figure=False, lyre_vel=0.3)
    # Line 3, the strings widening.
    s.level(b, -4)
    bed(b, 16, roots(m, [0, 3, 4, 0]), 0.3)
    held(s, "bass", b, 16, low, 0.32)
    held(s, "violas", b, 16, m(4, -1), 0.22)
    b = play_hymn(s, b, H[1:2], lead1, 0.48, octave=1 if lead1 != "choir" else 0, lyre_inst=flow if flow != "psaltery" else "lyre", figure=False, lyre_vel=0.3)
    # The water alone.
    s.level(b, -3)
    s.level(b + 2, -6)
    bed(b, 8, roots(m, [0, 3]))
    held(s, "bass", b, 8, low, 0.3)
    s.phrase(b + 8)
    b += 8
    # Our theme, by the second voice, the celli answering.
    s.level(b, -5)
    s.level(b + 2, -3)
    bed(b, 16, roots(m, [0, 3, 4, 0]), 0.3)
    held(s, "bass", b, 16, low, 0.32)
    melody(s, lead2, b, deg(m, T_RIVER, 1 if lead2 in ("pipe", "recorder") else 0), 0.5)
    melody(s, "celli", b + 8, deg(m, [(4, 2), (3, 2), (2, 2), (0, 2)], -1), 0.3, ornament=0)
    s.phrase(b + 16)
    b += 16
    # Line 2 again, by the third voice, the choir beneath.
    s.level(b, -2)
    bed(b, 9, roots(m, [0, 3, 0]), 0.3)
    held(s, "bass", b, 9, low, 0.32)
    choir(s, b, 9, open5(m, 0, -1), 0.26, "o")
    b = play_hymn(s, b, H[0:1], lead3, 0.5, octave=1 if lead3 in ("pipe", "recorder") else 0, lyre_inst=flow if flow != "psaltery" else "lyre", figure=False, lyre_vel=0.3)
    # Line 3 by all, the drum beneath the water.
    s.level(b, 0)
    bed(b, 16, roots(m, [0, 3, 4, 0]), 0.34)
    held(s, "bass", b, 16, low, 0.34)
    choir(s, b, 16, open5(m, 0, -1), 0.28, "o")
    drums(s, b, 16, "wahda", 0.26)
    held(s, "horn", b, 8, m(4, -1), 0.28)
    held(s, "horn", b + 8, 8, m(3, -1), 0.28)
    b = play_hymn(s, b, H[1:2], lead3, 0.52, octave=1 if lead3 in ("pipe", "recorder") else 0, double="violas" if lead3 != "violins" else "celli", lyre_inst=flow if flow != "psaltery" else "lyre", figure=False, lyre_vel=0.32)
    # The theme's second half, high, then the water carries it off.
    s.level(b, 0)
    s.level(b + 16, -4)
    bed(b, 16, roots(m, [3, 4, 3, 0]), 0.3)
    held(s, "bass", b, 16, low, 0.32)
    melody(s, lead2, b, deg(m, T2_RIVER), 0.5)
    melody(s, "violins" if lead2 != "violins" else "violas", b, deg(m, T2_RIVER, 0 if lead2 != "violins" else -1), 0.28, ornament=0)
    s.phrase(b + 16)
    b += 16
    s.tempo_map = [(b, 54)]
    bed(b, 12, roots(m, [0, 0, 0]), 0.26)
    held(s, "bass", b, 12, low, 0.3)
    melody(s, lead1, b, deg(m, [(2, 2), (1, 2), (0, 6)], 1 if lead1 in ("pipe", "recorder") else 0), 0.38, ornament=0.3)
    s.hit("ocean", b + 4, 0.25)
    s.hit("bells", b + 8, 0.2)
    s.phrase(b + 12)
    return s


# 4. The Last Seasons (after "Time"): the age near its end, and after it. The hymn slow over the lyre's measured
# strokes like a clock, the bells, the strings; reflective, broad.
def last(v: int) -> Score:
    s = Score(bpm=56, seed=400 + v)
    m = Mode(_shade(s, "nid_qablim", [0, -1, 0][v]), 69)
    H = hymn_in(m)
    low = m(0, -2)
    lead1, lead2, lead3 = [("pipe", "violins", "choir"), ("reed", "violas", "violins"), ("choir", "pipe", "reed")][v]

    def clock(at: float, beats: float, vel: float = 0.3) -> None:
        strokes(s, "lyre", at, beats, 1, vel, m(0, -1))
        strokes(s, "lyre", at + 2, beats - 2, 4, vel * 0.8, m(4, -2))

    def floor(at: float, beats: float, vel: float = 0.3) -> None:
        held(s, "bass", at, beats, low, vel)
        held(s, "celli", at, beats, m(4, -2), vel * 0.8)

    s.hit("gong", 0, 0.18)
    clock(0, 8)
    floor(0, 8)
    s.hit("bells", 4, 0.22)
    s.phrase(8)
    b = 8.0
    # Line 1 on the pipe.
    s.level(0, -7)
    s.level(b, -5)
    clock(b, 18)
    floor(b, 18)
    held(s, "violas", b, 18, m(0, -1), 0.18)
    b = play_hymn(s, b, H[0:1], lead1, 0.44, figure=False, lyre_vel=0.3, ornament=0.5)
    # Line 2, the strings widen.
    s.level(b, -4)
    clock(b, 9)
    floor(b, 9, 0.32)
    pad(s, b, 9, open5(m, -2, -1), 0.22)
    b = play_hymn(s, b, H[1:2], lead1, 0.46, figure=False, lyre_vel=0.3)
    # Lines 3 and 4 on the strings, the choir on the fifth, the bells every fourth stroke.
    s.level(b, -3)
    clock(b, 34, 0.32)
    floor(b, 34, 0.34)
    choir(s, b, 16, open5(m, 0, -1), 0.26, "o")
    choir(s, b + 16, 18, open5(m, -4, -1), 0.26, "o")
    strokes(s, "bells", b, 34, 8, 0.2)
    b = play_hymn(s, b, H[2:4], lead2, 0.48, figure=False, lyre_vel=0.3, double="celli" if lead2 != "violas" else None)
    # Between: the strings alone on the hymn's close turned over (A B, A B), the clock going on.
    s.level(b, -3)
    clock(b, 16, 0.3)
    floor(b, 16, 0.32)
    pad(s, b, 8, wide(m, 0, -2), 0.3)
    pad(s, b + 8, 4, wide(m, -2, -2), 0.3)
    pad(s, b + 12, 4, wide(m, -1, -2), 0.3)
    melody(s, "violins", b, deg(m, [(0, 3), (1, 1), (0, 2), (1, 2), (2, 3), (1, 1), (-1, 2), (0, 2)]), 0.4, ornament=0.2)
    s.phrase(b + 16)
    b += 16
    # Line 1 again by all, softly.
    s.level(b, 0)
    clock(b, 18, 0.32)
    floor(b, 18, 0.36)
    pad(s, b, 8, wide(m, 0, -2), 0.32)
    pad(s, b + 8, 10, wide(m, -4, -2), 0.32)
    choir(s, b, 18, open5(m, 0, -1), 0.3, "a" if lead3 != "choir" else "o")
    held(s, "horn", b, 18, m(4, -1), 0.3)
    b = play_hymn(s, b, H[0:1], lead3, 0.52, figure=False, lyre_vel=0.3, double="violas" if lead3 != "violas" else "celli", unison="violins" if lead3 == "choir" else None, ornament=0.3)
    # Line 4 once more, quietly, then the clock alone, running down.
    s.level(b, 0)
    s.level(b + 3, -6)
    s.level(b + 30, -10)
    clock(b, 18, 0.28)
    floor(b, 18, 0.3)
    choir(s, b, 18, [m(0, -1)], 0.2, "u", 4)
    b = play_hymn(s, b, H[3:4], lead1, 0.4, figure=False, lyre_vel=0.26, ornament=0.5)
    s.tempo_map = [(b, 48)]
    floor(b, 12, 0.28)
    strokes(s, "lyre", b, 8, 1, 0.3, m(0, -1))
    strokes(s, "lyre", b + 8, 4, 2, 0.26, m(0, -1))
    s.hit("bells", b + 4, 0.2)
    s.hit("bells", b + 10, 0.16)
    s.hit("gong", b + 11, 0.14)
    s.phrase(b + 12)
    return s


# 5. Solemn (after "Solemn"): a king is dead. A short chorale in nīd qablim on D, the choir and the strings.
PH1_SOLEMN = [(4, 4), (3, 2), (2, 2), (3, 3), (2, 1), (0, 4)]
PH2_SOLEMN = [(6, 2), (5, 2), (4, 4), (3, 2), (2, 1), (1, 1), (0, 4)]


def solemn(v: int) -> Score:
    s = Score(bpm=52, seed=500 + v)
    m = Mode(_shade(s, "nid_qablim", [0, -2, -2][v]), 62)
    lead = ["violins", "reed", "choir"][v]
    prog1 = roots(m, [0, 5, 3, 0])
    prog2 = roots(m, [6, 2, 3, 0])

    def chorale(at: float, prog: list[int], vel: float, vowel: str) -> None:
        for i, d in enumerate(prog):
            notes = wide(m, d, -2)
            pad(s, at + 4 * i, 4, notes, vel)
            choir(s, at + 4 * i, 4, [n for n in notes if n >= 50], vel * 0.9, vowel, 7)

    s.hit("gong", 0, 0.2)
    chorale(0, prog1, 0.32, "o")
    s.level(0, -3)
    s.level(16, -1)
    s.level(32, 0)
    s.level(40, -5)
    melody(s, lead, 0, deg(m, PH1_SOLEMN), 0.46 if lead != "choir" else 0.4, ornament=0)
    s.phrase(16)
    chorale(16, prog2, 0.36, "o")
    melody(s, lead, 16, deg(m, PH2_SOLEMN), 0.48 if lead != "choir" else 0.42, ornament=0)
    s.phrase(32)
    # Amen: the fourth, then the tonic, held.
    s.tempo_map = [(32, 46)]
    chorale(32, roots(m, [3, 0]), 0.3, "a")
    melody(s, lead, 32, deg(m, [(2, 4), (0, 4)]), 0.4, ornament=0)
    held(s, "bass", 32, 8, m(0, -2), 0.3)
    s.hit("bells", 36, 0.2)
    s.phrase(40)
    return s


# 6. Triumph (after "Arthurian"): land or a capital taken. The hymn's first two lines as a fanfare in išartum on D,
# trumpets and horns, the march, the sistrum, the choir; short and bright.
def triumph(v: int) -> Score:
    s = Score(bpm=92, seed=600 + v)
    m = Mode(_shade(s, "isartum", [0, 1, 1][v]), 74)
    H = hymn_in(m, [0, 1])
    lead1, lead2 = [("trumpet", "horn"), ("horn", "trumpet"), ("violins", "trumpet")][v]
    low = m(0, -3)

    def march(at: float, beats: float, vel: float) -> None:
        drums(s, at, beats, "march", vel, fill="tambourine")
        strokes(s, "sistrum", at, beats, 2, vel * 0.7)
        pad(s, at, beats, wide(m, 0, -3), vel * 0.85)
        held(s, "bass", at, beats, low, vel * 0.9)

    s.hit("cymbal", 0, 0.55)
    s.hit("timpani", 0, 0.75)
    s.level(0, -1)
    s.level(31, -3)
    s.level(39, 0)
    s.hit("sistrum", 0, 0.6)
    pad(s, 0, 4, wide(m, 0, -3), 0.5)
    held(s, "horn", 0, 4, m(4, -2), 0.58)
    held(s, "trumpet", 0.5, 3.5, m(0, -1), 0.55)
    s.phrase(4)
    b = 4.0
    for k, line in enumerate(H):
        n = sum(c for _, _, c in line)
        march(b, n, 0.52)
        melody(s, lead1, b, [(a - (12 if lead1 == "horn" else 0), c) for a, _, c in line], 0.64, ornament=0)
        melody(s, lead2, b, [(a - (12 if lead2 == "horn" else 0), c) for a, _, c in line], 0.42, ornament=0)
        choir(s, b, n, open5(m, 0, -2), 0.42, "a", 8)
        b += n
        s.phrase(b)
    # Between: the drums and the horns' call on the fifth and the octave.
    march(b, 8, 0.5)
    melody(s, "horn", b, deg(m, [(4, 1), (7, 1), (4, 2), (None, 1), (4, 1), (7, 1), (9, 2)], -2), 0.56, ornament=0)
    melody(s, "trumpet", b + 4, deg(m, [(4, 1), (7, 1), (9, 2)], -1), 0.5, ornament=0)
    s.hit("timpani", b, 0.6)
    s.hit("timpani", b + 4, 0.6)
    s.phrase(b + 8)
    b += 8
    # The lines again, the trumpets and the horns together, the strings on the song.
    for k, line in enumerate(H):
        n = sum(c for _, _, c in line)
        march(b, n, 0.56)
        melody(s, "trumpet", b, [(a, c) for a, _, c in line], 0.62, ornament=0)
        melody(s, "horn", b, [(a - 12, c) for a, _, c in line], 0.5, ornament=0)
        melody(s, "violins", b, [(a, c) for a, _, c in line], 0.4, ornament=0)
        choir(s, b, n, wide(m, 0, -2)[1:], 0.44, "a", 8)
        b += n
        s.phrase(b)
    # The close: the tonic held by all, a roll and the great drum.
    s.hit("timpani_roll", b - 2, 0.5)
    pad(s, b, 7, wide(m, 0, -3), 0.55)
    held(s, "horn", b, 7, m(0, -2), 0.6)
    held(s, "trumpet", b, 7, m(4, -1), 0.55)
    choir(s, b, 7, open5(m, 0, -2) + [m(0, -1)], 0.5, "a", 8)
    s.hit("cymbal", b, 0.55)
    s.hit("big_drum", b, 0.8)
    s.hit("sistrum", b, 0.5)
    s.phrase(b + 7)
    return s
