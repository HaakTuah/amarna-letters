<!-- Generated from the design document, main tab, revision 542 (2026-10-26). Do not edit: see docs/intent/INDEX.md. -->
## Economy, territory and military

Gold is the only currency, and everything of value can change hands. The economy exists for one reason: war must cost something and peace must be worth something, so trust has a price without any rule saying so.

**Gold.**

- Provinces yield gold each turn; units and characters cost upkeep. Under review: from the economy's first phase (build order item 9+), provinces yield goods and gold buys labour ("Economy and resources" in the Ideas tab).
- Gold can be paid, promised, lent, withheld or used as a bribe, to any seat or character.
- Gold travels physically with an envoy, so it arrives late and can be skimmed by a greedy carrier.
- **Purity.** A sender may debase a shipment. The receiver sees its face value until it pays for an assay. This recreates the Amarna complaint about Egyptian gold that melted down impure. Once gold is money, markets assay what they are paid, so debasement fools only those who accept gold untested ("Markets" under "Economy and resources" in the Ideas tab).
- **Debts are facts; repayment is a choice** (decided 19 October 2026; scoring changed 21 October 2026). A loan is proven by a debt tablet sealed by borrower and lender, recording the sum to be repaid. Nothing forces the borrower to pay, and the score counts what each side holds, not what it owes or is owed: borrowed gold counts as the borrower's, as skimmed gold counts as the skimmer's. Not repaying is a kind of taking, and the world answers it the way it answers theft. The tablet is evidence anyone can read, so the lender's accusation carries where a verbal promise is one man's word against another's; it is a claim that can be sold to someone strong enough to collect; and a known defaulter pays dearly for credit, or finds none. The random ending makes a late default cheaper, so lenders price the end in, and credit grows dearer as the game ages, with no rule setting it. Interest, due dates, collateral and what follows a default stay words. The same tablet works between kings: a king who lends gives up gold until he is repaid. A kingdom's debts die when it falls. Characters lending to kings, and where characters keep their gold, are in the Ideas tab ("Where characters keep their gold", "Lending to kings").

**Gold is a lifeline** (decided 20 October 2026). For a king, gold is part of how he wins, since it is part of his realm's wealth ("The wealth of a realm" under Victory), and his security: it pays the troops who would otherwise desert, the ransoms and the envoys. For a character it is his security and his own victory, the ranking of the richest. So nobody hands gold out unless he believes it buys a greater benefit on average, over a time he can name: a gift buys favour, a bribe buys a softer report or a secret, a loan buys interest, tribute buys peace. Every request that asks a king or a character to give, take or keep gold says what it is worth to him in those terms, and script kings judge gifts and bribes the same way, as investments with an expected return, rather than by a generosity threshold. The score keeps the same books (decided 21 October 2026): gold a king spends at home stays in his realm, but gold he sends abroad leaves it, so a gift costs him exactly what it gives the receiver and is worth sending only for what it buys.

**Transferable assets.** Provinces, gold, units and characters (including as hostages) can all be given away. Tribute, buffer zones, hostage exchanges and escrow-like deals are left to emerge from these.

**Military.**

- Armies on land, fleets at sea; one unit per province.
- Diplomacy-style resolution, including convoys: strength is one plus supports, and ties bounce. No dice in combat.
- Supports can be given to any power, so a promised support is a checkable promise.

**Tempo of war.** Pillar 8 takes the game beyond Diplomacy's combat model. Early bot games showed why: Hatti could swallow Arzawa before any letter arrived, so diplomacy never got a chance.

- **Sieges (the priority).** Walled cities, and capitals above all, take several seasons to take. The besieger must keep the army in place and pay for it, while the besieged can still send envoys, beg for help and bargain. The vassal letters are full of sieges that dragged on while their rulers pleaded with the pharaoh; that window is where diplomacy happens. Getting a message out depends on the envoy's competence and courage and on how tight the siege is; the besieger may capture the envoy and read the tablets. Several messages need several envoys, or one envoy visiting courts in turn.

**Further ways to slow war**: in the Ideas tab, distance-based marching comes with command at a distance (build order item 13), and campaigning seasons arise from cost, without a rule ("Winter in the field" under "Seasons"). Slow absorption is decided and was built with sieges in build order item 5, and rare elimination was replaced by "A kingdom falls with its capital" below.

**Walls and terrain (decided direction, built with sieges in item 5).** Before item 5 almost every place needed one army to take, which was part of why conquest was so fast. Defense should come from two separate sources:

