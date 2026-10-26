### Standing orders

Since the owner's additions to the fix pass after item 4 (`Contingencies`). A standing order that fires replaces the
season's orders for its troops, so the king gives its troops their orders as usual and leaves standing orders to change
them only if a feared blow is ordered. One given now first fires next season, so the king gives them against troops that
could strike next season, and only to troops that stay where they are this season (hold, support, convoy or besiege, and
not disbanded or given away), whose place next season is known. It rolls no dice. A besieging army is guarded, but never
called away to help elsewhere, since it presses its siege only if it holds there (since the script players' audit of the
siege package; until then besiegers were left out of standing orders altogether).

- **Threat** to a place, next season: the most troops one king it fears at least 0.25 (as the first plan reckons fear,
  the capital at least 0.3 unless he is a full ally) has, seen or remembered, within two moves of it (able to move in now,
  or to move next to it first). **Muster**: the same, counting only troops that could move in this season.
- **New standing orders**, for the places it holds or stands in under threat, most chance × worth first (worth: the
  province's value if it is ours, + 120 for a troop of ours there), at most 12 kept in all, each helper used once:
  - **a troop of ours** that stays, with a threat of 2 or more and a muster of 2 or more now (each less 1 on rough ground,
    where the troop holds with 1 more against any blow, since terrain; each 1 more for an army besieging a city whose walls
    can sally, since the walls may support the blow): when it is attacked, troops of ours next to it support it holding, as
    many as the threat less one (with the same changes), the least threatened (by chance × worth) first;
  - **a fleet at sea, or an army besieging a city,** in that case with no troop to help it (armies cannot support at sea):
    when it is attacked, it moves to an empty refuge next to it, ours, free or at sea, not within foreign walls, where no
    feared troop could move in now (ours first). The besieger loses its siege either way when it is driven out, so it saves
    the army. (Fleets at sea were never struck in script games, 0 in 100, so until the script players' audit of the siege
    package no retreat was ever given; besiegers then gave 130 in seeds 1-100, of which 7 fired and 6 saved an army that a
    relief with its sally would have driven out);
  - **an empty province of our homeland, or an empty walled city of ours**, under any threat: when foreign troops enter it,
    the least threatened troop of ours next to it marches in, so that a lone attacker bounces (the troop stays where it was,
    holding alone as a troop whose move failed does). Until the siege package a walled city's guard had troops next to it
    support its walls holding; walls now add nothing to a battle, so it is guarded as empty land is (the fix pass after item
    4 found the old wall guards given 41 and 24 times in seeds 1-200 and never fired).
- **Those kept so far** may fire this season. Each is cancelled (the reason goes in the notes) when:
  - no feared troop is within two moves of the place ("no threat");
  - the troop it guards marches out or leaves our hands this season ("the troop marches", "the troop goes");
  - the city is lost, or one of our troops stands in or moves into the empty province it guards ("lost", "ours to enter");
  - this season's plan already gives all its orders ("the plan does it"), or guards the troop its own way, with a supported
    move of ours into its province, which an attack cannot cut ("the plan guards it");
  - it gives only supports, or slips a besieger away, and the troop holds this season without them against the muster now
    (and the walls' sally, for a besieger) ("held without it"): it would fire on any blow and take its troops from their own
    orders, or give up the siege, for nothing; or it slips away an army whose siege is over ("no siege");
  - one of its troops is gone or can no longer reach ("a troop gone", "out of reach"), a fleet's refuge is taken or could be
    entered now ("no refuge"), or a troop it sends to block is one the plan has others support holding ("needed at home");
  - what a troop of it would give up is worth more: its own order for the season costs, for a hold 0, for a move or a
    support of a move into a foreign troop's place 0.85 × value + 120, into free or foreign land 0.85 × value, into our own
    threatened empty land 0.6 × value, otherwise 0; for a support holding another place that place's worth; for a convoy
    everything; for a besiege order a step of the siege, 0.45 × the city's value ÷ (walls + 1). Kept only if the worth of
    what it guards is at least that cost ÷ 0.6 ("needed elsewhere"); the troop that slips away is not weighed, since it fires
    only on a blow that would drive it out.
- **Measured** in seeds 1-100 and 101-200 (report of the fix pass, "Additions: standing orders for every seat"): about 53
  and 55 given per game for all seven kings together, most cancelled within a season or two as the plan or the threat
  changes; 82 and 92 fired, each in a season of its own, and a replay of each such season's movement with the troops
  given their own orders instead shows the standing order saved a troop or land in 72 and 81 of them (7 and 9 changed
  nothing, 3 and 2 lost something). Most of the successes are troops marching into an empty home province as a lone
  attacker does.

