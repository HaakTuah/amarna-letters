# Item 17++++a: raiders from beyond the map

Weekly usage: unknown (`scripts/usage.sh` cannot read it in this session).

The item's text: `docs/intent/build-order/item-17.md` ("17++++a, raiders from beyond the map"); its section: "Pirates are
bands at sea" (War). As built: [`docs/design/56-raiders-from-beyond-the-map.md`](../design/56-raiders-from-beyond-the-map.md).
Branch `item/raiders`, from `develop` at 38b88679.

**The check for changes:** the live design document refused this account (the docs connector answered "forbidden"), so
the item was built from the copy cut on 3 November (War tab revision 112, Build order 354), and the copy on `develop`
was read again by its diff before the pull request.

## What was built

- **Who comes, through which door.** Each door says how hard raiders press through it and whether it opens by sea; each
  land beyond that sends raiders has a weight and a name: Sherden, Aegeans of Ahhiyawa and raiders of the far west by
  the western sea; Zagros highlanders by the eastern road; Kush and the Medjay by the Nile beyond Nubia; none by the
  Gulf or the Red Sea.
- **How often.** Each season each door rolls once: its raiders make for one of its provinces by what it holds, and land
  with a chance set by the door, the season (no sailing in winter; over land half as often), the policing of that coast
  (its holder's troops and police, as for bands) and his fleet on its waters (halving a crew's chance). No scripted
  event: a coast its king guards sees fewer.
- **As every band.** A raider band robs, falls on travellers and ships, is hunted, hired or paid off by the same rules as
  any band, and men of the land join it while it pays. It carries off people where it robs. It goes home with its men,
  captives and spoils (a crew from any coast, a band over land through its door), or melts away into the land's loose
  men, its captives going free. A chief who went home may lead the next raid through his door.
- **Paying a band off** (order `pay_off_band`): carried as an enlistment is; the chief takes the fee if it pays what he
  gives up, and leaves the payer's land for the term (a raider goes home). A script chief keeps his word; a model chief
  chooses.
- **Script kings** police their coasts at the raiders' doors, hunt and hire raiders as any band, and pay off those they
  cannot break. **Script chiefs** go home before the winter, with their fill of spoils, after a few seasons over land, or
  when paid. **Model chiefs** see their home, captives and whether they can go home, and may choose to.
- **A fix on the way:** an enlistment's ask read only what a band took on the roads, not what it robbed of its province
  (`Band.take` was reset each season), so chiefs asked about their men's cost alone; the band now keeps what it took in
  all last season (`Band.took`), and the script kings' enlistment fee reckons it too.
- A new save version.

## First guesses (item 18 tunes them)

`RaiderData` in `src/engine/src/model/raiders.ts`: at most 20 in a hundred a season at the hardest-pressed door; winter
over land 50%; a patrolling fleet 50%; 1 to 4 ships of 30 men, or 40 to 160 men over land; a chief's purse 5 to 30; home
content at 6 seasons of his men's cost; 4 seasons over land at most; 2 provinces' reach from the door; captives 10 for
every hundred men a season (at most a hundredth of the settled); a past chief leads again half the time. The doors'
`raids`: the western sea 100, the eastern road 50, the Nile beyond Nubia 30. The script kings' police at a door: up to 120
men; their pay-off: 2 seasons, a tenth over their reckoning, with three times the fee in the treasury; a chief's greed
reckoned at 80 in a hundred.

## Readings taken

- **Only the doors that history fills send raiders** (Period first; Different data, same rules): the Gulf and the Red
  Sea carried trade, and no source shows raiders through them; their `raids` are 0 in the data, not a rule.
- **The Lukka stay on the map** (the dossier's own reading): `lukka` is a lawless coast whose loose men raise bands by the
  rules of item 11b; the raiders from beyond are those based beyond the edge.
- **Captives are carried off only by bands based beyond the map** (Nothing appears or vanishes without a cause): they
  sell them at home, and no market on the map buys people yet; the rule reads the band's home, not who it is.
- **A raider chief gone home is "Abroad"**, a duty, not dead and not on the map, so nobody deals with him and his past
  stays his if he leads another raid (Everything is somewhere).
- **Paying off is an order like enlisting, carried the same way** (Everything is somewhere: the offer needs a carrier),
  and a band of the land paid off moves next door, since it has no home beyond the map to go to (No menus: one rule for
  every band).
- **A raider's ask counts the rest of his raid** (Incentives, not quotas): paid to leave early, he gives up the seasons
  he would still have raided.

## Script players and the measure

(numbers below)

## Questions for the owner

None.
