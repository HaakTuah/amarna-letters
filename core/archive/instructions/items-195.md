# The reasons behind the core: items 195 to 207

The index, and how an item is written: `archive/instructions.md`.

195. **13 November 2026** (the core, chat with a session asked what it made of the core and the two games; not the
     design session). Asked: the owner raised whether the core was now in a pretty good state and where it could
     improve, noting that agents can raise file caps but that strict criteria and checks stand, and that the core is an
     investment for all the owner's future repositories. Decided: The session had said the core was mechanically sound
     and not yet stable, with about thirty merged PRs a day, and that its size cap, raised eight times in a day,
     measured growth more than it limited it, since the criteria are strict about cutting a rule and none is as strict
     about adding one, so the cap can only rise. The owner agreed to four improvements, in this order. One, a gate at
     the door: every new rule names what went wrong or would without it and the check that holds it, and the rules
     nothing but discipline holds are looked at in the review of the core already set for 18 November. Two, releases: a
     project of another owner takes a version the core's owner cut on purpose, perhaps weekly, and not `main`, since a
     pure sync gets no review of its own there. Three, a starter kit: the files a new project needs as templates,
     written by a script, in place of most of the README's long paragraph on them. Four, the core measured as a game's
     features are measured: what a merged PR of a project's own work costs, and the share of its PRs that are the core's
     upkeep, before the core and since. Behind: "A new rule says what holds it" in `AGENTS.md` and the heading its check
     asks for (`.github/workflows/own-description.yml`); and the other three, each in a PR of its own.

196. **13 November 2026** (the core, the same chat as item 195). Asked: the session reported that the four improvements
     were merged, that both games now followed the releases, and that one step was left to the owner, cutting the first
     release, since the session could push no tag. Decided: The owner will not tag commits and wanted the session to do
     everything. The owner also asked whether it could be tried on Windows with a .NET project, whether anything else
     should be done, and whether all rules were now grounded or more could be done. Behind: "The owner tags nothing by
     hand" in `AGENTS.md` and the workflow that cuts a release (`.github/workflows/release.yml`); and the starter kit's
     trial on Windows with a .NET project and the further checks for rules only discipline held, each in a PR of its
     own.

197. **13 November 2026** (the core, the same chat as item 195). Asked: whether there was good reason not to build the
     .NET licence check in the core. The session had reported that its own limits refused it the start of the release
     workflow, as they had the push of a tag, so the first release waited for the owner; that GitHub writes the name on
     the owner's profile into every merge it makes, which only an empty name on the profile ends; that the starter kit
     now set up Dependabot for a .NET project's packages while the core still had no licence check for them, the owner
     having said the same day that a project should prove one first (core issue 143); and that floor rule 10's list for
     what ships left out licences a .NET project meets (Microsoft's public licence, PostgreSQL's, Boost's and Unicode's
     among them), which could be added, while licences that carry conditions someone should read (LGPL, MPL, Microsoft's
     own terms, a paid component) stayed with the owner's yes each time. Decided: The session found no reason that held:
     the check could be proven on real packages on GitHub's own machines, and proving it in a project first would spend
     a project's own resources on shared tooling. The owner agreed to add all of the licences. The owner also asked what
     steps the owner has to take for the release, which the owner could not find on the core's GitHub page, and said the
     name on the owner's profile will remain. Behind: the six licences added to floor rule 10's list; the NuGet check
     built in the core, not in a project first; floor rule 11's exception for the name and address GitHub writes into a
     merge; and "the owner, or a session the owner tells" in `AGENTS.md`, "A release is cut on the owner's word".

