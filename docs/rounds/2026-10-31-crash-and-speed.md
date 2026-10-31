# Item 17a: the crash and an optimization round

31 October 2026. Branch `item/crash-and-speed`, PR #236. The item text is `docs/intent/build-order/item-17.md`
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

## The root: the stream, and the page's own history

Haakon, 31 October 2026, to the design session's finding that the page held a full copy of the game for every season:
"Agreed, 100% sir!". The item's text now asks that "the engine sends the page what happened each season as a stream of
events, not a whole new copy of the world, and the page keeps a compact history (each season's events and what each seat
knew), from which any past season is rebuilt when looked back at; the same events drive item 17+++'s playback and item
19+++'s sounds."

Built as `docs/design/44-the-crash-and-speed.md` describes under "The stream": after each season the state's JSON is cut
into pieces at the items of its lists and dictionaries, each distinct piece kept once under a number (`SnapshotStore`); the
worker sends the page only the pieces new that season and the season's list of numbers (`SnapshotDelta`, `Live.states`),
the two members the page must never read redacted; the page keeps the pieces as its history (`SnapshotHistory`), rebuilds a
past season's JSON by joining when the player looks back, and reads the newest season incrementally (`IncrementalReader`):
an item whose text did not change keeps last season's object, and only new texts are parsed. The state the page reads is
exactly the state the engine wrote (`src/web/test/history.test.ts`). The season's `SeasonFrame`, with the season's
`GameEvent`s, is what each seat knew and what happened; it rides the same update, is built once in the worker and kept on
the page only. The worker's `stateAt` message is gone.

## What else changed

See the design note: snapshots share what did not change in the worker too (17 MB kept instead of 130 MB at season 31;
guarded by `src/game/test/snapshots.test.ts`; each piece copied flat, since V8 keeps a sliced string's whole parent alive),
the worker keeps only the last frame, the page shares unchanged frame parts and keeps six scenes, the JSON reader takes
names as written first, season fallbacks are counted once. Behaviour is unchanged: seeds replay exactly (the runner suite's
replay test), the web suite passes, the benchmarks are re-run before the PR.

With the shared snapshots alone, the capped run played the whole age: the worker's heap settled between 150 and 310 MB and
the page's between 50 and 240 MB over 102 seasons. The numbers with the stream are below.

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
4. **The stream carries the state's changes as pieces, and the frames carry the events.** The text's "stream of events"
   is read as two things that already exist in the engine: the season's `GameEvent`s and what each seat knew (the
   `SeasonFrame`), which travel once a season and are the compact history, and the state's changes, which travel as the
   pieces of its JSON new since the last season, so every panel reads exactly the engine's state with nothing re-derived on
   the page. Principle: "Code decides facts" (pillar 6): the page shows the engine's facts, never its own reconstruction of
   them; and behaviour unchanged, which the item asks of the optimization round. The alternative, rebuilding the panels'
   data on the page from semantic events alone, would re-implement the engine's rules on the page and could drift from them.
6. **The page shows whole seasons.** Its state comes from the season's snapshot, taken after resolution, not from every
   change of phase within a season; nothing shown mid-season was ever a rule, and a half-resolved season is not a fact.
   Principle: "Code decides facts": the engine's season is the unit of truth the page shows.
