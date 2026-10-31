"""The choir: no free-licensed choir recording was to be had, so the voices are synthesised.

Each singer is a wavetable shaped by the formants of a sung vowel, with its own small detuning, a vibrato that grows in
after the attack, a slow drift, and breath. A section is several singers on one note, spread across the stereo field.
"""

from __future__ import annotations

import numpy as np
from scipy.signal import butter, sosfilt

from samples import SR, velocity_gain

# Formants (Hz, bandwidth Hz, level dB) of sung vowels, after the usual tables of singers' formants.
FORMANTS = {
    "low": {
        "a": [(650, 90, 0), (1080, 110, -6), (2650, 120, -24), (2900, 130, -26), (3250, 140, -36)],
        "o": [(400, 70, 0), (800, 80, -10), (2600, 100, -30), (2800, 120, -36), (3000, 130, -44)],
        "u": [(350, 60, 0), (600, 70, -18), (2700, 100, -38), (2900, 120, -46), (3300, 120, -52)],
    },
    "high": {
        "a": [(800, 90, 0), (1150, 100, -5), (2900, 120, -26), (3900, 130, -24), (4950, 140, -50)],
        "o": [(450, 70, 0), (800, 80, -10), (2830, 100, -34), (3500, 120, -34), (4950, 130, -50)],
        "u": [(325, 60, 0), (700, 70, -18), (2700, 100, -40), (3800, 120, -46), (4950, 120, -60)],
    },
}

TABLE = 4096
_tables: dict = {}


def _envelope(freqs: np.ndarray, register: str, vowel: str) -> np.ndarray:
    amp = np.full_like(freqs, 1e-4)
    for f, bw, db in FORMANTS[register][vowel]:
        amp += 10 ** (db / 20) / (1 + ((freqs - f) / bw) ** 2)
    # A gentle glottal tilt.
    return amp * (1 + freqs / 400) ** -0.6


def table(f0: float, register: str, vowel: str) -> np.ndarray:
    """One cycle of a singer's voice at f0, as a wavetable (built once per pitch and vowel)."""
    key = (round(f0, 1), register, vowel)
    if key not in _tables:
        k = np.arange(1, int(7000 / f0) + 1)
        amp = _envelope(k * f0, register, vowel)
        rng = np.random.default_rng(int(f0 * 10))
        ph = rng.uniform(0, 2 * np.pi, len(k))
        t = np.arange(TABLE) / TABLE * 2 * np.pi
        w = (amp[:, None] * np.sin(k[:, None] * t[None, :] + ph[:, None])).sum(axis=0)
        _tables[key] = (w / np.abs(w).max()).astype(np.float32)
    return _tables[key]


def _drift(n: int, rng: np.random.Generator, rate: float = 1.5) -> np.ndarray:
    """A slow random wander, smoothed to a few hertz."""
    pts = max(4, int(n / SR * rate) + 3)
    return np.interp(np.arange(n), np.linspace(0, n, pts), rng.standard_normal(pts))


def sing(midi: float, dur: float, vel: float, vowel: str = "a", singers: int = 6, seed: int = 0, attack: float = 0.35,
         release: float = 0.9, bend: np.ndarray | None = None) -> np.ndarray:
    """A section of singers holding one note for dur seconds, then letting it go."""
    register = "high" if midi >= 60 else "low"
    f0 = 440 * 2 ** ((midi - 69) / 12)
    n = int((dur + release) * SR)
    rng = np.random.default_rng(seed)
    w = table(f0, register, vowel)
    t = np.arange(n) / SR
    env = np.minimum(1, t / attack) ** 1.5
    hold = int(dur * SR)
    if hold < n:
        env[hold:] *= np.linspace(1, 0, n - hold) ** 1.6
    out = np.zeros((n, 2), np.float32)
    curve = 0 if bend is None else np.interp(np.arange(n), np.linspace(0, n - 1, len(bend)), bend) * 100
    for s in range(singers):
        cents = rng.uniform(-9, 9) + 4 * _drift(n, rng) + curve
        rate = rng.uniform(4.6, 5.8)
        depth = rng.uniform(10, 22) * np.minimum(1, np.maximum(0, (t - 0.25) / 0.8))
        cents = cents + depth * np.sin(2 * np.pi * rate * t + rng.uniform(0, 6.28))
        f = f0 * 2 ** (cents / 1200)
        phase = (np.cumsum(f) / SR * TABLE + rng.uniform(0, TABLE)) % TABLE
        x = np.interp(phase, np.arange(TABLE + 1), np.append(w, w[0]))
        # Each singer's loudness breathes a little.
        x *= 1 + 0.12 * _drift(n, rng, 0.8)
        pan = (s / max(1, singers - 1) - 0.5) * 1.2
        out[:, 0] += x * np.cos((pan + 1) * np.pi / 4)
        out[:, 1] += x * np.sin((pan + 1) * np.pi / 4)
    # Breath: noise through the first two formants.
    noise = rng.standard_normal(n).astype(np.float32)
    f1, f2 = FORMANTS[register][vowel][0][0], FORMANTS[register][vowel][1][0]
    sos = butter(2, [max(80, f1 * 0.7), min(SR / 2 - 100, f2 * 1.6)], btype="band", fs=SR, output="sos")
    breath = sosfilt(sos, noise) * 0.04 * singers
    out[:, 0] += breath
    out[:, 1] += np.roll(breath, 331)
    # Soften the top: a section heard across a hall.
    sos = butter(2, 5200, btype="low", fs=SR, output="sos")
    out = sosfilt(sos, out, axis=0)
    out *= (env * velocity_gain(vel) / singers * 0.22)[:, None]
    return out.astype(np.float32)
