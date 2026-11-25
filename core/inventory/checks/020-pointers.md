- `scripts/pointers.mjs`, `scripts/rule-files.mjs`, `scripts/markdown.mjs`, `scripts/links.mjs`, `scripts/lychee.sh`:
  fails a pointer in the rule files, to a file, a section, a numbered point, a floor rule or an archive item, that leads
  nowhere; Markdown's own links there, and the heading each names, it reads with lychee, fetched at set-up
  (`lychee.sh`), the file a link leads to held by the core to what git tracks, a finding the base held noted (#582).
  *Runs:* the core's own forms in any session and on the runners; lychee on the runners alone, where the job's set-up
  fetches it, a session saying it did not run it and reading the form `[text](path)` its own way, no heading read.
  *Else:* lychee (MIT or Apache-2.0, one program, offline, with Markdown's anchors), taken; remark-validate-links,
  markdown-link-check and linkinator, each kept for Markdown's own links and dropped, on fact, for the rest: none reads
  a backticked path, a quoted section, a bold lead or "point 6", so the core's own forms stay the core's: nothing fits.
  Its reading of Markdown runs on the package marked (#530, item 7). *Bugs:* 1 (#1032, lists nested deep ran the lexer out of memory; a bound before it reads mends it). *Tried:* 20 November 2026 (#582),
  lychee 0.24.2 against the check's reading of `[text](path)`, on the runners, over the core's 74 rule files and its 391
  Markdown files, the starter kit's projects (npm, .NET, npm private), every Markdown file of the two games at the
  three commits whose pointers a review found broken (the note on #582), and 42 cases: on the rule files both read the
  same 28 links and found none broken; over all the core's Markdown lychee read 118 links to the reading's 38, and
  found the one broken link (in a dated report) the reading found, where the reading also failed two that were no
  links (inside code); in the games it read 82 and 446 links to 63 and 311, the same 17 broken in the one; the three
  pointers the review found, a backticked path, a quoted section and a numbered point, are no Markdown link, and
  neither read them. In the cases lychee alone read a link with a title, a reference, an HTML link, a path in angle
  brackets or with `%20`, one from the project's root (`/b.md`) and `?plain=1`, and each heading not there (in another
  file or its own, a second alike, a bold lead GitHub gives no anchor, a folder's); the reading alone failed a link in
  a code span (wrongly), a path with brackets (wrongly), a file git does not track, one out of the project, and a file
  that is no UTF-8, which lychee reads nothing of and says nothing; lists nested 5000 deep crashed the reading out of
  memory (#1032), which lychee read in 0.16 s. lychee took 20 to 60 ms a run on each project, 1.6 s on 100,000 links,
  the reading 30 to 400 ms. *Replayed:* #1032 not run as its fix's case: the trial found the bug, and its fix (#1044) and its case merged after the trial ran; the trial's own case, lists nested 5000 deep, lychee read in 0.16 s. Then **replaced**: the form
  `[text](path)` is lychee's, with the core's glue (`links.mjs`): which file a link leads to is read from lychee's list
  against what git tracks, so a file not tracked or out of the project still fails, and a file that is no UTF-8 is left
  to the core's reading; the core's own forms stay; **try** the core's forms in a project's own documents, which the
  review's three pointers stood in (#1034).
