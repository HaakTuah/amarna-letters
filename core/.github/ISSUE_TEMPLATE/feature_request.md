---
name: Idea for the core
about: A rule, hook or check the core lacks, or one that would hold better written another way
title: ''
labels: enhancement
assignees: HaakTuah

---

<!--
This repository is public, and so is every word written here. Before you write, read what may stand in an issue:
"Reporting to the core" in the README (https://github.com/HaakTuah/agent-core#reporting-to-the-core).
A weakness is never filed here: the Security tab, "Report a vulnerability", which only the owner sees.
-->

**What it is**
The idea in a line or two, in plain words. Where it asks something of every or all of a kind, the source a script counts that kind from, and `sweep` under "What to read" (`tasks/cleaning.md`, "A sweep's scope is read, not listed").

**Why it matters**
What went wrong or cost time without it, and how often.

**Which part of the core it touches**
The file and section, if there is one. The commit of the core your project holds.

**The rule's reasons**
Where the issue names a rule of the core: which of the reasons `node core/scripts/reasons.mjs "<the rule>"` prints for it does not hold for your project, and why, from what you read of the project (`tasks/updates.md`, "A question or difference about a rule of the core starts from its reasons").

**The kind of project**
No closer than this: public or private; the platform it is built on; the cloud or the owner's own computer.

**Done when**
For a change its users will notice (the kind `feature`), two to six lines, each one behaviour in a shape: "When this happens, it does that.", "While this lasts, it does that." or "If this goes wrong, then it does that.", at least one an "If", each ending "Proof:" and a test written first and seen to fail, a check, a picture or "the owner tries this"; then one line "Out of scope:". For a change said in one sentence, the one line "None:" with that sentence. Otherwise left out.
- When ..., it .... Proof: ...
- If ..., then it .... Proof: ...
- Out of scope: ...

**What to read**
The kinds of task it is, each in backticks (`node scripts/reading.mjs --kinds` lists them), or a module by its path; `feature` where its users will notice the change. Left empty, the builder's start reading and what its changed paths call for.

Found while: for an agent, the role and the task it was on, as "fixing #241 (a builder session)"; a person leaves this line out.
