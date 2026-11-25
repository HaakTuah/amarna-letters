- `.github/workflows/codeql.yml`: runs the host's CodeQL on a public project's pull requests, its pushes and weekly.
  *Runs:* the runners. *Else:* it is the host's maintained tool already. On a private repository it is paid, so a
  private project does not call it (`README.md`, "A private repository"), and `scripts/code-scan.mjs` scans it in
  its place. *Bugs:* 1. **Keep** for a public project.
