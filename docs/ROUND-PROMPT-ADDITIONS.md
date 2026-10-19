# Round prompt: additions given during the round

The round prompt is `docs/ROUND-PROMPT.md`. These are the owner's later instructions for the same round, word for word, in the order given (18 October 2026). Headings are mine; the text under each is the owner's.

## 1. Part G: wages on return, and a wake trigger next to the capital (after Parts A, B, C and F were done)

Two additions to this round, decided while you were working. Finish Part D first, then do these as Part G, each in its own commit, with tests, rulebook text and DESIGN-NOTES updated in the same commit.

1. Wages are paid on return, since gold has to travel too.
- While a servant is away (on a mission, posted as a spy, detained or captured), his wages build up as back pay instead of leaving the treasury each season. They are paid in gold when he is back at court.
- The seat view shows back pay owed per servant ("owed to Mane: 45 shekels"), and the rulebook explains it in one line.
- A servant who never returns (captured, defected, dead) is never paid. This replaces the current rule that keeps paying a servant until word of his fate arrives. The treasury must still reveal nothing about his fate.
- If the king's kingdom falls, back pay owed by it is lost.
- If the treasury cannot pay in full on his return, the shortfall stays owed and counts as missed pay (loyalty, and the contract notice).
- Strength counts gold minus back pay owed, for the score and for the seat's own strength line, so owed gold does not inflate it. Use one shared function so engine and bots agree.
- Reconsider the script kings' rule of dismissing a servant three seasons after word comes that he is overdue: keep it only if it still serves a purpose once an absent servant costs nothing, and say what you decided.
- Back pay is a motive, not a rule: script characters may weigh it (back pay owed makes defection costlier, unless the employer looks doomed); model characters see it in their own view. Don't add new character decisions beyond that.

2. One extra wake trigger until sieges exist: foreign troops ending a move next to the seat's capital wake it. Without walls on homeland provinces, an army next to the capital can take it the next season, so a sleeping king must not first hear of it when the capital falls. Mark it in DESIGN-NOTES as temporary, to be revisited with the siege package, and include it in the wake replay numbers.

Rerun the bot benchmarks after Part G and report them next to the others, without tuning. New rules mean a new save version if the log format changes.

For the report only, not to build: most remaining wake-ups come from envoys waiting for an audience. Note as a next-round candidate that a king could leave standing instructions for audiences and be woken only for envoys he asked to receive himself, with your estimate of the saving.

## 2. A correction to the audience estimate

A correction to the audience estimate I asked for in Part G. Replace the assumption of "one or two envoys a season" with this:

What costs calls is how often a king is woken, not how many envoys he hears when he is; a per-season cap would still wake him every season. So assume a king holds court (receives envoys personally) about once a year, the same for every seat, plus whenever an engine-visible pressing matter arrives: a tablet to seal, a ransom demand, large gold, evidence of a broken tablet, or a sender's troops at the border. Between courts, routine envoys are received by his standing instructions or wait; when he holds court, he hears every waiting envoy at once.

Estimate the saving two ways: with a pressing audience reopening the king's orders, and as an audience only, without an orders call. This is for the report only; don't build it.


## 3. Three changes to the plan: triggers on changes, Part H, the yearly court

Thanks, that replay settles it. Three changes to the plan, with the reasoning, so you can handle cases I haven't spelled out.

1. Part G, before you start it: triggers fire on changes, not states.
Why: your replay showed the sender's troops stood at the host's border for 55 of 110 envoys, but had arrived there in only 14. Neighbours' troops stand at borders almost all the time, so a trigger on a standing condition wakes a king every season and defeats sleeping. What a king needs to know is that something changed.
So: the capital trigger wakes the seat when foreign troops arrive next to its capital (ended a move there last season), not every season they stand there. Apply the same rule to every other trigger that fires on a standing condition, and list in the report which ones you changed.

2. Part H, after Part G: an envoy wakes a king for an audience only.
Why: an audience costs about 16k tokens and an orders call about 37.5k, and envoys are the most common reason a king wakes. Your replay put the saving from answering envoys without an orders call at about 17%, the largest found. It also fits the period: the pharaoh received a messenger while his armies were already on the march, and orders given in advance had to stand. Sleep as the default only pays off if the orders call is reserved for moments that need a new plan.
So: when an envoy waits at a sleeping king's court and no order trigger fires, run the audience call but not the orders call; the king's troop orders stand as scheduled. Orders reopen only on the order triggers (land entered or lost, a failed scheduled order, troops arriving next to the capital, a contract notice, a ransom demand, the cap, or a season the king asked to be woken). Results of the audience (sealed tablets, gifts, detentions) take effect as now. Tell the king in the rulebook's sleep paragraph: receiving an envoy does not reopen your orders, so leave orders that can stand. Test it, include it in the replay numbers, and keep the switch so every-season play can still be compared. If it turns out larger than a small runner change, report what it would take instead of building it.

