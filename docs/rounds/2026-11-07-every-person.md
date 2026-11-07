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
- **Regression** (`scripts/sim.sh --games 50 --seed 1 --verify-replay`, on the code after the design check's first
  round): all 50 games ran and replayed exactly. Wins: Egypt 24, Babylonia 14, Assyria 4, Hatti 2, Kaska, Lukka and
  others one each (17++++a's check: Babylonia 16, Egypt 14, Hatti 8, Assyria 4). Suppiluliuma, patient now where the
  archetype was impatient, wins less but grows most (mean growth 1.47); Akhenaten, unwarlike, wins by holding. For
  item 18, which tunes the chances.
- **Each nature's sources:** the Great Kings' natures name the dossier lines their deeds rest on and a grade (B from
  deeds; Ashur-uballit C, his honesty unknown; Arzawa's G, a first guess), checked by the history-anchor test; the
  Kurustama treaty Suppiluliuma broke is a new graded line in the politics dossier (`01-kurustama`).

## Part B: a king is a person, his fate his captor's, his heir from the record

Started from `develop` at ec6ee602. As built: [57](../design/57-every-person.md), "Part B".

### What was built

- Every king is a character with the duty Ruling, his own power his employer, as a ruler risen in play already was
  (`turn/kings-fate.ts`); his reign names him and the strength of his realm as he came to it, for part D's scores.
- A king taken where he stands, or on the road, is his taker's captive, brought to the taker's court under guard; his
  captor decides his fate by the orders for any captive (never turning him), and each season he is held he may get away
  by his skill at going unseen. His court flees to the nearest city his realm still holds and rules in his name. Only a
  realm that holds nothing falls; the old rule's land coming apart, the chain of falls and the governor rising with a fall
  are gone (`fallsSpread` keeps only the armies hearing the word).
- A king dies only by a cause where he is: put to death, or on the road. His heir is the next name on his realm's line
  in the record (`model/heirs.ts`, from dossier 16), a man of it already on the map (Ay, Akit-Teshup, Yapahu) taking the
  throne himself; past the record, a son or brother drawn, named in his land's style. The heir reigns by his own name
  from that season, inheriting a third of his father's standing in every ledger.
- A human whose king dies is out: the heir's seat is played by a script, and the player watches as a fallen one does.
- The rulebook (HOW YOU WIN, step 10 of the season, EVIDENCE AND INTELLIGENCE), the About page, the Play page's help,
  the README and the design notes say so.

### First guesses (item 18 tunes them)

- A king's competence as a person 60 (`KingData.competence`), from which his skills are drawn; the chance he gets away
  each season he is held, a thousandth for each point of his skill at going unseen (`KingData.escape`).
- An heir's traits the record does not show, up to 25 points either side of the middle; a drawn heir a son three times
  in four (`HeirData`).
- The heir's inheritance a third, as the design's first guess.
- The script captor's king's ransom 300 shekels and 300 more by greed; it puts a foe's king to death when its vengeance
  is above 0.7 (`KingRansom`).

### Readings taken

- **His court rules in his name while he is held** (pillar: every seat replaceable; "A realm holds by its ledger"): a
  held king's seat goes on giving orders from the city his court fled to, as officials ruled for a king abroad, rather
  than a seat frozen for seasons. Part C makes the court a place of its own, apart from the king.
- **Plague and famine never kill a king** ("never by dice"): they are rolls, not a cause where he is; the road's outlaws
  are.
- **His player is out where he dies; his realm learns of it by word** (the design check's first round): the court rules
  in the dead king's name until the word comes, then the heir reigns; each court names the realm's king by the one it
  last heard of. A character names a king as his lord's court knows him (the design check's second round).
- **The heir's seat keeps the court's notes** (pillar: every seat replaceable): a model seat's notes and ledger are its
  court's records, which pass to the heir with the archive; his own nature comes with his traits in every request.
- **Word of a king's death goes to his court where it stood when he died**: if the court flees while the word is on
  the road, it arrives as if it had not moved; part C, which makes the court a place of its own, sends such words on.
- **Death in battle and in a stormed city wait for part C**, when the king travels without his court and can stand in a
  battle; in part B a king's city taken takes him alive.
- **The record's heirs by one name each** ("Ramesses the Second" where a name repeats), and the line linear: the record's
  rival claimants (Shuttarna III, Shapili) are not heirs, since part C brings claims and exiles.
- **A man of the record already on the map takes the throne** if he stands at a court free to come, his service ended,
  walking to his own court; one dead, held, detained or away on a mission is passed by for the next name, so nothing he
  carries and no captor's hold is lost (Codex's second round).
- **A king is told nothing of his own escape odds in numbers he could repeat**: the rulebook says "about one season in
  twenty for a king of middling skill".
- **The kings' persons keep the template's persona** while they reign: no narrator call is made for them at setup, since
  they speak through their seats.
- **The seat's script captors value a king's city as before** (half the rest of his land), since taking it takes the king.

### Script players and the measure

- **Regression** (`scripts/sim.sh --games 50 --seed 1 --verify-replay`): all 50 games ran and replayed exactly. Wins:
  Egypt 27, Babylonia 13, Hatti 2, Mitanni 1, Assyria 1 and the rest one each or none (part A: Egypt 24, Babylonia 14,
  Assyria 4, Hatti 2). Kings taken 1,161 times in 50 games (each game), escaping 98 times in 36 games, dying 13 times in
  13 (put to death or on the road); 1,016 realms fell holding nothing, almost all city-states of one city, and Assyria in
  29 of 50, Mitanni in 14 (for item 18, which tunes the pace of war).
- **Use against ignore** (`--king-play-half`, 50 games, same seeds): scripts that ask a king's ransom or put a foe's
  king to death and ransom their own won 29 to 21 against those that let captive kings go and never ransom their own,
  mean growth even (0.76 to 0.77). Pays in wins.
- **Every feature is every seat's**: script captors ransom or put to death every king they take, script kings ransom
  their own; kings escape by their skill alone, which no seat chooses.

### Questions for the owner

- [#806](https://github.com/HaakTuah/amarna-letters/issues/806): while a king is held captive, should his court keep giving orders in his name (the reading taken), or should his realm be limited until he is back?
