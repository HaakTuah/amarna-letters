"""The game's musical voice: the Hurrian Hymn of Ugarit (h.6, about 1400 BCE) and the Babylonian tunings.

The hymn's notation names a pair of the lyre's strings and a number, again and again. Read here (the reading is listed in
the item's report): the strings are numbered 1 to 7 rising, tuned in nīd qablim; the first string named sings the
melody and the second sounds beneath it on the lyre; the number is the length in beats. Lines 1 and 2 are as the
standard transcription gives them (Laroche's edition of RS 15.30 + 15.49 + 17.387, as Wikipedia's "Hurrian songs"
reproduces it); lines 3 and 4 are as the same edition is usually reproduced, to be checked against Dietrich and Loretz
(1975) and West (1994).

The seven tunings of the Babylonian theory texts (CBS 10996, UET VII 126) are read as the seven diatonic modes, after
Kilmer and Crocker's reading: each renames which string the scale starts from.
"""

from __future__ import annotations

# Interval names of h.6 (Hurrian forms) and the strings they name (Akkadian theory-text pairs).
DYADS = {
    "qablite": (5, 2),       # qablītum
    "irbute": (2, 7),        # rebûttum
    "shahri": (7, 5),        # šērum
    "isharte": (2, 6),       # išartum
    "titimisharte": (3, 5),  # titur išartim
    "zirte": (4, 6),         # ṣ/zerdum
    "shashshate": (1, 6),    # šalšatum
    "embube": (3, 7),        # embūbum
    "kitme": (6, 3),         # kitmum
}

NOTATION = [
    [("qablite", 3), ("irbute", 1), ("qablite", 3), ("shahri", 1), ("isharte", 10)],
    [("titimisharte", 2), ("zirte", 1), ("shahri", 2), ("shashshate", 2), ("irbute", 2)],
    [("embube", 1), ("shahri", 2), ("shashshate", 4), ("zirte", 1), ("shahri", 1), ("shashshate", 4), ("shahri", 1), ("shashshate", 2)],
    [("shahri", 1), ("shashshate", 2), ("irbute", 2), ("kitme", 2), ("qablite", 3), ("kitme", 1), ("qablite", 4), ("kitme", 1), ("qablite", 2)],
]

# The seven tunings as modes: semitone steps above the first note of the scale.
STEPS = {
    "isartum": [0, 2, 4, 5, 7, 9, 11],      # Ionian
    "kitmum": [0, 2, 4, 6, 7, 9, 11],       # Lydian
    "embubum": [0, 2, 4, 5, 7, 9, 10],      # Mixolydian
    "pitum": [0, 2, 3, 5, 7, 9, 10],        # Dorian
    "nid_qablim": [0, 2, 3, 5, 7, 8, 10],   # Aeolian
    "nis_tuhrim": [0, 1, 3, 5, 7, 8, 10],   # Phrygian
    "qablitum": [0, 1, 3, 5, 6, 8, 10],     # Locrian
}

# Seven strings in nīd qablim with the tonic on A: string 1 is D4 so that the hymn's centre (strings 5, 2, 7) is A, E, C.
STRINGS = [62, 64, 65, 67, 69, 71, 72]


class Mode:
    """A tuning on a tonic: degree 0 is the tonic, degrees run on through the octaves both ways."""

    def __init__(self, tuning: str, tonic: int) -> None:
        self.steps = STEPS[tuning]
        self.tonic = tonic
        self.name = tuning

    def __call__(self, degree: int, octave: int = 0) -> int:
        o, d = divmod(degree, 7)
        return self.tonic + 12 * (o + octave) + self.steps[d]

    def chord(self, degree: int, kind: str = "open", octave: int = 0) -> list[int]:
        """Period harmony: open fifths and fourths, a third only where it colours."""
        # Where the fifth above a degree is diminished (the tonic's own in qablītum, the fourth degree's in kitmum), the
        # open chord takes the fourth instead, as a lyre tuned to that string pair would be struck.
        fifth = degree + (3 if (self(degree + 4) - self(degree)) % 12 == 6 else 4)
        if kind == "open":
            return [self(degree, octave), self(fifth, octave)]
        if kind == "triad":
            return [self(degree, octave), self(degree + 2, octave), self(fifth, octave)]
        if kind == "sus":
            return [self(degree, octave), self(degree + 3, octave), self(degree + 4, octave)]
        if kind == "wide":
            return [self(degree, octave - 1), self(degree + 4, octave - 1), self(degree + 7, octave), self(degree + 9, octave)]
        raise ValueError(kind)


def hymn(transpose: int = 0, lines: list[int] | None = None) -> list[list[tuple[int, int, float]]]:
    """The hymn by lines: (melody note, the string beneath it, beats) for each pair of the notation."""
    out = []
    for i, line in enumerate(NOTATION):
        if lines is not None and i not in lines:
            continue
        row = []
        for name, count in line:
            a, b = DYADS[name]
            row.append((STRINGS[a - 1] + transpose, STRINGS[b - 1] + transpose, float(count)))
        out.append(row)
    return out


def hymn_in(mode: Mode, lines: list[int] | None = None) -> list[list[tuple[int, int, float]]]:
    """The hymn's string pairs carried into another tuning on another tonic: each string keeps its degree.

    In nīd qablim on A, string 5 (A) is degree 0, so string k is degree k - 5."""
    out = []
    for i, line in enumerate(NOTATION):
        if lines is not None and i not in lines:
            continue
        out.append([(mode(a - 5), mode(b - 5), float(c)) for (n, c) in line for a, b in [DYADS[n]]])
    return out


# The tunings from the brightest to the darkest (as tunings.ts orders them): one step darker lowers one degree a semitone.
ORDER = ["kitmum", "isartum", "embubum", "pitum", "nid_qablim", "nis_tuhrim", "qablitum"]


def shaded(tuning: str, by: int) -> str:
    """The tuning `by` steps brighter (positive) or darker (negative) than the one given, stopping at the ends."""
    i = ORDER.index(tuning) - by
    return ORDER[max(0, min(len(ORDER) - 1, i))]
