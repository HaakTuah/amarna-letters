# Codex's status after the environment tests

The owner made a legacy Codex cloud environment for each game and asked Codex, by `@codex` comment, to add a one-line
file, test and push (the games' test PRs, closed). In both, Codex built, tested and committed, but its checkout has no
git remote, so nothing reached GitHub; asking it to "update this PR" changed nothing. Its result reaches GitHub only
through a click in ChatGPT. The tasks ran on the default model at light effort, which the owner's general settings did
not change, and the full suites ran far slower than in Claude's cloud (Amarna's 54 minutes; Snakes' layout suite was
stopped after 17).

So Codex stays the reviewer and Claude builds: `modules/codex-building.md`, "Status", and the README's "Setting up
Codex" now say so. A server of the owner's, running Codex's command line, is what would change it.

Readings taken: none. Questions for the owner: none.
