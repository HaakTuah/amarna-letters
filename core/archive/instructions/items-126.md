# The reasons behind the core: items 126 to 156

The index, and how an item is written: `archive/instructions.md`.

126. **10 November 2026** (the core). Asked: On the rule "No agent workflows and no ultracode" in Claude's own module,
     the owner was told that the helper rules already say when helpers pay and cap them at five, and that the rule bans
     a tool rather than a behaviour. Decided: The owner did not want workflows banned if they can be genuinely helpful.
     The ban was made when the core ran on ultracode, which is no longer the case, so the rule might prohibit something
     useful.

127. **10 November 2026** (the core). Asked: A security review of a game's step 3 found that, on a machine where agents
     run side by side, the tests run the game's packages under the account that holds the GitHub token, so a bad package
     could take it. The fix is to run project code where no sign-in can be read, and the owner asked how, suggesting one
     tool or another that runs agents side by side. Decided: Told that the separation sits below either tool (a
     throwaway box for the tests, given a copy of the clone), the owner asked that the agents still have internet
     access, since otherwise they cannot search for anything. Told that the agents keep full internet and only the box
     holding project code has no sign-ins, with network only where its run needs it, the owner agreed.

128. **10 November 2026** (the core). Asked: A game's orchestrator started a builder on Opus without passing an effort,
     as no rule named one, and the builder ran at extra effort, the app's default for a new Opus session. The
     orchestrator said its session tool takes an effort and that a session does not inherit its own. The owner was told
     that item 99's premise no longer holds and that the audit's reading of medium effort for Sonnet lanes was never
     measured, and asked why Sonnet should not run on high. Decided: The design session answered that there is no strong
     reason: Sonnet is the cheap model, a review round costs more than the extra thinking, and one effort for every
     session is simpler. The owner agreed: high for every session the orchestrator starts, Opus and Sonnet alike, and
     for the orchestrator, never above high without the owner's word. The owner asked whether escalation still allows
     extra effort, and was told yes: the escalation step keeps extra effort where the stuck builder already runs at
     high, as Claude's table sets it.
     Changes: 99.

129. **10 November 2026** (the core). Asked: The fallback security review of a game's sync to the core found three gaps
     left in the setup guide's test box: it covered only a project's install, build and tests; its instructions reached
     only Claude, though Codex runs the tests too; and only an instruction made the agents use it. A security finding in
     a PR's own change blocks it until fixed, so the game's PR cannot merge with them open. The owner was asked whether
     to fix the guide in the core now. Decided: The owner agreed to fix the guide in the core now.

130. **10 November 2026** (the core). Asked: On a game's ruleset page, which required neither code scanning nor code
     quality results, the owner asked why quality and scanning checks were not required. Decided: Told that code
     scanning results are worth requiring (a false alarm then waits for the owner to dismiss it), that code quality
     results would block every merge, as no Code Quality check runs, and that Copilot's code review has a cost on every
     PR and is no review the rules count, the owner chose to set the ruleset as shown: code scanning blocking on
     security alerts High or higher and alerts Errors, status checks with branches up to date, Copilot's review on. Told
     to leave code quality off, and asked whether the floor's false-alarm line should say the PR waits for the owner's
     dismissal where the ruleset blocks on the alert, with the same setting in every project, and whether Copilot's
     review should be advisory in the rules, the owner agreed to all. On the report's line that code quality results are
     not required, since no project runs GitHub's Code Quality check and GitHub warns that requiring them without it can
     block every merge, the owner answered that the setting had been made required, and that without the check present
     it surely would not trigger.

131. **10 November 2026** (the core). Asked: A game's builder had skipped the design session's comments on its PR,
     taking every comment from the owner's account with Claude Code's attribution line for its own. The owner was asked
     whether to add a rule that such a comment is not necessarily the reader's own. Decided: The owner agreed. The owner
     noted that the signature could also be dropped, but that using another chat session would then require remembering
     to tell it, so the rule is probably the better fix.

132. **10 November 2026** (the core). Asked: The next security review of the game's sync found three small gaps left in
     the test box: plain `node` on the host was held back by the instruction alone; files returned from the box could
     rewrite a script the host then runs, where a sign-in is in reach; and the box user was not said to be kept from
     Codex's account. The owner was asked whether to fix them in the core before the game merges. Decided: The owner
     agreed to fix them.

