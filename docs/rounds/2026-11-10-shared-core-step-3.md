# The shared core, step 3: this game takes the core (10 November 2026)

Step 3 of "The shared core" (`docs/BUILD-PROGRESS.md`), done in the order the core's
`reports/2026-11-10-step-3-now.md` lists, against the core's newest `main`, `2d13e39d7d6062a5524852a9b2107e86b33c5353`.

## What was done

1. **`develop` dropped:** the last `develop` → `main` PR, #870, merged on green CI. #850, #771 and #547 were retargeted
   to `main` and brought up to date; #721 was retargeted but conflicts with `main`, so its lane must resolve that.
   Dependabot's #851 to #853 stay on `develop` until this PR merges (the report's R8), and are closed then.
2. **The copy:** the core whole under `core/`, unedited (a `diff -r` against the core at the pin is clean).
3. **`core-manifest.md`:** the first core's draft, with the "Paths:" line, no *milestone due*, the *copies check* with
   `scripts/copies.json`, the *Codex environment* made, the six game-design slots, the use-against-ignore measurement's
   three groups (two played), and the *settling references* pointing to "Starting a task".
4. **`AGENTS.md` and `CLAUDE.md`:** "The core" section, with no usage line; Codex reads `core/modules/codex.md`;
   `core/floor/topics.md` and `core/modules/game-design.md` among the files read when needed; the game's one safety rule
   of its own (no model games until the build order is done; spending is floor rule 14). `CLAUDE.md` imports
   `AGENTS.md`, the builder rules and `core/modules/claude.md`, and nothing else: the work-saved hook's and the
   workflow ban's bullets are cut.
5. **Rule-file lines the core now holds, cut:** `AGENTS.md` (19.4 KB → 6.6 KB), `CLAUDE.md` (6.4 → 0.3),
   `SECURITY.md` (12.4 → 2.9), `docs/threat-model.md` (2.2 → 0.8), `docs/review-guidelines.md` (5.2 → 2.3) and
   `docs/codex-building.md` (5.6 → 1.7). `docs/claude-and-codex.md`, `docs/orchestrating.md` and `docs/developing.md`
   are removed whole; the few lines that were the game's own moved: the monthly history spot-check to the calibration
   log's head, the design checker's dossier brief to the review guidelines, what ships to `SECURITY.md`, rule 7, and
   the Node cue to `AGENTS.md`.
6. **`develop` and milestone lines:** every rule about them cut (the core keeps no milestone); "`develop`'s history at
   commit `5b4caa2`" is now `main`'s (three design notes and `docs/for-developers.md`); `docs/SIMULATION-PROMPT.md`
   lines 4 and 165 name `main`. Left at the source for the design session: `docs/builder-rules.md` and
   `scripts/design-copy.py` lines 218–219, which write `develop` into `docs/intent/INDEX.md`.
