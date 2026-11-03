# Item 17++a: something happens every season

The owner's words (2 November 2026): "Still feel like almost nothing has happened in a game now that went to 50 seasons",
then "Yes ro absolutely all pt these! Extra expertly expertly!". The item: "first measure, then fix", under the builder
rules' exception for anything that makes games unplayable for testing; and the four powers' land names follow their
provinces' proper names (#403).

## The measure (`src/game/src/pulse.ts`)

Season by season and Great King by Great King, the events that change something a seat could hear of, counted as they
reach him (visible to him) and as they happen anywhere. Worth a letter: a province changing hands, a battle or siege, a
revolt, a treaty, a man's rising, fall, defection or death, a disaster, gold, grain or men sent in earnest. A change of the
map: a province changing hands, a realm falling or rising. People fleeing a hungry land are routine and left out (587 a
game in the first trial, drowning the rest). In every batch report, with the events by kind.

**Target** (a first guess, item 18): an event worth a letter in 60% of a Great King's seasons, and a change of the map he
hears of every 4 seasons or fewer.

## Before (50 games, seed 1, 50 seasons, a6fd2865)

| Great King | Seasons with a letter's worth | Seasons per map change |
|---|---|---|
| Egypt | 62.9% | 25.9 |
| Hatti | 80.5% | 11.5 |
| Babylonia | 66.9% | 16.1 |
| Mitanni | 72.5% | 13.6 |
| Assyria | 68.5% | 20.1 |
| Arzawa | 31.5% | 40.8 |
| Alashiya | 23.1% | 44.8 |

Anywhere: a letter's worth in 99.9% of seasons, a map change in 42.8%; 7.6% of the letter-worthy events reached no seat.
A game: 94 battles, 38 sieges, 10 sacks, but 7.6 conquests and 4.2 provinces obeying a new holder.

## Why games miss it

1. **A Great King's homeland is beyond force** under "whom a province obeys": one army of 5,000 counts 5 to 26 against a
   homeland's men, while the holder's love starts at 100 and the rival must clear it by the margin; force is capped at
   100. Only the Levant towns and the lands without kings can change hands (`turn/unrest.ts`, `forceOf`).
2. **The script kings still play as if standing in a province took it**: their look-ahead hands unwalled land to whoever
   stands there, attacks are valued at the province's whole worth, and nothing keeps an army in land it entered until it
   obeys; armies win battles and wander off.
3. **Arzawa and Alashiya** have nothing within reach that can be taken, and sit still.

## Fixes tried

On the same 12 games (seed 1, 50 seasons), changes of hands a game (conquest + obey):

