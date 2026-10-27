<!-- Generated from the design document, War, travel and the seas tab, revision 18 (2026-10-27). Do not edit: see docs/intent/INDEX.md. -->
## Seas, interception and outlaws

**Seas, interception and outlaws (interception on the road, pirates and bandits decided, build order items 7 and 11; deniable attacks decided, needing no rule; finer seas decided, build order item 7).**

- **Finer seas (decided 21 October 2026, built with the blockade in build order item 7).** Five sea zones against 41 land provinces is too coarse: Cyprus's two provinces alone touch four of the five, so under the blockade rule Alashiya, starting with one fleet, could never guard its own coast. The seas are redrawn after how Late Bronze Age seafaring worked.

  How it worked:
  - **Ships kept to the coasts.** Hulls were light, with one square sail, and sailed well only with the wind behind or abeam, so voyages went coast to coast in daytime stages with island stops, and long open crossings were the hard legs, taking days.
  - **The sea had a season.** Sailing ran roughly April to October in the eastern Mediterranean; winter was unsuited to it.
  - **Currents ran counterclockwise:** north along the Levant, west along southern Anatolia. A voyage from Cyprus home to the Aegean went by the Anatolian coast rather than straight back, so routes were easier one way than the other.
  - **Naval power was raiding, blockading harbours and seizing ships.** In the Amarna letters Arwad's ships lay off the coast to stop grain reaching Ṣumur (EA 98), blockaded its shore with the sons of Abdi-Ashirta so Rib-Hadda could not relieve it (EA 104–105), and threatened his own ships at sea. Blockades were of particular harbours and coasts, not of whole seas, and ships served mostly as transports and raiders, joining sieges from the sea.
  - **No island could guard every shore.** The king of Alashiya complained that "men of Lukki, year by year, seize villages in my own country" (EA 38): raiders landed where no ships stood.

  What the game does:
  - **Coastal waters per coastal province.** Each coastal province gets waters of its own, its harbour and shore; two neighbouring provinces with a short shared coast may share them. Both Cypriot provinces, Enkomi and the western one ("Map review"), have their own.
  - **Landing and supply need the coastal waters there.** Troops land, and a besieged coastal city or island is supplied, only where the enemy's fleets do not hold that province's waters. A fleet holding a harbour's waters blockades it, as Arwad did Ṣumur.
  - **A few open-sea crossings** link coastal waters, such as Cyprus to Anatolia or to the Levant, and the western sea towards the Aegean edge. They are hard to stop anyone in and slow to cross, and the fight happens where one comes ashore.
  - **The sailing season.** In the winter season open crossings are closed or much riskier, and coastal hops riskier; first guesses, tuned in item 18.
  - **Currents as data.** A crossing can take longer one way than the other, so the counterclockwise circuit shapes trade and war without a rule of its own.

  The exact division is a first guess, likely 15 to 25 sea zones in all, tested in the script games and reported. Pirates, patrols and interception at sea ("Pirates are bands at sea", item 7's interception) then happen in particular waters rather than across half the sea. Sources: [EA 38](https://en.wikipedia.org/wiki/Amarna_letter_EA_38); Emanuel, ["Arwad and the miši ships"](https://ancientportsantiques.com/wp-content/uploads/Documents/AUTHORS/SeaPeoples/Emanuel2020-Arwad&Misi.pdf) (2020), on EA 98, 101, 104–105 and 149; Querci, [appendix on Late Bronze Age sailing routes](https://edizionicafoscari.it/media/pdf/books/978-88-6969-858-3/978-88-6969-858-3-ch-09_T7x4gH3.pdf), on ships, seasons, currents and routes.
- **Interception on the road. (Decided 19 October 2026 in a simple form, build order item 7: a route is a chain of provinces, and a hostile army, an outlaw band or the lawlessness of a place on it may stop a traveller, with the odds shaped by his skill, his escort, policing and roads. The segment scheme below is not needed.)** If travel becomes distance-based and takes several seasons, two movements crossing on the same route must meet, decided deterministically (for example by dividing each route into segments per season). Two armies fight; an army may capture a hostile envoy or shipment; two envoys pass unless one reports what it saw. Nature can stop a traveller too (decided 21 October 2026), in the same check and from the land and climate profile and the season: storms at sea, worst in winter and on long crossings; passes closed by snow; floods on river routes; supplies running out in the desert. Revised 21 October 2026, now that pace varies ("What sets a company's pace"): a traveller may cross several provinces in a season, so the check falls on one province of the stretch he crossed, picked by the share of the season he spent in each. A fast company cannot slip through a bandit province untouched, and a slow one is not singled out by where it happens to stop.
- **A road belongs to the land it crosses (decided 21 October 2026).** Nobody owns a road: every stretch of it lies in some province, and that province's holder rules it, with its policing, its tolls and its road check. A connection between two provinces is two halves, with the border halfway by default, and map data moves it where the terrain says otherwise: a pass or a stretch of desert belongs to the side it lies on. So the time a traveller spends on a connection counts in the province whose half he is on, which is the share of the season the road check weighs (above); goods pay a toll on crossing into another holder's half ("Tolls and smuggling"); and a road built jointly with a neighbour is each side's own half ("Anyone can fund a project"). A door is a province, not a road, so every door has a holder ("Arrivals come through doors"). Built with the routes in item 7.
- **Choosing a route (decided 21 October 2026).** The traveller chooses his route from what he knows, and the sender may lay it down in the errand's mandate. He knows threats only from news that has reached him, so old news makes bad routes. A bold traveller takes the short, dangerous road and a careful one the long, safe one ("Bold or careful, one goal"): script travellers weigh time against risk by formula, and model travellers choose for themselves. Built with travel in item 7.
- **Pirates and bandits. (Decided 19 October 2026, build order item 11.)** The Lukka raided Alashiya, and the vassal letters are full of the Habiru, outlaws and mercenaries the vassals accused each other of using. Banditry and piracy rise where an owner spends little on patrols and garrisons, and with poverty, war and disaster. They intercept envoys, gold shipments and caravans, giving policing a real price.
- **Deniable attacks. (Decided 19 October 2026: possible, and needing no rule of its own. With outlaws on the roads, gold that can be handed over and characters dealing with each other, a king can pay a band and deny it; a captured outlaw may confess who paid him, as caught spies confess their master.)** A king may quietly sponsor bandits or pirates against a rival's envoys and then blame the Habiru; the victim cannot prove who did it. This fits the core of the game: an attack whose author cannot be proven.
- Outlaws are a world force; script outlaws cost no model calls, and a model character who turns outlaw sleeps between decisions like any other ("Characters sleep like kings"). They belong after sieges and distance-based travel, since they only matter once routes take time.

**What sets a company's pace (decided 21 October 2026).** One rule for everything that moves, armies, caravans, couriers and envoys alike, so a big army is slow for the same reasons as a big caravan. A company moves at the pace of its slowest part, so a king chooses between one large, safe convoy and several small, quick ones. Its pace comes from:

- **The land it crosses:** terrain, roads and the season, as decided.
- **Its size:** a long column is slow to move and to water, and draws attention.
- **Its load against what it can carry:** a company carrying less than it could moves faster.
- **Its animals:** donkeys are the pack animals of the age (an Old Assyrian donkey carried some 65 kg of tin and cloth), and oxcarts carry heavy loads slowly. Horses are rare and go into chariots, which speed messengers and envoys on good roads rather than caravans. There are no camels, which were not yet in use in the region.
- **Water:** in arid land a company can be only as large as the wells allow, which is why the Ways of Horus across Sinai were a chain of forts with wells.
- **River crossings:** fords close in the flood season and ferries hold a column up; the map data already holds the crossings.
- **Fodder:** in winter or desert the animals' fodder is carried, which eats into the load.
- **Pace as a choice:** a forced march is faster, and men and animals drop along the way, a real decision for an army racing to relieve a siege.
- **The leader:** a character who knows the road leads faster; men alone keep the average pace.
- **Sneaking:** travel off the road, to avoid tolls or policing, is slower, so smuggling buys secrecy with time.
- **On water:** current, wind and the sailing season ("Finer seas", "Rivers").

**Built once, switched on as the game grows.** Item 7b builds the rule as one function with every factor as a term that reads data; a term whose system does not exist yet stays neutral, neither speeding nor slowing, until the item that brings that system turns it on, with the benchmarks recorded before and after and the item's usual test of scripts that use the feature against scripts that ignore it. So travel is written once and never rewritten, and no system is built before its time. Progress accumulates: a company advances a number of whole points along its route each season, and what it does not use carries over, so a factor worth days or weeks shifts an arrival by days or weeks over a long road, not only when it happens to push it into the next season. All terms are integer data with first guesses, tuned in item 18.

| Factor | Turned on in |
| --- | --- |
| Terrain and river crossings | 7b, since the map data already holds them |
| Winter passes; current, wind and the sailing season | 7b, with the finer seas of 7a |
| Sneaking off the road | 7b, with passage and sneaking |
| Size, load, pack animals and the slowest part | 9+, with caravans; donkeys and oxcarts are part of a caravan's cost, not a traded good |
| Water in arid land, fodder, and the season on land | 10+, with land, climate and seasons |
| An army's size and forced marches | 13, with distance-based marching |
| The leader's skill | 11b for characters who travel; caravans with leaders in the economy's third phase |
| Roads | 15 |
| Horses for fast messengers | the economy's second phase, with horses as a good |

