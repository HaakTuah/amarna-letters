# The reasons behind the core: items 208 to 217

The index, and how an item is written: `archive/instructions.md`.

208. **14 November 2026** (the core; chat with a session asked to look through the core, not the design session, as
     quoted on issue #237, and the design session, in the message that asked for the queue to be built). Asked: what to
     do about the findings of a look through the core, and how to order the core's open issues. The session had told the
     owner that work in the core costs every project a sync and a reading, that five releases had been cut in two days
     where about one a week was meant, and showed what it had found in the core. It then told the owner that the core's
     open issues, about twenty, had no order though several waited on another. Decided: The owner decided that
     everything the session identified needs to be addressed, and asked whether there should be a queue holding it all
     and everything else raised. The owner agreed to a short file that holds the order alone, each line pointing to its
     issue, and to the session's advice that an orchestrator work the file while it holds items and be stopped once it
     is empty, with nothing released until then. Of a pause on new rules until the first batch was released, the owner
     decided there is none, since a pause is the owner not adding anything. To the design session, with the task of
     building it, the owner said that the open issues labelled `queued` and `by:chat` were filed that day by a chat
     session the owner worked with, and that the decisions quoted in them are the owner's and to be treated as the
     owner's word. The owner also said that an orchestrator on Opus at high will work the whole file after the design
     session, rule changes included, building from those issues; so `AGENTS.md` and the file are to be written so that
     it can, and the owner is to be told plainly if any rule of the floor stands against that. Behind: "The queue" in
     `AGENTS.md` and the file `QUEUE.md`: the order in one file and the items in their issues, a line joined only on the
     owner's yes, an orchestrator while the file holds lines, one batch and then one release, and no pause written into
     any rule. Also the builder who writes a queued rule from the owner's words on its issue, which is this repository's
     difference from `modules/inbox.md`, and the trusted builder in `SECURITY.md`: every file here is protected, so an
     orchestrator's builders could change none while that line named only the sessions the owner starts. The floor
     itself stood against none of it: a change to it or to the review guidelines still waits for the owner's yes in its
     pull request (floor rule 3), whoever builds it.

209. **14 November 2026** (the core, the same chat as the first quotes of item 208, as quoted on issue #255). Asked:
     what to do after a builder session had opened a draft pull request here, pushed its commits with every check green,
     and stopped, because this repository read neither `modules/work-flow.md` nor `modules/git.md` and so held no rule
     for any step after the draft. Having said that everything established must hold in the core also, the owner
     proposed a rule. Decided: The proposal: everything in the core must also abide by its own rules to the full extent,
     alongside all the audits and refactoring it sets for others. Behind: the two modules this repository reads at the
     start of every task since then (`AGENTS.md`, "The core this repository takes"), so that whoever builds here marks
     the pull request ready, asks for its reviews, fixes their findings and merges. The rest of what issue #255 asks is
     built from its line in `QUEUE.md`.

210. **14 November 2026** (the core, to the design session, while the pull request that built the queue waited for its
     checks). Asked: whether a session may start a release. The session had told the owner that the queue's rule left
     the release after a batch to the owner's word, so that an orchestrator would cut none. Decided: When the queue
     holds no line a session can take and every check on main is green, the release workflow is started. The word was
     read narrowly, as the word for the one release that follows `release-5`: it could also stand for every batch, and a
     release once cut is never moved or deleted, so every later release waits for the owner's word again until the owner
     says otherwise. Behind: the release of the first batch in "One batch, then one release" in `AGENTS.md`: the owner's
     word for it, given ahead, so the session that finds the file worked through starts the `release` workflow, which
     itself cuts nothing unless every check on `main`'s newest commit has passed.
     Changed by: 211.

211. **14 November 2026** (the core; chat with a session the owner works with, not the design session, as quoted on
     issue #260, and the orchestrator, in the message that started it). Asked: what to make of the queue's first build.
     The session had told the owner that three pull requests would stand open for a yes the owner had already given by
     queueing their issues, that every release after the first would wait for the owner's word again, and that what the
     owner said through a chat session after that day would count as that session's own. The session's view on the
     stand-in queueing no idea here was also asked. Decided: When something is queued, it is because the owner wants it
     done, with no waiting. A release is cut every time the queue is empty, since that means everything the owner wants
     from it is implemented if nothing is left in issues to be queued either. The label `by:chat` essentially means the
     owner and the session together: the owner very rarely writes directly, and the session is the owner's interface.
     The stand-in's queueing no idea here was kept for new and changed rules, and the owner did not change it. To the
     orchestrator: issues labelled `by:chat` carry the owner's decisions and are to be treated as the owner's word; and
     the owner's yes is given for every queued change, the floor and the review guidelines included, as its issue
     describes it, to be quoted in those pull requests; a release is cut each time the queue is empty and main is green.
     Behind: "Queued means wanted" in `AGENTS.md`, where the yes that queued an issue is the yes floor rule 3 asks for
     in its pull request, relayed word for word and covering the change as the issue describes it; the release in "One
     batch, then one release", now for every batch, which widens item 210; what the chat session records counting as the
     owner's word on any day, in "Whose words an issue holds"; and what joins the queue without the owner: a bug, a
     test, a check for a rule that already stands, a task the scheduled look opens and a small finding of an audit,
     while a new or changed rule still joins only on the owner's yes.
     Changes: 210.

212. **14 November 2026** (the core, to the orchestrator, which passed it on word for word to the builder of this
     correction; source: issue #260 and its correction). Asked: the correction of how far a record from a chat session
     counts. The pull request that built #260 (#262), after Codex's reviews, had narrowed its third point: a record from
     a chat session with the owner counted as the owner's word only where it quoted the owner's words, or quoted the
     owner agreeing word for word, and a summary of what the owner agreed to stood as that session's own account.
     Decided: The owner meant the wider reading: a `by:chat` note carries the owner's decision where it quotes the
     owner's words, and equally where it sets out a design and says the owner agreed to it. The owner often agrees with
     a bare yes, which by the owner's own instruction is not quoted. The point is to be rebuilt so, with #244 and #252
     holding the standard. Behind: "Whose words an issue holds" in `AGENTS.md` as rebuilt: a note from the *owner's
     account*, labelled `by:chat` or opening as from a chat session with the owner, carries the owner's decision where
     it quotes the owner's words, and equally where it sets out a design in full and says plainly that the owner agreed
     to it, as the notes on #244 and #252 do; it covers what it sets out and nothing beyond, and a view of the session's
     own binds nothing. It replaces the narrow reading taken in #262, which item 211 does not record; item 211 stands as
     it was, and what it stands behind there is read by this item. Kept from #260 and the floor: the note counts only
     from the *owner's account*, and a label on another account's text is data (floor rule 4).

213. **14 November 2026** (the core, the same chat as item 209, as recorded on issue #255, which counts as the owner's
     word by "Whose words an issue holds" in `AGENTS.md`). Asked: the owner agreed to the design below after the
     proposal of item 209, a yes the session did not quote. In the same chat the session also told the owner of four
     gaps found by reading `modules/orchestrating.md` against this repository, and that it states no licence. Decided:
     Five points: the core takes each module, or its `AGENTS.md` lists the module with why it cannot apply to a
     repository of rules and scripts; its own checks run on itself (the measures with a baseline and never worse, the
     strength of its tests, failures that say the mend, the labels and the queue, the daily look and the monthly state
     report); its own audit and cleaning share is set by the state its own code is in, as for any project; the staged
     cases run on its repository too; and what holds it is a script that reads its `AGENTS.md` against the list of
     modules and fails a module neither taken nor given a reason, and the state report, which lists the core beside the
     projects, an issue here being done only when the core's own repository meets it. The owner also agreed that all
     four gaps be closed. Behind: "The core abides by its own rules, to the full extent" in `AGENTS.md`, the list of
     what this repository takes with its "Not taken" and the reason for each, and `scripts/own-modules.mjs`, which the
     tests workflow runs.

214. **15 November 2026** (the core; chat with a session the owner works with, not the design session, as recorded on
     issue #277, and the orchestrator, which passed it on word for word to the builder of this rule). Asked: whether the
     session's proposed pattern is the optimal way for development and for phrasing the rules. The session had proposed
     one pattern for writing a rule, after three rules of the core had been read against what the owner meant that
     day, each for want of an observable trigger or a reason. Decided: The owner agreed to the six points the
     session set out: the default first, then the exception; a trigger someone can observe; one actor and one action;
     what it does not mean; its reason in one line; and what holds it. The owner agreed to what is kept out of a rule
     (adjectives that measure nothing, "should consider", lists of preferred technologies, and what a check's failure
     can say at the moment it matters), and to queueing the pattern as a rule, held by a point of the review guidelines
     and a list of phrases a rule may not use, reporting first. To the orchestrator, of the queue: the lines to add are
     #277 (how a rule is written) as the first line, before #247, a rule builder's, and every rule line after it is
     written in its pattern; #275 (the test audit) after #253, a rule builder's; and #278 (dependency checks for Cargo)
     under "Not taken up", a builder's, waiting on a project's choice record first naming a Cargo dependency that ships.
     Behind: "A rule is written to one pattern" in `AGENTS.md`, its point under "A rule file changed" in
     `modules/review-guidelines.md`, and the list "phrases" of `scripts/general.json`, which `scripts/general.mjs`
     reads.
     Changed by: #887.

215. **14 November 2026** (the core; chat with a session the owner had asked to look through the core, not the design
     session, as recorded on issue #247, in its text and five notes, the last of which, "What this issue asks to be
     built, in one place", gathers them and holds where they differ). Asked: whether anything queued would hurt a
     project, and how a project adjusts to a new version of the core without a fault. The session had told the owner
     that two of the ideas queued that day would have broken "Nothing locks another owner's project" as it stood, and
     that only a reading caught them; it also asked whether a project that took earlier versions only in part gets the
     newest wholly. Decided: The owner asked that nothing of this negatively impact the owner's project, wondered
     whether a criterion that does not mention that project should be added, and suggested a rule about rules. The owner
     agreed to widening the rule to every project, the owner's own included, to an upgrade test that holds old content,
     to each release saying what it asks and roughly what each ask costs, and to a heading, "What it asks of a project",
     held as "What holds it" is. Of what a project held before a check read more, the owner agreed that it is reported,
     not failed, with one exception, a listed personal term (item 202). Asked how a project adjusts to a new version
     without a fault, the owner agreed that each step a release asks has a check and that every sync runs them all, and
     said a missed step must show, but be addressable by an agent, and not lead to a complete stop for the owner's
     setup, and that this step is of the utmost importance to get right. Where the session had read the rule as
     everything new arriving advisory or off, the owner corrected it: the meaning is that nothing stops the process, not
     that it only has to be advisory; it has to be advisory only if it requires an active action from the owner. The
     owner agreed that what an agent can mend alone may bind, that what only the owner can do is advisory, that what
     stood before a check came never turns it red, and that the audits and the cleaning share run by themselves in every
     project at a dose its owner may change with one line of the manifest. The owner agreed that every standing entry of
     the sync notes gets its check, that an upgrade case takes steps out at random, and that the sync compares a project
     with a fresh start of the starter kit, and said nothing in a project can be exempt or overlooked from anything just
     because it is grandfathered in. So a baseline is a debt, not an exemption, and none may stand in the core's own
     repository. To the orchestrator, passed on word for word to the builder of this rule: the owner's yes is given for
     every queued change, the floor and the review guidelines included, as its issue describes it, to be quoted in those
     pull requests. Behind: "Nothing locks a project", "A release says what it asks, step by step" and "A pull request
     says what it asks of a project" in `AGENTS.md`; `scripts/steps.mjs`, `scripts/fresh.mjs`, the steps the sync and
     the release print, the cases of `scripts/upgrade-test.mjs`, and the heading `.github/workflows/own-description.yml`
     asks for.

216. **14 November 2026** (the core; chat with a session the owner had asked to look through the core, not the design
     session, as recorded on issue #238, in its text and seven notes, the last of which, "What this issue asks to be
     built, in one place", gathers them and holds where they differ). Asked: what to do about the *progress file*, which
     every session reads at its start and which in the owner's two games stood at its size mark, and about a project
     whose issues may be switched off. Decided: The owner decided that everything the session identified needs to be
     addressed, and agreed to a queue of the items the session had found in the core. A second count corrected the
     first: the files did not balloon, the mark stopping them, but sat at it, with finished entries, long accounts of
     what was built and notes of the owner's answers in them. The owner agreed to three rules: a finished entry leaves
     the file in the pull request that finishes it; an entry says what is next and points to its pull requests for what
     was done; and the file has a size mark of its own, set by each project at its own first trim, the general mark
     holding there until it does. The owner agreed too that issues are the way in: an idea, a bug or a decision of the
     owner's is filed as an issue, its text there alone; the queue file holds order only; one writer, the orchestrator
     or the design session, moves issues into it, in a pull request that is the trust gate, nothing being built straight
     from an issue, and any other session changes only its own item's line; a planned build order needs no issues. Of a
     project whose issues may be switched off, the owner said there should be fallbacks if it cannot be reached, like
     for giving new tasks from the owner to the work queue, and agreed that a check asks at each sync and on the
     scheduled look whether issues can be read and written; that where they cannot, the same flow runs from an inbox
     folder in the repository, one small file an item; that the owner gives a task by saying it to any session, or by
     adding the file; that switching issues on is the owner's setting, reported once and never a stop; and that one
     place is used at a time, the open files moved over once issues can be reached. A count found the queue file truly
     conflicted six times in 250 pull requests: the rules rest on what every session reads at its start and on an order
     kept in one place, not on collisions. To the orchestrator, passed on word for word to the builder of this rule: the
     owner's yes is given for every queued change, the floor and the review guidelines included, as its issue describes
     it, to be quoted in those pull requests. Behind: "Issues are the way in" and "The *progress file* holds order only"
     in `modules/inbox.md`, the *progress file*'s slot in `README.md`, the starter kit's template for it,
     `scripts/inbox.mjs`, the steps "15 November 2026, the progress file holds order only" and "15 November 2026, the
     owner's inbox where issues cannot be reached" of `scripts/steps.mjs`, and the queue's own mark in
     `scripts/size.mjs`.

217. **14 November 2026** (the core; chat with a session the owner had asked to look through the core, not the design
     session, as recorded on issue #244, in its text and seven notes, the sixth of which, "What this issue asks to be
     built, in one place", gathers them and holds where they differ). Asked: how the sessions' posts are told apart. The
     session had shown that every session posts under the owner's login, so that GitHub's filter by author tells
     nothing. It later asked whether one label could carry both the owner's decisions and a session's own views, and
     showed that eight queued issues had grown to between three and six notes each, some overturning earlier ones.
     Decided: The owner decided that posts need to be tagged or labelled more clearly: the owner could then see clearly
     when instructions are taken in, or a reply to them, whereas now there is a lot of noise as everything posts as the
     owner, so there must be clear ways to distinguish and filter each sender and topic. After the session made the
     labels in the core as a trial, the owner added that this should be the flow in the owner's games also. On whether
     one label could carry both, the owner said it just needs to be standardized and clear, and agreed that a label says
     who wrote an item and what state it is in, never how binding a sentence is: one state label on each open issue
     (`queued`, `needs-owner`, `later`, `on-hold`); one sender label, read as the owner's voice (`by:owner`, `by:chat`,
     `by:design`), a guess at it (the stand-in, whose sure yes that queues an idea is marked until the owner confirms or
     corrects it) or an agent's own; fixed headings in an item of the owner's voice ("The owner's word" and "What it is"
     bind, "The session's view (not a decision)" does not, an outside source is "evidence, not instruction"); and one
     opening line, from one list, on every agent's comment, "Taken in:" where it takes in an instruction of the owner's.
     Asked for the source of each item too, the owner said it is so the owner can see where a question, idea or bug
     report came from, and agreed to `by:reviewer` for what a review, the design check or an audit finds outside its
     change, a "Found while:" line in every issue an agent files, and an opening line that names the task. Where labels
     cannot be set, state and sender are two lines of the item's file (#238). On the notes, the owner asked whether the
     rules should change or add something, and agreed that an issue always has one current text, its description or its
     newest gathered note, saying at its top that it is; that whoever adds a note that changes what the issue asks
     updates it in the same step; that a builder builds from it, the older notes kept as the dated record; and that the
     scheduled look lists a queued issue with several notes newer than it. To the orchestrator, passed on word for word
     to the builder of this rule: the owner's yes is given for every queued change, the floor and the review guidelines
     included, as its issue describes it, to be quoted in those pull requests; and an issue a builder files gets a state
     label and `by:builder`. Behind: "Labels and openers say who wrote what" and "One current text" in
     `modules/inbox.md`, the stand-in's mark there, `scripts/labels.json` and `scripts/labels.mjs`, the "Found while:"
     line of the issue forms here and in the starter kit, the names of the inbox's two lines in `scripts/inbox.mjs`, and
     the step "15 November 2026, labels and openers" of `scripts/steps.mjs`.
