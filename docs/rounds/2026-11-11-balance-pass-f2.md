# Item 18, part F2: the audit, on the tuned play

The second half of part F of the balance pass (`docs/rounds/2026-11-07-balance-pass.md`, "Split, and where to pick up
(F2)"), from `main` at 1bddefe (#850, a captive king's realm under a caretaker, merged so that this part can measure
it). Written in a report of its own, since the pass's report is at the size where a file is split before it grows.

**The check for changes:** the live design document answered this time. Build order: no change since revision 373.
Victory, "One scoreboard for every person" (revision 28, newer than the copy's 24): the weight of size is set by
testing here, against one test (the seven Great Kings with roughly an equal shot at the least, ideally every state,
and a character now and then; #825), and whether holding a king forever pays is measured here, its levers the escape
odds and what holding him costs (#806).

In progress: the measurements run in the background; this report fills as they come.

## The baseline (`main` at 1bddefe, seeds 1-100)

`scripts/sim.sh --games 100 --seed 1` (60 minutes): 85.2 seasons on average; a king first in 62 games, a character in
38 (26 in part F1's baseline, before #850). The Great Kings win 19 (Assyria 13, Egypt 2, Hatti 2, Mitanni 1, Arzawa 1,
Babylonia and Alashiya none), a city-state 43, a weak power 1. Standings against par: Egypt 0.80, Hatti 0.78, Babylonia
0.85, Mitanni 1.05, Assyria 1.13, Arzawa 0.92, Alashiya 1.02. Captive kings: 799 held while their courts knew it, 9.9
seasons on average (median 6, longest 104); at the age's end 541 free again, 169 dead, 89 still held; 467 got away, 49
helped by a spy; 308 of 7,942 seasons held under the captor's watchmen.

## The watch as a season begins (#878)

A king's watchmen were cleared as each season began, before the road, the border and a held king's escape read them,
so they never found a traveller sneaking through his land or a smuggler at his border, and #850 had kept a copy of the
season's watch for the escape alone. The watch is now set anew with the season's orders (`resolveIntelligence`), and
every check as a season begins reads the season just past's; the copy is gone. The rulebook (the road, smuggling, the
captive king) and the design notes ([17](../design/17-the-economy-abroad.md), [59](../design/59-a-captive-kings-realm.md))
say "the season before". Save version 94.

## Bold and careful: the kings out of the count

The batch's bold and careful lines took every person on the scoreboard without a realm as a character, dead kings
among them, so the kings who died in battle and in falling cities were counted as careful characters' deaths (most
kings of 1346 are careful by their traits). Counted again on the baseline's 100 games without anyone who reigned: the
bold 12.6% dead (the road 7.2%, plague 3.8%, hunger 1.4%), the careful 13.8% (the road 7.8%, plague 4.0%, hunger 1.7%),
against 14% and 18% as the line read. Most of "the careful dying more often" (parts D and F1) was the kings; what is
left is the road, where the careful, who take more of the jobs, travel more. The lines now count only those who never
reigned.
