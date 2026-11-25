- `scripts/look.mjs`, `scripts/look-kinds.mjs`, `scripts/look-pulls.mjs`, `scripts/look-checks.mjs`, `scripts/look-keep.mjs`, `scripts/look-host.mjs`,
  `.github/workflows/look.yml`, `.github/workflows/own-look.yml`, `scripts/moment.mjs`,
  `scripts/stalled.mjs`, `scripts/blind-sample.mjs`: the scheduled look, once a day, keeps in issues what has stopped,
  what is due and what is overdue, the monthly state report and the month's blind sample. *Runs:* the runners on a
  schedule; an orchestrator's wake. *Else:* the host's stale-issue actions and Renovate's dashboard, dropped on fact:
  they know nothing of the core's states; the host's agent jobs, dropped on fact: billed. *Bugs:* 3, and 2 naming
  `look.yml`. **Keep:** nothing fits.
