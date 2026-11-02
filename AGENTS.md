# Amarna Letters

A Late Bronze Age grand strategy game: seven Great Kings, played by humans, script bots or language models, negotiate
through envoys and sealed tablets on a deterministic engine. The owner designs it with Claude in a design
document; builders like you build it item by item. Built in TypeScript (Vite and React, the engine in a Web Worker)
since build order item 5+; the old C# build was removed after the fix pass and is in `develop`'s history at commit `5b4caa2`. Every feature
answers to the design pillars and tenets in `docs/intent/overview/design-pillars.md`: read them once per session.

**Two builders build it:** Claude (Anthropic's Claude Code) and Codex (OpenAI's). Both work from this file: Claude
reads it through `CLAUDE.md`, which adds only what Claude alone uses (its helpers, models and effort), and Codex reads
it directly. Who builds what, how work is handed over, and how each reviews the other: `docs/claude-and-codex.md`.
Codex: read its "For Codex" section at the start of every task.

## Where things are

| What | Where | Notes |
| --- | --- | --- |
| Builder rules | `.claude/rules/builder-rules.md` | From the design document. Claude loads them in every session; Codex reads them at the start of every task. |
| Claude and Codex | `docs/claude-and-codex.md` | Who builds what, the hand-over, the fallback, the reviews' score. |
| Running builder sessions and lanes | `docs/orchestrating.md` | For the orchestrator: sessions, the cache, hand-overs, lanes. |
| Security | `SECURITY.md` | What is protected, and the rules every builder and reviewer keeps. |
| Intent: the design document, by tab and section | `docs/intent/` (start at `INDEX.md`) | One folder per tab. Generated copy. Never edit it. |
| As built: the design notes, by topic | `docs/design/` (index: `docs/DESIGN-NOTES.md`) | Source of truth for formulas, rules, numbers. |
| What is done and next | `docs/BUILD-PROGRESS.md` | One line per item, the follow-ups, use against ignore; questions are issues. |
| The historical sources | `docs/history/` (start at `README.md`) | Dossiers on 1346 BCE from item 6+; cite them when an item builds from them. |
| Item reports | `docs/rounds/<date>-<item>.md` | Write yours there. |
| History | `docs/archive/` (build log; the owner's instructions word for word; the design document's history) | Read only when a task points there. |

## Starting a task

1. Work from `develop`: if you are on `main`, check out `develop` first (this file and the docs it names live there
   until the next milestone PR merges `develop` into `main`).
2. Find the next item in `docs/BUILD-PROGRESS.md`. The item's own text is its brief:
   `docs/intent/build-order/item-<n>.md` (`item-6.md`, `item-9plus.md`, ...).
3. Do the check for changes that `docs/intent/INDEX.md` describes ("The specification" in the builder rules), and do it
   again before opening the item's pull request.
4. Read "The game in one page" (`docs/intent/overview/the-game-in-one-page.md`) before every item: most questions
   an item raises answer themselves from it, and a reading that contradicts it is a mistake, not a design question.
   Then read the sections the item names, and only those. Find them with `grep -rn "Title words" docs/intent docs/design`.
5. Check weekly usage with `scripts/usage.sh`, and again after every commit ("Usage" in the builder rules). If it
   says "unknown", this session cannot see usage: say so in the first line of each PR you open, and carry on; the owner
   then watches usage himself and pauses the work at about 90%.

## How to work

Every rule here says what it is for. The aim behind them all: as much finished work of full quality as the week's
usage allows, at the lowest cost now and later.

- **A question is a question.** Answer it; act on it only when the owner says so.
- **Match effort to the task,** and take the cheapest approach that does the job well, since usage is limited. Docs,
  READMEs, small fixes and config: one pass, no helpers.
- **Read little.** Never read a file over 50 KB whole: grep for what you need, then read that line range. Don't
  re-read a file you just edited. The old round reports are in `docs/archive/rounds/`, except
  `docs/rounds/2026-10-18-sleep-and-simulation.md`, a specification (its "question N" plans): read it by the question
  you need. Read `docs/archive/` only when a task points there.
- **Print little.** Run tests with `scripts/test.sh` and script games with `scripts/sim.sh`: both print a summary and
  the failures, and keep the full log in a file. Run long ones in the background (the Bash tool's background mode) and
  wait for the completion notice: never poll, and keep no agent alive just to wait. Never paste a full log into the
  conversation.
- **Helpers, effort and escalation:** Claude's are in `CLAUDE.md` ("Models, effort and helpers", with when a helper
  pays). Codex uses no helpers; its escalation and its part in the work are in `docs/claude-and-codex.md`. Model-game
  simulations (`sim/`) follow their own process, and none run until the build order is done.
