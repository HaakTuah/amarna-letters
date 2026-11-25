- `.github/workflows/signatures.yml`, `tests/npm-mend-test.mjs` (#1262): installs the packages with their scripts off, runs `npm audit signatures`, and
  reads each installed licence back; under an npm too old for its settings, it says the mend that installs one that reads them. *Runs:* the runners, and any session. *Else:* it is npm's own tool already.
  *Bugs:* 1. **Keep:** the job is npm's; the core holds only its call.
