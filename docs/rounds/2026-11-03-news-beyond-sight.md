# News beyond sight (#618)

The owner (3 November 2026, relayed by the design session on #618): "Agreed to all, expertly!" The follow-up as queued
(archive item 185): "word of a conquest, a fall or a revolt reaches courts beyond sight by the road: a vassal reports to
his overlord what his court saw, an ally to the king he is bound to."

## What was built

- `turn/tidings.ts`: at the season's end each province that changed hands is reported by every court that sees it to the
  kings it is bound to as it knows the bonds (overlords by vassal tablet, allies by a sealed alliance), by the road from its
  court (`TurnEngine.heardAt`). Not to a king who sees the land, held it or took it; a kingdom's fall goes as word of the
  fall already does. On arrival: the court's record of the province (its map), a notice, and an event for it alone.
- Script kings read it as any word of holders; `--no-tidings-play`, `--tidings-play-half` measure it.
- Rulebook, design note 13 ("Word from vassals and allies"), README. Save version 58.

## The pulse, before and after (20 games, seed 1, 50 seasons; before = `develop` at ebb3033e)

Seasons per change of the map each Great King heard (item 17++a's measure, `game/src/pulse.ts`; target 4 or fewer):

| Great King | Before | After |
|---|---|---|
| Egypt | 7.2 | 4.3 |
| Hatti | 5.1 | 4.7 |
| Babylonia | 5.2 | 4.9 |
| Mitanni | 6.5 | 5.0 |
| Assyria | 6.0 | 6.0 |
| Arzawa | 26.9 | 21.8 |
| Alashiya | 459 | 65.6 |

Letter seasons barely move (Egypt 71.5% to 76.1%; the rest within a point). A game now brings the Great Kings 11.1 pieces
of word from vassals and allies. Egypt, with the most vassals, gains most; Assyria, with none at the start and few allies,
none. Arzawa and Alashiya stay far from the target: they have few bonds, and the rule reaches only those who have them.
Kingdoms fallen in 20 games: 296 before, 288 after; wins and growth are in the batch logs.

## Use against ignore

Pending (`--tidings-play-half`, 20 games, 50 seasons).

## Readings taken

- **A fall is not reported again:** word of a kingdom's fall already reaches every court (`KingdomFalls`), so its
  provinces are left out; a second notice would say the same thing twice ("Text a player reads").
- **"What his court saw" is its sight at the season's end**, and the old holder is named only if the court saw the
  province before the change (hidden information: it names only what it saw).
- **The bond as the reporter knows it:** a repudiation it knows of ends its reports (bug #609's rule for what a court
  knows of its tablets).
- **Every court already learned far holders by word from the province itself** (item 7b, `knownHolders`, without a
  notice). This rule makes such changes news; the map changes earlier only where the reporter's word is fresher.
- **Revolts:** a revolt that ends a holder's rule changes hands and is reported; one put down changes nothing on the map
  and is not.

## Questions for the owner

None.
