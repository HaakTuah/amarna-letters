### Temperament

No realm keeps a temper of its own (item 17b): a script king plays the man on its throne, by ten weights from 0 to 1,
his traits from 0 to 100 as the engine keeps them (`model/kings.ts`: `Natures`, the rulers of 1346 as the sources show
them, and `risenTraits`, a ruler risen in play from his own traits as a character). Each game moves every trait by a
whole number between −10 and +10, drawn from the game's seed (`drawTraits`), clamped to 0–100, as for every attested
character; the seat reads its own king's from its view (`SeatView.traits`), each season, so a new king plays as
himself. The god view lists each king under Standings, naming the three traits furthest from the middle. When a king
pictures a rival in the look-ahead, it uses that rival's ruler of 1346 as the sources show him, unvaried (`archetype`),
and a ruler risen in play as a middling one.

Most behaviour switches on at a threshold. This table gives the share of games in which each king of 1346 crosses it
(the forgery and lull rows weigh two traits together):

| Behaviour (rule) | Egy | Hat | Bab | Mit | Ass | Arz | Ala |
|---|---|---|---|---|---|---|---|
| Fights kings who have done it no wrong (aggression > 0.55) | 0% | 100% | 0% | 0% | 100% | 71% | 0% |
| ...even while another king leads (aggression > 0.8) | 0% | 0% | 0% | 0% | 0% | 0% | 0% |
| Will fight the leader (aggression > 0.25) | 24% | 100% | 71% | 100% | 100% | 100% | 0% |
| May betray a friend (honesty < 0.55) | 71% | 71% | 0% | 0% | 71% | 71% | 0% |
| Sends debased gold (honesty < 0.45) | 24% | 24% | 0% | 0% | 24% | 24% | 0% |
| Forges (cunning > 0.7 and honesty < 0.4) | 0% | 0% | 0% | 0% | 0% | 0% | 0% |
| Plants spies (cunning > 0.55) | 0% | 100% | 0% | 0% | 71% | 0% | 0% |
| Bribes envoys (cunning > 0.6) | 0% | 100% | 0% | 0% | 48% | 0% | 0% |
| Lulls its war target (cunning × (1 − honesty) > 0.3) | 0% | 98% | 0% | 0% | 48% | 5% | 0% |
| Turns captives (cunning > 0.65) | 0% | 100% | 0% | 0% | 24% | 0% | 0% |
| Refuses the leader's tablets (caution < 0.6) | 48% | 48% | 24% | 100% | 100% | 95% | 0% |
| Keeps its capital garrison with 3+ troops (caution > 0.5) | 95% | 95% | 100% | 24% | 24% | 48% | 100% |
| Buys two cities a season (commerce > 0.45) | 100% | 0% | 100% | 71% | 48% | 71% | 100% |
| Writes three letters a season (diplomacy ≥ 0.75) | 0% | 76% | 29% | 76% | 29% | 0% | 52% |
