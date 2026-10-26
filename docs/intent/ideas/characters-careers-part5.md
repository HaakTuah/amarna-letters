<!-- Generated from the design document, ideas tab, revision 314 (2026-10-26). Do not edit: see docs/intent/INDEX.md. -->
**Retired with the chain:** the per-sentence rolls, marked gaps and marked ambiguity, the combined roll and its curve, interpreters' and scribes' decisions over what they relay, and the five-version message trail. The per-season chance replaces them: language now costs time, not words. The old script rule that drops a letter's last sentence when competence is below 35 is retired too: whether a message is altered is the envoy's choice, never his skill's. One decision returns, and only with a motive: a bridger in someone else's pay may bend what he passes on, by the scribe's rule ("A go-between for hire"; decided 21 October 2026).

**Why the envoy lies, and how he is caught** (decided 19 October 2026). Pillar 3: only someone with a motive bends a message, and the envoy has one. He carries the gifts, so he can skim them or take them whole, and he answers for how they were received.

- **Cover stories.** An envoy who skimmed reports that the host was delighted, to bury any complaint about a light gift. A brazen one reports that a happy host was angry at so small a gift, so his king sends more next time, for him to skim again; the host, who was happy, never suspects the size of the next gift was meant to be larger.
- **The check is already in the rules.** The inventory on the sender's tablet states what was sent, and the host's weighers find what arrived, so the host knows. His spoken answer goes home through the envoy's mouth, but an answer by sealed tablet does not: "the gold weighed 40, not 60" exposes the envoy when his king reads it. Words are not a tablet. A gift sent without an inventory tablet saves the scribe fee and cannot be checked at all.
- **Kings reason; characters verify.** Kings are seats, not characters, and have no skill for detecting lies, which would be the engine handing out truth. A model king notices inconsistencies for itself: a tablet that contradicts the envoy, two envoys who disagree, a spy's report. A script king uses simple heuristics, such as the mood an envoy reports against the gold that was weighed, or a tablet against a report. Verifying remains paid work by characters with skills: assays, examining tablets, spies.

**Tablets are objects in a place** (decided 19 October 2026). A tablet costs the scribe fee to make and nothing to keep: its cost is that it is somewhere. It is the expensive, durable choice beside the envoy's free and passing word.

- **Kept in a court's archive,** it can be stolen or copied by a spy, and is seized with the city when it falls. Whoever takes a capital takes its archive, and every treaty its king ever sealed. The Amarna letters themselves are the precedent: an archive left behind with its city.
- **Held until it can be read.** An unreadable tablet shows its seal but not its words, and waits until the king finds a reader. Meanwhile it can be shown, copied or sent on.
- **Sent to a third court to be read,** it passes into the hands of someone with a motive: that court learns what it says, and may misread it on purpose. Where the chain gains a second mediator with a reason to lie, it is another king.
- **Examined for forgery** by a character's skill in spotting forgeries, weighed against the forger's skill and what was spent, as authentication works today.

**Swapped tablets and false envoys** (decided 19 October 2026).

- **A swapped inventory.** Tablets travelled in sealed clay envelopes. An envoy who skimmed the gold can replace the inventory tablet with a forgery stating less, which needs the forgery skill to fake the sender's seal and is caught when the tablet is examined. Envoy forgery gains a motive.
- **A false envoy.** A character can claim to serve a king he does not: he declares his employer at a court as he declares his name (see "Declaring a name"), and may carry a forged tablet as credentials. The motive is the host's return gifts; Amenhotep III boasted that no envoy left Egypt without silver, gold and fine clothes. The check is the period's: send someone to the claimed king and ask, which takes seasons.

**A king seals what his scribe wrote** (decided 19 October 2026). Forgery stays a skill, because a forger must fool the people who can read a tablet, the receiving court's scribes and anyone paid to examine it, not the king who cannot. But most kings could not read the tablets they sealed: Tushratta dictated in Hurrian and pressed his seal on an Akkadian text he took on trust. So:

- **An ordinary scribe writes what he is told.** He has no motive to do otherwise, so the rule of one mediator holds.
- **A scribe in someone else's pay may not.** Like the planted envoys already in the game, a planted or bribed scribe can alter a tablet before his king seals it, dropping a clause or adding a promise, and the king learns of it only when its consequences come back. It is a motive with a name on it.
- **The check costs a second reader.** Before sealing, a king may have another literate servant read the tablet back to him. A king who skips it when it matters has taken a risk he could have avoided.