198. **13 November 2026** (the core, the same chat as item 195). Asked: two questions. A package gets past the licence
     check by a licence on its list that a machine reads from the package itself; by the owner's yes, recorded with the
     owner's words, for one off its list; and, for a NuGet package whose manifest names no licence a machine can read,
     by a session reading the licence by hand and recording it in the audit, with nobody asked where what it read was on
     the list, so that a misreading would put a package into what ships unless a review caught it. The NuGet check also
     started advisory in a project, saying what it would fail and passing, until the project turned that off. The
     questions: whether a licence read by hand for a package that ships should need the owner's yes too, which closes
     that gap and stops a session more often; and whether the NuGet check should enforce from the first day and not
     after an advisory week, which the session would have kept. Decided: The owner agreed to both. The second yes was
     read as a yes to the question as put, not to the session's own view to keep the week. Behind: "and so does a
     package that ships under a licence only a reading by hand gives" in floor rule 10, which `scripts/nuget.mjs` holds;
     and the NuGet check failing from a project's first day, "advisory" left as a setting a project turns on while a
     fault of the check's own is mended.

199. **13 November 2026** (the core and both games, chat with a session asked how the work went, whether it had
     questions and how the stand-in was doing). Asked: yes or no to three looks the stand-in was unsure of, and whether
     to keep that reading. The session had told the owner that the stand-in had answered ideas once in each project, on
     12 November, eighteen verdicts in all, ten of them sure; that the owner had answered none of them, and nothing
     recorded whether it was right, its record having gone with the weekly measuring check on 10 November; that ideas
     filed in the week before it was called got no verdict, though its rule asks one on every open idea; that a "later"
     waiting on a measurement was not looked at again once the measurement came; and that builders seldom said they had
     asked it, one PR taking on its own a reading against an answer of the owner's of 6 November. Decided: The owner
     agreed to all of it, read as a yes to each look, to keeping the reading, and to closing each gap named. Behind:
     `modules/inbox.md`: the stand-in's verdict on every open idea however new, and again on a "later" once its
     condition is measured, as `scripts/stand-in-record.mjs --open` lists them; a reading departing from an owner's
     answer given by the stand-in and listed with that answer's date; and "Its record", which the same script counts at
     each review of the core (`AGENTS.md`, "The core is measured as a feature is").

200. **13 November 2026** (the core, the same chat as item 199). Asked: the session showed an orchestrator's own account
     of a lane it called alive at one check, from a status line, while its branch had had no push for two hours, which
     then sat idle for nine. It told the owner that the orchestrator's model, set as Sonnet being enough, was the one
     seat nothing reviews, and offered Opus there, a script for the stall check, a wake set once rather than each turn,
     and an end to a false alarm of unpushed commits. The owner had said that Sonnet, at high, had stopped fully up at
     least twice in the couple of days it had been given this position. The owner agreed to the offers and asked whether
     a script would spam whenever the owner runs out of usage, or tell the owner's orchestrators to stop to save usage,
     what the recommendation should be, and whether to run Opus on high or keep Sonnet on high or extra with the script
     to keep it in line. Decided: The recommendation was Opus at high, with the script; nothing stops to save usage; and
     a lane handed over once, then to another provider, or else waiting and tried once a day, is named to the owner
     once, so that no wake repeats it. This was read as a yes to Opus at high, the session's recommendation when the
     owner asked which. Behind: the orchestrator's row in `modules/claude.md` and its line in `setup/server.md`; and, in
     `modules/orchestrating.md`, the hourly wake set once as a repeat, its clone on `main`, and "A stalled lane" found
     by `scripts/stalled.mjs` and handed over once.

