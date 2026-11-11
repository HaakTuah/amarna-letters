# One licence scan

Tonight's audit of both games against the core (the owner's words: `reports/2026-11-11-shared-checks.md`) found the
licence check whole in only one of them. Snakes' own scan (`tools/licences.js`) fails a PR that uses anything its audit
does not name: an action, a package fetched by npx or npm install, a font, image or sound, code copied in with someone's
notice. Amarna has no such scan: the core's check holds only its lockfile, so its workflows' seven actions, its 127
sounds rendered from two sample libraries, its icons and its map pictures are held to no list, and its notices credit
them by hand. Floor rule 10 asks the same of both (core archive 41: every package used free to use, and every update
too).

- **`scripts/licence-scan.mjs`:** Snakes' scan made general and wider, run by `licences.mjs` when a config has `"scan"`,
  with its command reader in a file of its own, `scripts/licence-commands.mjs`. It reads every tracked file (but what
  `skip` names and, in a project, its copy of the core) and needs:
  - every lockfile, and every `package.json` with dependencies, to be one the config's `lockfiles` checks;
  - an entry for every action but the owner's own and the project's;
  - an entry for every package npx, npm exec, npm install (by any spelling, after any options), npm link, npm pack, npm
    diff, npm cache add or npm publish fetches, at the exact version audited, from npm's own registry (a command naming
    another fails). This covers workflows, scripts and tools of any kind (TypeScript components, Dockerfiles, files with
    no extension, read by their `#!` line), every string of a JSON file but its prose (package.json's `scripts` and
    tools' hooks, tasks, launches), TOML files, YAML folded over lines, commands written as arrays, and the parts of
    pages and components that run (HTML, Vue, Svelte, Astro: script bodies, frontmatter, handlers and bound attributes,
    expressions; not their text). An install without its lockfile fails, as does a word after npm that is no npm command
    where npm stands as one. npx `--no-install` never fetches, so a bare name passes there. Any other fetch that cannot
    be read fails, but npm pack's and another fetcher's (curl, wget, pip, playwright install and the like). Each of
    those passes only in a file an entry's `files` names, as its hand audit;
  - an entry covering every script in a language it cannot read (Python and the like, by its extension or its `#!`
    line): the entries of what it uses, which ship if it does;
  - an entry covering every code file with a licence notice, and every font, image, sound, video, model, data or other
    binary file.

  What lies under `served` but not `tools` reaches users, so an entry covering it ships. A `files` path or a `"scan"`
  path that names no tracked file fails, so nothing is misspelt or outlives what it covered.
- **`scripts/licences.mjs`:** reads and checks `"scan"`: only its three keys, `served` always said (`[]` if nothing
  reaches users), each path written as git lists it, and an audit beside it. It adds the kind `own` with
  `LicenseRef-Owner` for the owner's own work, all rights reserved as floor rule 10 ends, and only for it. Such an
  entry names its files one by one, and never stands in for an action, a package or a file carrying someone's
  notice. The summary counts the files scanned. **`scripts/licences.d.mts`:** the new key.
- **The tests:** the check had no test here; Amarna tested its lists and readers in its own suite. Those come into
  `scripts/licences-test.mjs`, on invented names. `scripts/licence-scan-stage.mjs` writes a small project into a fresh
  temporary git repository for each case. On it, `scripts/licence-scan-test.mjs` checks that the project passes as it is
  and passes 34 allowed forms (two of them long lines, read in time), and fails 44 others for the reason each names: the
  licence lists, a lockfile's package, the owner's kind, copied code, assets and binaries, lockfiles left unchecked, an
  entry covering nothing, a bad `"scan"`. `scripts/licence-fetch-test.mjs` fails 203 forms of a fetch, each for its
  reason.
- **The core's own audit:** `.github/licences.json` and `.github/licences-audit.json` hold what the core's workflows and
  scripts use: four actions, CodeQL, the GitHub CLI, Node (which `scripts/node.sh` fetches) and npm. A project's scan
  leaves its copy of the core out, since this audit holds it, so the games stop listing the core's actions.
- **`.github/workflows/tests.yml`:** runs the test and the core's own audit. **`.github/workflows/licences.yml`:** its
  header names the scan. Both are changes to what runs by itself, so they get Codex's and the fallback reviewer's
  security reviews (floor rule 3). Neither gains a permission or an input.
- **`README.md`,** point 5: the licence check's audit, held whole by the scan.

Tested: the tests pass (8, 79 and 203 checks), and so does the core's own audit of its 95 files. Codex's review and the
fallback reviewer's found ways round the first versions: `package.json` scripts, hooks, tasks and launches, other
spellings and fetchers, an option's value hiding the command, another registry or npm config (by option or by npm config
set), npm update and npm audit fix, Windows' npx.cmd, a command nested in npx -c or named by its path or held in a
variable, -p=, npm exec's later packages, curl in a quoted command, arrays it cannot read, comments that hid commands,
folded YAML, tools' hooks in package.json, unread file kinds and #! lines, lockfiles left out, scripts of other
languages that ship, `own` covering too much or someone's notice, a shipped file covered by a tool's entry beside a
shipping one, a notice in commented JSON, --yes=true, a fetcher named by its path, a program held in a shell variable, a
redirection before the package, npm link, a tool's entry over a shipped file, a notice in code of a language it does not
run, two scripts read as one, npm's command written in pieces of a string, a variable after npm, a component's script
block, an install without its lockfile (by option, by a separate `false` or by environment), npm after variables set for
it, a runner with its options (`sudo -E`, `timeout 60`) or a path, a long line read too slowly, npm diff, cache add and
publish of a git package, a page's text read as code, a pattern open to catastrophic backtracking, a long assignment
hiding where npm stands, npx cross-env before npm, npm's options before its command, a remote tarball taken for a local
one, a commented-out script, a style block, an unquoted handler, a command too long to read, runner options in other
forms (`-Hu`, `--user`, `--signal`), `eval` and other runners, a string naming a closing tag, lockfile options before
npm's command, a quoted string too long to read hiding where npm stands, a page's structured data read as code, another
fetcher's options before its command, a page's tags read unlike HTML (a comment, a raw-text element, an end tag's or
another tag's value holding `<!--`, `<style>` or `<script`), npm cache, diff or publish with an argument held in a
variable, a quoted value that only looks like a comment or a redirection (`--cache '#x'`, `'foo #x'`), `#`, `>` or `|`
in an argument list, which no shell reads, an argument holding a space and a command's name (`'cache ci'`), and a
backslash of a string around the command taken for the shell's. Each is now closed and tested. A dry run on each game
with the new scripts:
- Snakes passes with its sync PR's side applied: its own scan cut to its game's checks, its test to theirs, and its
  audit to what no lockfile holds.
- Amarna passes with its sync PR's side applied: the audit, and its two `npx vitest` lines, which would fetch if
  nothing were installed, made `npx --no-install vitest`.

What changes in every project: nothing until its config adds `"scan"`. Its sync PR then adds it, with an audit entry
for each thing the scan finds. Snakes drops the half of its own scan that moved here, keeps its game's own checks (the
addresses the game loads, its notices, `sw.js`), and drops its audit's entries for the core's actions and for lockfile
packages the check already reads. Amarna gains an audit, its notices are written from that audit's entries, and its
suite drops the tests of the core's functions that moved here.

