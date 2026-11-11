# Security

This repository takes the floor whole, `floor/security.md` and `floor/topics.md`, with its threat model,
`floor/threat-model.md`. What this repository adds under the floor's numbers:

- **Rule 3, the protected files:** every file here. The trusted builder: Claude's sessions the owner starts in this
  repository.
- **Rules 5, 6, 7, 10 and 15:** the repository holds documents, the scripts projects run from their `core/` copy
  (`scripts/`, Node's and the shell's own tools) and the workflows projects call; it ships nothing. What it takes are
  tools that only run, each with its licence in its audit (`.github/licences-audit.json`). Among them is Node
  (`node-linux-<arch>` at the exact version in `.node-version`), which `scripts/node.sh` fetches for projects' cloud
  machines with `npm pack --ignore-scripts`, never installing it, and checks against its SHA-256 before it runs. **Rule
  17:** Dependabot updates only the workflows' GitHub actions (`.github/dependabot.yml`); this repository names no
  manifest or lock file, so no other PR of Dependabot's meets it.
- **The threat model's part:** the core has no users of its own; what an attacker would want of it is a rule loosened
  here that every project then takes, so a change reaches a project only through a reviewed sync PR there.

## Reporting a weakness

"Reporting a weakness" in `floor/topics.md`: privately, through the Security tab's "Report a vulnerability".
