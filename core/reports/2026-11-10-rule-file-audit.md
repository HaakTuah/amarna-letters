# The core's rule-file audit (10 November 2026)

Point 6 of `modules/workshop-check.md`, for the core (core archive 54, 67 and 68). About a third of the rule files'
lines had changed since the audit of 9 November (309 of 945, mostly the lean pass, #25 and #26), past the fifth that
makes it due (`AGENTS.md`). A session that wrote none of the files read every rule file whole on `main` at `927d1ee`:
`README.md`, `AGENTS.md`, `CLAUDE.md`, `SECURITY.md`, `floor/` and `modules/`. It searched the archive only to check
citations, and looked for contradictions, repeats, stale lines, unclear instructions and broken pointers. Each fix cuts
or rewords, never adds (core archive 95). Both games were read on `develop`, and nothing was written to either: Amarna
Letters at `8b460a0` and Barkstreet Snakes at `01a54d7`, the commits the lean pass read. Neither has taken step 3 yet.
The audit found 14 points (R1 to R14), all made: two in [#30](https://github.com/HaakTuah/agent-rules/pull/30), which
needs the owner's yes, and twelve in [#29](https://github.com/HaakTuah/agent-rules/pull/29). R12 and R13, in files read
at every start, are no longer than the lines they replace.

## Bytes

| What is read | Before | After #29 | After both |
| --- | --- | --- | --- |
| At every start in a game, by Claude: `floor/security.md`, `how-to-work.md`, `inbox.md`, `claude.md`, `git.md`, `work-flow.md` | 23,950 | 23,938 | 23,934 (−16) |
| The same, by Codex (no `claude.md`) | 18,347 | 18,335 | 18,331 (−16) |
| At every start here: `AGENTS.md`, `CLAUDE.md`, `floor/security.md`, `how-to-work.md`, `inbox.md`, `claude.md` | 24,071 | 24,061 | 24,057 (−14) |
| The core's prose: `floor/`, `modules/`, `README.md`, `AGENTS.md`, `CLAUDE.md`, `SECURITY.md` | 80,490 | 79,859 | 79,840 (−650) |

## The floor and the review guidelines (#30, the owner's yes)

| | What | Kind | What changes for a project |
| --- | --- | --- | --- |
| R1 | `floor/security.md`'s opening: "it points to no part of the core outside `floor/`" becomes "it needs no part": the floor cites "core archive N", which is in `archive/`; what the sentence is for (a project with only the floor is safe) stands | untrue description | nothing |
| R2 | `review-guidelines.md`, "One idea": "design copies" cut from "not docs, design copies or Dependabot's updates": one game's word for its copy of the design, defined nowhere in the core, and a design document is docs | unclear (a game's word in the core) | nothing |

## The modules and `README.md` (#29)

| | What | Kind | What changes for a project |
| --- | --- | --- | --- |
| R3 | `orchestrating.md`: every session the orchestrator starts runs "at the builder's model", no longer "model and effort": `claude.md`'s builder row gives the builder no effort of its own ("the model and effort you were started at"), so "the builder's effort" named nothing | unclear | **yes:** an orchestrator sets only the builder's model; the session runs at whatever effort it is started at, and reads its rules against it (core archive 70 and 71). Sent to the owner: #28 |
| R4 | `roles.md`: the orchestrator is "the session that starts builder sessions" (floor rule 4's words), pointing to `orchestrating.md`; the list it replaces ("writes Codex's briefs, routes the work, takes the readings, merges Codex's PRs") was mostly Codex-building work, which is dormant, and left out what the orchestrator is | stale | nothing ("Who merges" keeps that it merges Codex's PRs). Sent to the owner: #28 |
| R5 | **Cut:** `codex.md`'s status: "Nothing on the owner's computer starts Codex unless he starts it (floor rule 8): once its tasks work, it is started from the pull request, or by an orchestrator the owner starts himself." | repeat: floor rule 8, read at every start; `codex-building.md` steps 2 and 3 | nothing |
| R6 | **Cut:** `codex-building.md`, step 2: "never by a program on the owner's machine that runs by itself, floor rule 8" | repeat: floor rule 8 | nothing |
| R7 | **Cut:** `orchestrating.md`, "Every other provider": "when he starts it there himself, as floor rule 8 allows" | repeat: floor rule 8 ("an orchestrator's included") | nothing |
| R8 | **Cut:** `codex-building.md`, "When Codex is not there": "Codex's usage can run out with no alert, so" | repeat: `reviews.md`, "Codex reviews" | nothing (dormant) |
| R9 | **Cut:** `codex-building.md`: "its default allows six" before "if not, its settings set five" | explanation | nothing (dormant) |
| R10 | **Cut:** `helpers.md`: "the most published practice runs at once" after the cap of five | explanation, read unclearly (its reason: core archive 61) | nothing |
| R11 | `reviews.md`, point 7: "the native review", defined nowhere, becomes "Codex's review" | unclear | nothing |
| R12 | `work-flow.md`, point 1: "Fix what the reviews find in one round" could be read as one round only, against `reviews.md`'s three; it meant both reviews' findings answered together, and now says "Fix every review's findings together" | unclear | nothing |
| R13 | `inbox.md`: the template's "headings and label … copied into the body" becomes "label, its headings in the body": a label is applied, not copied | unclear | nothing |
| R14 | **Cut:** `README.md`, point 6: "(a rule marked there as a safety rule is out of reach of "Principles over rules", as the floor is)" | repeat: `how-to-work.md`'s "Principles over rules", which says where it is marked (the project's `AGENTS.md`) | nothing: both games' drafted "The core" sections mark their safety rules in `AGENTS.md` |

