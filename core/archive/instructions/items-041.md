# The reasons behind the core: items 41 to 81

The index, and how an item is written: `archive/instructions.md`.

41. **2 November 2026** (Amarna Letters, item 164; for both games). Asked: whether there should be standing orders to
    update packages, provided every package used has a licence that permits free use without any restriction and no
    update changes that; the version and licence rules, and whether the owner's own code gets a licence, were then put
    to the owner. Decided: all of it was agreed to, and rights stay gated for now.

42. **2 November 2026** (Amarna Letters, item 166; for both games). Asked: whether orchestrators should re-read the rule
    files when they change. Decided: agreed; orchestrators re-read the rule files when they change.

43. **2 November 2026** (Amarna Letters, item 169; for both games). Asked: the owner raised that sessions must not be
    prompted with personal information, such as names and professions, which gets sensitive material into the codebase,
    as had happened before. Decided: the codebase must be absolutely void of such personal information, completely,
    zero.

44. **2 November 2026** (Amarna Letters, item 171; for both games). Asked: whether the session being discussed should
    not read the progress file. Decided: it reads it, if that is worth it in the session's own opinion.

45. **2 November 2026** (Amarna Letters, item 172; for both games). Asked: the owner's own reading was that the step is
    probably done at every milestone, before proceeding down the main lane, if they impact each other, and that it is
    supposed to be done while actually building; the owner also asked whether every side lane that can be queued is
    queued, and why not, since they are supposed to be. Decided: that reading was agreed to, as was Step 0 and the wake
    report's count of lanes.

46. **2 November 2026** (Amarna Letters, item 173; for both games). Asked: about PRs merged without the owner's yes for
    `.github/`. Decided: the session does it, that is, it makes those changes. Dependabot's pinned version updates of
    actions already used need no yes, always.

47. **2 November 2026** (Amarna Letters, item 175; for both games). Asked: the owner noted that reviewing alone had
    taken about as much usage that day as all the building; one security review a PR, and no Codex review for docs-only
    PRs, were put to the owner. Decided: both were agreed to.

48. **2 November 2026** (Amarna Letters, item 177; for both games). Asked: whether a security review always makes sense.
    Decided: security reviews are done only for the risky kinds of change.

49. **2 November 2026** (Amarna Letters, items 178 and 181; for both games). Asked: whether the two games are AI-sloppy;
    then whether the audit is needed for Amarna also, and whether it will be run again occasionally. Decided: an audit
    of everything a player reads, agreed, and Amarna gets it also; the formula test on every PR, a review line and a
    monthly check, agreed.

50. **2 November 2026** (Amarna Letters, item 183; for both games). Asked: how things stood with the Codex reviews.
    Decided: no security review for proven-unchanged refactors, docs or history, and once meaning once; agreed.

51. **3 November 2026** (Amarna Letters, item 189). Asked: how to trigger Codex's security review; the owner raised that
    criteria can be set there. Decided: its threat model points at the repository's own file; agreed.

52. **3 November 2026** (Amarna Letters, item 193; for both games). Asked: the owner answered a poller that had been
    proposed. Decided: nothing runs locally with a poller, since it is a security risk for the owner's system. The
    poller was coded by the agent and handed over, but the owner refused it on those grounds, so it was never in use; it
    is removed, and every reference to it with it.

53. **3 November 2026** (Amarna Letters, item 196; for both games). Asked: whether a reading that is a matter of taste
    goes to the owner as a question when it is taken. Decided: agreed.

54. **3 November 2026** (Amarna Letters, item 201). Asked: whether there should be another audit, or the agent would
    advise against it. Decided: a full rules audit a week on, then only when the rules change a lot; everything advised
    was agreed to.

55. **3 November 2026** (Amarna Letters, item 204; for both games). Asked: what a "hired rider" is. Decided: the owner
    needs context when things are put to the owner; things must not be presented under agent-invented titles the owner
    cannot place, and the agents are to remember that.

56. **3 November 2026** (Amarna Letters, item 206; for both games). Asked: why a thing is not in a file both games read,
    since duplication is avoided nearly at all cost, it creating drift and usage, one of the most important principles.
    Decided: it is done in a file both read, but each instance reads what pertains to it, ideally; review criteria
    inside a big file of other matter they do not need would break the principle "Consume what you need to know only".

57. **3 November 2026** (Amarna Letters, item 207; for both games). Asked: whether the core pillars and criteria of the
    codebase are clearly stated and mercilessly enforced across the board. Decided: agreed, so that all of the core
    pillars like those the owner mentioned are covered; the owner also liked the third suggestion made.

58. **3 November 2026** (Amarna Letters, item 208; for both games). Asked: the owner's one remaining concern was that
    stuff ends up stationary, not where it is optimal; the owner asked whether it should be said that if another
    grouping is more fitting, moving it somewhere else makes sense, given that the rule is only to reference. Decided:
    it is added; only the places where it makes sense should still point to it.

