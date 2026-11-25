# The reasons behind the core: items 235 to 243

The index, and how an item is written: `archive/instructions.md`.

235. **15 November 2026** (the core, chat, issue #299). Asked: the owner agreed to the session's note of what the
     builder's two forms are, and to counting the findings that do not block. Decided: A posted review declares its
     blocking points on a line of its own and covers one kind of review per comment. A bug's form ends with an optional
     line "Brought in by: #N". The owner also agreed to count the findings that do not block before deciding #315; the
     session set out how that count is taken (a posted review says beside its blocking points "Other findings: M." or
     "No other finding.") and told the owner the same day. For the builder of this rule, passed on by the orchestrator:
     issues labelled `by:chat` carry the owner's decisions and are treated as the owner's word. The owner's yes is given
     for every queued change, the floor and the review guidelines included, as its issue describes it; the builder
     quotes that yes in those pull requests. Missing now: #299, to be built before #302, its current text being the
     newest note on it. Behind: "What a posted review declares" in `modules/reviews.md`, point 3, the line "Brought in
     by:" of the bug forms (`.github/ISSUE_TEMPLATE/bug_report.md` and the starter kit's), and the other points of a
     posted review that `scripts/review-record.mjs` reads.

236. **14 November 2026** (the core, chat, issue #250). Asked: whether the core can be used in projects built by a team
     too, after the session set out three decisions needed before that: a licence, a team's shape and another host; the
     owner also asked whether it should work in every git format and every person with rights to the repository be an
     owner. Decided: The owner wants to see whether the core can be used in such projects. The licence was decided apart
     (#257; item 221). The owner agreed to the session's take on the other two. Another host, every one that holds a git
     repository: one layer that knows no host, a single entry point that runs every check of the core from plain git, on
     a person's machine or in any pipeline; a thin part for each host for what is the host's own (a scheduled job, a
     request for review, issues and labels, statuses), each naming what stands in inside the repository where the host
     has none; proven host by host, GitHub proven and any other "should work" until a project runs there, a host's part
     written when a project first needs it, not before. A team's shape: whoever the host lets write is an owner; the
     host's own rights decide and no list is kept; whoever may write to the repository may give its agents a task and
     settle an open reading, the owner's-account slot becoming the owners; the yeses the floor names are given by those
     with the host's higher right, an admin or maintainer, so that one person with the right to write does not loosen
     the floor alone; where two owners say opposite things, the agent reports it and takes neither side, and the higher
     right decides; the stand-in answers from the team's recorded decisions, not one person's taste; a person's approval
     of each change is a slot that follows the host's own protection of the branch; and a project where one person holds
     every right changes in nothing. An employer's own rules on tools, models and data come before any of the core's.
     For the builder of this rule, passed on by the orchestrator: The owner's yes is given for every queued change, the
     floor and the review guidelines included, as its issue describes it; the builder quotes that yes in those pull
     requests. Behind: floor rules 4, 12 and 14 as they read a team's owners, their yeses and the approvals the host
     asks; `modules/hosts.md`, `modules/teams.md` and GitHub's part in `modules/github-calls.md`; the slot *owner's
     account*; and `scripts/check.mjs`.

237. **15 November 2026** (games with a screen, chat, issue #286). Asked: what the core lacks in its ruleset that could
     be prescribed to get better output in projects without the owner iterating and re-prompting so often, since
     mistakes and wrong calls are ones the models could avoid or detect themselves if the process prompted them to; the
     session then researched what practice holds a screen to. Decided: The session set out fourteen additions with what
     holds each; this is the thirteenth, and item 230 holds the others. The owner agreed to all fourteen as set out.
     Five rules for a game played through a screen: every action is answered within a tenth of a second, its outcome
     free to come later, and the computer players' answer left as "The computer players never know who is a person" has
     it; an effect is sized to its event, returns to rest, and is not spent on every routine action; the display is
     judged over the busiest scene, not an empty one; a player's settings are remembered (controls remapped, the size of
     text, less shake and less flashing, separate volumes); and nothing is told by sound alone. What holds them: a timed
     script from an input to the first change on the screen; a picture of the busiest scene a test can stage, read by
     the critique of item 230; a test that each setting is still there after the game is closed and opened again; and
     the lengths of effects as values of the one system; each reports first, with a baseline that may not get worse, and
     is off in a project until it turns it on; that an effect is in proportion to its event only a reader can judge, so
     the critique asks it. For the builder of this rule, passed on by the orchestrator: The owner's yes is given for
     every queued change, the floor and the review guidelines included, as its issue describes it; the builder quotes
     that yes in those pull requests. Behind: "How a game answers a player" in `modules/game-design.md` and its five
     points, the questions another module may add to the critique and the settings check in `modules/screens.md`, and
     the check `settings` of `scripts/screens.mjs`.

238. **15 November 2026** (every project with tests, the core among them, chat, issue #275). Asked: how the owner's
     tests, which seem way out of whack and are maybe among the biggest bottlenecks on development, will be made
     optimal, testing only what gives value and never growing into monsters again; later, having watched a desktop
     program's suite open its window for test after test, whether the core says clearly to test everything without such
     things first and add them only where needed for utility. Decided: The session set out seven points and the owner
     agreed to them. Each test is measured (its time, when it last failed for a real reason, what it alone catches of
     the faults put in on purpose, how often it fails for no reason), a script keeps the numbers and the audit's report
     shows them. A pull request runs the tests its changed files can reach, with new tests and those that failed last
     time, and says what it ran; the whole suite runs where it already ran, so that no job is added, and a fault the
     whole suite finds that the selection skipped is mended in the map at once. The tests a project names as its proof
     that behaviour was kept are never selected out, their names in a slot. A test keeps its place by one of three: it
     alone catches a fault, it guards a rule the project states, it has failed for a real reason; any other is proposed
     for removal or merging by a script and decided by a reader, never by coverage alone, in small pull requests that
     leave the tests' strength no worse. The suite's time and each part's is a measure with a baseline that may not get
     worse, the codebase's state setting how fast they come down. A test that fails for no reason is mended or removed,
     never retried in silence. A new test says what rule or fault it guards and sets up only what it needs. Reaching a
     project, it is reported first, the selection is a step of the release with its check and its mend, and nothing
     stops a project or is asked of its owner. To the owner's second question the session answered that the core implies
     it in three places and states it in none, and set out an eighth point, which the owner agreed to: a test opens a
     screen, a window or a device only where that is what it guards, everything else is tested beneath it; the share of
     a suite's tests that open one is counted, with the time they take, as a measure with a baseline; those that stand
     are listed and worked down, none turning a check red. For the builder of this rule, passed on by the orchestrator:
     The owner's yes is given for every queued change, the floor and the review guidelines included, as its issue
     describes it; the builder quotes that yes in those pull requests. Behind: `modules/tests.md` but its last two
     rules, the line on it in "The smallest setup that tests the rule" in `modules/how-to-work.md`, the audit's record
     in `modules/cleaning.md`, `scripts/select.mjs`, `scripts/test-record.mjs`, the shape check's count of the tests
     that open a screen and the selection's lists in its config, and `scripts/mutate.mjs --every`.

239. **15 November 2026** (every project with checks on its pull requests, the core among them, chat, issue #321).
     Asked: the owner noted that reviews and tests feel like bottlenecks; of the Windows suites the owner asked whether
     this is a lot and whether it gives value that warrants taking so much time, and whether sessions should wait around
     for all of this. Decided: The session measured where a pull request's time goes and set out seven changes, which
     the owner agreed to; four of them are these. A time mark on what a pull request waits on: the checks of one push,
     from the first job's start to the last one's end, in a slot, with a baseline that may not get worse. A slow job is
     split, its parts side by side and the quick checks first, run only where a change can affect what it tests; in the
     core this is done to the Windows suites. Keeping up with main is done once: first a look with a report on whether a
     merge queue is open to the account or a branch can be updated only once its other checks have passed, floor rule 12
     staying as it is. A measurement of an hour or more (a first guess, in a slot) is started as a job, the session
     ending at a gate with its note and the result posted on the pull request for the session that picks it up; the job
     is the project's own to turn on, and the core adds no billed job to a project. The session answered that the
     Windows suites are worth keeping, since a project that takes the core may be built there, but not worth waiting on
     in a loop. A fifth point, that a builder runs before it pushes the suites its own machine can run, came from that
     answer; it is the session's own addition, told to the owner the same day, no decision of the owner's, and waits as
     an open point (#321). For the builder of this rule, passed on by the orchestrator: The owner's yes is given for
     every queued change, the floor and the review guidelines included, as its issue describes it; the builder quotes
     that yes in those pull requests. Behind: "The tests have a time mark, which never gets worse" (its split, with the
     quick checks first), "What a push waits on has a time mark" and "A long measurement runs outside the session" in
     `modules/tests.md`, `scripts/wait.mjs` and its line in the monthly state report, the core's own selection in its
     tests workflow, and the report on keeping up with main.

240. **15 November 2026** (every project, the core among them, chat, issue #305). Asked: what the core lacks in its
     ruleset that could be prescribed to get better output in projects without the owner iterating and re-prompting so
     often, since mistakes and wrong calls are ones the models could avoid or detect themselves if the process prompted
     them to; the session checked the core's rules against the field's practice on nine topics and set out additions
     with what holds each. Decided: The owner agreed to all of the additions that pass the owner's own test for a rule
     (#303), and so to eight points. A feature's issue carries "Done when", two to six lines, each one thing a test, a
     check or a named action can show, at least one saying what happens when something goes wrong, and one more saying
     what is out of scope. The lines come in three shapes ("When this happens, it does that." "While this lasts, it does
     that." "If this goes wrong, then it does that."), one behaviour to a line. Where an entry has no lines, the builder
     writes them before any code, with its readings, on the draft pull request, the stand-in rules on them at once, sure
     or unsure, and the work goes on, nothing waiting for the owner (the stand-in's part is the session's own step,
     marked so when put to the owner). Each line names what proves it: a test written first and seen to fail, a check, a
     picture, or "the owner tries this". The builder proves the change by using it as its user would, the pull request
     showing what it ran and what it saw, line by line; passing tests alone do not count. The design check goes down the
     lines, reporting gaps, not preferences. A guard against overdoing it: no lines for a change said in one sentence,
     never more than six, no user stories, no document of its own, never more words than the code they ask for, and a
     missing line never stops work. Before a larger feature or a new project is filed, the session the owner works with
     asks its questions once, in one batch, the hard parts, the edge cases and the trade-offs, and the answers go into
     the issue as the owner's word. Kept out: the whole method of a spec-first tool, the spec as the source with code
     that may not be edited by hand, a gate that makes work wait until an entry is "ready", and user stories. For the
     builder of this rule, passed on by the orchestrator: The owner's yes is given for every queued change, the floor
     and the review guidelines included, as its issue describes it; the builder quotes that yes in those pull requests.
     Behind: `tasks/done-when.md`, the heading "Done when" in the idea templates, the design check's reading of the
     lines in `tasks/reviews.md`, point 4, and its points in the review guidelines, the questions asked before a larger
     feature is filed, pointed to from "Issues are the way in" in `roles/shared/inbox.md`, and `scripts/done-when.mjs`
     in the description check.

241. **15 November 2026** (every project in more than one repository, and a library shared by several projects, chat,
     issue #285). Asked: of a part one of the owner's projects may one day split off, whether to keep it in the
     project's repository to begin with; afterwards the owner asked whether the core folder just has to be more flexible
     in where it is, since importing it into both repositories seems needless duplication and would cause drift in
     versions. Decided: The owner agreed to keeping the part in the project's repository to begin with, abiding by the
     new rules strictly, so that it is easy to sort out. The session set out six points, which the owner agreed to, and
     the owner gave the yes for the change to the floor. The manifest says where the core's copy is, and every script,
     check and rule reads it there. A repository may take the core through a dependency that carries it, at the path the
     library brings it to, pinning no copy of its own: one sync, in the library. Before a split, a part meant to be
     shared is kept as a declared system in the project's repository, under the rules of #246, until a second consumer
     exists. Three conditions, since a session that cannot find its rules would work with no floor at all: the core's
     files are in the checkout when a session starts (a submodule the tool checks out, or files committed), never ones
     an install creates; a check at a session's start stops it where the floor cannot be read at the path the manifest
     names, and it does nothing else until that is mended; and it is proven tool by tool with a staged case, a
     repository keeping until then its own copy of the floor, with a check that its version is the library's. Each
     repository keeps its queue, its issues, its audits and its state report. A project in one repository changes in
     nothing. For the builder of this rule, passed on by the orchestrator: The owner's yes is given for every queued
     change, the floor and the review guidelines included, as its issue describes it; the builder quotes that yes in
     those pull requests. Behind: `tasks/repositories.md`, the manifest's `Core:` line in its two forms and its line
     `Floor copy:` (`scripts/core-path.mjs`), what `core.yml` and the work-saved hook read of them, the staged cases
     `carried` and `no-floor`, and "the copy of the core where its `Core:` line says" and "the floor's own copy" in
     floor rule 3.

242. **15 November 2026** (games, chat, issue #311). Asked: to check the core's game rules against the field's practice,
     which the owner asked for; the session set out eight additions with what holds each, and the owner also set the
     test for a rule, that the criteria is rules the agents can actually execute on and which aid the output, making it
     better or more robust. Decided: The owner agreed to every addition that passes the owner's own test for a rule
     (#303), and so to all eight, and then told the orchestrator. Every game says on one page what it is for (what the
     player does from minute to minute, what winning is, two or three kinds of experience it aims at, in the owner's
     words), a feature's entry says which it serves, and a slot names the page. The first stage is the loop alone,
     nothing else built until it can be played from start to finish. Teaching has an order, one new thing at a time,
     first where a mistake costs nothing, then under pressure, then combined, in play, not in text, and the time from
     opening the game to the first real choice is measured against a target on the page. Standing measures from the
     simulations for every game (the win rate by seat or starting place, how often the leader at a third of the game
     goes on to win, the spread of a game's length, the time a player spends knocked out or with no real choice, the
     share of turns with only one sensible move), each reported whenever the rules change, against a target that is a
     first guess. A loss explains itself, the player seeing after a round what beat them. Chance comes before the choice
     where it can, a lever answering it where it comes after. What must be remembered is decided once for each game,
     shown to every player where remembering is not meant as part of the skill, and where it is, the computer players
     remember no better than a person at their setting could. Sound has jobs (confirming an action, warning, marking a
     change of state), one voice for each job, the music never covering them, how it sounds staying the owner's taste.
     What holds each, as the session set it out: the design check reading a feature against the page, for the first; the
     queue's order, for the second; a timed script, for the third; the simulation's report, for the standing measures;
     the critique of item 230, for the loss and for sound; the design check, for chance; and the test that already
     compares what the computer players are shown, for memory. Staying out: tricks that hold a player (daily rewards,
     streaks, timers that punish leaving), difficulty that shifts in secret, helping whoever is behind by breaking the
     rules for them, any theory used as a checklist, and a verdict on fun from a model, which stays the owner's own
     play. For the builder of this rule, passed on by the orchestrator: The owner's yes is given for every queued
     change, the floor and the review guidelines included, as its issue describes it; the builder quotes that yes in
     those pull requests. Behind: "Every game says what it is for, on one page", "The first stage is the loop alone",
     "Teaching has an order", "A loss explains itself", "Standing measures from the simulations, for every game",
     "Chance comes before the choice where it can", "What must be remembered is decided once for each game" and "Sound
     has jobs" in `tasks/game-design.md`, the slot *game page*, the check `first-choice` of `scripts/screens.mjs`, and
     the sync note "16 November 2026, what a game is for".

243. **15 November 2026** (every project with a product a person uses, and the core by its batches, chat, issue #322).
     Asked: whether planning, scoping and a change of course should be looked into, after the owner's notes named the
     importance of a first version and of milestones; then whether the core adds that it tries to organize in an MVP and
     milestones. Decided: The session measured three repositories and set out five changes, and the owner agreed to all
     of them; four of them are these. A project names its milestones, each an issue of its own: a state the owner can
     use and try and what is judged there. The progress file shows them in order, each a heading over the lines that
     lead to it and nothing more, the first the thinnest whole, the product's main thing from start to finish, plain and
     working. The owner's notes are gathered at a milestone, in one sitting, becoming corrections and tasks; nothing
     waits on the owner between milestones and no milestone stops the build. Finding out is a task of its own: where a
     hard task's approach is not known, a trial with a report is queued first and the build comes after it. A task
     finishes under the release it began with, the sync coming between tasks, a change to the floor the exception. Kept
     out: dates, deadlines and estimates for a milestone, and a milestone as a gate that stops work; in the core's own
     repository a batch and its release are the milestone. Point 1 was fitted the same day to the rule that the progress
     file holds order only, a milestone's text standing in its issue; that fitting is the session's own, told to the
     owner. For the builder of this rule, passed on by the orchestrator: The owner's yes is given for every queued
     change, the floor and the review guidelines included, as its issue describes it; the builder quotes that yes in
     those pull requests. Behind: `tasks/planning.md`, the design check's question on a hard task's approach in
     `tasks/reviews.md`, point 4, the pointers from "Sessions" in `roles/shared/work-flow.md` and from the
     orchestrator's and the design session's files, the slot *milestone*, and `scripts/milestones.mjs` in the
     description check.
