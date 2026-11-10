# A captive king's realm under a caretaker (#806)

Built before item 18 part F2, at the orchestrator's word, since it changes play and F2 measures play. The design: the
follow-up "A captive king's realm under a caretaker" in `docs/BUILD-PROGRESS.md`; as built:
[`docs/design/59-a-captive-kings-realm.md`](../design/59-a-captive-kings-realm.md). **The check for changes:** the live
design document refused this account when the item began (the docs connector answered "forbidden"), so it was built from
the follow-up's text and the copy on `develop` at 1cfdc8f. Asked again on 10 November, after `main` was merged in: the
owner's answer is now written in Victory, "One scoreboard for every person" (revision 28), and adds that the captor's
guard watches against an escape, with "what holding him costs" a lever item 18 measures; built below as the captor's
guard. The Build order tab's changes since revision 354 are process only.

## The owner's words

Archive item 234 (7 November 2026, on #806): "But every king is a person? But i agree, incentives on both sides are for
them to go on living. A captured king has 2 options, give in or die, and lose all score. So he can be pressured. That
incentivices a capture to keep him alive. Meanwhile, a dead king's lands imidately goes to a heir that continues the
fight. Neither party is served by that the way the game rules are, which is good. My one pickle is that i don't have a
neat solution for how kingdoms continue with no king in the meantime. A script taking over would seem to be the most
natural way. Because there is no character in the game you want to make a regent. And we have already decided that heirs
spawn if you die, due to there being no dynastic mechanics or scoring. What is your take, expert?"

Archive item 235 (9 November 2026): "Agreed! And there should be possible to increase chance of escape or messages
passing out, like spies and such."

## What was built

- The caretaker: a script of its own holds a held king's realm every season, its orders kept within a narrow mandate by
  the engine (`inMandate`): defence of its own land, its dues and debts, its standing orders as he left them; no war,
  march abroad, treaty, grant or hire.
- The captive: his seat's orders are his letters (new order `write`, `write_from_captivity` in the request), and in a
  letter home his ransom, giving in, or a man hired, kept on or posted at his captor's court to free him, carried out by
  his court when the letter arrives. The rest is
  not carried out, with a notice saying why.
- His letters leave through his captor's court, read there and carried as a ransom demand is; the captor may keep them
  (new captive fates "StopLetters" and "PassLetters", for all or one court).
- Freeing him is an errand of a job (`JobErrand.frees`), given by his word home: the man adds his skill to the king's
  chance of getting away, risks more of being caught by that court's watchmen, and, if of his realm, takes his letters
  home unread; a disloyal man who fears the errand or favours the captor sells him out.
- A court taken by force lets its captives go, kings among them.
- Script players: a captor holding a king for ransom keeps his letters to every court but his own, and an honest one
  lets him go once his realm cedes it land; a captive pays his ransom by his word home or, short of it, gives in by
  ceding a province to his captor, asks for a spy at his captor's court, and writes once to each king sworn to him.
- The captor's guard: what he spends on watchmen in a season divides the king's chance of getting away that season
  (`KingData.guard`, 100 shekels halve it, a first guess); a script captor keeps watchmen while it holds a king.
- The caretaker reads his court's own word as it comes there (`Views.court`), not the captive's late copy of it.
- The measure of holding a king forever: the batch's "Captive kings" line.
- Rulebook (`rules-intelligence.ts`), the request's COURT line, the About page and the design notes ([57](../design/57-every-person.md),
  [59](../design/59-a-captive-kings-realm.md)) say so. Save version 93.

## Readings taken

- **The captive knows his realm only by word from his court:** his court's view as it stood when its last courier could
  reach him at his captor's court, kept season by season since his capture, with what befell him there himself. The
  caretaker stands at the court and reads its word as it comes there. Principle: "Everything is somewhere, and everything travels" (the one page), as for a
  king away from his court (item 17b, part C).
- **What he agreed to is carried out when it arrives, held or free:** his word stands once it reached his court.
  Principle: "Keeping a promise is an act", and his court's act once it has his word.
- **What he may agree to in a letter home** is his ransom, giving in (land ceded, troops given, or an envoy his court
  sends with the tablet he names, a treaty sealed as any is) and a spy at his captor's court to free him; the rest of his
  realm's business is the caretaker's. Principle: the owner's "give in or die ... So he can be pressured" and "spies and
  such" (archive items 234 and 235); the caretaker "holds the realm and does not steer it".
- **Freeing him is an errand of a job, his to give:** a spy's job at the captor's court that names the king
  (`JobErrand.frees`), given by his word home, whether the man is hired, kept on or posted for it. A friend's man is not
  on it: friends help with gold, words and troops (below). He is caught as any spy there is, a little more for the
  errand, and a disloyal one who fears the errand or favours the captor sells the king out, his own choice by his traits,
  as a script character's choices are (a model character's request does not ask it yet; it joins the characters'
  requests with the next work on them). Principle: "A job is always an errand: what to do, where and by when" and
  "Numbers come from their causes" (the one page); "Skills set the odds; the character decides". Sent to the owner as
  #882, since "any man hired for it" may mean a friend's man too.
- **On the road under guard he writes nothing:** he is not yet at a court whose people could carry a letter. Principle:
  "Everything is somewhere".
- **The caretaker is a script of its own,** not the seat's: it does not carry the king's ledger or memory. Principle:
  "there is no character in the game you want to make a regent", and a script taking over is "the most natural way"
  (the owner, item 234).
