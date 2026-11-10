# Nothing reviewed twice

The owner, told that each game's sync PR was being reviewed by Codex again after the same text had passed both reviews in
the core's own PR: never review twice without reason (core archive 139).

- **Floor rule 8:** a pure sync PR (its diff only the core's copy, its pin and the pins of calls to the core's
  workflows, moved forward to one commit of the core's `main`) gets no review of its own, rule 3's two included, since
  both reviews passed that code in the core's own PR (core archive 139 and 140). A later commit is reviewed only for
  what it changes.
- **`scripts/pure-sync.mjs`** proves a sync pure before its merger merges it, run from the core's own `main` (never the
  PR's copy, which the PR could change) on the sync branch's head commit: only `core/`, `core-manifest.md` and workflows
  changed; outside `core/`, each changed line differs only in the manifest's pin or a call's to a core workflow (no
  other SHA may move: Codex's P1 on 6ba3321), each moved to the new pin; the pin is on the core's `main` and not behind
  the old one; `core/` is the core's tree at the pin exactly; every call to a core workflow, the core check's own
  included, is pinned to a commit of the core's `main`. It prints the head it checked, and the merge call passes it as
  `sha` (`modules/github-calls.md`), so nothing pushed after the check merges; a pure sync never merges by auto-merge
  (`modules/orchestrating.md`). It replaces the merger's compare call, which the fallback reviewer found backwards (P1),
  and answers his P2 that nothing checked the diff itself. Tested on the Snakes sync of 6302f73 (passes) and on fifteen
  altered copies of it, each of which fails: an extra workflow line, an unmerged pin, an older pin, the pin moved back,
  a changed core file, a file outside, a new workflow, a mode change, text or trailing whitespace beside the manifest's
  pin, a NUL byte making the manifest "binary" (with and without a `binary` attribute) or beside its pin, two calls
  swapped between jobs, and another SHA in a workflow moved to the pin (the fallback reviewer's second-round P1 and P3:
  every file is diffed as text, its trailing whitespace kept, and lines pair by position within each hunk).
- **`.github/workflows/core.yml`:** the core check now also fails a pin, or a call's pin, that is not a commit of the
  core's `main` (fetched as `refs/heads/main`, so a tag named `main` can't stand in for it), for every PR, sync or not
  (Codex's P1 and the fallback reviewer's two P2s on the first round).
- **`modules/reviews.md`:** a pure sync gets no code review (the "Which" paragraph); point 6: after a fix, one
  `@codex review` for it and a security check only as point 3 says; never a draft-and-ready toggle to rerun a PR's
  reviews; a branch brought up to date with `main` without a conflict is not reviewed again.
- **`README.md`, `modules/orchestrating.md`, `scripts/sync.mjs`:** the same, for the sync PR; one that also fixes the
  project's own pointers is reviewed like any PR. `modules/work-flow.md`: a push after auto-merge is on gets its new
  commit reviewed, not the whole PR again.

What changes in every project: a pure sync PR waits only for its checks and `scripts/pure-sync.mjs`; no review reruns a pass already given.

Readings taken: none. Questions for the owner: none.
