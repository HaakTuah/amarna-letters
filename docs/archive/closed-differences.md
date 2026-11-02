# Closed differences between the code and the design document

Entries of `docs/design/10-where-the-code-differs-from-the-design-document.md` that no longer describe a live
difference, moved word for word on 2 November 2026 (the file-by-file review). What is built is in the design notes.

> **Since item 11a** (`21-money-and-work.md`): wages and back pay are replaced by jobs with a fee (an advance now, the rest when the job is done), and strength no longer subtracts anything owed. Passages below about wages and back pay describe the build before item 11a and are kept for its history.

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
- **Conditions.** No seat-defined triggers exist, and no priority on a default trigger (the document dropped both).
  Of its "scheduled, conditional orders", orders that follow their unit and two standing orders (`unit_enters`,
  `unit_attacked`, each answering a move in the season it is made, as the document's "if Hatti enters Mira, support
  Mira" needs) are built, and since item 6b its wider vocabulary as conditions on scheduled entries and standing
  orders ("unless"; troops in a province, the treasury, an envoy back at court, a tablet sealed). Triggers count only
  moves the seat saw, so a foreign levy wakes nobody.
- **Who holds each province was public at once** (as it stood on 19 October; closed by item 7b). The document's
  "Hidden by default" has news of distant provinces, including who holds them, arrive late; since item 7b a court sees
  the holder of what is in its sight as it is, and elsewhere the newest that word has brought it, dated: the seat
  view's `owner`, `ownerAsOf` and `ownerFrom`, filled by `Views.knownHolders` (`rules/views.ts`) from the court's stored
  knowledge (`GameState.known`; `13-travel-and-news.md`). The web app's Standings tab still reckons its land standings
  from the true holders, even for a seat (a polish-lane find, noted in `docs/rounds/2026-10-31-polish-lane.md`).
- **Tablets have a place, but are only copied** (until item 10, which built stealing and a capital's archive carried
  off: see `18-characters-who-they-are.md`). As the document says, a tablet lies in a court's archive at its
  capital, a spy copies it there, and whoever takes the capital takes its archive (see "Tablets lie in archives" under
  Communication). The design document also has a spy steal a tablet, and a conqueror seize the archive; in
  the code both only copy, so no court ever loses a tablet. Unreadable tablets, a tablet sent to a third court to be
  read, and moving the court are not built (see Not built yet).
- **Wages on return.** The document leaves the check on the loophole (reputation from losses abroad) to be worked
  out. The code carries news of losses abroad (captures and executions) to other courts with envoys and spies, and
  script envoys weigh back pay against offers of service; no character yet grows wary of a court from such news.