133. **10 November 2026** (the core). Asked: A game's orchestrator asked whether to start fresh builders for two PRs
     whose sessions it could not reach, and another held a PR for an answer the owner had already given. The owner asked
     why they were still asking about those sessions and whether anything in the rules covered watching out for it.
     Decided: Told that no rule did, and asked whether to add one (a lane whose session cannot be reached, with no push
     for a few hours, goes to a fresh builder from its branch), the owner said enough: the agents were asking nonsense,
     and the owner wanted no further question where the answer is obviously yes. The session is to handle it.

134. **10 November 2026** (the core). Asked: After a day of orchestrators asking the owner what the rules already
     settled, the owner asked which rules were added that made them ask so much nonsense, and said unnecessary rules the
     owner does not care about must be removed. The owner cares about the work loop and the pillars of good program and
     game design, not the rest that kept being added. The owner asked how the session would handle it, to lay it out,
     and what guarantees it could give. Decided: Shown the plan (the rules that made agents ask; what to keep: the
     owner's safety words, the work loop and the pillars; what to cut; one pass; a size cap in CI; what can and cannot
     be guaranteed), the owner agreed to everything and asked that it be made good, since it mattered greatly. The owner
     then objected to the rule that readings go to the owner as question issues, with the stand-in (the helper that
     predicts the owner's answer from past words) answering but anything it is less than highly sure of, or that is a
     matter of taste, still landing in the owner's inbox: the agents were supposed not to stop, and the owner had
     emphasized over and over that the machinery keeps churning.

135. **10 November 2026** (the core). Asked: The owner, having turned on auto-merge as an option in every repository,
     the owner asked whether to use it as a rule. Decided: Told yes, once Codex's reviews are clean on the head commit,
     since auto-merge waits only for the checks GitHub knows of, and the reviews are not among them, the owner agreed to
     everything.

136. **10 November 2026** (the core). Asked: On Claude's table of models and effort, the owner asked why everything was
     high, whether it warranted that, and why the Haiku effort was not set, since an unset effort had just been seen to
     take whatever the owner last used. Decided: Told that the search helper's effort was indeed left unset, against the
     rule to pass both model and effort, and that it gets low, since searching needs little thinking, with the rest high
     only where judgement decides the cost.

137. **10 November 2026** (the core). Asked: The owner was shown two orchestrators' reports asking the owner for yeses
     already given and settings already made, the owner said that everything must be fixed. Decided: The orchestrators
     are to stop asking those needless questions.

138. **10 November 2026** (the core). Asked: The owner was told that a Playwright update in a game touched nothing of
     the owner's, and that the owner's yes on the cloud setup script and on workflows protected nothing the owner could
     judge better than the reviews, the owner was given a proposal: such changes pass two independent security reviews
     (Codex's and a fresh Opus reviewer's) instead, with the owner's yes kept only for spending money, what cannot be
     undone, the safety rules themselves and a licence exception. Decided: The owner agreed that this was correct and to
     do it.

139. **10 November 2026** (the core). Asked: The owner was told that each game's sync PR was being reviewed by Codex
     again, after the same text had passed both reviews in the core's own PR. Decided: A review is never done twice
     without reason: if it passed once, it does not suddenly go sour the second time. The session is to ensure there are
     no more duplicate reviews and checks like this.

140. **10 November 2026** (the core). Asked: The owner was told that a pure sync would keep its security review although
     its code review goes, since dropping both had been refused as weakening security. Decided: The owner objected that
     the security review is already done when the change was made in the core's repository, and that the project is not
     a place for excess caution.

141. **11 November 2026** (the core; first in both games, 2 November 2026). Asked: On the audit of what players read,
     the owner asked whether a review scored 1 to 10 was not present. Each kind of text is scored 1 to 10 and only a 10
     passes, and the owner agreed to this after reading the lines before and after the final word. Told that both games
     had written that bar for themselves, the owner was asked for a yes to move it into the core's review guidelines,
     which change only on the owner's word. Decided: The owner agreed to the text bar.

142. **11 November 2026** (the core). Asked: The owner asked why the stand-in did not answer on ideas and whether there
     was more it could do. Told that it answers open points in work the owner has chosen, while nothing is built from an
     idea until the owner moves it into the progress file, the owner was offered its verdicts on ideas, its sureness and
     a check of what players see. Decided: The owner liked the idea of the stand-in doing more and asked whether there
     was even more it could do. The owner then asked whether it could give these in its answers rather than in calls of
     their own, since it is already answering questions and has to read the owner's previous takes regardless, which
     seems more efficient. To doing so, with one weekly sweep for the ideas no answer touches, the owner agreed to
     everything.
     Changed by: 168.

143. **11 November 2026** (the core). Asked: The owner asked whether rules were duplicated that should be in the core.
     Told which rules the games repeat from the core, and which rules one game wrote that hold for every game or project
     (an optimization changes nothing a player would notice; a feature too rare to change whole games judged per use and
     against its counter; no refuges; a long task may end its session at a passed gate). Decided: The owner agreed to
     all of it.
     Changed by: #306.

144. **28 October 2026** (Amarna Letters, in the design chat). Asked: The words behind a reading listed with what
     it rests on, which that game's design document had written as part of its "Reason from the pillars"; moved here
     when the owner asked on 11 November 2026, of the core and both games, whether everything was perfectly cohesive,
     shared, with no duplication, and perfect now, and to be thorough in the checks. Decided: Code should probably note
     where it has made an assumption, as it now does with questions, so that the owner can check it afterwards.

145. **31 October 2026** (Amarna Letters, its archive item 73, for both games, in the design chat). Asked: The words
     behind the polish lane, which each game then wrote for itself and which moved here on 11 November 2026, when the
     audit the owner asked for (is everything perfect now, thorough) found the two copies drifting apart, and the last
     lines both games still shared (what it looks for, and when it runs) the same day. The owner said the polish lane
     could spend usage left over at the end of a week, and asked whether each game should add a polish point that it can
     spend what is left on. Decided: To the design session's shape of the polish lane, the owner agreed and asked that
     things be made as refined as possible.

146. **11 November 2026** (both games, in the design chat). Asked: After the final audit's report, the owner
     remarked that it had taken a couple of hours, and proposed removing all reference to usage caps, since the session
     and the orchestrators all got it wrong and it cannot be tracked in the cloud regardless, while keeping the rules
     about spending other providers first, such as Codex. The owner asked whether that sounded sensible. Decided: The
     usage brake is removed from the core and both games (floor rule 16 among it, with the owner's yes as asked), and
     "other providers first", which core archive 76 gave and the cut-down of 10 November had dropped, returns.
     Changes: 76.

147. **11 November 2026** (both games, in the design chat). Asked: The owner was told that one shared
     workflow for the games' pull-request previews (an idea filed in the core) waited on the owner's yes, since it
     changes what runs with the token that publishes the site, the owner asked why one shared workflow was not used.
     Decided: Obvious improvements are implemented automatically.

148. **11 November 2026** (the core, in the design chat). Asked: The owner was asked whether the core should
     be opened to a project of another owner, so that it takes the core whole, its updates through sync PRs, once the
     owner's GitHub account, written into five places (floor rule 4 among them), became a slot each project fills.
     Decided: The owner chose the answer offered as recommended: open the core to the other owner.

149. **11 November 2026** (the core, in the design chat). Asked: The owner was asked whether floor rule 18 should gain
     an exception for an owner's own computer, since as written it forbade a setup another owner already runs. Decided:
     The owner answered that the setup is something the owner does, so rules on what kind of set-up is allowed seem like
     overreach: all they achieve is the system refusing to work, and they do not help it work right, as the build rules
     do. Rule 18 was cut down to what agents do, the setup itself left to the owner and `setup/server.md`. Then, to the
     design session's answer (rule 18 keeps only what agents do; and the phrases of the core that assume a game or a
     live site, one of them in floor rule 12, are made to fit any project), the owner agreed to all.

150. **11 November 2026** (the core, in the design chat). Asked: Once a project of another owner, not a game,
     could take the core, the owner was asked about making sure the rules stay general. Decided: The owner agreed, and
     said that rule changes made to the core from now on must be general enough and account for this. The owner wanted
     the rules general, but implementers are easily biased in phrasing by the only two projects in front of them, and
     asked how to ensure it. Behind: "Rules are written for any project" and the words check.

151. **11 November 2026** (the core, in the design chat). Asked: The owner was asked for a yes to five places
     where the floor assumed a public web project on npm (everything public; npm's signature check alone, with "a check
     that cannot run holds the release back"; `npm ci`; text reaching "the page"; a session on the owner's computer
     holding "no key beyond its own sign-in"), after a sample project that was none of those took the core from nothing.
     Decided: The owner agreed with everything, said that NuGet and the like should be allowed, and asked whether there
     should be a criterion or ideal of being verified by a trustable source, like NuGet itself, or something like that.

152. **11 November 2026** (the core, in the design chat). Asked: The owner was told that a check of the
     core's own for actions not pinned had drawn a new way past it in each of five review rounds, since it read YAML by
     lines, and that GitHub's own setting "Require actions to be pinned to a full-length commit SHA" reads a workflow as
     GitHub runs it, but asks the same of GitHub's own actions, which floor rule 2 lets stand at a tag. The advice
     given: pin those too, then turn the setting on, the core and one project first, and keep of the check only its
     search for `pull_request_target`. Decided: The owner asked whether the no-install rule was sensible then, and to
     test the setting instead if that was the advice. The owner then agreed to do everything recommended on this.

153. **11 November 2026** (the core, in the design chat). Asked: The owner was shown six rules held only by discipline,
     each of which a check could hold, the sixth being that every PR says what the owner can try and what readings it
     took, which the advice at first left out as rarely broken; a count then showed about three in four merged PRs
     without the first. Decided: The owner agreed to all, and held that mechanical enforcement of rules, like code size
     checks and whatever the agents get wrong in following the rules, is good to run every time, as is done, so that
     nothing not allowed goes in. The owner asked whether all six were now added, and why the sixth had been left out
     and why the advice covered only one to five.

154. **12 November 2026** (the core, in the design chat). Asked: Of a project of another owner whose tools differ from
     the games', about to take the core: told that the core gave Codex the reviews alone, named Codex and Claude's
     reviewer where it meant a provider and its reviewer, and counted no review of other tools', the owner was asked
     whether who reviews what should be a blank each project fills in. The owner was concerned that the core would
     actively fight the other owner's setup and asked what to do. Decided: The owner agreed to point 1 and held that
     overrides are good. The owner asked whether the rules were a bit rigid on these points, and whether it would be
     better to have general rules under which Claude hands out the work it can outsource by the best criteria for that
     (asking whether the criteria in place are the best or too strict), with different providers reviewing each other
     where possible and a single reviewer kept.

155. **12 November 2026** (the core, in the design chat). Asked: The owner was asked whether more rules named one
     provider where they meant any, the owner was shown five: who gives the security reviews (a floor rule among them),
     how a review is asked for and waited on, the instructions for a builder of another provider, how findings are
     graded (Codex by priority, every other reviewer by a score from 1 to 10) and the Node section of the update rules.
     Decided: The owner agreed to all, and asked whether more rules like these ought to be generalized. The owner then
     said to do everything advised here, provided it does not interfere with how the work is done now. The owner asked
     whether Codex and GitHub Copilot can review like this when instantiated via GitHub, and asked for an investigation,
     searching back in the conversation, into why this was added for Codex: if everything can use the scale out of 10
     instead, that is preferable and should be standardized for all. Told that Codex's reviews through GitHub still give
     priorities and no score (item 21), and Copilot's no grade at all, so that one score for all cannot be had, the
     outcome was: every finding is blocking or not, the score stays with every reviewer that can give one, and a tool's
     own grades are read as one or the other.
     Changes: 21.

156. **12 November 2026** (the core, in the design chat). Asked: Once a project of another owner had taken the core, set
     up otherwise than the games. Decided: The session was to investigate and make sure that no hook, check or rule
     interferes negatively with the other owner's setup and work now that the project has the core. Rules that enforce
     compliance with best practices are good and make the agents work as they should, but anything that stops work
     because the setup is different must absolutely be addressed. Behind: the end of floor rule 10 (the owner's own work
     carries the terms the owner gives it, where it said no licence file ever), and the README's lines under "How a
     project takes the core" for a project set up otherwise, among them "The default branch is `main`".
