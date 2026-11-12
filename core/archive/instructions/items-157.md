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
