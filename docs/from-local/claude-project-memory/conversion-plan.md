---
name: conversion-plan
description: The TypeScript conversion (build order item 5+) is specified in docs/CONVERSION-PLAN.md on develop; the order is docs and preview pass, conversion, fix pass, then item 6; main switches whenever Haakon merges, and the build never waits for him
metadata:
  type: project
---

The conversion plan lives in `docs/CONVERSION-PLAN.md` on `develop`, committed on 21 Oct 2026 with Haakon's words quoted exactly. That file is the source; read it, not this note. The design document's item 5+ and its status line give the same order:
1. the docs and preview pass (`docs/prompts/DOCS-AND-PREVIEW.md`, see [[after-26-oct-cheaper-dev-and-previews]])
2. the conversion
3. the fix pass for "Found during the port"
4. item 6 ([[build-order]])

Point 4 is decided (Haakon, 21 Oct 2026). Once parity passes, the TypeScript build goes into `develop` and the switch-over PR goes to him like any milestone PR. The fix pass and the rest carry on on `develop`, and `main` switches whenever he merges. He never needs to approve before work continues.

**Why:** the .NET runtime costs a phone too much (a 3.5 MB first download, interpreted code). One TypeScript engine can also serve the future multiplayer server.

**How to apply:** when the conversion starts, read `docs/CONVERSION-PLAN.md`, plus item 5+, the stack table and "Engine rules" under Tech stack fresh from the live design document. When Haakon adds to the plan, edit the file on `develop` and push.
