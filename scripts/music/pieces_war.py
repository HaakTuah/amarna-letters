"""The pieces of unease, war and loss: the three of rising tension, the war march, the battle, the siege, the city's
fall and the lament. Each is a function of its variation (0, 1, 2): the same music scored again, with another lead and
another course, and some variations in a darker tuning (`Score.shade`), which the player picks as the seat's situation
worsens (item 19+++). The melodies are the Hurrian Hymn's and new themes in the Babylonian tunings; nothing is Empire
Earth's own.
"""

from __future__ import annotations

from hymn import Mode, hymn_in, shaded
from idiom import deg, open5, play_hymn, wide
from parts import choir, drone, drums, held, held_ramp, lyre, melody, ostinato, pad, roots, strokes, swell, trem
from score import Score


def _shade(s: Score, base: str, by: int) -> Mode:
    s.shade = by
    return shaded(base, by)


# 7. Envoys (after "Pawns"): measured unease, pieces moved on a board; letters, envoys and spies. A question on the reed
# in pītum on G over a walking pizzicato and the darbuka, answered low, never resolved.
Q_ENVOYS = [(0, 1), (2, 1), (4, 2), (3, 1), (2, 1), (5, 2), (None, 1), (4, 1), (2, 1), (1, 3), (None, 2)]
A_ENVOYS = [(4, 2), (3, 1), (2, 1), (0, 2), (-1, 2), (0, 1), (1, 1), (2, 2), (None, 1), (-2, 1), (0, 2)]
Q2_ENVOYS = [(4, 1), (5, 1), (7, 2), (6, 1), (5, 1), (4, 2), (None, 1), (5, 1), (4, 1), (2, 1), (3, 3), (None, 1)]


def envoys(v: int) -> Score:
    s = Score(bpm=88, seed=700 + v)
    m = Mode(_shade(s, "pitum", [0, -1, -2][v]), 67)
    ask, answer = [("reed", "low_reed"), ("pipe", "celli"), ("violins", "low_reed")][v]
    progQ, progA, progQ2 = roots(m, [0, 0, 3, 4]), roots(m, [0, 6, 3, 0]), roots(m, [3, 4, 6, 0])

    def walk(at: float, prog: list[int], vel: float = 0.46) -> None:
        for i, d in enumerate(prog):
            ostinato(s, "celli_pizz", at + 4 * i, 4, [(m(d, -1), 1), (m(d, -1), 1), (m(d + 4, -1) if m.name != "nis_tuhrim" or d % 7 != 4 else m(d + 3, -1), 1), (m(d, -1), 1)], vel)
        held(s, "bass", at, 4 * len(prog), m(prog[0], -2), 0.3)

    def floor(at: float, prog: list[int], vel: float = 0.24) -> None:
        for i, d in enumerate(prog):
            pad(s, at + 4 * i, 4, open5(m, d, -1), vel)

    def beat(at: float, beats: float, vel: float = 0.38) -> None:
        drums(s, at, beats, "maqsum", vel, deep="darbuka", rim="darbuka_tek", fill="shaker")

    def strums(at: float, prog: list[int], vel: float = 0.34) -> None:
        for i, d in enumerate(prog):
            lyre(s, at + 4 * i, 2, m.chord(d, "open", -1) + [m(d + 7, -1)], "strum", vel, inst="harp")

    # The board is set: the walk, the drum, the harp's strokes.
    s.level(0, -5)
    walk(0, progQ[:2])
    beat(0, 8)
    strums(0, progQ[:2])
    s.phrase(8)
    b = 8.0
    # The question.
    s.level(b, -4)
    walk(b, progQ)
    beat(b, 16)
    strums(b, progQ)
    melody(s, ask, b, deg(m, Q_ENVOYS, 1 if ask == "pipe" else 0), 0.5, ornament=0.3)
    s.phrase(b + 16)
    b += 16
    # The answer, low, the strings' fifth beneath.
    s.level(b, -4)
    walk(b, progA)
    beat(b, 16, 0.34)
    floor(b, progA)
    melody(s, answer, b, deg(m, A_ENVOYS, -1), 0.46, ornament=0.2)
    s.phrase(b + 16)
    b += 16
    # The question again, higher.
    s.level(b, -2)
    walk(b, progQ2)
    beat(b, 16)
    strums(b, progQ2)
    floor(b, progQ2)
    melody(s, ask, b, deg(m, Q2_ENVOYS, 1 if ask == "pipe" else 0), 0.52, ornament=0.3)
    s.phrase(b + 16)
    b += 16
    # Between: the strings whisper, the walk goes on alone, the pipe hints at the question.
    s.level(b, -2)
    s.level(b + 2, -7)
    walk(b, roots(m, [0, 6, 0, 6]), 0.4)
    trem(s, b, 16, [m(0, -1), m(4, -1), m(0)], 0.26)
    strokes(s, "bells", b + 2, 14, 6, 0.18)
    melody(s, "pipe" if ask != "pipe" else "recorder", b + 4, deg(m, Q_ENVOYS[:3], 1), 0.36, ornament=0)
    melody(s, "pipe" if ask != "pipe" else "recorder", b + 10, deg(m, Q_ENVOYS[:3], 1), 0.34, ornament=0)
    s.phrase(b + 16)
    b += 16
    # The question by the strings, the reed answering under it.
    s.level(b, -6)
    s.level(b + 2, -2)
    walk(b, progQ)
    beat(b, 16, 0.4)
    strums(b, progQ)
    floor(b, progQ, 0.28)
    melody(s, "violins" if ask != "violins" else "reed", b, deg(m, Q_ENVOYS, 0), 0.5, ornament=0.2)
    melody(s, answer, b + 8, deg(m, A_ENVOYS[:4], -1), 0.4, ornament=0)
    s.phrase(b + 16)
    b += 16
    # The answer by all.
    s.level(b, 0)
    walk(b, progA)
    beat(b, 16, 0.4)
    floor(b, progA, 0.3)
    strums(b, progA, 0.3)
    melody(s, answer, b, deg(m, A_ENVOYS, -1), 0.48, ornament=0.2)
    melody(s, "violas", b, deg(m, A_ENVOYS, 0), 0.3, ornament=0)
    s.phrase(b + 16)
    b += 16
    # The second question once more, then the walk alone, and a chord left open.
    s.level(b, 0)
    s.level(b + 16, -2)
    s.level(b + 18, -7)
    walk(b, progQ2)
    beat(b, 16, 0.38)
    strums(b, progQ2)
    melody(s, ask, b, deg(m, Q2_ENVOYS, 1 if ask == "pipe" else 0), 0.5, ornament=0.3)
    s.phrase(b + 16)
    b += 16
    walk(b, roots(m, [0, 0]), 0.36)
    beat(b, 6, 0.3)
    trem(s, b, 8, [m(0, -1), m(4, -1)], 0.22)
    lyre(s, b + 6, 2, open5(m, 0, -1) + [m(1), m(5)], "strum", 0.4, inst="harp")
    s.hit("bells", b + 6, 0.2)
    s.phrase(b + 8)
    return s


