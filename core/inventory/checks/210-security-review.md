- `.github/workflows/security-review.yml`, `.github/workflows/own-security-review.yml`,
  `.github/workflows/queue-only.yml`, `scripts/security-review.mjs`, `scripts/code-review-wait.mjs`,
  `scripts/review-marks.mjs`, `scripts/clean-merges.mjs`, `scripts/power.mjs`, `scripts/pure-sync.mjs`, `scripts/comment-only.mjs`, `scripts/comment-only-stage.mjs`,
  `scripts/queue-only.mjs`, `scripts/security-review-host.mjs`, `scripts/security-review-record.mjs`,
  `tests/security-review-workflow-test.mjs`, `tests/security-review-record-run-test.mjs`, `tests/comment-only-run-test.mjs`: give each pull request's
  head the statuses that say whether its security review has run and a running code review has finished, prove a sync
  pure or a pull request queue-only, read which later commits touch nothing that runs with power, and compare the status with the host's own record of reviews and rights (#626).
  *Runs:* the runners, with the host's statuses, and the recorder by hand or at the core's monthly state report.
  *Else:* the host's required reviews, dropped on fact: they wait for a person's approval;
  hosted review bots, dropped on fact: paid on a private repository, and a hosted product (#534, point 6). *Bugs:* 5,
  2, 0 and 3, and 3 naming the workflow. **Keep:** nothing fits; the reviews are maintained tools already, and these
  hold only the core's policy on them.
  *Tried:* 20 November 2026 (#627), the host's ruleset setting `required_review_thread_resolution` beside the status,
  read, never switched on (it is false on `main`, and the owner's to change): it holds a merge while any thread of a
  review's line comments stands unresolved, whoever resolves it, and reads nothing else. Of the 97 pull requests last
  merged, from #612 to #911, their threads read on 20 November, 17 merged with 60 threads unresolved. 8 were Codex's
  security findings: 6 on lines changed since, and 2 (#759, #861) answered, a review posted after each as the status
  reads; so it would have held no finding the status passed, and asked a resolve on 17 merges. What it reads that no
  status does is the code review's line findings: 52 unresolved, 45 on lines changed since; of the other 7, 5 answered
  in their thread, one (#769) in the pull request's comments, and one, on #757, in neither. It cannot hold a finding
  given only in a review's body, which makes no thread; a review that has not finished, before its thread stands; any
  private repository on GitHub's free plan, which has no rulesets; nor who settled a finding, since a resolve leaves no
  text and any writer may make it, the author too where one login posts both the change and its review. *Replayed:*
  #239 not read: its fix's cases (#291) hold a review posted before Codex's running one began, where no thread stands
  yet; #251 not read: its fix's cases (#292) hold an open finding with none among the comments, so no thread; #293 not
  read: its fix's cases (#295) hold a newer finding in a review's body after a found one, and the setting holds only
  the found one's thread, until anyone resolves it; #395, #403 and #632 not run (their cases lie in the status's own
  words and its reads of the host, which the setting does not take over). The verdict stands, the setting left off on
  measure: it reads none of the status's bugs, and held nothing on those 97 that the status missed.
