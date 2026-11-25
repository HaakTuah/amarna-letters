- `scripts/mutate.mjs`, `scripts/mutation-tools.mjs`, `scripts/mutation-tools.json`, `scripts/strength.mjs`, `scripts/strength-report.mjs`, `scripts/strength-verdict.mjs`, `scripts/stryker.mjs`, `scripts/stryker-plugin.mjs`, `tests/mutation/`:
  the mutation tool puts faults into the lines a change touches, one at a time, and writes the open mutation report,
  which the strength check reads to say how strong the tests are. *Runs:* any session and the runners. *Else:* StrykerJS
  (Apache-2.0, 172 packages) and Stryker.NET, kept, tried above; mutmut and Cosmic Ray for Python, kept for a Python
  project. *Bugs:* 0 naming `mutate.mjs`; #636, open, names `strength.mjs` and lies in four of the core's tests.
  **Replace** `mutate.mjs` with Stryker (a tool that only runs, fetched at set-up), which put nine times as many faults
  into the same lines, 63 of them surviving against the core's 4, and reaches .NET, which the core's tool does not; its
  packages are what #488's lookup weighs. **Keep** `strength.mjs`: it reads the report every such tool writes, and holds
  the core's measure. *Tried:* 18 November 2026 (#581), each tool as the core runs it, against every test that names the
  file, on the same four files: `core-path.mjs`, the core's 24 faults (4 survived) in 39 s, Stryker's 212 (62) in 407 s;
  `session-cost.mjs`, 39 (9) in 5 s against 221 (63) in 28 s; `dose.mjs`, 72 (13) in 24 s against 428 (98) in 126 s;
  `mend.mjs`, 4 (0) in 1 s against 32 (2) in 513 s, 48 tests naming it. Each line where a fault of the core's survived
  holds a surviving one of Stryker's. *Replayed:* none (no bug was filed against `mutate.mjs`; #636 has no merged fix).
  Replaced in #651: Stryker, installed from `tests/mutation/`'s lock file (its package list, lock file, `.npmrc`, in
  `tests/`, which no copy carries, installed by `install.mjs mutation`), is run by `stryker.mjs` with the core's glue
  (the tests that name each file, a working copy, the budget, a report written as the run goes); `mutate.mjs` stays for
  a project that names it, and for `--every`, which names each test that caught a fault.
  The list of which tool a project's code takes, by its language, with the writer of the manifest's row
  (`mutation-tools.mjs`, `tests/mutation-tools-test.mjs`; #1107), is the core's policy, which no tool holds: kept.
