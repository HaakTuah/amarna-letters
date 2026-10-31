"""The fourteen pieces, one for each of Empire Earth's, each taking that piece's role, mood and pace (the template is in
docs/audio/MUSIC.md) and nothing of its own: the melodies are the Hurrian Hymn's and new themes in the Babylonian tunings.

Each piece is a function of its variation (0, 1, 2): the same music, scored again with another lead, another rhythm,
another course through its sections, so no two plays in a row sound alike. A phrase end is marked wherever the music may
hand over to another piece.
"""

from __future__ import annotations

from hymn import Mode, hymn, hymn_in
from parts import choir, drone, drums, held, lyre, melody, pad
from score import Score


def deg(mode: Mode, line, octave: int = 0):
    """A line written in degrees of a tuning: (degree, beats), None for a rest."""
    return [(None if d is None else mode(d, octave), b) for d, b in line]


def play_hymn(s: Score, b: float, lines, lead: str, vel: float = 0.55, octave: int = 0, lyre_vel: float = 0.42,
              figure: bool = True, double: str | None = None, ornament: float = 0.5) -> float:
    """The hymn's lines: the lead sings the first string of each pair, the lyre sounds both beneath it."""
    for line in lines:
        mel = [(m + 12 * octave, c) for m, _, c in line]
        melody(s, lead, b, mel, vel, ornament=ornament)
        if double:
            melody(s, double, b, [(m - 12, c) for m, c in mel], vel * 0.6, ornament=0)
        t = b
        for m, low, c in line:
            s.note("lyre", t, low - 12, 0, lyre_vel)
            s.note("lyre", t + 0.03, m - 12, 0, lyre_vel * 0.8)
            if figure and c >= 3:
                lyre(s, t + 1, c - 1, [low - 12, m - 12, low], "rise", lyre_vel * 0.7)
            t += c
        s.phrase(t)
        b = t
    return b


# 1. The Hymn to Nikkal (after "Main Theme"): the first screen. The hymn whole, stated, raised, and let go.
def hymn_theme(v: int) -> Score:
    s = Score(bpm=66, seed=100 + v)
    A = 45
    lead = ["reed", "choir", "violins"][v]
    b = 0.0
    drone(s, 0, 10, A - 12, 0.38)
    s.hit("gong", 0, 0.25)
    lyre(s, 0, 8, [69 - 12, 64 - 12], "strum", 0.5)
    choir(s, 2, 8, [57], 0.3, "u")
    s.phrase(8)
    b = 8
    H = hymn()
    drone(s, b, 27, A - 12, 0.32)
    b = play_hymn(s, b, H[0:2], lead, 0.55)
    # The second statement: the voices join and the frame drum comes in.
    drone(s, b, 34, A - 12, 0.36)
    choir(s, b, 16, [57, 64], 0.32, "o")
    choir(s, b + 16, 18, [57, 62], 0.32, "o")
    drums(s, b, 34, "wahda", 0.35)
    second = ["violins", "reed", "pipe"][v]
    b = play_hymn(s, b, H[2:4], second, 0.5, double="violas" if v != 1 else None)
    # The height: the first line again, all together.
    s.hit("timpani", b, 0.6)
    s.hit("cymbal", b, 0.4)
    drone(s, b, 20, A - 12, 0.5)
    pad(s, b, 18, [A + 12, A + 19, A + 24], 0.45)
    held(s, "horn", b, 18, A + 7, 0.4)
    drums(s, b, 18, "baladi", 0.45, fill="darbuka")
    choir(s, b, 18, [A + 12, A + 19], 0.42, "a")
    b = play_hymn(s, b, H[0:1], "choir" if v != 1 else "violins", 0.62, double="reed" if v != 0 else "celli")
    # The going: the end of the last line on the pipe, alone over the drone.
    drone(s, b, 14, A - 12, 0.3)
    tail = [(m, c) for m, _, c in H[3][-3:]]
    melody(s, "pipe" if v != 2 else "reed", b + 1, tail, 0.45)
    lyre(s, b + 8, 4, [A - 12, A - 5, A], "rise", 0.4)
    s.note("lyre", b + 12, A - 12, 0, 0.45)
    s.hit("gong", b + 12, 0.18)
    s.phrase(b + 14)
    return s


