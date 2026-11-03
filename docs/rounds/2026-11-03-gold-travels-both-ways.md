# Gold travels both ways (#587, side lane, 3 November 2026)

PR #635. The lane "Gold travels both ways" under "Follow-ups" in `docs/BUILD-PROGRESS.md` (archive item 186). The design
is "One treasury, many stores" under Land, people and economy (revision 35; the live document had no change since). The
owner, 3 November 2026: "Contracts with characters can stipulate one pay upfront and one after. Paying infrastructure
work would presumably require pay or labour as tax upfront, no?", then "Yes, expertly". The full rule as built is
`docs/design/52-gold-travels-both-ways.md`.

## Step 0

No file changed was past 50 KB. The new work went into new files: `model/coffers.ts`, `turn/coffers.ts` and
`game/src/bots/coffers.ts`.

## What was built

- **Far** is beyond the season's reach of the court. A **coffer** in each far province holds its king's gold there. Its
  mines, its market sales and gold taken there go into it. Out of it come the province's works paid in gold, its
  purchases, its levies, the pay of the troops standing there, and the gold and porters' pay of caravans and ships
  setting out from there. Each season the coffer keeps a reserve and sends the rest home as a load, if there is a road.
  The coffer falls with its province.
- **Credit and bills.** What the coffer lacks for works, levies or troops' pay (troops abroad always) goes on a bill.
  The bill comes home when word of that season does, and the treasury pays it, troops first. If the treasury cannot pay
  it, the troops count missing pay and the province is owed the rest. Nothing more is done there on credit until the
  coffer has paid, and gold reaching a coffer pays the debt first.
- **Up front.** The order `send` (`send_gold`) moves gold from the treasury now. It reaches the coffer with the
  couriers, or comes back from a province lost or besieged by then.
- **Caravans carry their pay** for the road. They load it where they set out, reckoned without roads built since. A load
  going home carries a bill instead, paid out of the load when it arrives. Unused pay goes into the coffer or treasury
  where the caravan comes home, and the homecoming notice says so.
- **The order checks** reserve treasury gold only for provinces within the season's reach.
- **What the seat sees.** Coffers and debts come in each far province's report. The seat view also shows the gold it has
  sent (`goldSent`), counted in its strength, and each caravan's gold with its pay. Bills are lines in the treasury
  notice. The rulebook has a new "Gold far off" entry, and the README is updated. **Save version 58.**
- **Twin canary:** the #587 entries are gone from `Known`. Two new twins cover gold sent ahead together with a far
  market's sale and purchase, with the province lost or besieged after the orders set out.
- **Script kings** send gold ahead to far coffers that owe a debt or hold less than two seasons' need. They no longer
  send a caravan or trader from a far province whose coffer, as last reported, cannot pay for it.

## Measurements

MEASUREMENTS

## Readings taken

1. **Where "far" begins:** at the season's courier reach (`wordTo`), the line already used for orders and for a far
   province's gold going home. Bills come home on the word's clock (`heardAt`, #616's road home). *Principle: one clock
   for one road.*
2. **Troops' pay far off** comes from the coffer where they stand, and the rest goes on a bill. Soldiers serve on the
   king's word until the bill arrives, and the treasury moves only when it does. *Principle: what is done far off is
   paid from gold that is there, or by a bill carried home.*
3. **Credit is automatic until a bill bounces.** The king chooses by sending gold ahead or not. *Principle: the design's
   three choices, and the risk of the work stopping.*
4. **No credit for purchases or caravans:** markets and porters want gold in hand. *Principle: the design names the
   province's own taxes for purchases and the caravan's own load for porters.*
5. **First guesses for item 18:**
   - the coffer keeps a season's need × (word's seasons + 1);
   - a caravan's pay load is the road's seasons at the map's pace, doubled for a trader or a ship;
   - the script kings send at most two shipments a season, keep 150 shekels spare, and want two seasons' need in a far
     coffer.

## Reviews

Review: rules · Codex + Claude.
- **Claude's reviewer (Opus, high):** 6, then 7, then 9 with only the measurements open.
- **Codex:** P1×6 in round 1, clean in round 2, P1×3 in round 3, plus two late P1s on the last fix.
- **Escalation helper (Opus, high):** after the third round it ruled every late point fixed. The one remaining notice
  gap it named was fixed as it said.
- **Codex's security review** was asked for twice and never ran (no "Codex Security Review" comment). The PR says so.

Helpers: the reviewer and the escalation helper; nothing else.

## Questions for the owner

None.
