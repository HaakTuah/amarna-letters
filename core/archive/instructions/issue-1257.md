# The reasons behind the core: issue #1257

The index, and how an item is written: `archive/instructions.md`.

#1257. **24 November 2026**, #1257, a design the owner agreed to that day, built with #1263's points 1 and 2. A release
     is held where, in its trial on a real project, a check that ran before the update measured nothing after it; a
     check that ran neither before nor after holds nothing, such as a suite meant for another system or a job only the
     host runs. Built so far for a check the core's workflow runner could not read: the runner gives such a job the
     verdict "unread" and runs on the jobs it can read, each with its own verdict, never the whole file failed; and the
     trial counts a job that ran before and was not read after, or was not read before and failed after, as not
     measured, holding the cut, and one read in neither run as not measured, holding nothing, never "failed both". The
     reason: in release 6's second trial a project's whole test workflow counted as failed before and after over two
     forms the runner could not read, so a cut would have gone ahead with that project's own checks measuring nothing.
     It stands behind "A release is cut on the owner's word" in `AGENTS.md`.
     Changes: #1084.