201. **13 November 2026** (the core, handed to its design session in a message: the brief of an outside session that had
     audited the core at release-2 that day, which the owner had gone through point by point). Asked: the owner answered
     each section of the brief in turn. On section 0, that nothing may lock another owner's project (what the brief said
     of that project here was not so, and is taken out: item 202). On section 1, three ideas: an account of the agents'
     own, GitHub enforcing the owner's yes, and only the owner cutting a release. On section 2, that the personal-terms
     check reads every commit, the owner asking whether a private repository pays for it. On sections 3 to 7: no
     gendered pronoun for the owner in new text; the owner's own projects follow the releases; the copy compared by
     git's object ids; tests for the sync scripts; the workflows' shell in tested scripts. On sections 8 to 12: the
     core's own repository; reading and size; .NET; games served by GitHub Pages; extra checks and a stop switch. And,
     on the two the brief had only explained: the security-review check warning where it cannot read Codex's summary,
     and a project that follows the releases taking a commit that is no release only through a review. Decided: On
     section 0, the owner asked for a guarantee that nothing of this will stun lock the owner's projects. On section 1,
     the three ideas are filed as three issues; the owner might do them, but not right now. On section 2, the owner
     agreed if the test is quick, since the owner does not want much overhead, and asked whether a private repository
     spends action points on such checks, and if so wanted it made an opt-in so that a private project does not pay
     for it. The session answered that the scan adds seconds inside the job that already runs and no billed
     minute, so it is on for every project. On failing where the secret `PERSONAL_TERMS` is missing, the owner decided
     it must be optional. The owner agreed to sections 3 to 7, to all in "agent-core itself", to all in "Reading and
     size", to "Games" and to all in "Extra". The owner agreed to all in the .NET section with a condition: the point on
     branch protection and secret scanning for a private repository must not stun lock the owner's work if it is not set
     up on the owner's end. The owner agreed to both of the two the brief had only explained. With it: section 0 first,
     every later PR keeping its test green; never a release cut by a session, the owner told when one is ready. Behind:
     in `AGENTS.md`, "Nothing locks another owner's project", held by `scripts/upgrade-test.mjs`; and each section's own
     change, in the PR that cites this item.
     Changed by: 202.

202. **14 November 2026** (the core, chat with the outside session of item 201, which the owner had asked to audit what
     that item built, at d76174c, and then to fix what it found). Asked: the session reported that every section was
     built and checked, and four things were left: the personal-terms check failing a commit whose author or committer
     holds a term, which fails every pull request where the machine that commits writes a listed name into each commit
     (the sync to the next release among them) while the upgrade test, its projects committing as "t", did not see it; a
     commit dated before 2 November 2026 read by no per-commit check, though a commit's date is whatever its maker
     writes; `core.yml` keeping, of the core's reports, one whose name git quotes, which the copy leaves out; and the
     upgrade test starting from the previous release alone, while a project that missed a release jumps two. The owner
     also asked, later, how the check should treat a listed name that a machine's git writes into each commit, and
     whether it would block the owner's own account. Decided: The owner agreed to make all of the fixes, big and small.
     Item 201 had described a project of another owner from what the brief said of it, which was incorrect, so the
     owner had that description removed. The first fix reported such a name in a private repository and failed it in a
     public one; Codex's security review and the fallback reviewer each found that it broke floor rule 11 and the threat
     model, in which everything counts as public. The session answered that the agents commit as Claude or under the
     login, and that GitHub's own merges are excepted, but that an edit or a suggestion committed on github.com carries
     the profile's name and is not, and that this would be excepted too. Of two answers offered, the owner chose to
     block, self-fixing. Behind: in `.github/workflows/personal-terms.yml`, such a name failed in every repository, the
     failure saying how the session mends the pull request itself (git's name in the repository set to the login, its
     commits rewritten), every commit GitHub itself makes and signs excepted, not only a merge, as floor rule 11 now
     says, and no commit left out by its date; `AGENTS.md`'s "Nothing locks another owner's project", its one exception
     that mend; a sync note, and `README.md`, "Setting up (the owner's part)", on git's own name on each machine; in
     `.github/workflows/core.yml`, the reports left out by the pin's tree's own entry; in `scripts/upgrade-test.mjs`, a
     start from each of the last two releases, its private project's commits made under a listed name and its sync
     mended so; and in item 201, that description taken out, the one change to a dated record here, on the owner's word.
     Changes: 201.

203. **14 November 2026** (the core, the same chat as item 202). Asked: while the fixes of item 202 were under way, why
     secondary security reviews are needed, and whether they only waste usage; then, once the session quoted a cheaper
     option, what its recommendation was. Floor rule 3 asks a second security review of every change to what runs by
     itself or with credentials. One cheaper option was to keep two only for workflows that can write or hold secrets
     and one for read-only checks. Decided: The recommendation was to keep two: a read-only check guards, and a fault in
     one either stops it guarding or fails every project's pull requests; on `core.yml`'s check of the copy, read-only,
     the second reviewer found three faults where Codex's review found none; the core's workflows reach every project;
     and about a third of the core's pull requests since 1 November changed a workflow. Those reviews had caught real
     faults in the fixes. The one cut endorsed: a change of comments and steps' names alone, proven so by a script,
     passes one security review. The owner agreed to that. Behind: floor rule 3, such a change passing rule 8's one, as
     `scripts/comment-only.mjs`, run from the core's `main` on the head that merges, proves of the files it reads, the
     session saying of each other file changed why it runs neither by itself nor with credentials; `modules/reviews.md`,
     point 3, the "Security review:" comment giving what it printed and that word, which the code reviewer checks.