3. For the report, not to build: drop the yearly court as a cost device.
Why: your replay showed it saves almost nothing, because nearly every envoy counted as pressing, and it adds wake-ups in quiet seasons. Its only other purpose was fairness: a human seat is awake every season, so if routine envoys were answered by instructions for model kings, humans would out-answer them. That problem only exists once someone answers envoys on the king's behalf; until then every king, human or model, receives every envoy himself.
So: record as later candidates, with your estimates, a minister who receives routine envoys by standing instructions, an attention limit the same for every seat, and tablets counting as pressing only where the king's instructions don't cover them ("seal peace with anyone; bring alliances to me"). These belong with characters taking on roles, not this round.


## 4. Part H replaced: the king judges whether to reopen his orders

[Pasted text]
A change to Part H, replacing my last message about audience-only calls. The principle: a king sleeps while nothing changes, and when something happens he is the judge of whether it alters his plan. Restricting what an awake king may do was only a cost compromise, so let him decide instead.

- An envoy that wakes a sleeping king starts an audience call, as planned. Give that call a compact picture of his realm, enough to judge whether the news changes anything: his troops and where they stand, foreign troops at or inside his borders, his treasury, his scheduled orders and his envoys at court. Not the full map.
- In it he answers the envoy, may dispatch envoys with letters, tablets and gifts (validated as usual), and chooses either to let his orders stand or to reopen them. Reopening runs the full orders call that same season, as an ordinary wake.
- The order triggers still reopen orders directly, without asking: land entered or lost, troops lost, a failed scheduled order, troops arriving next to the capital, a contract notice, a ransom demand, the king's own triggers, the cap, or a season the king asked to be woken.
- The rulebook's sleep paragraph says: when you are woken to receive an envoy, reopen your orders if the news changes your plan; otherwise they stand.
- Count how often kings reopen. In the replay, report the saving both ways: with every audience reopening orders, and with none. We'll learn the real rate from the next simulation. Report the change in audience-call size too.
- Keep the switch, so every-season play can still be compared.

If the measured reopen rate turns out high, the planned fallback is that the kind of message decides: reopening is offered only for a coalition or alliance tablet, evidence of a broken tablet, a ransom demand, or a threat or news of war (judged from what the engine can see, plus the neutral extraction pass for spoken words), while greetings, gifts, grievances and peace renewals are answered in the audience alone. Don't build the fallback; estimate in the report how many of the replay's audiences each class would cover.

Agreed on troops lost and the king's own triggers reopening orders. One detail on "treasury below X fires once": it should be able to fire again after the treasury has risen above X and fallen back.
[End of pasted text]


## 5. The request-size measurement in Part E

For the request-size measurement in Part E: break each request down by section (rulebook and primer, map, schema, identity, the season's view, journal, letters and audience history, digest), in tokens, for a quiet season and a busy one, early and late in a game, before and after your changes. Then list, as next-round candidates with estimated savings: older letters summarised to one line each with the ledger of promises keeping what matters, the journal folding older notes into a summary in the king's own words, a "since you last acted" view, terser state tables, and ordering the request so the stable part can be cached. Don't build these now.


## 6. Design decisions that touch this round

[Pasted text]
A few design decisions made today that touch this round. Nothing new to build beyond what's noted; fold them into the parts they belong to and the report.

1. Part G, wages on return: there is a loophole. A king who sends people on missions they don't survive saves their back pay. The intended check is reputation: losses become rumours, and characters who hear them grow wary of that court, as with executions. Don't build the check this round. Do make sure losses abroad (capture, execution, death) can become rumours that reach other courts, if they already can, and list in the report what script characters would need to weigh such rumours.

2. Part H fallback estimate: the sorting pass is a small, cheap model that labels each audience, and it errs toward offering the reopen. A false positive costs some tokens; a false negative costs the king a decision. It applies to model seats only. Use that bias when you estimate how many audiences each class would cover.

3. A principle for Parts E and H: small models may only sort or condense; the seat's own model makes every decision (what the king answers, whether he reopens, what he orders). A seat played by one model in one call and a weaker one in the next is not one mind, and the weaker call is the one that gets exploited.

4. Part E, summaries: keep the king's summary of his older notes in his own reply, written by the seat's model, as planned. Whether a cheaper model could write summaries instead is to be measured later on the same games (saving against loss of quality); don't build that now, but say in the report how it could be measured.
[End of pasted text]
