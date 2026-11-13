# The owner's words behind the core: items 157 onward

How they are kept, and where each item lives: `archive/instructions.md`.

157. **12 November 2026** (the core, in the design chat), of the project of another owner, a product that is sold:
     told that a product for sale needs its seller's name somewhere, that the floor let no name into a repository
     but the GitHub account in its address, so that the build would have to take the name from outside, and that he
     could instead allow a company's name there:

     > He has a company name, yes.

     Behind the second exception of floor rule 11: the company name a project is sold under, naming no person.

158. **12 November 2026** (the core, in the design chat), of the same project, whose owner had a third provider's
     tool on his computer, one its terms keep out of Claude Code:

     > […] has also installed antigravity on his computer. Since the terms forbids integrating it into claude code,
     > he might rely on it as a fallback for further development when he is out of usage for claude code. Is
     > agent-core right now permissive for development with other tools? It must not inhibt development with another
     > tool/provider, expert. But we still want it to work the same as now, expertly. Thoughts?

     Behind the end of "Another provider builds" (`modules/roles.md`) and the two lines of
     `modules/other-builders.md` on the brief and the pull request.

159. **12 November 2026** (the core, in the design chat). First, of how a project learns that the core has moved,
     and of what sessions meet in the core's own rules, hooks and checks:

     > Should it be a github triggered script instead that makes the pr for new agent-core versions?

     > Should there be something in agent-core about reporting to issues in agent-core repo, any bugs or suggestions
     > from what is run into by agents, so i automatically get feedback what might not work or could he improved,
     > also from his sessions, expert?

     Advised against a workflow that opens the pull request (it would get no checks without a stored token, and
     would be the first workflow able to write code), and for one that only keeps an issue open while the core is
     ahead; and that sessions of another owner's private project report through that project's own inbox, since the
     core's repository is public. His answer:

     > Yes, expertly to 2. And on 1, I will never get most of those reports, if that is how you envision it. I see no
     > issue in him commenting on my repo? But you are right about sensitive details what if there are rigid
     > guidelines to ensure only bugs reports, feature suggestions, or questions that the light of day can take, ends
     > up there. And if.there is anything else, it goes into the that secret report for a repo? People can report
     > exploits and such to me via a different tab, no, that others don't see, expert? What is your take?

     > Is it clear to a session, the nature of what the core folder in a project is, and that it comes from
     > externally, expert? Should it be?

     Behind "The core itself" in `modules/inbox.md`, "Reporting to the core" in `README.md` with the three issue
     forms, and the core-moved workflow.

160. **12 November 2026** (the core, in the design chat), of the table of models, which gave the orchestrator Sonnet
     at high:

     > Maybe orchestrator should say opus or Sonnet? […] runs it on opus, i believe, and it is the one instance that
     > a human starts, so dictating it to the agents doesn't make much sense at all? Should it just say so, expert?

     Behind the orchestrator's row in `modules/claude.md`: the owner starts it, at the model and effort he chooses;
     Sonnet is enough, since it builds nothing itself (item 27).

161. **12 November 2026** (the core, in the design chat), of a project's own rules beside the core's:

     > Do we allow extensions and overrides of the rules, in any implementing repo, clearly? Should we, in your expert
     > opinion, expert?

     Told that a project may fill slots, pick modules, add rules of its own and add to the floor, that it may never
     loosen the floor, and that nothing said which holds where its own rule and one rule of a module disagree; and
     advised a short list of differences in its manifest, each naming the core's rule, what holds in its place and
     why, never of the floor or the review guidelines, checked by the pointer check and reported to the core:

     > agreed on everything else, expertly!

     Behind "A project's own rules add to the core's" in `modules/how-to-work.md`, point 7 of "How a project takes
     the core" in `README.md`, and the step of `core.yml` that fails a difference from the floor or the review
     guidelines.

