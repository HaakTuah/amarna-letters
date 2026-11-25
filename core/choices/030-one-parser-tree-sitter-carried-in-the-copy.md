## Choice: one parser, tree-sitter, carried in the copy, reads every language's structure

The record of #486, points 2, 9 and 10, written and argued on 16 November 2026. The trial's samples, invented, its
counter and its commands are in the pull request that adds this record (#487).

- **Criteria, before the options.**
  1. Exact counts: functions, their lines and their branching as the shape check defines them, matching a count taken
     by hand on code written to trip a reader (a brace in a string, a comment or a character; a raw string; a
     lifetime; a closure; a guard; a switch expression), in Rust and in C#, on code the definition was not written
     against too.
  2. A new language costs hours, not days: each check written once, and a few lines for each language. Today each
     language takes a lexer of its own (`scripts/shape-csharp.mjs`, 318 lines; `scripts/shape-python.mjs`, 388).
  3. Runs wherever the checks run (a cloud session, Actions, the owner's computer, Linux and Windows) with nothing
     installed in a project and no toolchain of the language read: the core's checks read a .NET project's code where
     no .NET is installed.
  4. Fast enough to read a project whole on each pull request: 100,000 lines in under 5 seconds.
  5. Trust and upkeep (floor rules 7, 10 and 15): one exact version, a known publisher, its source checked on each
     update, a licence free to use; what no one reviews by reading kept as small and as few as can be.
  6. What leaving costs: how much of the checks a move away, or an update the grammars cannot follow, would rewrite.
  7. How well agents work in it: what a builder must know to add a language or a measure.
- **The options**, each with what would make it the wrong pick.
  - **A. Readers written by hand for each language and check, as now.** Wrong where a language's lexer keeps
    misreading, or each language costs days.
  - **B. One parser for many languages, tree-sitter** (MIT; the tree-sitter organisation's runtime, with provenance,
    and its grammars, signed, on npm): `web-tree-sitter` 0.27.2 (a JavaScript file of 155 KB and a WebAssembly file of
    211 KB), and one WebAssembly grammar for each language (Rust 1.1 MB, C# 5.4 MB), run by Node's own WebAssembly.
    Wrong where a grammar misparses common code, or its files cannot pass floor rule 7's check.
  - **C. Each language's own tooling** (Rust's compiler and Clippy, C#'s Roslyn, Python's own `ast`), run where it is
    installed. Wrong where the toolchain is missing where the checks run, or its measures cannot be set to the core's.
- **The trial, on the hardest part,** run on the packages themselves (`web-tree-sitter` 0.27.2, `tree-sitter-rust`
  0.24.0 and `tree-sitter-c-sharp` 0.23.5 from the npm registry, and the Python, JavaScript, TypeScript and Bash
  grammars for their sizes), each at one exact version, fetched with install scripts off into a scratch folder outside
  the repository, nothing of them committed: the trial is not their arrival, which waits on #488 as the pick says. A
  Rust file of 87 lines and a C# file of 104, invented to trip a reader, counted by hand: Rust 11 functions, 72 lines, 19 branches; C# 10, 86 and 25. Then, held out, a Rust file of 197 lines and a
  C# file of 210, written and counted by hand by a fresh session that never saw the counter, the counter's definition
  frozen first: Rust 19, 162 and 34; C# 19, 164 and 42 (its `do … while` read as one loop, where the hand count had
  two).
  - A: on C#, the core's reader found every function in both files; its lines came to 77 and 149, since it counts
    from the opening brace (a definition, not a misread), and its branches to 23 and 39, since it counts no `when`,
    and once counted a `??=`.
    No bug filed here names a language reader. On Rust there is no reader; one would need its own lexer (a lifetime
    that looks like a character, a raw string, a `||` that opens a closure and is no "or"), not timed.
  - B: the first files exact in every function. Held out, Rust exact in every function, first time; C# counted one
    method written with `=>` alone as a function, a fault in the counter's definition (it asked no block body of a
    method), and with that one line mended, exact in every function, the first files still exact. The definition is
    about ten lines a language, written against the node types the grammar lists; no file had a parse error. It
    loads in 30 ms and parses 87,000 lines of Rust in 0.66 s, where the core's C# reader takes 0.69 s for 104,000
    lines of C#.
  - C: Clippy, its limits at 0, reported 13 functions in the first Rust file (every closure, `|| true` too), lines of
    the body without braces or blank lines, and cognitive complexity in place of branches, none of which it lets the
    core define; it compiled the crate first. Roslyn needs the .NET SDK, which the machine the sessions work on lacks:
    C# could not be counted there at all.
- **Popularity, for what it buys:** the tree-sitter organisation keeps the grammars of Rust, C#, Python, JavaScript,
  TypeScript and Bash, so the next language a project picks likely has one kept by the same publisher. Godot's own
  language has only an outside author's grammar, whose upkeep is unknown.
- **The case against** (a fresh session, on Opus at high, given this record before the held-out trial):
  1. "Exact" was scored on the files the definition was fitted to, the speed on one file repeated, and the sign counts
     parse errors, not miscounts.
  2. A is underrated: on C# it missed only the `when` guards, a few lines to add; no bug names a language reader; a
     Rust lexer's cost was guessed, not timed.
  3. Floor rule 7 asks for the diff read against the release notes, and the WebAssembly, built from a generated parser
     of 29 MB that no one reads, cannot be; the grammars have no provenance.
  4. Fetching against carrying was never argued, though #486 asks it settled here and the session leaned to carrying;
     a fetch that cannot run leaves the rule unheld on Windows or offline, and each grammar's package holds native
     builds and an install script.
  5. Leaving costs are left out: the grammars name older runtimes than 0.27.2, an update may strand one, and the move
     itself costs a fetch script, Windows, and new baseline entries where the counts move.
- **The answer.**
  1. Taken: the held-out trial above, by a session that never saw the counter, found one fault in the definition and
     none in the parser; "Reopens it:" now names a miscount on held-out or real code.
  2. Granted on C#, where the hand reader works. What decides is the next language and #486, point 6, to which the
     owner agreed after the case was written: a language someone else defines is read by a package, not by hand.
  3. A grammar's update passes floor rule 7 as written: the same publisher and repository, the registry's signature
     verified, and the diff of what can be read (the grammar, its node types, its tests) read against the release
     notes, the WebAssembly named as what they do not explain, as the rule asks of anything so. The pinned Node of
     `scripts/node.sh` passes it the same way. Provenance is asked only where the old version had it.
  4. Taken, and the pick changed to carrying: the runtime and all seven grammars the core would read (Rust, C#,
     Python, JavaScript, TypeScript, TSX, Bash) come to 11.9 MB, and 1.1 MB compressed, as git stores them; so a copy carries them
     all at little cost, works offline and on Windows, and is held byte for byte by the copy check
     (`.github/workflows/core.yml`), with no fetch to fail. Only the `.wasm` and the runtime's file are taken from a
     package, never its native builds, and no install script runs.
  5. Taken into the sign: runtime 0.27.2 loaded both grammars, built for older ones, but an update that strands one
     reopens the record. The baseline entries are what "Nothing locks a project" asks of any new reading.
- **The pick: B, carried in the copy.** It alone met criteria 1 and 3 together, with a definition of about ten lines
  for each language. The runtime and each grammar the core reads stand in the core at one exact version, their SHA-256
  in one list a test reads, each update passing floor rule 7's check of its source in its own pull request, and their
  MIT notices kept in the core's third-party notices (floor rule 10), the test that reads the list reading each
  file's licence too. The
  readers by hand that work (JavaScript, C#, Python) stay until the parser replaces each, a line each; Rust's reader
  is the first built this way, and #426's .NET readers the next. No package comes into the core, the parser first,
  until #488's points 1, 3 and 4 (how a package is looked up, the week's wait in the package manager, the registry
  as the only source) have merged: this record picks the way, and #488 is the gate for its arrival.
- **What a sync asks of a project:** for this record, nothing. The line that builds the first reader the picked way
  says what its sync asks; by this record, no install, no host to reach, and a reader's new findings listed in the
  check's baseline, as any new reading is ("Nothing locks a project").
- **Reopened on 18 November 2026 by the owner's decision (#654):** other publishers' code is registered, never
  carried. What was not weighed: the registry's own lock file, installed at set-up (#652). What stands: tree-sitter as
  the parser, its runtime and each grammar at one exact version, and no fetch while a check runs. What gives way:
  "carried in the copy": the runtime and each grammar are entries of the core's `.packages/package-lock.json`, installed
  as every package is (`scripts/install.mjs`), their integrity the registry's, their licences read by the core's licence
  check from the lock file; the list of SHA-256 and the carried notices go with the folder. The sign "the files carried
  pass 20 MB" reads the installed packages instead.
- **What is written by hand today** (#486, point 10). Counted on 16 November 2026: each stand-in's lines, and the
  issues labelled `bug` that name its script (of the 50 so labelled). In the order of what each is worth, each
  replaced by itself, with a trial of its own, at the dose, as cleaning is (`tasks/cleaning.md`), and each that brings
  a package only once #488's gate stands:
  1. **What Node itself brings** (point 11): none of the 76 tests uses `node:test` or `node:assert`, and none of the
     51 scripts that read their arguments uses `util.parseArgs`. Replace each where its file is next changed; no
     package is needed.
  2. **YAML, TOML, shell commands and the host's workflows:**
     - `scripts/yaml-keys.mjs` (155 lines, no bug), the key read twice that every project's workflow check fails:
       replace with a YAML package carried in the copy, one that reports a key given twice;
     - `scripts/workflow-run.mjs` (395 lines, no bug), which reads the host's workflow format, its expressions and
       its steps for the core's upgrade test alone: replace its YAML (`parseYaml`, `scalar` and the block scalars'
       `block`, about 80 lines) with a package in the core's tests alone, and
       keep its runner until a trial shows a tool that only runs can run the upgrade test where the sessions work;
     - the YAML of `scripts/comment-only.mjs` (`readYaml` and `node`, 135 of its 294 lines, 3 bugs naming the
       script), which proves a change to what runs by itself is only comments: replace with the YAML package carried
       in the copy, once its trial shows it keeps each comment's place;
     - the readers of shell commands: in `scripts/check-configs.mjs` (661 lines in all, no bug), and the commands of
       npm scripts and files in `scripts/licence-commands.mjs` (432 lines, no bug): replace their Bash with the
       parser's Bash grammar (1.4 MB, the tree-sitter organisation's); keep the PowerShell until a grammar of a known
       publisher exists;
     - the matching of file patterns, written three times (`check-configs.mjs`, `workflow-run.mjs`, `select.mjs`,
       about 70 lines together, no bug): replace with one, on Node's own `path.matchesGlob` where its tests show it
       matches the host's filters;
     - the reader of TOML (`scripts/toml.mjs`, 193 lines, coming with #476, which reads Codex's own settings in a
       project): replace with a TOML package carried in the copy, one that refuses a key given twice as the tool does;
     - the host's workflow check (`scripts/workflows.mjs`, 119 lines, 1 bug): keep its search for a word, which reads
       no YAML on purpose; its keys given twice go with `yaml-keys.mjs`.
  3. **The readers of languages:** the lexer of `scripts/code-shape.mjs` (in 881 lines), `scripts/shape-csharp.mjs`
     (318) and `scripts/shape-python.mjs` (388), no bug: replace with the parser. Rust's reader is no replacement,
     and is built the picked way first, as is any reader of a language not read yet.
  4. **Cargo's own tool, once a project picks Rust:** the package checks planned for Cargo (#278): use `cargo
     metadata`, a tool that only runs, where Cargo is installed.
  5. **Markdown in a project's documents:** the pointer check (`scripts/pointers.mjs`, 237 lines, no bug), where it
     reads a project's own documents: replace that reading with a Markdown package carried in the copy, where its
     trial shows it reads every pointer form the check lists.
  6. **Schemas for the settings,** last: the checks written by hand of the shape of the settings files
     (`.github/shape.json`, `.github/copies.json`, the licence check's config, `scripts/labels.json`,
     `scripts/holders.json`), spread through the scripts that read them and counted apart only when taken: replace
     with a schema each and one checker of schemas, a tool that only runs where its trial shows it says the mend.
  - **Weighed like the rest:** the licence checks for npm and NuGet (`scripts/licences.mjs`, 545 lines, 4 bugs;
    `scripts/nuget.mjs`, 928, 7; `scripts/licence-scan.mjs`, 239, 1; `scripts/licence-installed.mjs`, 179, 1;
    `scripts/licence-commands.mjs`, 432, none, its shell commands taken with the second group): replace the reading
    underneath (the lock files, how a licence is written out, and the HTML of `scripts/licence-scan.mjs`'s
    `executable` and `attributesOf`, 52 lines that read a page's script tags and their attributes) with packages or
    each system's own tool, each by a trial, and keep the policy on top (the floor's
    list, the owner's yes, the week's wait, the same publisher, failures that say the mend) the core's own. With 12
    bugs between them, the most of any stand-in, they go with the second group.
  - **Kept:** the finding of copies (`scripts/copies.mjs`, 314 lines, 9 bugs), since what a copy is the core's own
    rule defines; its reading of code goes through the parser once the readers of languages do. Left as they are: the
    readers of the core's own rule files. The core's own mutation tool stood here until 17 November 2026, when #534
    widened this inventory to every part of the core, the mutation tool and the finding of copies weighed again among
    them, in `INVENTORY.md`; the lines above stay the word on the readers inside the checks.
- Judged again on 17 November 2026 (#519): it stands, carried and never fetched while a check runs. A grammar comes
  with the reader that needs it, never all at once, and Microsoft's `@vscode/tree-sitter-wasm` (one publisher's runtime
  and grammars) is weighed as their source when the first arrives (the path's third and fourth steps).
- **The first grammar arrived** on 17 November 2026 (#529), with the reader that needs it: C#'s, the queued .NET
  lines' language and one the owner's projects use, where Rust is a language no project has picked yet (#486, "What
  stays out"). Its first reader is the port of the shape check's functions of C# onto it (`scripts/csharp-functions.mjs`),
  the first of #530's ports, its definition kept: on 5,516 files of C# from a public NuGet package (560 distinct, 2,361
  functions), the parser read every function the lexer did the same, but where the lexer misread by its own
  definition (C# 14's `extension(...)` blocks taken for functions, 228; a method with two `where` clauses missed, 1),
  and a held-out file a fresh session wrote and counted by hand from the frozen definition, 22 functions, came out
  exact in every function. The grammar predates C# 14's extension blocks, whose headers the reader reads as a type's;
  both sides of an `#if` are read as code, as the lexer read them; a file it still cannot read whole (C#'s
  null-conditional assignment, newer than it; 1 of the 560 files) has no functions told and is counted, as the sign
  below reads it. Its source, weighed as the judgment asked: the
  tree-sitter organisation's own packages, `web-tree-sitter` 0.27.2 (with provenance) and `tree-sitter-c-sharp`
  0.23.5, taken; Microsoft's `@vscode/tree-sitter-wasm` 0.3.1, dropped on fact: its runtime is the older 0.25, it names
  the source version of none of its grammars (its `cgmanifest.json` names only the runtime's), so floor rule 7's
  reading of a diff against the release notes has nothing to read against, it has no provenance, and its C# grammar
  reads C# 14's extension blocks no better. Registered, as the owner decided on 18 November 2026 (#654): both in the
  parser's own lock file (`.packages/parser/`, #719) at one exact version, installed from the registry into
  `.packages/parser/node_modules/`, only where a job names it, with no script run, the runtime's CommonJS build and WebAssembly (378 KB) and the grammar's WebAssembly (5.4 MB) read from there;
  the grammar's package brings two more, `node-addon-api` and `node-gyp-build` (MIT), which only its native build,
  never run, uses. Nothing of them is in the repository's history. The using directives, namespaces, types, tokens
  and comments of C# moved onto it on 19 November 2026 (#530's item 6), and the lexer of C# went: on 6,626 files of C#
  from ten public repositories, every file read the same 18,934 using directives, and what differs elsewhere is the
  lexer's misreads mended (a verbatim string that opens with escaped quotes, `@"""x"""`, taken for a raw string and
  swallowing the code after it, in 10 files' functions; `where T : class` before an `in` read as a type named `in`).
  Where the grammar cannot read a file whole, the declarations in the part it lost go unread, as its functions do (7 of
  the 6,626 files, which lose types, 1 a namespace too), where the lexer misread 17 others; keeping a walk of tokens
  for such files alone was weighed and dropped. Where the parser is not installed, nothing of a file of C# is read, as
  of Python below.
- **JavaScript's and TypeScript's grammars arrived** on 19 November 2026 (#530's item 6, #723), with the port of the
  shape check's functions of JavaScript and TypeScript, JSX among them, onto them (`scripts/javascript-functions.mjs`),
  its definition kept: `tree-sitter-javascript` 0.25.0 and `tree-sitter-typescript` 0.23.2 (TypeScript's grammar and
  TSX's), the tree-sitter organisation's, MIT, in the parser's lock. On the core's 204 files, 200 read the same and the
  4 others are the lexer's misreads mended (a regular expression in a template literal that lost 17 functions after it;
  a choice's `:` taken for a key's or a return type's, 3); every case of the lexer's tests reads as written, but JSX
  whose text holds a bare `}`, which JSX refuses. The imports, a script's names and the mutation tool stay on the lexer,
  since they run where the parser is not installed. Neither grammar has had a release in the last year (JavaScript's
  last on 1 September 2025, TypeScript's on 11 November 2024), and TypeScript's predates `export type *` and a type's
  parameter marked `in` or `out`: an error of the grammar that is words alone leaves the functions around it told.
- **Python's grammar arrived** on 19 November 2026 (#530's item 6), with the port of the shape check's functions of
  Python onto it (`scripts/python-functions.mjs`), its definition kept: `tree-sitter-python` 0.25.0 (11 September 2025),
  the tree-sitter organisation's, MIT, in the parser's lock. On 30,902 files of Python (the standard library of 3.11 to
  3.14 and the packages installed beside it), 30,853 read the same; 42 differ, each a misread of the lexer's mended (an
  and, or or if after `...`, taken for a name's dots; `case` used as a name at a line's start, counted as a branch);
  every case of the lexer's tests reads as written. 6 generated files past 2 MB are not read, and the grammar takes a
  format's fill of `=` (`f"{t:=^80}"`) for `:=`: an error in an f-string's `{ }` that is signs alone leaves the
  functions around it told. The imports and the tokens the clock's runs are read from moved the same day (#530's item
  6), and the lexer of Python went: on 30,811 files of Python, every file read the same 180,814 imports, with where each
  stands (in a def, under `TYPE_CHECKING`), and the same runs of the clock and of a test's reach; the tokens of 173
  differ, each a misread of the lexer's mended (a number's exponent split from it, 165; a hole after `\` in a raw
  f-string taken for text, 6; a t-string's `t` taken for a name, 2), and the grammar's fill of `=` is mended to the
  code before it, as the lexer read it. Where the parser is not installed, nothing of a file of Python is read: the shape check keeps what its
  baseline lists there, and the selection of tests runs a test of Python as one that reaches every file. 6 generated
  files past 2 MB have no imports told, where the lexer read theirs.
- Reopens it: the counts of a reader built this way differ from a count by hand on code it was not written against,
  or from real code of a project's, beyond a mend of its definition; a grammar a project of the owner's needs is
  missing, or fails to parse more than 1 file in 100 of that project's code; a runtime update leaves a grammar the
  core reads unable to load; an update cannot pass floor rule 7's check; or the files carried pass 20 MB.
