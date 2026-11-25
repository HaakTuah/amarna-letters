- `scripts/code-scan.mjs`, `scripts/code-scan.yml`, `tests/code-scan-logic-test.mjs`: where no workflow calls `codeql.yml`, has Semgrep's engine
  installed from `.packages/requirements.txt` (`scripts/install.mjs pypi`) and scans the code a pull request adds or
  alters with the core's own rules, failing a finding its base did not hold. *Runs:* two steps of `core.yml`'s one job,
  and any session that installs the engine. *Else:* argued in `CHOICES.md`, "Choice: a private project's code is
  scanned by Semgrep's engine, with the core's own rules" (#546): ast-grep, Opengrep and a score more weighed there; the
  rules are the core's since no maintained set carries a licence the floor allows. *Bugs:* 0. **Keep:** the engine is
  a maintained tool already; the rules and the glue are the core's.
