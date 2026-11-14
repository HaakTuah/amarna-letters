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

199. **13 November 2026** (the core and both games, in a chat with a session the owner had asked how the work went,
     whether it had questions and how the stand-in was doing). Told that the stand-in had answered ideas once in each
     project, on 12 November, eighteen verdicts in all, ten of them sure; that the owner had answered none of them,
     and nothing recorded whether it was right, its record having gone with the weekly measuring check on 10
     November; that ideas filed in the week before it was called got no verdict, though its rule asks one on every
     open idea; that a "later" waiting on a measurement was not looked at again once the measurement came; and that
     builders seldom said they had asked it, one PR taking on its own a reading against an answer of the owner's of 6
     November. Asked yes or no to three looks the stand-in was unsure of, and whether to keep that reading:

     > I concur with all, expertly!

     Read as a yes to each look, to keeping the reading, and to closing each gap named. Behind, in `modules/inbox.md`:
     the stand-in's verdict on every open idea however new, and again on a "later" once its condition is measured, as
     `scripts/stand-in-record.mjs --open` lists them; a reading departing from an owner's answer given by the stand-in
     and listed with that answer's date; and "Its record", which the same script counts at each review of the core
     (`AGENTS.md`, "The core is measured as a feature is").

200. **13 November 2026** (the core, the same chat as item 199). Shown an orchestrator's own account of a lane it
     called alive at one check, from a status line, while its branch had had no push for two hours, which then sat idle
     for nine; told that the orchestrator's model, set as "Sonnet is enough", was the one seat nothing reviews, and
     offered Opus there, a script for the stall check, a wake set once rather than each turn, and an end to a false
     alarm of unpushed commits, the owner had said that Sonnet, at high, had "stopped fully up at least twice for the
     couple of days we have given it this position". Then:

     > Agreed, expertly! But would a script spam whenever I run out of usage, or tell my orchestrators to stop up to
     > save usage, expert? What should our recommendation be? Opus on high? Or should we keep sonnet on high/extra, with
     > the script to keep it in line, expert?

     Answered: Opus at high, with the script; nothing stops to save usage; and a lane handed over once, then to
     another provider, or else waiting and tried once a day, named to the owner once, so that no wake repeats it.
     Behind the orchestrator's row in `modules/claude.md` and its line in `setup/server.md`; and, in
     `modules/orchestrating.md`, the hourly wake set once as a repeat, its clone on `main`, and "A stalled lane" found by
     `scripts/stalled.mjs` and handed over once. Read as a yes to Opus at high, the session's recommendation when he
     asked which.

