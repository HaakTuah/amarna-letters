"""A score, and how it is rendered: notes placed in beats, played on the sampled instruments and the synthesised choir,
mixed in one hall, mastered to one loudness and written out as compressed audio."""

from __future__ import annotations

import json
import os
import subprocess
from dataclasses import dataclass, field

import numpy as np
from scipy.signal import butter, fftconvolve, sosfilt

import voice
from samples import SR, catalogue

# How much of each instrument goes to the hall (the rest is heard dry), and its place front to back.
SEND = {
    "violins": 0.45, "violas": 0.45, "celli": 0.4, "bass": 0.35, "violins_trem": 0.45, "celli_trem": 0.4,
    "celli_pizz": 0.3, "violins_pizz": 0.3, "lyre": 0.35, "harp": 0.4, "psaltery": 0.4, "reed": 0.32,
    "reed_plain": 0.32, "low_reed": 0.35, "pipe": 0.4, "recorder": 0.38, "horn": 0.5, "trumpet": 0.45,
    "frame_lo": 0.3, "frame_mute": 0.22, "frame_hi": 0.25, "darbuka": 0.2, "darbuka_tek": 0.2, "big_drum": 0.4,
    "timpani": 0.45, "timpani_roll": 0.45, "gong": 0.5, "cymbal": 0.4, "sistrum": 0.3, "tambourine": 0.3,
    "shaker": 0.25, "bells": 0.5, "claps": 0.3, "log": 0.3, "ocean": 0.2, "scrape": 0.5, "choir": 0.55,
}


@dataclass
class Event:
    t: float  # seconds
    inst: str
    midi: int
    dur: float  # seconds; <= 0 lets it ring
    vel: float
    bend: list | None = None
    vowel: str = "a"
    singers: int = 6


@dataclass
class Score:
    bpm: float
    seed: int = 0
    events: list[Event] = field(default_factory=list)
    phrases: list[float] = field(default_factory=list)  # phrase ends, in beats
    humanize: float = 0.012
    tempo_map: list[tuple[float, float]] | None = None  # (beat, bpm) changes, for a slowing at the end

    def __post_init__(self) -> None:
        self.rng = np.random.default_rng(self.seed)
        self.rr: dict[str, int] = {}

    def sec(self, beat: float) -> float:
        if not self.tempo_map:
            return beat * 60 / self.bpm
        t, b0, bpm = 0.0, 0.0, self.bpm
        for b, new in sorted(self.tempo_map):
            if beat <= b:
                break
            t += (b - b0) * 60 / bpm
            b0, bpm = b, new
        return t + (beat - b0) * 60 / bpm

    def note(self, inst: str, beat: float, midi: int, beats: float, vel: float = 0.6, bend=None, exact: bool = False) -> None:
        jitter = 0 if exact else self.rng.normal(0, self.humanize)
        v = float(np.clip(vel + (0 if exact else self.rng.normal(0, 0.035)), 0.05, 1))
        t0 = max(0.0, self.sec(beat) + jitter)
        dur = self.sec(beat + beats) - self.sec(beat) if beats > 0 else 0
        self.events.append(Event(t0, inst, int(midi), dur, v, bend))

    def hit(self, inst: str, beat: float, vel: float = 0.6) -> None:
        self.note(inst, beat, 0, 0, vel)

    def sing(self, beat: float, midi: int, beats: float, vel: float = 0.5, vowel: str = "a", singers: int = 6, bend=None) -> None:
        t0 = max(0.0, self.sec(beat) + self.rng.normal(0, 0.02))
        dur = self.sec(beat + beats) - self.sec(beat)
        self.events.append(Event(t0, "choir", int(midi), dur, vel, bend, vowel, singers))

    def phrase(self, beat: float) -> None:
        self.phrases.append(beat)

    def render(self) -> np.ndarray:
        cat = catalogue()
        end = max(e.t + max(e.dur, 0) for e in self.events) + 6
        n = int(end * SR)
        dry = np.zeros((n, 2), np.float32)
        wet = np.zeros((n, 2), np.float32)
        for i, e in enumerate(sorted(self.events, key=lambda e: e.t)):
            if e.inst == "choir":
                x = voice.sing(e.midi, e.dur, e.vel, e.vowel, e.singers, seed=self.seed * 1000 + i,
                               bend=None if e.bend is None else np.array(e.bend))
            else:
                inst = cat[e.inst]
                k = self.rr.get(e.inst, 0)
                self.rr[e.inst] = k + 1
                x = inst.render(e.midi, e.vel, e.dur, rr=k + int(self.rng.integers(0, 3)),
                                bend=None if e.bend is None else np.array(e.bend))
            a = int(e.t * SR)
            b = min(n, a + len(x))
            if b <= a:
                continue
            s = SEND.get(e.inst, 0.35)
            dry[a:b] += x[: b - a] * (1 - s * 0.5)
            wet[a:b] += x[: b - a] * s
        return master(dry + hall(wet))


