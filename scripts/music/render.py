"""Renders the music and the sounds: python3 scripts/music/render.py [music|sounds|all] [piece | piece-N ...]

Writes the compressed audio to src/web/public/audio/ and the list of what was written, with each piece's length and
phrase ends, to scripts/music/manifest.json and src/web/src/audio/manifest.ts. The samples must be fetched first (docs/audio/SOURCES.md).
"""

from __future__ import annotations

import json
import os
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

from pieces import PIECES  # noqa: E402
from score import write  # noqa: E402

REPO = os.path.dirname(os.path.dirname(HERE))
OUT = os.path.join(REPO, "src/web/public/audio")
MANIFEST = os.path.join(HERE, "manifest.json")
MANIFEST_TS = os.path.join(REPO, "src/web/src/audio/manifest.ts")
VARIATIONS = 3
MUSIC_LUFS = -18.0


def load_manifest() -> dict:
    if os.path.exists(MANIFEST):
        return json.load(open(MANIFEST))
    return {"music": {}, "sounds": {}}


def save_manifest(m: dict) -> None:
    os.makedirs(os.path.dirname(MANIFEST), exist_ok=True)
    m["music"] = dict(sorted(m["music"].items(), key=lambda kv: list(PIECES).index(kv[0]) if kv[0] in PIECES else 99))
    with open(MANIFEST, "w") as f:
        json.dump(m, f, indent=1)
        f.write("\n")
    with open(MANIFEST_TS, "w") as f:
        f.write("/** What scripts/music/render.py wrote: every file of the music and the sounds, with lengths and phrase ends. Generated. */\n")
        f.write("export const Manifest = " + json.dumps(m, indent=1) + " as const;\n")


def render_music(names: list[str]) -> None:
    """Renders the pieces named (all of them if none), or one variation of a piece as `name-2`."""
    man = load_manifest()
    for arg in names:
        name, _, only = arg.partition("-")
        vars_ = list(man["music"].get(name, [])) if only else []
        for v in range(VARIATIONS):
            if only and v != int(only) - 1:
                continue
            t0 = time.time()
            s = PIECES[name](v)
            x = s.render()
            path = os.path.join(OUT, "music", f"{name}-{v + 1}.m4a")
            info = write(x, path, MUSIC_LUFS, "64k")
            ends = sorted({round(s.sec(b), 2) for b in s.phrases if s.sec(b) < info["seconds"] - 0.5})
            entry = {"file": f"music/{name}-{v + 1}.m4a", "hash": info["hash"], "seconds": info["seconds"], "phrases": ends}
            if s.shade != 0:
                entry["shade"] = s.shade
            if only:
                vars_[v] = entry
            else:
                vars_.append(entry)
            print(f"{name}-{v + 1}: {info['seconds']:.1f}s, {len(ends)} phrases, {os.path.getsize(path) / 1e6:.2f} MB, {time.time() - t0:.0f}s")
        man["music"][name] = vars_
        save_manifest(man)


if __name__ == "__main__":
    what = sys.argv[1] if len(sys.argv) > 1 else "all"
    names = sys.argv[2:]
    if what in ("music", "all"):
        render_music(names or list(PIECES))
    if what in ("sounds", "all"):
        import sounds

        sounds.render_all(names if what == "sounds" else [])
