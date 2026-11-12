# GitHub's REST calls from a cloud session

Read when a cloud session must open, mark ready, merge or inspect a PR. Claude's cloud sessions can't use GitHub's
GraphQL API, so `gh pr create`, `gh pr list`, `gh pr view` and `gh pr ready` fail there; they use these REST calls
(the `ccr/` routes are Claude's cloud proxy's, not GitHub's; `<owner>/<repo>` is the repository's own address). A
session anywhere else uses `gh pr` as it is.

```bash
gh api repos/<owner>/<repo>/pulls -f title=... -f head=<branch> -f base=main -f body=...  # add -F draft=true: a draft
gh api -X POST repos/<owner>/<repo>/pulls/<n>/ccr/ready_for_review  # mark ready (starts the security review)
gh api -X PUT repos/<owner>/<repo>/pulls/<n>/merge -f merge_method=merge  # merge (add -f sha=<head>: only that head)
gh api -X PUT repos/<owner>/<repo>/pulls/<n>/update-branch  # bring it up to date with main
gh api -X PUT repos/<owner>/<repo>/pulls/<n>/ccr/auto_merge  # auto-merge on (DELETE: off)
gh api repos/<owner>/<repo>/compare/main...<branch> --jq '.files[].filename'  # the files a branch changes
gh api repos/<owner>/<repo>/pulls/<n> --jq '{state, merged}'  # was it merged?
```
