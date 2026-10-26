---
name: owner-message-log
description: "Word-for-word log of every message the owner typed in this project, and the script that rebuilds it; read it after a context squeeze before acting on remembered instructions"
metadata:
  node_type: memory
  type: reference
  originSessionId: 246a2c6e-d357-4ae0-9392-9e7a385aed81
  modified: 2026-10-18T11:59:32.064Z
---

`owner-messages-log.md` in this memory folder holds every message the owner typed in the amarna-letters project, word for word, oldest first: pasted round prompts, addenda, corrections, answers to question boxes, plan approvals and slash commands run. It has no tool output and no summaries. It covers the main checkout and its worktree sessions.

`rebuild-owner-log.js` (same folder) regenerates it in full from Claude Code's session files: `node rebuild-owner-log.js`. It reads only this repository's project folders under `~/.claude/projects` and writes only into this memory folder.

**Why:** a context squeeze leaves only a summary; instructions given mid-task (for example the Part G addendum and the audience-estimate correction on 18 October 2026) must survive word for word.

**How to apply:** after a squeeze, or before acting on an instruction remembered only from a summary, reread the owner's exact words in the log. A hook in the repo's `.claude/settings.local.json` (git-ignored via `.git/info/exclude`, added 18 October 2026 at the owner's request) rebuilds it silently on every prompt (UserPromptSubmit) and after every turn (Stop); rebuild by hand if the hook is not loaded. Never write it, or any of this project's notes, into another project's folder ([[project-folders-separate]]).
