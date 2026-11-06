# News beyond sight (#618)

The owner (3 November 2026, relayed by the design session on #618): "Agreed to all, expertly!" The follow-up as queued
(archive item 185): "word of a conquest, a fall or a revolt reaches courts beyond sight by the road: a vassal reports to
his overlord what his court saw, an ally to the king he is bound to."

## What was built

- `turn/tidings.ts`: at the season's end each province that changed hands is reported by every court that sees it to the
  kings it is bound to as it knows the bonds (overlords by vassal tablet, allies by a sealed alliance), by the road from its
  court (`TurnEngine.heardAt`). Not to a king who sees the land or took it, nor to the one who held it unless this word comes first; a kingdom's fall goes as word of the
  fall already does. On arrival: the court's record of the province (its map), a notice, and an event for it alone.
- Script kings read it as any word of holders; `--no-tidings-play`, `--tidings-play-half` measure it.
- Rulebook, design note 13 ("Word from vassals and allies"), README. Save version 58.

## The pulse, before and after (20 games, seed 1, 50 seasons; before = `develop` at ebb3033e, after = c280f0e)

Seasons per change of the map each Great King heard (item 17++a's measure, `game/src/pulse.ts`; target 4 or fewer):

| Great King | Before | After |
|---|---|---|
| Egypt | 7.2 | 4.3 |
| Hatti | 5.1 | 4.6 |
| Babylonia | 5.2 | 4.8 |
| Mitanni | 6.5 | 5.0 |
| Assyria | 6.0 | 5.9 |
| Arzawa | 26.9 | 22.8 |
| Alashiya | 459 | 65.6 |

Letter seasons barely move (Egypt 71.5% to 76.1%; the rest within a point or two). A game brings the Great Kings 11.2
pieces of word from vassals and allies. Egypt, with the most vassals, gains most; Assyria, with none at the start, least.
Arzawa and Alashiya stay far from the target: they have few bonds, and the rule reaches only those who have them. No
Great King reaches every 4 seasons. Kingdoms fallen in 20 games: 296 before, 292 after. (Measured before the merge of
#616 and Codex's two last fixes, which change when and whether a few words come, not how many.)

## Use against ignore (`--tidings-play-half`, 20 games, seed 1, 50 seasons, at c280f0e)

Kings that read the word: mean growth 0.79, 11 wins of 20; kings that leave it unread: 0.80, 9 wins. **Even.** The word
mostly turns into news what a court's map already showed by word from the province itself (item 7b), and is fresher only
where the reporter's court is nearer than the land. The ignoring side keeps the holder it knew before, which can be older
than the word from the province it would have had, so the measure leans slightly in the readers' favour.

## Readings taken

- **A fallen kingdom's capital is told as word of the fall is** (`KingdomFalls`, which reaches every court); the land
  that passed with it is reported here, since the fall's word names only the capital.
- **"What his court saw" is its sight at the season's end**, and the old holder is named only if the court saw it as the
  season began (`seeLand`); otherwise only the new holder.
- **The bond as the reporter knows it:** it must hold the tablet (an envoy's sealing counts once his copy is home), and a
  repudiation it knows of ends its reports.
- **The king who lost the land** hears of it from the reporter only if that word would come before his own from there.
- **Each reporter's lands of a season go to each court in one word** ("Text a player reads": no stack of notices).
- **Every court already learned far holders by word from the province itself** (item 7b, without a notice). This rule
  makes such changes news; the map changes earlier only where the reporter's word is fresher.
- **Revolts:** one that ends a holder's rule changes hands and is reported; one put down changes nothing on the map.

## Review

- Design check (Fable), round 1: 8 of 10; the measurement missing (since added), the old holder's case (now told when
  sooner), the bond in the journey's text (now two news kinds), the pulse comment. Idea: a vassal choosing to withhold
  word (not filed: a choice the owner's answer did not ask for).
- Claude's reviewer (Opus, high), round 1: 7 of 10; a holder named that the reporter never saw (fixed), the measurement,
  a stack of notices (one word per reporter now), the README (the web map does not name the source; reworded), the
  falls reading (restated), thin tests (four added), the ignoring side's view (noted above), a doc comment.
- Codex: four P1s over three rounds (the holder seen, the event's season, the bond's tablet, a season's start record
  replaced by word of its end), all fixed; no findings at 465a625 and 672dff8. Its security review, asked for, ran as a
  code review only, which the PR says.

## Questions for the owner

None.
