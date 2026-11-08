# Item 18: the balance pass

Weekly usage: unknown (`scripts/usage.sh` cannot read it in this session).

The item's text: `docs/intent/build-order/item-18.md` ("The balance pass"). **The check for changes:** the live design
document refuses this account (the docs connector answers "forbidden"), so the item is built from the copy cut on
3 November, and the copy on `develop` is read again by its diff before each part's pull request.

**Built in parts,** each its own pull request, since the item holds things a reader looks up apart, and tuning waits on
what comes before it:

- **A. Before tuning:** the power names out of the script kings' rules; temperament a setting (the sources' kings, or
  rolled per game).
- **B. The scoreboard:** the powers' par refreshed; the weight of size (#825, the owner's); how the land weighs against
  gold and goods; bold and careful characters reaching the top at comparable rates; win rates per power.
- **C. Length and war:** the default cap and median of the random ending; the pace of war (sieges, marching, slow
  absorption); whether capitals fall in most games (pillar 8); standing orders and commanders; wars that begin and end.
- **D. Money and characters:** characters' costs, lending, the gift threshold, the pool's size, markets' purses, fees
  and servants (no court starved of carriers or tongues); bold and careful characters re-measured and tuned until both
  roads reach the top at comparable rates (part B found the careful ahead, also measured after part C).
