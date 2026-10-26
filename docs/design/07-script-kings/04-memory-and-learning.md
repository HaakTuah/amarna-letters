### Memory and learning

Each season, before deciding:

- Grudges fade by a factor of 1 − 0.12 × (1 − vengeance). At vengeance 0.5 a king keeps 94% a season; at vengeance 1 a grudge never fades.
- Trust drifts 5% of the way back to 0. It is clamped to −1..1 once a season, at the end of learning.
- Treaties are read again from the tablets the king holds. Any tablet sealed by it and at least one other king counts, unless an examination found it forged. Every co-sealer is a **treaty partner**. An alliance oath makes a **full ally**. A text that says "against X", where X is not a sealer, makes a **coalition** against X. X may go by any of his names, ignoring case: the game's (Hatti), the land's (Karduniash), the king's (Suppiluliuma), his people's (the Hittites), and Babylon, Pharaoh or the Cypriots; with or without "the", or as "the king (land, house, people, armies, troops) of X". Other phrasing ("strike X together", "X is the foe of both") is not read. Treaties never lapse.

**Wrongs.** A wrong adds a grudge, scaled by (0.6 + vengeance), and lowers trust. Some wrongs also mark an attack. If an attack comes from a treaty partner, it is also a broken oath: one more broken oath on record, trust −0.5 more, and grudge +2 more (not scaled). A province taken by a partner counts as two broken oaths, because it is both a move into our land and land taken.

| What reached the court | Grudge, before scaling | Trust | Marks an attack |
|---|---|---|---|
| He took one of our provinces | 2 + yield ÷ 20 | −0.4 | yes |
| He ordered a move into our land (seen, whether it worked or not), unless it struck a third king's troop standing in it (since the script players' audit of the siege package: a besieger within our walls, or a guest; driving it out is a relief, no wrong, though taking the land still counts as land taken) | 1 | −0.25 | yes |
| He supported a move (his own or another king's, successful or not) into land we held, unless it struck a third king's troop standing in it | +0.5, not scaled | 0 | no |
| His gold assayed below 100%, or was found missing when the treasury paid (only the first sender named counts) | 1.5 | −0.3 | no |
| Our envoy is overdue from his court | 1 | −0.3 | no |
| A caught spy confesses to serving him | 1 | −0.3 | no |
| A forgery is publicly traced to him | 0 | −0.4 | no |

**Favours.**

- A successful support for one of our troops: trust +0.15, and the support is remembered.
- Gold that assays at 100%: trust +0.05.
- Our own envoy's report from his court: trust + 0.08 × tone. If it says the host offered it a post and it refused ("The king of Karduniash offered me a post in his service, and I refused it"), the host tried to buy our servant: trust in him − 0.05, and the envoy is proven true, so among servants equally reliable it is chosen first for the letters that carry tablets, gold or pleas, and kept on first when servants give notice (since the script players' audit of the siege package, the fix pass's minor finding 2).
- Audiences the king hosts change trust by gifts, slights and seals (see Audiences).

**Tone** is a crude word count. Each of nine warm words (brother, love, friend, peace, sealed, gift, rejoice, gracious, kindly) counts +0.5. Each of ten cold phrases (not forgotten, regret, withdraw, war, punish, liar, false, broke, detain, will not seal) counts −1. The total is clamped to ±2 and halved, so tone runs from −1 to +1.

**Troops out of sight.**

- The king remembers where it last saw each foreign troop, starting from the public opening positions.
- A sighting is dropped once it is more than three seasons old, or when the province comes into sight.
- Remembered troops are placed at the newest sightings, up to the number each king is thought to have beyond those in sight. A fallen king's troops are forgotten.
- It keeps the largest number of troops it has seen each king hold. After three seasons of seeing fewer, it lowers that count by one, so it forgets a troop a year. A spy's report can raise the count. A king with no land and no troops in sight is counted as having none.

**Belligerence.** Each conquest by another king, anywhere on the public map, adds 1 for free land and 1.5 for a king's land. It fades to 70% each season. Purchases do not count: a free city bought keeps its walls, one taken loses a level. Since the review of the siege package a court sees the walls standing only where it sees troops, so a free city that changed hands out of sight, which may have been bought or taken, counts half as each: 0.5 belligerence, and half its price off the buyer's estimated treasury.

**Rivals' treasuries** are estimated from what is public. Each one starts at that king's starting gold. Then, each season, it adds the yield of his land and subtracts:

- 30 for each troop he is thought to have (fleets are charged as armies);
- 25 for a servant's wages;
- 100 for each troop above the most he has ever been seen to hold;
- 10 × yield for each free walled city he buys.

An estimate never goes below 0, and a fallen king's is 0.

