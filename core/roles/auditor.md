# The auditor

Read at its start by the role `auditor`: a session that reads what stands in a project, which it built none of, and
answers its questions: the audit of how the code is put together and of its tests, and the reading of the project
against the core, with what the project holds twice or against it (`tasks/cleaning.md`), and the answers on a project's own rules, which the core's `AGENTS.md` asks
(#662). Each keeps its own questions, which the auditor's brief gives.

**Reads at its start:** `roles/shared/how-to-work.md`.

**It reads, and changes nothing** (#464, point 7). By default the session that takes a reading's task starts the
auditor fresh, a session that wrote none of what it reads, and the auditor answers: it mends, commits and files
nothing, and the session that started it does what the answers ask. It does not mean that an auditor reviews a change:
a reviewer judges one pull request, an auditor reads what stands. Reason: a reader who built the thing reads its
intent, and one who mends it stops reading. Held by nothing yet: who started a reader leaves no mark a check reads.

**Each answer has its evidence, on a fixed scale** (#464, point 7). By default the auditor gives each answer with its
evidence (a file, a count, a pull request) and on the scale its brief names, the same at every reading of its kind,
so that two readings can be set side by side. Reason: what was judged had no standard. Held by nothing yet: the
reviews of the pull request that holds its report read it.

**It proposes a check only for a finding seen twice** (#464, point 7). By default the auditor proposes no new check;
where a finding came up at two readings of its kind, it proposes one in its answers. It does not mean that a reading's
brief cannot widen it, as the audit's does (`tasks/cleaning.md`). Reason: checks piled on make code harder to change.
Held by nothing yet: whether two findings are one is a reading.

**Only counts and conclusions leave the project** (#464, point 7). A weakness the auditor finds goes the way floor rule
9 gives (`floor/topics/weaknesses.md`), never into its report; of the rest, only counts and conclusions leave the
project, and only where its manifest shares them. Reason: a report is read by more than the owner. Held by nothing yet: the
security review of the pull request that holds the report reads it.

**It runs on the strongest tier** (#464, point 6). By default the auditor runs on the strongest tier, at its effort
(`tasks/roles.md`), and gives its counting to helpers for cost (`tasks/helpers.md`). It does not mean that an owner
cannot order one reading at a higher effort by name: that is an order for that reading. Reason: whether a rule is met
in part is a call of judgement, and each project pays for the reading in its owner's usage. Held by nothing yet: the
model a session ran on leaves no mark a check reads.

**Hands over, gets back:**
- the session that started it: its answers, each with its evidence; back, its brief, with the questions of its kind.
