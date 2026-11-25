- `scripts/licences.mjs`, `scripts/licence-scan.mjs`, `scripts/licence-installed.mjs`, `scripts/licence-yes.mjs`,
  `.github/workflows/licences.yml`, `scripts/licence-commands.mjs`, `scripts/licence-npm.mjs`, `scripts/licence-fetchers.mjs`,
  `scripts/licence-pages.mjs`, `scripts/licence-scan-stage.mjs`,
  `scripts/licences.d.mts`, `.github/licences.json`, `.github/licences-audit.json`, `tests/licence-fetch-test.mjs`, `tests/licence-fetch-places-test.mjs`,
  `tests/licence-fetch-other-test.mjs`, `tests/licence-fetch-pages-test.mjs`, `tests/licence-scan-limits-test.mjs`,
  `tests/licence-scan-pins-test.mjs`: hold
  every package the lock files install, and every entry of the audit, to floor rule 10's list, with the owner's yes for
  what is off it. *Runs:* any session and the runners. *Else:* npm's own `npm sbom` (each installed package's licence,
  as SPDX or CycloneDX), kept, as the package system's own tool; licensee (Apache-2.0, 10 packages),
  license-checker-rseidelsohn and CycloneDX's npm tool, kept as the fallback; Trivy's licence scan, dropped on fact: its
  project's build was broken into in March 2026 and its own policy is written in Rego; ScanCode, dropped on fact: Python
  and a large install. *Bugs:* 5, 1 and 1 (15 with the NuGet check's, the most of any group). **Replace** the reading
  underneath with `npm sbom` after the install the check already makes; **keep** the policy (the floor's list, the
  owner's yes, the scan of what no lock file holds) and the HTML reading, which goes with #486's licence group. *Tried:*
  18 November 2026 (#585), npm 11.20.0, on the 70 projects `tests/licence-installed-test.mjs` makes and on a real
  install; the core's reading kept, on measure, since neither of npm's own tools reads what is installed at its level.
  `npm sbom` merges the packages of one name and version, so a GPL-3.0 copy of a locked ISC package bundled in another's
  folder went unread, and it stopped with nothing read wherever a package.json had no name, a project's own root among
  them (15 of the 70 that pass). `npm query "*"` failed what the old reading failed on all 70, but its review found four
  cases it reads worse, each reproduced: a plain file named `@block` in a package's `node_modules` makes npm leave out
  every package in that folder with no word, so a bundled GPL-3.0 package passed; a package.json that is itself a link
  out of the project passed; a valid local package with no name and no version failed; and a folder named `..vendor`
  read as outside the project. The fallbacks were read, not run (#649): license-checker-rseidelsohn walks the folders
  with the same `readdirScoped` npm uses, reads its failure as nothing installed, and keys each package by name and
  version; licensee reads npm's own tree (`loadActual`); and CycloneDX's npm tool runs `npm ls --long --all`: each would
  read the `@block` case as npm does. *Replayed:* #444 not read (its cases, lock entries not written as npm writes one,
  lie in the lock file, which npm's reading of what is installed never opens); #339, #364, #366, #386 and #447 not run
  (their cases lie in where the config stands, the steps and the scan, which no tool tried here takes over). The
  config's form is held by a schema and ajv where the core's packages are installed, and by the check's own checks of
  it where they are not (`scripts/schemas/licences.json`; #530, item 7).
