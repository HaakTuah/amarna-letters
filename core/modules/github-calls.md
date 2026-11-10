# GitHub's REST calls from a cloud session

Read when a cloud session must open, mark ready, merge or inspect a PR. Claude's cloud sessions can't use GitHub's
GraphQL API, so `gh pr create`, `gh pr list`, `gh pr view` and `gh pr ready` fail there; they use these REST calls
(`<repo>`: the repository's name). Where GraphQL works, `gh pr ready <n>` marks a draft ready; the
`ccr/ready_for_review` route is Claude's cloud proxy's, not GitHub's REST API.

```bash
gh api repos/HaakTuah/<repo>/pulls -f title=... -f head=<branch> -f base=main -f body=...     # add -F draft=true: a draft
gh api -X POST repos/HaakTuah/<repo>/pulls/<n>/ccr/ready_for_review                           # mark ready (starts the security review)
gh api -X PUT repos/HaakTuah/<repo>/pulls/<n>/merge -f merge_method=merge                     # merge
gh api -X PUT repos/HaakTuah/<repo>/pulls/<n>/update-branch                                  # bring it up to date with main
gh api repos/HaakTuah/<repo>/compare/main...<branch>    --jq '.files[].filename'             # the files a branch changes
gh api repos/HaakTuah/<repo>/pulls/<n> --jq '{state, merged}'                                 # was it merged?
```
