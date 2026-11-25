# The reasons behind the core: issue #1134.4

The index, and how an item is written: `archive/instructions.md`.

#1134.4. **23 November 2026**, #1134, point 4. Floor rule 3's two security reviews are asked only of a change to what runs with power: a workflow with a write
     permission or a secret, an action, `.claude/` and an agent tool's own folder, and a script one of them runs or
     that calls GitHub, the network or `git push`, read from the repository by a script; any other change takes floor
     rule 8's one. Of 355 merges, 213 touched the set and 142 did not, and of the 51 pull requests where only the
     second security review blocked, 44 touched it, so most of what the second review caught stays. It stands behind
     the two security reviews of floor rule 3 in `floor/security.md`, "Floor rule 3's two" in `tasks/reviews.md`,
     point 3, and `scripts/power.mjs`.
     The owner asked for an audit of every review the rules ask for, to find what could be removed so the work
     costs less and goes faster, and agreed to the points as the issue sets them out.
