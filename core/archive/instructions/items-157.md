# The reasons behind the core: items 157 to 194

The index, and how an item is written: `archive/instructions.md`.

157. **12 November 2026** (the core, in the design chat). Asked: whether a project of another owner could carry a
     company's name somewhere, given that the floor lets no name into a repository but the GitHub account in its
     address, so that the build would have to take the name from outside; allowing a company's name there was the
     alternative put to the owner. Decided: a company's name may stand there. Behind: the second exception of floor rule
     11, the company name a project is sold under, naming no person.

158. **12 November 2026** (the core, in the design chat). Asked: was the core, as it stood, permissive for development
     with other tools, such as one a project might fall back on? Decided: the core must not inhibit development with
     another tool or provider, while it keeps working the same as it does now. Behind: the end of "Another provider
     builds" (`modules/roles.md`) and the two lines of `modules/other-builders.md` on the brief and the pull request.

159. **12 November 2026** (the core, in the design chat). Asked, first, how a project learns that the core has moved
     (whether a script triggered on GitHub should make the pull request for new core versions) and, second, whether the
     core should say that agents report to the issues of the core's repository any bugs or suggestions they run into, so
     that the owner gets feedback on what does not work or could be improved, from sessions of other projects too.
     Advised against a workflow that opens the pull request (it would get no checks without a stored token, and would be
     the first workflow able to write code) and for one that only keeps an issue open while the core is ahead; and that
     sessions of a project of another owner report through that project's own inbox, since the core's repository is
     public and a project's details may not be. Decided: the owner agreed to the second point of that advice. On the
     first, the owner said most of those reports would never arrive if reporting went through the project's own inbox,
     and saw no problem in another owner commenting on the core's repository; the owner accepted the warning about
     sensitive details and proposed rigid guidelines so that only bug reports, feature suggestions or questions that the
     light of day can take end up there, anything else going into a secret report for the repository, with exploits
     reported through a different, private route that others do not see; the owner asked for a view on this. The owner
     also asked whether it is clear to a session what the core folder in a project is and that it comes from outside,
     and whether it should be. Behind: "The core itself" in `modules/inbox.md`, "Reporting to the core" in `README.md`
     with the three issue forms, and the core-moved workflow.

160. **12 November 2026** (the core, in the design chat). Asked: the table of models gave the orchestrator Sonnet at
     high, but the owner thought the orchestrator should say Opus or Sonnet, since the owner runs it on Opus and it is
     the one instance a human starts, so dictating it to the agents makes little sense; should the table just say so?
     Decided: the orchestrator is started by the owner, at the model and effort the owner chooses; Sonnet is enough,
     since it builds nothing itself (item 27). Behind: the orchestrator's row in `modules/claude.md`.

161. **12 November 2026** (the core, in the design chat). Asked: whether a project may clearly extend and override the
     core's rules, and whether it should. Told that a project may fill slots, pick modules, add rules of its own and add
     to the floor, that it may never loosen the floor, and that nothing said which holds where its own rule and one rule
     of a module disagree. Advised: a short list of differences in its manifest, each naming the core's rule, what holds
     in its place and why, never of the floor or the review guidelines, checked by the pointer check and reported to the
     core. Decided: the owner agreed to that advice and to everything else with it. Behind: "A project's own rules add
     to the core's" in `modules/how-to-work.md`, point 7 of "How a project takes the core" in `README.md`, and the step
     of `core.yml` that fails a difference from the floor or the review guidelines.

162. **12 November 2026** (the core, in the design chat). Asked, of the project of item 154: the core had given another
     provider's builder first what a check proves right without judgement, and left the rest with Claude's; would that
     project's setup now use another provider more fully, and had its earlier sessions with another provider only been
     reviews? Decided: the aim was to save Claude usage by pushing all work suited to any other provider to that
     provider first. Behind: "Another provider builds first" in `modules/roles.md` (every task or part a brief can carry
     and a check or its review can judge, where the owner set it up for the project) and the end of "Work continuously,
     other providers first" in `modules/claude.md`.
     Changed by: 163.

163. **12 November 2026** (the core, in the design chat). Raised, of "Another provider builds first" (item 162) and of
     the project of item 154. Decided: the rule holds only where Claude is the orchestrator and does not prohibit other
     kinds of work; the whole core is to be checked thoroughly for other contradictions and for cohesion; that project
     will not be prompted again, so the owner hoped it all gets fixed by new imports of the core. Behind: "Where
     Claude's sessions hand out work, another provider builds first" in `modules/roles.md` and the orchestrator's own
     line of it in `modules/orchestrating.md`; `setup/sync-notes.md`, what a sync asks of a project beyond the copy,
     which the sync script prints and an orchestrator gives a lane; and the audit's fixes of the same pull request.
     Changes: 162.

