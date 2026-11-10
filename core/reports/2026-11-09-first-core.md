# The first core (9 November 2026)

Step (2) of "The shared core": the core written from both games' rule files, read on `main` (Amarna Letters at
`0ab0f9a3`, Barkstreet Snakes at `3383ad41`; the two-layer brief and archive item 240 from both games' `develop`). Both
games were read only; nothing was written to either. Weekly usage read "unknown" at the start and after every commit
(no status-line readout in this session).

## What the core is now

- **The floor** (`floor/`): `security.md`, both games' `SECURITY.md` with each game's own parts left as "the project
  names", under the same rule numbers 1 to 11, plus three floor rules that lived elsewhere: only the owner's unsigned
  comments answer, agents sign (into rule 4, from both `AGENTS.md`); `main` is never pushed to (rule 12, from both); one
  project never writes into another's repository (rule 13, from both). The source check of what ships and the exact
  pins with the week's wait came from both `docs/developing.md` into rule 7, since rule 4's Dependabot conditions rest
  on them and the floor may point to no module. Rule 8 also says, as both games' review rules do, that no PR merges
  before its security review has run (the fresh reviewer's finding: without it a project taking only the floor could
  merge unreviewed changes). Where a project fills in nothing, the floor's defaults are the safe
  ones (everything protected; no Dependabot exception). `threat-model.md`: both threat models' shared part.
- **Sixteen practice modules** (`modules/`), each saying at its top what it is for, when it is read and what it leans
  on; six are read at the start of every task (with `claude.md` for Claude).
