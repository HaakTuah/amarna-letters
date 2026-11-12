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
