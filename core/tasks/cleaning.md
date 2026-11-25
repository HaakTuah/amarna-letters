# Cleaning, and the audit of how code is put together

Read by a builder that takes a cleaning task or cuts or joins files, by the session that takes an audit's task, a
reading's against the core or the state report and by its auditor, by the orchestrator when it hands out lanes, and by whoever writes an issue that asks
something of every or all of a kind, or builds what it asks (#593): the kinds `cleaning`, `audit` and `sweep`. What the
code is held to: `tasks/code-shape.md`.

- **The state of a codebase sets the dose.** By default a codebase is in one of three states, which
  `core/scripts/dose.mjs` reads from the shape check's baseline: the share of the functions and imports the check
  reads that the baseline lists.

  | State | The baseline lists | The cleaning lane's share | An audit by a reader |
  | --- | --- | --- | --- |
  | In debt | more than 5% | most of the work | after each cleaning batch (the baseline a tenth smaller than at the last audit), and 30 days after the last at the latest |
  | Paying down | less | a fixed part, a quarter | every 30 days |
  | In standard | 0.5% or less | nothing beyond "Never worse" | only once what the check reads has moved by a quarter since the last |

  The numbers are first guesses, which use tunes. The one condition that changes the state: the project's owner names
  it in one line of the manifest, its *dose*, and is not asked to. The trigger is the scheduled look
  (`roles/orchestrator.md`): it keeps one issue for the cleaning the state makes due and one for each audit that
  is due, each a task an agent takes alone, and the orchestrator hands out lanes by the share. The share is shown: the
  cleaning issue says what the lane got, of the changes of the last 30 days those that lowered the baseline, against
  its target. In debt the baseline is smaller at each audit than at the last; where an audit comes due by its days
  and it is not, the look labels the audit's issue `needs-owner`. It does not mean that a check blocks a feature for a
  missed share, that anything fails or waits where the baseline did not shrink, or that all work goes to cleaning:
  some of a project's own work goes on in every state. What is hard, in every state, is "Never worse" and that the
  measures run on every pull request, so the state is always current. Reason: a codebase already in standard needs
  little auditing, one in debt gives cleaning most of its work for a time, and neither should rest on someone
  remembering to measure. Held by the shape check and by the scheduled look, which opens the tasks; the share by no
  check, on purpose.
- **How cleaning is done.** By default a cleaning task is a small pull request that proves, by the project's tests,
  that behaviour is unchanged, and takes what it mended out of the baseline; a fault the tests' strength baseline lists
  is mended by a test that catches it, and taken out by `core/scripts/strength.mjs --lower <its file>`. Its builder
  picks and shapes it so:
  - **worst first,** which means where change meets tangle: a hub or a long file that is changed often, as the look's
    issue lists them (what the baseline lists of a file, times how often it changed);
  - **where the work is:** ahead of those, the files the next entries of the *progress file* will touch, so that each
    task pays back at once;
  - **safe first:** before a boundary moves, the project's tests must be able to prove that nothing changed; where
    they cannot, those tests are the first task, and whether they can is the first thing a project's audit answers;
  - **in stages, where the refactor is large:** a stage may leave a bridge, a named piece that lets old and new stand
    side by side, with the task that removes it already in the queue. "No stopgaps", a rule of design for what a
    product offers its users, does not forbid a bridge;
  - **a package that binds the code to one platform, swapped for one that does not,** is ordinary cleaning where the
    tests prove behaviour kept: no choice that is hard to undo (`tasks/choices.md`), and nothing changes in what
    the product is sold or shipped for.

  A part that is rewritten instead states what it keeps (`tasks/code-shape.md`). It does not mean that the numbers
  are the aim: a baseline can empty while the code stays one piece, so the audit's reader judges what no number
  shows. Reason: the owner wants a codebase that cleans itself, by rules that are there for a reason and pay off in
  the long run. Held by the reviews ("a split goes in its own PR, behaviour proven unchanged",
  `roles/shared/how-to-work.md`), by the shape check, which fails a mended entry left in the baseline, and by the audit.
- **The audit's reader has a fixed brief and fixed questions.** By default an audit is a run of the measures
  (`core/scripts/code-shape.mjs`) read by an auditor (`roles/auditor.md`). The session that takes the audit's task
  starts that reader, writes its answers as a report in the *audits*, named by its day, beside the
  last one's, and records the audit in the baseline (`core/scripts/dose.mjs --audited`), in one pull request.
  - **The brief:** it answers for the project's owner and for the cleaning lane: where the code resists change, what to clean up first, and what no check sees.
  - **Ten questions, the same at every audit,** on this scale: 0, nothing found; 1, found, and it costs no work
    yet; 2, it costs work today; 3, it stops a lane or makes work *one at a time*.
    1. Can what each system offers be said in a sentence, and do the others use only that?
    2. How many systems would each of the next three entries of the queue touch?
    3. Where do change and complexity meet?
    4. Which files always change together and live apart?
    5. Can each part be tested alone, and how long does it take?
    6. Does any data have two owners?
    7. What ties the code to one platform, and is each tie needed? And where do the tests of the code outside the
       domain `platform` run, and what does that cost beside the cheapest place they could run (#457)?
    8. What does a reader see that no check does?
    9. Which of the project's *descriptions* (its README, its design notes, what it tells a user, the pointers in its
       rule files) no longer say what the code does, each by its document and line and the file or behaviour it no
       longer matches? Each it finds is a task of the cleaning lane, taken at the dose (#563).
    10. What here is a version built by hand of something maintained, free to use, that does its job (a package, a
       tool, a standard), each with what would replace it? Each it finds is an ordinary task of the project's, taken at
       the dose, and a move among them is built in steps or capped and passes the same gates, as `tasks/choices.md`
       says of any move (#534). In the core's own repository the inventory (`INVENTORY.md`) is that answer, and the
       reader names only what it lacks.
  - **In the core's own repository** the reader is also given what `scripts/read-total.mjs --candidates` prints: the
    files several kinds of task open, most read first. It says of each whether a part is all most of its readers need,
    as "A cut or a join lowers the total read" asks.
  - **A limit on its own proposals:** beyond the auditor's, it proposes one too where a finding costs work today.
  - The tests are audited by the same reader. Where the project names a *mutation tool*, the session that takes the
    audit's task runs it on the whole codebase, outside the suite and on a machine where the project's tests may run
    (floor rule 18), with `core/scripts/strength.mjs --whole`, which writes the tests' strength baseline in the same
    pull request, one that changes no code or test; the reader reads its number beside the last one's
    (`tasks/code-shape.md`, #253). That session runs `core/scripts/test-record.mjs` too, with a whole run's report
    that names every test that caught a fault (`mutate.mjs --every`; Stryker run by `stryker.mjs` names none), and
    puts its table in the report; the reader decides on each test it proposes (`tasks/tests.md`).

  It does not mean that an audit made before these questions stood is made again: what it left unanswered is answered at the next. Nor does it mean that a dated record is brought up to date
  (`roles/shared/how-to-work.md`, "No description left untrue"), or that a job is added for the ninth. Nor does the
  tenth rewrite anything or turn anything red, put a project's code on the core's inventory, or ask the project's owner,
  whose dose it is to change. Reason: what was measured was fixed and what was judged had no standard, so two audits
  could not be compared; checks piled on make code harder to change; a description a change missed stays untrue until
  someone happens to read it; and code written before "A job a maintained package does is done by it"
  (`tasks/code-shape.md`) was asked by nothing whether something maintained does its job. Held by the
  scheduled look, whose issue for an audit says this brief, and by the reviews of the pull request that holds the
  report, which read that each question is answered on the scale.
- **A project is read against the core once, then for what each release changes** (#464). By default a project is
  read against the core whole once, from when it takes the core, and after that, at each sync that brings rules
  changed since the last reading (a release, or `main`'s newest commit for a project that follows `main`), against
  the rules added or changed alone. The one condition that changes it: a sync that jumps from a copy
  older than the core's last two releases; the sync says so (`core/scripts/sync.mjs`), and the session that syncs takes
  the record out in a pull request of its own, so that the next reading is whole. The trigger is the sync's step,
  which the scheduled look's issue of steps not done keeps: `core/scripts/core-reading.mjs` reads the record
  of the readings that its `--recorded` writes in the project, a mark of each rule of the copy at the last reading, those of modules not taken too, and asks a whole reading where it stands nowhere,
  else names each rule the project takes (the floor's and its modules', `--rules`) that no reading covered. The session
  that takes the task starts an auditor (`roles/auditor.md`) and, in one pull request, puts its answers in the
  *audits* as an audit's report is put there, files each gap as a task the project's agents take at the dose, a step
  only the owner can take labelled `needs-owner`, and records the reading (`--recorded`).
  - **Its question, for each rule it is given:** met, partly, not met or not applicable, with its evidence and what
    holds it in the project: a check, a test, the review, or nothing.

  It does not mean that anything fails, blocks or waits on the owner; that the reading runs at every sync; a second
  audit of how the code is put together, a score that ranks projects, that a module taken after a reading is read
  whole at its taking (its rules are read as they change, as the rest are), or that anything of the project's code or
  findings leaves it: the core gets counts alone, where the manifest shares them. Reason: the core tells a project what
  it lacks through checks and steps, each for one rule, and a reading of a whole project against the whole core found
  what none had: rules met only in part, many held by review or habit alone. Held by the sync's step
  (`core/scripts/steps.mjs`), read from the record; that a jump is said, by the sync's report alone.
- **The reading asks what a project holds twice** (#1087). By default the reading of a project against the core
  (above) asks too what the project holds twice or against the core, in this order of harm: a rule of its own that
  contradicts or loosens one it takes from the core and that the manifest's "Differences" does not declare; one that
  says what a rule of the core says, in meaning and intent, in other words; the same rule stated twice in its own files;
  a check of its own (a workflow, a script, a hook) that does the job of one of the core's; and a file of an older
  layout of the core left outside the copy, or documentation that restates the core's text. Nothing changes it. The
  trigger is the reading,
  whole or of the rules a sync changed, and every sync: first `core/scripts/twice.mjs`, which the sync runs, lists what
  it reads without guessing (text that is a copy of the core's or of the project's own, or reads close to one; a file
  outside the copy equal to one of the core's, at the copy or an earlier one; a call of one of the core's workflows made
  twice; a pointer to a path the core has left), and its `--fix`, run by the session that takes the reading's task in a
  pull request of its own that the usual reviews read, corrects only what is exact: Markdown equal byte for byte to one
  of the core's goes where no other file of the repository holds its name in any form (its file name without the
  extension, in any case, after percent-encoding and character references are decoded), and no pointer is moved for
  it, else it is listed with each file that names it; the second of two calls the same in every input goes; a pointer
  to a file the core moved unchanged moves to where it stands. Then the auditor answers, for each finding the script did
  not settle, the same, stricter or narrower, different, contradicting, or unsure, with its evidence, by meaning and
  intent. The session then takes out what says the same, the core's text or the one place kept for it standing; keeps
  what is stricter, narrower or different, declared under "Differences" on its owner's word where it replaces a rule of
  the core ("A project's own rules add to the core's", `core/roles/shared/how-to-work.md`); has a contradiction
  declared so on its owner's word, or takes it out; takes out a check the core's covers whole and notes one that covers
  more; and gives an unsure one to the stand-in, and to the owner where it stays unsure. It does not mean that a rule
  goes for a likeness of words, that a script decides by meaning or takes out a rule's text, that a rule of the
  project's that adds to the core's goes, nor that the floor's text, or a project rule its `AGENTS.md` calls a safety
  rule, goes without its owner's word. Reason: a project that held its own rules before it took the core keeps
  rules the core now holds, read twice by every session, and they drift apart. Held, for the script, by
  `tests/twice-test.mjs` and `tests/twice-kept-test.mjs`, on a project holding each kind exactly and nearly; for the rest, by the reading's record and
  its step, and by the reviews of each pull request that takes out or moves anything.
- **A sweep's scope is read, not listed** (#593). By default an issue names what it covers. The one condition that
  changes it: an issue asks something of every or all of a kind (an inventory, an audit, a sorting, a check of each
  file), a *sweep*. The trigger is such an issue written: whoever writes it names the source a script counts that kind
  from (the tracked files, a workflow's steps, the manifest's rows, `core/scripts/holders/`), and whoever builds the
  check that holds the sweep has it read its coverage from that source: each thing the source holds has its line in the
  sweep, or lies under a path the sweep marks as left out, with the reason, and the check fails each that has neither,
  saying the mend. It does not mean a sweep may leave nothing out: what it leaves out is said. Reason: a scope written
  as a list is as complete as its writer's memory, and nothing reads what a list forgot. Held by each sweep's own check,
  which reads from the source its issue names.
- **An inventory or an audit is challenged once for what it missed** (#593). By default one session makes an inventory
  or an audit. The trigger is its record written: the session that took its task then starts a fresh session that wrote
  no part of it, which reads the whole once and asks what it lacks: a part not listed, a tool not weighed, a question
  not put. Its finds are written into the record, with a line that opens `Challenged` and gives the day. It does not
  mean the trials of a choice that is hard to undo (`tasks/choices.md`), which stay for such a choice, nor that the
  audit's fixed questions change: the challenge asks what they did not. Reason: whoever builds a sweep builds what its
  issue names, and nothing in the flow asks what the issue itself left out. Held, in part, where a check reads that the
  line is there, as the core's does of its own inventory; whether the challenge was made, no check can read, and
  `core/scripts/holders.mjs` counts it among the rules held in part.
- **The state report leads with the outcomes** (#302). By default the monthly state report names the five outcomes the
  owner named, the product does what was asked, is fast, can be read and changed by a newcomer, can be used by a new
  user, does not break, each with its direct measure first or the words that it has none yet, every other number under
  the outcome it stands for, and what the work cost last; each count stands with the range chance alone gives it, twice
  its square root, and where one is under 30 the months before are added; while a move from one stack to another is
  open, the share of its code moved, which the session adds from the move's issue (`tasks/choices.md`, "A move has an
  end and states its cost"). `core/scripts/outcomes.mjs` writes the rest so, and whoever changes that script keeps the
  form. It does not mean a number is shown under an outcome it does not measure. Reason: most of what was counted were
  stand-ins, and a small count read as a trend misleads. Held by `core/scripts/outcomes.mjs`, which writes the report
  so, its test holding the form.
- **No process number is a builder's goal** (#302). By default the state report's numbers are read
  by the owner and the audits; whoever writes a brief, a rule or an entry sets none of them as a target, and only a
  property of the code keeps a baseline that may not get worse (`tasks/code-shape.md`). It does not mean a session may
  not read them. Reason: a number made a goal stops measuring what it stood for. Held by no check: none reads a target
  set in prose without guessing; the brief's rule (`tasks/helpers.md`) and the reviews carry it.
- **Size asks; a reader who reads less answers** (#469). By default a file past the *size marks*' split mark (about 20
  KB where they name none) sets whoever changes it one question: in what ways could it be split so that someone reads
  less? That builder lists the ways found in the pull request, each with the reader who would read
  less, a role or a kind of task. Where there is one, the file is split along it, in a pull request of its own with
  behaviour proven unchanged; where none, it stays whole, its line in the marks' baseline (`"past"`) giving the reason
  or the split's issue, and the question is not asked again until it has grown by a quarter or a new kind of reader
  comes. A split leaves no reader reading more: where whoever reads one part needs the other every time, it is no
  split. A dated record (the reports) is cut by month where it is cut at all, those that stand kept as they are. It
  does not mean a file is cut to meet a number, nor that the caps on what a role reads at its start go, where size is
  the cost itself (the core's `AGENTS.md`, on its size caps), nor that a line of `"past"` that stood is written again
  before its file is next changed. Reason: a mark on size is a weak sign that a file holds two things, and files were
  cut where nothing was gained. Held by the reading-size check (`core/scripts/reading-size.mjs`), which fails a file
  past its mark that a pull request changes with no line in `"past"`, one whose new line names neither a split's issue
  nor why it stays whole, and one grown a quarter past its line's mark, or past a mark alone that stood; a mark a pull
  request raises on a line that stood it notes, for the reviews to read that its why still holds.
- **A cut or a join lowers the total read** (#469). By default what a change to how the core's rule files are cut
  brings down is the sum of what the core's tasks read, each file opened counted as a cost of its own, never one file's
  size: `core/scripts/read-total.mjs` works it out from what the reading script gives each role and kind of task and
  from the last 30 merged pull requests, each read as the kinds of task its changed paths make it. A cut or a join is
  a file the reading script names added with text the base's files held, or taken out with its text standing in
  another; a file of new rules, one taken out whose rules go and a rename are none. Whoever cuts or joins such files
  runs it on the base and on the branch (`--compare`) and shows both in the pull request, which passes three
  conditions: the sum goes down; no role or kind of task reads more, its extra opens counted; and none loses a file it
  read before, unless the pull request says why it never needed it, on a line `Never needed:`. It goes both ways: two
  files the same readers always open together are joined where the sum goes down by it, and a file of any size that
  several kinds of task open is a candidate, the core's audit's reader being shown those most read first (`--candidates`).
  It does not mean reading is cut by keeping a session from what its task calls for, nor anything in a project, whose
  copy of the core changes only by a sync and whose own files "Size asks" holds. Reason: the lowest total has an
  optimum, since each file opened is a call and one more file a session can miss. Held by `read-total.mjs --compare` in
  the core's size workflow, which fails a cut or a join where a condition fails, and any pull request whose tree's
  path patterns run past the total read's budget of steps, and by the state report, which gives the sum beside the
  last one's.
- **A role's start holds what any of its tasks can break** (#469). By default a line of a file a role reads at its
  start, as `scripts/reading.mjs` gives it, stays there only where any task of that role can break it, the test the
  floor's own file keeps; a line only some kinds of task can break moves to a module read when a task calls for it.
  Whoever cuts or joins a file read at a start puts the test to each line it moves or leaves; a line of the review
  guidelines moves so under the owner's agreement of 18 November 2026, relayed into its pull request (floor rule 3).
  It does not mean a size to reach, nor that a line any task can break leaves the start to make room, nor a rewrite of
  the files that stand, nor anything in a project, whose start files are the core's copy. Reason: what stands at the
  start is paid at every task, and one study of rule files found that they raise what a task costs without raising
  how often it succeeds. Held by no check yet: which tasks can break a line is a reading; `scripts/read-total.mjs`
  shows what a move saves.