162. **12 November 2026** (the core, in the design chat), of the project of item 154, whose Codex usage before it took
     the core had been almost wholly sessions Claude started; told that the core gave another provider's builder
     first what a check proves right without judgement, and left the rest with Claude's:

     > I noticed […] setups used only codex subsessions for 94% of codex's usage, prior to incorporating agent-core.
     > Will his setup now utilize it more fully? I suspect subsessions only were reviews? Your expert take?

     > It was supposed to save on Claude usage by pushing all work suited to any other provider first…

     Behind "Another provider builds first" in `modules/roles.md` (every task or part a brief can carry and a check or
     its review can judge, where the owner set it up for the project) and the end of "Work continuously, other
     providers first" in `modules/claude.md`.

163. **12 November 2026** (the core, in the design chat), of "Another provider builds first" (item 162) and of the
     project of item 154, whose owner pastes no further word of this chat into his sessions:

     > Important that this is only if Claude is the orchestrator, doesn't prohibit other kinds of work

     > Check thoroughly for other contradictions and for cohesion across the board!

     > […] won't reprompt, so I hope this all gets fixed with new imports of core.

     Behind "Where Claude's sessions hand out work, another provider builds first" in `modules/roles.md` and the
     orchestrator's own line of it in `modules/orchestrating.md`; `setup/sync-notes.md`, what a sync asks of a project
     beyond the copy, which the sync script prints and an orchestrator gives a lane; and the audit's fixes of the
     same pull request.

164. **12 November 2026** (the core, in the design chat), to what the day's audit left for him. Put to him: four
     wordings of the floor (his word passed on "word for word" against "nothing personal in any brief"; "open an
     issue" in "Reporting a weakness" against "an agent never"; "the changes rule 3 names" in rule 14, which could
     read as every protected file; "costs money", which could read as every push to a private repository), the cap
     raised by 1 KB for the dozen fixes that waited for room, the orchestrator's next session kept at the merge, and
     three questions left from earlier in the day: whether each pull request should say what its session cost,
     whether agents may file private weakness reports themselves, and whether "He has a company name, yes" (item 157)
     had been his yes to the company's name in floor rule 11.

     > Yes, expertly to everything, then breakdown everything you did, expert!

     Behind the four floor wordings (rules 4 and 14 in `floor/security.md`; rule 9 and "Reporting a weakness" in
     `floor/topics.md`), the cap of 45 KB (`scripts/size.mjs`), the fixes of the same pull request, the last line of
     "Work from main" in `modules/git.md` with `scripts/session-cost.mjs`, and his yes, now said, to floor rule 11's
     second exception.

165. **12 November 2026** (the core, in the design chat), asked whether the core should be a package a project
     installs and whether anything more would make it better. Advised: no package, since every reader of the rules
     (Claude Code's imports, another provider's reviewer on GitHub, another tool) reads the repository's own files and
     installs nothing, and the hooks run the copy that was reviewed; instead a slimmer copy that leaves the dated
     reports in the core alone, syncs made once for several changes, a trimming pass over the modules since the cap
     was full, and the day's small leftovers (a clause in floor rule 14 for rule 3's case of a project with no trusted
     builder, "where one answers", a pointer check on the core's own files); NuGet in the licence check and the
     queued checks left until a project's real use reports back.

     > Please do all of it expertly, if you so advice, expert!

     Behind `/reports export-ignore` in `.gitattributes` with `core.yml` and `scripts/pure-sync.mjs` comparing a copy
     without that folder, the trims of the same pull request, "or leaves to him" in floor rule 14, and
     `scripts/pointers.mjs --core` in the tests workflow.


166. **12 November 2026** (the core, in the design chat), on the stand-in in a project of another owner, whose copy
     carries the core's archive: the first wording (the same day) kept its stand-in from the core's archive
     altogether. Answered: not opt-in, which would need that project's owner to say so, but searched by default, his
     own words first, and an answer that rests on the core's archive alone marked unsure, so he sees it first and
     can overrule it.

     > Don't I answer fairly logically though? […] Should it be opt-in instead whether it also looks to core's archive
     > for past decisions, or will they not make sense anyhow for his project? I think some general principles in
     > engineering and software design stands regardless, expert?

     Behind "and one resting only on the core's archive where the core's owner is another" in `modules/inbox.md`,
     "The stand-in".

