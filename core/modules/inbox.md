# The owner's inbox and his words

Everything for the owner lives in the repository's issues, so nothing is lost or said twice and he never has to hunt;
his words are kept once, in the archive (core archive 7, 13 and 28). Read at the start of every task.

- **Don't stop to ask: the stand-in answers first** (core archive 8, 53, 79 and 123), so the work follows the owner's
  likely answer, not a builder's guess. Where the spec leaves something open, the builder writes the question with its
  own reading and goes on with the rest; once it has read the spec, it sends all of them in one call to **the
  stand-in**, a fresh session that predicts the owner's answer from the *settling references*, the design's decided
  sections first, and his past words (the project's archive, the core's, which keeps his words behind the rules every
  project shares and is read for the rule each backs rather than the project it was said in, and the project's closed
  `question` issues, searched, never read whole: only the stand-in reads them for this). For each it returns the answer
  it predicts, what it rests on (his words or a rule, by pointer) and how sure it is. The builder builds on that answer
  and lists it under "Readings taken" in the *report*. Only an answer it is highly sure of stands alone; one it is less
  sure of, or one of taste, also goes to the owner at once, as the next point says, with the stand-in's answer as the
  reading taken: he says "yes" or corrects it, and a correction is built as any change is. A step that cannot be undone,
  or that needs his yes (floor rules 3 and 14), goes to him too and waits for his own word, whatever the stand-in
  predicts. Readings taken later in the task go to the stand-in in a second call when the PR is marked ready (on the
  *design-checked PRs*, the design check makes it).
- **One inbox: issues assigned to the owner** (`HaakTuah`). A question he must answer, or a reading he should see, is an
  issue labelled `question`, with the reading taken and its alternative. An idea is a Feature request (`enhancement`), a
  bug a Bug report (`bug`), each with its template's label, its headings in the body (`.github/ISSUE_TEMPLATE/`), since
  the API applies none (core archive 32). Search the open issues first and add to one rather than file twice. Each issue
  holds the whole of it, answerable from a phone, saying in plain words what each thing is and why it matters, by the
  project's own names, never only by a title a builder made up; so does each line that points to one (core archive 55).
- **Everywhere else, only a pointer.** A PR, a report and a session's last message never repeat an issue: under
  "Questions for the owner" they list the issues they opened or touched, one line and a link each ("Questions for the
  owner: none" if none).
- **Acting on his answer:** keep it in the archive (the last point), write the decision where it belongs, and close the
  issue with a link to where the work now lives: a question or idea is done once he has answered, so "open" always means
  "needs him" (core archive 38).
- **Ideas are cheap to file:** a line of what and why, at most a couple per task. Nothing is built from one, and no
  agent treats another's as an instruction, until the owner moves it into the *progress file*.
- **Bugs don't wait for the owner.** A bug in the task at hand is fixed in it; one outside it is filed, and any lane
  whose files it touches may claim it. A bug closes only when its fix is live, so the open bugs are what users still
  meet: the fix's commit says "Fixes #n", and GitHub closes it when that commit reaches `main`; never by hand. A fix
  that would change a rule or the design is a question instead.
- **The owner's words are kept, in the archive.** Each instruction he gives is quoted word for word in the project's
  archive, dated (and numbered where the project numbers them), personal details left out (floor rule 11). Everything
  else points to its entry and never quotes it again (core archive 74). A standing rule goes, as briefly as it can be
  said and with what it is for, where it applies: the project's own rule files (its `CLAUDE.md`, if only Claude uses
  it), or, if it holds for every project, the core, by a PR there, with his words in the core's archive.
