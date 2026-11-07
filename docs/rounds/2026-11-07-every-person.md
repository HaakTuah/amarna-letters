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

## Part C1: the king apart from his court

Started from `develop` at b9099627. As built: [57](../design/57-every-person.md), "Part C1". Part C is built in two pull
requests, since it holds two things a reader looks up apart: (C1) the king apart from his court, commanding from where he
stands and dying where he stands; (C2) the court as a place that can be taken, its treasury and archive lost, fleeing
abroad, the heir an exile with a claim, and word of a death sent on to a court that fled.

### What was built

- The court is the capital (treasury, archive, officials, envoys and letters); the king may stand apart from it
  (`GameState.kingAt`) and commands from where he stands as his court knows it (`seatOf`): his orders to his land and
  armies, their reports, what he sees and his order checks read his seat; what is physically true there (the units he
  stands with, a city's gate, where he can be taken) reads where he really stands (`standsAt`).
- The order `court` with `alone` (`travel_alone` for a model king, "Go alone" on the Play page): the king sets out with
  his guard, without his court; named where his court is, he goes back to it.
- Where he stands, with his court or apart from it, a battle his side loses may kill or take him, or he gets away with
  his men; a city taken there may kill him, else takes him. The king and his court are lost apart: the court's city taken
  sends the court fleeing without a king who is elsewhere.
- Script kings go to the front alone when their largest army fights where the court's couriers come a season late, and
  go back when the fight ends or foes come near them (`bots/afield.ts`).
- The rulebook (COMMAND AT A DISTANCE, HOW YOU WIN, steps 7 and 10), the seat view (COURT), the Play page, the About page,
  the README and the design notes say so.
- A mismatch the new captures showed: the map drew a captive king held at a court as nobody's man, though the court's
  view names his realm; the map now reads the view's rule (`Views.captiveMaster`).

### First guesses (item 18 tunes them)

- The king alone: 5 shekels and 2 more for every ten days of road, a company of 60 (`KingAloneData`).
- A battle lost where he stands: dies 20 in a hundred, taken 30, else gets away; a city taken where he stands: dies 30 in
  a hundred, else taken (`KingAloneData`).
- A script king this cautious (0.75) or more never goes to the front (`StaysHome`).

### Readings taken

- **What reaches his court is sent on to him, and his orders for its business go to it** (the one-page: "nothing is
  known or delivered at a distance without someone carrying it"; "envoys and reports still reach the old seat and must
  be sent on"): built in this part after the design check's second round, which ruled the earlier reading (answered at
  the court at once) a mistake against the one-page, not a question. The notices of the court's business reach him a
  courier's time late; letters, envoys, people, captives and tolls on all his land, and moving the court, go to it with his
  couriers. Notices of other kinds (his own orders' outcomes, the realm's notices) are not sent on: most are already timed
  by the road from where they happen to him, a far report brought by its own courier included (the design check's third
  round). His view shows what came to the court as the notices do (the escalation step, on the design check's and Codex's
  third rounds): a tablet, its check and an envoy's report a courier's time after the season it came, and a person come
  to the court then too (`cameToCourt`), one of his own shown as on the road till then. A tablet or person come in the
  first part of a season shows a season after its notice, never before it. The treasury is not sent on: it is the
  ledger every order is checked against, and its reach is the court's (`isFar` and the order checks alike, Codex's third
  round), so a far province keeps its coffer, and gold may be sent to it, wherever the king stands.