167. **12 November 2026** (the core, in the design chat), on each project's own tests running again on a sync of the
     copy, which changes no line of the project and whose scripts the core tested before it merged. Answered: the
     rule stands already ("Nothing is reviewed twice", floor rule 8; a test "runs only where a change can affect it",
     core archive 9); what did not follow it was each project's own suites on a sync. Not all of it goes: the
     project's checks of its own files against the new copy, and a branch brought up to date, test what nothing
     tested before.

     > But yes, should we have rules not to run any tests like that on anything already tested? Duplication of tests
     > and reviews takes resources and time, and should ideally be entirely eliminated, no, expert?

     and, to that answer:

     > Yes, do all you expertly advice, expertly!

     Behind "the project's own suites run on one only for what they take from the copy" in `README.md`, "How a
     project takes the core", point 5, and the sync note of the same day.

168. **12 November 2026** (the core, in the design chat), a day after item 142, seeing 22 open ideas across the
     repositories and one verdict among them:

     > Why isn't my stand-in addressing the questions?

     Told why: the stand-in gives an idea its verdict while answering a question on its topic, or in the weekly sweep,
     which had never run, and "once a week" gave an orchestrator nothing to count from, so one started afresh could
     not tell when a sweep was due. Then, told that its verdict on an idea decided nothing, since every idea waited
     until he moved it into the progress file (the hold of item 142, which he had approved as part of that answer):

     > I thought it could authorize anything it was fairly certain about, expert?

     Both changes were first built on those questions; the code review held them for his word, and they were put to
     him as two, each for a yes or a no: the sweep due once an open idea has waited a week with no verdict; and a
     verdict the stand-in is sure of deciding an idea, a yes queued behind what stands in the progress file and a no
     closing it, any other left to him.

     > Yes, expertly!

     Behind "once an open idea has waited a week with no verdict of the stand-in's" in `modules/orchestrating.md`,
     "On every wake", and "A verdict the stand-in is sure of decides one" in `modules/inbox.md`, which replaces item
     142's hold. What the stand-in is never sure of stays as it was: a call of taste, and an answer resting only on
     the core's archive in a project of another owner.

