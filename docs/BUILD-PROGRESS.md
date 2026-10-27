# Build progress

Follows "Build order" in the design document (copy: `docs/intent/build-order/`; the builder rules are in
`.claude/rules/builder-rules.md`). One line per item: state, branch, report, and what was decided along the way. Items
are built on their own branch from `develop` and merged into `develop` when the tests pass and one reviewer has found
nothing blocking; `main` is never pushed to: it changes only by the milestone PR from `develop`, which the builder
merges once CI is green ("You merge, always.", 27 October 2026). The whole order is built without
stopping at review points: their questions and the readings taken are listed under "For Haakon" and in each item's
report. Work goes on item after item until weekly usage nears 90% ("Usage" in the builder rules; decided 26 October
2026, replacing the stop after item 5 of 20 October).

Since 27 October 2026 the design document has one tab per system, and its copy one folder per tab
(`docs/intent/INDEX.md` lists them, with each tab's node and revision for the check for changes). An entry keeps its
title wherever it moved, so `grep -rn "Title" docs/intent` still finds what an item names. On 27 October the document was
also condensed: passages that record history rather than intent (what was tried or retired, what past runs
measured, the full text of items 1 to 5) moved word for word to `docs/archive/design-history.md`, so a title that
`grep` no longer finds in `docs/intent/` is looked up there.

What each built item found and decided, word for word as recorded at the time, is in `docs/archive/build-log.md`.
Haakon's standing instructions given in chat are recorded word for word in `docs/archive/instructions.md`.

## For Haakon: review points

| Item | Review question | Reading taken | State |
|---|---|---|---|
| 4 | Are model characters too honest? Is the message-kind fallback for reopening needed? | Yes, on thin evidence (to be answered by stakes, not dispositions: item 11); no | Accepted by Haakon, 20 October |
| 4+ | Fix pass: standing orders now answer a move in the season it is made (reading of "fire a season late"); a threat to the homeland includes moves inside the mover's own land; no refusal and no failure of a king's own making wakes him (a route through other kings' troops remains); a failed attack on any of his land or troops wakes him; foreign levies beside his land wake nobody; a king's letters are in his view while their envoys are away; scribes rewrite copy marks and person ids, and a tablet is named by its seals and date (names can still differ between courts); narrator-written personas keep their text, with current trait words added; the isolation test's authority sits in every agent's definition and a paraphrased guard message fails it; the skim share is rounded to the shekel; "weighed light" means not a whole ten shekels; standing orders for every seat (built, with script kings using them) | Readings as listed; each with its alternative in `docs/archive/rounds/2026-10-20-fix-pass.md` ("Review questions for the whole pass" and "Review questions" under the review findings) | Accepted by Haakon, 20 October (Haakon merges the fix-pass PR himself) |
| 5 | How long wars and games now run; does defence now dominate? Also: capitals fall in about half the games (53-58 of 100) — "most games"?; wars of attrition but 2-season capital sieges; the game ends as wars ripen (lengthen games in item 18?); allies cannot reach a friend's besieged city (passage, item 9?); only sworn partners relieve a besieged friend; walls against fleets vs a blockade rule for islands; the frozen baseline and the siege package; Mitanni falls most | Median 9-10 seasons from first entry to a capital's fall, never fewer than 3; capitals fall in about half the games; defence does not dominate outright but nearly does within today's game length (standing orders fire under once a game); game length and the ending rule left to item 18; details in `docs/archive/rounds/2026-10-20-sieges.md` ("How long wars and games now run", "Does defence now dominate?", "Review questions") | Accepted by Haakon, 20 October: "most games" is judged in item 18 after game length is set; allies relieve a besieged city through item 9's passage grants, with no rule of their own; islands are protected by a blockade, built in item 7, replacing what item 5 built for them |
| 5+ (fix pass) | Is it right that no call is strict (the schema as one non-strict reply tool, so no grammar is compiled)? Should a reply missing a field be sent back (every field required, file seats included)? Is 50% the right default share for pausing a game on fallbacks? Should an unpriced model count as free? The first real call (the check at setup and a model game) is yours | Readings 1-8 in `docs/rounds/2026-10-27-fix-pass.md`, "Readings taken and design questions" | Answered by Haakon, 27 Oct: "I agree with all your takes, but I'd mark the 50% as a starting point for further testing and review." 1 and 2 yes; 3 yes, as a starting point tested and reviewed once model games return; 4 changed: an unpriced model's cost shows as unknown, never free, and a game with a spending limit does not start until every model it uses has a price (item 6c; "Every model is the table's choice" under Engine and models) |

## Items

| # | Item | State | Branch | Report |
|---|---|---|---|---|
| 1 | Simulation fixes and default sleep | done (19 Oct), merged into `develop`; PR #7 merged into `main` | `round/simulation-fixes` | `docs/archive/rounds/2026-10-19-simulation-fixes.md` |
| 2 | The visual overhaul | done (19 Oct), merged into `develop`; PR #8 merged into `main` | `item/visual-overhaul` | `docs/archive/rounds/2026-10-19-visual-overhaul.md` |
| 3 | Small record items | done (19 Oct), merged into `develop`; PR #9 merged into `main` | `item/small-record-items` | `docs/archive/rounds/2026-10-19-small-record-items.md` |
| 4 | Second agent simulation, with model characters (stop for review) | done (19 Oct), merged into `develop`; PR #10 merged into `main`; review accepted (20 Oct) | `item/second-simulation` | `docs/archive/rounds/2026-10-19-second-simulation.md` |
| 4+ | Fix pass, item 4's follow-up (Haakon, 20 Oct), with the feature audit | done (20 Oct), merged into `develop`; PR #11 merged into `main` | `item/fix-pass` | `docs/archive/rounds/2026-10-20-fix-pass.md` |
| 5 | The siege package (stop for review) | done (20 Oct), merged into `develop`; PR #12 merged into `main` | `item/sieges` | `docs/archive/rounds/2026-10-20-sieges.md` |
| 5+ | TypeScript conversion, step 1: the rest of the docs and preview pass (`docs/items/docs-and-preview.md`) | done (26 Oct): #19 into `develop`, carried to `main` by #20, with three follow-up fixes (#21, #23, carried by #22 and #26) under the pass's exception. Round reports archived (six decisions recorded nowhere else are listed in the report). Previews work on the live site through the `gh-pages` branch; the site root showed GitHub's 404 page for a few minutes on 26 Oct (about 23:16-23:20 UTC) until it was republished, see the report. Pages setting for Haakon in the report. 11 GitHub branches ready to delete but not deleted (this session may not delete branches); `wip/scratch-review-H` kept. Next: step 2, the conversion (`docs/items/conversion.md`), in its own session | `docs/archive-and-preview` | `docs/rounds/2026-10-26-docs-and-preview.md` |
| 5+ | TypeScript conversion, step 2: the conversion (`docs/items/conversion.md`) | done (27 Oct: #35 into `develop`, carried to `main` by the milestone PR; the session ran below the high effort asked for): gates 0 to 4 passed. The C# build switched to the 32-bit keyed generator (save version 7); the TypeScript engine, script kings and characters, model layer and batch runner match the C# build on every phase of 260 script games, 60 against the baseline, 18 with every role on the simulated API (request text included) and the recorded model games (156 of 156 phases); the web app is Vite and React with the engine in a Web Worker; the 91 C# test files are 93 Vitest files, 996 tests passing (the script worker's test and the SDK transport's have no counterpart); `scripts/test.sh`, `scripts/sim.sh`, `CLAUDE.md` and the preview workflow run the TypeScript build, and `scripts/cloud-setup.sh` no longer installs .NET (the C# build stays for reference and `scripts/parity.sh`). Phone, CPU slowed 4x: first load 5.50 s to 1.50 s, one Free season 7.96 s to 0.77 s. Readings: Zod and providers left to the fix pass; should the C# build be removed? | `item-5plus/conversion` (#35) | `docs/rounds/2026-10-27-conversion.md` |
| 5+ | TypeScript conversion, step 3: the fix pass for "Found during the port" (`docs/items/fix-pass.md`) | done (27 Oct): #37 into `develop`, carried toward `main` by the milestone PR (the session ran below the high effort asked for): every entry fixed or moved (below). Reply schemas in Zod, validated, sent as one non-strict reply tool (no grammar compiled), retried once with their errors; the check at setup (free token count; a compatible endpoint's model list), built and tested against the simulated API only; a limits test over every schema variant; providers behind one interface (Anthropic through the official SDK, any OpenAI-compatible endpoint), models, keys and prices as settings; every decision logged with its author, fallbacks counted by season with the table's pause share; the message trail in four parts with authors and an author filter. Readings in the report; the first real call is Haakon's. Next: item 6a, in its own session | `item-5plus/fix-pass` (#37) | `docs/rounds/2026-10-27-fix-pass.md` |
| 5+ | TypeScript conversion, step 4: the old C# build removed (`docs/items/fix-pass.md`, step 4 of item 5+) | done (27 Oct): `src/Amarna.*`, `tests/Amarna.*`, `AmarnaLetters.sln`, `Directory.Build.props` and `scripts/parity.sh` (retired: it ran the C# build) deleted; the design notes, README, simulation kit, launch and hook configs re-pointed to the TypeScript build; tests (1005) and benchmarks unchanged. The tag `csharp-final` could not be pushed from this session (the proxy refuses tag pushes and the refs API): the last commit with the C# build, `5b4caa2`, is kept on the branch `archive/csharp-final` and the tag must be pushed by Haakon (`git push origin 5b4caa2:refs/tags/csharp-final`). Next: item 6a, in its own session | `item-5plus/remove-csharp` | `docs/rounds/2026-10-27-remove-csharp.md` |
| 6a | The ending and the table | not started | | |
| 6b | Call size | not started | | |
| 6c | Who decides (split from 6b on 27 Oct: "Minds follow what is at stake" revised for every mind, kings, city-states, vassals and characters) | not started | | |
| 6+ | The historical sources | not started | | |
| 7a | The map and the seas | not started | | |
| 7b | Travel and news | not started | | |
| 8 | Structured press | not started | | |
| 9 | Envoy authority and passage | not started | | |
| 9+a | The economy at home | not started | | |
| 9+b | The economy abroad | not started | | |
| 10 | Characters, first package: who they are | not started | | |
| 10+a | People at home | not started | | |
| 10+b | People across borders and in kings' hands | not started | | |
| 11a | Money and work | not started | | |
| 11b | Roads and reputations | not started | | |
| 11+ | City-states as powers | not started | | |
| 12 | Languages | not started | | |
| 13 | Command at a distance | not started | | |
| 14 | Legends | not started | | |
| 15 | Infrastructure and policing | not started | | |
| 16 | The royal council | not started | | |
| 17 | How cities become free | not started | | |
| 18 | The balance pass | not started | | |

## Found during the port

Flaws found while porting to TypeScript (`docs/CONVERSION-PLAN.md`): listed here, not fixed during the port. The fix
pass (step 3, `docs/items/fix-pass.md`) handled them (27 October 2026; `docs/rounds/2026-10-27-fix-pass.md`, "Each entry,
and how to see it"): the first two are fixed, the third moved as no longer a flaw (the TypeScript build is the only one
that plays, and the request text changed with the Zod schemas). Details of the findings in
`docs/rounds/2026-10-27-conversion.md`.

- **Fixed.** **Model schemas are hand-built JSON, not Zod** (kept for byte parity with the C# build): no startup compile against
  each provider, and no test measuring the schemas against the providers' documented limits ("One source for model
  schemas" in Engine rules, `docs/intent/engine-and-models/tech-stack.md`).
- **Fixed.** **One provider.** Calls go through the `ApiTransport` interface with `fetch`, to Anthropic only; "Built to outlive its
  models" asks for any provider and model as settings. Check what the model layer still lacks.
- **Moved: no longer a flaw.** **A file seat's readable JSON** (the schema printed in a request) escapes a few characters differently from the C#
  build's, through `JSON.stringify`: harmless, but the text a file seat's agent reads differs by those characters.