# 8. Shadows (after "Shadows"): dark and watchful; omens, spies, a court that fears. A low motif in nīš tuḫrim on E over
# tremolo strings, bells off the beat and a distant drum.
M_SHADOWS = [(0, 3), (1, 1), (0, 2), (-2, 2), (None, 2), (0, 2), (1, 1), (2, 2), (1, 1)]
M2_SHADOWS = [(4, 2), (3, 2), (2, 2), (1, 2), (0, 2), (None, 2), (-3, 2), (0, 2)]


def shadows(v: int) -> Score:
    s = Score(bpm=54, seed=800 + v)
    m = Mode(_shade(s, "nis_tuhrim", [0, -1, -2][v]), 52)
    lead, octave = [("low_reed", 0), ("reed", 1), ("celli", 0)][v]
    low = [m(0, -1), m(4, -1), m(0)]

    def bed(at: float, beats: float, vel: float, high: bool = False) -> None:
        trem(s, at, beats, low, vel)
        if high:
            trem(s, at, beats, [m(0, 2), m(4, 1)], vel * 0.7)
        strokes(s, "bells", at + 3, beats - 3, 6, 0.2)
        strokes(s, "big_drum", at, beats, 8, 0.3)

    bed(0, 8, 0.24)
    s.level(0, -6)
    held(s, "bass", 0, 8, m(0, -2) if m(0, -2) >= 28 else m(0, -1), 0.3)
    s.phrase(8)
    b = 8.0
    # The motif.
    s.level(b, -5)
    bed(b, 16, 0.26)
    melody(s, lead, b, deg(m, M_SHADOWS, octave), 0.46, ornament=0.3)
    s.phrase(b + 16)
    b += 16
    # Again, the celli beneath it and the voices humming.
    s.level(b, -4)
    bed(b, 16, 0.28)
    choir(s, b, 16, [m(0), m(4)], 0.22, "u", 5)
    melody(s, lead, b, deg(m, M_SHADOWS, octave), 0.48, ornament=0.3)
    melody(s, "celli" if lead != "celli" else "violas", b, deg(m, M_SHADOWS, 0 if lead != "celli" else 1), 0.28, ornament=0)
    s.phrase(b + 16)
    b += 16
    # The second motif, falling.
    s.level(b, -3)
    bed(b, 16, 0.3)
    choir(s, b, 16, [m(0), m(4)], 0.24, "o", 5)
    melody(s, lead, b, deg(m, M2_SHADOWS, octave), 0.5, ornament=0.3)
    s.phrase(b + 16)
    b += 16
    # Between: the strings alone, swelling and falling back, the horn low on the tonic.
    s.level(b, -3)
    s.level(b + 8, 0)
    s.level(b + 16, -5)
    swell(s, b, 8, wide(m, 0, -1), 0.2, 0.4)
    swell(s, b + 8, 8, wide(m, -2, -1), 0.4, 0.22)
    held(s, "horn", b, 16, m(0, 0), 0.26)
    strokes(s, "bells", b + 3, 13, 6, 0.2)
    strokes(s, "big_drum", b, 16, 8, 0.32)
    s.phrase(b + 16)
    b += 16
    # The motif high, the whole bed under it.
    s.level(b + 1, -2)
    bed(b, 16, 0.32, high=True)
    choir(s, b, 16, open5(m, 0, 0), 0.28, "o", 6)
    melody(s, "reed" if lead != "reed" else "violins", b, deg(m, M_SHADOWS, 1), 0.5, ornament=0.3)
    melody(s, lead, b, deg(m, M_SHADOWS, octave), 0.3, ornament=0)
    s.phrase(b + 16)
    b += 16
    # The second motif by all, then the bed thins to the bells.
    s.level(b, 0)
    s.level(b + 16, -2)
    s.level(b + 20, -8)
    s.level(b + 32, -12)
    bed(b, 16, 0.34, high=True)
    choir(s, b, 16, open5(m, 0, 0), 0.3, "o", 6)
    held(s, "horn", b, 8, m(4, 0), 0.3)
    held(s, "horn", b + 8, 8, m(0, 0), 0.3)
    melody(s, lead, b, deg(m, M2_SHADOWS, octave), 0.5, ornament=0.3)
    melody(s, "violins", b, deg(m, M2_SHADOWS, 1), 0.3, ornament=0)
    s.phrase(b + 16)
    b += 16
    trem(s, b, 16, low, 0.22)
    strokes(s, "bells", b + 3, 13, 6, 0.2)
    s.hit("big_drum", b, 0.3)
    s.hit("big_drum", b + 8, 0.24)
    melody(s, lead, b + 8, deg(m, [(1, 2), (0, 6)], octave), 0.36, ornament=0)
    s.phrase(b + 16)
    return s


