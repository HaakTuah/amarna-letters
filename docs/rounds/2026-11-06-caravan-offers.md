# Caravans carry a province's offer and talk along their road (#543, side lane, 6 November 2026)

PR #725. The owner's yes to idea #543 ("Four more ideas from the reviews, accepted" in `docs/BUILD-PROGRESS.md`; his
words: "Yes to all, expertly!"): a province's offer to an absent king (item 17++, part D) and talk of its leaning
travelled only with persons; in the period most word between towns went with goods, on the trade roads the game has.

## History

Merchants and envoys shared the roads, and a king named them together: Burna-Buriash's merchants travelled with his envoy
Ahu-tabu, and when they were killed at Hinnatuna he warned Pharaoh that the robbers "are going to kill again, be it a
caravan of mine or your own messengers" (EA 8; `docs/history/15-pirates-bandits-tolls.md`, "Merchants killed at
Hinnatuna"; `docs/history/09-the-letters.md`, Burna-Buriash's grievance).

## Step 0

Every file changed is under the 50 KB mark; the new code is a file of its own, `turn/offer-caravans.ts` (7 KB).

## What changed

- **A caravan as an offer's carrier** (`caravanTakesOffer`, tried in `carryOffer` after the claimant's own men): a
  caravan or ship standing in the province whose road ends in the claimant's land. His own carries it for nothing;
  another king's only where the people are far gone in his favour, for `CaravanOfferData.feePerSeason` a season of its
  road from their purse into the gold the caravan carries for its master. The letter rides with it (`Journey.caravan`).
- **Its road's end** (`caravanUnloads`, from `caravanArrives` and a turned caravan's homecoming): in his land, his
  couriers take it on to his court (`wordHomeAt`), and "A province looks to you" says traders brought it; elsewhere it
  goes no farther. Lost with its caravan on the road (`caravanOffersLost`), it is lost; taken by troops
  (`caravanOffersTaken`), their king reads it as a caught carrier's offer is read (#553), or, if it was his own
  people's word to him, it reaches him.
- **Talk along the road**: a caravan hears talk of the leaning of each province that declared, where it stands and
  passes (`Caravan.talk`), and the king whose land its road ends in hears it, "Traders say ...", by his couriers from
  there. Each power hears a declaration's talk once (`Declaration.talked`), by the roads (`sendOffer`, now through the
  same `talkTo`) or with a caravan.
- **Script kings** (`bots/trade.ts`): a market whose people talk says lean our way is worth a trade venture that only
  pays its way, since our caravan coming home brings their offer (under `--no-talk-play` / `--talk-play-half`).
- **Rulebook** (`llm/src/rules-freedom.ts`), **design note** 51, signals (`offer-caravan`, `offer-caravan-paid`,
  `offer-caravan-brought`, `offer-caravan-lost`, `offer-talk-traders`). **Save version 64.**

## Measured (`scripts/sim.sh --games 50 --seed 1 --talk-play-half`)

- Use against ignore: kings heeding talk 0.79 growth and 28 wins against 0.71 and 22 (before #543: 0.86 to 0.86, 26 to
  24). Offers sent 1,574; carried 153 (92 by caravan, 7 of them paid; 33 by the king's own men, 21 paid travellers,
  4 hired, 3 with spies); arrived 106 (49 brought by caravan, against 33 arrivals in all before); 1 road ended outside
  the claimant's land; 11 lost on the road, with persons or caravans. Talk carried by traders 356 times in 47 games.
- Every feature is every seat's: the script kings' caravans carry offers in 37 of 50 games, and those offers arrive.

## Readings taken

- **"The claimant's market"** read as any province of his where the caravan's road ends: his own caravans coming home
  from the province, and other kings' trading at or delivering to his land. Principle: Information moves in physical
  time; the offer goes where the goods go.
- **Order of carriers:** a caravan setting out takes it first, since caravans move before the letters are carried
  (whoever sets out first that way); then his own men, a caravan that turned there for home, paid travellers and the
  hired.
  A caravan's fee goes to its master with what the caravan brings home. Principle: a traveller going that way, as the
  idea says.
- **Talk told where the road ends, once to each king** rather than at every court passed: one notice per king per
  declaration keeps the inbox to news. Principle: Requests are rules too (no noise implying new news).
- **First guess, for item 18:** `CaravanOfferData.feePerSeason` 10 shekels.
- **Benchmarks:** the `--versus solo` run waits for the next item's benchmarks (a side lane, as #553's was).

## Review (Codex, round 1)

Four findings, all fixed: talk is kept as the traders heard it (province, claimant, holder), not looked up anew when
told; a caravan takes up a waiting offer as it sets out (`caravanPicksUp`), since caravans move before the letters are
carried; an offer taken far from its captor's court reaches him by word from there (`tell`); the tests play only the
three powers they need (`smallWorld`).

Round 2: one finding, fixed: a smuggling caravan seized at a border gives the offers it carried to the border's king,
who reads them, rather than losing them as if robbed.

Round 3: two findings, fixed: talk the traders carry keeps the season they heard it, which a holder's travellers' read of
the land's mood is dated by (not the season they tell it); and the offers waiting where caravans stand are shared out
among all of them before any sets out (`caravansPickUp`), so the claimant's own takes it whatever the order of their ids.

Round 4: one finding, fixed: the record of a captor reading a caravan's offer was shown to his court in the season of
the taking; it is god's view only now, and his court learns it by its notice when word comes.

## Checks

`scripts/test.sh`: 1616 passed, 1 skipped (seven new tests in `src/engine/test/offer-caravans.test.ts`).

Questions for the owner: none.
