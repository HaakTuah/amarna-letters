---
name: after-26-oct-cheaper-dev-and-previews
description: The docs and preview pass (CLAUDE.md, archiving, doc splits, PR previews) is specified in docs/prompts/DOCS-AND-PREVIEW.md on develop; not before 26 Oct 2026, when usage resets
metadata:
  type: project
---

The docs and preview pass is the first step of build order item 5+. Its spec is `docs/prompts/DOCS-AND-PREVIEW.md` on `develop`, committed on 21 Oct 2026. It quotes Haakon's task, corrections and additions word for word, with the findings made while preparing it (Pages environment, service worker, 404, references, sizes, tidy-up candidates). That file is the source.

Start it only after 26 Oct 2026, when usage resets. Haakon sets the usage limit for that session himself. Afterwards comes the conversion ([[conversion-plan]]), then the fix pass, then item 6.

**How to apply:** one session, no subagents ([[usage-lean-by-default]]). Re-check the findings before relying on them. When Haakon adds to the pass, edit the file on `develop` and push.