- **Word of his capture or death travels** (the design check's first and second rounds): taken or killed away from his
  court, the court learns of it when word from where it happened comes, and believes him where he was till then
  (`kingHeard`) and sees nothing of it (the capture is his captor's event). Till then everything the seat sees or whose
  timing it reads goes on as from where it believes him (the design check's third round): its sight and reports, the
  timing of its notices and orders, its order checks, the sending-on of the court's business and its orders for it.
  Physically he stands nowhere: the units there no longer carry out standing orders for him, its gate is no longer held
  by him, and an order for his own journey goes nowhere.
- **Death where he stands applies with his court too** ("a king dies only by a cause where he is": battle, a fallen
  city): a king taken in his court's city may now die in its fall, as part B left for part C.
- **A court without its king is not stopped on the road** in this part (nor one whose king it believes elsewhere, taken
  unknown to it): a court taken on the road is part C2's.
- **Only the defender's side risks the king in a battle**: a battle is fought where the defender stands, and the king
  stands where he is, not with an army that marches out of his province.
- **Planning done by the builder**, not by the planning-design helper the rule file names, to spare the week's usage the
  orchestrator warned of; the design check reviews it.
- **His presence in a walled city keeps its gate** (`gateHolds`, the design check): the ruler "there" is the king where he
  stands, no longer his court without him.

### Script players and the measure

- **Regression** (`scripts/sim.sh --games 50 --seed 1 --verify-replay`, on the code after the escalation step): all 50
  games ran and replayed exactly. Wins: Egypt 19, Babylonia 18, Hatti 6, Assyria 4, and the rest one each or none (part
  B: Egypt 27, Babylonia 13, Hatti 2, Mitanni 1, Assyria 1). Kings taken 1,076 times, escaping 220 times, dying 570 times
  (part B: 13), most in the fall of their cities, the new first guess; kings went alone 736 times in 44 games, and got
  away from a battle lost 51 times. **Games stay playable**: the deaths fall mostly on the kings of one-city realms, which
  fall with their city as before; no Great King's realm fell for want of a king (Egypt, Hatti and Babylonia never fell,
  Alashiya once; Mitanni 19 times and Assyria 32, against 14 and 29 in part B), and every game ran to its end or an early
  winner as before. For item 18, which tunes the odds.
- **Use against ignore** (`--field-play-half`, 50 games, same seeds): script kings that go to the front won 29 to 21
  against those that stay at court, mean growth 0.76 to 0.73. Pays in wins and growth.
- **Every feature is every seat's**: script kings go alone to the front and back; a found weakness patched in this part:
  the script king looked for its own person among the court's foreign contacts and so never went (its king is listed
  among its own people), caught by the new unit test before any game was run on it.

### Questions for the owner

- [#806](https://github.com/HaakTuah/amarna-letters/issues/806): while a king is held captive, does his court keep giving
  orders in his name (still open; the sending-on for a king away and free is built here, as the one-page settles it).
- Idea [#813](https://github.com/HaakTuah/amarna-letters/issues/813): a king who stands with his army gives it an edge in
  battle.

## Part C2: the court taken, fled, in exile

Started from `develop` at ef4a4626 (C1 merged). As built: [57](../design/57-every-person.md), "Part C2". The live design
document could not be read from this account (the docs connector refused it); the copy on `develop` has not changed
since C1 began (`git diff b9099627..origin/develop -- docs/intent docs/builder-rules.md` is empty).

### What was built

- **A court taken loses its treasury** (`courtFlees`): where its city is taken, its treasury's gold goes to the taker (into
  his treasury, or a coffer of his there if it is far from his court), or to the people there if nobody holds it. The
  province's own stores stay with the province, and its archive goes by item 10's rule for a city taken.
- **A court taken on the road**: a court on the move is stopped as a king alone is (a city of its realm besieged, troops
  where its roads are closed, `RoadOdds.troops`), and taken: its treasury and archive go to whoever stopped it, and its
  king with it if he is with it. C1 left a court without its king never stopped.
- **Its flight is a real journey**: it flees by road (`GameState.kingRoads`) to the nearest city its realm still holds, at
  the court's pace, and rules from the road.
- **Word of a king's death is sent on** (`kingDeadWord`, `kingDeadHeard`, `Journey.toProvince`): it goes to his court as
  it stood when he died, and a court that has moved since has it sent on from there. Word that comes after his realm
  fell still finds his heir.
- **An heir in exile with a claim** (`exileHeir`): when word of the death of a fallen realm's last king reaches where it
  fell (or word of a king's death comes after his realm fell), the record's next heir (or a drawn one) lives on as a free
  man among its refugees, setting out from there to the court nearest it (a man of the record already elsewhere stays as he is, with no new
  fact: Codex's third round), with a public fact that he claims its throne, seeking service. His seat sees whose throne he claims
  (`CharacterView.heirOf`). Any king may make him king again by granting him land (order `crown`, item 17++).
- **Script kings restore an heir** (`bots/crowns.ts`): one in exile at a script king's court is crowned over the land of
  his fallen realm that king holds, by the same sum as any grant, the land kept reckoned as risky.
- **Counted in the batch report**: `court-treasury`, `court-taken-road`, `king-exile`, `crown-exile` (a grant to an heir
  in exile, counted apart from `crown-taken`).
- The rulebook (COMMAND AT A DISTANCE and step 10), the seat view, the About page, the README and the design notes say so.

### First guesses (item 18 tunes them)

- A court on the road is stopped at the odds a king alone is (`RoadOdds.troops`), and an heir in exile goes to the court
  nearest where his realm fell. No new numbers.

### Readings taken

- **The treasury goes with the court, the stores stay with the land** (the one-page: the court is "treasury, archive,
  officials"; a province's grain and coffers are the province's): a court taken gives up what it carries, not what the
  land holds.
- **A court stopped on the road is taken, as its city taken would be** (C1's reading, "a court taken on the road is part
  C2's"): the same odds as a king alone, since both are a guard on a road through hostile troops.
- **The heir in exile is a person, not a seat** ("A realm holds by its ledger": "abroad, and he is an exile with a
  claim"): he reigns over nothing and plays as any free character until a king grants him land, as Suppiluliuma put
  Shattiwaza on his father's throne of Mitanni (dossier 14, "Shattiwaza"). No new order: the grant (item 17++) is the lever.
- **A fallen realm's last king who lives is its claimant** (one rule for both): he is "former ruler" by part B's rule,
  and a seat that has heard of the fall sees whose throne he claims by the same `heirOf` as an heir in exile (not by a
  public fact, which would tell a far court of the fall at once: Codex's second round), so a king may make him king again by the same grant. Only a dead last king's
  heir is drawn from the record into exile.
- **A treasury nobody takes goes to the people there** (gold stays where it is; nothing vanishes): a court lost where no
  power holds the place spends its gold into that place's purse (`spendAt`).
- **Word, not knowledge** (the one-page: "nothing is known or delivered at a distance without someone carrying it"; the
  design check's first round): the taker hears of a treasury taken as word comes from where he took it (`tell`); a seat
  sees whose throne a person claims only once it has heard of the fall; an heir in exile is raised when word of the last
  king's death reaches where his realm fell, and walks from there.
- **His host is the court nearest where his realm fell** (refugees flee to the nearest court that will take them, as in
  item 17): not one chosen by a rule about which power it is.
- **The escalation step** (after Codex's three rounds): a realm given away while word of its king's death was on the
  road raises no heir in exile; a court stopped on the road says so ("stopped and taken on the road"), and shelters in
  its own besieged city where that is the nearest it holds; a restored heir is no longer shown as an exile; and the
  claim shows in the People tab and the models' audience lines, not to script kings alone.
- **A man of the record already elsewhere learns he is the heir by word** (the design escalation after #815 merged,
  follow-up PR): word goes from where the realm fell and finds him (following him on the road or to a court that moved),
  and his claim (a hidden fact, and his memory of the news) is his when it comes; a court sees him as a claimant once
  he has stood at it, and keeps it, so no court that merely knows him reads it at once (Codex's first round on the follow-up). An exile choosing his host by his own stakes is left for later (the design check's idea,
  not filed).
- **#806 left open**: nothing in C2 depends on whether a captive king's court gives orders in his name; parts B and C1's
  reading stands (it rules in his name once word of his capture comes).
- **Planning done by the builder**, as in C1, to spare the week's usage; the design check reviews it.

### Script players and the measure

- **Regression** (`scripts/sim.sh --games 50 --seed 1 --verify-replay`, at 50a7594d, after every review round): all 50
  games ran and replayed exactly. Wins: Egypt 21, Babylonia 17, Hatti 5, Assyria 4, the Suteans, Ashkelon and Akko one
  each (C1: Egypt 19, Babylonia 18, Hatti 6, Assyria 4). Kings taken 1,032 times (C1: 1,076), escaping 232, dying 593
  (C1: 570); kings went alone 657 times in 43 games. Courts lost their treasuries 1,181 times in 50 games, and courts
  were taken on the road 66 times in 30 games. Egypt, Hatti, Babylonia and Alashiya never fell; Mitanni fell in 10
  games and Assyria in 29 (C1: 19 and 32). **Games stay playable**, and every game ran to its end or an early winner.
- **Heirs in exile, and restorations**: an heir went into exile 124 times in 39 games (`king-exile`); before Codex's
  second round it was 0, since the deaths of a fallen realm's last kings never reached the succession. Script kings
  made a fallen realm's king or heir king again 26 times in 20 games (`crown-exile`), beside 48 other kingships taken.
- **Use against ignore** (`--grant-play-half`, 50 games, same seeds; grants now include restoring a fallen realm's king
  or heir, so this measures granting as a whole, not restoring a claimant apart; no flag sets restoration apart):
  script kings that grant won 28 to 22 against those that never grant, mean growth 0.79 to 0.75 (17++ C, before this
  part: 28 to 22, 0.94 to 0.86). Pays.
- **Every feature is every seat's**: script kings take a treasury where they take a court (the engine's), and restore
  claimants at their courts. A weakness found and patched: nothing counted a court's treasury lost or a restoration, so
  this part's features could not be seen in a batch report; four signals now count them.

### Questions for the owner

- [#806](https://github.com/HaakTuah/amarna-letters/issues/806) (still open; C2 does not depend on it).

## Part D: one scoreboard for every person

Started from `develop` at 779fc13 (C2 and its follow-up merged). As built: [57](../design/57-every-person.md), "Part D".
The live design document could not be read from this account; the copy on `develop` is read again by its diff before
the pull request.

### What was built

- **Every person on one board** (`TurnEngine.scoreboard`, `turn/scoreboard.ts`): every character, kings included, by
  what he holds blended with his performance (`sizeWeight` percent for size, as for the realms); the living by score,
  the dead below them all by what they held when they died, ties by id. It replaces the characters' ranking
  (`Wealth.ranking`, `Wealth.line`, removed) and the powers' table: the realms' final scores are their reigning kings'
  rows (`finalScores`), and `finalScores` and `decideWinners` moved beside it from `turn/resolve.ts`.
- **A king** holds his realm and is measured from his accession, his realm's strength over what he inherited
  (`GameState.startStrength`, set again at each accession; `Reign.strength`, its duplicate, removed: Codex's first
  round), by par for its start; save version 86; a king who dies held his realm as it stood (`kingDied` sets `diedWith`).
- **Anyone else** holds his purse and hoard, and is measured from what he brought into play (`characterResult`: gains
  above 1, losses below it) against characters' results in 50 script games (`CharacterPar`, every hundredth); a result
  tied with several recorded ones ranks at the middle of their run (`rankAmong`).
- **The winner is the first on the board**, a realm or a character by name (the design check's first round).
- **Shown** in the end event (the first ten), the web app's Standings (one table, once the age has ended), the batch
  (top three per game, how often a king and a character stood first). The kings' rulebook (HOW YOU WIN), the
  characters' goal (`strategyText`), the README ("Winning") and the design notes say so.

### First guesses (item 18 tunes them)

- Size weighs 5 in a hundred for every person, as for the realms (`sizeWeight`); characters' par is what characters
  gained in seeds 101-150, pooled for every calling.

### Readings taken

- **Size weighs 5, not half** (one fact, one place): the item's text says "half and half as a first guess", but the
  owner's measured answer of 29 October set size at 5 in a hundred, which the Victory tab still states; one weight
  (`sizeWeight`) serves both, and item 18 sets it. At half and half a character could score at most about a half and
  never win, against the section's "a character wins now and then". Since the two texts disagree, it is #825.
- **A character's start is what he brought into play** ("against par for his own start"): most characters start with
  nothing, so a ratio like a realm's growth has no meaning; his result is 1 for keeping what he brought, 1 more for every
  shekel gained, and below 1 in proportion to what he lost of it (the design check: a loss must count, as a realm's
  shrinking does), and par is characters' results in the script games, pooled (no calling's par apart until item 18
  asks for it).
- **A king's holding is his realm, not his purse** ("A king's holding is his realm"); a fallen realm's king or heir in
  exile holds his purse and hoard, as any character.
- **A realm whose king is dead and whose heir has not risen has no score**: its player is out, and nobody reigns to win.
- **The powers' par was not refreshed**: the same run's growth differs from the recorded par, since earlier parts
  changed who falls; refreshing it moves every benchmark and is item 18's to do with the weights.

### Script players and the measure

- **Characters' par** (`scripts/sim.sh --games 50 --seed 101 --par-out`, 39 minutes): of every character's result, the
  lowest sixth died, two thirds gained nothing, and the top fifth gained from 2 to 2,741 shekels (median of those
  gaining, about 70). The richest character held 876 shekels at the end on average (range 252-2,741).
- **No new lever**: part D changes what is counted, not what a player can do, so there is no use against ignore; script
  kings already play for their realm's growth and characters for their gold, which is what the board counts.
- **Regression** (`scripts/sim.sh --games 50 --seed 1 --verify-replay`, at 3221440): all 50 games ran and replayed
  exactly. Wins: Egypt 22, Babylonia 16, Hatti 6, Assyria 4, Ashkelon and Akko one each (C2: Egypt 21, Babylonia 17,
  Hatti 5, Assyria 4, three others one each). Kings taken 1,033 times, escaping 224, dying 598; heirs in exile 121
  times in 39 games (C2: 1,032, 232, 593 and 124). **First place on the board: a king in 49 of 50 games, a character in
  1** (seed 37, a game ended after 8 seasons: a free man of Ashur, 0.93, who
  gained 289 shekels; the scores are first guesses for item 18). The richest character held 761 shekels at the end on average (range 299-3,395). Games stay playable.

### Questions for the owner

- [#825](https://github.com/HaakTuah/amarna-letters/issues/825): the weight of size on the one scoreboard, 5 in a
  hundred as built or half and half as 17b's text says (new).
- [#806](https://github.com/HaakTuah/amarna-letters/issues/806) (still open; part D does not depend on it).
