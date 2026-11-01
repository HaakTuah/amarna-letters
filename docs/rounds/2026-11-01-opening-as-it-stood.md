# Item 17+: the opening as it stood, the land east of the Jordan, and every place by its own name

Branch `item/opening-as-it-stood`, from `develop` at `20850a8` (item 17a merged). The item's text:
`docs/intent/build-order/item-17.md`, "Then **17+**"; its sections: "Starting positions come from the sources" (The
sources), "Places by their own names" (Voice of the age), "What earns a place" and "Places in their own time" (The map),
"Attested characters" (Characters). Design note: `docs/design/46-the-opening-as-it-stood.md`. Save version 38.

This account cannot reach the live design document: the copy on `develop` was cut on 2026-11-01 (revision 569 of the
Overview, 194 of the Build order), the day the item began, and the check before the pull request reads it again by its diff.

## What was built, in the order built

1. **Troops paid and fed by the king's standing order** (`c3025fb`). Every king starts with the order to pay and feed all his
   troops; he may hold back pay or food from all of them or from the troops in one province, and give it again. The
   engine pays and feeds nothing on its own. Script kings hold back pay when the treasury cannot carry the season.
2. **Armies, fleets and documented debts where the sources place them** (the Great Kings' men in the cities the dossiers
   name, the coast's ships where they campaigned, three debt tablets between courts).
3. **The land east of the Jordan and the map checked against 1346**: the Shasu in Seir and the Negev, the plateau beyond
   the Salt Sea outside the game, Gath for Hebron, the Lady of the Lions' valley, Suhu folded into Babylonia, Nesa a land
   with no great town, every town's people as it stood.
4. Places and people by their own names, and a power's name as a claim (below).
5. The people of 1346 who did not rule (below).
6. The model-text finds of the hand-off (below).

## Readings taken

Each with the principle it rests on ("Reason from the pillars").

1. **Egypt's army "at home and in Nubia"** (the armies dossier): 6,000 at Men-nefer, the army's base [B], 4,000 at
   Akhetaten with the king [B], 2,000 at Waset [G], 2,800 in Kush under the viceroy, whose campaign of year 12 is
   Akhenaten's only attested one [B that troops were there; C how many]; the garrisons at Gaza and Sumur 100 each [A]. The
   split is a first guess within the dossier's total ("Starting positions come from the sources").
2. **Kumidi's garrison waits for item 17++**, which brings its commissioner: a vassal's land is not land by leave, so an
   Egyptian unit standing in Upe would take its food from Biryawaza's people and raise unrest there every season, which
   no source shows ("Everything is somewhere"; "No stopgaps").
3. **Hatti's men** at Hattusa 5,500, Samuha 3,000 (the army base of the Upper Land, KBo VI 28 [A]), in Kizzuwatna 3,000
   under Telipinu facing Syria [B], Tuwanuwa 1,500 (the Lower Land facing Arzawa [B]), Nesa and Sapinuwa 1,000 each [G];
   its five ships off Kizzuwatna, in its waters as every other fleet, so that one unit stands in a province.
4. **Mitanni's** at Washukanni 5,000, Harran 3,000, Taidu 2,000: the west, where the Hittite war is coming [C]. **Babylonia's**
   at Babylon 4,000, Dur-Kurigalzu 3,000 [B], Nippur 1,500 [B], Sippar 1,500 [G]. **Assyria's** in the Tigris triangle,
   Ashur 2,000, Nineveh and Arbela 1,000 each [B]. **Alashiya's** at Enkomi 1,000 and in the copper hills 500 [G].
5. **The coast's ships where they campaigned:** Arwad's off Byblos, blockading it with Amurru (EA 98, 105) [A]; Sidon's off
   Tyre, cutting the island from its mainland town (EA 148-149) [A; B that it was so in 1346, since EA 155 names
   Meritaten]. A fleet in another's waters is a fact of the opening, not a war: what follows is the kings' ("Physics,
   not politics").
6. **Aziru's men in Sumur's countryside** (EA 103-106: his men around Egypt's base) [B; C on the year], standing, not
   besieging: the game starts just before the fall of Sumur as it starts just before the Great Syrian War, so the siege is
   Aziru's to order. **Labaya's war on Megiddo** (EA 244) was over before 1346: Shechem's men stand at home.
7. **Three documented debts** between courts, as the letters dossier states the claims [A]: the gold statues owed to
   Tushratta (EA 26-29), the silver owed to Burna-Buriash for his merchants and Salmu's caravan (EA 7-8), the copper
   Alashiya says it still owes Pharaoh (EA 35). The sums are first guesses against the treasuries [G]: 200, 60 and 80
   shekels; each due within the first year, since the letters press for it now. Grievances that are not claims to a sum
   (gold come short out of the kiln, envoys detained) are not debts.
8. **The Shasu hold Seir and the Negev** (Amenhotep III's lists at Soleb [A]); the Bashan is Ashtaroth's, the land south of
   it Pella's [B]; the plateau beyond the Salt Sea is land outside the game, labelled by description [B]. So the Shasu no
   longer border Ashtaroth, Pella or Jerusalem (item 11f+'s King's Highway band, grade G, undone), and the Jordan crossing
   by Jericho joins Jerusalem to Pella only.
9. **Gath for Hebron:** the province and power ids are renamed (`gath`, `Gath`), since nothing kept the old ids and a power's
   id shows in text wherever a line names a power by id (the hand-off's find). "The engine's ids stay as they are" lets
   ids stay; it does not require a misleading one to be kept. Gath (Tell es-Safi) is not rough ground; its land runs
   from the Shephelah up the Elah valley by Qiltu into the southern hills, which the sources make Shuwardata's (EA
   279-280, 290) [B], so Gath stands between Gezer and Lachish and borders Ashkelon, Aijalon, Jerusalem, Lachish and the
   Shasu.
10. **The Lady of the Lions' city-state** `aijalon`: in the Aijalon valley near Aijalon and Zorah [B], its site uncertain
    (Yalo, 31.84 N 35.02 E, stands in for it [C]); yield 5 taken from Gezer and Jerusalem (1 each) [G]; walls 1 and a
    spring [G]; a small town [G]; Egypt's vassal (EA 273-274) [A]; bandit country, since Abdi-Heba's caravan was robbed in
    the countryside of Ayyaluna (EA 287) [A]. The road from Gezer up to Jerusalem runs through it ("a road over a third
    province's land passes through it").
11. **Suhu folds into Babylonia** [C]: the dossiers show it acting as no polity in 1346 (the walls dossier: not excavated for
    the period [S]; the politics dossier: Babylonia "to about Hit"), so the province is Babylonia's land, its yield as it
    was (balance frozen), and the power is gone. The tests that used Suhu as a free city free it as before (`oldWorld`).
12. **Alshe and Ashtata (Emar) do not join the map**: Alshe appears only in Shuttarna III's doings after 1346 (the Shattiwaza
    treaty), Emar only as a crossing and Idrimi's refuge a century before; neither acts as a polity in 1346 ("What earns a
    place").
13. **Nesa a land with no great town** [B]: its town about 1,000, drawn without a town's rings; its old mound walls stay 1,
    since a mound fort is not a town.
14. **Every town's people as it stood**: Akhetaten 18,000 (the item's 15,000 to 20,000, below Waset and Men-nefer at
    30,000) [B]; Kalavasos 1,000 [B]; Nesa 1,000 [B]; Gath 3,000 [C]; Tunip 5,000 [C]; Aijalon 1,000 [G]; the rest checked
    against the people dossier's ranges and found within them.
15. **A unit held back from pay counts a season of missing pay** ("unpaid soldiers desert, as the economy's rules already
    say"); **one held back from food** draws nothing from the stores and buys nothing with its king's gold, eats what it
    carries and then takes from the land, as any unit does: the king saves his stores, his people pay ("Incentives, not
    quotas"; "Nothing happens unless someone orders it").
16. **Script kings hold back pay only when hard up** after borrowing, from units with no missed season that stand in their own
    land with no foreign troops beside them, largest pay first, and pay them again the next season; **they never hold back
    food**, since hungry men take from their own land and mutiny fast ("learn when holding back pay is worth its price").
17. **A kingdom falling within two seasons:** in the 20-game benchmark before the item, 7 games had one (Lukka 5, the Suteans 3,
    the Shasu 1); none is a Great King's capital, so the builder rules' balance exception does not apply and nothing is
    tuned ("Balance: first guesses during the build, tuning at the end").

## Design questions

(Filled in as the item proceeds; each checked against "The game in one page" and the item's sections first.)

## Benchmarks

20 games, seed 1, `--verify-replay`, develop as the item started: a capital fell in 20 of 20 games (339 kingdoms fell in
all); the first fall in season 3.5 on the median; a kingdom fallen in the first two seasons in 7 of 20 (Lukka 5, Suteans 3,
Shasu 1); Egypt fell in 0, Hatti 3, Babylonia 0, Mitanni 3, Assyria 9, Arzawa 3, Alashiya 0. After: below.
