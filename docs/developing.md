# Developing Amarna Letters

For builders: GitHub's REST calls, Dependabot and CodeQL. The commands for running and checking the game are in
`AGENTS.md`, "Commands"; the rules for branches, merges and milestones are in its "Git and GitHub".

## GitHub: the REST calls, Dependabot and CodeQL

Claude's cloud sessions can't use GitHub's GraphQL API, so `gh pr create`, `gh pr list`, `gh pr view` and `gh pr ready`
fail there, and they use the REST calls below (repository `HaakTuah/amarna-letters`). Where GraphQL works,
`gh pr ready <n>` marks a draft ready; the `ccr/ready_for_review` route below is Claude's cloud proxy's, not GitHub's
REST API.

```bash
gh api repos/HaakTuah/amarna-letters/pulls -f title=... -f head=<branch> -f base=develop -f body=...  # add -F draft=true for a draft
gh api -X POST repos/HaakTuah/amarna-letters/pulls/<n>/ccr/ready_for_review                           # mark a draft ready, in Claude's cloud sessions (starts the security review)
gh api -X PUT repos/HaakTuah/amarna-letters/pulls/<n>/merge -f merge_method=merge                     # merge into develop
gh api repos/HaakTuah/amarna-letters/compare/develop...<branch> --jq '.files[].filename'           # the files a branch changes
gh api "repos/HaakTuah/amarna-letters/pulls?state=all&base=main&head=HaakTuah:develop" --jq '.[0] | {number,state,merged_at}'  # the last milestone PR: merged_at set means merge main back into develop first
gh api repos/HaakTuah/amarna-letters/pulls -f title=... -f head=develop -f base=main -f body=...       # the milestone PR
```

**Dependabot's security PRs** are the one other way into `main`, under the five conditions in `SECURITY.md`, point 4.
**The newest version, unless there is a reason** (archive item 219), so fixes, security fixes above all, are always one
small step away, and small steps stay cheap. Every package is held at an exact version in its `package.json` and the
lock file, never a range, and moves to the newest stable release once that is a week old, so a bad or hijacked release
is usually pulled first. Updates are upkeep, not ideas: they wait for no queue entry and no word from the owner, except
where `SECURITY.md`, point 3, asks for his yes (`.github/`, the setup script, and what ships to players, below).
Dependabot's version updates (`.github/dependabot.yml`: weekly, minor and patch grouped) come as PRs into `develop`,
merged under `SECURITY.md`, point 4: the next free lane takes one as an ordinary small PR, runs the checks, gets its
code review, reads the release notes for breaking changes, and merges it, with the licence gate (`SECURITY.md`, point
10) checking it on its own. A new major version of a tool is its own PR, with the smoke test of the built app as well.
**What ships to players** (the packages bundled into the built app, and everything that builds it: Vite, its plugins and
what they pull in, such as Rollup and esbuild) is prepared the same way but merged only on the owner's yes in its PR,
since no check a builder can run proves that a release's code is harmless. The PR gives him what that yes needs, for
each such package: the same publisher and repository as the version before, and npm's provenance naming the same
repository if the version before had it; npm's registry signature verified (`npm audit signatures` after an install with
`--ignore-scripts`, or, where that cannot reach Sigstore, the signature over `name@version:integrity` checked against
the key of the same id at `https://registry.npmjs.org/-/npm/v1/keys`); and the package's diff from the old version (`npm
diff`) read against the release notes, naming anything they do not explain, such as a new address it contacts or code it
builds from text. `npm ci` then installs exactly the bytes the lock file names. A check that cannot be run, or one that
fails, is said in the PR, never skipped. One is held back only for a reason: it breaks something, runs or loads worse,
changes its licence, or its project is abandoned or changes hands. The reason is written in the closed PR and in an
issue that stays open until the reason is gone.

**Node's version.** A new major of `@types/node` is the cue to move Node itself: an even-numbered Node that is
long-term support (from its October) moves CI's `node-version` and `scripts/cloud-setup.sh` in the same PR, with the
types and the full suites; an odd one is closed with that reason.

**CodeQL checks every PR** into `develop` and `main`, every push to them and once a week (`.github/workflows/codeql.yml`).
A finding on a PR shows on it as a note; what to do with it is in `SECURITY.md`, point 9. Alerts already in the
code are the owner's to pass on (`SECURITY.md`, point 9).