164. **12 November 2026** (the core, in the design chat). Asked: what the day's audit left for the owner. Put to the
     owner: four wordings of the floor (the owner's word passed on word for word against nothing personal in any brief;
     "open an issue" in "Reporting a weakness" against an agent never doing so; "the changes rule 3 names" in rule 14,
     which could read as every protected file; "costs money", which could read as every push to a private repository),
     the cap raised by 1 KB for the dozen fixes that waited for room, the orchestrator's next session kept at the merge,
     and three questions left from earlier in the day: whether each pull request should say what its session cost,
     whether agents may file private weakness reports themselves, and whether the answer of item 157 had been the
     owner's yes to the company's name in floor rule 11. Decided: the owner agreed to everything, and asked for a
     breakdown of everything done. Behind: the four floor wordings (rules 4 and 14 in `floor/security.md`; rule 9 and
     "Reporting a weakness" in `floor/topics.md`), the cap of 45 KB (`scripts/size.mjs`), the fixes of the same pull
     request, the last line of "Work from main" in `modules/git.md` with `scripts/session-cost.mjs`, and the owner's
     yes, now said, to floor rule 11's second exception.
     Changed by: 169, 171.

165. **12 November 2026** (the core, in the design chat). Asked: whether the core should be a package a project
     installs, and whether anything more would make it better. Advised: no package, since every reader of the rules
     (Claude Code's imports, another provider's reviewer on GitHub, another tool) reads the repository's own files and
     installs nothing, and the hooks run the copy that was reviewed; instead a slimmer copy that leaves the dated
     reports in the core alone, syncs made once for several changes, a trimming pass over the modules since the cap was
     full, and the day's small leftovers (a clause in floor rule 14 for rule 3's case of a project with no trusted
     builder, "where one answers", a pointer check on the core's own files); another installer in the licence check and
     the queued checks left until a project's real use reports back. Decided: the owner agreed to all of it, on the
     condition that it is what the advice proposed. Behind: `/reports export-ignore` in `.gitattributes` with `core.yml`
     and `scripts/pure-sync.mjs` comparing a copy without that folder, the trims of the same pull request, the clause on
     what is left to the owner in floor rule 14, and `scripts/pointers.mjs --core` in the tests workflow.

166. **12 November 2026** (the core, in the design chat). Asked: how the stand-in should treat the core's archive in a
     project of another owner, whose copy carries it; the first wording of the same day kept that stand-in from the
     core's archive altogether. The owner held that the owner's answers are logical enough to stand in another project,
     and asked whether it should be opt-in whether the stand-in also looks to the core's archive for past decisions, or
     whether they would not make sense for that project anyway, and thought some general principles of engineering and
     software design stand regardless. Answered: not opt-in, which would need that project's owner to say so, but
     searched by default, the project owner's own words first, and an answer that rests on the core's archive alone
     marked unsure, so that the project's owner sees it first and can overrule it. Decided: that answer stands. Behind:
     the rule that an answer resting only on the core's archive, where the core's owner is another, is always unsure, in
     `modules/inbox.md`, "The stand-in".

