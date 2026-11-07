# Every person on one scoreboard (item 17b)

The item's text: `docs/intent/build-order/item-17.md` ("17b, every person on one scoreboard"); its sections: "One
scoreboard for every person" (Victory), "A realm holds by its ledger" (War), "Attested characters" (Characters) and
"Places by their own names" (World and history). Built in parts; the report: `docs/rounds/2026-11-07-every-person.md`.
The record of the kings who followed: `docs/history/16-the-kings-who-followed.md`.

## Part A: the kings as persons, by their own traits (`model/kings.ts`)

- **No realm keeps a temper of its own.** Each power's king has ten traits from 0 to 100 (`KingTraitValues`: appetite
  for war, caution, honesty, greed, generosity, pride, diplomacy, cunning, vengeance, commerce), kept in the game state
  as his reign (`GameState.reigns`: his traits as this game drew them, and the season he began to reign), so a realm
  changes when its king does.
- **The kings of 1346** (`Natures`) are set from what the sources show each man did, deeds over the tone of his letters,
  with the design's corrections: Akhenaten proud, ungenerous with gold, unwarlike and slow to answer; Suppiluliuma
  patient, a diplomat and cunning, aggressive when he strikes, keeping treaty forms but no forger; Burna-Buriash proud
  and counting every shekel, loyal to his treaty; Tushratta lavish, loyal and proud; Ashur-uballit ambitious, his
  honesty middling, since the sources do not show it; Arzawa's unknown king a first guess from his land's push east,
  with no forgery; Alashiya's king a trader who keeps his word, of middling pride. The city-states' rulers as their
  letters show them (item 11+'s weights, unchanged).
- **Each game varies them** by a whole number from −10 to +10 for each trait, from the game's seed (`drawTraits`,
  `ReignData.vary`, a first guess for item 18), as every attested character is varied.
- **A ruler risen in play** reigns as the character he was (`risenTraits`): his ambition his appetite for war, his fear
  his caution, his loyalty his honesty, his greed his greed, the rest middling. This replaces the risen power's `temper`.
- **His traits act through his play.** A script king plays by its king's traits as its view shows them
  (`SeatView.traits`, read every season, so a new king plays as himself), weighted as
  [07/03](07-script-kings/03-temperament.md) says; a model king is told his nature in words, the three traits furthest
  from the middle (`standout`: "By nature you are proud, stingy and peaceable."), with every request; the god view lists
  each king's under Standings.

## Part B: a king is a person, his fate his captor's, his heir from the record (`turn/kings-fate.ts`, `model/heirs.ts`)

- **Every king is a character** with the duty Ruling, his own power his employer, as a ruler risen in play already was:
  made at the start (`seatKings`) with the sources' name, or one in his land's style where they name none (the letters
  still call him by his title), his person's traits from his traits as a king (ambition from his appetite for war,
  courage from his want of caution, loyalty from his honesty, greed from his greed) and a competence of 60
  (`KingData.competence`), from which his skills are drawn. His reign (`GameState.reigns`) names him (`character`), and
  holds his realm's strength as he came to it (`strength`), from which part D scores him. He is nobody's servant: no
  order of his own court may name him (the validator). The pool's baseline counts the kings.
- **Taken, not fallen.** A king taken where he stands (the province changed hands) or stopped on the road is his taker's
  captive (`kingTaken`; a king walking home elsewhere is not taken with it), brought to the taker's court under guard as a captive handed over is, so troops of his own may
  free him on the road. He was no spy at a post: his captor may put him to death, ransom him (his realm pays), question,
  hand over or release him, never turn him. Script captors ask a king's ransom (300 shekels and 300 more by greed, a first
  guess) or, vengeful (above 0.7) against a foe, put him to death; a script king ransoms its own whatever it costs.
- **His court flees** to the nearest city his realm still holds, and rules in his name from there: the seat goes on
  giving orders. A realm that holds nothing has fallen (`fall`, as before), and its king lives on as a free man, a former
  ruler. Part C makes the court a place of its own, apart from the king.
- **He may get away**: each season he is held at a court, with a chance of his skill at going unseen in a thousand
  (`KingData.escape`; about one season in seventeen for a king of middling skill). Set free or escaped, he walks home like
  any traveller and reigns again at his court.
- **He dies only by a cause where he is**: put to death, or on the road (outlaws); never of plague or famine, which are
  dice. His reign, and his player's game, end where he dies; his court hears of it by word from there (at once if he died
  at it) and his heir reigns from then (`heirReigns`), the court ruling in the dead king's name meanwhile. Other courts
  hear of the heir by word too, and each names the realm's king by the one it last heard of (`reignsHeard`, `kingFor`;
  a captive's view tells that he is a king only to a court that knows he reigns). Death in battle and in a stormed city
  come with part C, when the king travels without his court.
- **The heir** (`raiseHeir`) is the next name on his realm's line in the record (`Lines`, from dossier 16), skipping a man
  of the record already dead or held; one already on the map (Ay, Akit-Teshup, Yapahu) takes the throne himself, his
  service and errands ended, and reigns from where he is, walking to his court. Past the record, a son (three in four) or brother is drawn, named in his land's style. His
  traits are what the record shows of him, each varied as every king's (`ReignData.vary`); the rest drawn up to 25 points
  either side of the middle (`HeirData`). He reigns from that season, by his own name (`Reign.name`, read by every name a
  power's king goes by) and with what the record shows of him (`Reign.about`, his card).
- **He inherits a third** of his father's standing: every entry of his realm in every ledger (the provinces' and the
  armies') is cut to a third, love and hate alike; debts and promises pass to him to honour or not.
- **His player is out** (`GameState.reignsEnded` keeps each reign ended, how and when): a human seat's heir is played by a
  script from then on, and the player watches as a fallen one does; a script or model seat plays on as the heir.