204. **14 November 2026** (the core, design chat). Asked: whether a planned project, which is only ever added to, could
     be played from its first stage on, unlike Amarna, which was built toward its finished form; and whether the core
     should say that each stage of a build ends in a game someone can play from start to finish and enjoy, a feature
     making sense only once later ones exist waiting for them. Decided: The owner confirmed that, unlike Amarna, the
     planned project is only added to. Amarna still does not feel like a game, which the owner wants to get better at:
     MVPs and stages that feel playable. With Amarna the owner was trying to get to the end station, which was a
     mistake, but the owner still wants to see it through. To the second question the owner agreed, but said the bigger
     problem is the UI in Amarna right now: it is a mess, and no one can play a game this complex when the screen does
     not show what is going on. Behind: "Every stage is a game" in `modules/game-design.md`, and the glance in its
     "Readable by every player"; a first playable slice of Amarna, and its screen, were taken up in Amarna.

205. **14 November 2026** (the core, design chat, the same as item 204). Asked: whether the rules about playability must
     apply equally to what a model seat sees in any game. The session had told the owner how a game's screen would be
     rebuilt so that a person sees at a glance what happened, what waits, what can be done and whether they are winning,
     in Amarna's case from Civilization's turn and Paradox's clock with the delay of orders and news its own. Decided:
     The owner proposed that these rules about playability apply equally to what a model seat sees in any game: all
     players must play on as equal terms as possible when it comes to readability of the game. Behind: the computer
     players in "Readable by every player" in `modules/game-design.md`: what they are shown tells them what the screen
     tells a person, as plainly and in the same order.

206. **14 November 2026** (the core, design chat). Asked: why a pure sync of a project waited for a security review
     although the core's own pull request had passed both of its reviews, the owner first remembering that Codex does
     not have that level of customization, so it was all or none, and that when a review is already being run there is
     no use in not waiting to see if it finds something, a rule the owner believed already written. Decided: The session
     confirmed it was floor rule 8's wait for a security review that starts by itself, and said it had just merged a
     pull request past a code review it had asked for that was still running. The owner said that ideally merging would
     be blocked before reviews are finished, but one must make sure it does not bottleneck if a reviewer goes wrong or
     runs out of usage. The session answered that the security review already had such a check, `security-review`,
     advisory for its first week and with the fallback reviewer taking over a review not begun in about 5 minutes or
     finished in about 30, and that a code review had none. Behind: "A review already running is waited for" in
     `modules/reviews.md` and the status `code-review` beside `security-review` (`scripts/code-review-wait.mjs`): it
     waits only while Codex's code review runs on the head commit, and a code review of that commit posted by the
     reviewer that took it over ends the wait.

207. **14 November 2026** (the core, chat with the session that fixed the bugs a review of the core's checks found, pull
     request #233). Asked: whether a thing a project already held should fail or be reported first. The personal-terms,
     NuGet and comment-only checks now read what they had missed, so a project that changed nothing of its own could
     fail on what it already held. Decided: What a project already held before these checks read more is reported, not
     failed. The one exception: a listed personal term fails, and the failure says how the session takes it out. Behind:
     "What a project held before a check read more is reported" and its one exception in "Nothing locks another owner's
     project" in `AGENTS.md`: the NuGet check reports, and passes, a second content hash, a `.user` file and a tool a
     lock file also names where the project held them as they stand (`scripts/nuget.mjs`, `scripts/nuget-fetch.mjs`),
     and every failure of `personal-terms.yml` says how the session takes the term out.