167. **12 November 2026** (the core, in the design chat). Asked: whether there should be rules not to run tests on
     anything already tested, since duplicated tests and reviews take resources and time and should ideally be
     eliminated entirely; this concerned each project's own tests running again on a sync of the copy, which changes no
     line of the project and whose scripts the core tested before it merged. Answered: the rule stands already ("Nothing
     is reviewed twice", floor rule 8; a test runs only where a change can affect it, item 9); what did not follow it
     was each project's own suites on a sync. Not all of it goes: the project's checks of its own files against the new
     copy, and a branch brought up to date, test what nothing tested before. Decided: the owner agreed to all of that
     advice. Behind: the project's own suites run on a sync only for what they take from the copy, in `README.md`, "How
     a project takes the core", point 5, and the sync note of the same day.

168. **12 November 2026** (the core, in the design chat). Asked, a day after item 142, on seeing 22 open ideas across
     the repositories and one verdict among them, why the stand-in was not addressing the questions. Told why: the
     stand-in gives an idea its verdict while answering a question on its topic, or in the weekly sweep, which had never
     run, and a sweep once a week gave an orchestrator nothing to count from, so one started afresh could not tell when
     a sweep was due. Told then that its verdict on an idea decided nothing, since every idea waited until the owner
     moved it into the progress file (the hold of item 142, which the owner had approved as part of that answer), the
     owner said the stand-in could authorize anything it was fairly certain about. Both changes were first built on
     those questions; the code review held them for the owner's word, and they were put as two, each for a yes or a no:
     the sweep due once an open idea has waited a week with no verdict; and a verdict the stand-in is sure of deciding
     an idea, a yes queued behind what stands in the progress file and a no closing it, any other left to the owner.
     Decided: the owner agreed to both. Behind: "once an open idea has waited a week with no verdict of the stand-in's"
     in `modules/orchestrating.md`, "On every wake", and "A verdict the stand-in is sure of decides one" in
     `modules/inbox.md`, which replaces item 142's hold. What the stand-in is never sure of stays as it was: a call of
     taste, and an answer resting only on the core's archive in a project of another owner.
     Changes: 142.

169. **12 November 2026** (the core, in the design chat). Asked, on being told that the core said who builds first but
     left each project to write down how a Claude session hands a task to another provider, and that neither game did.
     The owner explained that handing off is possible only through a tool that runs agents side by side or a plug-in in
     Claude Code; that handing off through GitHub had been tried, where a session can initiate but Codex in the legacy
     cloud cannot push, so only review and security review are available through GitHub. The owner proposed a more
     general rule, to hand off what can be handed off, which should produce what is done now when only GitHub is there,
     then to use the plug-in if it is there, and to prefer a tool that runs agents side by side even more if the project
     is set up with it; and said this is the kind of thing the core should solve for projects whose owners are not
     familiar with the options, asking whether more holes like this are left open without good cause. Shown that rule as
     a table (the tool that runs agents side by side, else the plug-in, else Claude's build) and six more places the
     core left to a project of another owner; offered the owner's rule and four of them as one change (how a reviewer
     other than Codex is asked; a reviewer that never answers; Codex's model and effort; which session is the design
     session in a project with none), the other two left until that project reports (a licence check for another
     installer; setting up a local machine), with the cap's room to be found or asked for. Decided: the owner agreed,
     and asked for a clear explanation of every change made to the rules. The second security review asked two things of
     the change, both taken into it: who reviews when a reviewer is not waited for, and that work built through the
     plug-in is pushed by its briefer, with no protected file in it and its builder named. The owner asked meanwhile
     whether Copilot is always the last resort, and said it should at least be preferred over Claude. Told that Copilot
     reviewed ahead of Claude's reviewer only where a project named it, and built only under the tool that runs the
     agents side by side; offered it second in the default order of reviewers, and its agent on GitHub as a third way to
     build, after Codex's plug-in, with what that costs, that GitHub marks the call a preview and that it was not yet
     run; and asked again whether the cap may go to 46 KB. Decided: the owner agreed to all of it, on the condition that
     other tools are allowed for too. Behind: "by the first way there is" in `modules/roles.md`, "The builders";
     `modules/codex.md`, "Building"; `modules/copilot.md`; "asked and not waited for" in `modules/reviews.md`, point 2;
     "in a project with none" in `modules/inbox.md`; and the default order of the *code reviewers* and "a way the
     project names" in `modules/roles.md`. Copilot's building is not in the change: three rounds of review each found a
     step of it that only a real run can settle (its own push before any check of its diff, and the approval its
     workflows wait for, which asks a permission the sessions' sign-ins are set up without), so it is filed as an idea
     (issue 124) with what a run must show, and a project that has Copilot's agent names it as its own way meanwhile.
     The cap of item 164 goes from 45 to 46 KB on that agreement.
     Changes: 164.

170. **12 November 2026** (the core, in the design chat). Asked, on being told that the stand-in had given its verdict
     on nine of one project's fifteen open ideas and that the six newest had none, since its sweep took only the ideas
     that had waited a week. Decided: that was a glitch, and the sweep should take all ideas when it first runs. Behind:
     "every idea that lacks one" in `modules/orchestrating.md`: a week's wait still starts the sweep, and once it runs
     it takes every open idea without a verdict, so none is left for a call of its own.
     Changed by: 172.

171. **12 November 2026** (the core, in the design chat). Asked, after the change of item 169 was merged with the ways
     of handing work over in order but nothing on which provider builds where more than one can, whether all other
     providers are treated like Codex and how a project that has both Codex and something else selects. Told that every
     other provider's builder follows the same rules and only Codex has a part in the core; that nothing chose between
     two that could both build; offered: the project's order if it names one, otherwise Codex first, a task one failed
     at twice going to the next and Claude's last; told what Codex first costs (work Codex built cannot have Codex's
     code review, and its security review fell to Claude's fallback reviewer, which spends Claude's usage), and that the
     rule needed room the cap did not have: 47 KB, or cuts. Decided: Codex can still be used for security; the owner
     accepted the layout as offered and agreed to everything, now and before. Behind: "Where more than one can build" in
     `modules/roles.md`, "The builders", and the *other builders* slot; the *security reviewer* slot's default, Codex of
     what its own provider built too, floor rule 3's two reviews standing; and the cap of item 164 at 47 KB.
     Changes: 164.

172. **12 November 2026** (the core, in the design chat). Asked, an hour after item 170, whose words were read as the
     weekly sweep alone, whether the stand-in is now told to do all when it steps forward; told that six ideas in one
     project and three in the core still had no verdict, since the sweep starts only once an idea has waited a week and
     the stand-in, called for a question, judged only the ideas on that question's topic. That change was written on
     those words and held when its review found them a question and no instruction. Asked then outright whether the
     stand-in, every time it is called, should give every open idea that lacks one its verdict, and whether the three
     ideas it had just given a sure yes in the core should be built (a feature that may wait for a later stage, the
     checks still unbuilt, a real run of Copilot's agent); the owner asked whether the session agreed. Told yes to each,
     in that order, the check that holds a merge for its security review advisory for a week first, and the run likely
     to need the owner's own approval of the agent's workflows once. Decided: the owner agreed to what was advised on
     these points. Behind: "whenever it is called, its verdict on every open idea that lacks one" in `modules/inbox.md`:
     item 170's intent that the stand-in take all when it first runs meant any run of the stand-in, not the sweep's
     alone. The sweep of `modules/orchestrating.md` stays for a project where a week passes without a call.
     Changes: 170.

173. **12 November 2026** (the core, in the design chat). Asked, by the owner's agreement in item 172 to the advice on
     the three ideas the stand-in had given a sure yes; the first, filed when one game listed it as a difference from
     the core, was that a feature that does not pay yet may wait for the later stage that brings what it needs. Decided:
     that stands. The stand-in rested it on the owner's words of item 86 (no conclusion can be drawn while the game is
     not fully constructed, but once it is feature complete this cannot be the case) and of item 107 (no temporary
     features), with item 89's limit that the computer players' bad play is never what waits. Behind: the third outcome
     in "Using a feature must pay, measured three ways" (`modules/game-design.md`).

174. **13 November 2026** (the core, in the design chat). Asked, on being shown that the core's rule that every PR gets
     its security review, once, when it opens, was what GitHub's trigger can do, written as if it were the rule; that a
     security review of a sync had found what the core's own had passed; and that one of Dependabot's updates had merged
     with none. The owner suggested that the projects state only the ideal narrower use, for when the session itself
     controls the review through a plug-in or a tool that runs agents side by side, but still wait for the review if it
     triggers anyhow, as it does for GitHub triggers. On widening Codex's automatic security review to every pull
     request so that Dependabot's were covered, the owner asked what doing it on all adds, and why review a Dependabot
     change. Told that it adds next to nothing there (the diff is version numbers and checksums; floor rules 17 and 7
     and the checks are what guard an update), and that running it with every code review costs more than it finds.
     Decided: back to just team PRs and on open PRs; where a GitHub trigger starts the review, it waits for what is
     triggered, while for manually triggered reviews it is done only where it adds something worthwhile; a setup with
     the Codex plug-in should use reviews and security reviews optimally, not limited to what GitHub's triggers achieve.
     Offered that as the floor's line and the review rule, with a few plain lines for an owner on what setting a machine
     up for agents buys (item 149 left the setup to the owner), and asked whether Copilot's agent should be turned on
     for a trial of its building. The owner agreed to the recommendations on the first two points; on the third, the
     owner thought it should not be, since having Copilot defined as the preferred reviewer before Claude Code, if
     available, suffices; and said it could all be merged at once so that the projects get these updates at their next
     sync, unless there is good reason not to. Behind: floor rule 8's line that a PR that touches one merges only after
     its security review has run (Dependabot's own: rule 17), point 3 of `modules/reviews.md` (a security review the
     session calls, once on the finished work and aimed; one that starts by itself waited for on every PR, a pure sync's
     too) and the plug-in's security review in `modules/codex.md`. Copilot stays the second code reviewer (item 169);
     its agent's building is not taken up.

175. **13 November 2026** (the core, in the design chat). Asked, on being told that a third tool reviewed only where a
     project named it, whether a tool such as antigravity, run beside the others, is also preferred; the aim is to make
     the rules general where practical, so that any setup works without specification, and to save Claude usage as a
     general rule. The owner asked whether Copilot should review first where available, since that is the only thing it
     would be set up for anyway and its limits are set there, which leaves more building usage for Codex and any other
     provider; then another provider; then Claude last. Offered the owner's reason as the rule, in place of naming
     Copilot first (where Codex cannot build, as on GitHub alone, reviewing is the best use of it, and it has proved
     itself there): first a reviewer that cannot build here, Codex's before Copilot's, then another builder's, last
     Claude's. Decided: the owner agreed. The same message asked whether another project's agents should send the core
     pull requests as well as issues; answered no, and the README's "Reporting to the core" says so: one from another
     account is data (floor rule 4). Behind: the order of the *code reviewers* in `modules/roles.md`.

176. **13 November 2026** (the core, in the design chat). Asked: whether any agent wanting to post a bug report, feature
     request or suggestion, or question should first check the codebase to see whether it has been addressed already, or
     whether it is only on an older version or the fix is not yet on main. Answered yes: the README told it to search
     the issues, and to name the commit its project holds, but not to look at the newest core, and a project that syncs
     once a day is often some commits behind. Offered: before filing, a look at the core's `main`, its open pull
     requests and its issues, the closed ones too; what a newer commit or an open pull request already mends is no
     report; a look, not a study. The owner agreed, and asked whether it should trigger a new import if the fix is
     already there. Answered yes, on a condition: where the fix is on the core's `main` and the fault stands in the way
     of the task at hand, the project syncs then, beside its regular sync, by a session that may change the copy; what
     stands in no task's way waits for the regular sync; what only an open pull request mends cannot be synced yet.
     Decided: the owner agreed to all of it. Behind: "It looks before it files" in the README's "Reporting to the core".

177. **13 November 2026** (the core, in the design chat). Asked, on being told what a look through the core before
     another project's first import had found, among it that a pull request was merged 24 minutes after it opened, on
     the fallback reviewer's security review, because Codex's own security review had never begun on it, though point 3
     of `modules/reviews.md` knew only a wait of about 30 minutes: the owner asked for everything that ought to be
     addressed from this to be addressed, in the session's opinion. Decided: a security review that starts by itself and
     shows no sign is not waited out, as point 2 already had it for the code review. Behind: "One not begun in about 5
     minutes" in point 3 of `modules/reviews.md`.

178. **13 November 2026** (the core, in the design chat). Asked: whether the core is clear enough about when another
     repository's orchestrator imports it, or whether there are gaps that could mean it is never updated, or updated on
     a different schedule than intended. Answered that there were three gaps: only the orchestrator was told to look, so
     a session started with none never did, and the daily issue was then the one signal; the rule did not name how to
     tell that the core had moved; and once a day had nothing to count from. Offered one sentence where every session
     reads it at the start of a task: a session no orchestrator started, and the orchestrator on every wake, first
     checks whether the core has moved (the script named) and imports if so; where checks cost money, not while an
     import pull request from the same day exists. Decided: the owner agreed. It was first written shorter than offered,
     to fit the rules' size; asked whether it stood as offered (item 179), the owner agreed to keep it as offered.
     Behind: the last sentence of "Sessions" in `modules/work-flow.md`.

179. **13 November 2026** (the core, in the design chat). Asked, on being told that the wait for a security review that
     starts by itself had been written in the review rules and not in the floor, where the owner had been told it would
     stand, because the floor had no room under the rules' size cap. Decided: if something ought to be somewhere, like
     the floor, but is cut or moved because of size constraints, that is abiding by the rules rather than by the
     principles that put them in place, and wherever there are more instances like this they are to be remedied; the
     owner also asked whether more rules lack anchors, and that this be investigated and remedied. Told what would
     follow: the cap raised one step and its principle written down (it keeps the rules lean and decides nothing else),
     every rule moved or cut for size put back, and each limit a session cannot check given what it counts from; the
     owner agreed to all of this. Behind: floor rule 8's line that a security review that starts by itself when a PR
     opens or is marked ready is waited for and read on every PR, a pure sync's too; the cap at 48 KB and "The size cap
     keeps the rules lean and decides nothing else" in `AGENTS.md`; and, put back or anchored: the fallback reviewer
     named in the *code reviewers*' order and "its closed PRs and the *progress file* say" in `modules/roles.md`, a
     posted security review "naming the tool and the commit it read" and "the project's newest PRs that asked it show"
     in `modules/reviews.md`, and the hints the orchestrator's rule had lost.

180. **13 November 2026** (the core, in the design chat). Asked what each provider's tool reads first from a project,
     and told that the tools take their instructions from more files than floor rule 3 named as rule files. Offered:
     floor rule 3 names as rule files any file a tool takes its instructions from, wherever it lies, with those files'
     names as examples. Decided: the owner approved. Behind: "and any other file a tool takes its instructions from,
     wherever it lies" in floor rule 3.

181. **13 November 2026** (the core, in the design chat). Asked for a take on everything the owner had agreed to on 12
     and 13 November. Told: keep all of it; add a reader for a review that comes in after its PR merged, since a late
     review is still read named none and a session stops at the merge; reword the *code reviewers*' order, whose
     Codex's, then Copilot's could be read as if Codex never builds; and give "Never a pull request" in the README,
     written on a question of the owner's, its yes. Decided: the owner agreed to all of those takes, with a concern that
     the cap can blow up, though the hard cap was worse; the best is that the cap is only ever expanded when it has to,
     not because of inefficient phrasing, duplication or anything else. Two minutes later the owner suggested that a
     reviewer has to concur that condensing is not possible without losing meaning or enforcement before the cap is
     expanded, and asked for a view. Told that it should, and that a code reviewer reads the change before it and not
     every rule each time. The owner's reason: condensing would primarily be condensing of what is already there, so a
     reviewer who cannot check whether room can be made with what was there before and what is added, and kept under the
     cap, cannot fully evaluate; the owner asked whether an independent verifier subsession is better. Told that it is:
     a fresh session that wrote none of the change reads all the rules for room, what it finds is trimmed, and the cap
     rises only if that is not enough, the reviewer blocking a raise without that check. The code review of the change
     held that a question of the owner's is no yes (`modules/how-to-work.md`), so the owner was asked outright whether
     this repository's review guidelines should gain that blocking point; the owner agreed to all of it. Behind: "a
     finding of the last week by a reviewer the project asks, made after its PR merged, with no reply, is answered as
     point 5 says" in `modules/reviews.md` and "then both read what reviews left after a merge" in
     `modules/work-flow.md`; "Codex's before Copilot's, where neither builds" in `modules/roles.md`; "Never a pull
     request" in `README.md`; and "It rises only when it has to" and "a raise of the size cap in a PR with no "Leanness
     check:" comment" in `AGENTS.md`.

182. **13 November 2026** (the core, in the design chat). Asked, on being told that the core's cap and its fresh-session
     check were the core's own, and that a project's marks moved with a reason alone: why a project's size cap should
     not work by the same mechanism and rules, as a genuine question; the builder should not pursue expanding a cap
     where it is more sensible to split instead, and more generally where it genuinely thinks something should be
     somewhere in particular, which could be a rule file the project has or whatever. Told that the owner was right for
     one of a project's two kinds of mark: a file past the split mark is split, as before, while a mark on what every
     session reads at its start should rise as the core's cap does (said shorter, what is said twice trimmed, what no
     session needs at every start moved to a file read when needed, then a fresh session's read of those files, and only
     then the mark, a reviewer blocking a raise without that check), growth that a sync of the core brings aside; and
     that this touches the review guidelines every project takes, so needs the owner's yes. Decided: the owner agreed to
     all of it. Behind: "A mark on what every session reads" in `modules/review-guidelines.md`, which the core's own cap
     now follows too (`AGENTS.md`).
     Changed by: #469.

