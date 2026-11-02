# Item 17++, part D: who carries a province's offer

The owner's words (2 November 2026, in the design chat, archive items 157 and 158), on #431: "Yes, expertly, if you think
it is best."; then "Is the messenger a character it hires then?", "But characters don't live anywhere, so it has to be a
character who is paid or for some reason takes the mission for free on his own accord?", and, to the design session's
take: "Agreed, expertly. Though this is also information he can pass on or sell. I guess even just a rumor can spread?
Maybe the town must be really into someone and have the means, if they commission a message and courier? And this is
valuable information for the king of the land, or his enemies." Written into "Whom a province obeys" under War
(revision 95). Built here, from `develop` after part C, as the orchestrator decided. Design note 51. Save version 45.

## Built

1. **The offer is a letter** (`turn/offers.ts`, journey kind `Offer`): a province declaring for an absent power sends its
   offer as a letter waiting in the province; the declaration is unknown to him (`OfferUnheard`) until it arrives, so he
   cannot see or answer it before then. This replaces part C's offer told at the roads' pace whether or not anyone
   carried it.
2. **Its carriers**: his own spy's report from there takes it with it; a traveller going from there to his court who is
   in his service or owes his grant to him carries it for nothing; and only a people far gone in his favour (his weight
   past its holder's by `OfferData.farGone`) pays a traveller going that way, or a free person at the court there, from
   its own purse (`Market.purse`), at the letters' fees.
3. **On the road**: the carrier shares the letter's fate (robbed or killed, it is lost); one who sells secrets sells word
   of it to the land's king.
4. **Fades**: when the declaration ends, an offer still waiting is dropped.
5. **Talk**: talk of the leaning reaches the power, its holder and the kings holding land beside it, at the roads' pace
   from the province; it cannot be answered.
6. **Script kings** treat a province of theirs that talk says leans away as restless and ease it (`bots/talk.ts`,
   `freedom.ts`); `--talk-play-half`. They answer an offer, as in part C, from the season it arrives.
7. Rulebook (`rules-freedom.ts`), design notes 49 and 51. Tests: `offers.test.ts`.

## Readings taken

1. **The offer rides the letter machinery** (`letters.ts`, item 11b): "a character who is paid or for some reason takes
   the mission for free on his own accord", as a spy's report is carried. Principle: "Messengers are errands"; "One fact,
   one place".
2. **"Far gone"**: the power's weight in the province past its holder's by 40 (first guess, item 18), well past the
   margin that makes it declare at all. Principle: first guesses during the build.
3. **"A character whose stakes it serves"**: a man in the power's service, or one his grant made what he is. A stranger's
   stakes in a far province's offer are not modelled; he carries it only for pay. Principle: "Stakes, not dispositions".
4. **"The claimant's own envoy or spy there"**: his spy watching the province sends it with his reports; his envoy at a
   court in that province carries it home as a man of his going that way. Principle: "Every feature is every seat's".
5. **"The king of the land, or his enemies"**: talk reaches the land's king and the kings holding land beside it (there
   is no state of war to name enemies by); a carrier sells it to the land's king, who would pay most to know. Principle:
   "Information moves in physical time"; "No menus".
6. **A cession by treaty** stays a king's word told as before: a treaty is sealed between kings, not offered by a people.
7. **"One who takes it up from afar must still go, or send a man, to hold it"**: already so; a province taken up obeys
   only while its people's weight clears (part C). Nothing new built.

## Benchmarks and use against ignore

Running: `--talk-play-half` (50 games, seed 1), with the offers' signals (sent, carried by whom, sold, arrived).

## The review

Codex (`@codex review`) and the design check (Fable, medium), started together.

Questions for the owner: none.
