# Security

This repository takes the floor whole, `floor/security.md` and `floor/topics/`, with its threat model,
`floor/threat-model.md`. What this repository adds under the floor's numbers:

3. **The protected files:** every file here, changed by the sessions the owner starts in this repository, of any
   agent tool, and any session started from one at any depth, none on an outsider's text, as the builders of an
   orchestrator the owner's adviser started (`AGENTS.md`, "The queue").
5. **Untrusted input, and its checks:** the core's scripts read what others shape, here and in each project that runs
   them from its `core/` copy. Each input below is data (floor rule 4), which the scripts it names check against its
   shape and refuse where it fails, as floor topic 5 asks, its hostile tests trying each case. Each answers in 5 s at
   most, as its hostile tests time it (`scripts/hostile.mjs`), and each JSON it parses is nested 200 deep at most
   (`scripts/guards.mjs`); its limits name what it reads beyond that.
   - a pull request's description: read by the description checks (`scripts/pr-description.mjs`, and the lines it asks in `scripts/pr-waits.mjs`, `scripts/pr-cost.mjs`, `scripts/pr-number.mjs` and `scripts/pr-reasons.mjs`, and the line
     "Read for it:" by `scripts/reading.mjs`, and the line "Never needed:" by `scripts/read-total.mjs`, line by line);
     limits: none of its own on the text, which GitHub holds to 65,536 characters; 100 commits, one page; 8 s for the
     reading list's calls; hostile tests: `tests/hostile-pr-text-test.mjs`.
   - the comments and reviews on a pull request, their bodies and authors: read by the security-review check and the
     code-review wait (`scripts/security-review.mjs`, `scripts/code-review-wait.mjs`) and the size check's reader of a
     "Leanness check:" answer (`scripts/size.mjs`), with the descriptions of merged pull requests by the tools reader
     (`scripts/tools-read.mjs`) and the order of checks and reviews through it (`scripts/stage-order.mjs`), and, of any
     pull request's, by the scheduled look's reader of late review findings (`scripts/look.mjs`, its reader
     `scripts/look-checks.mjs`, through
     `scripts/review-marks.mjs`), which puts a replier's login in a request's route; limits: 64 MB of an answer (256 MB
     for the look's), 20 pages of 100 for the tools reader and 50 for the look's, every page for the review checks,
     whose jobs stop at 6 and 5 minutes; hostile tests: `tests/hostile-pr-comments-test.mjs`; for the closing attribution
     line, `tests/tools-read-test.mjs`; and for the order's own reading of names and asks, `tests/stage-order-test.mjs`.
   - what a pull request changes, its files' paths and content and its commits, a fork's among them: read by the
     proofs of a pure sync and of a change of comments alone (`scripts/pure-sync.mjs`, `scripts/comment-only.mjs`),
     the selection of tests (`scripts/select.mjs`), the tree a copy must be (`scripts/copy-tree.mjs`) and the lines
     a pull request adds under its manifest's "Differences" (`scripts/pr-reasons.mjs`), the rule files a checkout
     holds, the manifest too (`scripts/reading.mjs`, and `scripts/rules.mjs` for the rules in them, which read only
     regular files in real folders of the checkout's own, a pipe or device as no file and a link at any depth refused
     with its mend, and the first tries the changed paths on the path patterns within 16 million steps for each
     reading, a run of it or a pull request's description, each with a budget of its own, past which every pattern
     left matches), and the rule
     files the total read sums and reads for a cut or a join (`scripts/read-total.mjs`, which prints each name with its
     control characters written out, and reads a link, what is no regular file of the checkout's own, and a name a rule
     file gives that is absolute or holds a ".." segment as no file); limits: 64 MB of git's answer (256 MB for the
     comments proof, the selection and the total read, 16 MB for the manifest, past which it is reported unread), and
     none in count, since every changed path is read, save the total read's 1 MB of a file's text, past which its size
     alone is counted, and 8 MB of all their text, 200 rule files, 100 kinds of task, 300 names they give and 16
     million steps of each tree's tries, past which it fails with its mend; and of each file of Python or C# the
     selection reads through the shape check's readers (`scripts/shape-readers.mjs`), 500,000 characters of Python
     and 200,000 of C#, past which the parser reads none of it (neither functions, imports nor tokens), 2 s for the
     parser on each and 250,000 nodes in the tree it gives, past which the parser reads none of it either
     (`scripts/tree-walk.mjs`), while of JavaScript and TypeScript it gives the parser nothing, reading their imports
     without it; and of all the files a pull request changes together, 4,000,000 characters and 1.5 s of reading, of any
     one file of JavaScript, TypeScript or Python it leaves as it was, 4,000,000 characters, 1.5 s to link the files and follow
     the links from each test, and 3 s for the whole of it, the project's own files read too, past which the selection
     reads no more and runs the whole suite (`scripts/hurry.mjs`); hostile tests: `tests/hostile-pr-changes-test.mjs`.
   - a *progress file* as a pull request changes it, a fork's among them, the path a project's manifest gives it, and
     GitHub's list of open issues: read by the queue's reader (`scripts/queue.mjs`), and by the scheduled look's reader
     of the work standing still (`scripts/look.mjs`, its reader `scripts/look-pulls.mjs`, through `queue.mjs`'s
     placing and reading), with the open issues
     titled as the orchestrator's notice and their authors' rights; limits: 1 MB of the file, past which it is refused
     unread; 64 MB of an answer (256 MB to the look) and 100 pages of 100 for the open issues, past which it stops; for
     the look, the search's first page and five authors' rights; hostile tests: `tests/queue-test.mjs`, and for the
     look `tests/look-test.mjs`.
   - issues, their comments and labels: read by the labels check (`scripts/labels.mjs`), the stand-in's and the reviews'
     records (`scripts/stand-in-record.mjs`, `scripts/review-record.mjs`), the scheduled look (`scripts/look.mjs`,
     with `scripts/look-keep.mjs` and `scripts/look-pulls.mjs`), the
     inbox (`scripts/inbox.mjs`) and the personal terms' take-out (`scripts/issue-terms.mjs`, which edits only an
     insider's text); limits: 256 MB of an answer (16 MB for the inbox's own), 500 pages of 100, and for the take-out
     1,048,576 characters of a text, past which it is left unread, and the first 100 edits of its history; hostile
     tests: `tests/hostile-issues-test.mjs`, and for the take-out `tests/issue-terms-test.mjs`.
   - whether a project's repository is private, read by `scripts/host-private.mjs`:
     - from the event of GitHub's job, for its own repository alone;
     - else from gh;
     - else from GitHub's API with no sign-in, in a Node process of its own, run with no token of gh's or GitHub's and
       through the proxy its environment names;
     - else from `CORE_PRIVATE`, `true` or `false`, which the gate of `pure-sync.mjs` clears;
     - the repository named by the clone's origin, or, where that is a folder that is itself a clone, by that folder's
       origin, at most four deep;
     - limits: 16 MB of gh's answer; 20 s for the read with no sign-in, and 30 s for its process; of each answer only a
       boolean field `private` is taken, from the read with no sign-in only with status 200, all else reading nothing;
     - hostile tests: `tests/host-private-test.mjs`.
   - what GitHub's API answers, releases and tags, runs and checks, pull requests, whose account holds a repository (the
     workflow's event too) and an account's rights to it: read by `scripts/core-moved.mjs`, `scripts/releases.mjs`,
     `scripts/wait.mjs`, `scripts/stalled.mjs`, `scripts/core-cost.mjs`, `scripts/clean-merges.mjs`,
     `scripts/security-review.mjs`, `scripts/merge-line.mjs`, `scripts/runners.mjs`, `scripts/stage-order.mjs`,
     `scripts/tools-offer.mjs`, the owner's settings (`scripts/owner-settings.mjs`: a repository's settings, its default
     branch's rules and its secrets' names, never a value) and the scheduled look's reader of the default branch's newest commit, read as a time
     alone (`scripts/look.mjs`, in `scripts/look-pulls.mjs`), and
     an account's rights by the code-review wait (`scripts/code-review-wait.mjs`), the scheduled look
     (`scripts/look.mjs`, in `scripts/look-pulls.mjs` and `scripts/look-checks.mjs`) and the size check
     (`scripts/size.mjs`, from `size.yml`) through `security-review.mjs`'s
     reader, and a pull request's one file and the issues its lines name, by `scripts/queue-only.mjs`; limits: 1 MB of
     an answer to `core-moved.mjs`, `releases.mjs` and `tools-offer.mjs`, 64 MB or 256 MB to the others, 30 commits and
     30 s each for the green main of `releases.mjs`, 30 merged pull requests for the wait, 50 pages for the stalled
     look, 200 for the cost, 10 for the merge line, 20 s for the tools' offer, 30 s for the host's account, 16 MB and 30 s
     each of at most five reads for the owner's settings, a name it prints being text alone of at most 100 characters,
     and 20 checks named, and for
     `queue-only.mjs` 16 MB of an issue's answer and 3 pages of its notes, 12 issues, the pull request's answer, the
     first page of its files and the comparison that gives them read whole, at GitHub's own size (its count of one
     file read first), 1 MB of the progress file, 240 characters of a line it adds, 90 s and a job of 3 minutes;
     hostile tests: `tests/hostile-github-test.mjs`, and for the last `tests/queue-only-test.mjs`.
   - a project's configs of the core's checks, its manifest and its `SECURITY.md`: read by the copies, shape, size,
     licence and manifest checks (`scripts/copies.mjs`, `scripts/shape.mjs`, `scripts/size.mjs`,
     `scripts/reading-size.mjs`, `scripts/licences.mjs`, `scripts/manifest-reads.mjs`), the sync and its steps
     (`scripts/sync.mjs`, `scripts/steps.mjs`), the reader of the checks that read nothing (`scripts/read-nothing.mjs`,
     from the steps and the state report, listing files by the shape check's own lister) and the scheduled look
     (`scripts/look.mjs`); limits: 64 MB of a file the steps read, past which it is reported unread, and none of their
     own in count, since a project's config is its own; hostile tests: `tests/hostile-configs-test.mjs`.
   - the files an agent tool takes its instructions from (`GEMINI.md`, an entry file, each file of a tool's folders), as
     the work tree and a pull request's base hold them: read by the copies and pointer checks (`scripts/copies.mjs`,
     `scripts/pointers.mjs`, through `scripts/rule-files.mjs`); limits: 1 MB of a file, past which it is not read, 40
     links followed from one path; hostile tests: `tests/copies-tools-test.mjs`.
   - the Markdown links in the rule files, and the headings they name, in the head and in its base's tree: read for the
     pointer check by lychee (`scripts/links.mjs`, the tool fetched at set-up by `scripts/lychee.sh`
     and run on the runners alone, offline and from an empty folder, so that no config of the project's is read), the
     file a link leads to held by the check to what git tracks in the project, one out of it failing; limits: 120 s for
     each of its runs, past which the head's links are said unread and the core's own reading stands in, and the base's
     are said unread and each finding is only noted; the base is written from git's own blobs, no link out of the project
     followed, no path out of its folder written and no attribute applied, and lychee is given only Markdown files whose names hold no control character; hostile tests:
     `tests/links-test.mjs`.
   - a project's build, package and workflow files: read by the licence, exact-versions, NuGet, workflow and agent-tools
     checks and the reader of where the tests run (`scripts/licences.mjs`, `scripts/exact-versions.mjs`,
     `scripts/nuget.mjs`, `scripts/workflows.mjs`, `scripts/agent-tools.mjs`, `scripts/runners.mjs`), the reader of a
     project's own workflows (`scripts/parse-yaml.mjs`, for `check.mjs`, `own-runs.mjs` and `steps.mjs`) and the
     sync's move of the pins (`scripts/sync.mjs`) and the owner's settings' reader of the project's
     `security-review.yml` (`scripts/review-caller.mjs`, for `scripts/owner-settings.mjs`, only whether its call of the core's security review runs
     on every pull request and on its comments, as the kit's (no filter of branches or paths; a pull request's types named, holding the
     kit's four, and a comment's holding created and edited; its job run whatever the job it needs did; in the kit's form
     alone, each job a call of the core's two workflows granted what it asks and given only the inputs it defines, each
     of its type, a boolean plainly so, needing only those jobs and none itself, no two named alike but for case, and no other key of a job or the file, `concurrency` among them; the core's repository named, its path exact, and the review's `root` a plain relative path that holds the core's Node version and the check's script), in a private repository giving `private: true` or `advisory: false`, each file read from the default branch as last fetched (its ref exactly):
     64 MB of it, a regular file, no link or submodule followed, and read as YAML by `scripts/parse-yaml.mjs`, at most its 256 K characters, what it
     cannot read said unread, never not for the project);
     limits: 60 s for each of the workflow check's two tools on one file
     (zizmor and actionlint, `scripts/workflow-tools.mjs`, each file run on its own, one a tool stops on or cannot load said
     as a finding with its mend, and neither run in a session), 64 MB of a file for the licence check (256 MB for NuGet's), 1
     MB of an action and 5,000 steps of a workflow, 256 K characters of a workflow for the readers of its YAML (past it,
     said unread with its mend, never given to the parser, and `parseYaml` throws it with its mend; such a file
     unchanged from the base is only noted, its calls left without ready_for_review unread, and
     one a pull request changes fails, and is read as new once cut under it), 60 s for git's filters, 64 MB of a
     workflow for the move of the pins, past which it is reported unread, and 256 KB of a workflow for the reader of
     where the tests run, past which, through a link that leads out of the checkout, or where it is no file of bytes, it
     is said unread and never read as no jobs, its folder not read through a link, and whose walk of a job's labels
     stops at 500 and 8 deep, lists and mappings nested 128 deep at most for the workflow check's two readers of a
     workflow (what is nested past it is said with its mend, and no list or mapping used as a key is read), no line
     break of YAML 1.1 beyond LF, CR and CRLF for the same two readers (U+0085, U+2028 and U+2029, which the package
     does not read as one, fail a file that is new or changed,
     with their mend, and are only noted in one unchanged from the base or where a project's run is told no base, what
     stands behind such a break being read as a YAML 1.1 reader reads it (as line feeds, as the sync's mend leaves it and
     as it stands, whichever finds most, a reading that is no YAML to the package, where the text as it stands is, leaving its keys out), a key given twice or a call left without ready_for_review there found and
     failed or noted as any other, a file's lines of one kind cut at 25 with the rest counted, each reading of a text kept for the next
     reader, a hostile file of the longest text read costing both readers, head and base, no more than five times (and 0.3 s) the
     time of the same file with no break, and each file that holds one named at a sync; where a base's breaks, read so, leave
     it no YAML to the package for their sake alone (such as a break inside a single-quoted string whose next line is under-indented), what it held behind them cannot be told, and
     what the changed file then shows is noted, not failed (a base no YAML for another reason is read as it stands); in the core's own run each fails), and NuGet's lock file version 2, a newer refused (npm's
     lock file's number is not read yet: #663); hostile tests: `tests/hostile-build-files-test.mjs`, for the
     reader of where the tests run `tests/runners-test.mjs`, and for the owner's settings `tests/owner-settings-test.mjs`
     (the file missing, a link, on no fetched default branch or in the working tree alone, the core too) and `tests/review-caller-test.mjs` (no YAML, a call of another repository's or in another case, a root that does not hold the core or is not plain, jobs as a list, no call of the core's, an input read only at its run, a
     condition on the call, a job needed with none, no pull request among its triggers or only some, GitHub's own types, no comment trigger, no right to write statuses, a call granted less than it asks, a job needed that is not there, a call of another's, a concurrency, an input not defined or not of its type, a secret passed, a runner on a call, jobs needing each other or themselves, a job not a call, a key not the kit's, a job named as GitHub refuses, a comment on the line, each in a public repository and a private one; its
     size, by `own-files.mjs`'s and `parse-yaml.mjs`'s own readers' tests).
   - what a package brings, from a registry or installed (its manifest, licence files and content hash), and what its
     registry and GitHub answer of it: read by the licence scan and the installed licences
     (`scripts/licence-scan.mjs`, `scripts/licence-installed.mjs`), the NuGet fetch (`scripts/nuget-fetch.mjs`), the
     lookup (`scripts/lookup.mjs`) and its lookup again of what a project holds (`scripts/held.mjs`, through the
     lookup's readers); Node itself is checked against its SHA-256 by `scripts/node.sh`, and the code scan's wheel by
     its own, which pip checks against `.packages/requirements.txt` (`scripts/install.mjs pypi`); limits: 16 MB of a
     NuGet package's manifest, 100 pages of NuGet's registry, 20 lookups on GitHub in a run, 30 s for an answer (60 s
     for a NuGet package), 120 s for the whole look again; hostile tests: `tests/hostile-packages-test.mjs`, and for the
     scan `tests/code-scan-test.mjs`.
   - the code a pull request adds or alters, and its description's lines "Scan false alarm:" and "Scan unread:": read
     by the code scan (`scripts/code-scan.mjs`), which hands the files by name to Semgrep's engine, installed from its
     wheel's pinned hash, with no variable that holds a token, fails a file it could not read, and silences no finding a
     comment in the code asks it to; limits: no size of a file, a file the engine did not scan or stopped on failing
     and one it parsed in part passing, said as read in part, 200 files to a run of the engine, 30 s for a rule on a
     file, 900 s for a run, 256 MB of git's diff of a file, 1 GB of the engine's answer, and the description whole as
     the host gives it, at most 65,536 characters; hostile tests: `tests/code-scan-test.mjs`.
6. **Rules 6, 7, 10 and 15:** the repository holds documents, the scripts projects run from their `core/` copy
   (`scripts/`, Node's and the shell's own tools) and the workflows projects call; it ships nothing. What it takes are
   tools that only run, each with its licence in its audit (`.github/licences-audit.json`). Among them is Node
   (`node-linux-<arch>` at the exact version in `.node-version`), which `scripts/node.sh` fetches for a project's cloud
   machine whose own Node is below the least long-term line in `.node-least`, or that has none, with
   `npm pack --ignore-scripts`, or with no npm by curl from the registry's own address over HTTPS, never installing it,
   and checks against its SHA-256 before it runs; and Semgrep's engine (`semgrep-core` from the `semgrep` wheel on PyPI
   at the version and hashes in `.packages/requirements.txt`), which `scripts/install.mjs pypi` installs with pip in the code
   scan's own step for a project the host's CodeQL does not scan, the wheel checked by its SHA-256, no dependency
   taken and none of its code run, and which the scan runs with no Python.
17. **Dependabot** updates the workflows' GitHub actions and the packages of the core's lock files, `package-lock.json`
    and `.packages/requirements.txt` (`.github/dependabot.yml`), each a week after its release.

The threat model's part: the core has no users of its own; what an attacker would want of it is a rule loosened here
that every project then takes, so a change reaches a project only through a sync PR there: a pure sync gets no review
of its own, since its content was reviewed in the core's own PR (floor rule 8), and any other is reviewed there like
any PR.

## Reporting a weakness

"Reporting a weakness" in `floor/topics/weaknesses.md`: privately, through the Security tab's "Report a vulnerability".