- **E. Script kings' spending as investment:** gifts, bribes and tribute judged by expected return; the darkest seasons'
  grabs; courts playing distinctly; how close their best options are; whether kings build, give and campaign or sit on
  their treasure, and what the last seasons look like (the wealth of a realm's two checks, from part B).
- **F. The audit:** par refreshed once more on the tuned play; bold and careful in the top five and twenty (from part D); every feature passes use against ignore; the people 17+ added judged by what they did (the list to
  the owner); starting positions, banditry and far provinces against the sources; win rates per power on the item's
  full seed sets (1-100 and 101-200), Mitanni's standing below par and why a Great King stands first more often than
  a city-state even at a weight of size of 0 among them; commanders' worth by the distance of the front and the size of
  the realm (from part C). Then **stop for review**.

## Part A: before tuning

Started from `develop` at 4a7be3d (17b's milestone merged, #827).

### What was built

- **No rule names a power** ("Different data, same rules"). The audit found the script kings' rules already reading rank,
  map and starting data (thinking maritime from the coast, the small powers' fleets, peace bonus and tribute and a proud
  king's denial of the rank from tier, Babylonia's named rule gone since item 8); two fallbacks still named Egypt, a
  character's invented rival offer and a defence plan's likeliest attacker when none was found, and now name none.
  Left as they are: presentation (names, seasons, titles), the sources' starting data (Egypt's commissioners of 1346),
  and the frozen first script leader kept only as a benchmark yardstick (`bots/baseline-leader.ts`, "Do not improve it").
- **Temperament is a setting** (`GameConfig.rolledTraits`, off by default): on, every king's traits are rolled for the
  game (`rolledNature`, each 15 to 85, then varied as always), a record heir keeps his name and kin but not the
  record's nature nor its account of his deeds, every king's rulebook says the temperaments were drawn, and no court knows a rival by his history (`SeatView.rolledTraits`): a script king pictures every
  rival as a middling king (`unknownKing`) and judges him by what he does. `--rolled-traits` in the batch runner,
  "Kings' temperaments rolled" under Customize. Save version 87.

### First guesses (later parts tune them)

- A rolled trait is drawn from 15 to 85 (`RolledRange`), for record heirs too, so no rolled king is as extreme as the
  sources' most extreme.

### Readings taken

- **Rolled means the kings' temperament, and nothing that would tell it** ("Temperament becomes a setting", item 18;
  "games with rolled temperaments" in "What keeps them different"; the design check's first round): names and the
  record's order of heirs stay, but not what the record says of an heir's deeds, which would tell every court a nature
  he does not have; every king is told the temperaments were drawn, since a model knows the kings of history; the
  attested characters keep theirs ("every attested character set the same way", item 17b, is the default).
- **The frozen baseline is a yardstick, not a player**: it plays only in benchmarks against the current scripts, never
  in a game a player sees, and changing it would break every benchmark's comparison.
- **A middling picture, not inference from deeds**: a rival's picture is only the look-ahead's prior; what he does
  already moves the script's trust, grudges and fear of him each season (`Brain.learn`), so judging by deeds needs no
  new rule.

### Script players and the measure

- **Regression** (`scripts/sim.sh --games 50 --seed 1 --verify-replay`): all 50 games replayed exactly, with the same
  results as 17b's last run (Egypt 23, Babylonia 14, Hatti 6, Assyria 4, Ugarit, Ashkelon and a character one each):
  the default plays as before, and neither fallback changed a game.
- **Rolled temperaments** (`--rolled-traits`, the same 50 seeds): every game ran; wins Egypt 19, Babylonia 14, Mitanni 4,
  Hatti 4, the Suteans 2, Assyria 2, and five others one each; Mitanni fell in 25 games (14 with the sources' kings),
  Lukka in 13 (33). The courts play differently when their kings do, as "What keeps them different" asks; part C
  judges the pace of war on the sources' kings, the default.
- **No new lever**: a table setting, not a choice in play, so no use against ignore.

### Questions for the owner

- [#825](https://github.com/HaakTuah/amarna-letters/issues/825) (still open; part B needs it).

## Part B: the scoreboard

Started from `develop` at dbccc06 (part A's milestone, #829, merged). The check for changes: the live document still
refuses this account; the copy on `develop` has not changed since part A began.

### What was built

- **Par refreshed** (`scripts/sim.sh --games 50 --seed 101 --par-out`, 24 minutes): the powers' and the characters' par
  from the same 50 games, on the rules as part A left them. Against the old powers' par (measured before 17b's parts
  changed who falls), the strong powers grow more and the middle ones fall more: Egypt's median growth 0.89 to 1.25,
  Hatti's 1.03 to 1.74, Babylonia's 0.93 to 1.22; Assyria fell in 28 games (10), Mitanni in 12 (3), Arzawa in 14 (6).
  On the old par these same games went to Egypt 22, Babylonia 14 and Hatti 10.
- **Hatti's closings, five** (`bots/voices.ts`, presentation only): with four, one line stood in 7 of 12 of a test
  game's letters once play moved, against "no script king repeats one sentence in most of his letters".
- **Bold and careful counted**: the batch summary gives the share of bold characters among each game's five
  best-placed living characters, against their share of all characters.
- **Kept**: the weight of size at 5 percent, one number (`GameConfig.sizeWeight`), so the owner's answer to #825 is a
  one-line change; the land at its fixed multiple (`provinceWeight` 10). Save version 88.

### Readings taken

- **The weight of size stays as built, 5 in a hundred**, the owner's last answer (29 October, to item 11e), while #825
  is open (the orchestrator's brief; "Unattended work"). It is set in one place, so his answer is one line.
- **The land stays at a fixed multiple** ("The wealth of a realm": fixed values, and "every movement of wealth scores
  itself"): land valued by the seasons left would move every score as the omens darken while nothing changed hands.
  How the land weighs in what the kings do (build, give, campaign or sit on their treasure; the last seasons) is
  measured in part E, where their spending is tuned.
- **Bold and careful are not yet comparable; part D tunes them** ("Bold or careful, one goal": "if one road always
  wins, the numbers are tuned"): the careful hold 47% of the top places from 38% of the characters, about 1.45 times
  the bold's rate a head and about three standard deviations from parity, so the gap is real. The numbers either
  road earns by (lending, fees, characters' costs) are part D's to tune, and part C changes the bold road's risks, so
  tuning them here would be done twice; it is measured after C and tuned in D.
- **One refresh of par, not a chase for a fixed point** ("Balance: first guesses during the build"): par steers the
  scripts' play, so each refresh moves the play it measures; one refresh, checked on its own seeds, puts every Great
  King but Mitanni within 0.07 of par, and parts C to E change the play again, so par is refreshed once more at the
  end of the pass (part F).
- **Par moves the save version** ("new rules mean a new save version"): the scripts' play and a game's final scores
  and winner change with it.

### Script players and the measure

- **Seeds 1-50 on the new par** (`scripts/sim.sh --games 50 --seed 1 --verify-replay`): every game replayed exactly;
  the script kings read par in play (`Board.growth` ranks every rival by it), so the play moved as well as the
  scores. First place: the Great Kings 15 (Assyria 5, Hatti 3, Arzawa 3, Egypt 2,
  Babylonia 2, Mitanni and Alashiya none), the city-states 25 (18 of them; Seha and Amurru 3 each), characters 10.
  Mean standing (1 is par): Egypt 1.00, Hatti 0.82, Babylonia 1.08, Mitanni 0.79, Assyria 1.02, Arzawa 1.14, Alashiya
  1.10. So par holds the Great Kings near even among themselves and Egypt's mines carry it no further than par allows.
  A Great King still stands first about 3 times as often as a city-state (about 2 games each, against under 1), and a
  character stands first in 10 games against 2 on the old par, since a well-measured par puts the best of a game's
  370 characters near the top of his ranking as often as the best king.
- **The weight of size, rescored** (the same 50 games with `--detail`, every board rescored at other weights, since no
  script reads the weight; at 5 the rescoring gives 15, 24 and 11, the run's 15, 25 and 10 within rounding): first
  place to the Great Kings, city-states and characters at weight 0: 11, 25, 14; at 2: 11, 25, 14; at 5: 15, 24, 11;
  at 10: 24, 17, 9; at 20: 34, 13, 3; at 50: 50, 0, 0 (Babylonia 23, Egypt 15). So even at 0 a Great King stands first
  about 2.7 times as often as a city-state, so size is not the whole of their edge; why is not measured here, and part
  F looks for it. Lower weights bring the powers
  nearest each other and give characters the most wins (14 of 50 at 0 to 2, perhaps more than "now and then"); higher
  weights cut the characters' wins but hand the games to the Great Kings. That choice is #825's, and the numbers are
  added to it.
- **Par is close to settled**: measured again on seeds 101-150 under the play the new par makes, the Great Kings
  stood at Egypt 1.02, Hatti 0.97, Babylonia 1.06, Assyria 1.06, Arzawa 0.99, Alashiya 1.07 and Mitanni 0.75; first
  place went to kings in 39 games and characters in 11. The par from that run would itself move play again, so the
  first measure is kept (the readings).
- **Bold and careful**: of the five best-placed living characters, 53% were bold (132 of 250), against 62% of all
  characters (9,991 of 16,239): a careful character reached the top five about 1.45 times as often as a bold one.
- **No new lever**: part B changes what is counted, not what a player can do, so no use against ignore.

### Questions for the owner

- [#825](https://github.com/HaakTuah/amarna-letters/issues/825) (still open; part B's numbers added to it).
- [#806](https://github.com/HaakTuah/amarna-letters/issues/806) (still open; part B does not depend on it).

## Part C: length and war

Started from `develop` at 1f81bfb (part B's milestone, #831, merged). The check for changes: the live document still
refuses this account; the copy on `develop` has not changed since part A began.

### What was built

- **A breach takes twice the wear** (`EconomyData.breachPerLevel` 6 steps for each level of walls, 3 before). Saved
  version 89.
- **The war report** gives pillar 8's measure: how long a letter from each fallen court to its conqueror's and the
  reply take, and the falls that came sooner than that after his entry, by kingdom (measured where the conqueror still
  reigns at the end); and in how many games a Great King's realm fell. (The table's "within four seasons" row was read
  from a first version of the line, while the levers were tried.)
- **Kept**: the age's median and cap, the gate a starving city keeps, the people's help on rough ground (the readings).

### Numbers tuned

- `breachPerLevel` 6 (from 3), so walls of level 1 hold three to six seasons of wear and level 3 nine to eighteen.

### Readings taken

- **The breach, not the stores, was the clock, so the breach is what moves** ("How long a siege lasts": "Walls price
  the storm, not the clock"; "A blockaded city holds as long as it can eat and drink"): of 1,579 sieges won in seeds
  1-50, about 990 ended in a breach, 562 by hunger and 31 by thirst. With twice the wear, hunger and thirst end most
  (838 and 223 of 1,344).
- **The gate stays at 1** ("Balance: first guesses during the build": a number changes only where the measure asks it to): a gate kept three seasons longer halved the gates opened from within (562 to
  298) but left the falls within four seasons where they were (403 against 400), since the breach came first.
- **The rough ground stays twice** (pillar 8 against the length test): three times left Lukka's eight early falls as
  they were and cut the ages that saw a Great King's war decided from 42 to 39 of 50.
- **Lukka's early fall is the owner's question** (#832; pillar 8 and "Whom a province obeys"): its chief dies in a
  lost battle and his heir, who inherits a third of his father's standing (17b), weighs about 33 against an army's force
  of up to 100, which clears it by more than the margin of 20. The levers that are first guesses move this too little:
  rough ground at three times left the eight games as they were; the margin would need to be about 67 or more, and the
  most force can weigh about 53 or less, each freezing or slowing conquest in every province. So the choice is between
  the built rule, an heir's larger share, and a rule for every land without a town: the owner's.
- **Marching and slow absorption are measured and kept** ("the pace of war (sieges, marching, slow absorption ...)"):
  the pace on the roads comes from the distances dossier ("Starting positions come from the sources"), and from the
  conqueror's entry most falls now wait on a siege, not the march; absorption ("Obedience has degrees": a third of the
  yield at a bare lead) is unchanged, and revolts (381 in seeds 1-50) still take back what is held badly. The
  slower breach is the one number the measure asked to move.
- **The age's length stays as the owner set it** ("Random ending": a median of about 80 seasons, the cap at 140 to
  160, 30 October 2026; "most ages should see at least one Great King's war decided"): 42 of 50 ages pass, and the
  slower breach does not lengthen a game, whose end is drawn at the start.
- **Wars still begin and end, read from what follows them** (item 18: standing orders "favour defence ... so check that wars still end, and that
  they still begin"): the first fall of a game comes in season 6 on the median (4 before), 3,670 offers of peace were
  accepted (3,725 before), and a Great King's capital fell first in 20 ages and a Great King was made another's vassal
  first in 22.

### Script players and the measure

All on seeds 1-50, before (part B's rules) and after; the built rules' regression run (`--verify-replay`) replayed all 50
games exactly, with the same results as the column for them:

| | Before | Gate 3 | Breach 6 (built) | Breach 6, rough ×3 |
|---|---|---|---|---|
| Kingdoms fallen | 989 | 968 | 934 | 883 |
| First fall of a game, median season | 4 | 4 | 6 | 6 |
| From the conqueror's entry to the fall, median (within 5-10) | 5 (29%) | 6 (26%) | 7 (53%) | 7 (55%) |
| Fallen within four seasons of the conqueror's entry | 400 | 403 | 105 | 100 |
| Fallen in the first two seasons (games) | 8 (Lukka) | 8 | 8 | 8 |
| Ages with a Great King's war decided | 43 | 43 | 42 | 39 |
| Sieges won: by hunger / thirst / breach | 562 / 31 / ~990 | 298 / 42 / ~1,190 | 838 / 223 / ~280 | 808 / - / - |

- **Commanders pay** (`--command-play-half`, the item's "commanders are worth what stale orders cost"): kings that grant
  command away from court grow 0.90 against 0.79 and win 27 games against 12, from half the seats each. Overall only: the split by the distance of the front and the size of the realm is part
  F's.
- **Wins** on the slower breach: Assyria 12, Arzawa 3, Hatti 2, the city-states 22, characters 10. Par was measured
  under the faster breach, so the standings lean; part F refreshes par on the tuned play.
- **Pillar 8 holds but for Lukka** (the regression run): a letter to the conqueror and its reply take 2 seasons on the
  median, and 3 of the 724 falls so timed came sooner after his entry, all Lukka's (#832). **Capitals fall in most
  games**: a Great King's realm fell, left holding nothing, in 36 of 50 (since 17b a realm falls only then), so his
  capital was taken in at least as many; judged with the length set, as the item asks. The falls left out of the
  letter-and-reply measure (210 of 934) are those whose conqueror no longer reigned at the end; the within-four-seasons
  count, which takes every fall, came down from 400 to 105 on the same rules, so they do not hide a fast war.
- Item 5 found 61% of falls within 5-10 seasons of the conqueror's entry; the city-states since 11+ brought it down to
  29%, and the slower breach brings it back to 53%.

### Questions for the owner

- [#832](https://github.com/HaakTuah/amarna-letters/issues/832): a land without a town falls in one battle; should it
  hold out for some seasons (new)?
- [#825](https://github.com/HaakTuah/amarna-letters/issues/825) and [#806](https://github.com/HaakTuah/amarna-letters/issues/806) (still open).

## Part D: money and characters

Started from `develop` at 922d4b2 (part C's milestone, #834, merged). The check for changes: the live document still
refuses this account; the copy on `develop` has not changed since part A began.

### What was built

- **Danger money goes to the bold**: what a person asks more of a court it heard loses its people abroad or puts others
  to death is doubled, and runs from twice that for the timid to nothing for the bravest (it ran from all of it to half).
  What it asks more of a court heard to seize hoards keeps its old scale: that threatens a keeper's gold, not his life.
  The rulebook's line on prices says so. Save version 90.
- **The money report** (`game/src/money-report.ts`, in every batch summary): where the world's gold sits at seasons 1,
  20, 40, 60 and 80, the kings' gold away from their treasuries included; in each twenty seasons the jobs agreed, their
  fee a season, the share of characters in service and what a free man takes in a season working for himself; and each
  road's characters, deaths, places in the top five and twenty, jobs with courts heard to lose their people, gains and
  earnings by source. It replaces part B's line on the roads. The batch summary also gives the busiest season's
  wake-ups beside the average.

### Numbers tuned

- `WaryLost` 20 (from 10), `WaryKilled` 30 (15), `WaryMost` 120 (60), scaled by 2 × (100 − courage) in a hundred (from
  100 − courage/2). `WarySeized` stays 15, at most 60 (`WarySeizedMost`), scaled as before.

### Readings taken

- **The bold lost on price, not on choice, so the price of danger is what moves** ("Bold or careful, one goal": "well-paid
  errands into danger"; "Fees clear the market"; "Skills set the odds; the character decides"). Kings hire the cheapest
  candidate who will go, and the bold ask more (greed is in every price), so the careful took most of the jobs: they
  earned 165 shekels a head in fees against the bold's 101. Whether a free man seeks service was not the cause: two
  versions of that choice moved nothing on seeds 1-20. With the premium steeper by courage, the careful shun courts heard
  to lose their people and the bold take more of that service: of the jobs with such courts, the bold's share rose from
  53% to 60% on seeds 1-50 (they are few, 4% to 8% of all jobs, and fewer now that the careful shun them). Three times
  the premium did worse than twice on seeds 1-20, so twice is kept.
- **The top five, not the top twenty, is "the top of the ranking"** (part B's measure, kept so the two compare): a
  careful character reached the top five 1.20 times as often a head as a bold one on both seed sets (1.44 and 1.47
  before), and the bold took 56% to 57% of those places from 61% of the characters. The top twenty did not move (1.9 to
  2.0 times), since a careful man's steady fees give a higher median gain (37 shekels against 22), and the bold road's
  loot pays less than the fees it gives up; lending's rates, the bold road's other source, were kept untried. Part F
  measures both again on the tuned play.
- **The careful still die more often than the bold** (17% to 19% against 12% to 14% at the end, about as before): service
  abroad is where men die, and the careful still hold most of it. The design has the bold road as the one that may end
  "dead"; the danger premium shifts the deadliest service a little, and part F looks at it again.
- **Working for oneself never pays better than service, so fees need not rise to win men back** ("Where characters are,
  and what they speak": "whether fees rise until service pays again when working for oneself pays better"): after the
  first twenty seasons a job pays 27 to 28 shekels a season, while a free man takes in about 1 a season working for
  himself (lending and dealing at face, loot, news and carrying). The share in service falls from 38% in the first
  twenty seasons to 5% to 7% after a hundred because the courts hire less (about 9,500 jobs agreed in the first twenty
  seasons, 1,300 in seasons 61-80), not because service pays too little. **The falling side is still open**: with so
  many idle, "when many wait for work, they fall" asks for falling fees, and they held; a seeker's price that falls as
  he waits moved neither the fees agreed nor the roads on seeds 1-20, since a price is set by what a man has heard
  others paid as much as by his own. Part F measures it again.
- **The markets' purses do not inflate, and their gold drains off the map, not into hoards** ("Where gold comes from and
  where it goes"): over the first eighty seasons the purses fall from about 44,000 shekels to 18,000 and the treasuries
  rise from about 6,700 to 16,000 to 17,000, while hoards stay near 3,000, characters' purses near 6,000 and the kings'
  gold away from their treasuries near 150. All the gold counted falls from about 57,000 to 42,000, most of it in the
  first forty seasons and little after sixty: what leaves goes out through the edge markets, the main way out the
  design names, and the purses settle.
- **No court is starved of carriers but Egypt, and Egypt's is the residents' rule, the owner's** (#836; "Where
  characters are, and what they speak"): letters to every other court wait 1.0 to 2.5 seasons for a carrier understood
  there; to Egypt 3.8 to 4.0, and nearly all of them are Pharaoh's commissioners' reports from posts with no court to
  hire at, which a resident never carries himself (item 17++). The border walk a watcher may take would not help: no
  such post lies next to Egypt's own land. Kept as built; the alternatives are in the issue.
- **The pool keeps its baseline** ("How many characters": "that spike, not the average, is what to watch"; "late games
  may have a surplus of characters, which means cheap men and more outlaws, and suits the age"): 0.28 wake-ups a season
  per character, about 100 to 110 a season over a pool of 330 to 350 (the dead counted); the busiest season of a game
  wakes about 150 on the median and at most about 400, nearly the whole pool. No court waits long for servants but Egypt (above), so the measure gives no reason to move it; what
  the spike costs in model calls is weighed with the model games.
- **Characters' costs and lending stay as built**: characters spend about nine tenths of what they earn (living, a
  hoard's keep, loans made, what was taken), lending and dealing bring about 8% of what both roads earn, and nothing in
  the measure points at a number there.
- **The gift threshold of routine audiences stays** (the standing answers' backstop, a quarter of the treasury): only
  model kings meet it, and no model games are run until the build order is done; it is weighed then.

### Script players and the measure

On the same seeds, before (part C's rules) and after:

| | Seeds 1-50 before | after | Seeds 101-150 before | after |
|---|---|---|---|---|
| Bold share of all characters | 61% | 61% | 62% | 62% |
| Bold in the top five | 129 of 250 (52%) | 142 (57%) | 132 (53%) | 143 (57%) |
| Careful's rate a head against the bold's, top five | 1.44 | 1.20 | 1.47 | 1.20 |
| Careful's rate a head against the bold's, top twenty | 2.00 | 1.90 | 1.88 | 1.97 |
| Jobs with a court heard to lose its people, bold / careful | 8% / 6% | 7% / 4% | | 6% / 4% |
| Dead at the end, bold / careful | 13% / 18% | 12% / 17% | 13% / 19% | 14% / 19% |
| First place: kings / characters | 40 / 10 | 42 / 8 | 40 / 10 | 41 / 9 |

- **Regression** (`scripts/sim.sh --games 50 --seed 1 --verify-replay`): all 50 games replayed exactly. Wins: Assyria
  8 (12 before), Egypt 2 (1), Arzawa 2 (3), Hatti 1 (2); the change moves only who is hired, and the seeds diverge from
  there.
- **Seeds 1-20, the levers tried** (before the seizure premium was set apart): whether a free man seeks service, two
  ways, moved nothing; the danger premium at once (×1, steeper by courage) gave the bold 59 of the top five's 100
  places (51 before), at twice 59, at three times 50, and twice with a seeker's price falling as he waits 64.
- **No new lever**: part D changes what a person asks, not what a player can do, so no use against ignore.

### Questions for the owner

- [#836](https://github.com/HaakTuah/amarna-letters/issues/836): Pharaoh's commissioners wait for passers-by to carry
  their reports; should they carry them, or hire a carrier, after a long wait (new)?
- [#825](https://github.com/HaakTuah/amarna-letters/issues/825), [#832](https://github.com/HaakTuah/amarna-letters/issues/832)
  and [#806](https://github.com/HaakTuah/amarna-letters/issues/806) (still open).
