"""The sound design, in the manner of Crusader Kings II (its approach, nothing from its files): a short, soft sound in the
period's terms for every action and event, each in a few slight variations; a quiet bed of the world under the music;
and a short sting for the great moments.

Sounds are made from the same CC0 samples as the music where a recorded instrument says it best (the lyre, the horn,
the sistrum's jingles, drums, the gong), and synthesised where nothing recorded fits (clay, a seal, water, wind, a
crowd).
"""

from __future__ import annotations

import os
import zlib

import numpy as np
from scipy.signal import butter, sosfilt

import voice
from samples import SR, catalogue
from score import Score, hall, write

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(REPO, "src/web/public/audio")
VARIANTS = 3


def bp(x: np.ndarray, lo: float, hi: float, order: int = 2) -> np.ndarray:
    return sosfilt(butter(order, [lo, hi], "band", fs=SR, output="sos"), x, axis=0)


def lp(x: np.ndarray, f: float, order: int = 2) -> np.ndarray:
    return sosfilt(butter(order, f, "low", fs=SR, output="sos"), x, axis=0)


def hp(x: np.ndarray, f: float, order: int = 2) -> np.ndarray:
    return sosfilt(butter(order, f, "high", fs=SR, output="sos"), x, axis=0)


def stereo(x: np.ndarray, pan: float = 0.0) -> np.ndarray:
    return np.stack([x * np.cos((pan + 1) * np.pi / 4), x * np.sin((pan + 1) * np.pi / 4)], axis=1) * 1.414


def env(n: int, attack: float, decay: float) -> np.ndarray:
    t = np.arange(n) / SR
    return np.minimum(1, t / max(attack, 1e-4)) * np.exp(-t / decay)


def place(buf: np.ndarray, x: np.ndarray, at: float) -> None:
    a = int(at * SR)
    b = min(len(buf), a + len(x))
    if b > a:
        buf[a:b] += x[: b - a]


def room(x: np.ndarray, wet: float = 0.18) -> np.ndarray:
    """A small dry room, so a sound sits in the same space as the music without its long hall."""
    return x + wet * 0.5 * hall(x * 0.5)


def mod(freqs, decays, amps, dur, rng, detune=0.01):
    """A struck metal or clay body: a few inharmonic modes, each with its own decay."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    out = np.zeros(n)
    for f, d, a in zip(freqs, decays, amps):
        f = f * (1 + rng.uniform(-detune, detune))
        out += a * np.sin(2 * np.pi * f * t + rng.uniform(0, 6.28)) * np.exp(-t / d)
    return out


# The actions and events.


def stylus(rng) -> np.ndarray:
    """The reed stylus pressed into wet clay: a few short wedges, each a soft push and a tiny drag."""
    out = np.zeros((int(1.1 * SR), 2))
    t = 0.04
    for k in range(rng.integers(3, 6)):
        n = int(rng.uniform(0.05, 0.09) * SR)
        noise = rng.standard_normal(n)
        press = bp(noise, 250, 1400) * env(n, 0.004, 0.025) * 0.9
        drag = bp(noise, 1800, 5000) * env(n, 0.01, 0.03) * 0.25
        thock = mod([180, 410], [0.02, 0.012], [0.6, 0.25], n / SR, rng)
        place(out, stereo(press + drag + thock, rng.uniform(-0.2, 0.2)), t)
        t += rng.uniform(0.12, 0.2)
    return room(out[: int((t + 0.15) * SR)])


def seal(rng) -> np.ndarray:
    """A cylinder seal rolled across the clay: a low rolling grind that rises and settles."""
    dur = rng.uniform(0.7, 0.9)
    n = int(dur * SR)
    t = np.arange(n) / SR
    noise = rng.standard_normal(n)
    rate = rng.uniform(16, 22)
    roll = 0.6 + 0.4 * np.sin(2 * np.pi * rate * t) ** 2
    shape = np.sin(np.pi * np.minimum(1, t / dur)) ** 0.7
    body = bp(noise, 120, 700) * roll * shape * 0.9 + bp(noise, 900, 2500) * roll * shape * 0.15
    end = mod([140, 330], [0.05, 0.03], [0.5, 0.2], dur, rng)
    end = np.roll(end * (t < 0.12), int((dur - 0.12) * SR))
    return room(stereo(body + end * 0.6))


def envelope(rng) -> np.ndarray:
    """A tablet closed in its clay envelope: a soft slap and the pressing round of the edges."""
    n = int(0.7 * SR)
    noise = rng.standard_normal(n)
    slap = lp(noise, 1800) * env(n, 0.002, 0.03) + mod([95, 210, 480], [0.06, 0.04, 0.02], [0.8, 0.4, 0.15], 0.7, rng)
    out = stereo(slap * 0.9)
    for k in range(2):
        m = int(0.08 * SR)
        place(out, stereo(bp(rng.standard_normal(m), 300, 1500) * env(m, 0.01, 0.03) * 0.35, rng.uniform(-0.3, 0.3)), 0.25 + k * 0.14)
    return room(out)


def gold(rng) -> np.ndarray:
    """Gold weighed on the scales: rings of metal laid in the pan, and the beam's small knock as it settles."""
    out = np.zeros((int(1.6 * SR), 2))
    t = 0.02
    for k in range(rng.integers(2, 4)):
        base = rng.uniform(2300, 3100)
        ring = mod([base, base * 1.47, base * 2.09, base * 2.76], [0.25, 0.15, 0.09, 0.05], [0.5, 0.3, 0.2, 0.1], 0.8, rng)
        place(out, stereo(ring * 0.5, rng.uniform(-0.3, 0.3)), t)
        t += rng.uniform(0.09, 0.16)
    knock = mod([420, 960], [0.04, 0.02], [0.5, 0.2], 0.3, rng)
    place(out, stereo(knock * 0.5, 0.1), t + 0.12)
    return room(out, 0.25)


