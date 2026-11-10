# When Codex builds: this game's own

This game's table of what goes to whom, and its trials; the rest (Codex's status, what reaches it, the hand-over and the
fallback) is `core/modules/codex-building.md`, read by the orchestrator when it routes work.

| Claude decides and builds | Codex builds |
| --- | --- |
| Each build-order item's rules, numbers and the tests that pin them down | The polish lane: interface, layout, the Music page, keys |
| The fix passes and the balance pass (item 18) | Tests in the smallest setup, and splitting test files |
| The script kings' strategy: what should change and why | Splitting files over 50 KB, proven unchanged by replays |
| Music: the compositions themselves | Scripts and tooling, CI speed, the workshop check's fixes |
| The soundscape's rules: layers, levels, the fog rule, as tests | Performance work with a measured target |
| Anything resting on the sources: kings' traits, names, the dossiers | What Claude has specified as tests: an item's implementation, wiring, save version and replays; the music and soundscape wiring; traits and names entered into the data; benchmark runs and their tables |
| The rulebook, seat view and request texts ("Requests are rules too") | Docs that record what is decided |

Whole with Claude (`core/modules/codex-building.md`, "What goes to Codex"): the engine's determinism.

**Trials:** in the first week Codex can build, one art task to Codex if one comes up, compared against Claude's; after
the first week, one build-order item split the long way (Claude writes the rule and its tests, Codex implements, Claude
reviews), and if it scores well, more items follow.
