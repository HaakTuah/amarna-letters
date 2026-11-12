# A check for code nothing uses: a workshop lane

The owner, 11 November 2026: "Should we have a rule about removing unused code, expert?", then "Yes, expertly to all,
expert!". "Keep it lean" forbids leftovers, but nothing held it. Now three checks do, all run by `scripts/test.sh` and by
the code-PR checks (`npm run typecheck`, `npm run lint`).

## What changed

1. **A local, import or parameter nothing reads fails the type-check** (`noUnusedLocals` and `noUnusedParameters` in
   `tsconfig.base.json`, which every project extends, the web app's included). About 150 leftovers were cleared first:
   the six files the entry named, and the rest the flags found (mostly unused imports in `turn/resolve.ts`, and the
   `view`, `court` and `ct` parameters of the test seats). A parameter was dropped where nothing else needed it
   (`missedPay`, `seize`, the bots' `economy` calls, `reportClauses`), its callers with it; where a later parameter is
   read, an `_` marks the gap.
2. **A file or export nothing imports fails the lint** (`scripts/unused-code.mjs`, on the TypeScript compiler's own API,
   over the two programs the type-check builds; about 10 seconds; no new dependency). It follows an import to the
   declaration it names through re-exports and `export *`, counts `ns.name` on a namespace import, dynamic `import()`,
   `import("…").Name` types, Vite `?worker&url` imports and `new URL("./file", import.meta.url)`. A test file is an
   entry. Four files are reached some other way and are listed with their reason in `scripts/unused-code.json`; so is
   anything else that later is, and an entry that stops being needed fails too. The clean-up deleted the exports
   nothing used, 30 or so, all of them dead schemas, factories and constants of the C# port, and what only they used.
3. **A skipped or narrowed test fails the lint** (`eslint.config.js`: `.skip`, `.only`, `.todo`, `.skipIf`, `.runIf`,
   `xit`, `fit` and kin, in `src/*/test`). `npm run lint` now reads all of `src`, where it read only the engine's source.

## Proof

The suites and the seeds' replays (`scripts/sim.sh --games 50 --seed 1 --verify-replay`) pass unchanged; no save
version. Deleted code was dead to the compiler: no import, no use in its own file.

## Readings taken

- **Exports used only inside their own file are not failures.** About 400 exports (the `…Values` arrays and their
  types, the C# port's constants) are read only by their own file. They are not unused code, only wider than needed;
  `node scripts/unused-code.mjs --all` lists them. Making them private would be a mechanical sweep for a later lane if
  the owner wants the smaller surface.
- **A conditional skip counts as a skip.** `.skipIf` and `.runIf` hide a test as quietly as `.skip`, so the rule refuses
  them; the one use, the by-hand probe `src/web/test/probe.test.ts` (a measurement, not a test of a rule), carries a
  one-line `eslint-disable` that says so.
- **The finder runs from `npm run lint`, not only from `scripts/test.sh`,** because the code-PR checks run
  `npm run lint` and nothing in `.github/` needed to change. That meant one line of `package.json`'s scripts, a
  protected file (SECURITY.md, rule 17); no dependency or lock file moved.
- **Tests count as users.** An export a test imports is used. Counting only the game's own code would mean deleting
  tests of dead code first.
- **`docs/design/44-the-crash-and-speed.md` and `docs/for-developers.md` describe `probe-run.ts` with `vite-node`,** which
  is not installed (vitest 5 no longer brings it). Not changed here: it is a stale tool, not a leftover of this lane.
