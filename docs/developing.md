# Developing Amarna Letters

For builders: GitHub's REST calls, Dependabot and CodeQL. The commands for running and checking the game are in
`AGENTS.md`, "Commands"; the rules for branches, merges and milestones are in its "Git and GitHub".

## GitHub: the REST calls, Dependabot and CodeQL

Cloud sessions can't use GitHub's GraphQL API, so `gh pr create`, `gh pr list`, `gh pr view` and `gh pr ready` fail.
Use the REST API (repository `HaakTuah/amarna-letters`):

```bash
gh api repos/HaakTuah/amarna-letters/pulls -f title=... -f head=<branch> -f base=develop -f body=...  # add -F draft=true for a draft
gh api -X POST repos/HaakTuah/amarna-letters/pulls/<n>/ccr/ready_for_review                           # mark a draft ready (starts Codex's security review)
gh api -X PUT repos/HaakTuah/amarna-letters/pulls/<n>/merge -f merge_method=merge                     # merge into develop
gh api "repos/HaakTuah/amarna-letters/pulls?state=all&base=main&head=HaakTuah:develop" --jq '.[0] | {number,state,merged_at}'  # the last milestone PR: merged_at set means merge main back into develop first
gh api repos/HaakTuah/amarna-letters/pulls -f title=... -f head=develop -f base=main -f body=...       # the milestone PR
```

**Dependabot's security PRs** are the one other way into `main`, under the five conditions in `SECURITY.md`, point 4.
**Its version updates** (`.github/dependabot.yml`: weekly, grouped, each release a week old) aim at `develop` and are
ordinary small PRs: the next free lane takes one, runs the checks, gets Codex's review, reads the release notes for
breaking changes, and merges it, or closes it with the reason.

**Node's version.** A new major of `@types/node` is the cue to move Node itself: an even-numbered Node that is
long-term support (from its October) moves CI's `node-version` and `scripts/cloud-setup.sh` in the same PR, with the
types and the full suites; an odd one is closed with that reason.

**CodeQL checks every PR** into `develop` and `main`, every push to them and once a week (`.github/workflows/codeql.yml`).
A finding on a PR shows on it as a note; what to do with it is in `AGENTS.md`, "Git and GitHub". Alerts already in the
code are the owner's to pass on (`SECURITY.md`, point 9).
