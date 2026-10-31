# The crash and the optimization round (item 17a)

Haakon saw a white page with an error on the live site while watching a game at high speed (30 October 2026). This note
says what a long game keeps, where it went wrong, what changed, and how the page now fails when something throws. The
numbers are in the item's report, `docs/rounds/2026-10-31-crash-and-speed.md`.

## What a long game keeps, and the crash

The state grows with the age: the courts' records (`inbox`), the characters, the events and the message trails are the
record, kept by design ("Memory" in "The game in one page": the tablets and a court's records stay as they are). Its JSON
is about 1 MB at the start, 3.5 MB by season 11, 6.7 MB by season 31 and grows by about 150 KB a season after.

The engine's worker kept the whole state as a JSON string at the end of every season (the runner's snapshots, for the
timeline and for reading a past season's panels). Those strings summed to 130 MB by season 31 and would pass a gigabyte by
the age's end, which lasts about 100 seasons since item 17. With the browser's heap capped at 400 MB, as a phone caps it, the
renderer died at season 20 ("Page crashed": the white page). The page kept its own growing shares too: a scene cache of up
to 600 map scenes at about 2 MB each, and one frame a season at about 1 MB, most of it each court's known holders, known
walls and sight, maps of the whole board a court that seldom change.

## What changed (behaviour unchanged: seeds replay exactly, the suites and benchmarks as before)

- **Snapshots share what did not change** (`src/game/src/snapshots.ts`, `SnapshotStore`). Each season's JSON is cut into
  pieces at the items of the state's lists and dictionaries (two levels down, outside strings), each piece kept once, and a
  snapshot is a list of references, most of them the season before's. Reading back joins the pieces: the text is exactly
  what was pushed (`src/game/test/snapshots.test.ts` guards both, with the smallest game that shows the sharing). 31 seasons
  of seed 1 keep 17 MB instead of 130 MB.
- **The worker keeps only the last frame** (`frames.ts`: `framesSince`; `core.ts`): frames go to the page once, which holds
  the history.
- **The page shares unchanged frame parts** (`client.ts`: `shareUnchanged`): a frame's known holders, known walls, sight and
  people take the earlier frame's references where equal, so a season's frame costs its changes.
- **The scene cache keeps six scenes** instead of 600 (`client.ts`): a scene is rebuilt in a few milliseconds.
- **The JSON reader takes names as written first** (`src/engine/src/core/json.ts`, `readObj`): the lower-cased index that
  case-insensitive matching needs is built only for a name not found as written. Every read of a state, on the page each
  season and in `stateAt`, is cheaper; what is read is the same.
- **Season fallbacks are counted once** (`core.ts`, `fallbacksUpTo`): a played season's count is final, so the worker's
  update no longer scans the whole log for every season at every change.

## No error leaves a white page (`src/web/src/ui/ErrorScreen.tsx`)

An error boundary wraps the app, and the page's uncaught errors and unhandled rejections are reported to it. The screen
says what went wrong in plain words and shows a report to copy: the build and the rules' version, the seed, the season and
the game, the error with its stack, the browser. The game itself lives in the engine's worker and is saved after every
season, so the screen offers "Back to the game" (the page draws again; if that fails at once with the same error, the
button goes and reloading is the way), "Reload into this game" (`ui/update.ts`: `reloadInto`, carrying auto-play and speed)
and "To the start screen". The smoke test plants an error on the page and checks the screen, its report and the way back.
The build's commit is `__BUILD_ID__` (vite.config.ts: the publishing workflow's `GITHUB_SHA`, else the checkout's).

## The newest version, without asking

See "The newest version" in `32-the-map-at-a-glance.md`: it takes over by itself off the game screen and at the next season
on it, reloading into the same game; only a version with new rules waits for the game to be left.

## The tools (`src/web/soak.mjs`, `src/web/test/probe.test.ts`)

- `node src/web/soak.mjs [--phone] [--heap 400] [--seed N] [--minutes M] [--log file]` serves `dist/` as the smoke test
  does, opens the spectator link `play?watch=N`, sets Fast and auto-play, and prints every five seconds the season reached,
  the page's heap, the worker's heap (asked through the devtools protocol), seconds a season, the frames drawn with the long
  ones and the worst, and the DOM's size; it stops at the age's end, at a page error, a blank page or the time limit, and
  reports every problem with its season. `--phone` is 390x844 with the CPU slowed four times; `--heap` caps V8's old space
  for the page and the worker alike, as a phone's browser does, which is how the crash is reproduced.
- The probe (`AMARNA_PROBE=1 AMARNA_PROBE_FIELDS=1 AMARNA_PROBE_SEASONS=30 NODE_OPTIONS=--expose-gc npx vitest run
  src/web/test/probe.test.ts`) plays a Free game in Node as the web app does and prints, every ten seasons, the season's
  time, the frame's, the heap, the snapshot's size, the state's JSON write and read times, a frame's and a scene's size and
  the biggest fields of each, and at the end what holds the heap. It is skipped in the suite.
