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
