# Claude's part: auto mode

Read by a session of Claude Code in auto mode before it edits on the host text that someone wrote, and once that mode
refuses such an edit, the run of a program the core fetched or the deletion of a branch: the kinds `cloud` and `host`
(what a tool's part says: `tasks/tools.md`, "Each tool's part").

**Auto mode may refuse** (#990). By default a session of Claude Code makes the calls its task needs. The one condition
that changes it: in auto mode a classifier reads each action before it runs and blocks what it takes for destructive,
irreversible or aimed outside the session's environment, which by default it trusts only for the working directory and
the repository's own remotes; an edit of an issue's or a comment's text on the host may be among them, and a call it
blocked, tried again, is read again and may be blocked again (its documentation, "Configure auto mode" and "Choose a
permission mode", read on 20 November 2026). The trigger is the classifier's refusal of such an edit: the session
neither tries the call again nor reaches the same end another way (another command, tool or helper); it files the step
as a task labelled `needs-owner`, naming the step, how many texts it left and the session that holds their links, never
the links nor anything it would have cut, which go to the owner in that session's own chat alone, as step 700 says of
what it edits, and goes on with the rest of its task. The owner allows the step by an entry under `autoMode`, which that
mode reads from the owner's user settings or the organisation's managed ones and never from the project's, by a
permission rule the owner adds, or by saying so to the session in person, or takes it in a session the owner starts. It
does not mean that the session asks the owner in its chat and waits, that it writes such an entry or rule itself, which
would widen its own mandate, that a refusal of any other call is filed so, or that a call the classifier let through is
filed. Reason: in the staged case `steps` a session refused the host half of a sync step only said so, and nothing named
the limit or what came next. Held, in part, by the staged case `steps` (#1012), which reads that
the task was filed where a call to edit a planted text was logged and none cleaned both, and that nothing the session wrote holds their links or
the aside, nor the task their text, not that the call was not tried again, the count of texts left or who holds their links.

**The owner may allow three steps once** (#1086). By default the classifier judges each step as the rule before says,
and the owner allows a refused one at a time. The one condition that changes it: the owner adds, once, the three
entries below to `autoMode.allow` in the owner's own user settings (`~/.claude/settings.json`, inside its top-level
object, merged with any `autoMode` there), `"$defaults"` first so that the built-in exceptions stay, and `<account>`
written as the *owner's account*; the classifier reads them as prose and still judges each step against them (its
documentation, "Configure auto mode", read on 22 November 2026). They reach only the sessions of the computer whose
user settings hold them: a cloud session reads no user settings ("Settings in cloud sessions", read the same day). The
trigger is the owner's choice to add them, and the actor is the owner alone, by hand: no session writes them or asks
for them to be added.

```json
"autoMode": { "allow": [
  "$defaults",
  "Editing the text of an issue or a comment in a repository under github.com/<account> is allowed; never deleting one, and never in a repository of another account.",
  "In a repository under github.com/<account>, running the program at the path that the core's lychee.sh or workflow-tools.sh (scripts/ in the core's repository, core/scripts/ in a project) just printed as LYCHEE=, ACTIONLINT= or ZIZMOR=, by that variable set from what the script printed in a command the classifier can read, is allowed; never a program at any other path, nor one in another account's repository.",
  "Deleting a branch that this session itself created, in a repository under github.com/<account>, is allowed; never the default branch, never agents-stop, and never a branch another session or a person created."
] }
```

Each, and why it is safe:
- editing text: it reaches only the owner's own repositories, deletes nothing, and the host keeps each edit's earlier
  text;
- running a fetched program: the script, a protected file of the owner's own repository (floor rule 3), prints the
  path only after the program, or for zizmor its wheel, matched the SHA-256 the core names for its version (floor rule
  7), a check the classifier cannot see and the script makes;
- deleting a branch: only one the session made, as it cleans up what it made ("Sessions" in
  `roles/shared/work-flow.md`), never `main`, which the host protects, nor the owner's stop switch, which no agent
  touches.

Left out: a rule under `permissions.allow` (a `Bash(git push origin --delete *)` or a GitHub tool's name), which skips
the classifier and so cannot keep to the owner's account, the session's own branch or a checked program; an entry
under `autoMode.environment` that trusts the whole account, which would let through far more than these three steps;
and `node.sh`, which installs Node in place and sets no path. It does not mean that an entry reaches beyond the owner's
own repositories, that a session reads one as a mandate beyond what it says, or that a refusal of any other step is
allowed. Reason: on 20 and 21 November 2026 auto mode refused the run of a pinned tool, an edit of an issue's text in a
staged case and the deletion of a scratch branch, each then waiting on the owner. Held by nothing a check reads, since
the entries stand in the owner's settings, outside every repository.
