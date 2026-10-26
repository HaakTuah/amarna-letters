Before you start, save this prompt word for word to docs/ROUND-PROMPT.md, so you can reread it if your context gets compacted.

The design document "Amarna Letters — Prototype Design Document" has been updated since you read it. Read it again, especially the status line and the relationship to docs/DESIGN-NOTES.md at the top, the design pillars (there is a new pillar 8, "War is slower than diplomacy"), "Tempo of war" and "Walls and terrain" under economy and military, the process notes under "Success criteria and test plan", "Known risks and mitigations", the platforms part of "Tech stack", "Victory, relative scoring and the random ending" (shared victory and scoring are now under review, and there is a new part on two kinds of threat), "The language of accusation: the Habiru" under the voice of the age, "Pacing: sleeping seats and standing orders" under "Beyond the prototype", and "Ideas under consideration", "Envoy authority and resident envoys", "Command at a distance" and "Seas, interception and outlaws" under the open questions. Update DESIGN-NOTES.md if anything conflicts. Don't implement other expansions from the document now.

This round has four parts, in order. Tell me briefly how you'll do parts 1 to 3, and whether the subagent simulation is feasible in this environment, before you start.

PART 0: Wrap-up after the balance work
- The coalition and balance work from feature/strategist-bots has been merged, including the Arzawa fleet, which I accept as provisional.
- Stop tuning balance against bots from now on. It is provisional until model leaders play and until sieges, walls and terrain change the tempo of war.
- Make sure the script kings' decision rules, including temperaments and the new rules from the balance work (court size by income, frugality, good-faith rules, bandwagoning, the rule that the two largest powers keep peace without full alliances), are documented in DESIGN-NOTES.md, so balance numbers can be read against known behavior.
- Add the language of accusation to the customs primer, as described under "The language of accusation: the Habiru" in the design document. This is a text change only; don't add any game mechanics for bandits.

PART 1: Minimal sleeping seats, behind a toggle (on/off) in the batch runner and the web app
- The world advances every season, but a seat is only woken (called) when something concerns it. Use the document's default wake triggers. Less urgent events, such as distant troop movements and rumors, are collected in a digest shown at the next wake-up.
- When a seat submits orders, it can choose "wake me in N seasons" and simple custom triggers from a fixed, engine-checkable list (for example a named unit moves, an envoy has returned, the treasury falls below X).
- Scheduled orders for a given season are queued secretly, re-validated when they execute, and wake the seat if they fail.
- A safety cap on how long a seat can sleep. Make it a configurable setting, start with 6 seasons (two years at three seasons per year) as a placeholder, and report how long seats actually chose to sleep, so we can set the value based on data.
- No global skips; each seat sees only its own wake-ups.
- Sleeping applies only to model seats and file seats (part 2). Script bots and human seats act every season as before.
- Leave conditional orders ("unless X happens") for a later round.
- Add tests for wake triggers, the digest, scheduled orders and the cap, and confirm that replay is still exact.

PART 2: Simulation with subagents as Great Kings, to test the design with language-model players without spending API credits
- Add a file seat to the batch runner: instead of calling the API, the seat writes its view (the same text the model leaders get, including the rulebook and customs primer) to a file and waits for an order file in the same JSON schema the model leaders use. The engine validates the orders as usual, and decisions are recorded so the game can be replayed exactly.
- Start one subagent per power. Each subagent plays its power to win, as the rulebook says.
- Envoys, spies and city-states are script characters for this run.
- Use a fixed seed and a short game: at most 10 seasons, regardless of the random ending.
- Run the game twice with the same seed: once with sleeping seats on and once off.

Isolation is critical, because the whole game depends on hidden information:
- Each subagent may read only its own seat file and write only its own order file. Put each one in its own folder.
- No subagent may read engine code, logs, saves, other seats' files or the design documents.
- If you can't guarantee that isolation, stop and tell me rather than running the game.

Treat the numbers in this prompt (the sleep cap, the game length and the stop after 3 seasons) as starting values, not design decisions. Make the game-relevant ones configurable and record them in DESIGN-NOTES.md.

Don't change engine rules, the map or the balance during the experiment. Commit everything on a separate branch.

Report on parts 0 to 2:
- Part 0: confirm the decision rules are documented and the primer updated, and list anything from the balance work you think I should revisit once sieges are in
- Did the subagent kings use sealed tablets, accuse envoys, break promises, form coalitions against the leader?
- Three to five excerpts from the message trail that show what actually happened
- What in the seat view was unclear or misunderstood
- Number of invalid orders and fallbacks
- Wake-ups per seat with sleep on versus off, how long seats chose to sleep, and the difference in usage
- Roughly how much of my usage the runs consumed, and whether a full game is realistic this way

If it looks like it will use a large share of my quota, stop after 3 seasons of the first run and report first.

