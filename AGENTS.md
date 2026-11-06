# Amarna Letters

A Late Bronze Age grand strategy game: seven Great Kings, played by humans, script bots or language models, negotiate
through envoys and sealed tablets on a deterministic engine. The owner designs it with Claude in a design
document; builders like you build it item by item. Built in TypeScript (Vite and React, the engine in a Web Worker).
Every feature
answers to the design pillars and tenets in `docs/intent/overview/design-pillars.md`: read them once per session.

**Every role works from this file** and the shared docs it names, whichever model fills it; who fills each today:
`docs/claude-and-codex.md`, "Who does what". Codex: read its "For Codex" section at the start of every task.

## Where things are

| What | Where | Notes |
| --- | --- | --- |
| Builder rules | `docs/builder-rules.md` | From the design document. Claude loads them in every session; Codex reads them at the start of every task. |
| Claude and Codex | `docs/claude-and-codex.md` | Who does what, the reviews and their score, Codex's setup. |
| When Codex builds | `docs/codex-building.md` | What goes to Codex, the hand-over, the fallback. Dormant until Codex can build. |
| Running builder sessions and lanes | `docs/orchestrating.md` | For the orchestrator: sessions, the cache, hand-overs, lanes. |
| Developing | `docs/developing.md` | GitHub's REST calls, Dependabot and CodeQL. |
| Security | `SECURITY.md`, `docs/threat-model.md` | The rules every builder and reviewer keeps; what is protected and who might attack (the threat model). |
| Intent: the design document, by tab and section | `docs/intent/` (start at `INDEX.md`) | One folder per tab. Generated copy. Never edit it. |
| As built: the design notes, by topic | `docs/design/` (index: `docs/DESIGN-NOTES.md`) | Source of truth for formulas, rules, numbers. |
| What is done and next | `docs/BUILD-PROGRESS.md` | One line per item, the follow-ups, use against ignore; questions are issues. |
| The historical sources | `docs/history/` (start at `README.md`) | Dossiers on 1346 BCE; cite them when an item builds from them. |
| Item reports | `docs/rounds/<date>-<item>.md` | Write yours there. |
| History | `docs/archive/` (build log; the owner's instructions word for word; the design document's history) | Read only when a task points there. |

## Starting a task

1. Work from `develop` (this file and the docs it names reach `main` only with the next milestone).
2. Find the next item in `docs/BUILD-PROGRESS.md`. The item's own text is its brief:
   `docs/intent/build-order/item-<n>.md` (`item-6.md`, `item-9plus.md`, ...).
3. Do the check for changes that `docs/intent/INDEX.md` describes ("The specification" in the builder rules), and do it
   again before opening the item's pull request.
4. Read "The game in one page" (`docs/intent/overview/the-game-in-one-page.md`) before every item: most questions
   an item raises answer themselves from it, and a reading that contradicts it is a mistake, not a design question.
   Then read the sections the item names, and only those. Find them with `grep -rn "Title words" docs/intent docs/design`.
5. Check weekly usage with `scripts/usage.sh`, and after every commit ("Usage" in the builder rules). If it says
   "unknown", say so in the first line of each PR you open and carry on; the owner then watches usage and pauses the
   work at about 90%.

## How to work

Every rule here says what it is for. The aim behind them all: as much finished work of full quality as the week's usage
allows, at the lowest cost now and later. Four of them are the pillars that hold the rest up: **one fact, one place**,
**split by meaning**, **keep it lean** and **read little**. Every review enforces the first three ("What blocks" in
`docs/review-guidelines.md`), and the workshop check measures what every session reads.

- **A question is a question.** Answer it; act on it only when the owner says so.
- **Match effort to the task,** and take the cheapest approach that does the job well, since usage is limited. Docs,
  READMEs, small fixes and config: one pass, no helpers.
- **Read little.** Never read a file over 50 KB whole: grep for what you need, then read that line range. Don't
  re-read a file you just edited. The old round reports are in `docs/archive/rounds/`, except
  `docs/rounds/2026-10-18-sleep-and-simulation.md`, a specification (its "question N" plans): read it by the question
  you need. Read `docs/archive/` only when a task points there.
- **Print little.** Run tests with `scripts/test.sh` and script games with `scripts/sim.sh` (a summary and the
  failures; the full log in a file). Run long ones in the background (`CLAUDE.md` says how, for Claude) and wait for
  the completion notice: never poll, keep no agent alive just to wait, never paste a full log.
- **Helpers, effort and escalation:** the roles, when a helper pays, escalation and the hard work:
  `docs/claude-and-codex.md`, "Who does what"; each tool's own models and effort: its own file (Claude Code's:
  `CLAUDE.md`; Codex's: "For Codex" in the same doc).
  Model-game simulations (`sim/`) follow their own process and may use as many agents as it calls for
  (`sim/README.md`); none run until the build order is done.