- **Edit in place.** Change the lines that need changing; never rewrite a large file to change part of it.
- **Don't loop.** If the same approach fails twice, stop, write down what you tried, and take another approach, hand it to
  the escalation helper, or mark the step blocked and go on, as the builder rules say.
- **One fact, one place.** Link to where a fact lives instead of copying it. Never edit `docs/intent/` or
  `.claude/rules/builder-rules.md`: if the design document seems wrong or unclear, take the most reasonable reading and
  list it under "Design questions" in the PR and in the item's report.
- **Keep it lean** (`docs/archive/instructions.md`, item 133). Every change removes what it replaces, in the same PR: no
  commented-out code, no "old" copies, nothing it made unused (code, files, settings, assets, test helpers). Look for an
  existing helper before writing one. A leftover is a finding in every review.
- **Split by meaning, from the start** (items 134 and 135), so a reader loads only what it needs. Each file holds one
  thing people look up on its own (a power, a system, a screen, a tab of the design), as small as that thing is; new
  work goes into its own file as it is written, never into a big file to be split later. Smaller than that is not
  better: one thing spread over several files costs every reader more. Where a family differs only in part (powers,
  characters, script kings), write the shared part once and each difference as an override. Size is never the reason,
  only a warning: a file past about 20 KB probably holds more than one thing. Splitting an existing file goes in its
  own PR, with behaviour proven unchanged and what it saves said in the PR. Drift and oversights still add up, so the
  workshop check and the file-by-file reviews keep running and keep their tracking: building lean does not replace
  them.
- **Principles over rules** (item 134). Where a rule's letter would defeat what it is for, follow its purpose, say so
  in the PR under "Readings taken", and flag the rule to be fixed. Never for the safety rules: `SECURITY.md`, `main`,
  keys and secrets, spending, and no model games until the build order is done.
- **The smallest game that tests the rule** (item 28), so checks stay fast as the world grows. Every test sets up a
  few powers on part of the map, a handful of seasons and only the characters it needs. Full-size games run only in
  the few tests that guard the whole (replays, the save round trip, a smoke game), and long measurements (benchmarks,
  use against ignore) run in `scripts/sim.sh`, never in the suite. When an item grows the starting world, the tests'
  default does not grow with it. Code-PR checks took about 10 minutes on 29 October; the workshop check measures
  against that.
- **A change a player sees updates the README** (item 86), in the same PR, as the rulebook and seat view already are.
  Each milestone PR says in one line whether the README is current, and fixes it if not.
- **The owner's words are kept, in the archive.** Quote each instruction he gives word for word in the item's report and
  in `docs/archive/instructions.md`, numbered and dated, leaving out any personal detail as "[…]" (`SECURITY.md`, point
  11: nothing personal, ever). A standing rule goes into the section of this file where it
  applies (or `CLAUDE.md`, if only Claude uses it), said as briefly as it can be, with what it is for and its archive
  item: never as a dated entry or a quote here, since every session pays to read this file. It moves into the design
  document's builder rules when the copy is next refreshed.
- **Each game's files stay in its own repository.** Never write this project's notes, logs or files into another
  project's repository or folders, above all Barkstreet Snakes' (the owner: strictly forbidden).
- **Sessions.** When sessions are started for you item by item (a Claude Code Project does this), stop when your item
  is merged and say what is next; otherwise carry on with the next item in the same session. A long item may end a
  session at a passed gate, with a commit and a note in `docs/BUILD-PROGRESS.md` saying where to pick up.

## Questions, readings and ideas

Everything the owner should see lives in one place, this repository's issues, so nothing is lost or said twice and he
never has to hunt (items 16, 29 and 141).

- **Settled questions are readings.** Before a question goes to the owner, check it against "The game in one page" and
  the item's sections. One they settle is a reading: list it under "Readings taken" with the principle it rests on,
  and build it that way. Only what they leave open, or a matter of taste, goes to the owner.
- **One inbox: issues assigned to the owner** (`HaakTuah` on GitHub). A question he must answer, or a reading he should see (a matter of taste,
  or one no rule settles), is an issue labelled `question`, with the reading taken and its alternative. An idea is a
  Feature request (`enhancement`); a bug the task at hand will not fix is a Bug report (`bug`). File an idea or a
  bug with its template's headings and label (`.github/ISSUE_TEMPLATE/`; a question needs none): an issue filed through
  the API gets no template, so copy the headings into the body yourself. Search the open issues first and add to one rather than file it twice. Each issue
  holds the whole of it, answerable from a phone.