_ir = None


def impulse(rt60: float = 3.4) -> np.ndarray:
    """A large stone hall's answer: early reflections, then a diffuse tail whose highs die sooner than its lows."""
    global _ir
    if _ir is not None:
        return _ir
    rng = np.random.default_rng(7)
    n = int(rt60 * 1.2 * SR)
    t = np.arange(n) / SR
    out = np.zeros((n, 2), np.float32)
    for c in range(2):
        noise = rng.standard_normal(n)
        low = sosfilt(butter(2, 1800, "low", fs=SR, output="sos"), noise) * np.exp(-6.9 * t / rt60)
        high = sosfilt(butter(2, 1800, "high", fs=SR, output="sos"), noise) * np.exp(-6.9 * t / (rt60 * 0.45))
        tail = (low + 0.5 * high) * np.minimum(1, t / 0.06)
        pre = int(0.022 * SR)
        out[pre:, c] = tail[: n - pre]
        for k in range(12):
            d = int(rng.uniform(0.008, 0.07) * SR)
            out[d, c] += rng.uniform(0.2, 0.5) * (1 if rng.random() > 0.5 else -1)
    out /= np.sqrt((out ** 2).sum(axis=0)).max()
    _ir = out
    return out


def hall(x: np.ndarray) -> np.ndarray:
    ir = impulse()
    y = np.stack([fftconvolve(x[:, c], ir[:, c])[: len(x)] for c in range(2)], axis=1)
    return (y * 1.6).astype(np.float32)


def master(x: np.ndarray) -> np.ndarray:
    """Cleans the low end, evens the dynamics a little, keeps the peaks under the ceiling."""
    x = sosfilt(butter(2, 32, "high", fs=SR, output="sos"), x, axis=0)
    # Tone: a little less of the low middle, where held strings and voices pile up, and a little more air on top.
    x = x - 0.3 * sosfilt(butter(1, [180, 420], "band", fs=SR, output="sos"), x, axis=0)
    x = x + 0.5 * sosfilt(butter(1, 3500, "high", fs=SR, output="sos"), x, axis=0)
    # A slow, gentle compressor on the sum: 1.5:1 above -16 dBFS RMS, so the music keeps its rise and fall.
    rms = np.sqrt(sosfilt(butter(1, 3, "low", fs=SR, output="sos"), (x ** 2).mean(axis=1)) + 1e-9)
    db = 20 * np.log10(rms)
    gain_db = np.where(db > -16, -(db + 16) * (1 - 1 / 1.5), 0)
    x = x * (10 ** (gain_db / 20))[:, None]
    # Trim the tail of silence.
    env = np.abs(x).max(axis=1)
    last = len(env) - int(np.argmax(env[::-1] > 10 ** (-56 / 20) * max(env.max(), 1e-9)))
    x = x[: min(len(x), last + SR // 2)]
    fade = min(len(x), SR)
    x[-fade:] *= np.linspace(1, 0, fade)[:, None]
    return x.astype(np.float32)


def write(x: np.ndarray, path: str, lufs: float, bitrate: str = "64k", work: str = "/tmp/amarna-render") -> dict:
    """Normalises to the loudness asked (integrated LUFS, by ffmpeg's EBU R128 meter), limits the true peak to
    -1.5 dBTP, and encodes AAC in an .m4a, which every browser plays."""
    os.makedirs(work, exist_ok=True)
    import soundfile as sf

    wav = os.path.join(work, os.path.basename(path) + ".wav")
    peak = np.abs(x).max()
    sf.write(wav, x / peak * 0.5 if peak > 0 else x, SR, subtype="FLOAT")
    # Short sounds are measured padded to three seconds (the meter's silence gate leaves the padding out).
    pad = max(0.0, 3.0 - len(x) / SR)
    probe = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", wav, "-af", f"apad=pad_dur={pad:.2f},loudnorm=print_format=json", "-f", "null", "-"],
                           capture_output=True, text=True).stderr
    measured = json.loads(probe[probe.rindex("{"): probe.rindex("}") + 1])
    gain = lufs - float(measured["input_i"])
    af = f"volume={gain:.2f}dB,alimiter=limit=0.84:attack=5:release=80:level=false"
    os.makedirs(os.path.dirname(path), exist_ok=True)
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", wav, "-af", af, "-c:a", "aac", "-b:a", bitrate,
                    "-movflags", "+faststart", path], check=True)
    os.remove(wav)
    import hashlib

    digest = hashlib.sha256(open(path, "rb").read()).hexdigest()[:10]
    return {"seconds": round(len(x) / SR, 2), "lufs": lufs, "hash": digest}
