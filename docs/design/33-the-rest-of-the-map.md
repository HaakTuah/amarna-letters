# The rest of the map: its crossings and its missing places (item 11f)

Build order item 11f (`docs/intent/build-order/item-11.md`), with "Terrain" under War, "What earns a place" and "The edges
of the map" under The world, and "Caravans carry a kingdom's goods" under Land, people and economy. Save version 30. The
report, with the readings taken and the measures, is `docs/rounds/2026-10-29-map-crossings.md`.

## Crossings (`model/geography.ts`)

- **Every crossing names its dossier** (`Crossing.source`, a file in `docs/history/`). The new ones, with their evidence
  and grades, are in the geography dossier's "The crossings of 1346": the upper Euphrates from the plateau and the Upper
  Land into Isuwa (Nesa–Isuwa, Samuha–Isuwa); the Marassantiya ringing the Hittite heartland (Hattusa–Nesa,
  Hattusa–Tuwanuwa, Sapinuwa–Nesa); the Orontes where armies are recorded fording it (Damascus–Qadesh at Shabtuna,
  Ugarit–Niya); the Jordan (Hazor–Damascus, Hazor–Ashtaroth, Megiddo–Pella, Shechem–Pella); the Lebanon on Beirut's road
  (Beirut–Damascus); and the edge lands' deserts (Libya–Delta and Libya–Memphis, the Western Desert; Shasu–Hebron and
  Shasu–Sinai, the Negev).
- **Rivers crossed but not sailed** (`CrossedRivers`: the Marassantiya, the Orontes, the Jordan): no boats, so none of
  the great rivers' reaches, floods of the harvest or boat speeds; only their fords, a ferry day and `floodDays` more in
  their flood season, Shemu for all three (`floodSeasonOf`, read by `legPoints`). The rulebook's NEWS AND TRAVEL lists
  their flood seasons with the great rivers'.
- **What a crossing does is unchanged**: a pass or a river helps a unit standing its ground (`defenceGround`), a pass is
  slow and dangerous in winter, a desert edge goes at the desert's pace and counts as dry. The rulebook's TERRAIN, the
  map's marks and the About page take their lists from `Crossings`, `Rough` and `Desert`.
- **Checked and left out** (drawn, not crossings, since no army was held there in the sources): the Khabur and the
  Balikh, the Zabs and the Diyala, the Litani, the Carmel ridge's Aruna pass, the Zagros edge (no connection climbs it),
  the Nile's cataracts (already the river's reaches) and straits (none on a land connection).

## Places (`model/map.ts`, `model/power.ts` and the province tables)

| Province | Power | Ruler | Yield | Walls | Bond | Carved from |
| --- | --- | --- | --- | --- | --- | --- |
| `azzi` Azzi-Hayasa (rough) | Azzi | Hukkana | 20 | 1 | Hatti | new land |
| `samuha` Samuha | Hatti's own | - | 25 | 1 | - | Sapinuwa, Nesa (5 each) |
| `niya` Niya | Niya | Takuwa | 15 | 1 | Mitanni | Alalakh (5) |
| `tunip` Tunip | Tunip | the king of Tunip | 15 | 1 | Egypt | Nuhashshe (5) |
| `beirut` Beirut (coast) | Beirut | Ammunira | 10 | 1 | Egypt | Byblos, Sidon (5 each) |
| `pella` Pella | Pella | Mut-Bahlu | 10 | 1 | Egypt | new land |
| `ashtaroth` Ashtaroth | Ashtaroth | Ayyab | 10 | 1 | Egypt | new land |
| `libya` Libya (desert, kingless) | Libya | the chief of the Tjehenu | 10 | 0 | free | new land |
| `shasu` Shasu Lands (desert, kingless) | Shasu | the chief of the Shasu | 10 | 0 | free | new land |

- **Shechem's ruler is Labaya** ("What earns a place": he starts the game though probably dead by 1346), since Mut-Bahlu
  (Mut-Baal) now rules Pella, where the letters put him.
- **Connections**: Samuha between Sapinuwa, Nesa, Isuwa, the Kaska and Azzi (the Sapinuwa–Isuwa road now runs by Samuha);
  Azzi to Isuwa; Niya to Alalakh, Aleppo, Ugarit, Nuhashshe and Tunip; Tunip to Nuhashshe, Qatna, Qadesh and Amurru (the
  roads from Ugarit and Amurru into Nuhashshe now run by Niya and Tunip); Beirut on the coast between Byblos and Sidon
  (with its own waters and hops) and to Damascus; Pella to Megiddo, Shechem and Ashtaroth; Ashtaroth to Damascus and
  Hazor; the Shasu to the Hebron hills, the Sinai and, by the King's Highway, Ashtaroth; Libya to the Delta and Memphis.
- **The tables**: people (Pella and Ashtaroth 15,000 together, Azzi 30,000, Libya and the Shasu 20,000 each, the rest
  sharing their regions), waters (Tunip, Niya, Samuha by the river, Pella a spring, Beirut and Ashtaroth wells, Azzi
  cisterns, Libya and the Shasu arid), climates, markets (Libya and the Shasu a town of 0: no market to speak of),
  personalities, name styles (Azzi, Libya, the Shasu; Pella and Ashtaroth in Canaan's, Niya and Tunip in Syria's) and
  colours. Each city-state's troops and treasury follow the rule of item 11+ (50 men a shekel of yield; 250 for the
  chiefs' lands). Par is unmeasured for them until regenerated.

## Caravans go anywhere, at risk (`turn/trade.ts`, `turn/economy.ts`)

- **A kingdom's caravan** (order `caravan`) is routed through any land (`caravanRoute`, sneak mode `"closed"`): openly
  where it may, sneaking off the road, half as slow again, through land its king has heard is closed to him with no
  passage there (`roadsShutTo`). Entering such a king's land it meets the smuggler's check (`smuggleOdds`): found, its
  goods are seized into that province's stores and his treasury (`caravan-found`), else it slips in (`caravan-slipped`).
  Meeting closed roads it had not heard of, it is turned back at the border, learns of them, and goes on to its
  destination sneaking (it goes home only if no way on exists). A trader (order `trade`) keeps its own choice, openly or
  smuggling.
- **Troops shut in by a siege seize nothing**: the road check's taker skips a unit standing in a province besieged by
  another power. The besieger's own caravans reach his army there; the defender cuts them only by sallying out, a relief
  army or holding a province on their road.

## Script kings (`game/src/bots/grain.ts`)

- **Supply anywhere**: a script king's caravans to its armies route through foreign land (each foreign province weighs
  two days more than its road, a closed one six, and a province where troops of a king who closed his roads to it stand,
  as it sees them, is avoided), so an army deep in foreign land is fed by caravan when the route takes two seasons or
  fewer. `--caravan-play-half` measures it against keeping caravans to its own land, as before.
- **The crossings** need nothing new: their help in battle reaches the scripts' reckoning through `defenceGround`
  (`Board.groundBonus`) and their delays through `legPoints`.
