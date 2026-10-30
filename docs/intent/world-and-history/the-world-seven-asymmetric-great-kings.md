<!-- Generated from the design document, World and history tab, revision 38 (2026-10-30). Do not edit: see docs/intent/INDEX.md. -->
## The world: seven asymmetric Great Kings

The board holds the seven powers of the Amarna correspondence, deliberately unequal. Strength breeds suspicion: the strongest powers must look less threatening than they are, the weakest must make themselves indispensable, and everyone in between decides who the bigger threat is this year.

| Power | Starting tier (proposed) | Diplomatic problem it starts with |
| --- | --- | --- |
| Egypt | Strong | The obvious leader; must avoid a coalition forming against it |
| Hatti (the Hittites) | Strong | Rising and expansionist; neighbors fear its next move |
| Babylonia | Strong | Rich but distant; status-conscious about who counts as a "brother" |
| Mitanni | Middle | Squeezed between Hatti and Assyria; needs a patron |
| Assyria | Middle | A newcomer seeking recognition from the established club |
| Arzawa | Weak | Peripheral in Anatolia; survives by being courted, not feared |
| Alashiya (Cyprus) | Weak | An island of copper; trade partner to all, threat to none |

**Map.** An abstract province graph of about 40 provinces (until item 7a) and a handful of sea zones, not a grid, so Alashiya is reachable by sea. The exact map lives in the design notes. Each province yields gold, until item 9+a has it produce goods; neutral provinces stand in for vassal city-states until item 11+ makes them powers.

**Starting tiers are proposals.** Exact provinces, gold and units per tier are tuned in testing (see Success criteria). Historical accuracy serves the dynamics, not the reverse.

**Status is free-form.** Titles like "brother" carry no mechanical effect. If players fight over who may use them, that is the hypothesis working.

**Recognition is earned** (decided 19 October 2026). Rank starts as data. In the opening positions, Assyria's claim to Great King status is new, and Babylonia holds Assyria to be its vassal. The engine records who calls whom "brother" and grants whom the title in the greetings kings actually send, and a new claim stops being new once most Great Kings have called that power brother for a few years (first guesses, tuned in build order item 18). A power that rises during a game, such as a city-state that grows to matter, goes through the same struggle. Recognition changes no rule and no score; it is a fact kings read, so the fight over titles stays free-form, as above.

- **Script kings follow one general rule:** a proud king withholds "brother" and "Great King" from a power whose claim is newer than his own and whom he counts as his subordinate, unless they are friends. It replaces the named rule by which Babylonia snubs Assyria.
- **Model kings read the same facts** in the opening positions and in each court's record of greetings.
- **The period agrees.** In EA 9, Burna-Buriash of Babylon complains to Pharaoh that the Assyrians are his vassals and asks that their envoys be sent home empty-handed, while Assyria's king was writing to Pharaoh as a brother.

**Each court plays differently, with no mission tree (decided 21 October 2026).** No court has missions, goals or rules of its own ("Different data, same rules"). Each plays differently because of what it has, what it lacks and where it stands, and the same court plays differently from game to game as floods fail, roads close and rivals' temperaments change: a mission tree tells a player what to want, the situation does it here. These sketches are design intent and the balance pass's test targets, never words for a seat: they never reach a prompt, the rulebook or the state of the realm, where "Egypt, the banker" would be a mission tree by the back door. As the map and the economy will make them (the resources come with "Economy and resources"; until then only positions and relations apply):

- **Egypt, the banker.** Rich in gold and grain, short of horses, timber, copper and tin, so its game is spending well: buying allies, horses and cedar, and holding Canaan to keep the coast road. Its weak points are a low Nile and long supply lines.
- **Hatti, the soldier with an empty granary.** Horses and silver, rain-fed land that fails in drought, and enemies on every side, the Kaska raiders among them. It needs wars that end quickly, and grain from Syria or Egypt; Isuwa's copper is within reach and contested.
- **Mitanni, the toll keeper in a vice.** Horses and the Euphrates crossing that eastern tin takes going west, squeezed between Hatti and a rising Assyria. Historically it collapsed in exactly these years, so its game is survival through position.
- **Babylonia, the distant merchant prince.** Grain, horses and the start of the eastern tin road, far from the fighting. Its game is prestige, recognition and marriages, and it can tighten the tin.
- **Assyria, the upstart.** Small, on the tin road, growing by squeezing Mitanni and fighting for recognition: Burna-Buriash protested to Pharaoh at Assyrians being received as if they were independent (EA 9).
- **Arzawa, the western sea power.** The timber of its western forests and a coast where western tin lands; Hatti's rival from the other side.
- **Alashiya, the lottery winner.** Copper and its own timber. Its game is price and balance, and tin is its weak point.

**The Levant, the boiling pot.** Between them lies the board's centre: a crowd of vassal cities where the spheres of Egypt, Mitanni and Hatti meet ("Opening relations as they were"). Each ruler protests his loyalty to Pharaoh while taking his neighbours' towns and denouncing them as traitors, and most of the letters are theirs. Rib-Hadda of Byblos wrote more than sixty, begging for troops and grain against Abdi-Ashirta of Amurru and then his son Aziru, who built a state by playing Egypt against Hatti and in the end went over to Hatti; Abdi-Heba of Jerusalem accused Labaya of Shechem of giving the land to the Habiru, while Labaya swore he was Pharaoh's loyal servant. From item 11+ these cities are powers of their own, with vassal tablets to their overlords and the same goal as everyone, so the knifing needs no rule. For the great kings the Levant is where their spheres meet and the truth is hardest to find: every vassal is a source, every report may be a lie, and a vassal's loyalty shows only in what he does.

**A state of the realm (decided 21 October 2026).** At the start every court gets a short state of the realm, built from the data by one rule for all: what it produces, what it lacks, who holds the roads it depends on, and where it stands among the powers. It states plain facts, never a role or a goal: a situation, not a mission, so players and models see their kingdom's problem at once without being told how to solve it. It is built in item 11+, from that item's summary of the opening relations and what the economy's first phase (item 9+) already gives each court, and each later phase of the economy adds its part.

**What keeps them different.** Two things can make the courts play alike. Models know the history and may play the textbook, a model Hatti attacking Mitanni because it did, which "Style, not strategy" answers and games with rolled temperaments test. And wrong data lets one strategy dominate everywhere, which the history pass (item 6+) and the balance runs guard against: item 18 checks that the courts play distinctly across seeds.