| Candidate (the game's own numbers) | Changes of hands | Note |
|---|---|---|
| Unchanged | 12.9 | |
| Force 250 a man of the army per man of the land (was 100) | 11.9 | |
| Native love 60 (was 100), margin 10 (was 20) | 14.8 | |
| Both | 14.6 | Hatti's map changes every 7.2 seasons (was 12.1); the rest about the same |

The numbers alone barely move it. No number is changed by this item unless a measured fix needs it.

**Script kings that judge obedience and occupy** (a helper's build on `cand/occupy`, three versions; the switch
`OccupyPlay`, `--occupy-play-half`): an estimate, from the seat's view only, of the seasons until a province would obey
our army there; attacks on open land scaled by it, the look-ahead no longer counting land that would never obey as ours,
and an "occupy" choice holding an army in land until it obeys. With every king using it, changes of hands fell to 11.2 a
game and battles from about 94 to 75; game length unchanged. It wins use against ignore (9 wins of 12, 0.88 growth to
0.82), but not the pulse: a probe found armies rarely stand in open foreign land at all (a lone army will not enter land
whose people resist, and most foreign land is walled), so judging obedience mainly removed attacks that made battles.
Kept as the ground the fix below stands on (it pays in use against ignore), but it does not move the pulse by itself.

**The fix: script kings wage the war they choose** (the escalation helper, Opus at high effort, after the two approaches
above; `WarPlay` in `bots/siege-tactics.ts`, `--no-war-play`, `--war-play-half`). Logging each real seat's choice of war
over 4 games found the cause: the war target was a friend in 147 of about 220 seasons in which one cleared the bar, mostly
a plain peace partner (the score prices the peace in, -400 x honesty and -350 x trust, and still picks him). Then
`willing()` refused any friend before it looked at the war target, so no attack was made; the next season the target was
dropped as a friend and picked again. Armies sat at home: Egypt held 348 of its 369 unit-seasons, Arzawa never attacked.
Sieges were not the bottleneck: 16 begun and 11.75 won a game (the 38 above counted every siege event, "supplied by sea"
among them).

Now a king fights the war he chose, breaking a plain peace to do it; an ally who broke no oath, his overlord and a vassal
who pays (`keptBond`) are never the war. No number of the game's own is changed, so the "unplayable for testing"
exception is not needed: this is the script kings' play, which every item may improve. Design notes:
`07-script-kings/02-terms-used-below.md` and `05-choosing-a-war.md`.

## After (20 games, seed 1, 50 seasons; before = the same code with `--no-war-play`)

| | Before | After |
|---|---|---|
| Letter seasons (%) | Egypt 60.7, Hatti 77.7, Babylonia 59.2, Mitanni 63.7, Assyria 58.3, Arzawa 29.6, Alashiya 21.9 | Egypt 76.5, Hatti 83.8, Babylonia 91.1, Mitanni 84.4, Assyria 92.5, Arzawa 53.1, Alashiya 23.3 |
| Seasons per map change | Egypt 28.2, Hatti 14.8, Babylonia 19.7, Mitanni 20.1, Assyria 32.1, Arzawa 40.6, Alashiya 44.6 | Egypt 14.2, Hatti 7.2, Babylonia 5.7, Mitanni 8.5, Assyria 7.2, Arzawa 26.5, Alashiya 44.7 |
| Map change anywhere | 41% of seasons | 57.3% |
| Changes of hands a game (all / to a power) | 24.9 / 22.1 | 38.5 / 33.5 |
| Conquest / obey / sieges begun / won / battles, a game | 12.6 / 8.1 / 19.0 / 12.7 / 54.5 | 18.7 / 12.3 / 33.1 / 19.1 / 97.8 |
| A capital fallen in the first two seasons | none | none |

Six of seven Great Kings now reach the letter target; none reaches a map change every 4 seasons. **The pulse is still
short of 4, and the limit is now hearing, not war**: a king hears only what he can see, so counting more kinds as map
changes moved nothing, and only war near him moves his number. Arzawa (one army) and Alashiya (an island, aggression 0.1)
hear least. Wider hearing (news of distant conquests reaching kings, such as vassals reporting to their overlord) is a
rule, not this item's; filed as an idea (#618). A narrower rule (break a peace only with a weaker realm)
was tried and dropped: Assyria survived 8 of 20, but the pulse was mostly worse (Arzawa 34.9) and wins fell to 11 of 20.

**Use against ignore** (`--war-play-half`, 20 games): the kings who wage their war win 14 of 20; mean growth 0.76 against
0.82. Egypt, Babylonia and the city-states gain; Assyria (0.33 against 1.04), Hatti (1.27 against 1.48) and Arzawa (0.71
against 1.02) lose, their wars of choice costing them. So it pays in wins, not in mean growth.

**For item 18 (balance):** Assyria falls in 16 of 20 games (15 of 20 standing before, 4 after), and Babylonia takes Ashur
every time and wins 10 of 20; Mitanni stands at the end in 13 of 20 (20 before). The pulse targets (60%, 4 seasons) are
first guesses.

## Tests changed

- `letter-shapes`: four script kings instead of three (Egypt added), since a king at war may now write fewer than the six
  letters judged; on develop Babylonia wrote exactly six. The check judges more, not less.
- `file-seat` needed no change once develop was merged.
- `id-counter`: crowns' ids ("kg") were never registered among the id kinds (`IdKinds`); a crown now happens in its game,
  so the kind is registered and the test checks crowns too. A bug from item 17++, fixed here.
- `names-as-claims`: the name with "the" at the head of a sentence is now the Seha River Land's, as "the Kaska lands" is
  no longer a land's name.
- `starting-term`: the cast's fingerprints taken again at save version 54 for the land names in their texts.

## The four lands (#403)

The realms of Libya, the Kaska, the Shasu and the Suteans go by their lands' own names, Tjehenu, Kaska, Seir and Sutu, as
their provinces already did (#391): each anchored to its dossier line (`LandAnchors`), Sutu's added to the politics dossier
with its source (the Suteans' Akkadian name, Sutī'ū; eight Amarna letters, among them EA 195). README and the About page
follow. The solo benchmark at 5 seeds no longer finishes inside a background job's two hours, so the rename was
checked instead by 10 script games on the same seeds before and after: the summaries are identical but for run time.

## Readings taken

- **The pulse is fixed by the script kings' play, not by the game's numbers.** The item allows a number change under the
  "unplayable for testing" exception, but the measured cause was bots that chose wars and never fought them; "Script kings
  ... are to play as competently as possible" settles it, and balance stays frozen. No number is changed.
- **Breaking a plain peace for the war he chose is competent play.** A king already prices the peace into his choice
  (honesty, trust); refusing to act on a choice so weighed is the weakness. Bonds that carry more (an ally true to his oath,
  an overlord, a paying vassal) are never the war.
- **The item's cause "events that happen but never reach a seat" is measured, and its fix deferred to a design
  decision.** Few events reach no seat at all (7.6% of the letter-worthy); what a king misses is what others saw far from
  him. Under "Nothing is known at a distance" word travels only with someone carrying it, and how far a court's news
  should spread (vassals and allies reporting, rumour of the greatest events) is a rule with costs to hidden information,
  so it goes to the design session as #618 rather than being invented here. Script kings already tell their
  correspondents of troops and strength (`newsTroops`, `newsStrength` clauses); telling of conquests they saw is play
  the same idea could add, but it would not change what a seat's events show, so it is left to #618 with the rest.
- **The target is not reached, and the item says so** rather than inventing a rule to reach it: the rest needs news to
  travel beyond sight, a rule of its own (#618), under "No stopgaps".

## Helpers

- Three Sonnet/Opus helpers built and measured the occupation behaviour (`cand/occupy`).
- The escalation helper (Opus, high) found the cause above and built `WarPlay`; its first run was lost to a container
  restart and resumed from its probe data.

Questions for the owner: none. New idea: #618.
