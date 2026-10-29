# Haakon's answers to item 11+ (item 11d)

Build order item 11d (`docs/intent/build-order/item-11.md`), Haakon's answers of 29 October 2026 to item 11+'s review:
"Agree to all. Though a character based on the incentive structure we have now should never say yes to point 6, as it
is essentially game over." Report: `docs/rounds/2026-10-29-answers-to-11plus.md`. Save version 25.

- **Walls from the sources** (`StartWalls`, `model/map.ts`). Each city-state's city starts with the walls the walls
  dossier proposes (`docs/history/12-walls-roads-harbours.md`, "Walls by city"): Qatna and Qadesh 3; Carchemish, Aleppo,
  Ugarit, Arwad, Byblos, Tyre, Shechem and Susa 2; Isuwa, Alalakh, Nuhashshe, Amurru, Sidon, Damascus, Megiddo,
  Jerusalem, Suhu and Arrapha 1; Mira, Seha and Terqa, which the dossier does not list, 1, as it gives the other towns
  nobody has dug. The Kaska lands, Lukka and the Sutean steppe have none: their defence is the rough land and their
  scattered people, and Lukka's early falls are left to item 18. The Great Kings' capitals keep 3 (the dossier's
  proposals for them, Akhetaten 0 among them, are item 15's). The rulebook says so under WALLS AND SIEGES.
- **Terqa, Mira and Seha** (`Power`, `model/power.ts`; `StartVassals`, `model/vassals.ts`) are city-states, since the
  politics dossier gives each its own ruler: Hana (Terqa its centre) "under local kings, within Mitanni's reach", and
  Mira and the Seha River Land "each with its own ruler, more allied than ruled" by Arzawa. They start as vassals by
  sealed tablet, Hana of Mitanni and Mira and Seha of Arzawa, with tribute of 15 shekels a year. Their rulers are "the
  king of Hana", "the king of Mira", "the king of the Seha River Land" (no names of 1346 survive), with personalities of
  their own (`bots/personality.ts`). Each holds its city as its capital with its own army (50 men a shekel of yield, as
  every city-state); Mitanni's army at Terqa and Arzawa's army at Mira and fleet at Seha are gone with the land. Arzawa
  keeps Apasa alone, and Mitanni three provinces.
- **Par over all games** (`Par`, `rules/scoring.ts`): a power's mean growth over every game, a fall counted as 0, so
  that survival itself scores. The batch report prints it as "mean growth" beside the current par, with the survivors'
  own mean after it. The values are from 50 script games on this branch (seeds 1-50); `parOf` still never goes below 0.1.
- **The land in the score and in the scripts' reckoning.** The score keeps the land at its fixed weight
  (`provinceWeight`), tuned in item 18. A script king already reckons a province (`Board.baseValue`) as that fixed weight
  plus what it will still yield over the seasons it believes are left (`horizon`, from the age's words), so the land's
  worth to it falls as the end draws near; once the omens (item 16) darken, they feed the same belief.
- **A capital ceded whole** (`model/cession.ts`, `turn/cession.ts`). A king may order his own capital ceded when a
  sealed tablet between him and the receiver, not repudiated, gives it (his "I give you the land of ..." or the
  receiver's "Give me the land of ...", sealed by both); without one the order is refused and says so. It resolves after
  the season's other cessions and gifts of troops, so a king may give his troops away first. His kingdom falls as one
  whose capital was taken, to the receiver (`fall(..., ceded)`): all his land passes as land ceded (no new absorption;
  his homeland the receiver's own retaken in full), his remaining troops disband, his debts die, his servants go free, the
  receiver carries off the archive, and every court hears of the fall as it would of a conquest, in words that say it was
  ceded. The ruler lives on (`formerRuler`): a free character at his old city, under his own name where the sources give
  one, with nothing in his purse that was not his, and the facts that he ruled and ceded it. His new master may employ
  him like anyone; setting him over his city again is a governorship, a privilege, which comes with item 13
  ("Governors"), so nothing stands in for it now.
- **Script rulers never cede their capital.** A seat plays for its power's growth, and a fallen power's growth is 0, so
  nothing in a script's incentives makes giving up the whole realm pay: no script order cedes its own capital, and a
  script king refuses every "Give me the land of ..." as before. A human or model may still do it, at its real cost.