def courier(rng) -> np.ndarray:
    """A courier's arrival: his quick steps on the dust and the small bell at his donkey's neck."""
    cat = catalogue()
    out = np.zeros((int(1.6 * SR), 2))
    t = 0.0
    for k in range(4):
        n = int(0.07 * SR)
        step = lp(rng.standard_normal(n), 900) * env(n, 0.003, 0.02) * 0.6 + mod([90], [0.03], [0.4], 0.07, rng)
        place(out, stereo(step, -0.3 + 0.15 * k), t)
        t += rng.uniform(0.16, 0.21)
    bell = cat["bells"].render(0, 0.45, 0, rr=int(rng.integers(0, 9)))
    place(out, bell[: int(1.0 * SR)] * 0.45, t)
    return room(out)


def horn_call(rng, inst: str = "horn") -> np.ndarray:
    """War: a horn's long call (Egypt's trumpets for Egypt's seat, a war horn for the others)."""
    cat = catalogue()
    s = Score(bpm=60, seed=int(rng.integers(0, 10000)))
    base = 45 if inst == "horn" else 60
    if inst == "horn":
        s.note("horn", 0, base, 1.2, 0.7, bend=[-1.2, -0.3, 0, 0, 0, 0, 0, 0, 0, -0.2])
        s.note("horn", 1.25, base + 7, 1.4, 0.75, bend=[-0.6, 0, 0, 0, 0, 0, 0, -0.4])
    else:
        s.note("trumpet", 0, base, 0.5, 0.7)
        s.note("trumpet", 0.55, base + 5, 0.4, 0.7)
        s.note("trumpet", 1.0, base + 7, 1.5, 0.8, bend=[-0.3, 0, 0, 0, 0, 0, 0, 0, -0.5])
    s.hit("frame_lo", 0, 0.6)
    del cat
    return s.render()


def sistrum(rng) -> np.ndarray:
    """The sistrum shaken for a temple or an omen, with a finger cymbal's ring."""
    cat = catalogue()
    out = np.zeros((int(2.2 * SR), 2))
    for k in range(rng.integers(2, 4)):
        x = cat["sistrum"].render(0, 0.5, 0, rr=int(rng.integers(0, 12)))
        place(out, x[: int(1.2 * SR)] * 0.7, 0.12 * k + rng.uniform(0, 0.04))
    c = cat["cymbal"].render(0, 0.4, 0)
    place(out, c[: int(2.0 * SR)] * 0.35, 0.05)
    return room(out, 0.3)


def envoy(rng) -> np.ndarray:
    """An envoy received: a lyre's short phrase from the hymn's opening."""
    s = Score(bpm=96, seed=int(rng.integers(0, 10000)))
    phrases = [[69, 64, 69, 72], [64, 69, 72, 76], [72, 69, 64, 69]]
    p = phrases[int(rng.integers(0, 3))]
    for i, m in enumerate(p):
        s.note("lyre", i * 0.5, m - 12, 0, 0.55 - 0.05 * i)
    s.note("lyre", len(p) * 0.5, p[0] - 24, 0, 0.4)
    return s.render()


