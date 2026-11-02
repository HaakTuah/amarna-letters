# Governors over regions, grants of kingship, the map (item 17++, part C)

The item's text: `docs/intent/build-order/item-17.md`, "Then **17++**". Sections: "Governors" (War,
`docs/intent/war-travel-and-the-seas/command-at-a-distance.md`) and "Who holds what, and the mood of the land" (Interface,
`docs/intent/interface-and-the-council/spectator-mode-and-analysis.md`), and "taken up, never thrust on anyone" ("Whom a
province obeys", War, `docs/intent/war-travel-and-the-seas/territory-and-military-part2.md`; decided 2 November 2026).
Report: `docs/rounds/2026-11-02-governors-grants-map.md`. Save version 44 (43 with #467's change from `develop`).

## A governor over several provinces (`Governor.seat`, `seatOf`, `turn/governors.ts`)

- The order `govern` naming a governor of ours gives him a province beside one he holds; word reaches him at his seat and
  goes on from there. His letters on a far province reach him late and the king from his seat.
- Recalled, a disloyal and ambitious one turns with those of his provinces whose people would rather follow him
  (`turnsWith`), ruling them from the first (his seat if it goes); the rest stay his king's. Stepping down from one, he
  keeps the others; losing or giving up the province of his seat, he keeps the rest and sits in the first of them. His
  king's view shows the old seat until word of the move can be read at his court (`seatWas`, `seatHeard`, `seatKnown`), for a province granted beside him then too, whose word goes by the old seat.
  A governor loyal to his king (not one who `wants` the land, as for his mood reports) writes from his new seat that he
  sits there now (#480, `seatLetters` in `turn/unrest.ts`): the king knows the move when that letter comes, if sooner.
  Orders on governorships (`govern`, `unseat`, `crown`) are checked and carried out against them as the court knows them
  (`governorsKnown`): one ended out of sight still takes word of a recall, and a grant to him fails, told by the road; one recalled by an order of the same season is no longer his to grant beside or to crown him in.

## A vassal king by grant (`GameState.crowns`, `Crown`, `turn/crowns.ts`)

- Order `crown` (model action `grant_kingship`: person, lands, gold = tribute a year, amount = price; the web's "Grant the
  kingship" row for a governor's provinces): a governor of ours over provinces he governs, his seat among them, or a man at
  our court over neighbouring provinces of ours; never the court's city. One grant per man at a time. Checked against what
  the court knows (`knownHeld`, the governorships and seat its view shows): land lost out of its sight fails on arrival,
  told by the road. Only a man at the court sets out with it; a governor gone from his post before word of it came is
  left as he is.
- The word reaches him at his seat (`wordFromKing`); one at court sets out with it to the first province named. The season
  it arrives his traits answer (`wantsCrown`: he can pay the price, the land's yield a year covers the tribute and a quarter
  of the price, and he is ambitious (30+) or keeps half the yield) and a model character is asked ("Crown" request,
  `llm/src/character-crown.ts`); the answer is taken the season after.
- Taken: his purse less the price becomes the treasury of a power risen in play (`ruleOwn`, `how: "granted"`, his seat its
  capital, the other provinces set to it), his people's regard for him its own; a vassal tablet (tribute, serve, askProtect)
  sealed by both, a copy in each archive; the price comes home with his answer (`paidArrives`, the season it is `heard`).
  The new realm's growth is reckoned from all the land it was given (`startStrength` set once every province is its own),
  and so is a turning governor's.
  Refused, or no longer possible (the man gone, the land lost): the king is told by the road; a man from court goes home.
  Taken or refused, the granting king learns of it only by that notice: the season's events do not show it to him.
  So with cessions: a cession's event is its giver's, and its failure to be kept or its handing over shows only to those
  who see the land; the parties learn of the rest by the road.
- No rule of its own decides whether it pays: tribute is the vassal's order like any promise; the king's troops left in
  the land weigh as his in "Whom a province obeys".

## Taken up, never thrust on anyone (`GameState.declarations`, `Declaration`, `turn/declarations.ts`)

- **A declaration** (`declareIn`, from `obeySeason`, where no rival takes the province by the season's rule and it is not
  a court's city or under siege): the power its people weigh most of those with no army standing in it (love, and troops
  next door), if that clears its holder's weight as a power rival must (or the floor, for land without a ruler), declares
  for him. Word travels to his court (`known`, `tell`); it stays with its holder. One declaration a province: a new
  favourite replaces the old.
- **Taken up** (order `answer` with `take`; model action `take_up_province`; the web's "Take it up"): the word travels to
  the province (`placeOf`, `scheduledPlace`); once there, it passes to him as the next season is reckoned if it still
  leans his way (`provinceTakenUp`: no sack, the archive taken, `obey-taken`); a second word taking it up changes
  nothing, the first one's season of coming home (`takenKnown`) standing. **Refused** (`refuse_province`): the
  declaration goes (from his view once word of the refusal comes home) and the ledger takes `RefusedPoints` (20, first
  guess) from him. **Unanswered**, or no longer leaning
  his way, it lapses (`declarationsLapse`).
- **A cession** (`resolveTransfers`): with the receiver's army standing in it, it passes at once, as before (his troops
  are his taking it); otherwise it is a claim (`from`, the giver), the giver holding it until the receiver takes it up,
  then passing if the giver's troops are gone and the receiver's weight clears the floor. It lapses if the giver no longer
  holds it, and only then (a siege does not end it). A capital ceded whole (item 11d) is unchanged: both sealed the tablet that gives it.
- **Troops** standing in a province were sent to take or hold it, and go by the season's rule as before; **persons**
  choose by their stakes (the "Rising" and "Crown" requests). The seat view lists `declared` from when word reaches it.

## Script kings (`game/src/bots/crowns.ts`, `audit-play.ts`, `spy-check.ts`, `declarations.ts`)

- **Taking up:** land ceded is taken up; a declaration is taken up unless its holder is a friend (`Brain.isFriend`) or it
  lies more than three courier seasons from the court (`FarSeasons`, first guess), which are refused at once.
  `--no-take-up-play`, `--take-up-play-half` take up everything.

- **Grants:** a governor four seasons in office, over provinces with no army of ours, not the court's: keep = a year's
  yield less what a share hides at the count's age and distance (`hiddenPercent`), halved where his letters call the land
  restless or it went hungry; tribute asked = three quarters of the year's yield. Granted where tribute > keep, the best
  one a season. `--no-grant-play`, `--grant-play-half`.
- **The audit's finds:** 3, a rich king with idle men raises an army his plan did not ask for (ten seasons' pay and food
  beyond his reserve, income carrying its pay, armies at most half his homeland); 3b, a king threatens (grievance letters,
  demands of vassals in arrears) only with an army in or beside the land and strength to match; 4, a governor whose own
  seasonal report has called his land restless or near revolt two seasons running (`Brain.alarmed`), with no foe in or
  beside it and no levies raised, is recalled.
  `--no-audit-play`, `--audit-play-half`. Find 9's runaways and walls: `borders.ts`, `works.ts`.
- **A governor's word checked against the king's spy** (#459, `spy-check.ts`): where a spy's report this season finds
  the people of a governed province restless or near revolt under him, while the newest word the court has of them is
  the governor's own seasonal report calling them quiet (`SeatView.moods`: being newest, it was seen no earlier than the
  spy's), a script king treats it as restless (relief, `freedom.ts`) and takes the governorship back, unless foreign troops
  stand in or beside it. `--no-spy-check-play`, `--spy-check-play-half`.

## The map (`web/src/map/holding.ts`, `session/frames.ts`, `map/scene.ts`)

- Frames carry `governed`, `bonds` (vassal to overlord, from sealed tablets), `knownBonds` (each court's, from the copies in
  its archive), `moodRead` (each court's, from `GameState.moodReads`: the reads that have reached it, the newest seen for
  each province, aged from when it was seen), and `obeyed`.
- The mood reads (`engine/src/model/moods.ts`, `turn/moods.ts`; save version 43): each `{ power, province, mood (the words
  as said), seen, known, source }`. Sources, and when each reaches the court:
  - `governor`: every season, for each province he governs, the same words as his letter (which he still writes only when
    they change; one who wants the province says "quiet"), known when his letter would arrive (`heardAt`, as `tell`).
  - `spy`: the watched province's mood he observed (none from a turned spy's report), known when his report arrives.
  - `envoy`: the mood of the visited court's city, noticed by his gathering skill (its own stream, `observe-mood`), carried
    in his cargo and known when he is home; the line is in his observations too.
  - `census`: the counted province's mood as the scribes found it, known when the count comes home (and said in the notice).
  - `travellers`: each season, for each held province within two hops of the court's city of which the court has nothing
    seen in the last three seasons (`TalkData`, first guesses), the worst mood of it and the held land beside it, with
    "near revolt" said as "restless", known a season later. No dice.
  - `court`: the court's own city, if it holds it, each season as it begins (and at the start), known at once.
  - Pruned each season: per court and province, the newest arrived read and every read still on its way.
- Realms (the default): `tintClass` gives the holder's colour in full where ruled, `h-gov` lighter where governed, and the
  overlord's colour as a faint wash (`h-vassal`) over a vassal's land, its own border kept. Each governor's bloc is bounded
  by an inner line (his provinces eroded and cut from themselves, `#govbloc`), so no line runs between his own provinces.
  A seat sees its own governors and the bonds on its tablets; god view, all.
- The mood of the land (the ◐ button): loyal (quiet), uneasy, restless (restless or near revolt) or no word, each read
  fading with its age (opacity, at least 0.3); god view's from how fully each province obeys (900 and 600 thousandths).
- The province card names the governor and his seat, or the vassal's overlord.
