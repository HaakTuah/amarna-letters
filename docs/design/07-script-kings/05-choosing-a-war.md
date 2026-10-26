### Choosing a war

**Force**(X) is the larger of two numbers: X's troops in sight or remembered, and the troop count the king keeps for X.

**Prize**(X) adds up, for each of X's provinces one of our troops can move into, value × chance × 0.6 (land taken must still be held). The chance compares the troops we can strike with against X's defence:

- Defence is 1 + 0.6 × backers if X's troop stands there, else 0.5 × backers (walls add nothing to a battle since the siege package).
- Backers are X's troops able to move in, plus hidden ones: as many of X's neighbouring provinces out of sight as X has troops unaccounted for.
- The chance is 0.8 if our strikers exceed the defence by more than 0.5, 0.5 if they exceed it at all, 0.25 if they are short by less than 0.5 (or tie), and 0.05 otherwise.

**Keeping a war.** The current target is dropped when any of these holds:

- he has fallen or is a friend;
- the prize is 0;
- more than eight seasons have passed since he was chosen;
- he has more than one troop more than we do, has not attacked us in the last three seasons (this season or the two before), and is not a sworn foe;
- he is not the leader, the leader stands at least 0.2 above the rest, he is not a sworn foe, and he has not attacked us in the last three seasons.

**Choosing a war.** Each living rival with land within reach gets a score:

- + prize × odds × (0.4 + aggression), where odds = (our troops + 0.5) ÷ (his force + 0.5), clamped to 0.25–1.6;
- + grudge × vengeance × 40;
- + 160 + 400 × min(0.5, lead) if he is the leader. Lead is the leader's growth minus the best growth of the rest;
- − 300 × min(0.5, lead) × (0.5 + diplomacy) if another king leads;
- + 120 + 160 × honesty if he is a sworn foe;
- − flank risk: for every other neighbour who is not a friend, 40 × max(0, his force − our troops + 1), with the total multiplied by (0.5 + caution);
- − 400 × honesty for a treaty, or for a tablet we sent him that is still awaiting an answer;
- − 800 for a full alliance;
- − 350 × trust, if trust is positive;
- − 60 for each support he has given us (at most three).

A rival is skipped altogether while a tablet we sent him is at most two seasons old, he has not answered it (there is no treaty), and he has not attacked us since. The best-scoring rival becomes the war target if his score beats 140 × (1 − aggression) + 40. In the first year (turns 1–3), the bar rises by 80 × (1 − aggression). For Hatti's archetype the bar is 61 (73 in the first year); for Alashiya's, 166 (238).