# 9. Enmity (after "Emnity"): the deepest tension, a war not yet begun; the longest piece. A heartbeat on the frame drum
# under a low motif in nīd qablim on A, the strings swelling to a height and falling back to the heartbeat alone.
L_ENMITY = [(0, 4), (-1, 2), (0, 2), (2, 3), (1, 1), (0, 4)]
L2_ENMITY = [(0, 2), (2, 2), (3, 2), (4, 4), (3, 2), (2, 2), (0, 2)]
C_ENMITY = [(4, 3), (5, 1), (4, 2), (2, 2), (3, 3), (2, 1), (1, 2), (0, 2)]


def enmity(v: int) -> Score:
    s = Score(bpm=60, seed=900 + v)
    m = Mode(_shade(s, "nid_qablim", [0, -1, -2][v]), 57)
    lowv, highv = [("celli", "violins"), ("low_reed", "reed"), ("celli", "horn")][v]
    low = m(0, -1)

    def heart(at: float, beats: float, vel: float = 0.36) -> None:
        drums(s, at, beats, "heart", vel)

    heart(0, 8)
    drone(s, 0, 8, low, 0.32)
    s.level(0, -8)
    s.phrase(8)
    b = 8.0
    # The low motif.
    s.level(b, -7)
    heart(b, 16)
    drone(s, b, 16, low, 0.34)
    melody(s, lowv, b, deg(m, L_ENMITY), 0.44, ornament=0.2)
    s.phrase(b + 16)
    b += 16
    # Again, the violas an octave above, the bells.
    s.level(b, -6)
    heart(b, 16)
    drone(s, b, 16, low, 0.34)
    pad(s, b, 16, [m(4, -1)], 0.22)
    melody(s, lowv, b, deg(m, L_ENMITY), 0.46, ornament=0.2)
    melody(s, "violas", b, deg(m, L_ENMITY, 1), 0.26, ornament=0)
    strokes(s, "bells", b + 4, 12, 8, 0.18)
    s.phrase(b + 16)
    b += 16
    # Rising: the second motif, the horn's long notes, the strings swelling.
    s.level(b, -5)
    s.level(b + 16, -2)
    heart(b, 16, 0.4)
    drone(s, b, 16, low, 0.36)
    swell(s, b, 16, wide(m, 0, -1), 0.22, 0.42)
    held(s, "horn", b, 8, m(4, 0), 0.3)
    held_ramp(s, "horn", b + 8, 8, m(5, 0), 0.3, 0.44)
    melody(s, lowv, b, deg(m, L2_ENMITY), 0.5, ornament=0.2)
    s.phrase(b + 16)
    b += 16
    # The height: the theme above, the full chord, tremolo, the voices.
    s.level(b, -1)
    heart(b, 16, 0.44)
    drone(s, b, 16, low, 0.42)
    for i, d in enumerate(roots(m, [0, 5, 6, 0])):
        pad(s, b + 4 * i, 4, wide(m, d, -1), 0.42)
    trem(s, b, 16, [m(0, 2), m(4, 1)], 0.26)
    choir(s, b, 16, open5(m, 0, 0), 0.32, "o", 7)
    melody(s, highv, b, deg(m, C_ENMITY, 1 if highv != "horn" else 0), 0.56, ornament=0.3)
    s.phrase(b + 16)
    b += 16
    # Higher still: the theme again, the horn doubling, the timpani, the voices open.
    s.level(b, 0)
    heart(b, 16, 0.46)
    drone(s, b, 16, low, 0.44)
    for i, d in enumerate(roots(m, [5, 6, 5, 0])):
        pad(s, b + 4 * i, 4, wide(m, d, -1), 0.46)
    trem(s, b, 16, [m(0, 2), m(4, 1)], 0.3)
    choir(s, b, 16, open5(m, 0, 0) + [m(7, 0)], 0.38, "a", 8)
    melody(s, highv, b, deg(m, C_ENMITY, 1 if highv != "horn" else 0), 0.6, ornament=0.3)
    melody(s, "horn" if highv != "horn" else "celli", b, deg(m, C_ENMITY, 0), 0.4, ornament=0)
    strokes(s, "timpani", b, 16, 4, 0.5)
    s.hit("cymbal", b, 0.4)
    s.phrase(b + 16)
    b += 16
    # Falling back: the chord thins, the heartbeat shows through.
    s.level(b, 0)
    s.level(b + 16, -7)
    heart(b, 16, 0.4)
    drone(s, b, 16, low, 0.36)
    swell(s, b, 16, wide(m, 0, -1), 0.4, 0.18)
    held_ramp(s, "horn", b, 8, m(4, 0), 0.4, 0.2)
    melody(s, "violas", b + 8, deg(m, L_ENMITY[:3], 0), 0.3, ornament=0)
    s.phrase(b + 16)
    b += 16
    # The low motif alone again.
    s.level(b, -8)
    heart(b, 16)
    drone(s, b, 16, low, 0.32)
    melody(s, lowv, b, deg(m, L_ENMITY), 0.42, ornament=0.2)
    s.phrase(b + 16)
    b += 16
    # A second rising, shorter and darker, on the sixth and the seventh.
    s.level(b, -7)
    s.level(b + 16, -2)
    heart(b, 16, 0.42)
    drone(s, b, 16, low, 0.38)
    for i, d in enumerate(roots(m, [5, 6, 5, 6])):
        swell(s, b + 4 * i, 4, wide(m, d, -1), 0.26 + 0.05 * i, 0.3 + 0.05 * i)
    trem(s, b + 8, 8, [m(0, 2), m(4, 1)], 0.28)
    melody(s, lowv, b, deg(m, L2_ENMITY), 0.5, ornament=0.2)
    melody(s, "violas", b + 8, deg(m, L2_ENMITY[4:], 1), 0.3, ornament=0)
    s.phrase(b + 16)
    b += 16
    # The second height, and the long fall to the heartbeat.
    s.level(b, 0)
    s.level(b + 16, -1)
    s.level(b + 32, -9)
    s.level(b + 40, -14)
    heart(b, 16, 0.46)
    drone(s, b, 16, low, 0.42)
    for i, d in enumerate(roots(m, [0, 5, 6, 0])):
        pad(s, b + 4 * i, 4, wide(m, d, -1), 0.44)
    choir(s, b, 16, open5(m, 0, 0), 0.34, "o", 7)
    melody(s, highv, b, deg(m, C_ENMITY, 1 if highv != "horn" else 0), 0.58, ornament=0.3)
    melody(s, lowv, b, deg(m, C_ENMITY, 0 if lowv != "celli" else -1), 0.34, ornament=0)
    strokes(s, "timpani", b, 16, 8, 0.45)
    s.phrase(b + 16)
    b += 16
    heart(b, 16, 0.36)
    drone(s, b, 16, low, 0.32)
    swell(s, b, 12, wide(m, 0, -1), 0.36, 0.14)
    choir(s, b, 8, [m(0, 0)], 0.22, "u", 4)
    s.phrase(b + 16)
    b += 16
    heart(b, 8, 0.3)
    held_ramp(s, "bass", b, 8, m(0, -2) if m(0, -2) >= 28 else low, 0.3, 0.1)
    s.hit("bells", b + 4, 0.16)
    s.phrase(b + 8)
    return s


