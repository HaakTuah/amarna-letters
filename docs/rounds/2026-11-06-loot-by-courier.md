# Loot with no road home, sent by courier (bug #740, side lane, 6 November 2026)

Issue #740: loot going home to a king's capital travels as a load that can be waylaid (`lootHome`). Where no road led
home (land closed to him on the way, or his own capital lost), it reached him at once instead: the gold in his
treasury and the tablets in his archive that same season, however far away it was taken. #742 (bug #726) had already
sent a far force's seized archive by courier in that case; this does the same for all loot.

## What changed

- `turn/trade.ts`: with no road for a load, `lootHome` sends the loot by courier (`lootByWord`). The gold and the
  tablets reach the court with word from where they were taken (`heardAt`), or at once where that word comes within the
  season. `lootHome` now says how the loot went (`LootWay`: "road", "word" or "here"), so the callers that word a notice
  ("on its way to your treasury", "your scribes are carrying it home") or pass a caravan's word on stay true.
- #742's archive courier (`archiveByWord`, news `Archive`) is folded into this one (`lootByWord`, news `Loot`, which
  carries gold as well), and the seizure in `turn/caravans.ts` just calls `lootHome`. Nothing is left of the old path.
- Test: `map-crossings.test.ts`, "Loot with no road home reaches its king by courier with the word, not at once
  (#740)", with #726's test now naming the `Loot` journey.
- The rulebook (`rules-economy.ts`, Loot) and the design note `docs/design/20-people-across-borders.md` say so.
- Save version 66 (64 is #742's; #745 takes 65): loot from far with no road home is now a journey, so a seed plays on
  differently from that season.

## Readings taken

1. **Gold by courier, not left behind.** Gold already travels with couriers (`send_gold`), and the issue asked only
   that it not arrive before word could; leaving it among the people there would change an outcome as well as its
   timing. Principle: keep the fix to what a king could not know.

Questions for the owner: none.
