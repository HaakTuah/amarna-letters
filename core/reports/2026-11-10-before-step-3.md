# Before step 3: the last of what both games keep twice, a dry run, and the core read whole (10 November 2026)

The last work before both games take their copy of the core. Both games were read on `develop` (Amarna Letters at
`20e00f44`, Barkstreet Snakes at `1579ad7`, the commits the earlier reports read) and nothing was written to either;
the dry run ran on scratch clones whose push was disabled. The builder ran on Opus at extra-high effort (the brief asked
for high).

## What moved (points 1 to 4)

| The core's file | From | Changed |
| --- | --- | --- |
| `.github/workflows/delete-merged-branches.yml` | the same file in both | callable; the caller keeps the button, its input, permissions and concurrency; the lookup of a branch's merged PR passes the branch name as a query field gh encodes, never pasted into the address |
| `.github/workflows/codeql.yml` | `codeql.yml`, the same but for the languages | callable, its languages an input (a JSON list); the checkout keeps no token |
| `.github/workflows/licences.yml` | each game's `licences.yml` | callable: GitHub's dependency review with the lists the script gives, then the script's whole check |
| `scripts/licences.mjs`, `scripts/licences.d.mts` | Amarna's `scripts/licences.mjs` and `.github/licences.yml`; Barkstreet's `.github/dependency-review-config.yml` and its lists and entry checks in `tools/licences.js` | below |
| `.github/workflows/core.yml` | nothing: `README.md` promised it | below |

**The licence check.** The list for what ships is read from floor rule 10's own words in `floor/topics.md` (the
general list, CC-BY "for data and assets", OFL "for fonts", the public domain); a rewording it cannot read fails
loudly, never checks less. The tools' list is every licence the Open Source Initiative approves (the list Amarna
Letters kept, of 28 October 2026), PSF-2.0 (the floor's "on the same terms") and everything what ships may be under;
the dependency review gets that list from the script, so it too stands once. A project's config (JSON, protected like
the check) names `lockfiles` (every package each installs is checked), `ships` (the package.json files whose runtime
dependencies, and their workspaces', ship; `[]` if none), `data` and `fonts` (packages checked by hand, known by
their registry address), `audit` (entries for what no lockfile holds) and `ignoreScriptsIn` (the `.npmrc` files that
must keep install scripts off); a key it does not know, or of the wrong shape, fails. Every `.npmrc` in the project may
hold only settings that leave where npm fetches from alone. The types file serves a TypeScript project's imports.

