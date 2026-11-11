# The second audit's findings in the core

A second independent audit of the core and both games ran after the first audit's fixes had merged. It scored the
work 9/10, with five small findings. Two of them were in the core:

- **`.github/ISSUE_TEMPLATE/feature_request.md`:** `scripts/versions.mjs` writes its issues under the Feature request
  template's headings, one of them "Why it matters, and a rough cost", which the core's own template lacked; the core
  runs that check on itself. The heading is added, as `modules/inbox.md` asks every issue to say why it matters. The
  templates otherwise stay the stock ones the lean pass kept (`reports/2026-11-10-lean-pass.md`).
- **`SECURITY.md`, rules 5 to 15:** it listed the tools the core takes and their licences a second time, and had
  drifted from the audit, which also holds the GitHub CLI, jq, npm and the CodeQL CLI. It now points to the audit,
  `.github/licences-audit.json`, and keeps only what it adds: how Node is fetched and checked.

What changes in every project: nothing; both are the core's own files.

The other three findings are each a game's own, fixed in that game's PR.

Questions for the owner: none.