# 10. Chariots (after "Honor"): the war, martial and noble. A march theme in pītum on D on the horn, the trumpet
# answering, over frame drums and the darbuka's chariot rhythm, pizzicato and the strings.
TH_CHARIOTS = [(0, 2), (4, 1), (4, 1), (5, 2), (4, 2), (2, 2), (3, 1), (4, 1), (0, 4)]
TH2_CHARIOTS = [(4, 2), (6, 1), (7, 1), (6, 2), (4, 2), (5, 2), (4, 1), (2, 1), (0, 4)]
TA_CHARIOTS = [(7, 1), (None, 1), (7, 1), (None, 1), (9, 2), (7, 2), (6, 1), (5, 1), (4, 2), (None, 4)]


def chariots(v: int) -> Score:
    s = Score(bpm=96, seed=1000 + v)
    m = Mode(_shade(s, "pitum", [0, -1, -2][v]), 62)
    lead, answer = [("horn", "trumpet"), ("reed", "horn"), ("violins", "trumpet")][v]
    progT, progT2, progA = roots(m, [0, 0, 3, 0]), roots(m, [3, 4, 3, 0]), roots(m, [0, 6, 3, 0])

    def march(at: float, beats: float, vel: float) -> None:
        drums(s, at, beats, "march", vel)
        drums(s, at, beats, "chariot", vel * 0.7, deep="darbuka", rim="darbuka_tek")

    def ground(at: float, prog: list[int], vel: float, full: bool = False) -> None:
        for i, d in enumerate(prog):
            ostinato(s, "celli_pizz", at + 4 * i, 4, [(m(d, -1), 1), (m(d, -1), 1), (m(d, -1), 1), (m(d, -1), 1)], vel)
            pad(s, at + 4 * i, 4, wide(m, d, -2) if full else open5(m, d, -1), vel * 0.7)
        held(s, "bass", at, 4 * len(prog), m(prog[0], -2), vel * 0.8)

    # The drums come first.
    s.level(0, -4)
    march(0, 8, 0.5)
    s.hit("timpani", 0, 0.6)
    s.hit("timpani", 4, 0.5)
    ostinato(s, "celli_pizz", 4, 4, [(m(0, -1), 1)], 0.44)
    s.phrase(8)
    b = 8.0
    # The theme on the horn.
    s.level(b, -3)
    march(b, 16, 0.5)
    ground(b, progT, 0.44)
    melody(s, lead, b, deg(m, TH_CHARIOTS), 0.58, ornament=0)
    s.phrase(b + 16)
    b += 16
    # The trumpet's answer.
    s.level(b, -3)
    march(b, 16, 0.5)
    ground(b, progA, 0.46)
    melody(s, answer, b, deg(m, TA_CHARIOTS), 0.56, ornament=0)
    melody(s, "violas", b + 8, deg(m, TH_CHARIOTS[:4], 0), 0.3, ornament=0)
    s.phrase(b + 16)
    b += 16
    # The theme's second half, the strings widening.
    s.level(b, -2)
    march(b, 16, 0.52)
    ground(b, progT2, 0.48, full=True)
    melody(s, lead, b, deg(m, TH2_CHARIOTS), 0.6, ornament=0)
    melody(s, "violins" if lead != "violins" else "violas", b, deg(m, TH2_CHARIOTS, 0 if lead != "violins" else -1), 0.32, ornament=0)
    s.phrase(b + 16)
    b += 16
    # Between: the pipe over the pizzicato alone, the drums quiet.
    s.level(b, -2)
    s.level(b + 2, -7)
    ground(b, progT, 0.42)
    drums(s, b, 16, "wahda", 0.36)
    melody(s, "pipe", b, deg(m, TH_CHARIOTS, 1), 0.46, ornament=0.2)
    s.phrase(b + 16)
    b += 16
    # The drums and the timpani alone, calling the whole in.
    s.level(b, -5)
    s.level(b + 8, -1)
    march(b, 8, 0.56)
    strokes(s, "timpani", b, 8, 2, 0.55)
    ostinato(s, "celli_pizz", b, 8, [(m(0, -1), 1)], 0.46)
    held(s, "bass", b, 8, m(0, -2), 0.4)
    s.hit("cymbal", b + 6, 0.4)
    s.phrase(b + 8)
    b += 8
    # The theme by all: the trumpet and the horn in octaves, the strings on the song, the voices.
    s.level(b, 0)
    march(b, 16, 0.56)
    ground(b, progT, 0.5, full=True)
    melody(s, "trumpet", b, deg(m, TH_CHARIOTS), 0.6, ornament=0)
    melody(s, "horn", b, deg(m, TH_CHARIOTS, 0 if lead != "horn" else -1), 0.52, ornament=0)
    melody(s, "violins", b, deg(m, TH_CHARIOTS), 0.38, ornament=0)
    choir(s, b, 16, open5(m, 0, -1), 0.36, "a", 8)
    strokes(s, "timpani", b, 16, 4, 0.5)
    s.phrase(b + 16)
    b += 16
    # The second half by all.
    march(b, 16, 0.58)
    ground(b, progT2, 0.52, full=True)
    melody(s, "trumpet", b, deg(m, TH2_CHARIOTS), 0.6, ornament=0)
    melody(s, "horn", b, deg(m, TH2_CHARIOTS, -1), 0.52, ornament=0)
    melody(s, "violins", b, deg(m, TH2_CHARIOTS), 0.38, ornament=0)
    choir(s, b, 16, open5(m, 0, -1) + [m(0, 0)], 0.38, "a", 8)
    strokes(s, "timpani", b, 16, 4, 0.5)
    s.phrase(b + 16)
    b += 16
    # The answer once more, the horn beneath, then the close on the tonic.
    s.level(b, 0)
    s.level(b + 16, -1)
    s.level(b + 24, 0)
    march(b, 16, 0.54)
    ground(b, progA, 0.48, full=True)
    melody(s, answer, b, deg(m, TA_CHARIOTS), 0.56, ornament=0)
    melody(s, "horn" if answer != "horn" else "trumpet", b, deg(m, [(4, 4), (6, 4), (3, 4), (4, 2), (0, 2)], -1 if answer != "horn" else 0), 0.4, ornament=0)
    s.phrase(b + 16)
    b += 16
    march(b, 8, 0.56)
    pad(s, b, 8, wide(m, 0, -2), 0.5)
    held(s, "horn", b, 8, m(0, -1), 0.55)
    held(s, "trumpet", b, 8, m(4, 0), 0.5)
    held(s, "bass", b, 8, m(0, -2), 0.45)
    s.hit("timpani", b, 0.6)
    s.hit("cymbal", b, 0.45)
    s.hit("big_drum", b + 7, 0.6)
    s.phrase(b + 8)
    return s


