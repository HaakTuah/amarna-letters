<!-- Generated from the design document, World and history tab, revision 2 (2026-10-27). Do not edit: see docs/intent/INDEX.md. -->
## Voice of the age: letters, customs and vocabulary

Flavor that gives every seat a shared vocabulary of the period. None of it is a rule; it is context all players know, so following or breaking it becomes a signal.

**Customs primer for leaders.** Every leader prompt includes a short primer on the customs of the age, framed as knowledge, not instructions. A leader's only goal is to win. Customs carry no obligation, and historical accuracy is never a goal in itself: a leader follows a custom only when it judges that doing so improves its chances of winning, and breaks it whenever breaking it serves better. What the primer adds is common knowledge: every leader knows that every other leader knows these customs and reads the same signals, so following one can build trust cheaply and breaking one will be noticed. The primer covers:

- How Great Kings address each other, and how vassals address a king (see the letter formula below).
- Gifts are exchanged constantly, and their size and quality are read as a measure of respect.
- Envoys are often detained, and a late or unwelcome reply can be blamed on the messenger.

**The letter formula.** Letters between Great Kings open with a fixed greeting, roughly: "Say to my brother: thus says your brother. All goes well with me. May all go well with you, your household, your wives, your sons, your chariots and your horses." Vassals instead write that they fall at the feet of their lord seven times and seven times. The formula encodes status, so deviations carry meaning without any rule: dropping the greeting is a slight, and calling someone "brother" is a claim. To save tokens, the engine renders the standard greeting from sender and recipient status; the model writes only the body, plus any deliberate change to the greeting.

**Deliberate deviations.** A leader can override any part of the rendered greeting, and the receiver sees exactly what was written:

