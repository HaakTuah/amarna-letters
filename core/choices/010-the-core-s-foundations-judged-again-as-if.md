## Choice: the core's foundations, judged again as if written today

The record of #519, written and argued on 17 November 2026 by the process of #515 (points 1 and 3 to 7): one question,
were the core written today, from nothing, what would it be written in and built on? Its four parts: the language and
runtime of the scripts; whether their code is typed and checked; how a language or a format someone else defines is
read, and whether what reads it is carried or fetched; and how the core reaches a project. It argues again the first
three records below and the fourth, the copy. The target is judged on merit first, the cost of moving left out; the path
and its cost are a second judgment, apart. The trial's commands and its numbers in full are in the pull request that
adds this record.

- **The constraints.** Fixed, and not argued: the floor; "Nothing locks a project"; and that the core's checks run
  wherever sessions run (a cloud session, the host's runners, the owner's computer, Linux and Windows), in a project of
  any stack. Every other one is argued below, never assumed: that nothing is installed in a project; that a check
  needs no network when it runs; that one runtime is pinned; and the size of what a project carries.
- **Criteria, before the options.**
  1. Runs everywhere with what is there: the tools a place must already hold before a check starts (today Git, and a
     runtime `scripts/node.sh` fetches by its digest where the machine's differs).
  2. Correct: faults the tests and reviews miss, counted on the bugs fixed so far; for another language, counts equal
     to a hand count on code written to trip a reader, held out from whoever wrote it.
  3. Fast where it is paid: a hook starts in under 100 ms; a check reads 100,000 lines in under 5 s; the core's suites
     stay inside their time marks on the slowest runner (Windows, where starting a process costs most).
  4. Trust and upkeep under the floor: the fewest publishers, the least code no one reads by eye, each update one exact
     version read against its notes, licences on the allowed list.
  5. What a project carries and pays: the copy's bytes (4.0 MB today, 1.6 MB of it the core's own tests) and the minutes
     its checks add.
  6. How well agents work in it: written right the first time, no build step to change one script, faults said before
     the tests run.
  7. A new language or format costs hours, not days.
  8. What leaving costs later, and how long the choice lives (its upkeep, its promises of compatibility).
  9. Works with the network a session has: only the package registries and the host reachable, or none on the owner's
     computer; a fetch that fails says its mend and turns nothing red that stood before.
