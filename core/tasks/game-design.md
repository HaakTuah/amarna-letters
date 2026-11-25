# Game design

Read before a task changes a rule, a feature or how the computer players play, before a task changes a game's screen,
and before a polish-lane task: the kinds `game-rule`, `screen` and `polish`. A feature is any move, rule or power a
player can choose to use.

- **The computer players never know who is a person.**
  - Nothing in the logic of the *computer players*, nor in *what they are shown*, says whether another player is a
    person; they judge every player by behaviour alone, so the game tests everyone alike.
  - The game makes no tells that give a person away, such as computer players that answer at once.
  - The one condition that changes it (#484): a game may make knowing who is a person a setting, where knowing is part
    of what the game is for and its *game page* says so; whatever is measured (the simulations, the standing measures,
    an experiment) runs with the setting off. It does not mean a tell stays in where the setting is off. Reason: a
    party game with model players may be played for knowing, and a rule that forbids it would stop that game.
- **The computer players never cheat.** They hold nothing a player in their place could not
  see or know: no sight through what hides the game from a player, no knowledge it was not given.
- **What must be remembered is decided once for each game.** By default the *game page* says, once
  for each game, whether remembering what has been played is part of the skill. Where it is not, the game shows what has
  been played to every player, people and *computer players* alike, in *what they are shown*; where it is, the computer
  players remember no better than a person at their setting could. The trigger is a change that lets something played
  leave the view (a card discarded, a move made): where the page holds no decision, its builder writes one from the
  owner's past words (the *settling references*), or the stand-in's reading where they say none, marked so until the
  owner's words replace it, and holds the change to it. It does not mean a computer player forgets on purpose what the
  game shows to all. Reason: a computer player with perfect memory among people who forget cheats in effect, and one
  that forgets what all can see plays weak. Held, in part, by the game's own test that compares *what they are shown*
  with what the game shows a person, where it has one.
- **Using a feature must pay, measured three ways.**
  - For every feature, the *use-against-ignore measurement* plays *measured players* that use it where it fits, as they
    play, against copies that always use it and copies that never do, the rule itself unchanged, and *where the numbers
    go* shows how often each used it, how often it worked and who came out ahead, by more than chance (its threshold a
    first guess, listed).
  - If those that use it where it fits do not beat both those that never and those that always do, the change says why:
    the feature does not matter, and is reworked or cut, or they play it badly, fixed in the same change; or, in a game
    built in stages and not yet feature complete, what it needs to pay comes in a later stage, which the change names,
    none left unpaid once the game is complete; its counterweight never waits ("No stopgaps").
  - One too rare to move whole games is judged per use, each use played on with and without it.
  - Every feature is measured against players who play its counter.
- **Standing measures from the simulations, for every game.** By default every game reports, from the
  whole games its *measured players* play, five measures at *where the numbers go*: the win rate by seat or starting
  place; how often the leader at a third of the game goes on to win; the spread of a game's length; the time a player
  spends knocked out or with no real choice; and the share of turns with only one sensible move. Each stands against a
  target, a first guess listed beside it ("Numbers are first guesses until play tunes them"). The trigger is a change to
  the rules: its builder runs the simulations and reports each measure against its target in the change. It does not
  mean a measure past its target blocks the change, which says why, as "Using a feature must pay" asks of a feature; nor
  that the leader is held back, or whoever is behind helped, by breaking the rules for them ("Different data, same
  rules"). Reason: a leader who runs away, a seat with an edge and players with nothing to decide show in these numbers
  long before the owner finds them in play. The simulation's report shows it, failing nothing; no check holds it yet.
- **No feature only people use.** Every feature a person can use, the *computer players*
  use too, where it pays and with success at least sometimes: one only people use goes untested and hands them an edge
  no rule intended.
  - A feature is not finished until the *measured players* use it so, by the point above's numbers.
- **No rule untaught.**
  - Every rule a player needs is in *where rules are taught*, added or changed in the same change as the rule.
  - When a rule acts on a player, the game shows it where and when that player could know it.
  - Whatever the game shows, a last-known position or an old report among it, and every mistake a player makes in
    testing, are held to `tasks/screens.md`, point 13; a player may still lie.
- **Teaching has an order.** By default a game teaches one new thing at a time, in play, not in text:
  first where a mistake costs nothing, then under pressure, then combined with what came before. The trigger is a change
  that adds or changes a rule a player must learn, or what comes before the first real choice (one that changes how the
  game goes, not a menu's): its builder places what it teaches in that order and measures the time from opening the game
  to the first real choice against the target the *game page* gives, a first guess until play tunes it, which it writes
  there where none stands. It does not mean a rule is left out of *where rules are taught*, nor difficulty that shifts
  in secret: a game is made easier or harder by its setup ("Strong computer players"). Reason: a player handed several
  new things at once, or text before the first choice, learns none of them. Held, in a game with a screen, by the check
  `first-choice` (`tasks/screens.md`, "What holds it"), for the time; the design check reads the order.
- **A loss explains itself.** By default, after a round a player has lost, the game lets that player
  see what beat them: the moves, causes or numbers that decided it. The builder of a change to how a round ends, or to
  what decides it, makes it so. It does not mean the game tells a player what to do next time. Reason: a loss a player
  cannot explain reads as unfair, and the owner finds it in play and sends it back. In a game with a screen the critique
  asks it ("After a loss, can the player see what beat them?"); no check holds it.
- **Strong computer players.** The *computer players* play as competently as they can,
  within the limits their game sets them, never weaker on purpose (a game is made easier or harder by its setup
  instead): the rules are measured through their play, and weak play hides what is wrong with a rule.
  - Stronger never means samey: where there are several, each keeps its own style, checked before and after a change to
    their play.
- **A game whose rules are given is built as given** (#484). By default, where a game is a traditional one, or its
  rules come from a rule set the owner hands in, those rules as written down are its spec, and the points on design
  of this module ("Don't prohibit", "No solutions", "Reality first", "Effects from causes", "Levers, not luck" and "Using a
  feature must pay") bind only what the project adds or may choose: options, table sizes, variants, and how the
  *computer players* play. Where the measures show a given rule never pays, or that chance alone decides it, the
  builder who finds it reports it to the owner on the *game page*, and no session changes the rule. It does not mean
  the measures are not taken. Reason: a traditional card game forbids a play outright, and a builder holding it to
  these points would either stop or break them without saying so. Held by no check: whether a rule is given is read
  from the game page by the design check.
- **Don't prohibit; give it its real cost,** so the player keeps its agency. An action a player
  could realistically take is never forbidden because it seems unwise; the game's own rules make it as costly, risky and
  rare as it really was, so the rare exception stays possible, as Hannibal crossed the Alps.
- **No solutions, only trade-offs.** Every feature helps in some situations and costs in
  others: none is always right or always wrong to use, nor makes a player safe, as the measurement
  above checks.
- **Reality first.** Where the real world, or the history a game is set in, is interesting
  enough on its own, the game takes it as it was and invents nothing in its place; invention fills only what reality
  leaves silent, or what play cannot bear, and only after trying to keep both.
- **Effects from causes, as deep as pays.** Every effect comes from a cause, and the deeper
  and better grounded the cause, the more compelling the outcome, even where a player never sees every link:
  - a quantity follows what drives it, never a flat share;
  - what goes wrong for a player comes from a cause it could reason about, chance standing in only for causes too small
    to model;
  - nothing appears or vanishes without a cause it could name.
  - Depth stops where more simulation no longer pays for what it costs to build and run.
  - Depth underneath costs a player no attention; what a player must follow is kept readable by teaching and showing it,
    never by making the simulation shallower.
- **Levers, not luck.** Where chance enters, players have levers to prepare for it or answer
  it, so no outcome is decided by chance alone.
- **Chance comes before the choice where it can.** By default a draw comes before the choice that
  answers it, so the player decides knowing it; where it must come after, a lever ("Levers, not luck") lets the player
  answer it once it is known. The trigger is a change that adds or moves a draw: its builder places it so, and says in
  the change which of the two holds. It does not mean no chance after a choice, nor a lever that takes the risk away
  ("No solutions, only trade-offs"). Reason: chance after a choice no lever answers turns a good decision into a coin
  toss. The design check reads it; no check holds it.
- **Different data, same rules.** No rule checks which player, faction or character it is: what sets
  one apart lives in its data and starting conditions, which every rule reads alike; only presentation and voice may
  name one.
- **The order of resolution never decides.** When two act at the same moment, the outcome does not
  depend on which the game settles first: they share, or a seeded draw decides.
- **Everything new belongs.** Every new feature feels balanced, cohesive and purposeful, and fits the
  rest of the game: it reads and changes quantities other systems use, never keeping its own beside them, each through what the system that owns it offers (`tasks/code-shape.md`, where the *computer players* are a
  system of their own, of the domain `computer-players`).
- **Every game says what it is for, on one page,** its *game page*: what the player does from minute
  to minute, what winning is, two or three kinds of experience it aims at, in the owner's words, the target of "Teaching
  has an order" and what "What must be remembered is decided once for each game" asks it to decide. By default the
  builder of a game's first stage writes it; for a game that stands with none, the builder of its next change that adds a feature,
  quoting the owner's past words (the *settling references*), and where they name no experience, the stand-in's reading,
  marked so until the owner's words replace it (`roles/shared/inbox.md`). The builder of a change that adds a feature
  says in the feature's entry (its issue, or the task that names it) which of those experiences it serves, and the
  design check reads the feature against the page. It does not mean a theory of play used as a checklist, tricks that
  hold a player (daily rewards, streaks, timers that punish leaving), or a model's verdict on whether it is fun, which
  stays the owner's own play. Reason: a feature that serves none of the aims the owner set is still built, and the owner
  finds it only in play. The design check reads it; no check holds it yet.
- **A game takes each kind that is true of it** (#484). By default a game is sorted by what it is made of, never by a
  genre, and takes every kind that is true of it: a game the project designs, an emergent simulation, a traditional
  game, a game with model players, a game played in real time, a game played online, a show for a room; one game takes
  several. The trigger is a game's first stage, or a change that makes another kind true of it: its builder writes
  each kind that is true of it on the *game page*, which holds them, since nothing reads a game's kinds yet (#484,
  points 6 and 11). It does not mean a list of genres, nor that a kind binds before it is true of the game. Reason: a
  list of genres puts each game in one box, where one game is made of several kinds. The design check reads the page;
  no check holds it yet.
- **A game's copy of a rule of its kind goes at the sync that brings it** (#484, point 10). By default a game keeps the
  rules it writes for itself, and whom each is about, this game, its kind or every game, is answered as the project's
  own rules are listed (the core's `AGENTS.md`, "A project's own rules name what holds them"). The one condition that
  changes it: a sync brings the core's rule for the kind, or for every game, written from a game's own once a second
  game needed it, as the core's `AGENTS.md` says. Then the session that syncs takes out the game's own copy at that
  sync, in a pull request of its own beside the sync's, which stays pure, and points to the core's rule ("One fact, one
  place"). It does not mean the copy goes before the core's rule has reached the game, nor that what the game's rule
  held beyond the core's is dropped: that part stays the game's own. Reason: a rule kept in two places drifts apart.
  Held by the copies check, once a rule stands in both places, in part.
- **Every stage is a game.** A game built in stages ends each stage in one someone can play from
  start to finish and enjoy; a feature that makes sense only once later ones exist waits for them.
- **The first stage is the loop alone.** By default a game built in stages has as its first stage
  only what the player does from minute to minute and its win, as the *game page* says them. The trigger is a change to
  a game whose loop cannot yet be played from start to finish: its builder builds only toward that loop, and a feature
  beyond it waits for it, as the change says. It does not mean the loop is final: a later stage may change it, measured
  as any change is. Reason: what a game is for is proven only in play, and what is built before the loop plays rests on
  a guess. The design check reads it; no check holds it.
- **No stopgaps.** The work serves the finished game, so nothing is built for the meantime: where a
  change comes before a feature it would want, the game stays as it is until that feature comes, and the change says so.
  - A lever is built with the counterweight that answers it, never with a stand-in for it, one moved in the order of
    work if need be.
  - It speaks of what the game offers its players, not of how its code is rebuilt: a named bridge that a stage of a
    large refactor leaves, with the task that removes it queued, is none (`tasks/cleaning.md`).
- **Numbers are first guesses until play tunes them.** A number a change sets that neither
  reality nor its causes fix (a time, a cost, a chance) is a first guess, listed in the change and tuned by measured
  play, never just picked.
  - While the systems that change its effect are still being built it stays untuned, and a tuning pass takes them
    together once they stand.
  - Anything that makes the game unplayable for testing is fixed at once.
- **Code decides facts; models phrase them,** in a game with language-model players or characters.
  - The game's code decides what is true and what each seat learns; a model adds only voice, personality and judgement
    within its own seat.
  - A model is called only where its judgement can change what happens; the obvious, the routine and the mechanical are
    the code's.
  - **Play that is measured and play that entertains are told apart** (#484). By default the computer players play as
    strongly as they can ("Strong computer players") and a model is called as the point above says. The one condition
    that changes it: a game may have a mode whose *game page* says its purpose is the show, in which who decides a move
    may follow what makes the show, a model seat taking a move a script would find plain among them; nothing is
    measured in that mode. It does not mean a script that errs on purpose, nor a seat kept from what a player in its
    place would see: a model's mistakes are its own. Reason: in a party game a model's mistake at a high point is the
    show. Held by no check: whether a mode is for the show is the game page's to say.
- **In a game played online, everything new works online,** the same on every screen, with the
  protocol's version raised when its messages change, which an older client refuses as floor topic 5 says ("A reader
  refuses a version it does not know").
- **Players always play the newest version:** the one built from the default branch's newest commit whose checks all
  passed, published within one run of its merge (floor rule 12).
  - Opening the game starts its newest version; where it cannot load itself anew, the game says a newer one is out, with
    one click to play it.
  - A version that only fixes or looks different takes over by itself as soon as it interrupts no game in play (between
    rounds, at a turn of the game's clock, or at the next launch); one that changes play waits until the game in play
    ends or the game is next opened.
  - A saved game opened in a newer version carries on in the newer rules, and its log marks where they changed.
- **Same seed, same game.** A game replays exactly from its seed within one version of its
  rules, and where people or language models play, from its log of every input and every model answer, the model and its
  prompts counting as part of the version:
  - a change that should change no play proves it by the same seeds and logs;
  - an optimization that changes decisions proves, on fresh seeds, that nothing a player would notice did (skill,
    styles, feel and look, within noise);
  - one that changes play says what it changes and starts a new version.
  - A game whose rules changed while it was played replays exactly only from the change on.
- **The polish lane** also takes its finds from whole games watched at top speed, on a phone and on desktop, and proves
  play unchanged by "Same seed, same game".
- **Readable by every player.** *What they are shown* tells the *computer players* what
  the game shows a person, as plainly and in the same order, so that every player reads the game on equal terms. The
  general forms (at a glance, nothing by colour alone, reduced motion keeping whatever informs, one name for each
  thing) are `tasks/screens.md`'s points 9, 12 and 13: a game with a screen takes both modules.
- **A game's own scene is no desktop program's window** (#484). By default `tasks/screens.md`, point 15 (the
  platform's own controls, windows that resize, right-click menus) binds a game on a desktop as it binds any program.
  The one condition that changes it: in a game, it binds the game's menus and settings and not its playing scene. It
  does not mean the menus and settings are spared it. Reason: a playing scene read from across a room has no window to
  resize, and a builder holding it to point 15 would add one. Held by the critique and the pictures of point 15.
- **How a game answers a player.** In a game played through a screen, each point below binds as
  `tasks/screens.md`'s points do ("Whom it binds, and when"), and each check it names is one of that module's, the
  project's own and off until its *screen checks* name it ("What holds it" there). It does not mean that a game with no
  screen is asked anything here. Reason: a game's feel is lost in changes no one times or pictures.
  - **Every action is answered within a tenth of a second.** By default `tasks/screens.md` point 7's tenth of a second
    holds for every input of a game, even where its outcome comes later: a press shows pressed, a move starts, an order
    shows given. The builder of a change to how an input is handled makes it so. It does not mean the outcome comes that
    soon, nor that a computer player answers at once: "The computer players never know who is a person" stands as it is.
    Reason: past a tenth of a second a player stops feeling the game answer its hand. Held by the timed run
    (`tasks/screens.md`, point 7), from an input to the first change on the screen: the check `timing`.
  - **An effect is sized to the event and returns to rest.** The trigger is a change that adds or changes an effect (a
    shake, a flash, a burst): its builder keeps it short and in proportion to what happened, as `tasks/screens.md`
    point 6 asks of any motion, ends it with the screen at rest, takes its length from the system's motion values
    (`tasks/screens.md`, point 2), and spends no effect on every routine action alike, so that the ones that matter
    stand out. It does not mean no effects, nor a routine action left unanswered: the point above answers it. Reason: an
    effect on every action drowns those that tell a player something happened. Held by the check `values`, for its
    length, in part; that it is in proportion only a reader can judge, and the critique asks it ("Is each effect in
    proportion to what happened, and do routine actions go without one?").
  - **The display is judged over the busiest scene,** not an empty one. The builder of a change to what the game shows
    takes its pictures (`tasks/screens.md`, point 17) over the busiest scene a test can stage, which is the play
    screen's state "too many" (`tasks/screens.md`, point 5), and makes what a player must read stay readable there
    under motion and effects. It does not mean a picture of every scene: the busiest one the game's tests can stage.
    Reason: a builder judges the display on the quiet screen it was built on, and the owner finds in play what the busy
    one hides. Held by the check `pictures`, a missing one failing, read by the critique.
  - **A player's settings are remembered.** By default a game lets a player remap the controls, set the size of text,
    have less shake and less flashing, and set each volume apart, and keeps each setting after the game is closed and
    opened again. The builder of a change that adds an input, text, an effect or a sound makes a new input remappable
    and brings the rest under the game's setting for the size of text, for shake and flashing, or for its volume. It
    does not mean a setting with nothing to act on (a game with one sound has one volume), nor that a game that stands
    gains them all in one change: the check's baseline lists what is missing, and tasks bring it. Reason: these are the
    settings players most often miss, and one lost at each launch is set again every time. Held by the check `settings`:
    a game's own test that each setting is there and still there after the game is closed and opened again.
  - **Nothing is told by sound alone.** The builder of a change that adds a sound that tells a player something (a
    warning, a turn, a hit) gives it a sign on the screen at the same moment. It does not mean that a sound that tells
    nothing, such as music, needs one. Reason: a player with the sound off, or who cannot hear, misses what only a sound
    told. The critique asks it ("Is anything told by sound alone?"); no check holds it yet.
  - **Sound has jobs.** By default a sound that tells a player something does one of three jobs: it
    confirms an action, warns, or marks a change of state, with one voice for each job across the game, and the music
    never covers them. The builder of a change that adds a sound or music gives each sound its job and voice and keeps
    the music under them. It does not mean a verdict on how a sound sounds, which stays the owner's taste, nor a job for
    music. Reason: a sound with no job, or a job with two voices, gives a player nothing to listen for. The critique
    asks it ("Does each sound confirm, warn or mark a change, with one voice for each job, and does the music leave them
    clear?"); no check holds it.
