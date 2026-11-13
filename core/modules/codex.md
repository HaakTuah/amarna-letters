# Codex's part

Asking Codex: for a code review, a comment `@codex review` alone (it answers every mention of itself, even in backticks,
so other text says "the Codex mention"); its security review runs by itself (`modules/reviews.md`, point 3). On GitHub
it cannot push, so builds nothing (core archive 169).

Through its plug-in in Claude Code (`/codex:setup` says if it is ready; an offer of its to install Codex is the owner's
to accept: floor rule 18), a session reaches Codex by the subagent `codex:codex-rescue` alone: the plug-in's review
commands, `/codex:review` and `/codex:adversarial-review`, start only when a person types them. Building: the brief goes
to that subagent, which pushes nothing: its briefer commits and pushes its work. Reviewing, where its GitHub app is not
on the repository: a brief to it that says to change nothing and to review the branch against the default branch; its
answer, posted on the PR, is its code review of Claude's work, or, focused as that point says, its security review. Its
model is its plan's; its effort high at most.
