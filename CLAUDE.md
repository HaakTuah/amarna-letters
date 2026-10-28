# Amarna Letters

A Late Bronze Age grand strategy game: seven Great Kings, played by humans, script bots or language models, negotiate
through envoys and sealed tablets on a deterministic engine. Haakon (the owner) designs it with Claude in a design
document; builders like you build it item by item. Built in TypeScript (Vite and React, the engine in a Web Worker)
since build order item 5+; the old C# build was removed after the fix pass and is kept on the branch `archive/csharp-final` (commit `5b4caa2`). Every feature
answers to the design pillars and tenets in `docs/intent/overview/design-pillars.md`: read them once per session.

## Where things are

| What | Where | Notes |
| --- | --- | --- |
| Builder rules | `.claude/rules/builder-rules.md` | From the design document. Loaded in every session. |
| Intent: the design document, by tab and section | `docs/intent/` (start at `INDEX.md`) | One folder per tab. Generated copy. Never edit it. |
| As built: the design notes, by topic | `docs/design/` (index: `docs/DESIGN-NOTES.md`) | Source of truth for formulas, rules, numbers. |
| What is done and next | `docs/BUILD-PROGRESS.md` | One line per item, review questions, "Found during the port". |
| Briefs for the steps of item 5+ | `docs/items/` | Docs and preview pass, conversion, fix pass. |
| Specs Haakon wrote for item 5+ | `docs/prompts/DOCS-AND-PREVIEW.md`, `docs/CONVERSION-PLAN.md` | His words, quoted. |
| The historical sources | `docs/history/` (start at `README.md`) | Dossiers on 1346 BCE from item 6+; cite them when an item builds from them. |
| Item reports | `docs/rounds/<date>-<item>.md` | Write yours there. |
| History | `docs/archive/` (build log; Haakon's instructions word for word; the design document's history) | Read only when a task points there. |

## Starting a task

1. Work from `develop`: if you are on `main`, check out `develop` first (this file and the docs it names live there
   until the next milestone PR merges `develop` into `main`).
2. Find the next item in `docs/BUILD-PROGRESS.md`. For the steps of item 5+, read its brief in `docs/items/`. For
   item 6 onward, the item's own text is its brief: `docs/intent/build-order/item-<n>.md` (`item-6.md`,
   `item-9plus.md`, ...).
3. Do the check for changes that `docs/intent/INDEX.md` describes ("The specification" in the builder rules), and do it
   again before opening the item's pull request.
4. Read the sections the item names, and only those. Find them with `grep -rn "Title words" docs/intent docs/design`.
5. Check weekly usage with `scripts/usage.sh`, and again after every commit ("Usage" in the builder rules). If it
   says "unknown", this session cannot see usage: say so in the first line of each PR you open, and carry on; Haakon
   then watches usage himself and pauses the work at about 90%.
6. Read "Standing instructions" at the end of this file.

## How to work

Haakon's rules, word for word (21 October 2026):

- A question is a question. Answer it; don't act on it unless I say so.
- Match effort to the task. Docs, READMEs, small fixes and config: one pass, no subagents.
- Don't use more than 2 agents unless the build order's documented process calls for it.
  Simulation runs and the build order's review steps may use as many agents as their
  process calls for. Never stop to ask about this: pick the cheaper way, and say in
  the PR what you chose.
- Usage is limited. Prefer the cheapest approach that does the job well.
- Read only the parts of large files the task needs. Round reports in docs/archive/
  are history: read them only when I ask.
- Long simulations: run them in the background and wait for the completion notice.
  Don't poll, and don't keep agents alive just to wait for a run.
- At each milestone, open a PR I can play, say in it what to try, and carry on with
  the next item without waiting for me to review or merge.

How to keep to them:

- **Read little.** Never read a file over 50 KB whole: grep for what you need, then read that line range. Don't
  re-read a file you just edited. The old round reports are in `docs/archive/rounds/`, except
  `docs/rounds/2026-10-18-sleep-and-simulation.md`, a specification (its "question N" plans): read it by the question
  you need.