59. **3 November 2026** (Amarna Letters, items 209 and 210; for both games). Asked: a hook that keeps a session from
    ending with work unsaved, and denying Claude's file tools any edit inside `.git`. Decided: both were agreed to.

60. **3 November 2026** (Amarna Letters, item 214; for both games). Asked: what expert best practices on this kind of
    agent flow recommend, whether any diverge from how it is done here, and what they say about a cap on subagents.
    Decided: everything divergent from expert best practices is implemented, thoroughly and perfectly.

61. **3 November 2026** (Amarna Letters, item 215; for both games). Asked: whether these findings were accounted for,
    and whether the setup is optimal now. Decided: agreed to all. The owner added a question: if Anthropic regularly
    runs up to 5 on the main lane, and Codex caps at 6, whether one of those should also be allowed, with clearer
    thresholds defined instead, as the best practices show.

62. **3 November 2026** (Amarna Letters, item 216; for both games). Asked: how the owner's repositories schedule weekly
    and monthly checks. Decided: they start from the first milestone of each week, by the calibration log; approved.

63. **4 November 2026** (Amarna Letters, item 217; for both games). Asked: a check on every PR that every pointer leads
    somewhere, and one of how much each session reads. Decided: if the agent advises them, they are done.

64. **4 November 2026** (Amarna Letters, item 218; for both games). Asked: whether a rule says that every change that
    alters a feature must update the description of it in all documents it is mentioned in or ought to be, or rather
    that it ought to be mentioned in one place only, by the rules. Decided: agreed.

65. **4 November 2026** (Amarna Letters, item 219; for both games). Asked: the owner thought that all package versions
    should be updated to the latest version as a rule, unless there is a good reason not to (it breaks something,
    performance is worse, the licence changes, and so on), and asked for the agent's take. Decided: agreed.

66. **5 November 2026** (Amarna Letters, item 221; for both games). Asked: the owner noted that Fable drains usage much
    faster than Opus; moving the design check to Opus at high effort was put to the owner. Decided: agreed, though the
    problem is that it cannot be set to high, since it inherits.

67. **5 November 2026** (Amarna Letters, item 222; for both games). Asked: whether the rule-file audit should also cut
    and simplify. Decided: agreed.

68. **5 November 2026** (Amarna Letters, item 223; for both games). Asked: whether an audit runs across both projects.
    The owner questioned the duplication: most rules are the same in both projects regardless of project, so every check
    and change of the rules is an inherent double process, promoting drift, extra usage and slipups; the owner asked
    whether a core project both can reference, holding the common rules fundamental to all future projects, was
    possible, since otherwise the problem keeps accumulating as more projects start. Decided: both (the audit and the
    core project) were agreed to, with points: Claude and Codex have access to only 2 repositories now, so they cannot
    do this fully autonomously; an orchestrator doing it would need cross access and a mandate for all 3 projects (the 2
    and the core); and an audit of the project-specific rules is probably still not a bad idea.

69. **5 November 2026** (Amarna Letters, item 224; for both games). Asked: whether the agent would do the full rules
    refactor on its own, and whether that is better than a cross-project orchestrator for this task. Decided: a fresh
    session in the core repository, started by the owner, writes only there; agreed.

70. **5 November 2026** (Amarna Letters, item 227; for both games). Asked: whether the rules on model and effort for
    each role are flexible enough that an orchestrator can be started at medium or high effort as is; that is, if a
    builder session is started on high, whether it will still be told to start a helper on high to do the work instead.
    Decided: sessions always check what model and effort they are set to before blindly following such directions.

71. **5 November 2026** (Amarna Letters, item 228; for both games). Asked: whether it is absolutely clear that Fable 5.1
    only does work where it adds value relative to Opus 5.5, handing it over as soon as it has done what it can do
    better, with no preliminary work and no merely symbolic handover; whether a clear division, defined by the effort
    and ability a job needs, is being ensured. Decided: all of it is addressed. The rules must also be flexible enough
    to handle any model or effort set, not only an orchestrator started on medium or high effort: a Fable set to high
    effort should not start an Opus helper to plan for it. Sessions understand the stated efforts relative to their own,
    so that if a session is itself better suited, it does not hand off as described.

72. **6 November 2026** (Amarna Letters, item 229; for both games). Asked: a canary in which Codex missed two planted
    faults. Decided: Codex is not stopped, since there is not endless usage for Claude and Codex is still better than
    the alternative; the rule addition and the new test were agreed to.

73. **9 November 2026** (Amarna Letters, item 238; Barkstreet Snakes, 9 November 2026). Asked: whether routine lanes are
    built by Sonnet; the owner asked also whether Fable will still take the most difficult of difficult tasks. Decided:
    agreed, on conditions: its work is checked where needed, Opus takes what it cannot do, and it must be able to
    escalate, in the owner's view.