- **Omitting the greeting.** A cold, bare letter.
- **Name order.** Putting your own name first in the address. Suppiluliuma of Hatti complained to the pharaoh for doing exactly this ([EA 41 and fragment](https://ancientegyptonline.co.uk/ea41/)).
- **Granting or withholding "brother".** A Hittite king later refused Assyria the word outright, asking whether they had been born of the same mother ([Adad-nirari I](https://en.wikipedia.org/wiki/Adad-nirari_I)); another granted it to the king of Ahhiyawa as a political gift.
- **Titles.** Claiming "Great King" for yourself, or denying it to the recipient. Assyria's Ashur-uballit moved from a modest first letter to a second claiming Great King status and brotherhood with the pharaoh.

Because the greeting travels on a sealed tablet, the envoy cannot alter it. That makes it one of the few fully reliable signals in the game.

**Language.** Every tablet in the prototype is in Akkadian, the shared diplomatic language. A leader may ask to be written to in its own tongue, as the king of Arzawa, whose letters in the archive are in Hittite (EA 31 and 32), asked Egypt to keep writing to him in Hittite; whether the other side complies is a social signal, not a mechanic. Later, each character speaks some languages and not others (see "Languages"): an envoy who speaks Hittite and Akkadian is worth more to the Hittite court and can deliver letters in the host's language as a courtesy.

**Postscripts.** A tablet may end with a note to the receiving court's envoy or scribe rather than its king: a request, flattery or a quiet offer. Abdi-Heba of Jerusalem did exactly this, asking the pharaoh's scribe to present his words well. It needs no new mechanic; it is a side channel aimed at the people who carry the words.

**The language of accusation: the Habiru.** The customs primer should teach leaders the period's vocabulary of blame, not only of courtesy. "Habiru" (Egyptian *ʿApiru*) meant outlaws, runaways and mercenaries living outside the city-states' control, a social status rather than a people. The vassals used it as a weapon: Rib-Hadda of Byblos warned that the land was going over to the Habiru, and calling a rival "in league with the Habiru" branded him a traitor. Leaders can use the accusation in letters now, before bandits exist as a world force; once they do, the same word becomes the natural cover for a deniable attack.

**Echoes from the archive.** Moves from the letters themselves, as read in the *Curator's Corner* episode that inspired the game. Each is tied to a rule that exists or a question in the round report.

*Candidates for the customs primer.* Add the best four to six, since every primer line is paid for on every call.

- **Rank in the greeting.** Great Kings call each other "brother" to claim equality; vassals fall at the king's feet seven times and seven times. Assyria's first letter claims equality with Mitanni. Writing your own name above the recipient's was an insult. The engine already checks greeting deviations; this tells kings what a deviation means.
- **Detention answers detention.** Tushratta held Pharaoh's envoy Mane until his own men were released, and asked whether messengers are birds, able to fly home on their own.
- **Messengers lie for gain.** Amenhotep III complained that Babylon's envoys went home claiming Egypt had given them nothing. Both courts blamed the messenger.
- **Words are not a tablet.** Arzawa's king would not trust what Pharaoh's messenger said until a tablet confirmed it. This is the game's split between a mandate and a sealed tablet (question 14), in Arzawa's own letter.
- **Proof needs a witness who knows.** Babylon asked whether his sister in Pharaoh's household still lived. Pharaoh answered that Babylon had sent nobodies who had never known her: send someone who can recognise her.
- **Distance as an excuse.** Tushratta was angry that Pharaoh ignored his illness, and let it go only after his own messenger confirmed the road is long.
- **Conquest dressed as protection.** Abdi-Ashirta took Sumur and wrote that he had saved it for the king.
- **A successor's broken promise.** Akhenaten sent gold-plated wooden statues where his father had promised solid gold. Tushratta then appealed to the queen mother, Teye, over the king's head.
- **Slights.** A festival held without inviting a brother king; a bride escorted by five chariots where an earlier princess had 3,000 soldiers.
- **Gold talk.** "In your country gold is as plentiful as dirt" is the standing opener of every request, and light or silvery gold is the standing complaint.
- **The begging letter.** Tushratta's request to Pharaoh packs three moves into a few lines. *Precedent as a floor:* give me more than you gave my father, so anything less is a demotion. *A worthy purpose, doubled:* the gold is for his grandfather's mausoleum and for the bride price, so a refusal slights the dead and the marriage at once. *Refusal as injury:* may the gold not distress my brother, and may my brother not distress me. The precedent move is the strongest, and the successor's broken promise above is the same argument seen from the other side.
- **Finkel's version.** Finkel sums up such letters in a parody (Curator's Corner ep. 100, [11:27](https://www.youtube.com/watch?v=3MZq_ZQDhJA&t=687s)), in full as the video's transcript gives it: "You're my brother. I love you. I love you. Send gold. I love you my gold owning brother and the best gold in the world. And you gave gold to my father and I like gold and sends much gold as you got lots of it anyway." Its best line is "I love you my gold owning brother." An Easter egg, not a primer line: a rare letter from a greedy script king, or a line in the chronicle when a king begs gold a third time. If a model king ever writes it unprompted, the voice has landed.
- **Idrimi, the outlaw who became king.** A legend by 1346: Idrimi of Alalakh, a king's son who fled, lived seven years among the Habiru, and returned to take a city (around 1500 BCE). His statue, with his own story carved across it, is in the British Museum. One primer line gives kings and characters the model of the outlaw who rises, to invoke or to fear: "he dreams of being another Idrimi." He is a legend only, never a character, so the path stays open to anyone.
- **Burna-Buriash's refusal.** In EA 9 the king of Babylon reminds Pharaoh that when the Canaanites wrote to his ancestor Kurigalzu, asking him to come to the border so that they could revolt against Egypt and ally with him, Kurigalzu answered: "If you become enemies of the king of Egypt, my brother, and ally yourselves with someone else, will I not come and plunder you?" A precedent for the Great Kings' solidarity against a brother's rebels, there to be invoked or ignored: style, never strategy ("What a breach means, and to whom").
- **An old king refuses a new one.** In EA 9, Burnaburiash of Babylon calls the Assyrians his vassals and asks Pharaoh to send their envoys home empty-handed. A primer candidate: rank is claimed, and then recognised or refused ("Recognition is earned").

**Gods as oath witnesses.** Sealed agreements are sworn before the gods: Shamash, the sun god and classic witness of oaths, alongside Amun, Marduk and Teshub. Invoking them changes nothing in the engine, but gives tablets the right weight in prose.

**Names.** Characters are attested people wherever the sources allow, with their traits set from what the sources tell, and every other name follows its region's attested names ("Attested characters" and "Grounded in the sources"; build order items 6+ and 10). Recurring envoys in the letters include Mane, the pharaoh's envoy to Mitanni, and Keliya, Mitanni's envoy to Egypt.

**Units and objects.** Gold is counted in minas and shekels. Gifts arrive with long itemized inventories. Tablets carry cylinder-seal impressions and travel in clay envelopes. Reports and narrator text use this vocabulary. The engine counts in shekels only (60 shekels make a mina) and converts for display, so models never do currency arithmetic in negotiations. Resources get the units of their period for display too (decided 21 October 2026): precious metal by weight in shekels and minas, since money was weighed metal; copper and tin in talents, as a Cypriot oxhide ingot weighed about a talent, some 29 kg; and grain in the measure each court used, as each names the seasons in its own calendar, shown to human players only: models see one grain measure everywhere, so a Babylonian's "100 kor" never reaches an Egyptian model to convert. The engine keeps one base unit per good and converts for display, so models never convert units either.

**Season names.** Three turns make a year, and each court sees turns in its own reckoning: Egypt sees Akhet (inundation), Peret (growing) and Shemu (harvest), while other courts see neutral season names until their own calendars are added. No power's calendar becomes everyone's reference point.

**Chronicle tone.** The narrator's end-of-game chronicles read like royal annals: each nation's account glorious and self-serving. The model is the Battle of Kadesh (c. 1274 BCE), which Egypt and the Hittites each recorded as their own victory. Kadesh falls about 80 years after the Amarna period, so it sets the tone, not the setting.

**A new Idrimi.** When a character really does go from an outlaw band to ruling a city, the chronicle names it after the legend, "a new Idrimi", rewarding the emergent story without scripting it.
