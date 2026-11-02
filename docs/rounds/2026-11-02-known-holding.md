# Order checks read what the court knows (bug #467, side lane, 2 November 2026)

Bug #467 (found in Codex's review of #378): the `govern` check read the true holder of a far province, so a king whose
province was lost out of his sight read "nippur is not yours" in the same season, before any courier could bring the
news. The owner wanted it fixed now, as a P1 of "Hidden information".

## What changed

- **The checks.** Every order check that asked who holds a province now asks who the court knows holds it:
  `Checking.knownOwner` (`src/engine/src/rules/validator.ts`), from `Views.knownHolders` with the seat's
  sight. (`knownHeld`, which #378 adds for `crown`, is `knownOwner(x) === power`.) A province in sight reads exactly as before, so only far land changes. The checks it covers: `govern`;
  `build`, `raze`, `sally`, `besiege`, `raise`, `disband` with settling, `cede`, `hunt` (armies); `sell`, `purchase`,
  `feed`, `caravan`, `trade`, `ship` (both ends), `toll`, `demand`, `census`, `welcome`, `expel`, `returnRunaways`,
  `deport` (both ends) (economy); `grant` (people).
- **The answer by the road.** The order the court thinks valid goes in, and the engine carries it out by the true
  holder. Where that fails because the land is lost, the notice now comes home by the road (`TurnEngine.lostOrder`, a
  `tell` from the province): works, levies, cessions (a province or the capital), welcome, expel, runaways sent back,
  deportations (either end lost), grants of passage or basing, the markets' sales, purchases, grain for the towns
  and caravans, trade and ships; a unit disbanded to settle on land lost out of sight goes home, and that notice comes
  by the road too. A scheduled order foiled so wakes its seat when the word comes: the wake line
  (`scheduledFailure`) travels as its own word (news `Foiled`) and `wordArrives` adds it to the seat's wake reasons.
  A sally from a city the king no longer holds no longer reaches the battle (it had no check at resolution) and is told by the road too. A governor granted lost
  land sets out, finds it another's and comes home as any governor of lost land does (`governorsSeason`).
- **The canary** (`src/web/test/canary.test.ts`) grows a case: a far province of Assyria's, lost by the log of who held
  it in the second season, whose word does not reach its court within the game; Assyria's seat sends it a governor
  in the first season. The refusal's words ("… is not yours", "do not hold …") may reach Assyria only once its view knows the
  loss, and the test checks every path it already checks (each seat's input, every model call, the page's panels and
  map in every season, the province's card, the replay, the exports). Without the fix it fails: "season 2, Assyria's
  input: the far province lost out of sight". A positive control checks that the province is another's in truth, that
  Assyria's view still holds it, and that the governor went.
- **An engine test** (`src/engine/test/known-holding.test.ts`): the checks accept a govern and a build for the far lost
  province and still refuse land the court knows another's; the governor sets out; the lapsed work's notice is a
  courier's word, not an inbox line; a deportation to lost land fails by the road; a scheduled order foiled far away
  wakes its sleeping seat only when its word arrives.
- Rulebook (`src/llm/src/rules-command.ts`), README, `docs/design/13-travel-and-news.md` ("News", replacing the reading
  of question 6 that a refusal could tell a court of a change of hands) and `docs/design/01-rules-as-implemented.md`.
  Save version 41.

## How it fits with item 17++ part C (#378)

#378 adds `knownHeld` for `crown` and `governorsKnown` for the governorships as the court knows them. This lane adds
`knownOwner` beside where #378 puts `knownHeld` (`validator.ts`, `validator-context.ts`), which all the checks here need;
it does not add `knownHeld`, which nothing here uses, so whichever merges second writes `knownHeld` as
`knownOwner(x) === power` and nothing is kept twice. Its `govern` check (`v.knownOwner(...) !== v.power`) sits on the line #378 leaves
unchanged. Until #378 merges, a governor whose land was lost leaves the seat's view as the season turns, as every
governor of lost land does on `develop`; #378's `governorsKnown` and `dropGovernor` keep him in view until word comes,
which completes this for `govern`. #378 takes save version 43; whichever merges second takes the next.

## Readings taken

- **The governor sets out.** A grant the court thinks valid goes in, and the man goes where he was sent: that is what
  would happen, and the loss of his province then reaches the court through the governors' own rule for lost land, by
  the road once #378 is in. Keeping him silently at court would show the court at once that something went wrong
  ("Hidden information"; "the engine answers by the true state, as word travelling home", the lane's brief).
- **A foiled scheduled order wakes its seat by the word, not at once,** where the place is far: a wake is a notice too,
  and an instant one would tell the sleeping king of the loss.
- **Orders that never fail on lost land** stay as they were, since none tells a court anything: a census for land lost
  out of sight pays its scribes' gold where they arrive and they come home with no count (as the governor goes); a
  demand or a toll set on it is recorded and answered "now asked" at court, as the court believes, and falls to nothing,
  since demands and tolls are read by the land's true holder; a hunt there does nothing. #517 covers a far order's
  outcome being told at once.
- **The governor's case completes with #378.** A governor of far land lost leaves the seat's view at the next season's
  turn on `develop`, whatever the grant, since the view lists the governorships from the true state; #378's
  `governorsKnown` and `dropGovernor` keep him in view until word comes, and this lane does not copy them (the brief:
  take C's helpers, do not duplicate them). The canary's seat therefore sends its governor once, not on what its view
  shows next.
- **Kept to the order checks of who holds what** (the brief). The checks' other reads of a far province's true state
  (sieges, works, walls, men) and the instant notices of a far order's success are filed as bug #517.

## Benchmarks

`scripts/sim.sh --games 20 --seed 1 --verify-replay`, on `develop` (before) and on this branch at `b31b319` (after): the whole summary is identical, line for line: the same 20 games, the same turns and winners (seed 1, 102 turns, Egypt; ...), 297 kingdoms fallen, the first fall at season 4.5 on the median, the same use of every order; every game replays exactly. The script kings never order for land lost out of their sight in these games, since their orders read their view, and the new failures by the road arise only there. No balance changed, as the frozen-balance rule asks. The save version moved to 41 because what the checks accept changed.

## Reviews

- Codex, round 1: two P1s (a deportation's lost destination told at once; a far foiled scheduled order never waking its
  seat), both fixed. Round 2: no major issues. Security: one P2 (siege, stock, walls, works and men still read in the
  checks), moved to #517.
- Claude's reviewer (Opus, high): round 1 6/10 (deport, disband with settling, the governor's view, and four smaller
  items), all fixed or moved out with their reason; round 2 9/10, its four remaining items (benchmarks, a test for the
  travelling wake, the PR's text and two docs) fixed.

## Helpers

- A search helper (Haiku) read the resolution handlers of the 24 order kinds and returned, for each, what happens when
  the land is not truly held (notice at once, by the road, silent, or no check): the list the resolution changes follow.

## Questions for the owner

None. Filed: bug #517 (the rest of a far province's true state), idea #520 (a twin canary, the reviewer's one idea).
