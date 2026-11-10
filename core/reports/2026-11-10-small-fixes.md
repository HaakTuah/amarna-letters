# Small fixes after the cut-down

- **Orchestrators check before they report** (core archive 137): a yes already in the PR, a branch already deleted or
  a setting already made is never reported to the owner again (`modules/orchestrating.md`). Tonight's reports asked him
  for yeses he had given and settings he had made.
- **Auto-merge** (`modules/work-flow.md`): GitHub refuses to turn it on for a PR whose own requirements are already met,
  so the builder merges it then, once every check has passed.
- **The test box** (`setup/server.md`), the last two small findings of Amarna Letters' fallback security review on its
  #871: Node is installed without npm, and the one command that runs outside the box is exactly
  `node core/scripts/sync.mjs`, with a full SHA at most and `NODE_OPTIONS` cleared.

What changes in every project: no stale requests reach the owner; a mergeable PR merges at once.

Readings taken: none. Questions for the owner: none.