- **The long list,** searched on the web as well as known, each kept or dropped against a criterion.
  - *Language and runtime.*
    - JavaScript on the pinned Node: kept.
    - TypeScript, only the syntax Node strips, run by the same Node: kept.
    - Bun, which runs the same JavaScript: kept, as the stand-in for a faster JavaScript runtime.
    - Deno 2: dropped on criterion 1, on no runner or session machine, and its trial read from Bun's, the same profile.
    - Python 3: kept.
    - Go, a static binary for each system: kept, as the stand-in for a compiled language.
    - Rust: dropped on criterion 6; compiled like Go, slower to write and to build for some 90 commands.
    - C# on .NET (a file run by `dotnet run`): dropped on criterion 1, an SDK of hundreds of MB no npm project or cloud
      session holds, and 3, its start-up.
    - PowerShell 7: dropped on criterion 1, on no Linux session by default.
    - Bash with the usual tools: dropped on criteria 1 (Windows has it only through Git Bash) and 2.
    - Lua, Nim, Zig, Kotlin on the JVM: dropped on criteria 6 and 1, and the JVM on 3.
  - *Types.*
    - None, as now: kept.
    - Types in comments (JSDoc), checked by TypeScript's checker: kept.
    - TypeScript's own syntax, erasable, the checker run in the core's own tests: kept.
    - TypeScript built to JavaScript and the output committed: dropped on criterion 6, a build step on every change and
      the code held twice.
    - Flow: dropped on criterion 8, its upkeep outside its maker narrow.
    - A checker of the picked language's own (mypy or Pyright for Python; Go's compiler): follows the language.
  - *Reading another's language or format.*
    - Readers written by hand, as now: kept.
    - Tree-sitter, its grammars run as WebAssembly by Node (`web-tree-sitter`), carried in the copy: kept.
    - The same, fetched by digest when a check first needs it: kept.
    - Each language's own tooling (Roslyn, the Rust compiler, Python's `ast`, Go's parser): kept.
    - Lizard (a counter of functions and their branching in some 30 languages, Godot's among them; Python): kept.
    - ast-grep (tree-sitter inside a native binary for each system, queries in YAML): dropped on criteria 4 and 5, a
      native binary for each system and processor no one reads, holding the grammars `web-tree-sitter` runs as they are.
    - Mozilla's rust-code-analysis (tree-sitter, Rust): dropped on criterion 8, its last release over three years old.
    - scc and tokei: dropped on criterion 2; they count a file's keywords, not functions.
    - Semgrep: dropped on criteria 1 and 4, a native engine and a Python install.
    - srcML: dropped on criteria 1 and 7, a native tool for a few languages.
    - ANTLR's community grammars with its JavaScript runtime: dropped on criteria 3 and 8, slower parsers and grammars
      of uneven upkeep.
    - A language server for each language: dropped on criterion 1, each needs its toolchain.
    - A parser for one language alone (acorn, oxc, Babel for JavaScript): dropped on criterion 7, as the base for
      every language; it may still read one.
    - For the formats: YAML by `yaml` (one publisher, no dependency, reports a key given twice) or `js-yaml`; TOML by
      `smol-toml`; Markdown by `markdown-it` or `micromark`; file patterns by Node's own `path.matchesGlob`: kept, each
      as #486's inventory weighs it, and not tried here, since they read formats with one exact answer and change
      nothing of the foundations.
  - *How the core reaches a project.*
    - An exact copy under `core/`, pinned to one commit, as now: kept.
    - The same copy cut to what a project runs, with no tests: kept.
    - A git submodule: dropped on criterion 1; a checkout without its submodules holds an empty folder, so the rule
      files every session and every outside reviewer reads at its start are missing.
    - A git subtree: dropped on criterion 5; a copy that carries the core's history into each project.
    - A package in the project's own package manager: dropped on criterion 1 and on "Nothing locks a project"; a .NET
      or Python project has no npm, and an install would be the project's.
    - A release archive fetched by digest into an ignored folder at a session's start and in each check's job: kept.
    - The checks reached as the host's reusable workflows at a pinned commit, with no copy for them: kept, for the
      checks alone, since the rules must still be files in the repository.
    - One binary for each system, fetched by digest (Go, or JavaScript built into one by `bun build --compile` or
      Node's single executable, still "active development" in Node 26): dropped on criterion 4, a binary no one reads
      for each system and processor, and on 8 for Node's.
    - A container image: dropped on criterion 1; no container runs in a cloud session or on a Windows runner as a step.
    - An agent tool's plug-in: dropped on the third fixed constraint; it reaches one tool, and every tool reads the
      rules.
    - A template repository copied once: dropped on criterion 8; nothing reaches a project after its start.
    - The rules read from an address at a session's start: dropped on the floor (rule 4: text the project did not
      review) and on criterion 9.
- **The trial,** on what decides, each run in a scratch folder outside the repository, nothing of it committed.
  - *Start-up,* on Linux here, each the mean of 20 runs: Node (22.23.4; the pinned 26.13.0 is not on this machine)
    37 ms for nothing, Bun (1.4.4) 5, Python (3.13) 12, a Go (1.24) binary 3; a TypeScript file 65 ms on Node, the
    stripping about 28 ms of it, and 6 on Bun. The core's helper hook (`scripts/helper-call.mjs`) given a call: 76 ms
    on Node, 26 on Bun, and 104 on Node as TypeScript, past the 100 ms mark on Linux before Windows is reached. A Go
    binary that prints one line: 2.2 MB for Linux and 2.3 MB for Windows, one for each system and processor.
  - *The core's own tests, unchanged, under Node and Bun:* the 72 test files that fetch nothing and are not the long
    upgrade or staged ones. Node: 322 s, every case passed. Bun: 274 s, 15% less, with 3 cases failing in 2 files (a
    hostile test's "nothing was written outside the project", and two git cases of `reading-test.mjs`), and the file
    that starts the most processes (`check-test.mjs`) slower, 90 s against 80. Python and Go were not given a port of
    a script: what they save is what they start faster, about 25 and 34 ms a process; Python is on the host's runners
    and in the cloud session, not on the owner's computer unless installed, and its own library reads TOML but no
    YAML.
  - *Types, over every fixed bug* (#515, point 2): of the 44 closed issues labelled `bug`, the 33 whose fix changed a
    script that is no test, each on the tree just before its fix (30 trees), TypeScript's checker (6.0.2, with Node's
    types 26.6.6, `allowJs` and `checkJs`) in loose mode and with its checks of null. Findings at a line a fix changed:
    loose at 1 fix, null at 6; findings that point at the fault: none of 33 in either mode. None of the 33 bugs was of a
    kind a type check reaches: each was a rule, a text, a pattern, YAML, git's settings, a path or a platform (npm
    started on Windows, a bare repository, line endings, a link to a device). In `strict`, the tree before #422 gives
    7,332 findings, 4,951 of them a value with no declared type. Each tree took 4 to 17 s a mode.
  - *Reading other languages:* the numbers of the record below (#487) stand and were not run again: tree-sitter exact
    on held-out files in Rust and C#, the hand reader off by its definition on C# and absent on Rust, each language's
    tooling unable to run where the sessions work or to take the core's definition. Lizard 1.21.6 was fetched at that
    exact version, but this session's permission check refused to run its code, so its code was read: its definitions
    are fixed in it (in Rust a `match` counts once and not each arm, an error's `?` and a type's `where` count as
    branches, a closure is no function; in C# `??` counts and `when` does not), so it cannot count by the core's
    definition without a change to its own code. It reads Godot's language, which no grammar of a known publisher does.
  - *What a project carries:* the copy is 4.0 MB unpacked, of which the core's own tests are 1.6 MB, which no project
    runs; without them, 2.4 MB. The grammars the record below picks add 11.9 MB unpacked, 1.1 MB as git stores them.
- **The author's pick,** which the judge settles.
  1. *Language and runtime:* JavaScript on one pinned Node. Bun saves 15% of the tests' time on Linux and fails 3
     cases the core holds, is on no runner, and its gain is start-up, which a test that calls a check's function in its
     own process gains on any runtime. Go and Python start faster still, but Go puts a binary no one reads in each copy
     for each system (criterion 4) and a build step on each change (6), and Python is missing on the owner's computer
     (1) and reads no YAML of its own.
  2. *Types:* none, as now. Over 33 fixed bugs the checker pointed at no fault in any mode, and none of them was of the
     kind it reaches; `strict` asks about 5,000 annotations in the scripts that are no test. TypeScript run by Node adds
     about 28 ms to each start, which takes the helper hook past its mark. The gain at the moment of writing is not
     measured, and is the case for a checker.
  3. *Reading another's language or format:* tree-sitter, run as WebAssembly by Node, for every language's structure,
     and a small package for each format, each carried in the copy at one exact version and never fetched while a check
     runs, as the record below has it. Carried: a copy works offline and on Windows and is held byte for byte, at 1.1 MB
     as git stores the grammars.
  4. *How the core reaches a project:* the exact copy under `core/`, pinned, as now, but without the core's own tests,
     which no project runs: 1.6 MB of 4.0 left in the core, as its reports are. One copy for every project, not one cut
     to each project's stack, so one comparison proves it exact.
- The blind pick: a fresh session (Opus, at high), given the problem and the criteria alone, never this record:
  "(1) TypeScript run straight by Node.js, one pinned LTS line, no build step; (2) typed, with strict checking by `tsc`
  in the core's own CI only; (3) tree-sitter grammars compiled to WASM (`web-tree-sitter`) for source code, plus a few
  small pure-JS readers for the data formats, all carried inside the core at exact versions and never fetched while a
  check runs; (4) a pinned, reviewed snapshot committed into each project, cut down to that project's stacks." Its
  runners-up: Go (a build for each script and an unreadable binary for each system), Deno (on no runner), types in
  comments (agents write them less well), each language's compiler, readers by hand, a release fetched by digest (each
  fresh machine fetches it, and the rule files are missing until then), a submodule. Its open constraints: nothing
  installed in a project, kept; no network while a check runs, kept; one pinned runtime, kept as one long-term line
  with a least version; the size carried, cut to each project's stacks, tests and reports never carried. It took about
  15% of shipped JavaScript bugs to be caught by a checker (a study of 2017), "to test against" the core's own bugs, and
  named its pick wrong where fewer than about 5 of them a checker would catch, or where a hook's start as TypeScript
  passes 100 ms on Windows.

- Looked for: the challenger (a fresh session, Opus at high; this machine holds no second provider's tool, read from
  what is installed, so both that argue are fresh sessions of the one tool), searching the web before its case, named
  eight options the long list lacked:
  1. Microsoft's `@vscode/tree-sitter-wasm` (MIT; the runtime 0.25.10 and 16 grammars built as WebAssembly by one
     publisher, PowerShell among them), for criterion 4. Kept, as a source of the parser's grammars from one publisher,
     weighed against the tree-sitter organisation's own when the first grammar arrives; the parser is the same, so no
     trial of its own.
  2. Lezer (MIT; parsers in plain JavaScript for Python, Rust, Java, Go and C++), for code a person reads. Dropped on
     criterion 7: its maintainer keeps no C#.
  3. TypeScript 7 (stable in July 2026, about ten times faster, reading fewer JSDoc forms). Weighed with the types: its
     speed under criterion 3, its narrower JSDoc against types in comments; the trials ran on 6.0.2.
  4. A value's shape checked where a configuration or a format is read. Kept, as #486's inventory already holds it
     (its last group, schemas), and no foundation of its own.
  5. Python fetched by digest, as Node is. Taken: it puts Python level with Node on criterion 1, and the judge weighed
     the rest.
  6. Node's permission model, for a check that reads hostile input. Dropped as a foundation: a flag any Node check may
     take.
  7. Template updates by a three-way merge (Copier), against the drop of the template. Dropped on criterion 1 (Python
     and an install in the project) and on the exact copy a pure sync proves.
  8. The host's required workflows set by a ruleset, with no copy. Dropped on criterion 1: they need an organisation,
     and the projects stand under personal accounts.
  It found no runtime beyond the niche (LLRT, txiki.js), which fall on criteria 1 and 8.
- **The case against** (the same challenger):
  1. Criterion 1 is applied unevenly: Bun and Python can be fetched by digest as the pinned Node is, and the whole
     sweep passed on Node 22.23.4, not the pin, so the exact pin bought nothing the trial measured; one long-term line
     with a least version, as the blind pick has it, would use the Node most machines hold. Settled by the suites on the
     Node 22 and 24 the runners hold, on Linux and Windows.
  2. Bun's three failures are not Bun's: one test compares a folder's listing unsorted (Bun lists `x,tests`, Node
     `tests,x`), a latent fault in the core's test; two start the hook with Node's `--input-type=module -`. Granted to
     Node all the same: its long-term promises (8) and Windows, where `check-test.mjs` ran slower on Bun.
  3. The types trial measures the wrong thing: bugs that reached `main` are those that survived the tests and reviews,
     while a checker saves the faults found while writing (red runs, review findings within a pull request); a checker
     over code with no annotation has only `any` to go on, and typed strict code was never tried; and the 4,951
     annotations are a cost of moving, which this judgment leaves out. Settled by the checker on the heads of recent
     pull requests that failed a check or drew a review finding, counting findings at lines the same pull request then
     changed, and by 3 or 4 of the replayed faulty functions written fresh as strict typed code.
  4. The 100 ms mark argues against TypeScript in a hook's entry file only: types in comments cost nothing at run time,
     and a typed core may keep its hooks plain. Its own run: the hook 32 ms as JavaScript on Node 22 and 68 to 71 ms as
     TypeScript, about 37 ms of stripping; the 76 ms above was the hook fed through a shell pipe.
  5. How well agents write it (criterion 6) is what decides the blind pick, and it was never measured. Settled only by
     sessions writing the same check three ways, counting red runs before green: a few hours.
  6. Carrying grammars leaves out their cost over time: each update adds a binary, the C# one up to 5.4 MB, to every
     project's history for good; a copy cut to the project's stacks can be proven exact the same way, from the commit
     and the manifest. Settled by packing two versions of the C# grammar and measuring the growth.
  7. Conceded: JavaScript on Node, tree-sitter over readers by hand, carried over fetched, the formats by packages,
     the core's tests out of the copy, and the drops of the submodule, the container and the plug-in.
