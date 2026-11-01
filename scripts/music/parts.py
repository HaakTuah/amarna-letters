"""The building blocks the pieces are written with: held lines, pads, the lyre's patterns, a sung or played melody with
the period's ornaments, and the frame drum's rhythms."""

from __future__ import annotations

from score import Score

MAX_HOLD = 5.0  # seconds a sustained recording is held before the bow or the breath is taken again


def held(s: Score, inst: str, beat: float, beats: float, midi: int, vel: float = 0.45) -> None:
    """A note held as long as asked, taken again under itself where it outlasts the recording."""
    seg = max(1.0, MAX_HOLD * s.bpm / 60)
    b = beat
    while b < beat + beats - 0.01:
        length = min(seg, beat + beats - b)
        s.note(inst, b, midi, length + (0.6 if b + length < beat + beats else 0), vel * (1 if b == beat else 0.85))
        b += length


def pad(s: Score, beat: float, beats: float, notes: list[int], vel: float = 0.4, strings: bool = True) -> None:
    """A chord on the string sections, each note given to the section whose range it sits in."""
    for m in notes:
        if m < 43:
            inst = "bass"
        elif m < 55:
            inst = "celli"
        elif m < 64:
            inst = "violas"
        else:
            inst = "violins"
        if not strings:
            inst = "low_reed" if m < 60 else "recorder"
        held(s, inst, beat, beats, m, vel)


def choir(s: Score, beat: float, beats: float, notes: list[int], vel: float = 0.45, vowel: str = "o", singers: int = 6) -> None:
    for m in notes:
        s.sing(beat, m, beats, vel, vowel, singers)


def drone(s: Score, beat: float, beats: float, root: int, vel: float = 0.4, fifth: bool = True) -> None:
    held(s, "bass" if root < 48 else "celli", beat, beats, root, vel)
    if fifth:
        held(s, "celli", beat, beats, root + 7 + (12 if root < 43 else 0), vel * 0.8)


def melody(s: Score, inst: str, beat: float, line: list[tuple[int, float]], vel: float = 0.55, ornament: float = 0.5,
           legato: float = 1.05, swell: bool = True) -> float:
    """A line of (note, beats); a rest is note None. Ornaments: a scoop into notes after a leap, a quick upper
    neighbour before some long notes, as a reed or a voice of the region would sing them. Returns the beat it ends."""
    b = beat
    prev = None
    for i, (m, length) in enumerate(line):
        if m is None:
            b += length
            prev = None
            continue
        v = vel * (1.08 if length >= 2 and swell else 1)
        r = s.rng.random()
        if inst == "choir":
            bend = [-0.4, 0, 0, 0, 0, 0, 0, 0] if prev is not None and abs(m - prev) > 2 and r < ornament else None
            s.sing(b, m, length * legato, v, "a" if length >= 2 else "o", 5, bend=bend)
        else:
            if length >= 1.5 and r < ornament * 0.5 and s.bpm < 110:
                g = 60 / s.bpm * 0.18  # a grace note, an eighth of a beat or so
                up = m + (2 if (m % 12) not in (4, 11) else 1)
                s.note(inst, b - 0.18, up, 0.2, v * 0.8)
            bend = None
            if prev is not None and abs(m - prev) >= 3 and r > 1 - ornament:
                bend = [-0.7, -0.2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
            s.note(inst, b, m, length * legato, v, bend=bend)
        prev = m
        b += length
    return b


# Rhythms on a grid of eighths: D the deep stroke at the centre of the frame, T the sharp one at its rim, - silence.
RHYTHMS = {
    "wahda": "D-------T-------",          # slow, one deep stroke a bar
    "heart": "D--D----D--D----",          # a heartbeat
    "maqsum": "DT-TD-T-",
    "baladi": "DD-TD-T-",
    "saidi": "DT-DD-T-",
    "march": "D-T-D-T-DDT-D-T-",
    "chariot": "D-TTD-TTD-TTDDTT",
    "gallop": "DTTDTTDT",
    "siege": "D---D---D---DD--",
}


def drums(s: Score, beat: float, beats: float, rhythm: str, vel: float = 0.5, deep: str = "frame_lo", rim: str = "frame_mute",
          fill: str | None = None, sub: int = 2) -> None:
    """A rhythm played across the stretch asked, on a grid of `sub` strokes a beat."""
    pat = RHYTHMS[rhythm]
    step = 1 / sub
    i = 0
    b = beat
    while b < beat + beats - 1e-6:
        c = pat[i % len(pat)]
        accent = 1.0 if i % len(pat) == 0 else 0.85
        if c == "D":
            s.hit(deep, b, vel * accent)
        elif c == "T":
            s.hit(rim, b, vel * 0.8 * accent)
        elif fill and s.rng.random() < 0.18:
            s.hit(fill, b, vel * 0.4)
        i += 1
        b += step


def lyre(s: Score, beat: float, beats: float, notes: list[int], pattern: str = "rise", vel: float = 0.5, inst: str = "lyre",
         per_beat: int = 2) -> None:
    """The lyre's figure on the given strings: rising, falling, or the pair struck together and let ring."""
    step = 1 / per_beat
    b = beat
    i = 0
    seq = {"rise": notes, "fall": notes[::-1], "wave": notes + notes[-2:0:-1]}.get(pattern, notes)
    while b < beat + beats - 1e-6:
        if pattern == "strum":
            for k, m in enumerate(notes):
                s.note(inst, b + k * 0.04, m, 0, vel * (0.9 - 0.08 * k))
            b += beats if beats < 4 else 2
            continue
        s.note(inst, b, seq[i % len(seq)], 0, vel * (1 if i % len(seq) == 0 else 0.8))
        i += 1
        b += step


def bars(n: float, per: int = 4) -> float:
    return n * per
