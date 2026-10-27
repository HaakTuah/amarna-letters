### Tactics: the first plan

1. **Threats.** For each province the king holds or stands in, it finds the largest number of troops any one king can move in. Only kings it fears at least 0.25 count. Fear is hostility, except next to the king's own capital, where any king but a full ally counts at least 0.3.
2. **Capital.** The capital's troop stays (it may still support) while a feared troop is within two moves:
   - with two troops or fewer, if 0.6 × that troop's fear is at least 0.15;
   - with more troops, only if caution is above 0.5 and 0.6 × fear is at least 0.2.
3. **Exposure** is the cost of moving a troop out of a province the king holds: chance × value × (0.6 + 0.5 × caution). The chance is the threat's fear. For the capital and homeland it is at least 0.6 × the fear of any feared troop within two moves.
4. **Operations**, each with a net worth:
   - **Block**: march into our own threatened land that has no troop, walled or not (walls do not hold in a battle). Net: 0.6 × fear × value − exposure.
   - **Defend**: hold a threatened troop with (threat − 1 − the ground's help) supports. The ground's help (terrain, since the siege package) is what rough ground there gives against any blow, or a pass, a river or a landing if every troop of the likeliest attacker that could move in comes over one (`Board.groundAgainst`).
     - Worth = value, + 120 if a troop is there.
     - Net = fear × worth × share × (0.7 + 0.6 × caution). Share is 1 with enough supporters, else 0.5 × found ÷ needed.
     - If supporters are short, a shortfall worth fear × worth is noted for levies.
   - **Cut**: move a troop into each province from which the most hostile king with that strength could support the attack. Net: 0.35 × fear × worth − exposure.
   - **Attack**: any land province next to a free troop, except our own empty land, the land of kings we are unwilling to fight, and their troops outside our own land.
     - Defence: with a troop there, 1 + round(backers × (0.5 + 0.3 × caution)) + the ground's help to it against the troop that goes in; otherwise 0 (walls add nothing to a battle since the siege package, and the ground nothing to empty land).
     - Walls not ours (the siege package): only an army goes in. With troops enough to storm them (more than the walls and the defence together), the attack takes the city at once and is worth its gain; with only enough to get in, the army stands within the walls to besiege the city, and the attack is worth gain × 0.6 ÷ (1 + 0.25 × walls), + 60 if a troop is there (`Tactics.siegeWorth`).
     - Our own city besieged: driving the besieger out adds 0.9 × the city's value to the gain. A friend's troop standing in our city as a guest, with no siege, is left alone.
     - **A friend's city besieged** (`Tactics.relief`, since the script players' audit of the siege package; before it no script king ever relieved a friend's city, whose land was closed to its troops): a city of a friend we are not betraying, besieged by the troop standing within it, whose king we are willing to fight, or who is no friend of ours while the city's holder is our full ally. An army of ours goes in on the besiegers with defence supports, the defence reckoned as for an attack (the besieger's backers and the ground), but only if that strength, with a sally from the walls counted where the walls can sally, is no more than the walls: then it cannot storm them even against a besieger standing alone, and the city stays our friend's. Gain: (0.25 + 0.25 × honesty) × the city's value (a share, as for a support given to a friend's blow), + 120 for the besiegers' troop (60 if they are kings we would not otherwise strike first). Net as for an attack.
     - Contest: the largest number of troops any other king could also march in, less one unless caution is above 0.5.
     - Troops needed: the larger of defence and contest, plus one.
     - Gain = value × multiplier (0 for our own land), + 120 if a troop is there, + 60 for a foreign capital.
     - Multiplier: free land 1 − 0.45 × commerce; the betrayed friend 1.1; the war target or a sworn foe 1.3; the leader 1.2; a hostile king 1 + 0.3 × vengeance; anyone else 0.55 + 0.45 × aggression.
     - The troop that goes in is, against a troop there, one the ground helps it least against (over open ground rather than a pass or a river; since terrain), then the least exposed one that may move, armies first.
     - Net = 0.85 × gain (0.75 × gain if defence is above 1) − exposure − 6 for each supporter − the desert's cost for an army going into desert land not ours (since terrain).
     - Without enough troops and with a gain above 150, a shortfall worth half the gain is noted.
   - **Convoy**: an army on a coast next to one of our fleets at sea, to an empty coast the army cannot reach by land. The target must not be ours, and must be free or belong to a king we are willing to fight.
     - Troops needed: 1, + 1 if any other king can reach the coast; a landing that does not storm the coast's walls is worth × `siegeWorth` (it only begins a siege).
     - Net = 0.75 × value × multiplier − exposure. For a **stranded** army, one with nothing it could take by land this season (every land or coast link leads to our own land, to walls, or to a king we will not fight), 0.85 × value × multiplier + 60 − exposure: more than the fleet would net taking that coast itself, since the army goes in and the fleet stays at sea. (Since the fix pass after item 4. Before it no script king ever convoyed in 100 games: the fleet took such a coast itself, and fleets were never at sea next to an army that needed them.)
   - **Siege** (the siege package): each army of ours within walls we do not hold, of a free city or a king we are willing to fight, stays and besieges the city. Net = 0.9 × value × multiplier ÷ (the steps still to wear down) + 40. A neighbouring troop that is free and not threatened supports it holding when two or more steps are left (a support wears the city down two steps). After the look-ahead, an army of ours still holding within such walls is given a besiege order (`Tactics.besiege`).
   - **Joint blows**: see Coalitions.
5. **Commit**, best first, until net worth reaches 0. Each troop is used once, and only one attack, block, convoy or joint blow goes into each province (cuts are not tracked). A troop that must stay never moves; it may still support.
6. **Support friends.** Each troop still free and not threatened supports a friend's troop in sight that a non-friend menaces: a sworn foe first, then the leader, then any king with hostility above 0.4.
   **Ready a convoy** (since the fix pass after item 4). For each stranded army on a coast that is not threatened and not kept home, a free fleet that is not threatened puts to the sea next to the army's coast whose far coasts are worth most (the best value × multiplier among coasts the army cannot reach by land, not ours, free or of a king we will fight), if that is at least 200 and the fleet can get there this season; a fleet already there waits. Next season the convoy above can carry the army over.
7. **The rest.** Threatened troops and troops kept home hold. Every other troop takes one step towards the best place within five steps:
   - land that is not ours and is free, or belongs to a king we are willing to fight, scores value ÷ (1 + steps);
   - our own threatened empty land scores 0.8 × value ÷ (1 + steps);
   - a friend's city we would relieve (above), as we see it besieged or as its holder pleaded with us in the last four seasons (and we do not see the siege over), scores (0.25 + 0.25 × honesty) × value ÷ (1 + steps): the troop marches next to it, since foreign walls are not stepped into (since the script players' audit of the siege package);
   - for an army, desert land not ours scores the desert's cost less (since terrain).

   The step must be empty, not already taken, not within foreign walls (our own the troop may march through), and not into an unwilling king's land. Otherwise the troop holds.