# 2. The Brotherhood of Kings (after "Balance of Power"): calm; long, stately, the great kings at peace.
def kings(v: int) -> Score:
    s = Score(bpm=72, seed=200 + v)
    m = Mode("isartum", 62)  # D
    a = [(4, 2), (5, 1), (4, 1), (2, 2), (3, 1), (2, 1), (1, 3), (None, 1)]
    bb = [(0, 1), (1, 1), (2, 2), (4, 2), (3, 1), (2, 1), (1, 2), (0, 4), (None, 2)]
    a2 = [(4, 2), (6, 1), (7, 1), (6, 2), (4, 1), (5, 1), (4, 3), (None, 1)]
    lead = ["recorder", "violins", "reed"][v]
    counter = ["violas", "pipe", "violas"][v]
    prog = [0, 3, 4, 0, 5, 3, 4, 0]
    b = 0.0
    # Intro: the lyre alone, then the strings under it.
    for i, d in enumerate(prog[:4]):
        lyre(s, b + 4 * i, 4, [m(d, -1), m(d + 4, -1), m(d + 7, -1)], "wave", 0.45)
    pad(s, 8, 8, [m(0, -2), m(4, -2)], 0.3)
    s.phrase(16)
    b = 16
    sections = [a, bb, a2, bb] if v != 1 else [a, a2, bb, bb]
    for k, line in enumerate(sections):
        for i, d in enumerate(prog if k % 2 == 0 else prog[4:] + prog[:4]):
            if i >= 4:
                break
            pad(s, b + 4 * i, 4, [m(d, -2), m(d + 4, -2), m(d + 9, -2)], 0.32 + 0.03 * k)
            lyre(s, b + 4 * i, 4, [m(d, -1), m(d + 4, -1), m(d + 7, -1)], "wave" if v != 2 else "rise", 0.36)
        melody(s, lead, b, deg(m, line, 1 if lead in ("recorder", "pipe") else 0), 0.5)
        if k >= 2:
            melody(s, counter, b + 2, deg(m, [(d - 2 if d is not None else None, l) for d, l in line], 0), 0.32, ornament=0)
        if k == 2:
            choir(s, b, 16, [m(0, -1), m(4, -1)], 0.25, "u")
            drums(s, b, 16, "wahda", 0.25)
        b += 16
        s.phrase(b)
    # Coda.
    pad(s, b, 8, [m(0, -2), m(4, -2), m(7, -2)], 0.3)
    melody(s, lead, b, deg(m, [(2, 2), (1, 2), (0, 4)], 1 if lead in ("recorder", "pipe") else 0), 0.42)
    lyre(s, b + 4, 4, [m(0, -1), m(4, -1), m(7, -1), m(9, -1)], "rise", 0.35)
    s.phrase(b + 8)
    return s


