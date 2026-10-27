# Item 5+, step 2: the TypeScript conversion

Branch `item-5plus/conversion`, merged into `develop`. Brief: `docs/items/conversion.md`; spec: `docs/CONVERSION-PLAN.md`
(Haakon's words). This session ran below the high effort the step asks for, and `scripts/usage.sh` reports "unknown" in
it, so weekly usage could not be checked.

## Haakon's instructions for this step, word for word

From the task that started the session (27 October 2026):

> Your item, and only this item: build order item 5+, step 2 — the TypeScript conversion. Its brief is
> `docs/items/conversion.md` (spec: `docs/CONVERSION-PLAN.md`).

> PR #29 ("Condense the design document") is open in Haakon's own session: don't edit it, and do the brief's check for
> changes against whatever is current.

> This step is meant to run at high effort. If this session runs below high, say so in the first line of your PR and
> carry on.

> Branch from `develop`, PR into `develop`, merge per the builder rules (one reviewer, as CLAUDE.md says). Never touch
> `main`. No model games.

> Do NOT go on to step 3 (the fix pass); it gets its own fresh session.

No standing instruction was given, so "Standing instructions" in `CLAUDE.md` is unchanged.

The check for changes was made against the live document when the step began (Build order and Engine and models, through
Claude Docs): nothing had changed since the copy's revisions. Before the merge, `develop` brought a refreshed copy (Build
order revision 18, Engine and models revision 27, from #29 to #34): item 5+ now marks the docs pass done and gives the fix
pass a table setting that pauses a game when more than a chosen share of calls fall back; the Engine rules are unchanged
but for a date. Nothing in it changes this step.

## What was built

Gate by gate, each ending with a commit:

| Gate | What | Proof |
|---|---|---|
| 0 | The C# build, before the port: xoshiro128** with each roll's key hashed into its whole 128-bit state by 32-bit rounds; script seat seeds cut to 53 bits; ordinal text everywhere; a fingerprint after every phase (save version 7) | The C# tests, re-pinned where they pinned old dice |
| 1 | The engine (`src/engine`) | 200 C# script games and 60 with sleeping script kings replay in TypeScript with every phase fingerprint matching (`scripts/parity.sh`) |
| 2 | Script kings, characters, narrator and the frozen baseline (`src/game`) | 200 script games, 60 sleeping, 60 against the baseline, played afresh in TypeScript: every phase matches, the season's orders, audiences, letters and intelligence included |
| 3 | The model layer (`src/llm`): prompts, schemas, parsing, the journal, model kings, characters and narrator, the API client behind a transport, the simulated API, file seats, the local bridge | 18 games with every role on the simulated API match on every phase, with a fifth column hashing the text of every request; the recorded games in `tests/fixtures/replays/` replay the same lenient way in both builds (156 of 156 phases) |
| 4 | The batch runner (`src/batch`, worker threads); the web app (`src/web`: Vite and React, the engine and seats in a Web Worker, the page showing only the frames it sends, the SVG map behind the renderer interface); the tests in Vitest; the engine's determinism lint; `scripts/`, `CLAUDE.md`, the README and the preview workflow switched over | Batch output identical to the C# runner's but for timings; the Playwright smoke test; 996 tests passing; the phone measurements below |

### The tests

The C# suite (91 files, about 17,000 lines: 615 facts and 387 theory rows) is ported as the specification: 93 Vitest files (the sleeping seats' split in four),
996 tests, all passing (`scripts/test.sh`, about three minutes). A small xUnit-style `Assert` (`src/engine/test/support.ts`)
keeps each test reading as its original did. Two C# tests have no counterpart:

- `ScriptWorkerTests` (web): it compared a game played through the C# build's script worker with the same game played in
  the page. In the TypeScript build the whole session (engine, seats, autosave) runs in the worker and the page only
  shows what it sends, so there is no second path to compare; the map tests drive the same frames the worker sends.
- The model layer's "SDK transport sends the same request shape": the TypeScript build has one transport, `fetch`, in the
  browser and the batch runner alike. The request-shape test runs the real `fetch` transport against a stubbed `fetch`.

Two web helpers were moved out of the worker class so the tests reach them as the C# tests reached theirs:
`catchUpFrames` (`src/web/src/session/frames.ts`) and `fallenSeesAll` (`src/web/src/session/settings.ts`).

### The switch-over

- `scripts/test.sh`: type-check (`npm run typecheck`), the determinism lint (`npm run lint`) and Vitest, printing the
  summary and the failures.
- `scripts/sim.sh`: the TypeScript batch runner (since gate 4, part 1).
- `.github/workflows/pages.yml`: Node 22, `npm ci`, lint, type-check and Vitest, then `vite build` into `site/`;
  `scripts/site-prepare.sh` is unchanged but for its comments (the built `index.html` keeps `<base href="/" />` for it).
- `scripts/cloud-setup.sh`: installs the npm packages and Playwright's Chromium, no longer .NET. The C# build stays in
  `src/Amarna.*` and `tests/` for reference; `scripts/parity.sh` still compares the two builds and needs the .NET 10 SDK
  installed by hand.
- `eslint.config.js`: the engine's determinism rules ("Engine rules" under Tech stack): no `Math.random`, `Date`,
  `Intl`, `localeCompare`, `toLocaleString`, `performance`, browser or Node globals; only `Math.abs`, `sign`, `floor`,
  `ceil`, `round`, `trunc`, `min`, `max`, `sqrt`, `imul`, `clz32` and `fround`; no `**` (BigInt powers, which are exact,
  excepted); no `sort()` without a comparison. The engine passes it.
- Files stay under 50 KB: the sleeping seats' tests are split in four (`sleep*.test.ts`, with `sleep-support.ts`), and
  the rulebook text moved out of `src/llm/src/prompts.ts` into `src/llm/src/rules.ts`.

## Phone measurements

`src/web/measure.mjs`: a phone (390x844, touch) with the CPU slowed four times, nothing cached, the site served under a
sub-path as Pages serves a preview (uncompressed, on this machine; Pages compresses, so both builds load faster there).
First load is until the start page can begin a game; then one season of a Free game. Median of three runs:

| Build | First load | Served | One season of a Free game |
|---|---|---|---|
| C# (Blazor WebAssembly, `dotnet publish`) | 5.50 s (6.45, 5.29, 5.50) | 9.17 MB | 7.96 s (8.45, 7.76, 7.96) |
| TypeScript (Vite) | 1.50 s (1.37, 1.50, 1.54) | 1.23 MB | 0.77 s (0.77, 0.69, 0.78) |

The smoke test (`src/web/smoke.mjs`) plays four script seasons at desktop size (1.8 s) and at phone size (1.7 s), opens
every tab, history and one king's view, and plays one human season with audiences answered. Layout measured: phone
header 390x58, map 390x281, panel 390x420, timebar 390x56, no sideways scroll; desktop map 858x714 beside a 422x756
panel.

## Script players and benchmarks

The conversion adds no rule, and parity shows the TypeScript script kings and characters play exactly as the C# ones, so
there is no new feature for them to use, and no weakness found in this step. Benchmark as a regression check (seeds
1–40, one current king against six baselines, shared victory off), in the TypeScript build:

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

The table in `docs/design/07-script-kings/20-benchmarks.md` (2.74 and 86% over all) was measured before gate 0 changed
the dice. The C# build, on the same dice, gives exactly the same table, so the change is the new generator's, not
the port's (both builds play the same games).

## Readings taken and design questions

1. **Zod is not used yet.** "One source for model schemas" (Engine rules) asks for the order and audience schemas in Zod,
   compiled once against each provider at startup and measured against each provider's limits in a test. The port kept
   the C# build's hand-built JSON schemas, so the request text could be proved byte for byte; Zod is on the "Found during
   the port" list for the fix pass.
2. **One transport.** The C# build sent the batch runner's calls through the official Anthropic SDK; the TypeScript build
   sends every call with `fetch`, behind the `ApiTransport` interface, which is where another provider would join.
3. **The C# build stays in the repository** for reference and `scripts/parity.sh`, but nothing builds or tests it any
   more. Should it be removed once `main` has switched over?
4. **A file seat's readable JSON** uses `JSON.stringify`, which escapes a few characters differently from the C# build's
   writer; the replies are read the same way.
5. **Phone measurements** were taken on this machine's Chromium with the CPU slowed, not on a real phone.

## Found during the port

Listed in `docs/BUILD-PROGRESS.md` ("Found during the port") for the fix pass (step 3), not fixed here:

- The model schemas are hand-built JSON, not Zod; no startup compile against each provider and no test measuring them
  against the providers' documented limits ("One source for model schemas" in Engine rules).
- Only Anthropic sits behind the transport; "Built to outlive its models" asks for providers and models as settings that
  name any provider and model, which the fix pass should check against what the model layer offers.
- A file seat's readable JSON escapes a few characters differently from the C# build's (see reading 4): harmless, but
  the requests a file seat's agent reads changed by those characters.

No flaw in the game's rules or the script players' play was recorded while porting the tests: every C# test passes as written
in TypeScript, with the C# build's own dice.

## Review

One reviewer (Opus, high effort) on the diff and the item's text: nothing blocking. It ran the tests, `npm ci` from the
lockfile alone, the Vite build through `scripts/site-prepare.sh` in both modes, and a short `scripts/sim.sh`, and checked
the service worker, the determinism lint, the key's handling (in memory, in sessionStorage only when the player asks,
never logged or saved) and file sizes. Fixed from it: a season still running when a new game started took its own abort
for an error and could touch the new game (`step` in `src/web/src/session/core.ts`). Left as noted, not blocking:

- An abandoned game's human seat leaves its promise unsettled (a harmless leak, with the rest of the fix pass).
- The determinism lint covers the engine, as the Engine rules ask; the script kings in `src/game/src` also feed
  replays and pass it today, so the fix pass could widen it.
- CI runs the tests but not the Playwright smoke test (`src/web/smoke.mjs`).
- The page's bundle (754 KB, 247 KB compressed) carries the engine as well as the worker's: size only.
- Returning visitors see the cached C# app once more before the new one takes over, as with every update before.

## Haakon's instruction after the milestone PR

Given at 04:20 UTC, once milestone PR #36 was open and green, word for word:

> You merge, always.

A standing instruction, recorded in `CLAUDE.md` ("Standing instructions") and `docs/archive/instructions.md` (item 14).
#36 was merged into `main` by the builder accordingly.

