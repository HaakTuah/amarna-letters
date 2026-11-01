"""A look at the scores before rendering: python3 scripts/music/check.py [piece ...]

For each piece and variation: its length, the longest wait between phrase ends (the player waits up to 20 s), and each
instrument's range against the recordings' (a note far outside is shifted a long way and sounds false)."""

from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from pieces import PIECES  # noqa: E402

# Playable ranges (MIDI) of the instruments as sampled, with a little room for shifting.
RANGES = {
    "violins": (55, 96), "violas": (48, 84), "celli": (36, 72), "bass": (28, 57), "violins_trem": (55, 96), "celli_trem": (36, 72),
    "celli_pizz": (36, 72), "violins_pizz": (55, 96), "lyre": (34, 88), "harp": (31, 96), "psaltery": (48, 88),
    "reed": (57, 91), "reed_plain": (57, 91), "low_reed": (46, 89), "pipe": (60, 96), "recorder": (60, 86),
    "horn": (41, 77), "trumpet": (54, 84), "choir": (43, 76),
}


def check(names: list[str], variations: int = 3) -> int:
    bad = 0
    for name in names:
        for v in range(variations):
            s = PIECES[name](v)
            end = max(e.t + max(e.dur, 0) for e in s.events)
            ends = sorted(s.sec(b) for b in s.phrases)
            gaps = [b - a for a, b in zip([0.0] + ends, ends + [end])]
            worst = max(gaps) if gaps else end
            lows: dict[str, list[int]] = {}
            for e in s.events:
                if e.midi:
                    lows.setdefault(e.inst, []).append(e.midi)
            out = []
            for inst, notes in sorted(lows.items()):
                lo, hi = RANGES.get(inst, (0, 127))
                mark = " !" if min(notes) < lo or max(notes) > hi else ""
                if mark:
                    bad += 1
                out.append(f"{inst} {min(notes)}-{max(notes)}{mark}")
            flag = " ! phrase gap" if worst > 20 else ""
            if flag:
                bad += 1
            print(f"{name}-{v + 1}: {end:5.1f}s shade {s.shade:+d} {len(s.events):4d} notes, {len(ends)} phrases, longest wait {worst:4.1f}s{flag}")
            print("   " + ", ".join(out))
    return bad


if __name__ == "__main__":
    sys.exit(1 if check(sys.argv[1:] or list(PIECES)) else 0)
