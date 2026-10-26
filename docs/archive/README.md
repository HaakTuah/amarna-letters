# Archive

History, kept for the record. Sessions read it only when a task points here.

| File | What it holds |
| --- | --- |
| `build-log.md` | What each built item found and decided, moved word for word from `docs/BUILD-PROGRESS.md` on 26 October 2026. |
| `rounds/` | The round and item reports up to item 5, with their screenshots and the round prompts (`ROUND-PROMPT.md`, `ROUND-PROMPT-ADDITIONS.md`), moved from `docs/rounds/` and `docs/` by the docs and preview pass (`build-log.md` keeps their old paths, as recorded at the time). `docs/rounds/2026-10-18-sleep-and-simulation.md` stays where it was: the builder rules cite it as a specification. |
| `instructions.md` | Haakon's standing instructions given in chat, word for word with their dates. Add new ones here. |

## What came from Haakon's computer (PR #15, 26 October 2026)

Before the work moved to cloud sessions, everything the project kept outside git was copied into `docs/from-local/`
(PR #15). On 26 October it was folded into the repository and the folder removed; the copies are in git history at
commit `6a2ae7d`. Where each part went:

| What | Now |
| --- | --- |
| Claude's project memory: the build order, round workflow and stop rules | The builder rules (`.claude/rules/builder-rules.md`), which held all of them. Reading the design document "fresh from the live document" became the copy in `docs/intent/` with its check for changes. |
| The "How to work" note (21 October) | `CLAUDE.md`, in the fuller words of `docs/prompts/DOCS-AND-PREVIEW.md`, step 1. |
| "Never message a workflow's agents" | `CLAUDE.md`, "Helpers". |
| Pointers to the docs pass and the conversion | `docs/items/`. |
| "Project folders stay separate" | `CLAUDE.md`, "Each game's files stay in its own repository". |
| The owner's message log, its rebuild script and the hooks that ran it | Retired: cloud sessions have no local session files to rebuild from. The 9 instructions recorded nowhere else are in `instructions.md`; new ones are recorded there as they are given (`CLAUDE.md`). |
| Three recorded model games | `tests/fixtures/replays/`, for the conversion's parity check. |

Left on the computer and not copied: credentials, account state, app preferences, the message log itself (it has
personal remarks), the simulation kit's isolation secrets, and the other runs in `sim/runs/`.