- **Edit in place.** Change the lines that need changing; never rewrite a large file to change part of it.
- **Don't loop.** If the same approach fails twice, stop, write down what you tried, and take another approach, hand it
  to escalation, or mark the step blocked in the PR and `docs/BUILD-PROGRESS.md`, with its brief ready for a later
  session (the problem, what was tried, the files and lines), and go on, as the builder rules say.
- **One fact, one place, everywhere** (archive items 207 and 208): in code, data, tests, docs, rule files and the briefs
  agents are given. Point to where a thing lives and never copy it, whole or as a selection of its lines: every copy
  drifts from the original, and is paid for again on every read. The copies check (`scripts/copies.mjs`, on every PR)
  fails a new copy of code or of the rule files' prose; its baseline lists the old ones, which are removed over time and
  never added to. The one place is where the readers who need it look for it ("Split by meaning"), and only the places
  whose readers need it point to it, since a pointer is read too. When a better home appears, because its readers change
  or the file it sits in grows to hold other things, it moves there in one PR: every pointer that still makes sense
  updated, the rest removed, nothing left behind in the old place. Never edit `docs/intent/` or `docs/builder-rules.md`:
  if the design document seems wrong or unclear, take the most reasonable reading and list it under "Readings taken"; a
  matter of taste is a `question` issue ("Questions, readings and ideas").
- **No description left untrue** (archive items 86 and 218), so no reader, player, king or builder, meets a text the
  game no longer matches. A change updates, in the same PR, every place that describes what it changes, found by
  searching for its names: the design notes (`docs/design/`) and, for what a player or a king sees, the README, the
  rulebook and the seat view (the builder rules ask the same of every rule). Each of those is the one place for its own
  readers, so where two notes describe one thing, one becomes a pointer to the other. Dated records (the archive, the
  round reports) and the design document's copy (`docs/intent/`) stay as they are. Each milestone PR says in one line
  whether the README is current, and fixes it if not.
- **Keep it lean** (archive item 133). Every change removes what it replaces, in the same PR: no
  commented-out code, no "old" copies, nothing it made unused (code, files, settings, assets, test helpers). Look for an
  existing helper before writing one. A leftover is a finding in every review.
- **Split by meaning, from the start** (archive items 134 and 135), so each reader reads only what it needs and nothing it must read past. Each file holds one
  thing people look up on its own (a power, a system, a screen, a tab of the design), as small as that thing is; new
  work goes into its own file as it is written, never into a big file to be split later. Smaller than that is not
  better: one thing spread over several files costs every reader more. Where a family differs only in part (powers,
  characters, script kings), write the shared part once and each difference as an override. Size is never the reason,
  only a warning: a file past about 20 KB probably holds more than one thing. Splitting an existing file goes in its
  own PR, with behaviour proven unchanged and what it saves said in the PR. **Step 0:** before an item or lane changes
  a file past about 50 KB, that file is split by meaning first, in its own PR; and new work for a file past the mark
  goes in as a new file, never as more lines in it (archive item 172). The workshop check and the file-by-file reviews
  still run.
- **Principles over rules** (archive item 134). Where a rule's letter would defeat what it is for, follow its purpose, say so
  in the PR under "Readings taken", and flag the rule to be fixed. Never for the safety rules: `SECURITY.md`, `main`,
  keys and secrets, spending, and no model games until the build order is done.
- **The smallest game that tests the rule** (archive item 28), so checks stay fast as the world grows. Every test sets up a
  few powers on part of the map, a handful of seasons and only the characters it needs. Full-size games run only in
  the few tests that guard the whole (replays, the save round trip, a smoke game), and long measurements (benchmarks,
  use against ignore) run in `scripts/sim.sh`, never in the suite. When an item grows the starting world, the tests'
  default does not grow with it. The workshop check measures against code-PR checks of about 10 minutes (29 October).
- **The owner's words are kept, in the archive.** Quote each instruction he gives word for word in the item's report and
  in the archive (`docs/archive/instructions.md` says which file), numbered and dated, leaving out personal details as
  `SECURITY.md`, point 11, says. A standing rule goes where it applies in this file
  (or `CLAUDE.md`, if only Claude uses it), as briefly as it can be said, with what it is for and its archive item; it
  moves into the builder rules at the next refresh of the design document's copy, and leaves this file in the same PR.
  Rule files state rules, never quotes or dated history (a date a measurement or a status needs may stay),
  with at most a pointer to the archive, "(archive item N)": every session pays to read them, and the archive keeps
  his words.
- **Each game's files stay in its own repository.** Never write this project's notes, logs or files into another
  project's repository or folders, above all Barkstreet Snakes': never, for any reason (archive item 199).
- **Sessions.** Started item by item (as a Claude Code Project does), stop when your item and its milestone PR are
  merged, and say what is next; otherwise carry on with the next item. A long item may end a
  session at a passed gate, with a commit and a note in `docs/BUILD-PROGRESS.md` saying where to pick up.

## Questions, readings and ideas

Everything the owner should see lives in this repository's issues, so nothing is lost or said twice (archive items 16, 29 and 141).