def battle(rng) -> np.ndarray:
    """A battle fought: the deep drum, bronze on bronze, the cry far off."""
    cat = catalogue()
    out = np.zeros((int(2.0 * SR), 2))
    place(out, cat["big_drum"].render(0, 0.75, 0, rr=int(rng.integers(0, 9))) * 0.9, 0)
    for k in range(rng.integers(2, 4)):
        f = rng.uniform(1500, 2600)
        clang = mod([f, f * 1.37, f * 2.21, f * 3.1], [0.12, 0.08, 0.05, 0.03], [0.5, 0.35, 0.25, 0.1], 0.5, rng)
        clang += bp(rng.standard_normal(len(clang)), 2000, 7000) * env(len(clang), 0.001, 0.02) * 0.4
        place(out, stereo(clang * 0.45, rng.uniform(-0.6, 0.6)), 0.15 + 0.13 * k)
    cry = voice.sing(rng.choice([50, 52, 55]), 0.6, 0.5, "a", 8, seed=int(rng.integers(0, 999)), attack=0.08, release=0.4,
                     bend=np.array([0, 0.5, 0.8, 0.6, -0.5, -1.5]))
    place(out, lp(cry, 1500) * 0.9, 0.3)
    return room(out, 0.35)


def siege(rng) -> np.ndarray:
    """A siege laid: the ram's two blows on the gate."""
    cat = catalogue()
    out = np.zeros((int(2.0 * SR), 2))
    for k in range(2):
        place(out, cat["log"].render(0, 0.7, 0, rr=int(rng.integers(0, 9))) * 0.8, 0.55 * k)
        place(out, cat["big_drum"].render(0, 0.6, 0, rr=int(rng.integers(0, 9))) * 0.7, 0.55 * k + 0.01)
        n = int(0.4 * SR)
        place(out, stereo(lp(rng.standard_normal(n), 400) * env(n, 0.005, 0.08) * 0.5), 0.55 * k)
    return room(out, 0.3)


def taken(rng) -> np.ndarray:
    """A land taken: a short rising horn over a drum."""
    s = Score(bpm=90, seed=int(rng.integers(0, 10000)))
    s.hit("frame_lo", 0, 0.6)
    s.note("horn", 0, 50, 0.5, 0.55)
    s.note("horn", 0.5, 57, 1.2, 0.6)
    s.hit("tambourine", 0.5, 0.35)
    return s.render()


def lost(rng) -> np.ndarray:
    """A land lost: a low falling phrase on the strings over a muffled drum."""
    s = Score(bpm=72, seed=int(rng.integers(0, 10000)))
    s.hit("frame_lo", 0, 0.5)
    s.note("celli", 0, 50, 0.8, 0.5)
    s.note("celli", 0.8, 46, 1.4, 0.45)
    s.note("bass", 0, 38, 2.2, 0.4)
    return s.render()


def harvest(rng) -> np.ndarray:
    """A harvest brought in: grain poured, a pipe's few notes."""
    cat = catalogue()
    n = int(1.6 * SR)
    t = np.arange(n) / SR
    grain = bp(rng.standard_normal(n), 2500, 9000) * np.sin(np.pi * np.minimum(1, t / 1.2)) * 0.12 * (t < 1.2)
    out = stereo(grain, -0.2)
    s = Score(bpm=100, seed=int(rng.integers(0, 10000)))
    for i, m in enumerate([76, 79, 81, 79]):
        s.note("pipe", 0.3 + 0.5 * i, m, 0.45, 0.45)
    place(out, s.render() * 0.7, 0.2)
    del cat
    return room(out)


def famine(rng) -> np.ndarray:
    """Hunger in the land: a low reed's sigh, falling."""
    s = Score(bpm=60, seed=int(rng.integers(0, 10000)))
    s.note("low_reed", 0, 57, 1.4, 0.45, bend=[0, 0, 0, -0.3, -0.8, -1.4])
    s.note("celli", 0, 45, 1.6, 0.3)
    return s.render()


