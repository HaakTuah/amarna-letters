# What a king can count (item 17++, part B)

Build order item 17++ (`docs/intent/build-order/item-17.md`, "Then **17++**"), its second part: the province card's town
and land apart, counts as the scribes knew them, the census, and the king's demand as a share or an amount, replacing item
10+a's tax rate. The sections the item names under The world ("Counts as the scribes knew them", "A census", "The king
says how much he wants") are not in the repository's copy of the design document (cut 1 November 2026) and the live
document could not be read from this account, so this part is built from the item's own text; the report lists the
readings. The report: `docs/rounds/2026-11-02-what-a-king-can-count.md`. Save version 40. Every number is a first guess in
`CountData` (`src/engine/src/model/counts.ts`), tuned in item 18.

## Counts (`GameState.counts`, `model/counts.ts`)

- A count is a province as a court's scribes found it in one season: the settled on its land, the men of fighting age
  among them, the loose, the people of its town, the last harvest, the farmers' granaries and the crop in the fields.
- Every court starts with a count of the land it holds, dated the first season (`seedCounts`). Land taken later has no
  count until the king sends scribes.
- **What a seat sees** (`rules/views.ts`, `provinceEconomy`): its provinces' people and fields from its last count, with
  the count's season (`counted`, null where it has none, the figures then 0). Its stewards report the rest exactly: its
  stores, its market, how its countryside ate, and what its demand brings in (`tax`). The model king's prompt says each
  count's age and the land never counted; the web's province card and town marker show the seat's count in a seat view,
  rounded to two figures ("about 18,000"), and the exact figures in god view. The engine always reckons with the exact.

## The census (`GameState.censuses`, `turn/counts.ts`)

- Order `census` (a province of one's own; model action `census`; the web's grain row, "Send scribes to count it"): the
  scribes are paid `gold` (3 shekels) when they set out, the same for every province, so the fee tells the king nothing of
  what they will find; one census of a province at a time.
- They count it `seasons` (1) later, at the season's end, as it stands then (`takeCount`); counting is a taking in the
  ledger (`UnrestData.census`, 5 points, the hand the people see: the governor where one stands). The count then travels
  home as word does (`courierSeasons` from the province to the court) and replaces the older count when it arrives, with
  a notice of what it found. Scribes in land the king no longer holds come home with nothing.

## The demand (`GameState.shares`, `GameState.amounts`)

- Order `demand` (a province, or all one's land; model actions `ask_share` and `ask_amount`; the web's grain row) replaces
  item 10+a's `tax`. It stands until changed or the province changes hands, when it lapses to the usual share
  (`EconomyData.taxPercent`, 33).
- **A share** (percent of a season's third of the last harvest) never squeezes the land, but the land hides part of it:
  `hidePerSeason` (1) point for every season since its holder's last count, plus `hidePerFar` (2) for every season its word
  takes to reach his court beyond the first, at most `hideMost` (30); a land he never counted hides `hideUncounted` (20)
  before distance (`hiddenPercent`).
- **An amount** (measures a season) hides nothing: it is taken as asked, as far as the farmers' granaries hold. Asked
  beyond what the land yields it falls on the people really there: the granary empties, they go hungry, flee and turn
  against the hand that takes (the ledger's takings for hunger and for asking above the usual share), and fewer hands
  bring in the next harvest; asked below, the rest stays with them.
- `grainAsked` is what either asks a season, before obedience and siege; `burden` is it as a percent of the season's
  third, and stands wherever the tax rate stood: what the farmers keep, the land's appeal to those leaving, the reason
  runaways give, and the ledger's taking or giving against the usual share.
- Only a governor stands between king and province: where one stands, the ledger debits or credits him for what is
  asked, as the hand the people see (part A's rule), and nothing else comes between.

## Script kings (`game/src/bots/counts.ts`)

- Each counted province is asked what its farmers can bear by its count (`bearableShare`, item 10+a's reckoning on the
  counted harvest and granary): as an amount while the count is at most `FreshSeasons` (2) old, which the land cannot hide;
  as a share once it is older; land never counted keeps the usual share.
- They send scribes to the richest provinces whose count is `StaleSeasons` (8) old or that were never counted, two a
  season at most, while the treasury holds ten times the fee.
- `--no-count-play` / `--count-play-half`: kings that never count and always ask a share by their (ageing) count, for use
  against ignore.
