## Choice: a private project's code is scanned by Semgrep's engine, with the core's own rules

The record of #546, written and argued on 17 November 2026. The trial's samples, invented, its rules for each engine
and its commands are in the pull request that adds this record.

- **Criteria, before the options.**
  1. Finds what a scan must: input that reaches a shell command, `eval`, an SQL string or a file path, and unsafe
     deserialization, in JavaScript and TypeScript and in C#, the starter kit's two kinds, and in Python; on invented
     samples, every planted weakness found, and few false alarms on the safe look-alikes (a literal command, SQL with
     parameters, a constant held in a variable), few enough that a mend in the code clears each.
  2. Fetched by its digest from a registry the cloud's default network allows (npm, PyPI, NuGet), one exact version a
     week old, with no install script (floor rules 7 and 15), never while the check runs (#534, point 5): the default
     network refuses github.com.
  3. Runs wherever the checks run (a cloud session on Linux, x64 and arm64; the host's runners, Linux and Windows; the
     owner's own computer, Linux, Windows or macOS), with no toolchain of the language it reads, nothing installed in
     the project, and no network or report sent while it runs.
  4. Fast enough to be a step of a job that already runs, since it adds no billed job ("Nothing locks a project"): a
     project of 100,000 lines in under 30 seconds on 4 cores.
  5. Licence (floor rule 10): the engine and its rules under a licence the Open Source Initiative approves, with no
     Commons Clause or other source-available terms; no account and no key.
  6. Trust and upkeep: a known publisher, a release in the last 90 days, and as few packages as can be, each looked up
     as #488 asks.
  7. What leaving costs: how much of the check a move to another tool would rewrite.
  8. How well agents work in it: a documented rule format, output a script reads with file and line, and a mark in
     the code that accepts a finding with its reason.
- **The long list,** searched on the web and in the registries on 17 November 2026, each kept or dropped:
  - Opengrep (LGPL-2.1, Semgrep's engine forked): dropped, a fact against 2: its program is published as GitHub
    release assets only; PyPI has no package of the name, and npm's `opengrep` is a 1.0.0 placeholder with no
    licence and no program. Its rules (`opengrep-rules`) carry the Commons Clause on top of LGPL-2.1, against 5.
  - Semgrep Community Edition (LGPL-2.1, on PyPI): **kept.** Its maintained rules are under the "Semgrep Rules License
    v1.0", source-available, against 5 (a fact), so the rules would be the core's own.
  - ast-grep (MIT, on npm, a binary for each system in a package of its own): **kept.** Its one security rule set,
    CodeRabbit's `ast-grep-essentials` (Apache-2.0), was archived in September 2026, against 6 (a fact), so the rules
    would be the core's own.
  - The host's CodeQL command line: dropped, a fact against 5: its terms allow it on open-source code alone, not a
    private repository's.
  - Bearer CLI: dropped, a fact against 5: the Elastic License 2.0.
  - Snyk Code, SonarCloud, DeepSource, Codacy, Aikido: dropped, a fact: hosted services (#534, point 6).
  - SonarQube's community build: dropped, a fact against 3: it needs a server running.
  - Bandit (Apache-2.0, PyPI), `eslint-plugin-security` (Apache-2.0, npm), njsscan (LGPL-3.0, PyPI), Security Code
    Scan and Roslyn's analyzers (.NET): dropped, a fact against 1 and 3: each reads one language, an ESLint plug-in
    is installed in the project, and the .NET ones need the .NET SDK, which the sessions' machine lacks.
  - gosec, Brakeman, SpotBugs with Find Security Bugs, cargo's audits: dropped, a fact against 1: other languages,
    or the dependencies rather than the code.
  - Trivy, OSV-Scanner, Grype: dropped, a fact against 1: they read dependencies, settings and secrets, not the
    code's own flows (the core's licence and lookup checks and gitleaks cover those).
  - Joern (Apache-2.0): dropped, a fact against 2 and 3: GitHub releases only, and a Java runtime needed.
  - Infer: dropped, a fact against 3: it builds the code first, on Linux and macOS alone.
  - Horusec: dropped, a fact against 6: archived.
  - Graudit (GPL-3.0, patterns for grep): dropped, a fact against 2 and 3: GitHub only, and Bash.
  - Microsoft's DevSkim (MIT, a .NET tool on NuGet): dropped, a fact against 3: it needs the .NET runtime, which the
    sessions' machine lacks.
  - No program: **kept**, the plain option, as the issue allows: the record says why none fits, and a private
    project keeps the reviews alone.
- **The options**, each with what would make it the wrong pick.
  - **A. Semgrep CE**, `semgrep` 1.185.0 from PyPI, its rules the core's own, run as
    `semgrep scan --metrics=off --config <the core's rules>`. Wrong where its fetch or its speed cannot fit a step of
    a job that runs, or a machine has no Python 3.10 or later.
  - **B. ast-grep**, `@ast-grep/cli-<system>` 0.51 from npm (the binary's package alone, never the wrapper's, whose
    install script picks it), its rules the core's own, run as `ast-grep scan -c <the core's config> --json`. Wrong
    where matching shapes without following data raises more false alarms than a mend in the code clears.
  - **C. No program,** CodeQL on a public project as now, and the reviews alone on a private one. Wrong where either
    tool finds what the reviews miss at a cost a project can carry.
- **The trial, on the hardest part,** run on the packages themselves, each at one exact version, fetched with install
  scripts off into a scratch folder outside the repository, nothing of them committed. Three invented files, one each
  in JavaScript, C# and Python, hold 15 planted weaknesses (5 a language: a command built from input, directly and
  through a variable; `eval`; SQL by concatenation or formatting, once through a variable in C#; a path joined from
  input; `BinaryFormatter` and `pickle`) and 12 safe look-alikes (a literal command, `execFile` with its arguments,
  SQL with parameters, a constant command or query held in a variable, `ast.literal_eval`, "eval(" in a string and a
  comment). The same rules, 12 of them, were written once for each engine, each by its documented format.
  - A: 15 of 15 found, no false alarm, its rules in taint mode following data from a request or a parameter to the
    call. Fetched: the wheel (72 MB) and 67 packages it brings, 372 MB installed, in 70 seconds; Python 3.10 or later
    needed on the machine; wheels for Linux (x64 and arm64), Windows x64 and macOS on arm64, none for macOS on Intel.
    Speed: 1.5 seconds on the three files; 63 seconds on 104,000 lines (the files copied 2,000 times) on 4 cores.
  - B: 15 of 15 found, 3 false alarms: each a constant command or query held in a variable, one a language, which a
    match of shapes cannot tell from input; one rule had to be written twice before the C# literal was read as one.
    Fetched: one package of 9 MB, a binary of 57 MB, in 1.4 seconds, with nothing else; a package for Linux (x64 and
    arm64, glibc and musl), Windows (x64, arm64 and x86) and macOS (x64 and arm64). Speed: 0.01 seconds on the three
    files; 1.1 seconds on 104,000 lines.
  - C: none found by a check: what the reviews would find was not tried.
  - What was not tried: either engine on Windows or macOS; rules beyond the 12 the trial wrote; real code of a
    project's. Semgrep's engine without its Python wrapper was tried by the blind pick, the challenger and the judge
    (below).
- **Popularity, for what it buys:** both engines are documented at length and released weekly or so (Semgrep 1.185.0
  on 10 November, ast-grep 0.51.3 on 16 November), and agents write both formats from their documentation; neither
  brings a maintained rule set the floor allows, so the rules are the core's whichever is picked.
- **The writer's pick: B, ast-grep.** A finds more exactly, by following data, but its fetch is a Python environment
  of 68 packages, each one to pin and look up, on a machine that must hold Python, with no package for an Intel Mac,
  and a whole project takes it twice the time criterion 4 allows. B is one binary with nothing brought, on every
  system named, at a hundredth of the time, and its false alarms are of one kind, a constant held in a variable, which
  the mend clears by writing the constant in place or marking the line with its reason. A pull request's scan reads
  only the files it changes, where A's time fits too; so what decides is the fetch, the systems and the packages.
- **The case against** (a fresh session, on Opus at high, given this record and the trial's files):
  1. Each engine was scored on the samples its rules were written for. The trial's rules, unchanged, on new samples it
     wrote (15 planted, 12 look-alikes, in JavaScript, TypeScript, C# and Python): A 15 of 15 with no false alarm; B 4
     of 15 with 4 false alarms, missing every TypeScript and Python case (SQL in an f-string, `shell=True` with
     another argument, SQL through a variable, `os.system(f"...")`), JavaScript SQL through a variable, a path from
     `req.params` and a C# command through a variable.
  2. TypeScript, which criterion 1 names, was never tried: a rule of B's for `javascript` never reads a `.ts` file,
     so each needs a copy for TypeScript and one for TSX; one rule of A's covers both.
  3. B's false alarms are not of one kind: a literal path, two literals joined and a constant at a module's top were
     flagged too; widening the shapes to catch the misses adds false alarms, and "write the constant in place" makes
     code worse to suit the tool.
  4. A's fetch was weighed by its wrapper, not its engine: the wheel's `semgrep-core`, unzipped (72 MB fetched in 2.9
     seconds), ran with no Python and none of the 67 packages, and found what the wrapper found. A's real costs: a
     binary of 267 MB, no build for an Intel Mac, and the engine run without its documented command.
  5. The time was the wrapper's default of 3 jobs; the engine alone with 4 took 31.7 seconds on the 104,000 lines,
     6% over the mark, and a pull request's changed files fit.
  6. Upkeep and leaving favour A: ast-grep is at 0.x with one maintainer on npm and its format is read by nothing
     else, where Semgrep's is read by Opengrep too; B needed 14 rules for the trial's 12 before any copy for
     TypeScript.
  7. An Intel Mac is B's one advantage left, and only if the owner's computer is one; a step that says it did not run
     there costs less than a scan that misses 11 of 15.
  8. Mixing was not weighed: Ruff (MIT, one binary on PyPI) carries Bandit's maintained rules for Python beside A for
     the rest, so the core writes fewer.
- **The answer.**
  1. to 3. Taken, and checked: the trial's rules, run again by the writer on the new samples, gave A 15 findings, each
     a planted case, and B 8, none in TypeScript. A shape is not a flow: B finds what its rule's shape names and
     nothing a variable or a format string carries, and the misses are the cases that matter.
  4. Taken: the case against A rested on the wrapper. The engine alone needs no Python and brings no package; the
     command it is run by is the build's to settle, the documented `semgrep` where Python is at hand being the other
     way, by a trial on each system the check runs on before the first project takes it.
  5. Taken: a pull request's scan reads the files it changes, and the whole project is read where a scheduled look
     asks it, where 32 seconds costs nothing billed.
  6. Taken. 7. Taken: a system with no build says the scan did not run there and decides nothing (#534, point 5).
  8. Dropped against 7 and 2, a fact: a second tool is a second fetch, digest, format and update, for Python, which
     neither starter kit's kind is; a Python project of the owner's reopens it.
- **The writer's pick, changed: A, Semgrep's engine.**
- **The blind pick:** A, Semgrep CE, with rules the core writes (a fresh session, on Opus at high, given the problem
  and the criteria alone). Its reasons: taint rules it wrote flagged every planted case in JavaScript and C# and none
  of the literal, constant or parameterised look-alikes; the wheel never runs an install script; the wheel's
  `semgrep-core`, linked as `osemgrep` and run as `scan --experimental --metrics=off --disable-version-check`, ran
  with no Python on Linux x64; 140,800 lines took 18 seconds on 4 cores with 2 rules; the same rules run on
  Opengrep, so leaving is cheap; a finding is accepted with `nosemgrep`. Wrong, it says, where the mode without
  Python, marked experimental, fails on a system (none for Windows on arm64 or an Intel Mac), where a set of about 40
  rules passes 30 seconds, where taint must cross files (the paid engine's), or where its publisher moves more of the
  engine to paid terms, as it did its rules in December 2024. ast-grep was its second, dropped for matching shapes
  alone.
- **Looked for:** the challenger searched npm and PyPI and the web and named five the list lacked. Semgrep's engine
  alone, from the wheel: taken into A (the answer, 4). Ruff (MIT, one binary on PyPI, Bandit's rules for Python):
  dropped against 7, as the answer's 8 says. Biome and oxlint (MIT and Apache-2.0, binaries on npm): dropped, a fact
  against 1: JavaScript and TypeScript alone, with few rules on these weaknesses. GritQL's command line
  (`@getgrit/cli`, MIT): dropped, a fact against 2 and 6: an install script, and no release since March 2025.
  tree-sitter's command line with queries: dropped, a fact against 2: its install script fetches from GitHub. It
  named Datadog's static analyzer and Comby as not on npm or PyPI, from memory, unchecked, and Comby as matching
  shapes as B does: dropped against 2, an assumption, and against 1 with B.
- **The judgment:** the pick stands, A, Semgrep's engine with rules the core writes and keeps (a fresh session, on
  Opus at high, that wrote no part of the record), on a trial it ran rather than the arguments: the 1.185.0 wheel's
  `semgrep-core` and its folder of 26 libraries (272 MB), run with no Python as `osemgrep scan --experimental
  --metrics=off --disable-version-check`, found 30 of the 30 planted cases of both sample sets with the trial's 12
  rules unchanged, TypeScript and Python's f-string included, and no false alarm; 22.7 seconds on the 104,000 lines
  with 4 jobs; the same with the network cut off; and `nosemgrep: <id> -- <reason>` cleared its finding. The engine
  alone answers the fetch that made the writer first pick B, and B's misses rule it out by criterion 1. The mode
  without Python is marked experimental, so the check's test runs these samples against each pinned version and an
  update that misses fails it; where a runner holds Python, the documented `semgrep` is the way back. A system with no
  build (an Intel Mac, Windows on arm64) says the scan did not run there and decides nothing. The paid-terms risk is
  bounded: the rules are the core's, and Opengrep reads them, so leaving is a new fetch, not new rules. That the rules
  are the core's to write is so of every option and decides nothing. One trial is owed, which no machine here could
  run: the same samples, the engine alone, on the host's Windows x64 and macOS arm64 runners, before the first project
  takes the check; where it fails there, those runners take the documented command, and the pick stands.
- **The pick: A, Semgrep's engine, its rules the core's own.** It alone found every planted case on samples its rules
  were not written for. The build (#546) takes the engine and its libraries from the PyPI wheel of one exact version a
  week old, by the wheel's SHA-256 in the core's list, unzipped outside the repository at set-up (a cloud session's
  set-up, and a set-up step of the job a private project already runs), never while the check runs; the check reads a
  pull request's changed files with the core's rules, each rule with a planted and a safe sample in its test, and treats
  a finding as floor rule 9 treats CodeQL's (`floor/topics/weaknesses.md`): one the pull request brings, which its base
  did not hold, fails until the code is mended or the description lists it as a false alarm for its security review to
  confirm, and what stood before is reported. Built in `scripts/code-scan.mjs`; the trial owed above passed on the
  host's Windows x64 and macOS arm64 runners, 30 of 30 found and no false alarm on each. No package comes in but through
  #488's lookup, and the trial owed above runs first.
- **What a sync asks of a project:** for this record, nothing; the build says what its sync asks.
- Reopens it: a Semgrep release whose engine is not under a licence the Open Source Initiative approves, or that drops
  the engine's mode without Python or the build for a system the check runs on; the samples' test failing after an
  update of the engine; a whole scan with the core's rules taking more than 30 seconds on 100,000 lines on 4 cores;
  no Semgrep release for 90 days; Opengrep publishing its engine on npm or PyPI under LGPL with no Commons Clause; or
  a project of the owner's in Python, or the owner's computer an Intel Mac.
- **Reopened on 18 November 2026 by the owner's decision (#654):** other publishers' code is registered, never
  carried, and the fetchers written by hand give way where a registry's lock file does their job, this engine's named.
  The engine now comes from `.packages/requirements.txt`, PyPI's own lock form, each wheel by its SHA-256, which
  `scripts/install.mjs pypi` installs with pip in the scan's own step, no dependency taken and none of its code run;
  the scan runs it from there, still with no Python. The fetch written for it, its unzip and the digests of the engine
  go, and Dependabot proposes its updates. Python 3.10 or later is now needed where the engine is installed, which every
  host's runner holds; the pick stands.
