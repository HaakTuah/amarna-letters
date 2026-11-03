# The slop audit, part 3: notices, news and the season's reports

Branch `lane/slop-audit-notices`, from `develop` (#605). The lane is "The slop audit" under "Follow-ups" in
`docs/BUILD-PROGRESS.md` (archive item 178), and this is its third kind: every notice a court reads each season
(`notify`, `tell` and their kin in `src/engine/src/turn/`), the frames around news and inquiries, and the bribed envoy's
invented news. Parts 1 and 2 are #558 and #585.

## How it was read

The reviewer read what players actually receive, not the source. A small script plays three full script games
(seeds 1-3, 24 seasons each) and collects every notice. Notices of one kind are folded together, and the notice types
are sorted by how often they were sent. The reviewer was given that corpus (about 50 KB, 130 notice types) and the
brief, nothing else. The audience speech and the facts in inquiries were left out, as parts 1 and 2 cover them.

## What changed

- **Numbers agree** everywhere: "1 shekel" (`formatMoney`), "1 measure" (`measures`, `rules/calendar.ts`),
  "a thousand" (`people`). There is no "%" in prose ("15 in a hundred"), and none of "0 X" ("no", "nothing").
- **Notices sent every season** say only what changed. The treasury drops zero lines, the repeated caveat and the
  doubled mine line. The caveat about audiences' gold is said once, in the rulebook (step 2 of the season). Works are
  one opener, picked from three forms, plus one clause per cause ("War halted the work on the roads, harbour and watch
  of Shushan"). Taxes, census, sales and settling are each one short sentence.
- **Movements last season** reads as sentences, not a list of orders: plain holds are grouped ("Your armies held
  their ground in Apasa and Mira"), with no header and no bullets. **Orders in notices** use the map's names
  (`told`, `placesNamed` in `model/order-reading.ts`): no "carchemish -> harran" and no lowercase keys. Refusals give
  one reason, once.
- **One name per power** (`powerName` and `whose` in `model/power.ts`; the web's `powerName` re-exports it): the
  land's name, except that Babylonia stays Babylonia (not Karduniash), as the screens already had it. Possessives and
  articles are set once ("the Suteans'", "Kaska's army").
- **Rules out of notices:** sieges say what changed ("It stands at 2 of the 6 steps to a breach"), not the siege rules.
  Hunger, mutiny, loose men and the province offers lose their rule tails. The rulebook already has each rule.
- **Recurring frames vary** by a deterministic pick (`rules/wording.ts`: `pick`, keyed by the season and the subject,
  with no draw on the game's random numbers). This covers the works opener, a job done, a fee due, loans, inquiries
  (four colon frames), spy sightings and candidates. Each candidate's words now come from its own trade, with three
  forms per line picked by the person.
- **Ids** appear only inside an order pointer an order takes ("(order repay, debt d21)"). Tablets are named by what
  they are. "turn N" stays, since the interface shows each one as the court's own date (`dated`).
- **Fixed along the way:** a disbanded army's savings were always said to go "into the purse of" its home province.
  They now go where the men spend them: where they settle, at home, or carried on the road (`menHome`).
- **The script kings read the same notices.** Each reader moved with its words: the assay's `FullWeight` ("all fine
  gold"), `SpiedUnit` (each sighting read once, guarded in `long-text.test.ts`), "took N measures?", the hold lines in
  `withoutHolds` (`prompt-letters.ts`), the plague wake line in `sleep.ts`, and the readers in `brain.ts`,
  `baseline-leader.ts` and `talk.ts`, which now read names through `powerNameFor`. Two canary patterns read the
  treasury notice. Both were updated to the new words, with no check loosened (`twin-canary.test.ts` lines 79 and 270).

## The review (fresh eyes, Opus at high effort; given only the corpus and the brief)

| Round | Score | What kept it from 10 |
| --- | --- | --- |
| 1 | 3 | "1 measures"; a 70-word treasury ledger every season; "this season. no work was done"; "- - army in Apasa holds"; garbled taxes; ids and "->" order syntax; one candidate pitch for every trade; rules repeated in every siege notice |
| 2 | 6 | Movements still a list; the treasury tail every season; one power under two names ("Karduniash" and "Babylonia"); the assay saying "full weight" of a short lot; colon chains in refusals |
| 3 | 7 | "beaten by far"; "the kingdom of Arrapha is no more: Assyria took its capital, Arrapha"; "the Damascus", "Suteans has"; rule text in the new province offers; archive ids; frames that never vary |
| Escalation 1 | (pending) | |

## Readings taken

- **"turn N" stays in a notice's text.** The interface renders it as the court's date (`dated`, `ui/format.ts`), and a
  model's request carrying it is the requests kind's to judge. (Parts 1 and 2 took the same reading.)
- **Ids that an order needs stay inside its pointer** ("(order pay_ransom for c15)", "(order repay, debt d21)"). Players
  and model kings type them into orders, and the script kings read them ("Requests are rules too": nothing implies
  what is not true, and an id inside an order pointer names the order's own subject).
- **Tolls are told one by one, not gathered once a season.** #579 made a caravan's news travel home by road from
  where it happened. Gathering the season's tolls into one notice would have told a far toll at once (Hidden
  information), so the lane gave the gathering up when it merged #579.
- **Some notices stay one per event** (sales, people who fled): `batch.ts`, the bots and tests count them one by one.
- **The state of the realm keeps its rank among the powers.** The design asks for it ("A state of the realm", decided
  21 October 2026: "where it stands among the powers"), and it goes only to its own court.
- **The bribed envoy's vouching** is back in the form it had before this lane ("What I saw: At the court of Hatti I
  saw for myself that it is so: …"). The owner's answer to #591 rewrites exactly these lines in the lane's next PR,
  with a save version.
- **Characters whose sex the text does not know are "they".** This is never mixed with "its" for one person.

## Behaviour

Through round 3, the same three games (`scripts/sim.sh --games 3 --seed 1 --max-turns 16`) print identical tables
on the base and the head, except the timing line. The escalation's readers now read every power by its one name,
which also catches names the old readers missed (a city-state's confession, a claimant's talk). That can change
script play on other seeds, so it takes **save version 60**. The three games were still identical.

## Helpers

| Helper | Model | What it gave |
| --- | --- | --- |
| Reviewer (rounds 1-3 and escalation) | Opus, high | Scores 3, 6, 7, …, each with a ranked list |
| Groups A, B, C (round 1 fixes: economy, people, war) | Opus | One commit each, merged; three files each per finding |
| Groups D, E (round 2 fixes: war and orders, economy and people) | Opus | One commit each, merged |
| Escalation (round 3 fixes) | Opus, high | All eleven points; the one-name-per-power helper and the readers moved with it |

## Ten lines before and after

| Before | After |
| --- | --- |
| Your caravan paid Byblos's toll of 15% at Gubla: 1 measures of grain. | Your caravan paid the toll at Gubla: 1 measure of grain, 15 in a hundred. |
| …Gold in since your last orders: 0 shekels, from your mines and your sales at your markets. Paid: your troops 10 shekels. The treasury now holds 0 shekels; gold received at audiences or brought home by your envoys this season is added later. | The grain tax brought 4 measures into your stores. Your troops were paid 10 shekels. The treasury is empty. |
| What you keep and build cost 0 shekels and the corvée of 200 men, away from the fields this season. no work was done on the harbour of Lukka: war stops the work; no work was done on the policing of Lukka: war stops the work. | Your works took 200 men from the fields by corvée this season. War halted the work on the harbour and watch of Lukka. |
| - army in Lakisha holds ⏎ Seen nearby: ⏎ - Ashkelon: army in Ashqaluna holds | Your army held its ground in Lakisha. ⏎ Ashqaluna's army held its ground in Ashqaluna. |
| You now ask 37 in a hundred of its harvest of the Ways of Horus, from the next collection on. | From the next collection, the Ways of Horus gives 37 in a hundred of its harvest. |
| …besieges your city of Shushan (walls 2)…: it stands at 1 of 6. The city yields you nothing while it is besieged and eats from its market and stores… | …besieges your city of Shushan, but ships kept it supplied: no fleet of theirs holds the Gulf. It stands at 1 of the 6 steps to a breach. Your own ships can bring it grain (order ship). |
| Word spreads that the kingdom of Arrapha is no more: Assyria took its capital, Arrapha. | Word spreads that Assyria has taken Arrapha, and its kingdom is no more. |
| Kushmeshu-ziti is back at your court and has done their job, and was paid the rest of the fee, 32 shekels. The job has ended: they are free at your court, and another errand is a new offer (order hire), which they may take or not. | Kushmeshu-ziti is back at your court, the job done; the rest of the fee, 32 shekels, was paid. They are free for another job (order hire). |
| I am Ahutabu of Babili, once a caravan master. I know every road and every court; no master of mine had cause to complain. | I am Ahutabu of Babili, once a caravan master. I have crossed the desert in the dry season and brought every donkey home. |
| Zida set out for Isuwa last season; the journey should take about 1 season. | Zida set out for Isuwa last season; the road there takes a season. |

## Questions for the owner

Questions for the owner: none. Filed: #656 (bug: script kings never read that a character they tried to hire is held
elsewhere; found here, left to its own PR because fixing it changes script play).