- **Print little.** Run tests with `scripts/test.sh` and script games with `scripts/sim.sh`: both print a summary and
  the failures, and keep the full log in a file. Run long ones in the background (the Bash tool's background mode) and
  wait for the completion notice. Never paste a full log into the conversation.
- **Helpers, effort and escalation:** see "Models, effort and helpers" below.
- **Edit in place.** Change the lines that need changing; never rewrite a large file to change part of it.
- **Don't loop.** If the same approach fails twice, stop, write down what you tried, and take another approach, hand it to
  the escalation helper, or mark the step blocked and go on, as the builder rules say.
- **One fact, one place.** Link to where a fact lives instead of copying it. Never edit `docs/intent/` or
  `.claude/rules/builder-rules.md`: if the design document seems wrong or unclear, take the most reasonable reading and
  list it under "Design questions" in the PR and in the item's report.
- **Haakon's words are kept.** When Haakon gives an instruction in a session, quote it word for word in the item's
  report. If it is a standing rule, also add it, dated, to "Standing instructions" below, with the quote in
  `docs/archive/instructions.md`; it moves into the design document's builder rules when the copy is next refreshed.
- **Each game's files stay in its own repository.** Never write this project's notes, logs or files into another
  project's repository or folders, above all Barkstreet Snakes' (Haakon: strictly forbidden).
- **Sessions.** When sessions are started for you item by item (a Claude Code Project does this), stop when your item
  is merged and say what is next; otherwise carry on with the next item in the same session. A long item may end a
  session at a passed gate, with a commit and a note in `docs/BUILD-PROGRESS.md` saying where to pick up.

## Models, effort and helpers

The same in both of Haakon's games; only the list of hard work differs.

| Who | Model | Effort | For |
| --- | --- | --- | --- |
| You, the builder | Opus | medium; high for the TypeScript conversion and the fix pass after it | the item itself |
| Search helper | Haiku (`model: "haiku"`) | as it comes | finding where things are across many files; it returns file:line and one-line conclusions |
| Reviewer | Opus (`model: "opus"`, `effort: "high"`) | high | every item, once, before it is merged (the builder rules): give it the diff and the item's text, nothing else |
| Escalation | Opus (`model: "opus"`, `effort: "high"`, or `"xhigh"` if you already run at high) | high or extra high | one problem that has defeated you twice: give it a self-contained brief (the problem, what you tried, the files and lines), then apply and check its answer yourself |

- **Never more than two helpers at a time,** and only these four uses. No workflows and no ultracode. No agent kept
  alive to wait for a run: long runs go in the background (the Bash tool's background mode).
- **Effort is set when the session starts** and you can't raise your own. If the escalation helper fails too, write the
  problem up in the PR and `docs/BUILD-PROGRESS.md` as blocked, go on with the next item, and say in your update that it needs a
  session at higher effort.
- Sessions started from a Claude Code Project don't load `.claude/agents/`, so always pass `model` (and `effort`) in
  the call. Never max effort: it costs the most and tends to overthink.
- **Keep files small and organised:** split code where it naturally belongs, by responsibility, and keep each file under
  about 50 KB. Split a file that grows past that in its own PR, with behaviour proven unchanged.

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
included, once CI is green, and never pushes to `main` directly. Cloud sessions can't use GitHub's GraphQL API, so `gh pr create`, `gh pr list` and `gh pr view` fail.
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

## Standing instructions

Haakon's standing instructions given since the design document's copy was last refreshed, dated, newest last. (The
refresh of 27 October 2026 moved that day's first two into the builder rules: "You merge, always" under "Branches" and
"A pull request at every milestone", and "the build order is simply to guideline claude code" under "No stopgaps".
Their words are in `docs/archive/instructions.md`, items 13 and 14.)

- **27 October 2026: push as you go** (`docs/archive/instructions.md`, item 15). Push the item's branch at every passed
  gate, and at least once an hour while work is under way, even before its pull request opens, so nothing is lost if a
  session dies or its machine is reclaimed. A branch that is not ready yet is still pushed; mark its PR as a draft.
- **27 October 2026: questions come back to Haakon directly** (`docs/archive/instructions.md`, item 16). He should
  never have to hunt for a question. Every question, design question or reading he should answer, of an item or of
  anything else, reaches him three ways:
  1. **The session's last message,** which the session that started it reads and relays, opens with "Questions for
     Haakon". It lists each one, numbered, as a question he can answer from his phone, with the reading taken and its
     alternative. If there are none, it says "Questions for Haakon: none".
  2. **The milestone PR's description** opens with the same list.
  3. **The list stays in the "For Haakon" table** of `docs/BUILD-PROGRESS.md` until he answers it.

  A session that starts builder sessions passes each list on to Haakon word for word in its next update. It never sums
  the list up as "readings in the report".
- **28 October 2026: pipeline, don't wait.** "Yes, please, organize it expertly so we maximize token caching, time spent, and all other concerns." (to Claude's proposal; the words are in
  `docs/archive/instructions.md`). Waiting is lost time and, past an hour, a lost cache, so:
  1. **Review in the background.** Open the PR, start its reviewer as a background agent (or `@codex review`, once Codex
     is connected), and go on meanwhile with what comes next: the next item's text, its sections, the check for
     changes. Fix what the review finds when it returns, then merge.
  2. **The next item on top.** The next item depends on this one, so branch it from this item's PR branch, not
     from `develop`, and merge this branch (or `develop`, once it is merged) into it before its own PR.
  3. **Bigger review fixes in a session of their own.** If a review asks for more than about an hour's work, the
     orchestrator starts a fresh session for it with the PR, the review and nothing else, at the item's effort; the
     builder goes on.
  4. **Keep the cache warm.** One session per item, continued for its review fixes and its milestone while its context
     is under an hour old, rather than a fresh session reading everything again; a fresh session for a new item, or when a
     session's context has grown large. Long runs and checks go in the background; no turn sits idle waiting. Files every
     session reads stay small (the workshop check), since they are the start of every call.
  5. **Hand over at once.** The last message says what merged and what is next. The orchestrator starts the next session
     as soon as a item merges, woken by the PR's merge rather than a clock, with an hourly check as the fallback.
  6. **The same helpers, used better.** Pipelining spends the same tokens sooner and adds no agents beyond "Models,
     effort and helpers": a reviewer or search helper may run in the background while the builder works, and the Haiku
     search helper, not the builder reading large files itself, is the cheap way to look across many files.
- **28 October 2026: as many lanes as can run in parallel.** "Yes, allow for as many lanes as can be parallelized, expert." (the words are in `docs/archive/instructions.md`).
  This replaces the limit of two agents in "How to work" for builders; each builder keeps its own limit of helpers.
  1. **A lane is independent work:** it touches different files from every other open lane (or parts of one file
     nobody else touches), shares no measurement with another, and does not wait on another's result. Here, the build order's numbered items stay one lane, one item at a time, since each builds on the last; beside it run independent work: file splits from the workshop check, history dossiers, script kings' play improved outside the current item's code, tests, and interface polish on screens the current item does not touch.
  2. **Claim it on GitHub first.** Before starting, open a draft PR from a fresh branch off `develop`, its title naming
     the entry, and push; that PR is the claim. Look at the open PRs before choosing, and take only what nobody has
     claimed. The progress file is changed only when the work merges, so lanes never fight over it.
  3. **Each lane on its own.** It merges `develop` into its branch before asking for review, is reviewed and merged by
     the usual rules, and is not stacked on another lane's branch. A lane that finds it needs another's work waits,
     says so in its PR, or folds into that lane.
  4. **The orchestrator opens a lane for every independent entry it can see,** each a builder session with its own
     brief and check-in, and passes on every lane's "Questions for Haakon" word for word.
  5. **The brake closes lanes first.** From about 85% of the weekly usage, no new side lane opens and open ones finish;
     from about 90%, as "Usage" says, only small things in the main lane.
