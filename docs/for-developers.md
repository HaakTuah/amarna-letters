# For developers

Running, testing and publishing Amarna Letters, and how it is put together. The game itself is described in the
[README](../README.md).

## Run locally

You need Node 26 or later.

```bash
npm ci
npm run dev --workspace src/web
```

Then open <http://localhost:5183>, pick a preset, choose whether to watch or take a seat, and begin.

## Tests and the batch runner

```bash
scripts/cloud-setup.sh   # on a fresh cloud machine: the npm packages and Playwright's Chromium, if missing
scripts/test.sh          # type-check, the engine's determinism lint, and every test (Vitest), printing only the
                         # summary and the failures (the full log goes to $TMPDIR/amarna-test-<pid>.log, one per run)
npm run build --workspace src/web && node src/web/smoke.mjs   # the Playwright smoke test of the built app
```

```bash
scripts/sim.sh --games 50 --seed 1 --verify-replay
```

The batch runner plays games unattended and prints wins by power and the success signals.
With `ANTHROPIC_API_KEY` set it can run model games too (`--preset budget`, `counsel`, `standard` or `showcase`, or per role:
`--leaders sonnet --characters haiku --narrator sonnet`), stopping at `--budget` dollars; every
such game costs real money. `--no-primer` runs the
customs-primer experiment; `--out logs` keeps every game's log. `--versus solo` measures the
script king against the frozen first version (one king at a time, against six of the old), and
`--versus baseline` and `--focus <Power>` mix the two. Script games run on every core.
`--sleeping-scripts` lets script kings sleep as model kings do; they then schedule conditional orders ahead, which
`--no-plan-ahead` turns off and `--plan-ahead-half` gives to half of them, to measure what it is worth.
The measure of call size (item 6b) shadows script games with model kings and splits their requests into parts:
`node --experimental-strip-types --no-warnings src/batch/src/measure.ts --games 20 --seed 1` (`--per-audience` for
one call per audience, `--dump DIR` for sample requests). It calls no model.
`--sleep off` turns off sleeping seats, `--sleep-cap N` sets
the hidden safety cap on a sleep, `--max-turns N` stops a game after season N at the latest (a known cap), `--cap 140-160` or `--cap none` sets
the hard cap's range, and `--median N` the season by which half of all ages have ended (80 by default).
`--file-seats DIR` makes every king a file seat:
it writes what a model king would see to its own folder and waits for a JSON reply file, which is
how `sim/` plays a game with Claude Code agents as the kings (see `sim/README.md`).

## Publishing and CI

Changes go in through pull requests: every pull request builds and runs the tests
(`.github/workflows/pages.yml`) and gets a playable preview at its own address,
`https://haaktuah.github.io/amarna-letters/pr-<number>/`, linked in a comment on the pull request and removed when it
closes (`.github/workflows/preview.yml`). Merging into `main` publishes the browser game at the site's root. Both are
written to the `gh-pages` branch, which Pages serves: `main` to its root, each pull request to its own `pr-<number>/`
folder (`scripts/site-prepare.sh`, `scripts/site-publish.sh`). No pull request's own code can write to that branch, so
none can replace the root. To publish the static files somewhere else, such as S3:

```bash
npm run build --workspace src/web
```

The site is `src/web/dist`. If it is served from a sub-path, set `<base href>` in its
`index.html` to that path.

## How it is put together

Every game is deterministic: the same seed and the same decisions give the same game, and every
log replays exactly.

| Package | What it is |
|---|---|
| `src/engine` | The deterministic engine: map, state, orders, validator, adjudicator, economy, envoys, tablets, spies, catastrophes, scoring. Pure TypeScript, no I/O; a lint config keeps out clocks, unseeded randomness, culture-sensitive text and inexact `Math`. |
| `src/game` | Seats, character minds and the narrator as interfaces; the runner that records every decision; script kings (temperaments, memory, a look-ahead over likely rival orders) and script characters; signal detection. |
| `src/llm` | Claude leaders (Sonnet 5.5 / Opus 5.5), characters (Haiku 5.5) and narrator (Sonnet 5.5): prompts, JSON schemas, parsing, cost accounting, the API simulator, file seats and the local bridge. Calls are posted with `fetch`, in the browser and the batch runner alike. |
| `src/web` | Vite and React app: setup, SVG map, human orders and audiences, spectator views, timeline, chronicles, IndexedDB saves. The engine, the script kings and characters run in a Web Worker; the page only shows what it sends. |
| `src/batch` | Node runner for unattended games, on worker threads. |
| `src/*/test` | The tests (Vitest), ported from the C# suite: engine, script kings and characters, model layer against a simulated API, and the web map's scenes. |
| `tests/fixtures` | Recorded model games (JSON lines), kept as data. The C# build the game was converted from (build order item 5+) was removed after the fix pass; it is in `main`'s history at commit `5b4caa2`. |

## Design notes

[docs/DESIGN-NOTES.md](DESIGN-NOTES.md) records every decision and simplification made while
building, and every rule as implemented. [docs/BUILD-PROGRESS.md](BUILD-PROGRESS.md) tracks the
build order item by item, with each item's report in `docs/rounds/`.
