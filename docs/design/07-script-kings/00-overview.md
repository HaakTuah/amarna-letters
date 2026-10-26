## Script kings

A script king sees exactly what any seat sees (its `SeatView`) and nothing more: a test changes what lies outside the view (rivals' gold, the fine gold in its unassayed lots, troops out of sight, seat labels, characters' traits) and its orders stay the same. The same bot plays every script seat. It also stands in for a model or file seat whenever a call to it fails, playing that king's temperament. The stand-in keeps up with every such seat, asleep or awake (see Known quirks). The rules live in `src/Amarna.Game/Bots` (`Personality`, `Brain`, `Board`, `Statecraft`, `Tactics`, `Search`, `ScriptLeader`), and their numbers are in that code, not in `GameConfig`. Each script seat plays from a seed of its own, the first eight bytes of a SHA-256 hash of the game's seed, "seat" and its power (`ScriptLeader.SeatSeed`), so no script king holds the seed the engine rolls the game's dice with; the hash, unlike a stream of the game's own generator, cannot be undone to find it. Every random choice it makes, in picturing its rivals too, comes from a stream of that seed keyed by turn and purpose, so replays are exact.

**Every feature is every seat's.** Script kings use every order and every choice at an audience that a model king has,
standing orders among them (since the owner's additions to the fix pass after item 4; see "Standing orders" below),
except those that exist only for a king who sleeps: scheduled orders, letters sent from an audience while orders stand,
and reopening orders. A script seat is asked every season and gives every order fresh, so it has nothing to schedule;
when it stands in for a sleeping seat whose call failed, it plays that one season. The audit of the
fix pass after item 4 (report `docs/rounds/2026-10-20-fix-pass.md`, "The feature audit") measured each feature's use and
success in seeds 1-100 and patched those never used or never successful: inventories examined, thieves dismissed,
convoys, gifts of troops, cessions, recalls, captives released, the second exchange, greetings without the title or
without a greeting, threats, oaths asked of envoys, gold debased only where it goes unassayed, watchmen and levies placed
where they pay. The script players' audit of the siege package (Build order item 5; its report, "Script players and every
feature") did the same for that item's features and for the leftovers of the fix pass's audit: pleas for relief and the
relief of a friend's besieged city, walls against fleets on an open coast, standing orders for besieging armies (a lone
one slips away from a relief), captives whose king has fallen let go, a foreign army within one's own capital counted as
the kingdom at stake, land to be conquered valued as it is absorbed, and an envoy's word that a host offered it a post.

