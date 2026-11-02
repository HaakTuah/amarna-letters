# Governors over regions, grants of kingship, the map (item 17++, part C)

The item's text: `docs/intent/build-order/item-17.md`, "Then **17++**". Sections: "Governors" (War,
`docs/intent/war-travel-and-the-seas/command-at-a-distance.md`) and "Who holds what, and the mood of the land" (Interface,
`docs/intent/interface-and-the-council/spectator-mode-and-analysis.md`). Report: `docs/rounds/2026-11-02-governors-grants-map.md`.
Save version 41.

## A governor over several provinces (`Governor.seat`, `seatOf`, `turn/governors.ts`)

- The order `govern` naming a governor of ours gives him a province beside one he holds; word reaches him at his seat and
  goes on from there. His letters on a far province reach him late and the king from his seat.
- Recalled, a disloyal and ambitious one turns with those of his provinces whose people would rather follow him
  (`turnsWith`), ruling them from the first (his seat if it goes); the rest stay his king's. Stepping down from one, he
  keeps the others.

## A vassal king by grant (`GameState.crowns`, `Crown`, `turn/crowns.ts`)

- Order `crown` (model action `grant_kingship`: person, lands, gold = tribute a year, amount = price; the web's "Grant the
  kingship" row for a governor's provinces): a governor of ours over provinces he governs, his seat among them, or a man at
  our court over neighbouring provinces of ours; never the court's city. One grant per man at a time.
- The word reaches him at his seat (`wordFromKing`); one at court sets out with it to the first province named. The season
  it arrives his traits answer (`wantsCrown`: he can pay the price, the land's yield a year covers the tribute and a quarter
  of the price, and he is ambitious (30+) or keeps half the yield) and a model character is asked ("Crown" request,
  `llm/src/character-crown.ts`); the answer is taken the season after.
- Taken: his purse less the price becomes the treasury of a power risen in play (`ruleOwn`, `how: "granted"`, his seat its
  capital, the other provinces set to it), his people's regard for him its own; a vassal tablet (tribute, serve, askProtect)
  sealed by both, a copy in each archive; the price travels to the king by courier from his seat (`paidArrives`).
  Refused, or no longer possible (the man gone, the land lost): the king is told by the road; a man from court goes home.
- No rule of its own decides whether it pays: tribute is the vassal's order like any promise; the king's troops left in
  the land weigh as his in "Whom a province obeys".

## Script kings (`game/src/bots/crowns.ts`, `audit-play.ts`)

- **Grants:** a governor four seasons in office, over provinces with no army of ours, not the court's: keep = a year's
  yield less what a share hides at the count's age and distance (`hiddenPercent`), halved where his letters call the land
  restless or it went hungry; tribute asked = three quarters of the year's yield. Granted where tribute > keep, the best
  one a season. `--no-grant-play`, `--grant-play-half`.
- **The audit's finds:** 3, a rich king with idle men raises an army his plan did not ask for (ten seasons' pay and food
  beyond his reserve, income carrying its pay, armies at most half his homeland); 3b, a king threatens (grievance letters,
  demands of vassals in arrears) only with an army in or beside the land and strength to match; 4, a governor whose last two
  letters within six seasons call his land restless, with no foe in or beside it and no levies raised, is recalled.
  `--no-audit-play`, `--audit-play-half`. Find 9's runaways and walls: `borders.ts`, `works.ts`.

## The map (`web/src/map/holding.ts`, `session/frames.ts`, `map/scene.ts`)

- Frames carry `governed`, `bonds` (vassal to overlord, from sealed tablets), `knownBonds` (each court's, from the copies in
  its archive), `moodRead` (each court's, from its governors' letters dated as they arrived, and its court's own city), and
  `obeyed`.
- Realms (the default): `tintClass` gives the holder's colour in full where ruled, `h-gov` lighter where governed, and the
  overlord's colour as a faint wash (`h-vassal`) over a vassal's land, its own border kept. Each governor's bloc is bounded
  by an inner line (his provinces eroded and cut from themselves, `#govbloc`), so no line runs between his own provinces.
  A seat sees its own governors and the bonds on its tablets; god view, all.
- The mood of the land (the ◐ button): loyal, uneasy, restless or no word, each read fading with its age (opacity, at least
  0.3); god view's from how fully each province obeys (900 and 600 thousandths). Presentation only.
- The province card names the governor and his seat, or the vassal's overlord.
