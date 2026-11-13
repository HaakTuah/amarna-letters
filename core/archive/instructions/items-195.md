# The owner's words behind the core: items 195 onward

How they are kept, and where each item lives: `archive/instructions.md`.

195. **13 November 2026** (the core, in a chat with a session the owner had asked what it made of the core and the two
     games; not the design session). Told that the core was mechanically sound and not yet stable, about thirty merged
     PRs a day; and that its size cap, raised eight times in a day, measured growth more than it limited it:

     > Isn't it glorious? But i think agent-core is in a pretty good state now? Do you see any rooms for
     > improvements? Agents can raise file caps, but if you saw, there are pretty strict criterias and checks. It is
     > an investment in a core for all my future repos. […]

     Told: that the criteria are strict about cutting a rule and none is as strict about adding one, so the cap can
     only rise; and four improvements, in this order. One, a gate at the door: every new rule names what went wrong or
     would without it and the check that holds it, and the rules nothing but discipline holds are looked at in the
     review of the core already set for 18 November. Two, releases: a project of another owner takes a version the
     core's owner cut on purpose, perhaps weekly, and not `main`, since a pure sync gets no review of its own there.
     Three, a starter kit: the files a new project needs as templates, written by a script, in place of most of the
     README's long paragraph on them. Four, the core measured as it has a game's features measured: what a merged PR
     of a project's own work costs, and the share of its PRs that are the core's upkeep, before the core and since.

     > Agreed! Do all of that expertly, expert!

     Behind "A new rule says what holds it" in `AGENTS.md` and the heading its check asks for
     (`.github/workflows/own-description.yml`); and behind the other three, each in a PR of its own.
