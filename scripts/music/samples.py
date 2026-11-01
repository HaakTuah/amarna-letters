"""The sampled instruments: CC0 recordings from VSCO 2 Community Edition and the Versilian Community Sample Library.

Each instrument is a folder of one-note recordings. A note is played from the recording nearest in pitch, resampled to
the pitch wanted, so no recording is ever stretched more than a few semitones. Each recording's real pitch is measured
once (the libraries name their octaves differently) and kept in `pitches.json` beside the samples.

Where the samples live, and how to fetch them, is in `docs/audio/SOURCES.md`.
"""

from __future__ import annotations

import glob
import json
import os
import re
from dataclasses import dataclass, field

import numpy as np
import soundfile as sf

SR = 44100
ROOT = os.environ.get("AMARNA_SAMPLES", "/tmp/dl")

NOTE = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}
DYN = {"pp": 1, "p": 1, "mp": 2, "mf": 2, "f": 3, "ff": 4, "fff": 4}


def midi_of(name: str) -> int | None:
    """The MIDI note a file's name gives (scientific octaves, before the measured correction)."""
    m = re.search(r"(?:^|[_ ])([A-G])([#b]?)(-?\d)(?=[_ .])", name)
    if not m:
        return None
    n = NOTE[m.group(1)] + (1 if m.group(2) == "#" else -1 if m.group(2) == "b" else 0)
    return 12 * (int(m.group(3)) + 1) + n


def layer_of(name: str) -> int:
    m = re.search(r"_v(\d)", name) or re.search(r"_vl(\d)", name)
    if m:
        return int(m.group(1))
    m = re.search(r"_(pp|mp|mf|ff|fff|p|f)(?=[_.])", name)
    return DYN[m.group(1)] if m else 2


def load(path: str) -> np.ndarray:
    """A recording as stereo float32 at 44.1 kHz, its leading silence trimmed."""
    x, sr = sf.read(path, dtype="float32", always_2d=True)
    if x.shape[1] == 1:
        x = np.repeat(x, 2, axis=1)
    x = x[:, :2]
    if sr != SR:
        t = np.arange(0, len(x) * SR / sr) * sr / SR
        x = np.stack([np.interp(t, np.arange(len(x)), x[:, c]) for c in range(2)], axis=1).astype(np.float32)
    env = np.abs(x).max(axis=1)
    peak = env.max() if len(env) else 0
    if peak > 0:
        start = int(np.argmax(env > peak * 0.02))
        x = x[max(0, start - 64):]
    return x


def measure_pitch(x: np.ndarray) -> float | None:
    """The fundamental of a sustained or plucked note, by autocorrelation over a steady stretch."""
    mono = x.mean(axis=1)
    a = int(0.15 * SR)
    seg = mono[a:a + int(0.4 * SR)]
    if len(seg) < 4096 or np.abs(seg).max() < 1e-4:
        seg = mono[: int(0.4 * SR)]
    seg = seg - seg.mean()
    n = 1 << int(np.ceil(np.log2(len(seg) * 2)))
    f = np.fft.rfft(seg * np.hanning(len(seg)), n)
    ac = np.fft.irfft(np.abs(f) ** 2)[: len(seg)]
    lo, hi = int(SR / 2200), int(SR / 25)
    if hi >= len(ac):
        return None
    lag = lo + int(np.argmax(ac[lo:hi]))
    if ac[lag] <= 0:
        return None
    # The first strong peak, not a multiple of the period.
    for div in (4, 3, 2):
        cand = lag / div
        i = int(round(cand))
        if i >= lo and ac[i] > 0.85 * ac[lag]:
            lag = i
            break
    return SR / lag


def normalise(x: np.ndarray, sustained: bool) -> np.ndarray:
    """Every recording brought to one level, so an instrument's gain is a choice of the mix, not of how loud it was
    recorded: held notes by the loudness of their first second and a half, struck and plucked ones by their peak."""
    if sustained:
        seg = x[int(0.1 * SR): int(1.6 * SR)]
        level = np.sqrt((seg ** 2).mean()) if len(seg) else 0
        target = 10 ** (-20 / 20)
    else:
        level = np.abs(x).max()
        target = 10 ** (-6 / 20)
    return (x * (target / level)).astype(np.float32) if level > 0 else x


