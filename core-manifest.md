# Core manifest

Core: HaakTuah/agent-core at aefa51746aa1623391eb98c4d065ffe6bd703968, copied whole under core/ (never edited here).
Paths: in the core's files, one into floor/, modules/, scripts/, setup/, archive/ or reports/ is under core/; any other is ours.
Floor: whole. Modules: all.

## Names
- A task: an item (the build order's), or a lane's entry.
- The main lane: the item lane.

## Slots
| Slot | Here |
| --- | --- |
| *owner's account* | `HaakTuah` |
| *progress file* | `docs/BUILD-PROGRESS.md` |
| *report* | `docs/rounds/<date>-<item>.md` (the PR names it) |
| *settling references* | "The game in one page", which "Starting a task" in `AGENTS.md`, point 3, names, and the item's sections |
| *descriptions* | the design notes (`docs/design/`) and, for what a player or a king sees, the README, the rulebook and the seat view; `docs/intent/` stays as it is |
| *copies check* | `core/scripts/copies.mjs` with `scripts/copies.json` |
| *size marks* | `scripts/sizes.json` |
| *large file* | over 50 KB |
| *one at a time* | the numbered items, one lane |
| *design-checked PRs* | the build-order items (not the polish and sound lanes' small fixes) |
| *review reference* | "The game in one page" |
| *planning design* | the script kings' planning |
| *hard work* | an item's hardest problems, above all the competing approaches judged by measurement |
| *major version checks* | the smoke test of the built app |
| *other builders' checks* | `scripts/test.sh`, and `scripts/sim.sh --games 50 --seed 1 --verify-replay` when the engine changed |
| *computer players* | the script kings and script characters, and the model kings and characters |
| *measured players* | the script kings and script characters |
| *what they are shown* | the seat view |
| *use-against-ignore measurement* | script games on the same seeds (`scripts/sim.sh`): scripts that use the item's feature where it fits against scripts that ignore it; scripts that always use it are not played yet, queued in `docs/BUILD-PROGRESS.md` |
| *where the numbers go* | the item's report, and the running table "Use against ignore" in `docs/BUILD-PROGRESS.md` |
| *where rules are taught* | the rulebook or the seat view |
