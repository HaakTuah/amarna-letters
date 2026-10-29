# The rest of the map: its crossings and its missing places (29 October 2026)

Build order item 11f (`docs/intent/build-order/item-11.md`, the 11f part), added by Haakon's PR #160, with his two
logistics answers of PR #163. Branch `item/map-crossings`, PR #169. Save version 30 (item 12 takes 29). What was built,
by file: `docs/design/33-the-rest-of-the-map.md`. Weekly usage: unknown (`scripts/usage.sh` cannot read it in this
session). Effort: medium, as set. Helpers: one reviewer, in the background; no search helper.

Haakon's words (29 October 2026, the item's own text): "Yes, every crossing like this should be included, and such that
both the map and the game physics reflect the actual terrain that was at the time."; to the design session's list of the
places the map lacks: "Yes, do it expertly!"; to its takes on logistics: "Yes, agreed with all, expertly!"; and on the
countryside round a siege: "Yes to all, expertly!".

## The check for changes

The copy was cut from Build order revision 103, War 66, The world 36, Land 33. Asked at the start: nothing had changed
in any of them. Asked again before the pull request: see the end of this report.

## What was built

- **The crossings of 1346**, each with the dossier it comes from (`Crossing.source`): the upper Euphrates into Isuwa
  from the plateau and the Upper Land; the Marassantiya ringing the Hittite heartland; the Orontes where armies are
  recorded fording it, at Shabtuna and below Niya; the Jordan between Canaan and the cities east of it; the Lebanon on
  Beirut's road; the Western Desert to Libya and the Negev to the Shasu. Rivers crossed but not sailed
  (`CrossedRivers`) slow a company at their fords and close them in their flood, as the great rivers' do. The rulebook's
  TERRAIN and NEWS AND TRAVEL, the map's marks and tap cards and the About page read them from the data. The geography
  dossier lists each with its evidence and grade, and what was checked and left out.
