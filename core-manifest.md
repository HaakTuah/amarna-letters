# Core manifest

Core: HaakTuah/agent-core at 2d13e39d7d6062a5524852a9b2107e86b33c5353, copied whole under core/ (never edited here).
Paths: in the core's files, one into floor/, modules/, scripts/, setup/, archive/ or reports/ is under core/; any other is ours.
Floor: whole. Modules: all.

## Names
- A task: an item (the build order's), or a lane's entry.
- The main lane: the item lane.

## Slots
| Slot | Here |
| --- | --- |
| *progress file* | `docs/BUILD-PROGRESS.md` |
| *report* | `docs/rounds/<date>-<item>.md` (the PR names it) |
| *archive citation* | "(archive item N)", N from `docs/archive/instructions.md` |
| *settling references* | "The game in one page" ("Starting a task" in `AGENTS.md`) and the item's sections |
| *descriptions* | the design notes (`docs/design/`) and, for what a player or a king sees, the README, the rulebook and the seat view; `docs/intent/` stays as it is |
| *copies check* | `core/scripts/copies.mjs` with `scripts/copies.json` |
| *large file* | over 50 KB |
| *size marks* | about 20 KB each for `AGENTS.md`, `CLAUDE.md`, the builder rules and the progress file |
| *one at a time* | the numbered items, one lane |
| *design-checked PRs* | the build-order items (not the polish and sound lanes' small fixes) |
| *review reference* | "The game in one page" |
| *planning design* | the script kings' planning |
| *hard work* | an item's hardest problems, above all the competing approaches judged by measurement |
| *measurements* | the benchmarks and use against ignore (`scripts/sim.sh`) |
| *slop bar* | "Text a player reads" in `docs/review-guidelines.md`; finds fixed in "Follow-ups" in the progress file; the formula test in the suite |
| *major version checks* | the smoke test of the built app |
| *Codex's checks* | `scripts/test.sh`, and `scripts/sim.sh --games 50 --seed 1 --verify-replay` when the engine changed |
| *Codex environment* | made: a legacy Codex cloud environment, its internet access limited to read-only methods |
| *computer players* | the script kings and script characters, and the model kings and characters |
| *measured players* | the script kings and script characters |
| *what they are shown* | the seat view |
| *use-against-ignore measurement* | script games on the same seeds (`scripts/sim.sh`): scripts that use the item's feature where it fits against scripts that ignore it; scripts that always use it are not played yet |
| *where the numbers go* | the item's report, and the running table "Use against ignore" in `docs/BUILD-PROGRESS.md` |
| *where rules are taught* | the rulebook or the seat view, in the rule's own commit |
