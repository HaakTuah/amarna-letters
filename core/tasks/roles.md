# Who does what

Read at its start by the orchestrator, and when a task needs one (who takes a role, who builds a line, who reviews a
change): the kind `role`.

**The roles, by what they do:** the orchestrator starts builder sessions and hands out lines
(`roles/orchestrator.md`); a builder builds one line to its merge; the session that syncs the core moves the copy
(`roles/shared/work-flow.md`, "Sessions"); the code reviewer and the security reviewer review a PR (`tasks/reviews.md`);
the fallback reviewer takes a review no other gives; the design check, the stand-in and planning design judge or plan
against the design and the owner's words; the auditor reads what stands, changing nothing (`roles/auditor.md`).

**A file for each role** (#304). By default what a role reads at its start is the floor's `security.md`, its own file
under `roles/` and the shared files that file names on its line "Reads at its start:". Whoever writes or changes a rule
puts one that a single role needs in that role's file, and one that several roles share in one shared file their files
name, so that no rule stands in two files; a role's file says in a line each what the role hands each neighbouring role
and gets back, and nothing of how the neighbour works. It does not mean a module read by task belongs to a role (a
builder that mends a bug and one that builds a feature have one role and read different modules), nor that a session
with no file here (a helper, planning design, escalation) reads more than its brief names. Reason: every role read every
other role's rules at each start. Held by `scripts/size.mjs`, a cap for each role's start, and
`scripts/reading.mjs --check`, which fails a role's file that names no start; where a rule stands, by nothing yet.

**Tools are preferences** (#249). By default each role goes to the tool this table prefers, and,
where that tool is not at hand, to the next it names:

| Role | Preferred | When it is not at hand |
| --- | --- | --- |
| Adviser, orchestrator, the session that syncs the core | Claude | any tool the owner has |
| Builder | as "The builders" says (`roles/orchestrator.md`) | the next tool there |
| Code reviewer | a tool that cannot build here (Codex's app, then Copilot's), then a builder of a tool other than the builder's | the fallback reviewer |
| Security reviewer | Codex's app, which starts by itself (floor rule 8) | the fallback reviewer |
| Fallback reviewer | Claude | a fresh session of any tool at hand |
| Design check, stand-in, auditor, planning design | Claude | the strongest tool at hand |

- Where a project's manifest has a table under "Tools", each row it holds replaces the default's for that role; a row
  it lacks keeps the default's, save what the record is read for (#481): with no "Builder" row, the tools that built
  the last merged PRs come first, most first, and a tool the record shows reviewing is at hand, both as
  `scripts/tools-read.mjs` prints them.
- A tool is not at hand where it is not installed or set up for the project, its usage window is spent, or it gives no
  sign as `tasks/reviews.md`, point 2, says. Whoever hands out the role (the orchestrator, or the session that needs
  the review) takes the next.
- It does not mean that any tool is refused a role: a preference orders and never refuses, and a project with one tool
  runs every role with it. Nor does it mean that a session judges what it wrote (below).
- Reason: where only one tool might take a role, the work stopped when that provider's usage ran out, and an owner
  with another tool alone could fill none.
- Held by nothing yet: which tool took a role leaves no mark a check reads.

**No session reviews its own work:** the session that reviews a change is never the session that wrote it. It does not
mean a second tool is needed: a fresh session of the same tool serves. Reason: a reviewer that wrote the change reads
its own intent instead of the diff. Held by nothing yet: builder and reviewer post under one login (#187).

**The rules name tiers, never a model** (#467). By default a rule names the tier a job takes, with its effort:

| Tier | Its jobs | Effort |
| --- | --- | --- |
| Strongest | the main lane, design readings and the *hard work*, the orchestrator, the adviser, the fallback reviewer, the design and leanness checks, the stand-in, the auditor, a choice's challenger, blind picker and judge, escalation's first step, a helper that needs design judgement | high |
| Middle | routine lanes (polish, docs, splits, tests) and parallel helpers (`tasks/helpers.md`) | high for a builder; a helper medium, high for the hard work |
| Light | search | low |
| Scarce top | planning design, escalation's last step, work the owner gives it by name | high |

Each tool's part maps the tiers to its models, with the day its documentation was read; where it offers several
providers', the owner's preference decides, else the models that passed the staged cases. With no map, or a mapped
model gone, whoever starts the session picks by the jobs, or takes the tool's automatic choice, and the PR says which
tool, model and effort built it. It does not mean the models are equal, that one provider is preferred by rule, or that
a session picks its own. Reason: a running session can seldom change its model, and one left to choose takes the
strongest, which the owner's usage pays for. Held by `scripts/general.mjs` and `scripts/tools-offer.mjs`; what built
a PR, by nothing yet.

**Planning design** is asked at most once per task (its PR says when it was), when it needs a new or better plan.

**Escalation:** what has beaten a builder twice may go to a fresh solver; the builder applies and checks the answer.
