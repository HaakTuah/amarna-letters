## Choice: the core reaches a project as an exact copy under `core/`, pinned to one commit

- Chosen for: every reader of the rules (Claude Code's imports, another provider's reviewer on GitHub, any other tool)
  reads the repository's own files and installs nothing, and the hooks run the copy that was reviewed (core archive
  165); a pure sync needs no review of its own (floor rule 8).
- Judged again on 17 November 2026 (#519): it stands, one copy for every project, and the core's own tests leave it
  (the path's second step).
- Reopens it: a project made of several repositories would hold the copy more than once (#285).
