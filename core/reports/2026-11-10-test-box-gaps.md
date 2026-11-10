# The test box's gaps

The fallback security review of Amarna Letters' sync to the core at `cecbe3b` (its #871) found the test box
(`2026-11-10-test-box.md`) closing the path Codex named, and three gaps left in `setup/server.md`, which a finding in a
PR's own change keeps from merging until fixed (floor rule 9 in `floor/topics.md`; core archive 129):

- **Only install, build and test went through the box;** script games, the smoke test, a dev server and `npx` also run
  a project's packages. Now every command that runs a project's code or packages goes through it; only Git, `gh` and
  the core's sync script (Node's own modules and Git alone) run outside.
- **The instructions reached only Claude,** though Codex runs the tests too. Now they go where each tool reads its own,
  and Codex's account gets the same wrappers and box rule.
- **Only an instruction made the agents use the box.** Now the box runs under a user of its own, which holds no sign-in
  and cannot read the agents' account; it gets the clone without `.git`, through one `sudo` rule for its wrapper alone;
  and `npm` and `npx` on the agents' account are wrappers into it.

The floor is unchanged: rule 18 already says project code runs where no sign-in can be read; the guide now says it for
every such command and every agent.

What changes in every project: nothing until such a machine runs.

Readings taken: none. Questions for the owner: none.