# 3. Battle (after "Battle"): driving, hard, short.
def battle(v: int) -> Score:
    s = Score(bpm=126, seed=300 + v)
    m = Mode("nis_tuhrim", 40)  # E, Phrygian
    ost = [0, 0, 1, 0, 2, 1, 0, -1]
    call = [(7, 2), (8, 1), (9, 1), (10, 3), (9, 1), (8, 2), (7, 2), (None, 4)]
    b = 0.0
    drums(s, 0, 16, "gallop", 0.6, deep="big_drum", rim="frame_mute")
    s.hit("timpani", 0, 0.8)
    s.phrase(16)
    b = 16
    lead = ["horn", "trumpet", "horn"][v]
    for sec in range(4):
        intense = sec in (1, 3)
        for i in range(16):
            for j, d in enumerate(ost):
                s.note("celli_pizz" if sec == 0 else "celli", b + i * 4 + j * 0.5, m(d), 0.4, 0.62 if j == 0 else 0.5)
            if i % 2 == 0:
                s.note("bass", b + i * 4, m(0, -1), 7.5, 0.5)
        drums(s, b, 64, "chariot" if v != 1 else "saidi", 0.6, deep="frame_lo", rim="frame_mute", fill="darbuka")
        for i in range(0, 64, 8):
            s.hit("big_drum", b + i, 0.7)
            s.hit("big_drum", b + i + 3, 0.55)
        if sec == 2:
            # The break: drums and the low pedal only, the horns calling across.
            melody(s, "horn", b + 8, deg(m, [(7, 4), (8, 4)], 0), 0.5, ornament=0)
        else:
            melody(s, lead, b, deg(m, call + call, 0), 0.6 + 0.05 * sec, ornament=0.2)
            held(s, "violins_trem", b, 32, m(14), 0.45)
            held(s, "violins_trem", b + 32, 32, m(15), 0.5)
        if intense:
            if v == 2:
                choir(s, b, 32, [m(7, -1), m(11, -1)], 0.55, "a", 8)
                choir(s, b + 32, 32, [m(8, -1), m(12, -1)], 0.55, "a", 8)
            else:
                melody(s, "reed", b + 32, deg(m, [(14, 1), (15, 1), (14, 1), (13, 1), (14, 4), (12, 2), (13, 2), (11, 4), (12, 8),
                                                  (None, 8)], 0), 0.6, ornament=0.6)
            s.hit("cymbal", b, 0.5)
        s.hit("timpani", b, 0.8)
        b += 64 if sec != 2 else 0
        if sec == 2:
            b += 16
        s.phrase(b)
        if sec == 1 and v == 1:
            break
    s.hit("big_drum", b, 0.9)
    s.hit("timpani", b, 0.9)
    s.note("bass", b, m(0, -1), 4, 0.6)
    s.note("celli", b, m(0), 4, 0.6)
    s.phrase(b + 4)
    return s


# 4. Triumph (after "Arthurian"): bright and short, the hymn's opening as a fanfare.
def triumph(v: int) -> Score:
    s = Score(bpm=100, seed=400 + v)
    m = Mode(["isartum", "kitmum", "isartum"][v], 62)
    H = hymn_in(m, [0, 1])
    b = 0.0
    s.hit("cymbal", 0, 0.6)
    s.hit("timpani", 0, 0.8)
    s.hit("sistrum", 0, 0.6)
    pad(s, 0, 4, [m(0, -2), m(4, -2), m(7, -2)], 0.5)
    held(s, "horn", 0, 4, m(4, -1), 0.6)
    held(s, "trumpet", 0.5, 3.5, m(7, -1), 0.55)
    s.phrase(4)
    b = 4
    for k, line in enumerate(H):
        length = sum(c for _, _, c in line)
        drums(s, b, length, "march", 0.55, fill="tambourine")
        pad(s, b, length, [m(0, -2), m(4, -2), m(9, -2)], 0.48)
        held(s, "bass", b, length, m(0, -3), 0.5)
        lead = ["trumpet", "horn", "violins"][v] if k == 0 else ["horn", "violins", "trumpet"][v]
        melody(s, lead, b, [(a, c) for a, _, c in line], 0.65, ornament=0)
        melody(s, "horn" if lead != "horn" else "trumpet", b, [(a - 5, c) for a, _, c in line], 0.45, ornament=0)
        choir(s, b, length, [m(0, -1), m(4, -1), m(7, -1)], 0.45, "a", 8)
        for i in range(0, int(length), 4):
            s.hit("sistrum", b + i, 0.4)
        b += length
        s.phrase(b)
    # The close: the tonic held by all, a last roll.
    s.hit("timpani_roll", b - 2, 0.5)
    pad(s, b, 6, [m(0, -2), m(4, -2), m(7, -2), m(9, -2)], 0.55)
    held(s, "horn", b, 6, m(0, -1), 0.6)
    held(s, "trumpet", b, 6, m(4, -1), 0.55)
    choir(s, b, 6, [m(0, -1), m(7, -1)], 0.5, "a", 8)
    s.hit("cymbal", b, 0.55)
    s.hit("big_drum", b, 0.8)
    s.phrase(b + 6)
    return s