- **The answer:** the author grants 2 (the listing is sorted as a bug of its own, #522) and 4 (the
  mark binds a hook's entry file, not the core's types), and leaves 1, 3, 5 and 6 to the judge, with the cheap trials
  their case names.
- The judgment: a fresh session (Opus, at high) that wrote no part of the record, on the target alone, the cost of
  moving left out: "All four picks stand: JavaScript on Node, no type checker, tree-sitter and small format packages
  carried in the copy, and one exact copy under `core/` without the core's tests. On the pin I change one thing: the
  exact pin stays for the checks that decide a pull request, and the scripts also promise to run on a stated least
  long-term Node, tested in the core's CI. Sessions then use the machine's Node when it meets that least version."
  It settled objections by trial where one was cheap:
  1. *The pin* (objection 1, taken in part): the core's 73 test files on Node 24.22.1 all passed, as on 22.23.4, so the
     exact pin bought nothing the trials measured; it stays where a verdict must repeat (the host's runners, which read
     `.node-version`), and a session uses its machine's Node at or above a least version the core's CI tests, sparing a
     fetch of 30 to 40 MB on each fresh cloud machine (criteria 1 and 9).
  2. *Types* (objection 3, rejected on its trial): the checker in loose mode and with null checks on the tree before
     each of 134 commits, from the last 90 merged pull requests, that followed a review's finding or a failed check
     inside its pull request and changed 1,744 lines of scripts that are no test: 5 findings at a changed line in 2
     commits, and 51 in 20 with null checks, each read; none points at what the commit mended (each a pattern the
     checker cannot follow: `fail()` not known to exit, `[]` read as `never[]`, a `Buffer` given to `JSON.parse`, a
     property set by `Object.assign`, a null filtered out first). With the 33 fixed bugs and the ten scripts of the
     record below, three replays found no fault (criterion 2).
  3. *The 100 ms mark* (objection 4, overtaken): the helper hook 30 times on Node 22 took 36 ms as JavaScript and 77 as
     TypeScript; on Node 24, 38, and 82 cold and 38 with Node's compile cache. Start-up is no case against TypeScript
     on Node 24 and later with the cache; the case for no checker rests on the faults found alone.
  4. *The grammars' growth* (objection 6, rejected on its trial): the C# grammar 0.23.1 (5.9 MB) and 0.23.5 (5.35 MB)
     committed in turn into a scratch repository: 356 KB and 320 KB packed alone, 632 KB both, so an update adds about
     0.3 MB to a project's history. A copy cut to each project's stacks would hang the copy on the project's code, and
     a project that adds a language would go unread or red until it synced; one copy is proven exact by one comparison
     (criteria 2 and 8).
  Its verdicts on the open constraints: nothing installed in a project, kept; no network while a check runs, kept (a
  fetch fails on the owner's computer offline); the pin, exact in the host's checks with a least long-term line tested
  in the core's CI and used by sessions; the size, about 2.4 MB of scripts and 1.1 MB of grammars as git stores them,
  one copy for every stack. What it could not settle: Windows, where nothing here runs; the pinned Node 26.13.0, not on
  this machine; and objection 5, how well agents write each form, which the author then put to a trial and the judge
  read again:
  5. *How agents write each form* (objection 5, rejected on its trial): five tasks, each in three equal forms (plain
     JavaScript; types in comments checked strictly; strict TypeScript run by Node 24, the checker run before the
     tests), each writer a fresh session that saw only its folder and 5 or 6 public tests, scored on hidden ones. Three
     tasks written fresh (a Markdown table, 40 hidden cases; a `git diff` reader, 39; a configuration of time marks,
     39), one writer a form, Opus at high; two changes to a program of 7 modules (a failure's record reshaped across
     them, 38 hidden cases, 31 of them old behaviour; a configuration's list made a map with fields moved, 36, 26 old),
     two writers a form on Opus at high and two on Sonnet at high. A stale field left in one module, planted to test the
     tasks, passed the public tests in JavaScript, failed 2 to 5 hidden cases, and was caught by the checker in both
     typed forms. Of 33 sessions, none left a hidden case failing, in any form; one run in 33 was red for a fault in
     code, a parse error in JavaScript, which Node itself names. The typed forms ran 8 to 57% longer on the fresh tasks.
     The judge: "Nothing changes; all four picks stand as I judged them."
- **The second judgment, the path:** a fresh session (Opus, at high) that wrote no part of the record, given the
  target and #515's points 9 to 14 on moving code: "move, in five kinds of small pull request, none of them a
  rewrite." In order, each an ordinary pull request that leaves `main` working, each its own line in the queue on the
  owner's word, and the sync of each asking nothing of a project unless it says so:
  1. *A least long-term Node beside the pin* (Node 22 now, 24 once 22 ends in April 2027): `scripts/node.sh` keeps a
     machine's Node at or above it and fetches the pin otherwise, and the core's suites run on it too, on Linux on each
     pull request and on Windows on each push to `main`. About one session, and two security reviews, since the cloud
     setup runs it. Proved by the old and new `node.sh` on three machines (Node at the pin, below the least, none), and
     by the suites on both Nodes, which settles Windows.
  2. *The core's tests out of the copy,* in two pull requests a release apart: first the copy's comparison
     (`scripts/copy-tree.mjs`, `core.yml`) learns a folder `tests` that nothing yet leaves out; then
     `scripts/*-test.mjs` move to `tests/`, kept out of the copy by `.gitattributes`, every path that names them moved
     with them, and no script a project calls moved. About two sessions. A move by rule: every past release gives the
     same copy under the old and new comparison, every test runs the same cases with the same results, a check fails a
     test left behind, and its review reads the rule and a sample (#515, point 12).
  3. *How the core carries a package,* once #488's points 1, 3 and 4 have merged: one folder, a list of each package's
     version, digest and licence that a test reads, and its notices; the first the YAML package, for
     `scripts/yaml-keys.mjs`. About one and a half sessions, through every gate of #515's point 10, and proving that no
     check of a project reads the carried files as the project's own (copies, licences, size, personal terms).
  4. *The parser and one grammar, with the first new reader a queued line needs* (#426's .NET reader, or Rust's), the
     held-out hand count its proof; each further grammar arrives with its reader, never all seven at once. Its sync
     asks one step: the new check's list, written and failing nothing.
  5. *The readers by hand replaced one at a time,* most bugs first, at the dose: the YAML of `comment-only.mjs`, the
     reading under the licence checks, the shell readers, file patterns on `path.matchesGlob`, TOML; then the lexers of
     the shape check, Markdown and schemas last. About one session each, ten to twelve over several batches, each a
     port with its behaviour kept, old against new, its definition mended only after, in a pull request of its own.
  Not done: several readers in one pull request, a port that changes its definition, a path a project calls moved,
  the pin dropped, the copy cut by stack, anything fetched while a check runs, and anything of types. The count of the
  move (#515, point 11) is the inventory's stand-ins replaced. The bug the Bun run found, an unsorted folder listing in
  a test, is #522, fixed apart.
- **What a sync asks of a project:** nothing, by this record; each step of the path says what its own sync asks.
- **Step 2 came without the release between its two pull requests** (17 November 2026, #527), on the owner's order for
  this batch, which asked first whether the gap was needed. It was not: a project that skips a release takes both
  halves at once in any case, so the gap protected none that synced straight across it, and the upgrade test, a
  project from the starter kit of release-4 and one of release-5 each synced straight to the second pull request's
  commit, passed every check unchanged. A release cut between the two would have stopped the batch's queue for nothing.
- **Reopened on 18 November 2026 by the owner's decision (#654):** other publishers' code is registered, never
  carried, in a project too (point 9). It corrects what #601 brought in (Brought in by: #601; Correction: rule missing;
  #302). One sign here had tripped first: a carried file raised the core's own code scanning's alerts, on #605 (the
  parser's runtime), and its pull request waited a night on the owner; #637 was what was done about it, and once
  nothing is carried its points 1, 2 and 4 have nothing to act on and are not built. Whether that alone met the sign is
  moot, the owner having decided: what was not weighed when step 3 was argued is the registry's own lock file,
  installed at set-up, and what a lock file gives (#652): the host's alerts and update proposals read what the core
  depends on, and replacing a package is a change to the lock file. What stands: the path, its steps and their order,
  and no fetch while a check runs. What gives way: step 3's folder and its list; each package is an entry of
  `.packages/package-lock.json`, installed by the sync, at a session's start and in each job before a check
  (`scripts/install.mjs`), and held by the core's own licence check and lookup, which read that lock file. The signs
  above that read the carried files read the install instead: a package that turns a project's check red or raises its
  alerts, or an install that adds more than 30 s to a job; "a hook's start passes 100 ms" reads the hook's own work,
  not the install it makes once a checkout.
- Reopens it: the suites' verdicts differ between the least Node and the pin, on Linux or Windows (the least
  goes); a hook's start passes 100 ms on Windows; a carried file turns a project's check red or raises its code
  scanning's alerts; a port's comparison differs beyond its definition's mend (that reader stays); the replay of fixed
  bugs and fixes inside pull requests finds 5 or more faults the checker points at in code a project runs; the writing
  trial, on a lighter model, vaguer tasks or longer changes, shows types cutting hidden failures or real red runs by a
  third or more; the grammars add more than 1 MB a year to a project's history, or the files carried pass 20 MB; or the
  move's cost passes twice the estimates above, or no step of it merges for 30 days (#515, points 11 and 14).
