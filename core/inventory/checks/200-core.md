- `.github/workflows/core.yml`, `scripts/copy-tree.mjs`, `scripts/core-path.mjs`, `scripts/core-address.mjs`,
  `scripts/releases.mjs`, `.gitattributes`, `tests/core-yml-test.mjs`, `tests/copy-left-out-test.mjs`,
  `tests/core-path-test.mjs`, `tests/core-path-hooks-test.mjs`, `scripts/core-path-scratch.mjs`: fail a project
  whose copy is not the core, whole, at the commit its manifest pins, or whose calls to the core's workflows are pinned
  elsewhere; and hold the README's list of what a project's checks leave out of the copy to what they do. *Runs:* the runners,
  where nothing of the project's runs before it; any session by hand. *Else:* the options of #519's record (a submodule,
  a subtree, a package, a fetched release, the host's reusable workflows, vendir), each weighed there. *Bugs:* 3 and 1.
  **Keep:** #519's record, judged on merit on 17 November.
