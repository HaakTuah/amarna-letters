### Letters and gifts

- **How many.** Up to min(3, 1 + round(2 × diplomacy)) letters a season, and no more than the envoys ready. That is one letter at diplomacy up to 0.25, two below 0.75, and three from 0.75. At most one letter goes to each king.
- **Evidence first.**
  - A forged tablet of its own, not yet shown, goes with the least reliable envoy to a king who did not seal it, neighbours first.
  - Then a tablet a co-sealer has broken goes with the most reliable envoy to a third king, neighbours first, asking him to stand with it.
  - Each copy is sent once.
- **Missions.** Then come missions, best score first, and only those scoring above 0.15:

| Mission | Sent when | Score |
|---|---|---|
| Coalition against the leader | see Coalitions | diplomacy × (leader's growth − 0.6), × 1.4 if the recipient touches the leader, × 1.2 if a neighbour |
| Defence pact | see Coalitions | 0.55 × diplomacy + 0.2 × (1 − pride) |
| Lull | to the war target, fresh, cunning × (1 − honesty) above 0.3 | cunning × (1 − honesty) |
| Grievance | grudge of 3 or more, fresh | 0.3 + 0.5 × vengeance |
| Peace | a neighbour, no treaty, not hostile, fresh | (0.3 + caution) × hostility + 0.2 × diplomacy, + 0.3 for Arzawa and Alashiya |
| Full alliance | see Rivals for the crown | 0.5 × diplomacy + 0.2 × trust, + 0.15 if small |
| Gift | a friend, spare above 150, in 30% of seasons | 0.4 × generosity |
| Tribute | from Arzawa or Alashiya to a neighbour of a stronger tier with hostility above 0.35, not hostile, fresh, spare above 100 | 0.35 + 0.4 × caution |
| Plea for relief (since the script players' audit of the siege package) | a city of ours besieged by a king who is no friend (the most valuable such city, the capital first), to each friend we would not betray who is a neighbour or a full ally, not the besieger, at most once in three seasons | 0.9 |

- **Pleas** ask the friend to send troops to drive the besiegers out ("My brother, the troops of Babylonia besiege my city of
  Ashur. Come to my aid: send your troops to drive them out, and my walls will sally to meet them."; the sally only where the
  walls can sally), carry no gold, and go with the most reliable envoy. A friend not yet sworn with us against the besieger is
  also asked to swear it ("What Babylonia takes from me today he will take from you tomorrow: let us stand together against
  him."), with the coalition tablet, which he seals by the rules for coalitions: a friend at peace with the besieger will not
  fight him for us unless he has sworn to, or is our full ally (see Tactics, "A friend's city besieged"). From a besieged
  capital the envoy may be caught, and the besieger reads the plea. Before the audit a besieged script king never asked
  anyone for help.

- **Envoys.** The war target gets no missions except lulling letters (evidence copies may still go to him). Peace, alliance and coalition letters carry a tablet, which resets "fresh". They, gifts and tribute, and pleas for relief go with the most reliable envoy still at court; all other letters go with the least reliable. (Until the fix pass after item 4 gifts and tribute went with the least reliable, so a servant known to skim carried the gold.)
- **Gifts.** At most one gift-bearing letter goes out a season, and only with spare of at least 100.
  - **Debased gold** (purity 55-85%) is sent by a king with honesty below 0.45 only to a friend whose trust, as its own in him shows it, is 0.3 or more, who has no cause to assay it; everything else it sends is fine (since the fix pass after item 4). Courts assay gold from those they trust little, so gold debased for anyone else is found and costs more trust than it saves gold: before the fix pass 406 debased lots went out in seeds 1-100, and nearly every one was found. The host's gold back, debased by the same kings (75%), follows the same rule.
  - Amount: 10 + spare × share × 0.5, clamped between 20 and the larger of 20 and min(60, income ÷ 3), then rounded down to tens. Gifts are therefore 20–60 shekels.
  - Share is 0.06 + 0.08 × generosity for gifts and tribute, and 0.08 + 0.1 × generosity for peace (+ 0.06 if the sender is weaker).
  - A peace letter carries gold only if the sender holds less land yield than the recipient, or its generosity is above 0.6.
- **Tablets.**
  - Peace: "brothers. Neither king shall send troops into the lands of the other."
  - Full alliance: "allies. Each shall stand with the other against any enemy, and the friend of one shall be the friend of the other." This is an alliance oath. (Until 18 October 2026 it ended "and they shall share in the victory".)
  - Coalition: see Coalitions.
- **Instructions.** Peace, alliance, coalition and evidence envoys are told to promise no land. Gift and lulling envoys are told to promise nothing. Grievance envoys demand withdrawal and gifts. Mission letters include the power's own line, such as Egypt's gold "as plentiful as dust" (at the end, except in peace letters); evidence letters do not.
- **Threats** (since the fix pass after item 4). A grievance letter from a king at least 0.9 times as strong as the one it writes to, with aggression + vengeance above 1, adds "If you do not withdraw, my troops will march into your land." It is a threat aimed at the host, so a timid or fond script envoy drops it (see Script envoys); before the fix pass no script king's letter ever threatened, and softening never fired in script games.