def revolt(rng) -> np.ndarray:
    """A province rises: quick drums and the crowd's shout."""
    cat = catalogue()
    out = np.zeros((int(2.0 * SR), 2))
    for k in range(6):
        place(out, cat["frame_mute"].render(0, 0.55 + 0.05 * (k % 2), 0, rr=k) * 0.6, 0.11 * k)
    for k in range(5):
        shout = voice.sing(float(rng.uniform(48, 60)), 0.35, 0.5, "a", 4, seed=int(rng.integers(0, 999)), attack=0.05, release=0.25,
                           bend=np.array([0, 0.8, 0.5, -1]))
        place(out, lp(shout, 1800) * 0.6, 0.5 + rng.uniform(0, 0.25))
    return room(out, 0.3)


def caravan(rng) -> np.ndarray:
    """A caravan on the road: the bells of the beasts, slow."""
    cat = catalogue()
    out = np.zeros((int(2.4 * SR), 2))
    for k in range(3):
        b = cat["bells"].render(0, 0.35, 0, rr=int(rng.integers(0, 9)))
        place(out, b[: int(1.2 * SR)] * 0.35 * (1 - 0.2 * k), 0.45 * k + rng.uniform(0, 0.08))
    return room(out, 0.3)


def death(rng) -> np.ndarray:
    """A death at a court: one low bell and a breath of voices."""
    cat = catalogue()
    out = np.zeros((int(3.0 * SR), 2))
    g = cat["gong"].render(0, 0.2, 0, rr=int(rng.integers(0, 9)))
    place(out, g[: int(3.0 * SR)] * 0.3, 0)
    place(out, voice.sing(50, 1.2, 0.35, "u", 6, seed=int(rng.integers(0, 999))) * 0.8, 0.2)
    return room(out, 0.3)


def report(rng) -> np.ndarray:
    """A report or a tablet read: the clay turned in the hand, a dry tap."""
    n = int(0.35 * SR)
    noise = rng.standard_normal(n)
    tap = mod([260, 620, 1250], [0.03, 0.02, 0.01], [0.6, 0.3, 0.1], n / SR, rng) + bp(noise, 600, 3000) * env(n, 0.002, 0.015) * 0.5
    rub = np.roll(bp(noise, 1200, 4000) * env(n, 0.03, 0.05) * 0.15, int(0.08 * SR))
    return room(stereo(tap + rub, rng.uniform(-0.2, 0.2)))


def season(rng) -> np.ndarray:
    """A season turns: one soft stroke of the frame drum and the lyre's open string."""
    s = Score(bpm=60, seed=int(rng.integers(0, 10000)))
    s.hit("frame_lo", 0, 0.3)
    s.note("lyre", 0.02, [45, 50, 52][int(rng.integers(0, 3))], 0, 0.35)
    return s.render()


def tap(rng) -> np.ndarray:
    """The interface's own small touch: a fingertip on clay."""
    n = int(0.12 * SR)
    x = mod([520 * rng.uniform(0.9, 1.1), 1180], [0.012, 0.006], [0.5, 0.2], n / SR, rng)
    x += bp(rng.standard_normal(n), 1000, 4000) * env(n, 0.001, 0.006) * 0.3
    return stereo(x)


# The stings: a few seconds, for the great moments, before the music takes them up.


def sting_capital(rng) -> np.ndarray:
    """A capital falls: the gong, the drums, a cry of brass and voices that breaks off."""
    s = Score(bpm=60, seed=int(rng.integers(0, 10000)))
    s.hit("gong", 0, 0.75)
    s.hit("timpani", 0, 0.9)
    s.hit("big_drum", 0, 0.9)
    for m in (50, 51, 57):
        s.note("horn", 0, m, 2.2, 0.7)
    s.note("violins_trem", 0, 75, 3, 0.6)
    s.note("violins_trem", 0, 74, 3, 0.55)
    s.sing(0.1, 62, 2.5, 0.7, "a", 8, bend=[0, 0, 0, 0, -0.5, -2])
    s.sing(0.1, 57, 2.5, 0.65, "a", 8, bend=[0, 0, 0, 0, -0.5, -2])
    s.note("bass", 0, 38, 4, 0.6)
    return s.render()


def sting_death(rng) -> np.ndarray:
    """A king dies: a low gong, the strings' dark chord, the choir on one breath."""
    s = Score(bpm=60, seed=int(rng.integers(0, 10000)))
    s.hit("gong", 0, 0.45)
    s.note("bass", 0, 38, 4, 0.5)
    s.note("celli", 0, 50, 4, 0.5)
    s.note("violas", 0.2, 57, 3.6, 0.42)
    s.note("violas", 0.2, 60, 3.6, 0.4)
    s.sing(0.4, 53, 3.4, 0.5, "o", 8)
    s.sing(0.4, 57, 3.4, 0.45, "o", 8)
    return s.render()


