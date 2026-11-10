# Updates: Dependabot, CodeQL and Node

How packages, tools and Node are kept current, and what GitHub's checks do. Read when a task takes an update. The
safety rules every update keeps: floor rules 7, 15 and 17 (`floor/topics.md`).

**The newest stable version, unless there is a reason** (core archive 65), so fixes, security fixes above all, stay one
small step away. Updates are upkeep, not ideas: they wait for no queue entry and no word from the owner but floor rule
3's yes. Dependabot's version updates (weekly, grouped) come as PRs, handled under floor rule 17 (core archive 37). A
new major version is its own PR (out of its group), with the *major version checks*. One is held back only for a
reason: it breaks something, runs or loads worse, changes its licence, or its project is abandoned or changes hands; the
reason is written in the closed PR and in an issue (the update's own, if it came as one) that stays open until the
reason is gone.

**Node's version.** CI and the cloud machines run the same Node, so a check that passes in a session passes in CI. Each
October (or at the cue the project names, such as a new major of the Node types, core archive 39), when a new
even-numbered Node becomes long-term support, both move to it in one PR (CI and `scripts/cloud-setup.sh`), proven by the
full suites; an odd-numbered one is not taken.

**CodeQL checks every PR** into `main`, every push to it and once a week; a finding on a PR is handled
as floor rule 9 says.
