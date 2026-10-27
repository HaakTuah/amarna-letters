# Item 8: structured press (27 October 2026)

Build order item 8 ("Structured press"): first Ṣumur a province of its own, with the phone made to read the Levant, and
Lukka a land without a king (Haakon's answers to item 7a, which 7b began too early to build); then the second press mode,
with templates for every king and script envoys, and the clauses every letter carries in full press too; "Recognition is
earned"; gold sent without an inventory tablet; characters as agents in local play, with their wake-ups measured; and a
screen for a human seat's standing answers. Branch `item/structured-press`; save version 12. What was built is in
`docs/design/14-structured-press.md` (and, for the map, `12-the-map-and-the-seas.md` and `09-the-web-map-and-the-interface.md`);
this report says why, what it cost and what was found. Weekly usage: unknown (this session cannot read it).

## The check for changes

The live design document was asked for changes since the copy's revisions at the start (Build order 39, Engine and models
50, World and history 26, Diplomacy and intelligence 18, Characters 18, Interface 8): none. While the item was built,
`develop` gained Haakon's answers to item 7b (#74) and the rule to ask again before opening the pull request (#75), and
the copy was refreshed (Build order 47). Item 8's text now begins with 7b's answers too (winter dangerous, never closed;
a spy's report carried home by road), and item 9's text says that it builds whatever of them item 8 began too early to
build: this item began before them, so item 9 builds them. Asked again before the pull request: Build order 49 changed
items 9+ and 17 only; the other tabs are unchanged. Nothing this item touches.

## What was built

- **Ṣumur and Lukka.** Ṣumur (Tell Kazel, Egypt's base on the coast) is a free city with a town's walls (yield 15) holding
  the coast and the waters it shares with Arwad; Amurru is the hill country behind it (land, rough, yield 20). Lukka is a
  land without a king (no walls, not for sale, yield 15). 55 land provinces.
- **The phone reads the Levant**, checked on a 390-pixel screen: names give way by importance (capitals always, great cities
  from the first zoom step, the rest once there is room), the zoom goes deeper (14 times the board, from 8), and every city
  has a tap target larger than the city drawn. At the first zoom step the Levant reads cleanly with its lesser names hidden;
  one step further every name, Ṣumur's and Amurru's among them, stands clear. Nothing was given up.
- **Clauses** (29 kinds: courtesies and gifts, proposals, requests, threats, grievances and accusations, news, answers),
  each with its words in the templates, checked (a clause that cannot stand is left out and its writer told why; every
  field its kind does not use is cleared), carried on every letter, tablet, answer, report and forgery, and recorded on
  the mission's trail as written, recited and reported.
- **The two press modes.** Full press: words, with clauses beside them. Structured press, required with script characters
  and set by every table at setup: letters, tablets, forgeries and answers are their clauses in the templates' words, and
  the model schemas and the web app ask no free words for them.
- **Script envoys change clauses by their motives** (a timid or fond one drops the threat, the careless lose a clause, one
  that kept gold states the gift as what is left, the ambitious and fond add a courtesy), and report the answer as their
  motives let them (the bought turn a refusal into acceptance and pass on the host's news as their own).
- **Script kings write every letter in clauses and read every letter by them**: they answer each proposal and request
  (accept, refuse, counter) and mean it (gold sent home to a friend who asks, a promised support kept, a plea for relief
  remembered), read their envoys' reports of the answers, hear news, and have two new missions: telling a king that his
  messenger lied when his gold weighed light, and promising a sworn partner their support for a blow he leads.
- **Recognition is earned.** Assyria's claim is new at the start and Babylonia holds Assyria its vassal (starting data, in
  the opening positions); the engine records who calls whom brother and grants whom the title in the greetings sent; the
  claim becomes established once more than half of the other Great Kings have called Assyria's king brother for nine
  seasons, and every court hears of it; the general script rule replaces Babylonia's named rule. The view has a RANK line.
- **Gold without an inventory**: the inventory now costs the scribe's fee (20); gold may go without one, saving the fee,
  and then nobody can check what arrived.
- **Characters as agents in local play**: the bridge keeps a seed's character folders (`--seed S`), the web app offers
  "Local agents (Claude Code)" for envoys, spies and candidates on this computer, the game is then in full press, and the
  isolation checks take the seed's characters too. Their wake-ups are measured in every batch.
- **A human seat's standing answers**: a section of the web app's orders sets and cancels them; the audience screen shows
  the clauses recited and takes the answer in clauses.

## Benchmarks, script games and the feature audit

Before the item (seeds 1-50 and the solo benchmark, from a clean copy of `develop`), the audit at its start: the same
figures as item 7b's after-numbers, signal for signal, and every feature built so far is used, so no gap was found to
patch. After the item, on the same seeds (`scripts/sim.sh --games 50 --seed 1 --verify-replay`): 50 of 50 replay exactly.
Script games are now in structured press.

| | Before 8 | After 8 | After, `--no-inventory-play` |
|---|---|---|---|
| Capitals fell (games; kingdoms) | 38; 65 | 39; 70 | 39; 71 |
| First fall, median season | 20 | 19 | |
| Entry to fall, median seasons | 16 | 16 | |
| Wins: Egypt, Hatti, Babylonia, Mitanni, Assyria, Arzawa, Alashiya | 15, 10, 15, 4, 4, 2, 0 | 18, 11, 10, 3, 5, 1, 2 | 18, 11, 11, 3, 4, 1, 2 |
| Mean growth: Egypt, Hatti, Babylonia, Mitanni, Assyria, Arzawa, Alashiya | 4.22, 4.12, 3.55, 2.10, 1.56, 0.87, 2.92 | 4.86, 3.87, 3.34, 2.00, 1.32, 0.58, 2.91 | 4.80, 3.78, 3.40, 1.99, 1.26, 0.59, 2.75 |
| Tablets sealed; detentions | 1643; 300 | 1632; 343 | |
| Sieges begun / won | 881 / 665 | 1022 / 819 | |
| Skims; inventories swapped | 154; 23 | 104; 28 | 87; 35 |
| Accusations | 325 | 571 | |
| Gold sent without an inventory | none | 1086 | 0 |

`--versus solo`, 40 seeds (one current king against six baselines): 9.83 growth alone and 1.24 as baseline over all, 91% and 14% of wins (9.31 growth alone and 1.35 as baseline,
87% and 14% of wins, before). By power, alone / as baseline: Egypt 7.74 / 0.87, Hatti 10.49 / 1.00, Babylonia 11.83 / 1.02, Mitanni 9.90 / 2.47, Assyria 14.76 / 1.12, Arzawa 5.95 / 1.59, Alashiya 8.14 / 0.63. The baseline was adapted only as the rules
required (it writes its letters, tablets and forgeries in clauses, the kinds its words already said).

What moved, and why:
- **Arzawa is weaker** (growth 0.87 to 0.58): Lukka, the one city it could buy, is a land without a king.
- **More sieges and accusations, fewer skims**: the inventory's fee makes gold dearer to send; a script envoy can no longer
  hide a skim behind a forged inventory where none goes; and hosts complain of light gold in clauses, which the new
  accusation mission carries back to the sender.
- **Egypt wins more, Babylonia less**: not analysed further; within the swing of earlier items.

**Every feature is every seat's.** The script players use each new rule (50 games):
- **Clauses**: all 7,567 letters carry them. Written most: `against` 2,587, `wellWishes` 2,590, `gift` 1,686, `askGold`
  1,249, `noAttack` and `newsStrength` 1,134 each (lulls), `grievance` 712, `peace` 678, `brokenOath` 537, `newsTroops` 264,
  `askHelp` 181, `askWithdraw` 172, `threat` 164, `support` 65, `tribute` 56, `envoyLied` and `lightGift` 34 each. Not
  written: `cede`, `askCede`, `askTribute`, `askSupport` (the script kings ask nothing of the kind: they cede land by
  their own rule and coordinate blows by promising support, not by asking for it), `askOath` in letters (they ask it at
  their audiences), `habiru` (no Habiru yet), `newsTaken`, `newsSiege`, `counter` in letters. Script kings answer every one
  of these when a model or human writes them.
- **Answers**: accept 3,590 and refuse 2,677, by kind as the batch prints them (peace 430 accepted, 226 refused; a stand
  together 1,223 and 1,123; requests for gold 55 and 1,049, the rest from grievances; pleas for relief 38 and 130).
- **Envoys changing clauses**: 2,134 letters recited otherwise than written (a courtesy added 1,772, a clause lost 290,
  a gift stated lower 96, a threat dropped 66); 55 answers reported otherwise than given.
- **Supports promised and kept**: 65 promised, 22 kept in the season named (34%; the rest lapsed where the partner's troop
  or ours had moved), and 45 accepted by the partner.
- **Accusations**: 34 letters told a king his messenger lied; the accused envoy is let go when next at court.
- **Recognition**: Assyria's claim became established in 21 of 50 games.
- **Gold without an inventory**: 1,086 lots, by envoys who had earned it. Against the same seeds with every gold
  inventoried (`--no-inventory-play`): mean growth 2.65 over all the kings, against 2.70 with it. The fee saved is about 400 shekels a game, against
  more skimming by the trusted envoys (104 skims against 87): it matters little, and the scripts play it
  sensibly.
- **Acting on clauses**: against the same seeds with half the kings acting on what they read and half not
  (`--clause-play-half`): those that act on them grow 2.95 against 2.48 and win 26 games to 24. Per power the swing is wide (Hatti 3.45 against 4.63 is the one power that does worse acting on them; Assyria 1.97 against 0.73, Egypt 5.64 against 3.95).
- **Characters as agents** would be asked 12.8 times a season, 8.6 wake-ups a season over the pool of 18: 0.48 wake-ups
  and 0.71 calls a character a season. Item 18 sets the pool's size from this ("How many characters").

## First guesses (item 18 tunes them)

- `GameConfig.inventoryFee` 20 (the tablet's fee); `recognitionSeasons` 9; `MaxClauses` 8.
- A script grievance asks 50 shekels; a script king gives a friend who asks up to a quarter of its spare gold above 100;
  support promised two seasons ahead, looked at four ahead, at most once in four seasons to a partner; the accuse mission
  0.5 + 0.2 × vengeance and the support mission 0.45 + 0.2 × diplomacy; gold goes without an inventory after two clean
  trips; a script envoy is tempted at loyalty below 70 where the gold has no inventory.
- Ṣumur's yield 15 and walls 1; Lukka's yield 15 (from 25); Amurru keeps 20. The sources are silent on them: these are
  guesses ("Starting positions come from the sources").

## Readings taken and design questions

1. **The inventory costs the scribe's fee** (20), as "saves the scribe's fee" implies; it cost nothing before. Alternative:
   keep it free, so that going without one only makes the gold uncheckable.
2. **Structured press goes with script characters**, set by every table at setup (`pressFor`): script games and local play
   with script characters are structured; model or local agent characters mean full press. Alternative: let a table choose
   structured press with model characters too.
3. **Model envoys recite clauses as written and report answers as given**, bending only their words; script envoys change
   clauses. Alternative: model envoys change them too (new fields in their replies, no extra call).
4. **The mandate stays words in structured press**: it is the king's instruction to his own envoy, read by a host only when
   the envoy secretly serves him. Alternative: a mandate in clauses too.
5. **"Newer than his own" is read as "still new"**: the script rule stops once Assyria's claim is established. A claim is
   established when more than half of the other living Great Kings have called the claimant brother for nine seasons with
   no greeting since that withheld it; a greeting in a king's own words records nothing. Babylonia's vassal claim stays as
   starting data. Alternative: the vassal claim ends when the claim is established, or "most" counts every Great King.
6. **Lukka yields 15 as a land without a king**, and Ṣumur 15 beside Amurru's 20: Arzawa now has no city it can buy.
   Alternative: keep Lukka at 25.
7. **Gold a host sends back keeps its inventory, free.** Alternative: the same fee and the same choice.
8. **Characters as local agents need the kit made for the game's seed**, and the bridge started with that seed, so the
   player sets the seed before starting. Alternative: make the kit from the game's start.
9. **The Habiru clause exists but no script king writes it** until there are Habiru (bands, item 11).
10. **News is passed on, not sold or invented**: script kings tell partners where a common foe's troops stand and lulls say
    their troops are few; selling and faking reports wait for items 11a and 11b.
11. **Clauses oblige nobody**: like tablets, they are evidence of what was said; script kings keep what they agree to.
12. **A season in a clause is named by the year every court counts** ("the third season of year 2"), not by a court's own
    season names, so it reads the same to sender and recipient.

## The review

One reviewer (Opus, high effort), given the diff and the item's text. Its findings, and what was done:
1. (Blocking) In structured press a clause's unused fields could carry free words between kings (a `peace` clause's
   province reached the host as text). Fixed: every field a kind does not use is cleared, and a counter's province and
   move are checked; tested.
2. (Blocking) With characters as local agents their isolation was never checked before the game. Fixed:
   `check-isolation.js --seed S` checks the seed's characters with the kings, and the play prompt has them take the test.
3. (Blocking) The order check did not count the inventory's fee, so an envoy could stay home short of 20. Fixed; tested.
4. The small rung's routine court asked for free words in structured press. Fixed: it asks in the game's press.
5. The web app checked the model schemas before setting the press. Fixed.
6. Script kings found the host of a report by its wording. Fixed: by the court they sent the envoy to.
7. Forgeries' clauses were checked as the forger's, not the sealers'. Fixed; a forgery with no clause that stands is not
   made in structured press, and not paid for.
8. Standing answers carried no clauses for what they decided. Fixed: a courtesy, thanks for gold, the tablet sealed or not.
9. Proposals in words with no tablet went unanswered. Fixed.

## Haakon's words in this session

None: the session ran from the item's start prompt.
