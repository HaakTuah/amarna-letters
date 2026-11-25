# The reasons behind the core: items 1 to 40

The index, and how an item is written: `archive/instructions.md`.

1. **20 October 2026** (Amarna Letters, item 4). Asked: how the two Claude Code sessions should treat the weekly usage
   limit they share. Decided: Both sessions share the weekly limit, so each checks usage after every commit from then
   on.

2. **26 October 2026** (Amarna Letters, item 11; for both games). Asked: a break had been suggested for the two
   sessions. Decided: The owner disagreed with the break: the two sessions work continually until they reach about 90%
   usage. At that point they take on no bigger task, since the bulk of the remaining usage is kept for the owner's own
   use.

3. **26 October 2026** (Amarna Letters, item 12). Asked: the proposed setup itself. Decided: All of it is done, with a
   condition: nothing important is lost along the way and nothing is duplicated without need, since duplication creates
   drift.

4. **26 October 2026** (Amarna Letters, item 199). Asked: whether one project's notes, logs or files may be written into
   another project's repository or folders. Decided: It is strictly forbidden.

5. **27 October 2026** (Amarna Letters, item 14). Asked: who merges once a milestone pull request is open and green.
   Decided: The session that built it merges, always.

6. **27 October 2026** (Amarna Letters, item 15; for both games). Asked: the owner asked whether the sessions should not
   push regularly, so they do not risk losing anything; a rule to push at every checkpoint was put to the owner.
   Decided: The rule was adopted: push at every checkpoint, so nothing is risked.

7. **27 October 2026** (Amarna Letters, item 16; for both games). Asked: review questions had sat unseen in a progress
   file, and proposals to mend it were put to the owner. Decided: All the proposals were adopted. In addition, all these
   questions from both projects come directly back to the owner, since having to hunt them down is not good.

8. **28 October 2026** (Amarna Letters, item 19). Asked: the owner remarked that the principles answer most of the open
   questions if one just reasons them out, and it was proposed to write the answers down. Decided: The answers are
   written down. In addition, Claude Code notes where it has made an assumption, as it does now with questions,
   so the assumptions can be checked afterwards.

9. **28 October 2026** (Amarna Letters, item 20; for both games). Asked: whether tests should run only where they
   matter, and then a check of what slows the work as the build grows. Decided: Tests run only where they impact
   something, to speed up development and so that sessions do not lose their cache and have all the tokens paid for
   again. The check of what slows the work was agreed to, for both games.

10. **28 October 2026** (Amarna Letters, item 22; Barkstreet Snakes, 28 October 2026). Asked: the owner raised whether a
    session could do something, push it up for review and start on something new, with a different session addressing
    the review when it comes back, to be more agile and efficient and not just sit and wait. Decided: This was adopted,
    organized so as to maximize token caching, time spent and all other concerns.

11. **28 October 2026** (Amarna Letters, item 23; Barkstreet Snakes, 28 October 2026). Asked: how many lanes of work to
    allow. Decided: As many lanes are allowed as can be parallelized.

12. **29 October 2026** (Amarna Letters, item 28; for both games). Asked: checks were slowed by full-size test games.
    Decided: Development does not stop for it, but the cause is got to the bottom of. Small test games became a standing
    rule. The owner also asked whether more optimizations could be applied to the development of the two games.

13. **29 October 2026** (Amarna Letters, item 29). Asked: five proposed optimizations, among them builders settling
    settled questions themselves. Decided: All five are done except the one concerning Codex, since Codex is not
    available yet.

14. **29 October 2026** (Amarna Letters, item 54). Asked: a builder had stopped at the app's usage warning. Decided: The
    owner corrected this: the sessions were not supposed to stop before 90%, and usage stood well below that.

15. **31 October 2026** (Amarna Letters, item 84; for both games). Asked: whether the sessions had been told to push
    every single commit, as their usage was running low. Decided: The sessions are not to stop, but the owner hoped they
    had pushed everything they could. The rule to push after every commit was adopted.

16. **31 October 2026** (Amarna Letters, item 86). Asked: the owner raised that the README of both projects should
    probably be queued for an update; a standing rule that a change a player sees updates the README in the same pull
    request was proposed. Decided: The rule was adopted for both projects.

17. **31 October 2026** (Amarna Letters, item 115; Barkstreet Snakes, 31 October 2026). Asked: whether to reuse
    sessions. Decided: Whatever is most effective at achieving the goal is done, the goal being to accomplish the most
    possible with the least tokens, without sacrificing quality.

