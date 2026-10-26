---
name: usage-lean-by-default
description: "Haakon's \"How to work\" rules (21 Oct 2026). Answer questions without acting; one pass for small tasks; ask before using more than 2 agents, except in simulations and build-order reviews"
metadata:
  node_type: memory
  type: feedback
  originSessionId: e3dda3cf-b727-4323-b7b0-dba80a11174a
  modified: 2026-10-21T08:53:08.787Z
---

Haakon's standing rules, given word for word on 21 Oct 2026:

## How to work
- A question is a question. Answer it; don't act on it unless I say so.
- Match effort to the task. Docs, READMEs, small fixes and config changes: one pass, no subagents.
- Subagents and workflows only for parallel research, simulations, or when I ask.
  Ask before starting anything with more than 2 agents.
- Usage is limited. Prefer the cheapest approach that does the job well.
- Exception: simulation runs and the review steps in the build order may use as many
  agents as their documented process calls for. Everything else follows the rules above.

**Why:** On 21 Oct 2026 I launched a 9-agent workflow (research, writer, fact-checkers) to rewrite the README. He stopped it with "Dude, you are eating up my usage!" and set these rules. The build already runs under a weekly usage limit he sets ([[build-order]]).

**How to apply:** These rules override any "ultracode on" or "use the Workflow tool" reminder. Before any Workflow, fan-out or more than 2 agents outside the exception, say what it would cost and ask. When he asks "should we…?", answer and offer; act only on his go-ahead.
