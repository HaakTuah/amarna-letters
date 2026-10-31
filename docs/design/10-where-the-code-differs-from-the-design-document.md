## Where the code differs from the design document (begun 19 October 2026, kept up as items are built)

> **Since item 11a** (`21-money-and-work.md`): wages and back pay are replaced by jobs with a fee (an advance now, the rest when the job is done), and strength no longer subtracts anything owed. Passages below about wages and back pay describe the build before item 11a and are kept for its history.

The design document records intent; these notes record what is built. Where they differ today:

- **Pillar 8, war slower than diplomacy, is built** (Build order item 5, the siege package). Walls that differ
  by place, storming and sieges are built (see Walls and sieges): a capital held by one army falls to a storm of 5, or
  to a lone besieger in the fourth season counting the one it got in. An army moves one link a season. Provinces without
  walls still fall to a single army, and a held one to two. An envoy between capitals takes one or two seasons each way, so a letter and its reply take two seasons
  between neighbouring capitals and four otherwise; only a spy sent to a distant province can take three. The rulebook says
  so, worked out from the map ("Envoys take 1 or 2 seasons each way between courts …"); until the simulation-fixes
  round it said "1 to 3 seasons each way". Until the siege package, a temporary wake trigger (foreign troops arriving next
  to a capital) stood in for the warning walls would give; it was retired with the walls, and since the fix pass after
  item 4 troops arriving next to any province of the homeland, or a walled city the king holds, wake him (see "What
  wakes it" in `05-pacing/00-overview-and-what-wakes-a-king.md`).
- **Sleeping seats against the document's status paragraph** ("Status of sleeping seats", 19 October 2026; since 27 October in `docs/archive/design-history.md`). Built as
  it says: sleep by default for model and file seats (the switch stays), a hidden cap of 12 seasons, triggers that fire
  on changes, audience calls that may reopen orders, and orders that follow their unit. Its "still to build, before
  item 5" was built in the fix pass after item 4: a king's named season and his triggers of his own removed (see "Kings
  never choose when they wake"), the missing triggers for a threat to a home province or a walled city, standing orders
  that answer a move in the season it is made rather than a season late, and scheduled orders for new levies. The rest
  of conditional orders came with item 6b (see "Conditions" in `05-pacing/05-conditions-answers-alerts-and-replay.md`).
- **What wakes a sleeping seat** was a difference until 27 October 2026: the code follows the simulation-fixes
  round's prompt and the owner's later instructions (see "What wakes it" in `05-pacing/00-overview-and-what-wakes-a-king.md`), and the
  design document's default triggers, order triggers and rulebook quote now say the same ("Default wake triggers set
  by the engine", "What the kings are told", "An envoy wakes a king for an audience only").
- **An audience held while the orders stand** gives the king the compact picture the document describes, with its
  standing orders and its people away as well, and the one line counting every power's provinces that opens every
  audience. From it the king can send letters only: releasing a detained envoy or any other order waits until it
  reopens its orders. When the call fails there, the king is woken for orders that same season.
- **Conditions.** No seat-defined triggers exist, and no priority on a default trigger (the document dropped both).
  Of its "scheduled, conditional orders", orders that follow their unit and two standing orders (`unit_enters`,
  `unit_attacked`, each answering a move in the season it is made, as the document's "if Hatti enters Mira, support
  Mira" needs) are built, and since item 6b its wider vocabulary as conditions on scheduled entries and standing
  orders ("unless"; troops in a province, the treasury, an envoy back at court, a tablet sealed). Triggers count only
  moves the seat saw, so a foreign levy wakes nobody.
- **Who holds each province was public at once** (as it stood on 19 October; closed by item 7b). The document's
  "Hidden by default" has news of distant provinces, including who holds them, arrive late; since item 7b a court sees
  the holder of what is in its sight as it is, and elsewhere the newest that word has brought it, dated, as the
  seat view's `known` (`rules/views.ts`, `ownerAt` and the province knowledge after it; `13-travel-and-news.md`).
- **Tablets have a place, but are only copied** (until item 10, which built stealing and a capital's archive carried
  off: see `18-characters-who-they-are.md`). As the document says, a tablet lies in a court's archive at its
  capital, a spy copies it there, and whoever takes the capital takes its archive (see "Tablets lie in archives" under
  Communication). The design document also has a spy steal a tablet, and a conqueror seize the archive; in
  the code both only copy, so no court ever loses a tablet. Unreadable tablets, a tablet sent to a third court to be
  read, and moving the court are not built (see Not built yet).
- **Call size.** The document said, until 27 October 2026, that a king's orders call grew from about 26k to over 60k tokens in ten seasons, "almost
  all of it journal and letters", with a fixed part of about 5k. Measured in the simulation-fixes round (Part E of
  `docs/archive/rounds/2026-10-19-simulation-fixes.md`), those are what the file-seat agents used per call. The requests themselves were about 6k-8k
  tokens in season 1 and 11.5k-13.5k by seasons 9-10, of which the journal grew about 3.5k; the rest was the agent's
  own overhead. The fixed part (rulebook, primer, map and opening positions) is now about 8,000 tokens with sleep on,
  and the setup screen's cost estimate (`CostEstimate`) still assumes 5,000 cached and 5,000 fresh tokens an orders
  call. Of the document's candidates, lower effort for audience calls is already built (one level below orders), and
  the king summarizes its own older notes, as decided.
- **The shared score function is half done.** `strength` (10 × land yield + gold − back pay owed) serves the
  engine, the seat's own strength line and the script kings, as the document asks; the city price is still its own
  setting (10 × yield), equal to the score weight by value, not derived from it.
- **Wages on return.** The document leaves the check on the loophole (reputation from losses abroad) to be worked
  out. The code carries news of losses abroad (captures and executions) to other courts with envoys and spies, and
  script envoys weigh back pay against offers of service; no character yet grows wary of a court from such news.