- **The core's own files:** `README.md` (the two layers, how a project takes the core, the slots, the manifest's
  format), `AGENTS.md`, `CLAUDE.md`, `SECURITY.md`, `archive/instructions.md` (75 items, every quote checked by script
  against the games' archives) and `.github/workflows/personal-terms.yml`, as in both games but for one fix: Codex's code review found that it
  checked only the newest commit's message when a PR has several (a record split left later hashes empty), so it now
  checks each new commit in turn, its message folded onto one line, skipping only commits older than the rule without
  stopping at them, and failing if the commits cannot be listed. Both games carry the same flaw; their next change to the check is theirs to make.

## Measurements

Rule files are those the brief names: `AGENTS.md`, `CLAUDE.md`, `SECURITY.md`, `docs/threat-model.md`,
`docs/claude-and-codex.md`, `docs/codex-building.md`, `docs/orchestrating.md`, `docs/review-guidelines.md`,
`docs/developing.md` and Amarna's `docs/builder-rules.md`. "After" is the core's floor and modules
(64,836 bytes), plus what stays in the game (by the maps below; a line the core replaces in part counts with only the
clause that stays), plus what adoption adds (the manifest, the "The core" section of `AGENTS.md`, and about 600 bytes
of headings in the game's `SECURITY.md`, threat model and review guidelines). The core's `README.md`, `AGENTS.md`,
`CLAUDE.md`, `SECURITY.md`, archive and this report are not rule files a game's sessions read, and are not counted.

| | Amarna Letters | Barkstreet Snakes |
| --- | --- | --- |
| Rule files today | 94,474 | 111,708 |
| What stays in the game | 25,742 | 42,393 |
| What adoption adds | 3,079 | 3,148 |
| **Rule files after (core + stays + adds)** | **93,657** | **110,377** |
| Read at the start of a session today, Claude Code (`CLAUDE.md` and what it imports) | 37,816 | 26,531 |
| Read at the start after, Claude Code | 49,759 | 41,413 |
| Read at the start today, Codex (`AGENTS.md`, Amarna's builder rules, "For Codex") | 33,141 | 21,867 |
| Read at the start after, Codex | 45,547 | 37,201 |

The start reading grows because the floor (13,337 bytes) is read at the start, where `SECURITY.md` was not; without
it the start reading stays near today's. That choice is the owner's: [#8](https://github.com/HaakTuah/agent-rules/issues/8).
Amarna's builder rules are counted as they stand, less the lines the core replaces, which the design session cuts at
the source.

## Readings taken

- **The floor is read at the start of every task** (each game's `AGENTS.md` names it first): three of its rules came
  from the always-read files, and every session posts on GitHub. Put to the owner: #8.
- **Rules only one game has stay in it, even where the floor test says floor:** the change would be a new rule for the
  other game. Put to the owner: #6.
- **Rule numbers 1 to 11 kept,** so every "rule N" pointer in both games still means the same rule; the floor's own
  additions are 12 and 13.
- **No pointer from the floor to a module:** rule 4's Dependabot conditions named "The newest version, unless there is a
  reason" in `docs/developing.md`; the floor now holds the safety part of it itself (rule 7) and the module the upkeep.
- **"The orchestrator" in rule 4** is defined where it stands ("the session that starts builder sessions") rather than
  pointing to `modules/roles.md`.
- **Slots are written in italics** and listed once, in `README.md`; the manifest fills them. Paths both games share
  (`develop`, `main`, `scripts/usage.sh`, `docs/calibration.md`, ...) are written out, not slotted.
- **`AGENTS.md` names the start files itself, one hop,** with `@` lines Claude Code imports and Codex reads as paths;
  the manifest holds the pin, the modules, the names and the slots (the planning helper's advice: Codex stops at a
  second hop).
- **A standing rule that holds for every project goes to the core, by a PR there** (`modules/inbox.md`): the
  consequence of the core, stated once.
- **Wording condensed, never meaning:** to bring each game under its size today, the core says each rule once and
  shorter; reasons and archive pointers are kept, examples that only one game's names gave are dropped. Every drop
  and every difference is in the done table.
- **The workshop check takes Barkstreet's newer wording** (weekly, fix what passes its mark, the audit also cuts),
  which the owner approved for both (archive items 222 and 239); Amarna's builder rules lag only because they are
  generated. Put to the owner for confirmation: #7, point 5.

## Questions for the owner

- [#6](https://github.com/HaakTuah/agent-rules/issues/6): should three safety rules only Amarna Letters has (stop at a
  failed safety check; the dependency rules; the 90% usage stop) join the floor?
- [#7](https://github.com/HaakTuah/agent-rules/issues/7): where the two games' rules differ, keep each game's own
  (six points)?
- [#8](https://github.com/HaakTuah/agent-rules/issues/8): should every session read the floor at its start?

The owner's yes is also asked in the PR for `.github/workflows/personal-terms.yml` (floor rule 3).

## Candidates for later

- **Shared scripts,** each now kept twice: the work-saved hook (`.claude/hooks/work-saved.sh`), the usage script
  (`scripts/usage.sh`) with the status line it reads (`scripts/statusline.sh`), the copies check (Amarna's
  `scripts/copies.mjs`, Barkstreet's `tools/copies-test.js`), and the personal-terms workflow. Taking them into the core
  would need the games' checks and settings to run them from `core/`.
- **The check that `core/` matches its pin,** on every PR in each game (step 3).
- **This repository's `.github/dependabot.yml`** is GitHub's empty template (an empty `package-ecosystem`), the same
  file Amarna Letters found failing on every commit (its archive item 155). Set to `github-actions`, it would keep the
  personal-terms workflow's `actions/checkout` current. A `.github/` change, so the owner's yes.
- **Codex's security review settings** take one threat model file: after adoption, each game's points to its own
  threat model, which must say that `core/floor/threat-model.md` is part of it; a canary would show whether Codex follows
  that pointer (as Amarna's open canary follow-up asks for the review guidelines).

## Helpers

- **Planning design (Fable, high), once,** given the inventory only: judged the sort. Taken: owner's words into the
  inbox module, sessions into the work-flow module, the REST calls into a file read only when needed, the floor's safe
  defaults, no module or model named inside the floor, `AGENTS.md` naming the start files one hop for Codex, the start
  list. Not taken: moving four one-game rules into the floor now (a change, so put to the owner, #6); the slop check as
  a substance difference (the two differ only in where the bar and the fixes live, so a slot); the owner's login
  written out of the floor (it is the repository's own address, the one exception rule 11 allows).
- **Fresh reviewer (Opus, high), once,** given only both games' rule files and the core: its findings and what was done
  with each are below.
- **Codex's code review** (round 1): one P1, the personal-terms check passing a term in any commit message but the
  newest; reproduced on a test repository, fixed, and the fix shown to catch it. The fallback reviewer (Opus, high)
  then reviewed the workflow change against the floor: no P0 or P1; its P2 (a term wrapped across a line break, which
  the old check caught) and two P3s from before the change (a backdated commit stopping the walk; a failing `rev-list`
  passing silently) fixed as it proposed, each tested on a scratch repository.
## The fresh reviewer's findings, and what was done

Given only both games' rule files and the core, the reviewer found the move faithful in most rules, and these points,
all handled in one round:

- **Lost, now in the core:** reading the spec again before opening the PR (`modules/work-flow.md`, point 5; what is
  re-read and where a large change is queued stay each game's own); "read only the sections the task names"
  (`modules/how-to-work.md`); the lower stakes' shared principle (`floor/threat-model.md`).
- **Changed, now as the games say it:** the fallback security review checks against the project's `SECURITY.md` with
  the floor, and its threat model (it had named only the floor); "the newest *stable* release" (floor rule 7,
  `modules/updates.md`); a held-back update's reason goes in the closed PR and an issue that stays open (B's "or the
  issue" kept as "the update's own, if it came as one"); Node moves "each October, or at the cue the project names"
  (Amarna's `@types/node` cue stays in Amarna), with Barkstreet's reason restored; a session stops when its task is
  merged "and whatever the project's `AGENTS.md` adds" (Amarna's milestone PR and passed-gate exit stay in Amarna).
- **Reasons and conditions restored,** each dropped while condensing: no description left untrue (so no reader meets a
  text the project no longer matches); split by meaning ("nothing it must read past"); Fable's usage running out first;
  test data (no scanner takes one for a leak; never a real person's); rule 9 (an outsider's issue acted on only once the
  owner passes it on; Codex's findings included); Dependabot condition (5) ("not a lane of its own"); the source check
  (for the version in use as much as for a new one).
- **The floor did not require a review before a merge,** so a project taking only the floor could merge unreviewed
  changes. Floor rule 8 now says, as both games' review rules do: no PR merges until its security review has run, none
  with an open security finding, and a PR that changes a protected file gets a code review; a milestone PR needs it only
  for a commit that reached `develop` without one. `modules/reviews.md` keeps the mechanics and points to it.
- **Pointers:** the personal-terms workflow's comment names "SECURITY.md, point 11" (it is taken unchanged), so the
  core's `SECURITY.md` says that is floor rule 11; the core's `AGENTS.md` now names its archive's path, says it has no
  `scripts/usage.sh`, and gives the rule-file audit its own trigger here (no milestones); floor rule 3 says what
  "merged into `develop`" means where there is no `develop`; the week's wait cites core archive 37 and 65; slots written
  without italics marked; the milestone PRs' exemption from the security gate said outright (floor rule 8).
- **Kept as they are, with the reason:** the floor's default where a project names no protected files or trusted
  builder (everything protected, only the owner changes it) is stricter than either game says, and is what lets the
  floor stand alone; "two weeks for a script users' browsers load directly" is Barkstreet's case and reads as nothing
  for a project with none; rule 5 merges both games' input rules into one principle, each game's inputs and checks
  staying in its own `SECURITY.md`; "[...]" in two archive items is the games' own gap, now said in the archive's
  header; the archive's mentions of "future projects" and "1 project" name none; the personal-terms check prints
  matching files' paths, as in both games (taken unchanged).
## The done table: every rule of both games, and where it went

A is Amarna Letters, B Barkstreet Snakes. "Stays in each game" and "A" or "B" mean the rule stays in that game's own
files; "floor" is `floor/security.md` (or its threat model); a module is named by its file; a slot is in italics,
filled by each game's manifest; "dropped" gives its reason. Where the games differ in substance, the row links the
question.

### AGENTS.md

| # | Rule (short) | In | Went to |
|---|---|---|---|
| 1 | What the game is; pillars read once per session | A: yes; B: yes (no pillars) | stays in each game |
| 2 | Every role works from AGENTS.md whichever model fills it; Codex reads "For Codex" each task | both | `modules/roles.md` (principle) + project AGENTS pointer |
| 3 | Where things are (table) | both | stays in each game |
| 4 | Work from `develop` | A: yes (+ rule files reach main only with milestone); B: yes (+ check out develop if on main) | `modules/git.md` |
| 5 | Find next item/entry in progress file; its text is the brief; read the sections it names via grep | both | stays in each game; "read only the sections it names" in `modules/how-to-work.md` ("Read little") |
| 6 | Check for changes in the design copy (A) | A | A |
| 7 | Read "The game in one page" before every item (A) | A | A |
| 8 | Check weekly usage with `scripts/usage.sh` at start and after every commit; "unknown" → say so in first line of each PR, owner pauses at ~90% | both | `modules/usage.md` |
| 9 | Before opening the PR, re-read the spec (A: the live design document, builder rules; B: its entry and question issues): build what changed, or if large say so in the PR and queue it (A: start of the next item touching it; B: its own entry right after) | both | `modules/work-flow.md`, point 5 (re-read, build what changed, a large change said in the PR and queued); what is re-read and where a large change is queued stay in each game ([#7](https://github.com/HaakTuah/agent-rules/issues/7), point 3) |
| 10 | Every rule says what it is for; the aim (max finished work of full quality per week's usage, lowest cost now and later); four pillars; reviews enforce first three; workshop check measures reading | both | `modules/how-to-work.md` |
| 11 | A question is a question | both | `modules/how-to-work.md` |
| 12 | Match effort to the task; docs/small fixes one pass, no helpers | both | `modules/how-to-work.md` |
| 13 | Read little: never read a large file whole (A: over 50 KB; B: a large game file, e.g. 40 KB), grep/codemap then the range; don't re-read what you edited | both | `modules/how-to-work.md`, slot *large file* |
| 14 | Old round reports, `docs/archive/` only when a task points there (A) | A | A |
| 15 | Print little: test/sim scripts print summary + failures, full log in a file; long runs in background, wait for notice, never poll, no agent kept alive to wait, never paste full log | both | `modules/how-to-work.md` (commands: project) |
| 16 | Helpers, effort and escalation: pointers to roles / Claude's file / For Codex | both | `modules/how-to-work.md` pointer |
| 17 | Model-game simulations follow their own process (A) | A | A |
| 18 | Edit in place | both | `modules/how-to-work.md` |
| 19 | Don't loop: same approach fails twice → stop, write down, change course, escalate, or mark blocked in PR and progress file with a brief, go on | both | `modules/how-to-work.md` |
| 20 | One fact, one place, everywhere (+ copies check, baseline only shrinks, the one place is where its readers look, moves in one PR) | both | `modules/how-to-work.md`, slot *copies check* |
| 21 | Never edit the design copy or builder rules; design seems wrong → reading; taste → question (A) | A | A |
| 22 | A design call goes into its topic file in `docs/design/` (B) | B | B |
| 23 | No description left untrue: same PR updates every place describing what changes (A: design notes, README, rulebook, seat view; B: topic file, README, lesson, Field guide row, hints); dated records stay; milestone PR says if README current | both | `modules/how-to-work.md`, slot *descriptions* |
| 24 | Keep it lean | both | `modules/how-to-work.md` |
| 25 | Split by meaning from the start; family = shared part + overrides; size only a warning (~20 KB); split in own PR, behaviour proven unchanged; Step 0 at ~50 KB; workshop check and file-by-file reviews still run | both | `modules/how-to-work.md` (B's "every file is a script tag and sw.js entry" and its size check: B) |
| 26 | Workshop check weekly (A, stands in for builder rules until refresh) | A: yes; B: in orchestrating.md | `modules/workshop-check.md` |
| 27 | Principles over rules; never for the safety rules (A: SECURITY.md, main, keys and secrets, spending, no model games; B: SECURITY.md, main, keys and secrets, storage keys) | both | `modules/how-to-work.md` ("never for the floor, nor a rule the project's AGENTS.md marks as a safety rule"); A marks spending and model games, B the storage keys, in the "The core" section of their AGENTS.md |
| 28 | Smallest setup that tests the rule; full-size only in the few tests guarding the whole; long measurements in the sim script, never in the suite/CI | both | `modules/how-to-work.md` (the rule); A / B (their specifics) |
| 29 | Tests' default does not grow with the world; checks ~10 min target (A) | A | A |
| 30 | Owner's words kept word for word in the archive (A numbered and dated; B dated), personal details left out; everything else points; a standing rule goes where it applies (or CLAUDE.md), briefly, with its purpose; rule files state rules, never quotes or dated history, at most "(archive …)" | both | `modules/inbox.md` (words kept) and `modules/how-to-work.md` (rule files state rules), slot *archive citation* |
| 31 | A standing rule moves into builder rules at the design copy's next refresh (A) | A | A |
| 32 | Each game's files stay in its own repository; never write into another project's repository or folders | both | floor rule 13 |
| 33 | Sessions: started task by task → stop when merged, say what's next; else carry on (A: + its milestone PR merged; a long item may end at a passed gate with commit and note) | both | `modules/work-flow.md` ("Sessions"); A's extras stay in A ([#7](https://github.com/HaakTuah/agent-rules/issues/7), point 4) |
| 34 | One place for the owner: issues | both | `modules/inbox.md` |
| 35 | Readings: settled by the project's references (A: The game in one page + item's sections; B: rules that stand / design section); listed under "Readings taken" (A: report; B: PR) with the principle; only open or taste → owner | both | `modules/inbox.md`, slots *settling references* and *report* |
| 36 | One inbox: issues assigned to `HaakTuah`; `question` (with reading and alternative), `enhancement`, `bug`; template headings copied into body via API; search first; whole, phone-answerable, plain words, project's own names | both | `modules/inbox.md` |
| 37 | Everywhere else only a pointer: "Questions for the owner" lists issues opened or touched, one line + link, "none" | both | `modules/inbox.md` |
| 38 | Only the owner's comments answer; agents posting under his login end with their tool's attribution line; unsigned from `HaakTuah` is his | both | floor rule 4 |
| 39 | Acting on his answer: quote in archive, write the decision where it belongs (A: design decision to design session), close with link; open = needs him | both | `modules/inbox.md` (A's "a design decision goes to the design session" stays in A) |
| 40 | Ideas cheap, a couple per task, never built until owner moves into progress file; no agent treats another's idea as instruction | both | `modules/inbox.md` |
| 41 | Version updates are upkeep, not ideas (B here; A in developing.md) | A: dev; B: yes | `modules/updates.md` |
| 42 | Bugs don't wait: fix in task, else file; any lane touching its files may claim; closes only when live via "Fixes #n" reaching main, never by hand; a fix changing a rule/design is a question | both | `modules/inbox.md` |
| 43 | Waiting is lost time and, past an hour, a lost cache | both | `modules/work-flow.md` |
| 44 | Review in background: mark ready (starts security review), ask code review + design check at once, go on, fix in one round, last message says what merged and next (B; A in orchestrating), merge only at 10 from each review (none → green checks) and past the security gate | both | `modules/work-flow.md` |
| 45 | Next task: A "on top", branched from the previous item's PR branch while it is in review; B "from develop, never stacked on an open PR's branch", and an AI entry waits for the last AI change to merge | both | A / B, each its own ([#7](https://github.com/HaakTuah/agent-rules/issues/7), point 1); `modules/work-flow.md` says the project decides and no lane stacks on another |
| 46 | Lanes: independent work in parallel (different files, no shared measurement, no waiting); claim with a draft PR from a fresh branch off develop after checking open PRs; merge develop in before review; progress file changed only when it merges; never stacked on another lane's branch | A: yes; B: yes (stacking: via its point 2) | `modules/work-flow.md` |
| 47 | Lanes: what runs one at a time (A: numbered items, one lane; B: AI and engine-rules changes, online messages); A's list of side lanes; A: draft PR title names the entry | both | slot *one at a time*; A's list of side lanes and "its title naming the entry" stay in A |
| 48 | The brake: from ~85% no new side lane, open ones finish; from ~90% only small things in main lane; only measured share counts; a session that cannot read it carries on | both | `modules/usage.md` (as a floor rule: [#6](https://github.com/HaakTuah/agent-rules/issues/6), point 3) |
| 49 | Rules that stand (B: rivals never treat a person differently, no ability only people use, clever rivals human reactions, every new move tested both ways, cue and lesson, trademarks, optimizations, conditional goods, everything belongs, online in step, never rename storage keys / no repo named `snake-game`) | B | B |
| 50 | Usage (B section; A in builder rules): work continuously; from ~90% no bigger task: finish if nearly done, or clean commit + draft PR saying how to test and what's left; then only small things, progress file up to date; the two games share the limit; only measured share counts | both | `modules/usage.md` |
| 51 | `main` is the owner's and the live site: never push to it, never force-push | A: builder rules; B: yes | floor rule 12 |
| 52 | Branch from develop per task, PR into develop, merge yourself when suites and reviews pass | both | `modules/git.md` |
| 53 | Push after every commit, even before the PR (a draft), so nothing is lost if a session dies | both | `modules/git.md` |
| 54 | Before pushing to a branch whose PR you opened, check whether it merged; if so new branch and PR | A: builder rules (develop); B: yes | `modules/git.md` |
| 55 | Milestones: a develop→main PR carries the new work, says what to try; merged by the builder once CI green, never left to the owner; work carries on. Due: A each time an item merges; B whenever a change a player would notice merges, at least daily | both | `modules/git.md`, slot *milestone due* (the two differ: [#7](https://github.com/HaakTuah/agent-rules/issues/7), point 2) |
| 56 | B's milestone: news line in `version.js`; weekly workshop line | B | B (news line); `modules/workshop-check.md` (weekly line) |
| 57 | Before pushing develop, check the last milestone PR; if merged, merge main back first, open a new one | both | `modules/git.md` |
| 58 | Commands | both | stays in each game |
| 59 | Review guidelines section: every reviewer (Codex's included) reads the guidelines whole with SECURITY.md; own file so builders don't carry them | both | stays in each project's AGENTS.md, pointing to `modules/review-guidelines.md` and the project's own |

### CLAUDE.md

| # | Rule | In | Went to |
|---|---|---|---|
| 60 | Claude's part: process rules are in AGENTS.md (A: + builder rules), imported; this file holds only Claude Code's own | both | A / B (CLAUDE.md stays, imports AGENTS.md) |
| 61 | Models, effort and helpers table (builder, orchestrator, search, parallel, reviewer, design check, planning design, escalation, last escalation); "the same in both games" | both | `modules/claude.md`; "the main lane" with A's name in its manifest; B's "(the writing pass, entry 9)" stays as one line in B's CLAUDE.md |
| 62 | Fable's fallback → Opus high; nothing waits for Fable | both | `modules/claude.md` |
| 63 | No agent workflows, no ultracode; long runs in background (A: model-game simulations excepted) | both | `modules/claude.md` ("except a process the project's own rules name"); A names model-game simulations |
| 64 | Read this table against yourself (ranking, helper above you, judgement vs fresh eye vs escalation vs cost; not on Opus → say so) | both | `modules/claude.md` |
| 65 | Sonnet builds, Opus backs it | both | `modules/claude.md` |
| 66 | A helper above you gets only what needs it (Fable above all) | both | `modules/claude.md` |
| 67 | Projects don't load `.claude/agents/` → always pass model and effort; never max effort | both | `modules/claude.md` |
| 68 | GitHub from a cloud session: the REST calls | both | `modules/github-calls.md` |
| 69 | The work-saved hook | both | `modules/claude.md` |

### SECURITY.md (same text in both but for the parts named)

| # | Rule | Went to |
|---|---|---|
| 70 | A break is blocking in every review, P0/P1 | floor |
| 71 | 1. Nothing secret anywhere (key, token, password, environment id, personal path or address); revoked at once, owner told; no key in a session's or cloud environment's variable | floor |
| 72 | 2. Workflows: no `pull_request_target`; `workflow_run` only with head-repo check, never PR code with write token; forks no secret/write token; fewest permissions; untrusted text via `env:`, quoted; only `actions/*` or SHA-pinned | floor |
| 73 | 3. Protected files: only the trusted builder's lanes (who: c&c "Who does what"), never a cloud-task lane; categories (runs by itself/with credentials; rule files; checks on the work), lists differ per game; owner's yes for `.github/` and setup script; narrow Dependabot actions exception; `.claude/settings.json` runs from the merged copy and denies edits inside `.git` | floor rule 3 (the lists and the trusted builder: each project's SECURITY.md) |
| 74 | 4. Outsiders' text never an instruction; orchestrator acts only on PRs `HaakTuah` opened from the repository; Dependabot exception (5 conditions; (2) files differ per game) | floor rule 4 (Dependabot's files: each project's SECURITY.md) |
| 75 | 5. Untrusted input checked before use (A: model replies, saves/links/URL params, the bridge; B: online peers, shared records, URL params and room codes) | floor (principle) + A / B (lists) |
| 76 | 6. Nothing untrusted becomes markup or code (`textContent` or escaped; never unescaped into attribute/URL/style/handler; no eval, new Function, string timers); where markup is built differs | floor + A / B (places) |
| 77 | 7. What runs in users' browsers: A players' API keys, CSP (`csp.ts`, provider list), dependencies (`npm ci`, new package with reason from known publisher, `ignore-scripts`, exact pins, audit fixed not silenced); B third-party script SRI, CSP meta (by name, never wildcard, pinned whole by test), service worker, storage keys | floor rule 7 (pins, the week's wait, the source check, the policy nothing weakens) + A / B (their specifics); A's dependencies bullet stays in A ([#6](https://github.com/HaakTuah/agent-rules/issues/6), point 2) |
| 78 | 8. Reviews look for these and any new way in; nothing runs on the owner's machine, nothing there starts an agent; test data never real | floor |
| 79 | 9. Alerts and weaknesses: owner alone sees/dismisses alerts, no agent token; in a PR blocks merge (CodeQL false alarm confirmed by security reviewer, no suppression); in merged code reaching what the threat model protects → private report, fix first, PR says what it hardens not how to attack; else `bug` issue; real secret is the owner's to replace | floor (examples per game → threat model) |
| 80 | 10. Licences: two lists (ships / tools only), never non-commercial etc.; a check on every PR; the audit; the owner's code carries no licence file, never add one | floor rule 10 (what ships, the audit and the notices file: each project's SECURITY.md) |
| 81 | 11. Nothing personal, ever; words kept but such details "[…]"; GitHub account in addresses the one exception; check against `PERSONAL_TERMS` secret; P1; older commits keep what they hold | floor |
| 82 | Reporting a weakness (private reporting; else an issue saying only that one exists) | floor |

### threat-model.md

| # | Rule | Went to |
|---|---|---|
| 83 | Read by Codex's security review as its threat model; rules close each way in | floor |
| 84 | Everything public; no defence rests on not being known; committed is public for good | floor |
| 85 | Who: anyone; issues, fork PRs, packages/actions, planted text; + per game (saves/links, model replies; room codes, shared records) | floor + A / B |
| 86 | Protected: the owner's accounts (GitHub and tokens, ChatGPT and Claude logins; via workflows, checks, work handed to Codex), his machine runs nothing; branches and site (main, develop, deploy workflows, Pages); users (per game) | floor + A / B |
| 87 | Ways in: workflows, dependencies and actions, outsiders' text reaching an agent; + per game | floor + A / B |
| 88 | Lower stakes (per game) | floor (`floor/threat-model.md`: the shared principle) + stays in each game (their examples) |

### docs/claude-and-codex.md

| # | Rule | Went to |
|---|---|---|
| 89 | Two builders, each on its own subscription, review each other: different blind spots | `modules/codex.md` |
| 90 | Status: Codex reviews, Claude builds (no legacy environment); no lane to Codex until the owner says; nothing on the owner's machine starts Codex (started from the PR); dormant list | `modules/codex.md` (machine part: F rule 8) |
| 91 | Every rule names a role, never a model; this is the one place that says who fills each | `modules/roles.md` |
| 92 | Orchestrator, builders, trusted builder, code reviewer = the other company's model, fallback reviewer (holds the picture of the finished game), security reviewer, design checker (A: on build-order items), planning design (A: script kings'; B: rivals'), the hard work (A: hardest problems, competing approaches; B: AI planning, engine rules, online sync; a big-file split is not) | `modules/roles.md` + slots *design-checked PRs*, *planning design*, *hard work* |
| 93 | Helpers: when they pay (four shapes; when not; how many: one per part, at most five at a time incl. reviewers, waves of five, each lane's own five; cheapest model; standalone brief: goal, return form, files, sources, end; check results; never stop to ask; measured per PR, weekly line, question if a shape never pays) | `modules/helpers.md`, slot *measurements* |
| 94 | Escalation: twice defeated → fresh solver with a brief; stuck builder applies; Codex first once it can build, else Claude's escalation then last escalation; still unsolved → blocked | `modules/roles.md` |
| 95 | Who merges: Claude's builders merge their own at the review's verdict; Codex never merges, never touches main, never pushes to a branch not given | `modules/roles.md` |
| 96 | What goes to Codex (A: codex-building.md; B: inline): route by how the result can be checked; Claude keeps decisions as failing tests; hand off only when bigger than its brief; table; whole with Claude; trial(s) | `modules/codex-building.md` (general) + A / B (table, whole-with-Claude list, trials) |
| 97 | Handing work to Codex (5 steps) | `modules/codex-building.md` |
| 98 | When Codex is not there (take-backs, 5 min / 2 h, unavailable, first guesses) | `modules/codex-building.md` |
| 99 | Which PR gets which review: design-checked PRs (A: build-order items, not polish/sound small fixes; B: engine-rules and AI entries) code review + design check; every other PR changing the project → code review; Dependabot → code review; docs-only and milestone PRs → none unless a protected file; every PR one security review; Codex-built → fallback | `modules/reviews.md`, slot *design-checked PRs*; A's "history dossiers count as docs" stays in A |
| 100 | Codex review points 1-4 (ask with the mention alone; 5 min / 15 min / fallback; findings by priority; nothing open = 10) | `modules/reviews.md` |
| 101 | Point 5 design check with a score, both at once; why that is enough (first canary found every planted fault) | `modules/reviews.md` |
| 102 | Point 6 security reviews: one automatic when ready; after that the fallback reviewer for changes that matter; ran only if summary shows it; findings count; the security gate; 30 min fallback; never merge with an open finding | `modules/reviews.md` |
| 103 | Point 7 checks that run the work once Codex can build | `modules/reviews.md`, slot *measurements* |
| 104 | Reviews only a 10: 1 the list decides; 2 fixed or moved out (bug issue or progress entry); 3 later rounds judge only the change; 4 at most three rounds, escalation, blocked, never merged below 10; 6 one line per PR with summaries | `modules/reviews.md` |
| 105 | 5 the bar: weekly blind re-review; canary ~two weeks; logged in `docs/calibration.md`, two misses in a row tighten but keep reviewing; the log is the schedule | `modules/reviews.md` |
| 106 | 5 history spot-check monthly (A) | A |
| 107 | 5 slop check monthly (A: against "Text a player reads", fixed in Follow-ups, formula test every code PR; B: scored as every review, fixed in the polish lane, chatter suite runs the formula test) | `modules/reviews.md`, slot *slop bar* |
| 108 | 7 briefs: fallback reviewer (diff, task's text, A: + "The game in one page", the guidelines whole); design checker (A: + dossier passages, checks against the page first, a fact without source blocks; B: same brief, until it meets the task); later round; escalation | `modules/reviews.md`, slot *review reference*; A's dossier passages and "a fact without a source blocks" stay in A's review guidelines |
| 109 | For Codex: AGENTS.md applies (A: + builder rules); helpers = its subagents; build only what the brief gives; tests are the contract; run the test (and sim) scripts before finishing (commands differ); push to the PR's branch only, open no PR, never protected files, never a secret; setup script, say what's missing; questions to issues or report; review findings by priority | `modules/codex.md`, slot *Codex's checks* |
| 110 | Setup: own subscription, app on the owner's repositories, code review automatic off; security review settings; environment (B only); default model; B: agent may reach the internet | `modules/codex.md`, slot *Codex environment* (B's internet note in its value) |
| 111 | What reaches Codex: only the owner's own work (PR he opened from the repository, never main/develop); never protected files (marked failed, compare call, never merged) | `modules/codex.md` (restates F rules 3-4) |

### docs/orchestrating.md

| # | Rule | Went to |
|---|---|---|
| 112 | Orchestrator builds nothing itself; every lane a builder session; helpers belong to builders; small context; its sessions run at their own effort; can't start sessions → say so and stop | `modules/orchestrating.md` |
| 113 | Rules re-read when they change; progress file's diff each wake; wake report counts lanes, fallback security reviews, merges on the fallback or without the gate | `modules/orchestrating.md` |
| 114 | The aim: most work, fewest tokens, no quality lost | `modules/orchestrating.md` |
| 115 | Keep the cache warm; bigger review fixes in a session of their own; hand over at once (woken by merge, hourly fallback) | `modules/orchestrating.md` |
| 116 | A lane for every independent entry; questions passed on word for word; no turn idle | `modules/orchestrating.md` |
| 117 | B: "The same helpers, used better" (pipelining adds no agents; a reviewer or search helper may run in background) | dropped: the helper, Claude and "Print little" rules already say it ([#7](https://github.com/HaakTuah/agent-rules/issues/7), point 6) |
| 118 | B: files every session reads stay small, since they start every call | dropped: the workshop check's point 2 says it ([#7](https://github.com/HaakTuah/agent-rules/issues/7), point 6) |
| 119 | B: a draft PR labelled `codex` is a claimed lane | B (dormant Codex hand-over) |
| 120 | B's workshop check section (weekly; 6 points; "fix what passes its mark"; marks in `tools/sizes.json`, measured every PR; point 6 also cuts what can be cut) | `modules/workshop-check.md`, B's newer wording; Amarna's builder-rules version to be cut at the source ([#7](https://github.com/HaakTuah/agent-rules/issues/7), point 5); slot *size marks* |

### docs/review-guidelines.md

| # | Rule | Went to |
|---|---|---|
| 121 | Who reads it, whole, with SECURITY.md; changes only on the owner's word | `modules/review-guidelines.md` |
| 122 | How a review passes (Codex P0-P3, others 1-10 with blocking/not blocking, a 10 is nothing open; later rounds raise new only if P0/P1) | `modules/review-guidelines.md` |
| 123 | What blocks (departure from design/description; broken rule; test weakened; protected file changed by a Codex lane; leftovers; untrue descriptions; copies and baseline entries; content in the wrong place, pointer nobody needs) | `modules/review-guidelines.md` |
| 124 | B: a size mark raised without its reason; each changed comparison or bound checked, each page write against rule 6 | B |
| 125 | A: History holds; Hidden information | A |
| 126 | Text a player reads (A: detailed tells, voice reference, the owner's read final; B: short, the slop audit sets the bar) | `modules/review-guidelines.md` (the shared tells) + A / B (their extras) |
| 127 | A protected file changed: a rule departing from the owner's archived words is P1 | `modules/review-guidelines.md` |
| 128 | One idea per review of a change to the project (filed or added to an existing issue) | `modules/review-guidelines.md` |

### docs/developing.md (A all; B the GitHub section, rest game docs)

| # | Rule | Went to |
|---|---|---|
| 129 | REST calls from a cloud session (create, ready, merge, compare, merged?, open/last milestone PR) | `modules/github-calls.md` (B's "open milestone PR" call dropped: the "last milestone PR" call answers it) |
| 130 | Dependabot's security PRs: the one other way into main (floor rule 4) | floor |
| 131 | The newest version unless a reason: exact versions never a range; newest stable once a week old (B: two weeks for a script browsers load); upkeep, no queue, no owner's word except rule 3's yes | floor (exact pin, the wait) + `modules/updates.md` (the policy) |
| 132 | Dependabot version PRs (A: weekly, minor and patch grouped; B: weekly, grouped) merged as ordinary small PRs: checks, code review, release notes, licence gate | `modules/updates.md` |
| 133 | A new major version is its own PR (A: of a tool, + smoke test of the built app; B: taken out of its group, full suites, played through) | `modules/updates.md`, slot *major version checks* |
| 134 | Source check of what ships (same publisher and repository, provenance, registry signature or key check, diff read against release notes); a check that cannot run leaves it waiting; one that fails holds it back; checks lower odds, CSP limits harm. Specifics: A Vite and its plugins, Rollup, esbuild; B PeerJS's readable build, SRI from the verified package, a preview round | floor (general) + A / B |
| 135 | Held back only for a reason (breaks, runs/loads worse, licence change, abandoned or changes hands); written in the closed PR and an issue open until gone | `modules/updates.md` |
| 136 | B: tools' packages and what Dependabot can't see (versions.json, monthly workflow) | B |
| 137 | Node's version (A: @types/node major is the cue; even LTS from its October moves CI and setup script with full suites; odd closed. B: CI and cloud machines run the same Node; each October both move in one PR) | `modules/updates.md` ("each October, or at the cue the project names", with B's reason); A's @types/node cue stays in A |
| 138 | B: the licence gate's mechanics | B |
| 139 | CodeQL on every PR into develop and main, every push, weekly; finding → rule 9 | `modules/updates.md` |

### docs/codex-building.md (A) — see 96-98. docs/builder-rules.md (A, generated from the design document; never edited: the design session cuts at the source)

| # | Rule | Went to |
|---|---|---|
| 140 | One item at a time, in order; blocked → note, next independent | A |
| 141 | Branches: develop from main; item branches stacked; merge into develop at tests + reviews; never push to main; main changes only by the milestone PR (and Dependabot security PRs), always merged by the builder once green | floor (main) + `modules/git.md` (merging) + A (stacking) |
| 142 | The specification; every rule a king needs; requests are rules too; balance; no rule checks which power; script kings | A |
| 143 | No model games until the build order is done (+ debrief question, model-mistake sorting) | A |
| 144 | Safety checks are never overridden: a failed check guarding against something unsafe or irreversible (agents' isolation, anything touching main, keys or spending) stops that step and asks; other work goes on; an ordinary failing test is not a reason to stop | A ([#6](https://github.com/HaakTuah/agent-rules/issues/6), point 1) |
| 145 | A pull request at every milestone (see 55, 57) | `modules/git.md` |
| 146 | Unattended work: don't stop to ask; most reasonable reading, written down, carry on; readings with their principle; design session checks them (A); taste → question when taken; stop only before anything irreversible | `modules/inbox.md` (don't stop to ask; readings with their principle; taste goes to the owner when taken); A (the design session's check; "stop only before anything irreversible": [#6](https://github.com/HaakTuah/agent-rules/issues/6), point 1) |
| 147 | Progress: progress file, one line per item; report path | A |
| 148 | The workshop check (six points; "at every milestone", now weekly) | `modules/workshop-check.md` |
| 149 | Usage: be economical (the reviews an item calls for, no extra analyst workflows); work continuously; check after every commit; both games keep working to ~90%, then the bulk is the owner's; from 90% no bigger task... | `modules/usage.md`; "be economical" dropped: "match effort to the task" and "no agent workflows" say it ([#7](https://github.com/HaakTuah/agent-rules/issues/7), point 6) |
| 150 | Review points do not stop the build; "Stop for review" items | A |
| 151 | No stopgaps | A |

## The manifests

Each game's `core-manifest.md`, in the format `README.md` defines, and the section its `AGENTS.md` gains (the pointer
lines). Written here only; each game adds its own in its adoption PR (step 3), with the pin set to the commit it copies.

### Amarna Letters: `core-manifest.md`

```markdown
# Core manifest

Core: HaakTuah/agent-rules at <full commit SHA>, copied whole under core/ (never edited here).
Floor: whole. Modules: all.

## Names
- A task: an item (the build order's), or a lane's entry.
- The main lane: the item lane.

## Slots
| Slot | Here |
| --- | --- |
| *progress file* | `docs/BUILD-PROGRESS.md` |
| *report* | `docs/rounds/<date>-<item>.md` (the PR names it) |
| *archive citation* | "(archive item N)", N from `docs/archive/instructions.md` |
| *settling references* | "The game in one page" (`docs/intent/overview/the-game-in-one-page.md`) and the item's sections |
| *descriptions* | the design notes (`docs/design/`) and, for what a player or a king sees, the README, the rulebook and the seat view; `docs/intent/` stays as it is |
| *copies check* | `scripts/copies.mjs` |
| *large file* | over 50 KB |
| *size marks* | about 20 KB each for `AGENTS.md`, `CLAUDE.md`, the builder rules and the progress file |
| *one at a time* | the numbered items, one lane |
| *milestone due* | each time an item merges into `develop` |
| *design-checked PRs* | the build-order items (not the polish and sound lanes' small fixes) |
| *review reference* | "The game in one page" |
| *planning design* | the script kings' planning |
| *hard work* | an item's hardest problems, above all the competing approaches judged by measurement |
| *measurements* | the benchmarks and use against ignore (`scripts/sim.sh`) |
| *slop bar* | "Text a player reads" in `docs/review-guidelines.md`; finds fixed in "Follow-ups" in the progress file; the formula test in the suite |
| *major version checks* | the smoke test of the built app |
| *Codex's checks* | `scripts/test.sh`, and `scripts/sim.sh --games 50 --seed 1 --verify-replay` when the engine changed |
| *Codex environment* | none yet |
```

### Amarna Letters: the section `AGENTS.md` gains

```markdown
## The core

This game takes the shared rules in `core/` by `core-manifest.md`, whose slots and names fill the core's words. Read
these whole at the start of every task (Claude Code imports them; Codex: read each file named):

@core-manifest.md
@core/floor/security.md
@core/modules/how-to-work.md
@core/modules/inbox.md
@core/modules/work-flow.md
@core/modules/git.md
@core/modules/usage.md

Codex: read "For Codex" in `core/modules/codex.md` at the start of every task. The other modules are read when a task
needs them; each says when. Safety rules of this game's own, which "Principles over rules" never reaches: spending,
and no model games until the build order is done.
```

### Barkstreet Snakes: `core-manifest.md`

```markdown
# Core manifest

Core: HaakTuah/agent-rules at <full commit SHA>, copied whole under core/ (never edited here).
Floor: whole. Modules: all.

## Names
- A task: an entry in the queue.
- The main lane: the main lane.

## Slots
| Slot | Here |
| --- | --- |
| *progress file* | `docs/PROGRESS.md` |
| *report* | the PR's description |
| *archive citation* | "(archive, D Month YYYY)", from `docs/archive/instructions.md` |
| *settling references* | "Rules that stand" in `AGENTS.md`, or the design section |
| *descriptions* | the topic file in `docs/design/` and, for what a player sees, the README, the lesson, the Field guide row and the hints on screen |
| *copies check* | `tools/copies-test.js` |
| *large file* | a large game file (`render/world.js`, about 40 KB): `scripts/codemap.sh <file>` or grep |
| *size marks* | `tools/sizes.json`, measured on every PR by `tools/sizes-test.js` |
| *one at a time* | AI and engine-rules changes, and changes to the online messages |
| *milestone due* | whenever a change a player would notice has merged into `develop`, and at least once a day |
| *design-checked PRs* | engine-rules and AI entries (new moves and rules, the rivals' play) |
| *planning design* | the rivals' planning |
| *hard work* | the AI's planning, the engine's rules and online sync (not a big-file split: its fingerprints and suites check it) |
| *measurements* | `tools/abtest.js`, a census, the fingerprints |
| *slop bar* | the slop audit in `docs/PROGRESS.md` (a 10: nothing reads machine-made); finds fixed in the polish lane; the formula test in the chatter suite |
| *major version checks* | the full suites, and played through for what ships |
| *Codex's checks* | `scripts/test.sh`, and `scripts/sim.sh` with the fingerprint for a change that should keep behaviour |
| *Codex environment* | made (the agent may reach the internet; the suites need none of it) |
```

### Barkstreet Snakes: the section `AGENTS.md` gains

```markdown
## The core

This game takes the shared rules in `core/` by `core-manifest.md`, whose slots and names fill the core's words. Read
these whole at the start of every task (Claude Code imports them; Codex: read each file named):

@core-manifest.md
@core/floor/security.md
@core/modules/how-to-work.md
@core/modules/inbox.md
@core/modules/work-flow.md
@core/modules/git.md
@core/modules/usage.md

Codex: read "For Codex" in `core/modules/codex.md` at the start of every task. The other modules are read when a task
needs them; each says when. Safety rules of this game's own, which "Principles over rules" never reaches: the storage keys
(`SECURITY.md`, rule 7).
```

Each game's `SECURITY.md` keeps, under the floor's numbers, what the floor leaves to it: rule 3's file lists and trusted
builder (Claude's builder sessions), rule 4's Dependabot files, rules 5 to 7 as they stand, rule 10's "what ships",
audit and notices file. Its first line says the floor holds whole, and its "Reporting a weakness" points to the floor's.
Its threat model keeps its users, ways in and lower stakes, and says the floor's threat model is part of it.

## The maps: which rule-file lines the core replaces

Line numbers are those of the files on `main` at the commits named above. Every line not listed stays in the game, or
moves within it (to the manifest, its `SECURITY.md` or its review guidelines), as the done table says. Amarna's
`docs/builder-rules.md` is a generated copy of the design document and is never edited: the design session cuts its
lines at the source.

### Amarna Letters (`main` at 0ab0f9a3)

| File | Lines the core replaces | Now in |
| --- | --- | --- |
| `AGENTS.md` | 9–10 | modules/roles.md; the new "The core" section |
| `AGENTS.md` | 17 | the new "The core" section |
| `AGENTS.md` | 19–20 | the new "The core" section |
| `AGENTS.md` | 31 | modules/git.md |
| `AGENTS.md` | 39–41 | modules/usage.md |
| `AGENTS.md` | 45–53 | modules/how-to-work.md (the aim, pillars, a question, match effort, read little; 50 KB: *large file*) |
| `AGENTS.md` | 57–62 | modules/how-to-work.md (print little, helpers pointer) |
| `AGENTS.md` | 65–75 | modules/how-to-work.md (edit in place, don't loop, one fact one place) |
| `AGENTS.md` | 79–104 | modules/how-to-work.md (descriptions, lean, split, principles over rules); modules/workshop-check.md (weekly) |
| `AGENTS.md` | 105 | modules/how-to-work.md (smallest setup) |
| `AGENTS.md` | 110–114 | modules/inbox.md (the owner's words) |
| `AGENTS.md` | 116–122 | modules/how-to-work.md (rule files state rules); floor rule 13; modules/work-flow.md (sessions) |
| `AGENTS.md` | 125–145 | modules/inbox.md; floor rule 4 (only the owner's comments answer) |
| `AGENTS.md` | 147–154 | modules/inbox.md |
| `AGENTS.md` | 156–164 | modules/work-flow.md |
| `AGENTS.md` | 166 | modules/work-flow.md (lanes) |
| `AGENTS.md` | 171–174 | modules/work-flow.md (lanes); modules/usage.md (the brake) |
| `AGENTS.md` | 190–202 | modules/git.md; modules/updates.md; floor rules 4 and 9 |
| `CLAUDE.md` | 10–30 | modules/claude.md |
| `CLAUDE.md` | 33–61 | modules/claude.md |
| `SECURITY.md` | 3–5 | floor intro |
| `SECURITY.md` | 9–22 | floor rules 1 to 3 |
| `SECURITY.md` | 29–42 | floor rules 3 and 4 |
| `SECURITY.md` | 44–48 | floor rule 4 |
| `SECURITY.md` | 57 | floor rule 6 |
| `SECURITY.md` | 59 | floor rule 6 |
| `SECURITY.md` | 70–96 | floor rules 8 and 9 |
| `SECURITY.md` | 99–114 | floor rule 10 |
| `SECURITY.md` | 117–133 | floor rules 10 and 11; reporting |
| `docs/threat-model.md` | 3–10 | floor/threat-model.md |
| `docs/threat-model.md` | 14–18 | floor/threat-model.md |
| `docs/claude-and-codex.md` | 1–84 | modules/codex.md, roles.md, helpers.md, reviews.md |
| `docs/claude-and-codex.md` | 88–175 | modules/reviews.md |
| `docs/claude-and-codex.md` | 182–199 | modules/reviews.md; manifest slot: review reference |
| `docs/claude-and-codex.md` | 203–251 | modules/reviews.md, codex.md |
| `docs/codex-building.md` | 1–16 | modules/codex-building.md |
| `docs/codex-building.md` | 34–66 | modules/codex-building.md |
| `docs/orchestrating.md` | 1–43 | modules/orchestrating.md |
| `docs/review-guidelines.md` | 4–33 | modules/review-guidelines.md |
| `docs/review-guidelines.md` | 56–63 | modules/review-guidelines.md |
| `docs/developing.md` | 1–31 | modules/github-calls.md, updates.md; floor rule 7 |
| `docs/developing.md` | 34–38 | floor rule 7 |
| `docs/developing.md` | 40–45 | floor rule 7; modules/updates.md |
| `docs/developing.md` | 50–52 | modules/updates.md |
| `docs/builder-rules.md` | 16 | modules/git.md (milestones) |
| `docs/builder-rules.md` | 19–20 | modules/workshop-check.md; modules/usage.md |
| `docs/builder-rules.md` | 5, in part; what stays: "- **Branches.** Each item gets its own branch, its own tests and its own report. Its branch comes from `develop`, or, while the item before it is still in review, from that item's PR branch, since the next item depends on the last; that branch (or `develop`, once it is merged) is merged into it before its own pull request." | the rest: the core, as the done table says |
| `docs/builder-rules.md` | 17, in part; what stays: "- **Unattended work.** The design session checks the readings taken against the pillars at each milestone, bringing the owner those that break one (archive item 19). Stop only before anything irreversible." | the rest: the core, as the done table says |

### Barkstreet Snakes (`main` at 3383ad41)

| File | Lines the core replaces | Now in |
| --- | --- | --- |
| `AGENTS.md` | 8–9 | modules/roles.md; the new "The core" section |
| `AGENTS.md` | 16 | the new "The core" section |
| `AGENTS.md` | 18 | the new "The core" section |
| `AGENTS.md` | 27 | modules/git.md |
| `AGENTS.md` | 31–32 | modules/usage.md |
| `AGENTS.md` | 39–46 | modules/how-to-work.md |
| `AGENTS.md` | 47–48 | manifest slot: large file |
| `AGENTS.md` | 49–57 | modules/how-to-work.md |
| `AGENTS.md` | 58–65 | modules/how-to-work.md (one fact, one place) |
| `AGENTS.md` | 67–78 | modules/how-to-work.md (descriptions, lean, split) |
| `AGENTS.md` | 80–81 | modules/how-to-work.md (split) |
| `AGENTS.md` | 82–89 | modules/how-to-work.md (split, principles over rules, smallest setup) |
| `AGENTS.md` | 93–104 | modules/inbox.md (the owner's words); how-to-work.md; floor rule 13; modules/work-flow.md (sessions) |
| `AGENTS.md` | 105–134 | modules/inbox.md; floor rule 4 |
| `AGENTS.md` | 135–143 | modules/work-flow.md |
| `AGENTS.md` | 146–152 | modules/work-flow.md; modules/usage.md |
| `AGENTS.md` | 190–206 | modules/usage.md; floor rule 12; modules/git.md |
| `AGENTS.md` | 209–214 | modules/git.md; modules/workshop-check.md; modules/updates.md |
| `CLAUDE.md` | 9–24 | modules/claude.md |
| `CLAUDE.md` | 26–60 | modules/claude.md |
| `SECURITY.md` | 3–5 | floor intro |
| `SECURITY.md` | 9–24 | floor rules 1 to 3 |
| `SECURITY.md` | 31 | floor rule 3 |
| `SECURITY.md` | 32–44 | floor rules 3 and 4 |
| `SECURITY.md` | 46–51 | floor rule 4 |
| `SECURITY.md` | 60 | floor rule 6 |
| `SECURITY.md` | 62 | floor rule 6 |
| `SECURITY.md` | 77–103 | floor rules 8 and 9 |
| `SECURITY.md` | 105–108 | floor rule 10 |
| `SECURITY.md` | 110–120 | floor rule 10 |
| `SECURITY.md` | 122–138 | floor rules 10 and 11; reporting |
| `docs/threat-model.md` | 3–10 | floor/threat-model.md |
| `docs/threat-model.md` | 14–18 | floor/threat-model.md |
| `docs/claude-and-codex.md` | 1–29 | modules/codex.md, roles.md |
| `docs/claude-and-codex.md` | 30–35 | manifest slots: planning design, hard work |
| `docs/claude-and-codex.md` | 36–85 | modules/helpers.md, roles.md, codex-building.md |
| `docs/claude-and-codex.md` | 98 | modules/codex-building.md |
| `docs/claude-and-codex.md` | 101–102 | modules/codex-building.md |
| `docs/claude-and-codex.md` | 103–141 | modules/codex-building.md, reviews.md |
| `docs/claude-and-codex.md` | 142–143 | manifest slot: design-checked PRs |
| `docs/claude-and-codex.md` | 144–235 | modules/reviews.md |
| `docs/claude-and-codex.md` | 236–238 | manifest slot: slop bar |
| `docs/claude-and-codex.md` | 239–287 | modules/reviews.md, codex.md |
| `docs/claude-and-codex.md` | 288–289 | manifest slot: Codex environment |
| `docs/claude-and-codex.md` | 290–304 | modules/codex.md |
| `docs/orchestrating.md` | 1–4 | modules/orchestrating.md |
| `docs/orchestrating.md` | 8–69 | modules/orchestrating.md; modules/workshop-check.md |
| `docs/review-guidelines.md` | 4–29 | modules/review-guidelines.md |
| `docs/review-guidelines.md` | 31 | modules/review-guidelines.md |
| `docs/review-guidelines.md` | 35–37 | modules/review-guidelines.md; manifest slot: slop bar |
| `docs/review-guidelines.md` | 38–46 | modules/review-guidelines.md |
| `docs/developing.md` | 25–47 | modules/github-calls.md, updates.md; floor rules 4 and 7 |
| `docs/developing.md` | 51–57 | floor rule 7; modules/updates.md |
| `docs/developing.md` | 63–67 | floor rule 7; modules/updates.md |
| `docs/developing.md` | 78–79 | modules/updates.md |
| `docs/developing.md` | 97–99 | modules/updates.md |
| `CLAUDE.md` | 25, in part; what stays: "Fable's work by name here: the writing pass (entry 9 in `docs/PROGRESS.md`)." | the rest: the core, as the done table says |
| `AGENTS.md` | 66, in part; what stays: "A design call goes into its topic file in `docs/design/`." | the rest: the core, as the done table says |
| `AGENTS.md` | 79, in part; what stays: "- Every file is also a script tag and an `sw.js` entry, so smaller is not better." | the rest: the core, as the done table says |
| `AGENTS.md` | 207, in part; what stays: "A milestone PR's line of what is new also goes at the top of `version.js`'s news." | the rest: the core, as the done table says |
| `AGENTS.md` | 208 | the core; the line's game part joins line 207 |
| `SECURITY.md` | 104, in part; what stays: "- **What ships** is the files the live site serves; its notices file is [`THIRD-PARTY-NOTICES.txt`](THIRD-PARTY-NOTICES.txt)." | the rest: the core, as the done table says |
| `SECURITY.md` | 109 | the core; the line's game part joins line 108 |
| `SECURITY.md` | 121, in part; what stays: "The audit of every licence, with which list each is held to, is `tools/licences.json`." | the rest: the core, as the done table says |
| `docs/review-guidelines.md` | 30, in part; what stays: "A mark in `tools/sizes.json` raised without its reason in the PR blocks." | the rest: the core, as the done table says |

## The owner's answers, and what changed (9 November 2026, evening)

The owner answered the three questions and the design session's evaluation in one message (core archive 76): yes to
everything it advised, and Claude alone keeps a reserve. Made in this PR by the design session:

- **#6, three safety rules into the floor:** rule 14 (stop before what cannot be undone, and at a failed safety check;
  nothing spends the owner's money without his yes), rule 15 (dependencies, where a project takes packages) and rule 16
  (the owner's share of Claude). Each game's own lists drop them at adoption: Amarna's "spending" among its own safety
  rules, its `SECURITY.md` dependency line.
- **#7, where the games differ:** each keeps its own, as the maps already say; the core keeps the workshop check's newer
  wording, and the design session updates Amarna's design document so its builder rules match.
- **#8, when the floor is read:** the floor is now two files, both floor and both taken whole. `floor/security.md`
  (6,953 bytes), read at the start of every task, holds what the floor is and the rules any task can break (1, 3, 4, 8,
  11 to 14 and 16); `floor/topics.md` holds the rules for particular work (2, 5, 6, 7, 9, 10, 15 and 17) and how to
  report a weakness, read before a task touches one. Rule 4's Dependabot exception became rule 17, so it sits with the
  update rules; every other number is unchanged. Rules are written as paragraphs ("**3. ...**"), so each file shows
  the floor's own numbers. Each game's `AGENTS.md` section above names `core/floor/topics.md` among the files read when
  needed.
- **Usage by provider** (`modules/usage.md`, floor rule 16): only Claude keeps a reserve, from about 90% of its weekly
  limit; Codex and any other provider kept for the projects is spent to its end, and where an environment can read
  every provider's usage the orchestrator spreads the work so each is spent by its reset before Claude reaches 90%;
  where usage cannot be read, one check at the start and nothing said about it. Both games took the same change at
  once in their own rule files, since the core is not adopted yet.
- **`.github/dependabot.yml`** now updates the workflow's GitHub actions weekly, a week after each release (it was
  GitHub's empty template, which fails); this repository's `SECURITY.md` says so under rule 17.

The core's floor and modules are now 67,050 bytes (64,836 before): the three new floor rules and usage by provider add
about 2.2 KB, so each game's rule files after adoption come out about 1% above today's (Amarna Letters about 95,900,
Barkstreet Snakes about 112,600). Read at the start of a session after adoption, Claude Code: Amarna Letters about 43,900 bytes (37,816 today; 49,759
before the split), Barkstreet Snakes about 35,500 (26,531 today; 41,413 before). Codex: about 39,700 and 31,300.
