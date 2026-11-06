# A caught offer is a thing held (#592, side lane, 6 November 2026)

PR #733, built on #725 (#543). The owner's yes to idea #592 ("Follow-ups" in `docs/BUILD-PROGRESS.md`; his words, 3
November 2026: "Agreed to all, expertly!"): a king who caught the carrier of a province's offer read it (#553), but
knowing was all he could do with it. Now the captor holds it and chooses: send it on to its claimant (a favour he can
trade on), sell it to its claimant or to the land's king, or keep it back ("No menus": the lever is a thing held).

## Step 0

Every file changed is under the 50 KB mark; the new code is in files of its own (`model/held-letters.ts`,
`turn/held-letters.ts`, `rules/validator-letters.ts`, `bots/held-letters.ts`, the page's `LettersSection.tsx`).

## What changed

- **Held** (`GameState.lettersHeld`): whoever catches an offer's carrier, a traveller taken captive or a caravan his
  troops take (#543), holds it from the season word of the taking reaches him, and his notice says what he may do.
- **Order `letter`** (`letter_send`, `letter_sell` for model kings): send it to its claimant, who may then answer it
  and is told who sent it; send it to the land's king, who reads his people's own words; or ask either of them a price.
- **Order `buyLetter`** (`buy_letter`): once word of the asking has reached him, the king asked pays from his treasury;
  the gold goes to the seller by the road, the letter to the buyer.
- **Kept**, it lapses when the people's leaning ends.
- **Seen**: OFFERS YOU HOLD and OFFERS FOR SALE TO YOU in the seat view, "Offers taken on the road" on the page; a
  sleeping seat wakes for either.
- **Script kings** (`bots/held-letters.ts`): a friend's offer is sent on for nothing; any other is offered to the land's
  king for 60 shekels, or to the claimant where the land is the captor's own; a king offered one buys it with three
  times its price in hand. Reading one sent or sold is heeded as a caught offer; a claimant sent one warms to the sender.
- **A file seat's request** (`llm/src/exchange.ts`, `readable`): the list of order actions had grown to about 1,195
  characters on one line, so any new action passed the 1,200 a file reader's line is kept under; a list of plain values
  that long now wraps, as many to a line as fit, as a long field already did.
- Rulebook (`rules-freedom.ts`), design note 51, signals. **Save version 63.**

## Measured

To come with the script games (`scripts/sim.sh --games 50 --seed 1 --talk-play-half`).

## Readings taken

- **Keyed by its province**, not by a new id: a court holds at most one offer of a province's people at a time, and the
  orders name the province, as `take_up_province` does. Principle: Requests are rules too (no internal ids).
- **Only to its claimant or the land's king**, as the idea says; another king could be told by talk or by envoy.
- **The buyer reads the words only once bought**; the asking names whose people wrote to whom. Principle: hidden
  information (what is for sale is said, not what it says).
- **First guesses, for item 18:** the script kings' price, 60 shekels, and the three times it in hand to buy.

## Checks

To come.

Questions for the owner: none.