# 5. Enmity (after "Emnity"): the long rising tension, a war not yet begun.
def enmity(v: int) -> Score:
    s = Score(bpm=60, seed=500 + v)
    m = Mode("nid_qablim", 45)  # A
    motif = [(0, 3), (1, 1), (0, 2), (-2, 2), (-1, 4), (None, 4)]
    motif2 = [(2, 2), (3, 2), (5, 3), (4, 1), (3, 4), (1, 2), (0, 2)]
    b = 0.0
    held(s, "celli_trem", 0, 32, m(0, -1), 0.3)
    held(s, "bass", 0, 32, m(0, -2), 0.35)
    s.hit("gong", 0, 0.2)
    for i in range(4, 32, 8):
        s.note("harp", i, m(5, 1), 0, 0.3)
        s.note("harp", i + 0.5, m(1, 1), 0, 0.25)
    s.phrase(16)
    s.phrase(32)
    b = 32
    low = ["low_reed", "celli", "low_reed"][v]
    # The heartbeat and the motif.
    drums(s, b, 32, "heart", 0.32, sub=2)
    held(s, "bass", b, 32, m(0, -2), 0.38)
    melody(s, low, b, deg(m, motif + motif, 0), 0.45)
    held(s, "violins", b + 16, 16, m(6, 2), 0.22)
    held(s, "violins", b + 16, 16, m(7, 2), 0.2)
    b += 32
    s.phrase(b)
    # The swell: the strings rise, the reed laments above.
    for i, d in enumerate([0, -2, 3, 4]):
        pad(s, b + 8 * i, 8, [m(d, -2), m(d + 4, -2), m(d + 9, -1)], 0.3 + 0.05 * i)
    s.hit("timpani_roll", b + 18, 0.45)
    drums(s, b, 32, "heart" if v != 2 else "wahda", 0.4)
    melody(s, "reed" if v != 1 else "pipe", b, deg(m, motif2 + motif2, 1), 0.52, ornament=0.7)
    if v == 1:
        choir(s, b + 16, 16, [m(0, -1), m(1, -1)], 0.3, "u")
    b += 32
    s.phrase(b)
    # The height: the tritone of kitmum laid bare, then held back.
    s.hit("gong", b, 0.35)
    s.hit("big_drum", b, 0.7)
    held(s, "violins_trem", b, 16, m(6, 1), 0.45)
    held(s, "violins_trem", b, 16, m(2, 2), 0.42)
    held(s, "horn", b, 16, m(0, 0), 0.4)
    held(s, "bass", b, 24, m(0, -2), 0.45)
    drums(s, b, 16, "siege", 0.5, deep="big_drum", rim="frame_mute")
    melody(s, low, b + 16, deg(m, motif, 0), 0.4)
    b += 24
    s.phrase(b)
    held(s, "celli_trem", b, 12, m(0, -1), 0.25)
    s.note("harp", b + 4, m(5, 1), 0, 0.25)
    s.phrase(b + 12)
    return s


# 6. The City Falls (after "Guillotine"): sudden, harsh, short; plays when a capital is lost.
def fall(v: int) -> Score:
    s = Score(bpm=84, seed=600 + v)
    m = Mode("nis_tuhrim", 50)  # D, Phrygian
    s.hit("gong", 0, 0.6)
    s.hit("timpani", 0, 0.9)
    s.hit("big_drum", 0, 0.9)
    held(s, "violins_trem", 0, 12, m(8, 1), 0.55)
    held(s, "violins_trem", 0, 12, m(7, 1), 0.5)
    held(s, "bass", 0, 24, m(0, -2), 0.5)
    choir(s, 0.5, 8, [m(4, 0), m(8, 0)], 0.55, "a", 8)
    s.phrase(12)
    falling = [(7, 2), (6, 1), (5, 1), (4, 2), (3, 2), (1, 3), (0, 5)]
    lead = ["horn", "celli", "choir"][v]
    melody(s, lead, 12, deg(m, falling, 0 if lead != "celli" else -1), 0.6, ornament=0.2)
    melody(s, "reed", 13, deg(m, [(d + 7 if d is not None else None, l) for d, l in falling], 0), 0.38, ornament=0.6)
    drums(s, 12, 16, "siege", 0.5, deep="frame_lo", rim="frame_mute")
    pad(s, 12, 8, [m(0, -1), m(1, -1)], 0.4)
    pad(s, 20, 8, [m(-2, -1), m(0, -1)], 0.38)
    s.phrase(28)
    s.hit("timpani", 28, 0.7)
    held(s, "celli_trem", 28, 16, m(0, -1), 0.35)
    held(s, "bass", 28, 16, m(0, -2), 0.38)
    melody(s, "low_reed", 30, deg(m, [(4, 3), (3, 1), (1, 4), (0, 6)], 0), 0.4)
    s.hit("gong", 40, 0.25)
    s.phrase(44)
    return s


