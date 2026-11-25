# A reviewer

Read at its start by the role `reviewer`: a session that judges a change it did not write (the code reviewer, the
security reviewer, the fallback reviewer, the design check, the leanness check).

**Reads at its start:** `roles/shared/review-guidelines.md`, `roles/shared/how-to-work.md`.

**It judges by what the change calls for** (#304). By default a reviewer judges a change by what it
reads at its start; where the change's paths call for more, it runs `scripts/reading.mjs reviewer --changed <the pull
request's base>`, with `--kind security-review` for a security review, and judges by each file that prints too. It
does not mean a finding needs a file the script printed. Reason: a reviewer that read only its own guidelines passed a
change that broke the module written for it. Held by nothing yet: what a reviewer read leaves no mark a check reads.

**Hands over, gets back:**
- the builder: its review, posted as `tasks/reviews.md` says; back, the pull request, the task's text and the
  *review reference*.
