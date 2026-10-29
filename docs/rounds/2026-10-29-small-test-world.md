# Side lane: a smaller default world for tests (29 October 2026)

Carries out "the smallest game that tests the rule" (standing instruction of 29 October 2026, `CLAUDE.md`). PR #136.
Tests only: no file under `src/*/src` changed, so the game's behaviour is unchanged.

## What was slow

A full run of the suite on `develop` (f43cfb9, one machine, 4 cores): 1151 tests, 2264 s of test time, 15.5 min. 46 tests
over 10 s took 1941 s of it (86%), every one a script game of the whole world: 30 powers, each a script king. A profile of
such a season: the script kings' planning (`bots/search.ts`, `tactics.ts`, `board.ts` and the route finding they call)
is about four fifths of it. Without script kings a season of the whole world costs the engine 30 to 40 ms.

## The small world

`src/game/test/small-world.ts`: the default few (`Near`: Mitanni, Assyria, Babylonia) played by the seats a test needs,
every other power an `IdleSeat` (no orders; it hears envoys out and gives no answer), and `seasons(n)`, a game of exactly
`n` seasons. A test that needs a particular power adds it (`smallSeats(seat, [...Near, "Alashiya"])`); terrain uses the
Anatolian powers, where the ground decides blows. The cost grows with the kings a test seats, not with the starting world:
a power more is one idle seat more.

Moved onto it: runner (all but the full-world guard), sleep-reading, siege-bot, save-version, standing-for-every-seat,
id-counter, terrain-bot, blindness, file-character, script-court, stand-in, richest, map-scene (web), play-on,
log-text, leader-memory, local-play, file-seat. Every one still tests what it tested; where the small world needed more
to reach the event a test looks for, it was given what it needed (named in the test's comment):

- standing-for-every-seat: the first standing order to fire in the small world is seed 4's, so the search runs seeds
  4 to 15 (was 1 to 12).
- terrain-bot: the Anatolian powers (Hatti, Arzawa, Kaska, Isuwa, Lukka, Mitanni); both signals come in seed 1 (in the
  whole world the first blow beating the ground came at seed 23).
- file-character's shadow test adds Egypt and Hatti, whose envoys carry gold within its four seasons.
- siege-bot plays seeds 1 and 2 (was 1 to 4): every seed of the four had sieges begun and won.
- richest plays a 12-season game (was a natural-length one).
- id-counter plays 12 seasons (was 20).

Kept in the whole world, as the named guards of the whole: the replay of seed 1 in "Script games finish and replay
exactly" (seeds 2 to 5 play the small world), the engine's "State survives a json round trip" and the starting-world
checks (`engine.test.ts`, engine only and cheap), and "A file seat sleeps by default and replays exactly", whose rule needs
an envoy to reach Alashiya while it sleeps, which no small world tried brought within its seven seasons.

Left as they were: who-decides, model-layer and who-wrote-it (games of simulated model kings built by `buildSeats`; an
idle world broke three of who-decides' tests for about 15 s saved), and the engine's tests, which play the engine alone.

Deleted, as a duplicate: "A king alone on the new brain outgrows the same king on the old one" (bot.test.ts), eight
whole games measuring one current king among baseline kings: the measurement `scripts/sim.sh --versus solo` makes, and
"Long measurements stay in scripts/sim.sh, never in the suite." Its pass line (an average gain over 0.15) is now watched
only by the benchmarks run after every item (the builder rules), as the solo benchmark's report.

## Measured

| | Before (develop f43cfb9) | After |
| --- | --- | --- |
| Local suite, 4 cores | 2264 s of test time, 15.5 min, 1 failure (sleep-reading's replay test timed out at 145 s) | 955 s, 6.0 min, all pass |
| CI of a code PR (4 shards) | about 4 min 50 s (run 40791209738; shards 2.2 to 4.7 min) | about 1 min 52 s (run 40799396735; shards 1.0 to 1.7 min) |
| `scripts/sim.sh --games 50 --seed 1 --verify-replay` | see the PR | identical summary |

The largest test left is the full-world replay guard (about 180 s locally, 150 s of it seed 1): it sets the length of the
shard it lands in.

## Readings taken

- A small world is a few seated powers among idle ones, not a cut-down map: the engine has one map and thirty powers built
  in (`AllPowers`, `WorldMap.default`, the starting tables), and changing that would change engine code the main lane is
  working in, for the fifth of a season's cost the engine is. Principle: the cheapest approach that does the job well
  ("How to work").
- An idle power gives no orders and no answers rather than playing a cheap script: it costs nothing and is the same for
  every test, so a test's outcome depends only on the seats it names.
