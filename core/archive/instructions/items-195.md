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

196. **13 November 2026** (the core, the same chat as item 195). Told that the four improvements were merged, that both
     games now followed the releases, and that one step was left to the owner, cutting the first release, since the
     session could push no tag:

     > I need you to do everything, I won't be tagging commits. Also, couldn't you try it on windows with a .net
     > project? Is there anything else we should do? Are all rules grounded now, or is there anything more we can do?
     > […]

     Behind "The owner tags nothing by hand" in `AGENTS.md` and the workflow that cuts a release
     (`.github/workflows/release.yml`); and behind the starter kit's trial on Windows with a .NET project and the
     further checks for rules only discipline held, each in a PR of its own.

197. **13 November 2026** (the core, the same chat as item 195). Told that the session's own limits had refused it the
     start of the release workflow, as they had the push of a tag, so that the first release waited for the owner;
     that GitHub writes the name on the owner's profile into every merge it makes, which only an empty name on the
     profile ends; that the starter kit now set up Dependabot for a .NET project's packages while the core still had
     no licence check for them, the owner having said the same day that a project should prove one first (core issue
     143); and that floor rule 10's list for what ships left out licences a .NET project meets, Microsoft's public
     licence, PostgreSQL's, Boost's and Unicode's among them, which could be added, while the licences that carry
     conditions someone should read (LGPL, MPL, Microsoft's own terms, a paid component) stayed with the owner's yes
     each time:

     > Is there good reason we shouldn't do this in agent-core, expert?

     Told there was none that held: the check could be proven on real packages on GitHub's own machines, and "a
     project first" would spend another owner's usage on shared tooling.

     > Yes, I'd add all of them, expertly then.
     >
     > What steps do I need to do, I don't find them on agent-core github? My name will remain on my profile.

     Behind the six licences added to floor rule 10's list; the NuGet check built in the core, not in a project
     first; floor rule 11's exception for the name and address GitHub writes into a merge; and "the owner, or a
     session the owner tells" in `AGENTS.md`, "A release is cut on the owner's word".

198. **13 November 2026** (the core, the same chat as item 195). Told how a package gets past the licence check: by
     a licence on its list that a machine reads from the package itself; by the owner's yes, recorded with the
     owner's words, for one off its list; and, for a NuGet package whose manifest names no licence a machine can
     read, by a session reading the licence by hand and recording it in the audit, with nobody asked where what it
     read was on the list, so that a misreading would put a package into what ships unless a review caught it. And
     that the NuGet check started advisory in a project, saying what it would fail and passing, until the project
     turned that off. Put to the owner: whether a licence read by hand for a package that ships should need the owner's
     yes too, which closes that gap and stops a session more often; and whether the NuGet check should enforce from
     the first day and not after an advisory week, which this session would have kept.

     > I say yes to both

     Behind "and so does a package that ships under a licence only a reading by hand gives" in floor rule 10, which
     `scripts/nuget.mjs` holds; and behind the NuGet check failing from a project's first day, "advisory" left as a
     setting a project turns on while a fault of the check's own is mended. The second yes was read as a yes to
     the question as put, not to this session's "I would keep the week".