**Shown unchanged:** on Amarna Letters' tree the core's check gives what its own did (262 packages, 11 shipped, none
off); the dependency review's list is the same 142 ids. On Barkstreet Snakes' tree it passes its 23 tools' packages
and 43 audit entries, and its own scan with its 29 remaining staged failures passes. 37 planted cases on a scratch
project (each list, brackets, a mix of AND and OR, WITH, no licence, shipped copyleft, a GPL tool, data and fonts by
name or kind, an unregistered "data" package, `.npmrc` anywhere, the config's shapes and spellings, an audit entry's
shape, GitHub's own service) and three rewordings of floor rule 10 all behave as they should. It fails closed where a
package's lockfile licence is a deprecated id (`GPL-3.0`), carries an exception (`WITH`) or is missing: none of either
game's is, and such a package would need a change to the core or a reasoned audit entry.

**What it changes for each game.** Amarna Letters: an AND/OR mix without brackets is now refused (none in its
lockfile). Barkstreet Snakes: brackets are read by their meaning instead of refused; the tools' list is all of OSI's
(its own was 45 chosen ids, to which a new tool's id was added); CC-BY is allowed to a tool only when named as data or
an asset, as the floor says (no tool of its is CC-BY). Both stand-in answers below.

**The pin check** (`core.yml`): fails a change whose `core/` is not this repository, whole, at the commit its manifest
pins, and a call to a core workflow pinned where that workflow differs from the one at the core pin (which each
review checked by hand). The pin is read from the manifest's `Core:` line and used only once it is a full commit SHA.
Run locally on the dry run: clean, and each planted fault fails (a core file edited, a call pinned where the workflow
differs, a call by branch name, a manifest without its pin).

**CodeQL:** the two games' files differ only in the languages (Amarna Letters adds Python); neither names paths.

**The issue templates stay each game's** (the stand-in: highly sure): they differ in three lines, each an example of
the game's own (a command, "online or not", who notices), and GitHub reads templates only from each repository, so a
shared wording would need a sync script and a check to save two small files.

## Point 5: anything else both keep twice

| What | Shared? | Why |
| --- | --- | --- |
| The check that `core/` matches its pin | yes: `core.yml` | promised by the README, needed by both at step 3 |
| `personal-terms.yml`, `copies.yml`, the work-saved hook, usage and status line scripts | already the core's | `reports/2026-11-09-shared-scripts.md` |
| `.claude/settings.json`, `.claude/agents/Explore.md`, `.claude/launch.json` | no | Claude Code reads them only from the project; they differ in the game's paths and setup |
| `.github/dependabot.yml` | no | read only from the repository; the ecosystems differ; each adds the core's ignore line |
| `pages.yml`, `scripts/cloud-setup.sh`, `scripts/test.sh`, `scripts/sim.sh`, `.gitignore` | no | different builds, Node installers and pins, suites and commands; the README keeps the cloud setup each game's |
| `docs/calibration.md`, `docs/archive/` | no | each project's own log and archive; their forms are slots or the core's rule (`modules/reviews.md`) |
| Barkstreet Snakes' pointer and reading-size checks | no | only one game has them; a pointer check of the core's own files is a candidate (below) |

## Point 6: the dry run of step 3

In a scratch clone of each game: the core copied whole under `core/` (pinned to this branch's commit), the manifest
written from the drafts in `2026-11-09-first-core.md`, the rule-file lines cut as its maps (carried to `develop` by
diff: only `AGENTS.md` had moved, and every range carried over) and `2026-11-09-game-design.md` say, the settings,
workflows and configs pointed at the core's scripts and workflows as `2026-11-09-shared-scripts.md` and this report
say, then each game's own checks run.

| | Amarna Letters | Barkstreet Snakes |
| --- | --- | --- |
| Tests | types, lint and Vitest: 210 files passed, 1 skipped as the suite skips it (1,810 tests) | types, rules, online, chatter, records, sw, versions, licences, scope, csp, render, input, ui: all pass; layout not run (half an hour, and it reads no rule file) |
| Copies check (the core's, the game's config) | passes (its 3 old copies), also with the core's floor and modules added | passes, also with the core's floor and modules added |
| Sizes check | (none) | passes, once its marks name the core files every session now reads |
| Licence check | as before (above) | as before, once its scan counts the core's workflows as the owner's own |
| Pin check (run locally) | passes | passes |
| Pointers (Barkstreet's checker, borrowed for Amarna) | one broken: below | all resolve |
| Read at the start, Claude Code (bytes) | 38,703 before, 45,888 after | 26,774 before, 37,533 after |
| Read at the start, Codex | 34,030 before, 40,124 after | 22,112 before, 31,734 after |

The start reading grows because the floor and four modules are read at every start (the owner's choice, #8); the
first core's estimate was 43,900 and 35,500 for Claude Code. Amarna's figure counts its builder rules as the maps leave
them (9,141 bytes); the design session's cuts at the source take more.

**Failed because of the core, fixed here:**
- Amarna's types check failed on importing the core's script, which had no type declarations: `scripts/licences.d.mts`.
- No check that `core/` matches its pin existed: `core.yml`.
- With the core's prose in a game's copies check, three copies inside the core failed it: the README's account of the
  floor and the floor's opening, the orchestrator exception in floor rule 8 and the threat model, and the security
  review's brief twice in `modules/reviews.md`, point 6. Each now stands once.

**Failed because of the drafts or the games' own files, for step 3** (each fixed in the dry run as said):
- The maps cut whole lines, so where a rule's head moved to the core and its tail held the game's own words, the line
  left is a fragment (Amarna Letters' `AGENTS.md` "How to work" and lanes, `SECURITY.md` rules 6 and 17, its review and
  developing docs; Barkstreet Snakes' smallest setup, its developing doc and `docs/orchestrating.md`). Each is rewritten
  as a whole sentence at step 3.
- The drafts' "The core" section names `core/modules/usage.md`, removed since; `claude.md` comes through `CLAUDE.md`.
  Both drafts also name `core/floor/topics.md` and `core/modules/game-design.md` among the files read when needed, and
  Amarna Letters drops "spending" from its own safety rules (floor rule 14).
- The drafted manifests fill the six game-design slots (from `2026-11-09-game-design.md`), name the copies check's
  config, and take the manifest's new "Paths:" line; Amarna's *settling references* repeated the path its `AGENTS.md`
  gives, which its copies check caught: it points to "Starting a task" instead.
- Lines both games kept that the core already says, which the maps left: the threat models' "Who" and "ways in" (each
  keeps only its own), two sentences of each codex-building split, Barkstreet's PeerJS check repeating floor rule 7's
  words, and `core/scripts/usage.sh` among the commands (Claude's alone, in `claude.md`).
- Barkstreet Snakes: its pointer check reads a numbered point only as a list item, so the floor's rules (`**3. ...`)
  failed; it learns that form. Its sizes check refused the core's 62 KB first-core report as a changed large file; it
  leaves `core/` to the core, as it leaves the archive. Its audit scan wanted the core's workflows audited; the owner's
  own repository counts as his, as his web addresses do. Its previews would publish `core/`; they leave it out.
- Amarna Letters' builder rules (generated, cut at the source) still point to "Questions, readings and ideas" in
  `AGENTS.md`, now `core/modules/inbox.md`, and still hold the stop at a failed safety check, now floor rule 14.
- Both games' `SECURITY.md`: "rules 1 to 17" after two file names reads as a pointer into one of them; the frame names
  the two files only.

## What each game changes at step 3

What `2026-11-09-shared-scripts.md` lists stands; to it, both games:
- **`core-manifest.md`** and **"The core"** in `AGENTS.md`, from the drafts as corrected above; `CLAUDE.md` imports
  `core/modules/claude.md`.
- **Workflows,** each keeping its triggers and calling the core's at the same pin: `core.yml` (new, on every PR and
  push to `main` and `develop`), `codeql.yml` (its languages; the job grants `actions: read`, `contents: read`,
  `security-events: write`), `delete-merged-branches.yml` (the button's input passed on), `licences.yml` (its config).
  Required checks take the called jobs' names ("core / core", "licences / licences", "analyze / Analyze (…)"); the
  rulesets are the owner's.
- **The copies check's config** adds `core/floor/*.md` and `core/modules/*.md` to its prose (the stand-in: highly
  sure), so a game line that restates the core fails.
- **`SECURITY.md`** names the licence check's config among the checks on the work.

Amarna Letters: `.github/licences.yml` goes; `scripts/licences.json` (`lockfiles`: the root lockfile; `ships`: the
root `package.json`, whose workspaces' runtime dependencies ship; `data`: `caniuse-lite`; `ignoreScriptsIn`: `.npmrc`);
`scripts/licences.mjs` becomes `scripts/notices.mjs`, the build's notices alone, importing the core's functions;
`src/web/vite.config.ts`, `src/web/test/licences.test.ts` and the README's credits line point there and to the core.

Barkstreet Snakes: `.github/dependency-review-config.yml` goes, and `tools/licences.json` loses its copy of the list;
`tools/licence-check.json` (`lockfiles`: `tools/package-lock.json`; `ships`: `[]`; `audit`: `tools/licences.json`);
`tools/licences.js` keeps its scan of what is used, runs the core's check, and counts `HaakTuah/` actions as the
owner's; its test drops the three cases about the lists; `licences.yml` and `copies.yml` each call the core's and keep a
job of their own (the scan and its test; the pointer and sizes checks) with Node set up as `tests.yml` does; the
pointer, sizes and pages changes above; `tools/sizes.json` names the core files read at the start (total 54,799 bytes).

## Point 7: the core read whole

A fresh reviewer (Opus, high), given only the core, found 2 P1, 12 P2 and 13 P3. Made here:

| | Finding | Done |
| --- | --- | --- |
| F1 (P1) | the stand-in could stand in for the owner's yes on what cannot be undone | `inbox.md`: such a step waits for his own word |
| F2 (P1) | `git.md` merged a milestone PR on green CI alone | and once the reviews it needs pass (floor rule 8) |
| F3 (P2) | no rule said which paths are the core's | the manifest's format says it, so every session reads it (stand-in, Q10) |
| F4 (P2) | the rule-file line the copies check reads was written down only in a script | README, point 4 |
| F5 (P2) | Step 0's 50 KB beside the *large file* slot | kept: the slot is when a file is never read whole, Step 0 when it is split, and both games split at 50 KB |
| F6 (P2) | `AGENTS.md`'s list of changes needing his yes left out the review guidelines | added; `reviews.md` no longer says it again |
| F7 (P2) | the fallback reviewer's brief left out `SECURITY.md` and the floor | added |
| F8 (P2) | review follow-ups in the queue against ideas needing his word | a follow-up of work done needs none; something new is an idea (stand-in, Q4) |
| F9 (P2) | who says usage cannot be read; this repository's usage line | the script says so; here a session checks no more |
| F10 (P2) | whose model and effort a started session takes | the one it was started with; the orchestrator's sessions run at the builder's |
| F11 (P2) | floor rule 3 could be read as shutting out Claude's cloud builders | "never one given to another agent (such as a Codex task)" (stand-in, Q1) |
| F12 (P2) | floor rule 8 forbids the hooks a session on his computer runs | its exception covers any session he starts himself, with its hooks and status line (stand-in, Q2) |
| F13 (P2) | the Node rule's citation | it cites core archive 39 for the cue it approved (stand-in, Q3) |
| F14 (P2) | the shared checks run the PR's own copy of the scripts | `core.yml` holds `core/` to the pin, a required check; the licence workflow's comment says what runs |
| F17, F19, F20, F26 (P3) | pointers and comments in this PR's own files | fixed |

**For the next audit** (P3): rules said twice that are each worth less than their cut (the Codex mention; "beaten
twice"; when a builder merges; the stand-in's one call; the audit trigger in `AGENTS.md`; the archive's "word for
word" twice in `inbox.md`); "category", "check-in" and "side lane" undefined; `inbox.md`'s pointer to
`docs/archive/instructions.md` and this repository's stock issue templates; `claude.md` citing a report; `AGENTS.md`'s
slot sentence and its core archive 80 citation; workshop-check's two schedules; `github-calls.md`'s fixed `develop`;
the Dependabot exception left out of `updates.md`; the core checking its own copies and pointers, and testing its own
scripts, in a workflow here (F27, and the fallback reviewer's idea).

## Point 8: the two remainders compared

With the dry run's rule files side by side (the copies check over both, and a read for the same rule in other words):

| Said in both | Verdict | Why |
| --- | --- | --- |
| "The core" section's frame and its pointer lines | stays | README point 3: each `AGENTS.md` must name them as plain lines, for Codex |
| `SECURITY.md`'s frame and "Reporting a weakness" | stays | GitHub shows each repository's own `SECURITY.md` (README point 4) |
| The manifest's header | stays | its format |
| The "Review guidelines" section | stays, one sentence | Codex's review reads it in `AGENTS.md`; its reason may go |
| Threat models' "Who" and "ways in", codex-building's two sentences, PeerJS's echo of floor rule 7, the usage command | cut in each game | the core says them; nothing to move |
| Barkstreet's "read again before the PR: build what changed, or if large say so" | cut to its own part | `modules/work-flow.md`, point 1, says it; the game names what is re-read and where it queues |
| Each game's smallest setup, lanes, branching, sessions | stays | the core leaves each its own (the projects' examples, work-flow point 2) |

Nothing moves into the core: what both games still say alike is either a frame the README requires in each, or a line
the core already holds, to be cut at step 3.

## Readings taken

The stand-in (Opus, high), once, on eleven questions. Highly sure, built on: Q3 (the Node citation), Q5 (CC-BY and OFL
as the floor says), Q7 (the pin check in this PR), Q8 (templates stay), Q11 (core prose in each copies check). Fairly
sure, built on and put to the owner (below): Q1 (floor rule 3's wording), Q2 (floor rule 8's exception widened to any
session he starts himself), Q4 (review follow-ups), Q6 (an AND/OR mix refused), Q9 (one PR: its parts are checked
together, and this session pushes one branch), Q10 (the paths line in each manifest).

## Helpers

- A fresh reviewer (Opus, high), once, given only the core (point 7).
- The stand-in (Opus, high), once.
- The fallback reviewer (Opus, high) for every workflow and script, against the floor. Round 1: 6, for one P1 (a config
  that wrote `./package.json` made nothing ship, so shipped copyleft passed: paths are now normalised, and tested), two
  P2 (an audit entry's `ships` or `kind` of the wrong shape now fails; the comments say the lockfile's licence fields
  are trusted as npm wrote them) and nine P3, of which seven fixed (the pin check sees a call in any YAML form; branch
  deletion matches names exactly, deletes only branches, counts only what it deleted, and says "newest commit"; the
  data and font names are checked; two comments) and two for later (a test suite for the core's scripts, run here; a
  way to record a hand-checked licence for a lockfile package). Round 2, on the change alone: 10, nothing open (one
  limit accepted: the pin check cannot see a call written after a quoted `#` on the same line, a form no YAML file here
  uses; only a YAML parser could tell).

## Questions for the owner

- [#20](https://github.com/HaakTuah/agent-rules/issues/20): six readings to confirm or correct (floor rules 3 and 8's
  wording, review follow-ups, AND/OR without brackets, one PR, the paths line in each manifest).
- His yes in the PR for the `.github/` changes and the floor's wording (rules 3 and 8, and the threat model's pointer).