5. **The script brains' memory is left as it is.** The script seats (the kings' and the council's brains) hold about 150 MB
   by season 31 in a Free game: what every script king remembers of every tablet, sighting and character ("a script
   character ... never loses it", "The game in one page"). It does not grow past the game's own ids and did not cause the
   crash; noted for item 18 or a later optimization round.

## The review

The reviewer (Opus, high; the diff, the item's text and "The game in one page") found two blocking points and seven to fix,
and checked the speed-ups equivalent (the heap's tie-break, the leg caches, the reader's fast path). Fixed:

1. **Blocking: the update took over 600 ms after a season showed, before its save might have finished**, so a reload on a
   slow phone could resume the season before. Now the worker tells the page the turn last saved (`Live.savedTurn`), and a
   new version takes over only once the newest season is saved and no season is under way.
2. **Blocking: the report's blanks**: filled below.
3. Leaving the game screen with a game held reloaded to the start screen: now a held game, on screen or not, is resumed
   into once saved; a version with new rules waits until the game is closed.
4. The "new rules" line showed while the version was still being read, or for good when it could not be: nothing is said
   while unknown, and the question is asked again at the next change.
5. Every window error event took the whole page to the error screen, Chrome's harmless ResizeObserver notice and
   cross-origin "Script error." included: events with nothing thrown are ignored.
6. The error screen itself read the session's state without a guard: it now stands whatever broke.
7. A play-on replayed on resume did not amend the season's snapshot: the runner amends it on every path.
8. The slot iterator read the live arrays for values but the captured ones for the walk: both from the captured arrays.
9. A null item in a list or dictionary would have been read as its type's zero: nulls stay null, and the schema given to
   the reader keeps its `opt`. Tests added for an amended season, the redaction of `finalByCap: true`, and a reset.

Notes kept as readings: the page's state changes at the season's snapshot, not at every phase change, so a panel in god
view reads the season just resolved, never a season half resolved (reading 6); the cut stops three levels down, so a
deeper list that grows is stored whole each season (none does today; the figure is watched in longer ages).

## Numbers before and after

All on this machine (4 cores, 16 GB), seed 1, a Free game of script kings watched at Fast speed in the built app
(`node src/web/soak.mjs`), the age ending at season 102. "Before" is develop as the item started; "after" is this branch.

| Whole game at Fast speed, desktop | Before | After |
|---|---|---|
| Time to the age's end | 155 s (1.0 s a season at first, 2.5 s late) | 117 s (about 1.0 s a season throughout) |
| Page heap, troughs and peak | 70 to 180 MB, peak 429 MB | 50 to 220 MB (holds the history), peak 314 MB |
| Worker heap | not readable then (grew about 5 MB a season) | 150 to 240 MB, flat from season 30 |
| Heap capped at 400 MB (a phone's) | the renderer died at season 20 ("Page crashed") | the age ended, worker 236 MB, page 50 to 240 MB |
| Phone profile (390x844, CPU slowed 4x) | 184 s; frames up to 655 ms mean, worst 2.8 s | to be measured in the review round |

| Engine, 31 seasons in Node (`src/web/test/probe-run.ts`) | Before | After |
|---|---|---|
| Time | 70.0 s | 59.7 s |
| Snapshots kept | 130 MB of strings (one whole state a season) | 17 MB of pieces, 50 MB of heap |
| Garbage collection | 11% | 11% |
| `Dict.entries` generators | 9% | gone (the iterator's tuples 5.6%) |
| Route-finding family | 17% (`cheapestRoute` 4.3, `connectionDays` 4.7, `edgeBetween` 3.2, `legPoints` 2.7, `crossingBetween` 2.0) | 7% (`edgeBetween` 2.3, `legPointsOf` 1.8, `crossingBetween` 1.7, `cheapestRoute` 1.7) |
| The snapshot cut | none | 3.7% (`add` and `take`) |

What the page does a season now, from the browser profile over 31 s of the game: idle 44%, V8's own work 38% (the messages'
structured clone and compilation), the incremental reader 3.6%, the map's layers 2.8%, garbage collection 1.8%. The worker
is the pace: the engine's season, then the cut and the frame.

What the state's JSON weighs, by field, at season 31 (KB): inbox 3118, characters 1193, events 1054, trails 502, scores
131, tablets 97, marketsSeen 94, payKnown 78, journeys 62, payFacts 55; the whole 6724. A frame: knownOwner 130, journeys
48 to 114, people 39, knownWalls 33, events 32; the whole about 1000 (shared on the page since).

The suite, the smoke test and the benchmarks (20 games, seed 1, `--verify-replay`, before against after) are recorded
below once run.

## Benchmarks

To be filled.

## Questions for Haakon

None so far.
