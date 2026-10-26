### Temperament

There are ten weights, each from 0 to 1. Each power has a historical archetype:

| Weight | Egypt | Hatti | Babylonia | Mitanni | Assyria | Arzawa | Alashiya |
|---|---|---|---|---|---|---|---|
| Aggression | 0.40 | 0.85 | 0.35 | 0.30 | 0.75 | 0.50 | 0.10 |
| Caution | 0.60 | 0.35 | 0.70 | 0.80 | 0.40 | 0.55 | 0.90 |
| Honesty | 0.45 | 0.40 | 0.65 | 0.75 | 0.35 | 0.30 | 0.80 |
| Greed | 0.35 | 0.45 | 0.75 | 0.40 | 0.50 | 0.60 | 0.55 |
| Generosity | 0.80 | 0.30 | 0.35 | 0.70 | 0.40 | 0.35 | 0.55 |
| Pride | 0.90 | 0.80 | 1.00 | 0.60 | 0.85 | 0.50 | 0.40 |
| Diplomacy | 0.75 | 0.50 | 0.70 | 0.95 | 0.60 | 0.65 | 0.75 |
| Cunning | 0.50 | 0.60 | 0.45 | 0.40 | 0.65 | 0.80 | 0.35 |
| Vengeance | 0.50 | 0.70 | 0.60 | 0.40 | 0.65 | 0.50 | 0.30 |
| Commerce | 0.75 | 0.30 | 0.60 | 0.50 | 0.40 | 0.55 | 1.00 |

The archetypes are Egypt, "Pharaoh of the gilded gifts"; Hatti, "the conqueror of Anatolia"; Babylonia, "keeper of the old order"; Mitanni, "seeker of a patron"; Assyria, "the upstart who would be brother"; Arzawa, "the western opportunist"; and Alashiya, "the copper merchant".

Each game moves every weight by a uniform amount between −0.15 and +0.15, drawn from that power's seat seed, then clamps it to 0–1. So Babylonia's pride and Alashiya's commerce can only fall. The god view lists each king's temperament under Standings, naming the three traits furthest from 0.5. When a king pictures a rival in the look-ahead, it uses the rival's archetype without the nudge.

Most behaviour switches on at a threshold. This table gives the share of seeds in which each king crosses it (the lull row is approximate, since it multiplies two weights):

| Behaviour (rule) | Egy | Hat | Bab | Mit | Ass | Arz | Ala |
|---|---|---|---|---|---|---|---|
| Fights kings who have done it no wrong (aggression > 0.55) | 0% | 100% | 0% | 0% | 100% | 33% | 0% |
| ...even while another king leads (aggression > 0.8) | 0% | 67% | 0% | 0% | 33% | 0% | 0% |
| Will fight the leader (aggression > 0.25) | 100% | 100% | 83% | 67% | 100% | 100% | 0% |
| May betray a friend (honesty < 0.55) | 83% | 100% | 17% | 0% | 100% | 100% | 0% |
| Sends debased gold (honesty < 0.45) | 50% | 67% | 0% | 0% | 83% | 100% | 0% |
| Forges (cunning > 0.7 and honesty < 0.4) | 0% | 8% | 0% | 0% | 22% | 69% | 0% |
| Plants spies (cunning > 0.55) | 33% | 67% | 17% | 0% | 83% | 100% | 0% |
| Bribes envoys (cunning > 0.6) | 17% | 50% | 0% | 0% | 67% | 100% | 0% |
| Lulls its war target (cunning × (1 − honesty) > 0.3) | ~33% | ~77% | 0% | 0% | ~95% | 100% | 0% |
| Turns captives (cunning > 0.65) | 0% | 33% | 0% | 0% | 50% | 100% | 0% |
| Refuses the leader's tablets (caution < 0.6) | 50% | 100% | 17% | 0% | 100% | 67% | 0% |
| Keeps its capital garrison with 3+ troops (caution > 0.5) | 83% | 0% | 100% | 100% | 17% | 67% | 100% |
| Buys two cities a season (commerce > 0.45) | 100% | 0% | 100% | 67% | 33% | 83% | 100% |
| Writes three letters a season (diplomacy ≥ 0.75) | 50% | 0% | 33% | 100% | 0% | 17% | 50% |