- **Everywhere else, only a pointer.** A PR, a report, a milestone PR's description and a session's last message never
  repeat an issue: under "Questions for the owner" they list the issues they opened or touched, one line and a link each
  ("Questions for the owner: none" if none), so he sees what is new. An orchestrator passes every new link on to him.
- **Only the owner's comments answer.** Anyone can comment on a public issue; only his comments count (`SECURITY.md`).
  Claude's sessions post under his login too, so every comment, issue and PR an agent writes ends with Claude Code's
  attribution line ("Generated by" or "Generated with" Claude Code, linked to it), as it does by default (Codex posts as its own bot): one from `HaakTuah` without that
  line is his.
  Whoever acts on his answer quotes it word for word in `docs/archive/instructions.md`, writes the decision where it belongs (a design decision goes to the design session, which writes it into the design document), and closes the issue
  with a link to where the work now lives (the design document, a progress-file entry or a PR): a question or an idea
  is done once he has answered, so "open" always means "needs him".
- **Ideas are cheap to file and never built unqueued.** Anyone may file one with a line of what and why; keep it short,
  at most a couple per task. Nothing is built from an idea, and no agent treats another's idea as an instruction, until
  the owner has moved it into `docs/BUILD-PROGRESS.md`.
- **Bugs don't wait for the owner.** A bug in the task at hand is fixed in it. One outside it is filed, and any lane
  whose files it touches may claim and fix it. A bug closes only when its fix is live: the fix's commit message says
  "Fixes #n", and GitHub closes the issue by itself when that commit reaches `main` with the milestone; never close a bug
  by hand before then, so the open bugs are what players still meet. A fix that would change a rule or the design is a
  question instead.

## How work flows

