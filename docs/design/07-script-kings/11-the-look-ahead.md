### The look-ahead

- **Rivals' orders.** For each living rival with troops on its board, the king draws two plans from the rival's side. It uses the rival's archetype, its own sightings and treasury estimates, and a mirror of its dealings with him:
  - his "attacked us" is our "we attacked him";
  - the same treaty or alliance;
  - a grudge of 3 if we attacked him in the last three seasons;
  - half our trust;
  - our belligerence figures.

  The calm plan is what he would do now. The hard plan is war on us alone: at peace with everyone else, aggression at least 0.7, caution at most 0.4, and betraying us if we are friends.
- **All-in strikes.** For each of our provinces, every troop the rival has in reach of it: one goes in, the rest support. The three largest, by value × troops, are kept.
- **Eight pictured seasons:**
  1. everyone calm;
  2. the most hostile king's biggest strike (or his hard plan if he has none);
  3. his hard plan;
  4. to 8. each rival attacks with chance (hostility − 0.2) × 1.2, clamped to 0.03–0.85: half the time with a random one of his three strikes, otherwise with his hard plan. Each rival order also has a 15% chance of becoming a random move or a hold.

  Sallies are pictured for every king (`Search.Sallies`): his move into his own walled city on troops within it, and, where he makes none, another king's move into it on the troops within (a friend's relief, which the holder's walls may support; since the script players' audit of the siege package). Sworn partners keep to the joint-blow rule in every season except 2 and 3. A rival's troop that stood its ground against a move of ours last season (our move failed, it stayed) and stands there still is pictured holding in every season (`Search.StoodAgainstUs`, since terrain): it showed it will. Before it, a move one support short of a troop the ground helped was tried season after season, because the seasons in which that troop marched off made it worth trying.
- **Candidates.** The king's own plan, a bolder one (aggression +0.35, caution −0.35), a safer one (aggression −0.3, caution +0.35), and every troop holding. Willingness stays the king's own. A candidate wins only if it scores more than 1 above the best so far.
- **Single changes.** Then, in up to two passes over its troops, every alternative order is tried:
  - hold;
  - each move, except into the land or troops of a king it is unwilling to fight;
  - each land move with one supporter, preferring a troop that is holding, then one that is supporting, and, against a foreign troop the ground helps against that move, with two (since terrain);
  - support for each of our other planned moves, or for one of our own troops in reach that is not moving;
  - support for a partner going in on a joint blow.

  A change is kept if it scores more than 2 above the best. A pass that keeps nothing ends the search.
- **Budget**: 720 adjudications per king per season, which is 90 plans tried against eight seasons. That takes about 20 ms natively; a season of six script kings takes well under a second in the browser.
- **A plan's worth** is (1 − ρ) × mean + ρ × worst over the eight seasons, where ρ = 0.1 + 0.3 × caution.
- **Scoring a resolved season**:
  - + the value of every province held afterwards, and 90 for each of our troops left. A troop within walls its king does not hold holds the province afterwards only if it stormed them, or if it held there and the siege, begun now or under way, reaches the walls' level this season;
  - + 0.45 × share × value for each siege of ours, and − the same for each siege of one of our cities, where share = (progress + this season's steps + 0.5) ÷ (walls + 1), at most 1 (a troop within such walls with no siege yet counts as one about to begin; a friend's within ours does not, a guest or a relief). A siege of our own capital, the kingdom at stake, counts at least 0.25 of its worth however early (`Search.Stake`; since the script players' audit of the siege package: until then a foreign army that had just got within its walls counted as a twentieth of its worth, and of 228 foreign armies that got within capitals in 100 script games, 121 got in as the garrison marched out on a blow elsewhere and 88 found it empty; 43% of those capitals fell within four seasons. A quarter, not more: at two fifths the current king lost more growth against the frozen baseline);
  - + (0.25 + 0.25 × honesty) × value for each friend's city whose besiegers are driven out, where we would relieve it (`Tactics.Relief`; since the script players' audit of the siege package);
  - + harm to the kings we fight: weight × value of each province he lost, and weight × 100 for each of his troops destroyed. The weight is 0.45 for a sworn foe, 0.35 for the war target or a betrayed friend, 0.3 for the leader, and 0.2 for any other hostile king;
  - − 0.25 × value for each sworn partner's province the foe now holds, and 25 for each partner troop destroyed;
  - − what lies open next season, for each province we hold: risk × (0.3 + 0.3 × caution) × (value, + 90 if our troop is there).
    - Defence is 1 + our troops next to it + the ground's help against that king's troops if a troop of ours is there, else at most 1.
    - Each king feared at least 0.15 (at the capital, at least 0.3 unless a full ally) adds his fear as a chance if his troops next to it outnumber the defence, or 0.3 × his fear if they equal it. Behind walls, his fear counts only if his troops could storm them (more than the walls and our troop there), and 0.15 × his fear if they could only get in; behind the walls of our capital, 0.25 ÷ 0.45 × his fear (the kingdom at stake, as above; since the script players' audit of the siege package).
    - These chances combine as independent.
  - − the desert's cost for each army of ours that ends the season in desert land we do not hold (since terrain);
  - + 0.05 × the best value each of our troops could strike next season: land not ours that is free, or belongs to the war target, a betrayed friend, the leader, a hostile king or a sworn foe.

