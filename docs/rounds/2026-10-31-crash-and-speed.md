# Item 17a: the crash and an optimization round

In progress (31 October 2026). Branch `item/crash-and-speed`, PR #236. The item text is `docs/intent/build-order/item-17.md`
(the 17a passage). Built from the copy in `docs/intent/` (this account has no live design document); the copy did not change
between the item's start (`f1007bc`) and the check before review. Design note: `docs/design/44-the-crash-and-speed.md`.

## Haakon's words in this session

Relayed by the orchestrator, 31 October 2026, word for word: "Before anything else: every lane commits and pushes what it
has now, unfinished work included, as a work-in-progress commit on its branch (a draft PR if it has none). From now on, push
after every commit, not only at gates or hourly. We're near this account's limit for the next few hours: when it resets,
carry on from the pushed branches."

And for item 17++, from the same message: "Haakon answered the audit's tiny-troops question, and it is now written into item
17++ as 'A handful holds nothing by itself' (War tab). There is no size threshold. A move into a far weaker unit is a battle
it loses by far. A garrison holds a town only as far as its people's ledger stands with its master. Script kings fold or
disband remnants. Read it from develop (git fetch origin develop) before building 17++."

## Where it stands (pick-up line)

Done and pushed: the crash reproduced and its cause fixed (snapshots shared), the error screen, the newest version taking
over by itself, the soak and probe tools, the design notes. Left: the optimization round's profile (`node src/web/soak.mjs
--profile`), any further speed-ups it shows, before-and-after numbers below, the full suite and the smoke test, the
benchmarks (`scripts/sim.sh --games 20 --seed 1 --verify-replay`, unchanged), the reviewer, merging.

## The crash, reproduced

Haakon: "Got a white page with an error. Was on github", watching a game at high speed on the live site.

`node src/web/soak.mjs` watches a whole Free game (seed 1) at Fast speed in the built app and records the season, the page's
and the worker's heap, seconds a season and the frames. On this 16 GB machine nothing crashed, desktop or phone profile (CPU
slowed four times): the age ended at season 102. But the worker's heap grew by about 5 MB a season and the page's by 2 to 3
MB a season at the troughs, with peaks of 430 MB. With V8's old space capped at 400 MB for the page and the worker, as a
phone's browser caps them (`--heap 400`), the renderer died at season 20, 45 seconds in: Playwright reports "Page crashed",
the white page.

The cause, from the Node probe (`src/web/test/probe.test.ts`): the worker kept the whole state as a JSON string at the end
of every season (the runner's snapshots). The state's JSON grows with the record, about 150 KB a season (the courts' inboxes
first, then the characters, the events and the message trails): 958 KB at the start, 3.5 MB by season 11, 6.7 MB by season
31, so the snapshots summed to 130 MB by season 31 and would have passed a gigabyte by the age's end. The page added a cache
of up to 600 map scenes at about 2 MB each and a frame a season at about 1 MB.

## What changed

See `docs/design/44-the-crash-and-speed.md`: snapshots share what did not change (17 MB kept instead of 130 MB at season
31; guarded by `src/game/test/snapshots.test.ts`), the worker keeps only the last frame, the page shares unchanged frame
parts and keeps six scenes, the JSON reader takes names as written first, season fallbacks are counted once. Behaviour is
unchanged: seeds replay exactly (the runner suite's replay test), the web suite passes, the benchmarks are to be re-run
before the PR.

With these, the capped run plays the whole age: the worker's heap settles between 150 and 310 MB and the page's between 50
and 170 MB over 102 seasons.

## No white page

An error boundary and the page's uncaught errors show a plain screen with the seed, the season, the error and the build to
copy, and a way back ("Back to the game", "Reload into this game", "To the start screen"). The smoke test plants an error
and checks the screen and the way back.

## The newest version

Takes over by itself: at once off the game screen, at the next season on it (reloading into the same game with auto-play and
speed as they were, "Updated to the newest version" shown after); a version with new rules waits until the game is left.

## Readings taken

1. **"Until that game ends" means until the player leaves it.** A new version with new rules waits for the game on screen;
   the age's end is not the game's end for its players, who read the legends and chronicles then (item 14), and the new
   version could not show them an old-rules game. Principle: "Every rule a king needs is in the rulebook or the seat view":
   the record at the end is part of the game. The alternative, taking over the moment the age ends, would cut the ending off.
2. **The error screen is the page's, not the engine's.** An error in the engine's worker during a season already shows as a
   notice with the season (core.ts); the screen catches what the page itself throws, which is what leaves a white page.
3. **Snapshots stay whole in meaning.** A past season's panels read the exact state of that season, as before; only how the
   worker keeps the text changed.

## Numbers before and after

To be filled from the profile and the soak runs after the optimization round.

## Questions for Haakon

None so far.
