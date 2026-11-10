# Who carries a province's offer (item 17++, part D)

The owner's answer to #431 (2 November 2026, archive items 157 and 158), written into "Whom a province obeys" (War,
revision 95). Report: `docs/rounds/2026-11-02-offer-carriers.md`. Save version 45; the captor reading a caught offer (#553), 50;
caravans as carriers (#543), 64.

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
  - **a caravan** (#543, `turn/offer-caravans.ts`, `caravanTakesOffer`): one standing in the province, its road on to
    his land (the province its route ends in is his), before the caravans set out on the season's road (`caravansPickUp`,
    shared among all caravans there, his own first, before any moves in `caravansTravel`, which runs before the letters are carried) or, one that turned there for home, with the
    letters (`carryOffer`, after his own men): his own caravan or ship for nothing
    (`offer-caravan`); another king's only where its people are far gone, for `CaravanOfferData.feePerSeason` (10, first
    guess) a season of its road, from their purse into the gold the caravan carries for its master (`offer-caravan-paid`).
    The letter records it (`Journey.caravan`) and rides with it: where the caravan ends its road in his land
    (`caravanUnloads`, from `caravanArrives` and a homecoming), his couriers take it on by `wordHomeAt`
    (`offer-caravan-brought`), and "A province looks to you" says traders brought it; a road ending elsewhere leaves it
    there (`offer-caravan-lost`); a caravan lost on the road loses it (`caravanOffersLost`, `offer-robbed`); one taken by
    troops gives it to their king to read, "Among what Egypt's caravan carried, ...", by word from where it was taken
    (`caravanOffersTaken`, through `tell`; his own troops' taking brings it to him); so does one found smuggling and
    seized at a border, to the border's king (`atBorder`'s "seized"). History: merchants and envoys shared the roads (EA 8: "be it a caravan of mine or
    your own messengers"; `docs/history/15-pirates-bandits-tolls.md`, "Merchants killed at Hinnatuna").
- A carrier shares the letter's road: robbed or killed, it is lost. He knows whom he carries for and to whom (`knows`): he
  remembers it, and holds it as news (`Character.news`) to sell at any other court he stands at, by its king's order
  (`buy_news`), as anyone may sell what he knows; one in the claimant's own service only if he would sell his master's
  secrets (`sellsSecrets`) (`offer-news`).
- **Caught** (#553, `lettersGo`): a carrier taken captive on the road by another than the claimant loses the offer to his
  captor, who reads it as a caught spy's report is read ("A letter taken on the road"): the people's own words, quoted
  (`quoteWords`, so the captor's court names nobody in them otherwise), and the claimant never hears it (`offer-read`).
  The letter holds the people's words alone (`offerWords`); the terms of answering it are added only for the claimant.
- **Held** (#592, `model/held-letters.ts`, `turn/held-letters.ts`): the captor holds what he caught
  (`GameState.lettersHeld`, `holdLetter`), from the season word of the taking reaches him (`HeldLetter.known`), and is
  told so after its words (`LetterHeldTerms`). By order `letter` (validated in `rules/validator-letters.ts`, resolved
  after the answers to provinces) he sends it on (`Send`): to its claimant, an offer like any other, whose notice names
  him (`Journey.sentOnBy`, `LetterSent.toClaimant`); or to the land's king, who reads his people's words
  ("A letter taken on the road", `LetterSent.toHolder`). Or he asks one of them a price (`Sell`, at least 1 shekel): word
  of the asking reaches that king ("An offer for sale", `askKnown`), who buys it by order `buyLetter` from then, paying
  from his treasury (`HeldLetter.bought`); the gold goes to the seller by the road (`LetterPrice` journey), and when it
  comes the seller sends the letter, as sent on. An asking binds: the letter is neither repriced nor sent elsewhere,
  so nothing that befalls it is told by its disappearing. Kept, it stays held after the people's leaning ends (nobody
  learns of the end through it); sent on then, it finds no offer standing, and it is dated as written, so it never stands
  for a later declaration of the same people (`HeldLetter.written`, `Declaration.since`, checked in `offerArrives`).
  Whether its claimant has fallen is checked as the holder has heard (`heardFallen`). Each letter is its own, named by
  the turn its people wrote it (`HeldLetter.written`, shown in the view; `letter` and `buyLetter` take it as `written`,
  the newest when none is named; `letterHeld`, `letterOffered`): a fresh one stands beside an older, which the court
  keeps knowing until word of the fresh one comes. The seat sees `SeatView.lettersHeld` and
  `lettersOffered` (OFFERS YOU HOLD, OFFERS FOR SALE TO YOU; on the page, "Offers taken on the road"), and a sleeping
  seat wakes for either. Save version 67.
- **Arrived** (`offerArrives`): the declaration is known from that season, and the "A province looks to you" notice names
  who brought it (`offer-arrived`).
- **Never carried**: when the declaration ends (its people no longer lean his way), its letter is dropped, waiting or on
  the road (`dropOffer`): it fades as the leaning does, and never stands for a later declaration. A carrier robbed by
  outlaws loses it with what they took (`offersRobbed`, from `stopped` in `travel.ts`; `offer-robbed`). A cession by treaty is a king's word, told as before.
- **Talk** (`sendOffer`): talk of the leaning reaches the power, the holder and the holder's enemies at the roads' pace
  from the province (a "Talk of ..." rumour, `offer-talk`). His enemies (`enemiesOf`), by the game's marks of enmity:
  those whose troops stand unbidden in his land (`bidden`, per power), and those who closed their roads to him or he to them.
  Talk is no offer: it cannot be answered. It bends as it travels: no figures, no carrier named, and the holder keeps it
  as a travellers' read of the land's mood (restless, dated, `readMood`), in THE MOOD OF THE LAND until newer word.
  **Along the trade roads** (#543): a caravan hears the talk where it stands and passes (`caravanHearsTalk`), and keeps
  it as heard (`Caravan.talk`: the province, whom its people lean toward, its holder then, and the season, which a holder's
  travellers' read of the mood is dated by); where its road ends, the
  king whose land that is hears "Traders say ..." by his couriers from there (`offer-talk-traders`), as heard, whatever
  has changed since. Each power hears a standing declaration's talk once, by the roads or with a caravan
  (`Declaration.talked`, filled by `talkTo`); talk of a leaning since ended is told where the caravan's road next ends,
  then dropped.

## Script kings (`game/src/bots/talk.ts`)

- A king whose province talk says leans toward another treats it as restless while the travellers' read is four seasons
  old or less, and eases what it is asked (`freedom.ts`'s relief), before the offer reaches the other king.
- A king that talk says a province leans toward posts a spy to watch it, if it is not watched and within six steps
  (`statecraft-court.ts`): his reports bring its offer home; and a trade venture to its market, if he knows it, need
  only pay its way (`trade.ts`, #543), since his caravan coming home brings the offer. `--no-talk-play`,
  `--talk-play-half` for all of these.
- A king told that a rival's province leans toward someone warms to that claimant (`Brain.learn`, trust `CourtTrust`
  0.1, first guess): "his enemies by courting the claimant".
- A king who reads an offer on a carrier he caught (#553, `offersCaught`) heeds it as he would talk of it: his own
  province is eased as restless for four seasons (`Brain.offersRead`), a rival's warms him to its claimant. The same flags
  measure it.
- Answering an offer is part C's (`bots/declarations.ts`), from the season it arrives.
- A caught offer (#592, `bots/held-letters.ts`): sent on for nothing to a claimant the captor counts a friend
  (`Brain.isFriend`), else offered for `LetterPrice` (60, first guess) to the land's king, or to the claimant where the
  land is the captor's own. Offered one, a king buys it if he has `LetterSpare` (3) times its price. The land's king who
  reads it, bought or sent, heeds it as a caught offer (`offersCaught`); a claimant sent one warms to the sender
  (`offersSentUs`). Under the same talk flags.