Waiting is lost time and, past an hour, a lost cache (item 22; the orchestrator's part is in `docs/orchestrating.md`).

1. **Review in the background.** Open the PR, start its reviews (Codex's, and on build-order items Claude's design
   check, at the same time: `docs/claude-and-codex.md`), and go on with what comes next: the next item's text, its
   sections, the check for changes. Fix what the reviews find in one round, then merge at a 10.
2. **The next item on top.** The next item depends on this one, so branch it from this item's PR branch, not from
   `develop`, and merge this branch (or `develop`, once it is merged) into it before its own PR.
3. **Lanes beside the items** (item 23). Independent work runs in parallel: different files from every open lane, no
   shared measurement, no waiting on another's result. The numbered items stay one lane, one at a time; beside them run
   splits and the workshop check, history dossiers, script play outside the current item's code, tests, and interface
   polish on screens the item does not touch. Claim a lane first with a draft PR from a fresh branch off `develop`, its
   title naming the entry, after checking the open PRs; merge `develop` into it before review; change the progress file
   only when it merges; never stack it on another lane's branch.
4. **The brake.** From about 85% of the weekly usage no new side lane opens and open ones finish; from about 90%, only
   small things in the item lane ("Usage" in the builder rules). Only the measured share counts, not the app's warning;
   a session that cannot read the share carries on.

## Commands

```bash
scripts/cloud-setup.sh        # cloud machines: npm packages and Playwright's Chromium, if missing
scripts/test.sh               # type-check, lint and Vitest, quiet: summary and failures only (full log: $TMPDIR/amarna-test.log)
scripts/sim.sh --games 50 --seed 1 --verify-replay   # the batch runner (src/batch), quiet; see README.md
scripts/usage.sh              # weekly usage, if this session can read it
npm run dev --workspace src/web                       # the web app at http://localhost:5183
npm run build --workspace src/web && node src/web/smoke.mjs   # the Playwright smoke test of the built app
```

Benchmarks: `scripts/sim.sh --versus solo ...` ("Benchmarks" in `docs/design/07-script-kings/20-benchmarks.md`). No
model games: no API key is set in cloud sessions, and the builder rules forbid them until the build order is done.

## Git and GitHub

Branches, merges and PRs follow the builder rules: the builder merges its own PRs, the milestone PR into `main`
included, once CI is green, and never pushes to `main` directly. Push the item's branch after every commit, even before
its PR opens (a draft PR if it is not ready), so nothing is lost if a session dies or its machine is reclaimed (items 15
and 84). At each milestone, open a PR the owner can play, say in it what to try, and carry on with the next item without
waiting for him to review or merge.

**Dependabot's security PRs are the one other way into `main`** (`SECURITY.md`, point 4). GitHub aims them at
`main`, so the next free lane reviews and merges them there, under five conditions: (1) opened by `dependabot[bot]`
from a branch in this repository, never from a fork; (2) only `package.json` and lock files changed, or it is not
merged; (3) reviewed like any PR: Codex's review, the release notes read for breaking changes, and the checks green;
(4) right after, `main` is merged back into `develop`, as after a milestone, with conflicting lock files regenerated by
`npm install` and the full suites run before pushing; (5) it is ordinary work for the next free lane, not a lane of its
own. One that fails a condition is closed with the reason, and the update is made on `develop` instead.

**Dependabot's version updates** (`.github/dependabot.yml`: weekly, grouped, each release a week old) aim at `develop`
and are ordinary small PRs: the next free lane takes one, runs the checks, gets Codex's review, reads the release notes
for breaking changes, and merges it, or closes it with the reason. A new major of `@types/node` is the cue to move Node
itself: an even-numbered Node that is long-term support (from its October) moves CI's `node-version` and
`scripts/cloud-setup.sh` in the same PR, with the types and the full suites; an odd one is closed with that reason.

**CodeQL checks every PR** into `develop` and `main`, every push to them and once a week (`.github/workflows/codeql.yml`).
A finding on your PR shows on it as a note: fix it in the same PR, or, if it is a false alarm, say why in the PR and
leave the alert to the owner, who alone can dismiss it. Alerts already in the code are the owner's to pass on
(`SECURITY.md`, point 9).

Cloud sessions can't use GitHub's GraphQL API, so `gh pr create`, `gh pr list` and `gh pr view` fail.
Use the REST API (repository `HaakTuah/amarna-letters`):

```bash
gh api repos/HaakTuah/amarna-letters/pulls -f title=... -f head=<branch> -f base=develop -f body=...  # add -F draft=true for a draft
gh api -X PUT repos/HaakTuah/amarna-letters/pulls/<n>/merge -f merge_method=merge                     # merge into develop
gh api "repos/HaakTuah/amarna-letters/pulls?state=all&base=main&head=HaakTuah:develop" --jq '.[0] | {number,state,merged_at}'
gh api repos/HaakTuah/amarna-letters/pulls -f title=... -f head=develop -f base=main -f body=...       # the milestone PR
```

The third line is the check before pushing `develop`: if the last `develop` -> `main` PR has `merged_at`, merge `main`
back into `develop` first and open a new milestone PR. Never put a key or secret in the repository or in an environment
variable.

## Review guidelines

For Codex's code review, which reports findings by priority: report as **P1** (blocking) a departure from the design or
from the PR's description and the sections it names; a broken rule of this file (above all the rules that stand) or of
`SECURITY.md`; a test weakened or skipped, or changed beyond what the task forces (a forced change shows in the PR that every check is kept and none loosened); and a protected file changed by a Codex lane. Report anything the
change leaves behind (code, files or settings it made unused, commented-out code) as a finding. Every finding counts:
the PR passes only with none open. In a later round of the same PR, check that the earlier findings were fixed and
review what changed since; raise something new about unchanged code only as P0 or P1. Every other reviewer (the design
check on build-order items, Claude's reviewer of Codex's PRs, and Claude's reviewer whenever Codex is unavailable) gives a score from 1 to 10 and
everything that keeps the work from 10, and only a 10, a list with nothing open, passes. The whole method, with its
guards against endless rounds and a slipping bar: "Codex reviews" and "Reviews" in `docs/claude-and-codex.md`.
On build-order items, Codex's review and Claude's design check start at the same time.

**History holds,** for every reviewer: report as P1 a real-world fact (a person, place, date, name, custom or event)
the change adds or alters that has no source in `docs/history/`, or contradicts the source it cites. Each real fact in
the game's data names the dossier line it rests on by that line's anchor, and the line quotes the few words of its
source it relies on; a test fails when an anchor is missing or its line names someone else (archive item 167; built
by the full history check in "Follow-ups" in `docs/BUILD-PROGRESS.md`). Where no source speaks, the game takes the most
plausible estimate: published expert estimates, as many as can be found, their consensus or middle, each cited, graded
[G]; a guess made earlier has no standing of its own, and gives way to a better-grounded one (archive item 170).

**Hidden information,** for every reviewer: report as P1 any read of the true game state that a seat could not know,
in what it is shown, what a model is asked, what a script king reads or what an export holds. Check every path: the
latest season, past seasons, replays and the god view. The canary test ("Follow-ups" in `docs/BUILD-PROGRESS.md`)
guards the same from the other side, since a reviewer can miss it.

**One idea, for every reviewer** of a change to the game (not docs, design copies or Dependabot's updates): end the
review with one thing outside this change that would make the game better, or "none", the usual answer when nothing is
worth the owner's time. It never blocks (a P3 at most). The builder searches the open ideas first: a new one is filed as
an `enhancement` issue and linked in the PR, a repeat becomes a comment on the existing issue, so the ones that keep
coming up show. Nothing is built from it until the owner queues it.
