# GitHub's REST calls from a cloud session

Read when a cloud session must open, mark ready, merge or inspect a PR, when a part of GitHub a rule needs cannot be
reached, and when who may write is read (`roles/shared/teams.md`): the kinds `cloud`, `host` and `team`. This is GitHub's
part (`tasks/hosts.md`). Claude's cloud sessions can't use GitHub's GraphQL API, so `gh pr create`, `list`, `view`
and `ready` fail there; they use these REST calls (the `ccr/` routes are Claude's cloud proxy's, not GitHub's;
`<owner>/<repo>` is the repository's own).

```bash
gh api repos/<owner>/<repo>/pulls -f title=... -f head=<branch> -f base=main -f body=... # add -F draft=true: a draft
gh api -X POST repos/<owner>/<repo>/pulls/<n>/ccr/ready_for_review # mark ready (starts the security review)
gh api -X PUT repos/<owner>/<repo>/pulls/<n>/merge -f merge_method=merge # merge (add -f sha=<head>: only that head)
gh api -X PUT repos/<owner>/<repo>/pulls/<n>/update-branch # bring it up to date with main, in its turn alone
gh api -X PUT repos/<owner>/<repo>/pulls/<n>/ccr/auto_merge # auto-merge on (DELETE: off)
gh api repos/<owner>/<repo>/compare/main...<branch> --jq '.files[].filename' # the files a branch changes
gh api repos/<owner>/<repo>/pulls/<n> --jq '{state, merged}' # was it merged?
gh api repos/<owner>/<repo>/collaborators/<login>/permission --jq '{role: .role_name, type: .user.type}' # an
  # account's right: an owner where the role is write, maintain or admin and the type User; the higher right, maintain
  # or admin
gh api repos/<owner>/<repo>/collaborators --paginate --jq '.[] | select(.type == "User" and .permissions.push) | .login'
  # the people who may write: more than one, a team's project. Claude's cloud proxy refuses these two: there the
  # *owner's account* alone is an owner (roles/shared/teams.md, "Who is an owner")
gh api 'repos/<owner>/<repo>/pulls/comments?since=<a week ago>&per_page=100' \
  --jq '.[] | select(.user.login == "<reviewer>")'  # one reviewer's findings since then, any PR's (more: &page=2;
  # those not on a line: issues/comments, the same way)
```

**What stands in when a part of GitHub cannot be reached** (#249). By default each part a rule needs
is used as its rule says. Where a session finds one out of reach (switched off, refused to its sign-in, or out of the
month's Actions minutes), it takes the stand-in named here, inside the repository, or skips that step and says so in
its PR's "Readings taken":
- issues: the inbox's files (`roles/shared/inbox.md`, `core/scripts/inbox.mjs`);
- labels: in those files, the `State:` and `By:` lines above an item's headings; on GitHub, skipped and reported;
- the daily job: the orchestrator's wake runs the look (`roles/orchestrator.md`); with no orchestrator, a
  builder session runs `core/scripts/look.mjs` at its start, which does nothing where it ran within the day;
- a review app: the next reviewer, last the fallback reviewer (`tasks/reviews.md`, point 2);
- statuses and checks: the session runs the suites and the core's checks itself, from the project's root, and its
  PR gives what they printed; the "Security review:" comment stands for the `security-review` status.

It does not mean a check guarding against harm is passed over: one that cannot run stops its step, as floor rule 14
says, and the owner is told. A check that needs a secret of the host's or a run on the host itself (the
personal-terms check first) has no stand-in: its PR waits unmerged until it passes there (floor rules 11 and
12). Reason: a project whose host lacked one part stood still where the repository could
carry it. Held by nothing yet: a part out of reach leaves no mark a check reads.
