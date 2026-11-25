---
name: Bug in the core
about: A rule, hook, check or script of the core that stopped work it should not have, or let through what it should stop
title: ''
labels: bug
assignees: HaakTuah

---

<!--
This repository is public, and so is every word written here. Before you write, read what may stand in an issue:
"Reporting to the core" in the README (https://github.com/HaakTuah/agent-core#reporting-to-the-core).
A weakness is never filed here: the Security tab, "Report a vulnerability", which only the owner sees.
-->

**Which part of the core**
The file, and its section or line. The commit of the core your project holds (the "Core:" line of its manifest).

**What happened**
What the rule, hook, check or script did, in plain words. An error it printed, if it names nothing of the project.

**What should happen**
What you expected instead, and the rule or section that says so, if there is one.

**The kind of project**
No closer than this: public or private; the platform it is built on; the cloud or the owner's own computer.

**What you did meanwhile**
Whether the work went on, and by which reading.

**What to read**
The kinds of task it is, each in backticks (`node scripts/reading.mjs --kinds` lists them), or a module by its path. Left empty, the builder's start reading and what its changed paths call for.

Found while: for an agent, the role and the task it was on, as "fixing #241 (a builder session)"; a person leaves this line out.

Brought in by: the merged pull request whose change brought the bug in, as "#N" and nothing after it on the line; left out where it is not known, and said so later in a comment once it is.
