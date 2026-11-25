- `scripts/install.mjs`, `scripts/packages.mjs`, `scripts/npm-reads.mjs`, `scripts/parser.mjs`, `scripts/parser-worker.mjs`, `.packages/`,
  `.gitignore`: install the packages of other publishers the scripts run from the core's lock file in `.packages/` into
  `.packages/node_modules/`, and the parser's from `.packages/parser/` only where a job names it (#719), and load each
  from its own install alone, a missing one saying its mend (#654); and, named, the code scan's engine from
  `.packages/requirements.txt` into `.packages/pypi/` with pip (#546). *Runs:* any session, at its start and at each
  sync, and on the host's runners before each check. *Else:* npm's own `npm ci` and pip's `install --require-hashes`,
  which do the installs, kept; a folder of carried packages (#528), dropped on the owner's decision of 18 November 2026.
  *Bugs:* none. **Keep:** the install is npm's; the scripts run it once more after a failed fetch and say the mend.