- **Walls, the built defense.** They vary from place to place (Hattusa's massive walls on a rocky ridge, a Levantine village with none) and can be strengthened for gold and upkeep, a real choice between defense and expansion. With sieges, walls mainly set how long a city holds out, not only how many armies it takes to storm it.
- **Terrain, the natural defense.** Mountains and hills make a province harder to take. Terrain along a route matters as much: crossing a river such as the Euphrates or forcing a pass such as the Cilician Gates between Anatolia and Syria is harder than attacking across open ground, so these belong on the connection between two provinces. Deserts such as Sinai cost an army supplies rather than adding defense. Islands such as Alashiya are protected by the sea.
- **Simple whole numbers** keep resolution deterministic.

This also helps the smaller kings: Arzawa's mountains and Alashiya's sea become real advantages. The risk is tipping from too fast to stalemate if defense rises everywhere at once, which is why walls, terrain and sieges are tuned as one.

Longer wars mean longer games; sleeping seats are what make those affordable, since model calls scale with events, not with time.

**A kingdom falls with its capital** (decided 19 October 2026). When a power's capital is taken, the king has fallen and the kingdom with him: its remaining land passes to the conqueror, the power whose troops took the capital, and its debts die with it, as back pay already does. Today a kingdom falls only when it holds no land, so a king who loses his capital fights on from his last provinces; this replaces that. Under slow absorption the land becomes the conqueror's over time rather than at once, so a conqueror gains an empire to hold, not a lump of score. A fallen kingdom's armies in the field are their commanders' to decide: once armies have commanders ("Generals lead armies" and "No commander, no mandate" in the Ideas tab), each commander chooses for himself whether to serve the conqueror, offer his army to another court, take land of his own, a new Idrimi, or turn outlaw with it. An army with nobody to command it may raise a captain from its own ranks, who faces the same choice, or else disbands ("A head rises where men lack one" in the Ideas tab); until commanders are built, all of them disband. An army no kingdom pays for is paid by the character who keeps it: its upkeep comes from his purse, his hoard, plunder or a loan, and troops he cannot pay desert, as a king's do. What he can afford is part of his decision, so a poor commander is pushed towards the conqueror or another court, and a rich one can afford to strike out alone. Once "the capital is wherever the king is" is built, a king who has moved his court is not taken with his old seat: the city that falls is no longer his capital, and he rules on from wherever he is. The other choices for the land, free cities or whoever reaches them first, characters included, were set aside for now. Since the siege package aims for capitals to fall in most games, most games will end at least one kingdom; its review should check that this is what we want.

**A fallen player's game is over** (decided 19 October 2026). As in Diplomacy, elimination is real; a fallen king does not return as a character. The player may watch the rest of the game in god view, as is standard, seeing everything: who lied to him, which envoy betrayed him, what the tablets really said. It is a setting, on by default, so a table of human players worried that a fallen player might pass hidden facts to a friend still in the game can turn it off; he then watches with what his kingdom knew when it fell until the game ends. Spectating an AI-only game keeps both god view and each king's own view, as now.

**How cities become free** (decided 20 October 2026), from systems already decided: conquered land not yet absorbed may revolt and break free, when the conditions below say so ("Revolt follows conditions, not dice"); a governor who turns with the levies he raised, or a commander who keeps his army, may rule a city of his own (the new Idrimi); and a vassal that stops paying is free in practice unless its overlord comes to punish it. A fallen kingdom's land passes to the conqueror as newly conquered land, so it can revolt like any other. Land that breaks free with no governor or commander at its head raises a ruler from its own people, who rules the free city ("A head rises where men lack one" in the Ideas tab, decided 21 October 2026).

**Revolt follows conditions, not dice** (decided 20 October 2026). Every province a power holds but has not fully absorbed carries an unrest level, summed from conditions the engine can see, and it revolts when unrest passes a threshold; the seeded dice only settle ties at the margin. What raises unrest:

- **How new the conquest is:** highest when just taken, falling as the land is absorbed;
- **hardship:** famine or another catastrophe there, levies raised from it, gold taken from it;
- **the master's weakness:** his armies beaten, his capital besieged, his troops busy elsewhere;
- **distance:** far from the king, by the measure of item 7;
- **a cause to rally to:** the province's old ruler or his heir alive and free, or a character of standing there who wants it;
- **outside help:** a rival's gold or envoys stirring it up, which is deniable like any bribe.

What lowers it: troops in or next to the province, a loyal governor there, policing (item 15), time, and a good harvest. A province that revolts becomes a free power of its own, under its old ruler or the character who led it, with the levies it can raise; troops of the master in the province fight them as combat says. The owner does not see the number: he learns of unrest as he learns of anything, from his governor (who may misreport it), his spies and travellers. First guesses for every weight and the threshold, tuned in build order item 18.

**What is absent on purpose.** No war declarations, no truces, no alliance flags, no opinion meters. A power at peace is simply one nobody is attacking.