- **His scheduled orders run as given:** they are his own orders from before, like his standing orders. Principle: "keeps
  his standing orders" (the follow-up).
- **A captor keeps letters by a standing word, for all or for one court,** not letter by letter: he reads each, and his
  word stands until he changes it. Principle: "No menus"; an order of his, like any other.
- **A kept letter is not told to the captive:** nobody carries word of it to him. Principle: information moves in
  physical time.
- **A spy smuggles only letters home:** he sends them as his own reports go, to his master's court. Principle:
  "Everything is somewhere": the spy's road is home.

- **The captor's guard is his watchmen,** paid season by season: what holding him safely costs. Principle: "Nothing
  happens unless someone orders it" (the one page) and an existing lever before a new one ("Keep it lean"); the design
  document names the escape odds and what holding him costs as item 18's levers. The spend read is the season just
  past's, kept before it is cleared (`_guardedLast`), since the escape is drawn as the next season begins (bug #878:
  the road and border checks read the cleared spend).
- **Other kings may pay for him, demand him or march to free him** by the means every king has: gold and words by
  envoy, an envoy's tablet, troops that stop him on the road under guard, and now troops that take the captor's court,
  which lets its captives go. No ransom order for a king not his own: a ransom is paid to the captor's demand, and the
  demand goes to his realm. Principle: "No menus"; what a bargain needs is already there; "Everything is somewhere": a
  court taken has nobody left to guard its captives.
- **The script captive gives in only when he cannot pay,** once, with the least province beyond his homeland, and an
  honest captor takes land for him as a ransom. Principle: the owner's "give in or die ... So he can be pressured"
  (archive item 234); "Words are words": the captor's release is his own choice, by his honesty.

## Script players and the measure

A first look on seeds 1-8 at bb9dffc (`--verify-replay`, all eight replayed exactly): 67 kings held while their courts
knew it, in every game; held 12.7 seasons on average, the median 6, the longest 62; at the age's end 44 free again, 18
dead, 5 still held. Letters from captivity: 141 sent through the captor, 1 smuggled out by a spy, none kept; 34 kings
got away, 3 of them helped by a spy of theirs; 15 of 848 seasons held under the captor's watchmen; none gave in. Before the script captives asked for a spy and wrote to their sworn friends,
no letter was smuggled or kept and no spy helped (the patch, as "Every weakness found is patched" asks).

**Use against ignore** (`--king-play-half`, seeds 1-50, at bb9dffc): kings that play captivity (ransom their own by their
word or, short of the ransom, give in with land; send for a spy; write to their sworn friends; keep a captive's letters;
let a king go whose realm ceded them land; guard a king once a plot is found) grow 0.83 against 0.82 and win 19 games to
22. 395 kings were held while their courts knew it, 6.3 seasons on average (median 2, longest 59); at the age's end 274
free again, 99 dead, 22 still held. Letters: 225 sent through the captor, 2 smuggled, 6 kept; 132 kings got away, 6
helped by a spy; 86 of 2,485 seasons held under the captor's watchmen; 8 words home gave in. It does not matter
measurably yet in this split, rather than being played badly: the baseline lets every captive king go at once and
never ransoms its own, so a king who plays captivity is held almost only by another who plays it, and his ransom, the
land he gives in, his spy and his letters move wealth within the playing half; what the split mainly measures is
holding baseline kings for a ransom never paid, which shows no gain beyond what 50 games can tell apart. Whether holding
a king pays is item 18's measure (part F2), with its levers the escape odds and what holding him costs. The weakness found and patched on the way: when script captors guarded every king
they held (at 577b62d), 1,197 of 2,707 seasons under watchmen cost the kings who played captivity their lead (0.79
against 0.80, 18 wins to 20), since against a ransom alone a season's watch costs more than the escape it prevents is
worth; they now guard only once a plot is found or a spy caught. Before this round (at 1c541ec, without giving in, the
guard or the errand's risk): 0.83 against 0.78, 24 wins to 17. Holding a king to the end happens (22 in 50 games)
without a rule against it, as the owner asked; item 18 part F2 measures it on the full seed sets.

## Benchmarks

`--versus solo`, seeds 1-4, on `main` at 351e141 and on this branch at bb9dffc (a regression check, not a balance
measurement: four seeds). All kings 2.26 / 1.06 before and 2.24 / 1.06 after (growth alone / as baseline), wins 96% / 7%
and 93% / 7%. Of the great kings, before and after: Egypt 1.44 / 0.89 both; Hatti 2.21 / 0.93 and 1.32 / 0.93;
Babylonia 1.49 / 0.63 and 1.50 / 0.63; Mitanni 2.69 / 0.82 and 3.06 / 0.82; Assyria 2.65 / 0.88 and 2.55 / 0.88; Arzawa
0.77 / 0.78 and 1.10 / 0.78; Alashiya 1.16 / 0.76 both. A king held now loses his realm's initiative to the caretaker,
which moves who grows on these few seeds (Hatti down, Mitanni and Arzawa up); games stay playable, and balance waits
for item 18.

## Questions for the owner

- #882 (opened): may only the captive king send a man to free him, or a friendly king too? The reading taken: only he.
- #878 (filed, a bug): a king's watchmen never count on the road or at the border, their spend cleared before those
  checks.
- #806 (answered) closes with this PR.
