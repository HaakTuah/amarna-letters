# What comes back from the test box

The fallback security review of Amarna Letters' sync to the core at `10a8da1` (its #871) found the earlier gaps closed
(`2026-11-10-test-box-gaps.md`) and three small ones left in `setup/server.md`, fixed here (core archive 132):

- **Files coming back from the box** could rewrite a script the host then runs, such as the core's sync script, where
  a sign-in is in reach. Now nothing comes back but the output and, for a command that adds or updates a package, the
  package list and lock file, which the agent checks before committing.
- **Plain `node` on the host** was held back by the instruction alone. Now the tools are installed as programs of their
  own, not through npm, so the agents' account needs no Node outside the box. There `node` is a wrapper into the box,
  like `npm` and `npx`, save for the core's sync script; and packages live only in the box. The instructions also name
  plain `node` and npm by its full path.
- **Codex's account:** the box user cannot read any agent's account, Codex's included.

What changes in every project: nothing until such a machine runs.

Readings taken: none. Questions for the owner: none.
