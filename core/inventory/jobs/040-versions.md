- `scripts/versions.mjs`, `.github/workflows/versions.yml`, `.github/versions.json`, `.github/dependabot.yml`: opens an
  issue for each pinned version, outside a package manager, behind its registry's newest stable release old enough to
  take. *Runs:* the runners, monthly. *Else:* Renovate's custom managers with `minimumReleaseAge` (AGPL-3.0, allowed for
  a tool that only runs), dropped on fact: 122 direct dependencies and a token, for a job of about 120 lines;
  Dependabot, dropped on fact: it reads no pattern the project writes; updatecli (Apache-2.0, one program), found by the
  challenge, dropped on fact: its documentation of 17 November names no age a release must reach, which the script asks.
  *Bugs:* 1. **Keep:** fitting and keeping Renovate costs more than the script.
