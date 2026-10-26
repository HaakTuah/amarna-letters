# Round report: small record items (Build order item 3)

Specification: the Build order's item 3 in the design document's main tab, with the Ideas-tab sections it names: "Tablets
are objects in a place" (archives at the capital; spies can copy from them; whoever takes a capital gains copies of its
archive), "Swapped tablets" (an envoy replacing an inventory tablet with a forgery stating less, under the existing
forgery rules) and "The richest characters" (a ranking by wealth at the end of a game; if characters' gold is not tracked
yet, track what they gain and spend), all read fresh from the live document on 19 October 2026. Branch
`item/small-record-items`, built on `develop` at `185d01d`. Balance frozen; save version raised from 2 to 3.

## Summary

- **Archives.** Every tablet a court holds lies in its archive at its capital. A spy posted at a court copies one
  tablet a season from that court's archive, with a chance of its skill, and the copy comes home with its report.
  Whoever takes a court's capital (or is ceded it) gains at once a copy of every tablet in its archive. Nothing is taken
  away, and no other court learns of either (tested).
- **Inventory tablets and swaps.** Gold an envoy carries now comes with an inventory tablet sealed by the court that
  sends it, out or home, and the receiving court keeps it in its archive. An envoy that kept some, but not all, of the
  gold may hand over a forgery stating only what is left, if it has the forger's skill: the host then sees no shortfall, and only an
  examination of the inventory can find it, under the forgery rules, traced to the envoy. Script envoys swap when they
  skimmed, have the hand for a seal and are not timid; model envoys decide for themselves.
- **The richest characters.** Every gain into a character's purse is counted by source. At the end of a game the living
  characters are ranked by wealth, their purse and the back pay kings still owe them (hoards and debt tablets do not
  exist yet, and every ranking says so): after each game in the batch output, in its summary, and on the web app's
  Standings tab once the age has ended. During play a model character reads its own wealth, never the ranking.
- **Kings' texts.** The rulebook has two new paragraphs (Archives, and inventories under ENVOYS), the seat view heads its
  tablets "YOUR ARCHIVE", and the new notices and report lines are quoted below. `docs/DESIGN-NOTES.md` was updated with
  each rule in the same commit, including "Not built yet".
- **Verified.** 686 tests pass (654 before, 32 new, 6 of them with the review fixes), 0 warnings; `--games 10 --seed 1 --verify-replay` says replay ok for
  all ten, and all 200 benchmark games replayed exactly. The benchmarks moved within noise (below); nothing was tuned.
  The web app's end-of-game ranking was checked in the browser.

## What was built

### 1. Tablets are objects in a place

- **The archive** of a court is every tablet it holds a copy of (`TurnEngine.Archive`, in `TurnEngine.Archives.cs`):
  those it sealed, once its copy reached it, and those it was shown, brought, copied or took, inventories included. No
  new state: the copies (`TabletCopy`) were already where each court's tablets were kept.
- **Spies copy.** In `WatchAndReport`, a spy posted at a living court that was not caught this season copies, with a
  chance of its competence/100 drawn from its own stream (`archive`), one tablet of that court's archive that its master
  neither holds nor has on the road home in an earlier report: tablets bearing two or more seals first, then the newest
  (sealed turn, then id). The tablet ids travel in the report (`SpyReport.TabletIds`); when the report reaches home, each
  tablet the master does not hold by then becomes a copy in its archive, and the engine adds a line to the report. A
  spy turned by the court it watches copies nothing; a spy watching a province or a fallen court copies nothing; nothing
  about the spy's risk or observations changed. The spy remembers what it copied.
- **A capital taken.** When a province that is a court's capital passes to another power at the end of movement
  (`UpdateOwnership`), or by cession (`ResolveTransfers`), that power gains a copy of every tablet in the court's archive
  it does not hold already, and reads a notice next season. The court keeps its own. A court retaking its own capital
  gains nothing.
