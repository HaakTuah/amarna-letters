# Updates: Dependabot, CodeQL and Node

Read when a task takes an update; its safety rules: floor rules 7, 15 and 17.

**The newest stable version, unless there is a reason** (core archive 65). Updates are upkeep: they wait for no queue
entry. Dependabot's version updates (weekly, grouped) come as PRs under floor rule 17 (core archive 37); what it cannot
see, listed where each is written, the core's versions workflow checks monthly, an `enhancement` issue for each one
behind. A new major version is its own PR, with the *major version checks*. One is held back only for a reason (it
breaks something, runs worse, changes its licence, or its project is abandoned or changes hands), written in the closed
PR and an open issue.

**Node** runs the core's scripts in every project: CI and the cloud machines run the exact version in the core's
`.node-version`: CI reads it, and a cloud setup runs `scripts/node.sh`, which holds its checksums. When a new Node
becomes long-term support, both move to it, proven by the full suites (core archive 39).

**CodeQL,** where the repository has it, checks every PR into `main`, every push to it and once a week; a finding is
handled as floor rule 9 says.