Readings taken: a hand audit (an entry's `files` naming a file, for npm pack's or another fetcher's fetches the scan
cannot read) covers the whole file, so a later fetch added to that file passes the scan; the review of that PR is what
sees it, as for any edit to an audit. A file with no extension is read as shell, so a prose file such as a bare
`LICENSE` naming an npm command would fail; a project skips it if it has one (neither game does). A licence notice in
any file but prose counts, so a `# Copyright` line in a workflow, or credits quoting a licence in a JSON or HTML file,
need an entry not the owner's (his own work carries none; credits belong in a prose file). In code, a string that is
only "npx" or "npm", not called with its arguments right there, fails, as does a shell variable set to only one of them
(with export, local, readonly and the like), and npx naming nothing to run where it is written ("npx -y" held for later,
$(command -v npx)), since the scan cannot follow any of them into the variable; nor can it follow a command the shell
builds as it runs (`npx${IFS}-y`, `n"p"x`, a string decoded or put together from variables), which the review of the PR
that adds it is what sees; a shell's own check that npx is there (`command -v npx` as a statement) and `npx --version`
pass. Where npm stands as a command (a line's start, after `;`, `&&` or `if`, or opening a string that opens a call or a
value, past variables set for it, a path and a runner, whose arguments are all taken as its own (`sudo -Hu root`,
`eval`, `flock FILE`, `npx cross-env`), read by one walk back over the line; a project's own wrapper (`retry npm "$X"`)
is not followed; a message opening a string with a word that also names a runner, `log("nice npm work")`, fails and is
reworded), a word after it that is no npm command fails, since it may be a variable or a string built in code: a message
that opens a call's string, `console.log("npm x")`, fails too and is reworded (neither game has one), while `echo "npm
x"` and a message mid-string pass. npx is held to more: any mention of it with a bare name fails, prose too (`echo "no
npx here"`), as before. A page or component is read so as to fail closed, not to match HTML's parser case by case: every
script element's tag and body wherever `<script` stands (in a comment, an attribute's value or a textarea too, and to
the file's end where it holds `<!--`), but a script of data or a template by its own type attribute (JSON-LD, an import
map, text/template); every handler and bound attribute anywhere; and, in Svelte, Vue and Astro, every expression in
braces, a style block's rules among them. Its other text runs nothing and is not read, so a page may show a command in
its text or in a comment, but a commented-out script, a style rule, a data block's text quoting a script, a script tag's
own attribute or an argument list's argument holding spaces, naming a fetch, fails. A command running on past 16 KB with
no end fails, since it cannot be read whole; npm named elsewhere, as in a message, is read 1 KB on, for a fetch it
names. Quotes in a shell line are followed both with and without backslash escapes, since a backslash may belong to a
string around the command, and a `#` or `>` there counts only where both readings put it outside; so an escaped quote in
a shell line before a real comment (`--cache \"a #c`) fails falsely. A wrapper that hands its own arguments to npm
(`exec npm "$@"`) fails, and no hand audit passes it, since what it fetches is chosen by its callers, whose calls the
scan cannot read. Lockfile packages need no audit entry, since the check reads each one's licence from the lockfile at
every version; Snakes' hand list of them repeated it. The owner's own work gets a kind of its own rather than a list of
folders the scan passes over, so every asset's origin stands in one place. Questions for the owner: none.
