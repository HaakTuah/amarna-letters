# A caught offer is read (#553)

An accepted idea, into item 17++ part D (#538). The owner, 2 November 2026, to the design session's takes on five ideas
from the reviews (archive item 182): "Yes to all, expertly!" When a king's troops or
people catch the carrier of a province's offer, the king reads the offer, as a caught spy's report is read ("A letter
taken on the road"). PR #576. Save version 50.

## Built

- **Engine (`lettersGo`, `turn/letters.ts`):** the carrier of an offer is taken captive by someone other than its
  claimant, and his captor is still in play. The captor then reads "Among what Ahmose carried, and so never delivered,
  was the word of the people of Babili to Egypt: "..."", with the people's own words quoted (`quoteWords`). The court's
  renaming (`namedFor`) leaves those words as written. The claimant never hears it. Signal: `offer-read`.
- **The letter holds the people's words alone** (`offerWords`, `model/records.ts`, beside `provinceOf`). The terms of
  answering it ("It is yours only if you take it up ...") are added only to the claimant's notice (`OfferTerms`,
  `offerArrives`). The claimant's notice is unchanged.
- **Script kings** (`bots/talk.ts`, `brain.ts`, `board.ts`):
  - A king who reads his own province's offer treats the province as restless for four seasons (`Brain.offersRead`,
    pruned after that, and given to the `Board`). This is what he does on hearing talk of it: it eases what the province
    is asked (`freedom.ts`).
  - A king who reads a rival's province's offer warms to its claimant (`CourtTrust`).
  - The notice is read by the words the engine writes (`OfferCaught`). The claimant is found by the name the court knows
    and gives him (`landFor`): his house's name, where the court gives his claimed name to another. Talk of a leaning
    (`claimantsTalkedOf`) now finds him the same way.
  - All of this is behind the talk's flags (`--no-talk-play`, `--talk-play-half`).
- The rulebook (`rules-freedom.ts`), the README and design note 51 are updated.

## Readings taken

- **Only the people's words are quoted to the captor:** the terms of answering are rules for the claimant, not the
  people's words, and a captor cannot take the province up. Principle: a request names only what applies ("Requests are
  rules too").
- **A captor reads it only if he is not the claimant:** a claimant who holds the carrier simply never receives the offer,
  as with a report (the existing path).
- **No new rule for what the captor may do with it:** he knows, and acts as he would on talk. Sending it on or selling it
  is a new lever, and the reviewer's idea below.

## Use against ignore

`--talk-play-half`, 50 games, seed 1. Kings that heed talk and caught offers, against kings that ignore both:

- Growth 0.90 to 0.84, wins 25 to 25.
- 1,152 offers sent; 36 carried (1 with a spy's reports, 18 by the claimant's own men, 17 paid from the people's purse).
- 1 caught and read, 1 robbed, 33 arrived.

**Verdict: too rare to tell.** One catch in 50 games. A carrier is taken only where the land's troops stop him on the
road, and most offers are never carried at all. Heeding the read offer costs what heeding talk costs. It should matter
once more offers travel (caravans as carriers, #543). Listed in the running table, for item 18 with the talk.

## Review

- **Codex:**
  - CodeQL: a slow regular expression; it is now read by plain string search.
  - P1: the claimant was not resolved by the court's names; fixed and tested.
- **Claude's reviewer (Opus, high), round 1, 7.** Its points:
  - No measurement or report (both now here).
  - The claimant's terms untested.
  - The bot test on a hand-written notice.
  - The real offer's wording untested.
  - "never reached him" read as the carrier's.
  - `provinceOf` apart from `offerWords`.
  - `offersRead` neither pruned nor given at the `Board`'s making.
  - Names unresolved.

  All fixed.
- **One idea (the reviewer's), filed as #592:** a king who catches an offer's carrier could send it on to its claimant or sell it, a
  bargaining chip and not knowledge only.
- Helpers: one reviewer (Opus, high).

Questions for the owner: none.
