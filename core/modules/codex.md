# Codex's part

Asking Codex: for a code review, a comment `@codex review` alone (it answers every mention of itself, even in backticks,
so other text says "the Codex mention"); its security review runs by itself (`modules/reviews.md`, point 3). On GitHub
it cannot push, so builds nothing (core archive 169).

Building, through its plug-in in Claude Code (`/codex:setup` says if it is ready; it installs nothing): the brief goes
to the subagent `codex:codex-rescue`, which pushes nothing: its briefer commits and pushes its work. `/codex:review`,
posted on the PR, is its code review of Claude's work where its GitHub app is not on the repository. Its model is its
plan's; its effort high at most.
