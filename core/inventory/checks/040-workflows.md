- `scripts/workflows.mjs`, `scripts/workflow-tools.mjs`, `scripts/workflow-tools.sh`, `scripts/zizmor.yml`,
  `scripts/actionlint.yml`, `scripts/yaml-keys.mjs`, `scripts/unnamed.sh`: fails a workflow or action in which the word `pull_request_target`
  stands, and runs zizmor and actionlint on each, fetched at set-up (`workflow-tools.sh`) with the core's policy as
  their configs, a finding the base held noted (#580); `unnamed.sh`, which `lychee.sh` sources too, names the temporary
  and home folders in the log a failed fetch shows (#1223); `yaml-keys.mjs` reads a key given twice for the sync's steps
  alone, and, run with `--core`, the check fails one that is no YAML to the core's own reader. *Runs:* the word, the
  draft's calls and the core's reader in any session; the two tools on the runners alone, where the job's set-up
  fetches them, a session saying it did not run them. *Else:* zizmor (MIT, a program for each system, its audit
  `dangerous-triggers` among some 30), taken; actionlint (MIT, Go, its syntax check refusing a key given twice, and,
  where shellcheck is installed, each step's script), taken, ShellCheck left to its own trial; yamllint's
  `key-duplicates`, dropped on fact: Python, and actionlint holds it. Found by the challenge, untried: ghalint (MIT, one
  program, 1.6.0) and poutine (Apache-2.0, one program, 1.1.6), each reading a workflow's security policy, left for the
  next asking: zizmor reads what each of their rules does that floor rule 2 asks. *Bugs:* 9. *Tried:* 20 November 2026
  (#580), zizmor 1.32.0 and actionlint 1.7.12 against the check, on the runners, over the core's 22 workflows, the
  starter kit's projects (npm, .NET, npm private) and 36 cases from the check's tests on `main`: the core's search found
  in every spelling the trigger zizmor found (as a key, a value, in braces, the long way, behind an alias or an escape),
  and alone the word in a comment or a script, in a workflow whose one step is `actions/labeler`, which zizmor passes,
  behind a comment that ignores zizmor's audit, and behind U+2028 or U+0085, where zizmor stopped or read no file, so
  the search stays the core's policy for the trigger rule 2 forbids outright; its draft's calls (#502), which no tool
  reads, stay; actionlint found every key given twice the check found in a workflow, and zizmor found none, a file
  with one being no input it loads, so a key given twice in an action is held by zizmor's word that it could not read
  the file; the tools found what the check never read: on the core, an `issue_comment` trigger, a workflow-wide
  `statuses: write`, two checkouts that keep their token and two calls by `./` (the second mended, the first and last
  allowed in the config, the checkouts each allowed on its line with why), and in the cases untrusted text in a script,
  an action pinned to a tag and a context that does not exist; on the starter kit's projects, the `issue_comment`
  trigger alone. zizmor took about 45 ms a file, actionlint 4 ms, the check's own reading 1 to 25 ms. *Replayed:* #393
  read (actionlint, each workflow case; an action's, by zizmor's word that it could not read it), #610 read
  (actionlint: past its depth of 10000), #752 read (actionlint found the key past the core's length read), #837 read
  (zizmor stopped on it, said as a finding; actionlint), #872 read (actionlint), #876 read (actionlint, behind U+0085
  and U+2029), #970 read (actionlint, the three thousand keys in 170 ms), #994 read (actionlint, both cases); #918 not
  the tools' (the files read stay the check's own choice, the copy at the manifest's path left out, its case passing as
  before). Then **replaced**: the key given twice is actionlint's, and the rest of rule 2 zizmor's, where each reads it.
