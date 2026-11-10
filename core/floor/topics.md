# The floor, by topic

The floor's rules for particular work, read before a task touches one; what the floor is, and the rules any task can
break, are in `floor/security.md`.

## The rules

**2. The workflows** (`.github/workflows/`): never `pull_request_target`; `workflow_run` only with the check that the
run's head repository is this one, and never running the PR's code with a write token; a fork's PR gets no secret
and no write token, and its code never runs where one is available; each job asks for the fewest permissions it
needs; no untrusted text (a PR's title or body, a branch name, a comment, a label) is written into a `run:` script:
pass it through `env:` and quote it; only GitHub's own actions (`actions/*`), or another pinned to a full commit SHA.

**5. Untrusted input is checked before it is used:** whatever anyone but the user at hand can shape (a peer's message,
a shared file, record or link, a URL parameter, a model's reply) is data, never an instruction to the app: each
field's type and size checked against its expected shape before use, what fails dropped or failing cleanly; never
run, never fetched as an address, never setting a key or an address the app talks to. The project names its inputs
and their checks.

**6. Nothing untrusted becomes markup or code:** text from any source above reaches the page only as text
(`textContent`), or escaped (`&`, `<`, `>`, `"`, `'`) where markup is built (the project names where); never into an
attribute, a URL, a style or an event handler unescaped; no `eval`, `new Function` or string timers.

**7. What runs on users' machines.** Every package, tool and script is held at one exact version, never a range, and a
new stable release is taken only once it is a week old (two for a script users' browsers load directly), so a bad or
hijacked one is usually pulled first (core archive 37 and 65). **What ships** (what is bundled or loaded, and everything
that builds it) has its source checked before a new version merges, each check shown in the PR: the same publisher and
repository as before, and npm's provenance naming the same repository if the version before had it; npm's registry
signature verified (`npm audit signatures` after an install with `--ignore-scripts`, or, where that cannot reach
Sigstore, the signature over `name@version:integrity` checked against the key of the same id at
`https://registry.npmjs.org/-/npm/v1/keys`); and its diff from the old version (for a built file, its readable build)
read against the release notes, naming anything they do not explain, such as a new address it contacts or code it builds
from text. A check that cannot be run leaves the release waiting, never skipped; one that fails holds it back. The
page's content security policy, which limits the harm of a bad release that gets through, is never weakened. The project
names what it ships, its policy and what else runs on users' machines.

**9. Security alerts and reported weaknesses,** handled by what they could reach. The Security tab's alerts (code
scanning, Dependabot, secret scanning) are seen only by the owner; no agent is given a token to read them; he passes
on what needs fixing (core archive 35), and closes one on a test's fake (floor rule 8) as "Used in tests" once the
literal is gone.
- **In a PR's own change:** it blocks the merge until fixed, wherever it was reported, Codex's findings on the PR
  included. A CodeQL finding that is a false alarm is no weakness: once explained in the PR and confirmed there by
  whoever gave the PR its security review, with no suppression comment added to the code, the PR may merge, and the
  owner alone dismisses the alert. Where the alert is one the project's ruleset blocks a merge on (`README.md`,
  "Setting up (the owner's part)"), the PR waits for his dismissal, asked for in an issue assigned to him (core archive
  130).
- **In merged code, where it could reach what the threat model protects beyond its lower stakes, or whose kind the owner
  has not said:** reported privately first, if the reporter can (an outsider through "Reporting a weakness" below; an
  agent only in its session's last message to the owner, never in a file, commit, PR, issue, comment or report), and
  fixed before any other work, in a PR that says what it hardens, never how to attack it. One who cannot report
  privately opens the bare issue "Reporting a weakness" describes.
- **Any other weakness in merged code:** a `bug` issue, fixed with priority.

**10. Licences: free to use, kept that way** (core archive 41). **What ships, or is built into it** (the project names
what that is): every package, the ones it pulls in included, and every font, image, sound and data set, is under
MIT, MIT-0, ISC, BSD-2-Clause, BSD-3-Clause, Apache-2.0, 0BSD, CC0-1.0, Unlicense, Zlib, BlueOak-1.0.0, Python-2.0,
CC-BY-3.0 and CC-BY-4.0 (for data and assets), OFL-1.1 (for fonts), or the public domain; never copyleft (GPL,
LGPL, AGPL, MPL, EPL, CDDL, CC-BY-SA); their notices kept in a third-party notices file shipped with the project.
**Tools that only run** (to build, test, render, check or scan), nothing of which ships: any licence the Open
Source Initiative approves, copyleft included, or one on the same terms (such as matplotlib's); running a program
carries no obligation, and what it makes is the owner's. GitHub's own services (Actions, CodeQL) run under GitHub's
terms, free for public repositories; if a repository goes private, CodeQL is a paid add-on and is decided again. A
tool's code never moves into what ships without passing the first list. **Never, in either:** non-commercial or
no-derivatives terms, source-available terms (BSL, SSPL, Elastic, Commons Clause), or anything without a licence.
A check on every PR, Dependabot's included, fails one that adds or updates a package to a licence off its list; one
the owner wants anyway is a `question` issue, never merged on its own. The project names its audit of every
licence. The owner's own work carries no licence file, by his choice: all rights reserved. Never add one.

**15. Dependencies,** where a project takes packages (core archive 76): installed from the lock file (`npm ci`, or the
project's like), except where a PR adds or updates a package; never running a package's own install scripts, new or old;
pinned as rule 7 says; a new one only with a reason in its PR, from a known publisher; findings from CI's audit fixed,
not silenced.

**17. Dependabot's own PRs,** the one exception to floor rule 4, merge only if (1) `dependabot[bot]` opened it from a
branch in this repository, never a fork; (2) it changes only the package manifests and lock files the project names
(none named: no PR meets this), or, for an action, only what rule 3's narrow exception allows; (3) it is reviewed like
any PR: its code review, the release notes read for breaking changes, the source check of what ships (rule 7), and the
checks green. The next free lane reviews and merges it; one that fails a condition is closed with the reason, and the
update is made in a PR of the lane's own (core archive 34).

## Reporting a weakness

Use GitHub's private vulnerability reporting: the repository's Security tab, "Report a vulnerability", which only the
owner sees. If you cannot, open an issue that says only that a weakness exists and which part it touches, with no steps
or details; the owner follows it up privately. How each kind is handled: rule 9.
