# Two security reviews in place of the owner's yes

The owner was asked for a yes on a game's PR that moved its test browser (Playwright) to the locked version: something
that touched nothing of his, asked only because it changed the cloud setup script and gave a workflow a new
permission. His yes there guarded nothing he could judge better than the reviews (core archive 138).

- **Floor rule 3:** his yes is needed only for a change to the floor or the review guidelines. A change to what runs by
  itself or with credentials (`.github/`, `.claude/`, the cloud setup and status line scripts, the credentialed GitHub
  calls) passes two security reviews instead, Codex's and the fallback reviewer's, neither of which wrote it; an
  action's pinned version alone keeps Dependabot's rule. This also answers Codex's point on the cut-down (Amarna
  Letters' #879) that a change to the steps of a job that already writes merged on one review.
- **`modules/reviews.md`, point 3:** such a PR gets both reviews over the whole diff, and both must pass.
- **`modules/work-flow.md`, point 1:** auto-merge waits until both reviews are clean on the head commit (Codex's
  code review found that it waited for Codex's alone).
- **`modules/inbox.md`** lists what still waits for him: a step that cannot be undone or costs money, a change to the
  floor or the review guidelines, and rule 10's licence exception.
- **`modules/orchestrating.md` and `scripts/sync.mjs`:** a sync PR needs no new yes (one given on the core's PR carries
  over), and a moved workflow call gets the two reviews.
- **The fallback reviewer's brief** is point 7 of `modules/reviews.md` again, where Amarna Letters' review guidelines
  point to it; the cut-down had left it unnumbered, and that game's new pointer check found the broken pointer.

What changes in every project: no PR asks the owner about workflows or the cloud setup again; those PRs get a second,
independent security review instead.

Readings taken: none. Questions for the owner: none.