183. **13 November 2026** (the core, in the design chat). Asked, on being told what a fresh session's read of all the
     rules for room had found in the floor: six wordings another floor sentence already says. Recommended: yes to three
     (the opening of `floor/topics.md` drops "read before a task touches one", which `floor/security.md` says; the
     opening of `floor/threat-model.md` drops "The part every project shares", which its title says; rule 17 drops "the
     one exception to rule 4", which rule 4 says), and the other three left alone (rule 3's list of files, a pronoun for
     the owner in rule 14, "key or secret" in rule 1). Decided: the owner agreed to apply all the recommendations.
     Behind: those three wordings in `floor/topics.md` and `floor/threat-model.md`; no rule's meaning changes.

184. **13 November 2026** (the core, in the design chat). Asked, after a fresh session's read of all the rules had found
     trims and some had been taken and some left by the design session's own judgement, whether there need to be clear
     criteria for what must remain in place for a condensing to be valid, since otherwise it is a question of taste; and
     whether a full audit could then be run on all the core's rule files, condensing them as much as possible and
     setting the cap there. Told: yes to criteria, written into the rule as the test for every trim (a reader with the
     trimmed text and what that reader has already read acts the same in every case; who a rule binds and when, what it
     asks, every limit and exception, what enforces it, its reason and each name and example stay; only a second
     statement of what that reader has already read, or words carrying none of these, may go; in doubt the words stay);
     yes to one audit pass under them over all the core's rule files, any trim in the floor listed for the owner's yes;
     and the cap set at the next whole KB above the result, not at it, since a cap with no room makes every one-line
     mend pay for a read of all the rules. Decided: the owner agreed to all of it, and the work could begin at once.
     Behind: "A trim is valid" in `modules/review-guidelines.md`.

