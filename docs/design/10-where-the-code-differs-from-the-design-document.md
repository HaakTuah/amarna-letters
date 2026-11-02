## Where the code differs from the design document (begun 19 October 2026, kept up as items are built)

The design document records intent; these notes record what is built. Where they differ today (differences since
closed are in this file's git history and in the items' reports):

- **An audience held while the orders stand** gives the king the compact picture the document describes, with its
  standing orders and its people away as well, and the one line counting every power's provinces that opens every
  audience. From it the king can send letters only: releasing a detained envoy or any other order waits until it
  reopens its orders. When the call fails there, the king is woken for orders that same season.
- **The Standings tab reckons from the true holders.** A court sees who holds each province as word reaches it since
  item 7b (the seat view's `owner`, `ownerAsOf` and `ownerFrom`, from `Views.knownHolders` in `rules/views.ts`;
  `13-travel-and-news.md`), as "Hidden by default" asks, but the web app's Standings tab still reckons land standings
  from the true holders, even for a seat (a polish-lane find, noted in `docs/rounds/2026-10-31-polish-lane.md`).
- **Call size.** The document said, until 27 October 2026, that a king's orders call grew from about 26k to over 60k tokens in ten seasons, "almost
  all of it journal and letters", with a fixed part of about 5k. Measured in the simulation-fixes round (Part E of
  `docs/archive/rounds/2026-10-19-simulation-fixes.md`), those are what the file-seat agents used per call. The requests themselves were about 6k-8k
  tokens in season 1 and 11.5k-13.5k by seasons 9-10, of which the journal grew about 3.5k; the rest was the agent's
  own overhead. The fixed part (rulebook, primer, map and opening positions) is now about 8,000 tokens with sleep on,
  and the setup screen's cost estimate (`CostEstimate`) still assumes 5,000 cached and 5,000 fresh tokens an orders
  call. Of the document's candidates, lower effort for audience calls is already built (one level below orders), and
  the king summarizes its own older notes, as decided.
- **The shared score function is half done.** `strength` (10 × land worth + gold + holdings; until item 11a, less back pay owed) serves the
  engine, the seat's own strength line and the script kings, as the document asks; the city price is still its own
  setting (10 × yield), equal to the score weight by value, not derived from it.
