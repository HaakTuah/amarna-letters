<!-- Generated from the design document, Overview tab, revision 558 (2026-10-28). Do not edit: see docs/intent/INDEX.md. -->
# Amarna Letters — Prototype Design Document

Oct 17, 2026 · @Jesus

**Status.** The game runs in TypeScript since 27 October 2026 (build order item 5+). What is built and what comes next, item by item, is kept in the repository's `docs/BUILD-PROGRESS.md`.

**How this document relates to the code.** This document records intent: what the game is for, its rules of thumb and its systems. The design notes in the repository (`docs/design/`, one file per topic, indexed by `docs/DESIGN-NOTES.md`) are the source of truth for formulas, exact rules, the map and balance numbers. When they disagree on a number, the design notes win; when they disagree on intent, update one of them deliberately.

**Tabs.** This tab holds the vision, the design pillars and the prototype's scope. Each system has a tab of its own: World and history; Engine and models; Diplomacy and intelligence; Characters; Work, money and lending; Land, people and economy; War, travel and the seas; Victory and the ending; and Interface and the council. Build order holds the order the game is built in and the rules for the builder; Tests, risks and references holds the test plan, the known risks and the sources; Ideas holds what is still under consideration and plans beyond the prototype (eras, expansions, play modes). Entries are cited by title, so a title finds its entry whichever tab it is in, and a decided idea moves to the tab of its system.

**Inspiration.** The game began with Irving Finkel's reading of the Amarna letters in the British Museum's *Curator's Corner*, episode 100: [Reading the Pharaoh's private mail with Irving Finkel](https://www.youtube.com/watch?v=3MZq_ZQDhJA) (25 September 2026). Its picture of the period is the design's starting point: great kings bargaining over gold, gifts and marriages, envoys detained for years, accusations that messengers lied, vassals begging for help against the Habiru, and the scribes who translated everything and were privy to every secret. The translations it reads come from William L. Moran's *The Amarna Letters*.

