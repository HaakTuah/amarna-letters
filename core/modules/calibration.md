# Calibrating the reviewers

The checks that keep every reviewer's bar from slipping, each a builder session the orchestrator starts; read by the
builder of such a check, and by the workshop check, which schedules them. Leans on `modules/reviews.md`.

- **A blind re-review every week:** a PR merged at 10 the week before (each category in turn) goes to a fresh
  fallback reviewer with the standard brief and nothing of its rounds; each blocking point it finds is a **miss**,
  and becomes a follow-up.
- **A canary now and then:** about every two weeks, and whenever a reviewer's model, settings or guidelines change, a
  test PR with planted faults (a bug, a broken standing rule, a security hole, a departure from the design) goes to
  each reviewer and is never merged. Each fault not found is a miss.
- **A slop check every month,** where the project has text its users read (core archive 49): a fresh reviewer reads
  only that text changed since the last check, scored against the *slop bar*, which says where its finds are fixed.
- **Logged:** each check is a row in the calibration log, `docs/calibration.md`, and the workshop check's line says
  the misses since the last. Two misses in a row by one reviewer: its brief or guidelines are tightened with the
  owner, a test is added for each fault it missed, and a canary runs again at once. It keeps reviewing meanwhile,
  since Claude's usage is the scarcer and a reviewer that catches most faults beats none (core archive 72).
- **The log is the schedule:** the workshop check opens a lane for each check whose last row is older
  than its interval (core archive 62).
