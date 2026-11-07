# Raiders from beyond the map (item 17++++a)

The item's text: `docs/intent/build-order/item-17.md` ("17++++a, raiders from beyond the map"); its section: "Pirates are
bands at sea" (War). The report: `docs/rounds/2026-11-07-raiders-from-beyond-the-map.md`. Built from the doors dossier
(`docs/history/08-beyond-the-edges.md`) and the pirates dossier (`docs/history/15-pirates-bandits-tolls.md`). Every
number is a first guess in `RaiderData` (`src/engine/src/model/raiders.ts`) and the doors' `raids` (`model/doors.ts`),
for item 18. Bands themselves are [23](23-roads-and-reputations.md).

## Who comes, and through which door

Each door (`Doors`) says how hard raiders press through it (`raids`, in percent of the strongest) and whether its routes
come by sea (`bySea`); each land beyond it that sends raiders has a weight among them and their name (`Beyond.raids`).
Only raids the dossiers attest; the numbers are first guesses [G]. Not the Sherden, who appear in 1346 only as soldiers
(`15-sherden`), nor the Medjay, Egypt's police (`08-kush-irem-medjay`):

| Door | Presses | By | Raiders |
| --- | --- | --- | --- |
| The western sea | 100 | sea | Aegeans of Ahhiyawa, as Attarissiya raided Alashiya (`15-madduwatta`) (90); raiders from the far west, marked "first recorded later", rarely, as their arrivals (`08-sea-peoples`) (10) |
| The eastern road | 50 | land | highlanders of the Zagros, Lullubi and Qutu, raiders in Mesopotamian memory (`08-elam`) |
| The Nile beyond Nubia, the Gulf, the Red Sea | 0 | | none: no source of the period records raids through them |

## How often (`raidersCome`, `raidChance`; `turn/raiders.ts`)

- Each season, at the start of the bands' season, each door with raiders rolls once (stream `raiders`): its raiders make
  for one of its provinces, weighted by what it holds (purse and stores) times how little it is policed, and land with a chance of `most` (20) times the
  door's `raids` in a hundred, no more. Nobody sails in winter; over land, winter halves it. The coast's policing holds it
  down as it holds bands down (`policedShare`: its holder's troops there, or his police), and his fleet on the waters
  off it halves a crew's chance (`fleetPercent`).
- A crew comes in 1 to 4 ships of 30 men (`BandData.shipMen`), with a ship; a band over land, 40 to 160 men. Its men
  come from beyond the map. Its chief (`raiderChief`) is a man of the land beyond, named from its names (marked as the
  newcomers' are), bold and greedy, with 5 to 30 shekels; or, half the time when one is there, a chief who went home
  through that door before, leading the next raid himself. The coast's holder is told. Chiefs gone home are not in the
  pool the newcomers keep near its baseline (`living`).

## As every band, and what is theirs (`Band.from`, `captives`)

- A raider band is a band (`Band.from` names its land beyond; `rose` "raider"): it robs, falls on travellers and ships,
  takes ships at sea, is hunted, hired (`enlist`) and paid off (below); men of the land join it while it pays.
- Where it robs, it carries off people (`carryOff`): 10 in a hundred of its men a season, from the settled, at most a
  hundredth of them, raising the land's unrest as a levy taken does. They go home with it; if its chief is lost and it
  melts away, or its men leave it, they go free as loose men, and its stranded men stay as loose men too.
- **Home** (`goHome`, `canGoHome`): a crew of a sea door sails home from any coast; a band over land goes home only from a
  province of its door. Gone, its chief is `Abroad` (a duty: off the map, nobody's to deal with), with his purse; the men
  and captives leave the map. The holder is told.
- A script chief (`raiderChooses`, before the formula every chief follows): a crew goes home when the next season is the
  winter, a band over land after 4 seasons or once short of pay; either goes once his purse holds 6 seasons of his
  men's cost, or once paid off. Short of home, he moves towards his door. A crew keeps to the coasts and a band over land
  within 2 provinces of its door (`bandMayGo`). His other choices are every chief's.
- A model chief sees his home, his captives and whether he can go home (`ChiefView.home`, `canGoHome`, `captives`) and may
  choose to (`go_home`); a raider has no other way back. A raider who gives up the road goes home if he can.

## Paying a band off (order `payOff`, `pay_off_band`)

- Carried as an enlistment is (an army of the payer's in the province, with its commander or the king there): a fee, paid
  now, to take the band out of his land and keep out of it for a term. A script chief takes it if it pays what he asks
  (`chiefAsks`, shared with `enlist`: what his men cost or took last season, `Band.took`, whichever is more, for the
  term, and his cut by greed); a raider weighs at least the rest of his raid. A raider then goes home (or turns home); any
  other band moves to the richest land next door not the payer's (refusing if there is none). Taking it and leaving are
  every chief's formula, model chiefs' too, as an enlistment's are, but a raider band over land that cannot go home at
  once only says it will turn home. After that, while the term holds, a script chief keeps his word if he is more loyal
  than greedy (`keepsWord`): a raider turns home, any other band keeps out of the payer's land (`paidBy`, `paidUntil`),
  and neither robs any of it; a model chief sees the deal and does as he chooses. Offers to a band, to serve or to go,
  are heard together, best fee first, the seed deciding between equal ones; the payer hears a refusal, and the record
  counts it (`band-pay-refused`).
- `Band.took` (what a band took in all last season) fixes the enlistment's ask, which read only the roads' take.

## Script kings (`src/game/src/bots/raiders.ts`, `--no-raider-play`, `--raider-play-half`)

- They hunt raiders where an army of theirs stands with them, as any band (`outlaws.ts`), but march no army after them,
  since raiders go home within a few seasons by themselves; police at the doors were measured and did not pay (the
  report). They enlist them at war as any band (`generals.ts`, the fee now what they
  reckon the chief asks, `chiefAskSeen`, with a tenth over), and pay off raiders they cannot break where an army of
  theirs stands with them, for 2 seasons, with a tenth over, when the treasury holds three times it (`payOffOrders`).
- Ignoring raiders turns all of it off for raider bands, the police against bands included.

## The seat view and the rulebook

- `BandSeen.raiders` ("Aegean raiders of Ahhiyawa"), `captives`, and `paidUntil` for a band the viewer paid off; the prompt and the
  orders panel show them. The rulebook's ROADS AND OUTLAWS part says who comes through which door and how often, and the
  command part the order `pay_off_band`.