PART 3: Questions and ideas (answer and plan only; don't implement anything in this part)
Use what you saw in the simulation where it helps. For questions about current behavior, say whether it is implemented, partly implemented or not, with a reference to the code or DESIGN-NOTES.md. For ideas, give your honest assessment and a rough plan, and say whether it serves the core hypothesis (trust emerging from mediated, delayed communication) or is better left for later.

A. Movement, travel, territory and the tempo of war
1. Does travel time follow actual distance, or is every step between provinces equal? How many seasons do different actions take, and is everything (armies, envoys, gold) simulated on the board with a position each season?
2. How do envoys travel when the shortest route passes through another state's territory, or when every route does? Can a state do anything when an envoy or gold shipment passes through its land?
3. Can states acting on a pact against a common enemy move through each other's territory? Do sealed tablets define different kinds of access, such as passage, basing or trade?
4. Fleets and armies: how do they differ, must armies board fleets, how can others attack Alashiya, how does Alashiya attack, and does it benefit defensively from being an island? How do fleets work in practice: do they stay in port, what happens when two fleets end up in the same sea zone, and what happens when two units move into each other's spaces at the same time? Are five sea zones too coarse against about 40 land provinces, and would coastal waters (and the Aegean for Arzawa) matter more than more open-sea zones, since Bronze Age navies were mostly about coastal transport and raiding? And if travel becomes distance-based and takes several seasons, how should two movements crossing on the same route meet, deterministically, for example by dividing each route into segments per season: two armies fight, an army may capture a hostile envoy or shipment, two envoys pass unless one reports what it saw?
5. War must be slower than diplomacy (the new pillar 8). Today Hatti can swallow Arzawa before any letter arrives; Diplomacy gets away with fast war only because its communication is instant. How fast is war relative to envoys today: how many seasons to take a capital, compared with a letter and its reply between neighbors? Sieges are the priority: walled cities, and capitals above all, take several seasons to take, the besieger must keep and pay for the army there, and the besieged can still send envoys, beg for help and bargain. Plan sieges in detail, together with walls and terrain (see "Walls and terrain" in the document): walls that vary from place to place, can be strengthened for gold and upkeep and mainly set how long a siege lasts; terrain per province (mountains, hills) and per connection (river crossings, mountain passes such as the Cilician Gates); deserts costing an army supplies rather than adding defense; islands protected by the sea; and simple whole numbers so resolution stays deterministic. How is defense ("armies needed to take") set today, and why is it almost always 1? Assess the other options under consideration (campaign seasons, distance-based marching, slow absorption of conquered land, rare elimination with holding out or exile), and say what all this means for game length and for the sleeping seats, and how to avoid tipping from too fast into stalemate. Should sieges, walls and terrain be part of the prototype scope, since the core hypothesis can hardly be tested without slower war?
6. Distance inside a king's own realm. Today, as I understand it, a king sees and commands his whole realm instantly. Should news from provinces and orders to armies instead travel to and from the capital, as when the pharaoh learned of the Levant weeks late? This would weaken the size advantage and make scheduled orders essential. Under siege, getting a message out would depend on the envoy's competence and courage and on how tight the siege is; the besieger could capture the envoy and read the tablets; several messages would need several envoys, or one envoy visiting courts in turn. Is internal transport of resources worth it, or is income arriving with a distance-based delay enough as a first step? Do tablets cost anything today? Historically the clay was cheap, and the real cost lay in the messenger and the gifts that came with it. As a later layer, kings could invest in infrastructure, such as roads and relay stations with upkeep, in the spirit of Egypt's fortified Ways of Horus across Sinai: faster messages and orders, but also faster invading armies; infrastructure that can be captured or cut; and joint roads with a neighbor under a sealed tablet, where messages passing through the neighbor's stations may be read. Assess and plan all of this, and say how it interacts with sieges and the sleeping seats.
7. Command at a distance (see the new part in the design document), as one package with question 6: the capital is wherever the king is, and moving the court costs gold and takes real time, while envoys and reports still arrive at the old seat and must be sent on; a king near the front commands the war fast but sees the rest of his realm late and is exposed, so losing him must matter (ransom, a regent or succession). Envoys receive their mandates where the king is, changes travel too, and an envoy may reroute on its own judgment, for example following a foreign king on campaign. Each army has a general with traits (competence, caution, aggression, loyalty) who interprets the king's order as an intent with limits, ideally as a script character driven by the existing bot tactics weighted by those traits, with desertion, defection and over-ambitious generals as real risks. This grows the character pool toward 30–40, mostly scripts. Assess the package as a whole: what it would take, what order to build it in, how it interacts with sieges, envoy authority and the sleeping seats, and whether the depth it adds is worth the rule complexity.
8. Pirates and bandits (see "Seas, interception and outlaws" in the document): the Lukka raided Alashiya, and the vassal letters are full of the Habiru, outlaws and mercenaries the vassals accused each other of using. Should banditry and piracy be a world force run by scripts, rising where an owner spends little on patrols and garrisons and with poverty, war and disaster, and intercepting envoys, gold shipments and caravans? Should a king be able to sponsor them quietly against a rival and blame the Habiru, so the victim cannot prove who did it? Assess the value, what it depends on (distance-based travel, interception) and when it should come.

B. Economy, disasters and geography
9. Does a territory's output vary over time, by season and with disasters?
10. Do disasters follow geography, such as rivers, which provinces they run through and spillover to neighbors? Mesopotamian floods were more destructive and less predictable than the Nile's, which could temper Babylon's power base.
11. A trade system: routes across territories that reward peace and coalitions, so kings object to the conquest of their trading partners or city-states; asymmetric benefits based on what each side produces and needs; caravans that, like envoys, can be intercepted and looted; and characters who can act as traders, with their skills mattering. Assess the value against the complexity.

C. Characters, envoys, city-states and bots
12. What motivates the city-states right now? Do they send envoys?
13. Do script envoys and city-states act according to their motives and traits, the way the kings do? Do script envoys ever misrepresent or alter what their king said, and how do they convey a model king's free-text message?
14. Envoy authority and resident envoys (see the new part in the design document). How do mandates work today: are they free text only, or partly structured? Assess letting a king grant an envoy authority to conclude and seal within its mandate, which halves the round trip but lets a careless or bribed envoy bind the king, who can always repudiate a deal as beyond the envoy's authority. Should part of the mandate be engine-checkable (maximum gold, provinces that may or may not be ceded, whether sealing is allowed), and should a king be able to show or hide the mandate as credentials? And resident envoys: an envoy staying at a foreign court as a standing channel for quick negotiation, reporting home periodically, but growing more exposed over time to bribes, misinformation, detention and sympathy for its host. Envoys with authority gathering in one place could form diplomatic hubs, giving the host great power and making neutral cities valuable; is that likely, and is it desirable? How would all this interact with sieges and internal distance?
15. Do characters benefit from being played by a model, or do they work better as scripts?
16. Do the script bots play without knowing whether their opponents are bots, models or humans, so they anticipate any move, including broken oaths?
17. How well will script bots and models interact in the same game?
18. Advisors: since the script bots can already play the game, could they advise a human or model king? Ideally on tactics only (proposed orders and threat assessments), leaving diplomacy to the king, and as a toggle so experiments can report whether it was on.

D. Characters' careers and contracts
19. Are captured characters ever released, ransomed or exchanged, and what happens to them afterwards?
20. Can a king dismiss a character? If so, does everyone automatically learn of the dismissal and who the previous employer was, or is employment history a fact with a secrecy level like other facts? A king might want to keep a dismissal quiet in order to use the character later, but courts where the character served as an envoy already know who they worked for.
21. Can characters quit on their own and seek work elsewhere, for example because of missed pay, a better offer or loyalty to another court?
22. How do contracts work in practice: wage, term, what happens when they end? Do characters set their own price, and can it be negotiated?

E. Victory and threat
23. Shared victory is under review: coalition and defense pacts must not count as alliances that share a win (that part is approved), and the options are to remove shared victory entirely, cap it at two powers, or make a shared win worth less than a solo win. How does the code handle shared victory today, and what would each option change? What do you recommend, and why?
24. Do the script kings distinguish between the two kinds of threat described in the document, absolute strength nearby (security) and relative growth (victory), and can the balance between them vary by temperament?
25. Is relative growth the right measure of victory? A raw growth ratio is fragile for small powers: Alashiya can double its score by buying a single city, while Egypt must conquer much of the Levant for the same result. Two problems to assess:
   a. What counts as strength: if the score counts provinces while gold spent on a purchase disappears, buying a city creates growth from nothing. Should strength be economic value (provinces weighted by yield, plus gold), with city prices close to their value in the score, so a purchase is neutral?
   b. How growth is normalized. Options: dampen small bases (gain divided by starting strength plus a constant); share of the world's total value compared with the starting share; or par, measuring each power against its expected result estimated from many batch games, like a golf handicap.
   How is the score computed today, and what do you recommend now versus once model games give enough data?
   If the score changes, the kings' victory-threat assessment should use the same score function, applied to each king's estimates of its rivals from its own view, never true values, so the bots pursue exactly what the game rewards. The security threat (absolute strength nearby) stays a separate measure. Does the code share one score function between the engine and the bots today?

F. Presentation and overall
26. Should the interface show the year and season clearly? Would the start of the letters, around 1360 BCE, be a suitable start year?
27. Is the game coming together? Is it any good? Be honest, and use what you saw in the simulation.

Finish with a prioritized list: what you would do next and why, and what should wait.

Write the answers to part 3 and the report on parts 0 to 2 to docs/ROUND-REPORT.md, and give me a short summary in chat. Save simulation observations to the report as you go, so nothing depends on memory.
