# Item 16: The royal council, and omens of the end (29 October 2026)

Weekly usage: unknown (this session cannot read it).

Build order item 16 (`docs/intent/build-order/item-16.md`), built on item 15's branch (#192), with the sections it names:
"The royal council" (Interface and the council) and "Omens of the end" under Victory, with "Random ending" for what the
omens may not read. Built from the courts dossier (`docs/history/14-courts-and-free-cities.md`: "Period titles for the
council (item 16), checked", "Advice on record", "Omens of the end") and the letters dossier
(`docs/history/09-the-letters.md`, "Hard times", EA 35). The check for changes against the live design document found
nothing changed since the copy (Build order rev 109, Interface and the council rev 17, Victory rev 13), at the start and
again before the pull request. Save version 36.

## What was built

The design note is [`docs/design/40-the-royal-council.md`](../design/40-the-royal-council.md); in short:

- **Four advisors from the script kings' tactics** (`src/game/src/bots/council.ts`): the General, the Steward, the
  Tjaty and the Diviner, each a script king's mind for the seat with the court's temperament tilted (table in the
  design note), its own seed and its own memory of what the seat has seen. Each season each plays the script king's
  military season on the seat's own view and keeps only troop orders and levies.
- **Numbers behind each proposal** from the eight seasons a script king pictures (`Search.pictured`): in how many the
  place a strike aims at is ours at the end, by the search's own rule of who holds land after a season, and in how many
  the troop only reaches the walls; how many foreign troops could strike a province held; in how many the capital, and
  the kingdom with it, is lost.
- **Compact:** "All four advise" once, then each advisor, by its period title where the dossier grades the title A or
  B, with its tilt, its one-line reading (the Diviner's in signs) and only where it differs.
- **Who hears it:** model, file and human seats (`ISeat.hearsCouncil`), Great Kings and city-states alike; script seats
  never. On by default; the seat turns it off or on with its orders (`TurnSubmission.council`), kept in
  `GameState.councilOff` and logged as a `council` event. Model kings read YOUR ROYAL COUNCIL in their report; humans read
  it at the top of the orders panel, with buttons that take the agreed orders, or an advisor's, into the draft.
- **Omens of the end** (`src/engine/src/rules/omens.ts`) for every seat and character, council or not: tiers by the
  public chance (quiet, troubled, grave), borrowed time from a point drawn in secret past the median, the darkest from
  the bottom of the cap's range and held; each court in its diviners' voice (the liver, Hittite oracles, Egypt's lector
  priests and the Restoration Stela, Alashiya's eagle diviner and the hand of Nergal, a plain voice elsewhere); silent in
  an open age. OMENS in the model king's report, the orders panel, and "The age" in characters' requests, in the voice
  of the land where they are. The rulebook says the omens darken and never foretell the season.

## Readings taken

1. **Model seats hear the council too, on by default.** The text says the toggle is on by default for human seats and
   that comparing model kings with and without it waits for model games; it also says the council is "for every ruler
   played by a model or a human" and its value is grounding model kings. So model and file seats hear it, and no table
   setting turns it off for them until the comparison is asked for (no stopgap). Principle: build the final game; the
   comparison is a later experiment.
2. **The toggle travels with the seat's orders** (`TurnSubmission.council`), so it is in the log and replays, and takes
   effect from the next season. Principle: "recorded in the log so experiments can report whether it was on".
   The log records changes; the starting state is on for every seat that hears a council (the review's point 5: seats
   are named in the log header, so it can be read from there).
3. **The advisors are the script king's own planner with tilted weights,** each with its own memory, not one plan
   described four ways. Principle: "built from the script kings' tactics with different weightings"; "they can be
   confidently wrong".
4. **The Tjaty and the Diviner choose their war**: the Tjaty on the rival whose land beside our troops lies unguarded,
   the Diviner on the runaway leader (`Board.leader`, the shared score function) when in reach; the General and the
   Steward keep the strategy's choice. Principle: their tilts are what they look for, not only how boldly.
5. **"Pictured seasons"** are the search's eight seasons; the council says "8 pictured seasons", the design's example
   wording. Principle: "Brief numbers behind each proposal".
6. **Agreement is order by order**: what all four propose alike is shown once; plain holds where nothing threatens are
   left out of it as noise. Principle: "Compact display".
7. **Titles only where the dossier grades them A or B**, the plain archetype elsewhere, as the dossier's "Start from"
   says: Babylonia's Steward is the governor of Nippur (graded B, "a reading" in the dossier itself); Hatti's Steward and
   Tjaty, Mitanni, Assyria, Arzawa and the city-states use the plain names.
8. **Omen tiers by the chance**: troubled from 40% of the chance at the median season, grave from 75% (first guesses).
   Principle: "in tiers, never in numbers", "darken by the curve alone".
9. **Borrowed time from a point drawn past the median**, 100% to 125% of it, from its own seeded stream. Principle:
   "Borrowed time past the median"; drawn apart from the last season so it says nothing of it. (The review, point 3,
   noted the first draft's 85% could speak of an overdue end before the median.)
10. **The darkest tier at the bottom of the cap's range, as the text says,** and with no cap where the chance reaches its
    level at season 80 of a 44-season median. The reviewer (point 2) asked to place it by the curve alone, since a range
    of a single season would then show it in that season; the text sets it at the bottom of the range "so it reveals
    nothing beyond the range itself", and a single-season range is a known cap by the text's own words, so the text was
    followed. Principle: the item's sections decide.
11. **Courts the sources say nothing of read in a plain voice** ("the seers"), with no invented rite. Principle: the
    dossier's "use ... the plain archetype ... rather than invent one".
12. **Characters see the omens where they already read the ending's rule** (the life and band-chief requests), in the
    voice of the court that holds the province where they stand; envoys at audience, governors and commanders do not
    yet read the ending at all (item 11a's reach), and nothing here adds it. Principle: "Everything is somewhere";
    the review's point 6.
13. **The measure plays script kings by their council** (`--council-play-half`): each season the whole plan of the
    advisor the other three agree with most, as a king weighing four disagreeing advisors would. Script rulers never hear a council in a real game;
    this measures whether following the counsel plays well.

## Design questions

None: the page and the item's sections settled every reading.

## What was measured

- **Before and after, 50 script games** (`scripts/sim.sh --games 50 --seed 1 --verify-replay`; before: item 15 merged
  with develop; after: this branch): **identical game for game**, every one of the 50 replaying exactly. Script rulers
  never hear a council and the omens are words, so script games are unchanged, as they must be. Games stay playable:
  47.3 seasons on average (5 to 94); wins spread over 29 powers, the Great Kings 17 of 50 (Egypt 6, Babylonia 5,
  Mitanni 3).
- **The search's refactor** (the pictured seasons in a function of their own, and who holds the land after a season
  in another, for the council's numbers): seeds 9 to 11 replayed on the final head give the same games as the "after"
  run, line for line.
- **Use against ignore** (`--council-play-half`, 50 games, every one replaying exactly): script kings that play their
  troops and levies by their council, taking each season the whole plan of the advisor the other three agree with
  most, against kings that play their own plan: **0.82 growth to 0.76, 29 wins to 21**. The council's advice pays when
  it is followed as a plan. The first try, taking each troop's majority order across the four plans, grew as well
  (0.81 to 0.79) but won 17 to 33: its supports backed moves no advisor made. The follower was patched to keep a plan
  whole (reading 13), which is also how the page tells a human to use it (a button per advisor). By power the gain is
  widest for the middle and weak powers (Mitanni 0.92 to 0.78, Arzawa 1.01 to 0.86, Babylonia 1.09 to 0.98); Assyria and
  Egypt even.
- **How the council is used in a real game** can only be measured with human or model seats; model games wait until
  the build order is done. The tests check that a seat hearing it gets four advisors, numbers behind its strikes,
  titles from the dossier, the toggle in the log and the same game with the council on or off.

## Found along the way

- **The batch runner kept risen powers between games** (item 13+): a worker thread that played a game where a governor
  rose kept the risen power in the registry, and the next game's seats, chosen from the powers in play, had no setting
  for it, so the run crashed. Each batch game now starts with none risen (`setRisen([])` in `playOne`). Found by the
  council measure, whose games raise governors; script runs of earlier items rarely did (13+'s report: none in 50).

## Review

One reviewer (Opus, high). Blocking 1, the council's numbers saying a city falls when its troops only reach the walls
and the capital lost when a foreign troop merely stands in it: fixed (counted by the search's own rule of who holds land
after a season, worded "ours at the end of n of 8", "reaches the walls"). Blocking 2, the darkest omen at the bottom of
the cap's range: kept as the text says (reading 10). Not blocking: borrowed time moved past the median (reading 9); the
rulebook names the darker tiers; the toggle's starting state (reading 2); characters who do not yet read the ending
(reading 12). CI also caught the script king holding the game's seed for the measure (now a one-way seed function) and
test seats that can sleep paying for a council they never read (now only seats that `hearsCouncil`).

Questions for Haakon: none.

## Workshop check

(1) A code PR's checks took 8 to 10 minutes on this branch (8 min 25 s and 10 min 6 s for the last two pushes), as on
29 October; the item's tests add about 50 s of suite time, the council's games kept to three powers. (2) `CLAUDE.md`
17.4 KB, the builder rules 11.2 KB, the progress file 19.3 KB: all under 20 KB. (3) Over 50 KB: only the old round
report kept as a specification and the fine map's data (`src/web/src/map/geo-fine-data.ts`, 105 KB, data), as before.
(4) `item/royal-council` is deleted from GitHub once merged, if this session may (item 14's report found it could not).
(5) No leftovers: the item's before and after ran from worktrees in the session's scratchpad, never in the repository.