74. **9 November 2026** (Amarna Letters, item 239; Barkstreet Snakes, 9 November 2026). Asked: later review rounds
    seeing only the change, a weekly workshop check, the owner's words quoted only in the archive, and trimming what
    every session reads. Decided: all of them were agreed to. The owner added that Codex's usage has a cost too; the
    goal is still to maximise it, and Claude is the more important link, but that does not mean waste there does not
    matter.

75. **9 November 2026** (Amarna Letters, item 240; Barkstreet Snakes, 9 November 2026). Asked: whether this repository
    is to be made. Decided: it must be done, though the owner wants to experiment with dynamic governance, maybe on one
    project, so that project might not have the rules which inhibit the model's own creativity. One repository in two
    layers, a safety floor every project takes whole and practice modules each picks in a manifest, the self-governing
    project taking only the floor, was agreed to.

76. **9 November 2026** (Amarna Letters, item 242; Barkstreet Snakes, 9 November 2026). Asked: the design session
    evaluated this repository's first pull request and put three questions to the owner, with its advice. Decided: all
    of it was agreed to as the design session advised: the three safety rules only one game had join the floor; where
    the games differ in substance, each keeps its own; the floor is in two files, the rules any task can break read at
    every start and the rest before a task touches them; Dependabot here is set to the workflow's actions; and a last
    code review comes before the merge. The owner added that only Claude has to stop around 90%, since its remaining
    usage is kept for the owner's own use, so Codex or whatever else is added will be for project work only. Ideally
    they time so that 90% is never spent before 100% of them are spent, but that depends on their being in an
    environment where they can track it and start one another directly; the rules are calibrated for that. Right now
    every cloud session wastes time establishing that it can track its usage, and wastes tokens posting about it on
    every PR, possibly more.
    Changed by: 146.

77. **9 November 2026** (Amarna Letters, item 243; Barkstreet Snakes, 9 November 2026). Asked: the owner's yes was asked
    for on this repository's first pull request and on the personal-terms fix in both games; the design session relayed
    the owner's answer, signed. Decided: the design session says yes in the owner's place. The owner also asked whether
    everything was fixed now, whether to run another Claude Code session on the agent-rules repository, whether the
    other repositories were informed, whether the usage rules could be in the Claude file since it is Claude-exclusive,
    and whether more could be done to have fewer questions wait for the owner's answer.

78. **9 November 2026** (Amarna Letters, item 244; Barkstreet Snakes, 9 November 2026). Asked: the design session made
    three proposals: Claude's usage rules in Claude's own file; the owner's word in the design chat, relayed and signed,
    counting as the owner's yes; settled questions answered on the owner's behalf, matters of taste left to the owner.
    Decided: all three were agreed to. The owner's point: sessions are now told to look in the document for the answer
    to a question, and often it is not found, so the session has to ask, and its intuitive reading is quite different
    from the owner's, so without the owner's input the game would drift a lot in direction. The owner asked, first,
    whether where the sessions look for their answer is encompassing enough, and second, whether more capable Opus or
    Fable sessions ever look at the questions and try to figure out what the owner's answer would be. The owner also
    asked whether this holds in both games, or only in the new project now.

79. **9 November 2026** (Amarna Letters, item 245; Barkstreet Snakes, 9 November 2026). Asked: the design session
    planned a stand-in that predicts the owner's answers from the owner's past words before a question reaches the
    owner, tested on past answers. Decided: agreed. The owner asked whether the builder now continues with its own
    interpretation until corrected, and whether even a predictor that is wrong some of the time would steer the project
    in a more correct direction if the first builder gets its input sooner, as long as it can overrule such
    low-confidence answers later, as the owner does now. The owner also asked whether this Opus session is always the
    one that looks through the archive, and whether it is triggered for every question or answers several in a bulk.

80. **9 November 2026** (the core). Asked: the design session planned what follows the first core (each game taking its
    copy, then a review of the rule files with a shared game-design module, then the scripts both games keep) and found
    that a writing pass named an old Fable. Decided: all of that must be done. The owner asked whether to run a Fable
    5.2 session for it now, and whether the rules state the newest version on all models (Haiku, Sonnet, Opus, Fable),
    so that numbers never need updating and sessions just use the latest iteration of each.

81. **9 November 2026** (the core). Asked: the design session answered that rules name models by family only and that
    the owner need start no session for the core. Decided: it is important that the rules say specifically the newest
    version, so that an old version is never got by accident. The owner asked who does round 3, since neither the snakes
    nor the Amarna orchestrator can work in the agent-rules repository, and yet the owner is told not to start any new
    Claude Code session for it.
