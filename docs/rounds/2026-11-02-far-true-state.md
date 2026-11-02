# Far provinces' true state and the twin canary (bugs #517 and #520, side lane, 2 November 2026)

Bug #517 (filed while fixing #467): order checks still read a far province's true sieges, walls and men, and a far
order's outcome was told at court at once. The owner queued the twin canary (#520, archive item 174: "Yes, expertly to
all!") to be built in this lane.

## Step 0

`src/engine/src/rules/views.ts` had passed 50 KB, so what a court knows of the land (`sight`, `wallsKnown`, `ownerAt`,
`knownHolders`) moved first to `src/engine/src/rules/known-land.ts`, in its own PR (#542), behaviour unchanged.

## The twin canary (#520)

`src/web/test/twin-canary.test.ts` plays a seat's seasons twice from one small world, a hidden fact true in one and false
in the other, the seat giving the same orders in both (it sees the same). Until word of the fact could reach the seat, its
view (its notices, a script king's whole input and what a model's requests are built from) and the reasons it would be
woken must be the same. The facts:
- a far province lost before the seat's orders for it, and lost after they set out;
- a far city of the seat's besieged before its orders, and besieged after they set out;
- a death abroad (a spy posted at Babylon's court dies there, by the engine's own path: his cover freezes what his court
  believes);
- a foreign army out of sight.

It found leaks nobody had listed. Those within #517 are fixed here. Those of the realm's reports are bug #540, held in
the test by a list of known leaks tied to their issue. A second test fails once a listed leak is no longer found, so the
list can only shrink. Without this lane's engine changes the twin fails on the siege twins: "season 2, view.sieges: …
against []", "season 3, only where true: Orders that could not be carried out: - sell 10 measures of grain from the
stores of nippur: Nippur is besieged…".

## What changed (#517)

- **What a court knows of sieges and walls** (`siegesKnown` in `known-land.ts`): where it sees, as they are; one of its
  own cities, or of its own armies, farther off once word of its beginning has reached it. The seat's view
  (`SeatView.sieges`) and the order checks (`Checking.knownSiege`, `knownWalls`) read the same, so they never disagree:
  `sell`, `purchase`, `feed`, `caravan`, `trade`, `ship`, `expel` (a siege), and `sally`, `besiege` (walls).
- **A levy's men far off** are checked by the court's last count (`raise`).
- **By the road, not at once:**
  - the season's siege news of a far city;
  - "Land taken" to a far besieger;
  - the markets' lines of a far province (sales, purchases, grain to the towns, caravans setting out, trade and ships);
  - a levy's outcome, a cession and a disbanding there;
  - an order foiled by a siege it may not know of, through `TurnEngine.lostOrder`, which now serves for sieges too.
- Rulebook (`rules-command.ts`), README, `docs/design/13-travel-and-news.md` ("News"). Save version 47 (45 and 46
  were taken on `develop` while this was under review).

## Readings taken

- **One function for the view and the checks.** A check that read better than the view would leak what the view hides,
  and one that read worse would refuse what the king sees: both read `siegesKnown` and `wallsKnown` ("Hidden
  information"; one fact, one place).
- **A siege lifted out of sight stays in what the court knows until word of its end comes** (Codex, round 1): every place
  a siege ends now goes through `endSieges` (`model/sieges-ended.ts`), which keeps it in `GameState.siegesEnded` for as
  long as any word could take (eight seasons). A twin ("a far siege the seat knows of, lifted out of sight") guards it.
- **A court knows the walls of the cities it knows it holds as its works stand** (Codex, round 1): its view already shows
  its works so (bug #540), and building walls far off must let a city sally once built.
- **Works levels** of a far province stay read as they are: the view shows them so (bug #540), and the checks read what
  the view shows; they move together when #540 is fixed.
- **Units' own reports** (folding, giving troops, a unit gone when its order arrives) are left as they are: a king's far
  troops are known by their trail, a separate path the twin's "army out of sight" found sound.

## Review, round 1

- **Codex:** a siege lifted out of sight vanished at once (P1), and the walls of a court's own far cities were frozen
  (P2). Both are fixed, and readings above.
- **Claude's reviewer (Opus, high), 5/10.** It found the siege view's live progress, walls and ring; the web map and
  events showing far sieges at once; the sally check reading the troops within; welcome, deport, expel and runaways told
  at once; the twins comparing too little; the known list masking whole fields; and the levy check's "near".
  - Fixed: progress as last reported (`Siege.history`), the web frames' `knownSieges`, siege events without a far
    holder, the sally check, every borders outcome and people fleeing by the road, the levy check by courier reach.
  - The far-loss twins were vacuous: Nippur fell back to Babylonia in both worlds, since a province answers to whom its
    people favour. Now the people favour each world's holder, and the loss happens during a season, as a capture would.
    The known list now matches field and place (`view.provinces[nippur]`), and dictionaries are compared key by key.
  - What the real twins then found is fixed too: yields, markets and resistance kept by the true holder, and a grant's
    instant failure, which is now recorded as given.
  - Moved to #540, explicitly: the checks that read a far province's works (`levelOf` in `build` and `raze`).
  - A near siege failure is a markets line again, as before this lane.
- **Two clocks** (the reviewer's note): the view and the checks time word by `wordSeasons`, the notices by courier
  (`tell`), and the two can differ by a season either way. Neither brings anything before word could come by its own
  reckoning; making them one clock is a question for the realm's reports (#540). Kept, and noted here.

## Review, round 2

- **Codex:** no major issues.
- **Claude's reviewer, 7/10:** three blocking leaks, all fixed, each now guarded by the twins.
  - (A) A siege ended as its city changed hands recorded the new holder, so the old holder's court dropped it at once.
    `endSieges` now records the holder as the season began (by the log of holders).
  - (B) `wallsKnown` read the true walls of a far city the court only believed it held. Now it does so only while the
    court truly holds it, and otherwise keeps the walls it last knew.
  - (C) The events log, which the page lists in each seat's season panel, named a far court as a party to a far
    market's, levy's, borders order's or siege's event at once. `TurnEngine.nearOf` now names only courts within the
    season's reach; a farther one reads of it by the road.
  - The twin canary compares the events each seat may see, and a new twin, "a far city ... falling out of sight", plays
    a storm. Undoing (A) or (B) fails it.
  - What the events then showed of #540's class is listed under #540 and added to it: the realm's reaping event, a far
    province's works events, a caravan's arrival.

## Review, round 3

- **Claude's reviewer, 9/10:** nothing in scope open; it asked for the benchmarks and a bug for grant events seen by
  the grantee at once (filed: #565). Its one idea, the twins at a second place, is filed as #566.
- **Codex, one P1:** a far levy that failed for too few men woke a sleeping seat at once. It now goes through
  `lostOrder`; so do the markets' and trade's foiled orders, through `TurnEngine.wakeFrom` (split from `lostOrder`).
  `wakeFrom` and `nearOf` time word by `heardAt`, as `tell` does.

## Benchmarks

`scripts/sim.sh --games 20 --seed 1 --verify-replay`, each run alone on the machine (#552): before on `develop` at `16bec662`, after on this branch at `68216c71`. Every game replays exactly, 20 of 20, before and after. Every game lasts as many seasons as before; 6 of the 20 have a different winner (seeds 2, 6, 11, 12, 13 and 20), since the script kings read their view and the checks, both now as the court knows the land. Kingdoms fallen: 374 against 378. The first fall still comes in season 4.5 on the median (range 4-5), and no kingdom falls in the first two seasons, so play stays playable. Seats risen in play: 43 against 44. No balance was tuned, as the frozen-balance rule asks. The save version moved (to 47) because the rules changed.

## Helpers

None: the twin canary did the finding, which a search helper would otherwise have done.

## Questions for the owner

None. Filed: bugs #540 (a far province's economy, works and caravans, and the realm's totals, as they are), #552 (the batch summary varies between runs), #565 (grant events seen at once) and #569 (a far levy's waiting orders dropped at once); idea #566 (the twins at a second place).
