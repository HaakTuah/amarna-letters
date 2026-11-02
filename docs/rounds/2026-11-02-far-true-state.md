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
- Rulebook (`rules-command.ts`), README, `docs/design/13-travel-and-news.md` ("News"). Save version 45 (#534 takes 45
  too; whichever merges second takes the next).

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

## Benchmarks

BENCH

## Helpers

None: the twin canary did the finding, which a search helper would otherwise have done.

## Questions for the owner

None. Bug filed: #540 (a far province's economy, works, people and caravans, and the realm's totals, as they are).