def sting_end(rng) -> np.ndarray:
    """The age ends: the great gong and every voice on the hymn's open fifth, swelling and let go."""
    s = Score(bpm=60, seed=int(rng.integers(0, 10000)))
    s.hit("gong", 0, 0.8)
    s.hit("timpani_roll", 0, 0.5)
    for m in (33, 45, 52):
        s.note("bass" if m < 40 else "celli", 0, m, 5, 0.55)
    for m in (69, 76, 81):
        s.note("violins", 0.3, m, 4.6, 0.5)
    s.note("horn", 0.5, 57, 4.2, 0.55)
    s.note("horn", 0.5, 64, 4.2, 0.5)
    for m in (57, 64, 69):
        s.sing(0.4, m, 4.5, 0.55, "a", 8)
    s.note("lyre", 4.6, 45, 0, 0.5)
    return s.render()


# The world's beds: long loops, seamless, played very low under the music.


def loop(x: np.ndarray, fade: float = 3.0) -> np.ndarray:
    """Folds the end over the start so the bed loops without a seam."""
    f = int(fade * SR)
    out = x[f:].copy()
    ramp = np.linspace(0, 1, f)[:, None]
    out[-f:] = out[-f:] * (1 - ramp) + x[:f] * ramp
    return out


def bed_nile(rng) -> np.ndarray:
    """The Nile: a broad slow wash and the small sounds of water at the bank."""
    cat = catalogue()
    dur = 32
    n = dur * SR
    t = np.arange(n) / SR
    noise = rng.standard_normal((n, 2))
    swell = 0.6 + 0.4 * np.sin(2 * np.pi * t[:, None] / 9.0 + np.array([[0, 1.3]])) * np.sin(2 * np.pi * t[:, None] / 5.3)
    wash = lp(bp(noise, 200, 1600), 1200) * swell * 0.25
    out = wash
    o = cat["ocean"].render(0, 0.3, 0, rr=1)
    place(out, o[: n] * 0.15, 0)
    # Bubbles and laps: short rising tones, as water makes them.
    for k in range(int(dur * 2.2)):
        at = rng.uniform(0, dur - 0.2)
        m = int(rng.uniform(0.02, 0.06) * SR)
        f0 = rng.uniform(350, 1100)
        tt = np.arange(m) / SR
        bub = np.sin(2 * np.pi * f0 * (tt + 8 * tt ** 2)) * np.exp(-tt / 0.012) * rng.uniform(0.05, 0.14)
        place(out, stereo(bub, rng.uniform(-0.8, 0.8)), at)
    return loop(out + 0.15 * hall(out * 0.3))


def bed_wind(rng) -> np.ndarray:
    """The steppe and the high desert: wind, rising and falling, whistling a little in the gusts."""
    dur = 32
    n = dur * SR
    t = np.arange(n) / SR
    out = np.zeros((n, 2))
    for c in range(2):
        noise = rng.standard_normal(n)
        gust = 0.35 + 0.65 * (0.5 + 0.5 * np.sin(2 * np.pi * t / rng.uniform(6, 9) + rng.uniform(0, 6))) ** 2
        body = lp(noise, 500) * 0.5 + bp(noise, 600, 1600) * 0.12
        whistle = bp(noise, 1100 + 300 * np.sin(c), 1250 + 300 * np.sin(c), 2) * 0.25
        out[:, c] = (body + whistle * gust) * gust
    return loop(out * 0.4)