201. **13 November 2026** (the core, handed to its design session in a message of the owner's: the brief of an outside
     session that had audited the core at release-2 that day, which the owner had gone through point by point, the
     owner's word quoted under each section). On section 0, that nothing may lock another owner's project (what the
     brief said of that project here was not so, and is taken out: core archive 202):

     > Guarantee me nothing of this will stun lock […]

     On section 1, three ideas (an account of the agents' own, GitHub enforcing the owner's yes, only the owner cutting
     a release):

     > File as 3 ideas in issues. Might do it, but not right now.

     On section 2, that the personal-terms check reads every commit, the owner asking whether a private repository pays
     for it:

     > Agreed, if the test is quick. Don't want to add too much overhead. […] private repo, so […] spends action points
     > on such checks, no, expert? If so, make it an opt-in, so […] doesn't go broke over it, when [the] repo is private
     > anyways.

     Answered that the scan adds seconds inside the job that already runs and no billed minute, so it is on for every
     project; and on failing where the secret `PERSONAL_TERMS` is missing:

     > No, must be optional.

     On sections 3 to 7 (no "he" or "his" for the owner in new text; the owner's own projects follow the releases; the
     copy compared by git's object ids; tests for the sync scripts; the workflows' shell in tested scripts), each:

     > Agreed.

     On sections 8, 9, 10, 11 and 12 (the core's own repository; reading and size; .NET; games served by GitHub Pages;
     extra checks and a stop switch):

     > Agreed to all in 'agent-core itself'.

     > Agreed to all in 'Reading and size'.

     > Agreed to all in '.NET and […] project', but 'Branch protection and secret scanning for […] private repo' I
     > don't want this to stun lock […] work if this isn't set-up on […] end

     > Agreed on 'Games'.

     > Agreed to all in 'Extra'.

     And, handing it over, on the two the brief had only explained (the security-review check warning where it cannot
     read Codex's summary; a project that follows the releases taking a commit that is no release only through a
     review):

     > Yes to A and B.

     With it: section 0 first, every later PR keeping its test green; never a release cut by a session, the owner
     told when one is ready. Behind, in `AGENTS.md`: "Nothing locks another owner's project", held by
     `scripts/upgrade-test.mjs`; and each section's own change, in the PR that cites this item.

202. **14 November 2026** (the core, in a chat with the outside session of item 201, which the owner had asked to audit
     what that item built, at d76174c, and then to fix what it found). Told that every section was built and checked,
     and of four things left: the personal-terms check failing a commit whose author or committer holds a term, which
     fails every pull request where the machine that commits writes a listed name into each commit, the sync to the
     next release among them, while the upgrade test, its projects committing as "t", did not see it; a commit dated
     before 2 November 2026 read by no per-commit check, though a commit's date is whatever its maker writes;
     `core.yml` keeping, of the core's reports, one whose name git quotes, which the copy leaves out; and the upgrade
     test starting from the previous release alone, while a project that missed a release jumps two:

     > Make all of the fixes, big and small, expertly!

     Told that item 201 described the project of another owner, from what the brief had said of it:

     > This is incorrect information, remove it

     The fix first built reported such a name in a private repository and failed it in a public one; Codex's security
     review and the fallback reviewer each found that it broke floor rule 11 and the threat model ("everything counts as
     public"). Asked how the check should treat a listed name that a machine's git writes into each commit, the owner
     first asked:

     > But my account has my name, will this block me too now, expert?

     Told that the agents commit as Claude or under the login, and that GitHub's own merges are excepted, but that an
     edit or a suggestion committed on github.com carries the profile's name and is not, and that this would be
     excepted too, the owner chose, of two answers offered, "Block, self-fixing".

     Behind: in `.github/workflows/personal-terms.yml`, such a name failed in every repository, the failure saying how
     the session mends the pull request itself (git's name in the repository set to the login, its commits rewritten),
     every commit GitHub itself makes and signs excepted, not only a merge, as floor rule 11 now says, and no commit
     left out by its date; `AGENTS.md`'s "Nothing locks another owner's project", its one exception that mend; a sync
     note, and `README.md`, "Setting up (the owner's part)", on git's own name on each machine; in
     `.github/workflows/core.yml`, the reports left out by the pin's tree's own entry; in `scripts/upgrade-test.mjs`, a
     start from each of the last two releases, its private project's commits made under a listed name and its sync
     mended so; and in item 201, that description taken out, the one change to a dated record here, on the owner's
     word.

203. **14 November 2026** (the core, the same chat as item 202). While the fixes of item 202 were under way, the owner
     asked:

     > Why do we need secondary security reviews? Are we trying to waste usage?

     Told that floor rule 3 asks a second security review of every change to what runs by itself or with credentials,
     that those reviews had caught real faults in the fixes, and that one cheaper option was to keep two only for
     workflows that can write or hold secrets and one for read-only checks, the owner quoted that option and asked:

     > What is your expert recommendation?

     Told to keep two: a read-only check guards, and a fault in one either stops it guarding or fails every project's
     pull requests; on `core.yml`'s check of the copy, read-only, the second reviewer found three faults where Codex's
     review found none; the core's workflows reach every project; and about a third of the core's pull requests since
     1 November changed a workflow. The one cut endorsed: a change of comments and steps' names alone, proven so by a
     script, passes one security review. The owner answered:

     > Agreed, expertly!

     Behind: floor rule 3, such a change passing rule 8's one, as `scripts/comment-only.mjs`, run from the core's
     `main` on the head that merges, proves of the files it reads, the session saying of each other file changed why
     it runs neither by itself nor with credentials; `modules/reviews.md`, point 3, the "Security review:" comment
     giving what it printed and that word, which the code reviewer checks.

204. **14 November 2026** (the core, in the design chat). Told, of a new game being designed that is only ever added
     to, that it could be played from its first stage on, unlike Amarna, which was built toward its finished form:

     > Yes, unlike amarna, this is a game that you only add to. Amarna still doesn't feel like a game. Something I
     > should get better at. Mvps and stages that feel playable. With amarna, I am trying to get to the end station,
     > and that was a mistake. But I still want to see it through. This game is inherently limited by scope at the
     > core, but can have lots of fun additions around. And is maybe the easiest game to actually get someone else to
     > play with me and the models.

     Asked whether the core should say that each stage of a build ends in a game someone can play from start to finish
     and enjoy, a feature that makes sense only once later ones exist waiting for them:

     > Yes. But the bigger problem is the ui in amarna right now. It is a mess. No way you can play a game this
     > complex when you can't even tell what is going on on the screen.

     Behind "Every stage is a game" in `modules/game-design.md`, and the glance in its "Readable by every player"; a
     first playable slice of Amarna, and its screen, were taken up in Amarna.

205. **14 November 2026** (the core, in the design chat, the same as item 204). Told how a game's screen would be
     rebuilt so that a person sees at a glance what happened, what waits, what can be done and whether they are winning,
     in Amarna's case from Civilization's turn and Paradox's clock with the delay of orders and news its own:

     > These rules about playability must all equally apply to what a model seat sees in any game. All players must
     > play on as equal terms when it comes to readability of the game, as possible. Agreed, expert?

     Behind the computer players in "Readable by every player" in `modules/game-design.md`: what they are shown tells
     them what the screen tells a person, as plainly and in the same order.
