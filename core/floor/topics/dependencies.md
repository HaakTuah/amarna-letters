# The floor, by topic: dependencies

Read before a task adds or updates a dependency or a tool of an agent's own, and by a security review: the kinds
`dependency`, `update`, `tool` and `security-review`; the path `.github/dependabot.yml`.

**15. Dependencies.**
- Installed from the lock file (`npm ci` or its like), except where a PR adds or updates a package.
- Never running a package's install scripts.
- Pinned as rule 7 says.
- A new one only with a reason, from a known publisher.
- **A new one is taken in an order:** the session that adds a package takes, for the job, what the platform brings
  first, then a tool that only runs, then a library; and for what ships to users, its pull request says how many
  packages the new one brings with it, as the lookup prints. Nothing changes it.
  - It does not mean code written by hand comes before a package, nor that a library is refused where neither of the
    first two does the job. Reason: what the platform brings installs nothing, and a tool that only runs ships nothing.
- **A new one is looked up in its registry:** in a pull request that brings a package into a lock file, one that no
  lock file of its base held, the package check asks the registry of it, fails a name the registry does not know and
  one first published under 90 days ago, and prints the rest for the review (its last release, its repository, whether
  that is archived and names it back, its publisher, the packages it brings, its provenance), which no score decides.
  Nothing changes it.
  - It does not mean a person approves each package, a list of approved ones, or that what a project held before is
    asked again. Reason: a model sometimes names a package that does not exist, the same names recur, and someone
    registers them; such a name is new and has no history.
- **Code of another publisher is named in a lock file** (#654). By default what a project ships or runs of another
  publisher's code stands in a lock file in its registry's own form, at its exact version. Where the project loads
  such code another way (a script from a content network pinned by its hash, a file copied into the repository), the
  session that adds it, or finds it, names it in such a lock file too, so the host's alerts, the audit and the update
  proposals read it; a list of the project's own that stood in for one gives way to it. Nothing changes it.
  - It does not mean the project changes how it loads the code or gains a build step, nor an asset that is no code (a
    font, a picture, a sound), which the licence check holds, nor the platform's own runtime, an action, pinned as
    `floor/topics/workflows.md` says, or a download no registry offers. Reason: a library loaded from a content
    network by its hash stood in no lock file, a list written by hand stood in for its updates, and nothing watched it
    for a vulnerability.
- Findings from CI's audit fixed, not silenced.
- **An agent's own tools are code with its sign-ins:** every plug-in, tool server, skill and hook the
  project configures for its agents is listed under "agentTools" in its licence check's config, from a known
  publisher, a plug-in or tool server at one exact version (a skill or hook is pinned by the project's commit, and
  names the version of anything else it runs); the starter kit's hooks are the core's, listed by it.
  - A session adds none, in the project or outside it, but where its task or the owner's word names it, listing one
    the project configures in the same PR; never by its own choice.
  - It does not mean how a machine is set up for agents, which is the owner's (floor rule 18), nor what a provider
    loads outside the project. Reason: a tool an agent loads runs with the session's sign-ins.

**17. Dependabot's own PRs.**
- One merges only if `dependabot[bot]` opened it from a branch in this repository, it changes only the manifests and
  lock files the project names (or an action's pinned version), and it passes the review, the release notes read and
  rule 7's source check, with the checks green.
- One that fails a condition is closed with the reason, and the update made in a PR of the builder's own.
