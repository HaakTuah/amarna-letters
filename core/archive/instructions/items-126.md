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
