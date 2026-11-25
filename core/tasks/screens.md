# Screens

Read when a screen is designed, added or changed, in a project people use through one, and before a polish-lane task:
the kinds `screen` and `polish`. A screen is what a project's users see and act through: a page of a site, an app's
view, a desktop program's window. A project with no screen has nothing here to act on.

**Whom it binds, and when.** By default each point below binds the builder of a pull request that adds or changes a
screen, for what that change touches, and the critique (point 18) reads it there. It does not mean that a screen no
change touches is redone on demand: the polish lane and the checks' baselines bring what stands to it, task by task.
Each point gives its reason; what holds it is named there, from "What holds it" below.

## What a screen is held to

1. **A direction, stated once, before any screen.** By default a project has its *direction* before its first screen
   is built; where screens stand and it has none, the builder of the next pull request that changes a screen writes it
   first, from what the product already shows. It says who uses the product, the main size it is used at (one of the
   *screen sizes*), what each screen is for, the mood in three words and the references the owner picks, and, for type,
   colour, shape, motion and background, what the product uses and what it never uses. The owner sees it once, in that
   pull request, as two or three small sample screens, and chooses. The work does not wait: the builder takes the
   sample it reads as likeliest and lists that reading under "Readings taken" as unsure, since taste is the owner's and
   the stand-in stays unsure of it (`roles/shared/inbox.md`), and the owner's choice is built like any correction. The
   direction is then kept as the system's values (point 2) and as one reference screen that every later screen is
   compared with, and recorded as a choice (`tasks/choices.md`). It does not mean that the core names a theme, a font
   or a palette, nor that samples are made again for each screen. Reason: where nothing says what the product is, a
   first version is whatever its tool reaches for. Held by the critique's question on the direction; that it is
   written, by discipline alone.
2. **One system.** By default every value a screen uses comes from one place, which the *direction* names: one scale
   for type, one for spacing, colours by their role, corner and motion values. Motion has three or four durations, the
   short ones for small things, and leaving is quicker than arriving. The trigger is a raw value outside that place in a
   change: its builder takes the system's, or, where none fits, adds one to the system. It does not mean a new value
   for each need: one joins only where none of the system's serves. Reason: raw values drift apart, and a screen made
   of them looks assembled from parts. Held by the values check, durations included.
3. **Hierarchy.** A screen has one primary action; what it holds is aligned to one grid and spaced in one rhythm. Its
   builder makes it so. It does not mean that a screen with nothing to do invents an action. Reason: where everything
   weighs the same, the user cannot tell where to start. Held by the critique's second question.
4. **Restraint.** Each decorative element a change adds says, in its pull request, what it tells the user, or its
   builder takes it out. That a tool reaches for it by default (a gradient, a shadow, a card around everything, an emoji
   as an icon, everything centred) is not a reason. It does not mean those looks are banned: a default is wrong only
   when nobody chose it, and the direction may choose any of them. Reason: a tool's defaults are what make a screen look
   machine-made. Held by the critique ("What could be taken away?", "Which of the tool's defaults is on this screen?").
5. **Real content and every state.** Each screen names its states from a fixed list, those it can be in: loading,
   empty at first use, empty after a search, one item, too many, failed, done, no connection; and its builder builds and
   shows each it names. A fixed set of hard content goes through every screen: the longest name, nothing at all, a very
   large and a very small number, the long words of another language. No placeholder text ships. It does not mean a
   state the screen cannot reach is built. Reason: a screen built on one tidy example breaks on the first real one.
   Held by the pictures, a missing one failing.
6. **Motion with a purpose.** Motion explains a change of state, is short and of one manner, answers every action at
   once, is in proportion to what happened, and yields to reduced motion. It does not mean no motion: one that explains
   a change stays. Reason: motion that explains nothing slows the user and pulls the eye from what changed. Held by the
   values check for its durations, the pictures with reduced motion on, and the critique.
7. **Speed and waiting.** Every action shows an answer within a tenth of a second. A wait of over a second shows that
   work is going on, and one of over ten seconds shows progress. The layout does not jump while it loads. On the web the
   defaults are: main content shown within 2.5 seconds, an interaction answered within 200 ms, a layout shift of at
   most 0.1. It does not mean the work itself ends within a tenth of a second: its answer shows. Reason: past these
   limits a user stops feeling the product answer, then stops waiting. Held by the timed run.
