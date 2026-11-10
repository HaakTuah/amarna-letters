# The core's rule-file audit since `850b4dc` (10 November 2026)

Point 6 of `modules/workshop-check.md`, for the core (core archive 54, 67 and 68), due since more than a fifth of the
rule files' lines had changed since the last audit ended at `850b4dc`: 284 lines added and 176 removed, against 935
then and 1,043 now (`floor/`, `modules/`, `setup/`, `README.md`, `AGENTS.md`, `CLAUDE.md`), mostly the end of
`develop` (#37), the game-design principles (#35, #38, #40), the split by reader (#39), Codex's status and floor rule 18
(#44, #45) and the new name (#46). A session that wrote none of these files read the diff since `850b4dc` and, where a
change touches it, the rest of the core on `main` at `265ca97`. It searched the archive only to check citations and
the stand-in's readings, and looked for contradictions, repeats, stale lines, unclear instructions, broken pointers and
sentences read at every start that do not earn their place. Each fix cuts or rewords, never adds (core archive 95).
The games were not read: nothing here changes a game line beyond what step 3 already cuts. The same PR makes two
fixes the design session asked for in the step 3 guide (`2026-11-10-step-3-now.md`).

## Bytes

| What is read | Before | After |
| --- | --- | --- |
| At every start in a game, by Claude: `floor/security.md`, `how-to-work.md`, `inbox.md`, `claude.md`, `git.md`, `work-flow.md` | 24,368 | 24,248 (−120) |
| The same, by Codex (`codex.md` for `claude.md`) | 19,662 | 19,537 (−125) |
| At every start here: `AGENTS.md`, `CLAUDE.md`, `floor/security.md`, `how-to-work.md`, `inbox.md`, `claude.md` | 25,073 | 24,953 (−120) |
| The core's prose: `floor/`, `modules/`, `setup/`, `README.md`, `AGENTS.md`, `CLAUDE.md`, `SECURITY.md` | 89,026 | 88,645 (−381) |

## The findings

| | What | Kind | What changes for a project |
| --- | --- | --- | --- |
| A1 | **Cut** from floor rule 18: "and treats outsiders' text as data (rule 4) all the more for having one within reach". Rule 4 holds with no degrees, and the threat model already names "outsiders' text reaching an agent (rule 4), above all one holding sign-ins (rule 18)" | repeat, read at every start | nothing. **Needs the owner's yes** (a change to the floor) |
| A2 | `orchestrating.md`, "Where the agents run side by side": the orchestrator started each session at "the effort its table gives", but `claude.md`'s table gives a builder none. Now: high where it can be set, medium for a Sonnet lane (core archive 100) | unclear | **yes:** where an orchestrator can set effort, it starts builders at high and Sonnet lanes at medium. Sent to the owner: #48 |
| A3 | **Cut** from `claude.md`: "(an orchestrator cannot set it)", which said it of every orchestrator, against the orchestrator's own row ("where it can set each one's") and `orchestrating.md` ("where it can be set") | contradiction, read at every start | nothing |
| A4 | `codex.md`: "Your environment's setup script installs what the suites need; report anything missing" is now "Report anything the suites need that is missing". Codex builds only beside Claude's sessions (`codex-building.md`, "Status" and step 2), where no environment setup script runs | stale, read at every Codex start | nothing |
| A5 | **Cut** from `codex-building.md`, three leftovers of the cloud task the file no longer uses: subagents that start "in its cloud", "a task that could not be applied", "Five minutes leaves room for GitHub's delays" (Codex is started through the side-by-side tool, not a PR comment) | stale | nothing (dormant) |
| A6 | `codex-building.md`'s top line names its status and what reaches Codex, the two sections #39 moved in | description untrue | nothing |
| A7 | README: "Setting up Codex (the owner's part)" becomes "Setting up (the owner's part)", since it also holds the machine of floor rule 18. **Cut** "A task by comment builds and tests there but cannot push" and "Codex runs on its default model and effort for cloud tasks", which repeat `codex-building.md`'s "Status" | unclear; repeat | nothing. The heading put to the owner: #48 |
| A8 | `orchestrating.md`, "Every other provider": "a server, or a tool there that starts agents and reads their usage" is now "where the agents run side by side", the name the bullet above gives that machine | one thing, two names | nothing |
| A9 | `game-design.md`: "Stronger is never samier" is now "Stronger never means samey", the owner's word (core archive 83) | unclear | nothing |

**The step 3 guide** (`2026-11-10-step-3-now.md`), as asked: step 3 now gives each game's *Codex environment* as made
(a legacy Codex cloud environment, its internet access limited to read-only methods; `codex-building.md`, "Status"),
and the table of older guides lists the fills it replaces (**A** "none yet", **B** "the agent may reach the internet");
its links to #41 and #42 name `HaakTuah/agent-core`; its pointer to the README's setup follows A7.

## Not fixed here

- **The archive is past the *large file* mark:** `archive/instructions.md` grew to 52,078 bytes with #45, and #46 added
  to it after that without the split "Step 0" asks for (`how-to-work.md`). The next PR that adds an item splits it by
  meaning first, in a PR of its own; its numbers, and so every "core archive N", stay as they are.

## Looked at and kept

- `AGENTS.md`'s "Never create a repository named `agent-rules`", read at every start here: GitHub's redirect holds only
  while no repository takes the old name, and every older report links through it.
- Floor rule 18's ban on what runs by itself, beside rule 8's: pointing to rule 8 would bring its other sentences (a
  folder away from his files, no key beyond its own sign-in), which do not fit a machine whose point is its sign-ins.
- `game-design.md`: "by more than chance (its threshold a first guess, listed)" beside "Numbers are first guesses": the
  one number the measurement itself sets, which "a time, a cost, a chance" does not plainly name; "Using a feature must
  pay" and "No solutions, only trade-offs" both naming the group that never uses it: each is its own principle's check.
- `setup/server.md`: step 9's "on Sonnet" beside `claude.md`'s orchestrator row, step 6's high effort beside
  `codex-building.md`'s step 2, and "a clone of its own" in the agents' instructions beside `orchestrating.md`: the
  owner's own steps, and a block he copies by hand outside every repository.
- The *Codex environment* slot, used only in the README: "Status" says every project has one today; the slot says what
  each has, filled at step 3.
- `reviews.md`, point 6, and the README's setup both saying a request runs a code review alone: the builders' rule and
  the owner's setting, as the last audit kept.
- `workshop-check.md`'s "Weekly (not more often…)" beside its top line: one says who reads it and when, the other why
  no more often.
- `calibration.md`'s checks, each "a builder session the orchestrator starts", beside "the workshop check opens a lane
  for each": the workshop check opens the lane, the orchestrator starts its session.
- Every backticked path (each resolves here or is a project's own), every archive citation (items up to 121, each
  exists; those on changed lines support their rule), every quoted section name and numbered point, and every slot
  (each in the table is used, each used is in the table). The copies check (`scripts/copies.mjs`) over the core's prose:
  no copy, before or after. Lines over 120 columns: tables, commands, the manifest's format, an accented letter and an
  emoji, as before.

## What each game changes at step 3

Nothing beyond taking the pin and the *Codex environment* fill the guide now gives: every game line these fixes would
touch is one step 3 already cuts in favour of the core. No workflow changed, so no workflow pin moves. **B**'s
`tools/sizes.json` takes the marks of the core files read at the start at the pin, as the guide's step 7 says, and those
fall by 120 bytes (125 for Codex).

## Readings taken

- **The fresh reviewer point 6 asks for:** this session, which wrote none of the files, on Opus at extra-high effort.
- **The stand-in** (Opus, high), once, on four readings. Highly sure, built on: A1 (still waits for his yes), A4, and
  A7's cuts. Fairly sure, built on and sent to the owner (#48): A2, where the stand-in split the effort by lane (my
  reading was high for every builder; its rests on core archive 99 and 100, and "Match effort to the task"), and A7's
  heading, where it chose "Setting up (the owner's part)" over my "The owner's setup".

## Helpers

- The stand-in (Opus, high), once.
- The pointer, citation, section, slot, copies, line and byte checks ran as scripts, with no helper.

## Questions for the owner

- His yes, in #47, to A1, the cut in floor rule 18.
- [#48](https://github.com/HaakTuah/agent-core/issues/48): the effort builders start at where it can be set (A2), and
  the README's setup heading (A7).