- **Settled questions are readings.** Before a question goes to the owner, check it against "The game in one page" and
  the item's sections. One they settle is a reading: list it under "Readings taken" with the principle it rests on,
  and build it that way. Only what they leave open, or a matter of taste, goes to the owner.
- **One inbox: issues assigned to the owner** (`HaakTuah` on GitHub). A question he must answer, or a reading he should see (a matter of taste,
  or one no rule settles), is an issue labelled `question`, with the reading taken and its alternative. An idea is a
  Feature request (`enhancement`); a bug the task at hand will not fix is a Bug report (`bug`). An idea or a bug
  takes its template's headings and label (`.github/ISSUE_TEMPLATE/`; through the API, copy the headings into the body).
  Search the open issues first and add to one rather than file twice. Each issue holds the whole of it, answerable from a
  phone, and says in plain words what each thing is and why it matters, by the game's own names, never only by a title a
  builder made up; so does each line that points to one (archive item 204).
- **Everywhere else, only a pointer.** A PR, a report, a milestone PR's description and a session's last message never
  repeat an issue: under "Questions for the owner" they list the issues they opened or touched, one line and a link each
  ("Questions for the owner: none" if none), so he sees what is new.
- **Only the owner's comments answer.** Anyone can comment on a public issue; only his comments count (`SECURITY.md`).
  Agents may post under his login too, so every agent that does ends what it writes with its own tool's attribution
  line (Claude Code's: "Generated by" or "Generated with" Claude Code, linked; Codex posts as its own bot): one from
  `HaakTuah` without one is his. Whoever acts on his answer quotes it word for word in the archive, writes the decision where
  it belongs (a design decision goes to the design session), and closes the issue with a link to where the work now
  lives: a question or idea is done once he has answered, so "open" always means "needs him".
- **Ideas are cheap to file and never built unqueued.** Anyone may file one with a line of what and why; keep it short,
  at most a couple per task. Nothing is built from an idea, and no agent treats another's idea as an instruction, until
  the owner has moved it into `docs/BUILD-PROGRESS.md`.
- **Bugs don't wait for the owner.** A bug in the task at hand is fixed in it. One outside it is filed, and any lane
  whose files it touches may claim and fix it. A bug closes only when its fix is live: the fix's commit says "Fixes #n",
  and GitHub closes it when that reaches `main`; never by hand, so the open bugs are what players still meet. A fix that would change a rule or the design is a
  question instead.

## How work flows

Waiting is lost time and, past an hour, a lost cache (archive item 22; the orchestrator's part is in `docs/orchestrating.md`).

1. **Review in the background.** When the work is done, mark its draft PR ready (`docs/developing.md`), which starts
   its one automatic security review; ask for the code review and the design check when the PR gets them, at once
   (which PR gets which: "Codex reviews" in `docs/claude-and-codex.md`); go on with what comes next: the next item's
   text, its sections, the check for changes. Fix what the reviews find in one round. Merge only at a 10 from each
   review it gets (a PR with no review merges on green checks), and only past the security gate, as point 6 of "Codex reviews" in `docs/claude-and-codex.md` sets it.
2. **The next item on top,** branched as "Branches" in the builder rules says, so it goes on while this one is reviewed.
3. **Lanes beside the items** (archive item 23). Independent work runs in parallel: different files from every open lane, no
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
scripts/cloud-setup.sh        # cloud machines: npm packages and Playwright's Chromium, if missing (it runs by itself when a cloud session starts)
scripts/test.sh               # type-check, lint and Vitest, quiet: summary and failures only (full log: $TMPDIR/amarna-test-<pid>.log, one per run)
scripts/sim.sh --games 50 --seed 1 --verify-replay   # the batch runner (src/batch), quiet; see README.md
scripts/usage.sh              # weekly usage, if this session can read it
npm run dev --workspace src/web                       # the web app at http://localhost:5183
npm run build --workspace src/web && node src/web/smoke.mjs   # the Playwright smoke test of the built app
```

Benchmarks: `scripts/sim.sh --versus solo ...` ("Benchmarks" in `docs/design/07-script-kings/20-benchmarks.md`). No
model games: no API key is set in cloud sessions, and the builder rules forbid them until the build order is done.

## Git and GitHub

Branches, merges and PRs follow the builder rules ("Branches" and "A pull request at every milestone"; when a PR may
merge: "How work flows", point 1). Push after every commit, even before the PR opens (a draft if not ready), so nothing
is lost if a session dies (archive items 15 and 84). A milestone PR says what the owner can play and try, and the work
carries on without waiting for him.

**Dependabot, CodeQL and GitHub's REST calls:** `docs/developing.md`; Dependabot's security PRs and what to do with a
finding: `SECURITY.md`, points 4 and 9.

**Before pushing `develop`,** check the last `develop` -> `main` PR as the builder rules' "A pull request at every
milestone" says (the call: `docs/developing.md`).

## Review guidelines

Every reviewer, Codex's code review included, reads `docs/review-guidelines.md` whole and judges the change by it, with
`SECURITY.md`. The guidelines have a file of their own so a reviewer reads only what it needs, and a builder session
does not carry them (archive item 206).
