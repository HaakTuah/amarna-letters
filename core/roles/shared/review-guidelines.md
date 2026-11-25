# Review guidelines

Read at its start by every reviewer (`roles/reviewer.md`): what it judges a change by, read whole with its brief, the
project's own guidelines, its `SECURITY.md` and the floor.

## How a review passes

- **Every reviewer** lists everything that keeps the work from 10, each point concrete (a file and line, or a design
  section) and marked **blocking** or not, and scores the work from 1 to 10. A 10 is a list with
  nothing blocking open: the work does all of the task's text, keeps every standing rule, leaves nothing behind, its
  tests prove it, and a demanding expert would hand it over as it stands. Where a reviewer's tool gives priorities and
  no score, its P0 and P1 block, and what blocks here is P1 or P0.
- **A finding names its rule** (#254): every reviewer ends each finding that the change breaks a
  written rule with a line `Rule:` and the rule's file and bold lead (`Rule: floor/security.md: 1. Nothing secret in
  the repository`); a plain bug's has none. It does not mean one without it blocks less. Reason: what reviews find
  twice is counted only so (`tasks/reviews.md`, point 8). Held by no check.
- **Its stance is its brief's** (#397). By default a reviewer reviews against these guidelines. Where its brief says
  adversarial, it also looks for an input or a sequence that breaks the change, and argues that the approach is wrong,
  each a finding. Either way a posted code review says "Stance: adversarial." or "Stance:
  regular." on a line of its own. It does not mean a review whose brief names no stance is adversarial. Reason: a
  review that tries to break a change finds most in the *hard work*. Held by no check:
  `core/scripts/review-record.mjs` counts reviews by stance.
- **A mechanical move is read by its rule and a sample** (#515). By default a reviewer reads every file changed.
  Where a move between stacks changes many files alike (`tasks/choices.md`), its reviewer reads the rule applied, a
  sample, and each file the comparison of old against new flags. It does not mean a security review is skipped (floor
  rule 8), nor a move with judgement in each file. Reason: reading hundreds of like changes one by one finds no more,
  and takes rounds. Held by no check.
- **A change that keeps the meaning is stated so** (#886). By default a change to the floor or these guidelines asks
  the owner's yes (floor rule 3). Where it only keeps the meaning (a path or pointer after a move, a spelling or grammar
  mend, text moved or merged unchanged, a name updated), `scripts/path-only.mjs` proves a moved path, or else the design
  check states it on a line `Meaning unchanged:` and the paths, each script as `main` holds it; in doubt it leaves it
  out. It does not mean a new rule, one loosened or tightened, a move that changes who reads a rule or when, or a change
  to a check, a protected file or who decides goes without the yes. Reason: a yes asked for what means
  nothing becomes a formality. Held by `scripts/meaning-kept.mjs`, in the description check, and the state report.
- **A later round** checks, on the fix's diff, that its own earlier points were fixed. Something new about work it
  already saw is raised only if it blocks, and after the third round holds no merge where that code is unchanged since,
  save a security finding or one a failing test shows (`tasks/reviews.md`, point 6).

## What blocks

**For every reviewer,** blocking:
- a departure from the design or from the PR's description;
- a broken rule of the project, the core or the floor;
- a quote of the owner's, in the change or its description, that holds more than a decision and the reason behind it,
  or that is left misspelled where it is no floor yes relayed word for word as its issue holds it
  (floor rules 3 and 4);
- a size mark raised without its reason in the PR (one on what every session reads: below);
- an entry that joins the shape check's or the strength check's baseline under "grown" without its reason in the PR
  and a fresh session's word there that it found no other way (`tasks/code-shape.md`, "Never worse");
- a test weakened, skipped or deleted beyond what the task forces, or one the PR does not name with a reason that
  holds, each line `core/scripts/weakened.mjs` lists ruled on (`tasks/code-shape.md`, #253);
- against "One fact, one place" in `roles/shared/how-to-work.md`, a second copy of a fact, rule or piece of logic;
- a new job a maintained package does written by hand, a reader of a format someone else defines above all, with no
  line naming its exception or, past about 50 lines, `Looked for:` (`tasks/code-shape.md`, #486).

A finding, not blocking:
- anything the change leaves behind (unused code, files or settings, commented-out code, a description made untrue);
- content put where its readers must read past it;
- a pointer no reader needs;
- "Done when" lines beyond what `tasks/done-when.md`, "No more than the change needs", allows.

**Text users read.**
- A finding for any line that reads machine-made (one shape again and again, filler, hedging, clichés, voices alike, the
  same joke twice).
- Only a 10 passes; where a PR shows lines before and after, the owner's read is final.
- The project's guidelines add its own tells.

**A mark on what every session reads** (the *size marks*) rises only when it has to.
- First the text is trimmed, and what no session needs at every start moves to a file read when needed.
- Then a fresh session that wrote none of it reads the project's own such files whole, with the change, for more to
  trim; that is trimmed, and only what is still over moves the mark.
- **A trim is valid** only if a reader who has the trimmed text, and what that reader has read by then, acts the same in
  every case. It holds for every trim of a rule file, whatever its purpose.
  - It keeps who a rule binds and when, what it asks or forbids, every limit and exception, what checks or enforces
    it, its reason, and each name and example.
  - It removes only a second statement of what that reader has already read, one that covers every case the removed
    words do, with the same force, or words that carry none of these.
  - Whoever proposes a trim names that other statement and what it covers. In doubt the words stay.
- Blocking: a trim that fails this; and a raise with no "Leanness check:" comment in the PR giving that session's
  answer, save for growth a sync of the core brought.

**A brief written in a pull request** (a template of the starter kit that hands work, or a brief a module, script or
workflow holds): blocking where it misses one of the four things "A brief is written as a rule is"
in `tasks/helpers.md` names, or gives its reader a title or stakes that are not real; and where it, a rule or an entry
makes a process measure its goal (`tasks/cleaning.md`).

**A screen changed** (`tasks/screens.md`):
- Blocking: a pull request that changes a screen with no critique on it (point 18), or with no pictures of point 17
  where its session could take them; where it could not, the pull request says why and the issue filed for the tool.
- A finding: no three lines of the builder's (point 16), and a difference between them and the critique's answers to
  its first two questions.

**A rule file changed:**
- Blocking: a rule that departs from the owner's word behind it: on its issue, in the archive's items it cites, or in
  the core, those `scripts/holders/` lists for it.
- Blocking: a rule of the core (its floor, modules or `AGENTS.md`) written or changed without a part of the pattern in
  the core's `AGENTS.md`, "A rule is written to one pattern", or holding what that pattern keeps out.
- Blocking: a rule, the core's or the project's own, written or changed that a reading alone holds where a form of it
  a check reads without guessing exists, and the pull request gives no reason the form would change what the rule asks
  or protects a great deal (the core's `AGENTS.md`, "A rule is written in the form a check can hold").
- Blocking: a rule written or changed that fails the core's test for a rule (the core's `AGENTS.md`, "A rule is for
  what an agent can do"): one an agent cannot carry out, that only blocks, or that makes the product neither better nor
  sturdier, and one whose owner's word was an order for one piece of work.
- A finding: a rule that adds text without replacing any, or makes anyone wait for the owner beyond floor rules 3 and 14.
- Blocking: a rule or a slot that takes a fact about a project's set-up and says neither where it is read from nor why
  it cannot be read (the core's `AGENTS.md`, "What can be read is never asked or declared").
- A finding: proof asked beyond what a thing costs others (the core's `AGENTS.md`, "Proof is sized to what a thing
  costs others").

## Worked examples

Each kind of blocking point above, one that blocks, then one that does not (#307):
- departure: a PR said to fix a sum also drops negative numbers; not: a local variable renamed.
- broken rule: a live key in a test's fixture; not: a fake key built from pieces at run time.
- quote: the owner's praise kept beside a decision, or a typo left; not: the reason alone, or a floor yes as recorded.
- mark: a cap raised with no "Leanness check:"; not: one beside a fresh session's answer.
- baseline: an entry under "grown" with the reason "it reads YAML"; not: one whose reason is that its fault changes
  nothing the program does, a fresh session's word beside it.
- test: an assertion taken out, named nowhere; not: one named on `Tests changed:`, the case moved.
- second copy: a new loop summing where `sum()` stands; not: two tests setting up the same three numbers.
- package: a YAML reader by hand with no `Looked for:`; not: ten lines splitting a format the project defines.
- text users read: a button "Click here to proceed"; not: "Save".
- trim: one cutting a rule's reason since the archive holds it; not: one cutting what floor rule 4 says alike.
- brief: one giving its reader a title it lacks, or counting its own goal; not: one naming its role.
- screen: one changed with no critique; not: one with no pictures where no browser ran, so said, the tool's issue filed.
- rule file: a rule its issue never asked for; not: one narrower, with why. A core rule with no reason; not: one whose
  reason could be shorter. One no agent can carry out; not: one an agent does. A fact read from nowhere; not: one
  whose reader is named.
