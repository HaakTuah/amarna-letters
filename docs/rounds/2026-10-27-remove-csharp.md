# Item 5+, step 4: the old C# build removed (27 October 2026)

Weekly usage: unknown (`scripts/usage.sh` cannot read it in this session). Effort: medium. Helpers: one reviewer.

## Haakon's instruction

Word for word (27 October 2026):

> "Answer to your question on the C# build: yes, remove it, once the fix pass is merged, in a PR of its own. It is now
> step 4 of item 5+: the build order, the refreshed copy and the fix-pass brief say so (PR #39). Tag the last commit
> that has it csharp-final. Delete src/Amarna.*, the C# tests and the solution files. Re-point the design notes in
> docs/design/ from C# code to the TypeScript equivalents. Run it as its own session after the fix pass, and add its row
> to docs/BUILD-PROGRESS.md. PR #39 also moved \"You merge, always.\" into the builder rules."

The specification: `docs/intent/build-order/item-5plus.md` ("the old C# build removed, in a pull request of its own once
the fix pass is merged, with the last commit that has it tagged `csharp-final`, `src/Amarna.*`, the C# tests and the
solution files deleted, and the design notes re-pointed from C# code to its TypeScript equivalent").

## What was done

- **The tag.** The last commit with the C# build is `5b4caa2` (the head of `develop` after #39, the same tree as `main`
  after #38 for the C# files). The tag `csharp-final` was made locally, but this session cannot push it: `git push` of a
  tag is refused by the session's proxy ("the remote end hung up", three tries), and so is the refs API ("Write access
  to this GitHub API path is not permitted through this proxy"). So the commit is kept on the branch
  `archive/csharp-final`, pushed before anything was deleted. **For Haakon:** push the tag with
  `git push origin 5b4caa2:refs/tags/csharp-final` (or make it on GitHub from that branch), then the branch may go.
  The docs already name the tag.
- **Deleted:** `src/Amarna.Batch`, `src/Amarna.Engine`, `src/Amarna.Game`, `src/Amarna.Llm`, `src/Amarna.Llm.Sdk`,
  `src/Amarna.Web`, `tests/Amarna.Engine.Tests`, `tests/Amarna.Game.Tests`, `tests/Amarna.Web.Tests`,
  `AmarnaLetters.sln`, `Directory.Build.props`. `tests/fixtures` (the recorded model games) stays: it is data, not C#.
- **`scripts/parity.sh` retired**, not adapted: all it did was build and run the C# batch runner and compare the
  TypeScript build with it, and there is nothing left to compare with. It stays in the tagged commit. The TypeScript
  side (`src/batch/src/parity.ts`, the batch runner's `--fingerprints`) is kept, since it compares any two runs'
  fingerprints after every phase; its header now says so.
- **The design notes re-pointed** (`docs/design/`): 170 references to C# members became their TypeScript names (members
  in camelCase: `TurnEngine.ResolveSeason` is now `TurnEngine.resolveSeason`; members that became free functions or
  constants are named so: `Prompts.OrdersLine` is `ordersLine`, `Calendar.Label` is `dateLabel`, `GameSession.NotifySoon`
  is `SessionCore.notifySoon`), every one checked against the TypeScript source by a script; C# paths became the
  TypeScript files (`src/game/src/signals.ts`, `src/game/src/bots`, `src/web/src/map/art.ts`, `src/web/src/map/zoom.ts`,
  `src/engine/src/rules/opening.ts`). The web note's bullets on the browser build (load size, the script worker on a
  second .NET runtime, `YieldingSeat`, the Blazor service worker) described the C# app, so they now describe the
  TypeScript one: the whole session in one Web Worker (`src/web/src/session/worker.ts`), the page showing only what it
  sends, the Vite service worker, and the load sizes measured by the conversion.
- **Elsewhere:** `README.md`'s table of folders, `CLAUDE.md`'s opening, `sim/README.md` and `docs/PLAY-PROMPT.md` (the web
  app starts with `npm run dev --workspace src/web`), `docs/SIMULATION-PROMPT.md` (the batch runner is started with
  `node --experimental-strip-types src/batch/src/main.ts`), `sim/write-debriefs.js` (its footer's source and test),
  `scripts/cloud-setup.sh` (no .NET note), `.claude/launch.json` (npm, not dotnet), `.claude/settings.json` (the
  start hook no longer tests for dotnet), and `src/web/src/styles/app.css` (a comment's path, and the dead
  `#blazor-error-ui` rules, which no element uses). History is left as it was: the build log, round reports, Haakon's
  specs (`docs/CONVERSION-PLAN.md`, `docs/prompts/`), the briefs in `docs/items/` and earlier progress rows. Comments in
  the TypeScript code that say a format matches the C# build's are kept, as the reason the format is what it is.
- **The progress file:** its row for step 4, and its opening line no longer says that Haakon merges `develop` into
  `main` (the builder does, "You merge, always.").

## Checks

- `scripts/test.sh`: 95 files, 1005 tests passing (the same as `develop`; no TypeScript code changed but a comment).
- `npm run build --workspace src/web && node src/web/smoke.mjs`: passes.
- Benchmarks (`scripts/sim.sh --versus solo --games 40 --seed 1`), the same as the fix pass's table to the digit:

| Power | Growth alone | Growth as baseline | Wins alone | Wins as baseline |
|---|---|---|---|---|
| Egypt | 3.16 | 1.08 | 100% | 5% |
| Hatti | 3.65 | 0.92 | 98% | 8% |
| Babylonia | 3.53 | 1.05 | 100% | 3% |
| Mitanni | 2.80 | 1.22 | 95% | 18% |
| Assyria | 4.25 | 1.00 | 98% | 5% |
| Arzawa | 1.78 | 1.34 | 65% | 43% |
| Alashiya | 2.28 | 0.96 | 80% | 20% |
| All kings | 3.06 | 1.08 | 91% | 14% |

- 50 script games, seeds 1-50, `--verify-replay`: 50 of 50 replay exactly; a capital fell in 30 of 50 games (as the fix
  pass).

## Script players

No rule and no feature: the engine, script kings and characters are unchanged, and there is nothing new for script
players to use. The benchmarks are the regression check.

## Design questions

None. One reading: `tests/fixtures` is kept, being recorded games rather than C# tests.