- **Hidden information.** Only the spy's master learns of its copies, when the report arrives; only the conqueror learns
  of the archive it took; the court copied is never told. Tests check that no other court gains a copy or a notice and
  that the events (`archive-copied`, `archive-taken`, new batch signals) are visible to that court alone.
- A sleeping seat's digest reads "with Ashur you took the archive of Assyria"; a spy's copies arrive in its report, which
  already had a digest line. The web app's Orders tab heads the list "Your archive", with one line on what that means.
- A model-played spy writing its report is told "You also copied a tablet from the court's archive (you remember what it
  says); the copy goes home with this report, whatever you write.", when a copy reaches its master's archive with it.

### 2. Swapped tablets

- **The inventory is a tablet** (`TurnEngine.Inventories.cs`). At every audience where gold was carried, the host gains
  the inventory in its archive: "The inventory of the gold Egypt sends to Alashiya: 2 minas.", one seal (the sender's),
  dated the season the envoy set out, source "the inventory brought by Mane, envoy of Egypt". Gold a host sends back
  comes home with the host's inventory, dated the audience ("the inventory Mane brought home with the gold of
  Hatti"). It costs nothing, as the inventory always did. Every delivery leaves one, so its presence gives nothing away.
- **The swap** is a decision of the envoy, recorded like the skim (`PresentResult.SwapInventory` into
  `AudienceRecord.SwapInventory`; `MindReply.SwapInventory` for the way home). The engine applies it only if the envoy
  kept some gold but not all of it (decision 15) and has the forger's skill (competence at least `ForgeMinCompetence`, 55, the rule for forgeries a king
  orders). Then the forgery states exactly what the weighers find; the host's audience view, its record of the audience
  and the lot in its treasury all state that; the lines "kept 20 shekels of the gold" and "replaced the inventory with a
  forgery stating 80 shekels" are left out of the host's record but kept in the mission's trail for the spectator; the
  envoy remembers it and carries a deep secret ("Forged the inventory of the gold Egypt sent to Alashiya, to hide what
  was kept."). An envoy without the skill hands over the true inventory and remembers that its hand could not fake the
  seal.
- **Caught when the tablet is examined.** The forged inventory records the envoy as forger, with its competence as the
  forger's skill, so `authenticate` finds it with the usual chance (20% + spend/200 − skill/150, 5–95%) and traces it
  with the usual chance (30% + spend/400, 30–80%), to the envoy rather than a court: "The seals are false: this tablet is
  a forgery. The scribes trace it to the hand of Mane, who brought it." Every other court hears it; the envoy loses 30
  reputation with every court and gains a public fact, as a traced forger does.
- **Who swaps.** Script envoys by formula (`ScriptMind.Swaps`): an envoy that skimmed (greed above 60, loyalty below 60,
  unchanged) swaps if its competence is at least the forging skill and its courage at least 35 (the line below which a
  script envoy is timid and softens threats). Model envoys decide for themselves through a new schema field,
  `swap_inventory`, in their presentation and their report home.

### 3. The richest characters

- **Characters' gold** was already tracked (`Character.Purse`). Every gain now goes through `Character.Gain`, which also
  counts it by source (`Character.Earned`): wages (at court, and back pay paid on return), gold skimmed (out or home),
  kings' gifts at audiences, and gold kept on dismissal on the way out. Characters start with nothing and spend nothing
  yet (no escort, fee, loan or robbery exists), so the parts add up to the purse; a test checks that over a whole game.
- **Wealth** (`Wealth.Of`, `Wealth.cs`) is the purse plus the back pay every court still owes. **The ranking**
  (`Wealth.Ranking`) lists the living characters, richest first, ties by id. One line each:
  "Mane of Thebes (serving Egypt): 330 (purse 330, back pay owed 0; wages 330)".
- **Shown where the game's end is shown.** The batch prints the top three after each game's result line (the whole
  ranking with `--detail`) and, in its summary, how rich the richest was on average and where all characters' gold came
  from. The web app's Standings tab shows the whole ranking once the age has ended, to every viewer, and the season's
  end notice says "The richest characters are ranked under Standings." Every place says what counts: "Wealth is the gold
  in a character's purse and the back pay kings still owe it; hoards and loans to kings on debt tablets do not exist
  yet. The dead are not ranked."
- **During play** a model-played character reads its own wealth: "Your purse holds 100 shekels; with the back pay kings
  owe you, you are worth 142 shekels.", and now also any back pay courts other than its lord owe it ("The king of Hatti
  owes you 12 shekels of back pay, paid if you ever stand at his court again."). Nothing tells it of a ranking or of
  anyone else's wealth.

### Save version

`GameState.CurrentVersion` is 3. A version-2 log is refused for replay and for continuing ("This game was saved under an
earlier version of the rules (version 2) …"); within version 3 seeds replay exactly (tested by the existing save-version
tests, by a new test that replays a game with a swap from its log, and by the batch's replay check).

## What a king now reads

Quoted from the code (`src/Amarna.Llm/Prompts.cs`), rendered with the default settings.

### The rulebook

Under ENVOYS, after the paragraph on the greeting and the envoy's motives:

> - Gold an envoy carries goes with an inventory tablet sealed by the court that sends it, stating the amount (gold a
>   host sends back has one too): the receiving court's weighers report what they found against it, and the court keeps
>   the inventory in its archive. An envoy that keeps some of the gold, but not all of it, may hand over, in place of
>   the sealed inventory, one it forges itself stating only what is left, if it has a forger's skill: the weight then
>   matches the inventory, and only having the inventory examined can show it, as for any forgery. A forged inventory
>   that is found is traced, with the same chance as any forgery, to the envoy who brought it, and every court hears of
>   it.

Under EVIDENCE AND INTELLIGENCE, after the paragraph on tablets:

> - Archives: every tablet you hold (those you sealed, and the copies you were shown or brought) lies in your archive at
>   your capital, and so it is at every court. A spy watching a court copies from its archive: each season it is not
>   caught, with a chance of (the spy's skill, 0-100)/100, it copies one tablet you do not hold yet (tablets bearing two
>   or more seals first, the newest first), and the copy comes home with its report; a spy turned by that court, or
>   watching a court that has fallen, copies nothing for you. Whoever takes a king's capital, or is ceded it, gains at
>   once a copy of every tablet in his archive, and the king keeps his own. So a spy at your court may copy your
>   tablets, and whoever takes your capital gains copies of them all.

The forgery paragraph (the examiner's odds) and the audience's inventory line ("The inventory on the tablet lists 80
shekels of gold; your weighers found 80.") are unchanged in wording; the figure is now the forgery's when an envoy
swapped it.

### The seat view and the news

- The list of tablets is headed `YOUR ARCHIVE (the tablets you hold, kept at your capital; copy id: text; seals; how it
  came to you):`, each line as before, e.g. `- k900: "Peace." Seals: Hatti, Egypt, dated turn 1. (copied from the archive
  of Hatti by your spy Mane)` or `- k212: "The inventory of the gold Egypt sends to Alashiya: 2 minas." Seals: Egypt,
  dated turn 3. (the inventory brought by Mane, envoy of Egypt)`.
- A spy's report with copies ends with the engine's line: `[With this report came copies Mane made in the archive of
  Assyria, now in your archive: k123 (sealed by Assyria and Hatti, dated turn 1).]`
- Taking a capital: `[Notice] An archive taken: With Ashur you took the archive of Assyria: copies of 1 tablet you did
  not hold are now in your archive: k130 (sealed by Assyria and Hatti, dated turn 1).`, or `…; it held no tablet you did
  not hold already.`
- An envoy's report home with gold ends, as before, `[The inventory lists 45 shekels of gold; your weighers found 45
  shekels.]`, the figure being the forgery's after a swap.
- A forged inventory examined and traced: `"The inventory of the gold Egypt sends to Alashiya: 1 mina 20 shekels." — The
  seals are false: this tablet is a forgery. The scribes trace it to the hand of Mane, who brought it.`, and to every
  other court the rumour `The scribes of Alashiya declare that the inventory of gold bearing the seal of Egypt, brought
  by Mane, envoy of Egypt, was forged by Mane.`

### What a model envoy reads

- Presenting: "You carry gold in sealed bags, with an inventory tablet sealed by your lord that says 100 shekels; the
  king's weighers will weigh the gold against it. You could quietly keep some before it is weighed and, if you leave
  some, hand over in place of the inventory one you forge yourself, stating only what is left.", followed by "Your hand
  is skilled enough to fake a seal." or "Your hand is not skilled enough to fake a seal, so you could not pass off a
  forged inventory." Home: the same for "gold the king sent your lord, with an inventory tablet sealed by that king".
- The field `swap_inventory` (presentation and report): "Only if you keep some of the gold but not all of it: hand over,
  in place of the sealed inventory, one you forge yourself stating only what is left, so the shortfall goes unnoticed.
  Faking the seal takes a forger's hand (you are told whether yours is one); without one you dare not use it and the
  true inventory is handed over. A forged inventory can be found out if the king pays to have it examined, and you may
  then be named as its forger before every court."
- The shared system text lists "whether to swap the inventory tablet for one you forge" among the character's decisions.

## Decisions and readings

1. **The archive is what a court holds.** "Each court's sealed tablets (and the copies it holds)": the existing copies.
   A proposer holds its copy of a tablet it sealed only once its envoy brings it home, as before; until then the
   tablet is in the host's archive, not the proposer's.
2. **Copied, not stolen.** The Ideas tab has a spy "steal or copy" and the main tab a conqueror "seize" the archive; item 3
   says "copy" and "gains copies". Stealing was not needed for anything the item asks (the copy is the evidence), and it
   would take tablets out of a king's view, which the game has no way to explain to him. Both only copy; the court keeps
   its own. Stealing is listed under Not built yet.
3. **A spy copies by itself**, as it observes by itself: no new order, no new risk. One tablet a season, with a chance of
   its skill, so a skilled spy at a court for ten seasons copies about seven tablets; agreements before inventories. The
   draw has its own random stream, so the spy's other observations and its detection are what they were.
4. **A turned spy copies nothing.** It sends home only what its secret master tells it (the poison and one true
   observation); handing over the court's archive would not be that.
5. **The capital, by conquest or cession.** "Whoever takes a capital": taken by troops, or ceded (the archive lies in the
   city). A third power taking an occupied capital gains the court's archive as it stands then, including tablets the
   court sealed after losing its capital, since the court cannot move (item 13).
6. **The inventory is a tablet for every gold delivery, out and home**, free as before, and the sender keeps no copy. A
   swap needs an object to examine, and an inventory that existed only after swaps would give them away.
7. **The swap follows the forgery rules where they apply**: the forging skill is needed (without it the true inventory
   goes, as a botched forgery yields nothing usable), the forger's skill weighs against the examiner's spending, and a
   found forgery may be traced. It costs the envoy nothing: the forgery fee is what a king pays for materials and a
   scribe, and the envoy writes it himself. The forgery always states what the weighers find, so a model envoy chooses
   whether, not how much.
8. **Traced to the envoy, not a court.** A king's forgery is traced to the court that ordered it; a swapped inventory is
   the envoy's own deed, so the trace names the envoy as the one who brought it, says whose envoy it was, and blames no
   court. (The script kings' crude reading of rumours by "of X" still lowers trust in the envoy's court; see "Known
   quirks" in the design notes.)
9. **The script formula**: skimmed, competence at least the forging skill, courage at least 35. Those thresholds are the
   game's own (forging, and the line below which a script envoy is timid); no new number was introduced.
10. **Script kings were not taught anything new.** They never examine an inventory (they examine only tablets shown to
    them as evidence) and read copied tablets as any tablet (treaties and evidence only with their own seal on it), so a
    swap is never found in a script game and a copied treaty between two other kings changes nothing they do. The item
    asks for no king behaviour, and balance is frozen.
11. **Wealth counts what exists**: purse and back pay owed. Back pay owed by a fallen court is already gone. The dead are
    not ranked (their gold is no longer theirs, and a ranking of the dead would reward dying rich); captives are.
12. **Tracking gains by source** is the "track what they gain and spend" part: the purse existed, but nothing said where
    its gold came from, and the ranking reads poorly without it. Nothing is spent yet, so there is nothing to track there.
13. **The ranking is shown to every viewer once the age has ended**, never before; kings never read it, since it is not
    their game; characters read only their own wealth, as the item says. They are not told that a ranking exists.
14. **One save version for the whole item.** Version 3 was raised with the first rule (archives) and covers the other two.
    The review fixes changed one rule within it (decision 15); version 3 has not been released, so it was not raised again.
15. **No swap when the envoy kept it all** (from the review). A forgery stating "0 shekels" would hide nothing: no gold is
    handed over to weigh, and an inventory of nothing beside an empty-handed envoy gives the game away. So the swap is
    refused, the true inventory goes, and the envoy remembers "with nothing left to weigh, a forged inventory could hide
    nothing". Script envoys never keep more than a fifth, so script games are unchanged (checked: the 200 benchmark
    games and the baseline run came out identical).

## Benchmarks

Script kings only, shared victory off, every game replayed and checked, as under "Benchmarks" in
`docs/rounds/2026-10-19-simulation-fixes.md`. **Before** is that report's "after" columns (`develop` before this item;
item 2 did not touch the engine); **after** is this branch at its head. All 200 replays were exact. Game lengths are the
same seed by seed (20.9 seasons on average for seeds 1-100, 20.4 for 101-200). **Nothing was tuned.**

Seeds 1-100:

| Power | Tier | Wins before | Wins after | Mean growth before | Mean growth after |
|---|---|---|---|---|---|
| Egypt | Strong | 19 | 23 | 2.35 | 2.36 |
| Hatti | Strong | 34 | 33 | 2.07 | 2.12 |
| Babylonia | Strong | 17 | 17 | 2.29 | 2.25 |
| Mitanni | Middle | 4 | 5 | 0.79 | 0.76 |
| Assyria | Middle | 14 | 15 | 1.58 | 1.60 |
| Arzawa | Weak | 12 | 7 | 1.11 | 1.09 |
| Alashiya | Weak | 0 | 0 | 1.10 | 1.11 |
| Won by a weak power | | 12 | 7 | | |

Seeds 101-200:

| Power | Tier | Wins before | Wins after | Mean growth before | Mean growth after |
|---|---|---|---|---|---|
| Egypt | Strong | 25 | 24 | 2.32 | 2.32 |
| Hatti | Strong | 32 | 32 | 1.94 | 1.98 |
| Babylonia | Strong | 15 | 15 | 2.21 | 2.21 |
| Mitanni | Middle | 1 | 1 | 0.78 | 0.76 |
| Assyria | Middle | 16 | 14 | 1.52 | 1.54 |
| Arzawa | Weak | 11 | 14 | 1.31 | 1.24 |
| Alashiya | Weak | 0 | 0 | 1.13 | 1.11 |
| Won by a weak power | | 11 | 14 | | |

The frozen baseline, seeds 1-40: one current king against six baselines (`--versus solo`), against the same seed played
all-baseline:

| Power | Growth alone, before / after | Growth all-baseline, before / after | Wins alone, before / after | Wins all-baseline, before / after |
|---|---|---|---|---|
| Egypt | 2.85 / 2.86 | 1.30 / 1.31 | 88% / 93% | 18% / 15% |
| Hatti | 2.76 / 2.78 | 0.82 / 0.84 | 83% / 85% | 5% / 5% |
| Babylonia | 2.42 / 2.44 | 1.15 / 1.16 | 83% / 85% | 10% / 10% |
| Mitanni | 1.86 / 1.85 | 1.35 / 1.35 | 50% / 53% | 25% / 28% |
| Assyria | 3.81 / 3.76 | 0.96 / 0.97 | 85% / 88% | 10% / 10% |
| Arzawa | 2.96 / 3.18 | 1.40 / 1.38 | 60% / 63% | 30% / 30% |
| Alashiya | 1.84 / 1.84 | 0.91 / 0.88 | 48% / 45% | 3% / 3% |
| All kings | 2.64 / 2.67 | 1.13 / 1.13 | 71% / 73% | 14% / 14% |

Signals (totals over 100 games; seeds 1-100, then 101-200):

| Signal | Before | After |
|---|---|---|
| Tablets sealed | 3,621; 3,565 | 3,611; 3,558 |
| Accusations | 986; 944 | 969; 955 |
| Broken promises | 1,190; 1,237 | 1,207; 1,228 |
| Authentications | 686; 622 | 669; 627 |
| Bribes | 106; 98 | 95; 108 |
| Defections | 147; 119 | 131; 134 |
| Detentions | 175; 164 | 149; 169 |
| Skims | 38; 26 | 36; 27 |
| Debased gold found | 390; 466 | 412; 443 |
| Spies caught | 26; 33 | 26; 27 |
| Evidence shown | 909; 860 | 902; 884 |
| Archive copied by a spy (games) | - | 582 (72); 547 (68) |
| Archive taken with a capital (games) | - | 325 (93); 327 (93) |
| Inventory swapped (games) | - | 13 (10); 11 (9) |

**What moved, and why.** Two things reach script games. First, script envoys swap: 24 swaps in 200 games, each sparing
a host the complaint and the trust lost over a light gift. Second, and far more often, every inventory tablet and every
copy takes ids from the game's one id counter, so the ids of everything made after the first gold delivery shift, and
with them the rolls keyed by a task's id (examinations and background checks). Games therefore drift from their old
course seed by seed even where no rule touched them: the winner changed in 14 of seeds 1-100 and 13 of 101-200. The
copies themselves change nothing a script king does (decision 10). The per-power moves go both ways between the two
seed sets (Arzawa 12 to 7 in one, 11 to 14 in the other; 23 to 21 over both), and the baseline comparison barely moved,
so I read them as noise from the reshuffled rolls, not a shift in balance.

**The richest characters in these games.** The richest character held 472 shekels at the end on average over seeds
1-100 (225-1,362) and 448 over 101-200 (219-1,169). Of all the gold characters gained, about 99% was wages: wages
98.7%, skimmed 0.1%, gifts 1.2% and gold kept on dismissal 0.0% over seeds 1-100 (362,602 shekels), and 98.6%, 0.0%,
1.4% and 0.0% over 101-200 (355,470), as the batch summary prints them. Script gifts are 20-60 shekels, so a
greedy envoy skims 5 or 10 at most, and the richest are simply the longest-serving servants of the richest courts (seed
80, 54 seasons: "Mazipalali of Harran (serving Hatti): 1362 (purse 1332, back pay owed 30; wages 1332)"). The second
game has little to say until characters can lend, hoard and be robbed (item 11), or model characters play it.

The whole ranking for one game, seed 1 (15 seasons, won by Mitanni), as `--detail` prints it (the web app's Standings
tab showed the same 18 for this seed):

```
  Richest characters:
    1. Mane of Thebes (serving Egypt): 330 (purse 330, back pay owed 0; wages 330)
    2. Tattamaru of Hattusa (serving Alashiya): 295 (purse 235, back pay owed 60; wages 235)
    3. Piyamaradu of Apasa (serving Alashiya): 234 (purse 195, back pay owed 39; wages 195)
    4. Ehli-Teshub of Carchemish (serving Egypt): 225 (purse 210, back pay owed 15; wages 210)
    5. Pihhuniya of Kanesh (serving Mitanni): 225 (purse 225, back pay owed 0; wages 225)
    6. Yanhamu of Byblos (serving Babylonia): 201 (purse 144, back pay owed 57; wages 144)
    7. Mazipalali of Harran (serving Hatti): 189 (purse 170, back pay owed 19; wages 170)
    8. Kushmeshu of Enkomi (serving Egypt): 165 (purse 165, back pay owed 0; wages 165)
    9. Abdi-Milki of Tyre (serving Mitanni): 165 (purse 165, back pay owed 0; wages 165)
    10. Zitanza of Lukka (serving Hatti): 160 (purse 160, back pay owed 0; wages 160)
    11. Keliya of Washukanni (serving Mitanni): 152 (purse 152, back pay owed 0; wages 152)
    12. Tehip-tilla of Arrapha (free): 104 (purse 104, back pay owed 0; wages 104)
    13. Sin-iqisham of Nineveh (free): 96 (purse 96, back pay owed 0; wages 96)
    14. Haamashshi of Memphis (free): 72 (purse 72, back pay owed 0; wages 72)
    15. Tulubri of Taidu (free): 48 (purse 48, back pay owed 0; wages 48)
    16. Paser of Memphis (free): 0 (purse 0, back pay owed 0; nothing gained)
    17. Pirissi of Washukanni (free): 0 (purse 0, back pay owed 0; nothing gained)
    18. Nakhtmin of Thebes (free): 0 (purse 0, back pay owed 0; nothing gained)
```

Ties keep the id order (Ehli-Teshub and Pihhuniya at 225; Kushmeshu and Abdi-Milki at 165). Free characters ranked low
are those who never found service, or left it before the end: what they earned stays in their purse, and back pay owed
by a court they left is still counted.

## Left out, and why

- **Reading foreign or unreadable tablets, sending a tablet to a third court to be read, and moving the court**: later
  items (languages, item 12; command at a distance, item 13), as the item says. Listed under Not built yet.
- **Stealing tablets** (decision 2), listed under Not built yet.
- **False envoys**: item 10.
- **Hoards and debt tablets**, and anything a character spends: item 11. The ranking counts them as nothing and says so.
- **Gold sent without an inventory**, saving the scribe fee (the Ideas tab's "Why the envoy lies"): not in item 3; every
  gift still has a free inventory. Listed under Not built yet.
- **Script kings using the new objects** (examining inventories, showing a copied coalition to the king it names):
  not needed by the rules, and balance is frozen (decision 10).

## How it was verified

- `dotnet test`: 686 tests pass (220 engine, 451 game, 15 web; 654 before). New: `ArchiveTests` (spies copy, one a
  season, never what the master holds, agreements and the newest first; turned and clumsy spies; a capital taken or
  ceded; a court retaking its own; nobody else gains a copy or a notice), `InventoryTests` (the inventory in the
  archive; a swap and what the host sees and does not see; no skill or nothing kept; the way home; examination finds and
  traces a swap; a true inventory reads genuine), `InventorySwapTests` (the script formula out and home; a swap through
  the runner, logged and replayed exactly; the model schema and parsing), `WealthTests` and `RichestTests` (gains by
  source; ranking, ties and the dead; the batch summary over a whole game, purse equal to gains; a model character's own
  wealth and nothing of the ranking), and rulebook tests for both new paragraphs and the archive heading. Existing tests
  updated: the save version (3) and the envoy test (now two tablets: the proposal and the inventory). The review fixes
  added six (see "Review findings").
- `dotnet build`: 0 warnings, 0 errors.
- `dotnet run --project src/Amarna.Batch -- --games 10 --seed 1 --verify-replay --no-chronicles`: replay ok for seeds
  1-10. The benchmark runs replayed all 200 games exactly.
- The web app (local dev server, `play?watch=1`, played to its end in the browser pane): the Standings tab shows "The
  richest characters" with its explanation and all 18 living characters, Mane of Thebes first with 5 minas 30 shekels,
  matching the batch's seed 1 (330).
- Not done: no game with model seats or model characters (the prompts and schema are covered by unit tests only).

## Review findings

One reviewer read the branch and found nothing blocking. It reported seven minor findings. I checked each against the
code; all seven were accurate. Six were fixed and one was left, as follows.

1. **The rulebook did not say that a spy at a fallen court copies nothing** (`TurnEngine.Intel.cs` copies only while
   the watched court is alive). Fixed: the Archives paragraph now reads "a spy turned by that court, or watching a court
   that has fallen, copies nothing for you" (quoted above; the rulebook test was updated). The other half, that a report
   reaching a court that has fallen brings nothing, was not put in the rulebook: it speaks to a living king, and a king
   whose court has fallen reads nothing more. The design notes now say both.
2. **Script kings never examine an inventory, so no swap is caught in the benchmarks.** Correct (decision 10), and
   left as it is. Teaching script kings to examine inventories would be new king behaviour that the item does not ask
   for. It would also spend their gold and change their trust, and balance is frozen: the ground rules allow bot changes
   only where the new rules need them (spies copying, envoys swapping). "Caught when examined" is covered by
   `InventoryTests`, through the real examination path: found, traced to the envoy, the reputation loss and the rumour
   to every other court. It is exercised in play only by model or human kings, whose rulebook states it.
3. **An envoy that kept all the gold could swap in an inventory stating 0 shekels.** Fixed as a rule (decision 15): the
   swap is refused, the true inventory goes, and the envoy remembers why. The rulebook ("keeps some of the gold, but not
   all of it"), the model envoy's prompt and schema field, and the design notes say so. New test:
   `An_envoy_that_kept_all_the_gold_cannot_hide_it_with_a_forgery_stating_nothing`.
4. **The model spy's prompt counted the copies it made, not the copies that arrive.** A spy copies at most one tablet a
   season, so the spy could be told "the copy goes home with this report" when its master had come to hold that tablet
   meanwhile and nothing was added. Fixed: the prompt counts the copies that actually reach the archive with the report
   (the request's `CopyIds`, which is also what the engine's line lists). New test for both cases.
5. **The sleep digest line for an archive taken depended on the notice starting with "With".** Fixed:
   `TurnEngine.FirstClause` takes the notice's first clause and lowers its first letter, whatever the word. Two new
   digest test rows pin it for both forms of the notice.
6. **A model envoy was not told whether it has a forger's hand.** Fixed: when it carries gold, out or home, its prompt
   ends the gold line with "Your hand is skilled enough to fake a seal." or "Your hand is not skilled enough to fake a
   seal, so you could not pass off a forged inventory." The schema field says "(you are told whether yours is one)". A
   character knows its own hand, so nothing hidden is revealed. New tests for both prompts and both hands, and for
   gold-free missions, which say nothing of it.
7. **The report gave no full ranking for a sample game.** Added under "The richest characters in these games" (seed 1).

After the fixes: 686 tests pass and the build has 0 warnings. `--games 10 --seed 1 --verify-replay --no-chronicles` says
replay ok for all ten. The benchmark runs for seeds 1-100 and 101-200, and the frozen-baseline run, were repeated, and
their output is identical to the runs above line by line, apart from the elapsed time. Script envoys never keep more
than a fifth of the gold, and every other fix changes only text that script games do not read. So the benchmark tables
stand as they are.

## Commits

- `21929f8` Keep tablets in archives that spies copy and conquerors take
- `9faa758` Let an envoy who skimmed swap the inventory for a forgery
- `7d1f7c1` Rank characters by wealth at the end of a game
- `01c31ba` Write the small-record-items report (with the batch printing the shares of characters' gains to one decimal, and the design notes' benchmark table brought up to date)
- Fix review findings: no swap when the envoy kept it all; say what fallen courts and a forger's hand mean (this section)
