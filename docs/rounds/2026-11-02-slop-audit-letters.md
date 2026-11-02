# The slop audit, part 1: the script kings' letters and their words in audience

Branch `lane/slop-audit-letters`, from `develop`. The lane: "The slop audit" under "Follow-ups" in
`docs/BUILD-PROGRESS.md` (the owner, 2 November 2026; archive item 178). The voice it is held to: "Voice of the age:
letters, customs and vocabulary" (`docs/intent/world-and-history/voice-of-the-age-letters-customs-and-vocabulary.md`).

## What changed

- **The words moved to their own file**, `src/game/src/bots/voices.ts` (split by meaning: a king's voice is looked up on
  its own; `statecraft-letters.ts` shrinks from about 45 KB to about 40 KB). Each letter and each line a host says in
  audience comes in two to four forms; each Great King has four closing lines of his own, and his own form of the gift and
  the grievance; a city's ruler closes plainly or not at all, and begs in a servant's register ("like a bird in a trap",
  `09-ea-74`; the Habiru, as the voice file teaches).
- **No random draw.** A form is chosen by a hash of the two kings and the kind of words, moved on by one each season
  (`pick`), so a king writing the same letter to the same court goes through every form in turn, and seeds replay exactly.
- **What script kings read stays the same.** They read these words back: an envoy's report and a host's record of an
  audience are weighed by warm and cold words (`sentiment` in `brain.ts`: "brother", "love", "friend", "gift", "withdraw",
  "not forgotten", "will not seal" and the rest, as substrings); a timid envoy softens sentences it reads as threats to
  the host (`TextKit.isThreatTo`); a plea is found by a sentence naming the siege, the besieger and the city
  (`pleasIn`); "my weighers found only X." is parsed (`Weighed`). Every new form was checked against the line it
  replaces with a script: the same warm and cold words, the same threats, the plea's sentence kept. The sealed tablets'
  texts, the mandates (requests a model reads), the two bribe asks and Finkel's parody are unchanged.
- **The guard**, `src/game/test/letter-shapes.test.ts`: three script kings play ten seasons of the small world, and no
  sentence's shape (names and numbers blanked) may be in more than half of one king's letters, or of his words in
  audience. It failed on the old text (Babylonia's closing line in 83% of its letters) and passes on the new.

## The review (fresh eyes, Opus at high effort; given only the text and the brief)

| Round | Score | What kept it from 10 |
| --- | --- | --- |
| 1 | 5 | One closing line on every letter and audience; every king's body alike; "stand together" and "troops" everywhere; "support" (the order's name) in prose; a modern proverb twice; memory threats in one mould; lines too long |
| 2 | 7 (twice) | Bodies still shared; two forms alternating; "friend" closings alike; modern idiom ("yours are next", "I want"); time clauses a script cannot keep ("not this year") |
| 3 | 9 and 8 | Single lines: "Karduniash" for Babylon (the voice file keeps the known names); Mitanni claiming a past the engine does not know; slogans ("together we can") |
| Escalation 1 | 8 | Line polish: Arzawa's and Hatti's "a friend in me", the gift letters' shared opening, the grievances' shared ending, "with all my love" |
| Escalation 2 | 9 (twice) | The kings' own gifts still opening and grievances still ending alike; Hatti's closings near-twins; "face every enemy as one" |
| Escalation 3 | **10**, and 9 | Reported twice: a 10 (Hatti's grievance keeps the old ending, read as his own curt manner), and a 9 for two of Egypt's lines (a stitched grievance, "my house" twice), both then fixed |

Everything each round listed was fixed, and the escalation helper, judging the fixes against its own lists, passed the
kind at 10. The owner's read of the ten lines below is the final word, and calibrates the reviewer.

## Ten lines, before and after

| Before | After |
| --- | --- |
| Egypt, on every letter: "In my land gold is as plentiful as dust, and my friends do not go without." | Egypt, one of four: "In Egypt gold is as dust, and my friends know it." / "The house of Egypt's friend never lacks for gold." |
| Assyria, on every letter: "I am a Great King, as you are, and I will be treated as one." | "My fathers did not write to yours as servants, and neither do I." / "Ashur set me on my father's throne." |
| Every king's grievance: "Your troops have entered my land. Is this brotherhood? Withdraw them, and send me a fitting gift, or I will not forget it." | Babylonia: "Your soldiers stand in my land as if Babylon had no king. Withdraw them, brother, and send a gift worthy of my house." |
| Every king's gift: "I have heard that all is well with you, and I rejoice. Here is a gift for my brother; send me your messenger quickly." | Babylonia: "I rejoice that my brother is well. I send a gift: weigh it, and send me one as heavy." |
| A city-state's plea, like a Great King's: "My brother, the troops of {Foe} besiege my city of {City}. Come to my aid: send your troops to drive them out." | "{City} is like a bird in a trap, for {Foe} besieges it. Send soldiers to your servant." |
| "{Top} has sent his troops into my land, and what he takes from me today he will take from you tomorrow. Let us stand together and hold him back: where your troops face {Top}, mine will support them." | "The army of {Top} is in my land, taking my towns. A king who takes from one house will not stop at its door. Swear with me against {Top}." |
| "We have sworn to stand together against {Foe}. When your troops go from {From} into {To}, mine will support them." | "When your chariots go up from {From} into {To}, my soldiers will go up with them against {Foe}." |
| "The gold your messenger brought me weighed {N} shekels less than the inventory you sealed. Either you are mean, or your messenger lied to you and to me." | "The gold your messenger brought me was {N} shekels light of the inventory you sealed. Did your hand hold it back, or his?" |
| Audience, every neutral close: "Tell your lord that I have heard his words." | Nothing: the audience ends on the king's own closing line. |
| "I will not seal a tablet that speaks of land, gold or tribute, or names a province of mine." | "I will not seal a tablet that bargains with my land, my gold or my tribute." |

## Behaviour unchanged

Script kings' behaviour is unchanged: the same three games (`--games 3 --seed 1 --max-turns 16`) on `develop` and on this
branch print the same tables (see the PR). No save version: no rule, request or parsed word changed.

## Readings taken

- **Keywords over taste.** Where the reviewer's fix would drop a word script kings weigh (a city's ruler saying
  "brother", the warm word in a closing line), the word stays and the sentence around it changes, so seeds replay.
- **The sealed tablets keep their oath** ("By Shamash, Amun, Marduk and Teshub"): it is the rulebook's oath formula
  (`src/llm/src/rules.ts`), and treaty formulae repeat by nature.
- **A city's ruler still says "brother"** in some letters, for the same reason; routing all its letters to a servant's
  register is left for the requests' and the bots' own pass.

## Helpers

- The fresh-eyes reviewer (Opus, high): three rounds, one agent resumed each round; rounds 2 and 3 each reported twice
  (both lists applied).
- The escalation helper (Opus, high): three reads after the third round, the last a 10.

## Questions for the owner

None.
