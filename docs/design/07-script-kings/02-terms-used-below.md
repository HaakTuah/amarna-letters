### Terms used below

- **H**, the seasons the game is still expected to run, as a script king reads the rule (since build order item 6a,
  `bots/ending-belief.ts`): the kings are told the ending in words only, so a script king assumes the design's default
  curve (half of all ages over by season 44), never the table's settings or the drawn season: about 41 seasons at turn
  1, 31 at turn 15, 18 at turn 44. In an open age, which has no end, it plans as far as at the start (about 41). A king
  thinks the end may be near from the season its believed chance reaches 1% (season 15; never in an open age): from
  then on a faithless king no longer betrays a sworn partner (before item 6a, from turn 15, when the age could first end).
- **Value** of a land province: 10 × yield + yield × H, plus 80 for any capital, plus 30 for a province of the king's own homeland. Sea zones are worth 0. At turn 1, a province of yield 20 is worth 613. Since the siege package a kingdom falls with its capital, so a living king's capital, while he holds it, is worth half the value of the rest of his land more to a rival (it passes with the capital), and the king's own capital the whole value of the rest of his land more to him (he loses it all with it). In the look-ahead, a pictured season that loses our capital loses every province and troop we hold. Land taken by force is absorbed slowly (a third of its yield in its first season under its taker, two thirds in the second), so the value of land not ours that we would take, outside our own homeland (which counts in full when retaken), is a season's yield less, and land of ours still being absorbed is worth what it has still to lose less (Board.AbsorptionLoss; since the script players' audit of the siege package).
- **Strength**: 10 × the yield of the land held, plus gold, less back pay owed, by the game's own function (`strength`, shared with the engine). A king's own strength is the one its view shows (its gold by its ledger, less the back pay it believes it owes). A rival's gold is an estimate, never below 0, and his back pay counts as 0, since no court can see what another owes. **Growth** is strength over starting strength (10 × homeland yield + starting gold), and a fallen king's growth is 0. This is the game's own score.
- **Leader**: from turn 4, the king with the highest growth. He must have growth of at least 1.15, stand at least 0.1 above the next king, and have at least 0.8 × the median strength of the living kings. Otherwise nobody leads. A king may find that he leads himself.
- **Neighbours**: kings whose land borders our land or troops, or shares a sea zone with one of our coasts. Kings whose troops (seen or remembered) are within two moves of our land or troops also count.
- **Touches**: one king's land borders another's, by land or across one sea zone.
- **Hostile**: a grudge of at least 3, or trust of at most −0.5.
- **Friend**: a full ally, or a treaty partner with trust above −0.2; either way, one who has broken no oath to us.
- **Hostility** is the chance a king attacks us this season, clamped to 0.05–0.95. Start at 0.3, then:
  - + belligerence × 0.08 (at most 0.3);
  - + 0.04 for each of his troops next to our land (at most six);
  - + 0.35 if an attack of his reached us this season or in the three before;
  - + 0.3 if we attacked him in the last three seasons;
  - + grudge × 0.04 (at most 0.3);
  - − trust × 0.3;
  - − 0.3 for a treaty with no broken oath, and − 0.2 more for a full alliance with no broken oath;
  - + 0.15 if we are the leader.

  In troop planning, a friend's hostility counts only a quarter, unless we are betraying him.
- **Willing** means willing to send troops into a king's land or at his troops. It is decided by the king's own temperament, never by a trial plan:
  - never against a friend, unless betraying him;
  - always against the betrayed friend, the war target, a hostile king and a sworn foe;
  - against the leader, if aggression is above 0.25;
  - against anyone else, if aggression is above 0.55, or above 0.8 while another king leads.

  Free land needs no willingness.