def velocity_gain(vel: float) -> float:
    """How loud a velocity (0..1) plays: about 7 dB between a soft 0.3 and a firm 0.6, 1.0 at 0.55."""
    return ((0.1 + 0.9 * vel) ** 1.4) / 0.48


@dataclass
class Instrument:
    name: str
    folder: str
    pattern: str = "*.wav"
    pitched: bool = True
    gain: float = 1.0
    pan: float = 0.0
    release: float = 0.25
    sustained: bool = True  # levelled by its held sound (RMS); plucked and struck ones by their peak
    # Recordings by (midi, layer): a list of round-robin takes.
    notes: dict[tuple[int, int], list[str]] = field(default_factory=dict)
    cache: dict = field(default_factory=dict)

    def scan(self, pitches: dict[str, float]) -> None:
        files = sorted(glob.glob(os.path.join(ROOT, self.folder, self.pattern)))
        if not files:
            raise FileNotFoundError(f"{self.name}: no samples in {self.folder}")
        for f in files:
            base = os.path.basename(f)
            if self.pitched:
                key = os.path.relpath(f, ROOT)
                if key not in pitches:
                    hz = measure_pitch(load(f))
                    pitches[key] = hz if hz else -1
                hz = pitches[key]
                named = midi_of(base)
                if named is None:
                    continue
                if hz and hz > 0:
                    measured = 69 + 12 * np.log2(hz / 440)
                    # Keep the name's pitch class; take the octave the measurement shows.
                    octave = round((measured - named) / 12)
                    midi = named + 12 * octave
                else:
                    midi = named
            else:
                midi = 0
            self.notes.setdefault((midi, layer_of(base)), []).append(f)

    def layers(self) -> list[int]:
        return sorted({k[1] for k in self.notes})

    def pick(self, midi: int, vel: float, rr: int) -> tuple[str, int]:
        """The recording for a note: the nearest pitch, the layer for the velocity (0..1), a round-robin take."""
        layers = self.layers()
        layer = layers[min(len(layers) - 1, int(vel * len(layers)))]
        keys = [k for k in self.notes if k[1] == layer] or list(self.notes)
        if self.pitched:
            # Prefer recordings at or a little above the note: shifting down sounds more natural than up.
            k = min(keys, key=lambda k: abs(k[0] - midi) + (0.4 if k[0] < midi else 0))
        else:
            k = keys[rr % len(keys)]
        takes = self.notes[k]
        return takes[rr % len(takes)], k[0]

    def render(self, midi: int, vel: float, dur: float, rr: int = 0, bend: np.ndarray | None = None) -> np.ndarray:
        """One note: the recording shifted to pitch, held for dur seconds then released (dur <= 0: let it ring)."""
        path, base = self.pick(midi, vel, rr)
        key = (path,)
        if key not in self.cache:
            self.cache[key] = normalise(load(path), self.sustained)
        x = self.cache[key]
        ratio = 2 ** ((midi - base) / 12) if self.pitched else 1.0
        length = len(x) / ratio
        if dur > 0:
            length = min(length, (dur + self.release) * SR)
        n = int(length)
        if n <= 8:
            return np.zeros((0, 2), np.float32)
        if bend is not None and len(bend):
            # A pitch curve in semitones across the note (glides and ornaments of the reed and the voice).
            curve = np.interp(np.arange(n), np.linspace(0, n - 1, len(bend)), bend)
            pos = np.cumsum(ratio * 2 ** (curve / 12)) - ratio
        else:
            pos = np.arange(n) * ratio
        pos = pos[pos < len(x) - 1]
        n = len(pos)
        out = np.stack([np.interp(pos, np.arange(len(x)), x[:, c]) for c in range(2)], axis=1)
        if dur > 0:
            hold = int(dur * SR)
            if hold < n:
                rel = n - hold
                out[hold:] *= np.linspace(1, 0, rel)[:, None] ** 2
        fade = min(256, n)
        out[-fade:] *= np.linspace(1, 0, fade)[:, None]
        g = self.gain * velocity_gain(vel)
        left, right = np.cos((self.pan + 1) * np.pi / 4), np.sin((self.pan + 1) * np.pi / 4)
        out[:, 0] *= g * left * 1.414
        out[:, 1] *= g * right * 1.414
        return out.astype(np.float32)