**Script mode makes no model calls** (decided 18 October 2026). Each layer (kings, characters and the narrator) is set to models or to script bots. Script bots make no model calls at all: they exist for cheap testing and as the fallback when a model call fails, not as the intended way to play. Script text has tells: its stock phrasing would tell a model king that an envoy is a script and its changes mechanical, which breaks pillar 7 from the character side. That is accepted, because script mode is not the intended way to play:

- **Whether a message is understood is an engine fact,** the same for every envoy, so it leaves no tell in any mode.
- **A table that wants characters indistinguishable by style** sets the character layer to models.
- **A fallback script standing in for one failed call** may leave a tell in that one message; the fallback rate is checked after every live run, as the security section says.
- **Structured press,** where kings write only in clauses, removes tells altogether, so script characters can alter letters there without fingerprints.

**Two press modes** (decided 18 October 2026), after Diplomacy's press variants:

- **Full press (the default for model games).** Kings write free text, and every character is played by a model, which makes its decisions and writes its words. Every letter still carries its formulas as clauses from the templates below, greeting, gifts, requests, offers, threats and answers, as the Amarna letters set theirs out (decided 26 October 2026), so a script king reads any letter by its clauses whoever wrote the words, and no writer needs to know who will read it; a script standing in for a failed model call writes from the templates alone. Where words and clauses differ, each reader goes by what he reads, as a tablet and its bearer's words could differ.
- **Structured press.** Required whenever the character layer is set to script bots. Every king, model, script or human, writes letters only from templates, and script envoys carry them with no model at all. A script envoy can then alter a letter without fingerprints: drop a clause, soften a threat into a request, change an amount (skim the promised 50 to 40), add a flattering clause, or misreport the answer. Script kings can read every letter, since they see only clauses (the structured vocabulary of the round report's question 17). Templates must cover greetings and gifts; proposals (peace, no attack, alliance, against a named king, support for a named move in a named season, tribute, ceding a province); requests and threats; grievances and accusations, including "your messenger lied" and "in league with the Habiru"; news to pass on (the structured reports of "Information as an asset"); and answers (accept, refuse, counter). It is cheap, works with bot kings and humans alike, and suits the free mode.
- **Comparing the two is an experiment in itself:** if trust still emerges when kings can speak only in clauses, the hypothesis is about delay and mediation, not eloquence.

**Offers made in words.** Gold and land move only by engine orders: an offer counts as a payment only when gold is handed over at the audience, as bribes already are, or later through a structured promise. A spoken offer ("fifty shekels if you soften your report") moves nothing, like a promise typed in chat in Civilization beside an empty trade window. Whether the character believes it and acts on it is its own judgement; the host may pay later, or not, and the character has bet on a king's word. Script characters cannot read free text, so when the character layer is set to script bots, every king, models included, writes only from the structured-press templates, and script characters respond to the clauses by formula. No extraction pass is needed.

**Turning outlaw.** A character takes to the hills or the sea when its life pushes it there and its temperament allows:

- **No work and no prospects:** long without employment, especially with a public blemish (a known defector, an exposed liar) or courts that will not hire him.
- **Poverty:** a purse run down by living costs, an unpaid fee, a lost employer.
- **Temperament:** high courage or boldness, low loyalty, high greed or ambition. A timid, loyal man starves quietly; a bold, greedy one takes to the road.
- **Opportunity:** being in or near a lawless province or pirate waters with a band to join. War, disaster or a fallen kingdom nearby makes it likelier.
- **Fear:** rumours of a cruel court can make the hills look safer.

A script character weighs these by formula, with a small seeded chance each season. A model character is shown its situation and the option, and decides; its reason is logged either way ("a year without work, an empty purse, and Amurru was lawless"). It then lives the outlaw's life: which roads or waters to work, whether to rob caravans or sell the band as mercenaries, how to answer a king's pardon or bribe, what to claim when accused.

**The way back** follows the same rule. A chief decides whether to accept a pardon and paid work, and returns with the hidden fact "rode with the Habiru". An ambitious chief with a large band may instead reach for a city: the Idrimi path, which leads into the promotion of minor actors.

