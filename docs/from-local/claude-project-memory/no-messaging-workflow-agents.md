---
name: no-messaging-workflow-agents
description: Never SendMessage a subagent that a workflow launched; it can start a second copy of the agent and two writers clobber each other
metadata:
  node_type: memory
  type: feedback
  originSessionId: 246a2c6e-d357-4ae0-9392-9e7a385aed81
  modified: 2026-10-19T05:36:06.060Z
---

On 19 October 2026 two workflow subagents (Part G and Part E implementers) were thought dead after a usage-limit interruption; a second workflow was launched over them, and then a SendMessage to each "resumed" it while the original was still running inside its workflow. The result was two copies of each agent writing the same checkout and the same harness, each taking the other for a stray (a stash of live work, a commit made under another agent's test run, a harness file rewritten).

**Why:** a workflow agent's journal shows only "started" until it returns, so a long-running agent looks dead; and messaging it can spawn a resumed copy alongside the running one.

**How to apply:** before relaunching work after an interruption, check whether the earlier workflow's agents are still writing (their transcript files under `subagents/workflows/<run>/` keep changing) and stop the workflow with TaskStop first. Never message a workflow's agents; if one reports a problem, stop the workflow and relaunch cleanly from the committed state. See [[build-order]].