18. **1 November 2026** (Amarna Letters, item 123; for both games). Asked: Claude and Codex building together. Decided:
    The owner wants to run them both together, so that they collaborate and spread the usage and can last about the full
    week. They review for one another, since they have different architectures and possibly different blind spots, and
    continue communication over GitHub when something is unclear or further notes must be exchanged. This was the first
    step to try. The Claude Code orchestrator must be aware that there will be times when Codex is not available: it
    makes a habit of dividing the labor with Codex in mind, awaits a response for a short time and, if it gets none,
    assigns the work to a builder session of its own. It must also be aware that, if Codex runs out of usage, it gets no
    alert, so it must be ready to fall back. The owner questioned whether absolutely all tasks should go to Codex, since
    some presumably require more, and suggested that Claude divide some tasks further: Claude makes the important calls
    and criteria, then hands the grunt work to Codex. At least one Claude reviewer with a clear idea of what the final
    product should look like makes Codex iterate until it reaches that vision. The owner proposed, as a quality control
    seen mentioned elsewhere, that they judge each other's work on a scale of 1 to 10 and that anything short of a 10
    goes back. On Codex's review trigger, which is either a smart detect (an experimental feature) or every push, the
    owner suggested turning it off.

19. **1 November 2026** (Amarna Letters, item 124; for both games). Asked: the owner asked whether 15 minutes is not a
    bit long to wait, since it took a second or two, three at most; about 5 minutes to a sign of life, a take-back at
    once on an error and about 2 hours to a pull request were proposed. Decided: The proposal was adopted.

20. **1 November 2026** (Amarna Letters, item 127; for both games). Asked: Codex reviewing Claude's pull requests and
    building nothing until the owner says. Decided: This was adopted, with an addition: Codex can run out of usage even
    just reviewing, so there is a standard of waiting, then asking it whether it is spending too long (which should not
    be a long wait), and then handing the review to another reviewer if it does not answer quickly. The owner also asked
    whether the Codex reviewer would have the review criteria with the 1 to 10 score scale.

21. **1 November 2026** (Amarna Letters, item 129; for both games). Asked: the owner noted that Codex has settings for
    whether it abides by personal preference or repository rules; a security policy for both repositories, Codex's
    findings counted by priority and a scored design check on the big items were proposed. Decided: All of it was agreed
    to, with a condition: it is done taking account of all attack vectors and security concerns.
    Changed by: 155.

22. **1 November 2026** (Amarna Letters, item 131; for both games). Asked: Codex as the gatekeeper for faults and
    security and a short scored design check on the big items, after Codex found every planted fault. Decided: The owner
    agreed with the assessment.

23. **1 November 2026** (Amarna Letters, item 132; for both games). Asked: whether only a 10 passes. Decided: Points 1
    and 2 were agreed to. Point 3 is made stricter, with a measure to ensure there is no endless loop and no lowering of
    what a 10 is. It is to be carried out.

24. **1 November 2026** (Amarna Letters, item 133; for both games). Asked: the rule that every change removes what it
    replaces, and leftovers in the definition of a 10. Decided: Both were agreed to. The owner asked whether anything
    more of this kind should also be had, and agreed again to the answer.

25. **2 November 2026** (Amarna Letters, item 134; for both games). Asked: the owner's notes on the parts behind the
    core. Decided: The owner asked: whether to use a regular container Codex instance to review rather than the native
    review once environments exist, since the native reviewer cannot give proper feedback and cannot run the project;
    why Codex posts as a bot while Claude Code posts under the owner's name; and whether Claude escalates a task to a
    session of higher effort, or to Fable, if it cannot manage it, with the point that Fable runs out of usage faster
    than the rest, so there must always be fallbacks. The owner asked whether to become more lenient about workflows and
    helpers: the goal is as much done, with quality output, at as efficient token usage as possible, which does not mean
    dragging out time for its own sake. The agent file prohibited subagents outright; the owner wants productive use of
    them unless the answer disagrees, the impression being that they are not optimal for every task but benefit certain
    tasks, so an outline of the criteria that make their use optimal is to be made, its wording thought through for
    exactly that balance. The owner asked whether the agent file and the files always read are the best place for a
    timeline of decisions, and held that they should be purely condensed instructions, as many quality tokens as
    possible. The owner asked whether files had been split where it makes no difference, and if so gives nothing,
    proposed a new rule: be fully consistent and ruthless on breaking up and using inheritance wherever sensible, so
    that it aids finding things and avoids ingesting needless tokens, but always ask whether breaking something up gives
    any benefit down the line. Some of the issues came from writing rules instead of focusing on principles. The
    principle is price and maintainability down the line, to help on both fronts; if a rule does not align with its
    stated principle, that is flagged and the principle overrules the rule; and the owner really thinks the core should
    be much more ruthless about breaking up where it gains from it. A full review and clean-up is needed in which every
    file, especially the documents, is looked at and asked what it states that it does and whether it does it; whatever
    does not belong in it goes somewhere else, if anywhere at all. The owner agreed to absolutely all of these points.
    The standing lines of 21 October, moved here from the rule files, are: a question is a question, so answer it and do
    not act on it unless the owner says so; match effort to the task, so docs, READMEs, small fixes and config take one
    pass with no subagents; usage is limited, so prefer the cheapest approach that does the job well; read only the
    parts of large files the task needs; run long simulations in the background and wait for the completion notice,
    without polling and without keeping agents alive just to wait for a run; and at each milestone, open a pull request
    the owner can play, say in it what to try, and carry on with the next item without waiting for the owner to review
    or merge.