# 11. Battle (after "Battle"): driving, hard. A low ostinato in nīš tuḫrim on E, the big drum's gallop, horn calls, the
# trumpet's cry and the tremolo's semitone above, the choir in short cries.
OST_BATTLE = [(0, 0.5), (0, 0.5), (1, 0.5), (0, 0.5), (2, 0.5), (1, 0.5), (0, 0.5), (-1, 0.5)]
HC_BATTLE = [(4, 1), (7, 1), (8, 2), (7, 1), (4, 1), (7, 2), (None, 2), (8, 1), (9, 1), (10, 2), (8, 1), (7, 1)]
TC_BATTLE = [(10, 2), (9, 1), (8, 1), (7, 2), (8, 2), (7, 1), (4, 1), (7, 4), (None, 2)]


def battle(v: int) -> Score:
    s = Score(bpm=126, seed=1100 + v)
    m = Mode(_shade(s, "nis_tuhrim", [0, -2, -2][v]), 40)
    call, cry = [("horn", "trumpet"), ("trumpet", "horn"), ("horn", "violins")][v]

    def gallop(at: float, beats: float, vel: float) -> None:
        drums(s, at, beats, "gallop", vel, deep="big_drum", rim="frame_mute")
        drums(s, at, beats, "march", vel * 0.6, deep="frame_lo", rim="frame_hi")

    def ost(at: float, beats: float, vel: float, high: bool = False) -> None:
        ostinato(s, "bass", at, beats, deg(m, OST_BATTLE), vel)
        ostinato(s, "celli", at, beats, deg(m, OST_BATTLE, 1), vel * 0.9)
        if high:
            ostinato(s, "violas", at, beats, deg(m, OST_BATTLE, 2), vel * 0.7)

    def rub(at: float, beats: float, vel: float) -> None:
        for t in range(0, int(beats), 4):
            trem(s, at + t, 2, [m(0, 3), m(4, 2)], vel)
            trem(s, at + t + 2, 2, [m(1, 3), m(4, 2)], vel)

    def cries(at: float, beats: float, vel: float) -> None:
        for t in range(0, int(beats), 4):
            choir(s, at + t, 1, [m(0, 2), m(4, 2)], vel, "a", 8)

    gallop(0, 8, 0.56)
    s.hit("timpani", 0, 0.8)
    s.level(0, -3)
    s.level(8, -4)
    s.level(24, -3)
    s.level(56, -1)
    s.level(72, -3)
    s.level(80, 0)
    s.level(96, -4)
    s.level(112, -2)
    s.level(128, 0)
    s.hit("timpani", 4, 0.7)
    s.hit("cymbal", 0, 0.5)
    s.phrase(8)
    b = 8.0
    ost(b, 16, 0.52)
    gallop(b, 16, 0.56)
    s.phrase(b + 16)
    b += 16
    # The horn's call over the ostinato.
    ost(b, 16, 0.52)
    gallop(b, 16, 0.56)
    melody(s, call, b, deg(m, HC_BATTLE, 1 if call == "horn" else 2), 0.6, ornament=0)
    strokes(s, "timpani", b, 16, 4, 0.6)
    s.phrase(b + 16)
    b += 16
    # The tremolo's rub above, the call again.
    ost(b, 16, 0.54, high=True)
    gallop(b, 16, 0.58)
    rub(b, 16, 0.3)
    melody(s, call, b, deg(m, HC_BATTLE, 1 if call == "horn" else 2), 0.62, ornament=0)
    strokes(s, "timpani", b, 16, 4, 0.6)
    s.phrase(b + 16)
    b += 16
    # The cry: the trumpet and the voices.
    ost(b, 16, 0.56, high=True)
    gallop(b, 16, 0.6)
    rub(b, 16, 0.32)
    melody(s, cry, b, deg(m, TC_BATTLE, 2 if cry != "horn" else 1), 0.64, ornament=0)
    cries(b, 16, 0.5)
    strokes(s, "timpani", b, 16, 2, 0.55)
    s.phrase(b + 16)
    b += 16
    # A break: drums alone and a roll.
    gallop(b, 8, 0.6)
    s.hit("timpani_roll", b + 4, 0.6)
    ostinato(s, "bass", b, 8, [(m(0, 0), 1)], 0.5)
    s.phrase(b + 8)
    b += 8
    # Call and cry together.
    ost(b, 16, 0.58, high=True)
    gallop(b, 16, 0.62)
    rub(b, 16, 0.34)
    melody(s, call, b, deg(m, HC_BATTLE, 1 if call == "horn" else 2), 0.62, ornament=0)
    melody(s, cry, b, deg(m, TC_BATTLE, 2 if cry != "horn" else 1), 0.6, ornament=0)
    cries(b, 16, 0.52)
    strokes(s, "timpani", b, 16, 2, 0.6)
    s.hit("cymbal", b, 0.5)
    s.phrase(b + 16)
    b += 16
    # The ostinato alone, the drums thinning, a second wave gathering.
    ost(b, 16, 0.5)
    drums(s, b, 16, "gallop", 0.5, deep="big_drum", rim="frame_mute")
    held(s, "horn", b + 8, 8, m(0, 1), 0.4)
    s.phrase(b + 16)
    b += 16
    # The second wave: the call on the strings, then all.
    ost(b, 16, 0.56, high=True)
    gallop(b, 16, 0.6)
    melody(s, "violins", b, deg(m, HC_BATTLE, 2), 0.56, ornament=0)
    melody(s, call, b, deg(m, HC_BATTLE, 1 if call == "horn" else 2), 0.4, ornament=0)
    strokes(s, "timpani", b, 16, 4, 0.6)
    s.phrase(b + 16)
    b += 16
    ost(b, 16, 0.6, high=True)
    gallop(b, 16, 0.64)
    rub(b, 16, 0.36)
    melody(s, cry, b, deg(m, TC_BATTLE, 2 if cry != "horn" else 1), 0.64, ornament=0)
    melody(s, call, b, deg(m, TC_BATTLE, 1 if call == "horn" else 2), 0.5, ornament=0)
    cries(b, 16, 0.54)
    strokes(s, "timpani", b, 16, 2, 0.6)
    s.hit("cymbal", b, 0.5)
    s.phrase(b + 16)
    b += 16
    # The end: the ostinato's last turn and the great drum.
    ost(b, 8, 0.58)
    gallop(b, 8, 0.62)
    s.hit("timpani_roll", b + 4, 0.6)
    pad(s, b + 6, 4, open5(m, 0, 1) + [m(0, 2)], 0.5)
    held(s, "horn", b + 6, 4, m(0, 1), 0.55)
    held(s, "trumpet", b + 6, 4, m(4, 2), 0.5)
    s.hit("big_drum", b + 8, 0.9)
    s.hit("cymbal", b + 8, 0.6)
    s.hit("timpani", b + 8, 0.8)
    s.phrase(b + 10)
    return s


