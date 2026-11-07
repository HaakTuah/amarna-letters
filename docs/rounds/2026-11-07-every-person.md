# Item 17b: every person on one scoreboard

Weekly usage: unknown (`scripts/usage.sh` cannot read it in this session).

The item's text: `docs/intent/build-order/item-17.md` ("17b, every person on one scoreboard"); its sections: "One
scoreboard for every person" (Victory), "A realm holds by its ledger" (War), "Attested characters" (Characters) and
"Places by their own names" (World and history). As built: [`docs/design/57-every-person.md`](../design/57-every-person.md).
Started from `develop` at 639bb977.

**The check for changes:** the live design document refused this account (the docs connector answered "forbidden"), so
the item is built from the copy cut on 3 November (Build order 354), and the copy on `develop` is read again by its diff
before each part's pull request.

**Built in parts,** each its own pull request, since the item holds four things a reader looks up apart: (A) the kings as
persons, by their own traits; (B) a king who dies only by a cause, his captor's choice, and the heir from the record;
(C) a realm that holds by its ledger, its capital wherever its court is; (D) one scoreboard for every person. Before
part A, `state.ts` (at the 50 KB mark) was split by meaning (#800, the unit to `model/units.ts`), as Step 0 asks.

## Part A: the kings as persons (#802)

### What was built

- Each king's ten traits (0 to 100), kept as his reign in the game state (`GameState.reigns`, `model/kings.ts`), drawn
  at the start from the sources' picture of the man (`Natures`) and varied up to ten points either way by the game's
  seed. A ruler risen in play reigns by his traits as a character (`risenTraits`; `RisenPower.temper` removed).
- The script kings' historical archetypes leave the bots: a script seat plays by its king's traits as its view shows
  them (`SeatView.traits`), read each season, so a new king (part B) plays as himself; a council advisor tilts them as
  before; a rival is pictured as the sources show its ruler of 1346, unvaried.
- A model king is told his nature in his requests, the three traits furthest from the middle in words.
- The god view's Standings, the About page and the README name each king and what the sources show of him.
- A new dossier, `docs/history/16-the-kings-who-followed.md`: the record of the kings who followed each ruler of 1346,
  graded, with what deeds show of each, for part B's heirs. It was written as a new section of the courts dossier and
  moved to a file of its own, since that one would have passed 50 KB.

### First guesses (item 18 tunes them)

- Each game moves every trait by a whole number from −10 to +10 (`ReignData.vary`), as the design's first guess for
  attested characters ("about 10 points either way"); the archetypes moved by up to 15 hundredths before.
- The Great Kings' traits (`Natures`), set from the item's corrections; the city-states' unchanged from item 11+.

### Readings taken

- **Traits from deeds, the corrections as the item lists them** ("Attested characters"; pillar: period first). Akhenaten:
  aggression 20, generosity 25 (gilded wood for the promised gold, EA 27 and 29, the design's evidence of an ungenerous
  king), pride 90, diplomacy 40 (slow to answer, keeping envoys); honesty 50, middling, since no source shows him
  betraying a friend (the design check's point: 40 counted the gilded wood twice). Suppiluliuma: patient
  (caution 60), diplomacy and cunning 80, aggression 70; honesty 50, so he breaks a treaty when it pays but never
  forges (a forger needs honesty under 40), since no source shows him forging. Tushratta: lavish (generosity 90),
  loyal (honesty 75), proud (85). Ashur-uballit: honesty 50, since the sources do not show it. Arzawa: no forgery
  (cunning 45), aggression 60 from his land's push east. Alashiya: pride 50 ("middling").
- **The script king reads its own king from its view, not from the game's seed** (pillar 7, every seat replaceable): a
  seat never holds the game's seed, so the traits the engine drew reach it as any seat's facts do. A rival is pictured
  as the sources show the man, since no court knows how this game drew him.
- **A model king is told three traits in words, never numbers** ("Requests are rules too"): "By nature you are proud,
  stingy and peaceable." His stakes still decide ("Stakes, not dispositions"); part D tells him what he plays for.
- **A human king is not told his nature**: the human plays himself.

### Script players and the measure

- Tests that leaned on the old archetypes were moved to what the new kings do: the letters' slop guard takes five kings
  since Akhenaten writes little; the envoy test puts a giving king on Egypt's throne; the standing-order search starts
  at seed 5. Use against ignore does not apply: traits are who a king is, not a feature to use or leave.
- **Regression** (`scripts/sim.sh --games 50 --seed 1 --verify-replay`, on the first cut, Akhenaten's honesty 40): all 50 games ran and replayed exactly. Wins:
  Babylonia 19, Egypt 18, Hatti 3, Assyria 3, Kaska, Lukka, Mitanni and Azzi one each (17++++a's check: Babylonia 16,
  Egypt 14, Hatti 8, Assyria 4). Suppiluliuma, patient now where the archetype was impatient, wins less but grows most
  (mean growth 1.48); Akhenaten, unwarlike, still wins by holding. For item 18, which tunes the chances.
- **Each nature's sources:** the Great Kings' natures name the dossier lines their deeds rest on and a grade (B from
  deeds; Ashur-uballit C, his honesty unknown; Arzawa's G, a first guess), checked by the history-anchor test; the
  Kurustama treaty Suppiluliuma broke is a new graded line in the politics dossier (`01-kurustama`).
