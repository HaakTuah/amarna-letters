- `scripts/work-saved.sh`, `.claude/settings.json`, `.codex/hooks.json`, `.kiro/hooks/work-saved.json`: at a session's
  start, reports work not yet saved, the stop switch and what the branch's paths call for; at its stop, keeps a reply
  from ending once while work is unsaved. *Runs:* a session's hook, in each tool's form. *Else:* each tool's own hooks
  are what run it. Weighed by the challenge: git's own hooks, dropped on fact: git has no event at a session's start or
  as a reply ends, the two this hook needs, and runs a hook from a folder each clone must be set to, the working tree's,
  where these run only the copy merged into `main`; the adapters that write one hook into each tool's form (agenthooks,
  ai-hooks, agent-hooks), dropped on fact: packages at 0.x writing three files the starter kit keeps in 97 lines.
  *Bugs:* 0. **Keep:** small and stable.
