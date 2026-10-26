# Amarna Letters

A Late Bronze Age grand strategy game: seven Great Kings, played by humans, script bots or language models, negotiate
through envoys and sealed tablets on a deterministic engine. Haakon (the owner) designs it with Claude in a design
document; builders like you build it item by item. Built in C# on Blazor WebAssembly today, moving to TypeScript in
build order item 5+.

The principles every rule answers to: different data, same rules (no rule checks which power it is); every rule has an
in-world reason; systemic, with no special cases and no stopgaps; historically grounded, style not strategy; built to
outlive its models.

## Where things are

| What | Where | Notes |
| --- | --- | --- |
| Builder rules | `.claude/rules/builder-rules.md` | From the design document. Loaded in every session. |
| Intent: the design document, by section | `docs/intent/` (start at `INDEX.md`) | Generated copy. Never edit it. |
| As built: the design notes, by topic | `docs/design/` (index: `docs/DESIGN-NOTES.md`) | Source of truth for formulas, rules, numbers. |
| What is done and next | `docs/BUILD-PROGRESS.md` | One line per item, review questions, "Found during the port". |
| Briefs for the steps of item 5+ | `docs/items/` | Docs and preview pass, conversion, fix pass. |
| Specs Haakon wrote for item 5+ | `docs/prompts/DOCS-AND-PREVIEW.md`, `docs/CONVERSION-PLAN.md` | His words, quoted. |
| Item reports | `docs/rounds/<date>-<item>.md` | Write yours there. |
| History | `docs/archive/` (build log, Haakon's instructions word for word) | Read only when a task points there. |

## Starting a task

1. Find the next item in `docs/BUILD-PROGRESS.md`. For the steps of item 5+, read its brief in `docs/items/`. For
   item 6 onward, the item's own text is its brief: `docs/intent/main/20-build-order/<nn>-item-<n>.md`.
2. Ask the live design document what changed since the copy was cut (`docs/intent/INDEX.md` says how; one small read
   per tab). Where the copy and the live document differ, the live document wins.
3. Read the sections the item names, and only those. Find them with `grep -rn "Title words" docs/intent docs/design`.
   Read the rest of the design document for intent only when you need it.
4. Check weekly usage (`scripts/usage.sh`), and again after every commit. Stop as "Usage" in the builder rules says.

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
  re-read a file you just edited. Until the docs pass archives them, the old round reports are in `docs/rounds/`; only
  `2026-10-18-sleep-and-simulation.md` is a specification (its "question N" plans), read by the question you need.
- **Print little.** Run tests with `scripts/test.sh` and script games with `scripts/sim.sh`: both print a summary and
  the failures, and keep the full log in a file. Never paste a full log into the conversation.
- **Helpers.** One agent does the item. Spawn a subagent only to search widely (pass `model: "haiku"`; ask for
  file:line and conclusions, not file contents), to run a long test or batch (`model: "haiku"`; summary and failures
  only), or as the one reviewer at the end (the main model; give it the diff and the item's text, nothing else).
  Project threads ignore `.claude/agents/`, so pass the model in the call. No workflows and no ultracode unless an
  item's documented process calls for them. Never message an agent that a workflow started: stop the workflow and
  relaunch from what is committed.
- **Effort.** Medium for most items. High for the TypeScript conversion, the fix pass after it, and the reviewer. If
  high has failed twice on the same problem, try extra high for that problem only. Never max.
- **Edit in place.** Change the lines that need changing; never rewrite a large file to change part of it.
- **Don't loop.** If the same approach fails twice, stop, write down what you tried, and take another approach or mark
  the step blocked and go on, as the builder rules say.
- **One fact, one place.** Link to where a fact lives instead of copying it. When a rule changes, update its topic file
  in `docs/design/` in the same commit. Never edit `docs/intent/` or `.claude/rules/builder-rules.md`: if the design
  document seems wrong or unclear, take the most reasonable reading and list it under "Design questions" in the PR and
  in the item's report.
- **Haakon's words are kept.** When Haakon gives an instruction in a session, quote it word for word in the item's
  report; if it is a standing rule, also add it, dated, to `docs/archive/instructions.md`.
- **One item per session.** When an item is merged, the next item starts in a fresh session. A long item may end a
  session at a passed gate, with a commit and a note in `docs/BUILD-PROGRESS.md` saying where to pick up.

## Commands

```bash
scripts/cloud-setup.sh        # cloud machines: installs the .NET 10 SDK (and tries Playwright's Chromium) if missing
scripts/test.sh               # dotnet test, quiet: summary and failures only (full log: $TMPDIR/amarna-test.log)
scripts/sim.sh --games 50 --seed 1 --verify-replay   # the batch runner (src/Amarna.Batch), quiet; see README.md
scripts/usage.sh              # weekly usage, if this session can read it
dotnet run --project src/Amarna.Web --launch-profile http   # the web app at http://localhost:5183
```

Benchmarks: `scripts/sim.sh --versus solo ...` (see "Benchmarks" in `docs/design/07-script-kings/20-benchmarks.md`).
No model games: the batch runner's model presets cost real money and the builder rules forbid them until the build
order is done.

## Git and GitHub

- Branches, merges and PRs follow the builder rules. `main` is Haakon's; the one exception is the docs and preview PR,
  as its spec says.
- In cloud sessions GitHub's GraphQL API is blocked, so `gh pr create` and `gh pr list` fail. Use the REST API:
  `gh api repos/HaakTuah/amarna-letters/pulls -f title=... -f head=... -f base=develop -f body=...`, and
  `gh api -X PUT repos/HaakTuah/amarna-letters/pulls/<n>/merge -f merge_method=merge` to merge into `develop`.
- Never put a key or secret in the repository or in an environment variable.
