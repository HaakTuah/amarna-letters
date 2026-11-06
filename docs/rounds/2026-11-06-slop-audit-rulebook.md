# The slop audit, part 4: the rulebook

Branch `lane/slop-rulebook`, from `develop` (#730). This lane is "The slop audit" under "Follow-ups" in
`docs/BUILD-PROGRESS.md` (archive item 178). It covers the next kind of text in its order, the rulebook a king reads
every game (`leaderRules`, `src/llm/src/rules.ts` and `rules-*.ts`). The seat view follows in a PR of its own. Parts 1-3
are #558, #585 and #605.

## How it was read

The reviewer read the rulebook as a game prints it (`leaderRules(true, newGameConfig())`, about 175 KB), not its
source. It got that text and the audit's brief, and nothing else. Its brief said a rulebook is plain instruction prose,
not the period's voice, and that it should be judged as a good board-game rulebook. Two files were left out because
other open lanes are changing them: `rules-freedom.ts` (#725) and `rules-command.ts` (#612). They wait for a later pass.

## What changed

- **Untrue lines gone.**
  - The rulebook still described buying cities, which the engine no longer does: its `purchase` order buys grain. The
    fallback sentence in step 6, the "not sold" and "elders sell to none" lines in step 12, and "spent on buying a city"
    are gone.
  - "Trade rights come with trade at foreign markets (a later rule)" is gone. No such rule is queued.
  - "which builds trust", said of showing credentials, is gone. The engine gives no trust for it.
  - "Nobody expects troops in winter" is gone. No rule makes them unexpected.
- **No software words.** "The engine enforces only physics" became "The rules enforce only movement, combat, production
  and payment, and the passage and basing a sealed tablet grants". The same goes for "There is no 'else'", "kept by the
  engine", "the engine reads only the limits" and "(knowledge, not instructions)".
- **Each rule said once.** These now point to the one place that says them:
  - how to name units in standing orders;
  - how you hear of a caught envoy;
  - that clauses oblige nobody.

  "As fast as a messenger rides" is now said twice, not three times. The walls at the start point to THE MAP. The
  scheduled-orders, caravan and pass passages no longer repeat each other.
- **Long bullets split.**
  - The score sentence became two bullets: the score, then strength.
  - Caravans became four bullets: route, arrival, porters' pay, pace and risks.
  - Spies became five: watching, watchmen, caught, questioning, handed over.
  - Ransom demands got their own bullet. The rumours sentence moved to NEWS AND TRAVEL.
- **Lists named once.**
  - The courts' tongues are grouped: "Upe, Akka, … and Seir speak Canaanite and read nothing", in place of 47 "X
    speaks … and reads …" clauses.
  - Floods are grouped by season, and the river boats by which way they go.
  - Each mountain pass is named once, with every link it crosses.
  - Every list of three or more reads "a, b and c" (`andList` in `src/llm/src/text.ts`).
- **One way to write a percentage: "%"** (it had three), as the owner settled for all the game's text (#735).
- **Plain labels for slogans.** "A job is an errand." became "Jobs.", "Your record is news." became "Your record.", and
  "People live their own lives." became "Free people.", among others. Slogans that are themselves the rule stay ("Ships
  keep to the coasts", "Land is held, not owned").
- **Smaller fixes.**
  - "unpaid, a level falls after 30 seasons unpaid"
  - "the hungry leave the land, births, and …"
  - "half as slow again" beside "half as long again"
  - "(Diplomacy rules, no dice)"
  - "the customs, not rules"
  - an advice line ("sell where grain is dear")
  - a bare number after a "%"

No rule or number changed. The reviewer checked the rulebook before and after, line by line.

## Ten lines, before and after

| Before | After |
| --- | --- |
| The engine enforces only physics: movement, combat, production and payment. | The rules enforce only movement, combat, production and payment, and the passage and basing a sealed tablet grants. |
| There is no "else": a refused order is not replaced by another, and a purchase meant as a fallback is refused if an earlier bid has reserved the gold, even if that city is then not sold. | A refused order is never replaced by another. |
| Trade rights come with trade at foreign markets (a later rule). | (gone) |
| Upe speaks Canaanite and reads nothing; Akka speaks Canaanite and reads nothing; … | Upe, Akka, Hasura, … and Seir speak Canaanite and read nothing; … |
| (the Euphrates in Shemu; the Tigris in Shemu; the Marassantiya in Shemu; the Orontes in Shemu; the Jordan in Shemu) | (the Euphrates, the Tigris, the Marassantiya, the Orontes and the Jordan in Shemu) |
| The loser loses 10 in a hundred of its men and 4 more for each ten in a hundred by which it was the weaker | The loser loses 10% of its men, and 4% more for every 10% of the margin |
| CUSTOMS OF THE AGE (knowledge, not instructions) … historical accuracy is not a goal … Following one can build trust cheaply; breaking one will be noticed. | CUSTOMS OF THE AGE (not rules, except where marked) … Playing true to history is no aim in itself … A custom kept wins trust cheaply; one broken is noticed. |
| After you give your orders, you sleep. Only these wake you, because they concern you: | After you give your orders, you sleep. Only these wake you: |
| - Your record is news. Every promise to pay … | - Your record. Every promise to pay … |
| Guests entering your land wake you, as guests. A guest's troops are where you can strike them: a grant is a bet on trust. | Guests entering your land wake you. A guest's troops stand where you can strike them. |

## Tests changed

Each change below is forced by the new wording, and every check is kept:

- `rulebook-text.test.ts`:
  - The "no else" line and the city-sale line asserted text about buying cities, a rule the engine no longer has. They
    now assert "A refused order is never replaced by another."
  - Step 12 is now "12. Building".
  - The spy check now asserts its two sentences in their two bullets.
  - "67%".
- `siege-text.test.ts` asserts the strength line in its new wording.
- `contract-text.test.ts` asserts the three new labels.
- `sleep-reading.test.ts` asserts "Only these wake you:".
- `terrain-text.test.ts` asserts the lists as "a, b and c".

## Reviews

The fresh-eyes slop review (Opus, high effort) went three rounds and scored 5, 8, then 9. It found no blocking point
after the first round. Every point of every round is fixed or answered, and the reviewer accepted each answer. Its last
two points (a doubled word in the customs heading, and one "a and b and c" list in THE MAP) are fixed in the last
commit.

## Readings taken

- **"%" for shares.** Taken here because the rulebook's formulas ("5% + …, between 2% and 60%") read badly in words,
  and filed as #735 since notices then said "in a hundred". The owner answered (6 November 2026; archive item 230):
  "15% sounds to me like the more clear phrasing." The notices, news and reports follow in the slop audit's lane.
- **A rulebook is judged as a rulebook.** Its voice is plain instruction, not the period's. "Voice of the age" governs
  what characters and kings say, not the rules of the game.
- **Script kings untouched.** They do not read the rulebook, so no benchmark or use-against-ignore measurement applies:
  nothing a script player does changes.

## Questions for the owner

Questions for the owner: none (#735, answered).
