# The orchestrator turns scheduled checks back on

**What:** on every wake, the orchestrator turns back on any scheduled workflow GitHub switched off for want of
activity (`gh workflow enable`).

**Why:** in a public repository, GitHub switches off scheduled workflows after 60 days without activity: the monthly
versions check, the weekly CodeQL scan and any other scheduled check stop silently while a project rests. The tools that
prevent it either commit to `main` on a timer (floor rule 12 forbids it) or need a personal access token with write
access to Actions kept as a secret, a standing credential for a small gain. A project that rests has no orchestrator
running either, so the first wake when work resumes turns them back on, with the session's own access. Asked for by
the owner in the design session ("fix all of it, expertly!", on the list of what would break if the setup froze).

**What it changes in every project:** `modules/orchestrating.md` only.
