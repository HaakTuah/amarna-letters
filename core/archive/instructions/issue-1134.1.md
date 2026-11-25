# The reasons behind the core: issue #1134.1

The index, and how an item is written: `archive/instructions.md`.

#1134.1. **23 November 2026**, #1134, point 1. A later commit of a pull request's own that answers a blocking finding is
     checked again only by the reviewer that raised it, on that commit's diff alone, and every other review posted
     stands. A commit that touches no file of what runs with power (point 4) carries a security review that declared no
     blocking finding over it, as a merge from the default branch with no conflict does, proved by a script that reads
     the commit's paths, so no fallback check runs and no note is posted; a commit that touches one gets the security
     check on its diff. About 1,100 of the 1,675 review comments sessions posted on the 371 pull requests the core
     merged from 16 to 23 November 2026 checked a later commit rather than reviewing a first time. It stands behind "A
     fix is checked by its finding's reviewer; a light commit carries the security review" in `tasks/reviews.md`, point
     3, and `scripts/power.mjs`. The owner asked for an audit of every review the rules ask for, to find what could be
     removed so the work costs less and goes faster, and agreed to the points as the issue sets them out.
