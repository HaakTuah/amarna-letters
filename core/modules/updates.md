# Updates: Dependabot, CodeQL and Node

How packages, tools and Node are kept current. Read when a task takes an update; its safety rules: floor rules 7, 15
and 17.

**The newest stable version, unless there is a reason** (core archive 65). Updates are upkeep: they wait for no queue
entry. Dependabot's version updates (weekly, grouped) come as PRs under floor rule 17 (core archive 37). A new major
version is its own PR, with the *major version checks*. One is held back only for a reason (it breaks something, runs
worse, changes its licence, or its project is abandoned or changes hands), written in the closed PR and an open issue.

**Node:** CI and the cloud machines run the same Node, the exact version in the core's `.node-version`: CI's setup-node
reads it (`node-version-file: core/.node-version`), and every project's cloud setup runs `scripts/node.sh`, which holds
its checksums. When a new even-numbered Node becomes long-term support, both move to it, proven by the full suites
(core archive 39).

**CodeQL checks every PR** into `main`, every push to it and once a week; a finding is handled as floor rule 9 says.