# 12. Siege (after "Siege"): relentless, short; the camp before the walls. The ram's knock on the big drum, the siege
# rhythm, the horns on a semitone in nīš tuḫrim on C♯, tremolo strings, a reed's wail.
W_SIEGE = [(4, 3), (3, 1), (2, 2), (1, 2), (0, 4), (None, 4)]


def siege(v: int) -> Score:
    s = Score(bpm=80, seed=1200 + v)
    m = Mode(_shade(s, "nis_tuhrim", [0, -2, -2][v]), 49)
    wail, octave = [("reed", 1), ("horn", 0), ("low_reed", 1)][v]

    def ram(at: float, beats: float, vel: float) -> None:
        for t in range(0, int(beats), 4):
            s.hit("big_drum", at + t, vel)
            s.hit("log", at + t + 0.04, vel * 0.7)
        drums(s, at, beats, "siege", vel * 0.7)

    def horns(at: float, beats: float, vel: float) -> None:
        for t in range(0, int(beats), 8):
            held(s, "horn", at + t, 4, m(0, 0), vel)
            held(s, "horn", at + t + 4, 4, m(1, 0), vel)

    ram(0, 8, 0.6)
    held(s, "bass", 0, 8, m(0, -1), 0.4)
    s.level(0, -5)
    s.level(8, -4)
    s.level(24, -3)
    s.level(40, 0)
    s.level(56, -2)
    s.level(72, -4)
    s.level(81, -6)
    s.hit("scrape", 2, 0.3)
    s.phrase(8)
    b = 8.0
    ram(b, 16, 0.6)
    held(s, "bass", b, 16, m(0, -1), 0.42)
    horns(b, 16, 0.42)
    trem(s, b, 16, [m(0, 0), m(4, 0)], 0.26)
    s.phrase(b + 16)
    b += 16
    # The wail over the walls.
    ram(b, 16, 0.62)
    held(s, "bass", b, 16, m(0, -1), 0.42)
    horns(b, 16, 0.44)
    trem(s, b, 16, [m(0, 0), m(4, 0)], 0.3)
    melody(s, wail, b, deg(m, W_SIEGE, octave), 0.54, ornament=0.6)
    s.phrase(b + 16)
    b += 16
    # The high tremolo and the timpani: the assault.
    ram(b, 16, 0.66)
    held(s, "bass", b, 16, m(0, -1), 0.44)
    horns(b, 16, 0.48)
    trem(s, b, 16, [m(0, 0), m(4, 0), m(0, 2), m(1, 2)], 0.32)
    strokes(s, "timpani", b + 2, 14, 4, 0.5)
    melody(s, wail, b, deg(m, [(7, 2), (6, 2), (5, 2), (4, 2), (3, 2), (2, 2), (1, 2), (0, 2)], octave), 0.56, ornament=0.4)
    choir(s, b + 8, 8, open5(m, 0, 0), 0.3, "o", 6)
    s.hit("scrape", b + 12, 0.3)
    s.phrase(b + 16)
    b += 16
    # The wail falls, the ram goes on.
    ram(b, 16, 0.62)
    held(s, "bass", b, 16, m(0, -1), 0.42)
    horns(b, 16, 0.42)
    trem(s, b, 16, [m(0, 0), m(4, 0)], 0.28)
    melody(s, wail, b, deg(m, W_SIEGE, octave), 0.5, ornament=0.6)
    s.phrase(b + 16)
    b += 16
    ram(b, 8, 0.6)
    held(s, "bass", b, 8, m(0, -1), 0.4)
    held(s, "horn", b, 8, m(0, 0), 0.4)
    trem(s, b, 8, [m(0, 0)], 0.24)
    s.hit("big_drum", b + 8, 0.7)
    s.hit("log", b + 8.04, 0.5)
    s.phrase(b + 9)
    return s


