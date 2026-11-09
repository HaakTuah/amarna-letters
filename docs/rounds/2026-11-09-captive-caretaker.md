# A captive king's realm under a caretaker (#806)

Weekly usage: unknown (`scripts/usage.sh` cannot read it in this session).

Built before item 18 part F2, at the orchestrator's word, since it changes play and F2 measures play. The design: the
follow-up "A captive king's realm under a caretaker" in `docs/BUILD-PROGRESS.md`; as built:
[`docs/design/59-a-captive-kings-realm.md`](../design/59-a-captive-kings-realm.md). **The check for changes:** the live
design document refuses this account (the docs connector answers "forbidden"), so it is built from the follow-up's text
and the copy on `develop` at 1cfdc8f.

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
  letter home his ransom or a spy at his captor's court, carried out by his court when the letter arrives. The rest is
  not carried out, with a notice saying why.
- His letters leave through his captor's court, read there and carried as a ransom demand is; the captor may keep them
  (new captive fates "StopLetters" and "PassLetters", for all or one court). A spy of his realm posted at that court
  takes his letters home unread and adds his own skill to the king's chance of getting away.
- Script players: a captor holding a king for ransom keeps his letters to every court but his own; a captive pays
  his ransom by his word home, asks for a spy at his captor's court, and writes once to each king sworn to him.
- The measure of holding a king forever: the batch's "Captive kings" line.
- Rulebook (`rules-intelligence.ts`), the request's COURT line, the About page and the design notes ([57](../design/57-every-person.md),
  [59](../design/59-a-captive-kings-realm.md)) say so. Save version 93.

## Readings taken

- **The captive knows his realm only by word from his court:** his court's view as it stood when its last courier could
  reach him at his captor's court, kept season by season since his capture, with what befell him there himself. The
  caretaker reads the court's own view. Principle: "Everything is somewhere, and everything travels" (the one page), as
  for a king away from his court (item 17b, part C).
- **What he may agree to in a letter home** is his ransom, giving in (land ceded, troops given, or an envoy his court
  sends with the tablet he names, a treaty sealed as any is) and a spy at his captor's court to free him; the rest of his
  realm's business is the caretaker's. Principle: the owner's "give in or die ... So he can be pressured" and "spies and
  such" (archive items 234 and 235); the caretaker "holds the realm and does not steer it".
- **A spy helps only on the errand his king gave him:** one posted at the captor's court by the king's own word home.
  He is caught at it now and then, and a disloyal, greedy one sells his king out by telling the captor, his own choice
  by his traits, as a script character's choices are (a model character's request does not ask it yet; it joins the
  characters' requests with the next work on them). Principle: "Nothing happens unless someone orders it" and "Not: a
  post whose errands come free" (the one page); "Skills set the odds; the character decides".
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

## Script players and the measure

A first look on seeds 1-8 (`--verify-replay`, all eight replayed exactly): 70 kings held while their courts knew it, in
every game; held 13.7 seasons on average, the median 8, the longest 67; at the age's end 49 free again, 16 dead, 5 still
held. Letters from captivity: 117 sent through the captor, 3 smuggled out by a spy, 4 kept by the captor; 40 kings got
away, 5 of them helped by a spy of theirs. Before the script captives asked for a spy and wrote to their sworn friends,
no letter was smuggled or kept and no spy helped (the patch, as "Every weakness found is patched" asks). Use against
ignore, with `--king-play-half`, and the captive kings' line on the full seed sets come in item 18 part F2.

## Questions for the owner

Questions for the owner: none new (#806 answered and closed with this PR).
