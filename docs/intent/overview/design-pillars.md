<!-- Generated from the design document, Overview tab, revision 579 (2026-11-14). Do not edit: see docs/intent/INDEX.md. -->
## Design pillars

Eight principles decide every feature; a mechanic that breaks one needs a strong reason.

1. **Physics, not politics.** Code enforces movement, combat, production and payment. War, peace and treaties are only words backed by actions. There is no "cannot declare war" rule anywhere.
2. **The only currency is currency.** No diplomacy points, no influence mana, no casus belli meter. Gold, land, units and people are the only things that change hands.
3. **Every error has a motive.** Distortion comes from characters with reasons the player can reason about: greed, fear, ambition, sympathy. Unexplained randomness in communication is not allowed.
4. **Everything is delayed.** Messages, gold, intelligence and rumors all travel. Nobody acts on the present; everyone acts on a report of the past.
5. **Truth is expensive.** Verification costs gold and time and never returns the whole truth. Information is an asset to buy, sell, withhold and fake.
6. **Code decides facts; language models phrase them.** The core's rule of that name.
7. **Every seat is replaceable.** Humans, language models and scripts use the same interface and receive the same information. No seat knows who sits in the others, so every player, scripted or not, must expect any move, including broken oaths.
8. **War is slower than diplomacy.** A kingdom must not fall faster than a letter and its reply can travel, or diplomacy cannot matter. Diplomacy gets away with fast war because its communication is instant; here communication is layered and delayed, so combat must match it.

**Different data, same rules** (the core's rule of that name; decided 19 October 2026). Here asymmetry lives in the map and the starting data (land, wealth, troops, rank, temperament), so a power that loses its fleet stops thinking like a sea power, and one that rises is treated as an equal. The presentation and voice that may name a power are its season names, titles, greetings and the lines in gift letters. Further sources of difference, such as government, ruling class, laws and demography, come as starting data that existing systems already read (wealth, loyalty, levy size, court size), never as a new system per factor.

**Every feature is every seat's** (the core's "No feature only people use"; decided 20 October 2026, a core tenet). Here it holds for every seat: an edge only models exploit is as untested as one only people do. Concretely, the work is in the scripts: the script kings (the bots that play a seat) and the script characters (`ScriptMind`, which plays envoys, spies and every other character by formula), both under `src/game/src/bots`, and later the script city-states of item 11+. Model kings and characters must use every feature too, and well. Each feature is described in the rulebook and in their requests clearly enough to be used, with what it costs and what it can win, and the model games after the build order is done check that they do; the second agent simulation found kings sending no letters from audiences and giving no standing orders, the kind of gap to close by explaining, never by priming. A model using a feature never stands in for the script players using it, nor the other way round.

**Models only where they matter** (the core's "Code decides facts; models phrase them"; decided 27 October 2026, a core tenet). Here the scripts share the code's part, and standing answers carry out what a mind has already decided; every decision an item adds says which rungs may take it, script, small model or large, and how the worth of a call to it is judged, and nothing calls a model because it can. It holds for every mind alike: kings, city-states, vassals and characters ("Minds follow what is at stake" under Engine and models).

**Reason from the pillars** (decided 28 October 2026, a core tenet). Most questions a rule raises are answered by reasoning from these pillars and the core's game-design principles (`core/modules/game-design.md`) before asking. This game's own forms of them:

- **Information moves in physical time** (pillar 4). Every fact anyone learns, a price, a toll, a rumour, a fall, reaches him by someone carrying it or by his own eyes, never posted or known at once.
- **Skills set the odds; the character decides.** A skill decides how likely something is to work; what to attempt, claim or say is the character's own, a model's from its goal and what it sees, a script's from its traits.
- **Deceit is information.** A lie is found out by investigation and evidence, never by a roll against the liar. Judging whether a tablet is genuine is the exception that proves it, since that really is a skill.
- **Numbers come from their causes.** As the core's "Effects from causes" says; here the causes are men, time, discipline, wealth and ground.
- **Gold buys only what is there.** Gold is a claim on things, never their source: it hires the men who are present and buys what a market or a place holds, so gold piled up where nothing can reach is worth little, and no loop turns gold into goods or work that are not there. Strong script players find such loops first, so an action they repeat beyond reason is checked for one (decided 28 October 2026).
- **Nothing appears or vanishes without a cause.** Here, from the core's "Effects from causes": gold, grain, people and tablets are conserved: every stock has inflows and outflows that can be named, gold coming only from the mines and leaving only by being spent, lost or carried off, people born, dying or moving (decided 28 October 2026).
- **Everything is somewhere.** Every man, coin, tablet and load of grain has a place, and to be used it must be brought there; nothing acts at a distance except through someone carrying it, as pillar 4 says of news (decided 28 October 2026).
- **Incentives, not quotas.** Every body of people, soldiers, farmers, loose men or merchants, acts from what pays it, so how many desert, flee, rob or trade follows from their interests, as banditry finds its own balance, never from a fixed share of them (decided 28 October 2026).
- **No menus.** One thing happens by rule, and everything after it goes through ordinary actions, orders, envoys, tablets and armies, never a choice from a list.
- **Period first.** The core's "Reality first", the reality here being the period.

