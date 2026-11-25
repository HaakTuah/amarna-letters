# Codex's part

Read by a session of the tool `codex`, and by whoever hands Codex a task or asks it for a review.

Asked for a review, by the first way there is (`tasks/reviews.md`, point 1):
- *Side by side:* `codex exec "$(cat <the brief's file>)"` starts a fresh session, which takes the review's brief, read
  from a file so that no outsider's text in it is run by the shell; whoever briefed it posts what it answers.
- *Through a plug-in:* in Claude Code, a brief to the subagent `codex:codex-rescue`, below, that says to change nothing
  and to review the branch against the default branch. Its answer, posted on the PR, is its code review of Claude's
  work, or, focused as `tasks/reviews.md`, point 3, says, its security review.
- *On the host:* its app on GitHub, below, whose code review is asked by a comment and takes no brief, and whose
  security review runs by itself.

**On GitHub,** its login `chatgpt-codex-connector[bot]`:
- Its code review is asked by a comment `@codex review` alone: it answers every mention of itself, even in backticks, so
  other text says "the Codex mention".
- Its security review runs by itself (`tasks/reviews.md`, point 3). Where its app starts it so, it is never asked
  for one by a comment, which it answers with a code review: a later commit's security check is the fallback
  reviewer's (point 3). Through its plug-in, below, it is asked again for one where a later commit touches a way in
  (point 3).
- It cannot push there, so it builds nothing.

**Through its plug-in in Claude Code** (`/codex:setup` says if it is ready; an offer of its to install Codex is the
owner's to accept: floor rule 18):
- A session reaches Codex by the subagent `codex:codex-rescue` alone: the plug-in's review commands, `/codex:review` and
  `/codex:adversarial-review`, start only when a person types them.
- Building: the brief goes to that subagent, which pushes nothing: its briefer commits and pushes its work.
- Its model is its plan's; its effort high at most.

**As a project's own agent,** its command line or app (from its documentation on AGENTS.md, read on 15 November 2026;
`tasks/tools.md`):
- It reads `AGENTS.md` (or an AGENTS.override.md beside it) in each folder from the repository's root down to the one
  it works in, and pulls in no file those name, so it opens each itself (`tools/other-builders.md`); it needs no
  entry file.
- Handed a task: the brief as its first message, or `codex exec "<the brief>"`.
- Its hooks run at a session's start and at its stop, Claude Code's way (exit 2 and a reason keep it going), from a
  repository's `.codex/hooks.json` once the owner trusts that folder in Codex: the starter kit's runs the work-saved
  hook's copy merged into `main` at both (its documentation on hooks, read on 15 November 2026).
- Its folder .codex, where it is the project's, is protected (floor rule 3).
