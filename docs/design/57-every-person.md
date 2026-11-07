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
  ruler. Since part C the court is lost with its own city, the king with his (`courtFlees`, `kingTaken`).
- **He may get away**: each season he is held at a court, with a chance of his skill at going unseen in a thousand
  (`KingData.escape`; about one season in seventeen for a king of middling skill). Set free or escaped, he walks home like
  any traveller and reigns again at his court.
- **He dies only by a cause where he is**: put to death, in battle or a city's fall (part C), or on the road (outlaws); never of plague or famine, which are
  dice. His reign, and his player's game, end where he dies; his court hears of it by word from there (at once if he died
  at it) and his heir reigns from then (`heirReigns`), the court ruling in the dead king's name meanwhile. Other courts
  hear of the heir by word too, and each names the realm's king by the one it last heard of (`reignsHeard`, `kingFor`;
  a captive's view tells that he is a king only to a court that knows he reigns).
- **The heir** (`raiseHeir`) is the next name on his realm's line in the record (`Lines`, from dossier 16), skipping a man
  of the record already dead or held; one already on the map (Ay, Akit-Teshup, Yapahu) takes the throne himself if he
  stands at a court free to come (one held, detained or away on a mission is passed by), his service ended, and reigns
  from where he is, walking to his court. Past the record, a son (three in four) or brother is drawn, named in his land's style. His
  traits are what the record shows of him, each varied as every king's (`ReignData.vary`); the rest drawn up to 25 points
  either side of the middle (`HeirData`). He reigns from that season, by his own name (`Reign.name`, read by every name a
  power's king goes by) and with what the record shows of him (`Reign.about`, his card).
- **He inherits a third** of his father's standing: every entry of his realm in every ledger (the provinces' and the
  armies') is cut to a third, love and hate alike; debts and promises pass to him to honour or not.
- **His player is out** (`GameState.reignsEnded` keeps each reign ended, how and when): a human seat's heir is played by a
  script from then on, and the player watches as a fallen one does; a script or model seat plays on as the heir.

## Part C1: the king apart from his court (`turn/kings.ts`, `turn/kings-fate.ts`, `rules/court.ts`)

- **The court is the capital, and the king commands from where he is.** The court (`GameState.court`, `courtOf`) holds
  the treasury, the archive and the officials, and receives envoys and letters; the king may stand apart from it
  (`GameState.kingAt`), and his seat (`seatOf`, `TurnEngine.seatAt`) is where he stands as his court knows it, else his
  court. His orders to his land and armies go out from his seat by courier, their reports and what he sees as current
  come to it, and his order checks are drawn from it. What is physically true goes by where he really stands
  (`standsAt`): a unit he stands with carries out a standing order as one with its commander does, his presence holds a
  city's gate, the people's regard and what they hide from a share asked grow with his distance, and a battle or a city
  lost there takes him. The treasury's reach is the court's (`fromCourt`, `toCourt`, `isFar`, and the order checks of
  `send` and of costs paid where they fall), wherever he is.
- **What reaches his court is sent on to him** (`CourtKinds`, `GameState.courtLag`, set by `courtLags` each season): the
  notices of its business (audiences, envoys' and spies' reports, foreign news, people presenting themselves, tablets and
  their checks) reach him when a courier from his court could bring them (`courtLagOf`), and so do the tablets, their
  checks (`TabletCopy.authTurn`), the people come to it (`GameState.cameToCourt`, noted after each phase's arrivals) and
  his envoys' reports in his view (`broughtToKing`); a report from his land is timed to him by its own road
  (`tellAt`), never his court's on top. His orders for that business (letters, envoys,
  people, captives, tolls on all his land, moving the court) go to the court with his couriers (`sendOrders`), carried out
  there when they arrive.
- **His court learns of his capture or death by word** (`kingLostWord`, `kingLostHeard`, news `KingTaken`; `KingDead`):
  taken or killed apart from it, he stands nowhere (`standsAt` is the court, which rules in his name), but it believes
  him where he was (`GameState.kingHeard`, read by `kingAfield` and `seatOf`): its orders go out, its reports and the
  court's business come, its view and its order checks are drawn, as from there, its own king is shown as last known, and
  it sees nothing of it (the event is his captor's) until the word comes; a king back at his court, or his court come to
  where it believes him, first ends that.
- **He travels alone** (order `court` with `alone`, `travel_alone`): with his guard, for 5 shekels and 2 more for every
  ten days of road, as a company of 60, faster than his court (`KingAloneData`, first guesses), on the court's road rules
  (`GameState.kingRoads`, `alone`), stopped where a king besieges a city of his or has troops in land closed to him. Only
  a king free and reigning may go. Named where his court is, he goes back to it; a court sent where he stands joins him.
- **At the risk of his life.** Where he stands, with his court or apart from it: a battle his side loses there (his men
  beaten from it, or crushed holding it) kills him 20 times in a hundred and takes him 30, else he gets away with his
  beaten men where they fall back (`kingsInBattle`); a city taken there kills him 30 times in a hundred, else takes him
  (`kingTaken`). First guesses (`KingAloneData`), for item 18.
- **King and court are lost apart** (`kingsTaken`, `courtsLost`): the province where the king stands taken takes him; the
  province where his court stands taken loses it, and it flees to the nearest city the realm holds (`courtFlees`), without
  him if he is elsewhere.
- **Script kings go to the front** (`bots/afield.ts`): when their largest army fights where couriers from the court come a
  season late, a king not too cautious (caution under 75) goes alone to a walled city of his own with no foreign troops in
  or beside it, from where his word reaches that army within the season, and goes back when no such fight is left or foes
  come near him (`--no-field-play`, `--field-play-half`).
