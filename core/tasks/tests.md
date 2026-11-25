# What the tests cost

Read when a test or a suite is added, changed or taken out, when the jobs that run them or a pull request's checks
change, when a measurement may run an hour or more, and by the audit's reader (#275, #321): the kinds `test`,
`workflow` and `audit`. How strong the tests are, and a test taken out: `tasks/code-shape.md`. What every check here
reads is the *shape check*'s config.
- **Each test is measured.** By default every test file of a project has its numbers: how long it takes, when it last
  failed for a real reason, how often it failed for no reason (it failed, and passed, on the same commit in the same
  job), and what it alone catches of the faults put in on purpose (#253). `core/scripts/test-record.mjs` reads them,
  from the runs of the workflow that runs the tests, or from the JUnit reports the project's runner writes, and from a
  mutation report whose faults name every test that caught them (`core/scripts/mutate.mjs --every`, or a tool's with
  its bail turned off). The trigger is the audit (`tasks/cleaning.md`): the session that takes its task runs the
  record, and the audit's report shows its table. It does not mean that a number fails anything, nor that a project
  writes the reports for this alone: one whose job runs its tests in one step and writes no report has its suite's
  numbers until it does. Reason: nothing asked what each test is worth, while every session waits on all of them.
  Held by the audit.
- **A pull request runs the tests its change can reach.** By default the job that runs a project's tests runs, on a
  pull request, only those `core/scripts/select.mjs` selects against its base: each test whose imports, followed from
  file to file, or whose code's names of files, reach a file the change touches; a test it adds or changes; one that
  failed last time; and the tests the config names under "select.proof", the project's proof that behaviour was kept
  (a simulation's fingerprint, a replay, a save's round trip), which are never selected out. The one condition that
  changes it: where a changed file's reach cannot be told (a file of no code the readers follow, data, a file gone),
  where no base is told, where the config cannot be read and where the files changed, or the project's all together, are
  more than the readers take in time (`scripts/hurry.mjs`), the whole suite runs. The whole suite runs where it ran
  before: on the default branch, save where the tree passed whole ("A tree that passed is not run again", below), on a
  schedule, before a release, so no job is added. A test that reaches an import the
  readers cannot follow (a path built at run time, a file they do not read) runs on any change; one that reaches files
  by a path it builds, by listing a folder or through a running program, its builder names under "select.whole". The
  trigger is a fault the whole suite finds that the selection left out: its finder mends the map at once, as a bug (a
  name under "select.whole", or the import the readers missed). It does not mean that a test is taken out, nor
  that a project whose suite proves to be needed whole runs less: where the record's numbers show it, its session
  names every test under "select.whole", citing them in that pull request, and nothing is asked of its owner. Reason: the suites ran whole on every pull request, one that changed a line of the queue
  too, and set the pace of every pull request. Held by `core/scripts/steps.mjs`, which reports a project whose job of
  tests selects nothing, and by the whole run on the default branch.
- **A test keeps its place by one of three:** it alone catches a fault, it guards a rule the project states, or it has
  failed for a real reason; the project's proof keeps its place too. The record reads a test as guarding a rule where
  a rule file names its path, or its opening line names a rule file or an issue (`#n`). By default the audit's record proposes each
  other test for removal or for merging with its neighbour, and the audit's reader decides, never by coverage alone,
  each in a small pull request that leaves the tests' strength (`tasks/code-shape.md`) no worse. The trigger is the
  record's table at an audit; a test whose faults no run has counted is never proposed. It does not mean that a test
  is taken out because a script proposed it, nor that a pull request's own work removes tests beyond what its task
  forces. Reason: a study of 5.5 million tests found every failure in about 63 thousand, and judging a test by
  coverage alone loses faults (#275's evidence). Held by the audit.
- **A time mark measures and never fails** (#733). By default each suite a project names in the config's "suites" has a
  mark in seconds, set with room above what it takes today, and is started through the shape check (`--suite`), which
  measures it against its mark and says a job past it as a warning, never a failure; each system's tests can be started
  alone. Nothing changes it. A mark rises only as a breach joins a baseline (`tasks/code-shape.md`, "Never worse"): with
  its reason under "grown", in the pull request too. The trigger is a job past its mark, which its run's warning shows:
  the session that reads it, a builder on its pull request's run or the orchestrator on the default branch's, adds it to
  the open task on the tests' time, or files one where none is open, and that task makes the suite faster (each test
  sets up only what it needs, and runs only where the change can reach), or splits the job, its parts side by side and
  the quick ones first, so a failure shows early; how fast the marks come down is the dose the codebase's state sets
  (`tasks/cleaning.md`). It does not mean the marks go, since the shape check still holds them never worse and the state
  report gives the trend; nor that a long measurement joins a suite, nor that a suite's own failure is the mark's, nor
  that a suite is dropped to meet it: what guards a promise stays. Reason: every session waits on the tests, and under
  floor rule 12 a red default branch stops all merging, where of the core's 8 red runs on it in 24 hours at least 3 were
  a suite past its mark on a slow runner. Held by the shape check's test (`tests/shape-test.mjs`), which reads the
  warning and the pass, and by the audit's fifth question.
- **No test run on a draft** (#733). By default the job that runs a project's tests on its host starts on a pull request
  once it is marked ready, and again on each push after, and runs nothing on a draft. Nothing changes it. The trigger is
  a workflow that runs tests on a pull request: whoever writes or changes it gives its trigger the types opened,
  synchronize, reopened and ready_for_review and skips each of its jobs on a draft; and a builder, before it marks its
  pull request ready, runs in its own working copy the suites its change reaches (`core/scripts/select.mjs`, with
  `SELECT_BASE` the default branch). It does not mean a builder pushes less: it pushes after every commit
  (`roles/shared/work-flow.md`). Reason: in the core 43% of the job-minutes of 24 hours went to runs that a newer push
  replaced before they finished. Held by `tests/workflows-test.mjs`, for the core's own workflow; in a project, by
  nothing yet: which of its workflows runs its tests cannot be read without guessing.
- **The default branch is tested at its newest commit** (#733; #810). By default a run of the tests on the default
  branch that has started runs to its end, and a newer merge's run waits behind it; of the runs waiting only the newest
  is kept, so that when merges come fast one run covers every merge that landed while the one before it ran: whoever
  writes the workflow puts its runs there in one concurrency group that does not cancel the run in progress, as the
  host's groups replace a waiting run by a newer one. Nothing changes it. The trigger is a red run on the default
  branch: the session that reads it (`core/scripts/merge-line.mjs` says it, where users get a release) narrows it, first
  by the history of the files its failing test names since the last green run, then by halving the merges since that
  run, running the failing suite alone at each half's commit in its own working copy, and fixes it before any other
  merge (floor rule 12; `tasks/hosts.md`). It does not mean that every merge is tested alone, that a pull request's run
  waits (a newer push still cancels it), that a start by hand or the run before a release is cancelled, nor that a red
  run is merged past. Reason: a batch tested once costs less than each merge tested alone, and a break between merges is
  rare and quickly found; a run that gave way to every newer merge's never finished while merges landed faster than a
  run took, and on 19 November 2026 nine merges in a row were never tested whole. Held, in the core, by the concurrency
  its `tests.yml` gives the runs on main, which the workflows test reads; the narrowing, by nothing yet.

- **The slow suites run once per batch, wherever they run** (#733). By default a pull request's run holds the suites its
  change reaches on one platform, and the platform suites (those on any other platform) and the suites its builders move
  there for their time run at the default branch's newest commit, where it moved since their last run, as often as their
  cost allows: once an hour on the host's free runners, once a night where minutes are billed or the runner is a machine
  of the owner's, and only before a release where the tests run on a computer alone; in full before each release in
  every case. The one condition that changes it: where every merge goes live (the *users get* slot, `merges` where no
  row says), each merge is a release, so the slow suites run before each merge, on its pull request. Where the tests run
  and who pays is read, never asked: `core/scripts/runners.mjs --repo <owner>/<name>` prints both and the schedule, and
  the manifest's rows *test runners* and *billed minutes* only override them. The trigger is a workflow that runs the
  tests on a pull request: whoever writes or changes it moves the platform suites, and any it moves for their time, to
  that schedule. In the core, the Linux suites run after every merge and the Windows suites once an hour, with the tests
  that reach the network on both (`.github/workflows/tests.yml`); a builder whose change needs the Windows suites before
  its merge starts that workflow by hand naming in its input `only` the parts and system its change reaches, and a
  run in full only where its change reaches every part, a run so narrowed never read as a full one (#954). It does not mean a public repository takes a runner on
  a machine of the owner's, where a stranger's pull request would run its code (the script prints the advice: forks kept
  off that job at once, and one issue filed for the owner, labelled `needs-owner`), nor that a suite runs less than once
  before each release, nor that a project changes its workflow for this before its builders take it up. Reason: a full
  run on the default branch after every merge holds most of the host's jobs at once and leaves the pull requests
  waiting, and a slow suite run once per change costs most where it is paid for, in money or in a machine's hours; in
  the core Windows took 69% of the pull requests' job-minutes, where about three of its bugs were found by Windows
  alone, and five runs started by hand in full, each change needing one Windows part, took 38% of the runner minutes
  over 76 minutes. Held by `tests/runners-test.mjs`, for what is read, and in the core by its workflow's schedule and matrix,
  which the workflows test reads, and by `scripts/release.mjs` (`fullRun`), which reads no narrowed run as full; the
  parts a builder names, by none: read from the tests a change reaches, most changes would reach every part.

- **A test that reaches the network runs once per batch** (#733). By default a test is self-contained: what it fetches
  comes from a copy the test makes on the machine (a package file, a feed in a folder, a repository read by its path).
  The one condition that changes it: where reaching the network is what the test guards (a package registry, the host
  itself), it runs with the slow suites, at the default branch's newest commit and in full before each release ("The
  slow suites run once per batch, wherever they run"), never in a pull request's run; where every merge goes live, each
  merge is a release, so it runs before each merge, on its pull request, as the slow suites do there. The trigger is a
  test that fails or stalls with the network cut off: whoever writes or meets it makes it fetch from a copy, or moves it
  to that run (in the core, the part `network` of `.github/workflows/tests.yml`); a builder whose change reaches such a
  test runs it in its own working copy before it marks its pull request ready; and a failure in that run that the
  network alone caused is run again once and filed by the session #542 names, never a red that stops merging: the merges
  go on, and the release waits for it to pass. It does not mean that what such a test guards is dropped, that a release
  is cut without it, that a test that checks what a pull request brings from a registry (floor rule 7's week's wait)
  leaves that pull request's run before a check of the run holds it, nor that a test that reaches the network only where
  it can, and passes without it, moves. Reason: a test that reaches the network takes its job's time from the slowest
  answer, and a fetch that failed on 17 November 2026 turned the default branch red (#542). Held, in the core, in part,
  by its `tests.yml`, which `tests/workflows-test.mjs` reads: the part `network` runs in no pull request's run nor a
  push's, the mutation run on a pull request, which runs the tests its change names, leaving out those that reach the
  network as failing as they stand (#772); which tests reach the network, by `scripts/offline.sh`, under which each step of its suites on Linux but the part `network` runs with the
  network cut off, a test that reaches it failing there, or stalling until its job's time runs out, its failure saying
  its mend where its output shows the fetch refused, save the steps that workflows test lists with why (#770).

- **A test that guards only what a release brings runs where the release is made** (#715). By default a test runs
  where its suite does. The one condition that changes it: a test whose breach reaches users only through a release
  (what a save, a setting or a project written by the last release does in this one; what a published package or
  installer holds) and that is slow, the pull request's run ending sooner without it or, where minutes are billed, it
  taking more of the run's job-minutes than any other test, runs instead at the default branch's newest commit once a
  day and before each release where releases are cut apart from merging and minutes are free; before each release
  only where minutes are billed, a daily run there the owner's choice, since it costs; and where every merge goes live,
  on each pull request, since a merge there is the release. Who pays and whether every merge goes live are read, never
  asked, as "The slow suites run once per batch, wherever they run" says. The trigger is a pull request's run whose job
  times, with the test record's (`core/scripts/test-record.mjs`), show such a test slow: the session that reads them,
  its builder or the orchestrator, moves the test to that run (in the core, the release workflow's daily run,
  `.github/workflows/release.yml`), and a failure there is owned as "A check that fails on the default branch has an
  owner" says, the release waiting for it to pass. It does not mean that the test is dropped, that a release is cut
  without its pass on the release's commit, that a test that guards what a pull request brings leaves that run, nor
  that one that is not slow moves. Reason: in the core the upgrade test on Windows set every pull request's run at 13
  to 22 minutes, while what it guards reaches a project only through a release. Held, in the core, by
  `tests/workflows-test.mjs`, which reads that the release workflow, which no pull request starts, runs the upgrade
  test on Windows daily where the repository is public and before each release, and that `tests.yml` runs it on Linux
  alone; in a project, by nothing yet, since which tests guard only what a release brings cannot be read without
  guessing.

- **A test that fails for no reason is mended or removed, never retried in silence.** By default a test passes or
  fails the same way each time it runs on the same commit. The trigger is a test that failed and then passed on the
  same commit in the same job, which the record names: the session that meets it, or the audit's next cleaning task,
  mends it or takes it out, saying so under "Readings taken". It does not mean that a job is never run again: a job
  run again for a cause outside the tests (a runner lost, the network) says so in the pull request, and one on the
  default branch is run again and filed as the rule below says. Reason: a test that fails at random teaches every
  session to run again rather than read. Held by the audit, through the record.
- **A check that fails on the default branch has an owner, and is run again once** (#542). By default a check that fails
  on a pull request is its builder's. The one condition that changes it: where a check run on the default branch's
  newest commit ends in failure, it is owned by the session whose merge it followed, while that session still runs;
  otherwise by the orchestrator at its next wake; and with no orchestrator, by the next builder session at its start.
  The trigger is that failure, read before a merge (`tasks/hosts.md`), before a session's last message, at a wake or a
  start, or in the issue the scheduled look keeps while one stands: its owner reads the failure's mend and, where it
  says to run the check again or the failure is of a source that could not be reached, runs the failed jobs again, once.
  Whoever takes it up says so in a comment on the look's issue where it stands, else on the pull request whose merge it
  followed, and a later session leaves the failure to that comment's writer only where the comment is the *owner's
  account*'s, opens with a session's line (`roles/shared/inbox.md`), and is under an hour old: past that, what the
  second run left is taken up as any failure is. A check that then passes on the same commit is unsteady: the owner
  files a `bug` for the test, naming it and what it could not reach or do, or adds the day to the one that stands, and
  that bug is mended at its cause as any is. A check that fails again is a bug that waits for no line, naming the merge
  it followed as "A correction is marked" says (`roles/shared/inbox.md`), narrowed and fixed as "The default branch is
  tested at its newest commit", above, says. It does not mean a check is run until it passes, nor a second run where the
  mend names something to change, nor a retry the host's workflows make by themselves, which would hide what a second
  run counts; nor that other lanes stop while the default branch is red: they go on, and only merges wait
  (`tasks/hosts.md`). Reason: on 17 November 2026 a suite failed on the core's default branch for a fetch that failed,
  its mend said to run it again, and no session was left to read it, while a release waits on a green default branch; a
  second run that hides an unsteady test is only a stopgap, and such a test is mended once it is counted. Held by the
  scheduled look, which keeps an issue open while a check on the default branch's newest commit has failed
  (`core/scripts/look.mjs`), and by the staged case `red-main`, for the second run and what is filed.
- **A new test says what it guards.** By default a test file opens with a line that names the rule it holds or the
  fault it catches (a module's rule, an issue, a bug's number), and sets up only what that needs (`roles/shared/how-to-work.md`,
  "The smallest setup that tests the rule"). The trigger is a test file a pull request adds: its builder writes that
  line. It does not mean a line for each case inside it, nor that the tests that stand are reworded on demand. Reason:
  a test that names nothing it guards cannot be weighed by the record, and is kept or cut by guess. Held by nothing
  yet: no check can tell whether a line names a rule without guessing, so it is listed, and the reviews read it.
- **A test opens a screen only where the screen is what it guards.** By default a test runs beneath the display,
  through the systems it uses (the rules import no display: `tasks/code-shape.md`); a test opens a screen, a window
  or a device only where that screen, window or device is itself what it guards. The trigger is a test file that
  imports what the config lists under "screens" (a package that opens a browser, a window or a device): the shape
  check counts each, and the time they take is in the record. Those that stood when
  the check came are listed in its baseline and worked down at the dose; a new one fails, and its builder tests the
  thing beneath the screen, or lists the test with its reason under "grown". It does not mean that a project has no
  tests of its screens: they guard what only a screen shows. Reason: a desktop program's suite opened its window
  for test after test, each paying for a screen it did not test. Held by the shape check.
- **A test reaches a real clock or another process only where it guards it** (#457). By default a test runs beneath
  the clock and the process: the time is handed in, and the code a process would run is called from the test itself.
  The one condition that changes it: where the clock or the process is itself what the test guards (a command's own
  line, its exit code, what it prints; a program the test starts and waits for). The trigger is a test file that calls
  or imports what reaches a real clock (a sleep, a timed wait, a read of the time) or starts another process: the shape
  check counts each, by the names it knows for each language and those the config adds under "clocks" and
  "processes", and the record gives the share of the tests' time each takes. What stood is held as the screens' is,
  above; a new one fails, and its builder hands the time in or calls the code itself, or gives the test's reason under
  "grown". It does not mean that such tests go, since they guard what only a running program shows, nor that what a
  test's helpers reach is counted. Reason: in one project's suite (#426), the few tests that started another process,
  or reached a real clock, took most of its time. Held by the shape check.
- **A test asserts no time measured on a real clock.** By default a test that needs time has it handed in, as the
  rules of a program do (`tasks/code-shape.md`), and asserts on that. The one exception is a measure of speed, which
  keeps room above its floor so that a slow machine fails nothing (#318). The trigger is a test that reads the time,
  sleeps or waits on a timer and then asserts a duration: its builder hands the time in instead. It does not mean a
  test never waits for a program it starts. Reason: in one project's suite (#426), the one failure at random in many
  thousands of runs came from a test that asserted a duration on a real clock. Held by the record's list of tests that
  failed for no reason, at the audit.
- **A tree that passed is not run again.** By default, where a pull request's head was up to date with the default
  branch and its whole suite passed on that tree, the run on the default branch for the same tree runs no test again:
  whoever writes a job of tests that a pull request and a push both run gives its selection, on a push, `--passed` with
  the check that gates the tests (`core/scripts/select.mjs`), which finds the merged head's tree, its whole selection
  and that check's pass, as GitHub Actions posted it, and then says `none`, which the job's runner honours, or otherwise
  runs the whole suite; that the head held the default
  branch is read from the tree, never assumed, since floor rule 12 lets a pull request merge without being brought up
  to date where users get a release. A test that reads what no tree holds
  (a release's tag, the day) stays out of the skip. The trigger is a push that merges a pull request with a merge commit. It does not
  mean a run is skipped where the pull request ran a selection only, where it was merged by a squash or a rebase, on a
  re-run, on a schedule or before a release, nor that a job a pull request does not run is skipped. Reason: in one
  project (#426) every push to the default branch ran the whole suite again after its pull request had run it on the
  same tree.
  Held by the selection's own test, and by `core/scripts/steps.mjs`, which reports a job that selects on a push without
  it.
- **What a push waits on has a time mark.** By default the checks of one push, from the first job's start to the
  last job's end, take no longer than the mark the config gives under "wait", in seconds, which rises only as a
  suite's does. The trigger is the monthly state report, which gives the median of the last 30 merged pull requests
  beside the mark (`core/scripts/wait.mjs`): the session that reads it past the mark files the task that brings it
  down. It does not mean that a pull request fails for the time its checks took, nor that a check is dropped or
  merged past before it passes. Reason: once a pull request is ready, its checks set its pace, and in the core one
  push waited about 11 minutes, mostly on one platform's suites. Held by the shape check, which fails a mark raised
  with no reason, and by the scheduled look, whose state report gives the median.
- **A long measurement runs outside the session.** By default a measurement that may run for "long" seconds or more
  (the config's, an hour where it gives none: a first guess) runs neither in a suite nor in the checks of a pull
  request, nor while a session waits on it. The trigger is such a run: its session starts it as a job of the
  project's own, which posts its result on the pull request, then ends at a passed gate with its hand-off note
  (`tasks/tools.md`), and the session that picks the work up reads the result there. It does not mean that the
  core adds a billed job to a project: the job is the project's own to turn on, and with none the measurement runs on
  a machine its owner starts (floor rule 18). Reason: one entry of a project held 130 minutes of measuring inside one
  session. Held by nothing yet: no check can tell how long a run would have taken, so it is listed.