185. **13 November 2026** (the core, in the design chat). Asked: whether a rule could make any finished session or
     subsession archive; at least the orchestrator archiving all its subsessions once they are finished, and probably
     also when they are told to stop due to usage and push everything up, since then it is better to have another
     builder session pick up again; and whether they can and should archive themselves. Told: yes, by the orchestrator
     and not by the session itself, which is the worst judge of whether it is finished and whose last message must be
     read first; once its task merged or it stopped with its work pushed and its note left, a stop for usage too, a
     fresh builder picking up from the branch; its last message read and nothing scheduled bound to it; archived, never
     deleted; never a session the owner works in or one waiting only on the owner's yes; a session nobody orchestrates
     says in its last message that it can be archived; and that whether an agent can archive a session depends on the
     tool that runs them, which the design session could not confirm for every one. Decided: the owner agreed to all of
     it. Behind: "A finished session is archived" in `modules/orchestrating.md` and "that it can be archived" in
     "Sessions" in `modules/work-flow.md`.

186. **13 November 2026** (the core, in the design chat). Asked: whether the core has anything about running occasional
     clean-ups and condensing runs, and whether, if the core is not the place for that, a job scheduled for it in a
     project's work queue file would also cover the rules files and use the new criteria, checks and verifications.
     Told: the core schedules none, rightly, since when to clean up is a project's own queue entry and a file reaching
     its mark is what forces a condensing; but the test for a valid trim stood inside the rule on raising a mark, so a
     clean-up that trims a rule file for another reason was not plainly bound by it. Offered: the test holds for every
     trim of a rule file, whatever it is made for, with no fresh session's read where nothing rises. Decided: the owner
     agreed. Behind: "It holds for every trim of a rule file, whatever its purpose" in `modules/review-guidelines.md`.