V = "vsco/"
L = "vcsl/"
CATALOGUE = {
    # Strings: warm sections, the bowed bed of every piece.
    "violins": Instrument("violins", V + "Strings/Violin Section/susVib", gain=0.6, pan=-0.35, release=0.6),
    "violas": Instrument("violas", V + "Strings/Viola Section/susvib", gain=0.5, pan=0.25, release=0.6),
    "celli": Instrument("celli", V + "Strings/Cello Section/susvib", gain=0.55, pan=0.35, release=0.7),
    "bass": Instrument("bass", V + "Strings/Solo Contrabass/SusVib", gain=0.6, pan=0.1, release=0.7),
    "violins_trem": Instrument("violins_trem", V + "Strings/Violin Section/Trem", gain=0.5, pan=-0.35, release=0.4),
    "celli_trem": Instrument("celli_trem", V + "Strings/Cello Section/trem", gain=0.5, pan=0.35, release=0.4),
    "celli_pizz": Instrument("celli_pizz", V + "Strings/Cello Section/pizzT", gain=0.6, pan=0.3, release=0.3, sustained=False),
    "violins_pizz": Instrument("violins_pizz", V + "Strings/Violin Section/Pizz", gain=0.55, pan=-0.3, release=0.3, sustained=False),
    # The lyre and the harp: a folk harp's gut strings and a pluck of the psaltery stand for the period's lyres.
    "lyre": Instrument("lyre", L + "Chordophones/Composite Chordophones/Folk Harp", pattern="*Normal*.wav", gain=0.75, pan=-0.15, release=1.5, sustained=False),
    "harp": Instrument("harp", V + "Strings/Harp", gain=0.85, pan=0.2, release=2.0, sustained=False),
    "psaltery": Instrument("psaltery", L + "Chordophones/Zithers/Psaltery, Bowed and Plucked/Pluck", gain=0.8, pan=0.3, release=1.5, sustained=False),
    # Reeds and pipes: the oboe stands for the double reed, the recorder and the flute for the pipes.
    "reed": Instrument("reed", V + "Woodwinds/Oboe/Vib", gain=0.9, pan=0.05, release=0.35),
    "reed_plain": Instrument("reed_plain", V + "Woodwinds/Oboe/Sus", gain=0.9, pan=0.05, release=0.35),
    "low_reed": Instrument("low_reed", V + "Woodwinds/Clarinet/susLong", gain=0.85, pan=-0.2, release=0.4),
    "pipe": Instrument("pipe", V + "Woodwinds/Flute/susvib", gain=0.85, pan=-0.1, release=0.4),
    "recorder": Instrument("recorder", L + "Aerophones/Edge-blown Aerophones/Baroque Tenor Recorder/Sustain", gain=0.85, pan=-0.25, release=0.3),
    # Horns: the war horn and Egypt's trumpets.
    "horn": Instrument("horn", V + "Brass/F Horn/sus", gain=0.7, pan=-0.2, release=0.5),
    "trumpet": Instrument("trumpet", V + "Brass/Trumpet/sus", gain=0.65, pan=0.2, release=0.4),
    # Drums: frame drums, the darbuka's goblet drum, the big hand drum, timpani for weight.
    "frame_lo": Instrument("frame_lo", L + "Membranophones/Struck Membranophones/Frame Drum", pattern="HDrumL_Hit_*.wav", pitched=False, sustained=False, gain=0.75, pan=-0.15, release=1.0),
    "frame_mute": Instrument("frame_mute", L + "Membranophones/Struck Membranophones/Frame Drum", pattern="HDrumS_HitMuted_*.wav", pitched=False, sustained=False, gain=0.75, pan=0.2, release=0.5),
    "frame_hi": Instrument("frame_hi", L + "Membranophones/Struck Membranophones/Frame Drum", pattern="HDrumS_Hit_*.wav", pitched=False, sustained=False, gain=0.7, pan=0.25, release=0.8),
    "darbuka": Instrument("darbuka", L + "Membranophones/Struck Membranophones/Darbuka", pattern="Darbuka_[12]_*.wav", pitched=False, sustained=False, gain=0.6, pan=0.3, release=0.4),
    "darbuka_tek": Instrument("darbuka_tek", L + "Membranophones/Struck Membranophones/Darbuka", pattern="Darbuka_[34]_*.wav", pitched=False, sustained=False, gain=0.6, pan=0.35, release=0.3),
    "big_drum": Instrument("big_drum", V + "VSCO 1 Percussion/drums/other/ethnic/giant/hand", pattern="*hit*.wav", pitched=False, sustained=False, gain=0.8, pan=0.0, release=1.5),
    "timpani": Instrument("timpani", V + "Percussion/Timpani", pattern="Timpani1_Hit_*.wav", pitched=False, sustained=False, gain=0.6, pan=0.0, release=2.0),
    "timpani_roll": Instrument("timpani_roll", V + "Percussion/Timpani/Rolls", pitched=False, sustained=False, gain=0.5, pan=0.0, release=1.0),
    # Metal and rattles: finger cymbals, the gong, the sistrum's jingles (sleigh bells and a tambourine stand for it).
    "gong": Instrument("gong", V + "VSCO 1 Percussion/varMetal/Gong", pattern="gong_hit_*.wav", pitched=False, sustained=False, gain=0.5, pan=0.0, release=4.0),
    "cymbal": Instrument("cymbal", L + "Idiophones/Struck Idiophones/Finger Cymbals", pitched=False, sustained=False, gain=0.6, pan=0.4, release=2.0),
    "sistrum": Instrument("sistrum", L + "Idiophones/Struck Idiophones/Sleigh Bells", pitched=False, sustained=False, gain=0.55, pan=-0.35, release=1.0),
    "tambourine": Instrument("tambourine", L + "Idiophones/Struck Idiophones/Tambourine 1", pattern="Tamb1_Hit_*.wav", pitched=False, sustained=False, gain=0.5, pan=0.4, release=0.6),
    "shaker": Instrument("shaker", L + "Idiophones/Struck Idiophones/Shaker, Small", pitched=False, sustained=False, gain=0.5, pan=-0.4, release=0.3),
    "bells": Instrument("bells", L + "Idiophones/Struck Idiophones/Hand Bells, Nepalese", pitched=False, sustained=False, gain=0.6, pan=0.3, release=3.0),
    "claps": Instrument("claps", L + "Idiophones/Struck Idiophones/Claps", pitched=False, sustained=False, gain=0.5, pan=-0.2, release=0.3),
    "log": Instrument("log", L + "Idiophones/Struck Idiophones/Slit Drum", pitched=False, sustained=False, gain=0.6, pan=0.2, release=0.6),
    "ocean": Instrument("ocean", L + "Membranophones/Other Membranophones/Ocean Drum", pitched=False, sustained=False, gain=0.6, release=1.0),
    "scrape": Instrument("scrape", V + "VSCO 1 Percussion/varMetal/Cymbals/susp", pattern="susp_FX_scrape_[123].wav", pitched=False, sustained=False, gain=0.4, release=1.0),
}

PITCHES = os.path.join(ROOT, "pitches.json")


def catalogue() -> dict[str, Instrument]:
    pitches = json.load(open(PITCHES)) if os.path.exists(PITCHES) else {}
    for inst in CATALOGUE.values():
        if not inst.notes:
            inst.scan(pitches)
    json.dump(pitches, open(PITCHES, "w"), indent=0)
    return CATALOGUE


if __name__ == "__main__":
    for name, inst in catalogue().items():
        ms = sorted({k[0] for k in inst.notes})
        print(f"{name:14s} layers={inst.layers()} notes={len(ms)} range={ms[0]}..{ms[-1]}")