8. **Every control has its states** (focus that can be seen, pressed, disabled), and can be reached by touch and by
   keyboard where the platform has them. By keyboard: every task can be done without a pointer, the Tab key moves in
   the order of the eye, focus starts on the likeliest action and never on a destructive one, and the platform's
   standard shortcuts are kept. It does not mean a touch target on a device with no touch, or a pointer's way to what
   the keyboard alone reaches. Reason: a control with no visible focus or no way by keyboard leaves users out and hides
   where they are. Held by the rendered check for targets, the pictures for the states and the walk by the Tab key.
9. **An accessibility floor, in numbers:** contrast of 4.5:1 for text, and 3:1 for large text and for controls; a
   target of at least 24 pixels, and 44 where touch is the main input; body text of at least 16 pixels, which scales;
   lines of 45 to 75 characters; nothing told by colour alone. The numbers are defaults,
   which a project tightens in its *accessibility floor* and never loosens. It does not mean the strictest level
   everywhere: the standard level is the floor. Reason: the limits have published numbers, so "looks fine" can fail.
   Held by the rendered check; colour alone by the critique ("Is anything lost in grey?").
10. **Each size it is used at,** the smallest first: the builder builds a screen at each of the *screen sizes*, and
    nothing runs off the screen at those sizes or at any width between them. It does not mean "mobile first" as a stance
    for every product: the main size is the direction's, and a product made for a large screen keeps it. A screen read
    from across a room is one of the *screen sizes*, its distance named in the *direction* and its text sized for that
    distance, a first guess tuned on a real screen of that kind (#484). Reason: text that runs off at a phone's width is
    the commonest mistake a builder could see for itself, and text sized for a hand's reach is unread across a room.
    Held by the rendered check's sweep of widths.
11. **Familiar first.** A control works as its users know it from the platform and from other products. A departure is
    a choice, recorded with its reason (`tasks/choices.md`). It does not mean nothing new: a departure with its reason
    stands. Reason: users bring habits, and a control that breaks one is read as broken. Held by the critique ("Does
    anything look pressable that is not?") and the record.
12. **Words.** One name for each thing, everywhere. A button says what it does. An
    error says what happened and what to do next, in the user's words. Nothing destructive happens without a way back
    or a question first. A feature is explained where the user meets it, and its help changes in the same change as the
    feature. Reason: a user who meets two names, or an error in the code's words, cannot tell
    what to do. Held by the list of words, read by the critic, and the critique ("Can every step be undone or left?").
13. **Readable and true.** What a screen shows tells at a glance what is happening and what the user can do. Reduced
    motion keeps whatever informs. Nothing shown implies what is untrue, and what is shown from the past shows its age.
    A user's mistake is the screen's, a bug fixed before the next test, unless a careful user seeing the same could
    have known better. Feedback appears at the place and the moment of the action: status can be seen, and an error
    stands beside what caused it. What a machine reads from the screen (a screen reader, a test, an agent) carries the
    same information, in the same order, as what a person sees. Reason: a user acts
    on what the screen says, and only on that. Held by the critique's first and third questions and the pictures with
    reduced motion on; what a machine reads, by discipline alone.
14. **In keeping with the product:** its materials and its words belong to the product's world and to the direction,
    and its finish matches the rest of the product. Reason: one screen finished apart from the rest reads as a part of
    another product. Held by the critique's last three questions.
15. **On a desktop,** a program uses the platform's own controls and conventions, windows that resize, and right-click
    menus where users expect them, on each of the *desktop platforms*. It does not mean a site opened on a desktop.
    Reason: a desktop program that ignores its platform feels foreign there. Held by the critique and the pictures at
    each window size.

## What the builder does before review

16. **Intent before the screen.** Before building a screen or changing what it is for, its builder writes three lines
    in the pull request: what the screen is for, its primary action, and what it leaves out. Reason: a screen built
    without a stated aim takes its aim from its tool. Held by the critique, which sets its answers beside them.
17. **The builder looks before it asks.** Before marking the pull request ready, its builder takes a picture of every
    screen the change touches, in every state that screen names and at each of the *screen sizes*, and again with
    reduced motion on, with the picture script the *screen checks* name, or, where they name none, with the tool it has
    and the same list. The list is the script's, never the builder's own choice of what to look at. At each size it also
    walks one whole task from start to finish, never one screen alone. It reads the pictures, mends what it sees, and
    says in the pull request what it saw and mended. It does not mean a picture of a screen the change does not touch,
    nor that a pull request waits where its session cannot render the screen at all (a desktop window of another
    platform): it says so and why, and files an issue for the tool, labelled `needs-owner` where only the owner can
    provide it, and the critique reads what there is. Reason: a builder that reads only the diff sends the owner
    mistakes it could see for itself. Held by the pictures, a missing one failing where that check is on, and the
    critique, which has the pictures or finds them missing.

## What the review does

18. **A critique by fixed questions,** on every pull request that changes a screen, by a fresh session that wrote none
    of it, at the design check's model and effort (`tools/claude.md`), given the pictures of point 17, the walk by
    the Tab key and the list of words where those checks are on, and the *direction*, and nothing from the builder: not
    its three lines, its description or its account of what it mended.
    - Is it plain within three seconds what this screen is for?
    - Which is the primary action? Blurred, is it still plainly first?
    - After each action, can the user tell what happened?
    - Can every step be undone or left?
    - Does anything look pressable that is not?
    - What could be taken away?
    - Is anything lost in grey?
    - Does anything use a value outside the system?
    - Is every named state shown?
    - Does it fit the direction, and which of the direction's choices can be seen here?
    - Which of the tool's defaults is on this screen?
    - Would one of the product's users take it for a template?

    It asks too the questions that another module the project takes adds to the critique.

    It posts its answers on the pull request. Its answers to the first two are then set beside the builder's three
    lines (point 16), and a difference is a finding; an answer that shows a point above broken is one too, judged as
    `roles/shared/review-guidelines.md` says ("A screen changed"). It does not mean the critic judges by its own taste: it
    judges by the direction. Reason: a reviewer told what the builder meant sees what was meant, not what is there.
    Held by the review guidelines' line, which blocks a screen's pull request that has no critique.

## What holds it

- the values check: a raw value of type, spacing, colour, corner or motion outside the system, durations included;
- the rendered check, on the rendered screen: contrast, the size of targets, the size of text, the length of lines,
  and any element wider than the screen, at the *screen sizes* and in a sweep of the widths between them;
- the pictures, at fixed sizes: one for every state a changed screen names, a missing one failing, each compared with
  a baseline picture;
- the timed run: the answer to each action, a wait with nothing shown, the layout shift, the load;
- the console check: no error in the console, no request that fails, no font or picture that does not load;
- the settings check, where another module the project takes asks it: each of a user's settings there, and still
  there after the product is closed and opened again;
- the first-choice check, where another module the project takes asks it: the time from opening the product to its
  first real choice, against the target that module names;
- the walk by the Tab key, a script that records where focus goes, and the list of the words on every screen, both
  for a reader to judge;
- the critique (point 18).

By default each check is off in a project. The trigger is the project naming it in its *screen checks* with the tool
that runs it, which the module leaves to the project: that pull request lists what the check finds on every screen,
and from then on the check runs on every pull request that changes a screen, over only the screens it changes, at two
or three of the *screen sizes*. Each reports first,
and binds only where the *screen checks* say so and a session can mend what it finds ("Nothing locks a project" in the
core's `AGENTS.md`). Each keeps a baseline that may not get worse, in the shape check's form (`tasks/code-shape.md`,
"Never worse"): the project's tool writes what it found, and `core/scripts/screens.mjs` holds that against the baseline
and says the mend of each new finding. A reader is given pictures only for what a machine cannot judge. A finding the
critique makes on a second pull request of the project's becomes a check: the session that meets it the second time
files an issue for one, which needs no word of the owner's, being a check for a rule that stands. It does not mean the
core ships a tool, nor that a project with every check off is held up: point 17 and the critique still hold. Reason:
the limits have published numbers, so a check can hold them, and a run costs, so it covers only what a pull request
changes. Held by `core/scripts/screens.mjs` and its test.

The polish lane (`roles/shared/work-flow.md`) stays as it is, and takes its finds from the critique's questions too.

**What stays out:** a named font, palette or theme; a longer list of banned looks than point 4's examples, since a
default is only wrong when nobody chose it; the strictest accessibility level everywhere, since the standard level is
the floor; several versions of every screen, since the choice between versions is made once, for the direction; a tool
by name.