# 7. Chariots (after "Honor"): the war, martial and noble.
def chariots(v: int) -> Score:
    s = Score(bpm=96, seed=700 + v)
    m = Mode("pitum", 50)  # D, Dorian
    theme = [(0, 1), (0, 0.5), (2, 0.5), (4, 2), (3, 1), (4, 1), (5, 1.5), (4, 0.5), (3, 1), (2, 1), (1, 2), (0, 2), (None, 2)]
    answer = [(4, 1), (4, 0.5), (5, 0.5), (7, 2), (6, 1), (5, 1), (4, 1.5), (3, 0.5), (2, 1), (1, 1), (0, 4), (None, 2)]
    lead = ["horn", "reed", "violins"][v]
    b = 0.0
    drums(s, 0, 8, "march", 0.5, fill="darbuka")
    s.hit("timpani", 0, 0.6)
    held(s, "bass", 0, 8, m(0, -1), 0.45)
    s.phrase(8)
    b = 8
    for sec in range(4):
        for i in range(0, 16, 1):
            s.note("celli_pizz", b + i, m(0 if (i // 4) % 2 == 0 else -3), 0.5, 0.55)
            s.note("celli_pizz", b + i + 0.5, m(4 if (i // 4) % 2 == 0 else 1), 0.4, 0.45)
        drums(s, b, 16, "chariot" if sec % 2 else "march", 0.5 + 0.04 * sec, fill="darbuka")
        held(s, "horn", b, 8, m(4, -1), 0.38)
        held(s, "horn", b + 8, 8, m(5, -1), 0.38)
        pad(s, b, 16, [m(0, -1), m(4, -1)], 0.32 + 0.04 * sec)
        line = theme if sec % 2 == 0 else answer
        melody(s, lead if sec < 3 else "violins", b, deg(m, line, 0 if lead != "violins" else 1), 0.58, ornament=0.3)
        if sec >= 2:
            melody(s, "trumpet" if v != 1 else "horn", b, deg(m, [(d - 3 if d is not None else None, l) for d, l in line], 0), 0.4, ornament=0)
            choir(s, b, 16, [m(0, -1), m(4, -1)], 0.38, "a", 8)
        if sec == 3:
            s.hit("cymbal", b, 0.45)
        b += 16
        s.phrase(b)
    s.hit("timpani", b, 0.8)
    s.hit("big_drum", b, 0.8)
    pad(s, b, 4, [m(0, -2), m(4, -2), m(7, -1)], 0.5)
    held(s, "horn", b, 4, m(0, 0), 0.55)
    s.phrase(b + 4)
    return s


# 8. Envoys (after "Pawns"): measured unease, pieces moved on a board; letters, envoys and spies.
def envoys(v: int) -> Score:
    s = Score(bpm=88, seed=800 + v)
    m = Mode("pitum" if v != 2 else "nid_qablim", 55)  # G
    walk = [0, 4, 2, 4, 1, 4, 2, 4]
    q = [(4, 1), (3, 0.5), (2, 0.5), (3, 2), (None, 1), (1, 1), (2, 0.5), (1, 0.5), (0, 3), (None, 6)]
    q2 = [(5, 1), (4, 0.5), (3, 0.5), (4, 2), (None, 1), (2, 1), (3, 0.5), (2, 0.5), (1, 3), (None, 2), (0, 4)]
    lead = ["reed", "pipe", "low_reed"][v]
    b = 0.0
    harm = [0, 0, -2, -2, -3, -3, -1, -1]
    for sec in range(5):
        for bar in range(4):
            r = harm[(sec * 4 + bar) % len(harm)]
            for j, d in enumerate(walk):
                s.note("violins_pizz" if j % 2 else "celli_pizz", b + bar * 4 + j * 0.5, m(r + d, -1 if j % 2 else -1), 0.3,
                       0.42 if j % 4 == 0 else 0.34)
            if sec >= 1:
                held(s, "celli", b + bar * 4, 4, m(r, -2), 0.3)
        if sec >= 1:
            drums(s, b, 16, "maqsum", 0.32, deep="darbuka", rim="darbuka_tek")
        if sec in (1, 3):
            melody(s, lead, b, deg(m, q if sec == 1 else q2, 0 if lead != "low_reed" else -1), 0.5, ornament=0.6)
        if sec == 2:
            for i in range(0, 16, 2):
                s.note("lyre", b + i + 1, m(4 + (i % 4), 0), 0, 0.35)
            held(s, "violins", b, 16, m(4, 1), 0.2)
        if sec == 4:
            melody(s, "violins" if v != 1 else "reed", b, deg(m, q2, 0), 0.4, ornament=0.4)
            choir(s, b + 8, 8, [m(0, -1)], 0.25, "u")
        b += 16
        s.phrase(b)
    return s


# 9. The River (after "Rivers"): calm and flowing; the Nile, the Euphrates, the year's water.
def river(v: int) -> Score:
    s = Score(bpm=60, seed=900 + v)
    m = Mode("embubum", 53)  # F, Mixolydian
    H = hymn_in(m, [1, 2])
    b = 0.0
    s.hit("ocean", 0, 0.35)
    prog = [0, 0, 3, 3, 4, 3, 0, 0]
    flow = ["harp", "lyre", "psaltery"][v]
    lead = ["pipe", "recorder", "choir"][v]

    def water(at: float, beats: float, d: int) -> None:
        lyre(s, at, beats, [m(d, -1), m(d + 4, -1), m(d + 7, -1), m(d + 9, -1)], "wave", 0.34, inst=flow if flow != "psaltery" else "harp", per_beat=3)

    for i in range(4):
        water(4 * i, 4, prog[i])
    pad(s, 4, 12, [m(0, -2), m(4, -2)], 0.25)
    s.phrase(16)
    b = 16
    for k, line in enumerate(H + H[:1]):
        length = sum(c for _, _, c in line)
        steps = int(length // 4) + 1
        for i in range(steps):
            water(b + 4 * i, min(4, length - 4 * i), prog[(i + k) % len(prog)])
        pad(s, b, length, [m(prog[k % 8], -2), m(prog[k % 8] + 4, -2), m(prog[k % 8] + 9, -2)], 0.28)
        mel = [(a + (12 if lead != "choir" else 0), c) for a, _, c in line]
        melody(s, lead if k != 2 else ("violins" if v != 1 else "pipe"), b, mel, 0.46, ornament=0.4)
        if k == 2 and flow == "psaltery":
            for i in range(0, int(length), 2):
                s.note("psaltery", b + i + 0.5, m(7 + (i % 3)), 0, 0.3)
        b += length
        s.phrase(b)
    for i in range(3):
        water(b + 4 * i, 4, 0)
    pad(s, b, 12, [m(0, -2), m(4, -2), m(9, -2)], 0.25)
    s.hit("ocean", b + 2, 0.25)
    s.phrase(b + 12)
    return s


# 10. Shadows (after "Shadows"): dark and watchful; omens, spies, a court that fears.
def shadows(v: int) -> Score:
    s = Score(bpm=54, seed=1000 + v)
    m = Mode("nis_tuhrim", 52)  # E, Phrygian
    motif = [(0, 2), (1, 1), (0, 1), (-1, 2), (-3, 2), (-2, 4), (None, 4)]
    motif2 = [(3, 2), (4, 1), (3, 1), (1, 2), (0, 2), (1, 3), (0, 1), (-1, 4), (None, 4)]
    b = 0.0
    held(s, "violins_trem", 0, 64, m(7, 1), 0.18)
    held(s, "bass", 0, 64, m(0, -2), 0.3)
    for i in range(0, 64, 8):
        s.hit("bells", i + 3 + (s.rng.random() * 2), 0.25)
        if i % 16 == 8:
            s.hit("big_drum", i, 0.35)
    s.phrase(16)
    lead = ["low_reed", "reed", "choir"][v]
    melody(s, lead, 16, deg(m, motif, -1 if lead == "low_reed" else 0), 0.45, ornament=0.6)
    s.phrase(32)
    choir(s, 32, 16, [m(0, -1), m(1, -1)], 0.25, "u")
    melody(s, "pipe" if v != 1 else "low_reed", 32, deg(m, motif2, 0 if v != 1 else -1), 0.4, ornament=0.6)
    s.phrase(48)
    for i in range(0, 16, 2):
        s.note("harp", 48 + i, m([7, 8, 5, 4][(i // 2) % 4], 1), 0, 0.28)
    held(s, "celli", 48, 16, m(1, -1), 0.3)
    s.phrase(64)
    held(s, "celli_trem", 64, 28, m(0, -1), 0.28)
    held(s, "bass", 64, 28, m(0, -2), 0.3)
    melody(s, lead, 64, deg(m, motif + [(0, 4)], -1 if lead == "low_reed" else 0), 0.42, ornament=0.6)
    s.hit("timpani_roll", 78, 0.3)
    s.hit("gong", 84, 0.22)
    s.phrase(92)
    return s


# 11. Siege (after "Siege"): relentless, short; the camp before the walls.
def siege(v: int) -> Score:
    s = Score(bpm=80, seed=1100 + v)
    m = Mode("nis_tuhrim", 37)  # C#
    b = 0.0
    held(s, "celli_trem", 0, 64, m(0, 0), 0.38)
    held(s, "bass", 0, 64, m(0, -1), 0.45)
    drums(s, 0, 64, "siege", 0.6, deep="big_drum", rim="frame_lo")
    for i in range(2, 64, 4):
        s.hit("log", i + 0.5, 0.45)  # the ram
    s.phrase(16)
    for k in range(3):
        at = 16 + 16 * k
        held(s, "horn", at, 6, m(0, 1), 0.45 + 0.05 * k)
        held(s, "horn", at + 6, 10, m(1, 1), 0.5 + 0.05 * k)
        if k >= 1:
            held(s, "violins_trem", at, 16, m(8 + k, 2), 0.35 + 0.05 * k)
        if k == 2 or v == 2:
            choir(s, at, 16, [m(0, 0), m(1, 0)], 0.35, "a", 8)
        if v == 1 and k >= 1:
            melody(s, "reed", at, deg(m, [(7, 2), (8, 2), (7, 1), (5, 1), (4, 2), (5, 8)], 1), 0.5, ornament=0.6)
        s.hit("timpani_roll", at + 10, 0.4 + 0.1 * k)
        s.phrase(at + 16)
    s.hit("timpani", 64, 0.9)
    s.hit("big_drum", 64, 0.9)
    s.note("bass", 64, m(0, -1), 4, 0.5)
    s.phrase(68)
    return s


# 12. Solemn (after "Solemn"): a short chorale; a king is dead.
def solemn(v: int) -> Score:
    s = Score(bpm=52, seed=1200 + v)
    m = Mode("nid_qablim", 50)  # D
    line = [(4, 2), (3, 1), (2, 1), (1, 2), (0, 2), (2, 2), (1, 1), (0, 1), (-1, 2), (0, 4)]
    bassl = [(0, 4), (-3, 4), (-2, 4), (-3, 2), (-4, 2), (-7, 4)]
    s.hit("gong", 0, 0.35)
    b = 2
    lead = ["choir", "violins", "choir"][v]
    melody(s, lead, b, deg(m, line, 0), 0.48, ornament=0.2, legato=1.15)
    melody(s, "violas" if v != 1 else "choir", b, deg(m, [(d - 2, l) for d, l in line], 0), 0.38, ornament=0, legato=1.15)
    melody(s, "celli", b, deg(m, bassl, -1), 0.42, ornament=0, legato=1.1)
    held(s, "bass", b, 18, m(0, -2), 0.35)
    if v == 2:
        melody(s, "reed", b + 1, deg(m, [(d + 2, l) for d, l in line], 0), 0.3, ornament=0.4)
    s.phrase(b + 18)
    s.hit("gong", b + 18, 0.2)
    pad(s, b + 18, 6, [m(0, -1), m(4, -1)], 0.28)
    s.phrase(b + 24)
    return s


# 13. Lament for the Fallen (after "The Fallen"): long and elegiac; a war lost, a land taken.
def fallen(v: int) -> Score:
    s = Score(bpm=58, seed=1300 + v)
    m = Mode("nis_tuhrim", 52)  # E
    H = hymn_in(m, [3])
    lament = [(4, 3), (3, 1), (1, 2), (0, 2), (1, 1), (3, 1), (2, 2), (1, 2), (0, 2), (-1, 2), (0, 6), (None, 2)]
    lead = ["reed", "violins", "pipe"][v]
    b = 0.0
    held(s, "celli", 0, 8, m(0, -1), 0.3)
    held(s, "bass", 0, 8, m(0, -2), 0.3)
    s.note("harp", 2, m(4, 0), 0, 0.3)
    s.note("harp", 4, m(0, 0), 0, 0.3)
    s.phrase(8)
    b = 8
    length = sum(c for _, _, c in H[0])
    pad(s, b, length, [m(0, -2), m(4, -2), m(7, -2)], 0.3)
    b = play_hymn(s, b, H, lead, 0.5, octave=1 if lead == "pipe" else 0, ornament=0.8)
    for sec in range(2):
        L = sum(l for _, l in lament)
        pad(s, b, L / 2, [m(0, -2), m(5, -2), m(9, -2)], 0.32 + 0.05 * sec)
        pad(s, b + L / 2, L / 2, [m(-2, -2), m(3, -2), m(7, -2)], 0.32 + 0.05 * sec)
        melody(s, lead if sec == 0 else ("violins" if lead != "violins" else "reed"), b, deg(m, lament, 0 if lead != "pipe" else 1), 0.52, ornament=0.8)
        if sec == 1:
            choir(s, b, L, [m(0, -1), m(4, -1)], 0.3, "o")
            drums(s, b, L, "wahda", 0.25)
        b += L
        s.phrase(b)
    held(s, "celli", b, 10, m(0, -1), 0.28)
    held(s, "bass", b, 10, m(0, -2), 0.28)
    s.note("harp", b + 2, m(0, 0), 0, 0.28)
    s.phrase(b + 10)
    return s


# 14. The Last Seasons (after "Time"): the age near its end; the hymn returns, slow, over the lyre's measured strokes.
def last(v: int) -> Score:
    s = Score(bpm=63, seed=1400 + v)
    A = 45
    H = hymn()
    b = 0.0

    def tick(at: float, beats: float) -> None:
        lyre(s, at, beats, [A - 12, A - 5, A, A + 3], "rise", 0.32 if v != 2 else 0.28, per_beat=2,
             inst="lyre" if v != 1 else "harp")

    tick(0, 16)
    s.hit("gong", 0, 0.22)
    s.phrase(16)
    b = 16
    drone(s, b, 27, A - 12, 0.3)
    tick(b, 27)
    lead = ["violins", "choir", "reed"][v]
    b = play_hymn(s, b, H[0:2], lead, 0.5, octave=0, figure=False)
    drone(s, b, 34, A - 12, 0.38)
    tick(b, 34)
    choir(s, b, 34, [A, A + 7], 0.32, "o")
    drums(s, b, 34, "wahda", 0.3)
    b = play_hymn(s, b, H[2:4], "reed" if v != 2 else "violins", 0.5, figure=False, double="violas")
    s.hit("gong", b, 0.35)
    s.hit("timpani", b, 0.5)
    pad(s, b, 18, [A, A + 7, A + 12, A + 15], 0.42)
    held(s, "horn", b, 18, A + 7, 0.35)
    b = play_hymn(s, b, H[0:1], "choir" if v != 1 else "violins", 0.55, double="celli", figure=False)
    tick(b, 12)
    s.hit("gong", b + 10, 0.2)
    s.phrase(b + 14)
    return s


PIECES = {
    "hymn": hymn_theme,
    "kings": kings,
    "battle": battle,
    "triumph": triumph,
    "enmity": enmity,
    "fall": fall,
    "chariots": chariots,
    "envoys": envoys,
    "river": river,
    "shadows": shadows,
    "siege": siege,
    "solemn": solemn,
    "fallen": fallen,
    "last": last,
}
