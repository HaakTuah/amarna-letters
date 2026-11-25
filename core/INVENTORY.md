# The core's parts, and what else does each

The inventory of #534, point 4: a line for each part of the core, saying what it does, where it must run, what else does
it, and a verdict. It grows the inventory of #486, point 10 (`CHOICES.md`, "Choice: one parser, tree-sitter, carried in
the copy, reads every language's structure", its list "What is written by hand today"), which weighed the readers inside
the checks and stays the word on them: a line here points to it where a part holds such a reader, and weighs the whole
part. It lists too, under a heading of its own, what the core lacks that a maintained tool gives at once, first a
general linter for its own scripts. Each part's line stands in a file of its own under `inventory/`, in the folder its
heading names, so that two pull requests that add a part never edit the same lines (#750, point 1); a new one is named
to stand between its neighbours (`NNN-<name>.md`), and `node scripts/inventory.mjs` reads the inventory whole.

It decides nothing by itself. A **replace** or a **try** becomes a line of `QUEUE.md` only on the owner's word, and is
built as `AGENTS.md`, "A part of the core gives way to what is maintained", says: its comparison, old against new, in a
pull request of its own, in that rule's order.

Weighed whole: 2026-11-17

Challenged whole: 2026-11-17, by a session that wrote no part of it ("The challenge", below; #534, point 13)

**How a line reads.** The part's files, then what it does: before its first colon, the files it claims, a folder by its
path ending in `/`, and a script's line its test (`tests/<its name>-test.mjs`) too. Every file git tracks is claimed by
a line, or lies under a path "What the inventory leaves out" names with the reason, as its check reads (#593, point 2).
*Runs:* where it must run: in a session's hook, in any session, on the host's runners, on the owner's own computer;
where a check that may decide a pull request runs is `AGENTS.md`'s "A tool that only runs is fetched at set-up, as its
own program". *Else:* what else does the job, found on the web and in the registries on 17 November 2026, each kept or
dropped in a few words, a drop marked as a fact, as a measure, or as an assumption to measure (`tasks/choices.md`, "a
drop says whether it rests on a fact"). A verdict or a candidate the challenge changed was agreed by the owner on 18
November 2026 ("The owner's word on the challenge", below). *Bugs:* the issues labelled `bug` that name the part's
files, of the 61 so labelled. A trial of a tool in its place run from 18 November 2026 on is recorded on the line as
*Tried:*, with *Replayed:* saying by number which of the part's bugs the tool reads and which it does not
(`tasks/choices.md`, "A trial of a maintained tool replays the part's past bugs"; #593, point 7); the trials of 17
November below came before that rule and replayed none. Then the verdict: **replace** where a maintained tool does the
job at the same level or better, the comparison to be shown when it is made; **try** where only a trial can tell;
**keep**, with the exception of #486, point 6, it rests on: small and stable, nothing fits, fitting costs more than
keeping, or it brings too much. A part that gives way keeps what `AGENTS.md`, "A part of the core gives way to what is
maintained", keeps the core's own.

**Trials of 17 November 2026,** each in a scratch folder outside the repository, at one exact version, with install
scripts off, nothing committed, as the owner allowed for #486's trial on 16 November:
- *Mutation:* StrykerJS 10.1.1 (its command runner, which starts any command) against `scripts/mutate.mjs`, each given
  one script and its one test. `scripts/mend.mjs`: Stryker 32 faults, 3 survived, 2 s; the core's 4, none survived,
  under 1 s. `scripts/core-path.mjs`: Stryker 211 faults, 63 survived, 118 s; the core's 24, 4 survived, 31 s. Stryker
  installed 176 packages, 65 MB, and writes the report `scripts/strength.mjs` already reads.
- *Copies:* jscpd 5.4.3, one program of 47 MB for each system with no package of its own, over the scripts and the rule
  files in 0.2 s, against `scripts/copies.mjs` in 1 s. At 8 lines it found 2 copies of code, both in tests, where the
  core's check notes 9 runs alike once names are set aside and fails none; over the rule files' prose at 12 tokens it
  found 8 copies where the core's check, at 12 words, finds none. The definitions differ, which point 3 of #534 settles.
- *Workflows:* zizmor 1.32.0, offline, over `.github/workflows/` in 0.1 s: 4 findings of kinds the core's check does not
  read (a trigger it counts as dangerous, a checkout that keeps its credentials, a call it would write another way),
  each for the replacement to judge, and a key given twice refused as a file it cannot read.

## The checks on a pull request

Its parts stand in `inventory/checks/`, a file each, read in the order of their names.

## The tests and the strength of the tests

Its parts stand in `inventory/tests/`, a file each, read in the order of their names.

## Jobs on a schedule or by hand

Its parts stand in `inventory/jobs/`, a file each, read in the order of their names.

## Hooks and set-up

Its parts stand in `inventory/hooks/`, a file each, read in the order of their names.

## Mechanisms

Its parts stand in `inventory/mechanisms/`, a file each, read in the order of their names.

## What the core lacks that a maintained tool gives at once

Each weighed as a tool that only runs (#534, points 4 and 5), with the same verdicts: **try** where a trial decides
whether it comes in, **keep** where the core stays without it, with the exception it rests on. Tried on 17 November 2026
as the trials above were, over the scripts on `main` that day (36,896 lines of JavaScript and shell, tests included).

Its parts stand in `inventory/lacks/`, a file each, read in the order of their names.

## What the inventory leaves out

What is no part of the core, each with why; every other tracked file is claimed by a line above (#593, point 2).

- `floor/`, `roles/`, `tasks/`, `tools/`, `README.md`, `AGENTS.md`, `CLAUDE.md`, `SECURITY.md`, `.agents/rules/core.md`,
  `.kiro/steering/core.md`: the rule text, and the entry files that pull it into each tool, read as content; weighed as
  one mechanism above, "The rule text", whose form is #534's.
- `modules/`: the pointers left at the rules' old paths, each naming where its file now stands, until the second release
  after 16 November 2026 (`README.md`).
- `setup/owner-guide.md`, `setup/server.md`, `setup/starter-kit.md`: guides for the owner and for a project's set-up,
  read as content.
- `.github/ISSUE_TEMPLATE/`: the core's own issue forms and `config.yml`, the setting with which the host offers them:
  text a person or a session fills, weighed as the starter kit's forms are, on its line above.
- `CHOICES.md`, `choices/`, `INVENTORY.md`, `inventory/`, `reports/`: records of work done and choices made, which the parts
  above read and none of which runs.
- `archive/`, `words/`: the archive of the owner's decisions and, in this repository alone, the owner's words.
- `LICENSE`, `NOTICE`: the core's licence and its holder's notice, which the holder alone writes (floor rule 11).

## The challenge (#534, point 13)

A fresh session that wrote no part of the inventory read it whole on 17 November 2026, searched the web and the
registries for a tool it missed, took each of the seven drops that rested on an assumption, and weighed what the
inventory did not list: what the starter kit holds, the owner's steps on the host's account, a standard definition of a
session's environment, and the scripts a session runs by hand, which no workflow or hook names. What it found stands in
each line above, marked "found by the challenge" or "weighed by the challenge"; the twelve verdicts the owner agreed to
stand as they were.

`Looked for:` tools for each part, by the part's job, on the web and in the npm, NuGet and Go registries; found and
weighed, each in its line: TruffleHog again, ghalint and poutine, npm's `min-release-age`, updatecli, textlint,
promptfoo again, `claude plugin eval`, each tool's rule files for paths, aqua and mise again, git's own hooks and the
adapters that write one hook into each tool's form, the host's template repositories and issue forms, the host's ruleset
JSON, the Probot Settings app, safe-settings, Terraform and OpenTofu, ghset, the Dev Container standard, ccusage, and
the host's CLI for labels.

The seven drops, each now on a fact or a measure:

1. Danger JS: the assumption held, on a measure (86 packages, the rules written again).
2. TruffleHog: measured wrong; its live check turns off, and offline it found two things gitleaks did not. Proposed.
3. dotnet-project-licenses: now a fact (no release since November 2022).
4. Vale and alex: Vale matched the lists as well and moves no upkeep (a measure); alex unmaintained since 2023 (a fact).
5. promptfoo: measured wrong; its releases slowed and go on, its newest still naming Claude's and Codex's SDKs.
   Proposed.
6. A formatter: the assumption held, on a measure (two-fifths of the lines rewritten, all but one file touched).
7. markdownlint: the assumption held, on a measure (one fault in 3,215 findings).

The trials ran as the inventory's did: in a scratch folder outside the repository, at one exact version released two
weeks before or more where one was, with install scripts off and nothing committed; the key and the term planted were
fake, built when the trial ran. The programs came from the Go and npm registries, since this session's network refused
the host's release downloads.

### The owner's word on the challenge

The challenge left seven proposals here. On 18 November 2026 the owner agreed to all seven, and changed the fetcher's
trial, in words the orchestrator passed on:

> 5. #534: the inventory challenge's seven proposals are all agreed. The fetcher trial changed: a registry's own lock
> file is the first candidate, which #654 now makes the rule; aqua or mise only for what no registry carries.

Each now stands on its part's line above and in the order below:

1. TruffleHog joins the comparison of the personal-terms check's replacement, beside gitleaks or Betterleaks, run only
   with `--no-verification` and `--no-update`, offline, as the trial ran it.
2. ghalint and poutine join the comparison of the workflow check's replacement, beside zizmor and actionlint.
3. promptfoo joins the trial of a harness under the staged cases, beside Inspect AI and Harbor.
4. The trial of the skill format (#534, point 8) weighs each tool's own rule files for paths too, and uses
   `claude plugin eval` for Claude Code's part.
5. The fetcher of the tools that only run (`scripts/node.sh`, as `AGENTS.md`'s "A tool that only runs is fetched at
   set-up, as its own program" widens it): **try** a registry's own lock file first, for each tool a registry carries
   (#654), and aqua or mise only for what no registry carries, mise through only its backends that check a download
   against its digest (aqua, github and http), never asdf's or vfox's (floor rule 15).
6. The owner's steps on the host's account: **try** the rulesets of `README.md` kept as the host's own JSON, applied
   with one command, a new line.
7. What a session runs by hand: **try** ccusage under the cost line (`scripts/session-cost.mjs`), a new line.

## What the verdicts ask, in #534's order

The owner agreed to all twelve on 17 November 2026, and to the challenge's seven on 18 November 2026, each a line of
`QUEUE.md` of its own or a widening of the line it belongs to.

1. The tools that only run: **replace** the matching of `personal-terms.yml` with gitleaks or Betterleaks; **replace**
   `scripts/workflows.mjs` with zizmor and actionlint; **replace** `scripts/mutate.mjs` with Stryker; **try** a link
   checker, offline, under `scripts/pointers.mjs`; **try** jscpd under `scripts/copies.mjs`; **try** a harness under the
   staged cases; and of what the core lacks, **try** a general linter for its scripts (oxlint, then Biome), ShellCheck
   with actionlint, and knip after the linter. The challenge's seven widen these: TruffleHog beside gitleaks, ghalint
   and poutine beside zizmor and actionlint, promptfoo in the harness's trial; and they add, ahead of the first such
   tool, the **try** of its fetcher, a registry's own lock file first (#654), and the **try**s of the rulesets as the
   host's JSON and of ccusage under the cost line.
2. The reading under the package checks: **replace** with `npm sbom`; **try** nuget-license and the SDK's own list.
3. The packages, installed from the core's lock file (#654): as #486's inventory and #519's path have them.
4. The form the rules are delivered in: **try** the skill format (#534, point 8), weighing each tool's own rule files
   for paths too, with `claude plugin eval` for Claude Code's part.
