# The owner's words behind the core: items 126 onward

How they are kept, and where each item lives: `archive/instructions.md`.

126. **10 November 2026** (the core), on the rule "No agent workflows and no ultracode" in Claude's own module, told
     that the helper rules already say when helpers pay and cap them at five, and that the rule bans a tool rather
     than a behaviour:

     > Yes, but if workflows can be genuinely helpful, I don't want to ban them. We ran it on ultracode when that
     > happened, and that is no longer the case, so we might be prohibiting something that could be useful to us,
     > expert.

127. **10 November 2026** (the core). Told that a security review of a game's step 3 found that, on a machine where
     agents run side by side, the tests run the game's packages under the account that holds the GitHub token, so a
     bad package could take it; and that the fix is to run project code where no sign-in can be read:

     > And how do we do that, expert? We might either use Claude Code with Codex plugin, or Herdr.

     Told that the separation sits below either tool (a throwaway box for the tests, given a copy of the clone):

     > But I want them to have internet access? Otherwise they can't search for anything?

     Told that the agents keep full internet, and only the box holding project code has no sign-ins, with network only
     where its run needs it:

     > Yes, expertly.

128. **10 November 2026** (the core). A game's orchestrator started a builder on Opus without passing an effort, as no
     rule named one, and the builder ran at extra effort, the app's default for a new Opus session; asked, the
     orchestrator said its session tool takes an effort and that a session does not inherit its own. Told that so
     item 99's premise no longer holds, and that the audit's reading of medium effort for Sonnet lanes was never
     measured:

     > Why shouldn't sonnet run on high, expert?

     To the design session's answer (no strong reason: Sonnet is the cheap model, a review round costs more than the
     extra thinking, and one effort for every session is simpler; high for every session the orchestrator starts, Opus
     and Sonnet alike, and for the orchestrator, never above high without his word):

     > Agreed. However escalation still allows for extra, expert?

     Told yes: the escalation step keeps extra effort where the stuck builder already runs at high, as Claude's table
     sets it.

129. **10 November 2026** (the core). Told that the fallback security review of a game's sync to the core found three
     gaps left in the setup guide's test box (it covered only a project's install, build and tests; its instructions
     reached only Claude, though Codex runs the tests too; and only an instruction made the agents use it), that a
     security finding in a PR's own change blocks it until fixed, so the game's PR cannot merge with them open, and
     asked whether to fix the guide in the core now:

     > Yes, expertly!

130. **10 November 2026** (the core), on a game's ruleset page, which required neither code scanning nor code quality
     results:

     > Why not require quality and scanning checks, and such, expert?

     Told that code scanning results are worth requiring (a false alarm then waits for him to dismiss it), that code
     quality results would block every merge, as no Code Quality check runs, and that Copilot's code review spends his
     Copilot credits on every PR and is no review the rules count; shown his choice (code scanning blocking on security
     alerts High or higher and alerts Errors, status checks with branches up to date, Copilot's review on):

     > I think I'll set it like this then, expert.

     Told to leave code quality off, and asked whether the floor's false-alarm line should say the PR waits for his
     dismissal where the ruleset blocks on the alert, with the same setting in every project, and whether Copilot's
     review should be advisory in the rules:

     > Yes, expertly to all!

     On the report's line that code quality results are not required, since no project runs GitHub's Code Quality
     check and GitHub warns that requiring them without it can block every merge:

     > I did set it this to required:
     > "Code quality results are not required: no project runs GitHub's Code Quality check, and GitHub warns that
     > requiring them without it can block every merge."
     >
     > If I don't have it, then surely it won't trigger.

131. **10 November 2026** (the core). Told that a game's builder had skipped the design session's comments on its PR,
     taking every comment from his account with Claude Code's attribution line for its own, and asked whether to add a
     rule that such a comment is not necessarily the reader's own:

     > Yes, though you could just drop the signature also? But if I use another chat session, then I'd have to remember
     > to tell it, so your fix is probably better, expert.

132. **10 November 2026** (the core). Told that the next security review of the game's sync found three small gaps
     left in the test box (plain `node` on the host was held back by the instruction alone; files returned from the box
     could rewrite a script the host then runs, where a sign-in is in reach; and the box user was not said to be kept
     from Codex's account), and asked whether to fix them in the core before the game merges:

     > Yes, expertly.

133. **10 November 2026** (the core). A game's orchestrator asked whether to start fresh builders for two PRs whose
     sessions, started on another account, it could not reach, and another held a PR for an answer the owner had already
     given:

     > Why are they still asking about the other account... have you put anything into the rules about watching out
     > for it...

     Told that no rule did, and asked whether to add one (a lane whose session cannot be reached, with no push for a few
     hours, goes to a fresh builder from its branch):

     > Enough. They are asking nonsense. I don't want another question where the answer is obviously yes. Handle it,
     > expert.

134. **10 November 2026** (the core). After a day of orchestrators asking him what the rules already settled:

     > What rules have you added that make them ask this much nonsense? We need removal of unnecessary rules that I
     > don't care about. I care about my work loop and pillars of good program and game design, I don't care about
     > these stuff you keep adding, and I have humored it for long enough. How will you handle it, expert. Lay it out
     > for me, and what guarantees can you give me?

     Shown the plan (the rules that made agents ask; what to keep: his safety words, his work loop and the pillars; what
     to cut; one pass; a size cap in CI; what can and cannot be guaranteed):

     > Yes, expertly to everything, and make it good! My sanity depends on it!
     >
     > "Readings go to you as question issues. The stand-in (the helper that predicts your answer from your past
     > words) answers, but anything it’s less than highly sure of, or that’s a matter of taste, still lands in your
     > inbox."
     > I thought they were still not supposed to stop? I have over and over emphasized that the machinery keeps
     > churning!

135. **10 November 2026** (the core), having turned on auto-merge as an option in every repository:

     > I have turned on auto-complete as an option for all repositories, should we utilize it as a rule, expert?

     Told yes, once Codex's reviews are clean on the head commit, since auto-merge waits only for the checks GitHub
     knows of, and the reviews are not among them.

     > Yes, to everything, expertly!

136. **10 November 2026** (the core), on Claude's table of models and effort:

     > Why is everything high, does it warrant it, and why is haiku effort not set? Haven't we just seen that means it
     > takes whatever I last used instead then?

     Told that the search helper's effort was indeed left unset, against the rule to pass both model and effort, and
     that it gets low, since searching needs little thinking; the rest is high only where judgement decides the cost.

137. **10 November 2026** (the core). Shown two orchestrators' reports asking him for yeses he had already given and
     settings he had already made:

     > Fix everything, I am too tired for this. Make them stop asking these headache inducing questions.

138. **10 November 2026** (the core). Told that a Playwright update in a game touched nothing of his, and that his yes
     on the cloud setup script and on workflows protected nothing he could judge better than the reviews, with the
     proposal that such changes pass two independent security reviews (Codex's and a fresh Opus reviewer's) instead, his
     yes kept only for spending money, what cannot be undone, the safety rules themselves and a licence exception:

     > Correct. Do it, expertly.

139. **10 November 2026** (the core). Told that each game's sync PR was being reviewed by Codex again, after the same
     text had passed both reviews in the core's own PR:

     > Never do this kind of review twice without reason. If it passed ones, it doesn't suddenly go sour the second
     > time. Ensure there are no more duplication reviews and checks like this, expert.

140. **10 November 2026** (the core). Told that a pure sync would keep its security review although its code review
     goes, since dropping both had been refused as weakening security:

     > But it already does a security review when the change was made in the agent-core repo? We are not cyberdyne
     > systems…
