# The reasons behind the core: items 244 to 262

The index, and how an item is written: `archive/instructions.md`.

244. **15 November 2026** (every project, the core among them, chat, issue #302). Asked: what the core lacks in its
     ruleset that could be prescribed to get better output in projects without the owner iterating and re-prompting so
     often; on taking all the additions at once, whether adopting them all lets the owner see what makes a difference
     and shrink down in time; and, before points 5 to 7 were added, whether citing a rule means the rule made the output
     better, and whether what is evaluated is what matters or only proxies that do not measure what is wanted, which is
     a better, more efficient, readable, user-friendly and robust codebase. Decided: The session checked the core's
     rules against the field's practice on nine topics and set out additions with what holds each; the owner agreed to
     all of them that pass the owner's own test for a rule (#303), and so to seven points. (1) An issue or note that
     corrects merged work carries the label `correction`, names the pull request it corrects and says its kind (the task
     was misread; it looks or feels wrong; it does not work; a rule was missing), set by the session that records the
     owner's word, and by a builder whose bug traces to a merged pull request. (2) The monthly state report shows, for
     the core and each project that takes it, corrections for every ten merged tasks by kind, the time from joining the
     queue to merge, the share of merges followed within two weeks by a fix or a revert, the share of merged work that
     was unplanned mending, a bug's time from report to its fix live, the cost of each merged task and of each not
     corrected afterwards, the open hours with no event for over an hour, the commits after a pull request was ready by
     cause (a failed check, a review finding, measuring again), the tokens carried into each answer, the core's share of
     merged work, and how the code grows (its size, its files over the size mark, its functions over each mark, its
     dropped errors), this last a number to read and no target. (3) A first reading, from history, for the two months up
     to 15 November 2026: the past corrections found by reading the issues and reports, kept beside every later one. (4)
     No process number is a builder's goal, none standing in a brief, a rule or an entry as a target, and only
     properties of the code keep a baseline. (5) The five outcomes are named first (the product does what was asked; it
     is fast; a newcomer can read and change it; a new user can use it; it does not break), the report leading with the
     direct measure of each and showing every other number under the outcome it stands for, and saying where an outcome
     has no direct measure yet. (6) Each count is given with the range chance alone would give, twice its square root,
     and months are added together where a count is under 30. (7) An exemption leaves a mark: a pull request says in a
     word where a rule lets a thing be left out ("No cost line: the script printed none."). Kept out: counts of lines,
     commits or pull requests as a measure of how much work was done or how well, targets for speed, a table ranking
     models or sessions, a dashboard, and asking sessions how it went. Counting the owner's corrections is the session's
     own fitting of the standard measures, marked so when put to the owner. For the builder of this rule, passed on by
     the orchestrator: The owner's yes is given for every queued change, the floor and the review guidelines included,
     as its issue describes it; the builder quotes that yes in those pull requests. Behind: "A correction is marked" in
     `roles/shared/inbox.md`, the label `correction` in `scripts/labels.json` and its check in `scripts/labels.mjs`, "An
     exemption leaves a mark" in `roles/shared/work-flow.md` and its check in `scripts/pr-description.mjs`, "The state
     report leads with the outcomes" and "No process number is a builder's goal" in `tasks/cleaning.md` and the review
     guidelines' line on a brief, `scripts/outcomes.mjs` and `scripts/outcomes-read.mjs`, and the first reading in
     `reports/`.

245. **15 November 2026**; numbered 227, as item 227 (#313) also was, until 16 November 2026 (the core; in a chat with a
     session the owner works with, issue #342, a note filed by the builder of #242, and as the owner then told the
     orchestrator, who passed it on word for word to the builder of this rule). Asked: shown that the list of what never
     matters to a project (item 224) left out the core's own queue and the core's workflows that no project calls, so
     that nearly every release still asked a sync, the owner was asked to add them. Decided: `QUEUE.md` and those
     workflows join the list, on the condition the session proposed: each workflow is named one by one, the list holding
     no "and similar" and no pattern. Behind: the core's own files named in "A release that brings nothing a project
     takes asks no sync of it" in `README.md`, "How a project takes the core", point 1, and `OWN_FILES` in
     `scripts/releases.mjs`.
     Changes: 224.

246. **14 to 16 November 2026**, #252. A project's copy carries each item's reasoning and not the owner's words, a bare
     yes is never quoted, an order for now is no rule, and rule text points to no item: a stand-in needs the reasoning,
     and every session paid at its start for pointers a builder never followed.

247. **16 November 2026**, #486. How the core reads a language, and whether its own scripts get types, are choices of
     the core's that are hard to undo, so a record picks them by a trial and a challenger, not by what grew: the owner
     wants the core to read whatever stack is best for a project, not a project's stack fitted to what the core reads,
     and a format someone else defines read by a package, not by hand, how such a package reaches a project settled
     once in that record.

248. **16 November 2026**, #481. A fact about a project's set-up that can be read exactly is read by a script, a row of
     the manifest or the owner's word only overriding it, and a choice has a default the owner's word changes, so that
     nothing waits on a setting: a project that takes the core on trust sets nothing, and twice in one day a rule had an
     owner state something about the set-up that another owner would never say. It stands behind the mark on each slot
     of the README's table, the owner's account read where a person's account holds the repository, and the tools a
     project's record shows read before the core's default.

249. **15 November 2026**, #303. A rule joins the core only where an agent can carry it out and it makes the product
     better or sturdier, and only from a standing word; each names the number it should lower and the outcome it
     stands for, proof is sized to what a thing costs others, and the rules are pruned by those numbers every two
     months and at each new generation of model, the owner deciding which go: the owner chose to start wide and cut
     back by what makes a difference, and an unneeded rule costs every session that reads it.

250. **16 November 2026**, #412, a case of #481. A posted security review counts from each person the host lets write
     to the repository, read from its rights each run, rather than from a list of a team's owners kept beside them,
     which goes stale; a list named to the check stays for an account that is no owner. It stands behind who the
     `security-review` status counts.

251. **17 November 2026**, #515. A choice that is hard to undo is argued as a case is: a long list before the options,
     each drop saying whether it rests on a fact, each option kept tried on the hardest part, a challenger that first
     searches for what the list lacks, a pick made blind, sessions of two providers where two are at hand, and a judge
     that wrote no part of the record, the owner told and able to overturn with nothing waiting; each project is asked
     once what it would be built on today, a move that ships in steps is built, one that must happen at once is capped
     by what the project's own recent work cost and is the owner's to sign off beyond it, and every move passes the same
     gates: the core's first records showed options limited to what an issue named and an author answering its own
     challenger, and the owner wants such picks robust, never a large rewrite for a small gain.

252. **16 November 2026**, #488, points 1, 2 and 6. A package new to a project is looked up in its registry, which
     fails a name it does not know and one first published under 90 days ago, a bad package has a procedure, and a
     new one is taken in an order: a model sometimes names a package that does not exist and someone registers the
     name, such a name is new and has no history, which a script can read, and the floor said what to do about a
     leaked secret and nothing about a bad package, whose first hour is when it matters.

253. **17 November 2026**, #526, the first step of the path #519's judgment set out. The core's scripts promise to run
     on the least long-term Node line as well as on the pin: a project's machine keeps its own Node where it is at or
     above that line, or fetches the pin where it is below or has none, and the core's suites run on both, so that every
     later step of the path stands on a Node a project's machine already holds while the checks keep one exact Node. It
     stands behind "Node" in `tasks/updates.md`, `.node-least`, `scripts/node.sh` and the suites' matrix in
     `.github/workflows/tests.yml`.

254. **17 November 2026**, #545. A pruning's list leads with the rules no holder has, worst first, each with one
     proposal: a check or staged case that could hold it, a move to a module read on need, or that it goes; the checks
     are queued without a further word, a check only where it never guesses and its upkeep pays, a maintained tool where
     one reads the breach and a linter's rule that can be switched on before a check written by hand, while the moves
     and removals are the owner's, a few at a time, and a floor rule is proposed a holder, never to go; the first
     sorting was done at once: the owner, asking how far the core's rules are enforced, learned that 189 of its 310
     rules were held by being read alone, the kind a study found followed at more cost with no gain. It stands behind
     the order of the pruning's list and `reports/unheld.json`.
     Changed by: #887.

255. **16 November 2026**, #486, points 6 to 8 and 11. A job a maintained package does is done by it, in all code, a job
     on a format or language someone else defines first; a session searches before it writes more than about 50 lines
     for one job, names what it looked for, and writes by hand only where the job is small and stable, no package fits,
     fitting costs more than the job, or the package brings too much, the package passing the floor and what the
     platform brings coming first: for a session code is cheap to write, so it writes where a person would reach for a
     package, and the cost comes later as upkeep and as bugs in readers written by hand; point 6 gained its search on 17
     November. It stands behind "A job a maintained package does is done by it" in `tasks/code-shape.md` and its
     pointers in `roles/shared/how-to-work.md` and the review guidelines.

256. **17 November 2026**, #593, point 7. A trial of a maintained tool in the place of a part of the project's own runs
     the tool on the case of each bug filed against that part, taken from the test cases its merged fix added or
     changed and never from an issue's text, which may carry outside text, and its record says by number which the tool
     reads and which it does not, so that the cases a part was mended for are the first evidence of whether the move pays: of the
     30 bugs filed on the core by that day that were a case a check's writer had not thought of, 11 stood on the NuGet
     and copies checks, the parts the first trials would replace. The owner agreed to it, with the issue's other points,
     after asking what the core lacked that let an inventory's check miss a part. It stands behind "A trial of a
     maintained tool replays the part's past bugs" in `tasks/choices.md`, and the inventory's line `Replayed:`.

257. **18 November 2026**, #457, points 2, 4 and 5. A test that needs time has it handed in and asserts no duration on
     a real clock, a measure of speed excepted with room above its floor; a push that merges an up-to-date pull request
     whose whole suite passed on the same tree runs no test again; and the audit's seventh question asks where the tests
     of portable code run and what that costs, since in a project of another owner (#426) the one failure at random
     came from a duration asserted on a real clock, and every push to its default branch ran the whole suite again
     after its pull request had. The owner agreed to the issue's points, and to point 4's skip being built in
     the core's own job of tests and listed for projects as a step with its cost, the starter kit holding none. It stands
     behind "A test asserts no time measured on a real clock" and "A tree that passed is not run again" in
     `tasks/tests.md`, and the seventh question in `tasks/cleaning.md`.
258. **18 November 2026**, #654, the owner's decision. Other publishers' code is registered, never carried: each package
     the core's scripts run is named in a lock file in its registry's own form, at one exact version, and installed
     from it by the sync, at a session's start and in each job before a check, into a folder git does not track; the
     folder the core carried them in goes (#528, #601). In a project too, what it ships or runs of another publisher
     is named in a lock file, however it is loaded (point 9). The owner decided it, after a session had set out what
     carrying costs and buys against registering: one standard mechanism, the host's alerts and update proposals
     reading what is depended on, a replacement a change to a lock file, and a failed fetch run again. It corrects
     what #601 brought in (Brought in by: #601; Correction: rule missing; #302). It stands behind "Code of another
     publisher is named in a lock file" in `floor/topics/dependencies.md`, and the dated entries of `CHOICES.md`.
259. **18 and 19 November 2026**, #702. Ready pull requests merge in a line where the host asks an up-to-date branch:
     only the first whose reviews answered with no finding open is brought up to date, one in a round of fixes letting
     the next go first; where the host's merge queue is on, it keeps the line, and where one is offered and off, its
     owner is advised once; whether a queue is offered and whether minutes are billed are read from the host; a new
     lane starts only where it gets its work merged sooner; and where the front's run stands queued behind the host's
     cap, the queued runs of pull requests not next in line are cancelled, none of the front's or the default branch's.
     On 18 November about 180 runs of the core's tests were started while a handful of pull requests merged, each
     merge making every other stale, and the front's run stood queued behind runs thrown away at the next merge; on 19
     November seven of fourteen merges waited 15 to 63 minutes because the front was still being fixed. The owner asked
     for what is most efficient for each kind of repository, so that no project makes a worse choice for what fits the
     owner's, and agreed to the issue's points as worded, point 1 as reworded on 19 November. It stands behind "Ready
     pull requests merge in a line" in `roles/shared/work-flow.md`, "A new lane only where it merges sooner" in
     `roles/orchestrator.md`, and "The merge line follows the host" and "Where the front waits behind the cap, runs far
     from their turn are cancelled" in `tasks/hosts.md`.
260. **19 November 2026**, #457, point 1, built as #715 orders it. A test reaches a real clock or another process
     only where the clock or the process is what it guards, counted by the shape check with the share of the tests'
     time each takes, those that stood listed and a new one failing, since in a project of another owner (#426) the
     few tests that started a process, and those that reached a real clock, took most of its tests' time. The owner
     agreed to the issue's points, and asked on 19 November that #715's work, the count first, be a priority. It stands
     behind "A test reaches a real clock or another process only where it guards it" in `tasks/tests.md`.
261. **19 November 2026**, #733, point 1. Where users get a release and not each merge, a pull request merges on its own
     checks and reviews passed on its head, up to date or not; the default branch is tested at its newest commit, a red
     one fixed before any other merge, and a release cut only from a green one; where every merge goes live, a pull
     request is brought up to date first, as before. In 24 hours of the core's tests, 256 runs were started for 27
     merges, a large share of what the host lets run in a day, and a merge took 45.8 minutes, 19.7 of them
     waiting for a turn, while what users get is built from a release that waits on a green default branch anyway. The
     owner agreed to the point as worded on the issue, and to its being a priority. It stands behind floor rule 12 and
     "Where users get a release, a pull request merges on its own green checks" in `tasks/hosts.md`.
262. **17 November 2026**, #563. The audit's reader asks of a project's documents what it asks of its code: which of
     its descriptions no longer say what the code does, each with the document and line and what it no longer
     matches; each such find is a task of the cleaning lane, taken at the dose, and the audit mends nothing and adds
     no job. "No description left untrue" is held by being read, so what a change misses stays untrue until someone
     happens to read it. The owner agreed to it in a chat session, as the third of three ways to gain on what the
     core already has. It stands behind "The audit's reader has a fixed brief and fixed questions" in
     `tasks/cleaning.md`.
