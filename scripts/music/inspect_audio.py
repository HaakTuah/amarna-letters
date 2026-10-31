"""A look at rendered audio without ears: spectrogram, loudness over time, peaks, and clicks.

python3 scripts/music/inspect_audio.py file.m4a [out.png]
"""

from __future__ import annotations

import subprocess
import sys

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402
from scipy.signal import butter, sosfilt, spectrogram  # noqa: E402

SR = 44100


def decode(path: str) -> np.ndarray:
    raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", path, "-f", "f32le", "-ac", "2", "-ar", str(SR), "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, 2)


def report(path: str, png: str | None) -> None:
    x = decode(path)
    mono = x.mean(axis=1)
    peak = np.abs(x).max()
    hop = SR // 2
    rms = np.array([np.sqrt((mono[i:i + hop] ** 2).mean() + 1e-12) for i in range(0, len(mono) - hop, hop)])
    db = 20 * np.log10(rms)
    # Clicks: a jump in the high band far above its neighbourhood.
    hi = sosfilt(butter(4, 6000, "high", fs=SR, output="sos"), mono)
    env = np.abs(hi)
    win = 2048
    local = np.convolve(env, np.ones(win) / win, mode="same") + 1e-6
    clicks = np.where(env > 25 * local)[0]
    clicks = clicks[np.diff(np.concatenate([[-SR], clicks])) > SR // 10]
    bands = [(30, 120), (120, 500), (500, 2000), (2000, 6000), (6000, 16000)]
    spec = np.abs(np.fft.rfft(mono[: min(len(mono), 60 * SR)]))
    f = np.fft.rfftfreq(min(len(mono), 60 * SR), 1 / SR)
    tot = (spec ** 2).sum()
    shares = [100 * (spec[(f >= a) & (f < b)] ** 2).sum() / tot for a, b in bands]
    print(f"{path}: {len(x) / SR:.1f}s peak {20 * np.log10(peak):.1f} dBFS, loudness range {np.percentile(db, 10):.0f}..{np.percentile(db, 95):.0f} dB RMS, "
          f"silent halves {int((db < -50).sum())}, clicks {len(clicks)} at {[round(c / SR, 1) for c in clicks[:6]]}")
    print("  energy by band %: " + ", ".join(f"{a}-{b}: {s:.0f}" for (a, b), s in zip(bands, shares)))
    if png:
        fr, t, S = spectrogram(mono, SR, nperseg=2048, noverlap=1024)
        fig, ax = plt.subplots(2, 1, figsize=(14, 6), gridspec_kw={"height_ratios": [3, 1]})
        ax[0].pcolormesh(t, fr, 10 * np.log10(S + 1e-12), shading="auto", vmin=-110, vmax=-30, cmap="magma")
        ax[0].set_yscale("symlog", linthresh=200)
        ax[0].set_ylim(30, 12000)
        ax[1].plot(np.arange(len(db)) * 0.5, db)
        ax[1].set_ylim(-60, 0)
        ax[1].grid(True)
        fig.tight_layout()
        fig.savefig(png, dpi=60)


if __name__ == "__main__":
    report(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else None)
