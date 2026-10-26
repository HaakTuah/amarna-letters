# Brief: the TypeScript conversion (item 5+, step 2 of 3)

**Spec:** `docs/CONVERSION-PLAN.md`, Haakon's words, and item 5+ itself (`docs/intent/main/build-order/item-5plus.md`).
The stack table and "Engine rules" are under Tech stack (`docs/intent/main/tech-stack.md`). **Effort:** high.

- **Parity data:** the recorded model games are in `tests/fixtures/replays/` (see its README).
- **Tools:** Node 22 is on cloud machines. The C# side of parity needs .NET (`scripts/cloud-setup.sh`); the phone
  measurements need Playwright's Chromium (the docs pass reports whether it installs).

**Done when, besides the plan's own gates:** `CLAUDE.md`'s commands, `scripts/test.sh` and `scripts/sim.sh` run the
TypeScript build; the preview workflow's build step is swapped for it; and once the C# build is no longer needed,
`scripts/cloud-setup.sh` stops installing .NET. Then go on with the fix pass (`docs/items/fix-pass.md`).