26. **2 November 2026** (Amarna Letters, item 135). Asked: whether split by meaning, as small as sensible, is done
    ideally while building and not by waiting for a file to pass 20 KB, and whether the wording is already clear on
    that. Decided: This was agreed to, with a condition: the occasional file-optimizing runs stay, since even with the
    instructions there will be drift and oversight, which accumulates. Emphasizing working smarter does not replace the
    occasional clean-ups and tracking.

27. **2 November 2026** (Amarna Letters, item 139; for both games). Asked: the owner asked why the orchestrator is doing
    things directly. Decided: The orchestrator builds nothing itself; each lane is a builder session, and helpers belong
    to builders.

28. **2 November 2026** (Amarna Letters, item 141; for both games). Asked: ideas as issues; the owner noted that this
    differs from how all questions bubble up, that things may be lost because only blocking questions are raised, and
    that the owner has to hunt across pull requests for the questions, and asked whether issues would be a better place
    for all of that. Decided: To avoid duplication, everything goes there, with only pointers in the pull requests and
    elsewhere, to make the owner aware that new ones are added. The owner asked whether suggesting an idea should be low
    stake.

29. **2 November 2026** (Amarna Letters, item 142; for both games). Asked: secret scanning had flagged a made-up key in
    a test. Decided: Fake keys are built when the test runs and names are invented. The owner agreed.

30. **2 November 2026** (Amarna Letters, item 143; for both games). Asked: calling the owner "the owner" in the rules
    and removing private mentions from the public archives. Decided: Both were agreed to, across the board.

31. **2 November 2026** (Amarna Letters, item 144; for both games). Asked: the owner asked whether issues are now for
    both Claude Code and Codex, and Codex was to list its issues in its report when it cannot file them. Decided: This
    was accepted: it does that if it cannot manage to post on its own, since one does not always fully know what access
    they have.

32. **2 November 2026** (Amarna Letters, item 146; for both games). Asked: the owner noted that there are two kinds of
    submissions, features and bugs, and asked why they do not use the issue templates instead of custom tags; tagging is
    fine, but the templates that exist should be used. Decided: Ideas are filed as Feature requests (`enhancement`),
    bugs as Bug reports (`bug`) and the owner's questions under `question`, all agreed to.

33. **2 November 2026** (Amarna Letters, item 147; for both games). Asked: agents signing every comment, since they post
    under the owner's login. Decided: All of it was agreed to. The owner added that on point 4 they already end with a
    Generated by Claude Code attribution line.

34. **2 November 2026** (Amarna Letters, item 151; for both games). Asked: Dependabot's security pull requests had no
    owner, and the owner asked whether the sessions could not review them when they see them and merge them if good.
    Decided: The five proposed conditions were agreed to.

35. **2 November 2026** (Amarna Letters, item 152; for both games). Asked: the owner asked why the sessions should not
    be able to read the alerts, and whether they get the full picture of the diagnosis so they can address them; keeping
    the alerts private, no agent token, CodeQL on every pull request and the owner passing on what needs fixing were
    proposed. Decided: The proposals were agreed to, both parts.

36. **2 November 2026** (Amarna Letters, item 153; for both games). Asked: a set of review rules, among them "a test
    weakened or skipped, or changed beyond what the task forces". Decided: Everything was agreed to.

37. **2 November 2026** (Amarna Letters, item 155). Asked: Dependabot's version updates aimed at `develop`, weekly,
    grouped, each release a week old (and, for Barkstreet Snakes, a milestone due whenever a change a player would
    notice has merged, at least daily). Decided: Both were agreed to.

38. **2 November 2026** (Amarna Letters, item 159; for both games). Asked: the owner asked whether all the issues that
    are closed are fixed or being fixed, what is best, and why bugs and other issues should be treated differently.
    Decided: Open means it needs the owner, and a bug closes when its fix is live. The owner agreed.

39. **2 November 2026** (Amarna Letters, item 160; for both games). Asked: the owner asked why an older version of Node
    is run, and why a new major should be ignored if the project updates. Decided: A new major of the Node types is the
    cue to move Node itself. The owner agreed.

40. **2 November 2026** (Amarna Letters, items 161 and 162; for both games). Asked: the owner asked whether the ideas
    and bugs reporting pathway shows fruits by bringing forward insights that would otherwise go lost, and whether
    reviewers should be limited to suggesting one idea. Decided: Every reviewer names one idea, and everything raised is
    addressed. The limit is one per review, with its guards, which the owner agreed to.
