### Betrayal

Only a king with honesty below 0.55 betrays. Each season it looks at each friend in a fixed order and skips:

- every friend in the first year (turns 1–3);
- a friend who has ever given it a successful support;
- a full ally from turn 15, when the game can end.

For each remaining friend, it adds up the value of his provinces that its troops can reach and that have no troop (seen or remembered) and no walls. If that total exceeds 400 × (0.5 + honesty) and a roll of (1 − honesty) × 0.35 succeeds, it betrays that friend this season. It betrays at most one friend, and decides afresh each season.

While betraying:

- it is willing to attack him;
- his land is worth 1.1 × in attacks;
- his hostility counts in full;
- harm to him counts 0.35 in the look-ahead;
- as host, it treats him as no friend.

