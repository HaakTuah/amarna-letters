## Choice: the scripts in JavaScript on Node, with nothing installed in a project

- Chosen for: a project runs the core's scripts from its copy with nothing installed, so no package of the core's
  needs a licence check, a registry or an install, and the sync runs outside the owner's test box with Node and Git
  alone (`setup/server.md`, point 7). The one exact Node is `.node-version`'s.
- Reopened on 16 November 2026 (#486, point 3), its sign having tripped: the readers written here by hand to stand in
  for a package pass 600 lines together, though none alone (the lexer of `scripts/code-shape.mjs`,
  `scripts/shape-csharp.mjs` and `scripts/shape-python.mjs`), and a reader for Rust, another, was asked for. What stands: the scripts in JavaScript, run by the
  pinned Node from the copy, a project's sessions installing nothing, and the scripts' own code with no type checker
  (the third record below). What gives way: a format or a language someone else defines is read by a package carried
  in the copy at one exact version, or by a tool that runs only in the core's own checks (#486, points 6 to 8); the
  parser of the next record is the first, and its inventory says what follows.
- Judged again on 17 November 2026 (#519, the record above), on merit: it stands. "Nothing installed in a project"
  was argued there and kept, as was no fetch while a check runs. What gives way: the one exact Node stays the pin of
  the host's checks, beside a least long-term Node the scripts promise to run on, tested in the core's suites and used
  by a session whose machine holds it (the path's first step).
- Reopened on 18 November 2026 by the owner's decision (#654): other publishers' code is registered, never carried.
  What was not weighed when "nothing installed in a project" was argued: the registry's own lock file, installed at
  set-up, and what a lock file gives (#652). What stands: the scripts in JavaScript, run by the pinned Node from the
  copy, and no fetch while a check runs. What gives way: "nothing installed": the core's packages are installed from its
  `.packages/package-lock.json` into the copy's `.packages/node_modules/`, which git does not track, by the sync, at a
  session's start and in each job before a check (`scripts/install.mjs`); a script loads them from there alone
  (`scripts/packages.mjs`).
- Reopens it: a package the core needs cannot run on the pinned Node without a native build or an install script, or
  the install adds more than 30 s to a job on the host's runners.
