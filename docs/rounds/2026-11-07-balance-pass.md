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
  and servants (no court starved of carriers or tongues).
- **E. Script kings' spending as investment:** gifts, bribes and tribute judged by expected return; the darkest seasons'
  grabs; courts playing distinctly; how close their best options are.
- **F. The audit:** every feature passes use against ignore; the people 17+ added judged by what they did (the list to
  the owner); starting positions, banditry and far provinces against the sources. Then **stop for review**.

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
  game (`rolledNature`, each 15 to 85, then varied as always), a record heir keeps his name and story but not the
  record's nature, and no court knows a rival by his history (`SeatView.rolledTraits`): a script king pictures every
  rival as a middling king (`unknownKing`) and judges him by what he does. `--rolled-traits` in the batch runner,
  "Kings' temperaments rolled" under Customize. Save version 87.

### First guesses (later parts tune them)

- A rolled trait is drawn from 15 to 85, so no rolled king is as extreme as the sources' most extreme.

### Readings taken

- **Rolled means only the temperament** ("Temperament becomes a setting", item 18; "games with rolled temperaments" in
  "What keeps them different"): names, the record of heirs and what it says of them stay, since they are history, not
  nature; the attested characters keep theirs ("every attested character set the same way", item 17b, is the default).
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
