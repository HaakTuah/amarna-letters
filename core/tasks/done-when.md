# Done when

Read when a task builds or changes something a project's users will notice, and when such a task's issue is filed or
queued (#305): the kind `feature`. An issue is of that kind where it says so, by a label `feature`
or under "What to read"; the idea template asks its filer to.

- **An entry says how done will be judged.** By default a feature's issue holds, under the heading "Done when", two to
  six lines, each one behaviour that a test, a check or a named action can show, in one of three shapes: "When this
  happens, it does that.", "While this lasts, it does that.", "If this goes wrong, then it does that." At least one line
  is an "If". Each ends with what proves it, after "Proof:": a test written first and seen to fail, a check, a picture,
  or "the owner tries this". One more line, "Out of scope:", says what the change leaves alone. Whoever files the issue
  writes them. The one condition that changes it: a change said in one sentence has the one line "None:" with that
  sentence. It does not mean a user story, a requirements, design or task file of its own, a spec that code may not
  depart from by hand, nor an entry that waits until it is "ready". Reason: what a builder took "done" to mean otherwise
  comes out at the review or when the owner tries it, and a wrong reading caught before the code costs a paragraph,
  after it a pull request. Held by the description check (`scripts/pr-description.mjs`, with `scripts/done-when.mjs`),
  which fails a pull request that adds a feature's issue to the *progress file* without the heading, and lines the
  builder writes that are not in this form, and by the idea template's heading.
- **Where an entry has none, the builder writes them before any code.** By default the builder of a feature whose issue
  has no "Done when" lines in that form writes them, in that form and with its readings, under "Done when" in its draft
  pull request's description before its first commit of code, and hands them to the stand-in (`roles/stand-in.md`),
  which rules on them at once, sure or unsure; the builder takes its changes and goes on. It does not mean the owner is
  asked, or that the work waits for the verdict. Reason: a builder and a judge that agree before the code catch a wrong
  reading while it is a paragraph. Held by the description check, which fails a pull request that closes a feature's
  issue where neither holds lines in the form; that they came before the code, by no check.
- **The builder proves the change by using it.** By default, before marking the pull request ready, the builder uses the
  change as its user would: it starts the program, takes its user's steps, runs the command. Under the heading "Proved
  by use" the description says, for each line but the out of scope, what it ran ("Ran:") and what it saw ("Saw:");
  passing tests alone do not count. The one condition that changes it: where its session cannot run the change as its
  user would (a platform it lacks), "Saw:" says so and why, and names the issue it files as `tasks/screens.md`, point
  17, says, which is this rule for a screen. Reason: tests have passed while the feature did not work, until the agent
  used it. Held by the description check, where an entry's lines stand with no "Ran:" and "Saw:" for each, and by the
  design check, which reads them (`tasks/reviews.md`, point 4).
- **No more than the change needs.** By default an entry has no lines for a change said in one sentence, never more than
  six, no user stories, no document of its own, and never more words than the code they ask for; a missing line never
  stops work, its builder writes it and goes on. It does not mean that an entry may leave out the "If" or the out of
  scope. Reason: one trial of three spec-first tools found them heavier than the work they described. Held by the
  description check, which fails seven lines or a user story, and by the review guidelines' finding for the rest.
- **Questions before a larger feature.** By default, before it files a feature it expects to take more than one pull
  request, or a new project, the session the owner works with asks the owner its questions once, in one batch, in their
  chat: the hard parts, the edge cases and the trade-offs, none obvious; the answers go into the issue as the owner's
  word. It does not mean questions on a smaller change, a second batch, nor any put in the owner's inbox. Reason: a
  wrong reading caught before the code costs a paragraph. Held by none: only discipline holds it.