def bed_market(rng) -> np.ndarray:
    """A city's market: many voices near and far, a few clinks of metal and a donkey's bell."""
    cat = catalogue()
    dur = 30
    n = dur * SR
    out = np.zeros((n, 2))
    for k in range(22):
        # A talker: syllables of changing vowels at a speaking pitch, with pauses.
        f0 = rng.uniform(95, 230)
        at = 0.0
        while at < dur - 1:
            words = rng.integers(3, 9)
            for w in range(words):
                syl = rng.uniform(0.12, 0.24)
                vowel = rng.choice(["a", "o", "u"])
                m = 60 + 12 * np.log2(f0 * rng.uniform(0.9, 1.15) / 261.6)
                x = voice.sing(float(m), syl, rng.uniform(0.25, 0.5), vowel, 1, seed=int(rng.integers(0, 99999)), attack=0.03,
                               release=0.05, bend=np.array([0, rng.uniform(-1, 1), rng.uniform(-2, 0.5)]))
                place(out, x * 0.9 * np.array([[1 + 0.5 * np.sin(k), 1 - 0.5 * np.sin(k)]]), at)
                at += syl * rng.uniform(0.9, 1.3)
            at += rng.uniform(0.8, 3.5)
    out = lp(out, 2400) * 0.8
    for k in range(10):
        f = rng.uniform(2200, 3200)
        x = mod([f, f * 1.5, f * 2.2], [0.15, 0.08, 0.05], [0.3, 0.2, 0.1], 0.5, rng)
        place(out, stereo(x * 0.12, rng.uniform(-0.7, 0.7)), rng.uniform(0, dur - 1))
    for k in range(2):
        b = cat["bells"].render(0, 0.25, 0, rr=k)
        place(out, b[: 2 * SR] * 0.15, rng.uniform(2, dur - 3))
    return loop(out + 0.35 * hall(out * 0.5))


def bed_siege(rng) -> np.ndarray:
    """A siege camp: fires crackling, a far drum, men at work, wind over the earthworks."""
    cat = catalogue()
    dur = 30
    n = dur * SR
    out = bed_wind(rng)[:n] * 0.4
    if len(out) < n:
        out = np.pad(out, ((0, n - len(out)), (0, 0)))
    # Fire: sparse sharp crackles over a soft roar.
    roar = lp(rng.standard_normal((n, 2)), 300) * 0.12
    out += roar
    for k in range(dur * 9):
        m = int(0.006 * SR)
        x = hp(rng.standard_normal(m), 1500) * np.exp(-np.arange(m) / (0.0015 * SR)) * rng.uniform(0.05, 0.3)
        place(out, stereo(x, rng.uniform(-0.4, 0.4)), rng.uniform(0, dur - 0.1))
    for k in range(int(dur / 2.6)):
        x = cat["frame_lo"].render(0, rng.uniform(0.25, 0.4), 0, rr=k)
        place(out, lp(x, 900) * 0.35, 1 + 2.6 * k + rng.uniform(0, 0.3))
    for k in range(8):
        x = cat["log"].render(0, 0.3, 0, rr=k)
        place(out, lp(x, 1500) * 0.2, rng.uniform(0, dur - 1))
    return loop(out + 0.25 * hall(out * 0.5))


SOUNDS = {
    "stylus": stylus, "seal": seal, "envelope": envelope, "gold": gold, "courier": courier,
    "war_horn": lambda r: horn_call(r, "horn"), "war_trumpet": lambda r: horn_call(r, "trumpet"),
    "sistrum": sistrum, "envoy": envoy, "battle": battle, "siege": siege, "taken": taken, "lost": lost,
    "harvest": harvest, "famine": famine, "revolt": revolt, "caravan": caravan, "death": death, "report": report,
    "season": season, "tap": tap,
}
STINGS = {"capital": sting_capital, "king": sting_death, "end": sting_end}
BEDS = {"nile": bed_nile, "wind": bed_wind, "market": bed_market, "siege": bed_siege}


def render_all(names: list[str]) -> None:
    import render

    man = render.load_manifest()
    man.setdefault("sounds", {})
    man.setdefault("stings", {})
    man.setdefault("beds", {})
    for group, table, lufs, variants in (("sounds", SOUNDS, -26.0, VARIANTS), ("stings", STINGS, -19.0, 1), ("beds", BEDS, -30.0, 1)):
        for name, fn in table.items():
            if names and name not in names:
                continue
            files = []
            for v in range(variants):
                rng = np.random.default_rng(zlib.crc32(f"{group}/{name}/{v}".encode()))
                x = np.asarray(fn(rng), np.float32)
                if group != "beds":
                    # Trim to the sound, with a short fade.
                    e = np.abs(x).max(axis=1)
                    last = len(e) - int(np.argmax(e[::-1] > e.max() * 0.002))
                    x = x[: last + SR // 20]
                    f = min(len(x), SR // 20)
                    x[-f:] *= np.linspace(1, 0, f)[:, None]
                rel = f"{group}/{name}-{v + 1}.m4a"
                info = write(x, os.path.join(OUT, rel), lufs, "64k" if group != "sounds" else "48k")
                files.append({"file": rel, "seconds": info["seconds"], "hash": info["hash"]})
                print(rel, info["seconds"])
            man[group][name] = files
    render.save_manifest(man)
