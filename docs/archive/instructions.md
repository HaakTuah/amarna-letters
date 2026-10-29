# Haakon's instructions, word for word

Haakon's message log (`owner-messages-log.md`, 71 messages from 17 to 26 October 2026) stays out of the repo. It was
read once on 26 October 2026, and each instruction, decision or open question about this project was checked against
the repo's docs and `docs/from-local/`. These are the ones that were not recorded anywhere else. Each is quoted word
for word, with the date and time (UTC) it was sent. Only project matters are included.

What was left out:
- the pasted round prompts and additions, already saved word for word in the repo
- instructions already recorded in `docs/BUILD-PROGRESS.md`, the two spec files, the design notes or the copied memory
  notes
- one-off commands whose result is in git and on GitHub (create the repo, merges, pushes, Auto-fix switches)
- questions that were answered

No open questions were found.

## From the log

Items 1 to 3 still stand. Items 4 to 6 were superseded on 26 October 2026 (items 11 and 12 at the end of this file).
In item 7, "there is no mirror" and "Don't create docs/DESIGN.md" were superseded the same day by the copy in
`docs/intent/` (item 10), while "the design document records intent, and docs/DESIGN-NOTES.md is the source of truth
for what's built" still holds.

1. **2026-10-17 14:07**, the answer to a setup question ("How should live Claude API calls be tested? I can't type
   your API key into the game myself."):

   > Offline only, you run live (Recommended)

2. **2026-10-19 05:25**, on how chat instructions relate to the design document when starting the Build order:

   > Start with item 1, which is this interrupted round (If any of the work you do now isn't on the document, do it first unless it contridicts the document)

3. **2026-10-19 14:05**, on running the agent games of item 4, and a principle for any later model games:

   > For the two games: after the first two or three seasons of the first game, estimate what a full game costs in weekly usage. Only start the second game if, by that estimate, it can finish below 70%. If it can't, finish the first game, write it up, and leave the second ready to run in a later session. A complete game is worth more than two halves.

4. **2026-10-20 07:20**, the usage plan and how to wrap up:

   > Usage plan: both of my Claude Code sessions share the weekly limit, so check usage after every commit from now on. When weekly usage reaches 92%, stop starting new work and wrap up so you finish below 95%:
   > 1. Bring whatever is in progress to a clean commit that builds and passes its tests. If something can't be finished, leave it out of the commit and note it in the progress file.
   > 2. If item 5 is finished and reviewed, merge it into develop and push as the builder rules say, with the usual check of the previous PR.
   > 3. If item 5 is not finished, do not merge it into develop. Push its branch and open a draft PR from item/sieges to develop, titled as unfinished, listing what works and can be tested now, what is missing, and anything known to be broken.
   > 4. Update BUILD-PROGRESS.md (including the "For Haakon" table) and the item's report so the next session can resume from them, then stop.
   > In the PR description, say how to test the new features: what to click or run, and which seed or setup shows them.

5. **2026-10-20 10:04**:

   > Let's push it up. You wrap up approaching 95% weekly usage. If the item is on the lighter side, you may start it at 94%.

6. **2026-10-20 11:33**, after item 5's review answers (which are recorded in `docs/BUILD-PROGRESS.md`):

   > Do not start item 6 or any other work until I tell you to continue.

   Since then, Haakon has set what comes next: the docs and preview pass, the TypeScript conversion, the fix pass, then
   item 6 (`docs/CONVERSION-PLAN.md`). Each of these starts when he says so.

7. **2026-10-21 16:29**, on mirroring the design document:

   > README only. You're right, there is no mirror: the design document records intent, and docs/DESIGN-NOTES.md is the source of truth for what's built. Add "The courts" next to "The seven Great Kings" as you described, as its own PR into main for me to merge, separate from the conversion. Don't create docs/DESIGN.md.

## Superseded, kept for the record

8. **2026-10-19 05:25**:

   > For this session, stop at a clean commit when the weekly usage limit passes 50%.

9. **2026-10-19 14:00**:

   > You are cleared up to 70% of weekly usage instead of 50%.

Both were replaced on 19 October by a limit of 95%, which the 90% rule replaced on 26 October (item 11).

## 26 October 2026

Given in the design chat with Claude, while the repositories were set up for building in the cloud. Times are UTC.

10. **20:34**, on the rule against a copy of the design document in the repository (item 7 above):

    > I don't really care. I just said that because me and you have been continually iterating on the design document, so whatever document it was working based on would quickly be stale. I want whatever works best and will give the most optimal results at sensible token usage, with the idea iteration flow me and you have established. You handle the details.

    Built as the copy in `docs/intent/` with its check for later changes ("The specification" in the builder rules).

11. **20:34**, on a suggested stop after the fix pass (it replaces item 6 above, and the usage lines of items 4 and 5):

    > I don't agree with that break. I want these 2 continually working until they reach about 90% usage, at that point I don't want them taking on any bigger task, as I want the bulk of that remaining usage for myself.

    "These 2" are this game's builder and Barkstreet Snakes' builder. Written into the builder rules as "Usage".

12. **20:45**, on the setup itself:

    > Go, do it all, expertly! Just make sure you don't lose anything important along the way, or duplicate unessecarily, which creates drift!

## 27 October 2026

Given in the design chat with Claude, answering the design questions of the consistency pass (PR #30). Times are UTC.

13. **03:04**, on whether the build order is a rule in itself (answering where boats carried overland belong):

    > You decide what makes more sense, the build order is simply to guideline claude code. I only care about the final product and that we don't introduce temporary features

    A standing instruction: listed in `CLAUDE.md` under "Standing instructions". It agrees with the builder rule "No stopgaps".

14. **04:20**, in the conversion's session (item 5+, step 2), once milestone PR #36 was open and green:

    > You merge, always.

    A standing instruction: the builder merges its own pull requests, the milestone PRs from `develop` into `main`
    included, once they are green and (for an item) its reviewer has found nothing blocking. It replaces "Haakon merges
    `develop` into `main`" in the builder rules ("Branches", "A pull request at every milestone"). Listed in `CLAUDE.md`
    under "Standing instructions".

15. **09:00**, in the design chat, after Claude found no pushes from either builder for over an hour and asked whether to add a rule (Claude's question: "Shall I add a 'push at every checkpoint, at least hourly' rule to both projects' instructions?"). Haakon had asked: "And shouldn't they push regularly so they don't risk losing anything?" His answer:

    > Yes to all, expertly!

    A standing instruction, for this game and Barkstreet Snakes alike: push the item's branch at every passed gate and at
    least once an hour while work is under way. Listed in `CLAUDE.md` under "Standing instructions".

16. **11:01**, in the design chat, after finding that items 6b's and 6+'s review questions had sat in the progress file unseen:

    > Yes to all, expertly! And we need that all these questions get directly back to me from both projects. Having to hunt them down like this isn't good.

    A standing instruction, for this game and Barkstreet Snakes alike: every question comes back in the session's last
    message and the milestone PR, and is relayed word for word by the session that started it. Listed in `CLAUDE.md`
    under "Standing instructions". The same message answered items 6b's and 6+'s review questions (`docs/BUILD-PROGRESS.md`).

17. **16:56**, in the design chat, on Claude's proposal that builders ask the live design document for changes again
    before opening their pull request (items 7b and 8 had begun before Haakon's answers reached them):

    > Yes, why not? If you don't object.

    Written into the design document's builder rules ("The specification"), so it reaches `.claude/rules/builder-rules.md`
    with this refresh; the same for Barkstreet Snakes, by its progress file.

## 28 October 2026

18. **07:07**, in the design chat, after item 10's report found that script kings using its features won no more than those ignoring them (22 to 28):

    > But it is a big problem that using mechanics don't benefit the ai right now! Must pay careful attention to that! Can't draw conclusion right now, as the game isn't fully constructed yet, but once it starts being feature complete,  this cannot be the case.

    Written into the design document's builder rules ("Using a feature must pay", under the script kings' rule) and
    item 18 (no feature left whose users do not come out ahead), so it reaches `.claude/rules/builder-rules.md` with
    this refresh; the running table is "Use against ignore" in `docs/BUILD-PROGRESS.md`. The same message's companion
    answered items 9+a's, 9+b's and 10's review questions ("For Haakon").

19. **07:24 and 07:33**, in the design chat, after answering items 9+a's, 9+b's and 10's questions:

    > I feel like the principles answer most of these questions, if one just reasons:
    >
    > - Dont prohibit an action, reflect its real cost
    > - information always travel in physics time
    > - skills govern the likelihood you can accomplish something, while the rest is up to the character. Governed by either an llm and an prompt telling them their goal and path, or governed by attitude traits for scripts
    > - deceipt is the same as information, it must be gathered to find out if someone lies. You can't skillcheck if someone uses a false name, you must investigate. A forgery can be detected, because it is a actaully an skill to evaluate the realness of documents/tablets
    > - and the rest should follow physics really, the way it was. I don't think armies ever took exactly 1/3, probably depended on a lot of factors, you know?

    Then, on Claude's proposal to write them down as a tenet with five changes:

    > Yes, write them down please, expertly! [...] Code's should probably note where it has made an assumption, like it does now with questions, so we can check it afterwards.

    Written into the design document as the core tenet "Reason from the pillars" (Overview), with "No menus" and
    "Period first" from his earlier words, and into the builder rules ("Unattended work": every reading listed with
    the principle it rests on, checked by the design session at each milestone). Item 10+a opens with the five
    changes they imply.

20. **09:03**, in the design chat, on Claude's proposal of a check for what slows the work down as the build grows
    (Barkstreet Snakes' tests had run their 16-minute layout suite on every docs change, and files and branches keep
    growing):

    > Yes please, sound good! Do it expertly for both!

    Written into the design document's builder rules ("The workshop check", after "Progress"), so it reaches
    `.claude/rules/builder-rules.md` with this refresh; the same for Barkstreet Snakes, in its `CLAUDE.md`. Earlier the
    same morning, at 08:12: "Yes, I think tests should only run where they impact something. To speed up development,
    and so the session don't lose cache and we pay for all of the tokens again?" (the CI change of PR #103).

21. **13:02**, in the design chat, answering items 8's, 9's, 10+a's and 10+b's review questions, which Claude had relayed word for word with its takes:

    > You figure all this out, expert. You know me by now. But models must be able to alter clauses also. Remember, everyone plays the same game!

    The takes are written into item 11a+ ("Harvests in their season, and the answers to items 8 to 10+b"); the "For
    Haakon" rows are marked answered.

22. **15:23 and 15:26**, in the design chat, on how builders spend their time:

    > Could we then have it so claude does something, pushes it uo to review. Starts on something new. And if the review comes back, a different session addresses it? Be more agile and efficient. Not just sit and wait for stuff?

    > Yes, please, organize it expertly so we maximize token caching, time spent, and all other concerns.

    A standing instruction in `CLAUDE.md` ("pipeline, don't wait"), for this game and Barkstreet Snakes alike.

23. **15:48**, in the design chat, after Claude proposed a second builder for independent work (Wildcard's hair in
    Barkstreet Snakes, while an AI task ran) and asked for a yes, since it overrides the limit of two agents:

    > Yes, allow for as many lanes as can be parallelized, expert.

    A standing instruction in `CLAUDE.md` ("as many lanes as can run in parallel"), for this game and Barkstreet
    Snakes alike.

24. **16:22**, in the design chat, answering items 11a's and 11a+'s review questions, which Claude had relayed with its
    takes:

    > Agree. It seems claude code isn't quiet getting the idea. Everything has to happen through giving a message and
    > following up on promises. A jib doesnt have to given at court, but it has to be given through a character,
    > somewhere, and the engine only records it if it is by signed tablet. And money paid out as promised is something
    > the king must choose to do. He can automate it, but he doesn't have to pay anything. But if a signed tablet
    > dictated it, then it is recorded that he broke a deal. That kind of thing, you know? Doesn't it come across from
    > the principles and all the rest. And yes, do all your recomedation, and that. Just wish claude code would
    > understand the vision better. These kinds of question suggests it is not really getting it?

    Written into the design document as "The game in one page" (Overview), which every builder reads before an item and
    the reviewer reads with the diff (`CLAUDE.md`, "Starting a task" and "Models, effort and helpers"); the answers
    open item 11+.

25. **16:37, 16:43 and 16:45**, in the design chat, after the answers to items 11a and 11a+:

    > As for jobs, didn't we agree they were  just errands, to keep it simple? Do this this and this, by this time,
    > this is the money up front and this is the money after completion? Since almost every task can be submitted like
    > that. Meanwhile governorship i guess must be more of offering a privelege.
    >
    > And every piece of information has to travel. Imagine the sun disappearing. The earth doesn't know until the last
    > light has made its way here.
    >
    > And every action is possible (within the confines of what's possible for us to enable) a king may exercise as
    > horrendous action as he wants. The consequences are not hardcoded, but follow from what that does to population
    > contentness and charcaters incentives.
    >
    > And prices aren't fixed, characters negotiate them. And for wares it is supply and demand.
    >
    > And food can rot, no special conditions from being in a farmer's granary, it doesn't magically become resistant
    > by that.
    >
    > Is it in this vain we have answered every question?
    >
    > Freedom to do, consequences that emerge.

    > I agree with your take about armies. Governorship and commander then both become privileges.

    > Yes, write all above, expertly! Have we corrected and fixed all records then, so this will be fixed in time by
    > claude code?

    Written into "The game in one page" (Overview: "Freedom to do, consequences that emerge"; prices, privileges,
    captives; renewing is a new offer; no rule punishes a hard act), "Jobs, not wages", "Fees clear the market",
    "Governors" and the resident envoy; the answers moved to the start of item 11b, the next item, since it brings
    carriers and reputations.

26. **19:29**, in the design chat, answering item 11b's review questions, which Claude had relayed word for word with
    its takes:

    > Agree to all, expertly.

    Written into the design document as item 11b+, next, before city-states.

27. **29 October, 00:22**, in the design chat, answering item 11b+'s review questions, which Claude had relayed word
    for word with its takes:

    > Agree to all. But:
    >
    > 5\. Should models themselves not choose what to keep in memory when condensing? Something important that happened
    > more thsn 12 seasons ago sound strange to forget? Or am I misunderstanding. And why does scripts need to forget at
    > all?
    > 12\. Agreed, but like we have settled. Hired people can be treacherous, so someone could choose to leave stuff out
    > of their reports or lie in them. But obviously if they try to sell information that should be in the report but is
    > omitted, to their employeer, or their employeer gets word of it, then that reveals they broke their contract.

    Written into the design document as item 11b++ and as "Memory" and "Reports" in "The game in one page".

28. **00:39 to 00:43**, in the design chat, after the builder of item 11+ reported that code-PR checks had grown from
    about 6.5 to 10 minutes because test games now have 30 powers, and Claude proposed asking for small test games:

    > I don't want it to stop development though. I am going to bed now, but I want it to get to the bottom of it, yes.

    Then, to Claude's proposal to make it a standing rule in both games:

    > Yes, make it expertly so! Are there more optimizations we can aplly to the development of the 2 games, maestro?

    A standing instruction in `CLAUDE.md` ("the smallest game that tests the rule"), for this game and Barkstreet
    Snakes alike.

29. **00:47**, in the design chat, to Claude's five optimizations to the development of both games (a fresh design chat
    each day from a handover note; Codex for reviews; builders settling settled questions themselves; Barkstreet
    Snakes' `CLAUDE.md` trimmed; faster checks for this game):

    > Yes, do all expertly 1-5 except codex since we don't have it yet.

    Here: a standing instruction in `CLAUDE.md` ("settled questions are readings"), and the checks split into parallel
    jobs (lint and types beside the tests, the tests in four shards).

30. **02:05 to 02:19**, in the design chat, on the web map:

    > Didn't you say the different seas and provinces were all added to amarna letters? Why can I only see as far south
    > as northern Egypt then? And i see almost no sea in the south, and east, of the game map. No red sea or anything.

    Then, after Claude showed that every map and sea decision is built and the Red Sea was decided as a later addition,
    to building the Red Sea now and redrawing the map in true geography:

    > Yes, and yes, expertly. In my view, the map should in time become a fusion or blend of imperator rome and an
    > ancient museum map of the bronze age world. It should fir the geography the same way imperator has, as it had the
    > best geographic perspective.
    >
    > If we do this full visual makeover right now is another question, but the perspective must be corrected at the
    > very least. In time I want environmental effects, seasons reflected on the map. Characters, armies, fighting shown,
    > etc. Everything you can think of, which makes it a better game for a player or viewer. But I don't believe the time
    > for these effects are quiet yet. What is your expert take on all of this?

    Written into the design document as "The map in true geography, and its look in time" (Interface) and build order
    items 11c (true geography and the Red Sea, a lane beside 11+) and 19 (the living map, at the end).

31. **02:25 and 02:30**, in the design chat, on the map's look and on the cities left inside larger provinces:

    > Perfect, I really like those visual descriptions! Are they all added? Maybe it can be papyrus?
    >
    > Also, were any city states still excluded in mobile visibility grounds? This then changes the premises.

    Then, to adding Akko, Hazor, Gezer, Lachish, Ashkelon and Shuwardata's land as city-states:

    > Yes, do so expertly!

    Written into "The map in true geography, and its look in time" (Interface: papyrus, and the look in full), "What
    earns a place" (The world: the six cities) and build order item 11c.

32. **02:35**, in the design chat, on drawing the units after the period's relics (Mesehti's soldiers at Asyut,
    Tutankhamun's chest and model boats, the cylinder seals, Yazılıkaya, the Kassite boundary stones, the Thera fleet,
    Meryre II's foreign delegations):

    > Don't worry about copyright, we are not being taken for making a free game, where we model ancient reliqs based on
    > photographs. Definetly be fully inspired by these relics, and be in no way afraid of making it too simular. I want
    > what looks best and feels most authentic! And yes, ensure everything is in, expertly, and what we've previously
    > agreed on!

    Written into "The look, in time" (Interface) and build order item 19.

33. **02:38 to 02:41**, in the design chat: "Will this be a truly living and evocative map? Is there anything more we
    should add to it, expert?" Then, to Claude's six additions (a map that remembers, life from the simulation, a
    seasonal year, each realm's own map by its scribes, omens in the margin, small scenes at big moments):

    > Agree to everything, expert! And on your point about cities growing and shrinking! Yes! And i think every
    > investment level infrastructure reaches should reflect on the map. Docks appear. Roads of the wuality appears.
    > Walls. Etc!

    Written into "The look, in time" (Interface) and build order item 19.

34. **03:19**, in the design chat, answering item 11+'s review questions, which Claude had relayed word for word with
    its takes:

    > Agree to all. Though a character based on the incentive structure we have now should never say yes to point 6, as
    > it is essentially game over.

    Written into the design document as item 11d.

35. **06:57**, in the design chat, answering item 11d's review question (early falls and who wins), which Claude had
    relayed word for word with its take (a city's men defend its walls, a scoreboard by rank within one's own starting
    position):

    > Can't really see the difference between E and F, so you pick, expertly.
    >
    > And agreed to all! Implement expertly!
    >
    > Question: didn't you say the millitary age male population will defend their city when someone storms, or? Is it
    > still that easy to storm?

    Written into the design document as item 11e, "The people defend their land" (War) and "One scoreboard for every
    power" (Victory). (The first line is for Barkstreet Snakes' Wildcard's hair.)

36. **07:36 to 07:40**, in the design chat, on how the winner is scored:

    > I have an idea! Tell me what the expert (you) thinks. You know, I've been pondering. Both ways we have explored
    > scoring a winner has incentive problems in my head. The way we did it first, like paradox, with just the biggest
    > fish. Well, in a game where all players actually optimize towards the goal, like a player should, that
    > automatically biases both for and against the biggest at the start. They are ahead at the beginning, but it also
    > means eveyone has an incentive to form a coalition against the one at the top. This to me, doesn't seem to
    > describe the political situation of the period all that well.
    >
    > Then we have what we do now, where we base it somehow on how well someone usually does, and how much better or
    > worse they did now. Sounds good, but has the same coalition problem, someone very small could take the lead, and
    > if everyone goes against them, they don't have the coffers and manpower to stand up to it, unlike Egypt like when
    > we scored by just being biggest.
    >
    > So I got this crazy idea, what if we combine the 2 conditions, and just weight them differently? Do testing
    > towards the end, and find a medium where every power have circa the same chance of getting 1st place, and that's
    > how we weight between the 2 factor when scoring? What do you think, sir?

    Then, after Claude weighed a goal of one's own result against one true winner:

    > I want to have a true winner, but I want each player to optimize to get the best positioning they can. Screwing
    > over the one at the top isn't neseecarily the best start always then, if you want to jump from 8th place, to say
    > 5th. I think the degree of the coalition problem is acceptable then. But I think this scoring system is the best.
    > Then you can see the other 2 at the end also, but this is what they are actually scored on and optimizing
    > against.

    Written into "One scoreboard for every power" (Victory) and build order items 11e and 18.

37. **07:47**, in the design chat, on kings not being able to see the standings:

    > That's good! The part about them not knowing is an excellent point! So it makes it hard to coalition kn those
    > grounds, it becomes more if it is really obvious one pulls far ahead, or represents a real danger. They can even
    > be told the propotion of each weighing in their scoring, they still have no way to accurately measure how much
    > each state fulfill each aggregated to those propotions.

    Written into "One scoreboard for every power" (Victory): kings are told the weight once item 18 sets it.
