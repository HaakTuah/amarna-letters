- `scripts/shape.mjs`, `scripts/code-shape.mjs`, `scripts/code-shape-lexer.mjs`, `scripts/code-shape-readers.mjs`, `scripts/shape-readers.mjs`, `scripts/shape-csharp.mjs`,
  `scripts/shape-python.mjs`, `scripts/csharp-tree.mjs`, `scripts/javascript-functions.mjs`,
  `scripts/python-tree.mjs`, `scripts/tree-walk.mjs`, `scripts/dose.mjs`, `scripts/wait.mjs`, `.github/shape.json`,
  `.github/shape-baseline.json`, `tests/readers-test.mjs`: fails what is new in how the code is put together: a function past its marks for lines,
  depth and branching, an import on a cycle, a file in no system. *Runs:* any session and the runners. *Else:* Lizard
  (MIT, Python, some 30 languages), dropped on fact: its definitions of a branch are fixed in its code (#519's record);
  ESLint's `complexity` and `max-lines-per-function`, dropped on fact: JavaScript alone; dependency-cruiser (MIT, 18
  packages) and madge, for cycles and boundaries, dropped on fact: JavaScript and TypeScript alone, where the check
  reads C# and Python too. *Bugs:* 3. **Keep:** fitting costs more than keeping, each tool knowing one language or
  fixing its definitions; its readers go to the parser, as #486's group 3 and #519's path say, C#'s functions the first
  (#529), then JavaScript's and TypeScript's (`scripts/javascript-functions.mjs`), then
  Python's, then all of Python, its imports and tokens too (`scripts/python-tree.mjs`), then all of C#, its using
  directives, namespaces and types too (`scripts/csharp-tree.mjs`). *Tried:* 19 November 2026 (#723), tree-sitter's JavaScript grammar 0.25.0
  and TypeScript's 0.23.2, on the core's 204 files of JavaScript and every case of the lexer's tests: the same where the
  lexer read by its definition, mended where it misread; the same day, its Python grammar 0.25.0, on 30,902 files of
  Python, likewise, and on 30,811 files of Python its imports, 180,814, and the runs of its clock the same in every file
  it read, its tokens mended where the lexer misread (#530, item 6); and on 6,626 files of C# from ten public
  repositories its using directives, 18,934, the same in every file, its functions, declarations and tokens mended
  where the lexer misread, the declarations in the part of a file the grammar could not read lost (7 files). *Replayed:* none: no bug filed names a reader of
  functions, and the hardening of Python's imports (#724), reported privately with no issue, was of leading an import to
  its file, which stays, its cases all read; the review findings its tests hold all read. Its config's shape is held by a schema and ajv
  (`scripts/schemas/shape.json`; #530, item 7).
