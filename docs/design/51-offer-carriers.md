# Who carries a province's offer (item 17++, part D)

The owner's answer to #431 (2 November 2026, archive items 157 and 158), written into "Whom a province obeys" (War,
revision 95). Report: `docs/rounds/2026-11-02-offer-carriers.md`. Save version 45.

## The offer is a letter (`turn/offers.ts`, `Journey` kind `Offer`)

- A province declaring for a power whose troops are not there (`declareIn`, design note 49) sends its offer as a letter
  waiting in the province (`waitAt`), as a spy's report waits ("Messengers are errands", item 11b). The declaration's
  `known` is `OfferUnheard` until the letter arrives; until then the power cannot see it or answer it.
- **Its carriers** (`carryOffer`, run with `carryLetters`):
  - his own spy whose report waits there: the offer goes with that report's carrier (`offer-spy`);
  - a traveller going from there to his court whose stakes it serves: in his service, owing his grant to him, or with his
    sympathy lying with his court (`Traits.sympathy`): carries it for nothing (`offer-own`);
  - only where its people are far gone in his favour (his weight past its holder's by `OfferData.farGone`, 40, first
    guess): a traveller going that way, paid his side fee from its people's purse (`Market.purse`, `offer-paid`), else a
    free person at the court there, hired for the whole journey from the same purse (`offer-hired`). The fees are
    `LetterData`'s.
- A carrier shares the letter's road: robbed or killed, it is lost. One who sells secrets (`sellsSecrets`) sells word of
  it to the land's king for `OfferData.sellPrice` (20, first guess), told to him by the road (`offer-sold`).
- **Arrived** (`offerArrives`): the declaration is known from that season, and the "A province looks to you" notice names
  who brought it (`offer-arrived`).
- **Never carried**: when the declaration ends (its people no longer lean his way), a letter still waiting is dropped
  (`dropOffer`): it fades as the leaning does. A cession by treaty is a king's word, told as before.
- **Talk** (`sendOffer`): talk of the leaning reaches the power, the holder and the holder's enemies at the roads' pace
  from the province (a "Talk of ..." rumour, `offer-talk`). His enemies (`enemiesOf`), by the game's marks of enmity:
  those whose troops stand unbidden in his land (`hostileAt`), and those who closed their roads to him or he to them.
  Talk is no offer: it cannot be answered.

## Script kings (`game/src/bots/talk.ts`)

- A king whose province talk says leans toward another treats it as restless and eases what it is asked (`freedom.ts`'s
  relief), before the offer reaches the other king. `--no-talk-play`, `--talk-play-half`.
- A king told that a rival's province leans toward someone warms to that claimant (`Brain.learn`, trust `CourtTrust`
  0.1, first guess): "his enemies by courting the claimant".
- Answering an offer is part C's (`bots/declarations.ts`), from the season it arrives.