# 13. The City Falls (after "Guillotine"): sudden and harsh; the seat's own capital has fallen. The gong and the drums,
# a falling line in nīš tuḫrim on D on the horn, then the strings and the voices, and the ruin after.
F_FALL = [(7, 2), (6, 1), (5, 1), (4, 3), (3, 1), (2, 2), (1, 2), (0, 4)]


def fall(v: int) -> Score:
    s = Score(bpm=84, seed=1300 + v)
    m = Mode(_shade(s, "nis_tuhrim", [0, -2, -2][v]), 62)
    first, second = [("horn", "violins"), ("reed", "horn"), ("trumpet", "celli")][v]

    def tolls(at: float, beats: float, vel: float) -> None:
        strokes(s, "timpani", at, beats, 2, vel)
        strokes(s, "big_drum", at, beats, 4, vel * 0.9)

    s.hit("gong", 0, 0.6)
    s.hit("big_drum", 0, 0.9)
    s.level(0, 0)
    s.level(4, -2)
    s.level(20, 0)
    s.level(36, -1)
    s.level(52, -3)
    s.level(64, -10)
    s.hit("timpani", 0, 0.8)
    s.hit("cymbal", 0, 0.5)
    swell(s, 0, 4, wide(m, 0, -2), 0.3, 0.5)
    s.phrase(4)
    b = 4.0
    tolls(b, 16, 0.5)
    trem(s, b, 16, open5(m, 0, -1) + [m(0, 0)], 0.32)
    held(s, "bass", b, 16, m(0, -2), 0.42)
    melody(s, first, b, deg(m, F_FALL, 0 if first != "trumpet" else 0), 0.6, ornament=0)
    s.phrase(b + 16)
    b += 16
    tolls(b, 16, 0.52)
    trem(s, b, 16, open5(m, 0, -1) + [m(0, 0), m(4, 0)], 0.36)
    held(s, "bass", b, 16, m(0, -2), 0.44)
    choir(s, b, 16, open5(m, 0, -1) + [m(0, 0)], 0.4, "o", 8)
    melody(s, second, b, deg(m, F_FALL, 0 if second != "celli" else -1), 0.58, ornament=0)
    melody(s, first, b, deg(m, F_FALL, -1 if first == "horn" else 0), 0.4, ornament=0)
    s.hit("gong", b + 8, 0.4)
    s.phrase(b + 16)
    b += 16
    # Lower, the voices crying, the line once more on the celli.
    tolls(b, 16, 0.46)
    trem(s, b, 16, open5(m, 0, -1), 0.3)
    held(s, "bass", b, 16, m(0, -2), 0.42)
    choir(s, b, 16, open5(m, 0, 0), 0.42, "a", 8)
    melody(s, "celli", b, deg(m, F_FALL, -1), 0.5, ornament=0)
    melody(s, "violas", b, deg(m, F_FALL, 0), 0.34, ornament=0)
    s.phrase(b + 16)
    b += 16
    # The ruin: the tremolo dying, a bell, the gong.
    swell(s, b, 12, wide(m, 0, -2), 0.34, 0.1)
    held(s, "bass", b, 12, m(0, -2), 0.3)
    s.hit("bells", b + 2, 0.24)
    s.hit("bells", b + 8, 0.2)
    s.hit("gong", b + 10, 0.3)
    s.phrase(b + 12)
    return s


