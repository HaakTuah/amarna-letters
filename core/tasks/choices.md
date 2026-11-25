# Choices that are hard to undo

Read before a session makes a choice that is hard to undo or advises the owner on one, by the reader of a pass over
the recorded choices, by a builder of a move from one stack to another, and by whoever runs a trial of a tool that
would take a part's job: the kinds `choice`, `port` and `trial`.

A choice is hard to undo where one pull request cannot reverse it: a language, an engine or framework, where data is
kept, how the code is put together, a large dependency, a tool the work will lean on, and the platforms the code builds
and tests on, apart from those the product ships for. Its record stands once, in the *choice records*, under a heading
`## Choice: ` and what was chosen (they may stand a file each in a folder, as the core's do, the file naming it on the
line "Its records stand in `<folder>/`, a file each, read in the order of their names."); `core/scripts/choices.mjs`
lists them, says when their pass is due, reads each sign
written in a measure, and checks the records a pull request adds ("Held by", below).

- **A choice that is hard to undo gets a record.** By default a choice is made on the best reading and noted in a line
  of the *report*, as any reading is. One that is hard to undo gets a record before it stands, written by the session
  that makes it, or that advises the owner on it, alike. It holds, in this order:
  - **criteria first:** before any option is named, what the project needs of the choice, drawn from its aims, with a
    number wherever one can be had: its budget for speed, how long its tests may take, what tools can check in it
    (types, boundaries, lints), what it costs to leave, its licence and upkeep, and how well agents work in it;
  - **a long list before the options** (#515): once the criteria stand, its writer searches, on the web too, and lists
    every candidate it finds, each kept or dropped in one line against a criterion it names; the options are those
    kept, three at the least, one of them the plain or the less common one, each with what would make it the wrong
    pick. It does not mean a number of candidates, nor a trial for each: the trial is the costly part, the list cheap.
    Reason: "at least three" was read as three, and the three were those the issue had named;
  - **a drop says whether it rests on a fact** (#515): each line that drops a candidate says whether its reason is a
    fact, what follows from a fixed constraint ("a binary for each system that no one reads"), or an assumption that
    could be measured ("slower to write"); an assumption that drops a candidate the criteria would otherwise keep gets
    a cheap measure, or is marked for the challenger, whose case takes it up. Reason: in the first record argued this
    way a language was dropped on how fast it is written, which no one measured;
  - **what a standard mechanism gave** (#652): where an option does a job in a way of the project's own that an
    ecosystem's standard mechanism does for most of its users (a lock file, a package manager, a registry's install,
    the host's own setting), the writer lists what that mechanism gives beside its main job, a line each, and says for
    each what does that job under the option, or that nothing does; the challenger reads the list for what it lacks. It
    does not mean the standard mechanism is picked, nor a list for a choice that leaves none. Reason: the record that
    chose to carry packages in the core's copy never listed what a lock file gives beside the install, and the host's
    alerts, update proposals, the registry's audit and the list of what is inside were lost, found one at a time
    (#650, #637);
  - **the same trial for each option kept** (#515): each option kept goes through one trial on the project's hardest
    part, not an argument; where a stand-in was measured in an option's place (one runtime for its kind, a start-up
    time for a port), the record says so and what was not tried. Reason: two languages on that record's short list
    were measured only by how fast they start;
  - **popularity only for what it buys,** named: documentation, upkeep, how well agents write it; "it is what most
    use" is no reason by itself;
  - **the blind pick** (#515): a fresh session given the problem and the criteria, never the record, its list or its
    pick, makes a pick of its own with its reasons, on a line that opens `The blind pick:`; where it differs, the
    difference is a question the judgment settles. Reason: a challenger handed the record argues inside it;
  - **the case against:** a fresh session, the challenger, given the record, first searches, on the web too, for
    options the list lacks, and names each with what it would be picked for, or says it found none and where it
    looked, on a line that opens `Looked for:`; the writer answers each, put to the trial or dropped against a
    criterion it names. Then it argues against the pick, and its case and the writer's answer stay in the record. It
    does not mean every option named gets a trial. Reason: in the core's record on reading a language, no session
    searched past the three its issue named, and a tool that did the same job was never weighed;
  - **two providers where two are at hand** (#515): the blind pick and the case against are made by sessions of
    different providers where the machine holds two, read from what is installed and never asked (`tasks/roles.md`,
    "Tools are preferences"); otherwise by two fresh sessions of the one tool. Reason: two sessions of one model given
    one job mostly repeat each other, and each provider's reviews find what the other's miss;
  - **the judgment** (#515): a fresh session that wrote no part of the record reads it with the blind pick and the case
    against, and decides: the pick stands, another option is picked, or it names the trial that would settle an
    objection, run before it decides where it is cheap, since a trial and not the better argument settles one. Its
    decision and reasons stand on a line that opens `The judgment:`. The writer may answer the case against, and no
    longer decides which objections count. Reason: in the first records the session that made the pick answered its
    own challenger;
  - **the pick,** what it was chosen for, and, on a line that opens `Reopens it:`, the measurable sign that would
    reopen it.

  It does not mean that what is common is wrong: how well agents write a language is a criterion like any other, once
  named and weighed; nor that the lines above are asked of a record that stood before them, or of one that records a
  choice already made, which `core/scripts/choices.mjs` lists and never fails. Nothing waits for the owner beyond what
  floor rule 14 names: the record is how the reading is taken, not a question. Reason: fresh sessions advise what is
  most common, and both of the owner's first projects paid for an early choice, one with a rewrite into another
  language.
- **A choice of stack ends with what the core cannot read in it** (#486). By default the record of a choice of stack,
  its heading naming the stack, closes with one line that opens `The core cannot read:`, naming each of the core's
  checks that cannot yet read the stack picked with the issue the session that writes the record files to the core for
  it then ("Reporting to the core" in its README), or "none". It does not mean that what the core can read weighs in the
  comparison: the stack is picked for the product, and the core follows; nor that the project's first code waits on a
  reader: until one is built, the sync's report names the rules that nothing holds there
  (`core/scripts/read-nothing.mjs`; #459, point 2). Reason: a project in a stack the core could not read found it out
  months later, from an evaluation. Held by the records' check (`core/scripts/choices.mjs`), which fails a stack's
  record a pull request adds whose last line is not that line, naming an issue or saying "none"; that each gap has its
  own issue, by the review, since no check reads where one gap ends.
- **The choices a project already made are recorded too.** At its first audit (in a project that stood before this rule,
  as the step its sync asks: `setup/sync-notes.md`), a project's auditing session records each standing choice that is
  hard to undo, a stated feature of its design that works as one included ("no build step"), each with what it was
  chosen for, a line that opens `Stood before:` saying when, and its `Reopens it:` line; such a record is argued only by
  "What the project would be built on today", below. Which platforms the code builds and tests on is such a choice: a
  project is bound to one only with the reason in its first record, and "bound to one platform" is recorded with the
  sign that reopens it ("its tests cannot run where its sessions work"). It does not mean that a rewrite is asked or
  that anything changes in the code: it is a record of what stands. Reason: a choice never written down cannot show when
  it stops paying off.
- **What reopens a choice.** A recorded choice stands until one of two triggers:
  - **its sign trips:** by default, the session that runs the trial, the audit or the measure in which it shows tripped
    files the suggestion below. Where the sign is a measure a check already keeps, the session that writes the record
    writes it a second time, on a line that opens `Trips when:`, each condition in backticks: a measure
    `core/scripts/choices.mjs` lists (what the shape check reads: its files, functions and imports, the old breaches its
    baseline lists and their share, the imports on a cycle, the files in no system), `>`, `>=`, `<` or `<=`, and a
    number (`` `files > 150` ``). The trigger is such a condition that holds: the scheduled look reads it each day and
    keeps the issue "A choice's measured sign to act on" open while it holds, and the session that takes that issue
    writes the suggestion there and labels it `needs-owner` in place of `queued`. Where the owner keeps the choice, the
    session that acts on the answer writes its sign anew, and the issue closes; it opens again as `queued` where a sign
    trips anew, and goes back to `queued` where another choice's trips. A condition that names no measure keeps the
    issue open too, until its line is mended. It does not mean that the look runs anything a records file says: that
    file is no protected file, and the look's job holds a token that writes issues, so it compares numbers the shape
    check already reads; nor that every sign is written so. Reason: a sign the look cannot read is caught only twice a
    year, or when someone happens to measure it (#330);
  - **the pass twice a year:** the scheduled look keeps an issue open once the day on the records' line `Read whole:`
    is 182 days old, and a fresh reader goes through every record, reads its sign, and asks whether an option plainly
    better exists now (a new version, a tool that did not exist, a need that has gone), reading what it needs, on the
    web too; it then writes the day on that line.

  Either way the result is a suggestion, never an act: an issue for the project's owner, labelled `needs-owner`, with a
  fresh record that compares the options, staying as it is among them, and says the gain and what the move would cost.
  It does not mean a session makes that choice, or that the rest of the work waits on it. Reason: the owner asked
  what would reopen a choice, and wants better options suggested.
- **When a feature may leave the stack.** By default a feature is built in what the project already uses. The trigger
  is a measured miss: where a feature has a need in numbers (speed, memory, size; `roles/shared/how-to-work.md`) and a trial
  shows the stack cannot meet it, its builder opens a choice record. It does not mean that another language being
  faster in general is a reason by itself. The record:
  - shows first where the time or the memory goes, since most slowness is in the algorithm;
  - takes a part, never the whole: the other language goes behind a declared boundary (`tasks/code-shape.md`), as
    any system does, and the rest of the code keeps its language;
  - counts the whole cost: the second toolchain, the build step, tests and checks in two languages, and how well
    agents write it;
  - rests on a benchmark of the heavy path, not the feature built twice: no one fits a part into the old stack first
    to prove it slow.

  Once a second language and its toolchain are in a project, a later part in it is an ordinary choice, noted in a line.
  Where the core's dependency checks cannot read the new toolchain's packages, they are built first, as a check for a
  rule that already stands (#278). Reason: the owner wants the heavy parts written where they run well, not first
  fitted into a stack that cannot carry them.
- **A split between languages is decided at the start where it can be.** Where a new project's aims name a need in
  numbers, its first record weighs a second language beside the common one, and if it takes one, writes the line
  between them: which kind of code goes where, by criteria someone can observe ("runs inside the simulation loop",
  "must run with no screen", "changed often while the design is tried out"), and what would move a piece across. That
  line is a declared boundary, and a builder places new code by it with no further record. Where the aims name no such
  need, the project starts in one language. It does not mean a second language taken on a guess. Reason: a division
  decided early, on stated criteria, anchors why it is there.
- **The session decides, tells the owner, and asks in two cases only.** The record is written, argued and judged, and
  the work goes on from the pick. The pull request that adds the record names the pick first under "Readings taken",
  and the owner is told of it when told of the merge (`roles/shared/inbox.md`); where the owner overturns it, that is
  built as any correction is, and the record keeps both (#515). The owner is asked, by an issue labelled `needs-owner`,
  only where the choice goes against a feature the owner has stated for the project, in its design's own words, or is
  of a kind the *owner's choices* list as the owner's to keep. It does not mean that the rest of the work waits for the
  answer: what stands is kept meanwhile; nor a step that cannot be undone or spends money, which floor rule 14 holds
  for the owner's yes. Reason: the owner wants these calls made well, to be told and able to overturn them, without
  waiting on the owner.
- **What the project would be built on today** (#515). By default a project's foundations stand as recorded, and one
  whose every record was argued as above, a new project's among them, has had them weighed so. The trigger: in a project
  whose records stood before, the sync that brings this rule reports its step (`setup/sync-notes.md`), and the session
  that takes the step runs the process above, once, on what the project is built on: were it written today, what would
  it be written in and built on? It writes the report as a record in the *choice records*, under a heading that ends
  "judged again as if written today": the target judged on merit first, and apart, as a second judgment, what a move
  would take and gain in that project, in full. It files one issue to the project's owner, a suggestion (`enhancement`),
  saying what the pick would have been and, apart, what a move would cost and gain, and writes its number on the
  record's line that opens `The suggestion:`. The pass twice a year reads the record as it reads any. Of a project of
  another owner, nothing of the report reaches the core but counts. It does not mean the project moves on it: the next
  rule says when a move is built. Reason: the owner wants every project that takes the core to learn what it would be
  built on now, and its owner told.
- **A move that pays is built in steps; one that must happen at once is capped** (#515). By default nothing moves. Where
  the second judgment finds that a move pays, the session that wrote the record queues it, as the *progress file*'s
  writer adds any line:
  - one that can ship in steps, each an ordinary pull request that leaves `main` working and the old code in use until
    its step replaces it, is queued and built like any improvement, whatever the project's size, the owner told and
    able to overturn it, nothing waiting;
  - one that must happen all at once is tried on a branch where the judge's estimate of it is within the cap, and
    merges only through the gates below; beyond the cap it stays the suggestion, a feature request that waits for its
    owner's sign-off, and the report names the parts worth moving in steps before it;
  - one that has not passed its gates at the cap stops, and becomes that suggestion with what was learned.

  The cap is read, never asked: what the pull requests the project merged in the 14 days up to its newest merge took by
  their cost lines, as `core/scripts/core-cost.mjs --cap` sums it, two weeks being a first guess; the judge gives its
  estimate in the same answers and output tokens. The estimate is compared with it before a move, which decides whether
  the owner's sign-off is needed; during one, the branch's pull requests are summed (`--pulls`), and the move stops
  where the sum reaches the cap; where its tool prints no cost line, the cap is 14 days from the move's first commit.
  Where nothing pays, the report says plainly that staying is the answer. It does not mean that size decides: size sets
  what a move costs, not whether it works; nor the weighing the core applies to itself (#519), which holds for what many
  projects take in. Reason: a process that runs by itself must not rewrite a large project for a small gain, a small
  project on a poor stack is cheapest to move early, and the field gives no size at which a move stops being safe.
- **Every move passes the same gates** (#515). By default a change passes its tests and reviews alone; where it moves
  code from one stack to another, in steps or all at once, its builder passes these too, each named in the description
  of the pull request that makes it:
  - the old and the new run on the same inputs and their results compared, since tests that pass are not the proof;
    where the project holds its own proof that the same input gives the same result (a simulation's fingerprint, a
    replay, a recorded round trip), that proof is the comparison, and no second one is built;
  - some tests kept from the session that builds the move;
  - a check that reads that the move happened;
  - a separate session that looks for differences before the merge;
  - a port, its structure kept and its behaviour unchanged, improvements following as changes of their own, like
    changes grouped together so that its review can read it by its rule (`roles/shared/review-guidelines.md`);
  - where the project's own tests cannot show its behaviour, those tests strengthened first, as a task of their own.

  It does not mean an ordinary change, which moves nothing from one stack to another, is asked these. Reason: in a
  benchmark of agents moving whole repositories (August 2026), 60 of the 88 runs that passed every fixed check still
  had a difference a separate verifier found, and 30 kept every check passing by moving nothing.
- **A move has an end and states its cost** (#515). By default, while a move in steps is open, each step's builder
  counts the share of the code moved and writes it on the move's issue, and the state report gives it
  (`tasks/cleaning.md`). The trigger: no step of it has merged for 30 days, a first guess; the session that finds it so
  tells the owner, who chooses between finishing it and rolling it back, the work going on meanwhile. The pull request
  that ends a move, or stops one, states the sessions' cost of the whole move beside the judge's estimate
  (`core/scripts/core-cost.mjs --pulls`). It does not mean a move is rolled back by a session's own choice. Reason: a
  move in steps is known to stall, a project left in two stacks pays for both, and a cap is only as good as the
  estimates it is compared with.
- **A trial of a maintained tool replays the part's past bugs** (#593). By default a trial of a maintained tool in the
  place of a part of the project's own shows the two, old against new, on the same inputs (#534). Where bugs were filed
  against the part it would replace (its issues labelled `bug`, or their files where the project's issues run from
  files), whoever runs the trial also runs the tool on the case of each one's merged fix, taken from the test cases that
  fix added or changed on the default branch and never from an issue's text, and the trial's record says of each bug,
  by its number, whether the tool reads its case or not, on a line that opens `Replayed:` ("none" where no bug was
  filed): in the pull request that shows the trial, and on the part's line of the inventory where the project keeps
  one, beside the line `Tried:` that records the trial. A bug whose fix added or changed no test case is named on the
  line as not run. It does not mean a tool must read every one to be taken, nor that a case is ever written from what
  an issue says, which may carry outside text (floor rules 4 and 5). Reason: 11 of the 30 bugs filed on the core by 17
  November 2026 that were a case a check's writer had not thought of stood on the NuGet and copies checks, and whether a
  tool tried in their place reads those cases is the best evidence that the move pays.

Held by: the records' check (`core/scripts/choices.mjs`, a step of the copies check), which fails a record a pull
request adds without its lines `Looked for:`, `The blind pick:` and `The judgment:`, and a stack's without its line
`The core cannot read:`, and lists, never fails, one that
stood before; the sync's step of "What the project would be built on today" (`core/scripts/steps.mjs`), which reads done
where a record so headed names its issue on its line `The suggestion:`; the starter kit, whose *choice records* ask for
a new project's stack before its first code; the scheduled look, which keeps the pass's issue and that of a sign written
in a measure while it holds (`core/scripts/choices.mjs`, its test running both on a project made for it, and on the
core's own records); the staged case `stack-choice` (`core/scripts/staged/stack-choice.mjs`), in which the common answer
is the wrong one for a new project's stated aims, read in part: the record's criteria with a number of the aims' before
its third option, three options, a case against, the pick and its sign; the inventory's check, in the core
(`tests/mend-test.mjs`), which fails a part's line that records a trial and replays none of its bugs; and, for the rest,
the reviews alone: that the
blind session saw nothing of the record, its brief alone; the gates of a move, the description of the pull request that
makes it.
