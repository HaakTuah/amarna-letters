# The slop audit, part 5: the seat view

Branch `lane/slop-seat-view`, from `develop` (#749). This lane is "The slop audit" under "Follow-ups" in
`docs/BUILD-PROGRESS.md` (archive item 178). It covers the next kind of text in the audit's order: the seat view a king
reads every season, built by `situation` in `src/llm/src/prompts.ts`, `prompt-economy.ts`, `prompt-audience.ts` and
`prompt-letters.ts`, and the engine's own lines that the view shows. Parts 1-4 are #558, #585, #605 and #730.

## How it was read

The reviewer read what a king reads: the seat views of Egypt, Hatti and Mitanni after seasons 3 and 12 of a script
game (`newGame(3)`, script seats), about 156 KB. It got that text and the audit's brief, and nothing else. The rewrite
brought the same game's views down to 104 KB.

## What changed

- **Walls of text that grew with the game are now grouped.**
  - The twenty opening vassal treaties are one line, with the oath given once.
  - The envoy travel line says "two seasons each way to …; one season each way to every other court" in place of 46
    "X: 1 season(s) each way" entries.
  - Land standings name what changed and group what did not.
  - Lands are grouped by when word came: in sight, heard in turn N, or as it stood at the start.
  - Moods are grouped by age.
  - Stores, markets, bands and troops' grain are grouped.
  - A person's missions are one sentence.
  - News under one headline in a season is one line.
- **Database labels are now sentences.**
  - The treasury, rank, works and the troops' grain read as sentences.
  - The `[Catastrophe] Catastrophe: Earthquake:` tags are gone.
  - Order names appear only in section headers.
  - Rule asides in headers point to the rulebook section that already explains them.
- **One way for numbers.** Digits are grouped ("1,482"). People counts come from one helper. News is given in shekels,
  where the view already used them. Shares are written "15%" (#735).
- **Untrue or doubled lines corrected.**
  - "(full: the next tax will not fit)" on stores that were not full now reads "too full for the next tax".
  - The same three markets were listed as both dearest and cheapest. All of a king's own markets are now named.
  - SIEGES said a city falls when worn down as far as its walls are high. A breach takes three steps per level, so
    the line now says "worn down N of M steps to a breach", as the news already did.
  - An envoy's hand was named twice on one tablet; it is now named once.
  - "200 left of 200" became "200 shekels, none yet repaid".
  - "the birds flew on the favourable side. Favourable." lost its second "Favourable".
- **Renamed:** the servants' section is now YOUR SERVANTS, and the census keeps YOUR PEOPLE. The rule files that point
  to the servants (`rules-intelligence.ts`, `rules-command.ts`) name the new header.
- **Kept as the design asks:** the gold line ("Gold is a lifeline", `docs/intent/land-people-and-economy/gold.md`)
  stays every season, with each thing gold buys.

## Ten lines, before and after

| Before | After |
| --- | --- |
| `TREASURY: 960 shekels by your ledger. Gold in since your last orders 0 (mines and sales); a season you pay your troops 76; your people's jobs come to about 199 a season, 1666 of their fees still to fall due …` | `TREASURY: 960 shekels by your ledger. Nothing came in since your last orders. Each season: your troops' pay 76, your servants' fees about 199. Of their fees, 1,666 more falls due as their jobs are done.` |
| `- Grain in store: …, akhetaten about 200 of 219 (full: the next tax will not fit), delta about 200 of 213 (full: the next tax will not fit), …` | `- Grain in store: thebes about 330 of 513, memphis about 210 of 273; too full for the next tax: akhetaten about 200 of 219, delta about 200 of 213, …` |
| `- Your troops' grain: army memphis 24/24, takes its food, army akhetaten 16/16, takes its food, …` | `- Your troops' grain (what each carries, of the most it can): armies (all take their food): memphis 24 of 24, akhetaten 16 of 16, …; fleet: delta 10 of 10.` |
| `WORKS (what stands in your provinces; order build or build_corvee to change what you keep: BUILDING AND POLICING): in gold 0 a season, by corvée 3000 men.` | `WORKS in your provinces (order build or build_corvee; see BUILDING AND POLICING): a season's cost no gold and 3,000 men by corvée.` |
| `LAND STANDINGS …: Egypt (you) 1.00 (land yield 250, at the start 250); Hatti 1.00 (land yield 195, at the start 195); …` (47 entries) | `LAND STANDINGS …: Changed since the start: Mitanni 1.26 (land yield 145, was 115); … Unchanged, ratio 1.00 (land yield): Egypt (you) 250, …` |
| `ENVOY TRAVEL …: Hatti: 1 season(s) each way; Babylonia: 2 season(s) each way; …` (46 entries) | `ENVOY TRAVEL …: two seasons each way to Babylonia, Assyria, Kaska, Isuwa, Azzi, Arrapha and Elam; one season each way to every other court.` |
| `- the tablet sealed by Ugarit and Egypt, dated turn 0 [your copy k2]: "I will send you 20 shekels of gold each year as tribute. I am your servant…"` (20 times) | One line: the vassal treaties sealed before the age began, the oath once, then each vassal's tribute and copy. |
| `- Dearest markets: delta 40 (purse 1237), sinai 40 (purse 121), memphis 40 (purse 1702); cheapest: gaza 40 (purse 480), …` | `- Your markets: all pay 40; their purses: delta 1,237, sinai 121, memphis 1,702, akhetaten 1,320, thebes 3,332, nubia 421, sumur 180, gaza 480.` |
| `[Catastrophe] Catastrophe: Earthquake: An earthquake has ruined the Ways of Horus…` | `Earthquake: An earthquake has ruined the Ways of Horus…` |
| `Carried a mission to Assyria and came home with the answer (season 4). Carried a mission to Elam …` | `Carried missions and came home with the answers: Assyria (season 4), Elam (season 9).` |

## Left for later, with the reviewer's agreement

- **Biographies,** the next kind in the audit's order: the stock lines "Known by name at more than one royal court.",
  "Holds a stake in the love of the people of …", the commissioner's doubled line, and the doubled tongue sentence.
  They come from the engine's fact text (`rules/factory.ts`), and the script kings read some of it.
- **A game-wide decision on names and clocks:**
  - one place under several names (Karkamish and carchemish, Lakisha and Lachish, Sutu and the Suteans);
  - "season" against "turn";
  - the engine's notices giving gold in minas (the seat view now turns them into shekels; the web app and logs still
    show minas);
  - engine notices naming orders inline ("(order repay, debt d3)").
- **The engine's travel line** keeps "season(s)", because the web app reads that format. The seat view rewrites it.

## Tests changed

Each change below is forced by the new wording, and every check is kept:

- `rulebook-text.test.ts`: the archive header, standings, news, the grouped treaties and the travel line, with new
  checks for the last two.
- `siege-text.test.ts`: LANDS and SIEGES.
- `sleep-reading.test.ts`: the rumour headline.
- `contract-text.test.ts` and `cover-bot.test.ts`: the job terms. The cover-bot check is split in two, since the spy's
  pay wording depends on its contract.
- `people-play.test.ts`: the YOUR PEOPLE header.

## Reviews and helpers

- The fresh-eyes slop review (Opus, high effort) went three rounds and scored 3, 6, then 8. It found nothing blocking
  after round 2. Round 2's two blocking points were fixed: the gold line had lost facts the design requires, and a
  rulebook pointer named a header that had been renamed.
- **Escalation** (Opus, extra-high effort) took the four points still open after round 3, as "Reviews", point 4, sets
  out:
  - one notation for a tablet mark;
  - the settlement line, with "about" on rounded counts;
  - the archive group's lead;
  - the order cue in the people header.
- **Helpers** (three in parallel, each in its own branch):
  - `prompts.ts` and `prompt-letters.ts` (Opus, high effort);
  - `prompt-economy.ts` and `prompt-audience.ts` (Opus, high effort);
  - five engine lines (Sonnet, high effort).

  One more helper (Opus, high effort) fixed round 2's list. Running the three test suites at once timed out
  whole-game replay tests, all of which passed alone and in CI.

## Readings taken

- **The seat view is judged as a report.** A king's chief scribe's plain report, not the period's voice: the voice is
  for what characters and kings say.
- **What the script kings read stays as it is.** Engine fact texts they match ("Carried a mission", "slipping in") are
  regrouped only where the view renders them, so their play is unchanged.

## Questions for the owner

Questions for the owner: none.
