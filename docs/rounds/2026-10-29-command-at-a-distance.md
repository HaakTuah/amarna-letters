# Command at a distance (29 October 2026)

Build order item 13, "Command at a distance" (`docs/intent/build-order/item-13.md`), from the armies and fleets dossier
(`docs/history/11-armies-and-fleets.md`) and the attested people (`docs/history/06-attested-people.md`). Branch
`item/command-at-a-distance`, PR #175, pipelined from item 11f (`item/map-crossings`, #169), merged in as it moved. Save
version 31. What was built, by file: `docs/design/34-command-at-a-distance.md`. Weekly usage: unknown (`scripts/usage.sh`
cannot read it in this session). Effort: medium, as set. Carried over to item 13 on its row of the progress file, and
built here: governorship and command as grants of authority, hiring bands as soldiers, gold reaching the treasury by
carriers, the grant back of a ceded capital, a skilled commander cutting winter losses, and hunting re-measured with
command.

## The check for changes

The copy was cut from Build order revision 103, War, travel and the seas 66, Overview 567, Characters 20, Land, people
and economy 33, Engine and models 57. Asked at the start: nothing had changed. Asked again before the pull request:
Build order 105 and Characters 21 changed only item 11f's text and the Akkadian scribe it builds (Haakon's answers to
items 11e and 12), which came in with 11f; nothing in item 13's text or sections changed.

## The audit at the start

The 50 script games on 11f's game (seeds 1-50) used every feature built so far except those earlier audits list for
later items (no hire abroad, no secrets caught or reports sold). None is this item's.

## What was built

See `docs/design/34-command-at-a-distance.md`. In short:

- **Armies and fleets from the sources**: 64 units at the dossier's sizes (Egypt's two field armies of 7,500, Hatti's
  two, Arzawa's 10,000, the cities' ships by their fleets); a unit's strength is its men against a full levy.
- **Battles**: one season each, losses by the margin (the loser at least a tenth, the winner half of what he inflicts),
  the beaten falling back to a free province of their own or neighbouring, destroyed when routed or with nowhere to go;
  the men lost turn loose where the battle was fought.
- **Marching**: by item 7's distance, an army's pace by its size, forced marches (two thirds of the time, one man in
  twenty lost).
- **Commanders**: command granted to a character, who travels to the army; his competence weighs in battle, in
  foraging (in order rather than by looting), in winter losses and in what a sack brings; a record of battles won and
  lost; recall reaching him by courier, refused by a disloyal one, who keeps the army as his band; taken when his army
  is destroyed, half the time.
- **Mandates** in a fixed vocabulary (guard, besiege, take, hold the line, raid, shadow, with engage, avoid and
  withdraw), read by the commander on the spot each season no order of the king's reaches the army; "No commander, no
  mandate". Standing orders run only where a commander or the king is, reach the army by courier, and fire on what
  the army sees.
- **Distance inside the realm**: the court is wherever the king is; every order to a place a courier cannot reach
  within the season goes by courier and is carried out when it arrives, and may be stopped where a king who closed his
  roads has troops; what a king sees as current is what a courier brings within the season (the map's fog draws it),
  the rest by each unit's last report. A king may move his court, by the roads, at a cost.
- **Governors**: a granted province's governor raises up to the levies granted him when foreign troops threaten it, and
  skims the yield by his greed and loyalty; recall by courier, refused by a disloyal one.
- **A kingdom falls with its capital**: it comes apart (the king's province to the conqueror, with the land his troops
  stand on and, until item 17, the governed provinces; the rest lawless); commanded armies become their commanders'
  bands, the others raise a captain from the ranks or disband.
- **Hiring bands as soldiers**: a fee for a term; the chief's men join the army and leave as his band when it ends.
- **Gold by carriers**: gold from mines and sales in provinces a courier cannot reach in the season travels to the
  court as a load.
- The rulebook's COMMAND AT A DISTANCE part, the schema's `command` actions and four other actions, the seat view (court,
  commanders, mandates, reported units, governors), and the web app's command section.

## The review

(Filled when the reviewer returns.)

## Readings taken

Each rests on "The game in one page", the item's sections or the dossier.

1. **One connection a season for armies, whatever their pace** ("Distance-based marching" keeps the board's moves):
   pace decides whether a move arrives this season, never more than one province.
2. **A governor's seat of his own waits for item 17** ("A revolt with no leader" brings risen seats): his province
   passes to the conqueror as before. Principle: no stopgaps; the lever moves to the item that brings its consequence.
3. **A fallen kingdom comes apart at once**, not as the news reaches each province: the parts' rulers are the conqueror
   and nobody (lawless) until item 17, so timing changes nothing a king can act on.
4. **Script commanders only** ("Models only where they matter"): a commander's mind is a script reading his mandate by
   his competence; kings write the mandates.
5. **A commander's journey to his army is not a road journey** with interception: it takes the courier's time.
6. **Scheduled and conditional orders read the king's knowledge**, which is now only what couriers bring ("Scheduled,
   conditional orders").
7. **Realm-wide decrees (roads, tolls) take effect at once**: they are proclamations, not orders to a unit or place.
8. **A feint fools a standing order only by twice as many men** threatening as the order's own: a probe by a few
   cannot set off a whole army.
9. **The map draws the king's reach as its fog**: a seat's sight is what a courier brings within the season.

## First guesses (for item 18)

Battles: loser at least 10 in a hundred plus 4 per point of margin, winner 50 in a hundred of that, rout at 67, half
the lost dead. Pace: armies 100 points a thousand men up to 100, fleets 50; forced march two thirds of the time, 5 in a
hundred lost. Commander: strength 85 to 115 in a hundred by competence (×(competence − 50)/3.33), winter losses a percent less for every 2 points above 50, foraging waste half of 100 less competence over 2, a sack's spoils kept by greed over 4, look-ahead 2 moves plus one per 10 competence, a feint seen through by competence in a hundred. Courier: 45 days a season. Moving the court 20 shekels and 5 for every ten days of road, a company of 300. Governor's skim greed × (100 − loyalty) / 20,000. Enlisting: a chief takes a fee covering his men's cost or take.

## Script players

## Benchmarks and script games

## Use against ignore

## Questions for Haakon