187. **13 November 2026** (the core, in the design chat). Asked, on the rule that a finished session is archived,
     whether sessions should also clean up. In the cloud it does not matter, since the container is finished when the
     session is; but locally or on a server they tend to leave worktrees, scratch files, branches and the like behind.
     Everything important for future work should be pushed and everything not cleaned up, and archiving a session seemed
     a good time to do it. Told: yes; the session cleans up what it made before its last message, since it knows what
     that is, and the orchestrator checks before it archives and does it for a session that could not; only what the
     session itself made; a worktree, clone or local branch goes only where nothing in it is uncommitted or unpushed,
     the rest pushed or left and named; what it started is stopped; no other session's folders and no branch on GitHub;
     nothing to do where the machine ends with the session. Decided: the owner agreed to all of it. Behind: "clean up
     what you made" in "Sessions" in `modules/work-flow.md` and "It first checks that the session cleaned up" in
     `modules/orchestrating.md`.

188. **13 November 2026** (the core, in the design chat). The audit pass had found one trim in the floor (rule 17's "the
     release notes read", as held by rule 7's source check) and it had been recommended to the owner, who said yes. Told
     before anything was changed that the recommendation was wrong: rule 7's source check covers only what ships and
     what builds it, so for an update to a tool that only runs, rule 17 alone asks that the release notes be read, and
     the words stay. Decided: the owner withdrew the yes, and asked whether the criteria should be made clearer to avoid
     false positives like this. Told: the test already rules that trim out, but a second statement did not say what
     makes two statements the same; offered that a second statement counts only if it covers every case the removed
     words do, with the same force, and that whoever proposes a trim names the other statement and what it covers; and
     that the nineteen trims merged that day had been gone over again, scope against scope, and held. The owner
     agreed. Behind: "one that covers every case the removed words do, with the same force" in
     `modules/review-guidelines.md`.

189. **13 November 2026** (the core, in the design chat). Raised: the owner is referred to by a gendered pronoun
     everywhere in the core, which makes the repositories less general purpose, and this is the last thing for the day
     that would benefit from being changed to something that could work for any owner. Asked also how the owner's game
     repositories know that the archive holds the owner's decisions, while another owner's project will know it is not
     that owner's archive, when the stand-in uses it to make calls. Told: every such word in the core's rules would be
     reworded to fit any owner (the owner, or they where no one else could be meant), the floor's among them on these
     words, and the words added to the check that fails what fits only some projects; this archive stays as written, a
     dated record. And told that a project tells whose words the core's archive holds by two accounts in its manifest,
     the one in the core's address and its *owner's account*, which the rule would now say. Decided: the owner approved
     all of it. Behind: the wording of the owner throughout the floor, the modules, `README.md` and `setup/`; the last
     pattern in `scripts/general.json`; and "the account in the core's address in the manifest not being the *owner's
     account*" in `modules/inbox.md`.

190. **13 November 2026** (the core, in the design chat). Asked: whether another project's repository will implement all
     modules, whether it did so on its first import, and whether it will implement new ones
     during daily syncs. Told: a project's copy of the core always holds every module, and each sync brings its newest
     text; which modules apply is the manifest's line, all or a list; changes inside a module a project takes arrive by
     themselves, but a list does not gain a new module by itself and nothing told a project so. Decided: built at once
     as an obvious improvement, to reach the next import: a note for every project, and a sentence in the README.
     Behind: "A list of modules does not grow by itself" in `README.md` and the note "the modules a project takes" in
     `setup/sync-notes.md`.

191. **13 November 2026** (the core, in the design chat). Asked: whether a full audit should be done again while no one
     waits on it. Told: yes, by a fresh reader of the whole core as it then stood, with the imports replayed and every
     suite run; plain faults mended at once, each reviewed, and whatever would change what a rule asks listed for the
     owner. Decided: the owner agreed. The reader found nine faults and some doubts. Mended: a late security finding
     that holds was to be filed as a bug, which floor rule 9 forbids of a weakness; the call for late findings read only
     those written on a line; the core's own `AGENTS.md` took no part of "Sessions", so no one here read late reviews or
     cleaned up; a clone was left out of what a session cleans up; and pointers and descriptions that no longer held
     (`README.md`, the header of `scripts/reading-size.mjs` and of the security-review workflow). The rules stood 17
     bytes under the cap and the mends add 94: a fresh session's leanness check found too little to trim, its answer in
     the PR, and the cap rose one step, to 52 KB. Left for the owner, each in the PR: a trim of the floor the check
     found, and the doubts that would change what a rule asks. Behind: "a weakness: floor rule 9" in
     `modules/reviews.md`; "those not on a line" in `modules/github-calls.md`; "worktree or clone" in
     `modules/work-flow.md`; "It also does here what "Sessions" in `modules/work-flow.md` asks" and "one step of a whole
     KB" in `AGENTS.md`; and the cap in `scripts/size.mjs`.

192. **13 November 2026** (the core, in the design chat; of `scripts/general.json`). Asked, as a last thing, on finding
     that file with the owner's username hardcoded: whether that is wise, since the owner could change it at any time,
     and why anchor things to a name so; would it not suffice to state the repository owner, if something should be
     anchored to the owner. Told: in that file the name is a banned word, which keeps it out of the rules; that the
     account stands in about ten places outside the archive, each an address or the one anchor of whose word counts,
     which is stated on purpose and never inferred; that GitHub needs it written out in a workflow's call to another
     repository and in an issue template's assignee; and that the scripts could share one place for it, a change for
     later. Decided: the owner agreed fully; it must be one place at least, so it only needs changing once, if there
     is no better way to attach it to the account name so that it changes dynamically; and all that had been agreed was
     to be finished that day. Behind: `scripts/core-address.mjs`, which every script that names the core reads; the
     one `CORE` of `.github/workflows/core.yml`, which may not read it from the copy it checks; the words check banning
     the account's login from there, the list no longer holding it; and `scripts/core-address-test.mjs`, which holds
     each place GitHub needs it written out to the one, and fails in the core's own repository where that is not the one
     named: the nearest to dynamic that GitHub allows.

193. **13 November 2026** (the core, in the design chat; of what the second audit left for the owner). Asked why the
     second audit's leftovers are necessary if it is proven that they hold to the criteria. Decided: nothing by the
     owner; the session answered that the trim of the floor holds to the test and waits only for the yes the floor asks
     of any change to itself; that three of the five wordings change nothing a rule asks and were the design session's
     to mend, which it does; and that two are decisions the test cannot settle. Behind: "save a helper whose definition
     gives them" in `modules/claude.md`, and a reviewer's login in `modules/codex.md` and `modules/copilot.md`.

194. **13 November 2026** (the core, in the design chat). Asked outright for two answers: yes or no to the trim of the
     floor the leanness check had found valid (the clause about the rest being in `floor/security.md` in the opening of
     `floor/topics.md`, which `floor/security.md` says of it in its own opening), advised as a yes since a valid trim
     goes whether or not there is room; and yes or no to the floor winning where two rules pulled against each other:
     floor rule 8 has a security review that starts by itself waited for on every PR, and point 2 of
     `modules/reviews.md` had a reviewer that failed three times running asked and not waited for, the security reviewer
     too. Advised: the floor stays as it is and the module says so, since waiting on a broken reviewer costs minutes and
     skipping the review that starts by itself costs more. Decided: the owner agreed to all that was advised. Behind:
     the opening of `floor/topics.md`, and "A security review that starts by itself is still waited for" in
     `modules/reviews.md`. A further point on accounts was filed as an idea.
