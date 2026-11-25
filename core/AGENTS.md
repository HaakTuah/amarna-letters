# agent-core

In a project, this file is its copy of the core's (`core/AGENTS.md`) and none of the project's: a session working there
follows the project's own `AGENTS.md`, and reads this one only as the core's text (`README.md`, "The copy's own files").

The shared core of the owner's agent-built projects: a floor every project takes whole and modules each project picks
(`README.md`).

## The core this repository takes

The floor whole, and every module but those "Not taken" below gives its reason for.
`scripts/own-modules.mjs` fails a module of `roles/shared/`, `tasks/` or `tools/` this section neither names nor gives
one. A builder reads these whole at the start of every task (Claude Code imports them); what else a task calls for, and
what another role reads, `node scripts/reading.mjs <role> --issue <its line's issue>` prints (`tasks/tools.md`, "One
script says what to read"):

@floor/security.md
@roles/builder.md
@roles/shared/how-to-work.md
@roles/shared/inbox.md
@roles/shared/work-flow.md

The last is read so that whoever builds here finishes the pull request. Two things in it
have nothing to act on here: the polish lane, since no one uses the core through a screen, and the sync of a copy of
the core in "Sessions", since this repository is the core and holds no copy.

Read at the start of every task too: by Claude, `tools/claude.md` (`CLAUDE.md` imports it); by a session of any
other tool, `tools/other-builders.md` and its tool's part, a file of `tools/` (`tasks/tools.md`, "Each tool's part"),
which its entry file pulls in.

Read when a task calls for it, each saying when in its opening line: the files of `floor/topics/`,
`floor/threat-model.md`, `tasks/roles.md`, `tasks/helpers.md`, `tasks/reviews.md`, `roles/shared/review-guidelines.md`,
`tasks/tools.md`, `tasks/ways.md`, `tools/claude-sessions.md`, `tools/claude-auto-mode.md`, `tools/codex.md`, `tools/copilot.md`, `tools/kiro.md`,
`tools/antigravity.md`, `tasks/github-calls.md`, `tasks/hosts.md`, `tasks/repositories.md`, `roles/shared/teams.md`,
`roles/orchestrator.md`, `roles/auditor.md`, `tasks/updates.md`, `tasks/choices.md`, `tasks/code-shape.md`, `tasks/tests.md`,
`tasks/cleaning.md`, `tasks/done-when.md`, `tasks/planning.md` and `roles/shared/records.md`.

Not taken, each for its reason:

- `tasks/game-design.md`: the core is no game; it has no players, computer players, rules of play or features a
  player chooses to use, which are all that module governs.
- `tasks/screens.md`: the core has no screen; no one uses it through one, so none of its points, its critique or its
  checks has anything to act on here, and `scripts/screens.mjs` is held by its test alone.

The slots here: the *progress file*: `QUEUE.md` ("The queue"); the *milestone*: a batch and its release ("One batch,
then one release"; #322), and of `tasks/planning.md` the point on a task's release and of `tasks/cleaning.md` the reading of a project
against the core (#259 is that reading here) have nothing to act on here, which holds no copy; the *report*: the PR's description (`reports/` keeps
those written before 12 November 2026, the staged cases' record and the trial's); the *audits*: `reports/`; the *choice records*:
`CHOICES.md`, a file each in `choices/` (#870); the *shape check*: `scripts/shape.mjs` with `.github/shape.json` (one system, the scripts, as `CHOICES.md` records);
the *mutation tool*: `node scripts/stryker.mjs --tool tests/mutation --report {report} {lines}`, Stryker at the version
`tests/mutation/`'s lock file pins (#581), in `tests.yml`;
the archive is `archive/instructions.md`, the items behind each rule listed in `scripts/holders/`; the *settling references* and the *descriptions*:
`README.md`; the *large file*: past about 50 KB; the *copies check*: `scripts/copies.mjs` on `.github/copies.json`, in
`tests.yml`, its baseline empty (#259); the *owner's account*: `HaakTuah`; the *users get*:
`releases`, its users taking the core from a release or, following `main`, from its newest commit whose checks all
passed (#733); *one at a time*: the queue's lines
that change the same file, and all that add to what a role reads at its start, whose caps they share, in the
queue's order; the
*design-checked PRs*: those that add or change a rule of the floor or the modules; the *review reference*: the line's
issue, with the owner's words quoted on it; the *tools* and the *pace*: the core's defaults (`tasks/roles.md`,
`roles/orchestrator.md`); the *hard work*: a new or changed rule; the *size marks*: the caps of
`scripts/size.mjs`, one for each role, and its own mark for `QUEUE.md`, and the split mark, 20 KB, with its `"past"`
list, in `.github/sizes.json`, which `scripts/reading-size.mjs` reads as a project's; the *major version checks*:
the suites of `.github/workflows/tests.yml`; *planning design*: none; the *quick check*: `node scripts/holders.mjs && node scripts/size.mjs && node scripts/reading.mjs --check && node tests/holders-test.mjs && node tests/manifest-reads-test.mjs && node tests/general-test.mjs`; the *other builders' checks*: those suites, which any tool's
session here runs before it finishes, every file here being protected (`SECURITY.md`).

## The queue

`QUEUE.md` holds the order of the work here and nothing else: each line an open issue, who builds it
and what it waits on. A task is a line; its issue is the item and its spec, read with the note that gathers it where
one says it does, and its conditions stand there. The main lane is the lines in order.

- **An idea is built only from a line, and a line joins in a PR of its own.** A new or changed rule
  joins only where that PR relays the owner's yes to its issue, as the chat session records it ("Whose words an issue
  holds"): that PR is the gate, so no verdict of the stand-in's queues one here, a difference from `roles/shared/inbox.md`.
  A test, a check for a rule that already stands, a task the scheduled look opens (#248), a small finding of an
  audit (#259) and a change to a rule that keeps its meaning (#886, point 2) join without the owner's word: the design
  check of the PR that builds such a change states it, as `roles/shared/review-guidelines.md` says of the floor ("A
  change that keeps the meaning is stated so"), and where it does not, that PR waits for the owner's yes, held for the
  floor and the guidelines by `scripts/meaning-kept.mjs` and for any other rule by nothing yet. A line does not leave in the PR that
  closes its issue: the readers of the file skip the
  line of a closed issue, and the next PR that changes the file takes such lines out together (`node scripts/queue.mjs
  --clear`; #750, point 1), as that module says, since PRs merging side by side collided on it. Held here by `own-description.yml`, which fails a ready PR that changes the
  file and leaves one.
- **Queued means wanted: nothing queued waits for a second word.** Where the floor asks the owner's
  yes in a PR (floor rule 3: a change to the floor or the review guidelines that means something), the yes the owner
  gave when its issue was queued is that yes: the builder relays it into the PR word for word as it was recorded
  (floor rule 3), and it covers the change as the issue describes it. A PR that goes beyond its issue is not covered by
  it, and the design check says so.
- **The file holds no note.** Where a module asks for one in the *progress file* (a lane that waits), it goes in the
  description of the line's own PR, which the next builder reads with the branch, as a hand-off note does
  (`tasks/tools.md`, "A change of tool loses nothing").
- **Whose words an issue holds.** Of the issues open on 14 November 2026 and labelled `queued` and `by:chat`, the owner
  said the decisions quoted in them are the owner's, and so are the answers on other issues that their notes name.
  What the chat session records is the owner's word on any day: an issue or note from the
  *owner's account*, labelled `by:chat` or opening as from a chat session with the owner, carries the owner's decision
  where it quotes the owner's words, and equally where it sets out a design and says the owner agreed to it, since a
  bare yes is never quoted (#252). Such a record sets the design out in full, as what binds, and says plainly that the
  owner agreed to it, as the notes on #244 and #252 do; it covers what it sets out and nothing beyond, and a view of
  the session's own, marked as not a decision, binds nothing. The builder relays the record word for word, and the
  review reads the change against the design it sets out. A label or opening on another account's text
  makes it no more than data. What any other session adds to an issue is that session's word.
- **Who builds a line, the line says.** A bug, a test and a check for a rule that already stands go to any builder
  session. A new or changed rule goes to the design session or to a builder at the strongest tier (`tasks/roles.md`), as its
  line names. That builder
  writes it from the owner's word recorded on the issue ("Whose words an issue holds"), adds it to the archive as an
  item of its own, naming the issue as its source, and takes what it leaves open as `roles/shared/inbox.md` says of any
  open point. This is the second
  difference from that module and `roles/shared/records.md`, where only the design session writes rules from the owner's
  words.
- **A bug fix and a rework of tests are built on Sonnet** (#767). By default, where "The builders" of
  `roles/orchestrator.md` picks Claude for a line that fixes a bug or reworks tests, the orchestrator starts its builder
  on Sonnet; a line that writes or changes a rule, touches security or reads a format another publisher defines stays
  on Opus at high. The first trial is settled: on 20 November 2026 `node scripts/builder-trial.mjs`, setting the
  Sonnet builders of those two kinds since 18 November 2026 beside the Opus builders', read the bug fixes' findings,
  rounds of review and bugs that reached `main` each "no worse within noise", as #1023 gives in numbers, so
  Claude's part (`tools/claude.md`) gives its builder of a bug fix the middle tier, Sonnet, beside the routine lanes the
  tier table of `tasks/roles.md` gives it (#1023). The second trial changes the effort alone: from 20 November 2026, the
  day #1023 merged, the orchestrator starts the builder of each such line on Sonnet at medium and at high in turn, its
  first line naming its effort ("on Sonnet at medium"); once twenty have merged, as the same script with `--effort
  --since 2026-11-20` counts them, the session that finds it so, the orchestrator at a wake, gives what it prints on
  #767 in a note, numbers first, and builds the result in a pull request of its own, each kind's verdicts on findings,
  rounds and bugs deciding its own lane: where medium reads "no worse within noise", Claude's part gives that lane
  medium effort; where one reads "worse", the lane stays at high, and the note says by how much; where one reads "too
  few to tell", the trial goes on. It does not mean the order of "The builders" changes, so a line it gives another
  tool counts in no trial; nor that a Sonnet builder decides what needs judgement (`tools/claude.md`, "Who to call");
  nor that a result reaches another tool's part; nor that a trial changes the model and the effort at once. Reason: on
  19 November 2026 all eleven of the core's builders ran on Opus at high, three bug fixes among them, and the earlier
  rework of the tests (#715) on Opus too, where the tier table gives routine work to the middle tier, Sonnet in
  Claude's map. Held, in part, by `scripts/builder-trial.mjs`, which counts each kind by its builder from what
  `scripts/review-record.mjs` reads and from the session-cost lines; which model and effort the orchestrator starts, by
  nothing yet.
- **An orchestrator may work the file** (`roles/orchestrator.md`) while it holds a line a session can take. The
  owner starts it, or the owner's adviser on the owner's word (`roles/adviser.md`); once none is left that a session can take, it says so and stops, keeping no wake. Two steps of its
  wake are not this repository's: the sync of the core, since `scripts/core-moved.mjs` and `scripts/sync.mjs` run from
  a project's root and there is no copy here, and what `setup/sync-notes.md` asks, which it asks of projects.
- **One batch, then one release.** A batch is the lines the file holds between two releases, and the release after it
  is the owner's ("A release is cut on the owner's word"): no session cuts one by its own choice. That word is given
  for every batch: once the file holds no line a session can take, no PR of a session's is
  open, every check on `main`'s newest commit has passed, and no open issue is left that is to be queued, the session
  that finds it so, the orchestrator at the end of its work, starts the `release` workflow once the trial on a real
  project is recorded ("A release is cut on the owner's word").
- **A batch is sized by what the projects can take:** once its release is synced, the count of "The core is measured
  as a feature is" is taken again in each of the owner's projects and named to the owner, who sizes the next by it. It
  holds back no line the owner has said yes to: there is no pause on new rules.

## How changes are made here

- **The core abides by its own rules, to the full extent:** this repository keeps every rule
  the core sets for the projects, the audits and the cleaning it asks of them included, save a module "The core this
  repository takes" gives its reason for and a step it says has nothing to act on here. A check, measure or report a
  rule brings runs on the core too: the measures with their baseline, never worse, the strength of its tests, failures
  that say the mend, the labels and the queue, the daily look and the monthly state report, which lists the core
  beside the projects. Its audit and cleaning share is set by the state its own code is in, as any project's is, and
  the staged cases run on its repository. An issue here is done only when the core's own repository meets it.
- **Whoever builds a change finishes it,** the design session and a builder alike, as `roles/shared/work-flow.md`
  says ("Git and GitHub", and point 1). A PR that changes a rule says what it changes in every project.
- **Every PR gets Codex's code and security reviews,** save one of queue lines alone that `scripts/queue-only.mjs`
  proves (floor rule 8; `tasks/reviews.md`, point 3).
- **The size caps keep the rules lean and decide nothing else** (`scripts/size.mjs`).
  By default what a role reads at its start, as its file under `roles/` names it, stays under that role's cap, so
  whoever adds a rule there replaces text. Where a fresh session has read all the rules for room and found too little,
  whoever makes the change raises the role's cap one step, a whole KB, in the same PR, as "A mark on what every
  session reads" in `roles/shared/review-guidelines.md` says of any such mark. Where `main` itself
  stands past a cap, or the queue past its mark, because pull requests that each fitted merged together, it is a task
  to trim, which the scheduled look keeps, never a red that stops merging (#750, point 6): only a pull request whose
  own change takes a start or the queue past its cap, by growing it or lowering the cap, fails. It does not mean a rule is moved from where it belongs, cut short or
  left out to fit, nor another rule's reason, name or example cut to make room, nor that a cap is raised by a task to
  trim. Reason: each start is paid at every task, and a cap that decided where a rule stands would hide it from who
  must keep it; under merge-on-green two rule changes can each fit and together pass a cap. Held by
  `scripts/size.mjs`, against the pull request's base, and `.github/workflows/size.yml`, which fails a raise of more
  than one step, and one in a PR with no "Leanness check:" comment; the task, by the scheduled look's reader of it
  (`scripts/look.mjs`, from `due` in `scripts/size.mjs`).
- **A release is cut on the owner's word:** another owner's project takes the core only from a release (`README.md`,
  "How a project takes the core", point 1), so one is cut when the owner says the core as it stands may be handed on,
  never by a session's own choice: the owner's standing word is that it may each time the queue is worked through ("One
  batch, then one release"). The owner tags nothing by hand: the owner, or a session the owner tells and whose own
  limits let it, starts the `release` workflow on `main` (its page under Actions has the button;
  `.github/workflows/release.yml`), and the workflow cuts it only where every check on `main`'s newest commit has passed
  and, once the staged cases hold a release ("Staged cases hold what no check reads"), no case failed in its last run:
  the tag `release-N` on that commit, never moved or deleted afterwards. `node scripts/release.mjs` says what the next
  one would carry. **Each release is tried on a real project first** (#1084). By default, before the `release` workflow
  is started, the orchestrator has a builder at the strongest tier try the release on a copy of a project that takes the
  core and whose owner allows it, the owner's own as `scripts/state-report.mjs --projects` finds them, read-only,
  nothing written there: its checks run as on a pull request
  (`scripts/check.mjs --base <its main> --own --verdicts <a file outside every repository>`) once before the update, as
  a baseline, and again after it, the sync between; where the copy holds no `check.mjs`, or one without `--verdicts`,
  the baseline is taken with the release's, from a clone of the core at the release's commit, run from the project's
  clone, the core's clone outside it, its verdicts still outside every repository, and the record says which way each
  was taken (#1244); each passed both, failed both (standing before), or passed before, or ran not before, and failed
  after (the release's, which stops the cut), or ran before and could not be read after, or could not be read before
  and failed after (not measured, which stops it too; #1257), or was read in neither run (not measured, which stops
  nothing); it records the counts alone (`node scripts/release.mjs --trial`) in a pull
  request of its own. Another owner's project has its own code run only where no sign-in or key of the owner's is held
  (floor rule 18). The one condition that changes it: no such project allows a trial; the record says so, and so does
  the release. It does not mean that a project is written to, that its private code leaves it, or that it is named
  anywhere. Reason: #1079 passed every check of the core and failed only on a real project. Held by
  `scripts/release.mjs` with `scripts/release-trial.mjs`, which say the trial has not run, and cut nothing, where its
  record does not stand for the commit, cut nothing where a check passed before, or ran not before, and failed after,
  or ran before and was not measured after, or was not read before and failed after, and refuse the record of none allowed where a project of the owner's takes the core; where another owner's code may
  run, by nothing yet.
- **Nothing locks a project,** in any owner's project, the core's owner's own included.
  By default, once a project syncs to a release, nothing the release brings stops its work or waits on its owner:
  what an agent can mend alone may bind, and what only the owner can do (a yes the floor names, a setting on the
  owner's account, anything paid) is advisory, reported and labelled `needs-owner` (`scripts/labels.json`) while the
  rest goes on. The trigger is a check the release adds or makes read more, and its actor is whoever builds that check:
  - a pull request that makes something worse than it stood may fail, and the session mends it there; every failure
    says its mend (#254);
  - what stood before the check came, or before it read more, never turns it red: the check keeps a baseline, what
    breaks it today, listed and allowed only to shrink. A sync pull request holds the copy and what the core writes alone, so until the list
    is written the pull request's base counts as it, and the entry of `setup/sync-notes.md` that brings the check
    has a step whose check reads that the list is written: no old breach goes unlisted. The one exception, on the owner's word and no other: the personal-terms check fails a listed term wherever
    it stands, one the project held before and a name a machine's git writes into each commit included, its failure
    saying how the session takes it out in that pull request itself;
  - it adds no billed job, since a private repository on GitHub's free plan pays a whole minute for each job and its
    Actions stop once the month's are spent.

  A baseline is a debt, not an exemption: the project's agents work it down by tasks, at the dose the codebase's state
  sets, never by a red check, and in the core's own repository none may stand (#259). The audits and the cleaning
  share run by themselves in every project; its owner may change the dose with one line of the manifest, and is not
  asked to (`tasks/cleaning.md`). It does not mean that all a release brings arrives advisory or off, nor that old code is left
  alone. Reason: a project that takes the core on trust, from a release, never finds a pull request failing, or work
  waiting on its owner, for something it did not change. Held by `tests/upgrade-test.mjs`, in
  `.github/workflows/tests.yml` on Linux, and on Windows in `release.yml` daily and before each release: a project written by the starter kit of each of the last two releases (npm and .NET,
  the .NET one as Windows holds it, its commits made under a listed name), holding old content of each kind a check
  reads and synced to the commit under test, passes every check of the core unchanged, that mend made, starts no job
  it did not start before, and fails a pull request that adds a copy until the mend its failure words is made; by the
  heading "What it asks of a project" below; and, for the dose, by the scheduled look (`scripts/look.mjs`), which
  reads it from the shape check's baseline (`scripts/dose.mjs`).
- **One process takes the core in** (#1083). By default the starter kit (`scripts/init.mjs`) and every sync
  (`scripts/sync.mjs`) take the core into a repository, a new one or one at any earlier copy, by one process,
  `scripts/converge.mjs` (the kit by the same `converged` of `scripts/core-owned.mjs`), which writes what the core owns
  from the kit's templates at the copy's commit and what the project holds, its kind read from the host (#1095), so both
  end in the same state, and run again changes nothing. The core owns each workflow, Dependabot
  config, issue form, hooks' settings and tool entry file the kit writes, whole, where it is not there, carries the
  core's mark or is what a kit writes for the project; and its part of `AGENTS.md` and `CLAUDE.md`, between its marks.
  A workflow of the core's whose check the one job of the `core.yml` it ends with runs, it takes out (#1083, point 1).
  Each value of the project's that lands in a file it writes is held to its form first (floor topic 5), and where one is
  not, it writes nothing and says the mend. The one condition that changes it: a file the project holds that is not
  the core's, or one the manifest's "Differences" names: the process writes nothing of it and names it as a
  difference, as it names a rule file whose part it cannot tell apart. The trigger is a run of the kit or a sync: the
  session that runs it commits what it wrote in the sync's pull request, which `scripts/pure-sync.mjs`, run from the
  core's `main`, proves equal byte for byte to what the process there writes from the kit at the new pin and the
  project's `main`, so it stays a pure sync (floor rule 8). It does not mean that a project's own rule, workflow or
  setting is changed, a difference it keeps on purpose lost, a check that nothing else runs taken out, or what only the
  owner can do done; nor that the manifest,
  `SECURITY.md`, the threat model, the progress file, the choice records or a check's config is written where it
  stands, nor after the first copy where it does not: each is then a step's to ask, with what it needs beside it, save the keys of the kit's that the copies, shape and licence checks' configs lack whose value
  reads nothing (an empty list, mapping or text, false or null) and whose absence fails no check (a missing "ships" does), which the
  steps' writers add after the sync with every value of the project's kept (#1095, point 5). Reason: a release asked 63 things of each project, 19 of them workflow changes each with two security
  reviews, built by hand from the notes, and a project of another owner held 25 differences from what the kit writes
  for a new one. Held by `tests/converge-test.mjs` and `tests/pure-sync-test.mjs` (a render that differs, a word outside
  the core's part changed, a value out of its form, a deletion the one job does not cover, each refused), by `tests/upgrade-test.mjs`, which takes
  projects of the last two releases through the process and finds the core's files and parts as the kit writes them in
  a new repository of the same kind, and by the copies part's check of
  `scripts/checks.mjs`, in `core.yml`'s job and `copies.yml`'s, which fails a pull request that changes a file or part
  the core marks so that it is not as the core writes it.
- **The core's checks run in a project's own jobs as they stand** (#1093). By default a script of the core that a
  project's own job may run takes what it needs from the core itself: run from a copy, it installs the core's packages
  it needs from the core's lock file (`scripts/packages.mjs`, by `scripts/install.mjs`) once, before it reads, and the
  licence check, the shape check and the suites' selection (`scripts/select.mjs`) bring what a project's workflow once
  carried for them, so no step asks a project to edit its own workflow for an install. The one condition that changes it:
  the install cannot be made (the registry does not answer, the installer is missing); the script then says, as a
  warning, that it did not run and why, with its mend, and fails nothing. The trigger is a check written or widened
  that a project's own job may run: whoever builds it has it take what it needs so, and every mend that names an
  install gives the guarded form (`if [ -f core/scripts/install.mjs ]; then …; fi`). It does not mean that a project's
  own workflow is rewritten by the core, nor that no step asks where its own lookup stands or what its own suites skip
  (#1093), nor that the core's own repository installs as it runs: its jobs name what
  they install, and a package not there fails there. Reason: #1079 turned a project's sync pull request red over
  nothing it changed, and seven steps asked an agent to edit a project's own workflows by hand. Held by
  `tests/upgrade-test.mjs` (a project's own job that runs the copy's scripts on a runner with nothing installed passes
  after the sync with no change of its own) and `tests/packages-test.mjs` (a copy's script with its packages missing,
  installed first, or, where the install cannot be made, a warning that fails nothing), and, for the guarded form,
  `tests/mend-test.mjs`.
- **A writer of the core's and its readers meet in a round trip** (#1108). By default each file the core writes into a
  project (the starter kit, the one process, the sync, and the baselines and records a check or a step writes there) is
  read back in a test by each of the core's own readers that reads it (the YAML and Markdown readers, the readers of
  the checks' configs, the manifest's), written in projects of each kind the upgrade test holds, and the test fails
  where a reader cannot read it or reads another meaning. Nothing changes it. The trigger is a pull request that adds a
  script that writes a file, or a reader of what one writes, or changes the form either takes: its builder adds the
  round trip in the same pull request, in `tests/round-trip-test.mjs` or the writer's own test, and lists the script
  there, or names it there with why it writes nothing a reader of the core reads in a project. It does not mean that a
  property-testing library is added, nor that a project is asked anything. Reason: on 22 November 2026 only the upgrade
  test, a run of whole projects, found that the core's YAML reader could not read the `core.yml` the one process wrote.
  Held by `tests/round-trip-test.mjs`, in `.github/workflows/tests.yml`, which fails a script that writes a file and
  stands in neither of its lists, and a writer whose round trip did not run; that a new reader brings its round trip,
  by none.
- **The host is read and written by the look** (#1092). By default a step of the sync notes whose state is the host's,
  not a file's (a label, a setting, the look's own record, an account's right), is told done by a check of what the host
  answers (its `host` in `scripts/steps/`, `scripts/step-checks-host.mjs`, read through `scripts/host.mjs`), and what a
  step needs written on the host, the labels of the core's list and the look's issues, the daily look's own job writes
  with that job's token, each right it uses named in its workflow's `permissions:` with a comment saying what it is for
  (`.github/workflows/look.yml`, the starter kit's call of it). The one condition that changes it: GitHub refuses the
  read or the write to that token, or shows a setting to the repository's admins alone; then the step is said not read,
  never done, and the look files in one issue, "Settings only the owner gives", labelled `needs-owner`, each setting
  only the owner gives it read as not given, with its link, and each write refused, with the right it would need, naming
  there too the settings it could not read, which the owner's sitting reads. The trigger is the look's run in a project,
  each day, and each sync, which prints what `host.mjs` reads and writes nothing. It does not mean that an agent session
  edits the host for a step with its own sign-in, save where the floor asks it (secret scanning in a public repository,
  floor topic 9), that the look's token gains a right to give a setting only the owner gives, that the value of the
  secret `PERSONAL_TERMS` is read (the workflow says only whether it is given), nor that a step not read fails anything.
  Reason: a step the host holds was left to a session's own sign-in, which reaches past the project and an agent tool's
  automatic mode may refuse, the step then waiting on the owner. Held by `tests/host-test.mjs`, on a stand-in for the
  host: each step read done, not done and not read, the host only read where nothing is to be written, the labels made,
  a write refused said with its right, the issue's text, and each right of the look's workflows named with what it is
  for.
- **A release says what it asks, step by step.** Whoever adds an entry to the sync notes (`setup/sync-notes/`)
  gives it a step in `scripts/steps/` that answers done or not done exactly, never by guessing: a check of its own
  with its mend, worded so a session acts on it with no rule file open; a check of the project's that fails where it
  is not done; or, where no check reads it, why, held by the staged case `steps`. Every standing entry has one. Every sync
  runs them all (`scripts/sync.mjs`) and prints, for the sync pull request's description, only the steps not done, and
  every difference from what the starter kit writes for a new project of the same kind (`scripts/fresh.mjs`), and the packages it holds gone stale (`scripts/held.mjs`; #1095); where the core's packages cannot be installed it reads no step and says so
  in one line with its mend, and a step only a tool fetched at set-up reads is read where the session fetched it (#1095,
  points 2 and 4); each is
  a task the project's agents take (`roles/orchestrator.md`; with no orchestrator, the session that syncs), a step
  only the owner can do labelled so, and each difference kept on purpose declared in the manifest's "Differences".
  Where a script does a step exactly, the sync runs it (`scripts/steps.mjs --write`; #1091): it writes a check's config
  or baseline, a pointer's path or the manifest's module lines alone, lists it and sets it aside for the session that
  syncs to commit after the sync's merge, or says why it wrote nothing. The module lines (#1094): where the manifest's
  "Modules:" is a list, each module it neither takes nor leaves out is placed from what `scripts/manifest-reads.mjs`
  reads exactly, and one no fact decides is taken, as the kit takes it, and named on the line "Modules to confirm:",
  which the owner answers once while nothing waits. An entry whose step asks nothing of what stands (`asks: "nothing"`)
  stays in the notes and leaves the report a sync prints. Each release says in one place what it asks and roughly what each ask costs (`scripts/release.mjs`); a project's
  owner may reorder or slow the asks. It does not mean that a sync pull request carries the steps beyond what the core writes (it stays pure), nor
  that a step not done fails or stops anything, nor that a step is told done that no check reads, nor that a step that needs judgement is written by a script, nor that a module the line "Not taken:" names is
  taken without the owner's word. Reason: a
  step written only in prose is where one is missed, and nothing showed that it was; modules placed by hand took a
  judgement a fact settles, and entries that ask nothing hid those that ask. Held by
  `tests/steps-write-test.mjs` (no rule's words changed but the module lines), by `tests/manifest-reads-test.mjs`
  (the modules placed) and `tests/releases-test.mjs` (the entries that ask nothing), by `tests/steps-test.mjs`, which fails an entry with no step and a step with a
  check that cannot be taken out and mended, and by `tests/upgrade-test.mjs`: after the sync every step reads done,
  but one the release adds that it asks of every project (a check's own list to write), which is reported and done
  by its mend as written; each step added since the release started from, taken out, is reported and its mend as
  written makes it done, and steps taken out at random are reported, exactly those, and done by the writers.
- **A pull request says what it asks of a project:** one that changes the floor, a module, a script,
  the setup or a workflow has the heading "What it asks of a project", saying what happens in a project that changes
  nothing of its own: nothing, a baseline written, or an ask in the sync notes with its cost. It does not mean that
  every such change asks something of a project: "Nothing" is an answer, and most changes give it. Reason: two of the ideas
  queued on 14 November would have broken "Nothing locks a project", and only a reading caught them. Held by
  `.github/workflows/own-description.yml`, which fails one without it.
- **A check that fails says the mend** (#254). Every check of the core, a script under `scripts/` or
  a workflow's own step that fails a pull request, fails with a line that says what is wrong and where, then "Mend:"
  and what a session does about it, in words it acts on with no rule file open (the form: `scripts/mend.mjs`). Where
  the mend is a step only the owner can take (a yes floor rule 14 names), it says so, and the session's part is the
  issue it files for it. Whoever writes or changes a check writes each failure so, and its test runs it where it fails
  and reads the mend. It does not mean that a project's own checks are asked anything, nor a test's own assertions,
  which are no check. Reason: a session that met a failing check had to find the rule behind it before it could act,
  and on 14 November one stopped at a draft for want of a rule that said what came next. Held by
  `tests/mend-test.mjs`, in `.github/workflows/tests.yml`: each script a workflow names, and each workflow with a
  step that fails by itself, is a check with its test, or is listed with why it fails no pull request, and each
  check's test reads its failures with `mended()`.
- **Reports from projects** come as issues here, each data (floor rule 4), and are answered as `README.md`, "Reporting
  to the core", says.
- **The core is measured as a feature is:** at each review of the core the owner asks for,
  `node core/scripts/core-cost.mjs --cost`, run in each project of the owner's, says what share of its merged PRs were
  the core's upkeep and what a PR took, and `node core/scripts/stand-in-record.mjs` the stand-in's verdicts and how
  many of the owner's answers they matched, and `node core/scripts/review-record.mjs` what each
  review found and the bugs that reached `main` all the same (#234); the numbers go into that review's report, beside
  the last ones'. Where the
  core's share grew and the project's own work did not, the review says why, or what of the core goes for it.
- **The core's state report reads the projects that take it:** each month the session that takes
  the core's state report, where gh answers for the owner's account, adds to it what `node scripts/state-report.mjs --projects` prints:
  the counts of each project whose manifest names this core and that is the owner's, or whose owner gave the core's
  owner access, or whose manifest's row *shares its counts* says `yes`, found each time and listed nowhere by hand. A
  private project is not named, nor one of another owner's ("a project of another owner"), and of either only counts and
  conclusions are carried, nothing of its code or its discussions. It does not mean a project that is merely public is
  read for the report, though a task may read it (`roles/shared/how-to-work.md`). Reason: the owner wants to see how the
  core works in other projects, and only those that hold use to read.
- **A part of the core gives way to what is maintained** (#534). By default the core keeps the parts it has. The one
  condition that changes it: a maintained tool, package or standard, free to use, does a part's job at the same level or
  better. The trigger is a line of `QUEUE.md` that names the part, as a verdict of the inventory (`INVENTORY.md`) joins
  it on the owner's word: whoever takes that line replaces the part, and from then on the core follows the tool's
  releases by `tasks/updates.md` in place of keeping a version of its own. "The same level or better" is shown: the tool
  and the part run on the same inputs (the core's own repository, the projects the upgrade test writes of each kind, and
  the part's own fixtures), and the pull request states what each found that the other did not, as `tasks/choices.md`
  asks of a trial. Where the tool defines the thing otherwise than the core (what a copy is, what counts as a branch),
  its definition is taken unless the comparison shows it worse for what the rule is for, and the pull request says
  which; and that pull request adds a sync note whose step has a project's list for that check written anew at the sync
  that brings the replacement, the pull request's base counting as the list until then. A part rests on one of the
  exceptions of `tasks/code-shape.md`, "A job a maintained package does is done by it", to stay. The writer of
  `QUEUE.md` queues the replacements in one order: the inventory, then the tools that only run, which hand over the most
  upkeep for the least work (secrets and personal terms, then the workflow checks, then mutation testing, then links),
  then the packages installed from the core's lock file (#654), then the form the rules are delivered in, each
  replacement a line and a pull request of its own. Whatever gives way, the core keeps: the floor and the policy a check
  applies (what is allowed, its lists); the content of the rule text, which another's text never replaces, though its
  form and delivery may change, the text that describes a check that gave way shrinks to a pointer to the tool's own
  documentation, and what others do may be written anew as the core's own, joining as any rule does; and the glue around
  every check: a baseline that may only shrink, a failure that says the mend, the word that it could read nothing
  (#459), and "Nothing locks a project"; the tool finds, and the core decides and words the failure. It does not mean a
  part is replaced for the sake of it, nor that a sync asks a project to replace anything of its own. Reason: what the
  core writes itself, the core alone maintains, in every project that takes it; and rule text breaks on no update, holds
  the owner's decisions with their reasons, would run with the agents' rights where another's (floor rule 4), and cannot
  be shown "the same level or better" without trials of behaviour. Held by no check: the comparison and the definition
  taken are stated in each replacement's pull request, which the reviews read, and the inventory is held by its own
  check (`tests/mend-test.mjs`).
- **A tool that only runs is fetched at set-up, as its own program** (#534). By default a check of the core is a script
  of its own. Where a part gives way to a tool that only runs, whoever builds the replacement has the tool fetched at
  set-up, never while a check runs: one exact version, its digest in a list a test reads (a registry's own lock file
  first, for a tool a registry carries; #654), an entry for each platform a check runs on, fetched to a place outside
  the repository when a session is set up and in the set-up step of the job on the host's runners, as `scripts/node.sh`
  fetches Node. The check then runs wherever the tool is, in a cloud session, on the owner's own computer or on the
  runners; where the tool is not there and cannot be fetched, the check says that it did not run and why, and decides
  nothing. The tool runs as its own program, never through a vendor's action for the host, a hosted service or a feature
  of the host's paid plans, and passes floor rules 7, 10 and 15 and the lookup (`floor/topics/dependencies.md`). It adds
  no job: what adds minutes, mutation testing above all, stays on the lines a change touches. It does not mean a check
  that exists on the host's runners alone. Reason: a private repository on the host's free plan stops its jobs once the
  month's minutes are spent, a project built on its owner's own computer gets least from a check it cannot run there,
  and a wrapper or a hosted feature brings terms of its own (a licence key for an organisation's repositories, a price
  for each committer) and may send data out of the repository. Held, for the pin, by the licence scan's check that a
  program a file downloads is pinned by version and checksum (`scripts/licence-scan.mjs`; #488); that no workflow runs
  such a tool through another's action, by no check yet (#639).
- **A part is asked again** (#534). By default the pass twice a year over the choice records (`tasks/choices.md`) asks
  of each part the inventory marks keep or try whether something maintained now does it, and writes the day on the
  inventory's line `Weighed whole:`. The trigger that asks sooner: a bug filed that names such a part, or a pull request
  that widens what such a part reads or checks (a new case, a new format, a new language) and does not only mend it;
  whoever takes that work puts the question and answers it in that pull request. A tool the core holds is followed by
  the update rules and looked up again by the scheduled look (#488). It does not mean that an answer replaces a part: a
  replace joins the queue on the owner's word, as above. Reason: twice a year is slow for a part that has begun to cost,
  and a bug or a widening is the sign that it has. Held, for the pass, by its issue, which the scheduled look opens and
  which asks it of the inventory (`scripts/choices.mjs`); the sooner asking, by no check, since none can tell a mend
  from a widening without guessing.
- **A rule is for what an agent can do** (#303). By default a rule moves here, into the floor or a module, only where
  it holds in every project, an agent can carry it out, and it makes the product better or sturdier, as the licence
  check does: an agent keeps the project within it, and the project is safer for it. It comes from a standing word of
  the owner's (`roles/shared/inbox.md`, "An order for now is not a rule"), with an item of the archive behind it, and
  goes into a module read only when a task needs it, with a check wherever a machine can hold it. Nothing changes it.
  The design check of a pull request that adds or changes a rule blocks one that fails this test. It
  does not mean that what only the owner can act on (a duty to an authority, a promise to customers, whether a law
  reaches a product) is a rule: it is information for the owner, kept out of the rule files, binding no session. The
  core names no project outside its archive and reports. Reason: agents do what a rule file says, needed or not, at
  more cost and no gain, and a rule that only blocks gives them nothing to do. Held by the review guidelines ("A rule
  file changed"), and the standing word by the staged case `order-for-now`.
- **The archive keeps the reasoning; the owner's words stay here** (#252). By default each item of the core's archive
  stands in the core's own words (`archive/instructions/`: its date and source, what was asked, what was decided and
  what it stands behind), and that is what a project's copy carries and "core archive N" leads to; the record of the
  owner's word behind the items written before 16 November 2026 stays in this repository alone (`words/`, which
  `.gitattributes` keeps out of the copy as it keeps `reports/`). Whoever adds an item writes its key ("A new archive
  item is named by its issue"), its date and one line of the reasoning, and no quotation: the words stay on the issue.
  Wherever the owner's words are recorded here (#773), they are quoted only as floor rule 4 says: the reason behind a
  decision, cleaned, and nothing personal. Nothing changes it. It does not mean the items that stand are rewritten: they
  keep their reasoning, and in `words/` the record of the owner's word, cut to reasoning (#778). Reason: a project of
  another owner imported the owner's dated messages with the rules, and a stand-in needs the reasoning, not the wording.
  Held, in part, by `scripts/holders.mjs`, which fails the two forms out of step (`scripts/archive.mjs`), and by
  `.github/workflows/core.yml`, which fails a copy that holds what `.gitattributes` keeps here; what is quoted, by what
  holds floor rule 4's "The owner's word".
- **The archive is pointed to from the list,** not from the rule (#252). By default a rule file here (this file, the
  floor's, the roles' and the modules') holds no "core archive N": `scripts/holders/` names under "behind" the
  items behind each rule, and a session that needs a rule's reason looks them up there. Whoever writes or changes a
  rule adds its items to that list in the same pull request. Nothing changes it. It does not mean a rule loses its
  one-line reason, which stays in it ("A rule is written to one pattern"), nor that a project's own rule files are
  asked anything. Reason: about 60 such pointers stood in what every session reads at its start, and a builder on an
  ordinary task never opens the archive. Held by `scripts/holders.mjs`, which fails a pointer in a rule file and an item the list names
  that is not in the archive.
- **A new archive item is named by its issue** (#744). By default an item added to the archive is keyed by the issue
  that carries the owner's word and, where it records one point of several, by that point, as `#733.1`, and stands in
  a file of its own named by its key (`archive/instructions/issue-733.1.md`; #750, point 1); `scripts/holders/`
  names it so under "behind", and a pointer to it gives that key where one to an older item gives its number. Items 1
  to 262 keep their numbers, so every "core archive N" that stands still leads where it did. Nothing changes it. It does not mean an item moves or
  is rewritten. Reason: on 19 November 2026 two pull requests merged in parallel took the same next number, and a
  running count cannot be claimed without coordinating, where an issue's number is already unique and already named in
  the item. Held by `scripts/holders.mjs` with `scripts/archive.mjs`, which fail a key used twice, a key that names no
  issue (an item numbered past 262 among them), an item outside its own file, one of items 1 to 262 taken out, and a
  key under "behind" that is not in the archive.
- **An item that changes an earlier one names it, and the earlier one is marked** (#756). By default an item of the
  archive stands as written. Where a new item changes what an earlier one decided (corrects, narrows, widens, replaces
  or overturns it), whoever writes the new one gives it a line "Changes: N." naming each such item by its key, and
  gives each item it names one line "Changed by: M.", the keys joined by ", " where there are more; `scripts/reasons.mjs`
  prints that line under the item, and the later items after it. Nothing changes it. It does not mean the earlier item
  is rewritten: its text stays as it stands, the one line added; nor that an item that only cites an earlier one, or
  leaves it as it was, names it. Reason: some items said in passing that they replaced an earlier one while nothing
  linked the earlier one forward, so a session reading it could rely on a reason that no longer stood. Held by the
  marks' check in `scripts/archive.mjs`, run by `scripts/holders.mjs`: a "Changes:" whose item is not marked back, a
  "Changed by:" with no "Changes:" to match, a key in either that is no item, and a mark out of its form each fail;
  that a new item that changes one says so, by none yet.
- **Every rule says what holds it.** By default a rule of the floor or the modules is held by
  a check that fails where it is broken (a script, a workflow, a hook, or GitHub's setting that refuses it); where no
  check can read its breach exactly, by a staged case, the holder of last resort, or by the scheduled audit; and where
  none holds it yet, it is listed. Whoever writes or changes a rule names its holder in that PR: in
  `scripts/holders/`, a file by the rule's file and bold lead, or in a staged case's own file; and under the PR's heading
  "What holds it" (`.github/workflows/own-description.yml` fails one without it), for each rule it adds or widens, what
  went wrong or would without it (an incident, a review's finding, the owner's reason), its holder, or that it has
  none yet, and its number (#303): a line "Number:" with the count the rule is meant to lower (`findings`, the review
  findings that name it; `check fires`; or `correction: <kind>`, #302) and the one of the five outcomes it stands for
  (`; outcome: asked`, `fast`, `readable`, `usable` or `robust`), then `; rare harm` where it guards against rare and
  severe harm, as `scripts/holders/` keeps it under "number";
  "None" where it adds no rule. The rules that stood before are held the same way: `scripts/holders.mjs` lists each
  rule with no holder in the core's monthly state report, until it gains one or goes on the owner's word, and a
  review's finding seen twice moves its rule up (`tasks/reviews.md`, point 8). A line that only points elsewhere or
  says what is protected, binding no one, is marked "describes" there and is not listed. It does not mean that a rule
  with no holder fails anything or goes by itself, that a review is a holder, or that a count of a rule's citations is
  its number: a citation says a rule is applied, never that it helps. Reason: the audit of 13 November found 43 of 122
  rules held by nothing but a session reading them, and nothing listed them. Held by
  `scripts/holders.mjs`, in `.github/workflows/tests.yml`, which fails where an entry names a rule that no longer
  stands, a check that is not there or a number in no form, and by the heading's check, which asks the line "Number:"
  where the heading holds more than "None".
- **A project's own rules name what holds them** (#662). By default the rules a project writes for itself, in the
  rule files its sessions read as its own files name them, are read as the core's are: `scripts/holders.mjs --own`,
  run from the project, reads them against its list `checks/holders.json`, which the starter kit writes and a sync's
  step asks for (`setup/sync-notes.md`, which gives the files and the list's forms). Each month the session that takes
  the project's state report files, for each rule it lists with no holder, those read at a session's start first, a
  task at the project's pace: a check where one can read the breach exactly, the rule moved to where it is read on
  need, or a proposal that it goes, which is the owner's to decide. Of every rule of the project's own, held or not,
  it answers, as an auditor reads (`roles/auditor.md`), whether it is about this project, its kind or every project, in the list's "about" (`this project`, `its
  kind: <the kind>` or `every project`), and files each about a kind or every project to the core as an idea where
  none is filed yet, naming the kind, written for the kind and holding nothing of the project (`README.md`,
  "Reporting to the core"; #484, point 9). The staged cases and the pruning stay the core's,
  for the whole sessions each costs a month. Nothing changes it. It does not mean that a rule with no holder, or a wrong
  line of the list, fails anything, is removed or stops binding, that a session rewords a project's rule on its own
  reading, nor that a review, or how often a rule is cited, holds one. Reason: a rule file read at every session's
  start with nothing that enforces it is the case the study behind #545 measured, no gain in the work and more cost.
  Held by `tests/holders-test.mjs`, on a scratch project with one rule held and one not, by `tests/look-test.mjs`, for
  the report's list, and by the step `scripts/steps.mjs` reads for the first list; the answers, by the report's lists
  of the rules not yet answered and of those to file, in part.
- **A rule of a game's kind moves to the core once a second game needs it** (#484, point 10). By default a rule a game
  writes for itself stays in that game, and an idea filed here as about its kind, or about every game, waits. The one
  condition that changes it: a second game needs the same rule, one that stands or one the owner has planned, and the
  idea's line joins `QUEUE.md` as any idea's does, on the owner's word. Then whoever builds that line writes the rule
  into the game module for the kind, or for every game, never for the game it came from, naming the kind, and the game's
  own copy goes at its next sync, as the game module says of its sync (`tasks/game-design.md`). It does not mean a
  game's rule is taken from it before the owner's word, nor that a kind with one game gets a part in the core. Reason:
  two games each held rules true of their kind (on what a request to a model may imply, on how fast a computer player
  may react), and a new game of that kind would have had to find them again. Held by none yet.
- **A check that read nothing says so** (#459, point 2). By default a check of the core's that reads a project's code
  passes where it finds nothing wrong. The one condition that changes it: it found no file there it could read, the
  shape check where its config is missing, its "code" and "tests" name no file of a language its readers know, or the
  manifest turns it off with `none` and the owner's reason, the tests' strength where the manifest names no *mutation
  tool*, or `none`, or Stryker from a folder that holds no lock file, or the shape check's config, whose files it
  measures, is missing or names no file it measures. Then `scripts/read-nothing.mjs` names it, with the rules of the
  modules the project takes that it holds, in the report every sync prints (`scripts/steps.mjs`), and where it cannot
  tell, the report says so. The trigger is such a check, written or widened: whoever builds it gives it its case in
  `read-nothing.mjs` in the same pull request. It does not mean that it fails anything. Reason: a check that passes on
  nothing makes its rule look held: in a project of another owner a check held 10 of the 75 of the core's rules that
  applied there, and nothing told its owner which. Held by `tests/steps-own-configs-test.mjs`, for the sync's report; that a new
  check gives its case, by none.
- **The share a check holds is reported** (#459, point 3). By default a project's monthly state report counts its own
  rules by what holds them. The session that takes it gives, on its line "rules held by a check", how many of the
  project's own rules a check holds whole and how many of the core's it takes, as the core's list maps them, counting
  none whose every check read nothing there ("A check that read nothing says so"); the core's report of the projects
  carries it as numbers alone, and the core's own report gives the same of the core's own rules, those of this file,
  beside the floor's and the modules'. Nothing changes it. It does not mean the share is a target, nor that a check the
  core's list names (a ruleset of the host's) is read as set up in the project. Reason: the owner sees how much of what
  binds a project a check holds there, which a count of the core alone hides. Held by `tests/look-test.mjs` and
  `tests/holders-test.mjs`, the core's own count included (#925).
- **Staged cases hold what no check reads** (#235). By default a rule is held by a check; where none
  can read its breach exactly, since the breach lies in what a session does, a staged case holds it: a scratch project
  (`scripts/staged/`) in which a fresh session is given a task where the rule is easy to break, passed or failed by
  the case's script on what the session did, read from the project (its commits, its pushes, what it wrote to GitHub),
  never on what it says of itself. A case is due on the first scheduled look of each month, and once the words of a
  rule it holds change (`node scripts/staged.mjs`), save the reviewers' case `review`, due monthly alone
  (`tasks/reviews.md`, point 9); the look then keeps the issue "Staged cases to run". The session
  that takes it runs each due case in a fresh helper at the builder's model and high effort, records the verdicts in
  `reports/staged-cases.json` in a pull request of its own, and says there of each failure whether the rule, the case
  or the session was wrong. The cases advise until three months in a row have run every one with no verdict found
  wrong; from then `scripts/release.mjs` cuts no release while a case's last verdict fails. They are run under each
  agent tool the core is used with, again at each release, and a tool works with the core once it passes them
  (`tasks/tools.md`; #249). It does not mean that a
  case runs on a pull request or in a project, nor that one stands where a check could read the breach. Reason: no
  check sees how a session behaves, and the core's two staged runs, each of which changed it, were never run again
  when the rules or the models changed. Held by `tests/staged-test.mjs` (each case read as set, kept and broken;
  what is due; when the cases hold a release), in `.github/workflows/tests.yml`, and by the look's issue.
- **Rules are pruned by their numbers** (#303). By default with every second monthly state report, and in a month whose
  report a session of a newer generation of model takes than the last pruning's (`node scripts/pruning.mjs --due --model
  <its id>`), the session that takes the report runs each staged case with the rules it holds taken out
  (`scripts/pruning.mjs --set`, then `--read`), records the counts (`--record`) and adds as a note the list `node
  scripts/pruning.mjs` prints, the record in a pull request of its own: the rules of the floor, the modules and this
  file whose number did not move since the last pruning, whose check no failed step of a pull request's run shows
  firing, whose case passed without them, or whose number, a stand-in, moved at two prunings while its outcome's direct
  measures did not. A rule fewer than twenty merged pull requests have come under since it joined is "too early" and not
  judged, and one that guards against rare and severe harm, the floor's and any whose number says so, is judged by its
  staged case alone, never listed for a check that did not fire. Ahead of all these, the list leads with the rules
  `scripts/holders.mjs` counts as having no holder, worst first, a rule read at a role's or a tool's start before one
  read on need, each with its proposal in `reports/unheld.json` (#545): a check or staged case that could hold it, filed
  as a task; a move to a module read on need; that it goes; or, where it binds no one, that it describes. The session
  gives one to each that has none, a check only where it never guesses and its upkeep pays, a maintained tool where one
  reads the breach (#534) and a maintained linter's rule that can be switched on before a check written by hand, takes
  out those whose rule gained a holder, and files each check as an issue, which joins the queue as any check for a rule
  that stands does, worst first; a rule that guards against rare and severe harm is proposed a holder, never to go.
  Nothing changes it. The owner decides which move or go, a few at a time, the numbers read again before more go; the
  list gives each rule its step: a rule read at a role's start is at step 1, to move to a module read on need, and one
  read on need at step 2, to go where nothing changed after its move, kept in the archive with its reason and its last
  number, and free to return. It does not mean that a session removes or moves a rule by its own choice, that a listed
  rule goes, or that a new rule waits for a holder. Reason: the core tested that a rule holds and never whether it is
  still needed, and an unneeded one costs every session that reads it; on 17 November 2026, 189 of its 310 rules were
  held by being read alone. Held by `scripts/pruning.mjs`, which makes the list, its test reading that the rules with no
  holder lead it, and by the state report, which says when a pruning is due.
- **Proof is sized to what a thing costs others** (#303). By default the design check of a pull request that adds a
  thing asks for a number that shows it pays only where the thing is text a role reads at its start, a check that can
  fail a pull request, a test that adds a tenth of its suite's time mark or more (`tasks/tests.md`), or a choice one
  pull request cannot reverse (`tasks/choices.md`); of anything else, a quicker test or a line of a module read on need
  among them, it asks none, and it holds a new measure to one a script counts, never a hand, that costs less than
  keeping the thing does. Nothing changes it. It does not mean a rule names no number: its line costs a line and is asked all
  the same ("Every rule says what holds it"); what is sized is the work of proving. Reason: proof that costs more than
  what it guards against is the overhead it was meant to cut. Held by the review guidelines ("A rule file changed").
- **A rule is written in the form a check can hold** (#887). By default a rule of the floor, the modules or this file
  takes a form whose breach a check reads without guessing: whoever writes or changes one looks first for such a form,
  the rule as asked or one slightly different, writes it, and names the check under "What holds it". The one condition that
  changes it: the checkable form would change what the rule asks or protects in a way that matters a great deal; then
  the form only a reading holds is kept, and the pull request says why. The trigger is a rule written or changed: the
  design check reads each for it, and blocks one held by reading alone where a checkable form exists and the pull
  request gives no such reason (`roles/shared/review-guidelines.md`, "A rule file changed"); and at each pruning ("Rules
  are pruned by their numbers") the session that takes it proposes, for each rule with no holder, beside its other
  proposal, a slightly different form a check could hold, or why none exists (`form` or `noForm` in
  `reports/unheld.json`; a proposal of a check, which holds the rule as worded, or that the rule describes needs
  neither). A project's design checks read its own rules the same way, from the release that brings it. It does not
  mean that a rule's purpose is bent to fit a check, that a rule is turned into a line a pull request declares where
  what it asks is what the work does, that a check that guesses is written, nor that a rule that stands and no change
  touches is rewritten for it outside a pruning's proposal. Reason: a
  rule a check holds need not be given to a session ahead of its work once release 7 (#692) begins, and is kept whether
  or not it is read, while one held by reading costs every session that reads it. Held, for the pruning, by
  `scripts/pruning.mjs`, whose test reads that the list gives each rule with no holder its checkable form or the reason
  it has none, or says it has neither yet; for the design check, by no check, since none can tell without guessing
  whether a form exists.
- **A rule is written to one pattern.** Whoever writes or changes a rule of the floor, the modules or
  this file writes it in six parts: the default first, then the one condition that changes it; a trigger someone can
  observe ("a trial shows the stack misses a need stated in numbers", never `when performance matters`); one actor and
  one action, who does what; what it does not mean, where a reader could overreach; its reason, in one line; and what
  holds it (a check, in the form one can hold where there is one, as the rule before says; a staged case or the
  audit), named under "What holds it" as "Every rule says what holds it" says.
  Kept out: adjectives that measure nothing (`clean`, `performant`), `should consider`, which binds no one, lists of
  preferred technologies, which date within months, and whatever a check's failure can say at the moment it matters
  (#254). A rule that stands and no change touches is the one exception: the audit of the core against itself (#259)
  brings it to the pattern instead. It does not mean a project's own rules are asked to take this pattern; they may be
  written the same way, and what holds them is listed as "A project's own rules name what holds them" says. Reason: in one evening three rules were read against what the owner meant, each for want of an observable
  trigger or a reason. Held by `scripts/general.mjs` with its list "phrases" (`scripts/general.json`), and by the review
  guidelines ("A rule file changed").
- **What can be read is never asked or declared** (#481). By default a fact about a project's set-up
  that can be read exactly, from its repository, its host, the tools at hand or the record of its past work, is read by
  a script, and a row of its manifest, or the owner's word, only overrides what was read; what the owner wants (a pace,
  a taste, what a product ships for, which kinds of choice the owner keeps) is no fact, is never guessed, and has a
  default the owner's word changes, so nothing waits on it. Where a fact cannot be read exactly, it has a default and an
  override, as a choice has. Whoever writes a rule or a slot that takes a fact about the set-up says where it is read
  from, or why it cannot be; each slot of the README's table carries one mark, `read:` with its reader, `choice:` with
  its default, or `cannot be read:` with the reason and a default; and a reader prints what it read, so a wrong reading
  is seen and overridden. It does not mean that a script guesses, nor that what only the owner can give (the personal
  terms, a setting on the owner's account, a certificate, the holder's name in a licence file, and whose word counts
  where the host cannot say it) is taken from elsewhere or given a default (floor rules 4, 11 and 14). Reason: a project
  that takes the core on trust sets nothing, so a rule that waits for a setting gives it its worst case. Held by
  `scripts/manifest-reads.mjs --core`, which fails a slot with no mark, a `read:` whose reader is not there and any
  other with no default; by each reader's own test; and by the review guidelines ("A rule file changed").
- **Rules are written for any project.** The projects that take the core differ in what they build (a game, a program
  people rely on at work), where they are built (the cloud, the owner's own computer), who can read them (anyone, the
  owner alone) and how they release (every merge, a tagged build). A rule reads true in each, what differs is a slot,
  and what holds for one kind alone goes in a module of its own. `scripts/general.mjs` fails a word in the floor or the
  modules that fits only some (`scripts/general.json`); a word a project finds untrue for it joins that list in the PR
  that rewords it. The owner is never "he" or "his" in new text: the same check reads each line a PR adds under
  `archive/` and `reports/` for a gendered pronoun, a line quoted with `>` (the owner's own words) and a record moved
  word for word aside, while the older records stay as they were.
- **A record pull requests add to is a folder of one file per entry** (#750, point 1; #853), as `tasks/planning.md` sets
  out for any project's busy record. By default the core's are: each part of the inventory (`INVENTORY.md`) in a file of
  its own under `inventory/`; each entry of the sync notes (`setup/sync-notes.md`) under `setup/sync-notes/`, its step
  in a file of the same name under `scripts/steps/` and, where the step has a check, its stage for the tests under
  `scripts/stages/` (a stage whose mend reads what the others' mends write says `last`); and what holds each rule (its
  holder, the items behind it and its number), each rule's entry in a file under `scripts/holders/` that `entryFile` in
  `scripts/holders.mjs` names from the rule's key; and the choice records (`CHOICES.md`), each in a file under `choices/`.
  Each is read in the order of the files' names by the script that
  reads it (`scripts/inventory.mjs`, `scripts/sync-notes.mjs`, `scripts/steps.mjs`, `scripts/steps-stage.mjs`,
  `scripts/holders.mjs`, `scripts/choices.mjs`), as each archive item stands already ("A new archive item is named by
  its issue"). Whoever adds
  an entry adds its file. Nothing changes it, and what it does not mean stands there too. Reason: of 39 pull requests
  merged between 18 and 19 November 2026, 8 changed `INVENTORY.md`, 10 `setup/sync-notes.md`, 7 `scripts/steps.mjs` and
  6 `scripts/holders.json`, and under merge-on-green pull requests that add to one file merge side by side and collide.
  Held by `tests/mend-test.mjs`, which reads the inventory whole, and fails a folder `INVENTORY.md` does not name and a
  part's line written in `INVENTORY.md` itself; by `tests/steps-test.mjs`, which reads the notes whole, and fails an
  entry, a step or a stage without its pair of the same name and an entry written in `setup/sync-notes.md` itself; and
  by `tests/holders-test.mjs`, which with `scripts/holders.mjs` fails a file of the list not named from its rule, and
  two rules whose entries would share a file; and by `tests/choices-folder-test.mjs`, which fails a record written in
  `CHOICES.md` itself and a file of `choices/` that is not one record.
- **The core's address stands in one place** (`scripts/core-address.mjs`). Should the account or the
  repository be renamed, it changes there and in the `CORE` of `.github/workflows/core.yml`, in one PR;
  `tests/core-address-test.mjs` names what else here must follow, and a sync note tells each project to move its
  manifest's line and its calls.
- **Never create a repository named `agent-rules`,** the core's old name: links to it redirect here.

## Review guidelines

Every reviewer reads `roles/shared/review-guidelines.md` whole and judges the change by it, with the floor. Here, a rule that
changes what any project must do without saying so in the PR is a departure from the PR's description, and blocks; so
does one that reads true only for some of the kinds of project "Rules are written for any project" names, and a raise of
a size cap in a PR with no "Leanness check:" comment that found too little room.