7. **Security, scripts, settings and workflows:** `SECURITY.md` is the floor's frame plus this game's own under rules
   3, 5, 6, 7, 10, 15 and 17; the threat model keeps only what the floor's does not say. `.claude/settings.json` runs
   the status line, both work-saved hooks and the cloud setup from `refs/remotes/origin/main:`, the first three from
   `core/scripts/`; the game's copies of those scripts are removed. The copies check is `core/scripts/copies.mjs` with
   `scripts/copies.json` (its prose: the rule files `SECURITY.md` lists, the manifest, the calibration log and the
   core's floor and modules); the licence check is the core's with `scripts/licences.json`, `.github/licences.yml`
   gone, and `scripts/notices.mjs` keeps only the build's notices, on the core's policy. Every workflow keeps its
   triggers on `main` alone and calls the core's at the pin: `core.yml` (new), `copies.yml`, `licences.yml`,
   `codeql.yml`, `delete-merged-branches.yml` and `personal-terms.yml`. `.github/dependabot.yml` aims at `main` and
   ignores `HaakTuah/agent-core*`.

## Checked

- `scripts/test.sh`: type-check, lint, the copies check and Vitest (result in the PR).
- The copies check with the core's prose: no new copy (its 3 old ones).
- The licence check: 262 packages, 11 shipped or may be, none off its list, as before.
- `core.yml` run locally: `core/` matches the core at the pin, and every call is pinned to it.
- Every backticked path in the changed rule files resolves (a script over each file).

## Rule lines this game keeps, and why the core does not hold them

| File | Kept | Why it is the game's own |
| --- | --- | --- |
| `AGENTS.md` | what the game is; the pillars read once per session | the game itself |
| `AGENTS.md` | "The core" section | README point 3: each `AGENTS.md` names the start files as plain lines, for Codex |
| `AGENTS.md` | the one safety rule (no model games until the build order is done) | `how-to-work.md`'s "Principles over rules" leaves the project to mark its own |
| `AGENTS.md` | "Where things are" | the game's files |
| `AGENTS.md` | "Starting a task": the item's brief, the check for changes, "The game in one page" | the game's queue and spec; `work-flow.md`, point 1, leaves what is re-read to the project |
| `AGENTS.md` | the old round reports and the spec among them | the game's archive |
| `AGENTS.md` | tests and script games by the game's scripts; the model-game simulations' own process | the game's commands; `claude.md` names no process of a project's |
| `AGENTS.md` | never edit the design copy or the builder rules; a design decision to the design session | the game's generated copy (the done table, rows 21 and 39) |
| `AGENTS.md` | the smallest game that tests the rule: powers, map, seasons, characters; the ~10-minute mark | `how-to-work.md` keeps the rule; these are the game's specifics (row 28, 29) |
| `AGENTS.md` | a standing rule moves into the builder rules at the next refresh | the game's generated builder rules (row 31) |
| `AGENTS.md` | a long item may end a session at a passed gate | row 33: A's extra |
| `AGENTS.md` | the next item on top, from the PR branch in review | `work-flow.md`, point 2, leaves the branching to the project (row 45) |
| `AGENTS.md` | the list of side lanes, a lane's title naming its entry | row 47 |
| `AGENTS.md` | the Node cue | `updates.md` asks the project to name it |
| `AGENTS.md` | commands; the "Review guidelines" sentence | README point 3 |
| `SECURITY.md` | the frame; rules 3, 5, 6, 7, 10, 15, 17 as the floor leaves them to the project | README point 4 |
| `docs/threat-model.md` | the players, saves, links and models; the bridge; deceit as play | the floor's model asks the project for its users, ways in and stakes |
| `docs/review-guidelines.md` | the design checker's dossier brief; "History holds"; "Hidden information"; "Text a player reads" | `reviews.md`, point 7, and `review-guidelines.md` leave these to the project's guidelines |
| `docs/codex-building.md` | the table of what goes to whom; the engine's determinism; the trials | `codex-building.md`: "The project's own table … and its trials, are its own" |
| `docs/calibration.md` | the monthly history spot-check | a check only a game built on sources has |

A fresh reviewer was asked whether any kept line says what a core rule already says (below).

## Readings taken

- **The next item branches from `main`,** not `develop`, though the builder rules' "Branches" still names `develop`
  until the design session's refresh: the branch no longer exists, so the letter would defeat the rule ("Principles
  over rules"); flagged for the refresh (step 9 of the report).
- **`SECURITY.md`'s rule-file list leaves out `core/` and the manifest:** floor rule 3 names both, and listing `core/`
  would put the core's archive and reports into the copies check's prose.
- **The history dossiers' review exemption is cut:** `reviews.md` gives docs-only PRs no review and counts a change to
  the project's data as code, which is what the line said.
- **"Settled questions are readings" is cut:** the stand-in (`core/modules/inbox.md`) now settles a question against
  the *settling references* before it goes to the owner.
- **The cloud setup hook reads `main` too,** as floor rule 3 says of everything `.claude/settings.json` starts.

The stand-in's answers on these: in the PR.

## Helpers

In the PR, with what each gave.

## Questions for the owner

His yes in the PR, for `.github/` and the cloud setup hook (floor rule 3). No issue opened.
