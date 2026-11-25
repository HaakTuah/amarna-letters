# The floor, by topic: what runs on users' machines

Read before a task adds or updates what ships or what builds it, or takes up a package found bad, and by a security
review: the kinds `dependency`, `update`, `alert` and `security-review`.

**7. What runs on users' machines.**
- Every package, tool and script at one exact version, never a range.
- A new stable release is taken once it is a week old (two for a script browsers load directly).
- For what ships, and everything that builds it, a new version merges only after its source is checked in the PR:
  - the same publisher and repository as before (and its provenance, if the old one had it);
  - the registry's signature verified (npm: `npm audit signatures` after an install with `--ignore-scripts`, or, where
    Sigstore cannot be reached, against the key of the same id at `https://registry.npmjs.org/-/npm/v1/keys`;
    elsewhere, by the registry's own tool);
  - the diff read against the release notes, naming anything they do not explain.
- A check that cannot run, or fails, holds the release back.
- **A package found bad goes at once:** the session that learns that a version the project holds is malicious or
  taken over (an advisory, the registry's notice, a review's finding) puts the project back on its last good version,
  or takes the package out where none was, in a pull request; and tells the owner at once, privately as rule 9 reports
  a weakness, naming every key and sign-in the build or a session could reach while that version was installed.
  Replacing those is the owner's. Nothing changes it.
  - It does not mean a weakness with a fix, which an update takes (`tasks/updates.md`), nor that the pull request
    waits for the owner. Reason: the floor said this of a leaked secret and nothing of a bad package, and the first
    hour is when it matters.
- A page's content security policy is never weakened.
- The project names what it ships and its policy.
- **A program installed on a user's machine** asks for no more rights than a need its `SECURITY.md`
  names under this rule's number, and reading a saved file never runs code (no loader that builds whatever type the
  file names).
  - Where the project has a certificate for signing, its installers and updates are signed and its build checks the
    signature. Getting one is the owner's: the session that finds a program installed and no certificate files one
    issue for the owner, labelled `needs-owner`, and no second while it is open; the rest goes on.
  - It does not mean a page in a browser, which installs nothing. Reason: an installed program runs with its user's
    rights, and a saved file is input too.
