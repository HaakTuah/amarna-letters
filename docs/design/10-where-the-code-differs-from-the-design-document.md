## Where the code differs from the design document (as it stood on 19 October 2026)

The design document records intent; these notes record what is built. Where they differ today:

- **Pillar 8, war slower than diplomacy, is being built** (Build order item 5, the siege package). Walls that differ
  by place, storming and sieges are built (see Walls and sieges): a capital held by one army falls to a storm of 5, or
  to a lone besieger in the fourth season counting the one it got in. An army moves one link a season. Provinces without
  walls still fall to a single army, and a held one to two. An envoy between capitals takes one or two seasons each way, so a letter and its reply take two seasons
  between neighbouring capitals and four otherwise; only a spy sent to a distant province can take three. The rulebook says
  so, worked out from the map ("Envoys take 1 or 2 seasons each way between courts …"); until the simulation-fixes
  round it said "1 to 3 seasons each way". Until sieges exist, a temporary wake trigger (foreign troops arriving next
  to a capital) stands in for the warning walls would give; since the fix pass after item 4, troops arriving next to any
  province of the homeland, or a walled city the king holds, wake him too.
- **Sleeping seats against the document's status paragraph** ("Status of sleeping seats", 19 October 2026). Built as
  it says: sleep by default for model and file seats (the switch stays), a hidden cap of 12 seasons, triggers that fire
  on changes, audience calls that may reopen orders, and orders that follow their unit. Its "still to build, before
  item 5" was built in the fix pass after item 4: a king's named season and his triggers of his own removed (see "Kings
  never choose when they wake"), the missing triggers for a threat to a home province or a walled city, standing orders
  that answer a move in the season it is made rather than a season late, and scheduled orders for new levies. The rest
  of conditional orders comes with item 6.
- **What wakes a sleeping seat** follows the simulation-fixes round's prompt and the owner's later instructions, not
  the document's list of default triggers ("an envoy or report arrives; foreign troops move into or next to its
  territory; it is attacked or loses a province; a catastrophe strikes it; a tablet, offer or audience awaits an
  answer; a scheduled order fails"). A report coming home, foreign troops next to its land (unless they arrive next to
  its homeland or a walled city it holds), an attack that did not get in and a catastrophe that kills no unit go to the digest; troops lost, a
  ransom demand, a servant's notice and the cap wake it too (see "Pacing: sleeping seats"). So the kings read "foreign
  troops in your land, or arriving next to your homeland or a walled city you hold", "a scheduled or standing order that failed", "a servant giving notice"
  and "a ransom demanded" where the document's decided text says "foreign troops at your border" and "a failed order",
  plus the owner's sentence on envoys. The document's list of order triggers (under "What the replay showed") leaves
  out a ransom demand; it reopens orders in the code, as the owner's instruction for Part H lists it.
- **An audience held while the orders stand** gives the king the compact picture the document describes, with its
  standing orders and its people away as well, and the one line counting every power's provinces that opens every
  audience. From it the king can send letters only: releasing a detained envoy or any other order waits until it
  reopens its orders. When the call fails there, the king is woken for orders that same season.
- **Conditions.** No seat-defined triggers exist, and no priority on a default trigger (the document dropped both).
  Of its "scheduled, conditional orders", orders that follow their unit and two standing orders (`unit_enters`,
  `unit_attacked`, each answering a move in the season it is made, as the document's "if Hatti enters Mira, support
  Mira" needs) are built; its wider vocabulary ("unless"; treasury below, envoy returned, tablet sealed as
  conditions on orders) is not (item 6). Triggers count only moves the seat saw, so a foreign levy wakes nobody.
- **Who holds each province is public at once.** The document's "Hidden by default" has news of distant provinces,
  including who holds them, arrive late. In the code every seat sees every province's owner the season it changes,
  and the standings line is computed from it.
- **Tablets have a place, but are only copied.** As the document says, a tablet lies in a court's archive at its
  capital, a spy copies it there, and whoever takes the capital takes its archive (see "Tablets lie in archives" under
  Communication). The Ideas tab also has a spy steal a tablet, and the main tab has a conqueror seize the archive; in
  the code both only copy, so no court ever loses a tablet. Unreadable tablets, a tablet sent to a third court to be
  read, and moving the court are not built (see Not built yet).
- **Call size.** The document says a king's orders call grew from about 26k to over 60k tokens in ten seasons, "almost
  all of it journal and letters", with a fixed part of about 5k. Measured in the simulation-fixes round (Part E of
  `docs/archive/rounds/2026-10-19-simulation-fixes.md`), those are what the file-seat agents used per call. The requests themselves were about 6k-8k
  tokens in season 1 and 11.5k-13.5k by seasons 9-10, of which the journal grew about 3.5k; the rest was the agent's
  own overhead. The fixed part (rulebook, primer, map and opening positions) is now about 8,000 tokens with sleep on,
  and the setup screen's cost estimate (`CostEstimate`) still assumes 5,000 cached and 5,000 fresh tokens an orders
  call. Of the document's candidates, lower effort for audience calls is already built (one level below orders), and
  the king summarizes its own older notes, as decided.
- **The shared score function is half done.** `Scoring.Strength` (10 × land yield + gold − back pay owed) serves the
  engine, the seat's own strength line and the script kings, as the document asks; the city price is still its own
  setting (10 × yield), equal to the score weight by value, not derived from it.
- **Wages on return.** The document leaves the check on the loophole (reputation from losses abroad) to be worked
  out. The code carries news of losses abroad (captures and executions) to other courts with envoys and spies, and
  script envoys weigh back pay against offers of service; no character yet grows wary of a court from such news.

