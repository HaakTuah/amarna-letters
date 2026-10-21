# TypeScript conversion plan

Build order item 5+ in the design document (decided 21 October 2026). The whole game moves from C# on Blazor
WebAssembly to TypeScript, with features frozen while it runs. Haakon's instructions are quoted word for word;
the rest is what was agreed with him.

## Order

1. The docs and preview pass (`docs/prompts/DOCS-AND-PREVIEW.md`), not before 26 October 2026.
2. The conversion (this file).
3. The fix pass for the "Found during the port" list in `docs/BUILD-PROGRESS.md`.
4. Build order item 6.

## Haakon's plan (21 October 2026)

- Stack: TypeScript in strict mode, npm workspaces (engine, game, llm), Vite and React,
  Vitest, and a Node batch runner with worker threads. Keep the engine pure: no browser
  or Node code in it.
- Random numbers: before porting, switch the C# engine to a generator that uses only
  32-bit operations (for example xoshiro128**), record new C# fingerprints, and port that
  generator. If you find a concrete reason not to, say why in the PR and port the 64-bit
  one carefully instead.
- Parity: fingerprint after every phase within a season, not only after each season, so
  a mismatch shows where it arose. Pass parity layer by layer as you port (engine, then
  script kings, then the rest), so every session ends with a gate passed.
- Integer and rounding helpers in the engine, covering C#'s round-half-to-even, integer
  division and sort order. The parity gate proves them.
- The SVG map is fine for the port, but don't lock it in: the graphical overhaul may move
  the map to a canvas or PixiJS.
- Measure the phone baseline before and after with Playwright (phone emulation, slowed
  CPU): first load, and one season of a Free game. Put both in the PR that switches the
  main site over.
- Once parity passes, the TypeScript build goes into develop and the switch-over PR goes to
  me like any milestone PR. Carry on with the fix pass and the rest on develop; main
  switches whenever I merge. I never need to approve before you continue: I just want to
  try the newest build as it comes. *(Revised by Haakon on 21 October 2026, replacing
  "main keeps the C# game until parity passes and I've played the preview".)*

## In the conversion (Haakon, 21 October 2026)

- Port behaviour exactly, including known flaws. Changes wanted before the port are made
  in C# first, with new fingerprints.
- Flaws found while porting go in a "Found during the port" list in BUILD-PROGRESS.md
  (and in the PR), not fixed during the port. Once parity has passed, a fix pass handles
  the list on develop before item 6, as the fix pass after item 4 did. Flaws that are
  about balance numbers go to item 18 instead, since balance stays frozen until then.
  *(Revised the same day: the fix pass no longer waits for main to switch over.)*
- Follow "Engine rules" under Tech stack in the design document.
- 32-bit integer operations (Math.imul, | 0) in hot paths such as the random generator.
- Model games are part of parity through their logs: replayed from recorded replies,
  they must give the same fingerprints in both builds.
- Replaying recorded model-game logs makes no API calls, so it isn't a model game under the
  builder rules ("No model games until the build order is done").

## Also agreed

- Port order: engine, then script kings and characters, then the model layer, then web, then batch and the
  simulation kit.
- Port the test suite (about 17k lines in October 2026) as the specification. The app code is about 25k lines.
- Parity is checked on about 200 script-game seeds and on the recorded model-game logs.
- Old saves won't load in the new build (new save version). The parity harness still reads the recorded logs.
- While the port runs, the TypeScript build is played as a PR preview, and the C# game stays at the site root
  until Haakon merges the switch-over PR.
- JavaScript numbers are all doubles, so integer-only maths goes through the engine's helpers. Watch for
  dictionary order and culture-sensitive string sorting in C#.

## Notes

- The model-game logs were recorded with the 64-bit generator. After the switch to the 32-bit one, a strict
  replay no longer matches them: the dice differ, and the recorded replies stop fitting the situations. They
  still serve parity if both builds replay them the same non-strict way (recorded replies where their keys match,
  the script stand-in elsewhere) and their fingerprints are compared with each other. The runs are in `sim/runs/`,
  which git ignores, so they exist only on the computer that ran them. If this proves impractical, say so in the PR.

## Why

The .NET runtime costs a phone too much. On 21 October 2026 a first visit to the live game downloaded 3.5 MB
compressed in 62 files before the first screen, and the code runs interpreted (published without ahead-of-time
compilation), including the script kings' look-ahead. One TypeScript engine can also run on the future multiplayer
server.

## In the design document

Item 5+ under "Build order", the stack table and "Engine rules" under Tech stack. Read them fresh from the live
document when the conversion starts.
