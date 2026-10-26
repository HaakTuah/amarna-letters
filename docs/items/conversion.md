# Brief: the TypeScript conversion (item 5+, step 2 of 3)

**Spec:** `docs/CONVERSION-PLAN.md`, Haakon's words, and item 5+ itself
(`docs/intent/main/20-build-order/02-item-5plus.md`). The stack table and "Engine rules" are under Tech stack
(`docs/intent/main/17-tech-stack.md`). **Effort:** high.

- **Parity data:** the recorded model games are in `tests/fixtures/replays/` (see its README). Replaying them makes no
  API calls, so it is not a model game.
- **Tools:** Node 22 is on cloud machines. The C# side of parity needs .NET (`scripts/cloud-setup.sh`), and the phone
  measurements need Playwright's Chromium (the docs pass reports whether it installs).
- **Sessions:** the plan passes parity layer by layer, so a session can end at a passed gate: commit, note the next
  layer in `docs/BUILD-PROGRESS.md`, and let the next session pick up there.
- **Flaws found while porting** go in "Found during the port" in `docs/BUILD-PROGRESS.md`, not fixed during the port.

**Done when, besides the plan's own gates:** `CLAUDE.md`'s commands, `scripts/test.sh` and `scripts/sim.sh` run the
TypeScript build; the preview workflow's build step is swapped for the TypeScript build; and once the C# build is no
longer needed, `scripts/cloud-setup.sh` stops installing .NET. Then go on with the fix pass (`docs/items/fix-pass.md`).
