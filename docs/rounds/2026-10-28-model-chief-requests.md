# Side lane: model chiefs' and spies' own requests (28 October 2026)

Weekly usage: unknown (this session cannot read it).

What item 11b+ left unbuilt (its report, "Left for a session of its own"), by Haakon's answers to item 11b (item 11b+'s
text in `docs/intent/build-order/item-11.md`): "a model chief decides raids, ships and the way back in a request of his
own, like every character, and only a script chief by formula", and "no rule moves a spy whose reports wait for a
carrier: he decides whether to wait, carry them home himself or pay a passing traveller, a script spy by his traits".
The orchestrator's brief: script chiefs and spies keep their formulas; "Requests are rules too"; no model games.

## What was built

- **Two requests** (`engine/src/turn/own-choices.ts`, design note `docs/design/25-chiefs-and-spies-choose.md`): as each
  season begins, every chief leading a band is asked (`Chief`) and every posted spy whose reports wait at its post for a
  carrier (`Reports`). A model's choices are kept on the character (`chiefPlan`, `reportsPlan`) and taken when the next
  season begins; the script mind answers nothing, so its traits decide by the formulas of item 11b+, unchanged.
- **The chief's request** (`llm/src/character-roads.ts`): his men, ship, purse, what his men cost and how long they went
  unpaid; the land where he works and next door as he hears of it, in round numbers (people's purse, stores, armies,
  other bands, a coast). He decides where his band works next season (or stays), buying a ship (asked only where he can:
  a coast, the men to man one, the gold), whom his men kill of the travellers they rob ("nobody", "kings' servants",
  "everyone", standing until changed), and giving up the road. A chief who chose does nothing by formula that season.
- **The spy's request**: its post, master, reports waiting and for how long, purse, seasons home, about what a passing
  traveller or a man hired at the court there would ask, and whether its master pays carriers on delivery. It decides
  the most it pays now for a carrier next season, and whether it carries them home itself if nobody takes them.
- **Who decides** (item 6c): both calls go on the characters' ladder, kinds `chief` (stakes 0.5) and `carry` (0.2),
  shadowed by the script.
- **The rulebook** (ROADS part): chiefs decide where their band works, when to give up the road and whom to kill (a
  careful chief nobody, a ruthless one kings' servants, the most ruthless anyone); a spy decides whether to wait, pay or
  carry its reports, and may hire at once.
- **Tests** (`game/test/own-choices.test.ts`): every chief asked and a script mind answering nothing; the chief's
  request asking only what applies, with no ids; a model chief moving and killing as he chose, the formula back once his
  choice is stale; giving up the road; a model spy carrying at once or waiting past its traits; paying no more than it
  chose; a reply with no choice leaving the traits to decide.

## Overlap with item 11+ (#126)

This lane touches three files #126 also changes, each by a few lines: `engine/src/turn/bands.ts` (the chief's choice
taken at the start of his band's season, the ship bought by a shared helper, whom he kills), `engine/src/turn/envoys.ts`
(the two replies applied in `fulfil`) and `llm/src/rules-roads.ts` (the rulebook sentences above); and one line of
`docs/design/24-jobs-and-money-answers.md` pointing here. Everything else is in new files or files #126 leaves alone.

## Benchmarks and script games

BENCH

No use-against-ignore row: nothing changes for script players, and model games are not run until the build order is
done.

## The review

One reviewer (Opus, high effort) read the diff against the item and "The game in one page". Fixed: (1, blocking) the new
requests shift the request ids a log keys its replies by, so the save version goes to 23; (3) a spy whose master pays
carriers was told a trusting carrier takes what it gives now, but always paid half: it now pays no more than it chose;
(4) a ship bought and sailed inland the same season was lost: none is bought for a move inland, and the request says so;
(5) the request said the band stays unless moved, but a hunt drives it off: it says so; (8) a man leading a new band
kept whom he chose to kill with an old one: leading a band starts with no choices; (9) tests for buying a ship, a move
inland and the trusted carrier. Kept, as known limits in the design note: (6) the batch runner's count of characters
asked now counts these requests, which a script answers without a call; (7) the script's side of the shadow log says
only "by its traits", since its formulas decide later in the engine.

## Readings taken (each also in "For Haakon")

1. **A chief's choices are taken the season after he makes them** (the request comes as a season begins, after his
   band's season), so a model chief's first season is decided by his traits, as a script chief's. Alternative: his band
   does nothing that first season. (Nothing happens unless someone orders it; the stand-in plays a seat that has not
   answered, as for kings.)
2. **Whom his men kill is a standing choice** ("nobody", "kings' servants", "everyone") until he changes it, since
   robbing happens on the road during the season. Alternative: asked anew each season, or about each traveller.
   (Characters decide; a standing order is a choice the one who gives it can automate.)
3. **A model spy may hire a carrier at once**, without the script's season of waiting first. Alternative: it too waits
   a season. (Freedom to do: the season's wait was the script's patience, not a rule.)
4. **A spy is told about what a carrier would ask, reckoned from its own price**; the man it finds asks his own.
   Alternative: not told, learning only by trying. (Prices: what a character has heard, and bargains from.)
5. **Save version 23** (the reviewer's finding): script games play the same, but the new requests take request ids, by
   which a log keeps its replies, so a version-22 log would replay replies into the wrong requests.
