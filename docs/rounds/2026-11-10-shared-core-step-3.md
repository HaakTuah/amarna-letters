# The shared core, step 3: this game takes the core (10 November 2026)

Step 3 of "The shared core" (`docs/BUILD-PROGRESS.md`), done in the order the core's
`reports/2026-11-10-step-3-now.md` lists, against the core's `main` at `2d13e39`, then synced to
`cecbe3b035047f23ae8525b83ed4398dff504f91` (the core's fix for the security finding on `setup/server.md`,
agent-core #54, which the owner chose, with #55 after it; the workflow calls stay pinned at `2d13e39`, whose workflows
are the same).

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
5. **Rule-file lines the core now holds, cut:** `AGENTS.md` (19.4 KB → 6.5 KB), `CLAUDE.md` (6.4 → 0.3),
   `SECURITY.md` (12.4 → 2.7), `docs/threat-model.md` (2.2 → 0.7), `docs/review-guidelines.md` (5.2 → 2.2) and
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
   `scripts/copies.json` (its prose: `AGENTS.md`, `CLAUDE.md`, the rule files `SECURITY.md` lists but the builder rules (below), the manifest, the calibration log and the
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

The stand-in (Opus, high) answered each; "highly" or "fairly" is how sure it was.

- **The next item branches from `main`** (highly sure), though the builder rules' "Branches" still names `develop`
  until the design session's refresh: the branch no longer exists, so the letter would defeat the rule ("Principles
  over rules"). `AGENTS.md` says to read `main` wherever the builder rules name `develop` or milestones, as the
  stand-in suggested; flagged for the refresh.
- **`SECURITY.md`'s rule-file list leaves out `core/` and the manifest** (highly sure): floor rule 3 names both, and
  listing `core/` would put the core's archive and reports into the copies check's prose.
- **The history dossiers stay docs** (the stand-in corrected the reading taken, fairly sure): `AGENTS.md` keeps "the
  history dossiers count as docs; the game's data is code" (archive item 175), since the core knows no dossiers and
  its "its data" could be read the other way.
- **"Settled questions are readings" is cut** (highly sure): the stand-in now settles a question against the *settling
  references* before it goes to the owner.
- **The cloud setup hook reads `main` too** (highly sure), as floor rule 3 says of everything `.claude/settings.json`
  starts.
- **The three docs removed whole, their own lines moved** (fairly sure): where the core leaves each to the project.
- **#721's conflict is left to its lane** (fairly sure): bringing a lane up to date is the lane's (`work-flow.md`,
  point 3), and a conflict it resolves needs a fresh review (floor rule 8).
- **`docs/builder-rules.md` is out of the copies check's prose until the design session's refresh** (not put to the
  stand-in; taken here): the generated file holds two passages the core's workshop check now holds and one it says
  twice; it is never edited here, and a baseline entry is never added, so the only way to green is to leave it out
  until its cut at the source, when it goes back in (the progress file says so). The baseline lost its one entry for
  that file.
- **The "always" group of use against ignore is queued,** not played in this step (the step-3 report: "A group a game
  does not play yet is new work"); the manifest's slot says so, and "Follow-ups" holds it.

## Helpers

- A fresh reviewer (Opus, high), once, given the kept rule files and the core: eleven kept lines restated a core rule
  in other words (all cut or made pointers: `AGENTS.md` three, `SECURITY.md` three, the threat model, the review
  guidelines two, `docs/codex-building.md`, the manifest) and one contradicted it (the "always" group, now queued).
- The stand-in (Opus, high), once, on seven readings: six as taken, one corrected (the dossiers).

## Reviews

Codex's code review: one P1 (`AGENTS.md` and `CLAUDE.md` had left the copies check), fixed; then clean. Its security
review: one Medium finding on the core's `core/setup/server.md`, which no copy may change; the owner chose to fix it in
the core first, and this PR took the core at that fix (`cecbe3b`).

## Questions for the owner

His yes in the PR, for `.github/` and the cloud setup hook (floor rule 3); the readings the stand-in was only fairly
sure of, and the copies check's exclusion: [#873](https://github.com/HaakTuah/amarna-letters/issues/873).
