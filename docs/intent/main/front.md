<!-- Generated from the design document, main tab, revision 545 (2026-10-26). Do not edit: see docs/intent/INDEX.md. -->
# Amarna Letters — Prototype Design Document

Oct 17, 2026 · @Jesus

**Status (26 October 2026).** Build order items 1–5 are built and merged into `main`, with the fix pass after item 4. Two agent simulations have run with isolated Claude kings, the second with model characters. The first live API game, on 26 October 2026, ran almost wholly on script fallbacks, since all but one of its model calls were refused for the size of their schemas ("One source for model schemas"). The same day the repository was made ready for building in the cloud: the design notes split by topic, a copy of this document by section for the builders ("The specification" under Build order), the builder rules loaded into every building session, and the builders' working conventions in `CLAUDE.md`. Next comes the rest of the docs and preview pass (spec: `docs/prompts/DOCS-AND-PREVIEW.md`), then the TypeScript conversion (build order item 5+; spec: `docs/CONVERSION-PLAN.md`), then the fix pass for "Found during the port", then item 6 and on, built without stopping until usage nears 90% of the week ("Usage" under Build order).

**How this document relates to the code.** This document records intent: what the game is for, its rules of thumb and its systems. The design notes in the repository (`docs/design/`, one file per topic, indexed by `docs/DESIGN-NOTES.md`) are the source of truth for formulas, exact rules, the map and balance numbers. When they disagree on a number, the design notes win; when they disagree on intent, update one of them deliberately.

**Ideas tab.** This tab holds intent, the systems and the build order (under "Build order", near the end); the Ideas tab holds the detailed entries the build order's items cite, ideas still under consideration, and plans beyond the prototype (eras, expansions, play modes).

**Inspiration.** The game began with Irving Finkel's reading of the Amarna letters in the British Museum's *Curator's Corner*, episode 100: [Reading the Pharaoh's private mail with Irving Finkel](https://www.youtube.com/watch?v=3MZq_ZQDhJA) (25 September 2026). Its picture of the period is the design's starting point: great kings bargaining over gold, gifts and marriages, envoys detained for years, accusations that messengers lied, vassals begging for help against the Habiru, and the scribes who translated everything and were privy to every secret. The translations it reads come from William L. Moran's *The Amarna Letters*.

