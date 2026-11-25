# How code is put together

Read when a system is designed, added or named, when code is ported or rewritten, when a pull
request deletes a test or weakens one (#253), before a session writes more than about 50 lines for one job (#486),
and when a bug is mended (#593): the kinds `system`, `port`, `test` and `bug`. How what already stands is brought
to it: `tasks/cleaning.md`. What the tests cost, their time marks among it: `tasks/tests.md`.

A **system** is a part of the code that someone can describe in a sentence: what it offers the others. A project names
its systems, and the marks below, in the config of its *shape check* (`core/scripts/shape.mjs`), which runs on every
pull request and says the mend of each thing it fails. Isolated means narrow, declared and checked, not none: systems
work together, so what is complete is that nothing reaches inside another system, and what they share goes through
one declared entrance.

- **Never worse.** By default a pull request that adds a breach of a rule below fails, in every project, and its
  session mends it there. What stood before the check read it is listed in the check's baseline and never fails: a
  listed function may shrink and may not grow, and a listed import may go. The baseline shrinks freely
  (`--write`): a pull request that only improves on it passes, never one that makes anything worse, the check
  printing what the lowered baseline leaves out, which the next pull request that changes the baseline, or a
  cleaning task, writes whole (#750, point 5), since improving pull requests that each rewrote the one baseline
  collided; the cost is that, until it is written, a later change could slip back to the old level unseen. An
  entry joins it in two cases only: the check reads more than it did (a system named, a mark lowered, the first
  baseline), where the base branch held the breach already; or there was no other way, where the baseline gives the
  entry's reason under "grown", the pull request gives it too, and a fresh session says there that it found no other
  way. A mark rises the same way. It does not mean that code which stands is rewritten on demand: the baseline is a
  debt, worked down by tasks (`tasks/cleaning.md`), and no project is asked to rewrite. Reason: the rules are there
  for a reason, and one earns from them only where they cannot slip. Held by the shape check, which reads the baseline
  against the pull request's base, and by the reviews for the reason given (`roles/shared/review-guidelines.md`).
- **Only the owner turns the shape check off** (#1107). By default the shape check runs on every pull request, on the
  config the manifest's *shape check* row names, else the starter kit's. The one condition that changes it: that row
  says `none` with a reason, on the owner's word, and the pull request's base says so too; the check then passes,
  saying it is off and why, and no step asks for its config or baseline. The trigger is the owner's word that the
  check is to be off: the session it is given to writes the row, and the pull request that writes it is still checked,
  with a warning that it turns the check off; the row keeps naming a config of the project's own path after the reason
  (`none`: <reason>; config `<path>`), and any pull request that drops it fails. It does not mean that a `none` with
  no reason, or a config left out, turns it off, nor that the config's other readers (the selection, the time marks,
  the strength) stop. Reason: a check a project could leave off by writing nothing would hold nothing. Held by the
  shape check, which is off only for a `none` with a reason its base holds too and fails a pull request that drops the
  config's path from the row, and by `core/scripts/read-nothing.mjs`, which names it as reading nothing; that the
  owner's word is behind the row, by none.
- **Each project names its systems, under the same domains.** By default every file of code lies in a system the
  config names, each with its paths, the systems it uses, its entrance and its domain. The domains: the rules; saved
  data; the display; input; the network; storage; code bound to a platform; wrappers of third-party packages; tools;
  tests. A project leaves out what it lacks and adds its own, and a module for one kind of project names that kind's.
  The trigger is code that fits no named system: the builder who adds it names its system in the same pull request.
  It does not mean more systems than someone could describe in a sentence each, a fixed name for the layers inside
  one, or a rewrite to reach them: what then crosses is listed in the baseline. Reason: where most files reach into
  one shared middle, each feature touches the middle, a builder reads widely before it changes anything, and lanes
  cannot run side by side, so the work becomes *one at a time*. Held by the shape check, which, once a project names
  a system, fails a new file of code that lies in none, and says on every run how many old ones do; and by the
  audit's first question.
- **Between systems, absolute for new code:**
  - the rules import nothing outward: not the display, input, the network, storage or a platform, and the clock and
    randomness are passed in to them;
  - dependencies point one way, and there is no cycle, between systems or between files;
  - each system has one entrance, and the others use only that;
  - each piece of data has one owner, and the others get a view they cannot change, or send a command;
  - each third-party package the project ships with is wrapped in one system;
  - a system's tests run without the other systems.

  The trigger is an import, or a call to the clock, that breaks one: the shape check fails it, naming the file, and the
  session mends it as the failure says. It does not mean that a system never reads what another holds: it reads it
  through the other's entrance, where its config declares that it uses that system. Nor does it mean a process or a
  service of its own for each. Reason: a change inside one system then stays inside it. Held by the shape check for
  the imports, the cycles, the entrances, the packages and the rules' own clock; who may change a piece of data, and
  whether a system's tests run alone, no check reads, and the audit's fifth and sixth questions answer.
- **Portable by default.** What a product ships for is its owner's choice. What its code builds and tests on is a
  separate matter: by default code bound to one platform lies in a system of the domain `platform`, and the rest
  builds and tests wherever the project's sessions and checks run. The trigger is an import of something the config
  lists under "platform" from outside that system: the check fails it. The project's builder lists there each package
  or module that binds code so. It does not mean a change to what the product is sold or shipped for. Reason: a
  project bound to one platform from its first day, on a tool's advice, cannot be tested where its sessions work.
  Held by the shape check and the audit's seventh question.
- **A function is held to three marks:** its lines, how deep its blocks nest, and how often it branches, where each
  `if`, loop, `case` and `catch` counts, and each and, or and choice within a line. The first guesses are 60 lines, 4
  deep and 15 branch points, which use tunes in the config's "marks". The trigger is a new function past a mark, or a
  listed one that grows: the check fails it, and its builder splits it by what it does. It does not mean that tests are
  held to the marks, nor that the numbers are the aim: file size was held, and files became small while staying one
  piece, so the checks read what depends on what and the audit's reader judges what no number shows. Reason: on 15
  November 2026 three codebases held 19, 54 and 79 functions with more than 30 branch points, the worst in the files
  changed most. Held by the shape check.
- **A job a maintained package does is done by it** (#486). By default, in all code (the core's tooling, a project's and
  its product's), a job that a maintained package does is done by that package and not by hand; first among such jobs is
  one on a format or a language someone else defines and changes (YAML, a language's grammar, shell syntax, a lock file,
  the host's workflow format, Markdown the project does not control), where a package follows the changes and code
  written by hand must be kept in step for ever. Which kind of package comes first, floor rule 15 says ("A new one is
  taken in an order"); what the platform brings comes first against code written by hand too, its test runner and its
  reader of arguments among it, and a job it does is never written by hand for being small. A package that fails the
  floor (rules 7, 10 and 15) is no package for this, nor is one nobody looks after: maintained means a release within
  the last year and a repository that is not archived, a first guess; and few packages of its own count for it. The
  trigger is a session about to write more than about 50 lines for one job: it first searches for a maintained package
  that does the job, on the web and in the registry of the language at hand, and its pull request names what it looked
  for on a line that opens `Looked for:`, as a choice's record does (`tasks/choices.md`). It writes the job by hand only
  where one of four things holds, and its pull request says which in a line: the job is small and stable, about 50 lines
  or fewer, a first guess; no package fits, the job being the project's own, as a reader of its own rules or settings
  is; fitting a package takes more code than the job itself; or the package brings too much, many packages of its own or
  far more than the job needs. It does not mean a product takes a package the floor would refuse, that code which stands
  is rewritten for it, nor that a project may not decide otherwise for what it ships: one that counts "no dependencies"
  among its features declares that among its manifest's "Differences". Reason: for a session code is cheap to write, so
  it writes where a person would reach for a package, and the cost comes later, as upkeep and as bugs in readers written
  by hand. No check holds it yet, since none can tell one job from another without guessing: the reviews read it
  (`roles/shared/review-guidelines.md`), and `core/scripts/holders.mjs` lists it until something holds it.
- **A port or a rewrite states what it keeps.** By default a change that moves code proves behaviour unchanged. A port,
  or a part that is rewritten, states in its pull request what it keeps and what it is free to change. What it keeps
  is what the program owes: its rules, what it saves, what its users see. How the old code got there is not owed: the
  old tests' meaning moves, and the new code may be shaped anew. A proof that is exact by accident (a fingerprint of a
  whole run) may be taken again, with its reason, where the tests of the rules and the measured outcomes still hold.
  It does not mean that a split or a cleaning task may change what the program does. Reason: sameness proven line by
  line binds new code to the shape of the old. Held by the reviews alone, which read the statement.
- **A new project starts as rules with no screen.** By default the first code of a project that has rules of its own
  is those rules, run and tested with no display, and a plain view of their data; the display is added on top, as a
  system that uses them. Its first builder starts so. It does not mean that a project which stands is rebuilt, nor
  that one with no rules of its own invents some. Reason: rules that never import the display are tested, ported and
  run by a machine without it. Held by the shape check once the rules and the display are named systems; until then
  by discipline alone.
- **How strong the tests are is measured on the lines a pull request changes** (#253). By default the job that runs a
  project's tests runs its *mutation tool* on those lines through `core/scripts/strength.mjs`, which shows on the pull
  request how many of the faults put in on purpose a test caught, and fails nothing. The tool is the core's list's
  for the language of the project's code (`core/scripts/mutation-tools.json`), a tool of development only, under the
  floor's rules for dependencies and licences, that writes its report in an open form, the mutation-testing-elements
  schema: the starter kit names it in the manifest's row, and `core/scripts/mutation-tools.mjs --write` once the
  project's code or tests change what the list gives, where the row holds no tool or reason of the project's own
  (#1107). Where the list has no tool that fits, or there are no tests yet, the row says `none` with that reason and
  the measure is left out; else only the owner turns it off, with `none` and a reason of the owner's. The one condition that changes it: once
  the project's baseline stands, a fault that survives on a changed line and the baseline does not list fails, and the
  session writes a test that catches it; only where the fault changes nothing the program does, it lists it with that
  reason, as "Never worse" says of any entry. The baseline lists what survives a whole run, which is the audit's,
  outside the suite and in a pull request that changes no code or test (`tasks/cleaning.md`): a debt worked down at
  the dose. It does not mean that a pull request runs the whole codebase, that a score is the aim, or that the tests
  that stand are rewritten on demand; a listed fault whose line the change rewrote stays listed, and any other fault on
  a changed line is the change's own. Reason: the projects lean on their suites as the proof that a
  change kept behaviour, and nothing measured whether a test fails where the code is wrong. Held by the strength
  check, which counts each kind of fault a file holds against what the baseline lists of it and fails a survivor past
  it, an entry that joins with no reason, and one dropped while its fault survives, and by the reviews of that reason;
  the row, by `tests/mutation-tools-test.mjs`, and that only the owner writes a `none` of the project's own, by none.
- **A test taken out or weakened is said.** By default a pull request keeps its tests and what they assert. The
  trigger is a pull request that leaves a test file with fewer lines that assert, deletes it, or skips a case in it:
  its builder names that file on the description's line `Tests changed:`, with why, and the reviewer rules on it,
  checking that the reason holds (#307). It does not mean that a test which proves nothing must stay, nor that an
  assertion only changed is named: it may be made stricter, and the check lists it for the reviewer, who rules on it.
  Reason: a measure on changed lines cannot see a test weakened elsewhere, and a test made to pass is the cheapest way
  to green. Held, in part, by the description check (`core/scripts/weakened.mjs` lists the lines, in the test files the
  *shape check*'s config names), which fails a description that leaves such a file off the line; an assertion loosened
  in place, or on a line of a call spread over several, no check tells without guessing, and the reviews read it
  (`roles/shared/review-guidelines.md`).
- **Near-copies are reported.** By default code that only looks like other code fails nothing. The trigger is a run
  of code that matches another once names and numbers are set aside: the copies check lists it on every run, and the
  audit's reader judges whether one function should serve both. It does not mean that such code is joined by rule:
  "One fact, one place" forbids a second copy of a fact, and code joined too early is harder to change than two plain
  pieces. Reason: exact copies were held, and copies that differ only in their names were up to 2.5% of a codebase
  that nothing saw. Held by the copies check's report.
- **A part whose gaps repeat is read for its whole input** (#593). By default a bug is mended at its cause (#308). The
  trigger is the third bug filed against one part that was a kind of input, of project or of platform the part did not
  read, counted from the issues labelled `bug` that name the part's files: the builder that mends it lists every kind
  the part's job covers, from the source that defines them (the project's kinds and its manifest's slots, the platforms
  it builds and tests on, a format a standard or the host defines), and gives each a test, in that pull request or,
  where that is large, as a task it files, the pull request holding the list. Where an authority says the whole set (a
  build tool for what a build brings in, git for a rename, the host for a pull request's reviews), in the core, that
  builder or whoever writes such a part anew has the part's test run the part and the authority on the same inputs, the
  projects its upgrade test builds, and fail on any difference, and whether the part gives way to it is weighed as for a
  maintained package. Three is a first guess. It does not mean a bug waits for the list, that a part with three bugs is
  replaced, that a kind no source names is guessed, nor a comparison where nothing defines the whole set or on another
  owner's project. Reason: mended one case at a time, four of the core's parts took 22 bugs of the same kind by 17
  November 2026, and kinds listed by hand are as complete as their writer's memory.
- **A comment says why the code is so, never what changed** (#458). By default a comment explains what a reader cannot
  see in the code: a reason, a limit, a pointer to where the reason is written; what changed, when and for which task is
  git's to hold, in the commit's message and the pull request's description. The trigger is a line of a comment that
  holds a mark of a change in the shape check's list (a change's heading such as "Changed:", what the code was, a
  change's date, the task that changed it; `core/scripts/shape-readers.mjs`, and the config's "changes", plain text a
  project adds), in a comment line's first 400 characters: the check counts them by file, those that stand are in its
  baseline and are worked down at the dose (`tasks/cleaning.md`), and a pull request that adds one fails, its builder
  moving the words to the commit or the pull request. It does not mean a pointer to an issue that gives the reason, a
  comment a tool needs, a rule on how many comments code has, nor a rewrite of the comments that stand. Reason: agents
  write such marks by habit and every later session pays to read them; one project held 13,461 such lines in 1,026
  files. Held by the shape check, whose list loses, in the pull request that finds it, a pattern that proves to guess.

**What has no mark here.** A hub, a file most others import: one that holds one small fact is as it should be, and
the audit's reader judges the others. The time a user waits on gets its own measure as its rule comes (#318).

**What the check reads.** JavaScript and TypeScript, JSX among them, C# and Python, each by a reader of its own
(`core/scripts/shape-readers.mjs`), the functions of each by the parser the core installs, and of C# and Python all it
reads; in C# what a file takes from another is read from its using directives alone. Of scripts that share one global space (no import, no
export), it holds that each file adds at most one name there and no two declare the same. Of every file's comments, it counts the lines that mark a change. It never runs the code it
reads, and never guesses: an import that leads nowhere it can tell and a file in another language are counted and said
on every run, never failed; a file of JavaScript, TypeScript, C# or Python its grammar cannot read whole, and one of
them past the size its reader takes or whose tree holds more nodes than it walks (`LARGEST` and `MOST_NODES` in `core/scripts/tree-walk.mjs`), is counted and said too, and one a pull request adds fails, saying its mend; the audit's reader holds
all that code to these rules. A baseline names the readers whose finds it lists, so a reader that comes later turns nothing red: what
stood is said until `--write` lists it. A project that has not written its config yet is held to the starter kit's own,
with each pull request's base as its baseline, from the sync that brings the check.
