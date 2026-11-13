# Copilot's part

Asking Copilot's code review, unless the ruleset does: `gh api -X POST
repos/<owner>/<repo>/pulls/<n>/copilot-code-review`. It marks nothing blocking: what "What blocks" in
`modules/review-guidelines.md` names does. Its login is read from a review it gave (`.user.login` under
`pulls/<n>/reviews`).