## Looked at and kept

- Every backticked path (each resolves here or is a project's own), every archive citation (items 1 to 93, each exists;
  those on lines changed since the last audit support their rule), every quoted section name and numbered point (all
  resolve), and every slot (each in the table is used, each used is in the table). The core's copies check
  (`scripts/copies.mjs`) over its own prose: no copy, before or after.
- `workshop-check.md` point 6's "once at the first milestone after 10 November 2026": still ahead for both games, and
  core archive 54 asks for it ("a full rules audit a week on").
- Floor rule 9's "or whose kind the owner has not said": read with the threat model's "Lower stakes" ("the project's own
  model says what else is"), it means a kind not named lower stakes; rewording the floor would buy little.
- The review guidelines' "blocking (P1 in Codex's priorities)" beside floor rule 8's "P0 or P1": the guidelines' list
  ranks P1, and a floor break may rank worse.
- `reviews.md`'s milestone sum of the review lines beside the workshop check's point 9: one sums by category at each
  milestone, the other compares the builders' models weekly.
- `orchestrating.md`'s "Questions go on word for word" beside `inbox.md`'s links only: what goes on word for word is
  the lane's list of links.
- What the last audit and the lean pass kept, for the reasons they give: floor rules 4 and 17 pointing to each other,
  Codex's "nothing open passes" in three files, the 20 and 50 KB marks beside their slots, `AGENTS.md`'s usage line,
  the workflows' comments.
- Lines over 120 columns: tables, commands and an accented letter, as before.

## What each game changes at step 3

Nothing beyond taking the pin: every game line these fixes touch states a rule that step 3's maps
(`2026-11-09-first-core.md`) cut in favour of the core, so its rule now comes from the core. Lines are on `develop`.
- **Amarna Letters:** `docs/claude-and-codex.md` (the orchestrator's line, the helpers' cap of five, "Nothing on the
  owner's machine starts Codex", "the native review"), `docs/orchestrating.md` lines 7 and 36 ("at the builder's model
  and effort"), `docs/review-guidelines.md` ("One idea", with "design copies"), and `AGENTS.md`'s issue-template line
  (143) and "in one round" (171).
- **Barkstreet Snakes:** the same files, with `AGENTS.md`'s "copied into the body" (115) and "in one round" (141), and
  `docs/orchestrating.md` lines 9 and 35.
- **What a session does differently** (R3): an orchestrator starts each builder session on the builder's model and need
  not set an effort for it (#28).
- **The copies check:** no 12-word window of the changed core text is in either game's rule files; the core's windows
  found there fall (Amarna Letters 2,491 → 2,473, Barkstreet Snakes 2,588 → 2,568), all in lines step 3 cuts.
- **Barkstreet's `tools/sizes.json`:** the marks of the core files read at the start may come down by 16 bytes (a mark
  that falls passes).
- **No workflow pin moves:** no core workflow changed, so no sync PR needs the owner's yes for this audit.

If step 3 takes a pin from before these merge, the next sync PR brings them: `core/` and these notes, nothing else.

## Readings taken

- **The fresh reviewer point 6 asks for:** this session, which wrote none of the files, on Opus at extra-high effort;
  the brief asked it to read every rule file and find.
- **The stand-in** (Opus, high), once, on five readings. Highly sure, built on: R1 and R2 (each still needs his yes, in
  #30); R5 to R7, the restatements of floor rule 8 (core archive 95). Fairly sure, built on and sent to the owner (#28):
  R3 (it noted that once cut, nothing tells an orchestrator what effort to start a builder at; a later question if that
  matters) and R4.

## Helpers

- The stand-in (Opus, high), once.
- The pointer, citation, slot, copies and byte checks ran as scripts, with no helper.

## Questions for the owner

- His yes, in [#30](https://github.com/HaakTuah/agent-rules/pull/30), to R1 and R2.
- [#28](https://github.com/HaakTuah/agent-rules/issues/28): R3 and R4, to confirm or correct.