# 14. Lament for the Fallen (after "The Fallen"): long and elegiac; land lost. A lament in nīš tuḫrim on E on the reed,
# heavily ornamented, over the harp and the strings, and the hymn's last line between its verses.
LA_FALLEN = [(4, 3), (3, 1), (2, 2), (1, 2), (0, 2), (None, 1), (2, 2), (1, 1), (0, 2)]
LA2_FALLEN = [(7, 2), (6, 1), (5, 1), (4, 3), (5, 1), (4, 2), (3, 2), (2, 1), (1, 1), (0, 2)]


def fallen(v: int) -> Score:
    s = Score(bpm=58, seed=1400 + v)
    m = Mode(_shade(s, "nis_tuhrim", [0, -1, -2][v]), 64)
    voice, strings = [("reed", "violins"), ("pipe", "violas"), ("choir", "reed")][v]
    H = hymn_in(m, [3])
    low = m(0, -2)

    def harp(at: float, prog: list[int], vel: float = 0.3) -> None:
        for i, d in enumerate(prog):
            notes = m.chord(d, "open", -1)
            s.note("harp", at + 4 * i, notes[0], 0, vel)
            s.note("harp", at + 4 * i + 2, notes[1], 0, vel * 0.8)

    def floor(at: float, prog: list[int], vel: float = 0.26) -> None:
        for i, d in enumerate(prog):
            pad(s, at + 4 * i, 4, open5(m, d, -1), vel)
        held(s, "bass", at, 4 * len(prog), low, vel + 0.04)

    prog = roots(m, [0, 3, 0, 6])
    s.level(0, -7)
    s.level(8, -5)
    s.level(24, -4)
    s.level(40, -3)
    s.level(58, -3)
    s.level(74, -1)
    s.level(90, 0)
    s.level(108, -1)
    s.level(110, -6)
    s.level(124, -7)
    s.level(136, -11)
    harp(0, [0, 0])
    held(s, "bass", 0, 8, low, 0.3)
    held(s, "violas", 2, 6, m(0, -1), 0.2)
    s.phrase(8)
    b = 8.0
    # The lament.
    harp(b, prog)
    floor(b, prog)
    melody(s, voice, b, deg(m, LA_FALLEN, 1 if voice == "pipe" else 0), 0.5, ornament=0.8)
    s.phrase(b + 16)
    b += 16
    # Its second verse.
    harp(b, roots(m, [3, 0, 6, 0]))
    floor(b, roots(m, [3, 0, 6, 0]), 0.28)
    melody(s, voice, b, deg(m, LA2_FALLEN, 1 if voice == "pipe" else 0), 0.52, ornament=0.8)
    s.phrase(b + 16)
    b += 16
    # The hymn's last line on the strings, the voices humming.
    floor(b, roots(m, [0, 0, 3, 0, 0]), 0.3)
    choir(s, b, 18, [m(0, -1), m(0, 0)], 0.22, "u", 5)
    b = play_hymn(s, b, H, strings if strings != "reed" else "violins", 0.46, figure=False, lyre_inst="harp", lyre_vel=0.3, ornament=0.4)
    # The lament by the strings, the reed answering under it.
    harp(b, prog)
    floor(b, prog, 0.3)
    melody(s, strings, b, deg(m, LA_FALLEN, 0), 0.5, ornament=0.5)
    melody(s, "low_reed" if voice == "reed" else "celli", b + 1, deg(m, LA_FALLEN[:5], -1), 0.3, ornament=0)
    s.phrase(b + 16)
    b += 16
    # The second verse by all, the voices open.
    harp(b, roots(m, [3, 0, 6, 0]))
    floor(b, roots(m, [3, 0, 6, 0]), 0.34)
    choir(s, b, 16, open5(m, 0, -1), 0.3, "o", 7)
    held(s, "horn", b, 8, m(4, -1), 0.28)
    held(s, "horn", b + 8, 8, m(0, -1), 0.3)
    melody(s, voice, b, deg(m, LA2_FALLEN, 1 if voice == "pipe" else 0), 0.56, ornament=0.8)
    melody(s, strings if strings != "reed" else "violins", b, deg(m, LA2_FALLEN, 0), 0.34, ornament=0)
    s.phrase(b + 16)
    b += 16
    # The hymn's last line by all.
    floor(b, roots(m, [0, 0, 3, 0, 0]), 0.34)
    choir(s, b, 18, open5(m, 0, -1) + [m(0, 0)], 0.3, "o", 7)
    b = play_hymn(s, b, H, voice, 0.52, octave=1 if voice == "pipe" else 0, figure=False, lyre_inst="harp", lyre_vel=0.3, ornament=0.5,
                  unison="violins" if voice != "violins" else None)
    # The lament once more, alone over the harp, slowing.
    s.tempo_map = [(b, 52)]
    harp(b, prog)
    held(s, "bass", b, 16, low, 0.28)
    held(s, "celli", b, 16, m(4, -2), 0.22)
    melody(s, voice, b, deg(m, LA_FALLEN, 1 if voice == "pipe" else 0), 0.42, ornament=0.8)
    s.phrase(b + 16)
    b += 16
    harp(b, [0, 0, 0])
    pad(s, b, 12, open5(m, 0, -1), 0.24)
    held(s, "bass", b, 12, low, 0.28)
    melody(s, voice, b, deg(m, [(1, 2), (0, 6)], 1 if voice == "pipe" else 0), 0.36, ornament=0.4)
    s.hit("bells", b + 8, 0.18)
    s.phrase(b + 12)
    return s