- **Nine places**: Azzi-Hayasa under Hukkana, Niya under Takuwa, Tunip (its elders, no king named), Beirut under
  Ammunira, Pella under Mut-Bahlu, Ashtaroth under Ayyab, Samuha (Hatti's own), and the chiefs' lands of Libya and the
  Shasu; each with its ruler, walls, yield, people, water, climate, market, name style, personality, colour and opening
  bond, checked against the dossiers and added to them where thin (politics, geography, attested people). Shechem's ruler
  is Labaya (reading 1).
- **Caravans go anywhere, at risk**: a kingdom's caravan crosses land closed to its king, sneaking, found there with a
  smuggler's odds; one that meets closed roads it had not heard of is turned back, then goes on sneaking. Troops shut
  inside walls by a siege seize nothing beyond them.
- **The desert sentence**: the rulebook already said the desert feeds nobody; the About page still gave item 5's flat
  desert cost, and now says what the rule is (and two code comments too).
- **Script kings** send caravans to their armies through foreign land, weighing tolls, the risk where the roads are
  closed, and hostile troops on the way (`--caravan-play-half` measures it).
- **The drawing** (11c+'s rules, merged while this was built): the nine places' borders traced by `scripts/map-borders.ts`,
  the edge lands' empty-place point west of the Delta moved so Libya has its land, and the crossing cards' flood text for
  the crossed rivers.
- **Split first** (the workshop check, the orchestrator's ask): `tactics.ts` (50.0 KB) split by responsibility in its
  own PR (#171), behaviour proven unchanged, and merged into this branch.

## Where the drawing and the connections disagree

`scripts/map-borders.ts` lists 53 pairs (item 11c+ listed 47 before this item). By 11c+'s text, connections come from
the attested roads and a disagreement is listed for the design session rather than either changed. For the nine new
places, whose roads this item chose, they were matched to the drawing where the sources allow: Samuha to Hattusa, Tunip
to Sumur (the Eleutheros road Aziru held), Pella to Hazor across the Jordan and the Shasu to Gaza across the Negev were
added, and Aleppo–Niya, which the drawing does not join, was left out. The rest for the new places stay, each for a
reason: Ashtaroth–Shasu is the King's Highway across Moab, which is no one's; Azzi–Samuha, the road by which Azzi's men
"made Samuha their frontier" (KBo VI 28); Beirut–Damascus over the Lebanon, as Byblos's and Sidon's roads; and
Carchemish–Samuha, Jerusalem–Pella, Jerusalem–Shasu, Lachish–Shasu and Tunip–Ugarit touch on the drawing with no road
the sources give. The older cases are 11c+'s list, unchanged.

## Measures

TO FILL: benchmarks before and after, falls in the first two seasons, wins by power, use against ignore, feature use.

## Readings taken

1. **Shechem under Labaya, Pella under Mut-Bahlu.** The item gives Pella to Mut-Bahlu, the son of Labaya whom the game
   gave Shechem; "What earns a place" says Labaya starts the game though probably dead by 1346. (The world as the
   sources give it; one man in one place.)
2. **Tunip's ruler is "the king of Tunip"**: EA 59 is from its citizens as one, and the dossiers' rule for an unnamed
   ruler gives "the king of ..."; its character's description names the elders. (The sources first.)
3. **Azzi starts as Hatti's vassal**: Hukkana's treaty with Suppiluliuma (Beckman no. 3) is early in the reign, its date
   not certain; the reading takes it sealed by 1346. Alternative: start Azzi free, its treaty a later event.
4. **Niya starts as Mitanni's vassal**: Takuwa submits to Suppiluliuma only in the first Syrian war. (Opening relations
   as they were.)
5. **Yields carved and added** (first guesses, item 18): Samuha 25 from Sapinuwa's and Nesa's land (5 each), Niya 15 and
   Tunip 15 (5 from Alalakh, 5 from Nuhashshe), Beirut 10 from Byblos and Sidon (5 each); Azzi 20, Pella and Ashtaroth 10
   each, Libya and the Shasu 10 each as new land. People: Pella and Ashtaroth 15,000 together, Azzi 30,000, Libya and the
   Shasu 20,000 each [G]. (Balance frozen: first guesses, listed.)
6. **A crossing only where the sources show an obstacle**: the Orontes only at Shabtuna and below Niya, not on every
   road over it; the Halys between the bend and the plateau; the Khabur, the Zabs, the Diyala, the Litani, the Aruna
   pass, the Zagros edge, the cataracts and straits left out, each for its reason. ("Terrain": "a lesser stream or ridge
   that stopped no army is drawn but is not a crossing".)
7. **Rivers crossed are not sailed**: no boats, no harvest floods; only fords and their flood, all in Shemu. (One rule:
   a river crossing costs the same everywhere; only what the sources give is added.)
8. **Only a kingdom's caravans sneak where closed**: a trader keeps its own choice to go openly or smuggle, which it
   already had (item 9+b); the item's text is about supplying a kingdom and its armies. Alternative: traders too.
9. **Open roads first**: a kingdom's caravan sneaks through closed land only where no open road reaches, so a king's
   caravan never takes the risk while a safe road exists (the order names only its ends; "may still go" is a means, not a
   preference). From the review; before it the engine took the shorter way.
10. **Turned back, then on**: a caravan that meets closed roads it had not heard of is turned back at the border, as
   before, then goes on to its destination sneaking, since it "may still go". (Nothing happens unless ordered: it does
   what it was sent to do; Everything travels.)
11. **Hostile troops are as before**: a king who closed his roads to the caravan's king with no passage there. (A road is
    denied by holding it.)
12. **Shut in means any power but the besieger** in a besieged province, for caravans only; travellers' road check is
    unchanged, as the decision is about supply. Alternative: travellers too. The besieged holder keeps no border there
   either (no turning back, toll or search), so nothing seized at it feeds the besieged city (the review's one blocking
   finding: before the fix, grain found at the border went into the besieged city's stores).
13. **Libya and the Shasu have no market**: a town of 0, so their market buys and sells nothing; no rule names them.
    (Different data, same rules.)
14. **The edge lands' centres** are their herders' land, not a site: Libya west of the Delta (30.95 N, 28.6 E), the
    Shasu in the Arabah by Edom (30.6 N, 35.3 E) [G].
15. **Connections for the new places** follow the roads the dossiers give, then the drawing where the sources allow (the
    list above).

## Questions for Haakon

None: "The game in one page" and the item's sections settled every reading (readings 1-15 above).
