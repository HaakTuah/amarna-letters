# The floor, by topic: alerts and weaknesses

Read before a task takes up a security alert or a weakness, and by a security review: the kinds `alert` and
`security-review`.

**9. Security alerts and reported weaknesses.**
- The Security tab's alerts are seen only by the owner; no agent gets a token to read them; the owner passes on what
  needs fixing.
- **In a PR's own change:** a blocking finding holds the merge until fixed; any other is fixed in the PR, or filed and
  fixed next if it lies outside the change.
  - A CodeQL false alarm, explained in the PR and confirmed by its security reviewer, may merge, with no suppression
    comment; where the ruleset blocks on it, the owner dismisses it.
- **In merged code, if it reaches what the threat model protects:** reported privately (an agent: as "Reporting a
  weakness" says, never in a file, PR, issue or comment) and fixed first, in a PR that says what it hardens, never how
  to attack it.
- **Any other weakness in merged code:** a `bug` issue, fixed with priority.
- **Secret scanning with push protection is switched on** in each repository that has it (floor rule
  1): at the sync that brings this, and when a repository is made, in a public repository, where GitHub gives it free, a
  session whose sign-in may change the repository's settings switches it on; otherwise it files an issue for the owner,
  labelled `needs-owner`, naming the setting, and nothing waits on it.
  - Not meant: a session switching on what may be billed (a private repository's, sold per committer; floor rule 14),
    or a repository without it waiting or failing anything. Reason: GitHub then refuses a push holding a key of
    a kind it knows, before it reaches the history, which no check on a pull request can.

## Reporting a weakness

- Use GitHub's private vulnerability reporting: the repository's Security tab, "Report a vulnerability", which only
  the owner sees.
  - If you cannot, open an issue saying only that a weakness exists and which part it touches, with no details.
- An agent files by that reporting's own call alone (`POST repos/<owner>/<repo>/security-advisories/reports`), only to
  its project's own repository or the core's, whichever the weakness is in, with no secret or personal detail and, to
  the core, nothing of its project.
  - Where the call fails it tells its own owner in its session's last message, never an issue.