169. **12 November 2026** (the core, in the design chat), told that the core said who builds first but left each
     project to write down how a Claude session hands a task to another provider, and that neither game did:

     > Hand off is only possible via a tool like herdr, or a plug-in in claude code. We have already tested trying to
     > do it via github, there it can initiate, but codex in legacy cloud can't push, so no use. So only review and
     > security review is avaliable via github. Seems to me a more generalized rule to just handoff what you can, is
     > the best way? Shouldn't that produce what we do now, when we only have github? And then use plug-in if it is
     > there? But prefer herdr even more if you set it up with it? What is your take, expert? This is the kind of
     > stuff agent-core should solve for […], since he isn't familiar with the options. Are there more holes like
     > this, that leaves things open for him, without good cause, expert?

     Shown that rule as a table (the tool that runs agents side by side, else the plug-in, else Claude's build) and
     six more places the core left to a project of another owner; offered his rule and four of them as one change
     (how a reviewer other than Codex is asked; a reviewer that never answers; Codex's model and effort; which session
     is the design session in a project with none), the other two left until that project reports (a licence check
     for another installer; setting up a local machine), with the cap's room to be found or asked for:

     > Yes, expertly. Then explain clearly to me every change you made to the rules.

     Behind "by the first way there is" in `modules/roles.md`, "The builders"; `modules/codex.md`, "Building";
     `modules/copilot.md`; "asked and not waited for" in `modules/reviews.md`, point 2; and "in a project with none"
     in `modules/inbox.md`.

     The second security review asked two things of the change, both taken into it: who reviews when a reviewer is not
     waited for, and that work built through the plug-in is pushed by its briefer, with no protected file in it and its
     builder named. Asked meanwhile:

     > So copilot is always last resort then, is that what you're saying? Should at least be preferred over claude, no?
     > Expert?

     Told that Copilot reviewed ahead of Claude's reviewer only where a project named it, and built only under the tool
     that runs the agents side by side; offered it second in the default order of reviewers, and its agent on GitHub as
     a third way to build, after Codex's plug-in, with what that costs (its plan's requests), that GitHub marks the call
     a preview and that it was not yet run; and asked again whether the cap may go to 46 KB:

     > Agreed to all, expertly, but allow for other tools too!

     Behind the default order of the *code reviewers* and "a way the project names" in `modules/roles.md`. Copilot's
     building is not in the change: three rounds of review each found a step of it that only a real run can settle (its
     own push before any check of its diff, and the approval its workflows wait for, which asks a permission the
     sessions' sign-ins are set up without), so it is filed as an idea (issue 124) with what a run must show, and a
     project that has Copilot's agent names it as its own way meanwhile. The cap of item 164 goes from 45 to 46 KB on
     that yes.

170. **12 November 2026** (the core, in the design chat), told that the stand-in had given its verdict on nine of one
     project's fifteen open ideas and that the six newest had none, since its sweep took only the ideas that had waited
     a week:

     > That's a glip, should take all when it first runs, no?

     Behind "every idea that lacks one" in `modules/orchestrating.md`: a week's wait still starts the sweep, and once it
     runs it takes every open idea without a verdict, so none is left for a call of its own.

171. **12 November 2026** (the core, in the design chat), after the change of item 169 was merged with the ways of
     handing work over in order, but nothing on which provider builds where more than one can:

     > Also, are all other providers also treated like codex? How does it select if it both has codex and something
     > else?

     Told that every other provider's builder follows the same rules and only Codex has a part in the core; that nothing
     chose between two that could both build; offered: the project's order if it names one, otherwise Codex first, a
     task one failed at twice going to the next and Claude's last; told what Codex first costs (work Codex built cannot
     have Codex's code review, and its security review fell to Claude's fallback reviewer, which spends Claude's usage),
     and that the rule needed room the cap did not have: 47 KB, or cuts.

     > Maybe codex still can be used for security.
     >
     > But yeah, fine how you've laid it out. Yes to everything, now and before, expertly.

     Behind "Where more than one can build" in `modules/roles.md`, "The builders", and the *other builders* slot; behind
     the *security reviewer* slot's default, Codex of what its own provider built too, floor rule 3's two reviews
     standing; and behind the cap of item 164 at 47 KB.

172. **12 November 2026** (the core, in the design chat), an hour after item 170, whose words were read as the weekly
     sweep alone; told that six ideas in one project and three in the core still had no verdict, since the sweep starts
     only once an idea has waited a week and the stand-in, called for a question, judged only the ideas on that
     question's topic:

     > But are we telling it now to do all when the stand-in steps forward?

     That change was written on those words and held when its review found them a question and no instruction. Asked
     then outright whether the stand-in, every time it is called, should give every open idea that lacks one its
     verdict, and whether the three ideas it had just given a sure yes in the core should be built (a feature that may
     wait for a later stage, the checks still unbuilt, a real run of Copilot's agent):

     > Do you agree, expertly?

     Told yes to each, in that order, the check that holds a merge for its security review advisory for a week first,
     and the run likely to need his own approval of the agent's workflows once:

     > Do what you expertly advice on these points.

     Behind "whenever it is called, its verdict on every open idea that lacks one" in `modules/inbox.md`: item 170's
     "should take all when it first runs" meant any run of the stand-in, not the sweep's alone. The sweep of
     `modules/orchestrating.md` stays for a project where a week passes without a call.

173. **12 November 2026** (the core, in the design chat), by his word in item 172 ("Do what you expertly advice on these
     points") on the three ideas the stand-in had given a sure yes; the first, filed when one game listed it as a
     difference from the core: a feature that does not pay yet may wait for the later stage that brings what it needs.
     The stand-in rested it on his words of items 86 ("Can't draw conclusion right now, as the game isn't fully
     constructed yet, but once it starts being feature complete, this cannot be the case") and 107 (no temporary
     features), with item 89's limit that the computer players' bad play is never what waits.

     Behind the third outcome in "Using a feature must pay, measured three ways" (`modules/game-design.md`).

174. **13 November 2026** (the core, in the design chat), shown that the core's "every PR gets
     its security review, once, when it opens" was what GitHub's trigger can do, written as if it were the rule; that a
     security review of a sync had found what the core's own had passed; and that one of Dependabot's updates had merged
     with none:

     > I suggest the agent-core projects only states the ideal narrower use, for when you yourself control through
     > plug-in or herdr, or something of the like, but maybe still wait for it if it triggers anyhow, like it will for
     > github triggers?

     On widening Codex's automatic security review to every pull request so that Dependabot's were covered:

     > Wait, thinking about it, does doing it on all add anything, why review dependabot change, expert?

     Told that it adds next to nothing there (the diff is version numbers and checksums; floor rules 17 and 7 and the
     checks are what guard an update), and that running it with every code review costs more than it finds:

     > Okay, back to just team prs and on open prs. The rules stay that for github triggers it waits for what is
     > triggered, while manually triggered tests it only does it where it adds something worthwhile, or? What is your
     > take, expert? [...] setup with the codex plug-in should utilize reveiws and security reviews optimally, not
     > limited to what my github triggers can acheive, no?

     Offered that as the floor's line and the review rule, with a few plain lines for an owner on what setting a
     machine up for agents buys him (item 149 left the setup to him), and asked whether Copilot's agent should be
     turned on for a trial of its building:

     > Yes, to your expert recommededation on 1 and 2. On 3, maybe we ought not to? Having it defined as preferred
     > reviewer before claude code, if avaliable, I think suffices, or what is your take on this expert? And you can
     > merge it all now, so [...] gets these updates when he pulls tomorrow, unless there is good reason not to.

     Behind floor rule 8's "A PR that touches one merges only after its security review has run (Dependabot's own: rule
     17)", point 3 of `modules/reviews.md` (a security review the session calls, once on the finished work and aimed;
     one that starts by itself waited for on every PR, a pure sync's too) and the plug-in's security review in
     `modules/codex.md`. Copilot stays the second code reviewer (item 169); its agent's building is not taken up.

175. **13 November 2026** (the core, in the design chat), on who reviews first, told that a third tool reviewed only
     where a project named it:

     > And if we have antigravity or something else in herdr, then it is also preferred? The aim is to make the rules
     > general where practical, so any setup will work without specification, and we want to save on claude usage as a
     > general rule.

     > Should it be co-pilot first to review, where avaliable, since that's the only thing you would have it set up for
     > anyways, and you define any caps in there? That gets you more building usage from codex and any other provider.
     > Then another provider. Then claude last?

     Offered his reason as the rule, in place of naming Copilot first (where Codex cannot build, as on GitHub alone,
     reviewing is the best use of it, and it has proved itself there): first a reviewer that cannot build here, Codex's
     before Copilot's, then another builder's, last Claude's:

     > Yes, expertly.

     Behind the order of the *code reviewers* in `modules/roles.md`. Asked in the same message whether another
     project's agents should send the core pull requests as well as issues; answered no, and the README's "Reporting
     to the core" says so: one from another account is data (floor rule 4).

176. **13 November 2026** (the core, in the design chat), on what an agent of a project does before it reports to the
     core:

     > Question: should any agent wanting to post a bug report, feature requedt/suggestion, or question, first check
     > the codebase to see if it has been addressed already, and that it might just be on an older version, or the fix
     > just isn't on main yet, expert?

     Answered yes: the README told it to search the issues, and to name the commit its project holds, but not to look
     at the newest core, and a project that syncs once a day is often some commits behind. Offered: before filing, a
     look at the core's `main`, its open pull requests and its issues, the closed ones too; what a newer commit or an
     open pull request already mends is no report; a look, not a study:

     > Yes, expertly! Should it trigger a new import, if it has something like this, that already addresses it, expert?

     Answered yes, on a condition: where the fix is on the core's `main` and the fault stands in the way of the task
     at hand, the project syncs then, beside its regular sync, by a session that may change the copy; what stands in
     no task's way waits for the regular sync; what only an open pull request mends cannot be synced yet:

     > Yes, expeetly to all!

     Behind "It looks before it files" in the README's "Reporting to the core".

177. **13 November 2026** (the core, in the design chat), told what a look through the core before another project's
     first import had found, among it that a pull request was merged 24 minutes after it opened, on the fallback
     reviewer's security review, because Codex's own security review had never begun on it, though point 3 of
     `modules/reviews.md` knew only a wait of about 30 minutes:

     > Address everything that ought to be addressed from this, in your expert opinion.

     Behind "One not begun in about 5 minutes" in point 3 of `modules/reviews.md`: a security review that starts by
     itself and shows no sign is not waited out, as point 2 already had it for the code review.

178. **13 November 2026** (the core, in the design chat), on when a project takes the core's newer commits:

     > Also, is the core clear enough about when to import it for other repo's orchestrator, or are there gaps that
     > could make it so it is never updated, or at a different schedule than intended, expert?

     Answered that there were three gaps: only the orchestrator was told to look, so a session started with none never
     did, and the daily issue was then the one signal; the rule did not name how to tell that the core had moved; and
     "once a day" had nothing to count from. Offered one sentence where every session reads it at the start of a task,
     "A session no orchestrator started, and the orchestrator on every wake, first checks whether the core has moved
     (the script named) and imports if so; where checks cost money, not while an import pull request from the same day
     exists.":

     > Do it expertly!

     First written shorter than offered, to fit the rules' size; asked whether it stood as offered (item 179):

     > I agree, keep it.

     Behind the last sentence of "Sessions" in `modules/work-flow.md`.

179. **13 November 2026** (the core, in the design chat), told that the wait for a security review that starts by itself
     had been written in the review rules and not in the floor, where he had been told it would stand, because the
     floor had no room under the rules' size cap:

     > That seems bad, if something ought to be somewhere, like the floor, but is cut or moved due to size
     > constraints? That is abiding by the rules rather than by the principles that put them there in place in the
     > first place. If there are more instances like this, remedy it, expert!

     > Are there more rules lacking anchors? Investigate and remedy!

     Told what would follow: the cap raised one step and its principle written down (it keeps the rules lean and
     decides nothing else), every rule moved or cut for size put back, and each limit a session cannot check given
     what it counts from:

     > Yes, expertly to all of this!

     Behind floor rule 8's "A security review that starts by itself when a PR opens or is marked ready is waited for and
     read on every PR, a pure sync's too"; the cap at 48 KB and "The size cap keeps the rules lean and decides nothing
     else" in `AGENTS.md`; and, put back or anchored: the fallback reviewer named in the *code reviewers*' order and
     "its closed PRs and the *progress file* say" in `modules/roles.md`, a posted security review "naming the tool and
     the commit it read" and "the project's newest PRs that asked it show" in `modules/reviews.md`, and the hints the
     orchestrator's rule had lost.

180. **13 November 2026** (the core, in the design chat), asked what each provider's tool reads first from a project,
     and told that the tools take their instructions from more files than floor rule 3 named as rule files. Offered:
     floor rule 3 names as rule files "any file a tool takes its instructions from, wherever it lies", with those
     files' names as examples:

     > Approved expertly!

     Behind "and any other file a tool takes its instructions from, wherever it lies" in floor rule 3.

181. **13 November 2026** (the core, in the design chat), asked for a take on everything he had said yes to on 12 and 13
     November. Told: keep all of it; add a reader for a review that comes in after its PR merged, since "a late review
     is still read" named none and a session stops at the merge; reword the *code reviewers*' order, whose "(Codex's,
     then Copilot's)" could be read as if Codex never builds; and give "Never a pull request" in the README, written on
     a question of his, its yes:

     > Agreed with all of your takes here, expertly! Do it! My only slight concern is that cap can blow up. But the
     > hard cap was worse. The best is if we manage to keep it so it is only ever expanded when it has to, not due to
     > inefficient phrasing, duplication, or anything else, expertly.

     And two minutes later:

     > Maybe a reviewer has to concur that condensing isn't possible without losing meaning or enforcement, so that
     > the cap has to be expanded? What is your expert take?

     Told that it should, and that a code reviewer reads the change before it and not every rule each time:

     > Yes, because condensing would primarily be condensing of what is already there, so if a reviewer cannot check
     > whether room cannot be made with what was there before and what is added, and kept under the cap, then it
     > cannot fully evaluate, no, expert? Is an independent verifier subsession better then, expert?

     Told that it is: a fresh session that wrote none of the change reads all the rules for room, what it finds is
     trimmed, and the cap rises only if that is not enough, the reviewer blocking a raise without that check. The code
     review of the change held that a question of his is no yes (`modules/how-to-work.md`), so he was asked outright
     whether this repository's review guidelines should gain that blocking point:

     > Yes to all, expertly!

     Behind "a finding of the last week by a reviewer the project asks, made after its PR merged, with no reply, is
     answered as point 5 says" in `modules/reviews.md` and "then both read what reviews left after a merge" in
     `modules/work-flow.md`; "Codex's before Copilot's, where neither builds" in `modules/roles.md`; "Never a pull
     request" in `README.md`; and "It rises only when it has to" and "a raise of the size cap in a PR with no "Leanness
     check:" comment" in `AGENTS.md`.

182. **13 November 2026** (the core, in the design chat), told that the core's cap and its fresh-session check were the
     core's own, and that a project's marks moved with a reason alone:

     > Why shouldn't a implementing repos size cap work by the same mechanism and rules, expert? Genuine question.
     > Obviously, the builder shouldn't pursue expanding a cap where it is more sensible to actually have more split
     > instead, i mean more if it genuinely thinks something should be somewhere in particular? Could be a rule file
     > the implementing repo has, or whatever, no, expert?

     Told that he was right for one of a project's two kinds of mark: a file past the split mark is split, as before,
     while a mark on what every session reads at its start should rise as the core's cap does (said shorter, what is
     said twice trimmed, what no session needs at every start moved to a file read when needed, then a fresh session's
     read of those files, and only then the mark, a reviewer blocking a raise without that check), growth that a sync
     of the core brings aside; and that this touches the review guidelines every project takes, so needs his yes:

     > Agreed expertly to all!

     Behind "A mark on what every session reads" in `modules/review-guidelines.md`, which the core's own cap now
     follows too (`AGENTS.md`).

183. **13 November 2026** (the core, in the design chat), told what a fresh session's read of all the rules for room
     had found in the floor: six wordings another floor sentence already says. Recommended: yes to three (the opening
     of `floor/topics.md` drops "read before a task touches one", which `floor/security.md` says; the opening of
     `floor/threat-model.md` drops "The part every project shares", which its title says; rule 17 drops "the one
     exception to rule 4", which rule 4 says), and the other three left alone (rule 3's list of files, "he himself" in
     rule 14, "key or secret" in rule 1):

     > Apply all your recommendations, expertly!

     Behind those three wordings in `floor/topics.md` and `floor/threat-model.md`; no rule's meaning changes.

184. **13 November 2026** (the core, in the design chat), after a fresh session's read of all the rules had found
     trims and some had been taken and some left by the design session's own judgement:

     > Maybe we need to have clear criterias what must remain in place, for a condensing to be valid, expert? What is
     > your expert take on this? Otherwise it just becomes a question of taste? Then we could run a full audit on all
     > rules files of agent-core, condense them as much as possible, and set the cap there? What is your expert take
     > on this, expert?

     Told: yes to criteria, written into the rule as the test for every trim (a reader with the trimmed text and what
     that reader has already read acts the same in every case; who a rule binds and when, what it asks, every limit
     and exception, what enforces it, its reason and each name and example stay; only a second statement of what that
     reader has already read, or words carrying none of these, may go; in doubt the words stay); yes to one audit
     pass under them over all the core's rule files, any trim in the floor listed for his yes; and the cap set at the
     next whole KB above the result, not at it, since a cap with no room makes every one-line mend pay for a read of
     all the rules:

     > Agreed expertly with all your takes! You can commence now. […]

     Behind "A trim is valid" in `modules/review-guidelines.md`.

185. **13 November 2026** (the core, in the design chat):

     > Can we add a rule that makes any session/subsession that is finished, archive? At least have the orchestrator
     > archive all its subsessions once they are finished? Probably also if you tell them to stop due to usage and push
     > up all, because then it is better to just have another builder season pick up again, no? Expert? Can they
     > archive themselves also, and should they? What is your expert take on all of this?

     Told: yes, by the orchestrator and not by the session itself, which is the worst judge of whether it is finished
     and whose last message must be read first; once its task merged or it stopped with its work pushed and its note
     left, a stop for usage too, a fresh builder picking up from the branch; its last message read and nothing
     scheduled bound to it; archived, never deleted; never a session he works in or one waiting only on his yes; a
     session nobody orchestrates says in its last message that it can be archived; and that whether an agent can
     archive a session depends on the tool that runs them, which the design session could not confirm for every one:

     > Agreed expertly to all!

     Behind "A finished session is archived" in `modules/orchestrating.md` and "that it can be archived" in "Sessions"
     in `modules/work-flow.md`.

186. **13 November 2026** (the core, in the design chat):

     > Do we have anything in agent-core about running occasional clean-ups and condensing runs? Agent-core maybe
     > isn't the place for that? But any job that is scheduled for that in a work queue file, like in our repos, will
     > it also do the rules files, and use our new criterias, checks, and verifications, etc, expert?

     Told: the core schedules none, rightly, since when to clean up is a project's own queue entry and a file reaching
     its mark is what forces a condensing; but the test for a valid trim stood inside the rule on raising a mark, so a
     clean-up that trims a rule file for another reason was not plainly bound by it. Offered: the test holds for every
     trim of a rule file, whatever it is made for, with no fresh session's read where nothing rises:

     > Agreed, expertly! Do it!

     Behind "It holds for every trim of a rule file, whatever its purpose" in `modules/review-guidelines.md`.

187. **13 November 2026** (the core, in the design chat), on the rule that a finished session is archived:

     > […] What i would however add is that they should also clean up, no? In the cloud, I don't think it matters. The
     > container is finished when the session is. But locally/server, they have a tendency to leave work trees behind,
     > scratches, branches, etc, etc. Shouldn't everything important for future work be pushed, and everything not, be
     > cleaned up? When you archive a sessions seems like a good time to do it? Your expert take?

     Told: yes; the session cleans up what it made before its last message, since it knows what that is, and the
     orchestrator checks before it archives and does it for a session that could not; only what the session itself
     made; a worktree, clone or local branch goes only where nothing in it is uncommitted or unpushed, the rest pushed
     or left and named; what it started is stopped; no other session's folders and no branch on GitHub; nothing to do
     where the machine ends with the session:

     > Agreed with everything, expert! […]

     Behind "clean up what you made" in "Sessions" in `modules/work-flow.md` and "It first checks that the session
     cleaned up" in `modules/orchestrating.md`.

188. **13 November 2026** (the core, in the design chat). The audit pass had found one trim in the floor (rule 17's
     "the release notes read", as held by rule 7's source check) and it had been recommended to him; he said yes. Told
     before anything was changed that the recommendation was wrong: rule 7's source check covers only what ships and
     what builds it, so for an update to a tool that only runs, rule 17 alone asks that the release notes be read, and
     the words stay:

     > Okay, then i withdraw my yes. Should the criterias be made clearer to avoid false positives like this, expert?

     Told: the test already rules that trim out, but "a second statement" did not say what makes two statements the
     same; offered that a second statement counts only if it covers every case the removed words do, with the same
     force, and that whoever proposes a trim names the other statement and what it covers; and that the nineteen trims
     merged that night had been gone over again, scope against scope, and held:

     > Agreed, expertly!

     Behind "one that covers every case the removed words do, with the same force" in `modules/review-guidelines.md`.

189. **13 November 2026** (the core, in the design chat):

     > Just one last thing! I see the owner is referred to as "him", "he" and "his" everywhere. That makes the repos
     > less general purpose. The last thing I'll note tonight, that would benefit from being changed to something that
     > could work for any owner.

     > And one more question: how does my game repos know that the archive is my decisions, while […] repo will know
     > it is not […] archive, when the stand-in uses it to make calls?

     Told: every such word in the core's rules would be reworded to fit any owner ("the owner", or "they" where no one
     else could be meant), the floor's among them on these words, and the words added to the check that fails what
     fits only some projects; this archive stays as written, a dated record. And told that a project tells whose words
     the core's archive holds by two accounts in its manifest, the one in the core's address and its *owner's account*,
     which the rule would now say:

     > Approved! Do all of this, expertly! […]

     Behind the wording of the owner throughout the floor, the modules, `README.md` and `setup/`; the last pattern in
     `scripts/general.json`; and "the account in the core's address in the manifest not being the *owner's account*"
     in `modules/inbox.md`.
