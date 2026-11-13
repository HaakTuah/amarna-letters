# Setting up the machine where agents run side by side

Read only by whoever sets up the owner's machine for floor rule 18 (the owner, or a session he starts for it), once.

## The owner's checklist

1. **A Linux server of his own,** holding only the projects and what their agents need.
2. **Login by his SSH key only:** password and root login off, no other port open; the system's automatic security
   updates on.
3. **An account for the agents** (such as `agents`), not in the `sudo` group: its one `sudo` rule is the test box's
   (point 7). Everything below is installed and signed in under it, never under his own.
4. **Its tools,** each installed as a program of its own, not through npm: Git, Claude Code, and the tool that runs the
   agents side by side (such as Herdr). Node is installed on its own, without npm, and only behind the wrappers of point
   7.
5. **Its sign-ins, each with a spending limit:** Claude Code on his Claude plan, and a fine-grained GitHub token for the
   project repositories only, with Contents, Pull requests and Issues set to read and write and nothing else, kept in
   Git's credential store or `gh`'s login.
6. **Codex's part** (its command line or Claude Code's Codex plugin, its sign-in on his ChatGPT plan under a system
   account of its own, its effort) is written here when the machine is set up, after a test (core archive 122). That
   account gets the same instructions, `node`, `npm` and `npx` wrappers and box rule as the agents' account.
7. **The projects cloned** under that account, one folder each, and **the test box,** where every command that runs a
   project's code or packages runs (its install, build and tests, script games and simulations, the smoke test, a dev
   server, `npx`); only Git, `gh` and the core's sync script, which uses Node's own modules and Git alone, run outside
   it (floor rule 18). It is rootless Podman (or Docker) under a user of its own (such as `box`), which holds no sign-in
   and cannot read any agent's account, Codex's included, so even a way out of the container finds none. The agents'
   account hands it a copy of the clone without `.git`, through one `sudo` rule that runs the box's wrapper as that user
   and nothing else; the wrapper runs the command in a fresh container, with network only for installing packages,
   returns its output and removes the container. Nothing else comes back from the box, except, for a command that adds
   or updates a package, the project's package list and lock file, which the agent checks before committing; so no file
   the box wrote can run on the host. Packages live only in the box, and the clone on the host holds none. On the
   agents' account, `node`, `npm` and `npx` are wrappers that run them in the box, save the one command `node
   core/scripts/sync.mjs` (with a full SHA at most, and `NODE_OPTIONS` cleared), so no project script or package runs on
   the host by mistake and the instructions are not the only guard. Written and tested when the machine is set up.
8. **The agents' instructions** (below) copied to where each tool reads its own at the start of every session there:
   `~/.claude/CLAUDE.md` for Claude Code, and Codex's (such as `~/.codex/AGENTS.md`) once its part is written.
9. **Each project's orchestrator** started by him, in the tool, from that project's folder: Claude Code on Sonnet.

## The agents' instructions

Everything else the agents need is in the rules they already read; this holds only what this machine adds:

```markdown
# Where you run

You run on the machine floor rule 18 describes: your sign-ins are on it.

- Start sessions through Herdr, with its own command line and socket API: each in a pane and a clone of its own.
- Starting Claude Code, pass its model (`--model`), and its effort where its command line takes one.
- Run every command that runs a project's code or packages (its install, build and tests, script games and
  simulations, the smoke test, a dev server, `npx`) through the test box's wrapper, never directly, with plain `node`
  or with npm by its full path. Only Git, `gh` and the core's sync script run outside it; no package is ever installed
  on the host.
- GitHub works normally here (`git push`, `gh`); `modules/github-calls.md` is for cloud sessions only.
```
